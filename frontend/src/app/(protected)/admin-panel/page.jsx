'use client';

import React, { useState, useEffect } from 'react';
import { userService } from '@/services/user.service';
import { useTranslation } from 'react-i18next';
import { notificationService } from '@/services/notification.service';
import { Bell, Pencil, Trash2, X, Check } from 'lucide-react';
import Modal from '@/components/Modal';

// Simple toast component
function Toast({ toasts }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
          background: t.type === 'error' ? 'var(--danger)' : 'var(--success)',
          color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          animation: 'slideIn 0.3s ease'
        }}>
          {t.message}
        </div>
      ))}
      <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toasts, setToasts] = useState([]);

  // User modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', role_id: 3 });

  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [editingNotif, setEditingNotif] = useState(null); // null = create, obj = edit
  const [notifData, setNotifData] = useState({ title: '', message: '', type: 'system', severity: 'info', target_role: '', governorate: '' });
  const [notifSaving, setNotifSaving] = useState(false);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, title }
  const [deleteLoading, setDeleteLoading] = useState(false);

  const rolesMap = {
    1: { label: t('users.role_super_admin'), class: 'red' },
    2: { label: t('users.role_decision_maker'), class: 'purple' },
    3: { label: t('users.role_user'), class: 'blue' }
  };

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await userService.getAll();
      if (res.success) setUsers(res.data);
    } catch {
      setError(t('users.error_fetch') || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const res = await notificationService.getAdminAll();
      if (res?.data) setNotifications(res.data);
    } catch (err) {
      console.error('[AdminPanel] fetchNotifications failed:', err);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => { fetchData(); fetchNotifications(); }, []);

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  // ── User Modal ──────────────────────────────────────────────
  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({ full_name: user.full_name || '', email: user.email || '', password: '', role_id: user.role_id || 3 });
    } else {
      setEditingUser(null);
      setFormData({ full_name: '', email: '', password: '', role_id: 3 });
    }
    setIsModalOpen(true);
  };

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      if (editingUser) {
        await userService.updateRole(editingUser.id, formData.role_id);
      } else {
        await userService.create(formData);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      fetchData();
      addToast('User saved successfully');
    } catch (err) {
      addToast(err.message || 'Action failed', 'error');
    }
  };

  const handleDeleteUser = async id => {
    if (!confirm(t('users.confirm_delete'))) return;
    try {
      await userService.delete(id);
      fetchData();
      addToast('User deleted');
    } catch {
      addToast('Failed to delete user', 'error');
    }
  };

  // ── Notification Modal ───────────────────────────────────────
  const openNotifModal = (notif = null) => {
    if (notif) {
      setEditingNotif(notif);
      setNotifData({ title: notif.title || '', message: notif.message || '', type: notif.type || 'system', severity: notif.severity || 'info', target_role: notif.target_role || '', governorate: notif.governorate || '' });
    } else {
      setEditingNotif(null);
      setNotifData({ title: '', message: '', type: 'system', severity: 'info', target_role: '', governorate: '' });
    }
    setIsNotifModalOpen(true);
  };

  const handleNotifSubmit = async e => {
    e.preventDefault();
    setNotifSaving(true);
    try {
      if (editingNotif) {
        const res = await notificationService.update(editingNotif.id, {
          title: notifData.title,
          message: notifData.message,
          type: notifData.type,
          severity: notifData.severity
        });
        // res shape: { success: true, data: { ...updatedNotif } }
        const updatedNotif = res?.data || {};
        setNotifications(prev =>
          prev.map(n => n.id === editingNotif.id ? { ...n, ...updatedNotif } : n)
        );
        setIsNotifModalOpen(false);
        addToast('Notification updated successfully');
      } else {
        await notificationService.create(notifData);
        setIsNotifModalOpen(false);
        await fetchNotifications();
        addToast('Notification sent successfully');
      }
    } catch (err) {
      console.error('[AdminPanel] handleNotifSubmit failed:', err);
      addToast(err.message || 'Action failed', 'error');
    } finally {
      setNotifSaving(false);
    }
  };

  const handleDeleteNotif = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await notificationService.delete(deleteTarget.id);
      setNotifications(prev => prev.filter(n => n.id !== deleteTarget.id));
      setDeleteTarget(null);
      addToast('Notification deleted');
    } catch (err) {
      addToast(err.message || 'Failed to delete', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' };
  const labelStyle = { display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' };

  const severityBadge = s => {
    const map = { critical: { bg: 'var(--danger-light)', color: 'var(--danger)' }, warning: { bg: 'var(--warning-light)', color: 'var(--warning)' }, info: { bg: 'var(--accent-light)', color: 'var(--accent)' } };
    const style = map[s] || map.info;
    return <span style={{ ...style, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{s?.toUpperCase()}</span>;
  };

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>{t('users.title')}</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{t('users.subtitle')}</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" onClick={() => openNotifModal()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} /> {t('notifications.send_notification', 'Send Notification')}
          </button>
          <button className="btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            {t('users.add_user')}
          </button>
        </div>
      </div>

      {/* ── KPI Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="kpi-card blue" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('users.total_users')}</div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color: 'var(--text-primary)' }}>{users.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('users.active_users')}</div>
        </div>
        <div className="kpi-card purple" style={{ padding: 20 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Notifications</div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color: 'var(--text-primary)' }}>{notifications.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>All sent notifications</div>
        </div>
      </div>

      {/* ── Users Table ── */}
      <div style={{ marginBottom: 6, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Users</div>
      <div style={{ marginBottom: 20, maxWidth: 360 }}>
        <input className="form-input" placeholder={t('users.search_placeholder')} value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
      </div>
      <div className="chart-container" style={{ marginBottom: 32 }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>{t('users.loading')}</div>
          : error ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--danger)' }}>{error}</div>
          : (
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
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                      <td>{u.email}</td>
                      <td><span className={`badge ${rolesMap[u.role_id]?.class || 'blue'}`}>{rolesMap[u.role_id]?.label || 'User'}</span></td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button onClick={() => openModal(u)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginRight: 10, fontSize: 14, fontWeight: 500 }}>{t('users.edit_role')}</button>
                        <button onClick={() => handleDeleteUser(u.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>{t('users.delete_user')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>{t('users.no_users')}</div>}
            </div>
          )}
      </div>

      {/* ── Sent Notifications Table ── */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Sent Notifications</div>
        <button className="btn-secondary" onClick={() => openNotifModal()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <Bell size={15} /> New Notification
        </button>
      </div>
      <div className="chart-container">
        {notifLoading ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
          : notifications.length === 0
          ? <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No notifications sent yet.</div>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Message</th>
                    <th>Severity</th>
                    <th>Target Role</th>
                    <th>Date</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map(n => (
                    <tr key={n.id}>
                      <td style={{ fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 13 }}>{n.message}</td>
                      <td>{severityBadge(n.severity)}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{n.target_role || 'All'}</td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{new Date(n.created_at).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={e => { e.stopPropagation(); openNotifModal(n); }}
                          title="Edit notification"
                          style={{ background: 'var(--accent-light)', border: 'none', color: 'var(--accent)', cursor: 'pointer', borderRadius: 7, padding: '5px 10px', marginRight: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteTarget({ id: n.id, title: n.title }); }}
                          title="Delete notification"
                          style={{ background: 'var(--danger-light)', border: 'none', color: 'var(--danger)', cursor: 'pointer', borderRadius: 7, padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600 }}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* ── User Modal ── */}
      <Modal
        open={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingUser(null); }}
        title={editingUser ? t('users.edit_role') : t('users.add_user')}
        width={450}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!editingUser && (
            <>
              <div>
                <label style={labelStyle}>{t('users.full_name')}</label>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleInputChange} required placeholder="e.g. John Doe" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t('users.email')}</label>
                <input type="email" name="email" value={formData.email} onChange={handleInputChange} required placeholder="user@example.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange} required placeholder="••••••••" style={inputStyle} />
              </div>
            </>
          )}
          <div>
            <label style={labelStyle}>{t('users.role')}</label>
            <select name="role_id" value={formData.role_id} onChange={handleInputChange} required style={inputStyle}>
              <option value={1}>{t('users.role_super_admin')}</option>
              <option value={2}>{t('users.role_decision_maker')}</option>
              <option value={3}>{t('users.role_user')}</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 6 }}>
            <button type="button" onClick={() => { setIsModalOpen(false); setEditingUser(null); }} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}>{t('users.cancel')}</button>
            <button type="submit" className="btn-primary" style={{ padding: '9px 18px' }}>{t('users.save_user')}</button>
          </div>
        </form>
      </Modal>

      {/* ── Create / Edit Notification Modal ── */}
      <Modal
        open={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
        title={editingNotif ? 'Edit Notification' : t('notifications.send_notification', 'Send Notification')}
        width={500}
      >
        <form onSubmit={handleNotifSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>{t('notifications.form_title', 'Title')} *</label>
            <input type="text" required value={notifData.title} onChange={e => setNotifData({ ...notifData, title: e.target.value })} style={inputStyle} placeholder="Notification title" />
          </div>
          <div>
            <label style={labelStyle}>{t('notifications.form_message', 'Message')} *</label>
            <textarea required rows={3} value={notifData.message} onChange={e => setNotifData({ ...notifData, message: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Notification body..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('notifications.form_severity', 'Severity')}</label>
              <select value={notifData.severity} onChange={e => setNotifData({ ...notifData, severity: e.target.value })} style={inputStyle}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('notifications.form_type', 'Type')}</label>
              <select value={notifData.type} onChange={e => setNotifData({ ...notifData, type: e.target.value })} style={inputStyle}>
                <option value="system">System</option>
                <option value="alert">Alert</option>
              </select>
            </div>
          </div>
          {!editingNotif && (
            <div>
              <label style={labelStyle}>{t('notifications.form_target_role', 'Target Role')}</label>
              <select value={notifData.target_role} onChange={e => setNotifData({ ...notifData, target_role: e.target.value })} style={inputStyle}>
                <option value="">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="decision_maker">Decision Maker</option>
                <option value="normal_user">Normal User</option>
              </select>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 6 }}>
            <button type="button" onClick={() => setIsNotifModalOpen(false)} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}>
              {t('notifications.btn_cancel', 'Cancel')}
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 6, opacity: notifSaving ? 0.7 : 1, cursor: notifSaving ? 'not-allowed' : 'pointer' }} disabled={notifSaving}>
              {notifSaving
                ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Saving...</>
                : editingNotif ? <><Check size={15} /> Save Changes</> : <><Bell size={15} /> {t('notifications.btn_send', 'Send')}</>
              }
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        title="Delete Notification"
        width={400}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '12px 16px', background: 'var(--danger-light)', borderRadius: 10, border: '1px solid var(--danger)' }}>
          <Trash2 size={20} color="var(--danger)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>This action is permanent and cannot be undone.</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>&ldquo;{deleteTarget?.title}&rdquo;</strong>?{' '}
          It will be permanently removed for all users.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={() => setDeleteTarget(null)}
            disabled={deleteLoading}
            style={{ padding: '9px 18px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: deleteLoading ? 'not-allowed' : 'pointer', fontWeight: 500 }}
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteNotif}
            disabled={deleteLoading}
            style={{ padding: '9px 18px', background: 'var(--danger)', border: 'none', borderRadius: 8, color: '#fff', cursor: deleteLoading ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, opacity: deleteLoading ? 0.7 : 1, transition: 'opacity 0.2s' }}
          >
            {deleteLoading
              ? <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Deleting...</>
              : <><Trash2 size={15} /> Delete</>
            }
          </button>
        </div>
      </Modal>

      <Toast toasts={toasts} />
    </div>
  );
}
