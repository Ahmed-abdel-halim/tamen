import { API_BASE_URL, BACKEND_URL } from "../config/api";

function resolveUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/img/')) return `${window.location.origin}${path}`;
  if (path.startsWith('img/')) return `${window.location.origin}/${path}`;
  if (path.startsWith('/storage/')) return `${BACKEND_URL}${path}`;
  if (path.startsWith('storage/')) return `${BACKEND_URL}/${path}`;
  return `${BACKEND_URL}/storage/${path}`;
}

function escapeHtml(str?: string | number | null): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMoney(num?: number | string | null): string {
  if (num === null || num === undefined || num === '') return '0.00';
  const val = Number(num);
  if (isNaN(val)) return '0.00';
  return val.toLocaleString('ar-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('ar-LY');
  } catch {
    return dateStr;
  }
}

export async function printEmployeeForm(user: any, initialCustodies: any[] = []): Promise<void> {
  if (!user) return;

  // 1. Fetch GM Data for official stamp/signature
  let gmData: any = { name: '', job_title: '', approved_signature_url: null, certified_stamp_url: null };
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/general-manager`, {
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (res.ok) {
      gmData = await res.json();
    }
  } catch (e) {
    console.warn("Could not fetch GM data for print", e);
  }

  // 2. Resolve custodies if empty
  let custodies = Array.isArray(initialCustodies) ? initialCustodies : [];
  if (custodies.length === 0 && user.id) {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/custody?recipient_id=${user.id}&recipient_type=employee`);
      if (res.ok) {
        const data = await res.json();
        custodies = Array.isArray(data) ? data.filter((c: any) => c.status === 'active') : [];
      }
    } catch (e) {
      console.warn("Could not fetch custodies", e);
    }
  }

  // 3. Open Print Window
  const w = window.open('', '_blank');
  if (!w) {
    alert('يرجى السماح بالنوافذ المنبثقة لطباعة الاستمارة');
    return;
  }

  const currentDate = new Date().toLocaleDateString('ar-LY');
  const year = new Date().getFullYear();

  // Financial calculations
  const basicSalary = Number(user.salary || 0);
  const housing = Number(user.housing_allowance || 0);
  const trans = Number(user.transportation_allowance || 0);
  const comm = Number(user.communication_allowance || 0);
  const bonus = Number(user.fixed_bonuses || 0);
  const fines = Number(user.fixed_fines || 0);
  const totalAllowances = housing + trans + comm;
  const netSalary = basicSalary + totalAllowances + bonus - fines;

  // Signatures / Stamps URLs
  const empPhoto = user.profile_photo_url ? resolveUrl(user.profile_photo_url) : '';
  const empSig = user.approved_signature_url ? resolveUrl(user.approved_signature_url) : '';
  const empStamp = user.certified_stamp_url ? resolveUrl(user.certified_stamp_url) : '';
  const gmSig = gmData.approved_signature_url ? resolveUrl(gmData.approved_signature_url) : '';
  const gmStamp = gmData.certified_stamp_url ? resolveUrl(gmData.certified_stamp_url) : '';

  // Custodies table rows (up to 3 rows max to ensure single-page fit)
  let custodyRowsHtml = '';
  if (custodies.length === 0) {
    custodyRowsHtml = `<tr><td colspan="5" class="empty-cell">لا توجد عهدة عينية نشطة مسجلة بذمة الموظف حالياً.</td></tr>`;
  } else {
    const displayList = custodies.slice(0, 3);
    custodyRowsHtml = displayList.map((c, idx) => {
      const serial = (c.serial_start || c.serial_end)
        ? `${c.serial_start || ''}${c.serial_end ? ` ➔ ${c.serial_end}` : ''}`
        : '—';
      const itemType = c.item?.inventory_type === 'fixed' || c.inventory_type === 'fixed' ? 'أصل ثابت' : 'مستهلك';
      return `<tr>
        <td style="width: 25px; text-align: center;">${idx + 1}</td>
        <td><strong>${escapeHtml(c.item?.name || c.item_name || 'صنف عهدة')}</strong></td>
        <td style="width: 75px; text-align: center;">${itemType}</td>
        <td style="width: 50px; text-align: center;">${c.quantity || 1}</td>
        <td style="width: 110px; font-size: 7pt; text-align: center;">${escapeHtml(serial)}</td>
      </tr>`;
    }).join('');

    if (custodies.length > 3) {
      custodyRowsHtml += `<tr><td colspan="5" style="text-align: center; font-size: 7pt; color: #64748b; padding: 2px;">+ يوجد عدد (${custodies.length - 3}) أصناف عهدة إضافية مسجلة بالملف الإلكتروني</td></tr>`;
    }
  }

  // Documents checklist
  const hasNationalId = !!(user.national_id_photo_url || user.identity_proof_url);
  const hasContract = !!user.employment_contract_url;
  const hasEduCert = !!user.educational_certificate_url;
  const hasHealthCert = !!user.health_certificate_url;
  const hasSig = !!user.approved_signature_url;
  const hasStamp = !!user.certified_stamp_url;

  w.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8"/>
  <title>استمارة بيانات موظف - ${escapeHtml(user.name)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page {
      size: A4 portrait;
      margin: 4mm 6mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #0f172a;
      font-family: 'Cairo', system-ui, -apple-system, sans-serif;
      direction: rtl;
      color: #0f172a;
      font-size: 8pt;
      line-height: 1.25;
      -webkit-font-smoothing: antialiased;
    }
    .screen-wrapper {
      padding: 20px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .no-print-toolbar {
      width: 210mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      color: #fff;
      padding: 8px 16px;
      border-radius: 8px 8px 0 0;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
    }
    .toolbar-title {
      font-weight: 700;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar-actions {
      display: flex;
      gap: 10px;
    }
    .btn-print {
      background: #0284c7;
      color: white;
      border: none;
      padding: 6px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      font-weight: 800;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .btn-print:hover { background: #0369a1; }
    .btn-close {
      background: #475569;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
    }
    .page-sheet {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      background: #ffffff;
      padding: 4mm 6mm;
      position: relative;
      box-shadow: 0 10px 30px rgba(0,0,0,0.35);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .inner-frame {
      border: 1.5px solid #0284c7;
      height: 100%;
      padding: 4mm 5mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      background: #fff;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 280px;
      height: 280px;
      opacity: 0.045;
      pointer-events: none;
      z-index: 0;
      object-fit: contain;
    }

    /* Header Styling */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px double #0284c7;
      padding-bottom: 5px;
      margin-bottom: 5px;
      position: relative;
      z-index: 1;
    }
    .header-logo {
      width: 65px;
      text-align: right;
    }
    .header-logo img {
      height: 48px;
      object-fit: contain;
    }
    .header-center {
      text-align: center;
      flex: 1;
    }
    .company-title-ar {
      font-size: 13pt;
      font-weight: 900;
      color: #0369a1;
      margin: 0;
      line-height: 1.1;
    }
    .company-title-en {
      font-size: 6.5pt;
      font-weight: 700;
      color: #475569;
      letter-spacing: 0.5px;
      margin-top: 1px;
    }
    .dept-title {
      font-size: 8pt;
      font-weight: 800;
      color: #0f172a;
      margin-top: 2px;
    }
    .form-pill {
      display: inline-block;
      background: linear-gradient(135deg, #0284c7, #0369a1);
      color: #ffffff;
      padding: 2px 14px;
      border-radius: 12px;
      font-size: 8.5pt;
      font-weight: 900;
      margin-top: 3px;
      letter-spacing: 0.3px;
    }
    .header-meta {
      width: 95px;
      font-size: 6.8pt;
      color: #334155;
      line-height: 1.35;
      text-align: left;
    }
    .header-meta div { white-space: nowrap; }
    .status-badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 6.5pt;
      background: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
      margin-top: 2px;
    }
    .status-badge.inactive {
      background: #fee2e2;
      color: #991b1b;
      border-color: #fecaca;
    }

    /* Hero Profile Row */
    .hero-profile {
      display: flex;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 5px 8px;
      margin-bottom: 5px;
      align-items: center;
      position: relative;
      z-index: 1;
    }
    .hero-photo {
      width: 62px;
      height: 72px;
      border: 2px solid #0284c7;
      border-radius: 6px;
      overflow: hidden;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.06);
    }
    .hero-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-size: 6.5pt;
      font-weight: 700;
      text-align: center;
    }
    .photo-placeholder svg {
      width: 28px;
      height: 28px;
      fill: #cbd5e1;
      margin-bottom: 2px;
    }
    .hero-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .hero-top-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 3px;
    }
    .emp-name-main {
      font-size: 11pt;
      font-weight: 900;
      color: #0369a1;
    }
    .emp-job-main {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
      background: #e0f2fe;
      padding: 1px 8px;
      border-radius: 4px;
      border: 1px solid #bae6fd;
    }
    .hero-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 3px 8px;
      font-size: 7.2pt;
    }
    .hero-grid-item {
      display: flex;
      gap: 4px;
    }
    .hg-lbl {
      color: #64748b;
      font-weight: 600;
      white-space: nowrap;
    }
    .hg-val {
      color: #0f172a;
      font-weight: 800;
    }

    /* Section Ribbons */
    .sec-ribbon {
      background: #0284c7;
      color: #ffffff;
      font-size: 7.5pt;
      font-weight: 800;
      padding: 2.5px 8px;
      border-radius: 4px 4px 0 0;
      margin-top: 4px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .sec-ribbon-sub {
      font-size: 6.5pt;
      font-weight: 600;
      opacity: 0.9;
    }

    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.3pt;
      margin-bottom: 3px;
      background: #fff;
    }
    .data-table td, .data-table th {
      border: 1px solid #cbd5e1;
      padding: 2.5px 5px;
      vertical-align: middle;
    }
    .lbl-col {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      width: 14%;
      white-space: nowrap;
    }
    .val-col {
      color: #0f172a;
      font-weight: 700;
      width: 36%;
    }
    .val-col.highlight {
      color: #0369a1;
      font-weight: 800;
    }

    /* Financial Specific */
    .fin-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.2pt;
      margin-bottom: 3px;
      text-align: center;
    }
    .fin-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      border: 1px solid #cbd5e1;
      padding: 2.5px 4px;
    }
    .fin-table td {
      border: 1px solid #cbd5e1;
      padding: 2.5px 4px;
      font-weight: 700;
    }
    .net-salary-cell {
      background: #ecfdf5 !important;
      color: #166534 !important;
      font-weight: 900 !important;
      font-size: 8.5pt !important;
    }

    /* Split Section (Custody & Documents) */
    .split-row {
      display: flex;
      gap: 6px;
      margin-bottom: 3px;
    }
    .split-col-right {
      flex: 1.2;
    }
    .split-col-left {
      flex: 1;
    }
    .custody-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 6.8pt;
    }
    .custody-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      border: 1px solid #cbd5e1;
      padding: 2px 4px;
      text-align: center;
    }
    .custody-table td {
      border: 1px solid #cbd5e1;
      padding: 2px 4px;
    }
    .empty-cell {
      text-align: center;
      color: #94a3b8;
      font-style: italic;
      padding: 8px !important;
    }

    .docs-badge-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 3px 6px;
      border: 1px solid #cbd5e1;
      border-top: none;
      padding: 4px 6px;
      background: #fff;
      font-size: 6.8pt;
    }
    .doc-status-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 1px;
    }
    .doc-lbl { color: #475569; font-weight: 600; }
    .doc-tag {
      font-weight: 800;
      padding: 0 4px;
      border-radius: 3px;
      font-size: 6.2pt;
    }
    .doc-tag.ok { background: #dcfce7; color: #15803d; }
    .doc-tag.no { background: #f1f5f9; color: #94a3b8; }

    /* Undertaking & Approvals */
    .undertaking-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 6.8pt;
      line-height: 1.35;
      color: #334155;
      margin-top: 4px;
      text-align: justify;
    }
    .undertaking-box strong {
      color: #0369a1;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin-top: 4px;
    }
    .sig-card {
      flex: 1;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 4px;
      text-align: center;
      background: #fafafa;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 58px;
    }
    .sig-role {
      font-size: 7.2pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
      margin-bottom: 2px;
    }
    .sig-img-area {
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sig-img-area img {
      max-height: 32px;
      max-width: 90px;
      object-fit: contain;
    }
    .sig-img-area .stamp-img {
      max-height: 34px;
      max-width: 90px;
    }
    .sig-placeholder-line {
      color: #94a3b8;
      letter-spacing: 2px;
      font-size: 7pt;
    }
    .sig-name {
      font-size: 6.8pt;
      font-weight: 700;
      color: #334155;
    }

    /* Footer */
    .footer {
      border-top: 1.5px solid #0284c7;
      padding-top: 3px;
      margin-top: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 6.2pt;
      color: #64748b;
      position: relative;
      z-index: 1;
    }
    .footer-info {
      line-height: 1.35;
    }
    .footer-info strong {
      color: #0f172a;
    }
    .footer-qr {
      text-align: left;
    }
    .footer-qr img {
      width: 32px;
      height: 32px;
      object-fit: contain;
    }

    @media print {
      html, body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        height: 100% !important;
        overflow: hidden !important;
      }
      .no-print {
        display: none !important;
      }
      .screen-wrapper {
        padding: 0 !important;
        min-height: auto !important;
      }
      .page-sheet {
        width: 100% !important;
        height: 100% !important;
        max-height: 288mm !important;
        padding: 0 !important;
        box-shadow: none !important;
        overflow: hidden !important;
        page-break-inside: avoid !important;
        page-break-after: avoid !important;
      }
      .inner-frame {
        border: 2px solid #0284c7 !important;
        height: 100% !important;
        padding: 3.5mm 4.5mm !important;
        page-break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="screen-wrapper">
    <div class="no-print no-print-toolbar">
      <div class="toolbar-title">
        <span>🖨️ استعراض استمارة بيانات موظف - <strong>${escapeHtml(user.name)}</strong></span>
        <span style="font-size: 11px; opacity: 0.8;">(تم الضبط بدقة لطباعة صفحة A4 واحدة متكاملة)</span>
      </div>
      <div class="toolbar-actions">
        <button class="btn-print" onclick="window.print()">
          <span>🖨️ طباعة الاستمارة الآن</span>
        </button>
        <button class="btn-close" onclick="window.close()">إغلاق</button>
      </div>
    </div>

    <div class="page-sheet">
      <div class="inner-frame">
        <img class="watermark" src="${window.location.origin}/img/logo.png" onerror="this.src='${window.location.origin}/img/official_logo.PNG'" alt="" />

        <div>
          <!-- Header -->
          <div class="header">
            <div class="header-logo">
              <img src="${window.location.origin}/img/logo.png" onerror="this.src='${window.location.origin}/img/official_logo.PNG'" alt="شعار الشركة" />
            </div>
            <div class="header-center">
              <h1 class="company-title-ar">شركة المدار الليبي للتأمين المساهمة</h1>
              <div class="company-title-en">AL MADAR LIBYAN INSURANCE COMPANY S.A.O.G</div>
              <div class="dept-title">إدارة الشؤون الإدارية والموارد البشرية</div>
              <div class="form-pill">استمارة بيانات وملف موظف</div>
            </div>
            <div class="header-meta">
              <div><strong>تاريخ الإصدار:</strong> ${currentDate}</div>
              <div><strong>الرقم المرجعي:</strong> MLI-EMP-${user.id}-${year}</div>
              <div><strong>كود الموظف:</strong> ${escapeHtml(user.job_number || user.username || user.id)}</div>
              <div><span class="status-badge ${user.is_active === false ? 'inactive' : ''}">${user.is_active === false ? 'غير نشط' : 'على رأس العمل'}</span></div>
            </div>
          </div>

          <!-- Hero Identity Block -->
          <div class="hero-profile">
            <div class="hero-photo">
              ${empPhoto ? `<img src="${empPhoto}" alt="صورة الموظف" />` : `
                <div class="photo-placeholder">
                  <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  <span>بلا صورة</span>
                </div>
              `}
            </div>
            <div class="hero-details">
              <div class="hero-top-row">
                <span class="emp-name-main">${escapeHtml(user.full_name_quad || user.name)}</span>
                <span class="emp-job-main">${escapeHtml(user.job_title || 'موظف')}</span>
              </div>
              <div class="hero-grid">
                <div class="hero-grid-item"><span class="hg-lbl">الرقم الوطني:</span><span class="hg-val">${escapeHtml(user.national_id_number || '—')}</span></div>
                <div class="hero-grid-item"><span class="hg-lbl">الرقم الوظيفي:</span><span class="hg-val">${escapeHtml(user.job_number || user.username || '—')}</span></div>
                <div class="hero-grid-item"><span class="hg-lbl">الرقم المالي:</span><span class="hg-val">${escapeHtml(user.financial_number || '—')}</span></div>
                <div class="hero-grid-item"><span class="hg-lbl">تاريخ المباشرة:</span><span class="hg-val">${formatDate(user.start_date || user.work_start_date || user.hire_date)}</span></div>
                <div class="hero-grid-item"><span class="hg-lbl">الهاتف الأساسي:</span><span class="hg-val" dir="ltr">${escapeHtml(user.personal_phone || '—')}</span></div>
                <div class="hero-grid-item"><span class="hg-lbl">البريد الإلكتروني:</span><span class="hg-val" dir="ltr">${escapeHtml(user.email || '—')}</span></div>
              </div>
            </div>
          </div>

          <!-- Section 1: Personal Info -->
          <div class="sec-ribbon">
            <span>أولاً: البيانات الشخصية والاجتماعية</span>
            <span class="sec-ribbon-sub">Personal & Demographic Information</span>
          </div>
          <table class="data-table">
            <tr>
              <td class="lbl-col">اسم الأم:</td>
              <td class="val-col">${escapeHtml(user.mother_name || '—')}</td>
              <td class="lbl-col">الجنس / الجنسية:</td>
              <td class="val-col">${escapeHtml(user.gender || '—')} / ${escapeHtml(user.nationality || 'ليبي')}</td>
            </tr>
            <tr>
              <td class="lbl-col">الميلاد (تاريخ ومكان):</td>
              <td class="val-col">${formatDate(user.birth_date)} (${escapeHtml(user.birth_place || '—')})</td>
              <td class="lbl-col">الحالة الاجتماعية:</td>
              <td class="val-col">${escapeHtml(user.social_status || '—')}</td>
            </tr>
            <tr>
              <td class="lbl-col">المؤهل العلمي:</td>
              <td class="val-col">${escapeHtml(user.qualification || '—')}</td>
              <td class="lbl-col">فصيلة الدم / طوارئ:</td>
              <td class="val-col">${escapeHtml(user.blood_type || '—')} / هاتف: <span dir="ltr">${escapeHtml(user.guardian_phone || '—')}</span></td>
            </tr>
            <tr>
              <td class="lbl-col">العنوان السكني:</td>
              <td class="val-col" colspan="3">${escapeHtml(user.address || '—')}</td>
            </tr>
          </table>

          <!-- Section 2: Employment & Contract -->
          <div class="sec-ribbon">
            <span>ثانياً: البيانات الوظيفية والتعاقدية</span>
            <span class="sec-ribbon-sub">Employment & Contractual Terms</span>
          </div>
          <table class="data-table">
            <tr>
              <td class="lbl-col">تاريخ التعيين:</td>
              <td class="val-col">${formatDate(user.hire_date || user.start_date)}</td>
              <td class="lbl-col">بدء سريان المرتب:</td>
              <td class="val-col">${formatDate(user.work_start_date || user.start_date)}</td>
            </tr>
            <tr>
              <td class="lbl-col">نوع العقد ومدته:</td>
              <td class="val-col">${escapeHtml(user.contract_type || 'محدد المدة')} (${escapeHtml(user.contract_duration || 'سنة قابلة للتجديد')})</td>
              <td class="lbl-col">حالة انتهاء العقد:</td>
              <td class="val-col">${user.end_date ? formatDate(user.end_date) : 'مستمر بالعمل'}</td>
            </tr>
            <tr>
              <td class="lbl-col">ساعات وأيام الدوام:</td>
              <td class="val-col">${user.working_hours_from ? `${user.working_hours_from} إلى ${user.working_hours_to}` : 'وفق اللائحة'} (${user.working_days_from ? `${user.working_days_from} - ${user.working_days_to}` : 'الأحد - الخميس'})</td>
              <td class="lbl-col">شروط العقد الخاصة:</td>
              <td class="val-col">${escapeHtml(user.contract_conditions || 'تطبق أحكام قانون العمل الليبي واللائحة الداخلية')}</td>
            </tr>
          </table>

          <!-- Section 3: Financial & Banking -->
          <div class="sec-ribbon">
            <span>ثالثاً: البيانات المالية والاشتراكات المصرفية والضريبية</span>
            <span class="sec-ribbon-sub">Payroll, Banking & Taxes</span>
          </div>
          <table class="fin-table">
            <thead>
              <tr>
                <th>المرتب الأساسي</th>
                <th>إجمالي البدلات (سكن+نقل+اتصال)</th>
                <th>علاوات ثابتة</th>
                <th>خصومات ثابتة</th>
                <th>صافي الراتب التقديري</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>${formatMoney(basicSalary)} د.ل</strong></td>
                <td>${formatMoney(totalAllowances)} د.ل</td>
                <td>${formatMoney(bonus)} د.ل</td>
                <td>${formatMoney(fines)} د.ل</td>
                <td class="net-salary-cell">${formatMoney(netSalary)} د.ل</td>
              </tr>
            </tbody>
          </table>
          <table class="data-table">
            <tr>
              <td class="lbl-col">اسم المصرف والفرع:</td>
              <td class="val-col">${escapeHtml(user.bank_name || '—')} (${escapeHtml(user.bank_branch || 'الفرع الرئيسي')})</td>
              <td class="lbl-col">رقم الحساب المصرفي:</td>
              <td class="val-col highlight" dir="ltr">${escapeHtml(user.account_number || '—')}</td>
            </tr>
            <tr>
              <td class="lbl-col">الملف الضريبي:</td>
              <td class="val-col">${user.apply_tax !== false ? `خاضع (${user.tax_percentage || 0}%)` : 'معفى'} ${user.tax_file_number ? `| ملف: ${user.tax_file_number}` : ''}</td>
              <td class="lbl-col">الملف الضماني:</td>
              <td class="val-col">${user.apply_social_security !== false ? `خاضع (${user.social_security_percentage || 0}%)` : 'معفى'} ${user.social_security_file_number ? `| ملف: ${user.social_security_file_number}` : ''}</td>
            </tr>
          </table>

          <!-- Section 4: Custody & Documents -->
          <div class="split-row">
            <!-- Custody Side -->
            <div class="split-col-right">
              <div class="sec-ribbon">
                <span>رابعاً: العهدة العينية المقيدة بذمة الموظف</span>
                <span class="sec-ribbon-sub">(${custodies.length} عناصر)</span>
              </div>
              <table class="custody-table">
                <thead>
                  <tr>
                    <th style="width: 25px;">م</th>
                    <th>البيان والصنف</th>
                    <th style="width: 75px;">النوع</th>
                    <th style="width: 50px;">الكمية</th>
                    <th style="width: 110px;">الرقم التسلسلي</th>
                  </tr>
                </thead>
                <tbody>
                  ${custodyRowsHtml}
                </tbody>
              </table>
            </div>

            <!-- Documents Side -->
            <div class="split-col-left">
              <div class="sec-ribbon">
                <span>خامساً: الأرشيف والمستندات الثبوتية</span>
                <span class="sec-ribbon-sub">Documents Checklist</span>
              </div>
              <div class="docs-badge-grid">
                <div class="doc-status-item">
                  <span class="doc-lbl">إثبات الهوية / الوطنية</span>
                  <span class="doc-tag ${hasNationalId ? 'ok' : 'no'}">${hasNationalId ? 'مؤرشف ✓' : 'غير متوفر'}</span>
                </div>
                <div class="doc-status-item">
                  <span class="doc-lbl">عقد العمل المعتمد</span>
                  <span class="doc-tag ${hasContract ? 'ok' : 'no'}">${hasContract ? 'مؤرشف ✓' : 'غير متوفر'}</span>
                </div>
                <div class="doc-status-item">
                  <span class="doc-lbl">المؤهل الأكاديمي</span>
                  <span class="doc-tag ${hasEduCert ? 'ok' : 'no'}">${hasEduCert ? 'مؤرشف ✓' : 'غير متوفر'}</span>
                </div>
                <div class="doc-status-item">
                  <span class="doc-lbl">الشهادة الصحية</span>
                  <span class="doc-tag ${hasHealthCert ? 'ok' : 'no'}">${hasHealthCert ? 'مؤرشف ✓' : 'غير متوفر'}</span>
                </div>
                <div class="doc-status-item">
                  <span class="doc-lbl">التوقيع الإلكتروني</span>
                  <span class="doc-tag ${hasSig ? 'ok' : 'no'}">${hasSig ? 'معتمد ✓' : 'غير متوفر'}</span>
                </div>
                <div class="doc-status-item">
                  <span class="doc-lbl">الختم الإلكتروني</span>
                  <span class="doc-tag ${hasStamp ? 'ok' : 'no'}">${hasStamp ? 'معتمد ✓' : 'غير متوفر'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Block: Undertaking & Signatures & Footer -->
        <div>
          <div class="undertaking-box">
            <strong>إقرار وتعهد بصحة البيانات:</strong> أقر أنا الموظف الموقع أدناه بصحة ودقة واكتمال كافة البيانات الشخصية والوظيفية والمالية المسجلة بهذه الاستمارة واستلامي لكافة العهد الموضحة بذمتي، وأتعهد بالالتزام بكافة اللوائح والسياسات الداخلية لشركة المدار الليبي للتأمين، وبإخطار إدارة الموارد البشرية فوراً بأي تعديل يطرأ عليها، وهذا إقرار مني بذلك.
          </div>

          <div class="signatures-row">
            <div class="sig-card">
              <div class="sig-role">توقيع وإقرار الموظف</div>
              <div class="sig-img-area">
                ${empSig ? `<img src="${empSig}" alt="توقيع الموظف" />` : (empStamp ? `<img src="${empStamp}" class="stamp-img" alt="ختم الموظف" />` : `<div class="sig-placeholder-line">.....................................</div>`)}
              </div>
              <div class="sig-name">${escapeHtml(user.name)}</div>
            </div>

            <div class="sig-card">
              <div class="sig-role">إدارة الشؤون الإدارية والموارد البشرية</div>
              <div class="sig-img-area">
                <div class="sig-placeholder-line">.....................................</div>
              </div>
              <div class="sig-name">روجع واعتمد للحفظ بالملف</div>
            </div>

            <div class="sig-card">
              <div class="sig-role">اعتماد المدير العام / ختم الشركة</div>
              <div class="sig-img-area">
                ${gmStamp ? `<img src="${gmStamp}" class="stamp-img" alt="ختم الشركة" />` : (gmSig ? `<img src="${gmSig}" alt="توقيع المدير العام" />` : `<div class="sig-placeholder-line">.....................................</div>`)}
              </div>
              <div class="sig-name">${escapeHtml(gmData.name || 'المدير العام')}</div>
            </div>
          </div>

          <!-- Official Footer -->
          <div class="footer">
            <div class="footer-info">
              <div><strong>شركة المدار الليبي للتأمين المساهمة</strong> | رأس المال: (10) مليون د.ل | سجل تجاري: (8748) | طرابلس – ليبيا</div>
              <div>هاتف: 00218920003366 | البريد: info@mli.ly | الموقع الإلكتروني: www.mli.ly | وثيقة شؤون موظفين سرية</div>
            </div>
            <div class="footer-qr">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(window.location.origin + '/users/' + user.id)}" alt="QR" />
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`);

  w.document.close();
}
