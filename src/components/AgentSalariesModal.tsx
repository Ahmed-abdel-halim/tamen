import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

interface AgentSalariesModalProps {
  agent: {
    id: number;
    code: string;
    agency_name: string;
    agent_name: string;
    type?: string;
    contract_date?: string | null;
  };
  onClose: () => void;
}

interface EmployeeItem {
  id: number;
  name: string;
  username: string;
  email?: string;
  job_title?: string;
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
  branch_agent_id?: number | null;
}

interface PayrollItem {
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
}

const money = (v: unknown) => {
  const n = Number(v ?? 0);
  return (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const toNum = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export default function AgentSalariesModal({ agent, onClose }: AgentSalariesModalProps) {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkPaying, setBulkPaying] = useState(false);

  // Single Pay / Edit Modal State
  const [payForm, setPayForm] = useState<null | {
    user_id: number;
    name: string;
    job_title?: string;
    base_salary: number;
    housing_allowance: number;
    transportation_allowance: number;
    communication_allowance: number;
    bonus_amount: number;
    other_additions: number;
    penalty_amount: number;
    deduction_amount: number;
    advance_amount: number;
    status: 'paid' | 'unpaid';
    delivery_method: string;
    custom_delivery_method: string;
    notes: string;
    tax_percentage: number;
    social_security_percentage: number;
    apply_tax: boolean;
    apply_social_security: boolean;
  }>(null);
  const [savingPay, setSavingPay] = useState(false);

  // Add New Sub-Employee Modal State
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [newEmpForm, setNewEmpForm] = useState({
    name: '',
    username: '',
    password: '',
    job_title: '',
    salary: '',
    housing_allowance: '',
    transportation_allowance: '',
    communication_allowance: '',
    personal_phone: '',
    national_id_number: '',
    start_date: new Date().toISOString().split('T')[0],
  });
  const [savingNewEmp, setSavingNewEmp] = useState(false);

  const fetchSalaries = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

      const [empsRes, payrollsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/employee-payrolls/employees?branch_agent_id=${agent.id}&year=${year}&month=${month}`, { headers }),
        fetch(`${API_BASE_URL}/employee-payrolls?branch_agent_id=${agent.id}&year=${year}&month=${month}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`, { headers }),
      ]);

      let empsData = await empsRes.json().catch(() => []);
      let payrollsData = await payrollsRes.json().catch(() => []);

      let empsList = Array.isArray(empsData) ? empsData.map((e: any) => ({ ...e, id: Number(e.id) })) : [];

      // If no sub-users, check agent's main account
      if (empsList.length === 0) {
        try {
          const agRes = await fetch(`${API_BASE_URL}/branches-agents/${agent.id}`, { headers });
          if (agRes.ok) {
            const agData = await agRes.json();
            if (agData && agData.user) {
              empsList = [{
                id: agData.user.id,
                name: agData.agent_name || agData.user.name,
                username: agData.user.username,
                email: agData.user.email,
                job_title: 'الوكيل المعتمد / مدير الفرع',
                salary: agData.user.salary || 0,
                housing_allowance: agData.user.housing_allowance || 0,
                transportation_allowance: agData.user.transportation_allowance || 0,
                communication_allowance: agData.user.communication_allowance || 0,
                fixed_bonuses: agData.user.fixed_bonuses || 0,
                fixed_fines: agData.user.fixed_fines || 0,
                tax_percentage: agData.user.tax_percentage ?? 10,
                social_security_percentage: agData.user.social_security_percentage ?? 19.475,
                apply_tax: agData.user.apply_tax !== false,
                apply_social_security: agData.user.apply_social_security !== false,
                start_date: agData.contract_date || agData.user.start_date,
              }];
            }
          }
        } catch (err) {
          console.error('Error fetching agent account', err);
        }
      }

      setEmployees(empsList);
      setPayrolls(Array.isArray(payrollsData) ? payrollsData : []);
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء تحميل مرتبات الوكيل', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, [year, month, statusFilter]);

  const payrollMap = useMemo(() => {
    const map = new Map<number, PayrollItem>();
    payrolls.forEach((p) => map.set(Number(p.user_id), p));
    return map;
  }, [payrolls]);

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return employees
      .filter((e) => !q || e.name.toLowerCase().includes(q) || (e.job_title && e.job_title.toLowerCase().includes(q)))
      .map((e) => {
        const p = payrollMap.get(e.id);
        const base = p ? toNum(p.base_salary) : toNum(e.salary);
        const housing = p ? toNum(p.housing_allowance) : toNum(e.housing_allowance);
        const transport = p ? toNum(p.transportation_allowance) : toNum(e.transportation_allowance);
        const communication = p ? toNum(p.communication_allowance) : toNum(e.communication_allowance);
        const bonus = p ? toNum(p.bonus_amount) : toNum(e.fixed_bonuses);
        const other = p ? toNum(p.other_additions) : 0;
        const deduction = p ? toNum(p.deduction_amount) : toNum(e.fixed_fines);
        const advance = p ? toNum(p.advance_amount) : 0;
        const penalty = p ? toNum(p.penalty_amount) : 0;

        const tax_pct = toNum(e.tax_percentage ?? 10);
        const ss_pct = toNum(e.social_security_percentage ?? 19.475);
        const isTaxApplied = e.apply_tax !== false;
        const isSSApplied = e.apply_social_security !== false;

        const tax_val = p && toNum(p.tax_amount) > 0 ? toNum(p.tax_amount) : (isTaxApplied ? (base * tax_pct) / 100 : 0);
        const ss_val = p && toNum(p.social_security_amount) > 0 ? toNum(p.social_security_amount) : (isSSApplied ? (base * ss_pct) / 100 : 0);

        const net = p ? toNum(p.net_salary) : (base + housing + transport + communication + bonus + other - deduction - advance - penalty - tax_val - ss_val);

        const isPaid = p?.status === 'paid';
        return { e, p, base, housing, transport, communication, bonus, other, deduction, advance, penalty, tax_val, ss_val, net, isPaid };
      });
  }, [employees, payrollMap, searchQuery]);

  const summary = useMemo(() => {
    let totalBase = 0;
    let totalAdditions = 0;
    let totalDeductions = 0;
    let totalNet = 0;
    let paidCount = 0;
    let paidAmount = 0;

    rows.forEach((r) => {
      totalBase += r.base;
      totalAdditions += r.housing + r.transport + r.communication + r.bonus + r.other;
      totalDeductions += r.deduction + r.advance + r.penalty + r.tax_val + r.ss_val;
      totalNet += r.net;
      if (r.isPaid) {
        paidCount++;
        paidAmount += r.net;
      }
    });

    return {
      count: rows.length,
      totalBase,
      totalAdditions,
      totalDeductions,
      totalNet,
      paidCount,
      paidAmount,
      unpaidCount: rows.length - paidCount,
      unpaidAmount: totalNet - paidAmount,
    };
  }, [rows]);

  const handleBulkPay = async () => {
    if (rows.length === 0) {
      showToast('لا يوجد موظفون لصرف المرتبات لهم', 'error');
      return;
    }
    const ok = window.confirm(
      `تأكيد اعتماد وصرف مرتبات جميع موظفي هذا الوكيل/الفرع (${rows.length} موظف) لشهر ${month}/${year}؟`
    );
    if (!ok) return;

    setBulkPaying(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/employee-payrolls/bulk-pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          year,
          month,
          branch_agent_id: agent.id
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'فشل الصرف الجماعي');
      }
      showToast(data?.message || 'تم صرف المرتبات لجميع موظفي الوكيل بنجاح', 'success');
      await fetchSalaries();
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء الصرف الجماعي', 'error');
    } finally {
      setBulkPaying(false);
    }
  };

  const openPayForm = (r: (typeof rows)[number]) => {
    setPayForm({
      user_id: r.e.id,
      name: r.e.name,
      job_title: r.e.job_title,
      base_salary: r.base,
      housing_allowance: r.housing,
      transportation_allowance: r.transport,
      communication_allowance: r.communication,
      bonus_amount: r.bonus,
      other_additions: r.other,
      penalty_amount: r.penalty,
      deduction_amount: r.deduction,
      advance_amount: r.advance,
      status: r.isPaid ? 'paid' : 'unpaid',
      delivery_method: r.p?.delivery_method || 'نقدي',
      custom_delivery_method: r.p?.custom_delivery_method || '',
      notes: r.p?.notes || '',
      tax_percentage: toNum(r.e.tax_percentage ?? 10),
      social_security_percentage: toNum(r.e.social_security_percentage ?? 19.475),
      apply_tax: r.e.apply_tax !== false,
      apply_social_security: r.e.apply_social_security !== false,
    });
  };

  const handleSavePay = async () => {
    if (!payForm) return;
    setSavingPay(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/employee-payrolls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          user_id: payForm.user_id,
          year,
          month,
          base_salary: payForm.base_salary,
          housing_allowance: payForm.housing_allowance,
          transportation_allowance: payForm.transportation_allowance,
          communication_allowance: payForm.communication_allowance,
          bonus_amount: payForm.bonus_amount,
          other_additions: payForm.other_additions,
          penalty_amount: payForm.penalty_amount,
          deduction_amount: payForm.deduction_amount,
          advance_amount: payForm.advance_amount,
          status: payForm.status,
          delivery_method: payForm.delivery_method,
          custom_delivery_method: payForm.custom_delivery_method,
          notes: payForm.notes,
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'فشل حفظ بيان الراتب');
      }
      showToast('تم حفظ واعتماد صرف الراتب بنجاح', 'success');
      setPayForm(null);
      await fetchSalaries();
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSavingPay(false);
    }
  };

  const handleCreateNewSubEmp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpForm.name || !newEmpForm.username || !newEmpForm.password) {
      showToast('يرجى ملء الاسم، اسم المستخدم وكلمة المرور', 'error');
      return;
    }
    setSavingNewEmp(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          ...newEmpForm,
          branch_agent_id: agent.id,
          is_admin: false,
          is_active: true,
          authorized_documents: [],
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || 'فشل إنشاء حساب الموظف');
      }
      showToast('تم تسجيل الموظف تحت هذا الوكيل بنجاح', 'success');
      setShowAddEmpModal(false);
      setNewEmpForm({
        name: '',
        username: '',
        password: '',
        job_title: '',
        salary: '',
        housing_allowance: '',
        transportation_allowance: '',
        communication_allowance: '',
        personal_phone: '',
        national_id_number: '',
        start_date: new Date().toISOString().split('T')[0],
      });
      await fetchSalaries();
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء إضافة الموظف', 'error');
    } finally {
      setSavingNewEmp(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const columns = [
        { header: 'م', key: 'idx', width: 8 },
        { header: 'اسم الموظف', key: 'name', width: 28 },
        { header: 'المسمى الوظيفي', key: 'job_title', width: 22 },
        { header: 'الراتب الأساسي', key: 'base', width: 16 },
        { header: 'سكن', key: 'housing', width: 12 },
        { header: 'مواصلات', key: 'transport', width: 12 },
        { header: 'اتصالات', key: 'communication', width: 12 },
        { header: 'مكافآت', key: 'bonus', width: 12 },
        { header: 'إضافات أخرى', key: 'other', width: 12 },
        { header: 'سلف وخصومات', key: 'fines', width: 14 },
        { header: 'ضرائب', key: 'tax', width: 12 },
        { header: 'ضمان', key: 'ss', width: 12 },
        { header: 'صافي الراتب المستحق', key: 'net', width: 20 },
        { header: 'حالة الصرف', key: 'status', width: 14 },
        { header: 'طريقة الصرف', key: 'delivery', width: 18 },
        { header: 'تاريخ الصرف', key: 'paid_at', width: 16 },
      ];

      const data = rows.map((r, i) => ({
        idx: i + 1,
        name: r.e.name,
        job_title: r.e.job_title || 'موظف بالفرع',
        base: r.base,
        housing: r.housing,
        transport: r.transport,
        communication: r.communication,
        bonus: r.bonus,
        other: r.other,
        fines: r.deduction + r.advance + r.penalty,
        tax: r.tax_val.toFixed(2),
        ss: r.ss_val.toFixed(2),
        net: r.net.toLocaleString() + ' د.ل',
        status: r.isPaid ? 'مصروف' : 'غير مصروف',
        delivery: r.p?.delivery_method || '-',
        paid_at: r.p?.paid_at ? new Date(r.p.paid_at).toLocaleDateString('ar-LY') : '-',
      }));

      // Summary row
      data.push({
        idx: '',
        name: 'الإجمالي الكلي للفرع / الوكيل',
        job_title: `${rows.length} موظف`,
        base: summary.totalBase,
        housing: '',
        transport: '',
        communication: '',
        bonus: '',
        other: '',
        fines: '',
        tax: '',
        ss: '',
        net: summary.totalNet.toLocaleString() + ' د.ل',
        status: `تم صرف: ${summary.paidCount}`,
        delivery: '',
        paid_at: '',
      } as any);

      await generatePremiumExcel({
        title: `شركة المدار الليبي للتأمين - مسير مرتبات الوكيل / الفرع`,
        subtitle: `الوكيل: ${agent.agency_name} (${agent.code}) — شهر ${month}/${year} — إجمالي الصافي: ${summary.totalNet.toLocaleString()} د.ل`,
        columns,
        data,
        fileName: `مرتبات_${agent.code}_${month}_${year}`,
        qrData: `مرتبات وكيل: ${agent.agency_name} (${agent.code})
الشهر: ${month}/${year}
الموظفون: ${rows.length}
الصافي: ${summary.totalNet.toLocaleString()} د.ل`
      });
      showToast('تم تصدير ملف الإكسيل المتميز بنجاح', 'success');
    } catch (err: any) {
      showToast('حدث خطأ أثناء تصدير الإكسيل', 'error');
    }
  };

  const handlePrintPayrollA4 = () => {
    const win = window.open('', '', 'width=1200,height=900');
    if (!win) return;

    const rowsHtml = rows.map((r, i) => `
      <tr>
        <td style="font-weight:bold;text-align:center;">${i + 1}</td>
        <td style="font-weight:bold;text-align:right;">${r.e.name}</td>
        <td style="color:#64748b;text-align:center;">${r.e.job_title || 'موظف'}</td>
        <td style="text-align:center;font-weight:bold;">${money(r.base)}</td>
        <td style="text-align:center;color:#059669;">+${money(r.housing + r.transport + r.communication + r.bonus + r.other)}</td>
        <td style="text-align:center;color:#dc2626;">-${money(r.deduction + r.advance + r.penalty)}</td>
        <td style="text-align:center;color:#d97706;">-${money(r.tax_val + r.ss_val)}</td>
        <td style="text-align:center;font-weight:900;background:#f0fdf4;color:#15803d;font-size:12px;">${money(r.net)} د.ل</td>
        <td style="text-align:center;">
          <span style="display:inline-block;padding:3px 10px;border-radius:6px;font-size:10px;font-weight:bold;background:${r.isPaid ? '#dcfce7' : '#fee2e2'};color:${r.isPaid ? '#166534' : '#991b1b'};">
            ${r.isPaid ? 'مصروف' : 'غير مصروف'}
          </span>
        </td>
        <td style="text-align:center;font-size:10px;">${r.p?.delivery_method || 'نقدي'}</td>
        <td style="border-bottom:1px dashed #cbd5e1;min-width:90px;"></td>
      </tr>
    `).join('');

    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>مسير صرف مرتبات - ${agent.agency_name} (${month}/${year})</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          @media print {
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: 'Cairo', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body { font-family: 'Cairo', sans-serif; margin: 0; padding: 20px; color: #0f172a; background: #fff; direction: rtl; }
          .hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #1e40af; padding-bottom: 14px; margin-bottom: 18px; }
          .hdr-title { font-size: 22px; font-weight: 900; color: #1e40af; margin: 0; }
          .hdr-sub { font-size: 13px; color: #475569; margin: 4px 0 0; }
          .meta-box { display: flex; gap: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 16px; margin-bottom: 16px; font-size: 13px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 24px; }
          th { background: #1e40af; color: #fff; padding: 8px 6px; border: 1px solid #1e3a8a; text-align: center; }
          td { padding: 6px 6px; border: 1px solid #cbd5e1; }
          tr:nth-child(even) { background: #f8fafc; }
          .tot-row { background: #f1f5f9 !important; font-weight: 900; font-size: 12px; }
          .sigs { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 40px; }
          .sig-box { text-align: center; width: 220px; }
          .sig-line { margin-top: 50px; border-top: 1px solid #0f172a; padding-top: 6px; font-weight: 800; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="hdr">
          <div>
            <h1 class="hdr-title">شركة المدار الليبي للتأمين</h1>
            <p class="hdr-sub">إدارة الفروع والوكلاء — مسير صرف المرتبات الشهري المعتمد</p>
          </div>
          <div style="text-align:left;font-size:12px;color:#64748b;">
            <div>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-LY')}</div>
            <div>رقم المسير: SAL-${agent.code}-${year}${String(month).padStart(2,'0')}</div>
          </div>
        </div>

        <div class="meta-box">
          <div>الوكيل / الفرع: <span style="color:#1e40af;">${agent.agency_name}</span></div>
          <div>كود الوكيل: <span style="color:#1e40af;">${agent.code}</span></div>
          <div>المسؤول: <span style="color:#1e40af;">${agent.agent_name}</span></div>
          <div>شهر الاستحقاق: <span style="color:#1e40af;">${ARABIC_MONTHS[month - 1]} ${year}</span></div>
          <div>إجمالي الموظفين: <span style="color:#1e40af;">${rows.length}</span></div>
          <div>إجمالي الصافي: <span style="color:#059669;">${money(summary.totalNet)} د.ل</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:30px;">#</th>
              <th>اسم الموظف</th>
              <th>المسمى الوظيفي</th>
              <th>الأساسي</th>
              <th>البدلات والمكافآت</th>
              <th>الخصومات والسلف</th>
              <th>الضرائب والضمان</th>
              <th>الصافي المستحق</th>
              <th>الحالة</th>
              <th>طريقة الصرف</th>
              <th>توقيع المستلم</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr class="tot-row">
              <td colspan="3" style="text-align:center;">الإجمالي العام</td>
              <td style="text-align:center;">${money(summary.totalBase)}</td>
              <td style="text-align:center;color:#059669;">+${money(summary.totalAdditions)}</td>
              <td style="text-align:center;color:#dc2626;">-${money(summary.totalDeductions)}</td>
              <td style="text-align:center;">-</td>
              <td style="text-align:center;color:#15803d;">${money(summary.totalNet)} د.ل</td>
              <td style="text-align:center;">مصروف: ${summary.paidCount} / ${rows.length}</td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>

        <div class="sigs">
          <div class="sig-box">
            <div>إعداد محاسب المرتبات</div>
            <div class="sig-line">الاسم والتوقيع</div>
          </div>
          <div class="sig-box">
            <div>مدير إدارة الفروع والوكلاء</div>
            <div class="sig-line">الاسم والختم</div>
          </div>
          <div class="sig-box">
            <div>اعتماد المدير العام</div>
            <div class="sig-line">الاعتماد والتاريخ</div>
          </div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  const handlePrintSinglePayslip = (r: (typeof rows)[number]) => {
    const win = window.open('', '', 'width=800,height=900');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>قسيمة راتب - ${r.e.name} (${month}/${year})</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          body { font-family: 'Cairo', sans-serif; margin: 0; padding: 25px; color: #0f172a; direction: rtl; }
          .card { border: 2px solid #1e40af; border-radius: 16px; padding: 24px; }
          .hdr { text-align: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 20px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
          .sub-box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
          .sub-box h4 { margin: 0 0 10px; color: #1e40af; font-size: 14px; }
          .row-item { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; border-bottom: 1px dashed #f1f5f9; }
          .net-banner { background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; font-size: 16px; font-weight: 900; color: #15803d; }
          .sigs { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
          .sig-box { width: 180px; }
          .sig-line { margin-top: 40px; border-top: 1px solid #0f172a; padding-top: 4px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="hdr">
            <h2 style="margin:0;color:#1e40af;">شركة المدار الليبي للتأمين</h2>
            <h3 style="margin:4px 0 0;font-size:16px;">قسيمة راتب شهري معتمدة (Payslip)</h3>
            <p style="margin:4px 0 0;font-size:12px;color:#64748b;">الفرع / الوكيل: ${agent.agency_name} (${agent.code}) — شهر: ${ARABIC_MONTHS[month - 1]} ${year}</p>
          </div>

          <div style="background:#f8fafc;border-radius:10px;padding:12px;margin-bottom:18px;display:flex;justify-content:space-between;font-size:13px;font-weight:bold;">
            <div>اسم الموظف: <span style="color:#1e40af;">${r.e.name}</span></div>
            <div>المسمى الوظيفي: <span>${r.e.job_title || 'موظف بالفرع'}</span></div>
            <div>تاريخ الصرف: <span>${r.p?.paid_at ? new Date(r.p.paid_at).toLocaleDateString('ar-LY') : new Date().toLocaleDateString('ar-LY')}</span></div>
          </div>

          <div class="grid">
            <div class="sub-box">
              <h4 style="color:#166534;"><i class="fa-solid fa-plus-circle"></i> الاستحقاقات والبدلات</h4>
              <div class="row-item"><span>الراتب الأساسي:</span> <strong>${money(r.base)} د.ل</strong></div>
              <div class="row-item"><span>بدل سكن:</span> <strong>${money(r.housing)} د.ل</strong></div>
              <div class="row-item"><span>بدل مواصلات:</span> <strong>${money(r.transport)} د.ل</strong></div>
              <div class="row-item"><span>بدل اتصالات:</span> <strong>${money(r.communication)} د.ل</strong></div>
              <div class="row-item"><span>مكافآت وحوافز:</span> <strong>${money(r.bonus)} د.ل</strong></div>
              <div class="row-item"><span>إضافات أخرى:</span> <strong>${money(r.other)} د.ل</strong></div>
              <div class="row-item" style="border-top:2px solid #cbd5e1;font-weight:bold;margin-top:6px;padding-top:6px;">
                <span>إجمالي الاستحقاقات:</span> <strong>${money(r.base + r.housing + r.transport + r.communication + r.bonus + r.other)} د.ل</strong>
              </div>
            </div>

            <div class="sub-box">
              <h4 style="color:#991b1b;"><i class="fa-solid fa-minus-circle"></i> الاستقطاعات والخصومات</h4>
              <div class="row-item"><span>سلف على المرتب:</span> <strong>${money(r.advance)} د.ل</strong></div>
              <div class="row-item"><span>جزاءات وغرامات:</span> <strong>${money(r.penalty)} د.ل</strong></div>
              <div class="row-item"><span>خصومات أخرى:</span> <strong>${money(r.deduction)} د.ل</strong></div>
              <div class="row-item"><span>ضريبة الدخل:</span> <strong>${money(r.tax_val)} د.ل</strong></div>
              <div class="row-item"><span>الضمان الاجتماعي:</span> <strong>${money(r.ss_val)} د.ل</strong></div>
              <div class="row-item" style="border-top:2px solid #cbd5e1;font-weight:bold;margin-top:6px;padding-top:6px;">
                <span>إجمالي الاستقطاعات:</span> <strong>${money(r.advance + r.penalty + r.deduction + r.tax_val + r.ss_val)} د.ل</strong>
              </div>
            </div>
          </div>

          <div class="net-banner">
            <div>صافي الراتب المستحق للصرف:</div>
            <div style="font-size:22px;">${money(r.net)} د.ل</div>
          </div>

          <div style="font-size:12px;color:#64748b;margin-bottom:15px;">
            <div>طريقة الدفع: <strong>${r.p?.delivery_method || 'نقدي (كاش)'}</strong></div>
            ${r.p?.notes ? `<div>ملاحظات: ${r.p.notes}</div>` : ''}
          </div>

          <div class="sigs">
            <div class="sig-box">
              <div>محاسب إدارة الفروع</div>
              <div class="sig-line">التوقيع</div>
            </div>
            <div class="sig-box">
              <div>المستلم (الموظف)</div>
              <div class="sig-line">توقيع الاستلام</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--card-bg)',
          borderRadius: '24px',
          maxWidth: '1280px',
          width: '96vw',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          border: '1px solid var(--border)',
        }}
      >
        {/* Modal Top Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #059669, #10b981)',
            padding: '18px 24px',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '14px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <i className="fa-solid fa-money-check-dollar" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                  إدارة الوكيل / قسم المرتبات
                </span>
                <span style={{ fontSize: '12px', opacity: 0.9 }}>كود: {agent.code}</span>
              </div>
              <h2 style={{ margin: '3px 0 0', fontFamily: "'Cairo',sans-serif", fontSize: '19px', fontWeight: 900 }}>
                مسيرات وصرف مرتبات الوكيل — {agent.agency_name}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => setShowAddEmpModal(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: 'rgba(255,255,255,0.25)',
                color: '#fff',
                fontFamily: "'Cairo',sans-serif",
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all .2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.35)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            >
              <i className="fa-solid fa-user-plus" />
              <span>إضافة موظف بالفرع</span>
            </button>

            <button
              onClick={onClose}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        </div>

        {/* Controls & KPI Bar */}
        <div style={{ padding: '16px 24px', background: 'var(--bg)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {/* Controls Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              {/* Year Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)', fontFamily: "'Cairo',sans-serif" }}>السنة:</label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 800,
                    fontSize: '13px',
                  }}
                >
                  {Array.from({ length: 6 }).map((_, i) => {
                    const y = now.getFullYear() - 2 + i;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </div>

              {/* Month Select */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)', fontFamily: "'Cairo',sans-serif" }}>الشهر:</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 800,
                    fontSize: '13px',
                  }}
                >
                  {ARABIC_MONTHS.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {idx + 1} - {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)', fontFamily: "'Cairo',sans-serif" }}>الحالة:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 800,
                    fontSize: '13px',
                  }}
                >
                  <option value="all">جميع الحالات</option>
                  <option value="paid">المصروفة فقط</option>
                  <option value="unpaid">غير المصروفة</option>
                </select>
              </div>

              {/* Search input */}
              <div style={{ position: 'relative', width: '200px' }}>
                <i className="fa-solid fa-search" style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--muted)', fontSize: '12px' }} />
                <input
                  type="text"
                  placeholder="بحث عن موظف بالاسم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 30px 7px 10px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontFamily: "'Cairo',sans-serif",
                    fontSize: '12px',
                    fontWeight: 700,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Actions: Bulk Pay, Print, Excel */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleBulkPay}
                disabled={bulkPaying || loading || rows.length === 0}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#fff',
                  fontFamily: "'Cairo',sans-serif",
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: (bulkPaying || loading) ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                }}
              >
                <i className={`fa-solid ${bulkPaying ? 'fa-circle-notch fa-spin' : 'fa-check-double'}`} />
                <span>صرف جماعي للمرتبات</span>
              </button>

              <button
                onClick={handlePrintPayrollA4}
                disabled={loading || rows.length === 0}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                  color: '#fff',
                  fontFamily: "'Cairo',sans-serif",
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(30,64,175,0.3)',
                }}
              >
                <i className="fa-solid fa-print" />
                <span>طباعة مسير A4</span>
              </button>

              <button
                onClick={handleExportExcel}
                disabled={loading || rows.length === 0}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                  color: '#fff',
                  fontFamily: "'Cairo',sans-serif",
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(2,132,199,0.3)',
                }}
              >
                <i className="fa-solid fa-file-excel" />
                <span>تصدير إكسيل</span>
              </button>

              <button
                onClick={fetchSalaries}
                disabled={loading}
                title="تحديث البيانات"
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* KPI Mini-Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '10px',
            }}
          >
            <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 800, fontFamily: "'Cairo',sans-serif" }}>عدد الموظفين</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text)', fontFamily: "'Cairo',sans-serif" }}>{summary.count} موظف</div>
            </div>

            <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 800, fontFamily: "'Cairo',sans-serif" }}>إجمالي الأساسي</div>
              <div style={{ fontSize: '17px', fontWeight: 900, color: '#3b82f6', fontFamily: "'Cairo',sans-serif" }}>{money(summary.totalBase)} د.ل</div>
            </div>

            <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 800, fontFamily: "'Cairo',sans-serif" }}>إجمالي البدلات</div>
              <div style={{ fontSize: '17px', fontWeight: 900, color: '#10b981', fontFamily: "'Cairo',sans-serif" }}>+{money(summary.totalAdditions)} د.ل</div>
            </div>

            <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 800, fontFamily: "'Cairo',sans-serif" }}>إجمالي الخصومات</div>
              <div style={{ fontSize: '17px', fontWeight: 900, color: '#ef4444', fontFamily: "'Cairo',sans-serif" }}>-{money(summary.totalDeductions)} د.ل</div>
            </div>

            <div style={{ background: 'rgba(16,185,129,0.08)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)' }}>
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: 800, fontFamily: "'Cairo',sans-serif" }}>صافي الرواتب المستحقة</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#059669', fontFamily: "'Cairo',sans-serif" }}>{money(summary.totalNet)} د.ل</div>
            </div>

            <div style={{ background: 'var(--card-bg)', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 800, fontFamily: "'Cairo',sans-serif" }}>حالة الصرف للشهر</div>
              <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text)', fontFamily: "'Cairo',sans-serif" }}>
                <span style={{ color: '#059669' }}>{summary.paidCount} مصروف</span> / <span style={{ color: '#d97706' }}>{summary.unpaidCount} متبقي</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Main Table Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '36px', color: '#059669', marginBottom: '12px' }} />
              <p style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 700 }}>جاري جلب بيانات موظفي ومرتبات الوكيل...</p>
            </div>
          ) : rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
              <i className="fa-solid fa-users-slash" style={{ fontSize: '42px', marginBottom: '14px', opacity: 0.5 }} />
              <h3 style={{ fontFamily: "'Cairo',sans-serif", margin: 0, fontWeight: 800 }}>لا يوجد موظفون مسجلون تحت هذا الوكيل حالياً</h3>
              <p style={{ fontFamily: "'Cairo',sans-serif", fontSize: '13px', margin: '6px 0 16px' }}>
                يمكنك إضافة موظفي الفرع وتحديد رواتبهم الأساسية وبدلاتهم بالنقر على زر "إضافة موظف بالفرع"
              </p>
              <button
                onClick={() => setShowAddEmpModal(true)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontFamily: "'Cairo',sans-serif",
                }}
              >
                <i className="fa-solid fa-user-plus" style={{ marginLeft: '6px' }} />
                إضافة موظف الآن
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 6px', fontFamily: "'Cairo',sans-serif" }}>
                <thead>
                  <tr style={{ background: 'var(--bg)', color: 'var(--muted)', fontSize: '12px', fontWeight: 800 }}>
                    <th style={{ padding: '10px 14px', textAlign: 'right', borderRadius: '8px 0 0 8px' }}>الموظف</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>الراتب الأساسي</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>البدلات</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>الخصومات</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>الضرائب والضمان</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>صافي المستحق</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>حالة الصرف</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>طريقة الصرف</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', borderRadius: '0 8px 8px 0' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const adds = r.housing + r.transport + r.communication + r.bonus + r.other;
                    const fines = r.deduction + r.advance + r.penalty;
                    const taxes = r.tax_val + r.ss_val;

                    return (
                      <tr
                        key={r.e.id}
                        style={{
                          background: 'var(--card-bg)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                          transition: 'background .2s',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <td style={{ padding: '12px 14px', borderRadius: '12px 0 0 12px' }}>
                          <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '13px' }}>{r.e.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                            {r.e.job_title || 'موظف بالفرع'} {r.e.username ? `(@${r.e.username})` : ''}
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: 'var(--text)' }}>
                          {money(r.base)} د.ل
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#059669' }}>
                          +{money(adds)} د.ل
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#ef4444' }}>
                          -{money(fines)} د.ل
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#d97706' }}>
                          -{money(taxes)} د.ل
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span
                            style={{
                              background: 'rgba(16,185,129,0.12)',
                              color: '#059669',
                              padding: '5px 12px',
                              borderRadius: '10px',
                              fontWeight: 900,
                              fontSize: '13px',
                              border: '1px solid rgba(16,185,129,0.25)',
                              display: 'inline-block',
                            }}
                          >
                            {money(r.net)} د.ل
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {r.isPaid ? (
                            <span
                              style={{
                                background: '#dcfce7',
                                color: '#166534',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <i className="fa-solid fa-check" /> مدفوع
                            </span>
                          ) : (
                            <span
                              style={{
                                background: '#fef3c7',
                                color: '#92400e',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <i className="fa-solid fa-clock" /> غير مدفوع
                            </span>
                          )}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)', fontWeight: 700 }}>
                          {r.p?.delivery_method || '—'}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center', borderRadius: '0 12px 12px 0' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              onClick={() => openPayForm(r)}
                              title="صرف أو تعديل بيان الراتب"
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: r.isPaid ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #059669, #10b981)',
                                color: '#fff',
                                fontWeight: 800,
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontFamily: "'Cairo',sans-serif",
                              }}
                            >
                              <i className={`fa-solid ${r.isPaid ? 'fa-pencil' : 'fa-hand-holding-dollar'}`} />
                              <span>{r.isPaid ? 'تعديل' : 'صرف'}</span>
                            </button>

                            <button
                              onClick={() => handlePrintSinglePayslip(r)}
                              title="طباعة قسيمة راتب معتمدة"
                              style={{
                                padding: '6px 10px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                background: 'var(--card-bg)',
                                color: 'var(--text)',
                                fontWeight: 700,
                                fontSize: '11px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <i className="fa-solid fa-receipt" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '14px 24px',
            background: 'var(--bg)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: "'Cairo',sans-serif" }}>
            قسم إدارة الوكلاء والفروع — سجل صرف الرواتب الشهري المعتمد
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 24px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text)',
              fontFamily: "'Cairo',sans-serif",
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* ====== SUB-MODAL 1: Individual Pay / Edit Form ====== */}
      {payForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setPayForm(null); }}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '20px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              fontFamily: "'Cairo',sans-serif",
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #059669, #10b981)',
                padding: '16px 20px',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>صرف وتعديل راتب: {payForm.name}</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.9 }}>
                  شهر {month} / سنة {year} — الوكيل: {agent.agency_name}
                </p>
              </div>
              <button
                onClick={() => setPayForm(null)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                    الراتب الأساسي (د.ل) *
                  </label>
                  <input
                    type="number"
                    value={payForm.base_salary}
                    onChange={(e) => setPayForm({ ...payForm, base_salary: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 800 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                    بدل سكن (د.ل)
                  </label>
                  <input
                    type="number"
                    value={payForm.housing_allowance}
                    onChange={(e) => setPayForm({ ...payForm, housing_allowance: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                    بدل مواصلات (د.ل)
                  </label>
                  <input
                    type="number"
                    value={payForm.transportation_allowance}
                    onChange={(e) => setPayForm({ ...payForm, transportation_allowance: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                    بدل اتصالات (د.ل)
                  </label>
                  <input
                    type="number"
                    value={payForm.communication_allowance}
                    onChange={(e) => setPayForm({ ...payForm, communication_allowance: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                    مكافآت وحوافز (د.ل)
                  </label>
                  <input
                    type="number"
                    value={payForm.bonus_amount}
                    onChange={(e) => setPayForm({ ...payForm, bonus_amount: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                    إضافات أخرى (د.ل)
                  </label>
                  <input
                    type="number"
                    value={payForm.other_additions}
                    onChange={(e) => setPayForm({ ...payForm, other_additions: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#ef4444', marginBottom: '4px' }}>
                    سلف على المرتب (د.ل)
                  </label>
                  <input
                    type="number"
                    value={payForm.advance_amount}
                    onChange={(e) => setPayForm({ ...payForm, advance_amount: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#ef4444', marginBottom: '4px' }}>
                    خصومات وجزاءات (د.ل)
                  </label>
                  <input
                    type="number"
                    value={payForm.deduction_amount}
                    onChange={(e) => setPayForm({ ...payForm, deduction_amount: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              {/* Payment Settings */}
              <div style={{ background: 'var(--bg)', borderRadius: '12px', padding: '14px', marginBottom: '14px', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
                  إعدادات وحالة الصرف
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                      حالة الصرف *
                    </label>
                    <select
                      value={payForm.status}
                      onChange={(e) => setPayForm({ ...payForm, status: e.target.value as any })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 800 }}
                    >
                      <option value="paid">مدفوع (تم الصرف)</option>
                      <option value="unpaid">غير مدفوع (معلق)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                      طريقة الصرف *
                    </label>
                    <select
                      value={payForm.delivery_method}
                      onChange={(e) => setPayForm({ ...payForm, delivery_method: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 800 }}
                    >
                      <option value="نقدي">نقدي (كاش)</option>
                      <option value="تحويل مصرفي">تحويل مصرفي</option>
                      <option value="صك">صك مصرفي</option>
                      <option value="خصم من رصيد حساب الوكيل">خصم من رصيد حساب الوكيل الشهري</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                    ملاحظات الصرف ورقم الإيصال
                  </label>
                  <input
                    type="text"
                    placeholder="رقم الإيصال أو ملاحظات إضافية..."
                    value={payForm.notes}
                    onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Net Calculation Preview */}
              {(() => {
                const b = payForm.base_salary;
                const adds = payForm.housing_allowance + payForm.transportation_allowance + payForm.communication_allowance + payForm.bonus_amount + payForm.other_additions;
                const subs = payForm.deduction_amount + payForm.advance_amount + payForm.penalty_amount;
                const tax = payForm.apply_tax ? (b * payForm.tax_percentage) / 100 : 0;
                const ss = payForm.apply_social_security ? (b * payForm.social_security_percentage) / 100 : 0;
                const net = b + adds - subs - tax - ss;

                return (
                  <div
                    style={{
                      background: 'rgba(16,185,129,0.1)',
                      border: '1px solid #10b981',
                      borderRadius: '10px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#059669', fontSize: '14px' }}>الصافي المحسوب للموظف:</span>
                    <span style={{ fontWeight: 900, color: '#059669', fontSize: '18px' }}>{money(net)} د.ل</span>
                  </div>
                );
              })()}
            </div>

            <div style={{ padding: '14px 20px', background: 'var(--bg)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setPayForm(null)}
                disabled={savingPay}
                style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', cursor: 'pointer', fontWeight: 800 }}
              >
                إلغاء
              </button>
              <button
                onClick={handleSavePay}
                disabled={savingPay}
                style={{
                  padding: '8px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#fff',
                  cursor: savingPay ? 'wait' : 'pointer',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {savingPay ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-check" />}
                <span>حفظ واعتماد الصرف</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== SUB-MODAL 2: Add New Employee Under Agent ====== */}
      {showAddEmpModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddEmpModal(false); }}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '20px',
              maxWidth: '620px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              fontFamily: "'Cairo',sans-serif",
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                padding: '16px 20px',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>إضافة وتعيين موظف جديد بالفرع</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.9 }}>
                  الوكيل: {agent.agency_name} ({agent.code})
                </p>
              </div>
              <button
                onClick={() => setShowAddEmpModal(false)}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleCreateNewSubEmp} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                      الاسم الكامل *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="اسم الموظف..."
                      value={newEmpForm.name}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, name: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 800 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                      المسمى الوظيفي
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: موظف إصدار / محاسب..."
                      value={newEmpForm.job_title}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, job_title: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                      اسم المستخدم للدخول *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="username..."
                      value={newEmpForm.username}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, username: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', direction: 'ltr', textAlign: 'right' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                      كلمة المرور *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="كلمة المرور..."
                      value={newEmpForm.password}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, password: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                      الراتب الأساسي (د.ل)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={newEmpForm.salary}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, salary: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 800 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                      بدل سكن (د.ل)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={newEmpForm.housing_allowance}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, housing_allowance: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                      رقم الهاتف
                    </label>
                    <input
                      type="text"
                      placeholder="09..."
                      value={newEmpForm.personal_phone}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, personal_phone: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '4px' }}>
                      تاريخ مباشرة العمل
                    </label>
                    <input
                      type="date"
                      value={newEmpForm.start_date}
                      onChange={(e) => setNewEmpForm({ ...newEmpForm, start_date: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px 20px', background: 'var(--bg)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  disabled={savingNewEmp}
                  style={{ padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', cursor: 'pointer', fontWeight: 800 }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingNewEmp}
                  style={{
                    padding: '8px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                    color: '#fff',
                    cursor: savingNewEmp ? 'wait' : 'pointer',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {savingNewEmp ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-user-check" />}
                  <span>حفظ وإضافة الموظف</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
