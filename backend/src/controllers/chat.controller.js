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

    const conversation = await chatService.createConversation(
      userId,
      title
    );

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

    let { conversationId, message } = req.body;

    // Validate message
    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    // 1. Auto-create conversation if it doesn't exist
    if (!conversationId) {
      const newConversation = await chatService.createConversation(
        userId,
        message.slice(0, 30) || 'New Conversation'
      );

      conversationId = newConversation.id;
    }

    // 2. Get previous conversation history
    const history = await chatService.getMessages(
      conversationId,
      userId
    );

    // 3. Save user message
    const savedUserMsg = await chatService.addMessage(
      conversationId,
      'user',
      message
    );

    // 4. Call AI Service
    const aiServiceUrl =
      ENV.AI_SERVICE_URL || 'http://localhost:8000';

    const aiResponse = await axios.post(
      `${aiServiceUrl}/chat`,
      {
        message,
        history: history.map((m) => ({
          role: m.role,
          content: m.content
        }))
      }
    );

    const aiText =
      aiResponse.data.response ||
      aiResponse.data.message ||
      'No response generated';

    // 5. Save AI response
    const savedAiMsg = await chatService.addMessage(
      conversationId,
      'assistant',
      aiText
    );

    // 6. Return full response
    res.json({
      conversationId,
      userMessage: savedUserMsg,
      assistantMessage: savedAiMsg
    });

  } catch (error) {
    console.error('Chat error:', error);

    res.status(500).json({
      error: error.message || 'Failed to process chat message'
    });
  }
};