import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

interface BankTransaction {
  id: number;
  transaction_date: string;
  reference_number: string;
  bank_name: string;
  account_number: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  reconciled: boolean;
  notes: string;
}

const BANKS = ['مصرف الجمهورية', 'مصرف الوحدة', 'مصرف التجارة والتنمية', 'المصرف الإسلامي الليبي', 'مصرف صحارى'];

export default function BankReconciliation() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeBank, setActiveBank] = useState('all');

  // Form State
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    bank_name: BANKS[0],
    account_number: '',
    amount: '',
    type: 'deposit',
    notes: ''
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/bank-transactions`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      showToast('خطأ في جلب البيانات البنكية', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReconcile = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/bank-transactions/${id}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        fetchTransactions();
        showToast('تم تحديث حالة المطابقة', 'success');
      }
    } catch (error) {
      showToast('فشل تحديث الحالة', 'error');
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/bank-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowModal(false);
        fetchTransactions();
        showToast('تم إضافة الحركة بنجاح', 'success');
      }
    } catch (error) {
      showToast('خطأ في إضافة الحركة', 'error');
    }
  };

  const getBankBalance = (bank: string) => {
    return transactions
      .filter(t => t.bank_name === bank)
      .reduce((sum, t) => t.type === 'deposit' ? sum + parseFloat(t.amount.toString()) : sum - parseFloat(t.amount.toString()), 0);
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '15px 20px',
        background: 'var(--panel)',
        borderRadius: '12px',
        marginBottom: '20px',
        border: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
          <i className="fa-solid fa-building-columns" style={{ marginLeft: '10px', color: '#139625' }}></i>
          المطابقة والتحصيلات البنكية
        </span>
        <button className="primary" onClick={() => setShowModal(true)}>
          <i className="fa-solid fa-plus" style={{ marginLeft: '8px' }}></i>
          إضافة حركة بنكية
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
        {BANKS.slice(0, 4).map(bank => (
          <div 
            key={bank}
            onClick={() => setActiveBank(bank)}
            style={{ 
              background: 'var(--panel)', padding: '20px', borderRadius: '15px', 
              border: activeBank === bank ? '2px solid #014cb1' : '1px solid var(--border)',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <div style={{ color: 'var(--muted)', fontSize: '12px', marginBottom: '5px' }}>{bank}</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
              {getBankBalance(bank).toLocaleString()} د.ل
            </div>
          </div>
        ))}
      </div>

      <div className="users-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="users-table">
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>رقم المرجع</th>
              <th>المصرف</th>
              <th>الحساب</th>
              <th>القيمة</th>
              <th>النوع</th>
              <th>الحالة</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>جاري التحميل...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>لا توجد حركات مسجلة حالياً</td></tr>
            ) : transactions.map(txn => (
              <tr key={txn.id}>
                <td>{txn.transaction_date}</td>
                <td>{txn.reference_number}</td>
                <td>{txn.bank_name}</td>
                <td style={{ direction: 'ltr' }}>{txn.account_number}</td>
                <td style={{ fontWeight: 'bold', color: txn.type === 'deposit' ? '#139625' : '#ef4444' }}>
                  {txn.type === 'deposit' ? '+' : '-'}{parseFloat(txn.amount.toString()).toLocaleString()} د.ل
                </td>
                <td>{txn.type === 'deposit' ? 'إيداع' : 'سحب'}</td>
                <td>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
                    background: txn.reconciled ? '#dcfce7' : '#fef2f2',
                    color: txn.reconciled ? '#166534' : '#991b1b',
                    fontWeight: '800'
                  }}>
                    {txn.reconciled ? 'مطابقة' : 'غير مطابقة'}
                  </span>
                </td>
                <td>
                  <button 
                    onClick={() => handleToggleReconcile(txn.id)}
                    style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px' }}
                  >
                    {txn.reconciled ? 'إلغاء المطابقة' : 'تأكيد المطابقة'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content dark-modal" style={{ maxWidth: '600px', background: 'var(--panel)' }}>
            <div className="modal-header">
              <h3>إضافة حركة بنكية جديدة</h3>
              <button onClick={() => setShowModal(false)} className="close-btn">&times;</button>
            </div>
            <form onSubmit={handleSaveTransaction} style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div className="form-group">
                  <label>التاريخ</label>
                  <input type="date" required value={formData.transaction_date} onChange={e => setFormData({...formData, transaction_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>رقم المرجع (إن وجد)</label>
                  <input type="text" value={formData.reference_number} onChange={e => setFormData({...formData, reference_number: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>المصرف</label>
                  <select value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})}>
                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>رقم الحساب</label>
                  <input type="text" value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>القيمة</label>
                  <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>نوع الحركة</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="deposit">إيداع (+)</option>
                    <option value="withdrawal">سحب (-)</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label>ملاحظات</label>
                <textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
              </div>
              <div className="form-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="secondary" style={{ padding: '10px 20px' }}>إلغاء</button>
                <button type="submit" className="primary" style={{ padding: '10px 30px' }}>حفظ الحركة</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
