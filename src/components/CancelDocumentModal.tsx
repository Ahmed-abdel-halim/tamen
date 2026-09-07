import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

export interface CancelDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: number | string;
  documentNumber: string;
  insuredName: string;
  documentType: string;
  issueDate?: string;
  onSuccess?: (requestCode: string) => void;
}

const CANCELLATION_REASONS = [
  'خطأ في إدخال البيانات',
  'إصدار الوثيقة بالخطأ',
  'تكرار إصدار الوثيقة',
  'بيع المركبة / انتقال الملكية',
  'تغيير شركة التأمين',
  'عدم رغبة العميل في التأمين',
  'تعديل بيانات الوثيقة',
  'سبب آخر (مع كتابة السبب)',
];

export default function CancelDocumentModal({
  isOpen,
  onClose,
  documentId,
  documentNumber,
  insuredName,
  documentType,
  issueDate,
  onSuccess,
}: CancelDocumentModalProps) {
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [legalAcknowledged, setLegalAcknowledged] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Success state details
  const [requestCode, setRequestCode] = useState<string>('');
  const [submittedAt, setSubmittedAt] = useState<string>('');
  const [applicantName, setApplicantName] = useState<string>('');
  const [createdRequestId, setCreatedRequestId] = useState<number | null>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep('form');
      setSelectedReason('');
      setOtherReason('');
      setNotes('');
      setLegalAcknowledged(false);
      setSubmitting(false);
      setRequestCode('');
      setCreatedRequestId(null);

      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          setApplicantName(u.name || u.username || 'الموظف المسؤول');
        } catch {
          setApplicantName('الموظف المسؤول');
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenConfirm = () => {
    if (!selectedReason) {
      showToast('يرجى اختيار سبب الإلغاء', 'error');
      return;
    }
    if (selectedReason === 'سبب آخر (مع كتابة السبب)' && !otherReason.trim()) {
      showToast('يرجى كتابة سبب الإلغاء بالتفصيل', 'error');
      return;
    }
    if (!legalAcknowledged) {
      showToast('يجب الموافقة على الإقرار القانوني أولاً', 'error');
      return;
    }
    setStep('confirm');
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const payload = {
        request_type: 'cancellation',
        document_type: documentType,
        document_number: documentNumber,
        document_id: documentId,
        insured_name: insuredName,
        cancellation_reason: selectedReason,
        cancellation_reason_other: selectedReason === 'سبب آخر (مع كتابة السبب)' ? otherReason.trim() : null,
        notes: notes.trim() || null,
        legal_acknowledged: true,
        applicant_name: applicantName || user?.name || null,
        subject: `طلب إلغاء وثيقة (${documentNumber})`,
        description: `سبب الإلغاء: ${selectedReason}${otherReason ? ` - ${otherReason}` : ''}${notes ? ` | ملاحظات: ${notes}` : ''}`,
      };

      const res = await fetch(`${API_BASE_URL}/document-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-User-Id': user?.id?.toString() || '',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'فشل إرسال طلب الإلغاء');
      }

      const data = await res.json();
      const code = data.request_code || `AL-${String(data.id).padStart(6, '0')}`;
      setRequestCode(code);
      setCreatedRequestId(data.id);
      setSubmittedAt(new Date().toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' }));
      setStep('success');

      showToast('تم تقديم طلب الإلغاء بنجاح وسيتم إشعارك فور المراجعة', 'success');
      window.dispatchEvent(new CustomEvent('documentRequestsUpdated'));

      if (onSuccess) {
        onSuccess(code);
      }
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء تقديم طلب الإلغاء', 'error');
      setStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintNotice = () => {
    if (!createdRequestId) return;
    const printUrl = `${API_BASE_URL}/document-requests/${createdRequestId}/print-cancellation`;
    const win = window.open(printUrl, '_blank', 'width=900,height=800');
    if (!win) {
      showToast('يرجى السماح بالنوافذ المنبثقة للطباعة', 'error');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: "'Cairo', 'Tajawal', sans-serif",
        direction: 'rtl',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && step !== 'confirm' && !submitting) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: step === 'confirm' ? '520px' : '640px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          animation: 'modalFadeIn 0.2s ease-out',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: step === 'success' ? '#f0fdf4' : step === 'confirm' ? '#fffbeb' : '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor:
                  step === 'success' ? '#dcfce7' : step === 'confirm' ? '#fef3c7' : '#fee2e2',
                color:
                  step === 'success' ? '#16a34a' : step === 'confirm' ? '#d97706' : '#dc2626',
                fontSize: '1.2rem',
              }}
            >
              <i
                className={`fa-solid ${
                  step === 'success'
                    ? 'fa-circle-check'
                    : step === 'confirm'
                    ? 'fa-triangle-exclamation'
                    : 'fa-file-circle-xmark'
                }`}
              ></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>
                {step === 'success'
                  ? 'تم تقديم طلب الإلغاء'
                  : step === 'confirm'
                  ? 'تأكيد طلب إلغاء الوثيقة'
                  : 'إلغاء وثيقة التأمين'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                {step === 'success'
                  ? 'تم تسجيل طلب الإلغاء بنجاح وتوجيهه للإدارة'
                  : step === 'confirm'
                  ? 'يرجى مراجعة وتأكيد هذا الإجراء النهائي'
                  : 'تقديم طلب رسمي لإلغاء الوثيقة واعتمادها من الإدارة'}
              </p>
            </div>
          </div>
          {step !== 'confirm' && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                cursor: 'pointer',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f5f9';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#94a3b8';
              }}
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          )}
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '22px 24px', overflowY: 'auto', flex: 1 }}>
          {/* ──────────────── STEP 1: FORM ──────────────── */}
          {step === 'form' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Document Overview Card (Read Only) */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '12px',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>رقم الوثيقة</span>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626', direction: 'ltr', textAlign: 'right' }}>
                    {documentNumber}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>اسم المؤمن له</span>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>
                    {insuredName || 'غير محدد'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>نوع التأمين</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                    {documentType}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>تاريخ الإصدار</span>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>
                    {issueDate || 'مسجلة بالنظام'}
                  </div>
                </div>
              </div>

              {/* Cancellation Reason Dropdown (Mouse Select) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                  سبب الإلغاء <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedReason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: selectedReason ? '#0f172a' : '#94a3b8',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="" disabled>-- اضغط لاختيار سبب الإلغاء بالماوس --</option>
                    {CANCELLATION_REASONS.map((r, idx) => (
                      <option key={idx} value={r} style={{ color: '#0f172a', padding: '8px' }}>
                        {idx + 1}. {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quick Selection Pills (Mouse-Driven Convenience) */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {CANCELLATION_REASONS.slice(0, 4).map((r, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setSelectedReason(r)}
                      style={{
                        padding: '5px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        borderRadius: '20px',
                        border: selectedReason === r ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
                        backgroundColor: selectedReason === r ? '#fee2e2' : '#f8fafc',
                        color: selectedReason === r ? '#b91c1c' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Other reason input (if chosen) */}
              {selectedReason === 'سبب آخر (مع كتابة السبب)' && (
                <div style={{ animation: 'fadeIn 0.2s ease-in' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    اكتب سبب الإلغاء بدقة <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    placeholder="يرجى كتابة سبب الإلغاء بالتفصيل..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '0.88rem',
                      borderRadius: '10px',
                      border: '1.5px solid #f87171',
                      outline: 'none',
                      backgroundColor: '#fff',
                      resize: 'none',
                    }}
                  />
                </div>
              )}

              {/* Optional Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  ملاحظات إضافية (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات تود إضافتها لإدارة التأمين..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '0.88rem',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    outline: 'none',
                    backgroundColor: '#fff',
                    resize: 'none',
                  }}
                />
              </div>

              {/* Warning & Legal Disclaimer Box */}
              <div
                style={{
                  backgroundColor: '#fefce8',
                  border: '1.5px solid #facc15',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ color: '#ca8a04', fontSize: '1.2rem', marginTop: '2px' }}>
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#854d0e', fontSize: '0.88rem', marginBottom: '4px' }}>
                    تحذير وإخلاء مسؤولية قانونية:
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#713f12', lineHeight: '1.5', textAlign: 'justify' }}>
                    بعد اعتماد الإلغاء سيتم إيقاف الوثيقة نهائياً ولن تغطي أي حوادث أو مطالبات، ويتحمل الوكيل كامل المسؤولية القانونية والمالية في حال تسليم الوثيقة للعميل قبل الإلغاء أو عدم استرداد أصل الوثيقة.
                  </div>
                </div>
              </div>

              {/* Mandatory Checkbox */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: legalAcknowledged ? '#eff6ff' : '#f8fafc',
                  border: legalAcknowledged ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={legalAcknowledged}
                  onChange={(e) => setLegalAcknowledged(e.target.checked)}
                  style={{
                    width: '19px',
                    height: '19px',
                    accentColor: '#1d4ed8',
                    cursor: 'pointer',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    color: legalAcknowledged ? '#1e3a8a' : '#334155',
                  }}
                >
                  أقر بأنني تأكدت من صحة البيانات وأتحمل كامل المسؤولية عن طلب الإلغاء.
                </span>
              </label>
            </div>
          )}

          {/* ──────────────── STEP 2: CONFIRM ──────────────── */}
          {step === 'confirm' && (
            <div style={{ textAlign: 'center', padding: '10px 8px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 0 8px #fef2f2',
                }}
              >
                <i className="fa-solid fa-question"></i>
              </div>

              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                هل أنت متأكد من رغبتك في إلغاء هذه الوثيقة؟
              </h4>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '20px', maxWidth: '420px', margin: '0 auto 20px' }}>
                سيتم إرسال الطلب فوراً إلى إدارة العمليات للاعتماد، وبمجرد الاعتماد تصبح الوثيقة لاغية رسمياً ولا تغطي أي حادث.
              </p>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  textAlign: 'right',
                  marginBottom: '20px',
                  fontSize: '0.88rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>رقم الوثيقة:</span>
                  <span style={{ fontWeight: 800, color: '#dc2626', direction: 'ltr' }}>{documentNumber}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>المؤمن له:</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{insuredName || '-'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>السبب:</span>
                  <span style={{ fontWeight: 700, color: '#334155' }}>
                    {selectedReason === 'سبب آخر (مع كتابة السبب)' ? otherReason : selectedReason}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {submitting ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> جارٍ إرسال الطلب...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i> تأكيد الإلغاء
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('form')}
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  لا، تراجع
                </button>
              </div>
            </div>
          )}

          {/* ──────────────── STEP 3: SUCCESS ──────────────── */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '12px 8px' }}>
              <div
                style={{
                  width: '70px',
                  height: '70px',
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                  margin: '0 auto 16px',
                  boxShadow: '0 0 0 8px #f0fdf4',
                }}
              >
                <i className="fa-solid fa-check"></i>
              </div>

              <h4 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#15803d', marginBottom: '6px' }}>
                تم تقديم طلب إلغاء الوثيقة بنجاح
              </h4>
              <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '22px' }}>
                تم إرسال الطلب إلى إدارة التأمين والعمليات، وستصلك إشعار بالنتيجة فور اعتمادها.
              </p>

              {/* Summary Card with Request Code */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '18px',
                  textAlign: 'right',
                  marginBottom: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>رقم طلب الإلغاء:</span>
                  <span
                    style={{
                      backgroundColor: '#eff6ff',
                      color: '#1e40af',
                      border: '1px solid #bfdbfe',
                      padding: '4px 14px',
                      borderRadius: '8px',
                      fontWeight: 900,
                      fontSize: '1.1rem',
                      direction: 'ltr',
                      display: 'inline-block',
                      letterSpacing: '1px',
                    }}
                  >
                    {requestCode}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>رقم الوثيقة:</span>
                  <span style={{ fontWeight: 800, color: '#dc2626', direction: 'ltr' }}>{documentNumber}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>تاريخ ووقت التقديم:</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{submittedAt}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>الموظف / مقدم الطلب:</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>{applicantName}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>حالة الطلب:</span>
                  <span
                    style={{
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    قيد مراجعة الإدارة
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handlePrintNotice}
                  style={{
                    flex: 1,
                    padding: '13px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#0f766e',
                    color: '#ffffff',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 6px rgba(15, 118, 110, 0.25)',
                  }}
                >
                  <i className="fa-solid fa-print"></i> طباعة إشعار الإلغاء
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '13px 20px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  العودة للوثائق
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER (ONLY IN FORM STEP) */}
        {step === 'form' && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              backgroundColor: '#f8fafc',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              تراجع
            </button>
            <button
              type="button"
              onClick={handleOpenConfirm}
              disabled={!selectedReason || !legalAcknowledged}
              style={{
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: !selectedReason || !legalAcknowledged ? '#f87171' : '#dc2626',
                opacity: !selectedReason || !legalAcknowledged ? 0.65 : 1,
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 800,
                cursor: !selectedReason || !legalAcknowledged ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)',
              }}
            >
              <i className="fa-solid fa-ban"></i> إلغاء الوثيقة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}