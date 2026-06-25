'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';
import ChatSidebar from './ChatSidebar';
import * as chatService from '@/services/chat.service';
import { useTranslation } from 'react-i18next';
import { Activity, AlertTriangle, FileText, Map, Sparkles, TrendingUp, ShieldCheck, Briefcase } from 'lucide-react';

/**
 * ChatContainer
 * ==============
 * AI Healthcare Analyst Chat Interface
 * Features a premium empty state, quick actions, and structured response rendering.
 */

const FEATURED_ACTION = {
  icon: Briefcase,
  label: 'Executive Health Briefing',
  text: 'Generate an executive healthcare intelligence briefing based on current platform data.',
};

const QUICK_ACTIONS = [
  { icon: TrendingUp, label: 'Analyze disease trends', text: 'Analyze the latest disease trends across all governorates.' },
  { icon: AlertTriangle, label: 'Detect outbreak risks', text: 'Identify potential outbreak risks based on recent data.' },
  { icon: FileText, label: 'Generate executive summary', text: 'Generate an executive summary of the current health situation.' },
  { icon: Map, label: 'Identify high-risk regions', text: 'Identify high-risk regions and their most prevalent diseases.' },
];

const SUGGESTED_PROMPTS = [
  'Most affected governorates',
  'Top diseases this month',
  'Show severity distribution',
  'Predict outbreak hotspots',
  'Generate health intelligence briefing',
];

function EmptyState({ onAction, isAdmin }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', maxWidth: 800, margin: '0 auto', padding: '40px 20px',
      textAlign: 'center', color: 'var(--text-primary)',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(37,99,235,0.1), rgba(124,58,237,0.1))',
        border: '1px solid rgba(37,99,235,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 32px rgba(37,99,235,0.1)',
      }}>
        <Sparkles size={28} style={{ color: 'var(--accent)' }} />
      </div>
      
      <h1 style={{
        fontSize: 28, fontWeight: 800, marginBottom: 12,
        fontFamily: 'var(--font-display)', letterSpacing: '-0.02em',
      }}>
        Healthcare Intelligence Assistant
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 48, maxWidth: 500, lineHeight: 1.6 }}>
        Analyze disease trends, identify outbreaks, generate executive insights, and explore healthcare data.
      </p>

      {isAdmin && (
        <>
          <div style={{ width: '100%', textAlign: 'left', marginBottom: 32 }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 16 }}>
          Quick Actions
        </h3>
        
        {/* Featured Action */}
        <button
          onClick={() => onAction(FEATURED_ACTION.text)}
          style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: 20, width: '100%', marginBottom: 12,
            background: 'linear-gradient(135deg, rgba(37,99,235,0.05), rgba(124,58,237,0.05))',
            border: '1px solid rgba(124,58,237,0.2)', borderRadius: 'var(--radius-lg)',
            textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s ease',
            boxShadow: '0 4px 20px rgba(124,58,237,0.05)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--purple)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(124,58,237,0.15)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.05)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{
            padding: 12, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), var(--purple))',
            color: '#fff', boxShadow: '0 4px 12px rgba(124,58,237,0.3)'
          }}>
            <FEATURED_ACTION.icon size={22} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, letterSpacing: '-0.01em' }}>
              {FEATURED_ACTION.label}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {FEATURED_ACTION.text}
            </div>
          </div>
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {QUICK_ACTIONS.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={() => onAction(action.text)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16,
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', textAlign: 'left', cursor: 'pointer',
                  transition: 'all 0.2s ease', boxShadow: 'var(--shadow-sm)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ padding: 8, borderRadius: 8, background: 'var(--accent-light)', color: 'var(--accent)' }}>
                  <Icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{action.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{action.text}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ width: '100%', textAlign: 'left' }}>
        <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 16 }}>
          Suggested Prompts
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {SUGGESTED_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onAction(prompt)}
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500,
                background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
                borderRadius: 100, color: 'var(--text-secondary)', cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--accent-light)';
                e.currentTarget.style.color = 'var(--accent)';
                e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-card-hover)';
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
}

const EGYPT_GOVERNORATES = [
  'Cairo', 'Alexandria', 'Giza', 'Luxor', 'Aswan', 'Assiut', 'Sohag', 'Qena',
  'Minia', 'Beni Suef', 'Fayoum', 'Matruh', 'Port Said', 'Ismailia', 'Suez',
  'Damietta', 'Kafr El Sheikh', 'Mansoura', 'Tanta', 'Zagazig', 'Banha',
  'Sharm El Sheikh', 'Hurghada', 'Siwa', 'Minya',
];

export default function ChatContainer() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isAdmin = ['super_admin', 'decision_maker', 'admin'].includes(user?.role);
  
  const NORMAL_USER_CHIPS = [
    t('chat.quickQuestions.q1'),
    t('chat.quickQuestions.q2'),
    t('chat.quickQuestions.q3'),
    t('chat.quickQuestions.q4'),
    t('chat.quickQuestions.q5'),
    t('chat.quickQuestions.q6'),
    t('chat.quickQuestions.q7'),
    t('chat.quickQuestions.q8')
  ];

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [govPickerOpen, setGovPickerOpen] = useState(false);
  const [pendingLocationMsg, setPendingLocationMsg] = useState('');
  const [selectedGov, setSelectedGov] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const scrollRef = useRef(null);

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
      setMessages(data.length > 0 ? data : []);
    } catch (err) {
      setError('Failed to load message history.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Fetch conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // 2. Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  const handleNewChat = async () => {
    try {
      const newConv = await chatService.createConversation();
      setConversations(prev => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([]); // Instantly clear chat view
    } catch (err) {
      setError('Failed to create new conversation.');
    }
  };

  const handleDeleteChat = async (id) => {
    try {
      // Optimistic update
      const nextConversations = conversations.filter(c => c.id !== id);
      setConversations(nextConversations);
      
      if (activeConversationId === id) {
        if (nextConversations.length > 0) {
          setActiveConversationId(nextConversations[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }

      await chatService.deleteConversation(id);
    } catch (err) {
      console.error(err);
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

  const handleSend = async (text, context = null) => {
    if (!text.trim()) return;

    // Intercept location-based queries
    const isLocationQuery = text === t('chat.quickQuestions.q1') || text === t('chat.quickQuestions.q4');
    
    if (isLocationQuery && !context) {
      setPendingLocationMsg(text);
      if (!navigator.geolocation) {
        setGovPickerOpen(true);
        return;
      }
      
      setIsLoading(true);
      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude: lat, longitude: lng } }) => {
          setIsLoading(false);
          handleSend(text, { location: { lat, lng }, requireBeds: text === t('chat.quickQuestions.q4') });
        },
        (err) => {
          setIsLoading(false);
          setGovPickerOpen(true);
        },
        { timeout: 8000, maximumAge: 60000 }
      );
      return;
    }

    let currentId = activeConversationId;
    setError(null);
    setIsLoading(true);

    // 1. Handle new conversation creation if none exists
    if (!currentId) {
      try {
        const newConv = await chatService.createConversation(text.substring(0, 30) + '...');
        currentId = newConv.id;
        setActiveConversationId(currentId);
        setConversations(prev => [newConv, ...prev]);
      } catch (err) {
        setError('Failed to start new conversation.');
        setIsLoading(false);
        return;
      }
    }

    // 2. Optimistic update (User message)
    const userMsg = { 
      role: 'user', 
      content: text, 
      created_at: new Date().toISOString(),
      id: Date.now() // temporary ID
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      // 3. Send message to backend
      const response = await chatService.sendMessage(currentId, text, context);
      
      // 4. Update messages with actual server data
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== userMsg.id);
        return [...filtered, response.userMessage, response.assistantMessage];
      });

      // 5. Update title if it was generated (smart title)
      if (response.conversationTitle) {
        setConversations(prev => prev.map(c => 
          c.id === currentId ? { ...c, title: response.conversationTitle } : c
        ));
      }

    } catch (err) {
      setError(err.message || 'Failed to get AI response.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
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
      <div className="flex-1 flex flex-col h-full" style={{ background: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b backdrop-blur-md" style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--success)' }} />
              {conversations.find(c => c.id === activeConversationId)?.title || 'AI Healthcare Analyst'}
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Epicare Health Intelligence • Context Aware</p>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-6 py-8 space-y-6 chatbot-scroll"
        >
          {messages.length === 0 ? (
            <EmptyState onAction={handleSend} isAdmin={isAdmin} />
          ) : (
            <div className="flex flex-col space-y-6">
              {/* Compact Disclaimer Banner */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', margin: '0 20px 8px 20px',
                background: 'rgba(37,99,235,0.04)',
                border: '1px solid rgba(37,99,235,0.1)',
                borderRadius: 'var(--radius)',
              }}>
                <ShieldCheck size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <strong>Healthcare Intelligence:</strong> AI-generated analytical insights based on available healthcare data. Results should support decision-making and not replace professional medical judgment.
                </span>
              </div>

              {messages.map((msg, idx) => (
                <MessageBubble key={msg.id || idx} message={msg} />
              ))}
            </div>
          )}
          {isLoading && <TypingIndicator />}
          {error && (
            <div className="p-3 border rounded-lg text-sm" style={{ background: 'var(--danger-light)', borderColor: 'rgba(220, 38, 38, 0.3)', color: 'var(--danger)' }}>
              {error}
            </div>
          )}
        </div>

        {/* Input or Normal User Chips */}
        <div className="p-6 border-t flex flex-col gap-4 relative" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
          {govPickerOpen && (
            <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm p-4 rounded-xl border shadow-2xl" 
                 style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', zIndex: 50 }}>
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                📍 {t('language') === 'ar' ? 'يرجى اختيار محافظتك يدوياً للحصول على إحصائيات دقيقة:' : 'Please select your governorate manually for accurate statistics:'}
              </p>
              <select value={selectedGov} onChange={e => setSelectedGov(e.target.value)} 
                      className="w-full p-2.5 rounded-lg mb-4 border outline-none text-sm"
                      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                <option value="">{t('language') === 'ar' ? 'اختر المحافظة...' : 'Select Governorate...'}</option>
                {EGYPT_GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <div className="flex gap-3">
                <button className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors" 
                        style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                        onClick={() => { setGovPickerOpen(false); setPendingLocationMsg(''); setSelectedGov(''); }}>
                  {t('common.cancel')}
                </button>
                <button className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                        style={{ background: 'linear-gradient(135deg, var(--accent), var(--purple))' }}
                        disabled={!selectedGov}
                        onClick={() => {
                          setGovPickerOpen(false);
                          handleSend(pendingLocationMsg, { governorate: selectedGov });
                          setPendingLocationMsg('');
                          setSelectedGov('');
                        }}>
                  {t('common.save') || 'Confirm'}
                </button>
              </div>
            </div>
          )}

          {!isAdmin ? (
            <div className="flex flex-col gap-2 w-full max-w-4xl mx-auto">
              <div 
                className="flex items-center justify-between cursor-pointer px-2 py-1 select-none"
                onClick={() => setShowSuggestions(!showSuggestions)}
              >
                <div className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  💡 Suggested Questions
                </div>
                <div className="text-xs font-medium transition-colors hover:text-purple-400" style={{ color: 'var(--accent)' }}>
                  {showSuggestions ? '[ Hide ]' : '[ Show ]'}
                </div>
              </div>
              <div 
                className="grid grid-cols-2 gap-2 overflow-y-auto transition-all duration-300 ease-in-out scrollbar-thin"
                style={{ 
                  maxHeight: showSuggestions ? '160px' : '0px',
                  opacity: showSuggestions ? 1 : 0,
                  pointerEvents: showSuggestions ? 'auto' : 'none',
                }}
              >
                {NORMAL_USER_CHIPS.map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(chip)}
                    disabled={isLoading || govPickerOpen}
                    className="px-4 py-3 rounded-xl text-xs font-medium text-white hover:text-white transition-all border border-white/10 hover:border-purple-400/60 hover:bg-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-start flex items-center justify-start h-full"
                    style={{ background: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ChatInput onSend={handleSend} disabled={isLoading || govPickerOpen} />
          )}
        </div>
      </div>
    </div>
  );
}
