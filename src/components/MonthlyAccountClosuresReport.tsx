import { useEffect, useState } from "react";
import { showToast } from "./Toast";

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
      const params = new URLSearchParams();
      if (filterMode === 'monthly') {
        if (selectedYear) params.append('year', selectedYear);
        if (selectedMonth) params.append('month', selectedMonth);
      } else {
        params.append('type', 'range');
        if (dateFrom) params.append('from_date', dateFrom);
        if (dateTo) params.append('to_date', dateTo);
      }

      const res = await fetch(`/api/branches-agents/monthly-account-closures-report?${params}`, {
        headers: { 'Accept': 'application/json' }
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

  // حساب الإجماليات بدقة
  const totalDue = closures.reduce((sum, closure) => sum + (Number(closure.due_amount) || 0), 0);
  const totalPaid = closures.reduce((sum, closure) => sum + (Number(closure.paid_amount) || 0), 0);
  const totalRemaining = closures.reduce((sum, closure) => sum + (Number(closure.remaining_amount) || 0), 0);

  const handleExportExcel = () => {
    if (closures.length === 0) return;

    // Headers
    const headers = ["الوكيل", "رقم الوكيل", "السنة", "الشهر", "القيمة المستحقة", "المدفوع", "المتبقي", "تاريخ الإغلاق"];
    
    // Rows
    const rows = closures.map(closure => [
      `"${closure.branch_agent.agency_name} - ${closure.branch_agent.agent_name}"`,
      `"${closure.branch_agent.code}"`,
      `"${closure.year}"`,
      `"${MONTHS.find(m => m.value === closure.month.toString())?.label || closure.month}"`,
      `"${closure.due_amount}"`,
      `"${closure.paid_amount}"`,
      `"${closure.remaining_amount}"`,
      `"${formatDate(closure.created_at)}"`
    ]);

    // Summary Row
    rows.push([]);
    rows.push([`"الإجمالي"`, `""`, `""`, `""`, `"${totalDue}"`, `"${totalPaid}"`, `"${totalRemaining}"`, `""`]);

    // Combine to CSV with semicolon for better Excel compatibility in common regional settings
    const csvContent = "\uFEFF" + [headers.map(h => `"${h}"`), ...rows].map(e => e.join(";")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const reportLabel = filterMode === 'monthly'
      ? `${selectedYear}_${selectedMonth || 'الكل'}`
      : `${dateFrom || 'من'}_${dateTo || 'إلى'}`;
    link.setAttribute("download", `تقرير_إغلاق_الحسابات_${reportLabel}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
              src="/img/logo3.png" 
              alt="Logo" 
              style={{ maxHeight: '110px', width: 'auto' }} 
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
                  <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); if (datePreset !== 'custom') setDatePreset('custom'); }} />
                  <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); if (datePreset !== 'custom') setDatePreset('custom'); }} />
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
                      <th>القيمة المستحقة</th>
                      <th>المدفوع</th>
                      <th>المتبقي</th>
                      <th>تاريخ الإغلاق</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closures.map((closure) => (
                      <tr key={closure.id}>
                        <td>{closure.branch_agent.agency_name} - {closure.branch_agent.agent_name} ({closure.branch_agent.code})</td>
                        <td>{closure.year}</td>
                        <td>{MONTHS.find(m => m.value === closure.month.toString())?.label || closure.month}</td>
                        <td>{formatCurrency(closure.due_amount)}</td>
                        <td>{formatCurrency(closure.paid_amount)}</td>
                        <td>{formatCurrency(closure.remaining_amount)}</td>
                        <td>{formatDate(closure.created_at)}</td>
                      </tr>
                    ))}
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
                  <label>إجمالي المستحقات</label>
                  <input
                    type="text"
                    value={formatCurrency(totalDue)}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: '#f5f5f5',
                      fontSize: 14,
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
                      background: '#f5f5f5',
                      fontSize: 14,
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
                      background: '#f5f5f5',
                      fontSize: 14,
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

