'use client';

import { useState, useRef } from 'react';

/**
 * ChatInput
 * ==========
 * Auto-expanding textarea with send button.
 * Supports Enter to send (Shift+Enter for new line).
 */
export default function ChatInput({ onSend, disabled }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div
      className="flex items-end gap-3 p-4"
      style={{
        borderTop: '1px solid var(--border)',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <textarea
        ref={textareaRef}
        id="chat-input"
        rows={1}
        value={value}
        onChange={(e) => { setValue(e.target.value); autoResize(); }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask about healthcare analytics... | اسأل عن تحليلات الرعاية الصحية..."
        style={{
          flex: 1,
          resize: 'none',
          padding: '12px 16px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          color: 'var(--text-primary)',
          fontSize: 14,
          lineHeight: 1.6,
          outline: 'none',
          transition: 'border-color 0.2s',
          maxHeight: 160,
          fontFamily: 'inherit',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />

      {/* Send button */}
      <button
        id="chat-send-btn"
        onClick={handleSubmit}
        disabled={disabled || !value.trim()}
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          border: 'none',
          background:
            disabled || !value.trim()
              ? 'rgba(59,130,246,0.2)'
              : 'linear-gradient(135deg, #3b82f6, #2563eb)',
          color: disabled || !value.trim() ? '#475569' : '#fff',
          cursor: disabled || !value.trim() ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          flexShrink: 0,
          boxShadow:
            disabled || !value.trim()
              ? 'none'
              : '0 4px 15px rgba(59,130,246,0.3)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}
