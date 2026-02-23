import { io } from 'socket.io-client';

let socket = null;

export const initializeSocket = (userId) => {
  if (socket) {
    return socket;
  }

  const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

  socket = io(SOCKET_URL, {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Connect the socket
  socket.connect();

  // Join user's personal room for notifications
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    if (userId) {
      socket.emit('join', userId);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinConversation = (conversationId) => {
  if (socket && conversationId) {
    socket.emit('joinConversation', conversationId);
  }
};

export const leaveConversation = (conversationId) => {
  if (socket && conversationId) {
    socket.emit('leaveConversation', conversationId);
  }
};

export const emitTyping = (conversationId, userId, userName) => {
  if (socket && conversationId) {
    socket.emit('typing', { conversationId, userId, userName });
  }
};

export const emitStopTyping = (conversationId, userId) => {
  if (socket && conversationId) {
    socket.emit('stopTyping', { conversationId, userId });
  }
};
