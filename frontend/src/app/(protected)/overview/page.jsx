'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getDashboardKpis,
  getDashboardTrends,
  getDashboardDiseaseBreakdown,
  getCityList
} from '@/services/analytics.service';
import {
  Activity, HeartPulse, ShieldCheck, TrendingUp, AlertTriangle,
  MapPin, Calendar, ArrowRight, Info, CheckCircle, List, Building2, UserCircle, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const DISEASE_GUIDELINES = {
  'COVID-19': {
    prevention: 'Wear masks in crowded indoor spaces, practice frequent hand hygiene, and stay up to date with vaccinations.',
    care: 'Isolate from others, rest, stay hydrated, and monitor oxygen levels. Seek emergency care if breathing becomes difficult.'
  },
  'Cholera': {
    prevention: 'Drink only safe or boiled water. Wash hands thoroughly with soap, especially before eating and after using the restroom.',
    care: 'Immediately begin oral rehydration therapy. Seek urgent medical attention for intravenous fluids and antibiotics.'
  },
  'Malaria': {
    prevention: 'Use insecticide-treated bed nets, apply insect repellent, and wear long sleeves after dusk in endemic areas.',
    care: 'Seek immediate medical diagnosis and testing. Take prescribed antimalarial medications exactly as directed.'
  },
  'Influenza': {
    prevention: 'Get the annual flu vaccine, avoid close contact with sick people, and wash your hands regularly.',
    care: 'Get plenty of rest, stay hydrated, and take over-the-counter medications to relieve symptoms.'
  },
  'Dengue': {
    prevention: 'Eliminate standing water around your home. Use mosquito repellent and wear protective clothing.',
    care: 'Rest and drink plenty of fluids. Avoid NSAIDs like ibuprofen; use acetaminophen for fever instead.'
  },
  'Measles': {
    prevention: 'Ensure complete vaccination (MMR). Avoid contact with infected individuals.',
    care: 'Rest, hydrate, and take Vitamin A supplements as directed by a healthcare professional.'
  },
  'Tuberculosis': {
    prevention: 'Ensure adequate ventilation in living spaces. Get the BCG vaccine if recommended in your area.',
    care: 'Adhere strictly to the full 6-to-9 month antibiotic course. Do not stop medication early.'
  },
  'Typhoid': {
    prevention: 'Get vaccinated if traveling to endemic areas. Eat only thoroughly cooked food and drink safe water.',
    care: 'Take prescribed antibiotics, drink plenty of fluids, and rest until fully recovered.'
  },
  default: {
    prevention: 'Maintain good personal hygiene, eat a balanced diet, and stay informed about local health alerts.',
    care: 'Rest, stay hydrated, and consult a healthcare professional for specific medical advice.'
  }
};

export default function OverviewPage() {
  const { user } = useAuth();

  // ── Filters State ──
  const [city, setCity] = useState('');
  const [months, setMonths] = useState(6);
  const [cities, setCities] = useState([]);

  // ── Data State ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    kpis: null,
    trends: [],
    diseases: []
  });

  // ── Fetch Initial Lookups ──
  useEffect(() => {
    getCityList().then(res => {
      if (res?.data) {
        setCities(res.data);
      }
    }).catch(console.error);
  }, []);

  // ── Fetch Main Data ──
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const d = new Date();
        d.setMonth(d.getMonth() - months);
        const startDate = d.toISOString().split('T')[0];
        const filters = { city: city || undefined, startDate };

        const [kpiRes, trendRes, diseaseRes] = await Promise.all([
          getDashboardKpis(filters),
          getDashboardTrends(filters),
          getDashboardDiseaseBreakdown(filters)
        ]);

        const rawTrends = trendRes.data || [];
        const paddedTrends = [];
        for (let i = months - 1; i >= 0; i--) {
          const mDate = new Date();
          mDate.setMonth(mDate.getMonth() - i);
          const monthStr = mDate.toISOString().substring(0, 7); // YYYY-MM
          const existing = rawTrends.find(t => t.month === monthStr);
          paddedTrends.push(existing || { month: monthStr, total_cases: 0 });
        }

        setData({
          kpis: kpiRes.data?.[0] || null,
          trends: paddedTrends,
          diseases: diseaseRes.data || [] // keep all for guidelines section
        });
      } catch (err) {
        console.error("Overview Fetch Error:", err);
        setError("Failed to load health insights. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [city, months]);

  // ── Helpers ──
  const fmtN = (n) => typeof n === 'number' ? n.toLocaleString() : '0';

  // ── Insights Logic ──
  const topDiseaseName = data.diseases?.[0]?.disease_name || 'various conditions';
  const totalCases = data.kpis?.total_cases || 0;

  const mockRecommendations = [
    { title: 'Seasonal Alert', desc: 'Stay hydrated and ensure adequate rest during seasonal transitions to boost immunity.' },
    { title: 'Preventive Care', desc: 'Regular hand washing remains the most effective way to prevent the spread of infectious diseases.' }
  ];

  return (
    <div className="overview-layout">
      {/* ── HERO SECTION ── */}
      <div className="hero-section">
        <div className="hero-content">
          <h1>Welcome to Epicare, {user?.full_name || 'User'}!</h1>
          <p>
            Your personalized public health overview. Track real-time disease trends, monitor active cases, and stay informed with actionable insights for your community.
          </p>
        </div>
      </div>

      {/* ── FILTERS BAR ── */}
      <div className="filters-bar">
        <div className="filter-group" style={{ flex: 1, maxWidth: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label><Calendar size={14} /> Timeframe</label>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
              Last {months} Month{months > 1 ? 's' : ''}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="12"
            step="1"
            value={months}
            onChange={e => setMonths(Number(e.target.value))}
            className="modern-range"
          />
        </div>
        <div className="filter-group">
          <label><MapPin size={14} /> Governorate</label>
          <select value={city} onChange={e => setCity(e.target.value)}>
            <option value="">All Governorates</option>
            {cities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── ERROR & LOADING STATES ── */}
      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Analyzing health intelligence data...</p>
        </div>
      )}

      {!loading && !error && (
        <div className="dashboard-grid">

          {/* ── KPI CARDS ── */}
          <div className="kpi-grid">
            <div className="kpi-card blue border-t-4 border-blue-500">
              <div className="icon-wrap"><Activity size={20} /></div>
              <div className="kpi-info">
                <span>Total Reported</span>
                <h3>{fmtN(data.kpis?.total_cases)}</h3>
              </div>
            </div>
            <div className="kpi-card orange border-t-4 border-amber-500">
              <div className="icon-wrap"><AlertTriangle size={20} /></div>
              <div className="kpi-info">
                <span>Active Cases</span>
                <h3>{fmtN(data.kpis?.active_cases)}</h3>
              </div>
            </div>
            <div className="kpi-card green border-t-4 border-emerald-500">
              <div className="icon-wrap"><ShieldCheck size={20} /></div>
              <div className="kpi-info">
                <span>Recovered</span>
                <h3>{fmtN(data.kpis?.recovered_cases)}</h3>
              </div>
            </div>
            <div className="kpi-card purple border-t-4 border-purple-500">
              <div className="icon-wrap"><HeartPulse size={20} /></div>
              <div className="kpi-info">
                <span>Diseases Tracked</span>
                <h3>{fmtN(data.kpis?.active_outbreaks)}</h3>
              </div>
            </div>
          </div>

          <div className="main-content-row">
            {/* ── TRENDS CHART ── */}
            <div className="chart-card">
              <div className="card-header">
                <h3>Health Trends (Last {months} Months)</h3>
                <span className="subtitle">Case volume over time</span>
              </div>
              <div className="chart-body">
                {data.trends.length > 0 ? (
                  <div className="w-full" style={{ height: '350px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} minTickGap={20} />
                      <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} width={45} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px' }}
                        itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
                        labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }}
                      />
                      <Area type="monotone" dataKey="total_cases" name="Cases" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCases)" />
                    </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="empty-chart">No trend data available for this selection.</div>
                )}
              </div>
            </div>

            <div className="side-column">
              {/* ── TOP DISEASES ── */}
              <div className="side-card">
                <h3>Top Conditions</h3>
                <div className="disease-list">
                  {data.diseases.length > 0 ? data.diseases.slice(0, 5).map((d, i) => (
                    <div key={i} className="disease-item">
                      <div className="disease-info">
                        <span className="disease-name">{d.disease_name}</span>
                        <span className="disease-count">{fmtN(d.total_cases)} cases</span>
                      </div>
                      <div className="disease-bar-bg">
                        <div className="disease-bar-fill" style={{ width: `${Math.max(10, (d.total_cases / totalCases) * 100)}%` }} />
                      </div>
                    </div>
                  )) : (
                    <div className="empty-text">No data available</div>
                  )}
                </div>
              </div>

              {/* ── INSIGHTS & RECOMMENDATIONS ── */}
              <div className="side-card highlight">
                <h3><Info size={16} style={{ display: 'inline', marginBottom: '-2px', marginRight: 6 }} /> Health Insights</h3>
                <p className="insight-text">
                  Currently, <strong>{topDiseaseName}</strong> is the most prominent condition {city ? `in ${city}` : 'across all regions'}. Please review the preventive care guidelines below.
                </p>
                <div className="recommendations">
                  {mockRecommendations.map((rec, i) => (
                    <div key={i} className="rec-item">
                      <CheckCircle size={14} className="rec-icon" />
                      <div className="rec-content">
                        <strong>{rec.title}</strong>
                        <p>{rec.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── QUICK ACTIONS ── */}
          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="action-grid">
              <Link href="/chatbot" className="action-card">
                <div className="action-icon blue"><Sparkles size={20} /></div>
                <div className="action-text">
                  <h4>AI Health Assistant</h4>
                  <p>Ask questions & get AI insights</p>
                </div>
                <ArrowRight size={16} className="action-arrow" />
              </Link>
              <Link href="/hospitals" className="action-card">
                <div className="action-icon green"><Building2 size={20} /></div>
                <div className="action-text">
                  <h4>Healthcare Facilities</h4>
                  <p>Find registered hospitals</p>
                </div>
                <ArrowRight size={16} className="action-arrow" />
              </Link>
              <Link href="/settings" className="action-card">
                <div className="action-icon purple"><UserCircle size={20} /></div>
                <div className="action-text">
                  <h4>Your Profile</h4>
                  <p>Manage account settings</p>
                </div>
                <ArrowRight size={16} className="action-arrow" />
              </Link>
            </div>
          </div>

          {/* ── HEALTH GUIDELINES & TIPS ── */}
          <div className="guidelines-section">
            <h3>Health Guidelines & Tips</h3>
            <p className="section-subtitle">Targeted preventive care and instructions for the most prevalent conditions.</p>
            <div className="guidelines-grid">
              {data.diseases.slice(0, 8).map((d, i) => {
                const guide = DISEASE_GUIDELINES[d.disease_name] || DISEASE_GUIDELINES.default;
                return (
                  <div key={i} className="guideline-card">
                    <div className="guideline-header">
                      <div className="guideline-icon"><Activity size={18} /></div>
                      <h4>{d.disease_name}</h4>
                    </div>
                    <div className="guideline-body">
                      <div className="guide-row">
                        <ShieldCheck size={16} className="guide-icon prevention" />
                        <div>
                          <h5>Prevention</h5>
                          <p>{guide.prevention}</p>
                        </div>
                      </div>
                      <div className="guide-row">
                        <HeartPulse size={16} className="guide-icon care" />
                        <div>
                          <h5>If Infected / Care</h5>
                          <p>{guide.care}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── STYLES ── */}
      <style jsx>{`
        .overview-layout {
          padding: 24px;
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .hero-section {
          background: linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%);
          border-radius: 16px;
          padding: 32px 40px;
          border: 1px solid rgba(59,130,246,0.15);
        }
        .hero-content h1 {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 12px 0;
          letter-spacing: -0.02em;
        }
        .hero-content p {
          color: var(--text-secondary);
          font-size: 16px;
          max-width: 800px;
          margin: 0;
          line-height: 1.6;
        }

        .filters-bar {
          display: flex;
          gap: 16px;
          background: var(--bg-secondary);
          padding: 16px 24px;
          border-radius: 12px;
          border: 1px solid var(--border);
          box-shadow: 0 2px 10px rgba(0,0,0,0.02);
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 200px;
        }
        .filter-group label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .filter-group select {
          padding: 10px 14px;
          border-radius: 8px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          cursor: pointer;
        }
        .filter-group select:hover { border-color: var(--accent); }

        .modern-range {
          -webkit-appearance: none;
          width: 100%;
          height: 6px;
          background: var(--border);
          border-radius: 3px;
          outline: none;
        }
        .modern-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          border: 2px solid var(--bg-primary);
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .modern-range::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--accent);
          cursor: pointer;
          border: 2px solid var(--bg-primary);
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }

        .dashboard-grid {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 20px;
        }
        .kpi-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: transform 0.2s;
        }
        .kpi-card:hover { transform: translateY(-3px); }
        .icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .kpi-card.blue .icon-wrap { background: rgba(59,130,246,0.1); color: #3b82f6; }
        .kpi-card.orange .icon-wrap { background: rgba(245,158,11,0.1); color: #f59e0b; }
        .kpi-card.green .icon-wrap { background: rgba(16,185,129,0.1); color: #10b981; }
        .kpi-card.purple .icon-wrap { background: rgba(139,92,246,0.1); color: #8b5cf6; }
        
        .kpi-info span { font-size: 13px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
        .kpi-info h3 { font-size: 28px; font-weight: 800; color: var(--text-primary); margin: 4px 0 0 0; }

        .main-content-row {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
        }
        @media (max-width: 1024px) {
          .main-content-row { grid-template-columns: 1fr; }
        }

        .chart-card, .side-card {
          background: var(--bg-secondary);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
        }
        .chart-card { display: flex; flex-direction: column; min-height: 400px; }
        .card-header h3, .side-card h3, .quick-actions h3 {
          font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;
        }
        .card-header .subtitle { font-size: 14px; color: var(--text-muted); }
        .chart-body { flex: 1; margin-top: 24px; min-height: 300px; }
        .empty-chart { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-style: italic; }

        .side-column { display: flex; flex-direction: column; gap: 24px; }
        
        .disease-list { display: flex; flex-direction: column; gap: 16px; margin-top: 20px; }
        .disease-item { display: flex; flex-direction: column; gap: 8px; }
        .disease-info { display: flex; justify-content: space-between; font-size: 14px; }
        .disease-name { font-weight: 600; color: var(--text-primary); }
        .disease-count { color: var(--text-muted); }
        .disease-bar-bg { width: 100%; height: 6px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; }
        .disease-bar-fill { height: 100%; background: var(--accent); border-radius: 3px; }

        .side-card.highlight { background: rgba(59,130,246,0.03); border-color: rgba(59,130,246,0.2); }
        .insight-text { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin: 16px 0; }
        .recommendations { display: flex; flex-direction: column; gap: 12px; }
        .rec-item { display: flex; gap: 12px; align-items: flex-start; background: var(--bg-primary); padding: 12px; border-radius: 8px; border: 1px solid var(--border); }
        .rec-icon { color: #10b981; flex-shrink: 0; margin-top: 2px; }
        .rec-content strong { display: block; font-size: 13px; color: var(--text-primary); margin-bottom: 4px; }
        .rec-content p { margin: 0; font-size: 12px; color: var(--text-muted); line-height: 1.5; }

        .quick-actions { margin-top: 12px; }
        .action-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-top: 16px; }
        .action-card {
          background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 20px;
          display: flex; align-items: center; gap: 16px; text-decoration: none; transition: all 0.2s;
        }
        .action-card:hover { border-color: var(--accent); transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .action-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        .action-icon.blue { background: rgba(59,130,246,0.1); color: #3b82f6; }
        .action-icon.green { background: rgba(16,185,129,0.1); color: #10b981; }
        .action-icon.purple { background: rgba(139,92,246,0.1); color: #8b5cf6; }
        .action-text { flex: 1; }
        .action-text h4 { margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: var(--text-primary); }
        .action-text p { margin: 0; font-size: 13px; color: var(--text-muted); }
        .action-arrow { color: var(--text-muted); transition: transform 0.2s; }
        .action-card:hover .action-arrow { transform: translateX(4px); color: var(--accent); }

        .loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; gap: 16px; color: var(--text-muted); }
        .spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 1s linear infinite; }
        .error-banner { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #ef4444; padding: 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; font-weight: 500; }

        .guidelines-section { margin-top: 12px; }
        .guidelines-section h3 { font-size: 18px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0; }
        .section-subtitle { font-size: 14px; color: var(--text-muted); margin-bottom: 16px; }
        .guidelines-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; }
        .guideline-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 16px; transition: all 0.2s; }
        .guideline-card:hover { border-color: var(--accent); box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .guideline-header { display: flex; align-items: center; gap: 12px; }
        .guideline-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(59,130,246,0.1); color: #3b82f6; display: flex; align-items: center; justify-content: center; }
        .guideline-header h4 { margin: 0; font-size: 16px; font-weight: 700; color: var(--text-primary); }
        .guideline-body { display: flex; flex-direction: column; gap: 12px; }
        .guide-row { display: flex; gap: 12px; align-items: flex-start; }
        .guide-icon { flex-shrink: 0; margin-top: 2px; }
        .guide-icon.prevention { color: #10b981; }
        .guide-icon.care { color: #ef4444; }
        .guide-row h5 { margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: var(--text-primary); text-transform: uppercase; letter-spacing: 0.02em; }
        .guide-row p { margin: 0; font-size: 13px; color: var(--text-muted); line-height: 1.5; }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
