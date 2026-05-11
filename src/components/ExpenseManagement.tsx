import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchableSelect from './SearchableSelect';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';
import { API_BASE_URL, BACKEND_URL } from '../config/api';

interface ExpenseItem {
  item_number?: string;
  statement: string;
  quantity: number;
  price: number;
  value: number;
}

interface Expense {
  id: number;
  name: string;
  recipient?: string;
  category: string;
  amount: number;
  currency: 'LYD' | 'USD';
  voucher_number?: string;
  receipt_image?: string;
  expense_type: 'fixed' | 'consumable';
  expense_date: string;
  status: string;
  notes?: string;
  items?: ExpenseItem[];
  is_indemnity?: boolean;
  indemnity_type?: string;
  payment_source?: string;
}

interface Statistics {
  monthly_total: number;
  monthly_count: number;
  monthly_average: number;
}

interface UnionPurchase {
  id: number;
  request_number: string;
  amount_paid: number;
  card_price: number;
  union_fee_per_card: number;
  company_deposit_per_card: number;
  cards_count: number;
  total_union_fee: number;
  total_company_deposit: number;
  payment_method: string;
  purchase_date: string;
  receipt_image: string | null;
  notes: string;
}



const DEFAULT_CATEGORIES = ['قرطاسية', 'صيانة', 'خدمات', 'إيجار', 'ضيافة', 'التعويضات'];

export default function ExpenseManagement({ activeTabOverride = 'expenses' }: { activeTabOverride?: 'expenses' | 'union' | 'indemnities' }) {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    monthly_total: 0,
    monthly_count: 0,
    monthly_average: 0
  });

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Filter States
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [currentUnionPage, setCurrentUnionPage] = useState(1);
  const unionItemsPerPage = 10;

  // Form states
  const [name, setName] = useState('');
  const [recipient, setRecipient] = useState('');
  const [category, setCategory] = useState('قرطاسية');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'LYD' | 'USD'>('LYD');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [expenseType, setExpenseType] = useState<'fixed' | 'consumable'>('consumable');
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [expenseReceiptImage, setExpenseReceiptImage] = useState<File | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('مدفوع');
  const [notes, setNotes] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [indemnityType, setIndemnityType] = useState('orange_card');
  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([]);
  const [isCustomRecipient, setIsCustomRecipient] = useState(false);

  // Union Balance States
  const [activeTab, setActiveTab] = useState<'expenses' | 'union' | 'indemnities'>(activeTabOverride);

  useEffect(() => {
    setActiveTab(activeTabOverride);
  }, [activeTabOverride]);
  const [unionPurchases, setUnionPurchases] = useState<UnionPurchase[]>([]);
  const [showUnionModal, setShowUnionModal] = useState(false);
  const [editingUnionPurchase, setEditingUnionPurchase] = useState<UnionPurchase | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number>(0);

  // Union Form States
  const [requestNumber, setRequestNumber] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [cardPrice, setCardPrice] = useState('20');
  const [unionFeePerCard, setUnionFeePerCard] = useState('5');
  const [companyDepositPerCard, setCompanyDepositPerCard] = useState('15');
  const [paymentMethod, setPaymentMethod] = useState('حوالة مصرفية');
  const [unionPurchaseDate, setUnionPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [unionNotes, setUnionNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState<File | null>(null);

  // Helper to resolve image URLs correctly
  const resolveImageUrl = (path: string | null | undefined) => {
    if (!path) return '';
    
    // If the path contains localhost and we're not in dev, we should replace it with the actual backend url
    if (path.includes('localhost') && !import.meta.env.DEV) {
      path = path.replace(/http:\/\/[^\/]+/, '');
    }
    
    if (path.startsWith('http')) return path;
    
    // Ensure the path doesn't have double slashes when concatenated
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    
    // If it's a storage path, it must come from the backend
    if (cleanPath.startsWith('storage') || cleanPath.startsWith('union_receipts') || cleanPath.startsWith('public')) {
      const actualPath = cleanPath.startsWith('storage') ? cleanPath : 
                        cleanPath.startsWith('public') ? cleanPath.replace('public/', 'storage/') :
                        `storage/${cleanPath}`;
      
      const baseUrl = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
      return `${baseUrl}/${actualPath}`;
    }
    
    // Static assets in the frontend public folder
    return `/${cleanPath}`;
  };

  // Union Filter States
  const [unionSearchFilter, setUnionSearchFilter] = useState('');
  const [unionYearFilter, setUnionYearFilter] = useState('الكل');
  const [unionMonthFilter, setUnionMonthFilter] = useState('الكل');
  const [unionFromDate, setUnionFromDate] = useState('');
  const [unionToDate, setUnionToDate] = useState('');

  // Calculated derived state for Union UI
  const cardsCount = useMemo(() => {
    const paid = parseFloat(amountPaid) || 0;
    const price = parseFloat(cardPrice) || 1;
    return Math.floor(paid / price);
  }, [amountPaid, cardPrice]);

  const totalUnionFee = useMemo(() => cardsCount * (parseFloat(unionFeePerCard) || 0), [cardsCount, unionFeePerCard]);
  const totalCompanyDeposit = useMemo(() => cardsCount * (parseFloat(companyDepositPerCard) || 0), [cardsCount, companyDepositPerCard]);

  const filteredUnion = useMemo(() => {
    return unionPurchases.filter(u => {
      const matchesSearch = !unionSearchFilter || u.request_number?.toLowerCase().includes(unionSearchFilter.toLowerCase());
      
      const purchaseDate = new Date(u.purchase_date);
      const matchesYear = unionYearFilter === 'الكل' || purchaseDate.getFullYear().toString() === unionYearFilter;
      const matchesMonth = unionMonthFilter === 'الكل' || (purchaseDate.getMonth() + 1).toString() === unionMonthFilter;
      
      const pDateClean = new Date(purchaseDate.toISOString().split('T')[0]);
      const matchesFrom = !unionFromDate || pDateClean >= new Date(unionFromDate);
      const matchesTo = !unionToDate || pDateClean <= new Date(unionToDate);
      
      return matchesSearch && matchesYear && matchesMonth && matchesFrom && matchesTo;
    });
  }, [unionPurchases, unionSearchFilter, unionYearFilter, unionMonthFilter, unionFromDate, unionToDate]);

  const unionFilteredStats = useMemo(() => {
    let totalPaid = 0;
    let totalFee = 0;
    let totalDeposit = 0;
    let totalCards = 0;
    filteredUnion.forEach(u => {
      totalPaid += parseFloat(u.amount_paid.toString()) || 0;
      const cards = (parseFloat(u.cards_count.toString()) || 0);
      totalCards += cards;
      totalFee += cards * (parseFloat(u.union_fee_per_card.toString()) || 0);
      totalDeposit += cards * (parseFloat(u.company_deposit_per_card.toString()) || 0);
    });
    return { totalPaid, totalFee, totalDeposit, totalCards };
  }, [filteredUnion]);

  const dynamicCategories = useMemo(() => {
    const existing = expenses.map(e => e.category);
    const combined = [...DEFAULT_CATEGORIES, ...existing];
    return Array.from(new Set(combined)).filter(cat => cat && !cat.includes('أخرى'));
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const isIndemnity = e.is_indemnity === true || (e.is_indemnity as any) === 1 || (e.is_indemnity as any) === '1';
      if (activeTab === 'indemnities' && !isIndemnity) return false;
      if (activeTab === 'expenses' && isIndemnity) return false;

      const matchesSearch = e.name.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesCategory = categoryFilter === 'الكل' || e.category === categoryFilter;
      const matchesStatus = statusFilter === 'الكل' || e.status === statusFilter;

      const expenseDate = new Date(e.expense_date);
      const matchesFrom = !fromDate || expenseDate >= new Date(fromDate);
      const matchesTo = !toDate || expenseDate <= new Date(toDate);

      return matchesSearch && matchesCategory && matchesStatus && matchesFrom && matchesTo;
    });
  }, [expenses, searchFilter, categoryFilter, statusFilter, fromDate, toDate, activeTab]);

  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredExpenses, currentPage]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  const paginatedUnion = useMemo(() => {
    const startIndex = (currentUnionPage - 1) * unionItemsPerPage;
    return filteredUnion.slice(startIndex, startIndex + unionItemsPerPage);
  }, [filteredUnion, currentUnionPage]);

  const totalUnionPages = Math.ceil(filteredUnion.length / unionItemsPerPage);

  const getPaginationRange = (current: number, total: number) => {
    const delta = 1;
    const range = [];
    const rangeWithDots: (number | string)[] = [];
    let l;
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }
    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };

  const filteredStats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      total,
      count: filteredExpenses.length,
      average: filteredExpenses.length > 0 ? total / filteredExpenses.length : 0
    };
  }, [filteredExpenses]);

  useEffect(() => {
    fetchExpenses();
    fetchUnionBalances();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/employee-payrolls/employees`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();
      setEmployees(data);
    } catch (e) {
      console.error('Error fetching employees:', e);
    }
  };

  // Reset pages when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter, categoryFilter, statusFilter, fromDate, toDate, activeTab]);

  useEffect(() => {
    setCurrentUnionPage(1);
  }, [unionSearchFilter, unionYearFilter, unionMonthFilter, unionFromDate, unionToDate]);

  const fetchUnionBalances = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/union-balances`);
      const data = await response.json();
      if (data.success) {
        setUnionPurchases(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`);
      const data = await response.json();
      if (data.success) {
        setExpenses(data.data);
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showToast('حدث خطأ أثناء جلب المصروفات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (expense: Expense | null = null) => {
    if (expense) {
      setEditingExpense(expense);
      setName(expense.name);
      setRecipient(expense.recipient || '');
      setCategory(expense.category);
      setAmount(expense.amount.toString());
      setDate(expense.expense_date);
      setStatus(expense.status);
      setNotes(expense.notes || '');
      setCurrency(expense.currency || 'LYD');
      setVoucherNumber(expense.voucher_number || '');
      setExpenseType(expense.expense_type || 'consumable');
      setItems(expense.items || []);
      setExpenseReceiptImage(null);
      
      const isEmployee = employees.some(emp => emp.name === expense.recipient);
      setIsCustomRecipient(expense.recipient && !isEmployee ? true : false);
    } else {
      setEditingExpense(null);
      setName('');
      setRecipient('');
      setCategory(activeTab === 'indemnities' ? 'التعويضات' : 'قرطاسية');
      setAmount('');
      setCurrency('LYD');
      setVoucherNumber('');
      setExpenseType('consumable');
      setItems([]);
      setExpenseReceiptImage(null);
      setDate(new Date().toISOString().split('T')[0]);
      setStatus('مدفوع');
      setNotes('');
      setIndemnityType('orange_card');
      setIsCustomRecipient(false);
    }
    setShowModal(true);
  };

  const handleAddExpense = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('recipient', recipient);
      formData.append('category', category.includes('أخرى') ? customCategory : category);
      formData.append('amount', amount);
      formData.append('currency', currency);
      formData.append('voucher_number', voucherNumber);
      formData.append('expense_type', expenseType);
      formData.append('expense_date', date);
      formData.append('status', status);
      formData.append('notes', notes);
      formData.append('items', JSON.stringify(items));
      formData.append('is_indemnity', category === 'التعويضات' ? '1' : '0');
      formData.append('indemnity_type', category === 'التعويضات' ? indemnityType : '');
      formData.append('payment_source', category === 'التعويضات' ? (indemnityType === 'orange_card' ? 'union_deposit' : 'bank') : 'bank');
      
      if (expenseReceiptImage) {
        formData.append('receipt_image', expenseReceiptImage);
      }

      if (editingExpense) {
        formData.append('_method', 'PUT');
      }

      const url = editingExpense ? `${API_BASE_URL}/expenses/${editingExpense.id}` : `${API_BASE_URL}/expenses`;
      const response = await fetch(url, {
        method: 'POST', // Use POST for FormData, with _method=PUT if editing
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
      });
      if (response.ok) {
        showToast(editingExpense ? 'تم تحديث المصروف بنجاح' : 'تم إضافة المصروف بنجاح', 'success');
        setShowModal(false);
        fetchExpenses();
        fetchUnionBalances();
      } else {
        const errData = await response.json().catch(() => ({}));
        let errMsg = errData.message || 'حدث خطأ أثناء الحفظ';
        if (errData.errors) {
          // If there are validation errors, pick the first one
          const firstKey = Object.keys(errData.errors)[0];
          errMsg = errData.errors[firstKey][0];
        }
        showToast(errMsg, 'error');
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('تم حذف المصروف بنجاح', 'success');
        fetchExpenses();
      } else {
        showToast('فشل حذف المصروف', 'error');
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    }
  };

  const handleOpenUnionModal = (purchase: UnionPurchase | null = null) => {
    if (purchase) {
      setEditingUnionPurchase(purchase);
      setRequestNumber(purchase.request_number || '');
      setAmountPaid(purchase.amount_paid.toString());
      setCardPrice(purchase.card_price.toString());
      setUnionFeePerCard(purchase.union_fee_per_card.toString());
      setCompanyDepositPerCard(purchase.company_deposit_per_card.toString());
      setPaymentMethod(purchase.payment_method);
      setUnionPurchaseDate(purchase.purchase_date ? purchase.purchase_date.split('T')[0] : '');
      setUnionNotes(purchase.notes || '');
    } else {
      setEditingUnionPurchase(null);
      setRequestNumber('');
      setAmountPaid('');
      setCardPrice('20');
      setUnionFeePerCard('5');
      setCompanyDepositPerCard('15');
      setPaymentMethod('حوالة مصرفية');
      setUnionPurchaseDate(new Date().toISOString().split('T')[0]);
      setUnionNotes('');
    }
    setShowUnionModal(true);
  };

  const handleAddUnionPurchase = async (e: FormEvent) => {
    e.preventDefault();
    if (!amountPaid || !cardPrice) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('request_number', requestNumber);
      formData.append('amount_paid', amountPaid);
      formData.append('card_price', cardPrice);
      formData.append('union_fee_per_card', unionFeePerCard);
      formData.append('company_deposit_per_card', companyDepositPerCard);
      formData.append('payment_method', paymentMethod);
      formData.append('purchase_date', unionPurchaseDate);
      formData.append('notes', unionNotes);
      if (receiptImage) formData.append('receipt_image', receiptImage);
      if (editingUnionPurchase) formData.append('_method', 'PUT');

      const url = editingUnionPurchase ? `${API_BASE_URL}/union-balances/${editingUnionPurchase.id}` : `${API_BASE_URL}/union-balances`;
      const response = await fetch(url, { method: 'POST', body: formData });
      if (response.ok) {
        showToast(editingUnionPurchase ? 'تم تحديث الإيصال بنجاح' : 'تم تسجيل إيصال رصيد الاتحاد بنجاح', 'success');
        setShowUnionModal(false);
        setReceiptImage(null);
        setAmountPaid('');
        setRequestNumber('');
        setEditingUnionPurchase(null);
        fetchUnionBalances();
      } else {
        const errData = await response.json().catch(() => ({}));
        let errMsg = errData.message || 'فشلت العملية';
        if (errData.errors) {
          const firstKey = Object.keys(errData.errors)[0];
          errMsg = errData.errors[firstKey][0];
        }
        showToast(errMsg, 'error');
      }
    } catch (e) {
      showToast(`خطأ: ${(e as Error).message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnionPurchase = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإيصال؟')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/union-balances/${id}`, { method: 'DELETE' });
      if (response.ok) {
        showToast('تم حذف الإيصال بنجاح', 'success');
        fetchUnionBalances();
      }
    } catch (e) {
      showToast('خطأ أثناء الحذف', 'error');
    }
  };

  const exportToExcelFunc = async () => {
    if (expenses.length === 0) { showToast('لا توجد بيانات لتصديرها', 'error'); return; }
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const columns = [
        { header: 'البند (الوصف)', key: 'name', width: 35 },
        { header: 'رقم الواصل', key: 'voucher_number', width: 15 },
        { header: 'نوع المصروف', key: 'expense_type', width: 15 },
        { header: 'المستلم', key: 'recipient', width: 25 },
        { header: 'الفئة', key: 'category', width: 20 },
        { header: 'المبلغ', key: 'amount', width: 20 },
        { header: 'العملة', key: 'currency', width: 10 },
        { header: 'التاريخ', key: 'expense_date', width: 15 },
        { header: 'الحالة', key: 'status', width: 15 },
        { header: 'ملاحظات', key: 'notes', width: 30 },
      ];

      const data = expenses.map((e) => ({
        name: e.name,
        voucher_number: e.voucher_number || '-',
        expense_type: e.expense_type === 'fixed' ? 'ثابت' : 'مستهلك',
        recipient: e.recipient || '-',
        category: e.category,
        amount: e.amount.toLocaleString(),
        currency: e.currency === 'USD' ? 'دولار' : 'دينار',
        expense_date: e.expense_date,
        status: e.status,
        notes: e.notes || '-',
      }));

      // Summary row
      data.push({
        name: 'الإجمالي الكلي',
        voucher_number: '',
        expense_type: '',
        recipient: '',
        category: '',
        amount: statistics.monthly_total.toLocaleString(),
        currency: '',
        expense_date: '',
        status: `${statistics.monthly_count} عملية`,
        notes: '',
      });

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير المصروفات التشغيلية',
        subtitle: `إجمالي المصروفات: ${statistics.monthly_total.toLocaleString()} د.ل - عدد العمليات: ${statistics.monthly_count}`,
        columns,
        data,
        fileName: 'تقرير_المصروفات',
        qrData: `تقرير المصروفات - شركة المدار الليبي\nإجمالي: ${statistics.monthly_total.toLocaleString()} د.ل\nعدد العمليات: ${statistics.monthly_count}\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير التقرير باحترافية', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  const exportUnionToExcelFunc = async () => {
    if (unionPurchases.length === 0) { showToast('لا توجد بيانات لتصديرها', 'error'); return; }
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const columns = [
        { header: 'رقم الواصل/الطلب', key: 'request_number', width: 25 },
        { header: 'المبلغ المدفوع', key: 'amount_paid', width: 20 },
        { header: 'عدد البطاقات', key: 'cards_count', width: 15 },
        { header: 'خصم الاتحاد', key: 'union_fee', width: 20 },
        { header: 'وديعة الشركة', key: 'company_deposit', width: 20 },
        { header: 'تاريخ الطلب', key: 'purchase_date', width: 15 },
        { header: 'البيان/ملاحظات', key: 'notes', width: 30 },
      ];

      const data = filteredUnion.map((u) => ({
        request_number: u.request_number || '-',
        amount_paid: parseFloat(u.amount_paid.toString()).toLocaleString() + ' د.ل',
        cards_count: u.cards_count,
        union_fee: parseFloat((u.cards_count * u.union_fee_per_card).toString()).toLocaleString() + ' د.ل',
        company_deposit: parseFloat((u.cards_count * u.company_deposit_per_card).toString()).toLocaleString() + ' د.ل',
        purchase_date: u.purchase_date ? u.purchase_date.split('T')[0] : '',
        notes: u.notes || '-',
      }));

      // Summary row
      data.push({
        request_number: 'الإجمالي المفلتر',
        amount_paid: unionFilteredStats.totalPaid.toLocaleString() + ' د.ل',
        cards_count: unionFilteredStats.totalCards,
        union_fee: unionFilteredStats.totalFee.toLocaleString() + ' د.ل',
        company_deposit: unionFilteredStats.totalDeposit.toLocaleString() + ' د.ل',
        purchase_date: '',
        notes: '',
      });

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير رصيد الاتحاد والتكاليف',
        subtitle: `خصم الاتحاد: ${unionFilteredStats.totalFee.toLocaleString()} د.ل - وديعة الشركة: ${unionFilteredStats.totalDeposit.toLocaleString()} د.ل`,
        columns,
        data,
        fileName: 'تقرير_سجل_الاتحاد',
        qrData: `سجل الاتحاد - شركة المدار الليبي\nإجمالي المدفوع: ${unionFilteredStats.totalPaid.toLocaleString()} د.ل\nعدد البطاقات: ${unionFilteredStats.totalCards}\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير سجل الاتحاد بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  return (
    <section className="users-management">
      <style>{`
        @media print {
          @page { size: landscape; margin: 15mm; }
          body { background: #fff !important; direction: rtl !important; font-family: 'Arial', sans-serif !important; }
          .no-print, .sidebar, .topbar { display: none !important; }
          .print-official-header { display: flex !important; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          .users-management { padding: 0 !important; }
          .users-table-wrapper { border: none !important; box-shadow: none !important; overflow: visible !important; }
          .users-table { width: 100% !important; border-collapse: collapse !important; border: 1.5px solid #000 !important; }
          .users-table th, .users-table td { border: 1px solid #000 !important; padding: 10px !important; color: #000 !important; font-size: 11pt !important; text-align: center !important; }
          .users-table th { background: #f0f0f0 !important; font-weight: bold !important; }
          * { visibility: hidden; }
          .print-official-header, .print-official-header *, 
          .users-table-wrapper, .users-table-wrapper * { visibility: visible; }
          .print-official-header { position: static; }
          .users-table-wrapper { position: relative; top: 0; }
        }
        .print-official-header { display: none; }
      `}</style>

      {/* Official Corporate Header for Print */}
      <div className="print-official-header" style={{ width: '100%', direction: 'rtl' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={resolveImageUrl('/img/logo.png')} alt="Logo" style={{ width: '90px', height: '90px', objectFit: 'contain' }} />
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#000' }}>المدار الليبي للتأمين</h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '1rem', color: '#000' }}>قسم الشؤون المالية والموارد البشرية</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', flex: 1, marginTop: '15px' }}>
          <div style={{ display: 'inline-block', border: '1.5px solid #000', padding: '12px 40px', borderRadius: '15px', backgroundColor: '#f9f9f9' }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>
              {activeTab === 'union' ? 'سجل تداول أرصدة بطاقة الاتحاد (البرتقالية)' : 
               activeTab === 'expenses' ? 'كشف المصروفات التشغيلية المعتمدة' : 'كشف التعويضات والمطالبات المالية'}
            </h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '1.1rem', fontWeight: 600 }}>
              بتاريخ: {new Date().toLocaleDateString('ar-LY')}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'left', minWidth: '180px', marginTop: '10px' }}>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>الرقم المرجعي: {Math.floor(Math.random() * 900000 + 100000)}</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '1rem' }}>الحالة: وثيقة رسمية معتمدة</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '1rem' }}>المستخدم: المدير المالي</p>
        </div>
      </div>

      {/* Expense/Indemnity Tab */}
      {(activeTab === 'expenses' || activeTab === 'indemnities') && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="users-breadcrumb no-print" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px', marginBottom: '30px', color: '#fff',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.1, pointerEvents: 'none' }}>
              <i className={activeTab === 'expenses' ? "fa-solid fa-file-invoice-dollar" : "fa-solid fa-scale-unbalanced"} style={{ fontSize: '150px', position: 'absolute', left: '-20px', bottom: '-20px' }}></i>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <i className={activeTab === 'expenses' ? "fa-solid fa-file-invoice-dollar" : "fa-solid fa-scale-unbalanced"} style={{ color: activeTab === 'expenses' ? '#38bdf8' : '#fcd34d' }}></i>
                {activeTab === 'expenses' ? 'إدارة المصروفات التشغيلية' : 'إدارة التعويضات والمطالبات المالية'}
              </h2>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>
                {activeTab === 'expenses' ? 'سجل متابعة المصاريف اليومية والتشغيلية للشركة' : 'سجل التعويضات والمطالبات المالية المعتمدة'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', zIndex: 1 }}>
              <button onClick={exportToExcelFunc} className="btn-secondary" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-file-excel"></i> تصدير Excel
              </button>
              <button onClick={() => handleOpenModal()} className="btn-primary" style={{ background: activeTab === 'expenses' ? '#ef4444' : '#f59e0b', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)' }}>
                <i className="fa-solid fa-plus"></i> {activeTab === 'expenses' ? 'إضافة مصروف' : 'إضافة تعويض'}
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>إجمالي مبلغ {activeTab === 'expenses' ? 'المصروفات' : 'التعويضات'}</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#ef4444' }}>{filteredStats.total.toLocaleString()} <span style={{ fontSize: '14px' }}>د.ل</span></div>
            </div>
            <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>عدد العمليات المفلترة</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text)' }}>{filteredStats.count} <span style={{ fontSize: '14px' }}>عملية</span></div>
            </div>
            <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>متوسط العملية الواحد</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#10b981' }}>{filteredStats.average.toLocaleString(undefined, {maximumFractionDigits:2})} <span style={{ fontSize: '14px' }}>د.ل</span></div>
            </div>
          </div>

          <div className="no-print" style={{ background: 'var(--card-bg)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)', fontWeight: 800 }}>فلاتر البحث والتقارير</h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                  {activeTab === 'expenses' ? 'تخصيص عرض المصروفات والبحث عن بند محدد' : 'تصفية قائمة التعويضات والمطالبات المالية'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={exportToExcelFunc} className="btn-secondary" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                  <i className="fa-solid fa-file-excel"></i> تصدير Excel
                </button>
                <button onClick={() => handleOpenModal()} className="btn-primary" style={{ background: activeTab === 'expenses' ? '#ef4444' : '#f59e0b', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                  <i className="fa-solid fa-plus"></i> {activeTab === 'expenses' ? 'إضافة مصروف' : 'إضافة تعويض'}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>بحث بالوصف</label>
                <input type="text" placeholder="بحث..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>الفئة</label>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 600 }}>
                  <option value="الكل">كل الفئات</option>
                  {dynamicCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>الحالة</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 600 }}>
                  <option value="الكل">كل الحالات</option>
                  <option value="مدفوع">مدفوع</option>
                  <option value="معلق">معلق</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>من تاريخ</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>إلى تاريخ</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => { setSearchFilter(''); setCategoryFilter('الكل'); setStatusFilter('الكل'); setFromDate(''); setToDate(''); }} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>تصفير</button>
              </div>
            </div>
          </div>

          <div className="users-table-wrapper" style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>البند / الوصف</th>
                  <th>المستلم</th>
                  <th>الفئة</th>
                  <th>المبلغ</th>
                  <th>التاريخ</th>
                  <th>رقم الواصل</th>
                  <th>صورة الواصل</th>
                  <th>الحالة</th>
                  <th className="no-print">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExpenses.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '50px', color: 'var(--muted)' }}>لا توجد بيانات تطابق البحث الحالي</td></tr>
                ) : (
                  paginatedExpenses.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 700 }}>{e.name}</td>
                      <td>{e.recipient || '-'}</td>
                      <td><span style={{ padding: '4px 10px', borderRadius: '6px', background: 'var(--bg)', fontSize: '0.85rem', fontWeight: 600 }}>{e.category}</span></td>
                      <td style={{ fontWeight: '900', color: '#ef4444' }}>{e.amount.toLocaleString()} {e.currency === 'USD' ? '$' : 'د.ل'}</td>
                      <td style={{ fontSize: '0.9rem' }}>{e.expense_date}</td>
                      <td style={{ fontWeight: 600 }}>{e.voucher_number || '-'}</td>
                      <td>
                        {e.receipt_image ? (
                          <button onClick={() => { setSelectedImage(resolveImageUrl(e.receipt_image)); setPreviewRotation(0); }} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                            <i className="fa-solid fa-image"></i> عرض
                          </button>
                        ) : <span style={{ color: '#94a3b8' }}>-</span>}
                      </td>
                      <td>
                        <span className={`status-badge ${e.status === 'مدفوع' ? 'active' : 'inactive'}`} style={{ 
                          background: e.status === 'مدفوع' ? '#dcfce7' : '#fee2e2', 
                          color: e.status === 'مدفوع' ? '#166534' : '#991b1b',
                          padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700
                        }}>
                          {e.status}
                        </span>
                      </td>
                      <td className="no-print">
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => navigate(`/reports/expenses/${e.id}`)} style={{ background: '#10b981', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} title="عرض التفاصيل"><i className="fa-solid fa-eye"></i></button>
                          <button onClick={() => handleOpenModal(e)} style={{ background: '#3b82f6', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} title="تعديل"><i className="fa-solid fa-pencil"></i></button>
                          <button onClick={() => handleDeleteExpense(e.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} title="حذف"><i className="fa-solid fa-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '30px', paddingBottom: '20px' }}>
              {getPaginationRange(currentPage, totalPages).map((p, idx) => (
                <button key={idx} onClick={() => typeof p === 'number' && setCurrentPage(p)} disabled={p === '...' || p === currentPage} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: '1px solid var(--border)', background: p === currentPage ? '#014cb1' : 'var(--card-bg)', color: p === currentPage ? '#fff' : 'var(--text)', fontWeight: 700, cursor: p === '...' ? 'default' : 'pointer', boxShadow: p === currentPage ? '0 4px 12px rgba(1, 76, 177, 0.3)' : 'none' }}>{p}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Union Balance Tab */}
      {activeTab === 'union' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="users-breadcrumb no-print" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px', marginBottom: '30px', color: '#fff',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.1, pointerEvents: 'none' }}>
              <i className="fa-solid fa-id-card" style={{ fontSize: '150px', position: 'absolute', left: '-20px', bottom: '-20px' }}></i>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '26px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <i className="fa-solid fa-id-card" style={{ color: '#fcd34d' }}></i> سجل شراء رصيد البطاقة البرتقالية (الاتحاد)
              </h2>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>إدارة المدفوعات وحصص الاتحاد وودائع الشركة</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', zIndex: 1 }}>
              <button onClick={() => handleOpenUnionModal()} className="btn-primary" style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.3)' }}>
                <i className="fa-solid fa-plus"></i> طلب رصيد جديد
              </button>
              <button onClick={exportUnionToExcelFunc} className="btn-secondary" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-file-excel"></i> تصدير Excel
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div className="stat-box" style={{ background: '#fef3c7', padding: '25px', borderRadius: '15px', border: '1px solid #fde68a', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ color: '#92400e', fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>صافي مبلغ الوديعة (المتبقي للشركة)</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#92400e' }}>{unionFilteredStats.totalDeposit.toLocaleString()} <span style={{fontSize: '16px'}}>د.ل</span></div>
            </div>
            <div className="stat-box" style={{ background: '#fee2e2', padding: '25px', borderRadius: '15px', border: '1px solid #fecaca', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ color: '#991b1b', fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>إجمالي خصم الاتحاد</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#991b1b' }}>{unionFilteredStats.totalFee.toLocaleString()} <span style={{fontSize: '16px'}}>د.ل</span></div>
            </div>
            <div className="stat-box" style={{ background: '#d1fae5', padding: '25px', borderRadius: '15px', border: '1px solid #a7f3d0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ color: '#065f46', fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>إجمالي البطاقات المشتراة</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#065f46' }}>{unionFilteredStats.totalCards} <span style={{fontSize: '16px'}}>بطاقة</span></div>
            </div>
            <div className="stat-box" style={{ background: '#dbeafe', padding: '25px', borderRadius: '15px', border: '1px solid #bfdbfe', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ color: '#1e40af', fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>إجمالي المبلغ المدفوع</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e40af' }}>{unionFilteredStats.totalPaid.toLocaleString()} <span style={{fontSize: '16px'}}>د.ل</span></div>
            </div>
          </div>

          <div className="no-print" style={{ background: '#fff', padding: '25px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>تصفية بيانات سجل الاتحاد</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>بحث برقم الواصل</label>
                <input type="text" placeholder="رقم الطلب / الواصل..." value={unionSearchFilter} onChange={e => setUnionSearchFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
              </div>
              <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>السنة</label>
                <select value={unionYearFilter} onChange={e => setUnionYearFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                  <option value="الكل">كل السنين</option>
                  {['2023','2024','2025','2026'].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>الشهر</label>
                <select value={unionMonthFilter} onChange={e => setUnionMonthFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                  <option value="الكل">كل الشهور</option>
                  {Array.from({length:12}, (_,i)=>i+1).map(m => <option key={m} value={m.toString()}>{m}</option>)}
                </select>
              </div>
              <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>من تاريخ</label>
                <input type="date" value={unionFromDate} onChange={e => setUnionFromDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
              </div>
              <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>إلى تاريخ</label>
                <input type="date" value={unionToDate} onChange={e => setUnionToDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => { setUnionSearchFilter(''); setUnionYearFilter('الكل'); setUnionMonthFilter('الكل'); setUnionFromDate(''); setUnionToDate(''); }} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>تصفير</button>
              </div>
            </div>
          </div>

          <div className="users-table-wrapper" style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th>رقم الواصل/الطلب</th>
                  <th>المبلغ المدفوع</th>
                  <th>عدد البطاقات</th>
                  <th>خصم الاتحاد (المصروفات)</th>
                  <th>وديعة الشركة</th>
                  <th>تاريخ الطلب</th>
                  <th>صورة الواصل</th>
                  <th className="no-print">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUnion.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>لا توجد بيانات سجل رصيد الاتحاد</td></tr>
                ) : (
                  paginatedUnion.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 'bold' }}>{u.request_number || '-'}</td>
                      <td style={{ color: '#ef4444', fontWeight: 800 }}>{parseFloat(u.amount_paid.toString()).toLocaleString()} د.ل</td>
                      <td style={{ color: '#065f46', fontWeight: 'bold' }}>{u.cards_count}</td>
                      <td>{(u.cards_count * u.union_fee_per_card).toLocaleString()} د.ل</td>
                      <td style={{ color: '#92400e', fontWeight: 700 }}>{(u.cards_count * u.company_deposit_per_card).toLocaleString()} د.ل</td>
                      <td>{u.purchase_date ? u.purchase_date.split('T')[0] : '-'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {u.receipt_image ? (
                            <button onClick={() => { setSelectedImage(resolveImageUrl(u.receipt_image)); setPreviewRotation(0); }} className="action-btn" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                              <i className="fa-solid fa-image"></i> عرض الواصل
                            </button>
                          ) : <span style={{color: '#94a3b8', fontSize: '0.85rem'}}>لا يوجد</span>}
                        </div>
                      </td>
                      <td className="no-print">
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleOpenUnionModal(u)} style={{ background: '#3b82f6', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer' }}><i className="fa-solid fa-pencil"></i></button>
                          <button onClick={() => handleDeleteUnionPurchase(u.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer' }}><i className="fa-solid fa-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalUnionPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '30px' }}>
              {getPaginationRange(currentUnionPage, totalUnionPages).map((p, idx) => (
                <button key={idx} onClick={() => typeof p === 'number' && setCurrentUnionPage(p)} disabled={p === '...' || p === currentUnionPage} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: '1px solid var(--border)', background: p === currentUnionPage ? '#014cb1' : 'var(--card-bg)', color: p === currentUnionPage ? '#fff' : 'var(--text)', fontWeight: 700, cursor: p === '...' ? 'default' : 'pointer' }}>{p}</button>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'none' }}></div>


      {/* Modal for Expense/Indemnity */}
      {showModal && (
        <div className="modal-overlay no-print" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '1100px', borderRadius: '15px', padding: '30px', position: 'relative', maxHeight: '95vh', overflowY: 'auto' }}>
            <h3>{editingExpense ? 'تعديل بيانات' : (activeTab === 'expenses' ? 'تسجيل مصروف' : 'تسجيل تعويض')}</h3>
            <form onSubmit={handleAddExpense} style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              <div style={{ gridColumn: 'span 4' }}>
                <label>الوصف / البيان</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label>المستلم</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {!isCustomRecipient ? (
                    <div style={{ flex: 1 }}>
                      <SearchableSelect 
                        options={employees.map(emp => ({ value: emp.name, label: emp.name }))}
                        value={recipient}
                        onChange={(val) => setRecipient(val)}
                        placeholder="اختر موظف..."
                      />
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      value={recipient} 
                      onChange={e => setRecipient(e.target.value)} 
                      placeholder="ادخل اسم المستلم..."
                      style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 700 }} 
                    />
                  )}
                  <button 
                    type="button"
                    onClick={() => {
                      setIsCustomRecipient(!isCustomRecipient);
                      setRecipient('');
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: isCustomRecipient ? '#014cb1' : 'var(--bg)',
                      color: isCustomRecipient ? '#fff' : 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isCustomRecipient ? 'إلغاء' : 'اسم آخر'}
                  </button>
                </div>
              </div>
              <div>
                <label>الفئة</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                  {dynamicCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="أخرى">أخرى...</option>
                </select>
              </div>
              {category === 'أخرى' ? (
                <div style={{ gridColumn: 'span 2' }}>
                  <label>فئة جديدة</label>
                  <input type="text" value={customCategory} onChange={e => setCustomCategory(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
                </div>
              ) : (
                <>
                  <div>
                    <label>التاريخ</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
                  </div>
                  {activeTab === 'indemnities' ? (
                    <div>
                      <label>نوع التعويض</label>
                      <select value={indemnityType} onChange={e => setIndemnityType(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                        <option value="orange_card">خصم من رصيد الاتحاد</option>
                        <option value="bank">صرف بنكي (شيك/حوالة)</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label>الحالة</label>
                      <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                        <option value="مدفوع">مدفوع</option>
                        <option value="معلق">معلق</option>
                      </select>
                    </div>
                  )}
                </>
              )}
              
              <div>
                <label>المبلغ (د.ل)</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
              </div>

              <div>
                <label>نوع العملة</label>
                <select value={currency} onChange={e => setCurrency(e.target.value as any)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 700 }}>
                  <option value="LYD">دينار ليبي (LYD)</option>
                  <option value="USD">دولار أمريكي (USD)</option>
                </select>
              </div>

              <div>
                <label>نوع المصروف</label>
                <select value={expenseType} onChange={e => setExpenseType(e.target.value as any)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 700 }}>
                  <option value="consumable">مستهلك</option>
                  <option value="fixed">ثابت</option>
                </select>
              </div>

              <div>
                <label>رقم الواصل</label>
                <input type="text" value={voucherNumber} onChange={e => setVoucherNumber(e.target.value)} placeholder="مثال: 3167" style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
              </div>

              <div>
                <label>صورة الواصل</label>
                <input type="file" accept="image/*" onChange={e => setExpenseReceiptImage(e.target.files?.[0] || null)} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'var(--bg)', fontSize: '0.8rem' }} />
              </div>

              <div style={{ gridColumn: 'span 4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800 }}>تفاصيل الأصناف (الفاتورة)</label>
                  <button type="button" onClick={() => setItems([...items, { statement: '', quantity: 1, price: 0, value: 0 }])} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                    <i className="fa-solid fa-plus"></i> إضافة صنف
                  </button>
                </div>
                
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ background: 'var(--bg)' }}>
                      <tr>
                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>رقم الصنف</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border)', width: '40%' }}>البيان</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>الكمية</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>السعر</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>القيمة</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '5px' }}>
                            <input type="text" value={item.item_number || ''} onChange={e => {
                              const newItems = [...items];
                              newItems[idx].item_number = e.target.value;
                              setItems(newItems);
                            }} style={{ width: '100%', padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }} />
                          </td>
                          <td style={{ padding: '5px' }}>
                            <input type="text" value={item.statement} onChange={e => {
                              const newItems = [...items];
                              newItems[idx].statement = e.target.value;
                              setItems(newItems);
                            }} style={{ width: '100%', padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }} />
                          </td>
                          <td style={{ padding: '5px' }}>
                            <input type="number" value={item.quantity} onChange={e => {
                              const newItems = [...items];
                              newItems[idx].quantity = parseFloat(e.target.value) || 0;
                              newItems[idx].value = newItems[idx].quantity * newItems[idx].price;
                              setItems(newItems);
                              // Update total amount
                              const total = newItems.reduce((sum, it) => sum + it.value, 0);
                              setAmount(total.toString());
                            }} style={{ width: '100%', padding: '5px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '5px' }}>
                            <input type="number" step="0.01" value={item.price} onChange={e => {
                              const newItems = [...items];
                              newItems[idx].price = parseFloat(e.target.value) || 0;
                              newItems[idx].value = newItems[idx].quantity * newItems[idx].price;
                              setItems(newItems);
                              // Update total amount
                              const total = newItems.reduce((sum, it) => sum + it.value, 0);
                              setAmount(total.toString());
                            }} style={{ width: '100%', padding: '5px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '5px' }}>
                            <input type="number" value={item.value} readOnly style={{ width: '100%', padding: '5px', border: '1px solid #eee', borderRadius: '4px', textAlign: 'center', background: '#f9f9f9' }} />
                          </td>
                          <td style={{ padding: '5px' }}>
                            <button type="button" onClick={() => {
                              const newItems = items.filter((_, i) => i !== idx);
                              setItems(newItems);
                              const total = newItems.reduce((sum, it) => sum + it.value, 0);
                              setAmount(total.toString());
                            }} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}>لا توجد بنود مضافة</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ gridColumn: 'span 4' }}>
                <label>ملاحظات</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', minHeight: '60px' }} />
              </div>
              <div style={{ gridColumn: 'span 4', display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#014cb1', color: '#fff', fontWeight: 'bold' }}>
                  {loading ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Union Purchase */}
      {showUnionModal && (
        <div className="modal-overlay no-print" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(5px)'
        }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '850px', borderRadius: '24px', padding: '40px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '95vh', overflowY: 'auto' }}>
            <button onClick={() => setShowUnionModal(false)} style={{ position: 'absolute', top: '25px', right: '25px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>
            
            <h2 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '28px', fontWeight: 900, color: '#1e293b' }}>تسجيل رصيد اتحاد جديد (بطاقة برتقالية)</h2>
            
            <form onSubmit={handleAddUnionPurchase}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ef4444' }}>*</span> المبلغ المدفوع للاتحاد (د.ل)
                  </label>
                  <input type="number" step="0.01" placeholder="مثال: 10000" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} required style={{ width: '100%', padding: '15px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ef4444' }}>*</span> تاريخ الشراء / الطلب
                  </label>
                  <input type="date" value={unionPurchaseDate} onChange={e => setUnionPurchaseDate(e.target.value)} required style={{ width: '100%', padding: '15px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>رقم الطلب (إن وجد)</label>
                  <input type="text" placeholder="مثال: 837530" value={requestNumber} onChange={e => setRequestNumber(e.target.value)} style={{ width: '100%', padding: '15px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>طريقة الدفع</label>
                  <select style={{ width: '100%', padding: '15px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600, textAlign: 'center', appearance: 'none' }}>
                    <option>حوالة مصرفية</option>
                    <option>نقداً</option>
                    <option>صك مصدق</option>
                  </select>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textAlign: 'left' }}>إعدادات حساب الوديعة (قابلة للتغيير مستقبلاً)</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>سعر البطاقة الكلي</label>
                    <input type="number" value={cardPrice} onChange={e => setCardPrice(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>خصم الاتحاد الفعلي (مصروف)</label>
                    <input type="number" value={unionFeePerCard} onChange={e => setUnionFeePerCard(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>رصيد/وديعة الشركة للبطاقة</label>
                    <input type="number" value={companyDepositPerCard} onChange={e => setCompanyDepositPerCard(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '2px dashed #10b981', borderRadius: '20px', padding: '25px', marginBottom: '30px', background: '#f0fdf4' }}>
                <div style={{ textAlign: 'center', borderLeft: '1px solid #d1fae5' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>الكمية المستلمة</p>
                  <p style={{ margin: '10px 0 0 0', fontSize: '1.8rem', fontWeight: 900, color: '#10b981' }}>{cardsCount} <span style={{ fontSize: '1rem' }}>بطاقة</span></p>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid #d1fae5' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>خصم الاتحاد (المصروفات)</p>
                  <p style={{ margin: '10px 0 0 0', fontSize: '1.8rem', fontWeight: 900, color: '#ef4444' }}>{totalUnionFee.toLocaleString()} <span style={{ fontSize: '1rem' }}>د.ل</span></p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>تضاف كوديعة للشركة</p>
                  <p style={{ margin: '10px 0 0 0', fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b' }}>{totalCompanyDeposit.toLocaleString()} <span style={{ fontSize: '1rem' }}>د.ل</span></p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>ملاحظات إضافية</label>
                  <textarea value={unionNotes} onChange={e => setUnionNotes(e.target.value)} rows={2} style={{ width: '100%', padding: '15px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', marginTop: '10px' }} placeholder="أضف أي ملاحظات هنا..." />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>إرفاق صورة الإيصال</label>
                  <input type="file" accept="image/*" onChange={e => setReceiptImage(e.target.files?.[0] || null)} style={{ width: '100%', padding: '15px', marginTop: '10px', borderRadius: '14px', border: '1px dashed #cbd5e1' }} />
                  {editingUnionPurchase?.receipt_image && <p style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '5px' }}>✓ يوجد إيصال مرفق مسبقاً</p>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <button type="submit" disabled={loading} style={{ flex: 2, padding: '18px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #014cb1 0%, #003173 100%)', color: '#fff', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(1, 76, 177, 0.3)' }}>
                  {loading ? 'جاري الحفظ...' : (editingUnionPurchase ? 'تحديث البيانات' : 'تأكيد التسجيل')}
                </button>
                <button type="button" onClick={() => setShowUnionModal(false)} style={{ flex: 1, padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer' }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }} onClick={() => setSelectedImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', width: selectedImage.toLowerCase().endsWith('.pdf') ? '80vw' : 'auto', height: selectedImage.toLowerCase().endsWith('.pdf') ? '85vh' : 'auto', background: '#fff', borderRadius: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {selectedImage.toLowerCase().endsWith('.pdf') ? (
              <div dir="ltr" style={{ width: '100%', height: '100%', direction: 'ltr', transform: `rotate(${previewRotation}deg)`, transition: 'transform 0.3s ease' }}>
                <iframe src={selectedImage} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '24px' }} title="Receipt PDF" />
              </div>
            ) : (
              <img src={selectedImage} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', transform: `rotate(${previewRotation}deg)`, transition: 'transform 0.3s ease' }} />
            )}
            
            {/* Action Buttons */}
            <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '10px', zIndex: 10 }}>
              <button onClick={() => setPreviewRotation(prev => prev + 90)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="تدوير الصورة">
                <i className="fa-solid fa-rotate-right"></i>
              </button>
              <button onClick={() => setSelectedImage(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontSize: '22px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="إغلاق">
                &times;
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
