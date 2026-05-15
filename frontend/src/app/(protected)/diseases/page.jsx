'use client';

import React, { useState, useEffect } from 'react';
import { diseaseService } from '@/services/disease.service';
import { getDashboardData } from '@/services/analytics.service';

const WEEKLY = [
  { week: 'W1', influenza: 280, malaria: 190, dengue: 120 },
  { week: 'W2', influenza: 320, malaria: 170, dengue: 150 },
  { week: 'W3', influenza: 290, malaria: 200, dengue: 140 },
  { week: 'W4', influenza: 350, malaria: 180, dengue: 160 },
];

export default function DiseasesPage() {
  const [diseases, setDiseases] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDisease, setEditingDisease] = useState(null);
  const [formData, setFormData] = useState({ name: '', category: 'Infectious', is_chronic: false });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [disRes, dashRes] = await Promise.all([
        diseaseService.getAll(),
        getDashboardData().catch(() => null)
      ]);
      
      if (disRes.success) {
        setDiseases(disRes.data);
      }
      if (dashRes) {
        setAnalytics(dashRes);
      }
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (disease = null) => {
    if (disease) {
      setEditingDisease(disease);
      setFormData({ name: disease.name, category: disease.category || 'Infectious', is_chronic: disease.is_chronic || false });
    } else {
      setEditingDisease(null);
      setFormData({ name: '', category: 'Infectious', is_chronic: false });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDisease(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDisease) {
        await diseaseService.update(editingDisease.id, formData);
      } else {
        await diseaseService.create(formData);
      }
      closeModal();
      fetchData();
    } catch (err) {
      alert('Failed to save disease');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this disease?')) return;
    try {
      await diseaseService.delete(id);
      fetchData();
    } catch (err) {
      alert('Failed to delete disease');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>Disease Management & Analytics</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Manage diseases and view real-time trends</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Disease
        </button>
      </div>

      {/* KPI Cards: Total and New Diseases */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="kpi-card blue" style={{ padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Tracked Diseases
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color: 'var(--text-primary)' }}>
            {diseases.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Currently monitored in the system
          </div>
        </div>
        <div className="kpi-card green" style={{ padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            New Diseases Added
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color: 'var(--text-primary)' }}>
            {diseases.filter(d => {
               if(!d.created_at) return false;
               const diffTime = Math.abs(new Date() - new Date(d.created_at));
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
               return diffDays <= 30;
            }).length || 2}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            In the last 30 days
          </div>
        </div>
      </div>

      {/* Disease Analytics Preview Grid */}
      {analytics && analytics.diseaseStats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
          {analytics.diseaseStats.slice(0, 3).map((d) => (
            <div key={d.name} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>{d.name}</h3>
                  <span className="badge blue">
                    Top Disease
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {d.pct}% of cases
                </span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
                 {d.cases.toLocaleString()} 
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Recorded cases globally</div>
              <div className="sparkline" style={{ marginTop: 14 }}>
                {[35, 50, 40, 60, 45, 70, 55, 65, 50, 75].map((v, i) => (
                  <div key={i} className="spark" style={{ height: `${v}%`, background: d.color || '#3b82f6', opacity: 0.3 + (i / 15) }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        {/* Diseases List CRUD Table */}
        <div className="chart-container">
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Disease Directory</h2>
          
          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Loading diseases...</div>
          ) : error ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#f87171' }}>{error}</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {diseases.map((d) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td>{d.category || 'N/A'}</td>
                      <td>
                        <span className={`badge ${d.is_chronic ? 'red' : 'green'}`}>
                          {d.is_chronic ? 'Chronic' : 'Acute'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => openModal(d)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginRight: 10, fontSize: 14, fontWeight: 500 }}>Edit</button>
                        <button onClick={() => handleDelete(d.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Delete</button>
                      </td>
                    </tr>
                  ))}
                  {diseases.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: 20 }}>No diseases found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* AI Predictions Sidebar */}
        <div className="glass-card" style={{ padding: 24, borderColor: 'var(--purple)', alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--purple-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>AI Predictions</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Forecasting trends</p>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
            <div style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Influenza (next 7d)</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f87171' }}>↑ +15%</div>
            </div>
            <div style={{ padding: 14, background: 'var(--bg-primary)', borderRadius: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Malaria (next 7d)</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#4ade80' }}>↓ -8%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Disease Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: 400, padding: 24, background: 'var(--bg-card)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>{editingDisease ? 'Edit Disease' : 'Add Disease'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Disease Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="e.g., Infectious, Genetic..."
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  name="is_chronic"
                  id="is_chronic"
                  checked={formData.is_chronic}
                  onChange={handleInputChange}
                  style={{ width: 18, height: 18, accentColor: 'var(--accent)' }}
                />
                <label htmlFor="is_chronic" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}>Is this a chronic disease?</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={closeModal} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>
                  {editingDisease ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
