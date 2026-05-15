'use client';

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { medicalRecordService } from '@/services/medical-record.service';
import { patientService } from '@/services/patient.service';
import { diseaseService } from '@/services/disease.service';

const DATA_SOURCES = [
  { id: 'records', label: 'Medical Records', desc: 'Case logs, severity, and outcomes', icon: '🩺' },
  { id: 'patients', label: 'Patient Demographics', desc: 'Patient ages, genders, and locations', icon: '👥' },
  { id: 'diseases', label: 'Disease Directory', desc: 'Monitored diseases and their chronicity', icon: '🦠' }
];

export default function ReportsPage() {
  const [source, setSource] = useState('records');
  const [format, setFormat] = useState('pdf');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [columns, setColumns] = useState({});
  const [dataCache, setDataCache] = useState({});
  const [loading, setLoading] = useState(false);

  // Column definitions per source
  const COL_DEFS = {
    records: [
      { key: 'id', label: 'Record ID' },
      { key: 'date', label: 'Diagnosis Date' },
      { key: 'patient', label: 'Patient ID' },
      { key: 'disease', label: 'Disease Name' },
      { key: 'hospital', label: 'Hospital' },
      { key: 'severity', label: 'Severity Level' },
      { key: 'outcome', label: 'Outcome' },
    ],
    patients: [
      { key: 'id', label: 'Patient ID' },
      { key: 'gender', label: 'Gender' },
      { key: 'birth_date', label: 'Birth Date' },
      { key: 'city', label: 'City' },
      { key: 'district', label: 'District' }
    ],
    diseases: [
      { key: 'id', label: 'Disease ID' },
      { key: 'name', label: 'Disease Name' },
      { key: 'category', label: 'Category' },
      { key: 'is_chronic', label: 'Is Chronic' }
    ]
  };

  useEffect(() => {
    // Reset columns when source changes
    const defaultCols = {};
    COL_DEFS[source].forEach(c => defaultCols[c.key] = true);
    setColumns(defaultCols);
  }, [source]);

  const toggleColumn = (key) => {
    setColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      let rawData = dataCache[source];
      
      // Fetch if not in cache
      if (!rawData) {
        if (source === 'records') {
          const res = await medicalRecordService.getAll();
          rawData = res.success ? res.data : [];
        } else if (source === 'patients') {
          const res = await patientService.getAll();
          rawData = res.success ? res.data : [];
        } else if (source === 'diseases') {
          const res = await diseaseService.getAll();
          rawData = res.success ? res.data : [];
        }
        setDataCache(prev => ({ ...prev, [source]: rawData }));
      }

      // Filter Data
      let filteredData = [...rawData];
      if (source === 'records' && (dateFrom || dateTo)) {
        if (dateFrom) filteredData = filteredData.filter(r => new Date(r.diagnosis_date) >= new Date(dateFrom));
        if (dateTo) filteredData = filteredData.filter(r => new Date(r.diagnosis_date) <= new Date(dateTo));
      }

      // Format Data for Export
      const exportData = filteredData.map(item => {
        const row = {};
        if (source === 'records') {
          if (columns.id) row['Record ID'] = `MR-${item.id.substring(0, 6).toUpperCase()}`;
          if (columns.date) row['Diagnosis Date'] = new Date(item.diagnosis_date).toLocaleDateString();
          if (columns.patient) row['Patient ID'] = `P-${item.patients?.id?.substring(0,6).toUpperCase() || 'N/A'}`;
          if (columns.disease) row['Disease Name'] = item.diseases?.name || 'N/A';
          if (columns.hospital) row['Hospital'] = item.hospitals?.name || 'N/A';
          if (columns.severity) row['Severity Level'] = `Level ${item.severity}`;
          if (columns.outcome) row['Outcome'] = item.outcome;
        } else if (source === 'patients') {
          if (columns.id) row['Patient ID'] = `P-${item.id.substring(0, 6).toUpperCase()}`;
          if (columns.gender) row['Gender'] = item.gender;
          if (columns.birth_date) row['Birth Date'] = item.birth_date;
          if (columns.city) row['City'] = item.city;
          if (columns.district) row['District'] = item.districts?.name || 'N/A';
        } else if (source === 'diseases') {
          if (columns.id) row['Disease ID'] = `D-${item.id.substring(0, 6).toUpperCase()}`;
          if (columns.name) row['Disease Name'] = item.name;
          if (columns.category) row['Category'] = item.category || 'N/A';
          if (columns.is_chronic) row['Is Chronic'] = item.is_chronic ? 'Yes' : 'No';
        }
        return row;
      });

      if (exportData.length === 0) {
        alert("No data matches your criteria.");
        setLoading(false);
        return;
      }

      // Generate File
      const filename = `Health_Analytics_${source.toUpperCase()}_Report_${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'excel') {
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report Data");
        XLSX.writeFile(workbook, `${filename}.xlsx`);
      } else {
        const doc = new jsPDF('landscape');
        doc.text(`Health Analytics - ${DATA_SOURCES.find(d => d.id === source).label} Report`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

        const tableColumn = Object.keys(exportData[0]);
        const tableRows = exportData.map(row => Object.values(row));

        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 28,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [139, 92, 246] }
        });
        doc.save(`${filename}.pdf`);
      }

    } catch (error) {
      console.error(error);
      alert("Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>Report Builder</h1>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: 0 }}>Create advanced, adjustable data exports in Excel or PDF formats.</p>
      </div>

      <div className="glass-card" style={{ padding: 32 }}>
        
        {/* 1. Select Data Source */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>1. Select Data Source</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {DATA_SOURCES.map(d => (
              <div 
                key={d.id} 
                onClick={() => setSource(d.id)}
                style={{ 
                  padding: 16, borderRadius: 12, border: `2px solid ${source === d.id ? 'var(--purple)' : 'var(--border)'}`, 
                  background: source === d.id ? 'var(--purple-light)' : 'var(--bg-primary)', 
                  cursor: 'pointer', transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8 }}>{d.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: source === d.id ? 'var(--purple)' : 'var(--text-primary)', marginBottom: 4 }}>
                  {d.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Configure Columns */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>2. Adjust Columns</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: 20, background: 'var(--bg-primary)', borderRadius: 12, border: '1px solid var(--border)' }}>
            {COL_DEFS[source].map(c => (
              <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: columns[c.key] ? 'var(--accent-light)' : 'var(--bg-card)', border: `1px solid ${columns[c.key] ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 24, cursor: 'pointer', transition: '0.2s', fontSize: 14, fontWeight: 500, color: columns[c.key] ? 'var(--accent)' : 'var(--text-secondary)' }}>
                <input 
                  type="checkbox" 
                  checked={!!columns[c.key]} 
                  onChange={() => toggleColumn(c.key)}
                  style={{ display: 'none' }}
                />
                {columns[c.key] && <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                {c.label}
              </label>
            ))}
          </div>
        </div>

        {/* 3. Filters */}
        {source === 'records' && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>3. Date Filter (Optional)</h2>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>From Date</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input" style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>To Date</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input" style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }} />
              </div>
            </div>
          </div>
        )}

        {/* 4. Format & Export */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{source === 'records' ? '4' : '3'}. Export Format</h2>
          <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px', border: `2px solid ${format === 'pdf' ? 'var(--red)' : 'var(--border)'}`, borderRadius: 12, cursor: 'pointer', background: format === 'pdf' ? 'rgba(248, 113, 113, 0.05)' : 'var(--bg-primary)' }}>
              <input type="radio" name="format" value="pdf" checked={format === 'pdf'} onChange={(e) => setFormat(e.target.value)} style={{ display: 'none' }} />
              <span style={{ fontSize: 24 }}>📄</span> 
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>PDF Document</span>
            </label>
            <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px', border: `2px solid ${format === 'excel' ? 'var(--green)' : 'var(--border)'}`, borderRadius: 12, cursor: 'pointer', background: format === 'excel' ? 'rgba(74, 222, 128, 0.05)' : 'var(--bg-primary)' }}>
              <input type="radio" name="format" value="excel" checked={format === 'excel'} onChange={(e) => setFormat(e.target.value)} style={{ display: 'none' }} />
              <span style={{ fontSize: 24 }}>📊</span> 
              <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Excel (.xlsx)</span>
            </label>
          </div>

          <button 
            className="btn-primary" 
            onClick={handleGenerate} 
            disabled={loading}
            style={{ width: '100%', padding: '16px', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            {loading ? (
              'Processing Data...'
            ) : (
              <>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Generate & Download Report
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
