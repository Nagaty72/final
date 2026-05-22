'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getReportTemplates, getReportFilterOptions, previewReport, exportReport } from '@/services/report.service';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FileText, Download, Eye, RefreshCw, Filter, AlertTriangle, CheckCircle, ChevronDown, X } from 'lucide-react';

const ACCENT   = '#7C3AED';
const PALETTE  = ['#7C3AED','#3B82F6','#10B981','#F59E0B','#EF4444','#EC4899','#06B6D4','#84CC16'];
const SEVERITY = { 1:'Mild', 2:'Moderate', 3:'Severe', 4:'Critical', 5:'Extreme' };
const OUTCOMES = ['recovered','active','deceased','under_treatment'];
const GENDERS  = ['male','female'];

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  const bg = type === 'success' ? '#10B981' : '#EF4444';
  return (
    <div style={{ position:'fixed', bottom:24, right:24, zIndex:9999, background:bg, color:'#fff', padding:'12px 20px', borderRadius:12, display:'flex', alignItems:'center', gap:10, boxShadow:'0 8px 32px rgba(0,0,0,0.3)', animation:'slideUp 0.3s ease' }}>
      {type === 'success' ? <CheckCircle size={18}/> : <AlertTriangle size={18}/>}
      <span style={{ fontSize:14, fontWeight:500 }}>{message}</span>
      <button onClick={onClose} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', marginLeft:8 }}><X size={14}/></button>
      <style>{`@keyframes slideUp { from { transform:translateY(20px); opacity:0; } to { transform:translateY(0); opacity:1; } }`}</style>
    </div>
  );
}

function KpiCard({ label, value, color = ACCENT, icon }) {
  return (
    <div style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:12, padding:'16px 20px', display:'flex', flexDirection:'column', gap:6, flex:1, minWidth:130 }}>
      <span style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</span>
      <span style={{ fontSize:26, fontWeight:700, color }}>{value ?? '—'}</span>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder = 'All' }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4, flex:1, minWidth:140 }}>
      <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ padding:'8px 12px', background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-primary)', fontSize:13, cursor:'pointer' }}>
        <option value="">{placeholder}</option>
        {options.map((o, idx) => <option key={`${o.value ?? o}-${idx}`} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    </div>
  );
}

function DataTable({ headers, rows }) {
  if (!rows?.length) return <p style={{ color:'var(--text-muted)', textAlign:'center', padding:24 }}>No rows to display.</p>;
  return (
    <div style={{ overflowX:'auto', borderRadius:8, border:'1px solid var(--border)' }}>
      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
        <thead>
          <tr style={{ background:'var(--bg-primary)' }}>
            {headers.map(h => <th key={h.key} style={{ padding:'10px 14px', textAlign:'left', fontWeight:600, color:'var(--text-muted)', fontSize:11, textTransform:'uppercase', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom:'1px solid var(--border)', background: i%2===0 ? 'transparent' : 'var(--bg-primary)' }}>
              {headers.map(h => <td key={h.key} style={{ padding:'9px 14px', color:'var(--text-primary)', whiteSpace:'nowrap' }}>{r[h.key] ?? '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();

  // RBAC guard
  if (user && user.role === 'normal_user') {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:16 }}>
        <AlertTriangle size={48} color="#EF4444"/>
        <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)' }}>Access Denied</h2>
        <p style={{ color:'var(--text-muted)' }}>Report Builder is available to Admins and Decision Makers only.</p>
      </div>
    );
  }

  const [templates,      setTemplates]      = useState([]);
  const [filterOptions,  setFilterOptions]  = useState({ diseases:[], cities:[], hospitals:[] });
  const [selectedTpl,    setSelectedTpl]    = useState(null);
  const [filters,        setFilters]        = useState({ city:'', disease:'', gender:'', severity:'', outcome:'', dateFrom:'', dateTo:'', hospital:'' });
  const [selectedCols,   setSelectedCols]   = useState({});
  const [preview,        setPreview]        = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exportLoading,  setExportLoading]  = useState({ pdf:false, excel:false });
  const [toast,          setToast]          = useState(null);
  const [activeTab,      setActiveTab]      = useState('table');
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const showToast = useCallback((message, type='success') => setToast({ message, type }), []);

  // Load templates + filter options on mount
  useEffect(() => {
    let alive = true;
    Promise.all([getReportTemplates(), getReportFilterOptions()])
      .then(([tRes, fRes]) => {
        if (!alive) return;
        if (tRes?.data) { setTemplates(tRes.data); setSelectedTpl(tRes.data[0]); }
        if (fRes?.data) {
          const raw = fRes.data;
          setFilterOptions({
            diseases: Array.from(new Map((raw.diseases || []).map(d => [d.name, d])).values()),
            cities: Array.from(new Set(raw.cities || [])),
            hospitals: Array.from(new Map((raw.hospitals || []).map(h => [h.name, h])).values()),
          });
        }
      })
      .catch(e => showToast(e.message || 'Failed to load report options', 'error'));
    return () => { alive = false; };
  }, [showToast]);

  // Reset columns when template changes
  useEffect(() => {
    if (!selectedTpl) return;
    const cols = {};
    selectedTpl.columns.forEach(c => { cols[c.key] = true; });
    setSelectedCols(cols);
    setPreview(null);
  }, [selectedTpl]);

  const activeFilters = useMemo(() => {
    const af = {};
    Object.entries(filters).forEach(([k,v]) => { if (v) af[k] = v; });
    return af;
  }, [filters]);

  const visibleHeaders = useMemo(() =>
    (selectedTpl?.columns || []).filter(c => selectedCols[c.key]),
  [selectedTpl, selectedCols]);

  const handlePreview = useCallback(async () => {
    if (!selectedTpl) return;
    setLoadingPreview(true);
    setPreview(null);
    try {
      const res = await previewReport(selectedTpl.id, activeFilters);
      if (mountedRef.current && res?.data) setPreview(res.data);
    } catch(e) {
      showToast(e.message || 'Preview failed', 'error');
    } finally {
      if (mountedRef.current) setLoadingPreview(false);
    }
  }, [selectedTpl, activeFilters, showToast]);

  const handleExport = useCallback(async (format) => {
    if (!selectedTpl) return;
    setExportLoading(p => ({ ...p, [format]:true }));
    try {
      const { blob, filename } = await exportReport(selectedTpl.id, activeFilters, format);
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      showToast(`${format.toUpperCase()} exported successfully!`, 'success');
    } catch(e) {
      showToast(e.message || 'Export failed', 'error');
    } finally {
      if (mountedRef.current) setExportLoading(p => ({ ...p, [format]:false }));
    }
  }, [selectedTpl, activeFilters, showToast]);

  const resetFilters = () => setFilters({ city:'', disease:'', gender:'', severity:'', outcome:'', dateFrom:'', dateTo:'', hospital:'' });

  const kpi = preview?.kpis;
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <div style={{ maxWidth:1100, margin:'0 auto' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)}/>}

      {/* Header */}
      <div style={{ marginBottom:32 }}>
        <h1 style={{ fontSize:28, fontWeight:700, margin:'0 0 6px', color:'var(--text-primary)', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ width:40, height:40, borderRadius:10, background:'rgba(124,58,237,0.12)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
            <FileText size={20} color={ACCENT}/>
          </span>
          Report Builder
        </h1>
        <p style={{ fontSize:14, color:'var(--text-muted)', margin:0 }}>Generate live reports from Supabase — export to PDF or Excel.</p>
      </div>

      {/* Step 1: Template */}
      <section style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:16, padding:24, marginBottom:20 }}>
        <h2 style={{ fontSize:15, fontWeight:700, margin:'0 0 16px', color:'var(--text-primary)' }}>1 — Select Report Template</h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:14 }}>
          {templates.map(t => (
            <div key={t.id} onClick={() => setSelectedTpl(t)} style={{ padding:16, borderRadius:12, border:`2px solid ${selectedTpl?.id === t.id ? ACCENT : 'var(--border)'}`, background: selectedTpl?.id === t.id ? 'rgba(124,58,237,0.06)' : 'var(--bg-primary)', cursor:'pointer', transition:'all 0.2s' }}>
              <div style={{ fontSize:26, marginBottom:8 }}>{t.icon}</div>
              <div style={{ fontSize:14, fontWeight:600, color: selectedTpl?.id === t.id ? ACCENT : 'var(--text-primary)', marginBottom:4 }}>{t.name}</div>
              <div style={{ fontSize:12, color:'var(--text-muted)' }}>{t.description}</div>
              <div style={{ marginTop:8, display:'inline-block', fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:6, background:'rgba(124,58,237,0.1)', color:ACCENT }}>{t.category}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Step 2: Filters */}
      {selectedTpl && (
        <section style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:16, padding:24, marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ fontSize:15, fontWeight:700, margin:0, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8 }}>
              <Filter size={16}/> 2 — Filters
              {activeFilterCount > 0 && <span style={{ fontSize:11, fontWeight:700, background:ACCENT, color:'#fff', padding:'2px 8px', borderRadius:10 }}>{activeFilterCount} active</span>}
            </h2>
            {activeFilterCount > 0 && <button onClick={resetFilters} style={{ fontSize:12, color:'var(--text-muted)', background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'4px 12px', cursor:'pointer' }}>Clear all</button>}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:14 }}>
            {selectedTpl.filters.includes('city') && (
              <SelectField label="Governorate" value={filters.city} onChange={v => setFilters(p=>({...p, city:v}))} options={filterOptions.cities.map(c=>({value:c, label:c}))}/>
            )}
            {selectedTpl.filters.includes('disease') && (
              <SelectField label="Disease" value={filters.disease} onChange={v => setFilters(p=>({...p, disease:v}))} options={filterOptions.diseases.map(d=>({value:d.name, label:d.name}))}/>
            )}
            {selectedTpl.filters.includes('gender') && (
              <SelectField label="Gender" value={filters.gender} onChange={v => setFilters(p=>({...p, gender:v}))} options={GENDERS.map(g=>({value:g, label:g.charAt(0).toUpperCase()+g.slice(1)}))}/>
            )}
            {selectedTpl.filters.includes('severity') && (
              <SelectField label="Severity" value={filters.severity} onChange={v => setFilters(p=>({...p, severity:v}))} options={Object.entries(SEVERITY).map(([v,l])=>({value:v, label:l}))}/>
            )}
            {selectedTpl.filters.includes('outcome') && (
              <SelectField label="Outcome" value={filters.outcome} onChange={v => setFilters(p=>({...p, outcome:v}))} options={OUTCOMES.map(o=>({value:o, label:o.replace('_',' ')}))}/>
            )}
            {selectedTpl.filters.includes('hospital') && (
              <SelectField label="Hospital" value={filters.hospital} onChange={v => setFilters(p=>({...p, hospital:v}))} options={filterOptions.hospitals.map(h=>({value:h.name, label:h.name}))}/>
            )}
            {selectedTpl.filters.includes('dateFrom') && (
              <div style={{ display:'flex', flexDirection:'column', gap:4, flex:1, minWidth:140 }}>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase' }}>Date From</label>
                <input type="date" value={filters.dateFrom} onChange={e => setFilters(p=>({...p, dateFrom:e.target.value}))} style={{ padding:'8px 12px', background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-primary)', fontSize:13 }}/>
              </div>
            )}
            {selectedTpl.filters.includes('dateTo') && (
              <div style={{ display:'flex', flexDirection:'column', gap:4, flex:1, minWidth:140 }}>
                <label style={{ fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase' }}>Date To</label>
                <input type="date" value={filters.dateTo} onChange={e => setFilters(p=>({...p, dateTo:e.target.value}))} style={{ padding:'8px 12px', background:'var(--bg-primary)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-primary)', fontSize:13 }}/>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Step 3: Columns */}
      {selectedTpl && (
        <section style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:16, padding:24, marginBottom:20 }}>
          <h2 style={{ fontSize:15, fontWeight:700, margin:'0 0 14px', color:'var(--text-primary)' }}>3 — Select Columns</h2>
          <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
            {selectedTpl.columns.map(c => (
              <label key={c.key} style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 14px', borderRadius:20, cursor:'pointer', border:`1px solid ${selectedCols[c.key] ? ACCENT : 'var(--border)'}`, background: selectedCols[c.key] ? 'rgba(124,58,237,0.08)' : 'var(--bg-primary)', fontSize:13, fontWeight:500, color: selectedCols[c.key] ? ACCENT : 'var(--text-secondary)', transition:'all 0.15s' }}>
                <input type="checkbox" checked={!!selectedCols[c.key]} onChange={() => setSelectedCols(p=>({...p, [c.key]:!p[c.key]}))} style={{ display:'none' }}/>
                {selectedCols[c.key] && <CheckCircle size={13}/>}
                {c.label}
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Step 4: Preview + Export */}
      {selectedTpl && (
        <section style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:16, padding:24, marginBottom:20 }}>
          <h2 style={{ fontSize:15, fontWeight:700, margin:'0 0 16px', color:'var(--text-primary)' }}>4 — Preview &amp; Export</h2>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <button onClick={handlePreview} disabled={loadingPreview} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', background:'rgba(124,58,237,0.1)', border:`1px solid ${ACCENT}`, borderRadius:10, color:ACCENT, fontSize:14, fontWeight:600, cursor:loadingPreview?'not-allowed':'pointer', opacity:loadingPreview?0.7:1, transition:'all 0.2s' }}>
              {loadingPreview ? <RefreshCw size={15} style={{ animation:'spin 1s linear infinite' }}/> : <Eye size={15}/>}
              {loadingPreview ? 'Loading Preview…' : 'Preview Report'}
            </button>
            <button onClick={() => handleExport('pdf')} disabled={exportLoading.pdf} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:10, color:'#EF4444', fontSize:14, fontWeight:600, cursor:exportLoading.pdf?'not-allowed':'pointer', opacity:exportLoading.pdf?0.7:1, transition:'all 0.2s' }}>
              {exportLoading.pdf ? <RefreshCw size={15} style={{ animation:'spin 1s linear infinite' }}/> : <Download size={15}/>}
              {exportLoading.pdf ? 'Generating PDF…' : 'Export PDF'}
            </button>
            <button onClick={() => handleExport('excel')} disabled={exportLoading.excel} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 22px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.4)', borderRadius:10, color:'#10B981', fontSize:14, fontWeight:600, cursor:exportLoading.excel?'not-allowed':'pointer', opacity:exportLoading.excel?0.7:1, transition:'all 0.2s' }}>
              {exportLoading.excel ? <RefreshCw size={15} style={{ animation:'spin 1s linear infinite' }}/> : <Download size={15}/>}
              {exportLoading.excel ? 'Generating Excel…' : 'Export Excel (.xlsx)'}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
        </section>
      )}

      {/* Preview Panel */}
      {preview && (
        <section style={{ background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:16, padding:24 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
            <h2 style={{ fontSize:15, fontWeight:700, margin:0, color:'var(--text-primary)' }}>Preview: {preview.title}</h2>
            <span style={{ fontSize:12, color:'var(--text-muted)' }}>{preview.total} total rows · showing {Math.min(50, preview.total)}</span>
          </div>

          {/* Filter summary */}
          {preview.filters && preview.filters !== 'No filters applied — all data' && (
            <div style={{ padding:'8px 14px', background:'rgba(124,58,237,0.05)', border:'1px solid rgba(124,58,237,0.15)', borderRadius:8, fontSize:12, color:'var(--text-secondary)', marginBottom:18 }}>
              <strong>Filters:</strong> {preview.filters}
            </div>
          )}

          {/* KPI cards */}
          {kpi && (
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:24 }}>
              {kpi.total_cases        != null && <KpiCard label="Total Cases"        value={kpi.total_cases?.toLocaleString()}        color={ACCENT}/>}
              {kpi.active_cases       != null && <KpiCard label="Active Cases"       value={kpi.active_cases?.toLocaleString()}       color="#F59E0B"/>}
              {kpi.recovered          != null && <KpiCard label="Recovered"          value={kpi.recovered?.toLocaleString()}          color="#10B981"/>}
              {kpi.deceased           != null && <KpiCard label="Deceased"           value={kpi.deceased?.toLocaleString()}           color="#EF4444"/>}
              {kpi.hospitals_affected != null && <KpiCard label="Hospitals Affected" value={kpi.hospitals_affected?.toLocaleString()} color="#3B82F6"/>}
            </div>
          )}

          {/* Chart tabs */}
          {(preview.trends?.length > 0 || preview.breakdown?.length > 0 || preview.severity?.length > 0) && (
            <div style={{ marginBottom:24 }}>
              <div style={{ display:'flex', gap:8, marginBottom:16 }}>
                {[['table','Table'], ['trends','Trend Line'], ['breakdown','Disease Mix'], ['severity','Severity']].map(([id, label]) => {
                  const has = id === 'table' ? true : id === 'trends' ? preview.trends?.length > 0 : id === 'breakdown' ? preview.breakdown?.length > 0 : preview.severity?.length > 0;
                  if (!has) return null;
                  return (
                    <button key={id} onClick={() => setActiveTab(id)} style={{ padding:'6px 16px', borderRadius:8, border:'none', background: activeTab===id ? ACCENT : 'var(--bg-primary)', color: activeTab===id ? '#fff' : 'var(--text-secondary)', fontSize:13, fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}>{label}</button>
                  );
                })}
              </div>

              {activeTab === 'trends' && preview.trends?.length > 0 && (
                <div style={{ height:260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={preview.trends}>
                      <XAxis dataKey="month" tick={{ fontSize:11 }}/>
                      <YAxis tick={{ fontSize:11 }}/>
                      <Tooltip/>
                      <Line type="monotone" dataKey="total_cases" stroke={ACCENT} strokeWidth={2} dot={false} name="Cases"/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {activeTab === 'breakdown' && preview.breakdown?.length > 0 && (
                <div style={{ height:260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={preview.breakdown.slice(0,10)} layout="vertical" margin={{ left:100 }}>
                      <XAxis type="number" tick={{ fontSize:11 }}/>
                      <YAxis type="category" dataKey="disease_name" tick={{ fontSize:11 }} width={95}/>
                      <Tooltip/>
                      <Bar dataKey="total_cases" name="Cases">
                        {preview.breakdown.slice(0,10).map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {activeTab === 'severity' && preview.severity?.length > 0 && (
                <div style={{ height:260, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <ResponsiveContainer width="60%" height="100%">
                    <PieChart>
                      <Pie data={preview.severity} dataKey="count" nameKey="severity_label" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {preview.severity.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]}/>)}
                      </Pie>
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Data table */}
          {(activeTab === 'table' || !preview.trends?.length) && (
            <DataTable headers={visibleHeaders} rows={preview.rows}/>
          )}
        </section>
      )}
    </div>
  );
}
