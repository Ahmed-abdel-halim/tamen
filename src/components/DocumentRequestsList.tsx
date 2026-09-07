import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import SearchableSelect from './SearchableSelect';

const documentTypeOptions = [
  { value: 'تأمين سيارات', label: 'تأمين سيارات' },
  { value: 'تأمين سيارات دولي', label: 'تأمين سيارات دولي' },
  { value: 'تأمين طبي (مسافرين)', label: 'تأمين طبي (مسافرين)' },
  { value: 'تأمين طبي (وافدين)', label: 'تأمين طبي (وافدين)' },
  { value: 'تأمين هياكل بحرية', label: 'تأمين هياكل بحرية' },
  { value: 'تأمين مسؤولية مهنية', label: 'تأمين مسؤولية مهنية' },
  { value: 'تأمين حوادث شخصية', label: 'تأمين حوادث شخصية' },
  { value: 'تأمين نقل نقدية', label: 'تأمين نقل نقدية' },
  { value: 'تأمين نقل بضائع', label: 'تأمين نقل بضائع' },
  { value: 'تأمين حماية طلاب مدارس', label: 'تأمين حماية طلاب مدارس' },
  { value: 'تأمين أخطار هندسية', label: 'تأمين أخطار هندسية' },
  { value: 'تأمين خيانة أمانة', label: 'تأمين خيانة أمانة' },
  { value: 'تأمين سطو', label: 'تأمين سطو' },
  { value: 'تأمين حريق', label: 'تأمين حريق' },
  { value: 'أخرى', label: 'أخرى' },
];

type DocumentRequest = {
  id: number;
  request_code?: string;
  branch_agent_id: number;
  user_id: number;
  request_type: 'modification' | 'cancellation';
  document_type?: string;
  document_number: string;
  document_id?: number | string;
  insured_name?: string;
  cancellation_reason?: string;
  cancellation_reason_other?: string;
  notes?: string;
  legal_acknowledged?: boolean;
  applicant_name?: string;
  subject: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  admin_message?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  reviewer?: {
    id: number;
    name: string;
  };
  created_at: string;
  branch_agent?: {
    id?: number;
    agency_name: string;
    agent_name: string;
    agency_number?: string;
    code?: string;
  };
  user?: {
    id: number;
    name: string;
    username?: string;
  };
};

export default function DocumentRequestsList() {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [newRequest, setNewRequest] = useState({
    request_type: 'modification',
    document_type: '',
    document_number: '',
    subject: '',
    description: '',
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id;

      const res = await fetch(`${API_BASE_URL}/document-requests?user_id=${userId}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('فشل جلب الطلبات');
      const data = await res.json();
      setRequests(data);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.is_admin || false);
      } catch {
        setIsAdmin(false);
      }
    }
    fetchRequests();
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const res = await fetch(`${API_BASE_URL}/document-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-User-Id': user?.id?.toString() || '',
        },
        body: JSON.stringify({
          ...newRequest,
          applicant_name: user?.name || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || 'فشل تقديم الطلب');
      }

      showToast('تم تقديم طلب الوثيقة بنجاح', 'success');
      window.dispatchEvent(new CustomEvent('documentRequestsUpdated'));
      setShowRequestModal(false);
      setNewRequest({
        request_type: 'modification',
        document_type: '',
        document_number: '',
        subject: '',
        description: '',
      });
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: 'accepted' | 'rejected') => {
    setSubmitting(true);
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const res = await fetch(`${API_BASE_URL}/document-requests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-User-Id': user?.id?.toString() || '',
        },
        body: JSON.stringify({ status, admin_message: adminMessage }),
      });

      if (!res.ok) throw new Error('فشل تحديث حالة الطلب');

      const actionText = status === 'accepted' ? 'تم قبول واعتماد الطلب' : 'تم رفض الطلب';
      showToast(`${actionText} وتم إرسال الإشعار للوكيل بنجاح`, 'success');

      window.dispatchEvent(new CustomEvent('documentRequestsUpdated'));
      setShowStatusModal(false);
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintNotice = (reqId: number) => {
    const printUrl = `${API_BASE_URL}/document-requests/${reqId}/print-cancellation`;
    window.open(printUrl, '_blank', 'width=900,height=800');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'accepted') {
      return (
        <span
          style={{
            backgroundColor: '#dcfce7',
            color: '#15803d',
            border: '1px solid #bbf7d0',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <i className="fa-solid fa-check"></i> مقبول
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span
          style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <i className="fa-solid fa-xmark"></i> مرفوض
        </span>
      );
    }
    return (
      <span
        style={{
          backgroundColor: '#fef3c7',
          color: '#b45309',
          border: '1px solid #fde68a',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '0.8rem',
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <i className="fa-solid fa-clock"></i> في الانتظار
      </span>
    );
  };

  const getTypeName = (type: string) => {
    return type === 'modification' ? 'تعديل وثيقة' : 'إلغاء وثيقة';
  };

  return (
    <section className="users-management font-cairo" style={{ direction: 'rtl' }}>
      <div className="users-breadcrumb">
        <span>الشؤون الإدارية / طلبات الوثائق</span>
      </div>

      <div className="users-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#1e293b' }}>
              سجل طلبات الوثائق وإلغاء الإصدار
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginTop: '2px' }}>
              متابعة طلبات التعديل والإلغاء المعتمدة مع إخلاء المسؤولية القانونية
            </p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="btn-primary-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fa-solid fa-plus"></i> تقديم طلب جديد
            </button>
          )}
        </div>
      </div>

      <div className="users-card">
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>كود الطلب</th>
                {isAdmin && <th>الوكالة / مقدم الطلب</th>}
                <th>نوع الطلب</th>
                <th>بيانات الوثيقة</th>
                <th>السبب والتفاصيل</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>الرد / الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '30px' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '8px' }}></i> جاري التحميل...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                    لا توجد طلبات مسجلة حالياً
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    {/* Request Code */}
                    <td>
                      <span
                        style={{
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          direction: 'ltr',
                          display: 'inline-block',
                        }}
                      >
                        {req.request_code || `AL-${String(req.id).padStart(6, '0')}`}
                      </span>
                    </td>

                    {/* Agent & Applicant Name (Admin view) */}
                    {isAdmin && (
                      <td>
                        <div style={{ fontWeight: 800, color: '#1e293b' }}>
                          {req.branch_agent?.agency_name || 'الفرع الرئيسي'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                          {req.applicant_name ? (
                            <span>
                              <i className="fa-solid fa-user" style={{ marginLeft: '4px' }}></i>
                              {req.applicant_name}
                            </span>
                          ) : (
                            req.user?.name || '-'
                          )}
                        </div>
                      </td>
                    )}

                    {/* Request Type Badge */}
                    <td>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          backgroundColor: req.request_type === 'cancellation' ? '#fee2e2' : '#e0e7ff',
                          color: req.request_type === 'cancellation' ? '#b91c1c' : '#3730a3',
                          border: `1px solid ${req.request_type === 'cancellation' ? '#fecaca' : '#c7d2fe'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i
                          className={`fa-solid ${req.request_type === 'cancellation' ? 'fa-ban' : 'fa-pen-to-square'}`}
                        ></i>
                        {getTypeName(req.request_type)}
                      </span>
                      {req.document_type && (
                        <div style={{ marginTop: '4px', fontSize: '0.78rem', color: '#64748b' }}>
                          {req.document_type}
                        </div>
                      )}
                    </td>

                    {/* Document Info */}
                    <td>
                      <div style={{ fontWeight: 800, color: '#dc2626', direction: 'ltr', textAlign: 'right' }}>
                        {req.document_number}
                      </div>
                      {req.insured_name && (
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                          {req.insured_name}
                        </div>
                      )}
                    </td>

                    {/* Subject & Reasons */}
                    <td>
                      {req.request_type === 'cancellation' && req.cancellation_reason ? (
                        <div>
                          <div style={{ fontWeight: 800, color: '#b91c1c', fontSize: '0.85rem' }}>
                            {req.cancellation_reason}
                          </div>
                          {req.cancellation_reason_other && (
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              تفاصيل: {req.cancellation_reason_other}
                            </div>
                          )}
                          {req.notes && (
                            <small style={{ color: '#475569', display: 'block', marginTop: '2px' }}>
                              ملاحظة: {req.notes}
                            </small>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 700, color: '#1e293b' }}>{req.subject}</div>
                          <small style={{ color: '#64748b' }}>{req.description}</small>
                        </div>
                      )}
                    </td>

                    {/* Date */}
                    <td style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                      {new Date(req.created_at).toLocaleDateString('ar-LY')}
                    </td>

                    {/* Status */}
                    <td>{getStatusBadge(req.status)}</td>

                    {/* Actions & Print */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Print Notice for Cancellation Requests */}
                        {req.request_type === 'cancellation' && (
                          <button
                            type="button"
                            onClick={() => handlePrintNotice(req.id)}
                            style={{
                              background: '#0f766e',
                              color: '#fff',
                              border: 'none',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="طباعة إشعار الإلغاء الرسمي"
                          >
                            <i className="fa-solid fa-print"></i> إشعار الإلغاء
                          </button>
                        )}

                        {/* Admin Action Buttons */}
                        {isAdmin && req.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRequest(req);
                                setAdminMessage('');
                                setShowStatusModal(true);
                              }}
                              style={{
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="البت في الطلب (قبول أو رفض)"
                            >
                              <i className="fa-solid fa-gavel"></i> اتخاذ قرار
                            </button>
                          </>
                        )}

                        {/* Admin Message Display if rejected or accepted */}
                        {req.admin_message && (
                          <span
                            title={req.admin_message}
                            style={{
                              fontSize: '0.75rem',
                              color: '#475569',
                              backgroundColor: '#f1f5f9',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              maxWidth: '120px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'inline-block',
                            }}
                          >
                            ملاحظة: {req.admin_message}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW REQUEST MODAL (FOR GENERAL MODIFICATION) */}
      {showRequestModal && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '750px' }}>
            <div className="modal-top">
              <h3>تقديم طلب وثيقة جديد</h3>
              <button onClick={() => setShowRequestModal(false)} className="close-btn">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmitRequest} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>نوع الطلب</label>
                  <select
                    value={newRequest.request_type}
                    onChange={(e) => setNewRequest({ ...newRequest, request_type: e.target.value as any })}
                  >
                    <option value="modification">تعديل وثيقة</option>
                    <option value="cancellation">إلغاء وثيقة</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>نوع الوثيقة</label>
                  <SearchableSelect
                    options={documentTypeOptions}
                    placeholder="ابحث واختر نوع الوثيقة..."
                    value={newRequest.document_type}
                    onChange={(val) => setNewRequest({ ...newRequest, document_type: val })}
                  />
                </div>
                <div className="input-group">
                  <label>رقم الوثيقة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: LBY0001"
                    value={newRequest.document_number}
                    onChange={(e) => setNewRequest({ ...newRequest, document_number: e.target.value })}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px',
                      fontWeight: '800',
                    }}
                  />
                </div>
                <div className="input-group">
                  <label>الموضوع</label>
                  <input
                    type="text"
                    required
                    placeholder="عنوان مختصر للطلب..."
                    value={newRequest.subject}
                    onChange={(e) => setNewRequest({ ...newRequest, subject: e.target.value })}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px',
                      fontWeight: '700',
                    }}
                  />
                </div>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>التفاصيل (الوصف)</label>
                  <textarea
                    required
                    placeholder="اكتب تفاصيل التعديل أو سبب الإلغاء هنا..."
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    style={{ minHeight: '100px' }}
                  ></textarea>
                </div>
              </div>
              <button
                type="submit"
                className="btn-submit-full"
                disabled={submitting}
                style={{ marginTop: '16px' }}
              >
                {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN STATUS REVIEW MODAL */}
      {showStatusModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '520px' }}>
            <div className="modal-top">
              <h3>البت في طلب الوثيقة</h3>
              <button onClick={() => setShowStatusModal(false)} className="close-btn">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* Request Summary Card */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  fontSize: '0.88rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>كود الطلب:</span>
                  <span style={{ fontWeight: 800, color: '#1d4ed8', direction: 'ltr' }}>
                    {selectedRequest.request_code || `AL-${String(selectedRequest.id).padStart(6, '0')}`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>رقم الوثيقة:</span>
                  <span style={{ fontWeight: 800, color: '#dc2626', direction: 'ltr' }}>
                    {selectedRequest.document_number}
                  </span>
                </div>
                {selectedRequest.insured_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>المؤمن له:</span>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{selectedRequest.insured_name}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>الوكيل / مقدم الطلب:</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>
                    {selectedRequest.applicant_name || selectedRequest.branch_agent?.agency_name || '-'}
                  </span>
                </div>
                {selectedRequest.cancellation_reason && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>سبب الإلغاء:</span>
                    <span style={{ fontWeight: 800, color: '#b91c1c' }}>
                      {selectedRequest.cancellation_reason}
                    </span>
                  </div>
                )}
                {selectedRequest.legal_acknowledged && (
                  <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '4px', fontWeight: 700 }}>
                    <i className="fa-solid fa-circle-check" style={{ marginLeft: '4px' }}></i>
                    الوكيل أقر بتحمل المسؤولية القانونية والمالية كاملة.
                  </div>
                )}
              </div>

              {/* Admin Note / Rejection Reason Input */}
              <div className="input-group">
                <label style={{ marginBottom: '8px', display: 'block', fontWeight: 800, fontSize: '0.88rem' }}>
                  ملاحظة الإدارة أو سبب الرفض (سيصل كإشعار للوكيل):
                </label>
                <textarea
                  placeholder="في حال الرفض، يرجى كتابة السبب هنا لإشعار الوكيل به..."
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  style={{
                    minHeight: '100px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                ></textarea>
              </div>

              {/* Warning Notice for Acceptance */}
              {selectedRequest.request_type === 'cancellation' && (
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginTop: '12px',
                    fontSize: '0.8rem',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>عند قبول الطلب سيتم إيقاف الوثيقة فوراً في النظام واعتبارها ملغية رسمياً.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'accepted')}
                  className="btn-submit-full"
                  style={{
                    flex: 1,
                    background: '#10b981',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-check"></i>
                  )}
                  قبول واعتماد الإلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                  className="btn-submit-full"
                  style={{
                    flex: 1,
                    background: '#ef4444',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-ban"></i>
                  )}
                  رفض الطلب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}