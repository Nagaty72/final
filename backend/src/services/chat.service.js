import { getSupabase } from '../config/supabase.js';

/**
 * Chat Service
 * ============
 * Manages database operations for persistent chat history.
 */

export const getConversations = async (userId) => {
  const { data, error } = await getSupabase()
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createConversation = async (userId, title = 'New Conversation') => {
  const { data, error } = await getSupabase()
    .from('conversations')
    .insert([{ user_id: userId, title }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateConversationTitle = async (conversationId, userId, title) => {
  const { data, error } = await getSupabase()
    .from('conversations')
    .update({ title })
    .eq('id', conversationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteConversation = async (conversationId, userId) => {
  const { error } = await getSupabase()
    .from('conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
};

export const getMessages = async (conversationId, userId) => {
  // First verify conversation ownership
  const { data: conv, error: convError } = await getSupabase()
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .single();

  if (convError || !conv) throw new Error('Conversation not found or unauthorized');

  const { data, error } = await getSupabase()
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
};

export const addMessage = async (conversationId, role, content) => {
  const { data, error } = await getSupabase()
    .from('messages')
    .insert([{ conversation_id: conversationId, role, content }])
    .select()
    .single();

  if (error) throw error;

  // Update conversation updated_at
  await getSupabase()
    .from('conversations')
    .update({ updated_at: new Date() })
    .eq('id', conversationId);

  return data;
};
