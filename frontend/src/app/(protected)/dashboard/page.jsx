'use client';

import React, { useEffect, useState } from 'react';
import { getDashboardData } from '@/services/analytics.service';
import MapWrapper from '@/components/MapWrapper';
import { useTranslation } from 'react-i18next';

export default function DashboardPage() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapPoints, setHeatmapPoints] = useState([
    [30.0444, 31.2357, 0.9], // Cairo
    [31.2001, 29.9187, 0.8], // Alexandria
    [25.6872, 32.6396, 0.6], // Luxor
    [24.0889, 32.8998, 0.5], // Aswan
    [27.1801, 31.1837, 0.4], // Assiut
    [29.3084, 30.8428, 0.3], // Fayoum
    [30.5877, 31.5020, 0.7], // Zagazig
    [31.0379, 31.3815, 0.6], // Mansoura
    [29.9668, 32.5498, 0.5], // Suez
    [30.5965, 32.2715, 0.4], // Ismailia
    // Add more points dynamically when real data is available
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const dashboardData = await getDashboardData();
        setData(dashboardData);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleHeatmapClick = () => {
    setShowHeatmap((prev) => !prev);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="pulse-dot" style={{ background: 'var(--accent)', width: 16, height: 16 }} />
      </div>
    );
  }

  if (error) {
    return <div style={{ color: 'var(--danger)', padding: 20 }}>{t('common.error')}: {error}</div>;
  }

  const MAX_BAR = Math.max(...data.monthlyCases.map((m) => m.count), 1);
  const MAX_CITY = data.cityRankings.length > 0 ? Math.max(...data.cityRankings.map((c) => c.cases)) : 1;

  return (
    <div>


      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>{t('dashboard.title')}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            {t('dashboard.overview')}
          </p>
        </div>
        <button className="btn-primary" onClick={handleHeatmapClick} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          {showHeatmap ? t('dashboard.show_charts') : t('dashboard.heatmap_view')}
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        {data.kpis.map((kpi) => (
          <div key={kpi.label} className={`kpi-card ${kpi.color}`}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 8 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
              {kpi.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: kpi.up ? '#4ade80' : '#f87171' }}>
                {kpi.up ? '↑' : '↓'} {kpi.change}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t('dashboard.vs_last_month')}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      {showHeatmap ? (
        <div className="chart-container" style={{ height: '600px', padding: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 2px' }}>{t('dashboard.heatmap_title')}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{t('dashboard.heatmap_desc')}</p>
            </div>
          </div>
          <div style={{ height: 'calc(100% - 40px)', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
            <MapWrapper points={heatmapPoints} />
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 28 }}>
            {/* Monthly Cases Bar Chart */}
            <div className="chart-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 2px' }}>{t('dashboard.monthly_cases')}</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{t('dashboard.monthly_cases_desc')}</p>
                </div>
                <span className="badge blue">2026</span>
              </div>
              <div className="bar-chart">
                {data.monthlyCases.map((m) => (
                  <div
                    key={m.month}
                    className="bar"
                    style={{
                      height: `${(m.count / MAX_BAR) * 100}%`,
                      background: `linear-gradient(to top, #3b82f6, #60a5fa)`,
                    }}
                  >
                    <div className="tooltip">{m.month}: {m.count} {t('dashboard.cases')}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 2px' }}>
                {data.monthlyCases.map((m) => (
                  <span key={m.month} style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', flex: 1 }}>
                    {m.month}
                  </span>
                ))}
              </div>
            </div>

            {/* Disease Breakdown */}
            <div className="chart-container">
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>{t('dashboard.disease_breakdown')}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 20px' }}>{t('dashboard.top_diseases')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {data.diseaseStats.map((d) => (
                  <div key={d.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{d.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.cases} ({d.pct}%)</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${d.pct}%`, height: '100%', borderRadius: 4,
                        background: d.color, transition: 'width 1s ease',
                      }} />
                    </div>
                  </div>
                ))}
                {data.diseaseStats.length === 0 && (
                   <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>{t('dashboard.no_data')}</div>
                )}
              </div>
            </div>
          </div>

          {/* City Analysis & Recent Records Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginBottom: 28 }}>
            
            {/* City Rankings */}
            <div className="chart-container">
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>{t('dashboard.top_cities')}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 20px' }}>{t('dashboard.hotspots')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {data.cityRankings.map((c, idx) => (
                  <div key={c.city} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{c.city}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{c.cases.toLocaleString()}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-primary)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          width: `${(c.cases / MAX_CITY) * 100}%`, height: '100%', borderRadius: 2,
                          background: 'linear-gradient(90deg, #8b5cf6, #c084fc)'
                        }} />
                      </div>
                    </div>
                  </div>
                ))}
                {data.cityRankings.length === 0 && (
                   <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>{t('dashboard.no_data')}</div>
                )}
              </div>
            </div>

            {/* Recent Medical Records Table */}
            <div className="chart-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 2px' }}>{t('dashboard.recent_records')}</h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>{t('dashboard.latest_records_desc')}</p>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('dashboard.record_id')}</th>
                      <th>{t('dashboard.patient')}</th>
                      <th>{t('dashboard.disease')}</th>
                      <th>{t('dashboard.hospital')}</th>
                      <th>{t('dashboard.date')}</th>
                      <th>{t('dashboard.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentRecords.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{r.id}</td>
                        <td style={{ color: 'var(--text-primary)' }}>{r.patient}</td>
                        <td>{r.disease}</td>
                        <td>{r.hospital}</td>
                        <td>{new Date(r.date).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge ${r.status === 'Recovered' ? 'green' : r.status === 'Active' ? 'red' : 'amber'}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {data.recentRecords.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>{t('dashboard.no_records')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
      
      <style jsx>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
