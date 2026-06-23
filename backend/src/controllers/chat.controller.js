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

    let { conversationId, message, context } = req.body;

    // Validate message
    if (!message || !message.trim()) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    // 1. Auto-create conversation if it doesn't exist
    if (!conversationId) {
      console.log(`[CHAT] Creating new conversation for user: ${userId}`);
      const newConversation = await chatService.createConversation(
        userId,
        message.slice(0, 30) || 'New Conversation'
      );
      conversationId = newConversation.id;
    }

    console.log(`[CHAT] Fetching history for conversation: ${conversationId}`);
    // 2. Get previous conversation history
    const history = await chatService.getMessages(
      conversationId,
      userId
    );
    const isFirstMessage = history.length === 0;

    console.log(`[CHAT] Saving user message: "${message.substring(0, 50)}..."`);
    // 3. Save user message
    const savedUserMsg = await chatService.addMessage(
      conversationId,
      'user',
      message
    );

    // 4. Call AI Service
    const aiServiceUrl = ENV.AI_SERVICE_URL || 'http://localhost:8000';
    let aiText = "I couldn't retrieve the latest analytics right now. Please try your request again.";
    let isFallback = false;

    try {
      const userRole = req.user.role || 'normal_user';
      console.log(`[CHAT] Sending payload to AI Service (${aiServiceUrl}/chat) with role: ${userRole}`);
      
      const safeHistory = history.map((m) => ({
        role: m.role || 'user',
        content: m.content || ''
      })).filter(m => m.content.trim() !== '');

      const aiResponse = await axios.post(
        `${aiServiceUrl}/chat`,
        {
          message,
          user_role: userRole,
          history: safeHistory,
          context: context
        },
        { timeout: 120000 }
      );
      console.log(`[CHAT] Received AI response successfully.`);
      aiText = aiResponse.data.response || aiResponse.data.message || 'No response generated';
      isFallback = aiResponse.data?.isFallback || false;
    } catch (aiError) {
      console.error('[CHAT] AI Service request failed!');
      console.error('[CHAT] Error Message:', aiError.message);
      if (aiError.response) {
        console.error('[CHAT] AI Service Response Status:', aiError.response.status);
        console.error('[CHAT] AI Service Response Data:', JSON.stringify(aiError.response.data));
      } else {
        console.error('[CHAT] Stack Trace:', aiError.stack);
      }
    }

    console.log(`[CHAT] Saving assistant message...`);
    // 5. Save AI response
    const savedAiMsg = await chatService.addMessage(
      conversationId,
      'assistant',
      aiText
    );

    let generatedTitle = null;
    if (isFirstMessage) {
      try {
        console.log(`[CHAT] First message detected. Generating title...`);
        const titleRes = await axios.post(`${aiServiceUrl}/chat/title`, { message }, { timeout: 15000 });
        generatedTitle = titleRes.data.title || 'Healthcare Analytics';
        await chatService.updateConversationTitle(conversationId, userId, generatedTitle);
        console.log(`[CHAT] Generated Title: ${generatedTitle}`);
      } catch (titleErr) {
        console.error('[CHAT] Failed to generate title:', titleErr.message);
      }
    }

    console.log(`[CHAT] Request complete. Returning response to frontend.`);
    // 6. Return full response
    res.json({
      success: true,
      conversationId,
      conversationTitle: generatedTitle,
      userMessage: savedUserMsg,
      assistantMessage: savedAiMsg,
      isFallback
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process chat request',
      errorDetails: error.message,
      stack: error.stack
    });
  }
};