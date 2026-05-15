'use client';
import dynamic from 'next/dynamic';

const MapWrapper = dynamic(() => import('./HeatmapComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ 
      height: '100%', 
      width: '100%', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: 'var(--bg-card)', 
      borderRadius: '12px',
      border: '1px solid var(--bg-primary)'
    }}>
      <div className="pulse-dot" style={{ background: 'var(--accent)', width: 16, height: 16 }} />
    </div>
  )
});

export default MapWrapper;
