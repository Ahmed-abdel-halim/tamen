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
}

interface Statistics {
  monthly_total: number;
  monthly_count: number;
  monthly_average: number;
}

const DEFAULT_CATEGORIES = ['قرطاسية', 'صيانة', 'خدمات', 'إيجار', 'ضيافة'];

export default function ExpenseManagement() {
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

  const API_BASE_URL = '/api';

  const dynamicCategories = React.useMemo(() => {
    const existing = expenses.map(e => e.category);
    const combined = [...DEFAULT_CATEGORIES, ...existing];
    return Array.from(new Set(combined)).filter(cat => cat && !cat.includes('أخرى'));
  }, [expenses]);

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesCategory = categoryFilter === 'الكل' || e.category === categoryFilter;
      const matchesStatus = statusFilter === 'الكل' || e.status === statusFilter;

      const expenseDate = new Date(e.expense_date);
      const matchesFrom = !fromDate || expenseDate >= new Date(fromDate);
      const matchesTo = !toDate || expenseDate <= new Date(toDate);

      return matchesSearch && matchesCategory && matchesStatus && matchesFrom && matchesTo;
    });
  }, [expenses, searchFilter, categoryFilter, statusFilter, fromDate, toDate]);

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
  }, []);

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
    } else {
      setEditingExpense(null);
      setName('');
      setRecipient('');
      setCategory('قرطاسية');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setStatus('مدفوع');
      setNotes('');
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
          notes
        }),
      });

      if (response.ok) {
        showToast(editingExpense ? 'تم تحديث المصروف بنجاح' : 'تم إضافة المصروف بنجاح', 'success');
        setShowModal(false);
        fetchExpenses();
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

  return (
    <section className="users-management">
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
            تقرير المصروفات التشغيلية
          </h2>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: auto; margin: 10mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print, .sidebar, .topbar, th:last-child, td:last-child { display: none !important; }
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
            font-size: 11px !important;
            table-layout: auto !important;
          }
          .users-table th { 
            background-color: #f1f5f9 !important; 
            color: #475569 !important; 
            font-weight: 700 !important; 
            padding: 12px 10px !important; 
            border: 1px solid #cbd5e1 !important;
            text-align: center !important;
            -webkit-print-color-adjust: exact;
          }
          .users-table td { 
            padding: 10px !important; 
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
            <i className="fa-solid fa-file-invoice-dollar" style={{ color: '#38bdf8' }}></i>
            إدارة المصروفات التشغيلية
          </h2>
          <p style={{ margin: 0, opacity: 0.8, fontSize: '14px', color: '#fff' }}>تتبع جميع النفقات والتكاليف التشغيلية والمصاريف العمومية</p>
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
            تسجيل مصروف جديد
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
                  <td style={{ color: 'var(--text)' }}>{expense.category}</td>
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

      {showModal && (
        <div className="modal-overlay no-print" style={{
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
