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
              <tr style={{ background: 'var(--bg-card-hover)', borderBottom: '1px solid var(--border)' }}>
                {headers.map((h, i) => (
                  <th key={i} style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>{formatInline(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{formatInline(cell)}</td>
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
      ? { paddingLeft: 20, margin: '6px 0', listStyleType: 'decimal', color: 'var(--text-primary)' }
      : { paddingLeft: 20, margin: '6px 0', listStyleType: 'disc', color: 'var(--text-primary)' };
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
        return <strong key={i} style={{ color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>;
      }
      // Inline code: `code`
      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((cp, j) => {
        if (cp.startsWith('`') && cp.endsWith('`')) {
          return (
            <code key={`${i}-${j}`} style={{
              background: 'var(--accent-light)', color: 'var(--accent)',
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
    if (line.startsWith('### ') || line.startsWith('## ') || line.startsWith('# ')) {
      flushAll();
      const level = line.startsWith('### ') ? 3 : line.startsWith('## ') ? 2 : 1;
      const text = formatInline(line.replace(/^#+\s/, ''));
      const rawText = line.replace(/^#+\s/, '').replace(/\*\*/g, '').trim();

      // Check if it's one of the premium structured sections
      const isPremiumSection = ['summary', 'key insights', 'recommendations', 'risk level'].some(k => rawText.toLowerCase().includes(k));

      if (isPremiumSection) {
        let icon = '◈';
        let color = 'var(--accent)';
        let bg = 'var(--accent-light)';
        
        if (rawText.toLowerCase().includes('insights')) { color = 'var(--purple)'; bg = 'rgba(124,58,237,0.1)'; icon = '💡'; }
        if (rawText.toLowerCase().includes('recommendations')) { color = 'var(--success)'; bg = 'var(--success-light)'; icon = '✓'; }
        if (rawText.toLowerCase().includes('risk')) { color = 'var(--danger)'; bg = 'var(--danger-light)'; icon = '⚠️'; }

        elements.push(
          <div key={`section-${i}`} style={{
            marginTop: 24, marginBottom: 12, paddingBottom: 8,
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: 6, background: bg, color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12
            }}>
              {icon}
            </div>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {text}
            </h3>
          </div>
        );
      } else {
        const fontSize = level === 1 ? 18 : level === 2 ? 16 : 14;
        const margin = level === 1 ? '20px 0 10px' : level === 2 ? '16px 0 8px' : '12px 0 4px';
        elements.push(<h4 key={i} style={{ fontSize, fontWeight: 700, margin, color: 'var(--text-primary)' }}>{text}</h4>);
      }
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
      <p key={i} style={{ margin: '4px 0', fontSize: 14, lineHeight: 1.75, color: 'var(--text-secondary)' }}>
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
        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-1"
        style={{
          background: isUser
            ? 'var(--accent-light)'
            : 'linear-gradient(135deg, var(--accent), var(--purple))',
          border: isUser ? '1px solid rgba(59,130,246,0.3)' : 'none',
          boxShadow: isUser ? 'none' : '0 4px 15px rgba(124,58,237,0.2)',
        }}
      >
        {isUser ? (
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--accent)" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] px-5 py-4 ${isUser ? 'rounded-2xl rounded-tr-sm' : 'rounded-2xl rounded-tl-sm'}`}
        style={{
          background: isUser
            ? 'linear-gradient(135deg, var(--accent), var(--accent-hover))'
            : 'var(--bg-secondary)',
          border: isUser ? 'none' : '1px solid var(--border)',
          color: isUser ? '#fff' : 'var(--text-primary)',
          wordBreak: 'break-word',
          boxShadow: isUser ? '0 4px 15px var(--accent-glow)' : 'var(--shadow-sm)',
        }}
      >
        {isUser ? (
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7 }}>{message.content}</p>
        ) : (
          <div className="ai-structured-response">{renderMarkdown(message.content)}</div>
        )}

        {/* Timestamp */}
        <div
          style={{
            fontSize: 10,
            color: isUser ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
            marginTop: 6,
            textAlign: isUser ? (rtl ? 'left' : 'right') : (rtl ? 'right' : 'left'),
          }}
        >
          {message.timestamp || (message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}
        </div>

        {/* Data Sources (AI Only) */}
        {!isUser && (
          <div style={{
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px dashed var(--border)',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Data Sources Used
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Disease Statistics', 'Medical Records', 'Hospital Database'].map((source, i) => (
                <span key={i} style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: 5, 
                  padding: '4px 8px', background: 'var(--bg-primary)', 
                  border: '1px solid var(--border)', borderRadius: 6, 
                  fontSize: 11, color: 'var(--text-secondary)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
