'use client';

import React, { useState, useEffect } from 'react';
import { userService } from '@/services/user.service';
import { useTranslation } from 'react-i18next';

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ 
    full_name: '', 
    email: '', 
    password: '', 
    role_id: 3 // Default to 'normal_user'
  });

  const rolesMap = {
    1: { label: t('users.role_super_admin'), class: 'red' },
    2: { label: t('users.role_decision_maker'), class: 'purple' },
    3: { label: t('users.role_user'), class: 'blue' }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await userService.getAll();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (err) {
      setError(t('users.error_fetch') || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        password: '', // Don't show password
        role_id: user.role_id || 3
      });
    } else {
      setEditingUser(null);
      setFormData({ full_name: '', email: '', password: '', role_id: 3 });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await userService.updateRole(editingUser.id, formData.role_id);
      } else {
        await userService.create(formData);
      }
      closeModal();
      fetchData();
    } catch (err) {
      alert(err.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('users.confirm_delete'))) return;
    try {
      await userService.delete(id);
      fetchData();
    } catch (err) {
      alert(t('users.error_delete') || 'Failed to delete user');
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>{t('users.title')}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{t('users.subtitle')}</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t('users.add_user')}
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="kpi-card blue" style={{ padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {t('users.total_users')}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color: 'var(--text-primary)' }}>
            {users.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {t('users.active_users')}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, maxWidth: 360 }}>
        <input 
          className="form-input" 
          placeholder={t('users.search_placeholder')} 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Table */}
      <div className="chart-container">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{t('users.loading')}</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#f87171' }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('users.full_name')}</th>
                  <th>{t('users.email')}</th>
                  <th>{t('users.role')}</th>
                  <th>{t('users.created_at')}</th>
                  <th style={{ textAlign: 'right' }}>{t('users.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`badge ${rolesMap[u.role_id]?.class || 'blue'}`}>
                        {rolesMap[u.role_id]?.label || 'User'}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => openModal(u)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginRight: 10, fontSize: 14, fontWeight: 500 }}>
                        {t('users.edit_role')}
                      </button>
                      <button onClick={() => handleDelete(u.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
                        {t('users.delete_user')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t('users.no_users')}</div>
            )}
          </div>
        )}
      </div>

      {/* User Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: 450, padding: 24, background: 'var(--bg-card)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
              {editingUser ? t('users.edit_role') : t('users.add_user')}
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {!editingUser && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('users.full_name')}</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. John Doe"
                      className="form-input"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('users.email')}</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="user@example.com"
                      className="form-input"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Password</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      placeholder="••••••••"
                      className="form-input"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('users.role')}</label>
                <select
                  name="role_id"
                  value={formData.role_id}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value={1}>{t('users.role_super_admin')}</option>
                  <option value={2}>{t('users.role_decision_maker')}</option>
                  <option value={3}>{t('users.role_user')}</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={closeModal} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}>
                  {t('users.cancel')}
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>
                  {t('users.save_user')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
