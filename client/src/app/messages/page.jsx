"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { messagesAPI, applicationsAPI } from "@/lib/api";
import { initializeSocket, getSocket, joinConversation, leaveConversation, emitTyping, emitStopTyping } from "@/lib/socket";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MessageSquare, Send, Loader2, ArrowLeft, Briefcase } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AuthGuard from "@/components/auth-guard/authGuard";

export default function MessagesPage() {
  const router = useRouter();
  const [applicationId, setApplicationId] = useState(null);

  const { user } = useAuthStore();

  // Get application ID from URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const appId = params.get("application");
      setApplicationId(appId);
    }
  }, []);
  const [conversationData, setConversationData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [jobInfo, setJobInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Initialize Socket.IO
  useEffect(() => {
    if (user?._id) {
      const socket = initializeSocket(user._id);

      // Listen for new messages
      socket.on("newMessage", ({ message }) => {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();
      });

      // Listen for typing indicators
      socket.on("userTyping", ({ userId, userName }) => {
        if (userId !== user._id) {
          setIsTyping(true);
          setTypingUser(userName);
        }
      });

      socket.on("userStoppedTyping", ({ userId }) => {
        if (userId !== user._id) {
          setIsTyping(false);
          setTypingUser(null);
        }
      });

      return () => {
        socket.off("newMessage");
        socket.off("userTyping");
        socket.off("userStoppedTyping");
      };
    }
  }, [user]);

  // Load conversation based on applicationId
  useEffect(() => {
    if (applicationId && user) {
      loadConversation();
    }
  }, [applicationId, user]);

  const loadConversation = async () => {
    try {
      setIsLoading(true);

      // Get conversation ID from application
      const convResponse = await messagesAPI.getConversationId(applicationId);
      const { conversationId, applicantId, recruiterId, jobId } = convResponse.data.data;

      setConversationData({ conversationId, applicantId, recruiterId, jobId });

      // Get application details for job info
      const appResponse = await applicationsAPI.getApplication(applicationId);
      const application = appResponse.data.data;

      setJobInfo(application.jobId);

      // Determine other user
      const isApplicant = user._id === applicantId.toString();
      const otherUserId = isApplicant ? recruiterId : applicantId;

      // Get other user's details from application
      const otherUserData = isApplicant
        ? application.jobId?.postedBy
        : application.applicantId;

      setOtherUser(otherUserData);

      // Join conversation room
      joinConversation(conversationId);

      // Fetch messages
      const messagesResponse = await messagesAPI.getConversation(conversationId);
      setMessages(messagesResponse.data.data.messages);

      // Mark as read
      await messagesAPI.markAsRead(conversationId);

      scrollToBottom();
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error("Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationData?.conversationId) {
        leaveConversation(conversationData.conversationId);
      }
    };
  }, [conversationData]);

  const sendMessage = async (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !conversationData) return;

    const receiverId = user._id === conversationData.applicantId.toString()
      ? conversationData.recruiterId
      : conversationData.applicantId;

    try {
      setIsSending(true);
      await messagesAPI.sendMessage({
        receiverId: receiverId.toString(),
        message: newMessage.trim(),
        applicationId: applicationId,
      });

      setNewMessage("");
      emitStopTyping(conversationData.conversationId, user._id);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (conversationData?.conversationId) {
      emitTyping(conversationData.conversationId, user._id, user.name);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        emitStopTyping(conversationData.conversationId, user._id);
      }, 2000);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const getInitials = (name) => {
    return name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";
  };

  if (!applicationId) {
    return (
      <AuthGuard>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No conversation selected</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {isLoading || !user ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b bg-background flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <Avatar className="h-10 w-10">
                <AvatarImage src={otherUser?.profileImage} />
                <AvatarFallback>{getInitials(otherUser?.name)}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h3 className="font-semibold">{otherUser?.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-3 w-3" />
                  <span>{jobInfo?.title || "Job Application"}</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-12">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    // Handle case where sender was deleted or user not loaded
                    if (!msg.senderId || !user?._id) return null;

                    const isSender = msg.senderId._id === user._id;

                    return (
                      <div
                        key={msg._id}
                        className={`flex ${isSender ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] ${
                            isSender
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          } rounded-lg p-3`}
                        >
                          <p className="text-sm whitespace-pre-wrap wrap-break-word">{msg.message}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isSender ? "text-primary-foreground/70" : "text-muted-foreground"
                            }`}
                          >
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}

                {isTyping && typingUser && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm text-muted-foreground italic">
                        {typingUser} is typing...
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="p-4 border-t bg-background">
              <div className="flex gap-2 max-w-4xl mx-auto">
                <Input
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="flex-1"
                />
                <Button type="submit" disabled={isSending || !newMessage.trim()}>
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </AuthGuard>
  );
}
