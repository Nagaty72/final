'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

export default function ChatSidebar({ 
  conversations, 
  activeId, 
  onSelect, 
  onNew, 
  onDelete,
  isLoading 
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full border-r" style={{ width: 280, minWidth: 280, background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNew}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))', color: '#fff' }}
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t('chat.new_chat', 'New Conversation')}
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {conversations.length === 0 && !isLoading && (
          <div className="text-center py-10 px-4">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No conversations yet</p>
          </div>
        )}

        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group relative flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all ${
              activeId === conv.id ? 'ring-1' : 'hover:opacity-80'
            }`}
            style={{
              background: activeId === conv.id ? 'var(--accent-light)' : 'transparent',
              color: activeId === conv.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderColor: activeId === conv.id ? 'var(--accent)' : 'transparent',
              boxShadow: activeId === conv.id ? '0 0 0 1px var(--accent)' : 'none'
            }}
            onClick={() => onSelect(conv.id)}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="flex-shrink-0 opacity-70">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            
            <span className="flex-1 truncate text-sm font-medium">
              {conv.title || 'New Conversation'}
            </span>

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        ))}

        {isLoading && conversations.length === 0 && (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg" style={{ background: 'var(--bg-card-hover)' }} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex justify-between" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)', fontSize: 12 }}>
        <span>{conversations.length} Conversations</span>
      </div>
    </div>
  );
}
