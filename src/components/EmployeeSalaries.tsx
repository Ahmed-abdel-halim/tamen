import { useEffect, useMemo, useState } from 'react';
import { showToast } from './Toast';
import { API_BASE_URL } from "../config/api";
import { generatePremiumExcel } from '../utils/excelGenerator';

type Employee = {
  id: number;
  username: string;
  name: string;
  email?: string;
  salary?: number | string | null;
  tax_percentage?: number | string;
  social_security_percentage?: number | string;
  apply_tax?: boolean;
  apply_social_security?: boolean;
  housing_allowance?: number | string | null;
  transportation_allowance?: number | string | null;
  communication_allowance?: number | string | null;
  fixed_bonuses?: number | string | null;
  fixed_fines?: number | string | null;
  start_date?: string | null;
  end_date?: string | null;
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
  tax_amount: number | string;
  social_security_amount: number | string;
  deduction_amount: number | string;
  advance_amount: number | string;
  net_salary: number | string;
  status: 'paid' | 'unpaid';
  delivery_method: string;
  custom_delivery_method?: string | null;
  extra_fields?: { label: string; amount: number }[] | null;
  paid_at?: string | null;
  notes?: string | null;
  user?: Employee;
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

/**
 * يتحقق إذا كان الموظف نشطاً في الشهر/السنة المحددة:
 * - start_date يجب أن يكون قبل أو في نفس الشهر المحدد
 * - end_date إما فارغ (لا يزال موظفاً) أو بعد بداية الشهر المحدد
 */
const isEmployeeActiveInPeriod = (emp: Employee, year: number, month: number): boolean => {
  // بداية الشهر المحدد
  const periodStart = new Date(year, month - 1, 1);
  // نهاية الشهر المحدد
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  if (emp.start_date) {
    const startDate = new Date(emp.start_date);
    // إذا كان تاريخ التعيين بعد نهاية الشهر المحدد، لا يُدرج
    if (startDate > periodEnd) return false;
  }

  if (emp.end_date) {
    const endDate = new Date(emp.end_date);
    // إذا كان تاريخ انهاء العمل قبل بداية الشهر المحدد، لا يُدرج
    if (endDate < periodStart) return false;
  }

  return true;
};

const formatDateToDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
};

const CustomDatePicker = ({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (val: string) => void;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          opacity: 0,
          cursor: 'pointer',
          zIndex: 2,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          height: '42px',
          borderRadius: '10px',
          border: isFocused ? '1px solid var(--accent)' : '1px solid var(--border)',
          boxShadow: isFocused ? '0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)' : 'none',
          background: 'var(--input-bg)',
          color: 'var(--text)',
          padding: '0 12px',
          fontSize: '0.95rem',
          pointerEvents: 'none',
          position: 'relative',
          zIndex: 1,
          transition: 'all 0.2s ease',
          direction: 'ltr',
        }}
      >
        <span>{formatDateToDisplay(value)}</span>
        <i className="fa-regular fa-calendar" style={{ color: 'var(--muted)' }}></i>
      </div>
    </div>
  );
};

export default function EmployeeSalaries() {
  const now = new Date();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkPaying, setBulkPaying] = useState(false);
  const [query, setQuery] = useState('');
  const [hireFrom, setHireFrom] = useState<string>('');
  const [hireTo, setHireTo] = useState<string>('');
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [status, setStatus] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [historyFor, setHistoryFor] = useState<Employee | null>(null);
  const [history, setHistory] = useState<SalaryHistory[]>([]);

  // States for Range reports
  const [activeView, setActiveView] = useState<'monthly' | 'range_reports'>('monthly');
  const [rangeEmployeeId, setRangeEmployeeId] = useState<string>('');
  const [rangeFromDate, setRangeFromDate] = useState<string>(
    new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  );
  const [rangeToDate, setRangeToDate] = useState<string>(
    now.toISOString().split('T')[0]
  );
  const [rangeReportPayrolls, setRangeReportPayrolls] = useState<Payroll[]>([]);
  const [rangeReportLoading, setRangeReportLoading] = useState<boolean>(false);

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
      const token = localStorage.getItem('token');
      const headers = {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const [employeesRes, payrollsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/employee-payrolls/employees?year=${year}&month=${month}`, { headers }),
        fetch(`${API_BASE_URL}/employee-payrolls?year=${year}&month=${month}${status !== 'all' ? `&status=${status}` : ''}`, { headers }),
      ]);
      const employeesData = await employeesRes.json();
      const payrollsData = await payrollsRes.json();
      setEmployees(Array.isArray(employeesData) ? employeesData.map((emp: any) => ({ ...emp, id: Number(emp.id) })) : []);
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

  const fetchRangeReport = async () => {
    setRangeReportLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const params = new URLSearchParams();
      if (rangeEmployeeId) params.append('user_id', rangeEmployeeId);
      if (rangeFromDate) params.append('from_date', rangeFromDate);
      if (rangeToDate) params.append('to_date', rangeToDate);

      const res = await fetch(`${API_BASE_URL}/employee-payrolls?${params.toString()}`, { headers });
      if (!res.ok) {
        throw new Error('فشل تحميل تقرير الفترة');
      }
      const data = await res.json();
      setRangeReportPayrolls(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error?.message || 'حدث خطأ أثناء تحميل تقرير الفترة', 'error');
    } finally {
      setRangeReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'range_reports') {
      fetchRangeReport();
    }
  }, [activeView, rangeEmployeeId, rangeFromDate, rangeToDate]);

  const payrollMap = useMemo(() => {
    const map = new Map<number, Payroll>();
    payrolls.forEach((p) => map.set(Number(p.user_id), p));
    return map;
  }, [payrolls]);

  const filteredEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter((e) => {
      // فلترة بناءً على تاريخ التعيين وانهاء العمل
      if (!isEmployeeActiveInPeriod(e, year, month)) return false;
      
      // فلترة بتاريخ التعيين
      if (hireFrom || hireTo) {
        if (!e.start_date) return false;
        const sDate = new Date(e.start_date);
        sDate.setHours(0, 0, 0, 0);
        if (hireFrom) {
          const fDate = new Date(`${hireFrom}T00:00:00`);
          if (sDate < fDate) return false;
        }
        if (hireTo) {
          const tDate = new Date(`${hireTo}T23:59:59`);
          if (sDate > tDate) return false;
        }
      }

      // فلترة بناءً على البحث
      return !q || e.name.toLowerCase().includes(q) || e.username.toLowerCase().includes(q);
    });
  }, [employees, query, year, month, hireFrom, hireTo]);

  // الموظفون النشطون فقط لعرضهم في الـ dropdown
  const activeEmployeesForDropdown = useMemo(() => {
    return employees.filter((e) => isEmployeeActiveInPeriod(e, year, month));
  }, [employees, year, month]);

  const rows = filteredEmployees.map((e) => {
    const p = payrollMap.get(e.id);
    const base = p ? toNum(p.base_salary) : toNum(e.salary);
    const housing = p ? toNum(p.housing_allowance) : toNum(e.housing_allowance);
    const transport = p ? toNum(p.transportation_allowance) : toNum(e.transportation_allowance);
    const communication = p ? toNum(p.communication_allowance) : toNum(e.communication_allowance);
    const misc = p ? toNum(p.allowance_amount) : 0;
    const bonus = p ? toNum(p.bonus_amount) : toNum(e.fixed_bonuses);
    const other = p ? toNum(p.other_additions) : 0;
    const deduction = p ? toNum(p.deduction_amount) : toNum(e.fixed_fines);
    const advance = p ? toNum(p.advance_amount) : 0;
    const penalty = p ? toNum(p.penalty_amount) : 0;

    const extra_fields = (p && p.extra_fields) ? p.extra_fields : [];
    const extra_total = extra_fields.reduce((acc, f) => acc + toNum(f.amount), 0);

    const tax_pct = toNum(e.tax_percentage || 10);
    const ss_pct = toNum(e.social_security_percentage || 19.475);

    // التحقق من خيارات التطبيق
    const isTaxApplied = e.apply_tax !== false;
    const isSSApplied = e.apply_social_security !== false;

    // إذا كانت القيمة في قاعدة البيانات 0 والمرتب لم يصرف بعد، نعرض القيمة المحسوبة تلقائياً مع احترام الخيارات
    const tax_val = (p && toNum(p.tax_amount) > 0) ? toNum(p.tax_amount) : (isTaxApplied ? (base * tax_pct / 100) : 0);
    const ss_val = (p && toNum(p.social_security_amount) > 0) ? toNum(p.social_security_amount) : (isSSApplied ? (base * ss_pct / 100) : 0);

    // حساب الصافي بناءً على القيم المعروضة لضمان الدقة في العرض
    const net = (base + housing + transport + communication + bonus + other + misc + extra_total - deduction - advance - penalty - tax_val - ss_val);

    return { e, p, base, housing, transport, communication, misc, bonus, other, deduction, advance, penalty, tax_val, ss_val, extra_fields, extra_total, net };
  });

  const allExtraLabels = useMemo(() => {
    const labels = new Set<string>();
    rows.forEach(r => r.extra_fields.forEach(f => { if (f.label) labels.add(f.label); }));
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/employee-payrolls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users/${employee.id}/salary-history`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
  };

  const handleExportCsv = async () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const columns = [
        { header: 'الموظف', key: 'name', width: 30 },
        { header: 'تاريخ التعيين', key: 'start_date', width: 18 },
        { header: 'الأساسي', key: 'base', width: 15 },
        { header: 'سكن', key: 'housing', width: 12 },
        { header: 'مواصلات', key: 'transport', width: 12 },
        { header: 'اتصالات', key: 'communication', width: 12 },
        { header: 'مكافآت', key: 'bonus', width: 12 },
        { header: 'ضرائب', key: 'tax', width: 12 },
        { header: 'ضمان', key: 'ss', width: 12 },
        { header: 'خصومات', key: 'deduction', width: 12 },
        { header: 'سلف', key: 'advance', width: 12 },
        { header: 'غرامات', key: 'penalty', width: 12 },
        ...allExtraLabels.map(l => ({ header: l, key: `extra_${l}`, width: 15 })),
        { header: 'الصافي', key: 'net', width: 20 },
        { header: 'الحالة', key: 'status', width: 15 },
        { header: 'التسليم', key: 'delivery', width: 20 },
      ];

      const data = rows.map((r) => {
        const rowData: any = {
          name: r.e.name,
          start_date: r.e.start_date ? new Date(r.e.start_date).toLocaleDateString('ar-LY') : '—',
          base: r.base,
          housing: r.housing,
          transport: r.transport,
          communication: r.communication,
          bonus: r.bonus,
          tax: r.tax_val.toFixed(2),
          ss: r.ss_val.toFixed(2),
          deduction: r.deduction,
          advance: r.advance,
          penalty: r.penalty,
          net: r.net.toLocaleString() + ' د.ل',
          status: r.p?.status === 'paid' ? 'مصروف' : 'غير مصروف',
          delivery: r.p?.delivery_method === 'أخرى' ? r.p.custom_delivery_method || 'أخرى' : (r.p?.delivery_method || '-'),
        };

        allExtraLabels.forEach(label => {
          const f = r.extra_fields.find(x => x.label === label);
          rowData[`extra_${label}`] = f ? f.amount : 0;
        });

        return rowData;
      });

      // Summary row
      const summaryRow: any = {
        name: 'الإجمالي الكلي',
        start_date: '',
        base: '',
        housing: '',
        transport: '',
        communication: '',
        bonus: '',
        tax: '',
        ss: '',
        deduction: '',
        advance: '',
        penalty: '',
        net: totals.total.toLocaleString() + ' د.ل',
        status: `${rows.length} موظف`,
        delivery: '',
      };
      data.push(summaryRow);

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - كشف مرتبات الموظفين',
        subtitle: `كشف مرتبات شهر (${month}) سنة (${year}) - إجمالي الصافي: ${totals.total.toLocaleString()} د.ل`,
        columns,
        data,
        fileName: `مرتبات_${month}_${year}`,
        qrData: `كشف المرتبات - المدار الليبي\nالشهر: ${month}/${year}\nعدد الموظفين: ${rows.length}\nالإجمالي: ${totals.total.toLocaleString()} د.ل\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير الكشف المتميز بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
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
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/employee-payrolls/bulk-pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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
        <td style="font-size:10px;color:#64748b">${r.e.start_date ? new Date(r.e.start_date).toLocaleDateString('ar-LY') : '—'}</td>
        <td>${money.format(r.base)}</td>
        <td style="color:#10b981">${money.format(r.housing)}</td>
        <td style="color:#10b981">${money.format(r.transport)}</td>
        <td style="color:#10b981">${money.format(r.communication)}</td>
        <td style="color:#10b981">${money.format(r.bonus)}</td>
        <td style="color:#ef4444">${money.format(r.tax_val)}</td>
        <td style="color:#ef4444">${money.format(r.ss_val)}</td>
        <td style="color:#ef4444">${money.format(r.deduction)}</td>
        <td style="color:#ef4444">${money.format(r.advance)}</td>
        <td style="color:#ef4444">${money.format(r.penalty)}</td>
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
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          @media print { 
            @page { margin: 8mm; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { 
            font-family: 'Cairo', sans-serif; 
            margin: 0; 
            padding: 15px; 
            color: #1e293b;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 3px double #1a365d;
          }
          .header-right {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .header-left {
            text-align: left;
            font-size: 13px;
            color: #1a365d;
            font-weight: 600;
          }
          .header-info h1 { margin: 0; font-size: 22px; color: #1a365d; font-weight: 900; line-height: 1.2; }
          .header-info p { margin: 2px 0; color: #4a5568; font-size: 14px; }
          .logo { height: 75px; width: 75px; object-fit: contain; }
          
          .report-title-container {
            text-align: center;
            margin: 15px 0;
          }
          .report-title-pill { 
            display: inline-block;
            padding: 8px 50px;
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 50px;
            font-size: 19px;
            font-weight: 700;
            color: #1a365d;
          }

          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 25px; 
            font-size: 11px;
          }
          th { 
            background-color: #f1f5f9; 
            color: #1e293b; 
            font-weight: 700; 
            padding: 10px 4px; 
            border: 1px solid #1a365d;
            text-align: center;
          }
          td { 
            padding: 8px 4px; 
            border: 1px solid #cbd5e1; 
            text-align: center;
            vertical-align: middle;
          }
          tr:nth-child(even) { background-color: #f8fafc; }
          
          .footer-signatures {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            padding: 0 30px;
          }
          .sig-box {
            width: 220px;
            text-align: center;
          }
          .sig-line {
            border-top: 1.5px solid #1a365d;
            margin-bottom: 8px;
          }
          .sig-label {
            font-weight: 700;
            font-size: 15px;
            color: #1a365d;
          }
          .print-meta {
            margin-top: 30px;
            font-size: 11px;
            text-align: left;
          }
        </style>
      </head>
      <body onload="window.print()">
        <div class="header">
          <div class="header-right">
            <img src="/img/logo.png" style="height: 85px; width: auto;" alt="Logo">
            <div class="header-info" style="margin-right: 15px;">
              <h1 style="font-size: 20px; margin-bottom: 2px;">المدار الليبي للتأمين</h1>
              <p><strong>قسم الشؤون المالية والموارد البشرية</strong></p>
            </div>
          </div>
          <div class="header-left">
            التاريخ: ${new Date().toLocaleDateString('ar-LY')}<br/>
            الوقت: ${new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div class="report-title">
          <h2>كشف مرتبات الموظفين لشهر (${month}) سنة (${year})</h2>
        </div>

        <table>
          <thead>
            <tr>
              <th>الموظف</th>
              <th>تاريخ التعيين</th>
              <th>الأساسي</th>
              <th>سكن</th>
              <th>مواصلات</th>
              <th>اتصالات</th>
              <th>مكافآت</th>
              <th>ضرائب</th>
              <th>ضمان</th>
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
              <td colspan="2">الإجمالي العام</td>
              <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
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

  const handleRangeReportPrint = () => {
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) return;

    let employeeName = 'كل الموظفين';
    if (rangeEmployeeId) {
      const emp = employees.find(e => e.id.toString() === rangeEmployeeId);
      if (emp) employeeName = emp.name;
    }

    const bodyRows = rangeReportPayrolls
      .map(
        (p) => {
          const empName = p.user?.name || (p.user_id ? (employees.find(e => e.id === p.user_id)?.name || '—') : '—');
          const base = toNum(p.base_salary);
          const housing = toNum(p.housing_allowance);
          const transport = toNum(p.transportation_allowance);
          const communication = toNum(p.communication_allowance);
          const bonus = toNum(p.bonus_amount);
          const deduction = toNum(p.deduction_amount);
          const advance = toNum(p.advance_amount);
          const penalty = toNum(p.penalty_amount);
          const tax = toNum(p.tax_amount);
          const ss = toNum(p.social_security_amount);
          const net = toNum(p.net_salary);

          return `
            <tr>
              <td style="font-weight:bold">${empName}</td>
              <td>${p.month}/${p.year}</td>
              <td>${money.format(base)}</td>
              <td style="color:#10b981">${money.format(housing)}</td>
              <td style="color:#10b981">${money.format(transport)}</td>
              <td style="color:#10b981">${money.format(communication)}</td>
              <td style="color:#10b981">${money.format(bonus)}</td>
              <td style="color:#ef4444">${money.format(tax)}</td>
              <td style="color:#ef4444">${money.format(ss)}</td>
              <td style="color:#ef4444">${money.format(deduction)}</td>
              <td style="color:#ef4444">${money.format(advance)}</td>
              <td style="color:#ef4444">${money.format(penalty)}</td>
              <td style="font-weight:bold; color:#1e293b">${money.format(net)}</td>
              <td>${p.status === 'paid' ? 'مصروف' : 'غير مصروف'}</td>
              <td style="font-size:10px">${p.paid_at ? new Date(p.paid_at).toLocaleDateString('ar-LY') : '—'}</td>
              <td style="font-size:11px">${p.delivery_method === 'أخرى' ? p.custom_delivery_method || 'أخرى' : (p.delivery_method || '-')}</td>
            </tr>`;
        }
      )
      .join('');

    const rangeReportTotals = rangeReportPayrolls.reduce(
      (acc, p) => {
        acc.total += toNum(p.net_salary);
        return acc;
      },
      { total: 0 }
    );

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>تقرير مرتبات الموظفين بالفترة - ${rangeFromDate} إلى ${rangeToDate}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          @media print { 
            @page { margin: 8mm; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { 
            font-family: 'Cairo', sans-serif; 
            margin: 0; 
            padding: 15px; 
            color: #1e293b;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 3px double #1a365d;
          }
          .header-right {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .header-left {
            text-align: left;
            font-size: 13px;
            color: #1a365d;
            font-weight: 600;
          }
          .header-info h1 { margin: 0; font-size: 22px; color: #1a365d; font-weight: 900; line-height: 1.2; }
          .header-info p { margin: 2px 0; color: #4a5568; font-size: 14px; }
          
          .report-title {
            text-align: center;
            margin: 15px 0;
          }
          .report-title h2 {
            font-size: 18px;
            color: #1a365d;
            font-weight: 900;
          }

          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 25px; 
            font-size: 10px;
          }
          th { 
            background-color: #f1f5f9; 
            color: #1e293b; 
            font-weight: 700; 
            padding: 10px 4px; 
            border: 1px solid #1a365d;
            text-align: center;
          }
          td { 
            padding: 8px 4px; 
            border: 1px solid #cbd5e1; 
            text-align: center;
            vertical-align: middle;
          }
          tr:nth-child(even) { background-color: #f8fafc; }
          
          .footer {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            width: 200px;
            text-align: center;
            border-top: 1.5px solid #1a365d;
            padding-top: 8px;
            font-weight: 700;
            color: #1a365d;
          }
          .print-date {
            margin-top: 30px;
            font-size: 11px;
            text-align: left;
            color: #64748b;
          }
        </style>
      </head>
      <body onload="window.print()">
        <div class="header">
          <div class="header-right">
            <img src="/img/logo.png" style="height: 85px; width: auto;" alt="Logo" onerror="this.src='/img/official_logo.PNG'">
            <div class="header-info" style="margin-right: 15px;">
              <h1 style="font-size: 20px; margin-bottom: 2px;">المدار الليبي للتأمين</h1>
              <p><strong>قسم الشؤون المالية والموارد البشرية</strong></p>
            </div>
          </div>
          <div class="header-left">
            التاريخ: ${new Date().toLocaleDateString('ar-LY')}<br/>
            الوقت: ${new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div class="report-title">
          <h2>تقرير رواتب الموظفين للفترة من (${formatDateToDisplay(rangeFromDate)}) إلى (${formatDateToDisplay(rangeToDate)})</h2>
          <p style="margin: 5px 0; font-weight: bold; color: #4a5568;">الموظف: ${employeeName}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>الموظف</th>
              <th>الشهر/السنة</th>
              <th>الأساسي</th>
              <th>سكن</th>
              <th>مواصلات</th>
              <th>اتصالات</th>
              <th>مكافآت</th>
              <th>ضرائب</th>
              <th>ضمان</th>
              <th>خصومات</th>
              <th>سلف</th>
              <th>غرامات</th>
              <th>الصافي</th>
              <th>الحالة</th>
              <th>تاريخ الصرف</th>
              <th>التسليم</th>
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
          <tfoot>
            <tr style="background:#f1f5f9; font-weight:900">
              <td colspan="2">الإجمالي العام</td>
              <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td>
              <td style="color:#10b981; font-size:13px">${money.format(rangeReportTotals.total)} د.ل</td>
              <td colspan="3">سجلات الرواتب ( ${rangeReportPayrolls.length} )</td>
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
          تم استخراج هذا التقرير بتاريخ: ${new Date().toLocaleString('ar-LY')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleRangeReportExportExcel = async () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    let employeeName = 'كل الموظفين';
    if (rangeEmployeeId) {
      const emp = employees.find(e => e.id.toString() === rangeEmployeeId);
      if (emp) employeeName = emp.name;
    }

    try {
      const columns = [
        { header: 'الموظف', key: 'name', width: 30 },
        { header: 'الشهر/السنة', key: 'period', width: 15 },
        { header: 'الأساسي', key: 'base', width: 15 },
        { header: 'سكن', key: 'housing', width: 12 },
        { header: 'مواصلات', key: 'transport', width: 12 },
        { header: 'اتصالات', key: 'communication', width: 12 },
        { header: 'مكافآت', key: 'bonus', width: 12 },
        { header: 'ضرائب', key: 'tax', width: 12 },
        { header: 'ضمان', key: 'ss', width: 12 },
        { header: 'خصومات', key: 'deduction', width: 12 },
        { header: 'سلف', key: 'advance', width: 12 },
        { header: 'غرامات', key: 'penalty', width: 12 },
        { header: 'الصافي', key: 'net', width: 20 },
        { header: 'الحالة', key: 'status', width: 15 },
        { header: 'تاريخ الصرف', key: 'paid_at', width: 18 },
        { header: 'التسليم', key: 'delivery', width: 20 },
      ];

      const data = rangeReportPayrolls.map((p) => {
        const empName = p.user?.name || (p.user_id ? (employees.find(e => e.id === p.user_id)?.name || '—') : '—');
        return {
          name: empName,
          period: `${p.month}/${p.year}`,
          base: toNum(p.base_salary),
          housing: toNum(p.housing_allowance),
          transport: toNum(p.transportation_allowance),
          communication: toNum(p.communication_allowance),
          bonus: toNum(p.bonus_amount),
          tax: toNum(p.tax_amount).toFixed(2),
          ss: toNum(p.social_security_amount).toFixed(2),
          deduction: toNum(p.deduction_amount),
          advance: toNum(p.advance_amount),
          penalty: toNum(p.penalty_amount),
          net: toNum(p.net_salary).toLocaleString() + ' د.ل',
          status: p.status === 'paid' ? 'مصروف' : 'غير مصروف',
          paid_at: p.paid_at ? new Date(p.paid_at).toLocaleDateString('ar-LY') : '—',
          delivery: p.delivery_method === 'أخرى' ? p.custom_delivery_method || 'أخرى' : (p.delivery_method || '-'),
        };
      });

      const rangeReportTotals = rangeReportPayrolls.reduce(
        (acc, p) => {
          acc.total += toNum(p.net_salary);
          return acc;
        },
        { total: 0 }
      );

      const summaryRow: any = {
        name: 'الإجمالي الكلي',
        period: '',
        base: '',
        housing: '',
        transport: '',
        communication: '',
        bonus: '',
        tax: '',
        ss: '',
        deduction: '',
        advance: '',
        penalty: '',
        net: rangeReportTotals.total.toLocaleString() + ' د.ل',
        status: `${rangeReportPayrolls.length} سجل رواتب`,
        paid_at: '',
        delivery: '',
      };
      data.push(summaryRow);

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير رواتب الموظفين بالفترة',
        subtitle: `الفترة من (${formatDateToDisplay(rangeFromDate)}) إلى (${formatDateToDisplay(rangeToDate)}) - الموظف: ${employeeName} - إجمالي الصافي: ${rangeReportTotals.total.toLocaleString()} د.ل`,
        columns,
        data,
        fileName: `تقرير_الرواتب_${rangeFromDate}_إلى_${rangeToDate}`,
        qrData: `تقرير الرواتب - المدار الليبي\nالفترة: ${formatDateToDisplay(rangeFromDate)} إلى ${formatDateToDisplay(rangeToDate)}\nالموظف: ${employeeName}\nالإجمالي: ${rangeReportTotals.total.toLocaleString()} د.ل\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير تقرير الفترة بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  return (
    <section className="users-management animate-fade-in">
      <div className="users-breadcrumb"><span>الشؤون المالية / مرتبات الموظفين</span></div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveView('monthly')}
          className={`tab-btn ${activeView === 'monthly' ? 'active' : ''}`}
          style={{
            width: 'auto',
            padding: '10px 24px',
            borderRadius: '12px',
            border: activeView === 'monthly' ? '2px solid #1e40af' : '1px solid #e2e8f0',
            background: activeView === 'monthly' ? '#eff6ff' : 'white',
            color: activeView === 'monthly' ? '#1e40af' : '#64748b',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.95rem',
            boxShadow: activeView === 'monthly' ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-calendar-days" style={{ color: activeView === 'monthly' ? '#1e40af' : '#64748b' }}></i>
          مسير المرتبات الشهري
        </button>
        <button
          onClick={() => setActiveView('range_reports')}
          className={`tab-btn ${activeView === 'range_reports' ? 'active' : ''}`}
          style={{
            width: 'auto',
            padding: '10px 24px',
            borderRadius: '12px',
            border: activeView === 'range_reports' ? '2px solid #1e40af' : '1px solid #e2e8f0',
            background: activeView === 'range_reports' ? '#eff6ff' : 'white',
            color: activeView === 'range_reports' ? '#1e40af' : '#64748b',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.95rem',
            boxShadow: activeView === 'range_reports' ? '0 4px 12px rgba(59, 130, 246, 0.15)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <i className="fa-solid fa-chart-line" style={{ color: activeView === 'range_reports' ? '#1e40af' : '#64748b' }}></i>
          تقارير الرواتب بالفترات
        </button>
      </div>

      {activeView === 'monthly' ? (
        <>
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
                    {activeEmployeesForDropdown.map((e) => (
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
                <div className="ep-field">
                  <label htmlFor="ep-hire-from">تعيين من تاريخ</label>
                  <CustomDatePicker
                    id="ep-hire-from"
                    value={hireFrom}
                    onChange={setHireFrom}
                  />
                </div>
                <div className="ep-field">
                  <label htmlFor="ep-hire-to">تعيين إلى تاريخ</label>
                  <CustomDatePicker
                    id="ep-hire-to"
                    value={hireTo}
                    onChange={setHireTo}
                  />
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
                    <th>تاريخ التعيين</th>
                    <th>الأساسي</th>
                    <th style={{ color: '#10b981' }}>سكن</th>
                    <th style={{ color: '#10b981' }}>مواصلات</th>
                    <th style={{ color: '#10b981' }}>اتصالات</th>
                    <th style={{ color: '#10b981' }}>مكافآت</th>
                    <th style={{ color: '#ef4444' }}>ضرائب</th>
                    <th style={{ color: '#ef4444' }}>ضمان</th>
                    <th style={{ color: '#ef4444' }}>خصومات</th>
                    <th style={{ color: '#ef4444' }}>سلف</th>
                    <th style={{ color: '#ef4444' }}>غرامات</th>
                    {allExtraLabels.map(label => <th key={label}>{label}</th>)}
                    <th>الصافي</th>
                    <th>الحالة</th>
                    <th>التسليم</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={15 + allExtraLabels.length} style={{ textAlign: 'center', padding: '28px 0' }}>جاري التحميل...</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={15 + allExtraLabels.length} style={{ textAlign: 'center', padding: '28px 0' }}>لا توجد بيانات</td></tr>
                  ) : rows.map((r) => (
                    <tr key={r.e.id}>
                      <td style={{ minWidth: '120px' }}>{r.e.name}</td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>{r.e.start_date ? new Date(r.e.start_date).toLocaleDateString('ar-LY') : '—'}</td>
                      <td>{money.format(r.base)}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{money.format(r.housing)}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{money.format(r.transport)}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{money.format(r.communication)}</td>
                      <td style={{ color: '#10b981', fontWeight: 600 }}>{money.format(r.bonus)}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{money.format(r.tax_val)}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{money.format(r.ss_val)}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{money.format(r.deduction)}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{money.format(r.advance)}</td>
                      <td style={{ color: '#ef4444', fontWeight: 600 }}>{money.format(r.penalty)}</td>
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
        </>
      ) : (
        <>
          <div className="users-card" style={{ marginBottom: '16px' }}>
            <div className="ep-payroll-toolbar">
              <div className="ep-payroll-toolbar-head">
                <h2 className="ep-payroll-toolbar-title">تقرير الرواتب بالفترة</h2>
                <p className="ep-payroll-toolbar-hint">استعرض إحصائيات ورواتب الموظفين خلال فترة محددة</p>
              </div>
              <div className="ep-payroll-fields">
                <div className="ep-field">
                  <label htmlFor="range-employee">الموظف</label>
                  <select
                    id="range-employee"
                    value={rangeEmployeeId}
                    onChange={(e) => setRangeEmployeeId(e.target.value)}
                  >
                    <option value="">كل الموظفين</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ep-field">
                  <label htmlFor="range-from">من تاريخ</label>
                  <CustomDatePicker
                    id="range-from"
                    value={rangeFromDate}
                    onChange={setRangeFromDate}
                  />
                </div>
                <div className="ep-field">
                  <label htmlFor="range-to">إلى تاريخ</label>
                  <CustomDatePicker
                    id="range-to"
                    value={rangeToDate}
                    onChange={setRangeToDate}
                  />
                </div>
              </div>
              <div className="ep-payroll-actions">
                <button className="btn-submit" type="button" onClick={handleRangeReportExportExcel}>
                  <i className="fa-solid fa-file-excel"></i>
                  تصدير Excel
                </button>
                <button className="btn-submit" type="button" onClick={handleRangeReportPrint}>
                  <i className="fa-solid fa-print"></i>
                  طباعة التقرير
                </button>
                <button className="btn-submit" type="button" onClick={fetchRangeReport} disabled={rangeReportLoading}>
                  <i className="fa-solid fa-rotate"></i>
                  {rangeReportLoading ? 'جاري التحديث...' : 'تحديث البيانات'}
                </button>
              </div>
            </div>
          </div>

          <div className="users-card" style={{ marginBottom: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(160px, 1fr))', gap: '12px' }}>
              <div><strong>عدد سجلات الصرف:</strong> {rangeReportPayrolls.length}</div>
              <div>
                <strong>متوسط الرواتب:</strong> {money.format(
                  rangeReportPayrolls.length > 0
                    ? (rangeReportPayrolls.reduce((sum, p) => sum + toNum(p.net_salary), 0) / rangeReportPayrolls.length)
                    : 0
                )} د.ل
              </div>
              <div>
                <strong>إجمالي الصافي الموزع:</strong> {money.format(
                  rangeReportPayrolls.reduce((sum, p) => sum + toNum(p.net_salary), 0)
                )} د.ل
              </div>
            </div>
          </div>

          <div className="users-card">
            <div className="table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>الموظف</th>
                    <th>الشهر/السنة</th>
                    <th>الأساسي</th>
                    <th style={{ color: '#10b981' }}>سكن</th>
                    <th style={{ color: '#10b981' }}>مواصلات</th>
                    <th style={{ color: '#10b981' }}>اتصالات</th>
                    <th style={{ color: '#10b981' }}>مكافآت</th>
                    <th style={{ color: '#ef4444' }}>ضرائب</th>
                    <th style={{ color: '#ef4444' }}>ضمان</th>
                    <th style={{ color: '#ef4444' }}>خصومات</th>
                    <th style={{ color: '#ef4444' }}>سلف</th>
                    <th style={{ color: '#ef4444' }}>غرامات</th>
                    <th>الصافي</th>
                    <th>الحالة</th>
                    <th>تاريخ الصرف</th>
                    <th>التسليم</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {rangeReportLoading ? (
                    <tr><td colSpan={17} style={{ textAlign: 'center', padding: '28px 0' }}>جاري التحميل...</td></tr>
                  ) : rangeReportPayrolls.length === 0 ? (
                    <tr><td colSpan={17} style={{ textAlign: 'center', padding: '28px 0' }}>لا توجد بيانات للفترة المحددة</td></tr>
                  ) : rangeReportPayrolls.map((p) => {
                    const emp = p.user || employees.find((e) => e.id === p.user_id);
                    return (
                      <tr key={p.id}>
                        <td style={{ minWidth: '120px' }}>{emp?.name || '—'}</td>
                        <td>{p.month} / {p.year}</td>
                        <td>{money.format(toNum(p.base_salary))}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{money.format(toNum(p.housing_allowance))}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{money.format(toNum(p.transportation_allowance))}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{money.format(toNum(p.communication_allowance))}</td>
                        <td style={{ color: '#10b981', fontWeight: 600 }}>{money.format(toNum(p.bonus_amount))}</td>
                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{money.format(toNum(p.tax_amount))}</td>
                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{money.format(toNum(p.social_security_amount))}</td>
                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{money.format(toNum(p.deduction_amount))}</td>
                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{money.format(toNum(p.advance_amount))}</td>
                        <td style={{ color: '#ef4444', fontWeight: 600 }}>{money.format(toNum(p.penalty_amount))}</td>
                        <td style={{ fontWeight: 800 }}>{money.format(toNum(p.net_salary))}</td>
                        <td>{p.status === 'paid' ? 'مصروف' : 'غير مصروف'}</td>
                        <td style={{ fontSize: '11px' }}>{p.paid_at ? new Date(p.paid_at).toLocaleDateString('ar-LY') : '—'}</td>
                        <td style={{ fontSize: '11px' }}>{p.delivery_method === 'أخرى' ? p.custom_delivery_method : (p.delivery_method || '-')}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="action-btn" onClick={() => emp && openHistory(emp)} title="سجل المرتب"><i className="fa-solid fa-clock-rotate-left"></i></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

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
                <div className="form-group"><label>إضافات أخرى</label><input type="number" value={payrollForm.other_additions} onChange={(e) => setPayrollForm({ ...payrollForm, other_additions: e.target.value })} /></div>

                <div className="form-group">
                  <label style={{ color: '#ef4444' }}>
                    ضرائب (%{employees.find(e => e.id === payrollForm.user_id)?.tax_percentage || 10})
                    {employees.find(e => e.id === payrollForm.user_id)?.apply_tax === false && ' (غير منطبقة)'}
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    style={{ backgroundColor: '#fef2f2', color: '#ef4444', fontWeight: 'bold', opacity: employees.find(e => e.id === payrollForm.user_id)?.apply_tax === false ? 0.5 : 1 }}
                    value={money.format(
                      employees.find(e => e.id === payrollForm.user_id)?.apply_tax !== false 
                      ? (toNum(payrollForm.base_salary) * toNum(employees.find(e => e.id === payrollForm.user_id)?.tax_percentage || 10) / 100)
                      : 0
                    )}
                  />
                </div>

                <div className="form-group">
                  <label style={{ color: '#ef4444' }}>
                    ضمان (%{employees.find(e => e.id === payrollForm.user_id)?.social_security_percentage || 19.475})
                    {employees.find(e => e.id === payrollForm.user_id)?.apply_social_security === false && ' (غير منطبق)'}
                  </label>
                  <input
                    type="text"
                    readOnly
                    disabled
                    style={{ backgroundColor: '#fef2f2', color: '#ef4444', fontWeight: 'bold', opacity: employees.find(e => e.id === payrollForm.user_id)?.apply_social_security === false ? 0.5 : 1 }}
                    value={money.format(
                      employees.find(e => e.id === payrollForm.user_id)?.apply_social_security !== false
                      ? (toNum(payrollForm.base_salary) * toNum(employees.find(e => e.id === payrollForm.user_id)?.social_security_percentage || 19.475) / 100)
                      : 0
                    )}
                  />
                </div>

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
                    (toNum(payrollForm.base_salary) * toNum(employees.find(e => e.id === payrollForm.user_id)?.tax_percentage || 10) / 100) -
                    (toNum(payrollForm.base_salary) * toNum(employees.find(e => e.id === payrollForm.user_id)?.social_security_percentage || 19.475) / 100) -
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
