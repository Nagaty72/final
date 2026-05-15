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
        style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      </div>
      {/* Bouncing dots */}
      <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
        style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5">
          <span className="typing-dot" style={{ animationDelay: '0ms' }} />
          <span className="typing-dot" style={{ animationDelay: '160ms' }} />
          <span className="typing-dot" style={{ animationDelay: '320ms' }} />
        </div>
      </div>
    </div>
  );
}
