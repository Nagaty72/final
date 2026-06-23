import React from 'react';
import { useTranslation } from 'react-i18next';

export default function HospitalCard({ hospital, isActive, onClick }) {
  const { t } = useTranslation();

  return (
    <div 
      className={`hospital-card ${isActive ? 'active' : ''}`} 
      onClick={onClick}
    >
      <div className="card-header">
        <div>
          <h3 className="hospital-name">{hospital.name}</h3>
          <p className="hospital-type">
            <span className="type-dot" style={{ background: hospital.type?.toLowerCase().includes('clinic') ? '#10b981' : '#3b82f6' }}></span>
            {hospital.type || t('hospitals.hospital')} • {hospital.district_name || hospital.city}
          </p>
        </div>
        {hospital.distance !== undefined && (
          <div className="distance-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>{(hospital.distance / 1000).toFixed(2)} {t('hospitals.km_away')}</span>
          </div>
        )}
      </div>

      <div className="card-body">
        {hospital.address && (
          <div className="info-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            </svg>
            <span>{hospital.address}</span>
          </div>
        )}
        
        {hospital.phone && (
          <div className="info-row">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
            <span>{hospital.phone}</span>
          </div>
        )}
      </div>

      <div className="card-footer">
        {hospital.emergency_available && (
          <span className="emergency-badge">{t('hospitals.emergency_247')}</span>
        )}
        <div className="capacity-info">
          <div className="capacity-item total" style={{ flex: 1 }}>
            <span className="label">Capacity</span>
            <span className="value">{hospital.capacity || 'N/A'}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .hospital-card {
          background: var(--glass-bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .hospital-card:hover {
          background: var(--bg-card-hover);
          border-color: rgba(59, 130, 246, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
        }
        .hospital-card.active {
          background: var(--bg-card);
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px #3b82f6, 0 6px 20px rgba(59, 130, 246, 0.15);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }
        .hospital-name {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 5px 0;
          line-height: 1.3;
        }
        .hospital-type {
          font-size: 13.5px;
          color: var(--text-secondary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .type-dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .distance-badge {
          display: flex;
          align-items: center;
          gap: 5px;
          background: var(--accent-light);
          color: var(--accent);
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 700;
          white-space: nowrap;
        }
        .card-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .info-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .info-row svg {
          margin-top: 2px;
          flex-shrink: 0;
        }
        .card-footer {
          margin-top: auto;
          padding-top: 14px;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .emergency-badge {
          background: var(--danger-light);
          color: var(--danger);
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          align-self: flex-start;
        }
        .capacity-info {
          display: flex;
          gap: 10px;
          width: 100%;
        }
        .capacity-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(0,0,0,0.03);
          padding: 8px;
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        :global(.dark) .capacity-item {
          background: rgba(255,255,255,0.03);
        }
        .capacity-item.total {
          border-color: var(--border);
        }
        .capacity-item .label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 3px;
          font-weight: 600;
        }
        .capacity-item .value {
          font-size: 16px;
          font-weight: 800;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}
