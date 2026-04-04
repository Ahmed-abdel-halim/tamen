import { useEffect, useState } from "react";

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

export default function MonthlyAccountClosuresReport() {
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [closures, setClosures] = useState<MonthlyAccountClosure[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // توليد السنوات (من 2020 إلى السنة الحالية + 1)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 + 2 }, (_, i) => (2020 + i).toString());

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    fetchReport();
  }, [selectedYear, selectedMonth]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear);
      if (selectedMonth) params.append('month', selectedMonth);

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
      setToast({ message: `حدث خطأ: ${error.message}`, type: 'error' });
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

  const totalDue = closures.reduce((sum, closure) => sum + closure.due_amount, 0);
  const totalPaid = closures.reduce((sum, closure) => sum + closure.paid_amount, 0);
  const totalRemaining = closures.reduce((sum, closure) => sum + closure.remaining_amount, 0);

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>كشف إغلاق الحساب الشهري</span>
      </div>

      <div className="users-card">
        {/* Toast Notification */}
        {toast && (
          <div
            className={`toast ${toast.type}`}
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10000,
              padding: '12px 24px',
              borderRadius: '8px',
              background: toast.type === 'success' ? '#10b981' : '#ef4444',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {toast.message}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
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

