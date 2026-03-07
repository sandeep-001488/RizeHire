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
  const [isDark, setIsDark] = useState(false);

  const { user } = useAuthStore();

  // Detect dark mode
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(darkModeMediaQuery.matches);

    const handleChange = (e) => setIsDark(e.matches);
    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => darkModeMediaQuery.removeEventListener('change', handleChange);
  }, []);

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

      const handleNewMessage = ({ message }) => {
        setMessages((prev) => {
          const hasOptimistic = prev.some((m) => typeof m._id === 'string' && m._id.length > 20);

          if (hasOptimistic && prev[prev.length - 1].message === message.message) {
            return [...prev.slice(0, -1), message];
          }

          const messageExists = prev.some((m) => m._id === message._id);
          return messageExists ? prev : [...prev, message];
        });
        scrollToBottom();
      };

      const handleUserTyping = ({ userId, userName }) => {
        if (userId !== user._id) {
          setIsTyping(true);
          setTypingUser(userName);
        }
      };

      const handleUserStoppedTyping = ({ userId }) => {
        if (userId !== user._id) {
          setIsTyping(false);
          setTypingUser(null);
        }
      };

      socket.off("newMessage");
      socket.off("userTyping");
      socket.off("userStoppedTyping");

      socket.on("newMessage", handleNewMessage);
      socket.on("userTyping", handleUserTyping);
      socket.on("userStoppedTyping", handleUserStoppedTyping);

      return () => {
        socket.off("newMessage", handleNewMessage);
        socket.off("userTyping", handleUserTyping);
        socket.off("userStoppedTyping", handleUserStoppedTyping);
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
      // Note: application = appResponse.data.data (already unwrapped)
      const applicationData = application.application; // The actual application object from backend
      const otherUserData = isApplicant
        ? applicationData.job?.postedBy
        : applicationData.applicant;

      console.log("Other User Data:", otherUserData, "Is Applicant:", isApplicant);
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

    const messageText = newMessage.trim();

    try {
      setIsSending(true);

      // Optimistic update - add message to state immediately
      const optimisticMessage = {
        _id: Date.now().toString(), // Temporary ID
        senderId: { _id: user._id, name: user.name, profileImage: user.profileImage },
        receiverId: receiverId,
        message: messageText,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      scrollToBottom();

      await messagesAPI.sendMessage({
        receiverId: receiverId.toString(),
        message: messageText,
        applicationId: applicationId,
      });

      setNewMessage("");
      emitStopTyping(conversationData.conversationId, user._id);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((msg) => msg._id !== (Date.now().toString())));
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
            {/* Chat Header - WhatsApp Green with Dark Mode Support */}
            <div className="p-4 border-b bg-linear-to-r from-[#25D366] to-[#20BA5A] dark:from-[#1a8f4e] dark:to-[#0d6633] text-white flex items-center gap-3 shadow-sm">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <Avatar className="h-10 w-10 bg-white dark:bg-gray-600">
                <AvatarImage src={otherUser?.profileImage} />
                <AvatarFallback className="text-[#25D366] dark:text-white font-semibold">{getInitials(otherUser?.name)}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h3 className="font-semibold text-white text-lg">
                  {otherUser?.name || (typeof otherUser === 'string' ? 'User' : 'Loading...')}
                </h3>
                {jobInfo?.title && (
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <Briefcase className="h-3 w-3" />
                    <span>{jobInfo.title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Messages - WhatsApp-like background with Dark Mode Support */}
            <ScrollArea className="flex-1 bg-cover bg-center" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundColor: isDark ? '#1a1a1a' : '#ECE5DD'
            }}>
              <div className="space-y-2 py-3 w-full">
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
                        className={`flex w-full ${isSender ? "justify-end pr-4" : "justify-start pl-4"}`}
                      >
                        <div
                          className={`max-w-xs ${
                            isSender
                              ? "bg-[#DCF8C6] text-gray-900 dark:bg-[#056162] dark:text-white"
                              : "bg-white text-gray-900 dark:bg-[#1F2937] dark:text-white"
                          } rounded-2xl px-3 py-2 wrap-break-word shadow-sm`}
                        >
                          <p className="text-sm whitespace-pre-wrap wrap-break-word leading-snug">{msg.message}</p>
                          <p
                            className={`text-xs mt-0.5 opacity-60 ${
                              isSender ? "text-gray-700 dark:text-gray-300" : "text-gray-600 dark:text-gray-400"
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
                    <div className="bg-white dark:bg-[#1F2937] rounded-[18px] px-3 py-1.5 shadow-sm">
                      <p className="text-sm text-gray-600/60 dark:text-gray-400/60 italic leading-tight">
                        {typingUser} is typing...
                      </p>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="px-4 py-3 border-t bg-white dark:bg-gray-900">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={handleTyping}
                  placeholder="Type a message..."
                  disabled={isSending}
                  className="flex-1 rounded-full bg-gray-100 dark:bg-gray-800 border-0 placeholder-gray-500 dark:placeholder-gray-500 dark:text-white text-sm py-2"
                />
                <Button type="submit" disabled={isSending || !newMessage.trim()} className="rounded-full bg-[#25D366] hover:bg-[#20BA5A] dark:bg-[#1a8f4e] dark:hover:bg-[#0d6633] text-white h-10 w-10 p-0">
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
