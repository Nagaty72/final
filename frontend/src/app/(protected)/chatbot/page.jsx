'use client';

import dynamic from 'next/dynamic';

/**
 * Chatbot Page
 * =============
 * AI-powered healthcare analytics chatbot page.
 * Dynamically imports ChatContainer to avoid SSR issues.
 */
const ChatContainer = dynamic(
  () => import('@/components/chat/ChatContainer'),
  {
    ssr: false,
    loading: () => (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: 'var(--text-muted)', fontSize: 14,
      }}>
        <div className="pulse-dot" style={{ background: 'var(--accent)', width: 12, height: 12 }} />
      </div>
    ),
  }
);

export default function ChatbotPage() {
  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <ChatContainer />
    </div>
  );
}
