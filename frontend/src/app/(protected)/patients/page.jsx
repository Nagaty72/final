'use client';

import React, { useState, useEffect } from 'react';
import { patientService } from '@/services/patient.service';
import { getDistricts } from '@/services/district.service';

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [formData, setFormData] = useState({ gender: 'Male', birth_date: '', city: '', district_id: '' });

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(20);

  const MOCK_NAMES = [
    "Ahmed Hassan", "Sara Ali", "Omar Nasser", "Fatima Yusuf", 
    "Khalid Ibrahim", "Layla Mahmoud", "Youssef Tariq", "Mona Zaki", 
    "Kareem Said", "Huda Fathi", "Amir Kamal", "Nour Amin"
  ];

  const getPatientName = (id) => {
    if (!id) return "Unknown User";
    const num = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return MOCK_NAMES[num % MOCK_NAMES.length];
  };

  const formatName = (fullName) => {
    if (!fullName) return "Unknown";
    const parts = fullName.split(' ');
    if (parts.length === 1) return parts[0] + "***";
    const first = parts[0];
    const last = parts[parts.length - 1];
    return `${first} ${last.charAt(0)}***`;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ptsRes, dists] = await Promise.all([
        patientService.getAll(),
        getDistricts().catch(() => [])
      ]);

      if (ptsRes.success) {
        setPatients(ptsRes.data);
      }
      setDistricts(Array.isArray(dists) ? dists : []);
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = patients.filter((p) =>
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    (p.city && p.city.toLowerCase().includes(search.toLowerCase())) ||
    (p.districts?.name && p.districts.name.toLowerCase().includes(search.toLowerCase()))
  );

  const visiblePatients = filtered.slice(0, visibleCount);

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const diff = new Date() - new Date(birthDate);
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  };

  const openModal = (patient = null) => {
    if (patient) {
      setEditingPatient(patient);
      setFormData({
        gender: patient.gender || 'Male',
        birth_date: patient.birth_date ? new Date(patient.birth_date).toISOString().split('T')[0] : '',
        city: patient.city || '',
        district_id: patient.district_id || ''
      });
    } else {
      setEditingPatient(null);
      setFormData({ gender: 'Male', birth_date: '', city: '', district_id: districts[0]?.id || '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPatient(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPatient) {
        await patientService.update(editingPatient.id, formData);
      } else {
        await patientService.create(formData);
      }
      closeModal();
      fetchData();
    } catch (err) {
      alert('Failed to save patient. Please check all fields.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this patient?')) return;
    try {
      await patientService.delete(id);
      fetchData();
    } catch (err) {
      alert('Failed to delete patient');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>Patients</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Patient records and demographics</p>
        </div>
        <button className="btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Patient
        </button>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="kpi-card blue" style={{ padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Registered Patients
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color: 'var(--text-primary)' }}>
            {patients.length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Anonymized patient profiles
          </div>
        </div>
        <div className="kpi-card purple" style={{ padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Recently Added
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color: 'var(--text-primary)' }}>
            {patients.filter(p => {
               if(!p.created_at) return false;
               const diffTime = Math.abs(new Date() - new Date(p.created_at));
               const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
               return diffDays <= 7;
            }).length || 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            In the last 7 days
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, maxWidth: 360 }}>
        <input 
          className="form-input" 
          placeholder="Search by ID, city, or district..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Table */}
      <div className="chart-container">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading patients...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#f87171' }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>City</th>
                  <th>District</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visiblePatients.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      P-{p.id.substring(0, 6).toUpperCase()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatName(p.name || getPatientName(p.id))}</td>
                    <td>{calculateAge(p.birth_date)}</td>
                    <td>
                      <span className={`badge ${p.gender === 'Female' ? 'purple' : 'blue'}`}>
                        {p.gender}
                      </span>
                    </td>
                    <td>{p.city || 'Unknown'}</td>
                    <td>{p.districts?.name || 'Unknown'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => openModal(p)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginRight: 10, fontSize: 14, fontWeight: 500 }}>Edit</button>
                      <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filtered.length > visibleCount && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <button 
                  className="btn-primary" 
                  style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '6px 16px' }}
                  onClick={() => setVisibleCount(prev => prev + 20)}
                >
                  See More
                </button>
              </div>
            )}
            
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No patients found</div>
            )}
          </div>
        )}
      </div>

      {/* Patient Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: 450, padding: 24, background: 'var(--bg-card)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>{editingPatient ? 'Edit Patient' : 'Add Patient'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Birth Date</label>
                  <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Cairo, Alexandria"
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>District</label>
                <select
                  name="district_id"
                  value={formData.district_id}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="" disabled>Select District...</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.city})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={closeModal} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>
                  {editingPatient ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
