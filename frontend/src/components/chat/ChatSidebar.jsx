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
    <div className="flex flex-col h-full bg-slate-900/50 border-r border-slate-800" style={{ width: 280, minWidth: 280 }}>
      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNew}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-all shadow-lg shadow-blue-900/20"
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
            <p className="text-slate-500 text-sm">No conversations yet</p>
          </div>
        )}

        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group relative flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-all ${
              activeId === conv.id 
                ? 'bg-slate-800 text-white ring-1 ring-slate-700' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
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
              <div key={i} className="h-10 bg-slate-800/50 animate-pulse rounded-lg" />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
        <span>{conversations.length} Conversations</span>
      </div>
    </div>
  );
}
