import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

interface BranchAgent {
  id: number;
  agency_name: string;
  agent_name: string;
  code: string;
}

interface Voucher {
  id: number;
  voucher_number: string;
  agent_id: number;
  agent_name: string;
  amount: number;
  payment_method: string;
  bank_name?: string;
  reference_number?: string;
  extra_details?: any;
  payment_date: string;
  notes: string;
  created_at: string;
}

export default function PaymentVouchers() {
  const [agents, setAgents] = useState<BranchAgent[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [printingVoucher, setPrintingVoucher] = useState<Voucher | null>(null);
  
  // Form State
  const [selectedAgent, setSelectedAgent] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('نقدي');
  const [bankName, setBankName] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [customMethod, setCustomMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [voucherNumber, setVoucherNumber] = useState('');

  useEffect(() => {
    fetchAgents();
    fetchVouchers();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/branches-agents`);
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      showToast('حدث خطأ أثناء جلب الوكلاء', 'error');
    }
  };

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/payment-vouchers`);
      if (response.ok) {
        const data = await response.json();
        // تنسيق البيانات لتناسب الـ Interface
        const mappedVouchers = data.map((v: any) => ({
          id: v.id,
          voucher_number: v.voucher_number,
          agent_id: v.branch_agent_id,
          agent_name: v.agent?.agency_name || 'وكيل مجهول',
          amount: parseFloat(v.amount),
          payment_method: v.payment_method,
          payment_date: v.payment_date,
          notes: v.notes || '',
          bank_name: v.bank_name || '',
          reference_number: v.reference_number || '',
          created_at: v.created_at
        }));
        setVouchers(mappedVouchers);
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      showToast('حدث خطأ أثناء جلب إيصالات القبض', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (voucher: Voucher | null = null) => {
    if (voucher) {
      setEditingVoucher(voucher);
      setSelectedAgent(voucher.agent_id.toString());
      setAmount(voucher.amount.toString());
      setPaymentMethod(voucher.payment_method);
      setBankName(voucher.bank_name || '');
      setRefNumber(voucher.reference_number || '');
      setCustomMethod('');
      setPaymentDate(voucher.payment_date);
      setNotes(voucher.notes);
      setVoucherNumber(voucher.voucher_number);
    } else {
      setEditingVoucher(null);
      setSelectedAgent('');
      setAmount('');
      setPaymentMethod('نقدي');
      setBankName('');
      setRefNumber('');
      setCustomMethod('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setVoucherNumber(`PV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    }
    setShowModal(true);
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgent || !amount) return;
    
    setLoading(true);
    try {
      const url = editingVoucher 
        ? `${API_BASE_URL}/payment-vouchers/${editingVoucher.id}`
        : `${API_BASE_URL}/payment-vouchers`;
      
      const method = editingVoucher ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voucher_number: voucherNumber,
          branch_agent_id: parseInt(selectedAgent),
          amount: parseFloat(amount),
          payment_method: paymentMethod === 'أخرى' ? customMethod : paymentMethod,
          bank_name: bankName,
          reference_number: refNumber,
          payment_date: paymentDate,
          notes: notes
        }),
      });

      if (response.ok) {
        showToast(editingVoucher ? 'تم تحديث الإيصال بنجاح' : 'تم إصدار الإيصال بنجاح', 'success');
        setShowModal(false);
        fetchVouchers(); // تحديث القائمة
      } else {
        const errData = await response.json().catch(() => ({}));
        showToast(errData.message || 'فشلت العملية', 'error');
      }
    } catch (error) {
      console.error('Error saving voucher:', error);
      showToast('حدث خطأ أثناء الاتصال بالسيرفر', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVoucher = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإيصال؟')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/payment-vouchers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        showToast('تم حذف الإيصال بنجاح', 'success');
        fetchVouchers();
      } else {
        showToast('حدث خطأ أثناء الحذف', 'error');
      }
    } catch (error) {
      console.error('Error deleting voucher:', error);
      showToast('حدث خطأ أثناء الاتصال بالسيرفر', 'error');
    }
  };

  const handlePrintVoucher = (voucher: Voucher) => {
    setPrintingVoucher(voucher);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb no-print" style={{ 
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
          <i className="fa-solid fa-receipt" style={{ marginLeft: '10px', color: '#139625' }}></i>
          نظام إيصالات القبض المالي
        </span>
        <button 
          onClick={() => handleOpenModal()}
          className="primary"
          style={{ 
            padding: '10px 20px', borderRadius: '10px', 
            fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <i className="fa-solid fa-plus"></i>
          إصدار إيصال جديد
        </button>
      </div>

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>إجمالي المقبوضات (اليوم)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#139625' }}>
            {vouchers.reduce((sum, v) => sum + v.amount, 0).toLocaleString()} د.ل
          </div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>عدد الإيصالات الصادرة</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#014cb1' }}>{vouchers.length} إيصال</div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>آخر عملية توريد</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>{vouchers[0]?.agent_name || '-'}</div>
        </div>
      </div>

      <div className="users-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="users-table-wrapper no-print">
          <table className="users-table">
            <thead>
              <tr>
                <th>رقم الإيصال</th>
                <th>اسم الوكيل</th>
                <th>المبلغ</th>
                <th>طريقة الدفع</th>
                <th>التاريخ</th>
                <th className="no-print">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((voucher) => (
                <tr key={voucher.id}>
                  <td style={{ fontWeight: 'bold', color: '#014cb1' }}>{voucher.voucher_number}</td>
                  <td>{voucher.agent_name}</td>
                  <td style={{ color: '#139625', fontWeight: 'bold' }}>{voucher.amount.toLocaleString()} د.ل</td>
                  <td>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
                      background: voucher.payment_method === 'نقدي' ? '#dcfce7' : '#e0f2fe',
                      color: voucher.payment_method === 'نقدي' ? '#166534' : '#0369a1',
                      fontWeight: '800'
                    }}>
                      {voucher.payment_method}
                    </span>
                  </td>
                  <td>{voucher.payment_date}</td>
                  <td className="no-print">
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handlePrintVoucher(voucher)}
                        style={{ background: '#f1f5f9', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}
                        title="طباعة الإيصال"
                      >
                        <i className="fa-solid fa-print"></i>
                      </button>
                      <button 
                        onClick={() => handleOpenModal(voucher)}
                        style={{ background: '#f0f9ff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: '#0369a1' }}
                        title="تعديل الإيصال"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button 
                        onClick={() => handleDeleteVoucher(voucher.id)}
                        style={{ background: '#fef2f2', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: '#991b1b' }}
                        title="حذف الإيصال"
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

      {showModal && (
        <div className="modal no-print" onClick={(e) => {
          if (e.target === e.currentTarget) setShowModal(false);
        }}>
          <div className="modal-content" style={{ width: '550px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>
                {editingVoucher ? 'تعديل إيصال القبض' : 'إصدار إيصال قبض جديد'}
              </h3>
              <button 
                className="modal-close" 
                onClick={() => setShowModal(false)}
                aria-label="إغلاق"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} style={{ padding: '24px' }}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>رقم الإيصال</label>
                <input 
                  type="text" 
                  required 
                  value={voucherNumber} 
                  onChange={(e) => setVoucherNumber(e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }} 
                  disabled
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>اختر الوكيل <span className="required">*</span></label>
                <select 
                  required
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                >
                  <option value="" style={{ background: 'var(--panel)' }}>-- اختر الوكيل --</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id} style={{ background: 'var(--panel)' }}>{agent.agency_name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>المبلغ المدفوع (د.ل) <span className="required">*</span></label>
                  <input 
                    type="number" 
                    required 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    placeholder="0.00" 
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }} 
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>طريقة الدفع</label>
                  <select 
                    value={paymentMethod} 
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      if (e.target.value === 'نقدي') {
                        setBankName('');
                        setRefNumber('');
                      }
                    }} 
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                  >
                    <option value="نقدي" style={{ background: 'var(--panel)' }}>نقدي</option>
                    <option value="شيك" style={{ background: 'var(--panel)' }}>شيك</option>
                    <option value="تحويل بنكي" style={{ background: 'var(--panel)' }}>حوالة مصرفية</option>
                    <option value="بطاقة مصرفية" style={{ background: 'var(--panel)' }}>بطاقة مصرفية (POS)</option>
                    <option value="أخرى" style={{ background: 'var(--panel)' }}>نوع آخر...</option>
                  </select>
                </div>
              </div>

              {paymentMethod === 'أخرى' && (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>اسم وسيلة الدفع <span className="required">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={customMethod} 
                    onChange={(e) => setCustomMethod(e.target.value)} 
                    placeholder="مثال: نقدي + شيك" 
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }} 
                  />
                </div>
              )}

              {(paymentMethod === 'شيك' || paymentMethod === 'تحويل بنكي' || paymentMethod === 'بطاقة مصرفية') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                      {paymentMethod === 'شيك' ? 'رقم الشيك' : 
                       paymentMethod === 'تحويل بنكي' ? 'رقم الحوالة' : 'رقم الإيصال'} <span className="required">*</span>
                    </label>
                    <input 
                      type="text" 
                      required 
                      value={refNumber} 
                      onChange={(e) => setRefNumber(e.target.value)} 
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }} 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>اسم المصرف <span className="required">*</span></label>
                    <input 
                      type="text" 
                      required 
                      value={bankName} 
                      onChange={(e) => setBankName(e.target.value)} 
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }} 
                    />
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>تاريخ القبض <span className="required">*</span></label>
                <input 
                  type="date" 
                  required 
                  value={paymentDate} 
                  onChange={(e) => setPaymentDate(e.target.value)} 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }} 
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>ملاحظات</label>
                <textarea 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="اكتب أي ملاحظات إضافية هنا..." 
                  rows={3} 
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', resize: 'none', background: 'var(--input-bg)', color: 'var(--text)' }} 
                />
              </div>
            </form>

            <div className="form-actions">
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="ghost"
                style={{ padding: '12px 24px' }}
              >
                إلغاء
              </button>
              <button 
                type="button" 
                onClick={handleCreateVoucher}
                className="primary"
                style={{ padding: '12px 32px' }}
                disabled={loading}
              >
                {loading ? 'جاري الحفظ...' : (editingVoucher ? 'تحديث الإيصال' : 'حفظ وإصدار الإيصال')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Printed Voucher Template */}
      {printingVoucher && (
        <div className="voucher-print-container" style={{ direction: 'rtl', padding: '0', background: '#fff', minHeight: '100vh', display: 'none' }}>
           <div style={{ 
            border: '2px solid #014cb1', 
            padding: '40px', 
            borderRadius: '15px', 
            position: 'relative',
            width: '90%',
            margin: '20px auto',
            minHeight: 'auto',
            pageBreakInside: 'avoid'
          }}>
            {/* Header */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderBottom: '1.5px solid #014cb1', 
              paddingBottom: '10px', 
              marginBottom: '20px' 
            }}>
              <div style={{ textAlign: 'right' }}>
                <img src="/img/logo3.png" alt="شعار المدار" style={{ height: '60px', width: 'auto', marginBottom: '10px' }} />
                <h1 style={{ fontSize: '18px', fontWeight: 'bold', color: '#014cb1', margin: 0 }}>المدار الليبي للتأمين</h1>
                <p style={{ fontSize: '12px', color: '#666', margin: '3px 0' }}>Al Madar Libyan Insurance</p>
                <p style={{ fontSize: '10px', color: '#666', margin: 0 }}>الإدارة العامة - طرابلس، ليبيا</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#014cb1', marginTop: '30px', letterSpacing: '1px' }}>إيصال قبض مالي</h2>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', fontSize: '13px' }}>
                    <span style={{ fontWeight: 'bold' }}>الرقم:</span>
                    <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{printingVoucher.voucher_number}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', fontSize: '13px' }}>
                    <span style={{ fontWeight: 'bold' }}>التاريخ:</span>
                    <span>{printingVoucher.payment_date}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div style={{ padding: '10px 30px', fontSize: '14px', lineHeight: '2.5' }}>
              <div style={{ borderBottom: '1px dotted #aaa', display: 'flex', gap: '15px', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', minWidth: '150px', color: '#014cb1' }}>وصلنا من السيد / المكتب:</span>
                <span style={{ fontSize: '16px', fontWeight: '800', color: '#000' }}>{printingVoucher.agent_name}</span>
              </div>
              
              <div style={{ borderBottom: '1px dotted #aaa', display: 'flex', gap: '15px', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', minWidth: '150px', color: '#014cb1' }}>مبلغاً وقدره:</span>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#139625' }}>{printingVoucher.amount.toLocaleString()} د.ل</span>
              </div>

              <div style={{ borderBottom: '1px dotted #aaa', display: 'flex', gap: '15px', marginBottom: '10px' }}>
                <span style={{ fontWeight: 'bold', minWidth: '150px', color: '#014cb1' }}>وذلك مقابل:</span>
                <span style={{ fontSize: '15px' }}>{printingVoucher.notes || 'تسديد رصيد تأمينات صادرة'}</span>
              </div>

              <div style={{ borderBottom: '1px dotted #aaa', display: 'flex', gap: '15px' }}>
                <span style={{ fontWeight: 'bold', minWidth: '150px', color: '#014cb1' }}>طريقة الدفع:</span>
                <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                  {printingVoucher.payment_method}
                  {printingVoucher.bank_name ? ` - ${printingVoucher.bank_name}` : ''}
                  {printingVoucher.reference_number ? ` (${printingVoucher.reference_number})` : ''}
                </span>
              </div>
            </div>

            {/* Footer Signatures */}
            <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '40px', padding: '0 20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #000', width: '90%', margin: '0 auto', minHeight: '40px' }}></div>
                <p style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '5px' }}>توقيع المستلم</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ border: '1px dashed #ddd', width: '70px', height: '70px', borderRadius: '50%', margin: '0 auto' }}></div>
                <p style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '5px' }}>الختم الرسمي</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #000', width: '90%', margin: '0 auto', minHeight: '40px' }}></div>
                <p style={{ fontWeight: 'bold', fontSize: '13px', marginTop: '5px' }}>المحاسب المسؤول</p>
              </div>
            </div>

            {/* Contact Info Footer */}
            <div style={{ marginTop: '20px', paddingTop: '10px', borderTop: '1px solid #eee', textAlign: 'center', fontSize: '9px', color: '#999' }}>
              طرابلس - حي الأندلس | هاتف: 0910000000 | البريد الإلكتروني: finance@almadar-insurance.ly
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          /* إخفاء كل شيء غير مرغوب فيه */
          body * { visibility: hidden !important; }
          header, nav, .sidebar, .topbar, .no-print { display: none !important; }
          
          /* إظهار حاوية الإيصال فقط */
          .voucher-print-container, .voucher-print-container * { 
            visibility: visible !important; 
            display: block !important;
          }
          .voucher-print-container { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            overflow: clip !important;
          }

          /* ضبط الورقة على صفحة واحدة */
          @page { 
            size: A4 portrait; 
            margin: 0 !important; 
          }

          /* تصغير التنسيق الداخلي لضمان الاحتواء وتوفير مساحة للمحاسب */
          .voucher-print-container > div {
            width: 88% !important;
            margin: 5mm auto !important;
            transform: scale(0.9);
            transform-origin: top center;
            max-height: 260mm !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
            border: 2px solid #014cb1 !important;
          }
        }
      `}</style>
    </section>
  );
}
