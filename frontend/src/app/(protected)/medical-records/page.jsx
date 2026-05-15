'use client';

import React, { useState, useEffect } from 'react';
import { medicalRecordService } from '@/services/medical-record.service';
import { patientService } from '@/services/patient.service';
import { getHospitals } from '@/services/hospital.service';
import { diseaseService } from '@/services/disease.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState([]);
  
  // Lookups for the form dropdowns
  const [patients, setPatients] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [diseases, setDiseases] = useState([]);
  
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [visibleCount, setVisibleCount] = useState(20);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({ 
    patient_id: '', hospital_id: '', disease_id: '', 
    diagnosis_date: '', severity: 1, outcome: 'Ongoing' 
  });

  // Export State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState({
    format: 'excel',
    dateFrom: '',
    dateTo: '',
    columns: {
      id: true,
      diagnosis_date: true,
      patient: true,
      disease: true,
      hospital: true,
      severity: true,
      outcome: true
    }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, patRes, hosRes, disRes] = await Promise.all([
        medicalRecordService.getAll(),
        patientService.getAll(),
        getHospitals().catch(() => []),
        diseaseService.getAll()
      ]);

      if (recRes.success) setRecords(recRes.data);
      if (patRes.success) setPatients(patRes.data);
      setHospitals(Array.isArray(hosRes) ? hosRes : (hosRes?.data || []));
      if (disRes.success) setDiseases(disRes.data);
      
    } catch (err) {
      setError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = records.filter((r) =>
    r.id.toLowerCase().includes(search.toLowerCase()) ||
    (r.patients?.id && r.patients.id.toLowerCase().includes(search.toLowerCase())) ||
    (r.diseases?.name && r.diseases.name.toLowerCase().includes(search.toLowerCase())) ||
    (r.hospitals?.name && r.hospitals.name.toLowerCase().includes(search.toLowerCase()))
  );

  const visibleRecords = filtered.slice(0, visibleCount);

  // Analytics Math
  const totalRecords = records.length;
  const activeCases = records.filter(r => r.outcome === 'Ongoing').length;
  const criticalCases = records.filter(r => r.severity >= 4).length;

  const openModal = (record = null) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        patient_id: record.patient_id || '',
        hospital_id: record.hospital_id || '',
        disease_id: record.disease_id || '',
        diagnosis_date: record.diagnosis_date ? new Date(record.diagnosis_date).toISOString().split('T')[0] : '',
        severity: record.severity || 1,
        outcome: record.outcome || 'Ongoing'
      });
    } else {
      setEditingRecord(null);
      setFormData({ 
        patient_id: patients[0]?.id || '', 
        hospital_id: hospitals[0]?.id || '', 
        disease_id: diseases[0]?.id || '', 
        diagnosis_date: new Date().toISOString().split('T')[0], 
        severity: 1, 
        outcome: 'Ongoing' 
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === 'severity' ? parseInt(value, 10) : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        await medicalRecordService.update(editingRecord.id, formData);
      } else {
        await medicalRecordService.create(formData);
      }
      closeModal();
      fetchData();
    } catch (err) {
      alert('Failed to save record. Please check all fields.');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this medical record?')) return;
    try {
      await medicalRecordService.delete(id);
      fetchData();
    } catch (err) {
      alert('Failed to delete record');
    }
  };

  const handleExport = () => {
    let dataToExport = records;
    if (exportConfig.dateFrom) {
      const from = new Date(exportConfig.dateFrom);
      dataToExport = dataToExport.filter(r => new Date(r.diagnosis_date) >= from);
    }
    if (exportConfig.dateTo) {
      const to = new Date(exportConfig.dateTo);
      dataToExport = dataToExport.filter(r => new Date(r.diagnosis_date) <= to);
    }

    const mappedData = dataToExport.map(r => {
      const row = {};
      if (exportConfig.columns.id) row['Record ID'] = `MR-${r.id.substring(0, 6).toUpperCase()}`;
      if (exportConfig.columns.diagnosis_date) row['Date'] = new Date(r.diagnosis_date).toLocaleDateString();
      if (exportConfig.columns.patient) row['Patient ID'] = `P-${r.patients?.id?.substring(0,6).toUpperCase() || 'Unknown'}`;
      if (exportConfig.columns.disease) row['Disease'] = r.diseases?.name || 'Unknown';
      if (exportConfig.columns.hospital) row['Hospital'] = r.hospitals?.name || 'Unknown';
      if (exportConfig.columns.severity) row['Severity'] = `Level ${r.severity}`;
      if (exportConfig.columns.outcome) row['Outcome'] = r.outcome;
      return row;
    });

    if (mappedData.length === 0) {
      alert("No records match your selected criteria.");
      return;
    }

    if (exportConfig.format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(mappedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Medical Records");
      XLSX.writeFile(workbook, `Health_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } else if (exportConfig.format === 'pdf') {
      const doc = new jsPDF();
      doc.text("Medical Records Report", 14, 15);
      
      const tableColumn = Object.keys(mappedData[0]);
      const tableRows = mappedData.map(row => Object.values(row));

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 20,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [139, 92, 246] }
      });
      doc.save(`Health_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    }
    setIsExportModalOpen(false);
  };

  const handleColumnToggle = (col) => {
    setExportConfig(prev => ({
      ...prev,
      columns: { ...prev.columns, [col]: !prev.columns[col] }
    }));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px' }}>Medical Records</h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Log cases, track severity, and monitor outcomes</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-primary" onClick={() => setIsExportModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
          </button>
          <button className="btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Record
          </button>
        </div>
      </div>

      {/* Analytics KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div className="kpi-card blue" style={{ padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Cases Tracked
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color: 'var(--text-primary)' }}>
            {totalRecords}
          </div>
        </div>
        <div className="kpi-card amber" style={{ padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Active / Ongoing
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color: 'var(--text-primary)' }}>
            {activeCases}
          </div>
        </div>
        <div className="kpi-card red" style={{ padding: 20, background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Critical Severity (4-5)
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4, color: 'var(--text-primary)' }}>
            {criticalCases}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, maxWidth: 360 }}>
        <input 
          className="form-input" 
          placeholder="Search by ID, disease, or hospital..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
        />
      </div>

      {/* Table */}
      <div className="chart-container">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading records...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#f87171' }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Record ID</th>
                  <th>Date</th>
                  <th>Patient</th>
                  <th>Disease</th>
                  <th>Hospital</th>
                  <th>Severity</th>
                  <th>Outcome</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                      MR-{r.id.substring(0, 6).toUpperCase()}
                    </td>
                    <td>{new Date(r.diagnosis_date).toLocaleDateString()}</td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        P-{r.patients?.id?.substring(0,6).toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.diseases?.name || 'Unknown'}</td>
                    <td>{r.hospitals?.name || 'Unknown'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {[1,2,3,4,5].map(lvl => (
                          <div key={lvl} style={{ width: 8, height: 8, borderRadius: '50%', background: lvl <= r.severity ? (r.severity >= 4 ? '#ef4444' : '#f59e0b') : 'var(--border)' }} />
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${r.outcome === 'Recovered' ? 'green' : r.outcome === 'Fatal' ? 'red' : 'amber'}`}>
                        {r.outcome}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button onClick={() => openModal(r)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginRight: 10, fontSize: 14, fontWeight: 500 }}>Edit</button>
                      <button onClick={() => handleDelete(r.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>Delete</button>
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
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No medical records found</div>
            )}
          </div>
        )}
      </div>

      {/* Record Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: 500, padding: 24, background: 'var(--bg-card)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>{editingRecord ? 'Edit Record' : 'New Medical Record'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Patient</label>
                  <select
                    name="patient_id"
                    value={formData.patient_id}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    <option value="" disabled>Select Patient...</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>P-{p.id.substring(0,6).toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Diagnosis Date</label>
                  <input
                    type="date"
                    name="diagnosis_date"
                    value={formData.diagnosis_date}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Disease</label>
                <select
                  name="disease_id"
                  value={formData.disease_id}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="" disabled>Select Disease...</option>
                  {diseases.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Hospital</label>
                <select
                  name="hospital_id"
                  value={formData.hospital_id}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="" disabled>Select Hospital...</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Severity (1-5)</label>
                  <select
                    name="severity"
                    value={formData.severity}
                    onChange={handleInputChange}
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    {[1,2,3,4,5].map(v => <option key={v} value={v}>Level {v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>Outcome</label>
                  <select
                    name="outcome"
                    value={formData.outcome}
                    onChange={handleInputChange}
                    className="form-input"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  >
                    <option value="Ongoing">Ongoing</option>
                    <option value="Recovered">Recovered</option>
                    <option value="Fatal">Fatal</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={closeModal} style={{ padding: '8px 16px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px' }}>
                  {editingRecord ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Settings Modal */}
      {isExportModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-card" style={{ width: 480, padding: 28, background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--purple-light)', color: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Advanced Export</h2>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Configure and download your report.</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* Format Selection */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Format</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', border: `2px solid ${exportConfig.format === 'excel' ? 'var(--green)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: exportConfig.format === 'excel' ? 'rgba(74, 222, 128, 0.05)' : 'var(--bg-primary)' }}>
                    <input type="radio" name="format" value="excel" checked={exportConfig.format === 'excel'} onChange={(e) => setExportConfig({...exportConfig, format: e.target.value})} style={{ display: 'none' }} />
                    <span style={{ fontSize: 18 }}>📊</span> Excel (.xlsx)
                  </label>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', border: `2px solid ${exportConfig.format === 'pdf' ? 'var(--red)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', background: exportConfig.format === 'pdf' ? 'rgba(248, 113, 113, 0.05)' : 'var(--bg-primary)' }}>
                    <input type="radio" name="format" value="pdf" checked={exportConfig.format === 'pdf'} onChange={(e) => setExportConfig({...exportConfig, format: e.target.value})} style={{ display: 'none' }} />
                    <span style={{ fontSize: 18 }}>📄</span> PDF Document
                  </label>
                </div>
              </div>

              {/* Date Range Filtering */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Date Range (Optional)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>From</span>
                    <input type="date" className="form-input" value={exportConfig.dateFrom} onChange={(e) => setExportConfig({...exportConfig, dateFrom: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                  </div>
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>To</span>
                    <input type="date" className="form-input" value={exportConfig.dateTo} onChange={(e) => setExportConfig({...exportConfig, dateTo: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
              </div>

              {/* Columns to Include */}
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Include Columns</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: 'var(--bg-primary)', padding: 14, borderRadius: 8, border: '1px solid var(--border)' }}>
                  {Object.keys(exportConfig.columns).map(col => (
                    <label key={col} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={exportConfig.columns[col]} 
                        onChange={() => handleColumnToggle(col)}
                        style={{ width: 16, height: 16, accentColor: 'var(--purple)' }}
                      />
                      {col.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </label>
                  ))}
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 28 }}>
              <button type="button" onClick={() => setIsExportModalOpen(false)} style={{ padding: '10px 18px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 500 }}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={handleExport} style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                Generate & Download
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
