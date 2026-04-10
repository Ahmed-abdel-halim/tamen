import { useEffect, useMemo, useState } from 'react';
import { showToast } from './Toast';

type Employee = {
  id: number;
  username: string;
  name: string;
  email?: string;
  salary?: number | string | null;
};

type Payroll = {
  id: number;
  user_id: number;
  year: number;
  month: number;
  base_salary: number | string;
  allowance_amount: number | string;
  bonus_amount: number | string;
  deduction_amount: number | string;
  advance_amount: number | string;
  net_salary: number | string;
  status: 'paid' | 'unpaid';
  paid_at?: string | null;
  notes?: string | null;
};

type SalaryHistory = {
  id: number;
  old_salary?: number | string | null;
  new_salary?: number | string | null;
  changed_at: string;
  notes?: string | null;
  changed_by?: { name?: string } | null;
};

const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toNum = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export default function EmployeeSalaries() {
  const now = new Date();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkPaying, setBulkPaying] = useState(false);
  const [query, setQuery] = useState('');
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [status, setStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [historyFor, setHistoryFor] = useState<Employee | null>(null);
  const [history, setHistory] = useState<SalaryHistory[]>([]);
  const [payrollForm, setPayrollForm] = useState<null | {
    user_id: number;
    name: string;
    base_salary: number;
    allowance_amount: number;
    bonus_amount: number;
    deduction_amount: number;
    advance_amount: number;
    status: 'paid' | 'unpaid';
    notes: string;
  }>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [employeesRes, payrollsRes] = await Promise.all([
        fetch('/api/employee-payrolls/employees'),
        fetch(`/api/employee-payrolls?year=${year}&month=${month}${status !== 'all' ? `&status=${status}` : ''}`),
      ]);
      const employeesData = await employeesRes.json();
      const payrollsData = await payrollsRes.json();
      setEmployees(Array.isArray(employeesData) ? employeesData : []);
      setPayrolls(Array.isArray(payrollsData) ? payrollsData : []);
    } catch (error: any) {
      showToast(error?.message || 'حدث خطأ أثناء تحميل بيانات المرتبات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [year, month, status]);

  const payrollMap = useMemo(() => {
    const map = new Map<number, Payroll>();
    payrolls.forEach((p) => map.set(p.user_id, p));
    return map;
  }, [payrolls]);

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => !q || e.name.toLowerCase().includes(q) || e.username.toLowerCase().includes(q));
  }, [employees, query]);

  const rows = filteredEmployees.map((e) => {
    const p = payrollMap.get(e.id);
    const base = p ? toNum(p.base_salary) : toNum(e.salary);
    const allowance = p ? toNum(p.allowance_amount) : 0;
    const bonus = p ? toNum(p.bonus_amount) : 0;
    const deduction = p ? toNum(p.deduction_amount) : 0;
    const advance = p ? toNum(p.advance_amount) : 0;
    const net = p ? toNum(p.net_salary) : base;
    return { e, p, base, allowance, bonus, deduction, advance, net };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.total += r.net;
      if (r.p?.status === 'paid') acc.paid += 1;
      return acc;
    },
    { total: 0, paid: 0 }
  );

  const openPayrollForm = (r: (typeof rows)[number]) => {
    setPayrollForm({
      user_id: r.e.id,
      name: r.e.name,
      base_salary: r.base,
      allowance_amount: r.allowance,
      bonus_amount: r.bonus,
      deduction_amount: r.deduction,
      advance_amount: r.advance,
      status: r.p?.status || 'unpaid',
      notes: r.p?.notes || '',
    });
  };

  const savePayroll = async () => {
    if (!payrollForm) return;
    setSaving(true);
    try {
      const res = await fetch('/api/employee-payrolls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: payrollForm.user_id,
          year,
          month,
          base_salary: payrollForm.base_salary,
          allowance_amount: payrollForm.allowance_amount,
          bonus_amount: payrollForm.bonus_amount,
          deduction_amount: payrollForm.deduction_amount,
          advance_amount: payrollForm.advance_amount,
          status: payrollForm.status,
          notes: payrollForm.notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || 'فشل حفظ بيان المرتب');
      }
      setPayrollForm(null);
      showToast('تم حفظ بيان المرتب بنجاح', 'success');
      loadAll();
    } catch (error: any) {
      showToast(error?.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (employee: Employee) => {
    setHistoryFor(employee);
    try {
      const res = await fetch(`/api/users/${employee.id}/salary-history`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
  };

  const handleExportCsv = () => {
    // Semicolon matches Windows "list separator" in Arabic/EU locales; comma-only CSV opens as one column in Excel.
    const sep = ';';
    const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [
      [
        'اسم الموظف',
        'اسم المستخدم',
        'السنة',
        'الشهر',
        'الأساسي',
        'بدلات',
        'مكافآت',
        'خصومات',
        'سلف',
        'الصافي',
        'حالة الصرف',
      ].join(sep),
      ...rows.map((r) =>
        [
          q(r.e.name),
          q(r.e.username),
          year,
          month,
          r.base,
          r.allowance,
          r.bonus,
          r.deduction,
          r.advance,
          r.net,
          q(r.p?.status === 'paid' ? 'مصروف' : 'غير مصروف'),
        ].join(sep)
      ),
    ];
    // UTF-8 BOM so Excel (Windows) opens the file as Unicode instead of ANSI (prevents mojibake for Arabic)
    const csv = `\uFEFF${lines.join('\r\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-payroll-${year}-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkPay = async () => {
    if (employees.length === 0) {
      showToast('لا يوجد موظفون لصرف المرتبات', 'error');
      return;
    }
    const ok = window.confirm(
      `تأكيد صرف مرتبات جميع الموظفين (${employees.length} موظف) لشهر ${month} سنة ${year}؟ سيتم تسجيل الحالة كمصروف لكل من لديه بيان أو من راتبه الأساسي فقط.`
    );
    if (!ok) return;
    setBulkPaying(true);
    try {
      const res = await fetch('/api/employee-payrolls/bulk-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'فشل صرف المرتبات الجماعي');
      }
      showToast(data?.message || 'تم صرف المرتبات لجميع الموظفين', 'success');
      await loadAll();
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'حدث خطأ أثناء الصرف الجماعي', 'error');
    } finally {
      setBulkPaying(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=1100,height=800');
    if (!printWindow) return;
    const bodyRows = rows
      .map(
        (r, idx) => `
      <tr>
        <td>${idx + 1}</td><td>${r.e.name}</td><td>${r.e.username}</td><td>${money.format(r.base)}</td>
        <td>${money.format(r.allowance)}</td><td>${money.format(r.bonus)}</td><td>${money.format(r.deduction)}</td>
        <td>${money.format(r.advance)}</td><td>${money.format(r.net)}</td><td>${r.p?.status === 'paid' ? 'مصروف' : 'غير مصروف'}</td>
      </tr>`
      )
      .join('');
    printWindow.document.write(`
      <html dir="rtl"><head><title>كشف مرتبات الموظفين</title>
      <style>body{font-family:Cairo,sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:8px;text-align:right}</style>
      </head><body onload="window.print()">
      <h2>كشف مرتبات الموظفين - ${month}/${year}</h2>
      <table><thead><tr><th>#</th><th>الموظف</th><th>المستخدم</th><th>الأساسي</th><th>بدلات</th><th>مكافآت</th><th>خصومات</th><th>سلف</th><th>الصافي</th><th>الحالة</th></tr></thead>
      <tbody>${bodyRows}</tbody></table></body></html>`);
    printWindow.document.close();
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb"><span>الشؤون المالية / مرتبات الموظفين</span></div>
      <div className="users-card" style={{ marginBottom: '16px' }}>
        <div className="ep-payroll-toolbar">
          <div className="ep-payroll-toolbar-head">
            <h2 className="ep-payroll-toolbar-title">الفلاتر والفترة</h2>
            <p className="ep-payroll-toolbar-hint">اختر الشهر والسنة ثم طبّق البحث أو صدّر الكشف</p>
          </div>
          <div className="ep-payroll-fields">
            <div className="ep-field">
              <label htmlFor="ep-payroll-search">بحث عن موظف</label>
              <input
                id="ep-payroll-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="اسم الموظف أو اسم المستخدم..."
                autoComplete="off"
              />
            </div>
            <div className="ep-field">
              <label htmlFor="ep-payroll-year">السنة</label>
              <input
                id="ep-payroll-year"
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value || now.getFullYear()))}
                min={2000}
                max={2100}
              />
            </div>
            <div className="ep-field">
              <label htmlFor="ep-payroll-month">الشهر</label>
              <select id="ep-payroll-month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    شهر {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <div className="ep-field">
              <label htmlFor="ep-payroll-status">حالة الصرف</label>
              <select
                id="ep-payroll-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'all' | 'paid' | 'unpaid')}
              >
                <option value="all">كل الحالات</option>
                <option value="paid">مصروف</option>
                <option value="unpaid">غير مصروف</option>
              </select>
            </div>
          </div>
          <div className="ep-payroll-actions">
            <button className="btn-submit" type="button" onClick={handleExportCsv}>
              <i className="fa-solid fa-file-csv"></i>
              تصدير Excel/CSV
            </button>
            <button className="btn-submit" type="button" onClick={handlePrint}>
              <i className="fa-solid fa-print"></i>
              طباعة الكشف
            </button>
            <button
              className="btn-submit"
              type="button"
              onClick={handleBulkPay}
              disabled={loading || bulkPaying || employees.length === 0}
              title="تسجيل صرف المرتب لجميع الموظفين للشهر المحدد"
            >
              <i className="fa-solid fa-money-bill-wave"></i>
              {bulkPaying ? 'جاري الصرف...' : 'صرف الكل للشهر'}
            </button>
          </div>
        </div>
      </div>

      <div className="users-card" style={{ marginBottom: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))', gap: '12px' }}>
          <div><strong>عدد الموظفين:</strong> {rows.length}</div>
          <div><strong>مصروف:</strong> {totals.paid}</div>
          <div><strong>إجمالي الصافي:</strong> {money.format(totals.total)} د.ل</div>
        </div>
      </div>

      <div className="users-card">
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th><th>الموظف</th><th>الأساسي</th><th>البدلات</th><th>المكافآت</th><th>الخصومات</th><th>السلف</th><th>الصافي</th><th>الحالة</th><th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '28px 0' }}>جاري التحميل...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '28px 0' }}>لا توجد بيانات</td></tr>
              ) : rows.map((r, idx) => (
                <tr key={r.e.id}>
                  <td>{idx + 1}</td>
                  <td>{r.e.name}</td>
                  <td>{money.format(r.base)}</td>
                  <td>{money.format(r.allowance)}</td>
                  <td>{money.format(r.bonus)}</td>
                  <td>{money.format(r.deduction)}</td>
                  <td>{money.format(r.advance)}</td>
                  <td style={{ fontWeight: 800 }}>{money.format(r.net)}</td>
                  <td>{r.p?.status === 'paid' ? 'مصروف' : 'غير مصروف'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="action-btn edit" onClick={() => openPayrollForm(r)} title="تعديل بيان المرتب"><i className="fa-solid fa-pen"></i></button>
                      <button className="action-btn" onClick={() => openHistory(r.e)} title="سجل المرتب"><i className="fa-solid fa-clock-rotate-left"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {payrollForm && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setPayrollForm(null)}>
          <div className="modal-content user-form-modal">
            <div className="modal-header"><h3>تعديل بيان مرتب - {payrollForm.name}</h3></div>
            <div className="user-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group"><label>الأساسي</label><input type="number" value={payrollForm.base_salary} onChange={(e) => setPayrollForm({ ...payrollForm, base_salary: toNum(e.target.value) })} /></div>
                <div className="form-group"><label>بدلات</label><input type="number" value={payrollForm.allowance_amount} onChange={(e) => setPayrollForm({ ...payrollForm, allowance_amount: toNum(e.target.value) })} /></div>
                <div className="form-group"><label>مكافآت</label><input type="number" value={payrollForm.bonus_amount} onChange={(e) => setPayrollForm({ ...payrollForm, bonus_amount: toNum(e.target.value) })} /></div>
                <div className="form-group"><label>خصومات</label><input type="number" value={payrollForm.deduction_amount} onChange={(e) => setPayrollForm({ ...payrollForm, deduction_amount: toNum(e.target.value) })} /></div>
                <div className="form-group"><label>سلف</label><input type="number" value={payrollForm.advance_amount} onChange={(e) => setPayrollForm({ ...payrollForm, advance_amount: toNum(e.target.value) })} /></div>
                <div className="form-group"><label>حالة الصرف</label><select value={payrollForm.status} onChange={(e) => setPayrollForm({ ...payrollForm, status: e.target.value as 'paid' | 'unpaid' })}><option value="unpaid">غير مصروف</option><option value="paid">مصروف</option></select></div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label>ملاحظات</label><textarea rows={3} value={payrollForm.notes} onChange={(e) => setPayrollForm({ ...payrollForm, notes: e.target.value })} /></div>
              </div>
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setPayrollForm(null)}>إلغاء</button>
                <button className="btn-submit" onClick={savePayroll} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {historyFor && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setHistoryFor(null)}>
          <div className="modal-content user-form-modal">
            <div className="modal-header"><h3>سجل مرتب الموظف - {historyFor.name}</h3></div>
            <div className="table-wrapper">
              <table className="users-table">
                <thead><tr><th>التاريخ</th><th>من</th><th>إلى</th><th>بواسطة</th><th>ملاحظات</th></tr></thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center' }}>لا يوجد سجل تغييرات</td></tr>
                  ) : history.map((h) => (
                    <tr key={h.id}>
                      <td>{new Date(h.changed_at).toLocaleString('en-GB')}</td>
                      <td>{h.old_salary !== null && h.old_salary !== undefined ? money.format(toNum(h.old_salary)) : '-'}</td>
                      <td>{h.new_salary !== null && h.new_salary !== undefined ? money.format(toNum(h.new_salary)) : '-'}</td>
                      <td>{h.changed_by?.name || '-'}</td>
                      <td>{h.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="form-actions"><button className="btn-cancel" onClick={() => setHistoryFor(null)}>إغلاق</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
