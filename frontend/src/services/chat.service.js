import { api } from './api';

/**
 * Chat Service
 * ============
 * Frontend service for managing conversations and messages.
 */

export const getConversations = async () => {
  return api.get('/api/v1/chat/conversations');
};

export const createConversation = async (title = 'New Conversation') => {
  return api.post('/api/v1/chat/conversations', { title });
};

export const deleteConversation = async (id) => {
  return api.delete(`/api/v1/chat/conversations/${id}`);
};

export const getMessages = async (conversationId) => {
  return api.get(`/api/v1/chat/conversations/${conversationId}/messages`);
};

export const sendMessage = async (conversationId, message, context = null) => {
  return api.post('/api/v1/chat/send', { conversationId, message, context });
};
