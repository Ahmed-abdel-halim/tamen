// src/utils/printClaimsDetailedReport.ts

export interface ExchangeRates {
  usd_to_lyd: number;
  tnd_to_lyd: number;
  eur_to_lyd?: number;
}

export interface PrintClaimsOptions {
  rates: ExchangeRates;
  dateText?: string;
  statusText?: string;
  yearText?: string;
  currentUser?: any;
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
  if (num === null || num === undefined || num === '') return '—';
  const val = Number(num);
  if (isNaN(val) || val === 0) return '0.00';
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const cleanStr = String(dateStr).replace(' ', 'T');
    const d = new Date(cleanStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB');
  } catch {
    return dateStr;
  }
}

export function printClaimsDetailedReport(claims: any[], options: PrintClaimsOptions): void {
  const { rates, dateText = 'كل التواريخ', statusText = 'كل الحالات', yearText, currentUser } = options;

  const usdRate = rates?.usd_to_lyd > 0 ? Number(rates.usd_to_lyd) : 7.15;
  const tndRate = rates?.tnd_to_lyd > 0 ? Number(rates.tnd_to_lyd) : 2.30;
  const eurRate = rates?.eur_to_lyd && Number(rates.eur_to_lyd) > 0 ? Number(rates.eur_to_lyd) : 7.65;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة لطباعة التقرير');
    return;
  }

  const documentTypeLabelMap: Record<string, string> = {
    'InsuranceDocument': 'سيارات محلي',
    'InternationalInsuranceDocument': 'سيارات دولي',
    'TravelInsuranceDocument': 'مسافرين',
    'ResidentInsuranceDocument': 'وافدين مقيمين',
    'MarineStructureInsuranceDocument': 'هياكل بحرية',
    'ProfessionalLiabilityInsuranceDocument': 'مسؤولية مهنية',
    'PersonalAccidentInsuranceDocument': 'حوادث شخصية',
    'SchoolStudentInsuranceDocument': 'طلاب مدارس',
    'CashInTransitInsuranceDocument': 'نقل نقدية',
    'CargoInsuranceDocument': 'شحن بضائع'
  };

  const getStatusLabel = (status: string) => {
    const statuses: Record<string, string> = {
      pending: 'قيد الانتظار',
      'تسويه وديه': 'تسوية ودية',
      'تحويل الى مركز الشرطة': 'مركز الشرطة',
      'تحويل الى النيابة': 'النيابة',
      'تحويل الى المحكمة': 'المحكمة',
      'استئناف في حكم المحكمة': 'استئناف',
      'للتسديد - الشؤون المالية': 'للتسديد',
      'التعويضات': 'بالتعويضات',
      'مدفوع': 'مدفوع'
    };
    return statuses[status] || status || 'غير محدد';
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'مدفوع') return 'badge-paid';
    if (status === 'تسويه وديه') return 'badge-settled';
    if (status === 'للتسديد - الشؤون المالية' || status === 'التعويضات') return 'badge-finance';
    if (status === 'pending') return 'badge-pending';
    return 'badge-other';
  };

  // Process and compute values dynamically
  let totalReserveLYD = 0;
  let totalSettlementLYD = 0;
  let totalLastSettlementLYD = 0;
  let claimsWithForeignCount = 0;
  let claimsWithSettlementForeignCount = 0;

  const processedRows = claims.map((claim, idx) => {
    let foreignAmountStr = '—';
    let appliedRate = 1.0;
    let rateLabel = '—';
    let reserveLYD = 0;

    // Check foreign currency in assessor_amount_dollar or assessor_other_amount
    if (claim.assessor_amount_dollar && Number(claim.assessor_amount_dollar) > 0) {
      const dollarVal = Number(claim.assessor_amount_dollar);
      foreignAmountStr = `${dollarVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} $`;
      appliedRate = usdRate;
      rateLabel = `${usdRate.toFixed(2)}`;
      reserveLYD = dollarVal * appliedRate;
      claimsWithForeignCount++;
    } else if (claim.assessor_other_amount) {
      const match = String(claim.assessor_other_amount).match(/^([\d.]+)\s*(.*)$/);
      if (match) {
        const amt = parseFloat(match[1]) || 0;
        const curr = match[2]?.trim() || '';
        if (curr.includes('تونس') || curr.toUpperCase().includes('TND')) {
          foreignAmountStr = `${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ت`;
          appliedRate = tndRate;
          rateLabel = `${tndRate.toFixed(2)}`;
          reserveLYD = amt * appliedRate;
          claimsWithForeignCount++;
        } else if (curr.includes('يورو') || curr.toUpperCase().includes('EUR')) {
          foreignAmountStr = `${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} €`;
          appliedRate = eurRate;
          rateLabel = `${eurRate.toFixed(2)}`;
          reserveLYD = amt * appliedRate;
          claimsWithForeignCount++;
        } else if (curr.includes('دولار') || curr.toUpperCase().includes('USD')) {
          foreignAmountStr = `${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} $`;
          appliedRate = usdRate;
          rateLabel = `${usdRate.toFixed(2)}`;
          reserveLYD = amt * appliedRate;
          claimsWithForeignCount++;
        } else {
          foreignAmountStr = `${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${curr}`;
          appliedRate = 1;
          rateLabel = '1.00';
          reserveLYD = amt;
        }
      } else {
        foreignAmountStr = claim.assessor_other_amount;
        reserveLYD = Number(claim.assessor_amount_dinar) || 0;
      }
    } else if (claim.assessor_amount_dinar) {
      reserveLYD = Number(claim.assessor_amount_dinar) || 0;
      appliedRate = 1;
      rateLabel = '1.00';
    }

    totalReserveLYD += reserveLYD;

    // Settlement amount
    let settlementLYD = 0;
    const allSettlementTransfers = (claim.transfers || []).filter((t: any) => t.transfer_type === 'تسويه وديه');
    const latestSettlement = allSettlementTransfers[allSettlementTransfers.length - 1];
    const paymentTransfer = (claim.transfers || []).slice().reverse().find((t: any) => t.transfer_type === 'للتسديد - الشؤون المالية');

    const isTnd = Boolean(
      (claim.assessor_other_amount && /تونس|tnd/i.test(claim.assessor_other_amount)) ||
      latestSettlement?.details?.tnd_amount ||
      (latestSettlement?.details?.manager_report && /تونسي|تونس/i.test(latestSettlement.details.manager_report)) ||
      claim.document_type === 'InternationalInsuranceDocument'
    );

    let lastSettlementForeignStr = '—';
    let settlementRateLabel = '—';
    let lastSettlementLYD = 0;

    if (latestSettlement) {
      const details = latestSettlement.details || {};

      // ─── أولوية الحساب (من الأعلى إلى الأدنى) ───────────────────────────
      // 1️⃣ lyd_amount مُدخَل يدوياً وقت التسوية → يحمل السعر الحقيقي (يحل البيانات القديمة)
      // 2️⃣ tnd_rate مثبَّت محفوظ مع التسوية الجديدة → tnd_amount × tnd_rate_مثبَّت
      // 3️⃣ احتياط أخير → tnd_amount × سعر التقرير الحالي
      // ─────────────────────────────────────────────────────────────────────

      const manualLyd = parseFloat(details.lyd_amount) || 0;
      const rawTnd    = details.tnd_amount || '';
      const tndVal    = parseFloat(rawTnd) || 0;
      const rawUsd    = details.usd_amount || '';
      const usdVal    = parseFloat(rawUsd) || 0;

      // السعر المثبَّت (محفوظ وقت التسوية) أو السعر الحالي كاحتياط
      const lockedTndRate = details.tnd_rate ? Number(details.tnd_rate) : tndRate;
      const lockedUsdRate = details.usd_rate ? Number(details.usd_rate) : usdRate;

      if (isTnd && tndVal > 0) {
        // عملة تونسية — أظهر المبلغ الأجنبي
        lastSettlementForeignStr = `${tndVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ت`;
        claimsWithSettlementForeignCount++;

        if (manualLyd > 0) {
          // ✅ الأفضل: استخدم lyd_amount المُدخَل يدوياً — ثابت ودقيق للبيانات القديمة والجديدة
          lastSettlementLYD = manualLyd;
          // احسب السعر المستخدم فعلياً لعرضه (للمعلومية فقط)
          const impliedRate = tndVal > 0 ? manualLyd / tndVal : lockedTndRate;
          settlementRateLabel = impliedRate.toFixed(2);
        } else {
          // استخدم السعر المثبَّت أو الحالي إذا لم يُدخَل lyd_amount
          lastSettlementLYD = tndVal * lockedTndRate;
          settlementRateLabel = lockedTndRate.toFixed(2);
        }

      } else if (!isTnd && usdVal > 0) {
        // عملة دولار
        lastSettlementForeignStr = `${usdVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} $`;
        claimsWithSettlementForeignCount++;

        if (manualLyd > 0) {
          lastSettlementLYD = manualLyd;
          const impliedRate = usdVal > 0 ? manualLyd / usdVal : lockedUsdRate;
          settlementRateLabel = impliedRate.toFixed(2);
        } else {
          lastSettlementLYD = usdVal * lockedUsdRate;
          settlementRateLabel = lockedUsdRate.toFixed(2);
        }

      } else if (manualLyd > 0) {
        // دينار ليبي مباشرة
        lastSettlementLYD = manualLyd;
        settlementRateLabel = '1.00';

      } else if (details.total_value) {
        const totalVal = parseFloat(details.total_value) || 0;
        if (totalVal > 0) {
          lastSettlementLYD = isTnd ? totalVal * lockedTndRate : totalVal;
          settlementRateLabel = isTnd ? lockedTndRate.toFixed(2) : '1.00';
        }
      }
    }

    totalLastSettlementLYD += lastSettlementLYD;

    // Compute paid / settlement amount in LYD
    if (claim.status === 'مدفوع') {
      if (claim.currency === 'TND' && claim.total_paid) {
        settlementLYD = Number(claim.total_paid) * tndRate;
      } else if (claim.total_paid && Number(claim.total_paid) > 0) {
        settlementLYD = Number(claim.total_paid);
      } else if (lastSettlementLYD > 0) {
        settlementLYD = lastSettlementLYD;
      }
    } else if (claim.status === 'للتسديد - الشؤون المالية') {
      const rawComp = claim.compensation_value ?? paymentTransfer?.details?.compensation_value;
      const rawAdd = claim.additional_expenses ?? paymentTransfer?.details?.additional_expenses;
      const rawTot = claim.total_paid ?? paymentTransfer?.details?.financial_value;

      let candidate = 0;
      if (rawTot && Number(rawTot) > 0) {
        candidate = Number(rawTot);
      } else if (rawComp && Number(rawComp) > 0) {
        candidate = Number(rawComp) + (Number(rawAdd) || 0);
      }

      const rawTndNum = parseFloat(latestSettlement?.details?.tnd_amount || latestSettlement?.details?.total_value) || 0;
      if (isTnd && candidate > 0 && Math.abs(candidate - rawTndNum) < 0.05) {
        settlementLYD = candidate * tndRate;
      } else if (candidate > 0) {
        settlementLYD = candidate;
      } else if (lastSettlementLYD > 0) {
        settlementLYD = lastSettlementLYD;
      }
    } else if (claim.compensation_value && Number(claim.compensation_value) > 0) {
      settlementLYD = Number(claim.compensation_value) + (Number(claim.additional_expenses) || 0);
    }

    totalSettlementLYD += settlementLYD;

    const docTypeLabel = documentTypeLabelMap[claim.document_type] || claim.document_manual_data?.insurance_type || claim.document_type || '—';
    const policyNum = claim.document?.insurance_number || claim.document_manual_data?.insurance_number || (claim.additional_documents && claim.additional_documents[0]?.insurance_number) || '—';
    const insuredName = claim.document?.insured_name || claim.document_manual_data?.insured_name || (claim.additional_documents && claim.additional_documents[0]?.insured_name) || '—';
    const damages = claim.damage_type ? claim.damage_type.split(/[,،]\s*/).map((t: string) => t === 'اخر' ? (claim.other_damage_type || 'أخرى') : t).join('، ') : '—';
    const accTypeAndLoc = `${claim.accident_type || 'غير محدد'}${claim.accident_location ? ` — ${claim.accident_location}` : ''}`;

    return {
      index: idx + 1,
      claimNumber: claim.claim_number || '—',
      claimDate: formatDate(claim.claim_date),
      claimantName: claim.claimant_name || '—',
      accidentDate: formatDate(claim.accident_date),
      accidentTypeAndLoc: accTypeAndLoc,
      damages,
      docTypeLabel,
      policyNum,
      insuredName,
      foreignAmountStr,
      rateLabel,
      reserveLYD,
      settlementLYD,
      statusLabel: getStatusLabel(claim.status),
      statusBadge: getStatusBadgeClass(claim.status),
      paymentMethod: claim.payment_method || paymentTransfer?.details?.payment_method || (claim.status === 'مدفوع' || claim.status === 'للتسديد - الشؤون المالية' ? 'معتمد' : (settlementLYD > 0 ? 'معتمد' : '—')),
      lastSettlementForeignStr,
      settlementRateLabel,
      lastSettlementLYD
    };
  });

  const remainingBalanceLYD = Math.max(0, totalReserveLYD - totalSettlementLYD);
  const totalClaimsCount = claims.length;

  const qrData = `تقرير المطالبات المالي والتفصيلي\nشركة المدار الليبي للتأمين\nالتاريخ: ${new Date().toLocaleString('en-GB')}\nعدد المطالبات: ${totalClaimsCount}\nإجمالي الاحتياطي: ${totalReserveLYD.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل\nسعر الدولار: ${usdRate} | سعر التونسي: ${tndRate}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${encodeURIComponent(qrData)}`;

  const periodDisplay = yearText ? `سنة الحوادث: ${yearText}` : dateText;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>تقرير المطالبات التفصيلي — شركة المدار الليبي للتأمين</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        @page {
          size: A4 landscape;
          margin: 5mm 6mm;
        }

        html, body {
          margin: 0;
          padding: 0;
          background: #f1f5f9;
          font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          direction: rtl;
          color: #0f172a;
          font-size: 7.6pt;
          line-height: 1.25;
          -webkit-font-smoothing: antialiased;
        }

        /* Screen Wrapper & Toolbar */
        .screen-toolbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: #0f172a;
          color: #ffffff;
          padding: 8px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.25);
          font-size: 13px;
        }

        .toolbar-title {
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #38bdf8;
        }

        .toolbar-rates {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #1e293b;
          padding: 4px 12px;
          border-radius: 6px;
          border: 1px solid #334155;
          font-size: 12px;
        }

        .toolbar-actions {
          display: flex;
          gap: 10px;
        }

        .btn-action {
          padding: 6px 16px;
          border-radius: 6px;
          font-family: inherit;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .btn-print {
          background: #0284c7;
          color: #fff;
        }
        .btn-print:hover { background: #0369a1; }

        .btn-close {
          background: #475569;
          color: #fff;
        }
        .btn-close:hover { background: #334155; }

        /* Report Paper Sheet */
        .report-sheet {
          max-width: 297mm;
          margin: 12px auto;
          background: #ffffff;
          padding: 5mm 6mm;
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          border-radius: 4px;
        }

        /* Official Header */
        .official-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 6px;
          margin-bottom: 6px;
        }

        .header-logo-box {
          width: 140px;
          display: flex;
          align-items: center;
        }
        .header-logo-box img {
          max-height: 48px;
          width: auto;
          object-fit: contain;
        }

        .header-title-box {
          text-align: center;
          flex: 1;
        }
        .header-title-box h1 {
          margin: 0;
          font-size: 15px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.3px;
        }
        .header-title-box h2 {
          margin: 2px 0 0 0;
          font-size: 11px;
          font-weight: 700;
          color: #0284c7;
        }
        .header-title-box .header-desc {
          font-size: 8pt;
          color: #64748b;
          font-weight: 600;
          margin-top: 1px;
        }

        .header-qr-box {
          width: 140px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }
        .header-qr-box img {
          width: 50px;
          height: 50px;
          border: 1px solid #cbd5e1;
          padding: 2px;
          border-radius: 4px;
          background: #fff;
        }

        /* Executive Metadata Strip */
        .meta-strip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 4px 10px;
          margin-bottom: 6px;
          font-size: 7.3pt;
          color: #334155;
        }

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .meta-label {
          font-weight: 600;
          color: #64748b;
        }
        .meta-value {
          font-weight: 800;
          color: #0f172a;
        }

        .exchange-rates-badge {
          background: #ecfeff;
          border: 1px solid #a5f3fc;
          color: #0e7490;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 800;
          display: flex;
          gap: 8px;
        }

        /* Main Table Styling */
        table.claims-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin-bottom: 6px;
          background: #ffffff;
        }

        table.claims-table th, 
        table.claims-table td {
          border: 1px solid #cbd5e1;
          padding: 3px 3.5px;
          text-align: center;
          vertical-align: middle;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        /* Category Headers */
        table.claims-table thead tr:first-child th {
          background: #1e293b;
          color: #ffffff;
          font-weight: 800;
          font-size: 7.5pt;
          padding: 3.5px 2px;
          border-color: #334155;
        }

        table.claims-table thead tr:first-child th.group-claim {
          background: #1e293b;
        }
        table.claims-table thead tr:first-child th.group-accident {
          background: #0f172a;
        }
        table.claims-table thead tr:first-child th.group-policy {
          background: #1e293b;
        }
        table.claims-table thead tr:first-child th.group-finance {
          background: #0369a1;
        }
        table.claims-table thead tr:first-child th.group-settlement {
          background: #047857;
        }

        table.claims-table thead tr:nth-child(2) th {
          background: #334155;
          color: #f8fafc;
          font-weight: 700;
          font-size: 7pt;
          padding: 2.5px 2px;
          border-color: #475569;
        }

        /* Data Rows */
        table.claims-table tbody tr:nth-child(even) {
          background-color: #f8fafc;
        }
        table.claims-table tbody tr:hover {
          background-color: #f1f5f9;
        }

        table.claims-table tbody td {
          font-size: 7pt;
          color: #1e293b;
          line-height: 1.2;
        }

        .col-claim-num {
          font-weight: 800;
          color: #0284c7;
          direction: ltr;
        }

        .col-name {
          font-weight: 700;
          text-align: right !important;
          padding-right: 5px !important;
        }

        .col-money {
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          direction: ltr;
          text-align: center;
        }

        .col-foreign-money {
          color: #0369a1;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }

        .col-lyd-reserve {
          color: #0f172a;
          font-weight: 800;
          background: #f0fdf4;
        }

        .col-settlement {
          color: #15803d;
          font-weight: 800;
          background: #f0fdf4;
        }

        /* Status Badges */
        .status-pill {
          display: inline-block;
          padding: 1px 4px;
          border-radius: 4px;
          font-weight: 800;
          font-size: 6.5pt;
          line-height: 1.2;
          white-space: nowrap;
        }
        .badge-paid { background: #dcfce7; color: #166534; border: 0.5px solid #86efac; }
        .badge-settled { background: #e0f2fe; color: #0369a1; border: 0.5px solid #7dd3fc; }
        .badge-finance { background: #fef3c7; color: #92400e; border: 0.5px solid #fde68a; }
        .badge-pending { background: #f1f5f9; color: #475569; border: 0.5px solid #cbd5e1; }
        .badge-other { background: #f3e8ff; color: #6b21a8; border: 0.5px solid #d8b4fe; }

        /* Totals Row */
        table.claims-table tfoot tr td {
          background: #0f172a !important;
          color: #ffffff !important;
          font-weight: 900;
          font-size: 7.6pt;
          padding: 4px 3px;
          border-color: #0f172a;
        }
        table.claims-table tfoot .total-label {
          text-align: center;
          letter-spacing: 0.3px;
        }
        table.claims-table tfoot .total-val {
          color: #38bdf8 !important;
          font-size: 8pt;
          font-variant-numeric: tabular-nums;
        }
        table.claims-table tfoot .total-paid {
          color: #4ade80 !important;
          font-size: 8pt;
          font-variant-numeric: tabular-nums;
        }

        /* Executive KPI Summary Cards */
        .kpi-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin-top: 6px;
          margin-bottom: 10px;
        }

        .kpi-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 5px 8px;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .kpi-title {
          font-size: 7pt;
          font-weight: 700;
          color: #64748b;
        }

        .kpi-amount {
          font-size: 10.5pt;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
          color: #0f172a;
        }
        .kpi-amount.primary { color: #0284c7; }
        .kpi-amount.success { color: #16a34a; }
        .kpi-amount.warning { color: #d97706; }

        .kpi-subtitle {
          font-size: 6.2pt;
          color: #94a3b8;
          font-weight: 600;
        }

        /* Signatures Section */
        .signatures-container {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 10px;
          padding: 0 10px;
        }

        .sig-block {
          text-align: center;
          width: 170px;
        }
        .sig-role {
          font-size: 7.5pt;
          font-weight: 700;
          color: #475569;
          margin-bottom: 22px;
        }
        .sig-name {
          font-size: 8pt;
          font-weight: 900;
          color: #0f172a;
          border-top: 1px dashed #94a3b8;
          padding-top: 3px;
        }

        .company-stamp-box {
          border: 1.5px dashed #cbd5e1;
          width: 110px;
          height: 60px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 6.8pt;
          font-weight: 700;
          color: #94a3b8;
          text-align: center;
        }

        /* Footer Meta */
        .official-footer {
          margin-top: 6px;
          padding-top: 4px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 6.5pt;
          color: #94a3b8;
          font-weight: 600;
        }

        /* Print Media Queries */
        @media print {
          body {
            background: #ffffff !important;
            padding: 0 !important;
          }
          .screen-toolbar {
            display: none !important;
          }
          .report-sheet {
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
            border-radius: 0 !important;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>

      <!-- Screen Preview Control Toolbar -->
      <div class="screen-toolbar">
        <div class="toolbar-title">
          <span>🏛️ معاينة تقرير المطالبات والحوادث الرسمي</span>
          <span style="color: #94a3b8; font-weight: 500; font-size: 11px;">(جاهز للطباعة بدقة عالية A4 Landscape)</span>
        </div>

        <div class="toolbar-rates">
          <span>💱 <strong>أسعار الصرف المعتمدة بالتقرير:</strong></span>
          <span>1 USD = <strong style="color: #38bdf8;">${usdRate.toFixed(2)} د.ل</strong></span>
          <span>|</span>
          <span>1 TND = <strong style="color: #38bdf8;">${tndRate.toFixed(2)} د.ل</strong></span>
        </div>

        <div class="toolbar-actions">
          <button class="btn-action btn-print" onclick="window.print()">
            <span>🖨️ طباعة التقرير</span>
          </button>
          <button class="btn-action btn-close" onclick="window.close()">
            <span>✕ إغلاق</span>
          </button>
        </div>
      </div>

      <!-- Printable Report Paper -->
      <div class="report-sheet">

        <!-- Header -->
        <div class="official-header">
          <div class="header-logo-box">
            <img src="/img/logo.png" alt="المدار الليبي للتأمين" onerror="this.src='/img/official_logo.PNG'; this.onerror=null;" />
          </div>

          <div class="header-title-box">
            <h1>شركة المدار الليبي للتأمين المساهمة</h1>
            <h2>إدارة المطالبات والتعويضات — تقرير الحوادث والمطالبات التفصيلي</h2>
            <div class="header-desc">تقرير رسمي معتمد يتضمن تقييم الأضرار، الاحتياطيات المرصودة وفق أسعار الصرف اللحظية، وبيانات السداد</div>
          </div>

          <div class="header-qr-box">
            <img src="${qrApiUrl}" alt="رمز التحقق QR" />
          </div>
        </div>

        <!-- Meta Strip -->
        <div class="meta-strip">
          <div class="meta-item">
            <span class="meta-label">تاريخ الاستخراج:</span>
            <span class="meta-value">${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">نطاق التقرير:</span>
            <span class="meta-value">${escapeHtml(periodDisplay)}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">حالة المطالبات:</span>
            <span class="meta-value">${escapeHtml(statusText)}</span>
          </div>

          <div class="meta-item">
            <span class="meta-label">عدد الملفات:</span>
            <span class="meta-value" style="color: #0284c7;">${totalClaimsCount} مطالبة</span>
          </div>

          <div class="exchange-rates-badge">
            <span>سعر الصرف المطبق:</span>
            <span>1 USD = ${usdRate.toFixed(2)} د.ل</span>
            <span>|</span>
            <span>1 TND = ${tndRate.toFixed(2)} د.ل</span>
          </div>
        </div>

        <!-- Claims Table -->
        <table class="claims-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 22px;">م</th>
              <th colspan="3" class="group-claim">بيانات المطالبة</th>
              <th colspan="3" class="group-accident">بيانات الحادث والأضرار</th>
              <th colspan="3" class="group-policy">بيانات الوثيقة والمؤمن له</th>
              <th colspan="3" class="group-finance">التقييم والاحتياطي المرصود</th>
              <th colspan="5" class="group-settlement">التسوية والسداد</th>
              <th rowspan="2" style="width: 58px; background: #0f172a; border-color: #334155;">الحالة</th>
            </tr>
            <tr>
              <th style="width: 56px;">تاريخها</th>
              <th style="width: 90px;">مقدم المطالبة</th>
              <th style="width: 72px;">رقم المطالبة</th>
              
              <th style="width: 56px;">تاريخ الحادث</th>
              <th style="width: 95px;">نوعه ومكانه</th>
              <th style="width: 70px;">نوع الأضرار</th>

              <th style="width: 65px;">نوع الوثيقة</th>
              <th style="width: 72px;">رقم الوثيقة</th>
              <th style="width: 90px;">المؤمن له</th>

              <th style="width: 72px;">المرصود (أجنبي)</th>
              <th style="width: 38px;">سعر التحويل</th>
              <th style="width: 76px;">المرصود (د.ل)</th>

              <th style="width: 72px;">آخر تسوية (أجنبي)</th>
              <th style="width: 38px;">سعر التحويل</th>
              <th style="width: 76px;">آخر تسوية (د.ل)</th>
              <th style="width: 72px;">المسدد (د.ل)</th>
              <th style="width: 58px;">طريقة السداد</th>
            </tr>
          </thead>
          <tbody>
            ${processedRows.length === 0 ? `
              <tr>
                <td colspan="19" style="padding: 25px; color: #64748b; font-size: 9pt; font-weight: 700;">
                  لا توجد مطالبات مسجلة مطابقة لخيارات التصفية المحددة.
                </td>
              </tr>
            ` : processedRows.map(row => `
              <tr>
                <td style="font-weight: 700; color: #64748b;">${row.index}</td>
                <td>${row.claimDate}</td>
                <td class="col-name" title="${escapeHtml(row.claimantName)}">${escapeHtml(row.claimantName)}</td>
                <td class="col-claim-num">${escapeHtml(row.claimNumber)}</td>
                
                <td>${row.accidentDate}</td>
                <td style="text-align: right; font-size: 6.8pt;">${escapeHtml(row.accidentTypeAndLoc)}</td>
                <td style="font-size: 6.8pt;">${escapeHtml(row.damages)}</td>

                <td style="font-size: 6.8pt;">${escapeHtml(row.docTypeLabel)}</td>
                <td style="font-weight: 700; font-size: 6.8pt; direction: ltr;">${escapeHtml(row.policyNum)}</td>
                <td class="col-name" style="font-size: 6.8pt;" title="${escapeHtml(row.insuredName)}">${escapeHtml(row.insuredName)}</td>

                <td class="col-foreign-money">${escapeHtml(row.foreignAmountStr)}</td>
                <td style="color: #64748b; font-weight: 700; font-size: 6.8pt;">${row.rateLabel}</td>
                <td class="col-lyd-reserve">${formatMoney(row.reserveLYD)}</td>

                <td class="col-foreign-money" style="color: #0369a1;">${escapeHtml(row.lastSettlementForeignStr)}</td>
                <td style="color: #64748b; font-weight: 700; font-size: 6.8pt;">${row.settlementRateLabel}</td>
                <td class="col-settlement" style="color: #065f46;">${row.lastSettlementLYD > 0 ? formatMoney(row.lastSettlementLYD) : '—'}</td>
                <td class="col-settlement">${row.settlementLYD > 0 ? formatMoney(row.settlementLYD) : '—'}</td>
                <td style="font-size: 6.8pt; color: #475569;">${escapeHtml(row.paymentMethod)}</td>

                <td>
                  <span class="status-pill ${row.statusBadge}">${escapeHtml(row.statusLabel)}</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="10" class="total-label">
                الإجمــــــــــــــــــــــــــــــــــــــــــــــــــــــــالي العــــــــــــــــــــــــــــــــــــــــــــــــــــــــام (محسوب وفق أسعار الصرف المعتمدة أعلاه)
              </td>
              <td style="font-size: 7pt; color: #cbd5e1;">${claimsWithForeignCount} عملة أجنبية</td>
              <td style="color: #cbd5e1; font-size: 7pt;">—</td>
              <td class="total-val">${formatMoney(totalReserveLYD)} د.ل</td>
              <td style="font-size: 7pt; color: #cbd5e1;">${claimsWithSettlementForeignCount > 0 ? `${claimsWithSettlementForeignCount} عملة أجنبية` : '—'}</td>
              <td style="color: #cbd5e1; font-size: 7pt;">—</td>
              <td class="total-val" style="color: #38bdf8 !important;">${formatMoney(totalLastSettlementLYD)} د.ل</td>
              <td class="total-paid">${formatMoney(totalSettlementLYD)} د.ل</td>
              <td colspan="2" style="font-size: 7pt; color: #cbd5e1;">—</td>
            </tr>
          </tfoot>
        </table>

        <!-- Executive KPI Cards -->
        <div class="kpi-cards-grid">
          <div class="kpi-card">
            <span class="kpi-title">📋 إجمالي عدد المطالبات</span>
            <span class="kpi-amount primary">${totalClaimsCount} <small style="font-size: 8pt; font-weight: 600;">مطالبة</small></span>
            <span class="kpi-subtitle">منها ${claimsWithForeignCount} مسجلة بعملات أجنبية تم تحويلها</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-title">💰 إجمالي الاحتياطي المرصود (د.ل)</span>
            <span class="kpi-amount primary">${formatMoney(totalReserveLYD)} <small style="font-size: 8pt; font-weight: 600;">د.ل</small></span>
            <span class="kpi-subtitle">محسوب بسعر اليوم: 1$ = ${usdRate} د.ل | 1 د.ت = ${tndRate} د.ل</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-title">💳 إجمالي التعويضات المسددة (د.ل)</span>
            <span class="kpi-amount success">${formatMoney(totalSettlementLYD)} <small style="font-size: 8pt; font-weight: 600;">د.ل</small></span>
            <span class="kpi-subtitle">مبالغ التسويات الودية وأوامر الصرف المعتمدة</span>
          </div>

          <div class="kpi-card">
            <span class="kpi-title">⚖️ صافي الالتزام المالي القائم (د.ل)</span>
            <span class="kpi-amount warning">${formatMoney(remainingBalanceLYD)} <small style="font-size: 8pt; font-weight: 600;">د.ل</small></span>
            <span class="kpi-subtitle">الفارق بين الاحتياطي المرصود والمصروف الفعلي</span>
          </div>
        </div>

        <!-- Official Signatures -->
        <div class="signatures-container">
          <div class="sig-block">
            <div class="sig-role">إعداد / قسم التعويضات والمطالبات</div>
            <div class="sig-name">${currentUser?.name || 'مسؤول المنظومة'}</div>
          </div>

          <div class="company-stamp-box">
            ختم الإدارة المعتمد<br/>
            (شركة المدار الليبي للتأمين)
          </div>

          <div class="sig-block">
            <div class="sig-role">مدير إدارة المطالبات والتعويضات</div>
            <div class="sig-name">أشرف محمد الشافعي</div>
          </div>

          <div class="sig-block">
            <div class="sig-role">مدير الإدارة المالية</div>
            <div class="sig-name">خالد محمود حمدان</div>
          </div>
        </div>

        <!-- Footer Meta -->
        <div class="official-footer">
          <span>نظام إدارة التأمين والمطالبات — شركة المدار الليبي للتأمين المساهمة (MLI)</span>
          <span>تم الاستخراج آلياً بواسطة: ${currentUser?.name || 'مستخدم النظام'} | رقم المعاينة: ${Math.floor(100000 + Math.random() * 900000)}</span>
          <span>الصفحة 1 من 1</span>
        </div>

      </div>

    </body>
    </html>
  `);

  printWindow.document.close();
}



