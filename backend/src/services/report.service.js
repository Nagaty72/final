import ExcelJS from 'exceljs';
import { ReportRepository } from '../repositories/report.repository.js';

// Dynamic import of jsPDF (requires canvas in Node — uses built-in fallback)
async function getJsPdf() {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  return { jsPDF, autoTable };
}

// ─── Severity label helper ────────────────────────────────────────────────────
const SEVERITY_LABELS = { 1: 'Mild', 2: 'Moderate', 3: 'Severe', 4: 'Critical', 5: 'Extreme' };
const severityLabel = (n) => SEVERITY_LABELS[n] ?? `Level ${n}`;

// ─── Date helpers ─────────────────────────────────────────────────────────────
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : 'N/A';
const nowStr  = () => new Date().toLocaleString('en-GB', { hour12: false });

// ─── Common filter extraction ─────────────────────────────────────────────────
function extractFilters(query) {
  const { city, disease, gender, severity, outcome, dateFrom, dateTo, hospital } = query;
  return {
    city:     city     || null,
    disease:  disease  || null,
    gender:   gender   || null,
    severity: severity || null,
    outcome:  outcome  || null,
    dateFrom: dateFrom || null,
    dateTo:   dateTo   || null,
    hospital: hospital || null,
    limit:    Math.min(parseInt(query.limit || '2000', 10), 5000),
    offset:   parseInt(query.offset || '0', 10),
  };
}

// ─── Build filter summary string ──────────────────────────────────────────────
function buildFilterSummary(filters) {
  const parts = [];
  if (filters.city)     parts.push(`Governorate: ${filters.city}`);
  if (filters.disease)  parts.push(`Disease: ${filters.disease}`);
  if (filters.gender)   parts.push(`Gender: ${filters.gender}`);
  if (filters.severity) parts.push(`Severity: ${severityLabel(filters.severity)}`);
  if (filters.outcome)  parts.push(`Outcome: ${filters.outcome}`);
  if (filters.hospital) parts.push(`Hospital: ${filters.hospital}`);
  if (filters.dateFrom) parts.push(`From: ${fmtDate(filters.dateFrom)}`);
  if (filters.dateTo)   parts.push(`To: ${fmtDate(filters.dateTo)}`);
  return parts.length ? parts.join('  |  ') : 'No filters applied — all data';
}

// ─── EXCEL generator ──────────────────────────────────────────────────────────
async function buildExcel({ title, headers, rows, kpis, filterSummary, sheetName = 'Report Data' }) {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'Epicare Health Platform';
  wb.created  = new Date();
  wb.modified = new Date();

  // ── Main data sheet ──
  const ws = wb.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 5 }] });

  // Title rows
  ws.mergeCells('A1', `${String.fromCharCode(64 + headers.length)}1`);
  const titleCell = ws.getCell('A1');
  titleCell.value = `EPICARE — ${title.toUpperCase()}`;
  titleCell.font  = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  ws.mergeCells('A2', `${String.fromCharCode(64 + headers.length)}2`);
  const genCell = ws.getCell('A2');
  genCell.value = `Generated: ${nowStr()}`;
  genCell.font  = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
  genCell.alignment = { horizontal: 'center' };

  ws.mergeCells('A3', `${String.fromCharCode(64 + headers.length)}3`);
  const filterCell = ws.getCell('A3');
  filterCell.value = filterSummary;
  filterCell.font  = { name: 'Calibri', size: 9, color: { argb: 'FF374151' } };
  filterCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } };
  filterCell.alignment = { horizontal: 'center', wrapText: true };

  ws.getRow(4).height = 4; // spacer

  // Header row
  const headerRow = ws.addRow(headers.map(h => h.label));
  headerRow.eachCell(cell => {
    cell.font  = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FF818CF8' } },
      bottom: { style: 'thin', color: { argb: 'FF818CF8' } },
    };
  });
  headerRow.height = 24;

  // Data rows
  rows.forEach((row, i) => {
    const r = ws.addRow(headers.map(h => row[h.key] ?? ''));
    const isEven = i % 2 === 0;
    r.eachCell(cell => {
      cell.font = { name: 'Calibri', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFAFAFA' : 'FFFFFFFF' } };
      cell.alignment = { wrapText: false };
    });
  });

  // Auto column widths
  headers.forEach((h, i) => {
    const col = ws.getColumn(i + 1);
    const maxLen = Math.max(
      h.label.length,
      ...rows.map(r => String(r[h.key] ?? '').length)
    );
    col.width = Math.min(Math.max(maxLen + 4, 12), 40);
  });

  // ── Filters metadata sheet ──
  const wsMeta = wb.addWorksheet('Report Metadata');
  wsMeta.addRow(['EPICARE Report Metadata']).font = { bold: true, size: 12 };
  wsMeta.addRow([]);
  wsMeta.addRow(['Report Title', title]);
  wsMeta.addRow(['Generated At', nowStr()]);
  wsMeta.addRow(['Total Records', rows.length]);
  wsMeta.addRow([]);
  wsMeta.addRow(['Applied Filters']);
  wsMeta.addRow(['Filter', 'Value']);
  Object.entries({ city: 'Governorate', disease: 'Disease', gender: 'Gender', severity: 'Severity', outcome: 'Outcome', hospital: 'Hospital', dateFrom: 'Date From', dateTo: 'Date To' })
    .forEach(([key, label]) => {
      if (kpis?.filters?.[key]) wsMeta.addRow([label, kpis.filters[key]]);
    });
  if (kpis) {
    wsMeta.addRow([]);
    wsMeta.addRow(['KPI Summary']);
    if (kpis.total_cases   != null) wsMeta.addRow(['Total Cases',    kpis.total_cases]);
    if (kpis.active_cases  != null) wsMeta.addRow(['Active Cases',   kpis.active_cases]);
    if (kpis.recovered     != null) wsMeta.addRow(['Recovered',      kpis.recovered]);
    if (kpis.deceased      != null) wsMeta.addRow(['Deceased',       kpis.deceased]);
    if (kpis.hospitals_affected != null) wsMeta.addRow(['Hospitals Affected', kpis.hospitals_affected]);
  }
  wsMeta.getColumn(1).width = 22;
  wsMeta.getColumn(2).width = 32;

  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}

// ─── PDF generator ────────────────────────────────────────────────────────────
async function buildPdf({ title, headers, rows, kpis, filterSummary }) {
  const { jsPDF, autoTable } = await getJsPdf();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 10;

  // Header banner
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('EPICARE — Health Intelligence Platform', pageW / 2, 10, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(title, pageW / 2, 17, { align: 'center' });
  y = 28;

  // Generation info
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(`Generated: ${nowStr()}`, 14, y);
  doc.text(`Total Records: ${rows.length}`, pageW - 14, y, { align: 'right' });
  y += 6;

  // Filter summary
  doc.setFillColor(243, 244, 246);
  doc.rect(12, y, pageW - 24, 8, 'F');
  doc.setTextColor(55, 65, 81);
  doc.setFontSize(7.5);
  doc.text(`Filters: ${filterSummary}`, 15, y + 5.5);
  y += 12;

  // KPI cards row
  if (kpis && typeof kpis === 'object') {
    const kpiItems = [
      { label: 'Total Cases',        value: kpis.total_cases ?? '—' },
      { label: 'Active Cases',       value: kpis.active_cases ?? '—' },
      { label: 'Recovered',          value: kpis.recovered ?? '—' },
      { label: 'Deceased',           value: kpis.deceased ?? '—' },
      { label: 'Hospitals Affected', value: kpis.hospitals_affected ?? '—' },
    ].filter(k => k.value !== '—');

    if (kpiItems.length > 0) {
      const cardW   = (pageW - 28 - (kpiItems.length - 1) * 4) / kpiItems.length;
      const cardH   = 18;
      kpiItems.forEach((k, i) => {
        const cx = 14 + i * (cardW + 4);
        doc.setFillColor(238, 242, 255);
        doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'F');
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(String(k.value), cx + cardW / 2, y + 10, { align: 'center' });
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(k.label, cx + cardW / 2, y + 16, { align: 'center' });
      });
      y += cardH + 8;
    }
  }

  // Data table
  if (rows.length > 0) {
    const colDefs    = headers.map(h => ({ header: h.label, dataKey: h.key }));
    const tableRows  = rows.map(r => {
      const obj = {};
      headers.forEach(h => { obj[h.key] = r[h.key] ?? ''; });
      return obj;
    });

    autoTable(doc, {
      startY:  y,
      columns: colDefs,
      body:    tableRows,
      margin:  { left: 14, right: 14 },
      styles:  { fontSize: 7.5, cellPadding: 2.5, overflow: 'linebreak', font: 'helvetica' },
      headStyles: {
        fillColor:  [79, 70, 229],
        textColor:  [255, 255, 255],
        fontStyle:  'bold',
        fontSize:   8,
        halign:     'center',
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      didDrawPage: (data) => {
        // Footer on every page
        const pn = doc.internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(156, 163, 175);
        doc.text(`Epicare Health Intelligence Platform  —  Confidential`, 14, doc.internal.pageSize.getHeight() - 6);
        doc.text(`Page ${data.pageNumber}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
      },
    });
  } else {
    doc.setTextColor(156, 163, 175);
    doc.setFontSize(10);
    doc.text('No data matches the selected filters.', pageW / 2, y + 10, { align: 'center' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

// ─── Report definitions ───────────────────────────────────────────────────────
export const ReportService = {

  // Returns template metadata for the UI
  getTemplates() {
    return [
      {
        id: 'disease_statistics',
        name: 'Disease Statistics Report',
        description: 'Full case log with disease, severity, outcome, and patient data.',
        icon: '🦠',
        category: 'Clinical',
        columns: [
          { key: 'record_id',     label: 'Record ID' },
          { key: 'date',          label: 'Date' },
          { key: 'disease',       label: 'Disease' },
          { key: 'category',      label: 'Category' },
          { key: 'severity',      label: 'Severity' },
          { key: 'outcome',       label: 'Outcome' },
          { key: 'gender',        label: 'Gender' },
          { key: 'city',          label: 'Governorate' },
          { key: 'hospital',      label: 'Hospital' },
        ],
        filters: ['city', 'disease', 'gender', 'severity', 'outcome', 'dateFrom', 'dateTo', 'hospital'],
      },
      {
        id: 'hospital_performance',
        name: 'Hospital Performance Report',
        description: 'Case volume, severity distribution, and outcomes per hospital.',
        icon: '🏥',
        category: 'Operations',
        columns: [
          { key: 'hospital_name',   label: 'Hospital' },
          { key: 'city',            label: 'Governorate' },
          { key: 'total_cases',     label: 'Total Cases' },
          { key: 'avg_severity',    label: 'Avg Severity' },
          { key: 'recovered',       label: 'Recovered' },
          { key: 'deceased',        label: 'Deceased' },
          { key: 'active',          label: 'Active Cases' },
          { key: 'top_disease',     label: 'Top Disease' },
        ],
        filters: ['city', 'dateFrom', 'dateTo'],
      },
      {
        id: 'active_cases',
        name: 'Active Cases Summary',
        description: 'All ongoing (non-resolved) cases across the system.',
        icon: '⚡',
        category: 'Clinical',
        columns: [
          { key: 'record_id',  label: 'Record ID' },
          { key: 'date',       label: 'Date' },
          { key: 'disease',    label: 'Disease' },
          { key: 'severity',   label: 'Severity' },
          { key: 'outcome',    label: 'Status' },
          { key: 'gender',     label: 'Gender' },
          { key: 'city',       label: 'Governorate' },
          { key: 'hospital',   label: 'Hospital' },
        ],
        filters: ['city', 'disease', 'gender', 'severity', 'dateFrom', 'dateTo'],
      },
      {
        id: 'governorate_outbreak',
        name: 'Governorate Outbreak Report',
        description: 'Aggregated outbreak statistics by governorate.',
        icon: '📊',
        category: 'Epidemiology',
        columns: [
          { key: 'city',          label: 'Governorate' },
          { key: 'total_cases',   label: 'Total Cases' },
          { key: 'active_cases',  label: 'Active' },
          { key: 'recovered',     label: 'Recovered' },
          { key: 'deceased',      label: 'Deceased' },
          { key: 'top_disease',   label: 'Top Disease' },
          { key: 'avg_severity',  label: 'Avg Severity' },
        ],
        filters: ['disease', 'dateFrom', 'dateTo'],
      },
    ];
  },

  // ─── Preview — returns JSON data for frontend rendering ───────────────────
  async generatePreview(templateId, filters) {
    const result = await ReportService._fetchReportData(templateId, filters);
    return {
      templateId,
      title:   result.title,
      filters: buildFilterSummary(filters),
      kpis:    result.kpis,
      rows:    result.rows.slice(0, 50),       // preview max 50 rows
      total:   result.rows.length,
      trends:  result.trends || [],
      breakdown: result.breakdown || [],
      severity:  result.severity || [],
    };
  },

  // ─── Export — streams a real file buffer ──────────────────────────────────
  async generateExport(templateId, filters, format) {
    const result = await ReportService._fetchReportData(templateId, filters);
    const filterSummary = buildFilterSummary(filters);

    if (format === 'excel') {
      const buffer = await buildExcel({
        title:         result.title,
        headers:       result.headers,
        rows:          result.rows,
        kpis:          { ...result.kpis, filters },
        filterSummary,
        sheetName:     result.title,
      });
      return { buffer, filename: result.filename + '.xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }

    // PDF
    const buffer = await buildPdf({
      title:         result.title,
      headers:       result.headers,
      rows:          result.rows,
      kpis:          result.kpis,
      filterSummary,
    });
    return { buffer, filename: result.filename + '.pdf', contentType: 'application/pdf' };
  },

  // ─── Private: fetch + normalise per template ──────────────────────────────
  async _fetchReportData(templateId, filters) {
    const dateTag  = new Date().toISOString().split('T')[0];

    switch (templateId) {

      // ── 1. Disease Statistics ────────────────────────────────────────────
      case 'disease_statistics': {
        const [rawData, kpisRaw, trends, breakdown, severity] = await Promise.all([
          ReportRepository.getDiseaseStats(filters),
          ReportRepository.getReportKpis(filters),
          ReportRepository.getReportTrends(filters),
          ReportRepository.getDiseaseBreakdown(filters),
          ReportRepository.getSeverityDistribution(filters),
        ]);
        const rows = rawData.data.map(r => ({
          record_id: `MR-${r.id.substring(0, 8).toUpperCase()}`,
          date:      fmtDate(r.diagnosis_date),
          disease:   r.diseases?.name || 'Unknown',
          category:  r.diseases?.category || 'N/A',
          severity:  severityLabel(r.severity),
          outcome:   r.outcome || 'N/A',
          gender:    r.patients?.gender || 'N/A',
          city:      r.patients?.city || r.hospitals?.city || 'N/A',
          hospital:  r.hospitals?.name || 'N/A',
        }));
        const kpis = Array.isArray(kpisRaw) ? kpisRaw[0] : kpisRaw;
        return {
          title: 'Disease Statistics Report',
          filename: `Epicare_Disease_Statistics_${dateTag}`,
          headers: ReportService.getTemplates().find(t => t.id === 'disease_statistics').columns,
          rows, kpis, trends, breakdown, severity,
        };
      }

      // ── 2. Hospital Performance ──────────────────────────────────────────
      case 'hospital_performance': {
        const rawData = await ReportRepository.getHospitalPerformance(filters);
        const rows = rawData.map(h => ({
          hospital_name: h.hospital_name || h.name || 'N/A',
          city:          h.city || 'N/A',
          total_cases:   h.total_cases ?? 0,
          avg_severity:  h.avg_severity ? Number(h.avg_severity).toFixed(1) : 'N/A',
          recovered:     h.recovered ?? 0,
          deceased:      h.deceased ?? 0,
          active:        h.active ?? 0,
          top_disease:   h.top_disease || 'N/A',
        }));
        const kpis = {
          total_cases:         rows.reduce((s, r) => s + (r.total_cases || 0), 0),
          hospitals_affected:  rows.length,
          recovered:           rows.reduce((s, r) => s + (r.recovered || 0), 0),
          deceased:            rows.reduce((s, r) => s + (r.deceased || 0), 0),
        };
        return {
          title: 'Hospital Performance Report',
          filename: `Epicare_Hospital_Performance_${dateTag}`,
          headers: ReportService.getTemplates().find(t => t.id === 'hospital_performance').columns,
          rows, kpis,
        };
      }

      // ── 3. Active Cases ──────────────────────────────────────────────────
      case 'active_cases': {
        const [rawData, kpisRaw] = await Promise.all([
          ReportRepository.getActiveCases(filters),
          ReportRepository.getReportKpis(filters),
        ]);
        const rows = rawData.map(r => ({
          record_id: `MR-${r.id.substring(0, 8).toUpperCase()}`,
          date:      fmtDate(r.diagnosis_date),
          disease:   r.diseases?.name || 'Unknown',
          severity:  severityLabel(r.severity),
          outcome:   r.outcome || 'Under Treatment',
          gender:    r.patients?.gender || 'N/A',
          city:      r.patients?.city || 'N/A',
          hospital:  r.hospitals?.name || 'N/A',
        }));
        const kpis = Array.isArray(kpisRaw) ? kpisRaw[0] : kpisRaw;
        return {
          title: 'Active Cases Summary',
          filename: `Epicare_Active_Cases_${dateTag}`,
          headers: ReportService.getTemplates().find(t => t.id === 'active_cases').columns,
          rows, kpis,
        };
      }

      // ── 4. Governorate Outbreak ──────────────────────────────────────────
      case 'governorate_outbreak': {
        const rawData = await ReportRepository.getGovernorateOutbreak(filters);
        const rows = rawData.map(r => ({
          city:         r.city || 'N/A',
          total_cases:  r.total_cases ?? 0,
          active_cases: r.active_cases ?? 0,
          recovered:    r.recovered ?? 0,
          deceased:     r.deceased ?? 0,
          top_disease:  r.top_disease || 'N/A',
          avg_severity: r.avg_severity ? Number(r.avg_severity).toFixed(1) : 'N/A',
        }));
        const kpis = {
          total_cases: rows.reduce((s, r) => s + (r.total_cases || 0), 0),
          active_cases: rows.reduce((s, r) => s + (r.active_cases || 0), 0),
          recovered:    rows.reduce((s, r) => s + (r.recovered || 0), 0),
          deceased:     rows.reduce((s, r) => s + (r.deceased || 0), 0),
        };
        return {
          title: 'Governorate Outbreak Report',
          filename: `Epicare_Governorate_Outbreak_${dateTag}`,
          headers: ReportService.getTemplates().find(t => t.id === 'governorate_outbreak').columns,
          rows, kpis,
        };
      }

      default:
        throw Object.assign(new Error(`Unknown report template: ${templateId}`), { statusCode: 400 });
    }
  },

  // ─── Filter dropdown options ──────────────────────────────────────────────
  async getFilterOptions() {
    const [diseases, cities, hospitals] = await Promise.all([
      ReportRepository.getDiseaseList(),
      ReportRepository.getCityList(),
      ReportRepository.getHospitalList(),
    ]);
    return { diseases, cities, hospitals };
  },
};
