'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

const USERS = [
  { id: 1, name: 'Admin User', email: 'admin@ha.io', role: 'Super Admin', status: 'Active', lastLogin: '2026-05-01' },
  { id: 2, name: 'Dr. Sarah', email: 'sarah@ha.io', role: 'Decision Maker', status: 'Active', lastLogin: '2026-04-30' },
  { id: 3, name: 'Nurse Khalid', email: 'khalid@ha.io', role: 'Normal User', status: 'Active', lastLogin: '2026-04-29' },
  { id: 4, name: 'Dr. Omar', email: 'omar@ha.io', role: 'Decision Maker', status: 'Inactive', lastLogin: '2026-04-15' },
];

const JOBS = [
  { name: 'Daily Stats Aggregation', schedule: 'Every day at 00:00', lastRun: '2026-05-01 00:00', status: 'Completed' },
  { name: 'AI Predictions', schedule: 'Every 2 hours', lastRun: '2026-05-01 14:00', status: 'Completed' },
  { name: 'Analytics Refresh', schedule: 'Every 6 hours', lastRun: '2026-05-01 12:00', status: 'Completed' },
  { name: 'Report Generation', schedule: 'Weekly (Monday)', lastRun: '2026-04-28 06:00', status: 'Completed' },
];

export default function AdminPage() {
  const { user } = useAuth();

  if (user?.role !== 'super_admin') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Access Denied</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>You need Super Admin privileges</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>Admin Panel</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>System management and user administration</p>
      </div>

      {/* System Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="kpi-card blue">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Total Users</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{USERS.length}</div>
        </div>
        <div className="kpi-card green">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>Active Jobs</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{JOBS.length}</div>
        </div>
        <div className="kpi-card purple">
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>API Health</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#4ade80' }}>Online</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="chart-container" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>User Management</h2>
          <button className="btn-primary">+ Add User</button>
        </div>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th></tr></thead>
          <tbody>
            {USERS.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</td>
                <td>{u.email}</td>
                <td><span className={`badge ${u.role === 'Super Admin' ? 'purple' : u.role === 'Decision Maker' ? 'blue' : 'green'}`}>{u.role}</span></td>
                <td><span className={`badge ${u.status === 'Active' ? 'green' : 'red'}`}>{u.status}</span></td>
                <td>{u.lastLogin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Background Jobs */}
      <div className="chart-container">
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Background Jobs</h2>
        <table className="data-table">
          <thead><tr><th>Job Name</th><th>Schedule</th><th>Last Run</th><th>Status</th></tr></thead>
          <tbody>
            {JOBS.map((j) => (
              <tr key={j.name}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{j.name}</td>
                <td>{j.schedule}</td>
                <td>{j.lastRun}</td>
                <td><span className="badge green">{j.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
