import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';

interface BranchAgent {
  id: number;
  agency_name: string;
  agent_name: string;
  code: string;
  phone?: string;
}

interface Voucher {
  id: number;
  voucher_number: string;
  agent_id: number;
  agent_name: string;
  agent_phone?: string;
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

  const resolveImageUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${window.location.origin}/${cleanPath}`;
  };

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
        const mappedVouchers = data.map((v: any) => ({
          id: v.id,
          voucher_number: v.voucher_number,
          agent_id: v.branch_agent_id,
          agent_name: v.agent?.agency_name || 'وكيل مجهول',
          agent_phone: v.agent?.phone || '',
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
    if (e) e.preventDefault();
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
        const savedVoucher = await response.json();
        showToast(editingVoucher ? 'تم تحديث الإيصال بنجاح' : 'تم إصدار الإيصال بنجاح', 'success');
        setShowModal(false);
        fetchVouchers();

        if (!editingVoucher) {
          const agent = agents.find(a => a.id === parseInt(selectedAgent));
          const voucherToShare: Voucher = {
            id: savedVoucher.id,
            voucher_number: voucherNumber,
            agent_id: parseInt(selectedAgent),
            agent_name: agent?.agency_name || 'وكيل',
            agent_phone: agent?.phone || '',
            amount: parseFloat(amount),
            payment_method: paymentMethod === 'أخرى' ? customMethod : paymentMethod,
            payment_date: paymentDate,
            notes: notes,
            created_at: new Date().toISOString()
          };
          handleWhatsAppShare(voucherToShare);
        }
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
    }, 1000); // Increased delay to ensure rendering
  };

  const handleWhatsAppShare = (voucher: Voucher) => {
    const message = `*المدار الليبي للتأمين* 🏢%0A` +
      `*إيصال قبض مالي جديد*%0A%0A` +
      `📌 *رقم الإيصال:* ${voucher.voucher_number}%0A` +
      `👤 *السيد / المكتب:* ${voucher.agent_name}%0A` +
      `💰 *المبلغ:* ${voucher.amount.toLocaleString()} د.ل%0A` +
      `📅 *التاريخ:* ${voucher.payment_date}%0A` +
      `💳 *طريقة الدفع:* ${voucher.payment_method}%0A%0A` +
      `شكراً لتعاملكم معنا. ✨`;

    let cleanPhone = (voucher.agent_phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('09')) {
      cleanPhone = '218' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('9')) {
      cleanPhone = '218' + cleanPhone;
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrintAgentsRevenue = async () => {
    try {
      showToast('جاري تجهيز تقرير إيرادات الوكلاء...', 'success');
      const response = await fetch(`${API_BASE_URL}/financial-statistics/all-agents-revenue`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      const printWindow = window.open('', '', 'width=1200,height=900');
      if (!printWindow) {
        showToast('يرجى السماح بالنوافذ المنبثقة للطباعة', 'error');
        return;
      }

      const rows = data.agents.map((agent: any, idx: number) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-weight: bold; text-align: right;">${agent.agency_name}</td>
          <td style="text-align: right;">${agent.agent_name || '-'}</td>
          <td>${agent.document_count}</td>
          <td style="font-weight: bold; color: #014cb1;">${agent.sales.toLocaleString()} د.ل</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <html dir="rtl">
        <head>
          <title>تقرير إيرادات جميع الوكلاء</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
            @media print { 
              @page { margin: 10mm; } 
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            body { font-family: 'Cairo', sans-serif; margin: 20px; padding: 20px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #0ea5e9; padding-bottom: 15px; }
            .header h1 { margin: 0; color: #0ea5e9; font-size: 24px; font-weight: 900; }
            .meta-info { margin-bottom: 20px; font-size: 14px; color: #64748b; font-weight: 600; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-size: 13px; }
            th { background: #f8fafc; font-weight: 900; color: #0ea5e9; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; }
            .total-row { background: #f0f9ff; font-weight: 900; }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 500);">
          <div class="header">
            <div>
              <h1>شركة المدار الليبي للتأمين</h1>
              <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #334155;">تقرير إيرادات جميع الوكلاء</p>
            </div>
            <img src="/img/logo.png" style="height: 70px;">
          </div>
          <div class="meta-info">
            <div>
              <strong>تاريخ التقرير:</strong> ${new Date().toLocaleString('ar-LY')}
            </div>
            <div>
              <strong>إجمالي الإيرادات:</strong> ${data.total_revenue.toLocaleString()} د.ل &nbsp;|&nbsp; <strong>عدد الوكلاء:</strong> ${data.agents.length}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 30%; text-align: right;">اسم الوكالة</th>
                <th style="width: 25%; text-align: right;">اسم الوكيل</th>
                <th style="width: 15%;">عدد الوثائق</th>
                <th style="width: 25%;">إجمالي الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding-right: 20px;">المجموع الكلي</td>
                <td>${data.agents.reduce((acc: any, a: any) => acc + a.document_count, 0)}</td>
                <td>${data.total_revenue.toLocaleString()} د.ل</td>
              </tr>
            </tfoot>
          </table>
          <div class="footer">
            تم استخراج هذا التقرير آلياً من نظام المدار الليبي للتأمين - ${new Date().toLocaleString('ar-LY')}
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Error printing agents revenue:', error);
      showToast('حدث خطأ أثناء إعداد التقرير للطباعة', 'error');
    }
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handlePrintAgentsRevenue}
            className="secondary"
            style={{
              padding: '10px 20px', borderRadius: '10px',
              fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
              border: '1px solid var(--border)',
              background: '#0ea5e9',
              color: '#fff'
            }}
          >
            <i className="fa-solid fa-print"></i>
            تقرير الإيرادات
          </button>
          <button
            onClick={async () => {
              const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
              try {
                const columns = [
                  { header: 'رقم الإيصال', key: 'voucher_number', width: 20 },
                  { header: 'اسم الوكيل', key: 'agent_name', width: 35 },
                  { header: 'المبلغ', key: 'amount', width: 20 },
                  { header: 'طريقة الدفع', key: 'payment_method', width: 20 },
                  { header: 'التاريخ', key: 'payment_date', width: 20 },
                  { header: 'ملاحظات', key: 'notes', width: 35 },
                ];

                const data = vouchers.map((v) => ({
                  voucher_number: v.voucher_number,
                  agent_name: v.agent_name,
                  amount: v.amount.toLocaleString() + ' د.ل',
                  payment_method: v.payment_method,
                  payment_date: v.payment_date,
                  notes: v.notes || '-',
                }));

                // Summary row
                data.push({
                  voucher_number: 'الإجمالي',
                  agent_name: '',
                  amount: vouchers.reduce((sum, v) => sum + v.amount, 0).toLocaleString() + ' د.ل',
                  payment_method: '',
                  payment_date: '',
                  notes: '',
                });

                await generatePremiumExcel({
                  title: 'شركة المدار الليبي للتأمين - سجل إيصالات القبض المالي',
                  subtitle: `إجمالي المقبوضات: ${vouchers.reduce((sum, v) => sum + v.amount, 0).toLocaleString()} د.ل - عدد الإيصالات: ${vouchers.length}`,
                  columns,
                  data,
                  fileName: 'إيصالات_القبض',
                  qrData: `إيصالات القبض - شركة المدار الليبي\nعدد الإيصالات: ${vouchers.length}\nإجمالي: ${vouchers.reduce((sum, v) => sum + v.amount, 0).toLocaleString()} د.ل\nبواسطة: ${currentUser.name || 'النظام'}`
                });

                showToast('تم تصدير سجل الإيصالات بنجاح', 'success');
              } catch (error) {
                showToast('حدث خطأ أثناء تصدير التقرير', 'error');
              }
            }}
            className="secondary"
            style={{
              padding: '10px 20px', borderRadius: '10px',
              fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
              border: '1px solid var(--border)'
            }}
          >
            <i className="fa-solid fa-file-excel" style={{ color: '#166534' }}></i>
            تصدير إكسيل
          </button>
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

      <div className="users-card no-print" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="users-table-wrapper">
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
                        onClick={() => handleWhatsAppShare(voucher)}
                        style={{ background: '#dcfce7', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: '#166534' }}
                        title="إرسال عبر واتساب"
                      >
                        <i className="fa-brands fa-whatsapp"></i>
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
                  <option value="">-- اختر الوكيل --</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.agency_name}</option>
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
                    <option value="نقدي">نقدي</option>
                    <option value="شيك">شيك</option>
                    <option value="تحويل بنكي">حوالة مصرفية</option>
                    <option value="بطاقة مصرفية">بطاقة مصرفية (POS)</option>
                    <option value="أخرى">نوع آخر...</option>
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

              <div className="form-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="ghost"
                  style={{ padding: '12px 24px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="primary"
                  style={{ padding: '12px 32px' }}
                  disabled={loading}
                >
                  {loading ? 'جاري الحفظ...' : (editingVoucher ? 'تحديث الإيصال' : 'حفظ وإصدار الإيصال')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Professional Printed Voucher Template */}
      {printingVoucher && (
        <div className="voucher-print-container">
          <div className="voucher-paper">
            {/* Watermark */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-30deg)',
              fontSize: '120px',
              color: 'rgba(1, 76, 177, 0.03)',
              fontWeight: '900',
              pointerEvents: 'none',
              zIndex: 0,
              whiteSpace: 'nowrap'
            }}>المدار الليبي للتأمين</div>

            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '2px solid #014cb1',
              paddingBottom: '15px',
              marginBottom: '20px',
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{ textAlign: 'right', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                  <img src={resolveImageUrl('/img/logo.png')} alt="Logo" style={{ height: '70px', width: 'auto' }} />
                </div>
                <p style={{ fontSize: '10px', color: '#64748b', margin: '2px 0' }}>شركة مساهمة ليبية للتأمين وإعادة التأمين</p>
              </div>

              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  display: 'inline-block',
                  padding: '10px 40px',
                  border: '2px solid #014cb1',
                  borderRadius: '50px',
                  background: '#f8faff',
                  whiteSpace: 'nowrap'
                }}>
                  <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#014cb1', margin: 0, letterSpacing: '0.5px' }}>إيصال قبض مالي</h2>
                </div>
              </div>

              <div style={{ textAlign: 'left', flex: 1 }}></div>
            </div>

            {/* Elegant Coordinated Content Area */}
            <div style={{ padding: '0 10px', position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'grid', gap: '12px' }}>
                
                {/* Row 1: Header-style Info (Horizontal) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f8fafc', padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', color: '#1e3a8a', fontSize: '13px' }}>رقم الإيصال:</span>
                    <span style={{ color: '#ef4444', fontWeight: '900', fontSize: '16px' }}>{printingVoucher.voucher_number}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ fontWeight: '800', color: '#1e3a8a', fontSize: '13px' }}>التاريخ:</span>
                    <span style={{ fontWeight: '900', color: '#0f172a' }}>{printingVoucher.payment_date}</span>
                  </div>
                </div>

                {/* Row 2: Agent Name (Bar Style) */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ minWidth: '130px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontWeight: '800' }}>
                    <i className="fa-solid fa-user-tie" style={{ fontSize: '14px', opacity: 0.7 }}></i>
                    <span>وصلنا من السيد:</span>
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: '900', color: '#0f172a', flex: 1 }}>{printingVoucher.agent_name}</div>
                </div>

                {/* Row 3: Amount (Bar Style) */}
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ minWidth: '130px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontWeight: '800' }}>
                    <i className="fa-solid fa-money-bill-wave" style={{ fontSize: '14px', opacity: 0.7 }}></i>
                    <span>مبلغا وقدره:</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                    <span style={{ fontSize: '20px', fontWeight: '950', color: '#139625' }}>{printingVoucher.amount.toLocaleString()} د.ل</span>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold', border: '1px dashed #cbd5e1', padding: '2px 10px', borderRadius: '4px' }}>فقط لا غير</span>
                  </div>
                </div>

                {/* Row 4: Notes (Bar Style) */}
                <div style={{ display: 'flex', alignItems: 'flex-start', background: '#f8fafc', padding: '12px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ minWidth: '130px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e3a8a', fontWeight: '800', marginTop: '2px' }}>
                    <i className="fa-solid fa-file-invoice" style={{ fontSize: '14px', opacity: 0.7 }}></i>
                    <span>وذلك مقابل:</span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#334155', flex: 1, lineHeight: '1.5', fontWeight: '800' }}>{printingVoucher.notes || 'تسديد رصيد تأمينات صادرة'}</div>
                </div>

                {/* Row 5: Payment Details (Bar Style) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f8fafc', padding: '15px 20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: '#64748b', fontWeight: 'bold', fontSize: '12px' }}>طريقة الدفع:</span>
                    <span style={{ fontWeight: '900', color: '#014cb1', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                      <i className="fa-solid fa-credit-card" style={{ fontSize: '11px' }}></i>
                      {printingVoucher.payment_method}
                    </span>
                  </div>
                  {printingVoucher.bank_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ color: '#64748b', fontWeight: 'bold', fontSize: '12px' }}>المصرف:</span>
                      <span style={{ fontWeight: '800', color: '#334155', fontSize: '13px' }}>{printingVoucher.bank_name}</span>
                    </div>
                  )}
                  {printingVoucher.reference_number && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', gridColumn: 'span 2', marginTop: '5px', paddingTop: '8px', borderTop: '1px dashed #cbd5e1' }}>
                      <span style={{ color: '#64748b', fontWeight: 'bold', fontSize: '12px' }}>رقم المرجع / الشيك:</span>
                      <span style={{ fontWeight: '900', color: '#ef4444', letterSpacing: '1px', fontSize: '13px' }}>{printingVoucher.reference_number}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Signatures */}
            <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px', padding: '0 10px', position: 'relative', zIndex: 1 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '50px' }}></div>
                <div style={{ borderTop: '1.5px solid #014cb1', width: '85%', margin: '0 auto' }}></div>
                <p style={{ fontWeight: '900', fontSize: '13px', marginTop: '8px', color: '#1e3a8a' }}>توقيع المستلم</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  border: '2px dashed #cbd5e1',
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  margin: '-15px auto 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: '10px'
                }}>الختم الرسمي</div>
                <p style={{ fontWeight: '900', fontSize: '13px', marginTop: '8px', color: '#1e3a8a' }}>اعتماد الخزينة</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ height: '50px' }}></div>
                <div style={{ borderTop: '1.5px solid #014cb1', width: '85%', margin: '0 auto' }}></div>
                <p style={{ fontWeight: '900', fontSize: '13px', marginTop: '8px', color: '#1e3a8a' }}>المحاسب المسؤول</p>
              </div>
            </div>

            {/* Contact Info Footer */}
            <div style={{
              marginTop: '40px',
              paddingTop: '12px',
              borderTop: '1.5px solid #014cb1',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: '#475569',
              fontWeight: 'bold'
            }}>
              <span>طرابلس - ليبيا | حي الأندلس</span>
              <span>هاتف: 920003366 218+</span>
              <span>البريد الإلكتروني: info@mli.ly</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .voucher-print-container {
          display: none;
        }

        @media print {
          /* Reset Styles */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            visibility: hidden;
            height: 100vh !important;
            max-height: 100vh !important;
            overflow: hidden !important;
          }

          /* Hide ALL other components surgically */
          #root > *:not(.app-shell),
          .app-shell > *:not(.main-area),
          .main-area > *:not(.users-management),
          .users-management > *:not(.voucher-print-container),
          .no-print {
            display: none !important;
          }

          .voucher-print-container {
            display: flex !important;
            justify-content: center !important;
            align-items: flex-start !important;
            visibility: visible !important;
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 5mm 0 !important;
            background: #fff !important;
            z-index: 999999 !important;
            overflow: hidden !important;
          }

          .voucher-print-container * {
            visibility: visible !important;
          }

          @page {
            size: A4 portrait;
            margin: 0 !important;
          }

          .voucher-paper {
            width: 190mm !important;
            height: 275mm !important;
            max-height: 275mm !important;
            margin: 0 auto !important;
            padding: 10mm 15mm !important;
            box-sizing: border-box !important;
            border: 2px solid #014cb1 !important;
            background: #fff !important;
            position: relative !important;
            overflow: hidden !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            transform: scale(1);
            transform-origin: top center;
          }

          .watermark {
            font-size: 80px !important;
            opacity: 0.03 !important;
            width: 100% !important;
            text-align: center !important;
          }
        }
      `}</style>
    </section>
  );
}
