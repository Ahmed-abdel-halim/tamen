// src/utils/printInsuranceSupervisionReport.ts
// مولّد تقارير الطباعة الرسمية لهيئة الإشراف على التأمين - شركة المدار الليبي للتأمين

export interface SupervisionSummaryData {
  total_premiums: number;
  total_supervision_due: number;
  total_paid: number;
  net_balance: number;
  total_documents_count: number;
}

export interface SupervisionCategoryData {
  key: string;
  name: string;
  document_count: number;
  total_premium: number;
  fee_rate: number;
  fixed_fee: number;
  supervision_fee: number;
}

export interface SupervisionPaymentData {
  id: number;
  voucher_number?: string | null;
  payment_date: string;
  amount: number | string;
  payment_method: string;
  bank_name?: string | null;
  check_number?: string | null;
  period_from?: string | null;
  period_to?: string | null;
  notes?: string | null;
  receipt_image?: string | null;
}

export interface DetailedDocData {
  id: number;
  policy_number?: string;
  document_number?: string;
  module_key?: string;
  insurance_type?: string;
  insurance_type_name?: string;
  type_label?: string;
  insured_name?: string;
  client_name?: string;
  branch_name?: string;
  issue_date?: string;
  premium?: number;
  total_premium?: number;
  supervision_fee?: number;
  fee_rate?: number;
}

export interface PrintFilters {
  year?: string;
  month?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  typeLabel?: string;
}

// دالة مساعدة لتفقيط المبالغ بالدينار الليبي
export function tafqeetDinar(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'صفر دينار ليبي';
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const fractionalPart = Math.round((absAmount - integerPart) * 1000); // بالدراهم (1 د.ل = 1000 درهم)

  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة'];
  const tens = ['', 'عشرة', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const teens = ['عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  function convertChunk(num: number): string {
    let result = '';
    const h = Math.floor(num / 100);
    const remainder = num % 100;
    const t = Math.floor(remainder / 10);
    const o = remainder % 10;

    if (h > 0) result += hundreds[h];

    if (remainder > 0) {
      if (result) result += ' و';
      if (remainder < 10) {
        result += ones[remainder];
      } else if (remainder >= 11 && remainder <= 19) {
        result += teens[remainder - 10];
      } else if (o === 0) {
        result += tens[t];
      } else {
        result += `${ones[o]} و${tens[t]}`;
      }
    }
    return result;
  }

  function convertNumber(num: number): string {
    if (num === 0) return '';
    let parts: string[] = [];
    
    const billions = Math.floor(num / 1000000000);
    num %= 1000000000;
    const millions = Math.floor(num / 1000000);
    num %= 1000000;
    const thousands = Math.floor(num / 1000);
    const chunk = num % 1000;

    if (billions > 0) {
      if (billions === 1) parts.push('مليار');
      else if (billions === 2) parts.push('ملياران');
      else if (billions >= 3 && billions <= 10) parts.push(`${convertChunk(billions)} مليارات`);
      else parts.push(`${convertChunk(billions)} مليار`);
    }

    if (millions > 0) {
      if (millions === 1) parts.push('مليون');
      else if (millions === 2) parts.push('مليونان');
      else if (millions >= 3 && millions <= 10) parts.push(`${convertChunk(millions)} ملايين`);
      else parts.push(`${convertChunk(millions)} مليون`);
    }

    if (thousands > 0) {
      if (thousands === 1) parts.push('ألف');
      else if (thousands === 2) parts.push('ألفان');
      else if (thousands >= 3 && thousands <= 10) parts.push(`${convertChunk(thousands)} آلاف`);
      else parts.push(`${convertChunk(thousands)} ألف`);
    }

    if (chunk > 0) {
      parts.push(convertChunk(chunk));
    }

    return parts.join(' و');
  }

  let text = convertNumber(integerPart) + ' دينار ليبي';
  if (fractionalPart > 0) {
    text += ` و${convertNumber(fractionalPart)} درهماً`;
  }

  return (isNegative ? 'سالب ' : '') + 'فقط ' + text + ' لا غير';
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
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getMethodLabel(m: string): string {
  switch (m) {
    case 'check': return 'صك مصرفي مصدق';
    case 'bank_transfer': return 'تحويل مصرفي';
    case 'deposit': return 'إيداع نقدي بالحساب';
    case 'cash': return 'نقداً (خزينة)';
    default: return m || '—';
  }
}

// النمط الموحد لصفحة الطباعة الرسمية
function getCommonStyles(): string {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 10mm 10mm;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #f8fafc;
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      direction: rtl;
      color: #0f172a;
      font-size: 8.5pt;
      line-height: 1.35;
      -webkit-font-smoothing: antialiased;
    }

    /* شريط الأدوات العلوي للمعاينة */
    .screen-toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #091e3a;
      color: #ffffff;
      padding: 10px 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 15px rgba(0,0,0,0.25);
      border-bottom: 2px solid #38bdf8;
    }

    .toolbar-title {
      font-weight: 800;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #38bdf8;
    }

    .toolbar-badge {
      background: rgba(56, 189, 248, 0.2);
      color: #7dd3fc;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11px;
      border: 1px solid rgba(56, 189, 248, 0.4);
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-action {
      padding: 8px 18px;
      border-radius: 8px;
      font-family: inherit;
      font-weight: 800;
      font-size: 13px;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-print {
      background: #10b981;
      color: #fff;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }
    .btn-print:hover { background: #059669; }

    .btn-close {
      background: #475569;
      color: #fff;
    }
    .btn-close:hover { background: #334155; }

    /* حاوية ورقة الـ A4 الرسمية */
    .sheet-wrapper {
      max-width: 210mm;
      margin: 16px auto;
      background: #ffffff;
      padding: 10mm 12mm 10mm 12mm;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      position: relative;
      border-radius: 4px;
      box-sizing: border-box;
      min-height: 297mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* الإطار المزدوج الفاخر */
    .doc-outer-border {
      position: absolute;
      top: 4.5mm;
      bottom: 4.5mm;
      left: 4.5mm;
      right: 4.5mm;
      border: 2px solid #091e3a;
      border-radius: 6px;
      pointer-events: none;
    }

    .doc-inner-border {
      position: absolute;
      top: 6mm;
      bottom: 6mm;
      left: 6mm;
      right: 6mm;
      border: 0.75px solid #cbd5e1;
      border-radius: 4px;
      pointer-events: none;
    }

    /* العلامة المائية الرسمية */
    .watermark-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.04;
      pointer-events: none;
      z-index: 0;
      text-align: center;
    }

    .watermark-container img {
      width: 480px;
      height: auto;
      filter: grayscale(100%);
    }

    .content-body {
      position: relative;
      z-index: 1;
    }

    /* الترويسة الرسمية (Header) */
    .official-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 2px solid #091e3a;
      margin-bottom: 12px;
    }

    .header-entity {
      width: 32%;
      text-align: right;
    }

    .header-entity h1 {
      margin: 0;
      font-size: 13.5pt;
      font-weight: 900;
      color: #091e3a;
      line-height: 1.25;
    }

    .header-entity h2 {
      margin: 2px 0 0 0;
      font-size: 10pt;
      font-weight: 700;
      color: #0369a1;
      line-height: 1.2;
    }

    .header-entity p {
      margin: 2px 0 0 0;
      font-size: 7.5pt;
      color: #64748b;
      font-weight: 600;
    }

    .header-logo-box {
      width: 36%;
      text-align: center;
    }

    .header-logo-box img {
      height: 65px;
      width: auto;
      object-fit: contain;
    }

    .header-meta {
      width: 32%;
      text-align: left;
      font-size: 7.5pt;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 3px;
    }

    .meta-row {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .meta-label {
      color: #64748b;
      font-weight: 700;
    }

    .meta-value {
      font-weight: 800;
      color: #091e3a;
      direction: ltr;
      display: inline-block;
    }

    /* شريط عنوان التقرير المذهب */
    .report-banner {
      background: linear-gradient(135deg, #091e3a 0%, #1e3a8a 100%);
      color: #fff;
      padding: 10px 16px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 14px;
      border: 1px solid #1e3a8a;
      box-shadow: 0 2px 6px rgba(9, 30, 58, 0.15);
    }

    .report-title {
      font-size: 13pt;
      font-weight: 900;
      letter-spacing: -0.3px;
      margin: 0;
      color: #ffffff;
    }

    .report-subtitle {
      font-size: 8pt;
      margin: 4px 0 0 0;
      color: #93c5fd;
      font-weight: 600;
    }

    /* بطاقات الموقف المالي التنفيذي (KPIs) */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 14px;
    }

    .kpi-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
      position: relative;
    }

    .kpi-card.primary {
      border-top: 3px solid #0284c7;
      background: #f0f9ff;
    }

    .kpi-card.danger {
      border-top: 3px solid #dc2626;
      background: #fef2f2;
    }

    .kpi-card.success {
      border-top: 3px solid #10b981;
      background: #f0fdf4;
    }

    .kpi-card.amber {
      border-top: 3px solid #d97706;
      background: #fffbeb;
    }

    .kpi-label {
      font-size: 7.2pt;
      font-weight: 700;
      color: #475569;
      margin-bottom: 3px;
      display: block;
    }

    .kpi-val {
      font-size: 11.5pt;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.2;
      direction: ltr;
    }

    .kpi-card.danger .kpi-val { color: #b91c1c; }
    .kpi-card.success .kpi-val { color: #047857; }
    .kpi-card.amber .kpi-val { color: #b45309; }
    .kpi-card.primary .kpi-val { color: #0369a1; }

    .kpi-cur {
      font-size: 7pt;
      font-weight: 700;
      margin-right: 3px;
    }

    .kpi-sub {
      font-size: 6.5pt;
      color: #64748b;
      margin-top: 2px;
      font-weight: 600;
    }

    /* شريط التفقيط */
    .tafqeet-box {
      background: #f1f5f9;
      border-right: 4px solid #0284c7;
      border-left: 1px solid #cbd5e1;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
      padding: 6px 12px;
      border-radius: 4px;
      margin-bottom: 14px;
      font-size: 8pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .tafqeet-label {
      font-weight: 800;
      color: #091e3a;
    }

    .tafqeet-text {
      font-weight: 700;
      color: #0369a1;
      font-style: italic;
    }

    /* الجداول الرسمية */
    .section-title {
      font-size: 9.5pt;
      font-weight: 800;
      color: #091e3a;
      margin: 12px 0 6px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1.5px solid #cbd5e1;
      padding-bottom: 4px;
    }

    .report-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 7.8pt;
    }

    .report-table th {
      background-color: #091e3a;
      color: #ffffff;
      font-weight: 800;
      padding: 6px 7px;
      border: 1px solid #091e3a;
      text-align: center;
      vertical-align: middle;
      font-size: 7.5pt;
    }

    .report-table td {
      padding: 5.5px 7px;
      border: 1px solid #cbd5e1;
      text-align: center;
      vertical-align: middle;
    }

    .report-table tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    .report-table tfoot td {
      background-color: #e2e8f0;
      font-weight: 900;
      border-top: 2px solid #091e3a;
      border-bottom: 2px solid #091e3a;
      color: #091e3a;
      font-size: 8pt;
    }

    .text-right { text-align: right !important; }
    .text-center { text-align: center !important; }
    .text-left { text-align: left !important; }
    .num-cell { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: 700; }

    /* صندوق المطابقة والتسوية */
    .reconciliation-card {
      background: #f8fafc;
      border: 1.5px dashed #0284c7;
      border-radius: 6px;
      padding: 8px 14px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-around;
      align-items: center;
      font-size: 8pt;
    }

    .recon-step {
      text-align: center;
    }

    .recon-step-title {
      font-size: 7pt;
      color: #64748b;
      font-weight: 700;
    }

    .recon-step-val {
      font-size: 9.5pt;
      font-weight: 900;
      direction: ltr;
      display: inline-block;
      margin-top: 2px;
    }

    .recon-operator {
      font-size: 14pt;
      font-weight: 900;
      color: #94a3b8;
    }

    /* الإقرار النظامي */
    .legal-notice {
      background: #fafafa;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 10px;
      margin-bottom: 14px;
      font-size: 6.8pt;
      color: #475569;
      line-height: 1.35;
      text-align: justify;
    }

    /* منطقة التوقيعات والاعتماد */
    .signatures-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr) 110px;
      gap: 10px;
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1.5px solid #cbd5e1;
      page-break-inside: avoid;
    }

    .sig-box {
      text-align: center;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 6px 4px 10px 4px;
      background: #fff;
    }

    .sig-role {
      font-size: 7.2pt;
      font-weight: 800;
      color: #091e3a;
      margin-bottom: 25px;
      display: block;
    }

    .sig-line {
      font-size: 6.8pt;
      color: #94a3b8;
      border-top: 1px dotted #94a3b8;
      padding-top: 3px;
      margin: 0 8px;
    }

    .stamp-box {
      border: 1.5px dashed #091e3a;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 6.8pt;
      font-weight: 800;
      color: #091e3a;
      background: #f8fafc;
      min-height: 65px;
    }

    /* تذييل الورقة (Footer) */
    .official-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 6.5pt;
      color: #64748b;
      page-break-inside: avoid;
    }

    .footer-right {
      display: flex;
      gap: 12px;
    }

    .footer-left {
      text-align: left;
      direction: ltr;
    }

    /* طباعة بدون أشرطة الأدوات */
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .screen-toolbar {
        display: none !important;
      }
      .sheet-wrapper {
        margin: 0 auto !important;
        box-shadow: none !important;
        border: none !important;
        min-height: 297mm;
        padding: 6mm 8mm 6mm 8mm;
      }
      .page-break {
        page-break-before: always;
      }
    }
  `;
}

// دالة توليد كود QR
function getQrCodeUrl(content: string): string {
  const encoded = encodeURIComponent(content);
  return `https://api.qrserver.com/v1/create-qr-code/?size=95x95&data=${encoded}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. تقرير كشف الحساب والموقف المالي الشامل (Comprehensive Financial Statement)
// ══════════════════════════════════════════════════════════════════════════════
export function printSupervisionFinancialStatement(data: {
  summary: SupervisionSummaryData;
  categories: SupervisionCategoryData[];
  payments: SupervisionPaymentData[];
  filters?: PrintFilters;
  currentUser?: any;
}): void {
  const { summary, categories, payments, filters, currentUser } = data;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة (Popups) من إعدادات المتصفح لطباعة التقرير الرسمي.');
    return;
  }

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const refNo = `MLI/SUP/${today.getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
  const userName = currentUser?.name || currentUser?.full_name || 'قسم الحسابات العامة';
  
  // نصوص الفلاتر
  const periodText = filters?.fromDate && filters?.toDate
    ? `عن الفترة من ${filters.fromDate} إلى ${filters.toDate}`
    : (filters?.year && filters.year !== 'الكل'
        ? `عن السنة المالية ${filters.year} ${filters.month && filters.month !== 'الكل' ? `(شهر ${filters.month})` : ''}`
        : `حتى تاريخه (${dateStr})`);

  // نص التفقيط للرصيد الصافي المتبقي
  const netDue = summary.net_balance;
  const tafqeetText = tafqeetDinar(netDue);

  // صفوف الفئات
  const categoryRows = categories.map((cat, idx) => {
    const share = summary.total_supervision_due > 0
      ? ((cat.supervision_fee / summary.total_supervision_due) * 100).toFixed(1)
      : '0.0';

    return `
      <tr>
        <td style="font-weight:700;">${idx + 1}</td>
        <td class="text-right" style="font-weight:800; color:#091e3a;">${escapeHtml(cat.name)}</td>
        <td class="num-cell">${cat.document_count.toLocaleString()}</td>
        <td class="num-cell" style="color:#0369a1;">${formatMoney(cat.total_premium)}</td>
        <td style="font-weight:800;">${cat.fee_rate}% ${cat.fixed_fee > 0 ? `+ ${cat.fixed_fee} د.ل` : ''}</td>
        <td class="num-cell" style="font-weight:900; color:#dc2626;">${formatMoney(cat.supervision_fee)}</td>
        <td class="num-cell" style="font-weight:700;">${share}%</td>
      </tr>
    `;
  }).join('');

  // صفوف السندات المسددة
  const paymentRows = payments.length > 0 ? payments.map((p, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td style="font-family:monospace; font-weight:800;">${escapeHtml(p.voucher_number || `SUP-${p.id}`)}</td>
      <td class="num-cell">${p.payment_date?.split('T')[0]}</td>
      <td>${getMethodLabel(p.payment_method)}</td>
      <td>${escapeHtml(p.bank_name || '—')}</td>
      <td style="font-family:monospace;">${escapeHtml(p.check_number || '—')}</td>
      <td style="font-size:7pt; color:#64748b;">${p.period_from ? `${p.period_from.split('T')[0]} إلى ${p.period_to?.split('T')[0] || ''}` : '—'}</td>
      <td class="num-cell" style="font-weight:900; color:#059669;">${formatMoney(p.amount)}</td>
    </tr>
  `).join('') : `
    <tr>
      <td colspan="8" style="padding:14px; color:#64748b; font-weight:700;">لا توجد سندات سداد مسجلة خلال الفترة المحددة</td>
    </tr>
  `;

  const totalPaymentsAmount = payments.reduce((acc, p) => acc + (parseFloat(p.amount.toString()) || 0), 0);

  const qrData = `شركة المدار الليبي للتأمين | كشف حساب هيئة الإشراف | رقم: ${refNo} | التاريخ: ${dateStr} | الرصيد المستحق: ${formatMoney(netDue)} د.ل`;
  const qrUrl = getQrCodeUrl(qrData);

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>كشف حساب وموقف مالي رسمي — هيئة الإشراف على التأمين</title>
      <style>${getCommonStyles()}</style>
    </head>
    <body>
      <!-- شريط أدوات الطباعة العلوي -->
      <div class="screen-toolbar">
        <div class="toolbar-title">
          <span>🏛️ كشف حساب وموقف مالي رسمي — هيئة الإشراف على التأمين</span>
          <span class="toolbar-badge">شركة المدار الليبي للتأمين ش.م.ل</span>
        </div>
        <div class="toolbar-actions">
          <button class="btn-action btn-print" onclick="window.print()">
            🖨️ طباعة المستند الرسمي (A4)
          </button>
          <button class="btn-action btn-close" onclick="window.close()">
            ✕ إغلاق المعاينة
          </button>
        </div>
      </div>

      <!-- ورقة التقرير الرسمية A4 -->
      <div class="sheet-wrapper">
        <div class="doc-outer-border"></div>
        <div class="doc-inner-border"></div>

        <div class="watermark-container">
          <img src="/img/logo.png" onerror="this.src='/img/official_logo.PNG'; this.onerror=null;" alt="Watermark" />
        </div>

        <div class="content-body">
          <!-- الترويسة الرسمية -->
          <div class="official-header">
            <div class="header-entity">
              <h1>دولة ليبيــــــــا</h1>
              <h2>شركة المدار الليبي للتأمين</h2>
              <p>الإدارة العامة للشؤون المالية والمحاسبية</p>
              <p>قسم متابعة رسوم هيئة الإشراف على التأمين</p>
            </div>

            <div class="header-logo-box">
              <img src="/img/logo.png" onerror="this.src='/img/official_logo.PNG'; this.onerror=null;" alt="المدار الليبي للتأمين" />
              <div style="font-size: 7.2pt; font-weight:800; color:#091e3a; margin-top:2px;">Al Madar Libyan Insurance Co.</div>
            </div>

            <div class="header-meta">
              <div class="meta-row">
                <span class="meta-label">الرقم الإشاري:</span>
                <span class="meta-value">${refNo}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">تاريخ الكشف:</span>
                <span class="meta-value">${dateStr}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">المستخرج:</span>
                <span class="meta-value" style="direction:rtl;">${escapeHtml(userName)}</span>
              </div>
              <div style="margin-top: 3px;">
                <img src="${qrUrl}" style="width: 44px; height: 44px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px;" alt="QR" />
              </div>
            </div>
          </div>

          <!-- شريط العنوان -->
          <div class="report-banner">
            <h2 class="report-title">كشف حساب وموقف مالي رسمي — هيئة الإشراف على التأمين</h2>
            <p class="report-subtitle">
              بيان تفصيلي بحساب رسوم هيئة الإشراف القانونية والتوريدات المسددة — ${periodText}
            </p>
          </div>

          <!-- بطاقات الموقف المالي التنفيذي -->
          <div class="kpi-grid">
            <div class="kpi-card primary">
              <span class="kpi-label">إجمالي الأقساط الخاضعة للرسم</span>
              <div class="kpi-val">${formatMoney(summary.total_premiums)} <span class="kpi-cur">د.ل</span></div>
              <div class="kpi-sub">عبر ${summary.total_documents_count.toLocaleString()} وثيقة تأمينية</div>
            </div>

            <div class="kpi-card danger">
              <span class="kpi-label">إجمالي الرسوم المستحقة للهيئة</span>
              <div class="kpi-val">${formatMoney(summary.total_supervision_due)} <span class="kpi-cur">د.ل</span></div>
              <div class="kpi-sub">وفق النسب المقررة قانوناً</div>
            </div>

            <div class="kpi-card success">
              <span class="kpi-label">إجمالي المبالغ المسددة والموردة</span>
              <div class="kpi-val">${formatMoney(summary.total_paid)} <span class="kpi-cur">د.ل</span></div>
              <div class="kpi-sub">عبر ${payments.length} سند توريد بنكي</div>
            </div>

            <div class="kpi-card ${netDue > 0 ? 'amber' : 'success'}">
              <span class="kpi-label">صافي الرصيد المتبقي للهيئة</span>
              <div class="kpi-val">${formatMoney(netDue)} <span class="kpi-cur">د.ل</span></div>
              <div class="kpi-sub">${netDue > 0 ? 'رصيد دائن مستحق السداد للهيئة' : 'حساب متوازن ومسدد بالكامل'}</div>
            </div>
          </div>

          <!-- شريط تفقيط المبلغ المتبقي -->
          <div class="tafqeet-box">
            <span class="tafqeet-label">المبلغ المتبقي كتابةً:</span>
            <span class="tafqeet-text">${tafqeetText}</span>
          </div>

          <!-- جدول 1: توزيع الرسوم حسب فروع التأمين -->
          <div class="section-title">
            <span>١. بيان الرسوم المستحقة موزعاً حسب فروع وأنواع التأمين</span>
            <span style="font-size:7.5pt; color:#64748b; font-weight:700;">عدد الفروع: ${categories.length}</span>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 4%;">م</th>
                <th style="width: 28%; text-align:right;">فرع / نوع التأمين</th>
                <th style="width: 14%;">عدد الوثائق الصادرة</th>
                <th style="width: 18%;">إجمالي الأقساط (د.ل)</th>
                <th style="width: 14%;">نسبة الرسم المقررة</th>
                <th style="width: 14%;">رسم الهيئة المستحق (د.ل)</th>
                <th style="width: 8%;">المساهمة</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRows}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" class="text-right" style="font-weight:900;">الإجمالي العام للرسوم المستحقة</td>
                <td class="num-cell">${summary.total_documents_count.toLocaleString()}</td>
                <td class="num-cell" style="color:#0369a1;">${formatMoney(summary.total_premiums)} د.ل</td>
                <td>—</td>
                <td class="num-cell" style="color:#dc2626;">${formatMoney(summary.total_supervision_due)} د.ل</td>
                <td>100%</td>
              </tr>
            </tfoot>
          </table>

          <!-- جدول 2: سندات السداد والتوريد -->
          <div class="section-title" style="margin-top: 14px;">
            <span>٢. بيان سندات التوريد والدفعات المسددة لحساب هيئة الإشراف</span>
            <span style="font-size:7.5pt; color:#64748b; font-weight:700;">إجمالي المسدد: ${formatMoney(totalPaymentsAmount)} د.ل</span>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 4%;">م</th>
                <th style="width: 16%;">رقم السند / الإشعار</th>
                <th style="width: 12%;">تاريخ السداد</th>
                <th style="width: 15%;">طريقة الدفع</th>
                <th style="width: 18%;">المصرف المسحوب عليه</th>
                <th style="width: 14%;">رقم الصك / الحوالة</th>
                <th style="width: 9%;">الفترة</th>
                <th style="width: 12%;">المبلغ المسدد (د.ل)</th>
              </tr>
            </thead>
            <tbody>
              ${paymentRows}
            </tbody>
            ${payments.length > 0 ? `
              <tfoot>
                <tr>
                  <td colspan="7" class="text-right">إجمالي التوريدات المسددة</td>
                  <td class="num-cell" style="color:#059669;">${formatMoney(totalPaymentsAmount)} د.ل</td>
                </tr>
              </tfoot>
            ` : ''}
          </table>

          <!-- صندوق المطابقة الحسابية الرسمية -->
          <div class="reconciliation-card">
            <div class="recon-step">
              <div class="recon-step-title">إجمالي الرسوم المستحقة</div>
              <div class="recon-step-val" style="color:#dc2626;">${formatMoney(summary.total_supervision_due)} د.ل</div>
            </div>
            <div class="recon-operator">−</div>
            <div class="recon-step">
              <div class="recon-step-title">إجمالي التوريدات المسددة</div>
              <div class="recon-step-val" style="color:#059669;">${formatMoney(summary.total_paid)} د.ل</div>
            </div>
            <div class="recon-operator">=</div>
            <div class="recon-step">
              <div class="recon-step-title">صافي الرصيد المستحق للهيئة</div>
              <div class="recon-step-val" style="color:#b45309; font-size:11pt;">${formatMoney(netDue)} د.ل</div>
            </div>
          </div>

          <!-- إقرار وتعهد نظامي -->
          <div class="legal-notice">
            <strong>إقرار رسمي:</strong> تشهد شركة المدار الليبي للتأمين (ش.م.ل) بأن البيانات المحاسبية والرقابية الواردة في هذا الكشف مستخرجة ومطابقة لسجلات المنظومة الإلكترونية وحسابات الاكتتاب الرسمية المعتمدة حتى تاريخ تحرير هذا الكشف، ومطابقة لأحكام قانون الإشراف والرقابة على التأمين ولائحته التنفيذية.
          </div>

          <!-- قسم التوقيعات والاعتماد الرسمي -->
          <div class="signatures-grid">
            <div class="sig-box">
              <span class="sig-role">إعداد وتجهيز</span>
              <div class="sig-line">محاسب هيئة الإشراف</div>
            </div>
            <div class="sig-box">
              <span class="sig-role">تدقيق ومراجعة</span>
              <div class="sig-line">رئيس قسم الحسابات العامة</div>
            </div>
            <div class="sig-box">
              <span class="sig-role">إدارة الشؤون المالية</span>
              <div class="sig-line">المدير المالي للشركة</div>
            </div>
            <div class="sig-box">
              <span class="sig-role">اعتماد الصرف / التقرير</span>
              <div class="sig-line">المدير العام / المفوض</div>
            </div>
            <div class="stamp-box">
              <span>الختم الرسمي</span>
              <span style="font-size:6pt; color:#64748b; margin-top:2px;">شركة المدار الليبي</span>
            </div>
          </div>
        </div>

        <!-- تذييل الورقة -->
        <div class="official-footer">
          <div class="footer-right">
            <span>شركة المدار الليبي للتأمين ش.م.ل — الإدارة العامة: طرابلس، ليبيا</span>
            <span>• هاتف: 021-3600000</span>
            <span>• بريد إلكتروني: info@mli.mli.ly</span>
          </div>
          <div class="footer-left">
            <span>صفحة 1 من 1</span>
          </div>
        </div>
      </div>

      <script>
        // تركيز الصفحة للطباعة
        window.onload = function() {
          setTimeout(function() {
            window.focus();
          }, 300);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. تقرير رسوم الوثائق التفصيلي (Detailed Policies Supervision Report)
// ══════════════════════════════════════════════════════════════════════════════
export function printSupervisionDetailedDocsReport(data: {
  docs: DetailedDocData[];
  aggregates?: { total_supervision_fee: number; total_premium: number };
  totalCount?: number;
  filters?: PrintFilters;
  currentUser?: any;
}): void {
  const { docs, aggregates, totalCount = docs.length, filters, currentUser } = data;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة من إعدادات المتصفح لطباعة التقرير.');
    return;
  }

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const refNo = `MLI/SUP-DOCS/${today.getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
  const userName = currentUser?.name || currentUser?.full_name || 'الشؤون المحاسبية';

  const typeText = filters?.typeLabel && filters.typeLabel !== 'all' ? `فرع: ${filters.typeLabel}` : 'كافة فروع التأمين';
  const periodText = filters?.fromDate && filters?.toDate ? `من ${filters.fromDate} إلى ${filters.toDate}` : 'جميع الفترات';

  const totalPrem = aggregates?.total_premium ?? docs.reduce((a, b) => a + (Number(b.premium ?? b.total_premium) || 0), 0);
  const totalFee = aggregates?.total_supervision_fee ?? docs.reduce((a, b) => a + (Number(b.supervision_fee) || 0), 0);

  const rowsHtml = docs.map((doc, idx) => {
    const policyNum = doc.policy_number || doc.document_number || '—';
    const typeLabel = doc.insurance_type_name || doc.type_label || '—';
    const client = doc.insured_name || doc.client_name || '—';
    const prem = doc.premium ?? doc.total_premium ?? 0;
    const fee = doc.supervision_fee ?? 0;
    const rate = doc.fee_rate ?? 0;

    return `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-family:monospace; font-weight:800; color:#091e3a;">${escapeHtml(policyNum)}</td>
        <td style="font-weight:700;">${escapeHtml(typeLabel)}</td>
        <td class="text-right" style="font-weight:700;">${escapeHtml(client)}</td>
        <td>${escapeHtml(doc.branch_name || 'الإدارة العامة')}</td>
        <td class="num-cell">${doc.issue_date?.split('T')[0] || '—'}</td>
        <td class="num-cell" style="color:#0369a1;">${formatMoney(prem)}</td>
        <td style="font-weight:800;">${rate}%</td>
        <td class="num-cell" style="font-weight:900; color:#dc2626;">${formatMoney(fee)}</td>
      </tr>
    `;
  }).join('');

  const qrData = `تقرير رسوم وثائق التأمين التفصيلي | العدد: ${totalCount} | إجمالي الرسوم: ${formatMoney(totalFee)} د.ل`;
  const qrUrl = getQrCodeUrl(qrData);

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>تقرير رسوم الوثائق التفصيلي — هيئة الإشراف على التأمين</title>
      <style>
        ${getCommonStyles()}
        @page { size: A4 landscape; margin: 8mm 8mm; }
        .sheet-wrapper { max-width: 290mm; min-height: 200mm; }
        .kpi-grid { grid-template-columns: repeat(3, 1fr); }
      </style>
    </head>
    <body>
      <div class="screen-toolbar">
        <div class="toolbar-title">
          <span>📋 تقرير رسوم وثائق التأمين التفصيلي — هيئة الإشراف على التأمين</span>
          <span class="toolbar-badge">${typeText}</span>
        </div>
        <div class="toolbar-actions">
          <button class="btn-action btn-print" onclick="window.print()">
            🖨️ طباعة التقرير التفصيلي (A4 أفقي)
          </button>
          <button class="btn-action btn-close" onclick="window.close()">
            ✕ إغلاق
          </button>
        </div>
      </div>

      <div class="sheet-wrapper">
        <div class="doc-outer-border"></div>
        <div class="doc-inner-border"></div>

        <div class="watermark-container">
          <img src="/img/logo.png" onerror="this.src='/img/official_logo.PNG'; this.onerror=null;" alt="Watermark" />
        </div>

        <div class="content-body">
          <div class="official-header">
            <div class="header-entity">
              <h1>دولة ليبيــــــــا</h1>
              <h2>شركة المدار الليبي للتأمين</h2>
              <p>الإدارة المالية — تقارير الوثائق الخاضعة لرسوم هيئة الإشراف</p>
            </div>

            <div class="header-logo-box">
              <img src="/img/logo.png" onerror="this.src='/img/official_logo.PNG'; this.onerror=null;" alt="المدار الليبي للتأمين" />
            </div>

            <div class="header-meta">
              <div class="meta-row">
                <span class="meta-label">الرقم الإشاري:</span>
                <span class="meta-value">${refNo}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">التاريخ:</span>
                <span class="meta-value">${dateStr}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">المستخرج:</span>
                <span class="meta-value" style="direction:rtl;">${escapeHtml(userName)}</span>
              </div>
              <div style="margin-top:2px;">
                <img src="${qrUrl}" style="width: 38px; height: 38px; border:1px solid #cbd5e1; border-radius:4px; padding:2px;" alt="QR" />
              </div>
            </div>
          </div>

          <div class="report-banner">
            <h2 class="report-title">تقرير رسوم وثائق التأمين الصادرة التفصيلي</h2>
            <p class="report-subtitle">
              حصر الوثائق المكتتبة ورسوم هيئة الإشراف المستحقة عنها — ${typeText} — ${periodText}
            </p>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card primary">
              <span class="kpi-label">عدد الوثائق الصادرة</span>
              <div class="kpi-val">${totalCount.toLocaleString()}</div>
              <div class="kpi-sub">وثيقة مسجلة بالمنظومة</div>
            </div>

            <div class="kpi-card primary">
              <span class="kpi-label">إجمالي الأقساط المكتتبة</span>
              <div class="kpi-val">${formatMoney(totalPrem)} <span class="kpi-cur">د.ل</span></div>
              <div class="kpi-sub">القيمة الخاضعة للرسم</div>
            </div>

            <div class="kpi-card danger">
              <span class="kpi-label">إجمالي رسم هيئة الإشراف</span>
              <div class="kpi-val">${formatMoney(totalFee)} <span class="kpi-cur">د.ل</span></div>
              <div class="kpi-sub">المستحق قانوناً للهيئة</div>
            </div>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 3%;">م</th>
                <th style="width: 14%;">رقم الوثيقة</th>
                <th style="width: 13%;">نوع التأمين</th>
                <th style="width: 22%; text-align:right;">اسم المؤمن له / العميل</th>
                <th style="width: 13%;">الفرع / الوكيل</th>
                <th style="width: 10%;">تاريخ الإصدار</th>
                <th style="width: 11%;">القسط المكتتب (د.ل)</th>
                <th style="width: 6%;">النسبة</th>
                <th style="width: 10%;">رسم الهيئة (د.ل)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="6" class="text-right">الإجمالي</td>
                <td class="num-cell" style="color:#0369a1;">${formatMoney(totalPrem)} د.ل</td>
                <td>—</td>
                <td class="num-cell" style="color:#dc2626;">${formatMoney(totalFee)} د.ل</td>
              </tr>
            </tfoot>
          </table>

          <div class="signatures-grid" style="grid-template-columns: repeat(3, 1fr) 110px;">
            <div class="sig-box">
              <span class="sig-role">إعداد / مدخل البيانات</span>
              <div class="sig-line">قسم الإصدار والعمليات</div>
            </div>
            <div class="sig-box">
              <span class="sig-role">مراجعة وتدقيق</span>
              <div class="sig-line">رئيس قسم الحسابات</div>
            </div>
            <div class="sig-box">
              <span class="sig-role">اعتماد الشؤون المالية</span>
              <div class="sig-line">المدير المالي</div>
            </div>
            <div class="stamp-box">
              <span>الختم الرسمي</span>
            </div>
          </div>
        </div>

        <div class="official-footer">
          <div class="footer-right">
            <span>شركة المدار الليبي للتأمين ش.م.ل — منظومة الرقابة المالية</span>
          </div>
          <div class="footer-left">
            <span>تاريخ الاستخراج: ${dateStr}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. سند توريد دفعة فردي (Single Payment Remittance Voucher Receipt)
// ══════════════════════════════════════════════════════════════════════════════
export function printSinglePaymentVoucher(payment: SupervisionPaymentData, currentUser?: any): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة لطباعة سند التوريد.');
    return;
  }

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const voucherNo = payment.voucher_number || `SUP-VOUCHER-${payment.id}`;
  const amountNum = parseFloat(payment.amount.toString()) || 0;
  const tafqeetText = tafqeetDinar(amountNum);
  const userName = currentUser?.name || currentUser?.full_name || 'أمين الخزينة / الحسابات';

  const qrData = `سند توريد لهيئة الإشراف | رقم: ${voucherNo} | المبلغ: ${formatMoney(amountNum)} د.ل | التاريخ: ${payment.payment_date?.split('T')[0]}`;
  const qrUrl = getQrCodeUrl(qrData);

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>سند توريد رسمي — هيئة الإشراف على التأمين (${voucherNo})</title>
      <style>
        ${getCommonStyles()}
        @page { size: A4 portrait; margin: 10mm 12mm; }
        .voucher-details-box {
          background: #f8fafc;
          border: 1.5px solid #091e3a;
          border-radius: 8px;
          padding: 18px 24px;
          margin-bottom: 20px;
        }
        .v-row {
          display: flex;
          align-items: center;
          padding: 9px 0;
          border-bottom: 1px dashed #cbd5e1;
          font-size: 9.5pt;
        }
        .v-row:last-child { border-bottom: none; }
        .v-label {
          width: 25%;
          font-weight: 800;
          color: #091e3a;
        }
        .v-value {
          width: 75%;
          font-weight: 700;
          color: #1e293b;
        }
        .v-amount-banner {
          background: #f0fdf4;
          border: 2px solid #10b981;
          border-radius: 8px;
          padding: 14px;
          text-align: center;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="screen-toolbar">
        <div class="toolbar-title">
          <span>🧾 سند توريد دفعة رسمي — هيئة الإشراف على التأمين</span>
          <span class="toolbar-badge">سند رقم: ${voucherNo}</span>
        </div>
        <div class="toolbar-actions">
          <button class="btn-action btn-print" onclick="window.print()">
            🖨️ طباعة سند التوريد
          </button>
          <button class="btn-action btn-close" onclick="window.close()">
            ✕ إغلاق
          </button>
        </div>
      </div>

      <div class="sheet-wrapper" style="min-height: auto; padding-bottom: 20mm;">
        <div class="doc-outer-border"></div>
        <div class="doc-inner-border"></div>

        <div class="watermark-container">
          <img src="/img/logo.png" onerror="this.src='/img/official_logo.PNG'; this.onerror=null;" alt="Watermark" />
        </div>

        <div class="content-body">
          <div class="official-header">
            <div class="header-entity">
              <h1>دولة ليبيــــــــا</h1>
              <h2>شركة المدار الليبي للتأمين</h2>
              <p>الإدارة العامة للشؤون المالية والمحاسبية</p>
              <p>قسم متابعة وسداد رسوم هيئة الإشراف</p>
            </div>

            <div class="header-logo-box">
              <img src="/img/logo.png" onerror="this.src='/img/official_logo.PNG'; this.onerror=null;" alt="المدار الليبي للتأمين" />
            </div>

            <div class="header-meta">
              <div class="meta-row">
                <span class="meta-label">رقم السند:</span>
                <span class="meta-value" style="color:#b91c1c; font-size:9.5pt;">${voucherNo}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">تاريخ السند:</span>
                <span class="meta-value">${payment.payment_date?.split('T')[0] || dateStr}</span>
              </div>
              <div style="margin-top:4px;">
                <img src="${qrUrl}" style="width: 44px; height: 44px; border:1px solid #cbd5e1; border-radius:4px; padding:2px;" alt="QR" />
              </div>
            </div>
          </div>

          <div class="report-banner">
            <h2 class="report-title">سند توريد وإشعار سداد رسمي</h2>
            <p class="report-subtitle">
              حساب هيئة الإشراف والرقابة على التأمين — وزارة الاقتصاد والتجارة
            </p>
          </div>

          <div class="v-amount-banner">
            <span style="font-size: 9pt; color:#166534; font-weight:700; display:block; margin-bottom:4px;">المبلغ المورد والمسدد</span>
            <span style="font-size: 20pt; font-weight:900; color:#15803d; direction:ltr; display:inline-block;">${formatMoney(amountNum)}</span>
            <span style="font-size: 11pt; font-weight:800; color:#15803d; margin-right:6px;">دينار ليبي</span>
          </div>

          <div class="tafqeet-box" style="margin-bottom:20px;">
            <span class="tafqeet-label">المبلغ كتابةً:</span>
            <span class="tafqeet-text">${tafqeetText}</span>
          </div>

          <div class="voucher-details-box">
            <div class="v-row">
              <div class="v-label">المستفيد:</div>
              <div class="v-value" style="color:#091e3a; font-weight:800;">هيئة الإشراف على التأمين (حساب رسوم الرقابة والإشراف)</div>
            </div>

            <div class="v-row">
              <div class="v-label">طريقة السداد:</div>
              <div class="v-value">${getMethodLabel(payment.payment_method)}</div>
            </div>

            <div class="v-row">
              <div class="v-label">المصرف المسحوب عليه:</div>
              <div class="v-value">${escapeHtml(payment.bank_name || '—')}</div>
            </div>

            <div class="v-row">
              <div class="v-label">رقم الصك / الحوالة:</div>
              <div class="v-value" style="font-family:monospace; font-weight:800;">${escapeHtml(payment.check_number || '—')}</div>
            </div>

            <div class="v-row">
              <div class="v-label">الفترة التأمينية المشمولة:</div>
              <div class="v-value">
                ${payment.period_from && payment.period_to ? `من تاريخ ${payment.period_from.split('T')[0]} إلى تاريخ ${payment.period_to.split('T')[0]}` : 'عن الدفعة الدورية المستحقة'}
              </div>
            </div>

            <div class="v-row">
              <div class="v-label">البيان والملاحظات:</div>
              <div class="v-value">${escapeHtml(payment.notes || 'سداد رسوم هيئة الإشراف المقررة قانوناً عن عمليات التأمين')}</div>
            </div>

            <div class="v-row">
              <div class="v-label">الموظف المحرر:</div>
              <div class="v-value">${escapeHtml(userName)}</div>
            </div>
          </div>

          <div class="legal-notice">
            يُعد هذا السند إشعاراً رسمياً بسداد المبلغ المذكور لصالح هيئة الإشراف على التأمين، وتم قيده في السجلات المحاسبية لشركة المدار الليبي للتأمين بموجب إيصال الإيداع / الصك المصرفي المرفق.
          </div>

          <div class="signatures-grid" style="grid-template-columns: repeat(3, 1fr) 110px; margin-top:24px;">
            <div class="sig-box">
              <span class="sig-role">أمين الخزينة / المحاسب</span>
              <div class="sig-line">التوقيع</div>
            </div>
            <div class="sig-box">
              <span class="sig-role">المراجع المالي</span>
              <div class="sig-line">التوقيع</div>
            </div>
            <div class="sig-box">
              <span class="sig-role">اعتماد الإدارة المالية</span>
              <div class="sig-line">المدير المالي</div>
            </div>
            <div class="stamp-box">
              <span>الختم الرسمي</span>
              <span style="font-size:6pt; color:#64748b;">خاتم الصرف</span>
            </div>
          </div>
        </div>

        <div class="official-footer" style="margin-top:20px;">
          <div class="footer-right">
            <span>شركة المدار الليبي للتأمين — سند توريد مالي معتمد</span>
          </div>
          <div class="footer-left">
            <span>تاريخ الطباعة: ${dateStr}</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
