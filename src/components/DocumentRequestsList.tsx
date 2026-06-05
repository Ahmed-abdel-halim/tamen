import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import SearchableSelect from "./SearchableSelect";

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
  branch_agent_id: number;
  user_id: number;
  request_type: 'modification' | 'cancellation';
  document_type?: string;
  document_number: string;
  subject: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  admin_message?: string;
  created_at: string;
  branch_agent?: {
    agency_name: string;
    agent_name: string;
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
    description: ''
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id;
      
      const res = await fetch(`${API_BASE_URL}/document-requests?user_id=${userId}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error("فشل جلب الطلبات");
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
      const user = JSON.parse(userStr);
      setIsAdmin(user.is_admin || false);

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
          'Accept': 'application/json',
          'X-User-Id': user?.id?.toString() || ''
        },
        body: JSON.stringify(newRequest),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "فشل تقديم الطلب");
      }
      
      showToast("تم تقديم طلب الوثيقة بنجاح", 'success');
      window.dispatchEvent(new CustomEvent('documentRequestsUpdated'));
      setShowRequestModal(false);
      setNewRequest({ request_type: 'modification', document_type: '', document_number: '', subject: '', description: '' });
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/document-requests/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ status, admin_message: adminMessage }),
      });

      if (!res.ok) throw new Error("فشل تحديث حالة الطلب");
      
      showToast("تم تحديث حالة الطلب بنجاح", 'success');
      window.dispatchEvent(new CustomEvent('documentRequestsUpdated'));
      setShowStatusModal(false);
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusName = (status: string) => {
    const statuses: any = {
      pending: 'في الانتظار',
      accepted: 'مقبول',
      rejected: 'مرفوض'
    };
    return statuses[status] || status;
  };

  const getTypeName = (type: string) => {
    return type === 'modification' ? 'تعديل وثيقة' : 'إلغاء وثيقة';
  };

  return (
    <section className="users-management font-cairo">
      <div className="users-breadcrumb">
        <span>الشؤون الإدارية / طلبات الوثائق</span>
      </div>

      <div className="users-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>سجل طلبات الوثائق</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>تعديل وإلغاء الوثائق الصادرة</p>
          </div>
          {!isAdmin && (
            <button onClick={() => setShowRequestModal(true)} className="btn-primary-sm" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                {isAdmin && <th>الوكيل</th>}
                <th>نوع الطلب</th>
                <th>رقم الوثيقة</th>
                <th>الموضوع</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>الرد</th>
                {isAdmin && <th>الإجراء</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isAdmin ? 8 : 6} style={{ textAlign: 'center', padding: '30px' }}>جاري التحميل...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={isAdmin ? 8 : 6} style={{ textAlign: 'center', padding: '30px' }}>لا توجد طلبات حالياً</td></tr>
              ) : requests.map((req) => (
                <tr key={req.id}>
                  {isAdmin && (
                    <td style={{ fontWeight: 700 }}>
                      {req.branch_agent?.agency_name}
                    </td>
                  )}
                  <td>
                    <span className={`type-badge ${req.request_type === 'modification' ? 'user' : 'admin'}`}>
                      {getTypeName(req.request_type)}
                    </span>
                    {req.document_type && (
                      <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--muted)' }}>
                        {req.document_type}
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{req.document_number}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{req.subject}</div>
                    <small style={{ color: 'var(--muted)' }}>{req.description}</small>
                  </td>
                  <td>{new Date(req.created_at).toLocaleDateString('ar-LY')}</td>
                  <td>
                    <span className={`status-pill ${req.status}`}>
                      {getStatusName(req.status)}
                    </span>
                  </td>
                  <td>{req.admin_message || <span style={{ color: '#ccc' }}>—</span>}</td>
                  {isAdmin && (
                    <td>
                      {req.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => { setSelectedRequest(req); setAdminMessage(''); setShowStatusModal(true); }}
                            className="action-btn" style={{ color: '#10b981' }} title="قبول"
                          >
                            <i className="fa-solid fa-check-double"></i>
                          </button>
                          <button 
                            onClick={() => { setSelectedRequest(req); setAdminMessage(''); setShowStatusModal(true); }}
                            className="action-btn" style={{ color: '#ef4444' }} title="رفض"
                          >
                            <i className="fa-solid fa-ban"></i>
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Request Modal */}
      {showRequestModal && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '800px' }}>
            <div className="modal-top">
              <h3>تقديم طلب وثيقة جديد</h3>
              <button onClick={() => setShowRequestModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <form onSubmit={handleSubmitRequest} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="input-group">
                  <label>نوع الطلب</label>
                  <select value={newRequest.request_type} onChange={(e) => setNewRequest({...newRequest, request_type: e.target.value as any})}>
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
                    onChange={(val) => setNewRequest({...newRequest, document_type: val})}
                  />
                </div>
                <div className="input-group">
                  <label>رقم الوثيقة</label>
                  <input 
                    type="text" 
                    required
                    placeholder="مثال: LBY0001" 
                    value={newRequest.document_number} 
                    onChange={(e) => setNewRequest({...newRequest, document_number: e.target.value})}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', fontWeight: '800' }}
                  />
                </div>
                <div className="input-group">
                  <label>الموضوع</label>
                  <input 
                    type="text" 
                    required
                    placeholder="عنوان مختصر للطلب..." 
                    value={newRequest.subject} 
                    onChange={(e) => setNewRequest({...newRequest, subject: e.target.value})}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', fontWeight: '700' }}
                  />
                </div>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>التفاصيل (الوصف)</label>
                  <textarea 
                    required
                    placeholder="اكتب تفاصيل التعديل أو سبب الإلغاء هنا..." 
                    value={newRequest.description} 
                    onChange={(e) => setNewRequest({...newRequest, description: e.target.value})}
                    style={{ minHeight: '120px' }}
                  ></textarea>
                </div>
              </div>
              <button type="submit" className="btn-submit-full" disabled={submitting} style={{ marginTop: '20px' }}>
                {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Status Modal */}
      {showStatusModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '450px' }}>
            <div className="modal-top">
              <h3>الرد على طلب الوثيقة</h3>
              <button onClick={() => setShowStatusModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="modal-form" style={{ padding: '20px' }}>
              <div className="input-group">
                <label style={{ marginBottom: '10px', display: 'block', fontWeight: 800 }}>رسالة الإدارة (اختياري)</label>
                <textarea 
                  placeholder="اكتب رسالة للوكيل توضح سبب القبول أو الرفض..." 
                  value={adminMessage} 
                  onChange={(e) => setAdminMessage(e.target.value)}
                  style={{ minHeight: '120px', width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'accepted')} 
                  className="btn-submit-full" 
                  style={{ flex: 1, background: '#10b981' }}
                  disabled={submitting}
                >
                  قبول الطلب
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')} 
                  className="btn-submit-full" 
                  style={{ flex: 1, background: '#ef4444' }}
                  disabled={submitting}
                >
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
