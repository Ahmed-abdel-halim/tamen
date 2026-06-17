import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE_URL, resolveImageUrl } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';
import ExpenseManagement from './ExpenseManagement';


interface BranchAgent {
  id: number;
  agency_name: string;
  agent_name: string;
  code: string;
  phone?: string;
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
  supplier_phone?: string;
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
  branch_agents?: BranchAgent[];
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
  source_account_number?: string;
  destination_bank?: string;
  agent_name?: string;
  branch_agent_id?: number;
  payment_method?: string;
  voucher_image?: string;
  payer_name?: string;
  payer_phone?: string;
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const activeTab = useMemo(() => {
    if (tabParam === 'treasury' || tabParam === 'banks' || tabParam === 'pos' || tabParam === 'expenses') {
      return tabParam as 'treasury' | 'banks' | 'pos' | 'expenses';
    }
    return 'banks';
  }, [tabParam]);

  const setActiveTab = (newTab: 'treasury' | 'banks' | 'pos' | 'expenses') => {
    setSearchParams({ tab: newTab });
  };

  const [agents, setAgents] = useState<BranchAgent[]>([]);

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Accept': 'application/json'
    };
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u && u.id) {
          headers['X-User-Id'] = String(u.id);
        }
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // State & Helper for custom confirmation modal
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const customConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

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
    supplier_phone: '',
    source: 'المدار الليبي',
    reference_number: '',
    branch_agent_id: '',
    expense_destination: '',
    payment_source: 'cash',
    notes: '',
    voucher_image: null as File | null
  });
  const [treasuryAgentSearch, setTreasuryAgentSearch] = useState('غير مرتبط بوكيل');
  const [showTreasuryAgentDropdown, setShowTreasuryAgentDropdown] = useState(false);

  // -------------------------------------------------------------
  // 2. Bank State (المصارف)
  // -------------------------------------------------------------
  const [bankTxns, setBankTxns] = useState<BankTransaction[]>([]);
  const [activeBankFilter, setActiveBankFilter] = useState('all');
  const [bankSearch, setBankSearch] = useState('');
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankAgentSearch, setBankAgentSearch] = useState('غير مرتبط بوكيل');
  const [showBankAgentDropdown, setShowBankAgentDropdown] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [isSavingTreasury, setIsSavingTreasury] = useState(false);
  
  // Dynamic settings lists
  const [dbBanks, setDbBanks] = useState<{id: number, name: string, account_number?: string}[]>([]);
  const [dbSourceBanks, setDbSourceBanks] = useState<{id: number, name: string, account_number?: string}[]>([]);
  const [dbTypes, setDbTypes] = useState<{id: number, name: string}[]>([]);
  
  // Settings Modals
  const [showBankSettingsModal, setShowBankSettingsModal] = useState(false);
  const [showSourceBankSettingsModal, setShowSourceBankSettingsModal] = useState(false);
  const [showTypeSettingsModal, setShowTypeSettingsModal] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankAccountNumber, setNewBankAccountNumber] = useState('');
  const [newSourceBankName, setNewSourceBankName] = useState('');
  const [newSourceBankAccountNumber, setNewSourceBankAccountNumber] = useState('');
  const [newTypeName, setNewTypeName] = useState('');

  // Mode for the bank transaction modal (deposit or withdrawal)
  const [bankModalType, setBankModalType] = useState<'deposit' | 'withdrawal'>('deposit');

  // State variables for inline bank editing
  const [editingBankId, setEditingBankId] = useState<number | null>(null);
  const [editingBankName, setEditingBankName] = useState('');
  const [editingBankAccountNumber, setEditingBankAccountNumber] = useState('');
  const [editingBankTxnId, setEditingBankTxnId] = useState<number | null>(null);

  const [editingSourceBankId, setEditingSourceBankId] = useState<number | null>(null);
  const [editingSourceBankName, setEditingSourceBankName] = useState('');
  const [editingSourceBankAccountNumber, setEditingSourceBankAccountNumber] = useState('');

  const [bankFormData, setBankFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    bank_name: '',
    account_number: '',
    amount: '',
    type: 'deposit',
    notes: '',
    transaction_type: '',
    source_bank: '',
    source_account_number: '',
    destination_bank: '',
    branch_agent_id: '',
    payer_name: '',
    payer_phone: '',
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
  const [currentMachinePage, setCurrentMachinePage] = useState(1);
  const [currentPosTxnPage, setCurrentPosTxnPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    setCurrentPosTxnPage(1);
  }, [posFilter.machine_id, posFilter.from_date, posFilter.to_date, posFilter.is_reconciled]);

  const [showMachineModal, setShowMachineModal] = useState(false);
  const [editingMachineId, setEditingMachineId] = useState<number | null>(null);
  const [showPosTxnModal, setShowPosTxnModal] = useState(false);
  const [machineFormData, setMachineFormData] = useState({
    machine_name: '',
    machine_serial: '',
    bank_name: BANKS[0],
    merchant_id: '',
    location: '',
    notes: '',
    branch_agent_ids: [] as number[]
  });
  const [agentSearchQuery, setAgentSearchQuery] = useState('');
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
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
    fetchBankSettings();
  }, []);

  const fetchBankSettings = async () => {
    try {
      const resBanks = await fetch(`${API_BASE_URL}/bank-settings/banks`);
      if (resBanks.ok) {
        const banksData = await resBanks.json();
        setDbBanks(banksData);
      }
      const resSourceBanks = await fetch(`${API_BASE_URL}/bank-settings/source-banks`);
      if (resSourceBanks.ok) {
        const sourceBanksData = await resSourceBanks.json();
        setDbSourceBanks(sourceBanksData);
      }
      const resTypes = await fetch(`${API_BASE_URL}/bank-settings/transaction-types`);
      if (resTypes.ok) {
        const typesData = await resTypes.json();
        setDbTypes(typesData);
      }
    } catch (e) {
      console.error('Error fetching bank settings:', e);
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/bank-settings/banks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBankName, account_number: newBankAccountNumber })
      });
      if (res.ok) {
        showToast('تم إضافة المصرف بنجاح', 'success');
        setNewBankName('');
        setNewBankAccountNumber('');
        fetchBankSettings();
      } else {
        const err = await res.json();
        showToast(err.message || 'خطأ في إضافة المصرف', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleDeleteBank = async (id: number) => {
    customConfirm('تأكيد حذف المصرف', 'هل أنت متأكد من حذف هذا المصرف؟', async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/bank-settings/banks/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          showToast('تم حذف المصرف بنجاح', 'success');
          fetchBankSettings();
        } else {
          showToast('فشل حذف المصرف', 'error');
        }
      } catch (e) {
        showToast('خطأ في الاتصال بالخادم', 'error');
      }
    });
  };

  const handleUpdateBank = async (id: number) => {
    if (!editingBankName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/bank-settings/banks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingBankName, account_number: editingBankAccountNumber })
      });
      if (res.ok) {
        showToast('تم تعديل المصرف بنجاح', 'success');
        setEditingBankId(null);
        fetchBankSettings();
      } else {
        const err = await res.json();
        showToast(err.message || 'خطأ في تعديل المصرف', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleAddSourceBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceBankName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/bank-settings/source-banks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSourceBankName, account_number: newSourceBankAccountNumber })
      });
      if (res.ok) {
        showToast('تم إضافة المصرف المرسل بنجاح', 'success');
        setNewSourceBankName('');
        setNewSourceBankAccountNumber('');
        fetchBankSettings();
      } else {
        const err = await res.json();
        showToast(err.message || 'خطأ في إضافة المصرف المرسل', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleDeleteSourceBank = async (id: number) => {
    customConfirm('تأكيد حذف المصرف المرسل منه', 'هل أنت متأكد من حذف هذا المصرف المرسل منه؟', async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/bank-settings/source-banks/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          showToast('تم حذف المصرف المرسل بنجاح', 'success');
          fetchBankSettings();
        } else {
          showToast('فشل حذف المصرف المرسل', 'error');
        }
      } catch (e) {
        showToast('خطأ في الاتصال بالخادم', 'error');
      }
    });
  };

  const handleUpdateSourceBank = async (id: number) => {
    if (!editingSourceBankName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/bank-settings/source-banks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingSourceBankName, account_number: editingSourceBankAccountNumber })
      });
      if (res.ok) {
        showToast('تم تعديل المصرف بنجاح', 'success');
        setEditingSourceBankId(null);
        fetchBankSettings();
      } else {
        const err = await res.json();
        showToast(err.message || 'خطأ في تعديل المصرف', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/bank-settings/transaction-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTypeName })
      });
      if (res.ok) {
        showToast('تم إضافة طريقة التحصيل بنجاح', 'success');
        setNewTypeName('');
        fetchBankSettings();
      } else {
        const err = await res.json();
        showToast(err.message || 'خطأ في الإضافة', 'error');
      }
    } catch (e) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleDeleteType = async (id: number) => {
    customConfirm('تأكيد حذف طريقة التحصيل', 'هل أنت متأكد من حذف طريقة التحصيل هذه؟', async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/bank-settings/transaction-types/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          showToast('تم الحذف بنجاح', 'success');
          fetchBankSettings();
        } else {
          showToast('فشل الحذف', 'error');
        }
      } catch (e) {
        showToast('خطأ في الاتصال بالخادم', 'error');
      }
    });
  };

  const openBankModal = (type: 'deposit' | 'withdrawal') => {
    setBankModalType(type);
    const defaultBank = dbBanks.length > 0 ? dbBanks[0] : null;
    setBankFormData({
      transaction_date: new Date().toISOString().split('T')[0],
      reference_number: '',
      bank_name: defaultBank ? defaultBank.name : '',
      account_number: defaultBank ? (defaultBank.account_number || '') : '',
      amount: '',
      type: type,
      notes: '',
      transaction_type: dbTypes.length > 0 ? dbTypes[0].name : '',
      source_bank: '',
      source_account_number: '',
      destination_bank: '',
      branch_agent_id: '',
      payer_name: '',
      payer_phone: '',
      voucher_image: null
    });
    setBankAgentSearch('غير مرتبط بوكيل');
    setEditingBankTxnId(null);
    setShowBankModal(true);
  };

  const openEditBankModal = (txn: BankTransaction) => {
    setEditingBankTxnId(txn.id);
    setBankModalType(txn.type);
    setBankFormData({
      transaction_date: txn.transaction_date ? new Date(txn.transaction_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      reference_number: txn.reference_number || '',
      bank_name: txn.bank_name || '',
      account_number: txn.account_number || '',
      amount: String(txn.amount),
      type: txn.type,
      notes: txn.notes || '',
      transaction_type: txn.transaction_type || '',
      source_bank: txn.source_bank || '',
      source_account_number: txn.source_account_number || '',
      destination_bank: txn.destination_bank || '',
      branch_agent_id: txn.branch_agent_id ? String(txn.branch_agent_id) : '',
      payer_name: txn.payer_name || '',
      payer_phone: txn.payer_phone || '',
      voucher_image: null
    });
    if (txn.branch_agent_id) {
      const agent = agents.find(a => a.id === txn.branch_agent_id);
      if (agent) {
        setBankAgentSearch(`${agent.agency_name} (${agent.code})`);
      } else if (txn.agent_name) {
        setBankAgentSearch(txn.agent_name);
      } else {
        setBankAgentSearch('غير مرتبط بوكيل');
      }
    } else if (txn.agent_name) {
      setBankAgentSearch(txn.agent_name);
    } else {
      setBankAgentSearch('غير مرتبط بوكيل');
    }
    setShowBankModal(true);
  };

  const handleCloseBankModal = () => {
    setShowBankModal(false);
    setEditingBankTxnId(null);
    setBankAgentSearch('غير مرتبط بوكيل');
  };

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
    setIsSavingTreasury(true);
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
          supplier_phone: '',
          source: 'المدار الليبي',
          reference_number: '',
          branch_agent_id: '',
          expense_destination: '',
          payment_source: 'cash',
          notes: '',
          voucher_image: null
        });
        setTreasuryAgentSearch('غير مرتبط بوكيل');
        fetchTreasuryData();
      } else {
        const data = await res.json();
        showToast(data.message || 'حدث خطأ أثناء الحفظ', 'error');
      }
    } catch (err) {
      showToast('خطأ في حفظ المعاملة', 'error');
    } finally {
      setIsSavingTreasury(false);
    }
  };

  const handleDeleteTreasuryTxn = async (id: number) => {
    customConfirm('تأكيد حذف المعاملة', 'هل أنت متأكد من حذف هذه المعاملة؟', async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/treasury/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          showToast('تم حذف الحركة بنجاح', 'success');
          fetchTreasuryData();
        }
      } catch (e) {
        showToast('فشل حذف الحركة', 'error');
      }
    });
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
    setIsSavingBank(true);
    const isEdit = editingBankTxnId !== null;
    const url = isEdit ? `${API_BASE_URL}/bank-transactions/${editingBankTxnId}` : `${API_BASE_URL}/bank-transactions`;
    
    const formData = new FormData();
    Object.entries(bankFormData).forEach(([key, val]) => {
      if (key === 'voucher_image' && val) {
        formData.append('voucher_image', val as File);
      } else if (key === 'type') {
        formData.append('type', bankModalType);
      } else if (val !== null && val !== undefined) {
        formData.append(key, String(val));
      }
    });

    if (isEdit) {
      formData.append('_method', 'PUT');
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        showToast(isEdit ? 'تم تعديل الحركة البنكية بنجاح' : 'تم إضافة الحركة البنكية بنجاح', 'success');
        setShowBankModal(false);
        setEditingBankTxnId(null);
        const defaultBank = dbBanks.length > 0 ? dbBanks[0] : null;
        setBankFormData({
          transaction_date: new Date().toISOString().split('T')[0],
          reference_number: '',
          bank_name: defaultBank ? defaultBank.name : '',
          account_number: defaultBank ? (defaultBank.account_number || '') : '',
          amount: '',
          type: 'deposit',
          notes: '',
          transaction_type: dbTypes.length > 0 ? dbTypes[0].name : '',
          source_bank: '',
          source_account_number: '',
          destination_bank: '',
          branch_agent_id: '',
          payer_name: '',
          payer_phone: '',
          voucher_image: null
        });
        setBankAgentSearch('غير مرتبط بوكيل');
        fetchBankData();
      } else {
        const errData = await res.json();
        showToast(errData.message || 'خطأ في حفظ الحركة البنكية', 'error');
      }
    } catch (err) {
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setIsSavingBank(false);
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
    customConfirm('تأكيد حذف المعاملة البنكية', 'هل أنت متأكد من حذف هذه المعاملة البنكية؟', async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/bank-transactions/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          showToast('تم حذف المعاملة البنكية', 'success');
          fetchBankData();
        }
      } catch (e) {
        showToast('فشل حذف المعاملة', 'error');
      }
    });
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
      const url = editingMachineId
        ? `${API_BASE_URL}/pos-machines/${editingMachineId}`
        : `${API_BASE_URL}/pos-machines`;
      const method = editingMachineId ? 'PUT' : 'POST';
      const payload = {
        ...machineFormData,
        branch_agent_ids: machineFormData.branch_agent_ids
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast(editingMachineId ? 'تم تحديث بيانات الماكينة بنجاح' : 'تم إضافة ماكينة POS بنجاح', 'success');
        setShowMachineModal(false);
        setEditingMachineId(null);
        setMachineFormData({
          machine_name: '',
          machine_serial: '',
          bank_name: BANKS[0],
          merchant_id: '',
          location: '',
          notes: '',
          branch_agent_ids: []
        });
        fetchPosData();
      }
    } catch (e) {
      showToast('فشل حفظ بيانات الماكينة', 'error');
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
    customConfirm('تأكيد حذف ماكينة POS', 'هل أنت متأكد من حذف ماكينة POS هذه نهائياً؟', async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/pos-machines/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          showToast('تم حذف الماكينة بنجاح', 'success');
          fetchPosData();
        }
      } catch (e) {
        showToast('فشل حذف الماكينة', 'error');
      }
    });
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
    customConfirm('تأكيد حذف معاملة POS', 'هل أنت متأكد من حذف معاملة تسوية POS هذه؟', async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/pos-transactions/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          showToast('تم حذف الحركة بنجاح', 'success');
          fetchPosData();
        }
      } catch (e) {
        showToast('فشل حذف الحركة', 'error');
      }
    });
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
        (t.payer_phone && t.payer_phone.toLowerCase().includes(bankSearch.toLowerCase())) ||
        (t.notes && t.notes.toLowerCase().includes(bankSearch.toLowerCase())) ||
        (t.agent_name && t.agent_name.toLowerCase().includes(bankSearch.toLowerCase()));
      return matchesBank && matchesSearch;
    });
  }, [bankTxns, activeBankFilter, bankSearch]);

  const bankBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    dbBanks.forEach(b => { balances[b.name] = 0; });

    bankTxns.forEach(t => {
      // Ensure we initialize dynamic banks if they appear in transaction but not in dbBanks
      if (balances[t.bank_name] === undefined) {
        balances[t.bank_name] = 0;
      }
      const amt = parseFloat(t.amount.toString()) || 0;
      if (t.type === 'deposit') {
        balances[t.bank_name] += amt;
      } else {
        balances[t.bank_name] -= amt;
      }
    });
    return balances;
  }, [bankTxns, dbBanks]);

  // Calculations for POS Machines pagination
  const totalMachinesCount = posMachines.length;
  const totalMachinesPages = Math.ceil(totalMachinesCount / perPage);
  const machinesStartIndex = (currentMachinePage - 1) * perPage;
  const paginatedMachines = posMachines.slice(machinesStartIndex, machinesStartIndex + perPage);

  // Calculations for POS Transactions pagination
  const totalPosTxnsCount = posTxns.length;
  const totalPosTxnsPages = Math.ceil(totalPosTxnsCount / perPage);
  const posTxnsStartIndex = (currentPosTxnPage - 1) * perPage;
  const paginatedPosTxns = posTxns.slice(posTxnsStartIndex, posTxnsStartIndex + perPage);

  // -------------------------------------------------------------
  // WhatsApp Sharing Functions
  // -------------------------------------------------------------
  const handleWhatsAppBankShare = (txn: BankTransaction) => {
    const agent = agents.find(a => a.id === txn.branch_agent_id || a.agency_name === txn.agent_name);
    const targetPhone = txn.payer_phone || agent?.phone || '';
    
    const message = `*شركة المدار الليبي للتأمين* 🏢%0A` +
      `*إشعار إيداع مصرفي جديد*%0A%0A` +
      `👤 *المرسل / المودع:* ${txn.payer_name || '—'}%0A` +
      `📞 *رقم الهاتف:* ${txn.payer_phone || '—'}%0A` +
      `💰 *المبلغ المودع:* ${parseFloat(txn.amount.toString()).toLocaleString()} د.ل%0A` +
      `🏦 *المصرف:* ${txn.bank_name}%0A` +
      `📅 *التاريخ:* ${txn.transaction_date}%0A` +
      `📌 *رقم المرجع:* ${txn.reference_number || '—'}%0A` +
      `🏢 *الوكيل المرتبط:* ${txn.agent_name || 'غير مرتبط'}%0A%0A` +
      `تم إيداع القيمة بنجاح في حساب الشركة. شكراً لتعاملكم معنا. ✨`;

    let cleanPhone = targetPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('09')) {
      cleanPhone = '218' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('9')) {
      cleanPhone = '218' + cleanPhone;
    }

    if (!cleanPhone) {
      showToast('لا يوجد رقم هاتف للوكيل أو المودع لإرسال الرسالة', 'error');
      return;
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleWhatsAppTreasuryShare = (txn: TreasuryTransaction) => {
    const agent = agents.find(a => a.id === txn.branch_agent_id);
    const targetPhone = txn.supplier_phone || agent?.phone || '';
    
    const message = `*شركة المدار الليبي للتأمين* 🏢%0A` +
      `*إشعار حركة خزينة (قبض نقدي)*%0A%0A` +
      `👤 *المورد / الجهة الدافعة:* ${txn.description || '—'}%0A` +
      `📞 *رقم الهاتف:* ${txn.supplier_phone || '—'}%0A` +
      `💰 *المبلغ:* ${parseFloat(txn.amount.toString()).toLocaleString()} د.ل%0A` +
      `🏦 *المستفيد:* المدار الليبي%0A` +
      `📅 *التاريخ:* ${txn.transaction_date}%0A` +
      `📌 *رقم الإيصال:* ${txn.reference_number || '—'}%0A` +
      `🏢 *الوكيل المرتبط:* ${agent?.agency_name || 'غير مرتبط'}%0A%0A` +
      `تم قبض المبلغ نقداً وإيداعه بالخزينة. شكراً لكم. ✨`;

    let cleanPhone = targetPhone.replace(/\D/g, '');
    if (cleanPhone.startsWith('09')) {
      cleanPhone = '218' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('9')) {
      cleanPhone = '218' + cleanPhone;
    }

    if (!cleanPhone) {
      showToast('لا يوجد رقم هاتف للمورد أو الوكيل لإرسال الرسالة', 'error');
      return;
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  // -------------------------------------------------------------
  // Print operational vouchers
  // -------------------------------------------------------------
  const handlePrintBankVoucher = (txn: BankTransaction) => {
    const printWindow = window.open('', '', 'width=900,height=750');
    if (!printWindow) return;

    const qrContent = `مستند إيداع مصرفي رقم: ${txn.id}\nالمصرف: ${txn.bank_name}\nالمبلغ: ${txn.amount} د.ل\nالمودع: ${txn.payer_name || '—'}\nالتاريخ: ${txn.transaction_date}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrContent)}`;
    const logoUrl = `${window.location.origin}/img/logo.png`;

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>إيصال إيداع مصرفي #${txn.id}</title>
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
      <body onload="window.print(); window.onafterprint = () => window.close();">
        <div class="voucher-card">
          <div class="header-box">
            <div style="display: flex; align-items: center; gap: 15px;">
              <img src="${logoUrl}" alt="Logo" style="height: 70px; width: auto;" />
              <div>
                <h1 style="margin: 0; font-size: 20px; color: #1e3a8a;">شركة المدار الليبي للتأمين</h1>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #475569;">إدارة الشؤون المالية والحسابات</p>
              </div>
            </div>
            <img src="${qrUrl}" alt="QR" />
          </div>
          <div class="voucher-title">إيصال تأكيد إيداع مصرفي</div>
          <table class="details-table">
            <tr>
              <td class="label">رقم الحركة:</td>
              <td>${txn.id}</td>
              <td class="label">تاريخ التوريد:</td>
              <td>${txn.transaction_date}</td>
            </tr>
            <tr>
              <td class="label">قيمة الإيداع:</td>
              <td style="font-size: 18px; font-weight: 900; color: #16a34a">${txn.amount.toLocaleString()} د.ل</td>
              <td class="label">طريقة التحصيل:</td>
              <td>${txn.payment_method || 'حوالة مصرفية / إيداع'}</td>
            </tr>
            <tr>
              <td class="label">المصرف المودع لديه:</td>
              <td>${txn.bank_name}</td>
              <td class="label">رقم المرجع / الإيصال:</td>
              <td><code>${txn.reference_number || '—'}</code></td>
            </tr>
            <tr>
              <td class="label">المودع / المحول:</td>
              <td>${txn.payer_name || '—'}</td>
              <td class="label">رقم هاتف المودع:</td>
              <td>${txn.payer_phone || '—'}</td>
            </tr>

            <tr>
              <td class="label">ملاحظات:</td>
              <td colspan="3">${txn.notes || '—'}</td>
            </tr>
          </table>
          <div class="signature-section">
            <div class="sig-box">توقيع المودع</div>
            <div class="sig-box">أمين الحزينة / الحسابات</div>
            <div class="sig-box">الختم الرسمي</div>
          </div>
          <div class="footer-note">شركة المدار الليبي للتأمين - نظام إدارة الأصول والحسابات الموحد</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportBankExcel = async () => {
    try {
      const columns = [
        { header: 'تاريخ المعاملة', key: 'transaction_date', width: 15 },
        { header: 'المصرف المودع لديه', key: 'bank_name', width: 25 },
        { header: 'نوع الحركة', key: 'type', width: 15 },
        { header: 'القيمة', key: 'amount', width: 15 },
        { header: 'رقم الإيصال / المرجع', key: 'reference_number', width: 20 },
        { header: 'المودع / المحول', key: 'payer_name', width: 25 },
        { header: 'رقم هاتف المودع', key: 'payer_phone', width: 20 },
        { header: 'الوكيل المرتبط', key: 'agent_name', width: 25 },
        { header: 'ملاحظات', key: 'notes', width: 35 },
      ];

      const data = bankTxns.map(t => ({
        transaction_date: t.transaction_date,
        bank_name: t.bank_name,
        type: t.type === 'deposit' ? 'إيداع' : 'سحب',
        amount: `${parseFloat(t.amount.toString()).toLocaleString()} د.ل`,
        reference_number: t.reference_number || '—',
        payer_name: t.payer_name || '—',
        payer_phone: t.payer_phone || '—',
        agent_name: t.agent_name || '—',
        notes: t.notes || '—',
      }));

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - سجل المعاملات المصرفية الموحد',
        subtitle: `عدد الحركات: ${bankTxns.length} - التاريخ: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'المعاملات_المصرفية',
      });
      showToast('تم تصدير تقرير المعاملات المصرفية بنجاح', 'success');
    } catch (e) {
      showToast('فشل تصدير التقرير', 'error');
    }
  };

  const handleExportTreasuryExcel = async () => {
    try {
      const columns = [
        { header: 'تاريخ المعاملة', key: 'transaction_date', width: 15 },
        { header: 'نوع الحركة', key: 'type', width: 15 },
        { header: 'القيمة', key: 'amount', width: 15 },
        { header: 'اسم المورد / الجهة الدافعة', key: 'description', width: 30 },
        { header: 'رقم هاتف المورد', key: 'supplier_phone', width: 20 },
        { header: 'المستفيد', key: 'source', width: 25 },
        { header: 'رقم الإيصال / المرجع', key: 'reference_number', width: 20 },
        { header: 'الوكيل المرتبط', key: 'agent_name', width: 25 },
        { header: 'ملاحظات', key: 'notes', width: 35 },
      ];

      const data = treasuryTxns.map(t => {
        const agent = agents.find(a => a.id === t.branch_agent_id);
        return {
          transaction_date: t.transaction_date,
          type: t.type === 'income' ? 'مقبوضات / إيراد' : 'مصروفات / دفع',
          amount: `${parseFloat(t.amount.toString()).toLocaleString()} د.ل`,
          description: t.description || '—',
          supplier_phone: t.supplier_phone || '—',
          source: t.source || 'المدار الليبي',
          reference_number: t.reference_number || '—',
          agent_name: agent ? `${agent.agency_name} (${agent.code})` : '—',
          notes: t.notes || '—',
        };
      });

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - كشف حركة الخزينة الموحد (مقبوضات)',
        subtitle: `عدد الحركات: ${treasuryTxns.length} - التاريخ: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'كشف_الخزينة',
      });
      showToast('تم تصدير كشف الخزينة بنجاح', 'success');
    } catch (e) {
      showToast('فشل تصدير التقرير', 'error');
    }
  };

  const handleExportPosExcel = async () => {
    try {
      const columns = [
        { header: 'تاريخ التسوية', key: 'transaction_date', width: 15 },
        { header: 'الماكينة', key: 'machine_name', width: 25 },
        { header: 'المصرف المضيف', key: 'bank_name', width: 25 },
        { header: 'المبلغ الإجمالي', key: 'amount', width: 15 },
        { header: 'عدد العمليات', key: 'transactions_count', width: 15 },
        { header: 'حالة المطابقة', key: 'is_reconciled', width: 25 },
        { header: 'ملاحظات', key: 'notes', width: 35 },
      ];

      const data = posTxns.map(t => ({
        transaction_date: t.transaction_date,
        machine_name: t.machine?.machine_name || 'ماكينة محذوفة',
        bank_name: t.machine?.bank_name || '—',
        amount: `${parseFloat(t.amount.toString()).toLocaleString()} د.ل`,
        transactions_count: t.transactions_count,
        is_reconciled: t.is_reconciled ? 'مطابقة مع كشف المصرف' : 'معلقة وغير مطابقة',
        notes: t.notes || '—',
      }));

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - كشف تسوية أرصدة مبيعات نقاط البيع POS',
        subtitle: `عدد الحركات: ${posTxns.length} - التاريخ: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'تسوية_أرصدة_POS',
      });
      showToast('تم تصدير تقرير تسويات POS بنجاح', 'success');
    } catch (e) {
      showToast('فشل تصدير التقرير', 'error');
    }
  };

  const handlePrintTreasuryVoucher = (txn: TreasuryTransaction) => {
    const printWindow = window.open('', '', 'width=900,height=750');
    if (!printWindow) return;

    const qrContent = `مستند خزينة رقم: ${txn.id}\nالنوع: ${txn.type === 'income' ? 'مقبوضات' : 'مصروفات'}\nالمبلغ: ${txn.amount} د.ل\nالبيان: ${txn.description}\nالتاريخ: ${txn.transaction_date}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrContent)}`;
    const logoUrl = `${window.location.origin}/img/logo.png`;

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
      <body onload="window.print(); window.onafterprint = () => window.close();">
        <div class="voucher-card">
          <div class="header-box">
            <div style="display: flex; align-items: center; gap: 15px;">
              <img src="${logoUrl}" alt="Logo" style="height: 70px; width: auto;" />
              <div>
                <h1 style="margin: 0; font-size: 20px; color: #1e3a8a;">شركة المدار الليبي للتأمين</h1>
                <p style="margin: 5px 0 0 0; font-size: 12px; color: #475569;">إدارة الشؤون المالية والحسابات</p>
              </div>
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
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="secondary" onClick={handleExportTreasuryExcel} style={{ borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)' }}>
                <i className="fa-solid fa-file-excel" style={{ color: '#166534' }}></i>
                تصدير إكسيل
              </button>
              <button className="primary" onClick={() => setShowTreasuryModal(true)} style={{ borderRadius: '10px', fontWeight: 'bold' }}>
                <i className="fa-solid fa-plus" style={{ marginLeft: '8px' }}></i>
                إضافة حركة كاش (خزينة)
              </button>
            </div>
          )}
          {activeTab === 'banks' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="secondary" onClick={handleExportBankExcel} style={{ borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)' }}>
                <i className="fa-solid fa-file-excel" style={{ color: '#166534' }}></i>
                تصدير إكسيل
              </button>
              <button className="primary" onClick={() => openBankModal('deposit')} style={{ borderRadius: '10px', fontWeight: 'bold', background: '#10b981' }}>
                <i className="fa-solid fa-plus" style={{ marginLeft: '8px' }}></i>
                إضافة إيداع بنكي (+)
              </button>
            </div>
          )}
          {activeTab === 'pos' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="secondary" onClick={handleExportPosExcel} style={{ borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)' }}>
                <i className="fa-solid fa-file-excel" style={{ color: '#166534' }}></i>
                تصدير إكسيل
              </button>
              <button className="primary" onClick={() => {
                setEditingMachineId(null);
                setMachineFormData({
                  machine_name: '',
                  machine_serial: '',
                  bank_name: BANKS[0],
                  merchant_id: '',
                  location: '',
                  notes: '',
                  branch_agent_ids: []
                });
                setShowMachineModal(true);
              }} style={{ borderRadius: '10px', fontWeight: 'bold', background: '#475569' }}>
                <i className="fa-solid fa-laptop-code" style={{ marginLeft: '8px' }}></i>
                تعريف ماكينة POS
              </button>
              <button className="primary" onClick={() => setShowPosTxnModal(true)} style={{ borderRadius: '10px', fontWeight: 'bold' }}>
                <i className="fa-solid fa-receipt" style={{ marginLeft: '8px' }}></i>
                تسجيل تسوية يومية (POS)
              </button>
            </div>
          )}
          {activeTab === 'expenses' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="secondary" onClick={() => window.dispatchEvent(new CustomEvent('print-expense-report'))} style={{ borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)' }}>
                <i className="fa-solid fa-print" style={{ color: '#014cb1' }}></i>
                طباعة التقرير
              </button>
              <button className="secondary" onClick={() => window.dispatchEvent(new CustomEvent('export-expense-excel'))} style={{ borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)' }}>
                <i className="fa-solid fa-file-excel" style={{ color: '#166534' }}></i>
                تصدير إكسيل
              </button>
              <button className="secondary" onClick={() => window.dispatchEvent(new CustomEvent('open-category-modal'))} style={{ borderRadius: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)', background: '#475569', color: '#fff' }}>
                <i className="fa-solid fa-tags"></i>
                إدارة الفئات
              </button>
              <button className="primary" onClick={() => window.dispatchEvent(new CustomEvent('open-expense-modal'))} style={{ borderRadius: '10px', fontWeight: 'bold', background: '#ef4444' }}>
                <i className="fa-solid fa-plus" style={{ marginLeft: '8px' }}></i>
                إضافة مصروف
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
        <button 
          onClick={() => setActiveTab('expenses')}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: '800',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: activeTab === 'expenses' ? 'var(--panel)' : 'transparent',
            color: activeTab === 'expenses' ? '#014cb1' : 'var(--muted)'
          }}
        >
          <i className="fa-solid fa-money-bill-wave" style={{ marginLeft: '8px' }}></i>
          المصروفات التشغيلية
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BANKS (المطابقة والتحصيلات البنكية) */}
      {/* ========================================================================= */}
      {activeTab === 'banks' && (
        <>
          {/* Quick Bank Balances Widgets */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <span style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text)' }}>
              أرصدة الحسابات البنكية المتاحة
            </span>
            <button 
              onClick={() => setShowBankSettingsModal(true)}
              style={{
                background: 'rgba(1, 76, 177, 0.08)',
                color: '#014cb1',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="fa-solid fa-gears"></i>
              تهيئة وإدارة المصارف
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '25px' }}>
            {dbBanks.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', background: 'var(--panel)', borderRadius: '12px', border: '1px dashed var(--border)', color: 'var(--muted)' }}>
                لا توجد مصارف مضافة حالياً. اضغط على "تهيئة وإدارة المصارف" للبدء.
              </div>
            ) : (
              dbBanks.map((bankObj, index) => {
                const bank = bankObj.name;
                const bal = bankBalances[bank] || 0;
                return (
                  <div 
                    key={bankObj.id}
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
              })
            )}
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

                  <th>الإيصال</th>
                  <th>الحالة</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {banksLoading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px' }}>جاري تحميل البيانات البنكية...</td></tr>
                ) : filteredBankTxns.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>لا توجد تحصيلات أو معاملات بنكية مسجلة حالياً تطابق الفلاتر.</td></tr>
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
                        {BANK_TRANSACTION_TYPES.find(t => t.id === txn.transaction_type)?.name || txn.transaction_type || 'حوالة مصرفية'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {txn.agent_name && (
                          <span style={{ fontWeight: 'bold', color: '#014cb1', fontSize: '13px' }}>
                            <i className="fa-solid fa-building" style={{ marginLeft: '4px', fontSize: '11px' }}></i>
                            {txn.agent_name}
                          </span>
                        )}
                        {txn.payer_name && txn.payer_name !== txn.agent_name && (
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text)' }}>
                            {txn.payer_name}
                          </span>
                        )}
                        {!txn.agent_name && !txn.payer_name && <span style={{ color: 'var(--muted)' }}>—</span>}
                        
                        {txn.payer_phone ? (
                          <span style={{ fontSize: '11px', color: 'var(--muted)', direction: 'ltr', textAlign: 'right' }}>
                            <i className="fa-solid fa-phone" style={{ marginLeft: '4px', fontSize: '9px' }}></i>
                            {txn.payer_phone}
                          </span>
                        ) : (
                          txn.branch_agent_id && agents.find(a => a.id === txn.branch_agent_id)?.phone && (
                            <span style={{ fontSize: '11px', color: 'var(--muted)', direction: 'ltr', textAlign: 'right' }}>
                              <i className="fa-solid fa-phone" style={{ marginLeft: '4px', fontSize: '9px' }}></i>
                              {agents.find(a => a.id === txn.branch_agent_id)?.phone}
                            </span>
                          )
                        )}
                      </div>
                    </td>

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
                          onClick={() => handlePrintBankVoucher(txn)}
                          className="action-btn"
                          style={{ background: '#6366f1', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}
                          title="طباعة إيصال الإيداع المصرفي"
                        >
                          <i className="fa-solid fa-print"></i>
                        </button>
                        <button 
                          onClick={() => handleWhatsAppBankShare(txn)}
                          className="action-btn"
                          style={{ background: '#25d366', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}
                          title="إرسال إشعار الإيداع للوكيل عبر الواتساب"
                        >
                          <i className="fa-brands fa-whatsapp"></i>
                        </button>
                        <button 
                          onClick={() => openEditBankModal(txn)}
                          className="action-btn"
                          style={{ background: '#f59e0b', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}
                          title="تعديل الحركة البنكية"
                        >
                          <i className="fa-solid fa-pen"></i>
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
                    paddingTop: '0px',
                    paddingBottom: '0px',
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
                  <th>اسم المورد</th>
                  <th>رقم هاتف المورد</th>
                  <th>المستفيد</th>
                  <th>رقم الإيصال</th>
                  <th>صورة السند</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {treasuryLoading ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px' }}>جاري تحميل كشف الخزينة...</td></tr>
                ) : treasuryTxns.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>سجل الخزينة فارغ أو لا توجد حركات تطابق معايير البحث.</td></tr>
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
                    <td style={{ direction: 'ltr', textAlign: 'right' }}>{txn.supplier_phone || '—'}</td>
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
                          onClick={() => handleWhatsAppTreasuryShare(txn)}
                          className="action-btn"
                          style={{ background: '#25d366', color: '#fff', padding: '6px 10px', borderRadius: '8px' }}
                          title="إرسال إشعار المقبوضات عبر الواتساب"
                        >
                          <i className="fa-brands fa-whatsapp"></i>
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
              <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', flexWrap: 'wrap' }}>
                {paginatedMachines.map(mac => (
                  <div key={mac.id} style={{ 
                    background: 'var(--panel)', 
                    padding: '15px 18px', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '18px',
                    flex: '1 1 auto',
                    minWidth: '320px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '10px',
                        background: mac.is_active ? '#dcfce7' : '#f3f4f6',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <i className="fa-solid fa-credit-card" style={{ color: mac.is_active ? '#166534' : '#9ca3af', fontSize: '16px' }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '800', fontSize: '13px', color: 'var(--text)' }}>{mac.machine_name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {mac.bank_name} {mac.machine_serial ? `• S/N: ${mac.machine_serial}` : ''}
                        </div>
                        {mac.location && <div style={{ fontSize: '10px', color: 'var(--muted)' }}><i className="fa-solid fa-location-dot" style={{ marginLeft: '4px' }}></i>{mac.location}</div>}
                        {mac.branch_agents && mac.branch_agents.length > 0 ? (
                          <div style={{ fontSize: '10px', color: '#014cb1', fontWeight: 'bold', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                            <i className="fa-solid fa-user-shield" style={{ marginLeft: '4px' }}></i>
                            <span>الوكلاء:</span>
                            {mac.branch_agents.map((agent) => (
                              <span key={agent.id} style={{ background: 'rgba(1, 76, 177, 0.08)', padding: '1px 5px', borderRadius: '4px', fontSize: '9px' }}>
                                {agent.agency_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div style={{ fontSize: '10px', color: 'var(--muted)', marginTop: '2px' }}>
                            <i className="fa-solid fa-building" style={{ marginLeft: '4px' }}></i>
                            رئيسية بالشركة (غير مرتبطة بوكيل)
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{ 
                      padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold',
                      background: mac.is_active ? '#dcfce7' : '#f3f4f6',
                      color: mac.is_active ? '#166534' : '#4b5563',
                      whiteSpace: 'nowrap'
                    }}>
                      {mac.is_active ? 'نشطة' : 'معطلة'}
                    </span>
                    <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                      <button 
                        onClick={() => {
                          setEditingMachineId(mac.id);
                          setMachineFormData({
                            machine_name: mac.machine_name,
                            machine_serial: mac.machine_serial || '',
                            bank_name: mac.bank_name,
                            merchant_id: mac.merchant_id || '',
                            location: mac.location || '',
                            notes: mac.notes || '',
                            branch_agent_ids: mac.branch_agents ? mac.branch_agents.map(a => a.id) : []
                          });
                          setShowMachineModal(true);
                        }}
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
                        title="تعديل بيانات الماكينة"
                      >
                        <i className="fa-solid fa-pen"></i>
                      </button>
                      <button 
                        onClick={() => handleToggleMachineActive(mac.id)}
                        style={{ background: mac.is_active ? '#fef2f2' : '#e8f5e9', border: `1px solid ${mac.is_active ? '#fecaca' : '#bbf7d0'}`, color: mac.is_active ? '#991b1b' : '#166534', padding: '5px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}
                        title={mac.is_active ? 'تعطيل' : 'تفعيل'}
                      >
                        <i className={`fa-solid ${mac.is_active ? 'fa-pause' : 'fa-play'}`}></i>
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
              {totalMachinesPages > 1 && (
                <div className="pagination-wrapper" style={{ marginTop: '20px' }}>
                  <div className="pagination-info">
                    عرض {machinesStartIndex + 1}
                    {' إلى '}
                    {Math.min(machinesStartIndex + paginatedMachines.length, totalMachinesCount)}
                    {' من '}
                    {totalMachinesCount}
                    {' ماكينة'}
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn pagination-prev"
                      onClick={() => setCurrentMachinePage((prev) => Math.max(1, prev - 1))}
                      disabled={currentMachinePage === 1}
                    >
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                    {(() => {
                      const items: (number | 'dots')[] = [];
                      if (totalMachinesPages <= 3) {
                        for (let p = 1; p <= totalMachinesPages; p++) {
                          items.push(p);
                        }
                      } else {
                        items.push(1);
                        let start = Math.max(2, currentMachinePage - 1);
                        let end = Math.min(totalMachinesPages - 1, currentMachinePage + 1);
                        if (start > 2) items.push('dots');
                        for (let p = start; p <= end; p++) items.push(p);
                        if (end < totalMachinesPages - 1) items.push('dots');
                        items.push(totalMachinesPages);
                      }
                      return items.map((item, idx) =>
                        item === 'dots' ? (
                          <span key={`dots-${idx}`} className="pagination-dots">...</span>
                        ) : (
                          <button
                            key={item}
                            className={`pagination-btn pagination-number ${currentMachinePage === item ? 'active' : ''}`}
                            onClick={() => setCurrentMachinePage(item as number)}
                          >
                            {item}
                          </button>
                        )
                      );
                    })()}
                    <button
                      className="pagination-btn pagination-next"
                      onClick={() => setCurrentMachinePage((prev) => Math.min(totalMachinesPages, prev + 1))}
                      disabled={currentMachinePage === totalMachinesPages}
                    >
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                  </div>
                </div>
              )}
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
                        paddingTop: '0px',
                        paddingBottom: '0px',
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
                        paddingTop: '0px',
                        paddingBottom: '0px',
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
                    ) : paginatedPosTxns.length === 0 ? (
                      <tr><td colSpan={8} style={{ textAlign: 'center', padding: '25px', color: 'var(--muted)' }}>لا توجد تسويات مسجلة حالياً.</td></tr>
                    ) : paginatedPosTxns.map(txn => (
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
              {totalPosTxnsPages > 1 && (
                <div className="pagination-wrapper" style={{ marginTop: '20px' }}>
                  <div className="pagination-info">
                    عرض {posTxnsStartIndex + 1}
                    {' إلى '}
                    {Math.min(posTxnsStartIndex + paginatedPosTxns.length, totalPosTxnsCount)}
                    {' من '}
                    {totalPosTxnsCount}
                    {' تسوية'}
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn pagination-prev"
                      onClick={() => setCurrentPosTxnPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPosTxnPage === 1}
                    >
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                    {(() => {
                      const items: (number | 'dots')[] = [];
                      if (totalPosTxnsPages <= 3) {
                        for (let p = 1; p <= totalPosTxnsPages; p++) {
                          items.push(p);
                        }
                      } else {
                        items.push(1);
                        let start = Math.max(2, currentPosTxnPage - 1);
                        let end = Math.min(totalPosTxnsPages - 1, currentPosTxnPage + 1);
                        if (start > 2) items.push('dots');
                        for (let p = start; p <= end; p++) items.push(p);
                        if (end < totalPosTxnsPages - 1) items.push('dots');
                        items.push(totalPosTxnsPages);
                      }
                      return items.map((item, idx) =>
                        item === 'dots' ? (
                          <span key={`dots-${idx}`} className="pagination-dots">...</span>
                        ) : (
                          <button
                            key={item}
                            className={`pagination-btn pagination-number ${currentPosTxnPage === item ? 'active' : ''}`}
                            onClick={() => setCurrentPosTxnPage(item as number)}
                          >
                            {item}
                          </button>
                        )
                      );
                    })()}
                    <button
                      className="pagination-btn pagination-next"
                      onClick={() => setCurrentPosTxnPage((prev) => Math.min(totalPosTxnsPages, prev + 1))}
                      disabled={currentPosTxnPage === totalPosTxnsPages}
                    >
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'expenses' && (
        <div style={{ animation: 'fadeIn 0.3s ease', marginTop: '20px' }}>
          <ExpenseManagement activeTabOverride="expenses" hideHeader={true} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODALS (النوافذ المنبثقة لإضافة البيانات) */}
      {/* ========================================================================= */}

      {/* MODAL 1: ADD TREASURY TRANSACTION */}
      {showTreasuryModal && (
        <div className="modal-overlay" onClick={() => setShowTreasuryModal(false)}>
          <div className="modal-content dark-modal" style={{ maxWidth: '1200px', background: 'var(--panel)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إضافة حركة نقدية جديدة في الخزينة (مقبوضات)</h3>
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
                  <div style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: '#e8f5e9',
                    color: '#2e7d32',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '900',
                    fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                  }}>
                    <i className="fa-solid fa-arrow-down" style={{ marginLeft: '6px' }}></i>
                    مقبوضات فقط
                  </div>
                  <input type="hidden" value="income" />
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
                <div className="form-group">
                  <label>اسم المورد</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="اسم المورد أو الجهة الدافعة بالكامل"
                    value={treasuryFormData.description} 
                    onChange={e => setTreasuryFormData({ ...treasuryFormData, description: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>رقم هاتف المورد</label>
                  <input 
                    type="text" 
                    placeholder="مثال: 091XXXXXXX"
                    value={treasuryFormData.supplier_phone} 
                    onChange={e => setTreasuryFormData({ ...treasuryFormData, supplier_phone: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>المستفيد</label>
                  <div style={{
                    width: '100%',
                    height: '42px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'rgba(1, 76, 177, 0.06)',
                    color: '#014cb1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '900',
                    fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                  }}>
                    <i className="fa-solid fa-building" style={{ marginLeft: '6px' }}></i>
                    المدار الليبي
                  </div>
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>ربط بالفرع أو الوكيل (اختياري)</label>
                  <input
                    type="text"
                    placeholder="ابحث عن وكيل أو فرع..."
                    value={treasuryAgentSearch}
                    onFocus={() => {
                      setShowTreasuryAgentDropdown(true);
                      if (treasuryAgentSearch === 'غير مرتبط بوكيل') setTreasuryAgentSearch('');
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowTreasuryAgentDropdown(false), 200);
                      if (!treasuryFormData.branch_agent_id) setTreasuryAgentSearch('غير مرتبط بوكيل');
                    }}
                    onChange={e => setTreasuryAgentSearch(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      paddingRight: '12px',
                      paddingLeft: '12px',
                      fontSize: '13px',
                      fontWeight: '700',
                      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                      direction: 'rtl',
                      textAlign: 'right',
                      outline: 'none',
                    }}
                  />
                  {showTreasuryAgentDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      zIndex: 999,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }}>
                      <div
                        style={{ padding: '10px 14px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', borderBottom: '1px solid var(--border)' }}
                        onMouseDown={() => {
                          setTreasuryFormData({ ...treasuryFormData, branch_agent_id: '' });
                          setTreasuryAgentSearch('غير مرتبط بوكيل');
                          setShowTreasuryAgentDropdown(false);
                        }}
                      >
                        غير مرتبط بوكيل
                      </div>
                      {agents
                        .filter(a => !treasuryAgentSearch || a.agency_name.includes(treasuryAgentSearch) || (a.code && a.code.includes(treasuryAgentSearch)))
                        .map(a => (
                          <div
                            key={a.id}
                            style={{ padding: '10px 14px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', borderBottom: '1px solid var(--border)' }}
                            onMouseDown={() => {
                              setTreasuryFormData({ ...treasuryFormData, branch_agent_id: String(a.id) });
                              setTreasuryAgentSearch(`${a.agency_name} (${a.code})`);
                              setShowTreasuryAgentDropdown(false);
                            }}
                          >
                            {a.agency_name} ({a.code})
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="form-group" style={{ gridColumn: 'span 4' }}>
                  <label>تحميل صورة السند / المرفق الورقي (أو التقاط صورة بالكاميرا)</label>
                  <input 
                    type="file" 
                    accept="image/*,application/pdf"
                    capture="environment"
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
                <button type="submit" className="primary" style={{ padding: '10px 30px' }} disabled={isSavingTreasury}>
                  {isSavingTreasury ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '8px' }}></i>
                      جاري الحفظ...
                    </>
                  ) : (
                    'حفظ حركة الخزينة'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD BANK TRANSACTION */}
      {showBankModal && (
        <div className="modal-overlay" onClick={handleCloseBankModal}>
          <div className="modal-content dark-modal" style={{ maxWidth: '1200px', background: 'var(--panel)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editingBankTxnId !== null
                  ? 'تعديل المعاملة البنكية'
                  : (bankModalType === 'deposit' ? 'إضافة إيداع بنكي جديد (التحصيلات)' : 'إضافة سحب/مصروف بنكي جديد')}
              </h3>
              <button onClick={handleCloseBankModal} className="close-btn">&times;</button>
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
                  <label>المصرف المرسل منه (اختياري)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                      value={bankFormData.source_bank} 
                      onChange={e => {
                        const selectedName = e.target.value;
                        const selectedBank = dbSourceBanks.find(b => b.name === selectedName);
                        setBankFormData({ 
                          ...bankFormData, 
                          source_bank: selectedName,
                          source_account_number: selectedBank?.account_number || ''
                        });
                      }}
                      style={{ 
                        flex: 1, 
                        height: '42px', 
                        borderRadius: '10px', 
                        border: '1px solid var(--border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        paddingRight: '12px',
                        paddingLeft: '32px',
                        paddingTop: '0px',
                        paddingBottom: '0px',
                        fontSize: '13px',
                        fontWeight: '700',
                        fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                        direction: 'rtl',
                        textAlign: 'right',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="">اختر المصرف المرسل منه...</option>
                      {dbSourceBanks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowSourceBankSettingsModal(true)}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--panel)',
                        color: '#014cb1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                      title="إضافة أو حذف مصرف مرسل منه"
                    >
                      <i className="fa-solid fa-plus-minus"></i>
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>رقم حساب المصرف المرسل منه</label>
                  <input 
                    type="text" 
                    placeholder="مثال: 120-20494-001"
                    value={bankFormData.source_account_number} 
                    onChange={e => setBankFormData({ ...bankFormData, source_account_number: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>طريقة ونوع التحصيل</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                      value={bankFormData.transaction_type} 
                      onChange={e => setBankFormData({ ...bankFormData, transaction_type: e.target.value })}
                      style={{ 
                        flex: 1, 
                        height: '42px', 
                        borderRadius: '10px', 
                        border: '1px solid var(--border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        paddingRight: '12px',
                        paddingLeft: '32px',
                        paddingTop: '0px',
                        paddingBottom: '0px',
                        fontSize: '13px',
                        fontWeight: '700',
                        fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                        direction: 'rtl',
                        textAlign: 'right',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {dbTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowTypeSettingsModal(true)}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--panel)',
                        color: '#014cb1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                      title="إضافة أو حذف طريقة"
                    >
                      <i className="fa-solid fa-plus-minus"></i>
                    </button>
                  </div>
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
                  <label>المصرف المستلم</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select 
                      value={bankFormData.bank_name} 
                      onChange={e => {
                        const selectedName = e.target.value;
                        const selectedBank = dbBanks.find(b => b.name === selectedName);
                        setBankFormData({ 
                          ...bankFormData, 
                          bank_name: selectedName,
                          account_number: selectedBank?.account_number || ''
                        });
                      }}
                      style={{ 
                        flex: 1, 
                        height: '42px', 
                        borderRadius: '10px', 
                        border: '1px solid var(--border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        paddingRight: '12px',
                        paddingLeft: '32px',
                        paddingTop: '0px',
                        paddingBottom: '0px',
                        fontSize: '13px',
                        fontWeight: '700',
                        fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                        direction: 'rtl',
                        textAlign: 'right',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {dbBanks.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowBankSettingsModal(true)}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                        background: 'var(--panel)',
                        color: '#014cb1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        flexShrink: 0
                      }}
                      title="إضافة أو حذف مصرف"
                    >
                      <i className="fa-solid fa-plus-minus"></i>
                    </button>
                  </div>
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
                  <label>{bankModalType === 'deposit' ? 'اسم المودع أو المحول بالكامل' : 'اسم المستلم بالكامل'}</label>
                  <input 
                    type="text" 
                    placeholder="مثال: أحمد عبد الحليم"
                    value={bankFormData.payer_name} 
                    onChange={e => setBankFormData({ ...bankFormData, payer_name: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label>{bankModalType === 'deposit' ? 'رقم هاتف المودع' : 'رقم هاتف المستلم'}</label>
                  <input 
                    type="text" 
                    placeholder="مثال: 091XXXXXXX"
                    value={bankFormData.payer_phone} 
                    onChange={e => setBankFormData({ ...bankFormData, payer_phone: e.target.value })} 
                  />
                </div>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>ربط بالفرع أو الوكيل (اختياري)</label>
                  <input
                    type="text"
                    placeholder="ابحث عن وكيل أو فرع..."
                    value={bankAgentSearch}
                    onFocus={() => {
                      setShowBankAgentDropdown(true);
                      if (bankAgentSearch === 'غير مرتبط بوكيل') setBankAgentSearch('');
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowBankAgentDropdown(false), 200);
                      if (!bankFormData.branch_agent_id) setBankAgentSearch('غير مرتبط بوكيل');
                    }}
                    onChange={e => setBankAgentSearch(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      paddingRight: '12px',
                      paddingLeft: '12px',
                      fontSize: '13px',
                      fontWeight: '700',
                      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                      direction: 'rtl',
                      textAlign: 'right',
                      outline: 'none',
                    }}
                  />
                  {showBankAgentDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      maxHeight: '200px',
                      overflowY: 'auto',
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      zIndex: 999,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    }}>
                      <div
                        style={{ padding: '10px 14px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', borderBottom: '1px solid var(--border)' }}
                        onMouseDown={() => {
                          setBankFormData({ ...bankFormData, branch_agent_id: '' });
                          setBankAgentSearch('غير مرتبط بوكيل');
                          setShowBankAgentDropdown(false);
                        }}
                      >
                        غير مرتبط بوكيل
                      </div>
                      {agents
                        .filter(a => !bankAgentSearch || a.agency_name.includes(bankAgentSearch) || (a.code && a.code.includes(bankAgentSearch)))
                        .map(a => (
                          <div
                            key={a.id}
                            style={{ padding: '10px 14px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', borderBottom: '1px solid var(--border)' }}
                            onMouseDown={() => {
                              setBankFormData({ 
                                ...bankFormData, 
                                branch_agent_id: String(a.id),
                                payer_name: bankFormData.payer_name || a.agency_name,
                                payer_phone: bankFormData.payer_phone || a.phone || ''
                              });
                              setBankAgentSearch(`${a.agency_name} (${a.code})`);
                              setShowBankAgentDropdown(false);
                            }}
                          >
                            {a.agency_name} ({a.code})
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
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
                <button type="button" onClick={handleCloseBankModal} className="secondary" style={{ padding: '10px 20px' }}>إلغاء</button>
                <button type="submit" className="primary" style={{ padding: '10px 30px' }} disabled={isSavingBank}>
                  {isSavingBank ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '8px' }}></i>
                      جاري الحفظ...
                    </>
                  ) : (
                    editingBankTxnId !== null ? 'حفظ التعديلات' : 'حفظ وإضافة الحركة'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD POS MACHINE */}
      {showMachineModal && (
        <div className="modal-overlay" onClick={() => setShowMachineModal(false)}>
          <div className="modal-content dark-modal" style={{ width: '900px', maxWidth: '95vw', background: 'var(--panel)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingMachineId ? 'تعديل بيانات ماكينة POS' : 'تعريف ماكينة نقاط بيع جديدة (POS)'}</h3>
              <button onClick={() => { setShowMachineModal(false); setEditingMachineId(null); }} className="close-btn">&times;</button>
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
                      paddingTop: '0px',
                      paddingBottom: '0px',
                      fontSize: '13px',
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
                <div className="form-group" style={{ gridColumn: 'span 2', position: 'relative' }}>
                  <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                    الوكلاء المرتبطون بالماكينة (عهدة للوكلاء - تشاركي)
                  </label>
                  
                  {/* Selected Agents Badges Container */}
                  <div style={{
                    minHeight: '44px',
                    width: '100%',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    background: 'var(--input-bg)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    alignItems: 'center',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
                  >
                    {machineFormData.branch_agent_ids.length === 0 ? (
                      <span style={{ color: 'var(--muted)', fontSize: '13px' }}>-- اختر الوكلاء من القائمة المنسدلة --</span>
                    ) : (
                      machineFormData.branch_agent_ids.map(id => {
                        const agent = agents.find(a => a.id === id);
                        if (!agent) return null;
                        return (
                          <div 
                            key={id} 
                            onClick={e => e.stopPropagation()}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              background: 'rgba(16, 185, 129, 0.08)',
                              color: '#10b981',
                              border: '1px solid #10b981',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              transition: 'all 0.2s ease',
                              userSelect: 'none'
                            }}
                          >
                            <i className="fa-solid fa-file-signature" style={{ fontSize: '11px' }}></i>
                            <span>{agent.agency_name}</span>
                            <span 
                              onClick={() => {
                                setMachineFormData(prev => ({
                                  ...prev,
                                  branch_agent_ids: prev.branch_agent_ids.filter(x => x !== id)
                                }));
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                background: '#ef4444',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '10px',
                                marginRight: '4px',
                                transition: 'background 0.2s'
                              }}
                              title="إزالة الوكيل"
                            >
                              &times;
                            </span>
                          </div>
                        );
                      })
                    )}
                    
                    {/* Toggle Icon */}
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>
                      <i className={`fa-solid ${isAgentDropdownOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
                    </div>
                  </div>

                  {/* Dropdown Container */}
                  {isAgentDropdownOpen && (
                    <>
                      {/* Invisible backdrop to close the dropdown on click outside */}
                      <div 
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                        onClick={() => setIsAgentDropdownOpen(false)}
                      />
                      
                      <div style={{
                        position: 'absolute',
                        bottom: '100%',
                        right: 0,
                        left: 0,
                        marginBottom: '6px',
                        background: 'var(--panel)',
                        border: '1px solid var(--border)',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        zIndex: 999,
                        maxHeight: '260px',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                      }}>
                        {/* Search field inside dropdown */}
                        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', background: 'var(--input-bg)' }}>
                          <input 
                            type="text" 
                            placeholder="بحث سريع عن وكيل..." 
                            value={agentSearchQuery}
                            onChange={e => setAgentSearchQuery(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            style={{ 
                              width: '100%', 
                              height: '36px', 
                              fontSize: '13px', 
                              padding: '0 10px', 
                              borderRadius: '8px', 
                              border: '1px solid var(--border)', 
                              background: 'var(--panel)',
                              color: 'var(--text)',
                              outline: 'none'
                            }} 
                          />
                        </div>
                        
                        {/* Dropdown List */}
                        <div style={{
                          overflowY: 'auto',
                          flex: 1,
                          padding: '6px'
                        }}>
                          {agents
                            .filter(a => !agentSearchQuery || a.agency_name.toLowerCase().includes(agentSearchQuery.toLowerCase()) || a.agent_name.toLowerCase().includes(agentSearchQuery.toLowerCase()))
                            .map(a => {
                              const isChecked = machineFormData.branch_agent_ids.includes(a.id);
                              return (
                                <div 
                                  key={a.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isChecked) {
                                      setMachineFormData(prev => ({
                                        ...prev,
                                        branch_agent_ids: prev.branch_agent_ids.filter(id => id !== a.id)
                                      }));
                                    } else {
                                      setMachineFormData(prev => ({
                                        ...prev,
                                        branch_agent_ids: [...prev.branch_agent_ids, a.id]
                                      }));
                                    }
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    background: isChecked ? 'rgba(1, 76, 177, 0.05)' : 'transparent',
                                    transition: 'background 0.2s',
                                    marginBottom: '2px'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = isChecked ? 'rgba(1, 76, 177, 0.08)' : 'var(--border)'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = isChecked ? 'rgba(1, 76, 177, 0.05)' : 'transparent'; }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: isChecked ? '#014cb1' : 'var(--text)' }}>
                                      {a.agency_name}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                                      {a.agent_name} ({a.code})
                                    </span>
                                  </div>
                                  
                                  {isChecked && (
                                    <i className="fa-solid fa-check" style={{ color: '#014cb1', fontSize: '14px' }}></i>
                                  )}
                                </div>
                              );
                            })}
                          
                          {agents.filter(a => !agentSearchQuery || a.agency_name.toLowerCase().includes(agentSearchQuery.toLowerCase()) || a.agent_name.toLowerCase().includes(agentSearchQuery.toLowerCase())).length === 0 && (
                            <div style={{ padding: '15px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                              لا توجد نتائج تطابق البحث
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
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
                <button type="button" onClick={() => { setShowMachineModal(false); setEditingMachineId(null); }} className="secondary" style={{ padding: '8px 16px' }}>إلغاء</button>
                <button type="submit" className="primary" style={{ padding: '8px 24px' }}>{editingMachineId ? 'حفظ التعديلات' : 'حفظ وتعريف الماكينة'}</button>
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
                      paddingTop: '0px',
                      paddingBottom: '0px',
                      fontSize: '13px',
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
            {previewImage.toLowerCase().includes('.pdf') ? (
              <iframe 
                src={previewImage} 
                title="معاينة ملف PDF"
                style={{ width: '100%', height: '80vh', borderRadius: '12px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', backgroundColor: '#fff' }}
              />
            ) : (
              <img 
                src={previewImage} 
                alt="سند ورقة الحوالة البنكية / إيصال الخزينة" 
                style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} 
                onError={() => {
                  showToast('خطأ في تحميل ملف المعاينة، قد لا يكون الملف صورة أو المسار غير صحيح', 'error');
                  setPreviewImage(null);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* MODAL 6: BANK SETTINGS MODAL */}
      {showBankSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowBankSettingsModal(false)}>
          <div className="modal-content dark-modal" style={{ maxWidth: '600px', background: 'var(--panel)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إدارة المصارف المتاحة</h3>
              <button onClick={() => setShowBankSettingsModal(false)} className="close-btn">&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              <form onSubmit={handleAddBank} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    placeholder="اسم المصرف الجديد..." 
                    required
                    value={newBankName}
                    onChange={e => setNewBankName(e.target.value)}
                    style={{ 
                      flex: 1, 
                      height: '42px', 
                      borderRadius: '10px', 
                      padding: '0 12px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)'
                    }}
                  />
                  <input 
                    type="text" 
                    placeholder="رقم الحساب الجاري (اختياري)..." 
                    value={newBankAccountNumber}
                    onChange={e => setNewBankAccountNumber(e.target.value)}
                    style={{ 
                      flex: 1, 
                      height: '42px', 
                      borderRadius: '10px', 
                      padding: '0 12px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)'
                    }}
                  />
                </div>
                <button type="submit" className="primary" style={{ height: '42px', borderRadius: '10px', width: '100%', fontWeight: 'bold' }}>
                  إضافة مصرف جديد للحسابات
                </button>
              </form>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px' }}>
                {dbBanks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>لا توجد مصارف مضافة حالياً.</div>
                ) : (
                  dbBanks.map(b => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border)' }}>
                      {editingBankId === b.id ? (
                        <div style={{ display: 'flex', gap: '8px', flex: 1, marginLeft: '10px' }}>
                          <input 
                            type="text" 
                            value={editingBankName} 
                            onChange={e => setEditingBankName(e.target.value)}
                            style={{ flex: 1, height: '32px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                            placeholder="اسم المصرف"
                          />
                          <input 
                            type="text" 
                            value={editingBankAccountNumber} 
                            onChange={e => setEditingBankAccountNumber(e.target.value)}
                            style={{ flex: 1, height: '32px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                            placeholder="رقم الحساب الجاري"
                          />
                          <button 
                            type="button" 
                            onClick={() => handleUpdateBank(b.id)} 
                            style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="حفظ التعديلات"
                          >
                            <i className="fa-solid fa-check"></i>
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setEditingBankId(null)} 
                            style={{ background: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="إلغاء"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>{b.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              {b.account_number ? `رقم الحساب: ${b.account_number}` : 'لا يوجد رقم حساب مضاف'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button 
                              type="button"
                              onClick={() => {
                                setEditingBankId(b.id);
                                setEditingBankName(b.name);
                                setEditingBankAccountNumber(b.account_number || '');
                              }}
                              style={{ background: 'none', border: 'none', color: '#014cb1', cursor: 'pointer', fontSize: '15px' }}
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteBank(b.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }}
                              title="حذف"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6.5: SOURCE BANK SETTINGS MODAL */}
      {showSourceBankSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSourceBankSettingsModal(false)}>
          <div className="modal-content dark-modal" style={{ maxWidth: '600px', background: 'var(--panel)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إدارة المصارف المرسل منها (المصادر)</h3>
              <button onClick={() => setShowSourceBankSettingsModal(false)} className="close-btn">&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              <form onSubmit={handleAddSourceBank} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    placeholder="اسم المصرف المرسل الجديد..." 
                    required
                    value={newSourceBankName}
                    onChange={e => setNewSourceBankName(e.target.value)}
                    style={{ 
                      flex: 1, 
                      height: '42px', 
                      borderRadius: '10px', 
                      padding: '0 12px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)'
                    }}
                  />
                  <input 
                    type="text" 
                    placeholder="رقم الحساب المرسل (اختياري)..." 
                    value={newSourceBankAccountNumber}
                    onChange={e => setNewSourceBankAccountNumber(e.target.value)}
                    style={{ 
                      flex: 1, 
                      height: '42px', 
                      borderRadius: '10px', 
                      padding: '0 12px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)'
                    }}
                  />
                </div>
                <button type="submit" className="primary" style={{ height: '42px', borderRadius: '10px', width: '100%', fontWeight: 'bold' }}>
                  إضافة مصرف مرسل جديد
                </button>
              </form>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px' }}>
                {dbSourceBanks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>لا توجد مصارف مرسلة مضافة حالياً.</div>
                ) : (
                  dbSourceBanks.map(b => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border)' }}>
                      {editingSourceBankId === b.id ? (
                        <div style={{ display: 'flex', gap: '8px', flex: 1, marginLeft: '10px' }}>
                          <input 
                            type="text" 
                            value={editingSourceBankName} 
                            onChange={e => setEditingSourceBankName(e.target.value)}
                            style={{ flex: 1, height: '32px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                            placeholder="اسم المصرف المرسل"
                          />
                          <input 
                            type="text" 
                            value={editingSourceBankAccountNumber} 
                            onChange={e => setEditingSourceBankAccountNumber(e.target.value)}
                            style={{ flex: 1, height: '32px', fontSize: '12px', padding: '0 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                            placeholder="رقم الحساب المرسل"
                          />
                          <button 
                            type="button" 
                            onClick={() => handleUpdateSourceBank(b.id)} 
                            style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="حفظ التعديلات"
                          >
                            <i className="fa-solid fa-check"></i>
                          </button>
                          <button 
                            type="button" 
                            onClick={() => setEditingSourceBankId(null)} 
                            style={{ background: '#64748b', color: '#fff', border: 'none', borderRadius: '6px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="إلغاء"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>{b.name}</span>
                            <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                              {b.account_number ? `رقم الحساب: ${b.account_number}` : 'لا يوجد رقم حساب مضاف'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <button 
                              type="button"
                              onClick={() => {
                                setEditingSourceBankId(b.id);
                                setEditingSourceBankName(b.name);
                                setEditingSourceBankAccountNumber(b.account_number || '');
                              }}
                              style={{ background: 'none', border: 'none', color: '#014cb1', cursor: 'pointer', fontSize: '15px' }}
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteSourceBank(b.id)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '15px' }}
                              title="حذف"
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: COLLECTION TYPE SETTINGS MODAL */}
      {showTypeSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowTypeSettingsModal(false)}>
          <div className="modal-content dark-modal" style={{ maxWidth: '600px', background: 'var(--panel)' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>إدارة طرق ونوع التحصيل</h3>
              <button onClick={() => setShowTypeSettingsModal(false)} className="close-btn">&times;</button>
            </div>
            <div style={{ padding: '20px' }}>
              <form onSubmit={handleAddType} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input 
                  type="text" 
                  placeholder="اسم طريقة التحصيل الجديدة..." 
                  required
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                  style={{ 
                    flex: 1, 
                    height: '42px', 
                    borderRadius: '10px', 
                    padding: '0 12px',
                    border: '1px solid var(--border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text)'
                  }}
                />
                <button type="submit" className="primary" style={{ height: '42px', borderRadius: '10px', padding: '0 20px', fontWeight: 'bold' }}>
                  إضافة الطريقة
                </button>
              </form>
              
              <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px' }}>
                {dbTypes.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>لا توجد طرق تحصيل مضافة حالياً.</div>
                ) : (
                  dbTypes.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>{t.name}</span>
                      <button 
                        type="button"
                        onClick={() => handleDeleteType(t.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px' }}
                        title="حذف"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* CUSTOM CONFIRMATION DIALOG MODAL */}
      {confirmConfig.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}>
          <div className="modal-content dark-modal" style={{ maxWidth: '400px', background: 'var(--panel)', padding: '25px', borderRadius: '15px', border: '1px solid var(--border)', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '48px', color: '#ef4444', marginBottom: '15px' }}>
              <i className="fa-solid fa-circle-exclamation"></i>
            </div>
            <h3 style={{ fontSize: '20px', color: 'var(--text)', marginBottom: '10px', fontFamily: 'Cairo' }}>{confirmConfig.title}</h3>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '25px', lineHeight: '1.6', fontFamily: 'Cairo' }}>{confirmConfig.message}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                onClick={confirmConfig.onConfirm} 
                style={{ 
                  background: '#ef4444', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: '8px', 
                  padding: '10px 24px', 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer',
                  fontFamily: 'Cairo',
                  transition: 'opacity 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                onMouseOut={e => e.currentTarget.style.opacity = '1'}
              >
                تأكيد الحذف
              </button>
              <button 
                type="button" 
                onClick={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))} 
                style={{ 
                  background: 'var(--border)', 
                  color: 'var(--text)', 
                  border: 'none', 
                  borderRadius: '8px', 
                  padding: '10px 24px', 
                  fontSize: '14px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer',
                  fontFamily: 'Cairo',
                  transition: 'opacity 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                onMouseOut={e => e.currentTarget.style.opacity = '1'}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
