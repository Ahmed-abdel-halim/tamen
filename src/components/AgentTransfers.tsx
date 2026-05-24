import { useEffect, useMemo, useState } from 'react';
import { showToast } from './Toast';
import { API_BASE_URL, resolveImageUrl } from "../config/api";

type Agent = {
  id: number;
  agency_name: string;
  agent_name: string;
};

type PosMachine = {
  id: number;
  machine_name: string;
  bank_name: string;
  is_active: boolean;
  branch_agents?: Array<{ id: number; agency_name: string }>;
};

type Bank = {
  id: number;
  name: string;
  account_number?: string;
};

type AgentTransfer = {
  id: number;
  branch_agent_id: number;
  amount: number;
  payment_method: string;
  transfer_date: string;
  reference_number?: string | null;
  bank_name?: string | null;
  source_bank?: string | null;
  source_account_number?: string | null;
  pos_machine_id?: number | null;
  voucher_image?: string | null;
  representative_name?: string | null;
  exchange_office?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string | null;
  rejection_reason?: string | null;
  created_by?: number | null;
  approved_by?: number | null;
  approval_date?: string | null;
  created_at: string;
  agent?: Agent | null;
  pos_machine?: PosMachine | null;
  creator?: { name: string } | null;
  approver?: { name: string } | null;
};

const money = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const paymentMethodMap: Record<string, string> = {
  'bank_deposit': 'إيداع في الحساب',
  'mobile_payment': 'دفع عن طريق الموبايل',
  'bank_cheque': 'صك مصرفي',
  'bank_transfer': 'حوالة مصرفية',
  'cash_office': 'حوالة مالية كاش (مكتب)',
  'cash_representative': 'نقداً تسليم للمندوب',
  'pos_machine': 'مبيعات ماكينة (POS)',
};

export default function AgentTransfers() {
  const [transfers, setTransfers] = useState<AgentTransfer[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [posMachines, setPosMachines] = useState<PosMachine[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Filters
  const [filterAgent, setFilterAgent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewVoucherPath, setViewVoucherPath] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Add transfer form state
  const [formAgentId, setFormAgentId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formTransferDate, setFormTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [formPaymentMethod, setFormPaymentMethod] = useState('bank_deposit');
  const [formReferenceNumber, setFormReferenceNumber] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formSourceBank, setFormSourceBank] = useState('');
  const [formSourceAccountNumber, setFormSourceAccountNumber] = useState('');
  const [formPosMachineId, setFormPosMachineId] = useState('');
  const [formRepresentativeName, setFormRepresentativeName] = useState('');
  const [formExchangeOffice, setFormExchangeOffice] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setIsAdmin(user.is_admin || false);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      // Construct query parameters
      const params = new URLSearchParams();
      if (filterAgent) params.append('branch_agent_id', filterAgent);
      if (filterStatus) params.append('status', filterStatus);
      if (filterMethod) params.append('payment_method', filterMethod);
      if (filterFromDate) params.append('from_date', filterFromDate);
      if (filterToDate) params.append('to_date', filterToDate);

      const res = await fetch(`${API_BASE_URL}/agent-transfers?${params.toString()}`, { headers });
      const json = await res.json();
      if (json.success) {
        setTransfers(json.data);
      } else {
        showToast(json.message || 'حدث خطأ أثناء تحميل الحوالات', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'حدث خطأ أثناء تحميل الحوالات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      // Load agents list (for admin/accountant filters & form)
      const agentsRes = await fetch(`${API_BASE_URL}/branches-agents`, { headers });
      const agentsJson = await agentsRes.json();
      setAgents(Array.isArray(agentsJson) ? agentsJson : (agentsJson?.data || []));

      // Load active POS machines
      const posRes = await fetch(`${API_BASE_URL}/pos-machines`, { headers });
      const posJson = await posRes.json();
      const posList = Array.isArray(posJson) ? posJson : (posJson?.data || []);
      setPosMachines(posList.filter((p: any) => p.is_active));

      // Load Bank Settings
      const bankRes = await fetch(`${API_BASE_URL}/bank-settings/banks`, { headers });
      const bankJson = await bankRes.json();
      setBanks(Array.isArray(bankJson) ? bankJson : (bankJson?.data || []));

    } catch (error) {
      console.error('Error loading config options:', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterAgent, filterStatus, filterMethod, filterFromDate, filterToDate]);

  useEffect(() => {
    loadSettings();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormFile(e.target.files[0]);
    }
  };

  const resetForm = () => {
    setFormAgentId('');
    setFormAmount('');
    setFormTransferDate(new Date().toISOString().split('T')[0]);
    setFormPaymentMethod('bank_deposit');
    setFormReferenceNumber('');
    setFormBankName('');
    setFormSourceBank('');
    setFormSourceAccountNumber('');
    setFormPosMachineId('');
    setFormRepresentativeName('');
    setFormExchangeOffice('');
    setFormNotes('');
    setFormFile(null);
  };

  const handleAddTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formAmount || parseFloat(formAmount) <= 0) {
      showToast('يرجى إدخال مبلغ صحيح أكبر من صفر', 'error');
      return;
    }

    if (!isAdmin && !formFile) {
      showToast('صورة الإيصال مطلوبة لإثبات عملية الدفع', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('amount', formAmount);
      formData.append('transfer_date', formTransferDate);
      formData.append('payment_method', formPaymentMethod);

      if (formReferenceNumber) formData.append('reference_number', formReferenceNumber);
      if (formNotes) formData.append('notes', formNotes);

      // Method-specific fields
      const isBankMethod = ['bank_deposit', 'mobile_payment', 'bank_cheque', 'bank_transfer'].includes(formPaymentMethod);
      if (isBankMethod) {
        if (formBankName) formData.append('bank_name', formBankName);
        if (formSourceBank) formData.append('source_bank', formSourceBank);
        if (formSourceAccountNumber) formData.append('source_account_number', formSourceAccountNumber);
      } else if (formPaymentMethod === 'cash_office') {
        if (formExchangeOffice) formData.append('exchange_office', formExchangeOffice);
      } else if (formPaymentMethod === 'cash_representative') {
        if (formRepresentativeName) formData.append('representative_name', formRepresentativeName);
      } else if (formPaymentMethod === 'pos_machine') {
        if (formPosMachineId) formData.append('pos_machine_id', formPosMachineId);
      }

      if (isAdmin && formAgentId) {
        formData.append('branch_agent_id', formAgentId);
      }

      if (formFile) {
        formData.append('voucher_image', formFile);
      }

      const res = await fetch(`${API_BASE_URL}/agent-transfers`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      const json = await res.json();
      if (json.success) {
        showToast(json.message || 'تم حفظ المعاملة المالية بنجاح', 'success');
        setShowAddModal(false);
        resetForm();
        loadData();
      } else {
        showToast(json.message || 'فشل حفظ المعاملة', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    const ok = window.confirm('هل أنت متأكد من مطابقة هذه الحوالة واعتمادها في الدفاتر المالية وسندات القبض؟');
    if (!ok) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-transfers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: 'approved' })
      });

      const json = await res.json();
      if (json.success) {
        showToast('تمت مطابقة وتأكيد الحوالة بنجاح وتوليد سند القبض القيادي', 'success');
        loadData();
      } else {
        showToast(json.message || 'فشلت مطابقة الحوالة', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'حدث خطأ أثناء الاتصال بالخادم', 'error');
    }
  };

  const handleOpenRejectModal = (id: number) => {
    setRejectId(id);
    setRejectionReason('');
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      showToast('يرجى كتابة سبب الرفض للوكيل', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-transfers/${rejectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: 'rejected',
          rejection_reason: rejectionReason
        })
      });

      const json = await res.json();
      if (json.success) {
        showToast('تم رفض الحوالة بنجاح وإشعار الوكيل بالسبب', 'success');
        setRejectId(null);
        loadData();
      } else {
        showToast(json.message || 'فشل رفض الحوالة', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'حدث خطأ أثناء الاتصال بالخادم', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = window.confirm('هل أنت متأكد من حذف هذا التحويل نهائياً؟');
    if (!ok) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-transfers/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      const json = await res.json();
      if (json.success) {
        showToast('تم حذف التحويل المالي بنجاح', 'success');
        loadData();
      } else {
        showToast(json.message || 'فشل حذف التحويل', 'error');
      }
    } catch (error: any) {
      showToast(error?.message || 'حدث خطأ أثناء حذف التحويل', 'error');
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    return transfers.reduce((acc, t) => {
      acc.totalAmount += t.amount;
      if (t.status === 'approved') {
        acc.approvedAmount += t.amount;
        acc.approvedCount++;
      } else if (t.status === 'pending') {
        acc.pendingAmount += t.amount;
        acc.pendingCount++;
      } else if (t.status === 'rejected') {
        acc.rejectedAmount += t.amount;
        acc.rejectedCount++;
      }
      return acc;
    }, {
      totalAmount: 0,
      approvedAmount: 0,
      pendingAmount: 0,
      rejectedAmount: 0,
      approvedCount: 0,
      pendingCount: 0,
      rejectedCount: 0
    });
  }, [transfers]);

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>الشؤون المالية / {isAdmin ? 'حوالات الوكلاء المالية' : 'التحويلات المالية للشركة'}</span>
      </div>

      {/* Stats Cards */}
      <div className="users-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 'bold' }}>إجمالي العمليات المفلترة</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#1e293b', marginTop: '6px' }}>
              {money.format(stats.totalAmount)} <span style={{ fontSize: '14px' }}>د.ل</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>عدد العمليات: {transfers.length}</div>
          </div>

          <div style={{ padding: '16px', background: '#ecfdf5', borderRadius: '12px', border: '1px solid #a7f3d0' }}>
            <div style={{ fontSize: '14px', color: '#047857', fontWeight: 'bold' }}>المطابقة والمعتمدة</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#065f46', marginTop: '6px' }}>
              {money.format(stats.approvedAmount)} <span style={{ fontSize: '14px' }}>د.ل</span>
            </div>
            <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>عدد العمليات: {stats.approvedCount}</div>
          </div>

          <div style={{ padding: '16px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
            <div style={{ fontSize: '14px', color: '#b45309', fontWeight: 'bold' }}>قيد الانتظار والمطابقة</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#92400e', marginTop: '6px' }}>
              {money.format(stats.pendingAmount)} <span style={{ fontSize: '14px' }}>د.ل</span>
            </div>
            <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px' }}>عدد العمليات: {stats.pendingCount}</div>
          </div>

          <div style={{ padding: '16px', background: '#fef2f2', borderRadius: '12px', border: '1px solid #fca5a5' }}>
            <div style={{ fontSize: '14px', color: '#b91c1c', fontWeight: 'bold' }}>المرفوضة</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#991b1b', marginTop: '6px' }}>
              {money.format(stats.rejectedAmount)} <span style={{ fontSize: '14px' }}>د.ل</span>
            </div>
            <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '4px' }}>عدد العمليات: {stats.rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="users-card" style={{ marginBottom: '16px' }}>
        <div className="ep-payroll-toolbar">
          <div className="ep-payroll-toolbar-head">
            <h2 className="ep-payroll-toolbar-title">فرز وتصفية العمليات</h2>
            <p className="ep-payroll-toolbar-hint">استخدم خيارات البحث للتصفية أو أضف عملية مالية جديدة</p>
          </div>
          <div className="ep-payroll-fields" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {isAdmin && (
              <div className="ep-field">
                <label>الوكيل / الفرع</label>
                <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}>
                  <option value="">كل الوكلاء</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.agency_name} ({a.agent_name})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="ep-field">
              <label>حالة الطلب</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">كل الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="approved">معتمدة ومطابقة</option>
                <option value="rejected">مرفوضة</option>
              </select>
            </div>
            <div className="ep-field">
              <label>طريقة الدفع</label>
              <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
                <option value="">كل الطرق</option>
                {Object.entries(paymentMethodMap).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="ep-field">
              <label>من تاريخ</label>
              <input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} />
            </div>
            <div className="ep-field">
              <label>إلى تاريخ</label>
              <input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} />
            </div>
          </div>

          <div className="ep-payroll-actions" style={{ marginTop: '16px' }}>
            <button className="btn-submit" type="button" onClick={() => setShowAddModal(true)}>
              <i className="fa-solid fa-plus"></i>
              {isAdmin ? 'إدخال عملية مالية للوكيل' : 'تسجيل إيصال حوالة جديد'}
            </button>
            <button className="btn-submit" type="button" style={{ background: '#64748b' }} onClick={loadData}>
              <i className="fa-solid fa-rotate"></i>
              تحديث البيانات
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="users-card">
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                {isAdmin && <th>الوكيل</th>}
                <th>تاريخ العملية</th>
                <th>القيمة</th>
                <th>طريقة الدفع</th>
                <th>المرجع / الرقم</th>
                <th>بيانات الحوالة المستلمة / الإضافية</th>
                <th>الإيصال</th>
                <th>الحالة</th>
                <th>تأكيد بواسطة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} style={{ textAlign: 'center', padding: '24px' }}>
                    جاري تحميل التحويلات والعمليات...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 10 : 9} style={{ textAlign: 'center', padding: '24px' }}>
                    لا توجد حوالات مطابقة لمعايير البحث الحالية
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id}>
                    {isAdmin && (
                      <td style={{ fontWeight: 'bold' }}>
                        {t.agent?.agency_name || 'غير معروف'}
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>
                          {t.agent?.agent_name}
                        </div>
                      </td>
                    )}
                    <td>{t.transfer_date}</td>
                    <td style={{ fontWeight: '800', color: '#1e3a8a' }}>{money.format(t.amount)} د.ل</td>
                    <td>{paymentMethodMap[t.payment_method] || t.payment_method}</td>
                    <td>{t.reference_number || '—'}</td>
                    <td style={{ fontSize: '12px', textAlign: 'right' }}>
                      {/* Dynamic method details */}
                      {['bank_deposit', 'mobile_payment', 'bank_cheque', 'bank_transfer'].includes(t.payment_method) && (
                        <div>
                          {t.bank_name && <div>البنك: {t.bank_name}</div>}
                          {t.source_bank && <div>من بنك: {t.source_bank}</div>}
                          {t.source_account_number && <div>حساب المرسل: {t.source_account_number}</div>}
                        </div>
                      )}
                      {t.payment_method === 'cash_office' && (
                        <div>
                          {t.exchange_office && <div>مكتب الصرافة: {t.exchange_office}</div>}
                        </div>
                      )}
                      {t.payment_method === 'cash_representative' && (
                        <div>
                          {t.representative_name && <div>اسم المندوب: {t.representative_name}</div>}
                        </div>
                      )}
                      {t.payment_method === 'pos_machine' && (
                        <div>
                          {t.pos_machine?.machine_name && <div>الماكينة: {t.pos_machine.machine_name}</div>}
                          {t.pos_machine?.bank_name && <div>حساب الماكينة: {t.pos_machine.bank_name}</div>}
                        </div>
                      )}
                      {t.notes && <div style={{ color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>ملاحظات: {t.notes}</div>}
                    </td>
                    <td>
                      {t.voucher_image ? (
                        <button
                          className="action-btn"
                          style={{ background: '#3b82f6', color: 'white' }}
                          onClick={() => setViewVoucherPath(t.voucher_image || null)}
                          title="عرض الإيصال"
                        >
                          <i className="fa-solid fa-image"></i> عرض الإيصال
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>لا يوجد</span>
                      )}
                    </td>
                    <td>
                      {t.status === 'approved' && (
                        <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: 'bold' }}>
                          معتمدة ومطابقة
                        </span>
                      )}
                      {t.status === 'pending' && (
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: 'bold' }}>
                          قيد المراجعة
                        </span>
                      )}
                      {t.status === 'rejected' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 10px', borderRadius: '50px', fontSize: '12px', fontWeight: 'bold' }}>
                            مرفوضة
                          </span>
                          {t.rejection_reason && (
                            <span style={{ fontSize: '10px', color: '#b91c1c', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.rejection_reason}>
                              السبب: {t.rejection_reason}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      {t.approver?.name || '—'}
                      {t.approval_date && <div style={{ fontSize: '10px', color: '#64748b' }}>{new Date(t.approval_date).toLocaleDateString('ar-LY')}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {isAdmin && t.status === 'pending' && (
                          <>
                            <button
                              className="action-btn"
                              style={{ background: '#10b981', color: 'white' }}
                              onClick={() => handleApprove(t.id)}
                              title="تأكيد ومطابقة الحوالة"
                            >
                              <i className="fa-solid fa-check"></i> مطابقة
                            </button>
                            <button
                              className="action-btn"
                              style={{ background: '#ef4444', color: 'white' }}
                              onClick={() => handleOpenRejectModal(t.id)}
                              title="رفض الطلب"
                            >
                              <i className="fa-solid fa-xmark"></i> رفض
                            </button>
                          </>
                        )}
                        {(!isAdmin || t.status === 'pending' || t.status === 'approved') && (
                          <button
                            className="action-btn edit"
                            style={{ background: '#ef4444', color: 'white' }}
                            onClick={() => handleDelete(t.id)}
                            title="حذف السجل"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal - Add Transfer */}
      {showAddModal && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal-content user-form-modal" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>{isAdmin ? 'تسجيل وإيداع دفعة مالية للوكيل' : 'تسجيل إرسال حوالة جديدة للشركة'}</h3>
            </div>
            <form onSubmit={handleAddTransfer} className="user-form">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                {isAdmin && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>الوكيل المستهدف *</label>
                    <select
                      value={formAgentId}
                      onChange={(e) => setFormAgentId(e.target.value)}
                      required
                    >
                      <option value="">اختر الوكيل...</option>
                      {agents.map(a => (
                        <option key={a.id} value={a.id}>{a.agency_name} ({a.agent_name})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>القيمة المالية بالدينار الليبي (د.ل) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="أدخل القيمة"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>تاريخ العملية / الإيداع *</label>
                  <input
                    type="date"
                    value={formTransferDate}
                    onChange={(e) => setFormTransferDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>طريقة الدفع / الإرسال *</label>
                  <select
                    value={formPaymentMethod}
                    onChange={(e) => setFormPaymentMethod(e.target.value)}
                    required
                  >
                    {Object.entries(paymentMethodMap).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Dynamic fields based on payment method */}
                {['bank_deposit', 'mobile_payment', 'bank_cheque', 'bank_transfer'].includes(formPaymentMethod) && (
                  <>
                    <div className="form-group">
                      <label>الحساب المصرفي للشركة (البنك المستلم) *</label>
                      <select
                        value={formBankName}
                        onChange={(e) => setFormBankName(e.target.value)}
                        required
                      >
                        <option value="">اختر الحساب...</option>
                        {banks.map(b => (
                          <option key={b.id} value={b.name}>{b.name} {b.account_number ? `(${b.account_number})` : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>مصدر الحساب (البنك المرسل)</label>
                      <input
                        type="text"
                        value={formSourceBank}
                        onChange={(e) => setFormSourceBank(e.target.value)}
                        placeholder="اسم بنك الوكيل"
                      />
                    </div>

                    <div className="form-group">
                      <label>رقم الحساب المرسل</label>
                      <input
                        type="text"
                        value={formSourceAccountNumber}
                        onChange={(e) => setFormSourceAccountNumber(e.target.value)}
                        placeholder="رقم حساب الوكيل"
                      />
                    </div>

                    <div className="form-group">
                      <label>رقم الحوالة / الصك / المرجع</label>
                      <input
                        type="text"
                        value={formReferenceNumber}
                        onChange={(e) => setFormReferenceNumber(e.target.value)}
                        placeholder="رقم المرجع المصرفي"
                      />
                    </div>
                  </>
                )}

                {formPaymentMethod === 'cash_office' && (
                  <>
                    <div className="form-group">
                      <label>اسم مكتب الحوالات المرسل عبره *</label>
                      <input
                        type="text"
                        value={formExchangeOffice}
                        onChange={(e) => setFormExchangeOffice(e.target.value)}
                        placeholder="مثال: مكتب المهاري للصرافة"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>رقم الحوالة المالي الكاش</label>
                      <input
                        type="text"
                        value={formReferenceNumber}
                        onChange={(e) => setFormReferenceNumber(e.target.value)}
                        placeholder="رقم مرجع الإيصال"
                      />
                    </div>
                  </>
                )}

                {formPaymentMethod === 'cash_representative' && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>اسم المندوب المالي المستلم للنقود *</label>
                    <input
                      type="text"
                      value={formRepresentativeName}
                      onChange={(e) => setFormRepresentativeName(e.target.value)}
                      placeholder="أدخل اسم المندوب بالكامل"
                      required
                    />
                  </div>
                )}

                {formPaymentMethod === 'pos_machine' && (
                  <>
                    <div className="form-group">
                      <label>ماكينة الدفع (POS) المستخدمة *</label>
                      <select
                        value={formPosMachineId}
                        onChange={(e) => setFormPosMachineId(e.target.value)}
                        required
                      >
                        <option value="">اختر ماكينة الـ POS...</option>
                        {posMachines
                          .filter(p => {
                            if (!isAdmin || !formAgentId) return true;
                            return p.branch_agents?.some(a => a.id === Number(formAgentId));
                          })
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.machine_name} - {p.bank_name}</option>
                          ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>رقم الإيصال / التفويض (Slip Ref)</label>
                      <input
                        type="text"
                        value={formReferenceNumber}
                        onChange={(e) => setFormReferenceNumber(e.target.value)}
                        placeholder="الرقم الموجود في إيصال الماكينة"
                      />
                    </div>
                  </>
                )}

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>صورة إيصال الدفع / الإيداع {!isAdmin && '*'} (JPG/PNG/PDF)</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    required={!isAdmin}
                  />
                  <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0' }}>يرجى التقاط صورة واضحة ومقروءة للإيداع البنكي أو إيصال ماكينة POS</p>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>ملاحظات إضافية</label>
                  <textarea
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="ملاحظات توضيحية حول المعاملة..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>إلغاء</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'جاري الحفظ والتحميل...' : (isAdmin ? 'حفظ وتأكيد وإيداع للحسابات' : 'إرسال للتدقيق')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - View Voucher Image */}
      {viewVoucherPath && (
        <div className="modal" onClick={() => setViewVoucherPath(null)}>
          <div className="modal-content" style={{ maxWidth: '800px', padding: '15px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>صورة مستند الدفع / الإيصال المرفق</h3>
              <button className="action-btn" style={{ background: '#ef4444', color: 'white' }} onClick={() => setViewVoucherPath(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div style={{ textAlign: 'center', maxHeight: '75vh', overflowY: 'auto' }}>
              {viewVoucherPath.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={resolveImageUrl(viewVoucherPath)}
                  width="100%"
                  height="500px"
                  title="Receipt PDF"
                />
              ) : (
                <img
                  src={resolveImageUrl(viewVoucherPath)}
                  alt="Voucher Receipt"
                  style={{ maxWidth: '100%', height: 'auto', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal - Reject Reassurance */}
      {rejectId !== null && (
        <div className="modal" onClick={() => setRejectId(null)}>
          <div className="modal-content user-form-modal" style={{ maxWidth: '450px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>رفض الحوالة وإرجاعها للوكيل</h3>
            </div>
            <div className="user-form">
              <div className="form-group">
                <label>سبب الرفض (سيظهر للوكيل لمراجعته وإعادة الرفع) *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="مثال: صورة الحوالة غير واضحة / لم تدخل القيمة في الحساب البنكي بعد..."
                  rows={4}
                  required
                />
              </div>
              <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setRejectId(null)}>إلغاء</button>
                <button type="button" className="btn-primary" style={{ background: '#ef4444' }} onClick={handleReject}>
                  تأكيد الرفض والإرجاع
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
