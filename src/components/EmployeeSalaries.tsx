import { useEffect, useMemo, useState } from 'react';
import { showToast } from './Toast';
import { API_BASE_URL } from "../config/api";

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
  housing_allowance: number | string;
  transportation_allowance: number | string;
  communication_allowance: number | string;
  allowance_amount: number | string;
  bonus_amount: number | string;
  other_additions: number | string;
  penalty_amount: number | string;
  deduction_amount: number | string;
  advance_amount: number | string;
  net_salary: number | string;
  status: 'paid' | 'unpaid';
  delivery_method: string;
  custom_delivery_method?: string | null;
  extra_fields?: { label: string; amount: number }[] | null;
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
    base_salary: number | string;
    housing_allowance: number | string;
    transportation_allowance: number | string;
    communication_allowance: number | string;
    allowance_amount: number | string;
    bonus_amount: number | string;
    other_additions: number | string;
    penalty_amount: number | string;
    deduction_amount: number | string;
    advance_amount: number | string;
    status: 'paid' | 'unpaid';
    delivery_method: string;
    custom_delivery_method: string;
    extra_fields: { label: string; amount: number | string }[];
    notes: string;
  }>(null);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [employeesRes, payrollsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/employee-payrolls/employees`),
        fetch(`${API_BASE_URL}/employee-payrolls?year=${year}&month=${month}${status !== 'all' ? `&status=${status}` : ''}`),
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
    const housing = p ? toNum(p.housing_allowance) : 100;
    const transport = p ? toNum(p.transportation_allowance) : 100;
    const communication = p ? toNum(p.communication_allowance) : 100;
    const misc = p ? toNum(p.allowance_amount) : 0;
    const bonus = p ? toNum(p.bonus_amount) : 100;
    const other = p ? toNum(p.other_additions) : 0;
    const deduction = p ? toNum(p.deduction_amount) : 75;
    const advance = p ? toNum(p.advance_amount) : 0;
    const penalty = p ? toNum(p.penalty_amount) : 0;

    const extra_fields = p?.extra_fields || [];
    const extra_total = extra_fields.reduce((acc, f) => acc + toNum(f.amount), 0);

    const net = p ? toNum(p.net_salary) : (base + housing + transport + communication + bonus + other + misc + extra_total - deduction - advance - penalty);
    return { e, p, base, housing, transport, communication, misc, bonus, other, deduction, advance, penalty, extra_fields, extra_total, net };
  });

  const allExtraLabels = useMemo(() => {
    const labels = new Set<string>();
    rows.forEach(r => r.extra_fields.forEach(f => { if(f.label) labels.add(f.label); }));
    return Array.from(labels);
  }, [rows]);

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
      housing_allowance: r.housing,
      transportation_allowance: r.transport,
      communication_allowance: r.communication,
      allowance_amount: r.misc,
      bonus_amount: r.bonus,
      other_additions: r.other,
      penalty_amount: r.penalty,
      deduction_amount: r.deduction,
      advance_amount: r.advance,
      status: r.p?.status || 'unpaid',
      delivery_method: r.p?.delivery_method || 'كاش',
      custom_delivery_method: r.p?.custom_delivery_method || '',
      extra_fields: r.p?.extra_fields || [],
      notes: r.p?.notes || '',
    });
  };

  const savePayroll = async () => {
    if (!payrollForm) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/employee-payrolls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: payrollForm.user_id,
          year,
          month,
          base_salary: payrollForm.base_salary,
          housing_allowance: payrollForm.housing_allowance,
          transportation_allowance: payrollForm.transportation_allowance,
          communication_allowance: payrollForm.communication_allowance,
          allowance_amount: payrollForm.allowance_amount,
          bonus_amount: payrollForm.bonus_amount,
          other_additions: payrollForm.other_additions,
          penalty_amount: payrollForm.penalty_amount,
          deduction_amount: payrollForm.deduction_amount,
          advance_amount: payrollForm.advance_amount,
          status: payrollForm.status,
          delivery_method: payrollForm.delivery_method,
          custom_delivery_method: payrollForm.custom_delivery_method,
          extra_fields: payrollForm.extra_fields,
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
      const res = await fetch(`${API_BASE_URL}/users/${employee.id}/salary-history`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
  };

  const handleExportCsv = () => {
    const logoUrl = window.location.origin + '/img/logo.png';
    // We'll use the HTML-as-Excel trick to support styling (backgrounds, colors, etc.)
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          .header-main { font-family: 'Cairo', sans-serif; }
          .co-name { font-size: 22pt; font-weight: 900; color: #1e293b; text-align: right; }
          .co-sub { font-size: 14pt; color: #64748b; text-align: right; }
          .report-subtitle { font-size: 16pt; font-weight: bold; background-color: #f8fafc; color: #1e293b; text-align: center; border: 1px solid #e2e8f0; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #1e293b; color: #ffffff; font-weight: bold; border: 1px solid #000; padding: 12px; text-align: center; }
          td { border: 1px solid #e2e8f0; padding: 10px; text-align: center; }
          .total-row { background-color: #f1f5f9; font-weight: bold; }
          .net-salary { color: #10b981; font-weight: bold; font-size: 12pt; }
          .emp-name { text-align: right; font-weight: bold; }
        </style>
      </head>
      <body dir="rtl">
        <table>
          <tr>
            <td colspan="${8 + Math.floor(allExtraLabels.length/2)}" style="border:none; text-align:right;">
              <div class="co-name">المدار الليبي للتأمين</div>
              <div class="co-sub">Al Madar Libyan Insurance</div>
              <div class="co-sub">قسم الشؤون المالية والموارد البشرية</div>
            </td>
            <td colspan="${5 + Math.ceil(allExtraLabels.length/2)}" style="border:none; text-align:left;">
              <img src="${logoUrl}" width="100" height="80">
            </td>
          </tr>
          <tr><td colspan="${13 + allExtraLabels.length}" style="border:none; height:20px;"></td></tr>
          <tr><td colspan="${13 + allExtraLabels.length}" class="report-subtitle">كشف مرتبات الموظفين لشهر (${month}) سنة (${year})</td></tr>
          <tr><td colspan="${13 + allExtraLabels.length}" style="border:none; height:20px;"></td></tr>
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الأساسي</th>
              <th>سكن</th>
              <th>مواصلات</th>
              <th>اتصالات</th>
              <th>مكافآت</th>
              <th>خصومات</th>
              <th>سلف</th>
              <th>غرامات</th>
              ${allExtraLabels.map(l => `<th>${l}</th>`).join('')}
              <th>الصافي</th>
              <th>الحالة</th>
              <th>التسليم</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td style="text-align:right; font-weight:bold;">${r.e.name}</td>
                <td>${r.base}</td>
                <td>${r.housing}</td>
                <td>${r.transport}</td>
                <td>${r.communication}</td>
                <td>${r.bonus}</td>
                <td>${r.deduction}</td>
                <td>${r.advance}</td>
                <td>${r.penalty}</td>
                ${allExtraLabels.map(label => {
                  const f = r.extra_fields.find(x => x.label === label);
                  return `<td>${f ? f.amount : 0}</td>`;
                }).join('')}
                <td class="net-salary">${r.net}</td>
                <td>${r.p?.status === 'paid' ? 'مصروف' : 'غير مصروف'}</td>
                <td>${r.p?.delivery_method === 'أخرى' ? r.p.custom_delivery_method || 'أخرى' : (r.p?.delivery_method || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="1">الإجمالي العام</td>
              <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
              ${allExtraLabels.map(() => `<td>-</td>`).join('')}
              <td class="net-salary">${totals.total}</td>
              <td colspan="2">عدد الموظفين: ${rows.length}</td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee-payroll-${year}-${month}.xls`;
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
      const res = await fetch(`${API_BASE_URL}/employee-payrolls/bulk-pay`, {
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
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) return;

    const bodyRows = rows
      .map(
        (r) => `
      <tr>
        <td style="font-weight:bold">${r.e.name}</td>
        <td>${money.format(r.base)}</td>
        <td>${money.format(r.housing)}</td>
        <td>${money.format(r.transport)}</td>
        <td>${money.format(r.communication)}</td>
        <td>${money.format(r.bonus)}</td>
        <td>${money.format(r.deduction)}</td>
        <td>${money.format(r.advance)}</td>
        <td>${money.format(r.penalty)}</td>
        ${allExtraLabels.map(label => {
          const f = r.extra_fields.find(x => x.label === label);
          return `<td>${money.format(toNum(f ? f.amount : 0))}</td>`;
        }).join('')}
        <td style="font-weight:bold; color:#1e293b">${money.format(r.net)}</td>
        <td>${r.p?.status === 'paid' ? 'مصروف' : 'غير مصروف'}</td>
        <td style="font-size:11px">${r.p?.delivery_method === 'أخرى' ? r.p.custom_delivery_method || 'أخرى' : (r.p?.delivery_method || '-')}</td>
      </tr>`
      )
      .join('');

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>كشف مرتبات الموظفين - ${month}/${year}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
        <style>
          @media print { 
            @page { margin: 10mm; size: auto; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { 
            font-family: 'Cairo', sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #334155;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px double #e2e8f0;
          }
          .header-info h1 { margin: 0; font-size: 24px; color: #1e293b; font-weight: 900; }
          .header-info p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
          .logo { height: 80px; width: auto; }
          
          .report-title {
            text-align: center;
            margin-bottom: 25px;
          }
          .report-title h2 { 
            display: inline-block;
            margin: 0; 
            padding: 10px 40px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 50px;
            font-size: 18px;
            color: #1e293b;
          }

          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 40px; 
            font-size: 12px;
          }
          th { 
            background-color: #f1f5f9; 
            color: #475569; 
            font-weight: 700; 
            padding: 12px 8px; 
            border: 1px solid #cbd5e1;
            text-align: center;
          }
          td { 
            padding: 10px 8px; 
            border: 1px solid #e2e8f0; 
            text-align: center;
          }
          tr:nth-child(even) { background-color: #f8fafc; }
          
          .footer {
            margin-top: 50px;
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 40px;
            text-align: center;
          }
          .signature-box {
            padding-top: 50px;
          }
          .signature-box p {
            margin: 0;
            padding-top: 10px;
            border-top: 1px solid #94a3b8;
            font-weight: 600;
            color: #475569;
          }
          .print-date {
            margin-top: 30px;
            font-size: 11px;
            color: #94a3b8;
            text-align: left;
          }
        </style>
      </head>
      <body onload="window.print()">
        <div class="header">
          <div class="header-info">
            <h1>المدار الليبي للتأمين</h1>
            <p>Al Madar Libyan Insurance</p>
            <p>قسم الشؤون المالية والموارد البشرية</p>
          </div>
          <img src="/img/logo.png" class="logo" alt="Logo">
        </div>

        <div class="report-title">
          <h2>كشف مرتبات الموظفين لشهر (${month}) سنة (${year})</h2>
        </div>

        <table>
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الأساسي</th>
              <th>سكن</th>
              <th>مواصلات</th>
              <th>اتصالات</th>
              <th>مكافآت</th>
              <th>خصومات</th>
              <th>سلف</th>
              <th>غرامات</th>
              ${allExtraLabels.map(l => `<th>${l}</th>`).join('')}
              <th>الصافي</th>
              <th>الحالة</th>
              <th>التسليم</th>
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
          <tfoot>
            <tr style="background:#f1f5f9; font-weight:900">
              <td colspan="1">الإجمالي العام</td>
              <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
              ${allExtraLabels.map(() => `<td>-</td>`).join('')}
              <td style="color:#10b981; font-size:14px">${money.format(totals.total)} د.ل</td>
              <td colspan="2">موظفين ( ${rows.length} )</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer">
          <div class="signature-box">
            <p>المحاسب المسؤول</p>
          </div>
          <div class="signature-box">
            <p>مدير الموارد البشرية</p>
          </div>
          <div class="signature-box">
            <p>المدير العام</p>
          </div>
        </div>

        <div class="print-date">
          تم استخراج هذا الكشف بتاريخ: ${new Date().toLocaleString('ar-LY')}
        </div>
      </body>
      </html>
    `);
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
              <label htmlFor="ep-payroll-search">اختيار موظف</label>
              <select
                id="ep-payroll-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              >
                <option value="">كل الموظفين</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.name}>
                    {e.name}
                  </option>
                ))}
              </select>
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
                <th>الموظف</th>
                <th>الأساسي</th>
                <th>سكن</th>
                <th>مواصلات</th>
                <th>اتصالات</th>
                <th>مكافآت</th>
                <th>خصومات</th>
                <th>سلف</th>
                <th>غرامات</th>
                {allExtraLabels.map(label => <th key={label}>{label}</th>)}
                <th>الصافي</th>
                <th>الحالة</th>
                <th>التسليم</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={13 + allExtraLabels.length} style={{ textAlign: 'center', padding: '28px 0' }}>جاري التحميل...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={13 + allExtraLabels.length} style={{ textAlign: 'center', padding: '28px 0' }}>لا توجد بيانات</td></tr>
              ) : rows.map((r) => (
                <tr key={r.e.id}>
                  <td style={{ minWidth: '120px' }}>{r.e.name}</td>
                  <td>{money.format(r.base)}</td>
                  <td>{money.format(r.housing)}</td>
                  <td>{money.format(r.transport)}</td>
                  <td>{money.format(r.communication)}</td>
                  <td>{money.format(r.bonus)}</td>
                  <td>{money.format(r.deduction)}</td>
                  <td>{money.format(r.advance)}</td>
                  <td>{money.format(r.penalty)}</td>
                  {allExtraLabels.map(label => {
                    const f = r.extra_fields.find(x => x.label === label);
                    return <td key={label}>{money.format(toNum(f ? f.amount : 0))}</td>;
                  })}
                  <td style={{ fontWeight: 800 }}>{money.format(r.net)}</td>
                  <td>{r.p?.status === 'paid' ? 'مصروف' : 'غير مصروف'}</td>
                  <td style={{ fontSize: '11px' }}>{r.p?.delivery_method === 'أخرى' ? r.p.custom_delivery_method : (r.p?.delivery_method || '-')}</td>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                <div className="form-group"><label>المرتب الثابت</label><input type="number" value={payrollForm.base_salary} onChange={(e) => setPayrollForm({ ...payrollForm, base_salary: e.target.value })} /></div>
                <div className="form-group"><label>بدل سكن</label><input type="number" value={payrollForm.housing_allowance} onChange={(e) => setPayrollForm({ ...payrollForm, housing_allowance: e.target.value })} /></div>
                <div className="form-group"><label>بدل مواصلات</label><input type="number" value={payrollForm.transportation_allowance} onChange={(e) => setPayrollForm({ ...payrollForm, transportation_allowance: e.target.value })} /></div>
                <div className="form-group"><label>بدل اتصالات</label><input type="number" value={payrollForm.communication_allowance} onChange={(e) => setPayrollForm({ ...payrollForm, communication_allowance: e.target.value })} /></div>
                <div className="form-group"><label>مكافآت</label><input type="number" value={payrollForm.bonus_amount} onChange={(e) => setPayrollForm({ ...payrollForm, bonus_amount: e.target.value })} /></div>
                
                <div className="form-group"><label style={{ color: '#ef4444' }}>خصومات</label><input type="number" value={payrollForm.deduction_amount} onChange={(e) => setPayrollForm({ ...payrollForm, deduction_amount: e.target.value })} /></div>
                <div className="form-group"><label style={{ color: '#ef4444' }}>سلف</label><input type="number" value={payrollForm.advance_amount} onChange={(e) => setPayrollForm({ ...payrollForm, advance_amount: e.target.value })} /></div>
                <div className="form-group"><label style={{ color: '#ef4444' }}>غرامات</label><input type="number" value={payrollForm.penalty_amount} onChange={(e) => setPayrollForm({ ...payrollForm, penalty_amount: e.target.value })} /></div>

                <div className="form-group">
                  <label>طريقة التسليم</label>
                  <select value={payrollForm.delivery_method} onChange={(e) => setPayrollForm({ ...payrollForm, delivery_method: e.target.value })}>
                    <option value="كاش">كاش</option>
                    <option value="حواله مصرفيه">حواله مصرفيه</option>
                    <option value="شيك">شيك</option>
                    <option value="أخرى">إضافة نوع آخر</option>
                  </select>
                </div>
                {payrollForm.delivery_method === 'أخرى' && (
                  <div className="form-group"><label>اكتب طريقة أخرى</label><input type="text" value={payrollForm.custom_delivery_method} onChange={(e) => setPayrollForm({ ...payrollForm, custom_delivery_method: e.target.value })} placeholder="مثال: تحويل بطاقة" /></div>
                )}
                <div className="form-group"><label>حالة الصرف</label><select value={payrollForm.status} onChange={(e) => setPayrollForm({ ...payrollForm, status: e.target.value as 'paid' | 'unpaid' })}><option value="unpaid">غير مصروف</option><option value="paid">مصروف</option></select></div>
              </div>

              <div style={{ marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px' }}>بنود إضافية أخرى</h4>
                  <button 
                    type="button" 
                    className="btn-submit" 
                    style={{ padding: '4px 12px', fontSize: '12px' }}
                    onClick={() => setPayrollForm({ ...payrollForm, extra_fields: [...payrollForm.extra_fields, { label: '', amount: 0 }] })}
                  >
                    <i className="fa-solid fa-plus" style={{ marginLeft: '5px' }}></i> إضافة بند
                  </button>
                </div>
                
                {payrollForm.extra_fields.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>لا توجد بنود إضافية مخصصة</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {payrollForm.extra_fields.map((field, idx) => (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px' }}>اسم البند</label>
                          <input type="text" value={field.label} placeholder="مثال: مكافأة تميز" onChange={(e) => {
                            const newFields = [...payrollForm.extra_fields];
                            newFields[idx].label = e.target.value;
                            setPayrollForm({ ...payrollForm, extra_fields: newFields });
                          }} />
                        </div>
                        <div className="form-group" style={{ margin: 0 }}>
                          <label style={{ fontSize: '11px' }}>المبلغ</label>
                          <input type="number" value={field.amount} onChange={(e) => {
                            const newFields = [...payrollForm.extra_fields];
                            newFields[idx].amount = e.target.value;
                            setPayrollForm({ ...payrollForm, extra_fields: newFields });
                          }} />
                        </div>
                        <button 
                          type="button" 
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '10px' }}
                          onClick={() => {
                            const newFields = payrollForm.extra_fields.filter((_, i) => i !== idx);
                            setPayrollForm({ ...payrollForm, extra_fields: newFields });
                          }}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '20px', padding: '15px', background: 'var(--panel)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>إجمالي الصافي للموظف:</span>
                <span style={{ fontSize: '24px', fontWeight: 900, color: '#10b981' }}>
                  {money.format(
                    toNum(payrollForm.base_salary) + 
                    toNum(payrollForm.housing_allowance) + 
                    toNum(payrollForm.transportation_allowance) + 
                    toNum(payrollForm.communication_allowance) + 
                    toNum(payrollForm.bonus_amount) + 
                    toNum(payrollForm.other_additions) + 
                    toNum(payrollForm.allowance_amount) +
                    payrollForm.extra_fields.reduce((acc, f) => acc + toNum(f.amount), 0) - 
                    toNum(payrollForm.deduction_amount) - 
                    toNum(payrollForm.advance_amount) - 
                    toNum(payrollForm.penalty_amount)
                  )} د.ل
                </span>
              </div>

              <div className="form-group" style={{ marginTop: '15px' }}><label>ملاحظات</label><textarea rows={2} value={payrollForm.notes} onChange={(e) => setPayrollForm({ ...payrollForm, notes: e.target.value })} /></div>
              
              <div className="form-actions" style={{ marginTop: '20px' }}>
                <button className="btn-cancel" onClick={() => setPayrollForm(null)}>إلغاء</button>
                <button className="btn-submit" onClick={savePayroll} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ بيان المرتب'}</button>
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
