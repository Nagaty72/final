'use client';

/**
 * MessageBubble
 * ==============
 * Renders a single chat message with adaptive RTL support.
 * - User messages: right-aligned, blue gradient
 * - AI messages: left-aligned, dark glass style with Markdown-like rendering
 */

/**
 * Detect whether text is predominantly Arabic/RTL.
 */
function isArabic(text) {
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  return arabicRegex.test(text) && arabicChars > text.length * 0.15;
}

/**
 * Minimal markdown-to-JSX renderer.
 * Handles: bold, headers, bullet/number lists, code, line breaks.
 */
function renderMarkdown(text) {
  const lines = text.split('\n');
  const elements = [];
  let listBuffer = [];
  let listType = null; // 'ul' | 'ol'
  let tableBuffer = [];

  function flushTable() {
    if (tableBuffer.length === 0) return;
    
    // Parse markdown table rows
    const rows = tableBuffer.map(line => 
      line.split('|').slice(1, -1).map(cell => cell.trim())
    );
    
    if (rows.length > 1) {
      const headers = rows[0];
      // Skip the separator row (e.g., |---|---|)
      const dataRows = rows.slice(2);
      
      elements.push(
        <div key={`table-${elements.length}`} style={{ overflowX: 'auto', margin: '12px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {headers.map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', fontWeight: 600, color: '#e2e8f0' }}>{formatInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '8px 12px', color: '#cbd5e1' }}>{formatInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableBuffer = [];
  }

  function flushList() {
    if (listBuffer.length === 0) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    const style = listType === 'ol'
      ? { paddingLeft: 20, margin: '6px 0', listStyleType: 'decimal' }
      : { paddingLeft: 20, margin: '6px 0', listStyleType: 'disc' };
    elements.push(
      <Tag key={`list-${elements.length}`} style={style}>
        {listBuffer.map((li, i) => <li key={i} style={{ marginBottom: 2, fontSize: 14, lineHeight: 1.6 }}>{formatInline(li)}</li>)}
      </Tag>
    );
    listBuffer = [];
    listType = null;
  }

  function flushAll() {
    flushList();
    flushTable();
  }

  function formatInline(str) {
    // Bold: **text**
    const parts = str.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      // Inline code: `code`
      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((cp, j) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return (
            <code key={`${i}-${j}`} style={{
              background: 'rgba(59,130,246,0.15)', color: '#93c5fd',
              padding: '1px 6px', borderRadius: 4, fontSize: 13,
            }}>
              {cp.slice(1, -1)}
            </code>
          );
        }
        return cp;
      });
    });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headers
    if (line.startsWith('### ')) {
      flushAll();
      elements.push(<h4 key={i} style={{ fontSize: 14, fontWeight: 700, margin: '10px 0 4px', color: '#e2e8f0' }}>{formatInline(line.slice(4))}</h4>);
      continue;
    }
    if (line.startsWith('## ')) {
      flushAll();
      elements.push(<h3 key={i} style={{ fontSize: 15, fontWeight: 700, margin: '12px 0 4px', color: '#f1f5f9' }}>{formatInline(line.slice(3))}</h3>);
      continue;
    }
    if (line.startsWith('# ')) {
      flushAll();
      elements.push(<h2 key={i} style={{ fontSize: 16, fontWeight: 700, margin: '14px 0 6px', color: '#f8fafc' }}>{formatInline(line.slice(2))}</h2>);
      continue;
    }

    // Bullet list
    const bulletMatch = line.match(/^[\s]*[-*]\s+(.+)/);
    if (bulletMatch) {
      if (listType === 'ol') flushList();
      flushTable();
      listType = 'ul';
      listBuffer.push(bulletMatch[1]);
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^[\s]*\d+\.\s+(.+)/);
    if (numMatch) {
      if (listType === 'ul') flushList();
      flushTable();
      listType = 'ol';
      listBuffer.push(numMatch[1]);
      continue;
    }
    
    // Tables
    if (line.trim().startsWith('|') && line.includes('|')) {
      flushList();
      tableBuffer.push(line);
      continue;
    }

    flushAll();

    // Empty line → spacer
    if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 6 }} />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} style={{ margin: '2px 0', fontSize: 14, lineHeight: 1.7 }}>
        {formatInline(line)}
      </p>
    );
  }

  flushAll();
  return elements;
}


export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const rtl = isArabic(message.content);

  return (
    <div
      className={`flex items-start gap-3 px-4 py-2 msg-appear ${isUser ? 'flex-row-reverse' : ''}`}
      dir={rtl ? 'rtl' : 'ltr'}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
        style={{
          background: isUser
            ? 'rgba(59, 130, 246, 0.2)'
            : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          border: isUser ? '1px solid rgba(59,130,246,0.3)' : 'none',
        }}
      >
        {isUser ? (
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#60a5fa" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[75%] px-4 py-3 ${isUser ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm'}`}
        style={{
          background: isUser
            ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
            : 'rgba(30, 41, 59, 0.8)',
          border: isUser ? 'none' : '1px solid var(--border)',
          color: '#f1f5f9',
          wordBreak: 'break-word',
        }}
      >
        {isUser ? (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>{message.content}</p>
        ) : (
          <div>{renderMarkdown(message.content)}</div>
        )}

        {/* Timestamp */}
        <div
          style={{
            fontSize: 10,
            color: isUser ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)',
            marginTop: 6,
            textAlign: isUser ? (rtl ? 'left' : 'right') : (rtl ? 'right' : 'left'),
          }}
        >
          {message.timestamp || (message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
        </div>
      </div>
    </div>
  );
}
