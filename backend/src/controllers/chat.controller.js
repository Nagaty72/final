import * as chatService from '../services/chat.service.js';
import axios from 'axios';
import { ENV } from '../config/env.js';

/**
 * Chat Controller
 * ===============
 */

export const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await chatService.getConversations(userId);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;
    const conversation = await chatService.createConversation(userId, title);
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    await chatService.deleteConversation(id, userId);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const messages = await chatService.getMessages(id, userId);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, message } = req.body;

    // 1. Get conversation history for context
    const history = await chatService.getMessages(conversationId, userId);

    // 2. Save user message to DB
    await chatService.addMessage(conversationId, 'user', message);

    // 3. Call AI Service with history
    const aiServiceUrl = ENV.AI_SERVICE_URL || 'http://localhost:8000';
    const aiResponse = await axios.post(`${aiServiceUrl}/chat`, {
      message,
      history: history.map(m => ({ role: m.role, content: m.content }))
    });

    const aiText = aiResponse.data.response;

    // 4. Save AI response to DB
    const savedAiMsg = await chatService.addMessage(conversationId, 'assistant', aiText);

    res.json(savedAiMsg);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
};
