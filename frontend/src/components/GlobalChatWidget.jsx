'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

// ── Constants ────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
const ADMIN_ROLES = ['super_admin', 'decision_maker', 'admin'];

const EGYPT_GOVERNORATES = [
  'Cairo', 'Alexandria', 'Giza', 'Luxor', 'Aswan', 'Assiut', 'Sohag', 'Qena',
  'Minia', 'Beni Suef', 'Fayoum', 'Matruh', 'Port Said', 'Ismailia', 'Suez',
  'Damietta', 'Kafr El Sheikh', 'Mansoura', 'Tanta', 'Zagazig', 'Banha',
  'Sharm El Sheikh', 'Hurghada', 'Siwa', 'Minya',
];

// Bilingual chip definitions
const CHIPS_EN = [
  { id: 'diseases', label: '🦠 Most common diseases', message: 'What are the most common diseases right now?' },
  { id: 'prevention', label: '🛡️ Prevention tips', message: 'Give me general prevention tips.' },
  { id: 'fever', label: '🌡️ Fever guidance', message: 'What should I do if I have a fever?' },
  { id: 'hospital', label: '🏥 Find nearest hospital', message: '__NEAREST_HOSPITAL__' },
];
const CHIPS_AR = [
  { id: 'diseases', label: '🦠 الأمراض الأكثر شيوعاً', message: 'ما هي الأمراض الأكثر شيوعاً الآن؟' },
  { id: 'prevention', label: '🛡️ نصائح الوقاية', message: 'أعطني نصائح عامة للوقاية من الأمراض.' },
  { id: 'fever', label: '🌡️ إرشادات الحمى', message: 'ماذا أفعل إذا كانت لدي حمى؟' },
  { id: 'hospital', label: '🏥 أقرب مستشفى', message: '__NEAREST_HOSPITAL__' },
];

// Lightweight markdown → safe HTML for chat bubbles
function formatMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.15);border-radius:4px;padding:0 4px;font-size:11px">$1</code>')
    .replace(/^#{1,3} (.+)$/gm, '<b style="display:block;margin-top:6px">$1</b>')
    .replace(/^[-•] (.+)$/gm, '<li style="margin-left:12px;list-style:disc">$1</li>')
    .replace(/\n/g, '<br/>');
}

// ── Drag Hook ────────────────────────────────────────────────────────────────
function useDraggable(defaultPos) {
  const [pos, setPos] = useState(defaultPos);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(null);
  const startRef = useRef(null);
  const movedRef = useRef(false); // distinguish click from drag

  const onMouseDown = useCallback((e) => {
    // Only drag on the header/FAB, not on buttons inside
    if (e.target.closest('button:not(.drag-handle), select, input, a, .no-drag')) return;
    e.preventDefault();
    movedRef.current = false;
    startRef.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    setDragging(true);
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const { mx, my, px, py } = startRef.current;
      const dx = e.clientX - mx;
      const dy = e.clientY - my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
      setPos({ x: px + dx, y: py + dy });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    // Touch support
    const onTouchMove = (e) => {
      const t = e.touches[0];
      const { mx, my, px, py } = startRef.current;
      const dx = t.clientX - mx;
      const dy = t.clientY - my;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
      setPos({ x: px + dx, y: py + dy });
    };
    const onTouchEnd = () => setDragging(false);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [dragging]);

  const onTouchStart = useCallback((e) => {
    if (e.target.closest('button:not(.drag-handle), select, input, a, .no-drag')) return;
    movedRef.current = false;
    const t = e.touches[0];
    startRef.current = { mx: t.clientX, my: t.clientY, px: pos.x, py: pos.y };
    setDragging(true);
  }, [pos]);

  return { pos, dragging, movedRef, dragRef, onMouseDown, onTouchStart };
}

// ── Main Widget ──────────────────────────────────────────────────────────────
export default function GlobalChatWidget() {
  const { user, token, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const isAdmin = ADMIN_ROLES.includes(user?.role);
  const isArabic = i18n.language === 'ar';
  const CHIPS = isArabic ? CHIPS_AR : CHIPS_EN;

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [busy, setBusy] = useState(false);
  const [selectedGov, setSelectedGov] = useState('');
  const [mounted, setMounted] = useState(false);

  // Drag state — default position anchors FAB to bottom-right
  const { pos, dragging, movedRef, dragRef, onMouseDown, onTouchStart } =
    useDraggable({ x: 0, y: 0 }); // offset from natural fixed bottom-6 right-6

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open && isAdmin) inputRef.current?.focus();
  }, [open, isAdmin]);

  // ── Push a message bubble ──
  const pushMessage = useCallback((role, content, extra = {}) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, content, ...extra }]);
  }, []);

  // ── Update the last message matching a type ──
  const updateLastByType = useCallback((type, patch) => {
    setMessages(prev => {
      const updated = [...prev];
      // findLastIndex polyfill-safe
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].type === type) { updated[i] = { ...updated[i], ...patch }; break; }
      }
      return updated;
    });
  }, []);

  // ── Public API call (guests & normal_users) ──
  const callPublicAPI = useCallback(async (message, governorate, context = null) => {
    const res = await fetch(`${API_BASE}/api/v1/public/widget-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, governorate, context, language: isArabic ? 'ar' : 'en' }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Server error ${res.status}${txt ? ': ' + txt.slice(0, 120) : ''}`);
    }
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Request failed');
    return json.response;
  }, [isArabic]);

  // ── Authenticated admin API call ──
  const callAuthAPI = useCallback(async (message, context = null) => {
    const res = await fetch(`${API_BASE}/api/v1/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ message, context }),
    });
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'Request failed');
    return json.assistantMessage?.content || json.response || 'No response.';
  }, [token]);

  // ── Generic send ──
  const send = useCallback(async (message, payloadOverrides = {}) => {
    if (!message.trim()) return;
    setBusy(true);
    pushMessage('user',
      message === '__NEAREST_HOSPITAL__'
        ? `🏥 ${isArabic ? 'أين أقرب مستشفى' : 'Where is the nearest hospital'}${payloadOverrides.governorate ? ` (${payloadOverrides.governorate})` : ''}?`
        : message
    );
    try {
      const response = (isAdmin && !message.startsWith('__NEAREST_HOSPITAL__'))
        ? await callAuthAPI(message, payloadOverrides.context)
        : await callPublicAPI(message, payloadOverrides.governorate, payloadOverrides.context);
      pushMessage('assistant', response);
    } catch (err) {
      pushMessage('assistant', `⚠️ ${err.message || (isArabic ? 'حدث خطأ， يرجى المحاولة مرة أخرى.' : 'Something went wrong. Please try again.')}`);
    } finally {
      setBusy(false);
    }
  }, [isAdmin, isArabic, callAuthAPI, callPublicAPI, pushMessage]);

  // ── Handle chip click ──
  const handleChip = useCallback((chip) => {
    if (busy) return;

    const isLocationQuery = chip.id === 'hospital' || chip.message === t('chat.quickQuestions.q1') || chip.message === t('chat.quickQuestions.q4');

    if (isLocationQuery) {
      if (chip.id === 'hospital') {
        pushMessage('user', isArabic ? '🏥 أين أقرب مستشفى؟' : '🏥 Where is the nearest hospital?');
      }

      if (!navigator.geolocation) {
        pushMessage('assistant', null, { type: 'gov-picker', pendingMessage: chip.message });
        return;
      }

      pushMessage('assistant', isArabic ? '📍 جارٍ تحديد موقعك...' : '📍 Requesting your location...', { type: 'geo-pending' });

      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude: lat, longitude: lng } }) => {
          updateLastByType('geo-pending', {
            content: isArabic
              ? `📍 تم تحديد الموقع (${lat.toFixed(3)}, ${lng.toFixed(3)}). جارٍ البحث...`
              : `📍 Location detected (${lat.toFixed(3)}, ${lng.toFixed(3)}). Searching...`,
            type: undefined,
          });
          send(chip.message === '__NEAREST_HOSPITAL__' || chip.id === 'hospital' ? '__NEAREST_HOSPITAL__' : chip.message, { context: { location: { lat, lng }, requireBeds: chip.message === t('chat.quickQuestions.q4') } });
        },
        (err) => {
          // Permission denied or unavailable → show picker
          const deniedMsg = isArabic
            ? '⚠️ تعذّر الوصول إلى الموقع. يرجى تفعيل خدمات الموقع أو اختيار محافظتك يدوياً.'
            : '⚠️ Location access was denied or unavailable. Please enable location services, or select your governorate manually.';
          updateLastByType('geo-pending', { content: deniedMsg, type: 'gov-picker', pendingMessage: chip.message });
        },
        { timeout: 8000, maximumAge: 60000 }
      );
      return;
    }

    send(chip.message);
  }, [busy, isArabic, pushMessage, updateLastByType, send]);

  // ── Handle governorate submit ──
  const handleGovSubmit = useCallback((pendingMessage) => {
    if (!selectedGov) return;
    setMessages(prev => prev.filter(m => m.type !== 'gov-picker'));
    
    // Check if it's hospital query or normal chip message
    const msgToSend = pendingMessage && typeof pendingMessage === 'string' ? pendingMessage : '__NEAREST_HOSPITAL__';
    
    send(msgToSend, { context: { governorate: selectedGov } });
    setSelectedGov('');
  }, [selectedGov, send]);

  // ── Handle free-text (admin) ──
  const handleFreeText = useCallback((e) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text || busy) return;
    setInputText('');
    send(text);
  }, [inputText, busy, send]);

  // ── FAB click — only fires if not a drag ──
  const handleFABClick = useCallback(() => {
    if (movedRef.current) return; // was a drag, not a click
    setOpen(o => !o);
  }, [movedRef]);

  if (!mounted) return null;

  // Dynamic positioning offset applied to the outermost wrapper
  const wrapperStyle = {
    transform: `translate(${pos.x}px, ${pos.y}px)`,
    transition: dragging ? 'none' : 'transform 0.15s ease',
  };

  return (
    <>
      <div ref={dragRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none" style={wrapperStyle}>
        {/* ── Chat Panel ── */}
        {open && (
          <div
            className="w-[360px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10 pointer-events-auto"
            style={{ background: 'linear-gradient(160deg,#0f172a 0%,#1e1b4b 100%)', maxHeight: '540px' }}
          >
            {/* Draggable Header */}
            <div
              className="drag-handle flex items-center gap-3 px-4 py-3 border-b border-white/10 select-none"
              style={{ background: 'rgba(255,255,255,0.04)', cursor: dragging ? 'grabbing' : 'grab' }}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>✨</div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm leading-tight">
                  {isArabic ? 'مساعد الصحة الذكي' : 'AI Health Assistant'}
                </p>
                <p className="text-purple-300 text-xs truncate">
                  {user
                    ? (isArabic ? `مسجّل دخول: ${user.role?.replace('_', ' ')}` : `Signed in as ${user.role?.replace('_', ' ')}`)
                    : (isArabic ? 'وضع الضيف' : 'Guest mode')}
                </p>
              </div>
              <button onClick={() => setOpen(false)}
                className="text-white/40 hover:text-white/80 transition-colors text-lg leading-none flex-shrink-0"
                aria-label="Close">✕</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ minHeight: '220px' }}>
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-2xl mb-2">🏥</p>
                  <p className="text-white/60 text-sm">
                    {isArabic
                      ? 'اسألني أي شيء عن الصحة العامة في مصر.'
                      : 'Ask me anything about public health in Egypt.'}
                  </p>
                </div>
              )}

              {messages.map((msg) => {
                // Governorate picker bubble
                if (msg.type === 'gov-picker') {
                  return (
                    <div key={msg.id} className="flex flex-col gap-2">
                      <div className="self-start max-w-[90%] rounded-2xl rounded-tl-sm px-3 py-2 text-sm text-white/90"
                        style={{ background: 'rgba(139,92,246,0.25)' }}>
                        {msg.content || (isArabic
                          ? '📍 يرجى تحديد محافظتك للعثور على أقرب مستشفى:'
                          : '📍 Location access denied. Please select your governorate:')}
                      </div>
                      <div className="flex gap-2 self-start max-w-[90%] w-full">
                        <select value={selectedGov} onChange={e => setSelectedGov(e.target.value)}
                          className="flex-1 rounded-xl px-3 py-2 text-sm text-white border border-white/20 outline-none"
                          style={{ background: '#1e1b4b' }}>
                          <option value="">{isArabic ? 'اختر المحافظة...' : 'Select Governorate...'}</option>
                          {EGYPT_GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <button onClick={() => handleGovSubmit(msg.pendingMessage)} disabled={!selectedGov || busy}
                          className="px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white' }}>
                          {isArabic ? 'بحث' : 'Go'}
                        </button>
                      </div>
                    </div>
                  );
                }

                const isUser = msg.role === 'user';
                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="max-w-[88%] px-3 py-2 text-sm leading-relaxed"
                      style={{
                        background: isUser ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.08)',
                        color: 'white',
                        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      }}
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content || '') }}
                    />
                  </div>
                );
              })}

              {/* Typing dots */}
              {busy && (
                <div className="flex justify-start">
                  <div className="flex gap-1 px-4 py-3" style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '18px 18px 18px 4px' }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-2 h-2 rounded-full bg-purple-400"
                        style={{ animation: `wcBounce 1.2s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Action Chips (Grid Layout for Normal Users) */}
          <div className="px-3 pb-3 pt-2 border-t border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
            {!isAdmin && <p className="text-xs text-white/50 mb-2 px-1">{isArabic ? 'أسئلة سريعة:' : 'Quick Questions:'}</p>}
            
            {/* Emergency Support Prominent Button */}
            <button 
              onClick={() => handleChip({ message: t('chat.quickQuestions.emergency') })} 
              disabled={busy}
              className="w-full mb-2 px-3 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all border flex items-center justify-center gap-2 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.2), rgba(153, 27, 27, 0.4))',
                borderColor: 'rgba(239, 68, 68, 0.4)',
                opacity: busy ? 0.5 : 1
              }}
            >
              <span className="text-red-400">🚨</span>
              {isArabic ? 'التواصل مع الدعم الطبي أو الطوارئ' : 'Contact Medical Support / Emergency'}
            </button>

            <div className="grid grid-cols-2 gap-2">
              {CHIPS.map(chip => (
                <button key={chip.id} onClick={() => handleChip(chip)} disabled={busy}
                  className="px-2 py-2 rounded-xl text-[11px] leading-tight font-medium text-white/80 hover:text-white transition-all border border-white/10 hover:border-purple-400/60 hover:bg-purple-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-start flex items-center justify-start h-full">
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

            {/* Free-text (admins only) */}
            {isAdmin && (
              <form onSubmit={handleFreeText} className="flex gap-2 px-3 pb-3 pt-2">
                <input ref={inputRef} type="text" value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={isArabic ? 'اكتب سؤالاً تحليلياً…' : 'Ask a custom analytics question…'}
                  dir={isArabic ? 'rtl' : 'ltr'}
                  className="flex-1 rounded-xl px-3 py-2 text-sm text-white border border-white/20 outline-none placeholder:text-white/30 focus:border-purple-400/60 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                  disabled={busy} />
                <button type="submit" disabled={!inputText.trim() || busy}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} aria-label="Send">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        )}

        {/* ── Draggable FAB ── */}
        <button
          onClick={handleFABClick}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          aria-label="Toggle AI Health Assistant"
          className="drag-handle w-14 h-14 rounded-full shadow-2xl flex items-center justify-center group select-none pointer-events-auto"
          style={{
            background: open
              ? 'linear-gradient(135deg,#4f46e5,#7c3aed)'
              : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            boxShadow: '0 8px 32px rgba(99,102,241,0.45)',
            cursor: dragging ? 'grabbing' : 'grab',
          }}
        >
          <span className="text-2xl pointer-events-none" style={{ transform: open ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s' }}>
            {open ? '✕' : '✨'}
          </span>
          {!open && (
            <span className="absolute w-full h-full rounded-full animate-ping opacity-30 pointer-events-none"
              style={{ background: '#6366f1' }} />
          )}
        </button>
      </div>

      <style>{`
        @keyframes wcBounce {
          0%,80%,100% { transform:translateY(0); }
          40% { transform:translateY(-6px); }
        }
      `}</style>
    </>
  );
}
