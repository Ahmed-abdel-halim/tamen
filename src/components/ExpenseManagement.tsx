import React, { useState } from 'react';
import { showToast } from './Toast';

interface Expense {
  id: number;
  name: string;
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
  
  const [name, setName] = useState('');
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
      setCategory(expense.category);
      setAmount(expense.amount.toString());
      setDate(expense.expense_date);
      setStatus(expense.status);
      setNotes(expense.notes || '');
    } else {
      setEditingExpense(null);
      setName('');
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
      console.error('Error updating status:', error);
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    }
  };

  // const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <section className="users-management">
      <div className="users-breadcrumb no-print" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '15px 20px',
        background: '#fff',
        borderRadius: '12px',
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#014cb1' }}>
          <i className="fa-solid fa-vault" style={{ marginLeft: '10px', color: '#ef4444' }}></i>
          إدارة المصروفات التشغيلية
        </span>
        <button 
          onClick={() => setShowModal(true)}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#666', fontSize: '13px', marginBottom: '8px' }}>إجمالي المصروفات (الشهر)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
            {statistics.monthly_total.toLocaleString()} د.ل
          </div>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#666', fontSize: '13px', marginBottom: '8px' }}>عدد العمليات</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{statistics.monthly_count} عملية</div>
        </div>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '15px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ color: '#666', fontSize: '13px', marginBottom: '8px' }}>متوسط الصرف</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#139625' }}>
            {statistics.monthly_average.toFixed(2)} د.ل
          </div>
        </div>
      </div>

      <div className="users-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>البند</th>
                <th>الفئة</th>
                <th>المبلغ</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th className="no-print">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td style={{ fontWeight: 'bold', color: '#0f172a' }}>{expense.name}</td>
                  <td>{expense.category}</td>
                  <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{expense.amount.toLocaleString()} د.ل</td>
                  <td>{expense.expense_date}</td>
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
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>لا توجد مصروفات مسجلة</td>
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
    </section>
  );
}
