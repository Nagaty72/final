import React, { useState, useRef, useEffect } from 'react';

export default function DiseaseSelector({ diseases, selectedDiseaseId, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDiseases = diseases.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedDisease = diseases.find(d => d.id === selectedDiseaseId);

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'var(--bg-card, #fff)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '8px',
          cursor: 'pointer',
          color: 'var(--text-primary, #1e293b)',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--text-muted, #64748b)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>{selectedDiseaseId === 'all' ? 'All Diseases' : (selectedDisease?.name || 'Select a disease')}</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {selectedDiseaseId !== 'all' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChange('all');
                setSearchTerm('');
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px',
                cursor: 'pointer',
                color: 'var(--text-muted, #64748b)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Clear selection"
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <svg 
            width="16" 
            height="16" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2} 
            style={{ 
              color: 'var(--text-muted, #64748b)',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: 'var(--bg-card, #fff)',
          border: '1px solid var(--border, #e2e8f0)',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          zIndex: 50,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
            <div style={{ position: 'relative' }}>
              <svg 
                width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #64748b)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search diseases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 8px 8px 30px',
                  borderRadius: '6px',
                  border: '1px solid var(--border, #e2e8f0)',
                  background: 'var(--bg-primary, #f8fafc)',
                  color: 'var(--text-primary, #1e293b)',
                  fontSize: '14px',
                  outline: 'none'
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            <div 
              onClick={() => {
                onChange('all');
                setIsOpen(false);
                setSearchTerm('');
              }}
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: selectedDiseaseId === 'all' ? 600 : 400,
                color: selectedDiseaseId === 'all' ? 'var(--accent, #3b82f6)' : 'var(--text-primary, #1e293b)',
                background: selectedDiseaseId === 'all' ? 'var(--bg-primary, #f8fafc)' : 'transparent',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary, #f8fafc)'}
              onMouseLeave={(e) => e.currentTarget.style.background = selectedDiseaseId === 'all' ? 'var(--bg-primary, #f8fafc)' : 'transparent'}
            >
              All Diseases
            </div>
            
            {filteredDiseases.length > 0 ? (
              filteredDiseases.map(d => (
                <div
                  key={d.id}
                  onClick={() => {
                    onChange(d.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '10px 14px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: selectedDiseaseId === d.id ? 600 : 400,
                    color: selectedDiseaseId === d.id ? 'var(--accent, #3b82f6)' : 'var(--text-primary, #1e293b)',
                    background: selectedDiseaseId === d.id ? 'var(--bg-primary, #f8fafc)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary, #f8fafc)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = selectedDiseaseId === d.id ? 'var(--bg-primary, #f8fafc)' : 'transparent'}
                >
                  <span>{d.name}</span>
                  {selectedDiseaseId === d.id && (
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
                No diseases found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
