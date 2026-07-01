import { useEffect, useState } from "react";
import { showToast } from "./Toast";
import { API_BASE_URL, BACKEND_URL } from "../config/api";
import { generatePremiumExcel } from "../utils/excelGenerator";

type MonthlyAccountClosure = {
  id: number;
  branch_agent_id: number;
  year: number;
  month: number;
  due_amount: number;
  paid_amount: number;
  remaining_amount: number;
  documents_data?: any[];
  notes?: string;
  created_at: string;
  updated_at: string;
  branch_agent: {
    id: number;
    code: string;
    agency_name: string;
    agent_name: string;
  };
};

type FilterMode = 'monthly' | 'range';
type DatePreset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'custom';

const MONTHS = [
  { value: '1', label: 'يناير' },
  { value: '2', label: 'فبراير' },
  { value: '3', label: 'مارس' },
  { value: '4', label: 'أبريل' },
  { value: '5', label: 'مايو' },
  { value: '6', label: 'يونيو' },
  { value: '7', label: 'يوليو' },
  { value: '8', label: 'أغسطس' },
  { value: '9', label: 'سبتمبر' },
  { value: '10', label: 'أكتوبر' },
  { value: '11', label: 'نوفمبر' },
  { value: '12', label: 'ديسمبر' },
];

const toInputDate = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetRange = (preset: DatePreset) => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  switch (preset) {
    case 'today':
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case 'last7':
      start.setDate(start.getDate() - 6);
      break;
    case 'thisMonth':
      start.setDate(1);
      break;
    case 'lastMonth':
      start.setMonth(start.getMonth() - 1, 1);
      end.setDate(0);
      break;
    default:
      break;
  }

  return { from: toInputDate(start), to: toInputDate(end) };
};

export default function MonthlyAccountClosuresReport() {
  const [filterMode, setFilterMode] = useState<FilterMode>('range');
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [datePreset, setDatePreset] = useState<DatePreset>('thisMonth');
  const defaultRange = getPresetRange('thisMonth');
  const [dateFrom, setDateFrom] = useState<string>(defaultRange.from);
  const [dateTo, setDateTo] = useState<string>(defaultRange.to);
  const [closures, setClosures] = useState<MonthlyAccountClosure[]>([]);
  const [loading, setLoading] = useState(false);

  // توليد السنوات (من 2020 إلى السنة الحالية + 1)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 + 2 }, (_, i) => (2020 + i).toString());



  useEffect(() => {
    if (datePreset !== 'custom') {
      const range = getPresetRange(datePreset);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, [datePreset]);

  useEffect(() => {
    fetchReport();
  }, [selectedYear, selectedMonth, filterMode, dateFrom, dateTo]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterMode === 'monthly') {
        if (selectedYear) params.append('year', selectedYear);
        if (selectedMonth) params.append('month', selectedMonth);
      } else {
        params.append('type', 'range');
        if (dateFrom) params.append('from_date', dateFrom);
        if (dateTo) params.append('to_date', dateTo);
      }

      const res = await fetch(`${API_BASE_URL}/branches-agents/monthly-account-closures-report?${params}`, {
        headers: { 
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'فشل في جلب البيانات');
      }

      if (data.success) {
        setClosures(data.data || []);
      } else {
        throw new Error(data.message || 'حدث خطأ');
      }
    } catch (error: any) {
      showToast(`حدث خطأ: ${error.message}`, 'error');
      setClosures([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' د.ل';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const printReceipt = (closure: any) => {
    let employeeName = "مندوب الشركة";
    const loggedInUserStr = localStorage.getItem('user');
    if (loggedInUserStr) {
      try {
        const parsed = JSON.parse(loggedInUserStr);
        employeeName = parsed.name || parsed.username || "مندوب الشركة";
      } catch {}
    }

    const w = window.open('', '_blank');
    if (!w) return;

    w.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>إيصال استلام قيمة مالية - إغلاق حساب شهري</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page { size: A5 landscape; margin: 5mm; }
            body {
              font-family: 'Cairo', sans-serif;
              margin: 0;
              padding: 0;
              color: #1e293b;
              background: #fff;
              font-size: 13px;
              direction: rtl;
            }
            .receipt-container {
              width: 100%;
              max-width: 190mm;
              margin: 0 auto;
              padding: 12px;
              box-sizing: border-box;
              border: 3px double #0284c7;
              border-radius: 8px;
              position: relative;
              background: #fff;
              min-height: 125mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.03;
              width: 120px;
              height: 120px;
              pointer-events: none;
              z-index: 0;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0284c7;
              padding-bottom: 8px;
              margin-bottom: 10px;
              z-index: 1;
            }
            .logo img {
              height: 45px;
              object-fit: contain;
            }
            .title-area {
              text-align: center;
            }
            .title-area h1 {
              font-size: 16px;
              margin: 0;
              color: #0284c7;
              font-weight: 800;
            }
            .title-area p {
              margin: 2px 0 0 0;
              font-size: 10px;
              color: #64748b;
              font-weight: 600;
            }
            .meta-info {
              text-align: left;
              font-size: 10px;
              font-weight: bold;
            }
            .meta-info p {
              margin: 1px 0;
            }
            .content {
              flex: 1;
              margin-top: 8px;
              z-index: 1;
            }
            .receipt-text {
              font-size: 13px;
              line-height: 1.8;
              margin-bottom: 12px;
              text-align: justify;
              color: #0f172a;
            }
            .receipt-text span {
              font-weight: bold;
              border-bottom: 1px dashed #000;
              padding: 0 4px;
            }
            .table-details {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            .table-details th, .table-details td {
              border: 1px solid #cbd5e1;
              padding: 6px 10px;
              text-align: center;
              font-size: 12px;
            }
            .table-details th {
              background-color: #f1f5f9;
              font-weight: bold;
              color: #334155;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 10px;
              padding-top: 8px;
              border-top: 1px solid #cbd5e1;
              z-index: 1;
            }
            .sig-box {
              text-align: center;
              width: 35%;
            }
            .sig-box h4 {
              margin: 0 0 35px 0;
              font-size: 11px;
              color: #475569;
            }
            .sig-box p {
              margin: 0;
              font-weight: bold;
              font-size: 11px;
              color: #0f172a;
            }
            .print-btn {
              position: fixed;
              top: 10px;
              left: 10px;
              padding: 6px 12px;
              background: #0284c7;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-family: inherit;
              font-weight: bold;
              z-index: 1000;
            }
            @media print {
              .print-btn { display: none; }
              body { background: none; }
              .receipt-container {
                border: 2px solid #0284c7;
                margin: 0;
                padding: 10px;
                height: 100%;
              }
            }
          </style>
        </head>
        <body onload="window.print(); window.onafterprint = () => window.close();">
          <button class="print-btn" onclick="window.print()">🖨️ طباعة الإيصال</button>
          <div class="receipt-container">
            <img class="watermark" src="${window.location.origin}/img/logo.png" onerror="this.src='${window.location.origin}/img/official_logo.PNG'" alt="شعار" />
            
            <div class="header">
              <div class="logo">
                <img src="${window.location.origin}/img/logo.png" onerror="this.src='${window.location.origin}/img/official_logo.PNG'" alt="المدار الليبي للتأمين" />
              </div>
              <div class="title-area">
                <h1>إيصال استلام قيمة مالية</h1>
                <p>إغلاق الحساب الشهري للوكيل</p>
              </div>
              <div class="meta-info">
                <p>الرقم: MLI-REC-${closure.id}</p>
                <p>التاريخ: ${new Date(closure.created_at || new Date()).toLocaleDateString('ar-LY')}</p>
                <p>الوقت: ${new Date(closure.created_at || new Date()).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
            
            <div class="content">
              <div class="receipt-text">
                استلمت أنا المندوب/الموظف: <span>${employeeName}</span>، 
                من السيد/الوكيل: <span>${closure.branch_agent?.agency_name}</span> (كود الوكيل: <span>${closure.branch_agent?.code}</span>)، 
                مبلغاً وقدره: <span style="font-size: 14px; color: #0284c7; font-weight: bold;">${formatCurrency(closure.paid_amount)}</span>، 
                وذلك لتسوية وإغلاق الحساب للوكيل عن شهر: <span>${MONTHS.find(m => m.value === closure.month.toString())?.label || closure.month}</span> لسنة: <span>${closure.year}</span>.
              </div>
              
              <table class="table-details">
                <thead>
                  <tr>
                    <th>القيمة المستحقة (الشركة)</th>
                    <th>القيمة المستلمة (المدفوعة)</th>
                    <th>القيمة المتبقية (الديون)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>${formatCurrency(closure.due_amount)}</td>
                    <td style="font-weight: bold; color: #059669;">${formatCurrency(closure.paid_amount)}</td>
                    <td style="color: ${closure.remaining_amount > 0 ? '#dc2626' : '#059669'}; font-weight: bold;">
                      ${formatCurrency(closure.remaining_amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
              
              ${closure.notes ? `<div style="font-size: 11px; color: #475569; margin-top: 10px;"><strong>ملاحظات:</strong> ${closure.notes}</div>` : ''}
            </div>
            
            <div class="footer">
              <div class="sig-box">
                <h4>توقيع المسلّم (الوكيل)</h4>
                <p>${closure.branch_agent?.agent_name}</p>
              </div>
              <div class="sig-box">
                <h4>توقيع وختم المستلِم (المندوب)</h4>
                <p>${employeeName}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    w.document.close();
  };

  // حساب الإجماليات بدقة
  const totalCompanyShare = closures.reduce((sum, closure) => sum + (Number(closure.due_amount) || 0), 0);
  const totalAgentShare = closures.reduce((sum, closure) => {
    const agentAmount = closure.documents_data?.reduce((s, doc) => s + (Number(doc.agent_amount) || 0), 0) || 0;
    return sum + agentAmount;
  }, 0);
  const totalGrand = totalCompanyShare + totalAgentShare;
  const totalPaid = closures.reduce((sum, closure) => sum + (Number(closure.paid_amount) || 0), 0);
  const totalRemaining = closures.reduce((sum, closure) => sum + (Number(closure.remaining_amount) || 0), 0);

  const handleExportExcel = async () => {
    if (closures.length === 0) return;
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    const reportLabel = filterMode === 'monthly'
      ? `${selectedYear} / ${selectedMonth ? MONTHS.find(m => m.value === selectedMonth)?.label : 'جميع الأشهر'}`
      : `${dateFrom || '-'} إلى ${dateTo || '-'}`;

    try {
      const columns = [
        { header: 'الوكيل', key: 'agency_name', width: 40 },
        { header: 'السنة', key: 'year', width: 10 },
        { header: 'الشهر', key: 'month', width: 15 },
        { header: 'الإجمالي الكلي', key: 'grand_total', width: 20 },
        { header: 'حصة الوكلاء', key: 'agent_share', width: 20 },
        { header: 'حصة الشركة', key: 'company_share', width: 20 },
        { header: 'المدفوع', key: 'paid_amount', width: 15 },
        { header: 'المتبقي', key: 'remaining_amount', width: 15 },
        { header: 'تاريخ الإغلاق', key: 'closed_at', width: 20 },
      ];

      const data = closures.map((closure) => {
        const agentShare = closure.documents_data?.reduce((sum, doc) => sum + (Number(doc.agent_amount) || 0), 0) || 0;
        const companyShare = Number(closure.due_amount) || 0;
        const grandTotal = agentShare + companyShare;
        
        return {
          agency_name: `${closure.branch_agent.agency_name} - ${closure.branch_agent.agent_name}`,
          year: closure.year,
          month: MONTHS.find(m => m.value === closure.month.toString())?.label || closure.month,
          grand_total: grandTotal.toFixed(2) + ' د.ل',
          agent_share: agentShare.toFixed(2) + ' د.ل',
          company_share: companyShare.toFixed(2) + ' د.ل',
          paid_amount: closure.paid_amount.toFixed(2) + ' د.ل',
          remaining_amount: closure.remaining_amount.toFixed(2) + ' د.ل',
          closed_at: formatDate(closure.created_at),
        };
      });

      // Add a summary row
      data.push({
        agency_name: 'الإجمالي الكلي',
        year: '-' as any,
        month: '',
        grand_total: totalGrand.toFixed(2) + ' د.ل',
        agent_share: totalAgentShare.toFixed(2) + ' د.ل',
        company_share: totalCompanyShare.toFixed(2) + ' د.ل',
        paid_amount: totalPaid.toFixed(2) + ' د.ل',
        remaining_amount: totalRemaining.toFixed(2) + ' د.ل',
        closed_at: '',
      });

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - كشف إغلاق الحسابات الشهرية',
        subtitle: `الفترة: ${reportLabel} - إجمالي الشركة: ${totalCompanyShare.toLocaleString()} د.ل | حصة الوكلاء: ${totalAgentShare.toLocaleString()} د.ل`,
        columns,
        data,
        fileName: 'كشف_إغلاق_الحسابات',
        qrData: `كشف إغلاق الحسابات - شركة المدار الليبي\nالفترة: ${reportLabel}\nإجمالي الشركة: ${totalCompanyShare.toLocaleString()} د.ل\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير التقرير الاحترافي بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb no-print" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '15px 20px',
        background: 'var(--panel)',
        borderRadius: '12px',
        marginBottom: '20px',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
          <i className="fa-solid fa-file-invoice-dollar" style={{ marginLeft: '10px', color: '#139625' }}></i>
          كشف إغلاق الحساب الشهري
        </span>
        <div className="export-buttons" style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleExportExcel} 
            disabled={closures.length === 0}
            className="btn-submit no-print" 
            style={{ 
              background: '#139625', 
              color: '#fff',
              fontSize: '14px', 
              padding: '8px 18px', 
              minHeight: 'auto',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              cursor: closures.length === 0 ? 'not-allowed' : 'pointer',
              opacity: closures.length === 0 ? 0.6 : 1,
              transition: 'all 0.3s ease'
            }}
          >
            <i className="fa-solid fa-file-excel"></i>
            تصدير إكسيل
          </button>
          <button 
            onClick={handlePrint} 
            className="btn-primary no-print" 
            style={{ 
              background: '#003173', 
              color: '#fff',
              fontSize: '14px', 
              padding: '8px 18px', 
              minHeight: 'auto',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
          >
            <i className="fa-solid fa-print"></i>
            طباعة التقرير
          </button>
        </div>
      </div>

      {/* تقرير فقط للطباعة (Print Header) */}
      <div className="print-only" style={{ marginBottom: '40px', borderBottom: '3px double #000', paddingBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', direction: 'rtl' }}>
          {/* الجانب الأيمن (في RTL): اللوجو */}
          <div style={{ flex: 1, textAlign: 'right' }}>
            <img 
              src={`${BACKEND_URL}/img/logo3.png`} 
              alt="Logo" 
              style={{ maxHeight: '110px', width: 'auto' }} 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/img/logo3.png'; // fallback to local if backend fails
              }}
            />
            <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 'bold', color: '#003173' }}>شركة المدار الليبي للتأمين</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>Al Madar Libyan Insurance</p>
          </div>

          {/* المنتصف: العناوين */}
          <div style={{ flex: 2, textAlign: 'center' }}>
            <h1 style={{ margin: '0 0 10px', fontSize: '26px', color: '#003173', fontWeight: 900 }}>كشف إغلاق الحسابات الشهرية</h1>
            <div style={{ 
              display: 'inline-block', 
              padding: '8px 30px', 
              backgroundColor: '#f3f4f6',
              border: '1px solid #139625', 
              borderRadius: '25px',
              fontSize: '15px',
              fontWeight: 700,
              color: '#139625'
            }}>
              الفترة: {filterMode === 'monthly'
                ? `${selectedYear} / ${selectedMonth ? MONTHS.find(m => m.value === selectedMonth)?.label : 'جميع الأشهر'}`
                : `${dateFrom || '-'} إلى ${dateTo || '-'}`
              }
            </div>
          </div>

          {/* الجانب الأيسر (في RTL): QR Code */}
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ 
              width: '100px', 
              height: '100px', 
              border: '2px solid #000', 
              padding: '5px',
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: '#fff',
              marginLeft: '0',
              marginRight: 'auto'
            }}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=AlMadarReport_${new Date().getTime()}`} 
                alt="QR Code" 
                style={{ width: '100%', height: '100%' }}
              />
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#000', fontWeight: 'bold' }}>رقم التقرير: {new Date().getTime().toString().slice(-8)}</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#666' }}>تاريخ الطباعة: {new Date().toLocaleDateString('ar-LY')}</p>
          </div>
        </div>
      </div>

      <div className="users-card">


        {/* Filters */}
        <div className="no-print" style={{ marginBottom: '14px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="radio" name="closureReportType" value="range" checked={filterMode === 'range'} onChange={(e) => setFilterMode(e.target.value as FilterMode)} style={{ marginLeft: '8px' }} />
            <span>فترة زمنية</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="radio" name="closureReportType" value="monthly" checked={filterMode === 'monthly'} onChange={(e) => setFilterMode(e.target.value as FilterMode)} style={{ marginLeft: '8px' }} />
            <span>سنة/شهر</span>
          </label>
        </div>

        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          {filterMode === 'monthly' ? (
            <>
          {/* السنة */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>السنة</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: '#fff',
                fontSize: 14,
                minHeight: 42,
              }}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* الشهر */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>الشهر (اختياري)</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: '#fff',
                fontSize: 14,
                minHeight: 42,
              }}
            >
              <option value="">جميع الأشهر</option>
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
            </>
          ) : (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>فترة سريعة</label>
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: '#fff',
                    fontSize: 14,
                    minHeight: 42,
                  }}
                >
                  <option value="today">اليوم</option>
                  <option value="yesterday">أمس</option>
                  <option value="last7">آخر 7 أيام</option>
                  <option value="thisMonth">هذا الشهر</option>
                  <option value="lastMonth">الشهر السابق</option>
                  <option value="custom">تحديد مخصص</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>من - إلى</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); if (datePreset !== 'custom') setDatePreset('custom'); }} lang="en-GB" />
                  <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); if (datePreset !== 'custom') setDatePreset('custom'); }} lang="en-GB" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Table */}
        {closures.length > 0 ? (
          <>
            <div className="users-table-wrapper" style={{ marginBottom: '24px' }}>
              <div className="table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>الوكيل</th>
                      <th>السنة</th>
                      <th>الشهر</th>
                      <th>الإجمالي الكلي</th>
                      <th>حصة الوكلاء</th>
                      <th>حصة الشركة</th>
                      <th>المدفوع</th>
                      <th>المتبقي</th>
                      <th>تاريخ الإغلاق</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closures.map((closure) => {
                      const agentShare = closure.documents_data?.reduce((sum, doc) => sum + (Number(doc.agent_amount) || 0), 0) || 0;
                      const companyShare = Number(closure.due_amount) || 0;
                      const grandTotal = agentShare + companyShare;
                      
                      return (
                        <tr key={closure.id}>
                          <td>{closure.branch_agent.agency_name} - {closure.branch_agent.agent_name} ({closure.branch_agent.code})</td>
                          <td>{closure.year}</td>
                          <td>{MONTHS.find(m => m.value === closure.month.toString())?.label || closure.month}</td>
                          <td style={{ fontWeight: 'bold' }}>{formatCurrency(grandTotal)}</td>
                          <td style={{ color: '#6366f1', fontWeight: 'bold' }}>{formatCurrency(agentShare)}</td>
                          <td style={{ color: '#139625', fontWeight: 'bold' }}>{formatCurrency(companyShare)}</td>
                          <td style={{ color: '#059669' }}>{formatCurrency(closure.paid_amount)}</td>
                          <td style={{ color: '#dc2626' }}>{formatCurrency(closure.remaining_amount)}</td>
                          <td>{formatDate(closure.created_at)}</td>
                          <td>
                            <button
                              onClick={() => printReceipt(closure)}
                              className="btn-submit"
                              style={{
                                padding: '6px 12px',
                                fontSize: '12px',
                                backgroundColor: '#0284c7',
                                minHeight: 'auto',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                              }}
                            >
                              <i className="fa-solid fa-file-invoice-dollar"></i>
                              إيصال
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="users-mobile-cards">
            {closures.map((closure) => (
              <div key={closure.id} className="user-mobile-card">
                <div className="user-mobile-header">
                  <div>
                    <h4 className="user-mobile-title">{closure.branch_agent.agency_name}</h4>
                    <span className="user-mobile-number">{closure.branch_agent.code}</span>
                  </div>
                </div>
                <div className="user-mobile-body">
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">اسم الوكيل:</span>
                    <span className="user-mobile-value">{closure.branch_agent.agent_name}</span>
                  </div>
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">السنة:</span>
                    <span className="user-mobile-value">{closure.year}</span>
                  </div>
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">الشهر:</span>
                    <span className="user-mobile-value">{MONTHS.find(m => m.value === closure.month.toString())?.label || closure.month}</span>
                  </div>
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">القيمة المستحقة:</span>
                    <span className="user-mobile-value">{formatCurrency(closure.due_amount)}</span>
                  </div>
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">المدفوع:</span>
                    <span className="user-mobile-value">{formatCurrency(closure.paid_amount)}</span>
                  </div>
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">المتبقي:</span>
                    <span className="user-mobile-value">{formatCurrency(closure.remaining_amount)}</span>
                  </div>
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">تاريخ الإغلاق:</span>
                    <span className="user-mobile-value">{formatDate(closure.created_at)}</span>
                  </div>
                  
                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #cbd5e1', paddingTop: '8px' }}>
                    <button
                      onClick={() => printReceipt(closure)}
                      className="btn-submit"
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        backgroundColor: '#0284c7',
                        minHeight: 'auto',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      <i className="fa-solid fa-file-invoice-dollar"></i>
                      طباعة إيصال الاستلام
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

            {/* Summary */}
            <div className="users-card" style={{ marginTop: '24px' }}>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '20px',
              }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>إجمالي الشركة (الصافي)</label>
                  <input
                    type="text"
                    value={formatCurrency(totalCompanyShare)}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: '#ecfdf5',
                      color: '#065f46',
                      fontSize: 14,
                      fontWeight: 'bold',
                      minHeight: 42,
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>إجمالي حصة الوكلاء</label>
                  <input
                    type="text"
                    value={formatCurrency(totalAgentShare)}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: '#eef2ff',
                      color: '#3730a3',
                      fontSize: 14,
                      fontWeight: 'bold',
                      minHeight: 42,
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>الإجمالي الكلي</label>
                  <input
                    type="text"
                    value={formatCurrency(totalGrand)}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: '#f3f4f6',
                      color: '#111827',
                      fontSize: 14,
                      fontWeight: 'bold',
                      minHeight: 42,
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>إجمالي المدفوع</label>
                  <input
                    type="text"
                    value={formatCurrency(totalPaid)}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: '#f0fdf4',
                      color: '#166534',
                      fontSize: 14,
                      fontWeight: 'bold',
                      minHeight: 42,
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>إجمالي المتبقي</label>
                  <input
                    type="text"
                    value={formatCurrency(totalRemaining)}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: '#fef2f2',
                      color: '#991b1b',
                      fontSize: 14,
                      fontWeight: 'bold',
                      minHeight: 42,
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="users-card" style={{ 
            textAlign: 'center', 
            padding: '40px',
            color: 'var(--muted)',
          }}>
            {loading ? 'جاري التحميل...' : 'لا توجد بيانات'}
          </div>
        )}
      </div>
    </section>
  );
}

