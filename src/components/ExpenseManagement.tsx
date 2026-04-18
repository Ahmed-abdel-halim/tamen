import React, { useState } from 'react';
import { showToast } from './Toast';

interface Expense {
  id: number;
  name: string;
  recipient?: string;
  category: string;
  amount: number;
  expense_date: string;
  status: string;
  notes?: string;
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

interface UnionStats {
  total_deposit: number;
  original_deposit?: number;
  total_cards: number;
  total_indemnities_deducted?: number;
}

const DEFAULT_CATEGORIES = ['قرطاسية', 'صيانة', 'خدمات', 'إيجار', 'ضيافة', 'التعويضات'];

export default function ExpenseManagement({ activeTabOverride = 'expenses' }: { activeTabOverride?: 'expenses' | 'union' | 'indemnities' }) {
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

  // Form states
  const [name, setName] = useState('');
  const [recipient, setRecipient] = useState('');
  const [category, setCategory] = useState('قرطاسية');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('مدفوع');
  const [notes, setNotes] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [indemnityType, setIndemnityType] = useState('orange_card');

  // Union Balance States
  const [activeTab, setActiveTab] = useState<'expenses' | 'union' | 'indemnities'>(activeTabOverride);

  React.useEffect(() => {
    setActiveTab(activeTabOverride);
  }, [activeTabOverride]);
  const [unionPurchases, setUnionPurchases] = useState<UnionPurchase[]>([]);
  const [unionStats, setUnionStats] = useState<UnionStats>({ total_deposit: 0, total_cards: 0 });
  const [showUnionModal, setShowUnionModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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

  const API_BASE_URL = '/api';

  // Calculated derived state for Union UI
  const cardsCount = React.useMemo(() => {
    const paid = parseFloat(amountPaid) || 0;
    const price = parseFloat(cardPrice) || 1;
    return Math.floor(paid / price);
  }, [amountPaid, cardPrice]);

  const totalUnionFee = React.useMemo(() => cardsCount * (parseFloat(unionFeePerCard) || 0), [cardsCount, unionFeePerCard]);
  const totalCompanyDeposit = React.useMemo(() => cardsCount * (parseFloat(companyDepositPerCard) || 0), [cardsCount, companyDepositPerCard]);

  const unionTotalStats = React.useMemo(() => {
    let totalPaid = 0;
    let totalFee = 0;
    unionPurchases.forEach(u => {
      totalPaid += parseFloat(u.amount_paid.toString()) || 0;
      totalFee += (parseFloat(u.cards_count.toString()) || 0) * (parseFloat(u.union_fee_per_card.toString()) || 0);
    });
    return { totalPaid, totalFee };
  }, [unionPurchases]);

  const dynamicCategories = React.useMemo(() => {
    const existing = expenses.map(e => e.category);
    const combined = [...DEFAULT_CATEGORIES, ...existing];
    return Array.from(new Set(combined)).filter(cat => cat && !cat.includes('أخرى'));
  }, [expenses]);

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter(e => {
      if (activeTab === 'indemnities' && !e.is_indemnity) return false;
      if (activeTab === 'expenses' && e.is_indemnity) return false;

      const matchesSearch = e.name.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesCategory = categoryFilter === 'الكل' || e.category === categoryFilter;
      const matchesStatus = statusFilter === 'الكل' || e.status === statusFilter;

      const expenseDate = new Date(e.expense_date);
      const matchesFrom = !fromDate || expenseDate >= new Date(fromDate);
      const matchesTo = !toDate || expenseDate <= new Date(toDate);

      return matchesSearch && matchesCategory && matchesStatus && matchesFrom && matchesTo;
    });
  }, [expenses, searchFilter, categoryFilter, statusFilter, fromDate, toDate, activeTab]);

  const filteredStats = React.useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      total,
      count: filteredExpenses.length,
      average: filteredExpenses.length > 0 ? total / filteredExpenses.length : 0
    };
  }, [filteredExpenses]);

  React.useEffect(() => {
    fetchExpenses();
    fetchUnionBalances();
  }, []);

  const fetchUnionBalances = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/union-balances`);
      const data = await response.json();
      if (data.success) {
        setUnionPurchases(data.data);
        setUnionStats(data.statistics);
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
      setIndemnityType(expense.indemnity_type || 'orange_card');
    } else {
      setEditingExpense(null);
      setName('');
      setRecipient('');
      setCategory(activeTab === 'indemnities' ? 'التعويضات' : 'قرطاسية');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setStatus('مدفوع');
      setNotes('');
      setIndemnityType('orange_card');
    }
    setShowModal(true);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;

    setLoading(true);
    try {
      const url = editingExpense
        ? `${API_BASE_URL}/expenses/${editingExpense.id}`
        : `${API_BASE_URL}/expenses`;

      const method = editingExpense ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          recipient,
          category: category.includes('أخرى') ? customCategory : category,
          amount: parseFloat(amount),
          expense_date: date,
          status,
          notes,
          is_indemnity: category === 'التعويضات',
          indemnity_type: category === 'التعويضات' ? indemnityType : null,
          payment_source: category === 'التعويضات' ? (indemnityType === 'orange_card' ? 'union_deposit' : 'bank') : 'bank'
        }),
      });

      if (response.ok) {
        showToast(editingExpense ? 'تم تحديث المصروف بنجاح' : 'تم إضافة المصروف بنجاح', 'success');
        setShowModal(false);
        fetchExpenses();
        fetchUnionBalances();
      } else {
        const errorData = await response.json().catch(() => ({}));
        showToast(errorData.message || 'حدث خطأ أثناء الحفظ', 'error');
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
      const response = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        method: 'DELETE',
      });
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

  const handlePayExpense = async (expense: Expense) => {
    try {
      const response = await fetch(`${API_BASE_URL}/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...expense,
          status: 'مدفوع'
        }),
      });
      if (response.ok) {
        showToast('تم تحديث الحالة لمدفوع بنجاح', 'success');
        fetchExpenses();
      } else {
        showToast('فشل تحديث الحالة', 'error');
      }
    } catch (error) {
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    }
  };

  const handleAddUnionPurchase = async (e: React.FormEvent) => {
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
      if (receiptImage) {
        formData.append('receipt_image', receiptImage);
      }

      const response = await fetch(`${API_BASE_URL}/union-balances`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        showToast('تم تسجيل إيصال رصيد الاتحاد بنجاح', 'success');
        setShowUnionModal(false);
        setReceiptImage(null);
        setAmountPaid('');
        setRequestNumber('');
        fetchUnionBalances();
      } else {
        const errorText = await response.text();
        showToast(`فشل: ${errorText.substring(0, 50)}`, 'error');
        console.error("Backend Error Response:", errorText);
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
      showToast('خطأ أثناء החذف', 'error');
    }
  };

  const exportToExcel = () => {
    if (expenses.length === 0) {
      showToast('لا توجد بيانات لتصديرها', 'error');
      return;
    }

    const logoUrl = window.location.origin + '/img/logo.png';
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; }
          .co-name { font-size: 20pt; font-weight: 900; color: #ef4444; text-align: right; }
          .co-sub { font-size: 12pt; color: #64748b; text-align: right; }
          .report-subtitle { font-size: 14pt; font-weight: bold; background-color: #fef2f2; color: #ef4444; text-align: center; border: 1px solid #fee2e2; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #ef4444; color: #ffffff; font-weight: bold; border: 1px solid #b91c1c; padding: 12px; text-align: center; }
          td { border: 1px solid #e2e8f0; padding: 10px; text-align: center; vertical-align: middle; }
          .total-box { background-color: #fff1f2; font-weight: bold; border: 1px solid #fee2e2; }
          .amount { color: #ef4444; font-weight: bold; }
          .meta-info { color: #94a3b8; font-size: 9pt; text-align: right; }
        </style>
      </head>
      <body dir="rtl">
        <table>
          <tr>
            <td colspan="4" style="border:none; text-align:right; vertical-align: top;">
              <div class="co-name">شركة المدار الليبي للتأمين</div>
              <div class="co-sub">Al Madar Libyan Insurance</div>
              <div class="co-sub">قسم الشؤون المالية والمحاسبية</div>
            </td>
            <td colspan="2" style="border:none; text-align:left; vertical-align: top;">
              <img src="${logoUrl}" width="100" height="80">
            </td>
          </tr>
          <tr><td colspan="6" style="border:none; height:20px;"></td></tr>
          <tr><td colspan="6" class="report-subtitle">تقرير المصروفات التشغيلية - تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}</td></tr>
          <tr><td colspan="6" style="border:none; height:20px;"></td></tr>
          
          <tr style="height: 50px;">
            <td colspan="2" class="total-box">إجمالي المصروفات: ${statistics.monthly_total.toLocaleString()} د.ل</td>
            <td colspan="2" class="total-box" style="background:#f8fafc">عدد العمليات: ${statistics.monthly_count}</td>
            <td colspan="2" class="total-box" style="background:#f0fdf4">متوسط الصرف: ${statistics.monthly_average.toFixed(2)} د.ل</td>
          </tr>
          <tr><td colspan="6" style="border:none; height:20px;"></td></tr>
          
            <thead>
              <tr>
                <th style="width: 200px;">البند (الوصف)</th>
                <th style="width: 150px;">المستلم</th>
                <th style="width: 120px;">الفئة</th>
                <th style="width: 110px;">المبلغ (د.ل)</th>
                <th style="width: 100px;">التاريخ</th>
                <th style="width: 90px;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${expenses.map(e => `
                <tr>
                  <td style="text-align:right; font-weight:bold;">${e.name}</td>
                  <td>${e.recipient || '-'}</td>
                  <td>${e.category}</td>
                  <td class="amount">${e.amount.toLocaleString()}</td>
                  <td>${e.expense_date}</td>
                  <td>${e.status}</td>
                </tr>
              `).join('')}
            </tbody>
        </table>
        <br>
        <p class="meta-info">تاريخ الطباعة: ${new Date().toLocaleString('ar-LY')} | تم استخراج هذا التقرير آلياً</p>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_مصروفات_المدار_${new Date().getTime()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير التقرير الاحترافي بنجاح', 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  const exportUnionToExcel = () => {
    if (unionPurchases.length === 0) {
      showToast('لا توجد بيانات لتصديرها', 'error');
      return;
    }

    const logoUrl = window.location.origin + '/img/logo.png';
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; }
          .co-name { font-size: 20pt; font-weight: 900; color: #014cb1; text-align: right; }
          .co-sub { font-size: 12pt; color: #64748b; text-align: right; }
          .report-subtitle { font-size: 14pt; font-weight: bold; background-color: #e0f2fe; color: #0284c7; text-align: center; border: 1px solid #bae6fd; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #0284c7; color: #ffffff; font-weight: bold; border: 1px solid #0369a1; padding: 12px; text-align: center; }
          td { border: 1px solid #e2e8f0; padding: 10px; text-align: center; vertical-align: middle; }
          .total-box { background-color: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0; }
          .amount { color: #0284c7; font-weight: bold; }
          .meta-info { color: #94a3b8; font-size: 9pt; text-align: right; }
        </style>
      </head>
      <body dir="rtl">
        <table>
          <tr>
            <td colspan="5" style="border:none; text-align:right; vertical-align: top;">
              <div class="co-name">شركة المدار الليبي للتأمين</div>
              <div class="co-sub">Al Madar Libyan Insurance</div>
              <div class="co-sub">قسم الشؤون المالية والمحاسبية</div>
            </td>
            <td colspan="2" style="border:none; text-align:left; vertical-align: top;">
              <img src="${logoUrl}" width="100" height="80">
            </td>
          </tr>
          <tr><td colspan="7" style="border:none; height:20px;"></td></tr>
          <tr><td colspan="7" class="report-subtitle">تقرير رصيد الاتحاد والتكاليف - تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}</td></tr>
          <tr><td colspan="7" style="border:none; height:20px;"></td></tr>
          
          <tr style="height: 50px;">
            <td colspan="2" class="total-box">إجمالي المبلغ المدفوع: ${unionTotalStats.totalPaid.toLocaleString()} د.ل</td>
            <td colspan="2" class="total-box" style="background:#f0fdf4">إجمالي البطاقات المُشتراة: ${unionStats.total_cards} بطاقة</td>
            <td colspan="3" class="total-box" style="background:#fef2f2">إجمالي خصم الاتحاد: ${unionTotalStats.totalFee.toLocaleString()} د.ل | إجمالي الوديعة: ${unionStats.total_deposit.toLocaleString()} د.ل</td>
          </tr>
          <tr><td colspan="7" style="border:none; height:20px;"></td></tr>
          
            <thead>
              <tr>
                <th style="width: 140px;">رقم الواصل/الطلب</th>
                <th style="width: 150px;">المبلغ المدفوع</th>
                <th style="width: 110px;">عدد البطاقات</th>
                <th style="width: 150px;">خصم الاتحاد (المصروفات)</th>
                <th style="width: 140px;">وديعة الشركة</th>
                <th style="width: 120px;">تاريخ الطلب</th>
                <th style="width: 180px;">البيان/ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              ${unionPurchases.map(u => `
                <tr>
                  <td style="text-align:center; font-weight:bold;">${u.request_number || '-'}</td>
                  <td class="amount">${parseFloat(u.amount_paid.toString()).toLocaleString()} د.ل</td>
                  <td style="color:#10b981;">${u.cards_count}</td>
                  <td>${parseFloat((u.cards_count * u.union_fee_per_card).toString()).toLocaleString()} د.ل</td>
                  <td>${parseFloat((u.cards_count * u.company_deposit_per_card).toString()).toLocaleString()} د.ل</td>
                  <td>${u.purchase_date ? u.purchase_date.split('T')[0] : ''}</td>
                  <td>${u.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
        </table>
        <br>
        <p class="meta-info">تاريخ الطباعة: ${new Date().toLocaleString('ar-LY')} | تم استخراج هذا التقرير آلياً</p>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_سجل_الاتحاد_${new Date().getTime()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير سجل الاتحاد بنجاح', 'success');
  };

  return (
    <section className="users-management">

      {/* التبويبات تمت إزالتها بناءً على طلب المستخدم ليتم التعامل معها من القائمة الجانبية كـ sub-section */}

      {/* Professional Print-only Header (Employee Salaries Style) */}
      <div className="print-only-header" style={{ display: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '3px double #e2e8f0' }}>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b', fontWeight: '900' }}>المدار الليبي للتأمين</h1>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '14px' }}>Al Madar Libyan Insurance</p>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '14px' }}>قسم الشؤون المالية والموارد البشرية</p>
          </div>
          <img src="/img/logo.png" alt="Logo" style={{ height: '80px', width: 'auto' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{
            display: 'inline-block',
            margin: 0,
            padding: '10px 40px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '50px',
            fontSize: '18px',
            color: '#1e293b'
          }}>
          </h2>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: auto; margin: 10mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print, .sidebar, .topbar, th:last-child, td:last-child, th:nth-child(7), td:nth-child(7) { display: none !important; }
          .print-only-header { display: block !important; }
          .print-only-footer { display: flex !important; }
          .print-date { display: block !important; }
          
          body, html { 
            background: #fff !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100% !important; 
            direction: rtl !important; 
            font-family: 'Cairo', sans-serif !important;
            color: #1e293b !important;
          }
          
          .app-shell { display: block !important; position: static !important; }
          .main-area { padding: 0 !important; margin: 0 !important; width: 100% !important; display: block !important; position: static !important; }
          
          .users-management { padding: 0 !important; margin: 0 !important; width: 100% !important; display: block !important; }
          .users-card { border: none !important; box-shadow: none !important; width: 100% !important; background: transparent !important; }
          .users-table-wrapper { width: 100% !important; overflow: visible !important; }
          
          .users-table { 
            width: 100% !important; 
            border-collapse: collapse !important; 
            margin-bottom: 40px !important; 
            font-size: 9px !important;
            table-layout: auto !important;
          }
          .users-table th { 
            background-color: #f1f5f9 !important; 
            color: #475569 !important; 
            font-weight: 700 !important; 
            padding: 6px 4px !important; 
            border: 1px solid #cbd5e1 !important;
            text-align: center !important;
            -webkit-print-color-adjust: exact;
          }
          .users-table td { 
            padding: 6px 4px !important; 
            border: 1px solid #e2e8f0 !important; 
            text-align: center !important;
            color: #1e293b !important;
          }
          tr:nth-child(even) { background-color: #f8fafc !important; -webkit-print-color-adjust: exact; }
          
          /* Summary boxes */
          div[style*="display: grid"] { 
            display: flex !important; 
            justify-content: flex-start !important; 
            gap: 25px !important; 
            margin-bottom: 30px !important;
          }
          div[style*="background: #fff"] { 
            background: #f8fafc !important; 
            border: 1px solid #e2e8f0 !important; 
            padding: 15px 25px !important; 
            border-radius: 12px !important;
            width: auto !important;
            min-width: 200px !important;
            -webkit-print-color-adjust: exact;
          }
        }

        /* Dark Mode Overrides */
        [data-theme='dark'] .users-table th {
          background-color: var(--table-header) !important;
          color: var(--text) !important;
          border-color: var(--border) !important;
        }
        [data-theme='dark'] .users-table td {
          border-color: var(--border) !important;
          color: var(--text) !important;
        }
        [data-theme='dark'] .users-table tr:nth-child(even) {
          background-color: rgba(255, 255, 255, 0.02) !important;
        }
        [data-theme='dark'] .stat-box {
          background-color: var(--card-bg) !important;
          border-color: var(--border) !important;
          box-shadow: none !important;
        }
        [data-theme='dark'] .stat-title {
          color: var(--muted) !important;
        }
        [data-theme='dark'] .stat-value-dark {
          color: var(--text) !important;
        }
      `}</style>

      { (activeTab === 'expenses' || activeTab === 'indemnities') && (
        <>

          <div className="users-breadcrumb no-print" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '25px 30px',
            background: 'linear-gradient(135deg, #014cb1 0%, #003173 100%)',
            borderRadius: '16px',
            marginBottom: '30px',
            color: '#fff',
            boxShadow: '0 10px 20px rgba(1, 76, 177, 0.15)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}>
                <i className={activeTab === 'expenses' ? "fa-solid fa-file-invoice-dollar" : "fa-solid fa-scale-unbalanced"} style={{ color: activeTab === 'expenses' ? '#38bdf8' : '#fcd34d' }}></i>
                {activeTab === 'expenses' ? 'إدارة المصروفات التشغيلية' : 'إدارة التعويضات'}
              </h2>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '14px', color: '#fff' }}>
                {activeTab === 'expenses' ? 'تتبع جميع النفقات والتكاليف التشغيلية والمصاريف العمومية' : 'إدارة جميع التعويضات وإصداراتها للمستفيدين'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={exportToExcel}
                className="btn-secondary"
                style={{
                  background: '#10b981',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-file-excel"></i>
                تصدير Excel
              </button>
              <button
                onClick={handlePrint}
                className="btn-secondary"
                style={{
                  background: '#64748b',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-print"></i>
                طباعة
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="btn-primary"
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-plus"></i>
                {activeTab === 'expenses' ? 'تسجيل مصروف جديد' : 'تسجيل تعويض جديد'}
              </button>
            </div>

          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div className="stat-title" style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px' }}>إجمالي المصروفات (المصفاة)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                {filteredStats.total.toLocaleString()} د.ل
              </div>
            </div>
            <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div className="stat-title" style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px' }}>عدد العمليات</div>
              <div className="stat-value-dark" style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>{filteredStats.count} عملية</div>
            </div>
            <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div className="stat-title" style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '8px' }}>متوسط الصرف</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#139625' }}>
                {filteredStats.average.toFixed(2)} د.ل
              </div>
            </div>
          </div>

          {/* Modern Filter Bar - Strictly hidden from print and excel generated code */}
          <div className="no-print" style={{ marginBottom: '20px' }}>
            <div style={{
              background: 'var(--card-bg)',
              padding: '20px',
              borderRadius: '15px',
              border: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: '2fr 1.2fr 1fr 1fr 1fr auto',
              gap: '15px',
              alignItems: 'end'
            }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '5px' }}>بحث بالبند</label>
                <div style={{ position: 'relative' }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}></i>
                  <input
                    type="text"
                    placeholder="ابحث عن مصروف..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    style={{ paddingRight: '35px' }}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '5px' }}>الفئة</label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                  <option value="الكل">كل الفئات</option>
                  {dynamicCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '5px' }}>الحالة</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="الكل">كل الحالات</option>
                  <option value="مدفوع">مدفوع</option>
                  <option value="غير مدفوع">غير مدفوع</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '5px' }}>من تاريخ</label>
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '5px' }}>إلى تاريخ</label>
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <button
                onClick={() => {
                  setSearchFilter('');
                  setCategoryFilter('الكل');
                  setStatusFilter('الكل');
                  setFromDate('');
                  setToDate('');
                }}
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border)',
                  padding: '10px',
                  borderRadius: '10px',
                  color: 'var(--text)',
                  cursor: 'pointer'
                }}
                title="تصفير الفلاتر"
              >
                <i className="fa-solid fa-rotate-left"></i>
              </button>
            </div>
          </div>

          <div className="users-card" style={{ padding: '0', overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>البند</th>
                    <th>المستلم</th>
                    <th>الفئة</th>
                    <th>المبلغ</th>
                    <th>التاريخ</th>
                    <th>الحالة</th>
                    <th className="no-print">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td style={{ fontWeight: 'bold', color: 'var(--text)' }}>{expense.name}</td>
                      <td style={{ color: 'var(--text)' }}>{expense.recipient || '-'}</td>
                      <td style={{ color: 'var(--text)' }}>
                        {expense.category}
                        {expense.is_indemnity && (
                          <div style={{ fontSize: '10px', marginTop: '4px', color: expense.indemnity_type === 'orange_card' ? '#d97706' : '#475569', background: expense.indemnity_type === 'orange_card' ? '#fef3c7' : '#f1f5f9', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', whiteSpace: 'nowrap' }}>
                            {expense.indemnity_type === 'orange_card' ? 'تُخصم من الوديعة' : 'تعويض بنكي'}
                          </div>
                        )}
                      </td>
                      <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{expense.amount.toLocaleString()} د.ل</td>
                      <td style={{ color: 'var(--text)' }}>{expense.expense_date}</td>
                      <td>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '11px',
                          background: expense.status === 'مدفوع' ? '#dcfce7' : '#fef3c7',
                          color: expense.status === 'مدفوع' ? '#166534' : '#92400e',
                          fontWeight: '800'
                        }}>
                          {expense.status}
                        </span>
                      </td>
                      <td className="no-print">
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {expense.status !== 'مدفوع' && (
                            <button
                              onClick={() => handlePayExpense(expense)}
                              style={{ background: '#ecfdf5', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#059669' }}
                              title="تغيير الحالة لمدفوع"
                            >
                              <i className="fa-solid fa-check-double"></i>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenModal(expense)}
                            style={{ background: '#f0f9ff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#0369a1' }}
                            title="تعديل"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            style={{ background: '#fef2f2', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#991b1b' }}
                            title="حذف"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>لا توجد مصروفات مسجلة</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'union' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="users-breadcrumb no-print" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '25px 30px',
            background: 'linear-gradient(135deg, #014cb1 0%, #003173 100%)',
            borderRadius: '16px',
            marginBottom: '30px',
            color: '#fff',
            boxShadow: '0 10px 20px rgba(1, 76, 177, 0.15)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: '#fff' }}>
                <i className="fa-solid fa-id-card" style={{ color: '#f59e0b' }}></i>
                سجل شراء رصيد البطاقة البرتقالية (الاتحاد)
              </h2>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '14px', color: '#fff' }}>إدارة المدفوعات وحصص الاتحاد وودائع الشركة</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={exportUnionToExcel}
                className="btn-secondary"
                style={{
                  background: '#10b981',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-file-excel"></i>
                تصدير Excel
              </button>
              <button
                onClick={handlePrint}
                className="btn-secondary"
                style={{
                  background: '#64748b',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-print"></i>
                طباعة
              </button>
              <button
                onClick={() => {
                  setAmountPaid('');
                  setUnionPurchaseDate(new Date().toISOString().split('T')[0]);
                  setReceiptImage(null);
                  setUnionNotes('');
                  setShowUnionModal(true);
                }}
                className="btn-primary"
                style={{
                  background: '#f59e0b',
                  color: '#fff',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-plus"></i>
                طلب رصيد جديد
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div className="stat-box" style={{ background: '#eff6ff', padding: '20px', borderRadius: '15px', border: '1px solid #bfdbfe' }}>
              <div className="stat-title" style={{ color: '#1d4ed8', fontSize: '13px', marginBottom: '8px' }}>إجمالي المبلغ المدفوع</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1d4ed8' }}>
                {unionTotalStats.totalPaid.toLocaleString()} د.ل
              </div>
            </div>
            <div className="stat-box" style={{ background: '#ecfdf5', padding: '20px', borderRadius: '15px', border: '1px solid #a7f3d0' }}>
              <div className="stat-title" style={{ color: '#047857', fontSize: '13px', marginBottom: '8px' }}>إجمالي البطاقات المُشتراة</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#047857' }}>
                {unionStats.total_cards.toLocaleString()} بطاقة
              </div>
            </div>
            <div className="stat-box" style={{ background: '#fef2f2', padding: '20px', borderRadius: '15px', border: '1px solid #fecaca' }}>
              <div className="stat-title" style={{ color: '#b91c1c', fontSize: '13px', marginBottom: '8px' }}>إجمالي خصم الاتحاد</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#b91c1c' }}>
                {unionTotalStats.totalFee.toLocaleString()} د.ل
              </div>
            </div>
            <div className="stat-box" style={{ background: '#fef3c7', padding: '20px', borderRadius: '15px', border: '1px solid #fde68a' }}>
              <div className="stat-title" style={{ color: '#b45309', fontSize: '13px', marginBottom: '8px' }}>صافي مبلغ الوديعة (المتبقي للشركة)</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#b45309' }}>
                {unionStats.total_deposit.toLocaleString()} د.ل
              </div>
              {unionStats.total_indemnities_deducted ? (
                <div style={{ fontSize: '11px', color: '#d97706', marginTop: '5px' }}>
                  بعد خصم تعويضات بقيمة {unionStats.total_indemnities_deducted.toLocaleString()} د.ل
                </div>
              ) : null}
            </div>
          </div>

          <div className="users-card" style={{ padding: '0', overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <div className="users-table-wrapper">
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
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {unionPurchases.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 'bold', color: 'var(--text)' }}>{u.request_number}</td>
                      <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{parseFloat(u.amount_paid.toString()).toLocaleString()} د.ل</td>
                      <td style={{ color: '#10b981', fontWeight: 'bold' }}>{u.cards_count}</td>
                      <td style={{ color: 'var(--text)' }}>{parseFloat((u.cards_count * u.union_fee_per_card).toString()).toLocaleString()} د.ل</td>
                      <td style={{ color: '#f59e0b', fontWeight: 'bold' }}>{parseFloat((u.cards_count * u.company_deposit_per_card).toString()).toLocaleString()} د.ل</td>
                      <td style={{ color: 'var(--text)' }}>{u.purchase_date ? u.purchase_date.split('T')[0] : ''}</td>
                      <td>
                        {u.receipt_image ? (
                          <button
                            onClick={() => setSelectedImage(u.receipt_image ? `${API_BASE_URL.replace('/api', '')}${u.receipt_image}` : null)}
                            style={{ background: '#e0f2fe', color: '#0284c7', padding: '5px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                          >
                            <i className="fa-solid fa-image"></i> عرض الواصل
                          </button>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>لا يوجد</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteUnionPurchase(u.id)}
                          style={{ background: '#fef2f2', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', color: '#991b1b' }}
                          title="حذف"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {unionPurchases.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>لا يوجد سجل شراء لرصيد الاتحاد</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && (<div className="modal-overlay no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 1000
      }}>
        <div className="modal-content" style={{ background: '#fff', padding: '30px', borderRadius: '20px', width: '500px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '15px', color: '#ef4444' }}>
            {editingExpense ? 'تعديل المصروف التشغيلي' : 'تسجيل مصروف تشغيلي جديد'}
          </h3>
          <form onSubmit={handleAddExpense}>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>وصف البند (البضاعة/الخدمة)</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: فاتورة مياه، قرطاسية.."
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
              />
            </div>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>اسم المستلم / المورد</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="اسم الشخص أو الشركة المستلمة للمبلغ..."
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              {activeTab === 'expenses' ? (
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>الفئة</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                  >
                    {dynamicCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    <option value="أخرى (إضافة فئة جديدة)">أخرى (إضافة فئة جديدة)</option>
                  </select>
                </div>
              ) : (
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>الفئة</label>
                  <div style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', background: '#f8fafc', color: '#64748b' }}>التعويضات</div>
                </div>
              )}
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>المبلغ (د.ل)</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                />
              </div>
            </div>

            {category.includes('أخرى') && (
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>اسم الفئة الجديدة <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="text"
                  required
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="مثال: دعاية وإعلان"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                />
              </div>
            )}
            
            {category === 'التعويضات' && (
              <div className="form-group" style={{ marginBottom: '15px', background: '#fffbeb', padding: '15px', border: '1px solid #fde68a', borderRadius: '10px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold', color: '#b45309' }}>
                  <i className="fa-solid fa-scale-unbalanced text-amber-500 mr-2"></i> نوع التعويض ومصدر الدفع <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select
                  value={indemnityType}
                  onChange={(e) => setIndemnityType(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #fcd34d', background: '#fff' }}
                >
                  <option value="orange_card">بطاقة برتقالية / عربية (تُخصم من وديعة الاتحاد)</option>
                  <option value="general">تعويضات أخرى (تُخصم من الحساب الجاري/المصرف)</option>
                </select>
                <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#b45309' }}>
                  {indemnityType === 'orange_card' ? 'ملاحظة: سيتم خصم هذا المبلغ من رصيد وديعة الشركة لدى الاتحاد تلقائياً.' : 'ملاحظة: سيتم تسجيل هذا المصروف كتعويض ولن يؤثر على وديعة الاتحاد.'}
                </p>
              </div>
            )}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 'bold' }}>تاريخ الصرف</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, padding: '14px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'جاري الحفظ...' : (editingExpense ? 'تحديث المصروف' : 'حفظ المصروف')}
              </button>
              <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '14px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>إلغاء</button>
            </div>
          </form>
        </div>
      </div>
      )}

      {/* Union Balance Modal */}
      {showUnionModal && (
        <div className="modal" onClick={(e) => { if ((e.target as HTMLElement).className === 'modal') setShowUnionModal(false); }}>
          <div className="modal-content user-form-modal" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>تسجيل رصيد اتحاد جديد (بطاقة برتقالية)</h3>
              <button className="modal-close" onClick={() => setShowUnionModal(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleAddUnionPurchase} className="user-form">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>

                <div className="form-group">
                  <label>المبلغ المدفوع للاتحاد (د.ل) <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="number"
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="مثال: 10000"
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '18px', fontWeight: 'bold' }}
                  />
                </div>

                <div className="form-group">
                  <label>تاريخ الشراء / الطلب <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="date"
                    required
                    value={unionPurchaseDate}
                    onChange={(e) => setUnionPurchaseDate(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                  />
                </div>

                <div className="form-group">
                  <label>رقم الطلب (إن وجد)</label>
                  <input
                    type="text"
                    value={requestNumber}
                    onChange={(e) => setRequestNumber(e.target.value)}
                    placeholder="مثال: 837530"
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                  />
                </div>

                <div className="form-group">
                  <label>طريقة الدفع</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd' }}
                  >
                    <option value="صك بقيمة">صك بقيمة</option>
                    <option value="نقداً بقيمة">نقداً بقيمة</option>
                    <option value="حوالة مصرفية">حوالة مصرفية</option>
                    <option value="خصم من الوديعة">خصم من الوديعة</option>
                  </select>
                </div>

              </div>

              {/* Advanced Settings for Union breakdown */}
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', marginTop: '15px', marginBottom: '15px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64748b' }}>إعدادات حساب الوديعة (قابلة للتغيير مستقبلاً)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px' }}>سعر البطاقة الكلي</label>
                    <input type="number" required value={cardPrice} onChange={(e) => setCardPrice(e.target.value)} style={{ padding: '8px' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px' }}>خصم الاتحاد الفعلي (مصروف)</label>
                    <input type="number" required value={unionFeePerCard} onChange={(e) => setUnionFeePerCard(e.target.value)} style={{ padding: '8px' }} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '11px' }}>رصيد/وديعة الشركة للبطاقة</label>
                    <input type="number" required value={companyDepositPerCard} onChange={(e) => setCompanyDepositPerCard(e.target.value)} style={{ padding: '8px' }} />
                  </div>
                </div>
              </div>

              {/* Automatic Calculation Results */}
              <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', background: '#f0fdf4', padding: '15px', borderRadius: '10px', border: '1px dashed #10b981' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>الكمية المُستلمة</div>
                  <div style={{ fontWeight: 'bold', fontSize: '20px', color: '#10b981' }}>{cardsCount} بطاقة</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>خصم الاتحاد (المصروفات)</div>
                  <div style={{ fontWeight: 'bold', fontSize: '20px', color: '#ef4444' }}>{totalUnionFee} د.ل</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>تُضاف كوديعة للشركة</div>
                  <div style={{ fontWeight: 'bold', fontSize: '20px', color: '#f59e0b' }}>{totalCompanyDeposit} د.ل</div>
                </div>
              </div>

              <div className="form-group">
                <label>صورة الواصل المرفق</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReceiptImage(e.target.files[0]);
                    }
                  }}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', background: '#fff' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label>ملاحظات إضافية</label>
                <textarea
                  value={unionNotes}
                  onChange={(e) => setUnionNotes(e.target.value)}
                  placeholder="أي تفاصيل إضافية..."
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #ddd', minHeight: '60px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, padding: '14px', background: '#f59e0b', border: 'none', color: '#fff', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'جاري التسجيل...' : 'اعتماد وتسجيل الإيصال'}
                </button>
                <button type="button" onClick={() => setShowUnionModal(false)} style={{ flex: 1, padding: '14px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="modal" onClick={() => setSelectedImage(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ background: 'transparent', boxShadow: 'none', maxWidth: '800px', display: 'flex', justifyContent: 'center' }}>
            <img src={selectedImage} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '10px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
          </div>
        </div>
      )}

      {/* Professional Print-only Footer (Employee Salaries Style) */}
      <div className="print-only-footer" style={{ display: 'none', marginTop: '50px', justifyContent: 'space-between', textAlign: 'center' }}>
        <div style={{ paddingTop: '50px', borderTop: '1px solid #94a3b8', width: '25%' }}>
          <p style={{ margin: 0, fontWeight: '600', color: '#475569' }}>المحاسب المسؤول</p>
        </div>
        <div style={{ paddingTop: '50px', borderTop: '1px solid #94a3b8', width: '25%' }}>
          <p style={{ margin: 0, fontWeight: '600', color: '#475569' }}>مدير الشؤون المالية</p>
        </div>
        <div style={{ paddingTop: '50px', borderTop: '1px solid #94a3b8', width: '25%' }}>
          <p style={{ margin: 0, fontWeight: '600', color: '#475569' }}>المدير العام</p>
        </div>
      </div>

      <div className="print-date" style={{ display: 'none', marginTop: '30px', fontSize: '11px', color: '#94a3b8', textAlign: 'left' }}>
        تم استخراج هذا الكشف بتاريخ: {new Date().toLocaleString('ar-LY')}
      </div>
    </section>
  );
}
