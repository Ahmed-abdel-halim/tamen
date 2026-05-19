import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL, resolveImageUrl } from '../config/api';
import { showToast } from './Toast';

interface BranchAgent {
  id: number;
  agency_name: string;
  agent_name: string;
  code: string;
}

interface TreasuryTransaction {
  id: number;
  transaction_date: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  source?: string;
  reference_number?: string;
  voucher_image?: string;
  branch_agent_id?: number;
  expense_destination?: string;
  payment_source?: string;
  notes?: string;
  created_at?: string;
}

interface PosMachine {
  id: number;
  machine_name: string;
  machine_serial?: string;
  bank_name: string;
  merchant_id?: string;
  location?: string;
  is_active: boolean;
  notes?: string;
  transactions_count?: number;
  transactions_sum_amount?: number;
}

interface PosTransaction {
  id: number;
  pos_machine_id: number;
  transaction_date: string;
  amount: number;
  transactions_count: number;
  reference_number?: string;
  report_file?: string;
  is_reconciled: boolean;
  notes?: string;
  machine?: PosMachine;
}

interface BankTransaction {
  id: number;
  transaction_date: string;
  reference_number?: string;
  bank_name: string;
  account_number?: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  reconciled: boolean;
  notes?: string;
  transaction_type?: string;
  source_bank?: string;
  destination_bank?: string;
  agent_name?: string;
  branch_agent_id?: number;
  payment_method?: string;
  voucher_image?: string;
  payer_name?: string;
}

const BANKS = ['مصرف الجمهورية', 'مصرف الوحدة', 'مصرف التجارة والتنمية', 'المصرف الإسلامي الليبي', 'مصرف صحارى', 'مصرف الأمان', 'المصرف التجاري الوطني'];

const BANK_TRANSACTION_TYPES = [
  { id: 'bank_transfer', name: 'حوالة مصرفية (من مصرف لآخر)' },
  { id: 'cash_deposit', name: 'إيداع نقدي مباشر في الحساب' },
  { id: 'mobile_payment', name: 'دفع عبر الموبايل الإلكتروني' },
  { id: 'bank_cheque', name: 'صك مصرفي / شيك مقاصة' },
  { id: 'exchange_office', name: 'حوالة عبر مكتب صرافة/حوالات' },
  { id: 'pos_settlement', name: 'تسوية مبيعات بطاقات (POS)' },
  { id: 'other', name: 'أخرى' }
];

export default function TreasuryAndBanksPage() {
  const [activeTab, setActiveTab] = useState<'treasury' | 'banks' | 'pos'>('banks');
  const [agents, setAgents] = useState<BranchAgent[]>([]);

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // loading states
  const [treasuryLoading, setTreasuryLoading] = useState(false);
  const [banksLoading, setBanksLoading] = useState(false);
  const [posLoading, setPosLoading] = useState(false);

  // -------------------------------------------------------------
  // 1. Treasury State (الخزنة)
  // -------------------------------------------------------------
  const [treasuryTxns, setTreasuryTxns] = useState<TreasuryTransaction[]>([]);
  const [treasuryStats, setTreasuryStats] = useState({
    total_income: 0,
    total_expense: 0,
    balance: 0,
    month_income: 0,
    month_expense: 0,
    month_net: 0
  });
  const [treasuryFilter, setTreasuryFilter] = useState({
    type: 'all',
    from_date: '',
    to_date: '',
    search: ''
  });
  const [showTreasuryModal, setShowTreasuryModal] = useState(false);
  const [treasuryFormData, setTreasuryFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    type: 'income',
    amount: '',
    description: '',
    source: '',
    reference_number: '',
    branch_agent_id: '',
    expense_destination: '',
    payment_source: 'cash',
    notes: '',
    voucher_image: null as File | null
  });

  // -------------------------------------------------------------
  // 2. Bank State (المصارف)
  // -------------------------------------------------------------
  const [bankTxns, setBankTxns] = useState<BankTransaction[]>([]);
  const [activeBankFilter, setActiveBankFilter] = useState('all');
  const [bankSearch, setBankSearch] = useState('');
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankFormData, setBankFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    bank_name: BANKS[0],
    account_number: '',
    amount: '',
    type: 'deposit',
    notes: '',
    transaction_type: 'bank_transfer',
    source_bank: '',
    destination_bank: '',
    branch_agent_id: '',
    payer_name: '',
    voucher_image: null as File | null
  });

  // -------------------------------------------------------------
  // 3. POS State (ماكينات نقاط البيع)
  // -------------------------------------------------------------
  const [posMachines, setPosMachines] = useState<PosMachine[]>([]);
  const [posTxns, setPosTxns] = useState<PosTransaction[]>([]);
  const [posStats, setPosStats] = useState({
    total_amount: 0,
    total_count: 0,
    month_amount: 0
  });
  const [posFilter, setPosFilter] = useState({
    machine_id: 'all',
    from_date: '',
    to_date: '',
    is_reconciled: 'all'
  });
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [showPosTxnModal, setShowPosTxnModal] = useState(false);
  const [machineFormData, setMachineFormData] = useState({
    machine_name: '',
    machine_serial: '',
    bank_name: BANKS[0],
    merchant_id: '',
    location: '',
    notes: ''
  });
  const [posTxnFormData, setPosTxnFormData] = useState({
    pos_machine_id: '',
    transaction_date: new Date().toISOString().split('T')[0],
    amount: '',
    transactions_count: '1',
    reference_number: '',
    notes: '',
    report_file: null as File | null
  });

  // -------------------------------------------------------------
  // Initial Loads
  // -------------------------------------------------------------
  useEffect(() => {
    fetchAgents();
    fetchTreasuryData();
    fetchBankData();
    fetchPosData();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/branches-agents`);
      if (res.ok) {
        const data = await res.json();
        setAgents(data);
      }
    } catch (e) {
      console.error('Error fetching agents:', e);
    }
  };

  // -------------------------------------------------------------
  // Treasury API functions
  // -------------------------------------------------------------
  const fetchTreasuryData = async () => {
    setTreasuryLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (treasuryFilter.type !== 'all') queryParams.append('type', treasuryFilter.type);
      if (treasuryFilter.from_date) queryParams.append('from_date', treasuryFilter.from_date);
      if (treasuryFilter.to_date) queryParams.append('to_date', treasuryFilter.to_date);
      if (treasuryFilter.search) queryParams.append('search', treasuryFilter.search);

      const res = await fetch(`${API_BASE_URL}/treasury?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTreasuryTxns(data.data || []);
        if (data.stats) setTreasuryStats(data.stats);
      }
    } catch (e) {
      showToast('خطأ في جلب بيانات الخزينة', 'error');
    } finally {
      setTreasuryLoading(false);
    }
  };

  useEffect(() => {
    fetchTreasuryData();
  }, [treasuryFilter.type, treasuryFilter.from_date, treasuryFilter.to_date]);

  const handleSaveTreasuryTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(treasuryFormData).forEach(([key, val]) => {
      if (key === 'voucher_image' && val) {
        formData.append('voucher_image', val as File);
      } else if (val !== null && val !== undefined) {
        formData.append(key, String(val));
      }
    });

    try {
      const res = await fetch(`${API_BASE_URL}/treasury`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        showToast('تم حفظ حركة الخزينة بنجاح', 'success');
        setShowTreasuryModal(false);
        setTreasuryFormData({
          transaction_date: new Date().toISOString().split('T')[0],
          type: 'income',
          amount: '',
          description: '',
          source: '',
          reference_number: '',
          branch_agent_id: '',
          expense_destination: '',
          payment_source: 'cash',
          notes: '',
          voucher_image: null
        });
        fetchTreasuryData();
      } else {
        const data = await res.json();
        showToast(data.message || 'حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      showToast('خطأ في حفظ المعاملة', 'error');
    }
  };

  const handleDeleteTreasuryTxn = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المعاملة؟')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/treasury/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('تم حذف الحركة بنجاح', 'success');
        fetchTreasuryData();
      }
    } catch (e) {
      showToast('فشل حذف الحركة', 'error');
    }
  };

  // -------------------------------------------------------------
  // Bank API functions
  // -------------------------------------------------------------
  const fetchBankData = async () => {
    setBanksLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/bank-transactions`);
      if (res.ok) {
        const data = await res.json();
        setBankTxns(data || []);
      }
    } catch (e) {
      showToast('خطأ في جلب البيانات البنكية', 'error');
    } finally {
      setBanksLoading(false);
    }
  };

  const handleSaveBankTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(bankFormData).forEach(([key, val]) => {
      if (key === 'voucher_image' && val) {
        formData.append('voucher_image', val as File);
      } else if (val !== null && val !== undefined) {
        formData.append(key, String(val));
      }
    });

    try {
      const res = await fetch(`${API_BASE_URL}/bank-transactions`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        showToast('تم إضافة الحركة البنكية بنجاح', 'success');
        setShowBankModal(false);
        setBankFormData({
          transaction_date: new Date().toISOString().split('T')[0],
          reference_number: '',
          bank_name: BANKS[0],
          account_number: '',
          amount: '',
          type: 'deposit',
          notes: '',
          transaction_type: 'bank_transfer',
          source_bank: '',
          destination_bank: '',
          branch_agent_id: '',
          payer_name: '',
          voucher_image: null
        });
        fetchBankData();
      } else {
        const errData = await res.json();
        showToast(errData.message || 'خطأ في حفظ الحركة البنكية', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    }
  };

  const handleToggleBankReconcile = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/bank-transactions/${id}/reconcile`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('تم تحديث حالة المطابقة للمصرف بنجاح', 'success');
        fetchBankData();
      }
    } catch (e) {
      showToast('فشل تحديث المطابقة البنكية', 'error');
    }
  };

  const handleDeleteBankTxn = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه المعاملة البنكية؟')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/bank-transactions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('تم حذف المعاملة البنكية', 'success');
        fetchBankData();
      }
    } catch (e) {
      showToast('فشل حذف المعاملة', 'error');
    }
  };

  // -------------------------------------------------------------
  // POS API functions
  // -------------------------------------------------------------
  const fetchPosData = async () => {
    setPosLoading(true);
    try {
      const mRes = await fetch(`${API_BASE_URL}/pos-machines`);
      if (mRes.ok) {
        const data = await mRes.json();
        setPosMachines(data.data || []);
      }

      const queryParams = new URLSearchParams();
      if (posFilter.machine_id !== 'all') queryParams.append('machine_id', posFilter.machine_id);
      if (posFilter.from_date) queryParams.append('from_date', posFilter.from_date);
      if (posFilter.to_date) queryParams.append('to_date', posFilter.to_date);
      if (posFilter.is_reconciled !== 'all') queryParams.append('is_reconciled', posFilter.is_reconciled);

      const tRes = await fetch(`${API_BASE_URL}/pos-transactions?${queryParams.toString()}`);
      if (tRes.ok) {
        const data = await tRes.json();
        setPosTxns(data.data || []);
        if (data.stats) setPosStats(data.stats);
      }
    } catch (e) {
      showToast('خطأ في جلب بيانات ماكينات POS', 'error');
    } finally {
      setPosLoading(false);
    }
  };

  useEffect(() => {
    fetchPosData();
  }, [posFilter.machine_id, posFilter.from_date, posFilter.to_date, posFilter.is_reconciled]);

  const handleSaveMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/pos-machines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(machineFormData)
      });
      if (res.ok) {
        showToast('تم إضافة ماكينة POS بنجاح', 'success');
        setShowMachineModal(false);
        setMachineFormData({
          machine_name: '',
          machine_serial: '',
          bank_name: BANKS[0],
          merchant_id: '',
          location: '',
          notes: ''
        });
        fetchPosData();
      }
    } catch (e) {
      showToast('فشل إضافة الماكينة', 'error');
    }
  };

  const handleToggleMachineActive = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/pos-machines/${id}/toggle-active`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('تم تغيير حالة نشاط الماكينة', 'success');
        fetchPosData();
      }
    } catch (e) {
      showToast('خطأ في تغيير حالة النشاط', 'error');
    }
  };

  const handleDeleteMachine = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف ماكينة POS هذه نهائياً؟')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/pos-machines/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('تم حذف الماكينة بنجاح', 'success');
        fetchPosData();
      }
    } catch (e) {
      showToast('فشل حذف الماكينة', 'error');
    }
  };

  const handleSavePosTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(posTxnFormData).forEach(([key, val]) => {
      if (key === 'report_file' && val) {
        formData.append('report_file', val as File);
      } else if (val !== null && val !== undefined) {
        formData.append(key, String(val));
      }
    });

    try {
      const res = await fetch(`${API_BASE_URL}/pos-transactions`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        showToast('تم تسجيل معاملة تسوية POS بنجاح', 'success');
        setShowPosTxnModal(false);
        setPosTxnFormData({
          pos_machine_id: '',
          transaction_date: new Date().toISOString().split('T')[0],
          amount: '',
          transactions_count: '1',
          reference_number: '',
          notes: '',
          report_file: null
        });
        fetchPosData();
      } else {
        const errData = await res.json();
        showToast(errData.message || 'فشل حفظ الحركة', 'error');
      }
    } catch (err) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleTogglePosReconcile = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/pos-transactions/${id}/reconcile`, {
        method: 'POST'
      });
      if (res.ok) {
        showToast('تم تغيير حالة مطابقة معاملة POS', 'success');
        fetchPosData();
      }
    } catch (e) {
      showToast('خطأ في مطابقة معاملة POS', 'error');
    }
  };

  const handleDeletePosTxn = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف معاملة تسوية POS هذه؟')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/pos-transactions/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('تم حذف الحركة بنجاح', 'success');
        fetchPosData();
      }
    } catch (e) {
      showToast('فشل حذف الحركة', 'error');
    }
  };

  // -------------------------------------------------------------
  // Memoized lists & derived calculations
  // -------------------------------------------------------------
  const filteredBankTxns = useMemo(() => {
    return bankTxns.filter(t => {
      const matchesBank = activeBankFilter === 'all' || t.bank_name === activeBankFilter;
      const matchesSearch = !bankSearch || 
        (t.reference_number && t.reference_number.toLowerCase().includes(bankSearch.toLowerCase())) ||
        (t.payer_name && t.payer_name.toLowerCase().includes(bankSearch.toLowerCase())) ||
        (t.notes && t.notes.toLowerCase().includes(bankSearch.toLowerCase())) ||
        (t.agent_name && t.agent_name.toLowerCase().includes(bankSearch.toLowerCase()));
      return matchesBank && matchesSearch;
    });
  }, [bankTxns, activeBankFilter, bankSearch]);

  const bankBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    BANKS.forEach(b => { balances[b] = 0; });

    bankTxns.forEach(t => {
      if (balances[t.bank_name] !== undefined) {
        const amt = parseFloat(t.amount.toString()) || 0;
        if (t.type === 'deposit') {
          balances[t.bank_name] += amt;
        } else {
          balances[t.bank_name] -= amt;
        }
      }
    });
    return balances;
  }, [bankTxns]);

  // -------------------------------------------------------------
  // Print operational vouchers
  // -------------------------------------------------------------
  const handlePrintTreasuryVoucher = (txn: TreasuryTransaction) => {
    const printWindow = window.open('', '', 'width=900,height=750');
    if (!printWindow) return;

    const qrContent = `مستند خزينة رقم: ${txn.id}\nالنوع: ${txn.type === 'income' ? 'مقبوضات' : 'مصروفات'}\nالمبلغ: ${txn.amount} د.ل\nالبيان: ${txn.description}\nالتاريخ: ${txn.transaction_date}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrContent)}`;

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>إيصال خزينة #${txn.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          body { font-family: 'Cairo', sans-serif; margin: 30px; padding: 0; color: #1e293b; background: #fff; }
          .voucher-card { border: 2px solid #000; padding: 25px; border-radius: 12px; position: relative; }
          .header-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
          .header-box h1 { margin: 0; font-size: 22px; color: #1e3a8a; }
          .voucher-title { text-align: center; font-size: 24px; font-weight: 900; margin: 20px 0; text-decoration: underline; }
          .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .details-table td { padding: 12px; border: 1px solid #e2e8f0; font-size: 14px; }
          .details-table td.label { font-weight: bold; background: #f8fafc; width: 25%; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 50px; }
          .sig-box { text-align: center; width: 30%; border-top: 1px dashed #000; padding-top: 10px; font-weight: bold; font-size: 13px; }
          .footer-note { font-size: 10px; color: #64748b; text-align: center; margin-top: 40px; }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="voucher-card">
          <div class="header-box">
            <div>
              <h1>شركة المدار الليبي للتأمين</h1>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #475569;">إدارة الشؤون المالية والحسابات</p>
            </div>
            <img src="${qrUrl}" alt="QR" />
          </div>
          <div class="voucher-title">إيصال ${txn.type === 'income' ? 'قبض نقدي (إيراد خزينة)' : 'صرف نقدي (مصروفات خزينة)'}</div>
          <table class="details-table">
            <tr>
              <td class="label">رقم الحركة:</td>
              <td>${txn.id}</td>
              <td class="label">تاريخ الحركة:</td>
              <td>${txn.transaction_date}</td>
            </tr>
            <tr>
              <td class="label">قيمة المعاملة:</td>
              <td style="font-size: 18px; font-weight: 900; color: ${txn.type === 'income' ? '#16a34a' : '#dc2626'}">${txn.amount.toLocaleString()} د.ل</td>
              <td class="label">طريقة الدفع:</td>
              <td>نقداً (كاش)</td>
            </tr>
            <tr>
              <td class="label">البيان / الوصف:</td>
              <td colspan="3">${txn.description}</td>
            </tr>
            <tr>
              <td class="label">المصدر / المستفيد:</td>
              <td>${txn.source || '—'}</td>
              <td class="label">رقم المرجع/الإيصال:</td>
              <td>${txn.reference_number || '—'}</td>
            </tr>
            ${txn.expense_destination ? `
            <tr>
              <td class="label">جهة الصرف:</td>
              <td colspan="3">${txn.expense_destination}</td>
            </tr>` : ''}
            <tr>
              <td class="label">ملاحظات إضافية:</td>
              <td colspan="3">${txn.notes || '—'}</td>
            </tr>
          </table>
          <div class="signature-section">
            <div class="sig-box">المحاسب المالي</div>
            <div class="sig-box">المدير المالي</div>
            <div class="sig-box">توقيع المستلم/المودع</div>
          </div>
          <div class="footer-note">تم استخراج هذا الإيصال إلكترونياً من نظام المدار الليبي للتأمين الموحد</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <section className="users-management" style={{ position: 'relative' }}>
      {/* Dynamic Header */}
      <div className="users-breadcrumb" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '18px 24px',
        background: 'var(--panel)',
        borderRadius: '16px',
        marginBottom: '25px',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)'
      }}>
        <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa-solid fa-vault" style={{ color: '#014cb1', fontSize: '22px' }}></i>
          المصارف والخزينة الموحدة
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'treasury' && (
            <button className="primary" onClick={() => setShowTreasuryModal(true)} style={{ borderRadius: '10px', fontWeight: 'bold' }}>
              <i className="fa-solid fa-plus" style={{ marginLeft: '8px' }}></i>
              إضافة حركة كاش (خزينة)
            </button>
          )}
          {activeTab === 'banks' && (
            <button className="primary" onClick={() => setShowBankModal(true)} style={{ borderRadius: '10px', fontWeight: 'bold' }}>
              <i className="fa-solid fa-plus" style={{ marginLeft: '8px' }}></i>
              إضافة معاملة بنكية
            </button>
          )}
          {activeTab === 'pos' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="primary" onClick={() => setShowMachineModal(true)} style={{ borderRadius: '10px', fontWeight: 'bold', background: '#475569' }}>
                <i className="fa-solid fa-laptop-code" style={{ marginLeft: '8px' }}></i>
                تعريف ماكينة POS
              </button>
              <button className="primary" onClick={() => setShowPosTxnModal(true)} style={{ borderRadius: '10px', fontWeight: 'bold' }}>
                <i className="fa-solid fa-receipt" style={{ marginLeft: '8px' }}></i>
                تسجيل تسوية يومية (POS)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Controller */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '25px', 
        padding: '5px', 
        background: 'var(--border)', 
        borderRadius: '12px',
        width: 'max-content'
      }}>
        <button 
          onClick={() => setActiveTab('banks')}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === 'banks' ? 'var(--panel)' : 'transparent',
            color: activeTab === 'banks' ? '#014cb1' : 'var(--muted)'
          }}
        >
          <i className="fa-solid fa-building-columns" style={{ marginLeft: '8px' }}></i>
          المطابقة والتحصيلات البنكية
        </button>
        <button 
          onClick={() => setActiveTab('treasury')}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === 'treasury' ? 'var(--panel)' : 'transparent',
            color: activeTab === 'treasury' ? '#014cb1' : 'var(--muted)'
          }}
        >
          <i className="fa-solid fa-wallet" style={{ marginLeft: '8px' }}></i>
          إدارة حركة الخزينة (الكاش)
        </button>
        <button 
          onClick={() => setActiveTab('pos')}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === 'pos' ? 'var(--panel)' : 'transparent',
            color: activeTab === 'pos' ? '#014cb1' : 'var(--muted)'
          }}
        >
          <i className="fa-solid fa-credit-card" style={{ marginLeft: '8px' }}></i>
          نقاط البيع وماكينات POS
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BANKS (المطابقة والتحصيلات البنكية) */}
      {/* ========================================================================= */}
      {activeTab === 'banks' && (
        <>
          {/* Quick Bank Balances Widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
            {BANKS.map((bank, index) => {
              const bal = bankBalances[bank] || 0;
              return (
                <div 
                  key={bank}
                  onClick={() => setActiveBankFilter(activeBankFilter === bank ? 'all' : bank)}
                  style={{ 
                    background: 'var(--panel)', 
                    padding: '18px', 
                    borderRadius: '16px', 
                    border: activeBankFilter === bank ? '2px solid #014cb1' : '1px solid var(--border)',
                    cursor: 'pointer', 
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: activeBankFilter === bank ? '0 10px 20px -5px rgba(1, 76, 177, 0.15)' : 'none',
                    transform: activeBankFilter === bank ? 'translateY(-4px)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      background: `hsl(${(index * 55) % 360}, 75%, 95%)`,
                      color: `hsl(${(index * 55) % 360}, 70%, 40%)`,
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center'
                    }}>
                      <i className="fa-solid fa-landmark"></i>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text)' }}>{bank}</span>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: bal >= 0 ? '#10b981' : '#ef4444' }}>
                    {bal.toLocaleString()} د.ل
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters Bar */}
          <div className="users-filters-box" style={{ padding: '20px', borderRadius: '15px', background: 'var(--panel)', border: '1px solid var(--border)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <input 
                  type="text" 
                  className="users-search-input" 
                  placeholder="بحث برقم المرجع، اسم المودع، الوكيل، أو البيان..." 
                  value={bankSearch}
                  onChange={e => setBankSearch(e.target.value)}
                  style={{ width: '100%', height: '42px', borderRadius: '10px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  onClick={() => { setActiveBankFilter('all'); setBankSearch(''); }}
                  className="secondary" 
                  style={{ height: '42px', borderRadius: '10px', padding: '0 20px', fontWeight: 'bold' }}
                >
                  إعادة تعيين الفلاتر
                </button>
              </div>
            </div>
          </div>

          {/* Bank Transactions Table */}
          <div className="users-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>تاريخ المعاملة</th>
                  <th>المصرف</th>
                  <th>القيمة</th>
                  <th>رقم المرجع</th>
                  <th>نوع التحصيل (الـ 7 طرق)</th>
                  <th>المودع / المحول</th>
                  <th>الوكيل المرتبط</th>
                  <th>الإيصال</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {banksLoading ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '30px' }}>جاري تحميل البيانات البنكية...</td></tr>
                ) : filteredBankTxns.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>لا توجد تحصيلات أو معاملات بنكية مسجلة حالياً تطابق الفلاتر.</td></tr>
                ) : filteredBankTxns.map(txn => (
                  <tr key={txn.id}>
                    <td style={{ fontWeight: 'bold' }}>{txn.transaction_date}</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '800' }}>{txn.bank_name}</span>
                        {txn.account_number && <span style={{ fontSize: '11px', color: 'var(--muted)', direction: 'ltr', textAlign: 'right' }}>{txn.account_number}</span>}
                      </div>
                    </td>
                    <td style={{ fontWeight: '900', color: txn.type === 'deposit' ? '#10b981' : '#ef4444', fontSize: '15px' }}>
                      {txn.type === 'deposit' ? '+' : '-'}{parseFloat(txn.amount.toString()).toLocaleString()} د.ل
                    </td>
                    <td><code style={{ background: 'var(--border)', padding: '2px 6px', borderRadius: '4px' }}>{txn.reference_number || '—'}</code></td>
                    <td>
                      <span style={{ 
                        background: 'rgba(1, 76, 177, 0.08)', 
                        color: '#014cb1', 
                        padding: '4px 10px', 
                        borderRadius: '6px', 
                        fontSize: '12px',
                        fontWeight: '800'
                      }}>
                        {BANK_TRANSACTION_TYPES.find(t => t.id === txn.transaction_type)?.name || 'حوالة مصرفية'}
                      </span>
                    </td>
                    <td>{txn.payer_name || '—'}</td>
                    <td>{txn.agent_name || '—'}</td>
                    <td>
                      {txn.voucher_image ? (
                        <button 
                          onClick={() => setPreviewImage(resolveImageUrl(txn.voucher_image))}
                          style={{ 
                            background: '#eff6ff', 
                            color: '#1e40af', 
                            border: '1px solid #bfdbfe',
                            padding: '4px 8px', 
                            borderRadius: '6px', 
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          <i className="fa-solid fa-image" style={{ marginLeft: '4px' }}></i>
                          عرض الإيصال
                        </button>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '12px' }}>لا يوجد إيصال</span>
                      )}
                    </td>
                    <td>
                      <span style={{ 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '11px', 
                        fontWeight: '900',
                        background: txn.reconciled ? '#dcfce7' : '#fef2f2',
                        color: txn.reconciled ? '#166534' : '#991b1b'
                      }}>
                        {txn.reconciled ? 'مطابقة ومؤكدة' : 'قيد المطابقة'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button 
                          onClick={() => handleToggleBankReconcile(txn.id)}
                          className="action-btn"
                          style={{ background: txn.reconciled ? '#f43f5e' : '#10b981', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}
                          title={txn.reconciled ? 'إلغاء التأكيد' : 'تأكيد مطابقة الحساب'}
                        >
                          <i className={`fa-solid ${txn.reconciled ? 'fa-xmark' : 'fa-check'}`}></i>
                        </button>
                        <button 
                          onClick={() => handleDeleteBankTxn(txn.id)}
                          className="action-btn"
                          style={{ background: '#ef4444', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}
                          title="حذف المعاملة"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TREASURY (إدارة حركة الخزينة الكاش) */}
      {/* ========================================================================= */}
      {activeTab === 'treasury' && (
        <>
          {/* Treasury Stats widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '25px' }}>
            <div style={{ background: 'var(--panel)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: '20px', top: '20px', fontSize: '32px', color: 'rgba(16, 185, 129, 0.15)' }}>
                <i className="fa-solid fa-arrow-trend-up"></i>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 'bold', marginBottom: '8px' }}>إجمالي مقبوضات الخزينة (الكاش)</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#10b981' }}>{treasuryStats.total_income.toLocaleString()} د.ل</div>
            </div>

            <div style={{ background: 'var(--panel)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: '20px', top: '20px', fontSize: '32px', color: 'rgba(239, 68, 68, 0.15)' }}>
                <i className="fa-solid fa-arrow-trend-down"></i>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 'bold', marginBottom: '8px' }}>إجمالي مدفوعات الخزينة (المصروفات)</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#ef4444' }}>{treasuryStats.total_expense.toLocaleString()} د.ل</div>
            </div>

            <div style={{ 
              background: 'linear-gradient(135deg, #014cb1 0%, #1e40af 100%)', 
              padding: '24px', 
              borderRadius: '16px', 
              border: 'none', 
              position: 'relative', 
              overflow: 'hidden',
              color: '#fff'
            }}>
              <div style={{ position: 'absolute', left: '20px', top: '20px', fontSize: '32px', color: 'rgba(255, 255, 255, 0.15)' }}>
                <i className="fa-solid fa-vault"></i>
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', fontWeight: 'bold', marginBottom: '8px' }}>الرصيد الآني الفعلي للخزنة (كاش)</div>
              <div style={{ fontSize: '26px', fontWeight: '900' }}>{treasuryStats.balance.toLocaleString()} د.ل</div>
            </div>
          </div>

          {/* Filtering Bar */}
          <div className="users-filters-box" style={{ padding: '20px', borderRadius: '15px', background: 'var(--panel)', border: '1px solid var(--border)', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>نوع الحركة</label>
                <select 
                  value={treasuryFilter.type}
                  onChange={e => setTreasuryFilter({ ...treasuryFilter, type: e.target.value })}
                  style={{ 
                    width: '100%', 
                    height: '42px', 
                    borderRadius: '10px', 
                    border: '1px solid var(--border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    paddingRight: '12px',
                    paddingLeft: '32px',
                    fontSize: '14px',
                    fontWeight: '700',
                    fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                    direction: 'rtl',
                    textAlign: 'right',
                    outline: 'none',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <option value="all">الكل (إيرادات / مصروفات)</option>
                  <option value="income">مقبوضات (إيراد خزينة)</option>
                  <option value="expense">مدفوعات (مصروف خزينة)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>من تاريخ</label>
                <input 
                  type="date" 
                  className="users-search-input" 
                  value={treasuryFilter.from_date}
                  onChange={e => setTreasuryFilter({ ...treasuryFilter, from_date: e.target.value })}
                  style={{ width: '100%', height: '42px', borderRadius: '10px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>إلى تاريخ</label>
                <input 
                  type="date" 
                  className="users-search-input" 
                  value={treasuryFilter.to_date}
                  onChange={e => setTreasuryFilter({ ...treasuryFilter, to_date: e.target.value })}
                  style={{ width: '100%', height: '42px', borderRadius: '10px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>بحث نصي</label>
                <input 
                  type="text" 
                  className="users-search-input" 
                  placeholder="بحث في البيان، رقم الإيصال..."
                  value={treasuryFilter.search}
                  onChange={e => setTreasuryFilter({ ...treasuryFilter, search: e.target.value })}
                  style={{ width: '100%', height: '42px', borderRadius: '10px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
              <button 
                onClick={() => { setTreasuryFilter({ type: 'all', from_date: '', to_date: '', search: '' }); }}
                className="secondary"
                style={{ height: '36px', borderRadius: '8px', padding: '0 16px', fontSize: '13px' }}
              >
                إعادة تعيين الفلاتر
              </button>
            </div>
          </div>

          {/* Treasury Transactions Table */}
          <div className="users-card" style={{ padding: '0', overflow: 'hidden' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>تاريخ المعاملة</th>
                  <th>نوع الحركة</th>
                  <th>القيمة</th>
                  <th>البيان التفصيلي</th>
                  <th>المصدر / المستفيد</th>
                  <th>رقم الإيصال</th>
                  <th>صورة السند</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {treasuryLoading ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>جاري تحميل كشف الخزينة...</td></tr>
                ) : treasuryTxns.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>سجل الخزينة فارغ أو لا توجد حركات تطابق معايير البحث.</td></tr>
                ) : treasuryTxns.map(txn => (
                  <tr key={txn.id}>
                    <td style={{ fontWeight: 'bold' }}>{txn.transaction_date}</td>
                    <td>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '11px', 
                        fontWeight: '800',
                        background: txn.type === 'income' ? '#e8f5e9' : '#ffebee',
                        color: txn.type === 'income' ? '#2e7d32' : '#c62828'
                      }}>
                        {txn.type === 'income' ? 'إيراد / قبض' : 'مصروف / دفع'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '900', color: txn.type === 'income' ? '#10b981' : '#ef4444', fontSize: '15px' }}>
                      {parseFloat(txn.amount.toString()).toLocaleString()} د.ل
                    </td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{txn.description}</td>
                    <td>{txn.source || '—'}</td>
                    <td><code style={{ background: 'var(--border)', padding: '2px 6px', borderRadius: '4px' }}>{txn.reference_number || '—'}</code></td>
                    <td>
                      {txn.voucher_image ? (
                        <button 
                          onClick={() => setPreviewImage(resolveImageUrl(txn.voucher_image))}
                          style={{ 
                            background: '#eff6ff', 
                            color: '#1e40af', 
                            border: '1px solid #bfdbfe',
                            padding: '4px 8px', 
                            borderRadius: '6px', 
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          <i className="fa-solid fa-image" style={{ marginLeft: '4px' }}></i>
                          عرض السند
                        </button>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '12px' }}>بلا مرفقات</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button 
                          onClick={() => handlePrintTreasuryVoucher(txn)}
                          className="action-btn"
                          style={{ background: '#6366f1', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}
                          title="طباعة إيصال الصرف/القبض"
                        >
                          <i className="fa-solid fa-print"></i>
                        </button>
                        <button 
                          onClick={() => handleDeleteTreasuryTxn(txn.id)}
                          className="action-btn"
                          style={{ background: '#ef4444', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}
                          title="حذف الحركة"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: POS TERMINALS (ماكينات نقاط البيع) */}
      {/* ========================================================================= */}
      {activeTab === 'pos' && (
        <>
          {/* POS statistics summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '25px' }}>
            <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(1, 76, 177, 0.08)', color: '#014cb1', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                <i className="fa-solid fa-calculator"></i>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>إجمالي حركات نقاط البيع (POS)</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text)' }}>{posStats.total_amount.toLocaleString()} د.ل</div>
              </div>
            </div>

            <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                <i className="fa-solid fa-circle-check"></i>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>عدد المقبوضات/العمليات الكلية</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text)' }}>{posStats.total_count} عملية</div>
              </div>
            </div>

            <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.08)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                <i className="fa-solid fa-chart-pie"></i>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>مبيعات نقاط البيع لهذا الشهر</div>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#6366f1' }}>{posStats.month_amount.toLocaleString()} د.ل</div>
              </div>
            </div>
          </div>

          <div className="pos-grid-layout">
            {/* Left side: Defined POS Machines list */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '900', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-laptop-code" style={{ color: '#014cb1' }}></i>
                قائمة ماكينات POS المعتمدة ({posMachines.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {posMachines.map(mac => (
                  <div key={mac.id} style={{ 
                    background: 'var(--panel)', 
                    padding: '15px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text)' }}>{mac.machine_name}</span>
                      <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '10px', 
                        fontSize: '10px', 
                        fontWeight: 'bold',
                        background: mac.is_active ? '#dcfce7' : '#f3f4f6',
                        color: mac.is_active ? '#166534' : '#4b5563'
                      }}>
                        {mac.is_active ? 'نشطة' : 'معطلة'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '5px' }}>
                      <i className="fa-solid fa-barcode" style={{ marginLeft: '6px' }}></i>
                      السيريال: {mac.machine_serial || 'غير متوفر'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '5px' }}>
                      <i className="fa-solid fa-bank" style={{ marginLeft: '6px' }}></i>
                      المصرف: {mac.bank_name}
                    </div>
                    {mac.merchant_id && (
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '5px' }}>
                        <i className="fa-solid fa-id-card" style={{ marginLeft: '6px' }}></i>
                        معرف التاجر: {mac.merchant_id}
                      </div>
                    )}
                    {mac.location && (
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>
                        <i className="fa-solid fa-location-dot" style={{ marginLeft: '6px' }}></i>
                        الموقع: {mac.location}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '10px' }}>
                      <button 
                        onClick={() => handleToggleMachineActive(mac.id)}
                        className="secondary" 
                        style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', fontWeight: 'bold' }}
                      >
                        {mac.is_active ? 'تعطيل الماكينة' : 'تفعيل الماكينة'}
                      </button>
                      <button 
                        onClick={() => handleDeleteMachine(mac.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}
                        title="حذف الماكينة"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side: daily POS settlement reports transactions list */}
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: '900', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-receipt" style={{ color: '#014cb1' }}></i>
                تسويات وعمليات تسوية الأرصدة اليومية مبيعات POS
              </h3>

              {/* Filters for transactions */}
              <div className="users-filters-box" style={{ padding: '15px', borderRadius: '12px', background: 'var(--panel)', border: '1px solid var(--border)', marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1' }}>
                    <select 
                      value={posFilter.machine_id}
                      onChange={e => setPosFilter({ ...posFilter, machine_id: e.target.value })}
                      style={{ 
                        width: '100%', 
                        height: '42px', 
                        borderRadius: '10px', 
                        border: '1px solid var(--border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        paddingRight: '12px',
                        paddingLeft: '32px',
                        fontSize: '13px',
                        fontWeight: '700',
                        fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                        direction: 'rtl',
                        textAlign: 'right',
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <option value="all">كل الماكينات</option>
                      {posMachines.map(m => <option key={m.id} value={m.id}>{m.machine_name} - {m.bank_name}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: '1' }}>
                    <select 
                      value={posFilter.is_reconciled}
                      onChange={e => setPosFilter({ ...posFilter, is_reconciled: e.target.value })}
                      style={{ 
                        width: '100%', 
                        height: '42px', 
                        borderRadius: '10px', 
                        border: '1px solid var(--border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        paddingRight: '12px',
                        paddingLeft: '32px',
                        fontSize: '13px',
                        fontWeight: '700',
                        fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                        direction: 'rtl',
                        textAlign: 'right',
                        outline: 'none',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <option value="all">كل حالات المطابقة</option>
                      <option value="1">مطابقة مع كشف المصرف</option>
                      <option value="0">معلقة وغير مطابقة</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Transactions list table */}
              <div className="users-card" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>تاريخ التسوية</th>
                      <th>الماكينة</th>
                      <th>المصرف المضيف</th>
                      <th>المبلغ الإجمالي</th>
                      <th>عدد العمليات</th>
                      <th>التقرير اليومي</th>
                      <th>حالة المطابقة</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posLoading ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '25px' }}>جاري تحميل التسويات...</td></tr>
                    ) : posTxns.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '25px', color: 'var(--muted)' }}>لا توجد تسويات مسجلة حالياً.</td></tr>
                    ) : posTxns.map(txn => (
                      <tr key={txn.id}>
                        <td style={{ fontWeight: 'bold' }}>{txn.transaction_date}</td>
                        <td>{txn.machine?.machine_name || 'ماكينة محذوفة'}</td>
                        <td>{txn.machine?.bank_name || '—'}</td>
                        <td style={{ fontWeight: '900', color: '#014cb1', fontSize: '14px' }}>
                          {parseFloat(txn.amount.toString()).toLocaleString()} د.ل
                        </td>
                        <td>{txn.transactions_count} عملية</td>
                        <td>
                          {txn.report_file ? (
                            <button 
                              onClick={() => setPreviewImage(resolveImageUrl(txn.report_file))}
                              style={{ 
                                background: '#eff6ff', 
                                color: '#1e40af', 
                                border: '1px solid #bfdbfe',
                                padding: '4px 8px', 
                                borderRadius: '6px', 
                                fontSize: '11px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                              }}
                            >
                              <i className="fa-solid fa-file-invoice" style={{ marginLeft: '4px' }}></i>
                              عرض التقرير
                            </button>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '12px' }}>لا يوجد ملف</span>
                          )}
                        </td>
                        <td>
                          <span style={{ 
                            padding: '4px 10px', 
                            borderRadius: '20px', 
                            fontSize: '11px', 
                            fontWeight: '900',
                            background: txn.is_reconciled ? '#dcfce7' : '#fef2f2',
                            color: txn.is_reconciled ? '#166534' : '#991b1b'
                          }}>
                            {txn.is_reconciled ? 'تمت التسوية' : 'معلقة / غير مطابقة'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button 
                              onClick={() => handleTogglePosReconcile(txn.id)}
                              className="action-btn"
                              style={{ background: txn.is_reconciled ? '#f43f5e' : '#10b981', color: '#fff', padding: '6px 10px', borderRadius: '8px', fontSize: '12px' }}
                              title={txn.is_reconciled ? 'إلغاء مطابقة التسوية' : 'تأكيد مطابقة التسوية'}
                            >
                              <i className={`fa-solid ${txn.is_reconciled ? 'fa-xmark' : 'fa-check'}`}></i>
                            </button>
                            <button 
                              onClick={() => handleDeletePosTxn(txn.id)}
                              className="action-btn"
                              style={{ background: '#ef4444', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}
                              title="حذف التسوية"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS (النوافذ المنبثقة لإضافة البيانات) */}
      {/* ========================================================================= */}

      {/* MODAL 1: ADD TREASURY TRANSACTION */}
      {showTreasuryModal && (
        <div className="modal-overlay" onClick={() => setShowTreasuryModal(false)}>
          <div className="modal-content dark-modal" style={{ maxWidth: '1200px', background: 'var(--panel)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إضافة حركة نقدية جديدة في الخزينة (كاش)</h3>
              <button onClick={() => setShowTreasuryModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSaveTreasuryTxn} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                <div className="form-group">
                  <label>تاريخ المعاملة</label>
                  <input 
                    type="date" 
                    required 
                    value={treasuryFormData.transaction_date} 
                    onChange={e => setTreasuryFormData({ ...treasuryFormData, transaction_date: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>نوع الحركة</label>
                  <select 
                    value={treasuryFormData.type} 
                    onChange={e => setTreasuryFormData({ ...treasuryFormData, type: e.target.value })}
                    style={{ 
                      width: '100%', 
                      height: '42px', 
                      borderRadius: '10px', 
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      paddingRight: '12px',
                      paddingLeft: '32px',
                      fontSize: '14px',
                      fontWeight: '700',
                      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                      direction: 'rtl',
                      textAlign: 'right',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="income">مقبوضات / إيراد (+)</option>
                    <option value="expense">مصروفات / دفع (-)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>القيمة المالية (د.ل)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="0.00"
                    value={treasuryFormData.amount} 
                    onChange={e => setTreasuryFormData({ ...treasuryFormData, amount: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>رقم إيصال المعاملة (إن وجد)</label>
                  <input 
                    type="text" 
                    placeholder="مثال: REC-10294"
                    value={treasuryFormData.reference_number} 
                    onChange={e => setTreasuryFormData({ ...treasuryFormData, reference_number: e.target.value })} 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>البيان التفصيلي / الغرض من الحركة</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="اكتب بياناً واضحاً ومفصلاً هنا..."
                    value={treasuryFormData.description} 
                    onChange={e => setTreasuryFormData({ ...treasuryFormData, description: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>المصدر / المستفيد</label>
                  <input 
                    type="text" 
                    placeholder="مثال: شركة المدار / اسم الوكيل المودع"
                    value={treasuryFormData.source} 
                    onChange={e => setTreasuryFormData({ ...treasuryFormData, source: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>ربط بالفرع أو الوكيل (اختياري)</label>
                  <select 
                    value={treasuryFormData.branch_agent_id} 
                    onChange={e => setTreasuryFormData({ ...treasuryFormData, branch_agent_id: e.target.value })}
                    style={{ 
                      width: '100%', 
                      height: '42px', 
                      borderRadius: '10px', 
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      paddingRight: '12px',
                      paddingLeft: '32px',
                      fontSize: '14px',
                      fontWeight: '700',
                      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                      direction: 'rtl',
                      textAlign: 'right',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">لا يوجد ارتباط مباشر</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.agency_name} ({a.code})</option>)}
                  </select>
                </div>
                {treasuryFormData.type === 'expense' && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label>جهة الصرف (أين صرف المبلغ كأصل أو مادة مستهلكة)</label>
                    <input 
                      type="text" 
                      placeholder="مثال: شراء أجهزة إلكترونية ثابتة للمكتب / قرطاسية ومواد تنظيف"
                      value={treasuryFormData.expense_destination} 
                      onChange={e => setTreasuryFormData({ ...treasuryFormData, expense_destination: e.target.value })} 
                    />
                  </div>
                )}
                <div className="form-group" style={{ gridColumn: treasuryFormData.type === 'expense' ? 'span 2' : 'span 4' }}>
                  <label>تحميل صورة السند / المرفق الورقي</label>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={e => setTreasuryFormData({ ...treasuryFormData, voucher_image: e.target.files ? e.target.files[0] : null })} 
                    style={{ padding: '8px' }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 4' }}>
                  <label>ملاحظات إدارية إضافية</label>
                  <textarea 
                    rows={1} 
                    value={treasuryFormData.notes} 
                    onChange={e => setTreasuryFormData({ ...treasuryFormData, notes: e.target.value })}
                    placeholder="اكتب أي ملاحظات إضافية هنا..."
                  ></textarea>
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowTreasuryModal(false)} className="secondary" style={{ padding: '10px 20px' }}>إلغاء</button>
                <button type="submit" className="primary" style={{ padding: '10px 30px' }}>حفظ حركة الخزينة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD BANK TRANSACTION */}
      {showBankModal && (
        <div className="modal-overlay" onClick={() => setShowBankModal(false)}>
          <div className="modal-content dark-modal" style={{ maxWidth: '1200px', background: 'var(--panel)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إضافة معاملة أو إيداع بنكي جديد (التحصيلات)</h3>
              <button onClick={() => setShowBankModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSaveBankTxn} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                <div className="form-group">
                  <label>تاريخ المعاملة</label>
                  <input 
                    type="date" 
                    required 
                    value={bankFormData.transaction_date} 
                    onChange={e => setBankFormData({ ...bankFormData, transaction_date: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>رقم المرجع (رقم الحوالة / صك / إيصال)</label>
                  <input 
                    type="text" 
                    placeholder="أدخل رقم الحوالة للتتبع والمطابقة"
                    value={bankFormData.reference_number} 
                    onChange={e => setBankFormData({ ...bankFormData, reference_number: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>المصرف المستلم</label>
                  <select 
                    value={bankFormData.bank_name} 
                    onChange={e => setBankFormData({ ...bankFormData, bank_name: e.target.value })}
                    style={{ 
                      width: '100%', 
                      height: '42px', 
                      borderRadius: '10px', 
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      paddingRight: '12px',
                      paddingLeft: '32px',
                      fontSize: '14px',
                      fontWeight: '700',
                      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                      direction: 'rtl',
                      textAlign: 'right',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>رقم الحساب الجاري للمصرف المستلم</label>
                  <input 
                    type="text" 
                    placeholder="مثال: 120-20494-001"
                    value={bankFormData.account_number} 
                    onChange={e => setBankFormData({ ...bankFormData, account_number: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>طريقة ونوع التحصيل (الـ 7 طرق المعتمدة)</label>
                  <select 
                    value={bankFormData.transaction_type} 
                    onChange={e => setBankFormData({ ...bankFormData, transaction_type: e.target.value })}
                    style={{ 
                      width: '100%', 
                      height: '42px', 
                      borderRadius: '10px', 
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      paddingRight: '12px',
                      paddingLeft: '32px',
                      fontSize: '14px',
                      fontWeight: '700',
                      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                      direction: 'rtl',
                      textAlign: 'right',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {BANK_TRANSACTION_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>القيمة المالية (د.ل)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="0.00"
                    value={bankFormData.amount} 
                    onChange={e => setBankFormData({ ...bankFormData, amount: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>نوع الحركة</label>
                  <select 
                    value={bankFormData.type} 
                    onChange={e => setBankFormData({ ...bankFormData, type: e.target.value })}
                    style={{ 
                      width: '100%', 
                      height: '42px', 
                      borderRadius: '10px', 
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      paddingRight: '12px',
                      paddingLeft: '32px',
                      fontSize: '14px',
                      fontWeight: '700',
                      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                      direction: 'rtl',
                      textAlign: 'right',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="deposit">إيداع / تحصيل مباشر (+)</option>
                    <option value="withdrawal">سحب / خصم (-)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>اسم المودع أو المحول بالكامل</label>
                  <input 
                    type="text" 
                    placeholder="مثال: أحمد عبد الحليم"
                    value={bankFormData.payer_name} 
                    onChange={e => setBankFormData({ ...bankFormData, payer_name: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>المصرف المرسل منه (اختياري)</label>
                  <input 
                    type="text" 
                    placeholder="مثال: مصرف التجارة والتنمية"
                    value={bankFormData.source_bank} 
                    onChange={e => setBankFormData({ ...bankFormData, source_bank: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>ربط الحوالة بالوكيل/الفرع</label>
                  <select 
                    value={bankFormData.branch_agent_id} 
                    onChange={e => setBankFormData({ ...bankFormData, branch_agent_id: e.target.value })}
                    style={{ 
                      width: '100%', 
                      height: '42px', 
                      borderRadius: '10px', 
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      paddingRight: '12px',
                      paddingLeft: '32px',
                      fontSize: '14px',
                      fontWeight: '700',
                      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                      direction: 'rtl',
                      textAlign: 'right',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">غير مرتبط بوكيل</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.agency_name} ({a.code})</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>تحميل إيصال المرفق أو الحوالة</label>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={e => setBankFormData({ ...bankFormData, voucher_image: e.target.files ? e.target.files[0] : null })} 
                    style={{ padding: '8px' }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 4' }}>
                  <label>ملاحظات وتفاصيل المعاملة</label>
                  <textarea 
                    rows={1} 
                    value={bankFormData.notes} 
                    onChange={e => setBankFormData({ ...bankFormData, notes: e.target.value })}
                    placeholder="اكتب أي ملاحظات إضافية هنا..."
                  ></textarea>
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowBankModal(false)} className="secondary" style={{ padding: '10px 20px' }}>إلغاء</button>
                <button type="submit" className="primary" style={{ padding: '10px 30px' }}>حفظ وإضافة الحركة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD POS MACHINE */}
      {showMachineModal && (
        <div className="modal-overlay" onClick={() => setShowMachineModal(false)}>
          <div className="modal-content dark-modal" style={{ maxWidth: '900px', background: 'var(--panel)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تعريف ماكينة نقاط بيع جديدة (POS)</h3>
              <button onClick={() => setShowMachineModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSaveMachine} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>اسم الماكينة (التعريفي بالشركة)</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="مثال: Verifone الإدارة الرئيسية"
                    value={machineFormData.machine_name} 
                    onChange={e => setMachineFormData({ ...machineFormData, machine_name: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>الرقم التسلسلي للماكينة (Serial Number)</label>
                  <input 
                    type="text" 
                    placeholder="أدخل السيريال المكتوب خلف الماكينة"
                    value={machineFormData.machine_serial} 
                    onChange={e => setMachineFormData({ ...machineFormData, machine_serial: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>المصرف المضيف المربوط عليه الحساب</label>
                  <select 
                    value={machineFormData.bank_name} 
                    onChange={e => setMachineFormData({ ...machineFormData, bank_name: e.target.value })}
                    style={{ 
                      width: '100%', 
                      height: '42px', 
                      borderRadius: '10px', 
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      paddingRight: '12px',
                      paddingLeft: '32px',
                      fontSize: '14px',
                      fontWeight: '700',
                      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                      direction: 'rtl',
                      textAlign: 'right',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>معرف التاجر بالبنك (Merchant ID)</label>
                  <input 
                    type="text" 
                    placeholder="معرف التاجر الممنوح من المصرف"
                    value={machineFormData.merchant_id} 
                    onChange={e => setMachineFormData({ ...machineFormData, merchant_id: e.target.value })} 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>موقع تواجد الماكينة / الفرع</label>
                  <input 
                    type="text" 
                    placeholder="مثال: فرع طرابلس - صالة الاستقبال الرئيسية"
                    value={machineFormData.location} 
                    onChange={e => setMachineFormData({ ...machineFormData, location: e.target.value })} 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>ملاحظات إضافية</label>
                  <textarea 
                    rows={2} 
                    value={machineFormData.notes} 
                    onChange={e => setMachineFormData({ ...machineFormData, notes: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowMachineModal(false)} className="secondary" style={{ padding: '8px 16px' }}>إلغاء</button>
                <button type="submit" className="primary" style={{ padding: '8px 24px' }}>حفظ وتعريف الماكينة</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RECORD POS DAILY TRANSACTION SETTLEMENT */}
      {showPosTxnModal && (
        <div className="modal-overlay" onClick={() => setShowPosTxnModal(false)}>
          <div className="modal-content dark-modal" style={{ maxWidth: '1100px', background: 'var(--panel)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>تسجيل تسوية المبيعات اليومية لنقاط البيع POS</h3>
              <button onClick={() => setShowPosTxnModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSavePosTransaction} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                <div className="form-group">
                  <label>اختر الماكينة المستخدمة</label>
                  <select 
                    required
                    value={posTxnFormData.pos_machine_id} 
                    onChange={e => setPosTxnFormData({ ...posTxnFormData, pos_machine_id: e.target.value })}
                    style={{ 
                      width: '100%', 
                      height: '42px', 
                      borderRadius: '10px', 
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      paddingRight: '12px',
                      paddingLeft: '32px',
                      fontSize: '14px',
                      fontWeight: '700',
                      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                      direction: 'rtl',
                      textAlign: 'right',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">-- اختر الماكينة --</option>
                    {posMachines.map(m => <option key={m.id} value={m.id}>{m.machine_name} - {m.bank_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>تاريخ التقرير / التسوية اليومية</label>
                  <input 
                    type="date" 
                    required 
                    value={posTxnFormData.transaction_date} 
                    onChange={e => setPosTxnFormData({ ...posTxnFormData, transaction_date: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>المبلغ الإجمالي للتسوية (د.ل)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    required 
                    placeholder="0.00"
                    value={posTxnFormData.amount} 
                    onChange={e => setPosTxnFormData({ ...posTxnFormData, amount: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>عدد العمليات المقبولة بالتقرير</label>
                  <input 
                    type="number" 
                    required 
                    value={posTxnFormData.transactions_count} 
                    onChange={e => setPosTxnFormData({ ...posTxnFormData, transactions_count: e.target.value })} 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>رقم مرجع التسوية / كود التثبيت</label>
                  <input 
                    type="text" 
                    placeholder="أدخل رمز التسوية المطبوع في إيصال إغلاق الماكينة"
                    value={posTxnFormData.reference_number} 
                    onChange={e => setPosTxnFormData({ ...posTxnFormData, reference_number: e.target.value })} 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>تحميل إيصال تسوية الماكينة (صورة التقرير الورقي)</label>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    onChange={e => setPosTxnFormData({ ...posTxnFormData, report_file: e.target.files ? e.target.files[0] : null })} 
                    style={{ padding: '8px' }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 4' }}>
                  <label>ملاحظات التسوية اليومية</label>
                  <textarea 
                    rows={1} 
                    value={posTxnFormData.notes} 
                    onChange={e => setPosTxnFormData({ ...posTxnFormData, notes: e.target.value })}
                    placeholder="اكتب أي ملاحظات إدارية هنا..."
                  ></textarea>
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowPosTxnModal(false)} className="secondary" style={{ padding: '10px 20px' }}>إلغاء</button>
                <button type="submit" className="primary" style={{ padding: '10px 30px' }}>تسجيل وإغلاق التقرير</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: PREMIUM MOCKUP IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div className="modal-overlay" onClick={() => setPreviewImage(null)}>
          <div className="modal-content dark-modal" style={{ maxWidth: '850px', background: 'transparent', border: 'none', boxShadow: 'none', padding: '0', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button 
                onClick={() => setPreviewImage(null)} 
                style={{ 
                  background: 'rgba(255,255,255,0.2)', 
                  border: 'none', 
                  color: '#fff', 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  cursor: 'pointer',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                &times;
              </button>
            </div>
            <img 
              src={previewImage} 
              alt="سند ورقة الحوالة البنكية / إيصال الخزينة" 
              style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} 
              onError={() => {
                showToast('خطأ في تحميل ملف المعاينة، قد لا يكون الملف صورة أو المسار غير صحيح', 'error');
                setPreviewImage(null);
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
