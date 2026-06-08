import { useState, useEffect, useMemo } from 'react';
import { showToast } from '../Toast';
import { API_BASE_URL } from '../../config/api';
import { generatePremiumExcel } from '../../utils/excelGenerator';

export default function FinanceClaimsList() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');
  const [rejectingClaimId, setRejectingClaimId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/claims`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error fetching claims');
      const data = await response.json();
      setClaims(data);
    } catch (error) {
      showToast('حدث خطأ أثناء جلب ملفات الشؤون المالية', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter claims based on tabs
  // pending: status 'للتسديد - الشؤون المالية'
  // paid: status 'مدفوع' and finance_status 'approved'
  const filteredClaims = useMemo(() => {
    return claims.filter((c: any) => {
      const isPending = c.status === 'للتسديد - الشؤون المالية';
      const isPaid = c.status === 'مدفوع' && c.finance_status === 'approved';

      if (activeTab === 'pending' && !isPending) return false;
      if (activeTab === 'paid' && !isPaid) return false;

      return (
        c.claim_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.claimant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.document?.insurance_number || c.document_manual_data?.insurance_number || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [claims, activeTab, searchQuery]);

  const handleApprove = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من الموافقة وصرف قيمة هذا التعويض؟')) return;

    setProcessingId(id);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`${API_BASE_URL}/claims/${id}/approve-payment?user_id=${user.id || ''}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        showToast('تمت الموافقة وصرف التعويض بنجاح', 'success');
        fetchClaims();
      } else {
        showToast('حدث خطأ أثناء الموافقة على الصرف', 'error');
      }
    } catch (error) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason) {
      showToast('يرجى كتابة سبب الرفض', 'error');
      return;
    }

    setProcessingId(rejectingClaimId);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`${API_BASE_URL}/claims/${rejectingClaimId}/reject-payment?user_id=${user.id || ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          notes: rejectReason
        })
      });

      if (response.ok) {
        showToast('تم رفض الملف وإعادته للشؤون الفنية', 'success');
        setRejectingClaimId(null);
        setRejectReason('');
        fetchClaims();
      } else {
        showToast('فشل إرسال طلب الرفض', 'error');
      }
    } catch (error) {
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handlePrintVoucher = (claim: any) => {
    const printWindow = window.open('', '', 'width=1000,height=850');
    if (!printWindow) return;

    const qrData = `وصل صرف تعويض حادث\nرقم المطالبة: ${claim.claim_number}\nالمستلم: ${claim.recipient_name}\nالقيمة الكلية: ${claim.total_paid} ${claim.currency}\nالتاريخ: ${new Date().toLocaleDateString('en-GB')}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>وصل صرف مالي - تعويض حادث</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          @media print { 
            @page { margin: 10mm; size: A4; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { 
            font-family: 'Cairo', sans-serif; 
            margin: 0; padding: 20px; color: #1e293b; background: #fff; line-height: 1.6;
          }
          .voucher-container {
            border: 3px double #014cb1; border-radius: 12px; padding: 30px; position: relative;
          }
          .header {
            display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #014cb1;
            padding-bottom: 15px; margin-bottom: 25px;
          }
          .header h1 { margin: 0; font-size: 22px; color: #014cb1; font-weight: 900; }
          .header p { margin: 5px 0 0 0; color: #64748b; font-size: 13px; font-weight: 700; }
          .logo { height: 80px; width: auto; }
          
          .content-box {
            background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 20px;
          }
          .row {
            display: flex; margin-bottom: 12px; border-bottom: 1px dashed #e2e8f0; padding-bottom: 8px;
          }
          .label { min-width: 150px; font-weight: bold; color: #1e3a8a; }
          .value { font-weight: 700; color: #0f172a; flex: 1; }
          .amount-highlight { font-size: 20px; color: #139625; font-weight: 950; }
          
          .footer-sigs {
            margin-top: 40px; display: flex; justify-content: space-between; padding: 0 20px;
          }
          .sig-box { text-align: center; width: 180px; }
          .sig-line { border-top: 1.5px solid #1e293b; margin-top: 30px; margin-bottom: 5px; }
          .sig-text { font-weight: 800; font-size: 13px; }
        </style>
      </head>
      <body onload="setTimeout(() => { window.print(); }, 500);">
        <div class="voucher-container">
          <div class="header">
            <div>
              <h1>شركة المدار الليبي للتأمين</h1>
              <p>قسم الشؤون المالية - إيصال صرف تعويضات</p>
            </div>
            <img src="/img/logo.png" class="logo" />
          </div>

          <div style="text-align: center; margin-bottom: 25px;">
            <span style="font-size: 18px; font-weight: 900; border: 1.5px solid #014cb1; padding: 6px 30px; border-radius: 20px; background: #f0f9ff; color: #014cb1;">وصل صرف تعويض حادث</span>
          </div>

          <div class="content-box">
            <div class="row">
              <div class="label">رقم المطالبة:</div>
              <div class="value">${claim.claim_number}</div>
              <div class="label">تاريخ الصرف:</div>
              <div class="value">${claim.finance_approved_at ? new Date(claim.finance_approved_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB')}</div>
            </div>
            <div class="row">
              <div class="label">اسم المستلم:</div>
              <div class="value">${claim.recipient_name}</div>
            </div>
            <div class="row">
              <div class="label">مبلغا وقدره:</div>
              <div class="value amount-highlight">${Number(claim.total_paid).toLocaleString('en-US')} ${claim.currency === 'USD' ? 'دولار أمريكي' : 'دينار ليبي'}</div>
            </div>
            <div class="row">
              <div class="label">طريقة السداد:</div>
              <div class="value">${claim.payment_method} ${claim.document_number ? `(رقم المستند: ${claim.document_number})` : ''}</div>
            </div>
            <div class="row">
              <div class="label">رقم وثيقة التأمين:</div>
              <div class="value">${claim.document?.insurance_number || claim.document_manual_data?.insurance_number || '—'}</div>
              <div class="label">المؤمن له:</div>
              <div class="value">${claim.document?.insured_name || claim.document_manual_data?.insured_name || '—'}</div>
            </div>
            <div class="row" style="border: none; padding: 0;">
              <div class="label">البيان / تفاصيل الحادث:</div>
              <div class="value">${claim.notes || 'تسوية وصرف تعويض الحوادث وقيد البند الفرعي بالتعويضات.'}</div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 30px;">
            <img src="${qrApiUrl}" style="height: 80px; width: 80px;" />
            <div style="font-size: 11px; color: #64748b; font-weight: bold;">
              نظام المدار للتأمين - قسم الحسابات والمالية الموحد
            </div>
          </div>

          <div class="footer-sigs">
            <div class="sig-box">
              <div class="sig-text">المستلم</div>
              <div class="sig-line"></div>
            </div>
            <div class="sig-box">
              <div class="sig-text">أمين الصندوق (الخزينة)</div>
              <div class="sig-line"></div>
            </div>
            <div class="sig-box">
              <div class="sig-text">مدير الشؤون المالية</div>
              <div class="sig-text" style="margin-top: 15px; font-weight: 900;">خالد محمود حمدان</div>
              <div class="sig-line" style="margin-top: 5px;"></div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintDisbursementsReport = () => {
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) return;

    const qrData = `تقرير تسديدات تعويضات الحوادث\nعدد المعاملات: ${filteredClaims.length}\nالتاريخ: ${new Date().toLocaleDateString('en-GB')}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}`;

    let totalVal = filteredClaims.reduce((sum, c) => sum + (Number(c.total_paid) || 0), 0);

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>تقرير تسديد تعويضات الحوادث</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          @media print { 
            @page { margin: 5mm; size: A4 landscape; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { font-family: 'Cairo', sans-serif; margin: 15px; direction: rtl; font-size: 10px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #014cb1; padding-bottom: 10px; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1.5px solid #000; padding: 8px; text-align: center; }
          th { background-color: #f1f5f9; font-weight: 900; }
          .total-row { font-weight: 900; background-color: #f8fafc; }
        </style>
      </head>
      <body onload="setTimeout(() => { window.print(); }, 500);">
        <div class="header">
          <div>
            <h2>شركة المدار الليبي للتأمين</h2>
            <h3>إدارة الشؤون المالية - كشف تسديدات تعويضات الحوادث</h3>
          </div>
          <img src="${qrApiUrl}" style="height: 60px; width: 60px;" />
          <img src="/img/logo.png" style="height: 60px;" />
        </div>

        <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 8px; border: 1px solid #000; margin-bottom: 10px; font-weight: bold;">
          <div>تاريخ استخراج الكشف: ${new Date().toLocaleString('en-GB')}</div>
          <div>عدد المعاملات المسددة: ${filteredClaims.length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>رقم المطالبة</th>
              <th>تاريخ المطالبة</th>
              <th>المستحق للمستلم</th>
              <th>طريقة السداد</th>
              <th>رقم المستند المالي</th>
              <th>قيمة التعويض</th>
              <th>المصاريف الإضافية</th>
              <th>إجمالي المسدد</th>
              <th>تاريخ الصرف</th>
            </tr>
          </thead>
          <tbody>
            ${filteredClaims.map((c, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${c.claim_number}</strong></td>
                <td>${c.claim_date}</td>
                <td>${c.recipient_name}</td>
                <td>${c.payment_method}</td>
                <td>${c.document_number || '—'}</td>
                <td>${Number(c.compensation_value).toLocaleString()} ${c.currency === 'USD' ? '$' : 'د.ل'}</td>
                <td>${Number(c.additional_expenses).toLocaleString()} د.ل</td>
                <td style="color: #166534; font-weight: bold;">${Number(c.total_paid).toLocaleString()} ${c.currency === 'USD' ? '$' : 'د.ل'}</td>
                <td>${c.finance_approved_at ? new Date(c.finance_approved_at).toLocaleDateString('en-GB') : '—'}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="8" style="text-align: center;">الإجمــــــــــــــــــــــــــــــــالي المــــــــــــــــــــــــــــــــالي المسدد</td>
              <td style="color: #166534; font-weight: bold;">${totalVal.toLocaleString()} د.ل</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-top: 40px; padding-left: 50px;">
          <div style="text-align: center;">
            <div style="font-weight: bold;">مدير الإدارة المالية</div>
            <div style="font-weight: 900; margin-top: 25px;">خالد محمود حمدان</div>
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportExcel = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const columns = [
        { header: 'رقم المطالبة', key: 'claim_number', width: 20 },
        { header: 'اسم المستلم', key: 'recipient_name', width: 35 },
        { header: 'طريقة السداد', key: 'payment_method', width: 25 },
        { header: 'رقم المستند', key: 'document_number', width: 20 },
        { header: 'قيمة التعويض', key: 'compensation_value', width: 15 },
        { header: 'مصاريف إضافية', key: 'additional_expenses', width: 15 },
        { header: 'إجمالي المسدد', key: 'total_paid', width: 15 },
        { header: 'تاريخ الصرف', key: 'approved_at', width: 20 },
      ];

      const data = filteredClaims.map((c) => ({
        claim_number: c.claim_number,
        recipient_name: c.recipient_name,
        payment_method: c.payment_method,
        document_number: c.document_number || '—',
        compensation_value: `${Number(c.compensation_value).toLocaleString('en-US')} د.ل`,
        additional_expenses: `${Number(c.additional_expenses).toLocaleString('en-US')} د.ل`,
        total_paid: `${Number(c.total_paid).toLocaleString('en-US')} د.ل`,
        approved_at: c.finance_approved_at ? new Date(c.finance_approved_at).toLocaleDateString('en-GB') : '—',
      }));

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - كشف تسديد تعويضات الحوادث (المالية)',
        subtitle: `عدد الحوالات: ${filteredClaims.length} - تاريخ الاستخراج: ${new Date().toLocaleDateString('en-GB')}`,
        columns,
        data,
        fileName: 'تقرير_تسديدات_التعويضات',
        qrData: `كشف تسديدات الحوادث\nإجمالي: ${filteredClaims.reduce((sum, c) => sum + (Number(c.total_paid) || 0), 0).toLocaleString('en-US')} د.ل\nبواسطة: ${currentUser.name || 'المالية'}`
      });

      showToast('تم تصدير كشف التسديدات بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير ملف إكسيل', 'error');
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb no-print" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px',
        background: 'var(--panel)', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
          <i className="fa-solid fa-receipt" style={{ marginLeft: '10px', color: '#139625' }}></i>
          قسم تسديد وصرف تعويضات الحوادث (المالية)
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'paid' && (
            <>
              <button onClick={handlePrintDisbursementsReport} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                <i className="fa-solid fa-print"></i> طباعة كشف التسديدات
              </button>
              <button onClick={handleExportExcel} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                <i className="fa-solid fa-file-excel"></i> تصدير إكسيل
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="no-print" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => { setActiveTab('pending'); }} style={{
          padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
          background: activeTab === 'pending' ? '#014cb1' : 'var(--panel)', color: activeTab === 'pending' ? '#fff' : 'var(--text)'
        }}>
          💡 تعويضات قيد الصرف ({claims.filter((c: any) => c.status === 'للتسديد - الشؤون المالية').length})
        </button>
        <button onClick={() => { setActiveTab('paid'); }} style={{
          padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer',
          background: activeTab === 'paid' ? '#139625' : 'var(--panel)', color: activeTab === 'paid' ? '#fff' : 'var(--text)'
        }}>
          ✅ كشف التسديدات المصروفة ({claims.filter((c: any) => c.status === 'مدفوع' && c.finance_status === 'approved').length})
        </button>
      </div>

      {/* Filter panel */}
      <div className="no-print" style={{ background: 'var(--panel)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>بحث برقم المطالبة / الاسم / الوثيقة</label>
            <input type="text" placeholder="ابحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="users-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</div>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>رقم المطالبة</th>
                  <th>مستحق الصرف للسيد</th>
                  <th>رقم الوثيقة</th>
                  <th>طريقة السداد</th>
                  <th>رقم المستند المالي</th>
                  <th>قيمة التعويض</th>
                  <th>المصاريف الإضافية</th>
                  <th>إجمالي الصرف</th>
                  <th>تاريخ الإرسال</th>
                  <th className="no-print">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '30px' }}>لا توجد ملفات تعويضات مطابقة حالياً.</td>
                  </tr>
                ) : (
                  filteredClaims.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.claim_number}</strong></td>
                      <td>{c.recipient_name}</td>
                      <td>{c.document?.insurance_number || c.document_manual_data?.insurance_number || '—'}</td>
                      <td>{c.payment_method}</td>
                      <td>{c.document_number || '—'}</td>
                      <td style={{ fontWeight: 'bold' }}>{c.compensation_value ? `${parseFloat(c.compensation_value).toLocaleString()} ${c.currency === 'USD' ? '$' : 'د.ل'}` : '—'}</td>
                      <td>{c.additional_expenses ? `${parseFloat(c.additional_expenses).toLocaleString()} د.ل` : '—'}</td>
                      <td style={{ fontWeight: 'bold', color: '#139625' }}>{c.total_paid ? `${parseFloat(c.total_paid).toLocaleString()} ${c.currency === 'USD' ? '$' : 'د.ل'}` : '—'}</td>
                      <td>{c.updated_at ? c.updated_at.split('T')[0] : '—'}</td>
                      <td className="no-print">
                        {activeTab === 'pending' ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleApprove(c.id)} disabled={processingId === c.id} style={{ background: '#139625', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                              {processingId === c.id ? 'جاري...' : '✅ قبول وصرف'}
                            </button>
                            <button onClick={() => setRejectingClaimId(c.id)} disabled={processingId === c.id} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                              ❌ رفض وإرجاع
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handlePrintVoucher(c)} style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                              🖨️ طباعة وصل الصرف
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Rejection Form */}
      {rejectingClaimId !== null && (
        <div className="modal no-print" onClick={(e) => e.target === e.currentTarget && setRejectingClaimId(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100 }}>
          <div className="modal-content" style={{ width: '450px', background: 'var(--card-bg)', borderRadius: '14px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 15px 0' }}>سبب رفض الصرف المالي وإعادة الملف</h3>
            <form onSubmit={handleRejectSubmit}>
              <textarea required rows={4} placeholder="اكتب سبب الرفض هنا ليظهر لمدير التعويضات..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', resize: 'none', marginBottom: '15px' }}></textarea>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => { setRejectingClaimId(null); setRejectReason(''); }} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>إلغاء</button>
                <button type="submit" style={{ padding: '8px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>إرجاع الملف 📤</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
