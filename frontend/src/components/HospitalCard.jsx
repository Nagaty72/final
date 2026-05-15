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
        {hospital.emergency_available ? (
          <span className="emergency-badge">{t('hospitals.emergency_247')}</span>
        ) : (
          <span className="capacity-text">{t('hospitals.capacity')}: {hospital.capacity || 'N/A'} {t('hospitals.beds')}</span>
        )}
      </div>

      <style jsx>{`
        .hospital-card {
          background: var(--glass-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .hospital-card:hover {
          background: var(--bg-card-hover);
          border-color: rgba(59, 130, 246, 0.5);
          transform: translateY(-2px);
        }
        .hospital-card.active {
          background: var(--bg-card);
          border-color: #3b82f6;
          box-shadow: 0 0 0 1px #3b82f6, 0 4px 20px rgba(59, 130, 246, 0.2);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .hospital-name {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }
        .hospital-type {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
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
          gap: 4px;
          background: var(--accent-light);
          color: var(--accent);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .card-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .info-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        .info-row svg {
          margin-top: 2px;
          flex-shrink: 0;
        }
        .card-footer {
          margin-top: auto;
          padding-top: 8px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .emergency-badge {
          background: var(--danger-light);
          color: var(--danger);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .capacity-text {
          font-size: 12px;
          color: var(--text-muted);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
