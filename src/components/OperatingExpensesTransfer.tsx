import { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  status: 'pending' | 'transferred';
  notes?: string;
}

interface TransferRecord {
  id: number;
  expense_id: number;
  transfer_date: string;
  destination: 'treasury' | 'bank';
  destination_details: string;
  amount: number;
  reference_number?: string;
  status: 'completed' | 'pending';
}

export default function OperatingExpensesTransfer() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<number[]>([]);
  const [transferDestination, setTransferDestination] = useState<'treasury' | 'bank'>('treasury');
  const [destinationDetails, setDestinationDetails] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'transferred'>('pending');

  const getAuthHeaders = () => {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/operating-expenses`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('فشل تحميل المصروفات');
      const data = await res.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error?.message || 'حدث خطأ أثناء تحميل المصروفات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTransfers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/operating-expenses/transfers`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('فشل تحميل السجلات');
      const data = await res.json();
      setTransfers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error?.message || 'حدث خطأ أثناء تحميل السجلات', 'error');
    }
  };

  useEffect(() => {
    loadExpenses();
    loadTransfers();
  }, []);

  const pendingExpenses = useMemo(() => {
    return expenses.filter(e => e.status === 'pending');
  }, [expenses]);

  const transferredExpenses = useMemo(() => {
    return expenses.filter(e => e.status === 'transferred');
  }, [expenses]);

  const selectedTotal = useMemo(() => {
    return selectedExpenses.reduce((sum, id) => {
      const exp = expenses.find(e => e.id === id);
      return sum + (exp?.amount || 0);
    }, 0);
  }, [selectedExpenses, expenses]);

  const handleSelectExpense = (id: number) => {
    setSelectedExpenses(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedExpenses.length === pendingExpenses.length) {
      setSelectedExpenses([]);
    } else {
      setSelectedExpenses(pendingExpenses.map(e => e.id));
    }
  };

  const handleTransfer = async () => {
    if (selectedExpenses.length === 0) {
      showToast('يرجى اختيار مصروفات للنقل', 'error');
      return;
    }
    if (!destinationDetails.trim()) {
      showToast('يرجى تحديد تفاصيل الوجهة', 'error');
      return;
    }

    const ok = window.confirm(
      `تأكيد نقل ${selectedExpenses.length} مصروفة بإجمالي ${selectedTotal.toLocaleString()} د.ل إلى ${
        transferDestination === 'treasury' ? 'الخزينة' : 'المصرف'
      }؟`
    );
    if (!ok) return;

    setTransferring(true);
    try {
      const res = await fetch(`${API_BASE_URL}/operating-expenses/transfer`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          expense_ids: selectedExpenses,
          destination: transferDestination,
          destination_details: destinationDetails,
          reference_number: referenceNumber || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.message || 'فشل النقل');
      }

      showToast('تم نقل المصروفات بنجاح', 'success');
      setSelectedExpenses([]);
      setDestinationDetails('');
      setReferenceNumber('');
      await loadExpenses();
      await loadTransfers();
    } catch (error: any) {
      showToast(error?.message || 'حدث خطأ أثناء النقل', 'error');
    } finally {
      setTransferring(false);
    }
  };

  const money = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>الشؤون المالية / نقل المصروفات التشغيلية</span>
      </div>

      <div className="users-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <button
            className={`btn-submit ${activeTab === 'pending' ? '' : 'btn-secondary'}`}
            onClick={() => setActiveTab('pending')}
          >
            <i className="fa-solid fa-hourglass-end"></i>
            المصروفات المعلقة ({pendingExpenses.length})
          </button>
          <button
            className={`btn-submit ${activeTab === 'transferred' ? '' : 'btn-secondary'}`}
            onClick={() => setActiveTab('transferred')}
          >
            <i className="fa-solid fa-check-circle"></i>
            المصروفات المنقولة ({transferredExpenses.length})
          </button>
        </div>
      </div>

      {activeTab === 'pending' && (
        <div className="users-card">
          <div style={{ marginBottom: '20px' }}>
            <h3>نقل المصروفات التشغيلية</h3>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              اختر المصروفات المراد نقلها من المحاسب المالي إلى الخزينة أو المصارف
            </p>
          </div>

          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedExpenses.length === pendingExpenses.length && pendingExpenses.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>الوصف</th>
                  <th>الفئة</th>
                  <th>المبلغ</th>
                  <th>التاريخ</th>
                  <th>الملاحظات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '28px 0' }}>
                      جاري التحميل...
                    </td>
                  </tr>
                ) : pendingExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '28px 0' }}>
                      لا توجد مصروفات معلقة
                    </td>
                  </tr>
                ) : (
                  pendingExpenses.map(exp => (
                    <tr key={exp.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedExpenses.includes(exp.id)}
                          onChange={() => handleSelectExpense(exp.id)}
                        />
                      </td>
                      <td>{exp.description}</td>
                      <td>{exp.category}</td>
                      <td style={{ fontWeight: 600, color: '#10b981' }}>
                        {money.format(exp.amount)} د.ل
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        {new Date(exp.date).toLocaleDateString('ar-LY')}
                      </td>
                      <td style={{ fontSize: '12px' }}>{exp.notes || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pendingExpenses.length > 0 && (
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    الوجهة
                  </label>
                  <select
                    value={transferDestination}
                    onChange={(e) => setTransferDestination(e.target.value as 'treasury' | 'bank')}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="treasury">الخزينة</option>
                    <option value="bank">المصرف</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    تفاصيل الوجهة
                  </label>
                  <input
                    type="text"
                    placeholder={transferDestination === 'treasury' ? 'اسم الخزينة' : 'اسم المصرف والحساب'}
                    value={destinationDetails}
                    onChange={(e) => setDestinationDetails(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    رقم المرجع (اختياري)
                  </label>
                  <input
                    type="text"
                    placeholder="رقم الحوالة أو الشيك"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>المبلغ الإجمالي المختار:</strong>
                  <span style={{ marginLeft: '8px', fontSize: '18px', color: '#10b981', fontWeight: 700 }}>
                    {money.format(selectedTotal)} د.ل
                  </span>
                </div>
                <button
                  className="btn-submit"
                  onClick={handleTransfer}
                  disabled={selectedExpenses.length === 0 || transferring}
                >
                  <i className="fa-solid fa-arrow-right"></i>
                  {transferring ? 'جاري النقل...' : 'نقل المصروفات'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'transferred' && (
        <div className="users-card">
          <div style={{ marginBottom: '20px' }}>
            <h3>سجل المصروفات المنقولة</h3>
            <p style={{ color: '#64748b', fontSize: '14px' }}>
              عرض جميع المصروفات التي تم نقلها إلى الخزينة والمصارف
            </p>
          </div>

          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>الوصف</th>
                  <th>الفئة</th>
                  <th>المبلغ</th>
                  <th>الوجهة</th>
                  <th>تفاصيل الوجهة</th>
                  <th>رقم المرجع</th>
                  <th>تاريخ النقل</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '28px 0' }}>
                      لا توجد مصروفات منقولة
                    </td>
                  </tr>
                ) : (
                  transfers.map(transfer => {
                    const exp = expenses.find(e => e.id === transfer.expense_id);
                    return (
                      <tr key={transfer.id}>
                        <td>{exp?.description || '—'}</td>
                        <td>{exp?.category || '—'}</td>
                        <td style={{ fontWeight: 600, color: '#10b981' }}>
                          {money.format(transfer.amount)} د.ل
                        </td>
                        <td>
                          {transfer.destination === 'treasury' ? (
                            <span style={{ color: '#3b82f6' }}>
                              <i className="fa-solid fa-vault"></i> الخزينة
                            </span>
                          ) : (
                            <span style={{ color: '#8b5cf6' }}>
                              <i className="fa-solid fa-building-columns"></i> المصرف
                            </span>
                          )}
                        </td>
                        <td>{transfer.destination_details}</td>
                        <td style={{ fontSize: '12px' }}>{transfer.reference_number || '—'}</td>
                        <td style={{ fontSize: '12px', color: '#64748b' }}>
                          {new Date(transfer.transfer_date).toLocaleDateString('ar-LY')}
                        </td>
                        <td>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: transfer.status === 'completed' ? '#d1fae5' : '#fef3c7',
                            color: transfer.status === 'completed' ? '#065f46' : '#92400e',
                            fontSize: '12px',
                            fontWeight: 600
                          }}>
                            {transfer.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
