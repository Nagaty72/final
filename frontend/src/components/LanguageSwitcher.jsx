'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-card)' }} />
    );
  }

  const isArabic = i18n.language === 'ar';

  const toggleLanguage = () => {
    const newLang = isArabic ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      id="language-switcher"
      onClick={toggleLanguage}
      title={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
      aria-label={isArabic ? 'Switch to English' : 'التبديل إلى العربية'}
      style={{
        position: 'relative',
        height: 40,
        minWidth: 40,
        padding: '0 12px',
        borderRadius: 10,
        border: '1px solid var(--border)',
        background: 'var(--bg-card)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        color: 'var(--text-secondary)',
        fontSize: 13,
        fontWeight: 600,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
        letterSpacing: '0.02em',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'var(--accent)';
        e.currentTarget.style.color = 'var(--accent)';
        e.currentTarget.style.boxShadow = '0 0 12px var(--accent-light)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.color = 'var(--text-secondary)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Globe Icon */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <span
        style={{
          transition: 'all 0.3s ease',
        }}
      >
        {isArabic ? 'EN' : 'ع'}
      </span>
    </button>
  );
}
