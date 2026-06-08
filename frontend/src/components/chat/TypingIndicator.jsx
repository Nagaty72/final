'use client';

/**
 * TypingIndicator
 * ================
 * Animated dots indicating the AI is composing a response.
 */
export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {/* AI avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, var(--accent), var(--purple))',
          boxShadow: '0 4px 15px rgba(124,58,237,0.2)',
        }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </div>
      {/* Bouncing dots */}
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
        style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5">
          <span className="typing-dot" style={{ animationDelay: '0ms' }} />
          <span className="typing-dot" style={{ animationDelay: '160ms' }} />
          <span className="typing-dot" style={{ animationDelay: '320ms' }} />
        </div>
      </div>
    </div>
  );
}
