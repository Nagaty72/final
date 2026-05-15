'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import ChatSidebar from './ChatSidebar';
import * as chatService from '@/services/chat.service';

/**
 * ChatContainer
 * ==============
 * Refactored to support persistent history, multiple conversations,
 * and sidebar navigation.
 */

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "👋 **Welcome to HealthBot AI!**\n\n" +
    "I'm your intelligent healthcare analytics assistant. Select a conversation from the sidebar or start a new one to begin.",
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export default function ChatContainer() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // 1. Fetch conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // 2. Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([WELCOME_MESSAGE]);
    }
  }, [activeConversationId]);

  const loadConversations = async () => {
    try {
      setIsSidebarLoading(true);
      const data = await chatService.getConversations();
      setConversations(data);
      if (data.length > 0 && !activeConversationId) {
        setActiveConversationId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setIsSidebarLoading(false);
    }
  };

  const loadMessages = async (id) => {
    try {
      setIsLoading(true);
      const data = await chatService.getMessages(id);
      setMessages(data.length > 0 ? data : [WELCOME_MESSAGE]);
    } catch (err) {
      setError('Failed to load message history.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    try {
      const newConv = await chatService.createConversation();
      setConversations([newConv, ...conversations]);
      setActiveConversationId(newConv.id);
    } catch (err) {
      setError('Failed to create new conversation.');
    }
  };

  const handleDeleteChat = async (id) => {
    try {
      await chatService.deleteConversation(id);
      setConversations(conversations.filter(c => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    } catch (err) {
      setError('Failed to delete conversation.');
    }
  };

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const handleSend = async (text) => {
    if (!activeConversationId) {
      // Auto-create conversation if none active
      const newConv = await chatService.createConversation(text.substring(0, 30) + '...');
      setActiveConversationId(newConv.id);
      setConversations([newConv, ...conversations]);
      // The useEffect will trigger loadMessages but we need to proceed with send
    }

    const currentConvId = activeConversationId;
    setError(null);
    setIsLoading(true);

    // Optimistic update
    const userMsg = { role: 'user', content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await chatService.sendMessage(currentConvId || activeConversationId, text);
      setMessages(prev => [...prev, response]);
    } catch (err) {
      setError(err.message || 'Failed to get AI response.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <ChatSidebar 
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={setActiveConversationId}
        onNew={handleNewChat}
        onDelete={handleDeleteChat}
        isLoading={isSidebarLoading}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-slate-950">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {conversations.find(c => c.id === activeConversationId)?.title || 'Healthcare AI Assistant'}
            </h2>
            <p className="text-xs text-slate-500">Gemini 1.5 Flash • Context Aware</p>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-8 space-y-6 chatbot-scroll"
        >
          {messages.map((msg, idx) => (
            <MessageBubble key={msg.id || idx} message={msg} />
          ))}
          {isLoading && <TypingIndicator />}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800/50 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-6 bg-slate-950 border-t border-slate-800">
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}
