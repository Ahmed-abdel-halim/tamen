import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

interface ProfileUpdateRequest {
  id: number;
  user_id: number;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
  requested_changes: {
    name: string;
    personal_phone: string;
    profile_photo_path?: string;
    profile_photo_url?: string;
    passport_photo_path?: string;
    passport_photo_url?: string;
    identity_proof_path?: string;
    identity_proof_url?: string;
    national_id_photo_path?: string;
    national_id_photo_url?: string;
    contract_photo_path?: string;
    contract_photo_url?: string;
    clearance_certificate_path?: string;
    clearance_certificate_url?: string;
    non_bankruptcy_certificate_path?: string;
    non_bankruptcy_certificate_url?: string;
    experience_certificate_path?: string;
    experience_certificate_url?: string;
    non_employment_certificate_path?: string;
    non_employment_certificate_url?: string;
    tb_health_certificate_path?: string;
    tb_health_certificate_url?: string;
    academic_qualification_path?: string;
    academic_qualification_url?: string;
    activity_license_path?: string;
    activity_license_url?: string;
  };
  user: {
    id: number;
    name: string;
    personal_phone: string;
    profile_photo_url: string | null;
    passport_photo_url: string | null;
    identity_proof_url: string | null;
    national_id_photo_url: string | null;
    contract_photo_url: string | null;
    clearance_certificate_url: string | null;
    non_bankruptcy_certificate_url: string | null;
    experience_certificate_url: string | null;
    non_employment_certificate_url: string | null;
    tb_health_certificate_url: string | null;
    academic_qualification_url: string | null;
    activity_license_url: string | null;
    is_agent: boolean;
    agent_info: {
      id: number;
      agency_name: string;
      agent_name: string;
    } | null;
  };
}

export default function ProfileUpdateRequestsList() {
  const [requests, setRequests] = useState<ProfileUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<ProfileUpdateRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const typeFilter = params.get('type') || ''; // 'agent' or 'employee'

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_BASE_URL}/profile-update-requests?status=${statusFilter}`;
      if (typeFilter) {
        url += `&type=${typeFilter}`;
      }
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('فشل جلب طلبات التعديل');
      const data = await res.json();
      setRequests(data.data || []);
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء تحميل الطلبات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, location.search]);

  const handleAction = async (id: number, type: 'approve' | 'reject') => {
    if (type === 'reject' && !adminNotes.trim()) {
      showToast('يجب إدخال سبب الرفض في الملاحظات', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/profile-update-requests/${id}/${type}`;
      const body = type === 'reject' ? JSON.stringify({ admin_notes: adminNotes }) : undefined;
      
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.message || 'فشل تنفيذ الإجراء');
      }

      showToast(responseData.message || 'تم معالجة الطلب بنجاح', 'success');
      window.dispatchEvent(new CustomEvent('adminPendingCountsUpdated'));
      setSelectedRequest(null);
      setAdminNotes('');
      setActionType(null);
      fetchRequests();
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء معالجة الطلب', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComparisonValue = (current: string | null | undefined, proposed: string | undefined, label: string) => {
    const isChanged = proposed !== undefined && proposed !== current;
    return (
      <div className="comparison-row">
        <div className="comparison-label">{label}</div>
        <div className="comparison-value">{current || '—'}</div>
        {isChanged && (
          <div style={{ marginTop: 4 }}>
            <span className="comparison-value changed">{proposed}</span>
          </div>
        )}
      </div>
    );
  };

  const renderComparisonFile = (currentUrl: string | null | undefined, proposedUrl: string | undefined, label: string) => {
    const isChanged = proposedUrl !== undefined;
    const isCurrentPdf = currentUrl?.toLowerCase().endsWith('.pdf');
    const isProposedPdf = proposedUrl?.toLowerCase().endsWith('.pdf');

    return (
      <div className="comparison-row" style={{ marginTop: 15 }}>
        <div className="comparison-label">{label}</div>
        <div style={{ display: 'flex', gap: 15, flexWrap: 'wrap' }}>
          {/* Current File */}
          <div style={{ flex: 1, minWidth: '120px' }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>الملف الحالي:</div>
            {currentUrl ? (
              isCurrentPdf ? (
                <div className="profile-file-pdf-thumb">
                  <i className="fa fa-file-pdf-o" style={{ fontSize: 20 }}></i>
                  <span>PDF</span>
                  <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="profile-file-link" style={{ marginTop: 4 }}>عرض</a>
                </div>
              ) : (
                <div>
                  <img src={currentUrl} alt={label} className="profile-file-preview-thumb" />
                  <a href={currentUrl} target="_blank" rel="noopener noreferrer" className="profile-file-link" style={{ display: 'block', marginTop: 4 }}>تنزيل</a>
                </div>
              )
            ) : (
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>لا يوجد ملف حالي</span>
            )}
          </div>

          {/* Proposed File */}
          {isChanged && (
            <div style={{ flex: 1, minWidth: '120px' }}>
              <div style={{ fontSize: 11, color: '#10b981', marginBottom: 4, fontWeight: 700 }}>الملف المقترح:</div>
              {proposedUrl ? (
                isProposedPdf ? (
                  <div className="profile-file-pdf-thumb" style={{ border: '1px dashed #10b981' }}>
                    <i className="fa fa-file-pdf-o" style={{ fontSize: 20, color: '#10b981' }}></i>
                    <span style={{ color: '#10b981' }}>PDF</span>
                    <a href={proposedUrl} target="_blank" rel="noopener noreferrer" className="profile-file-link" style={{ marginTop: 4, color: '#10b981' }}>عرض</a>
                  </div>
                ) : (
                  <div>
                    <img src={proposedUrl} alt={label} className="profile-file-preview-thumb" style={{ border: '2px solid #10b981' }} />
                    <a href={proposedUrl} target="_blank" rel="noopener noreferrer" className="profile-file-link" style={{ display: 'block', marginTop: 4, color: '#10b981', fontWeight: 700 }}>تنزيل</a>
                  </div>
                )
              ) : (
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>لا يوجد ملف مرفق</span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const isAgentType = typeFilter === 'agent';
  const isEmployeeType = typeFilter === 'employee';

  const pageTitle = isAgentType 
    ? 'طلبات تعديل بيانات الوكلاء' 
    : isEmployeeType 
      ? 'طلبات تعديل بيانات الموظفين' 
      : 'طلبات تعديل الملفات والمستندات';

  const pageDesc = isAgentType
    ? 'مراجعة وتدقيق المستندات الشخصية وصور الجواز والبطاقات الوطنية للوكلاء'
    : isEmployeeType
      ? 'مراجعة وتدقيق المستندات الشخصية وصور الجواز والبطاقات الوطنية للموظفين'
      : 'مراجعة وتدقيق المستندات الشخصية وصور الجواز والبطاقات الوطنية للموظفين والوكلاء';

  const breadcrumbText = isAgentType
    ? 'الشؤون الإدارية / إدارة الفروع والوكلاء / طلبات تعديل البيانات'
    : isEmployeeType
      ? 'الشؤون الإدارية / إدارة الموظفين / طلبات تعديل البيانات'
      : 'الشؤون الإدارية / إدارة الموظفين والوكلاء / طلبات تعديل البيانات';

  return (
    <section className="users-management font-cairo">
      <div className="users-breadcrumb">
        <span>{breadcrumbText}</span>
      </div>

      <div className="users-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>{pageTitle}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 4 }}>{pageDesc}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="users-search-input"
              style={{ width: '180px', padding: '8px' }}
            >
              <option value="pending">طلبات معلقة فقط</option>
              <option value="all">جميع الطلبات</option>
            </select>
            <button onClick={fetchRequests} className="action-btn" title="تحديث">
              <i className="fa-solid fa-rotate"></i>
            </button>
          </div>
        </div>
      </div>

      <div className="users-card">
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>الاسم الحالي</th>
                <th>رقم الهاتف</th>
                <th>نوع الحساب</th>
                <th>تاريخ الطلب</th>
                <th>الحالة</th>
                <th>ملاحظات الإدارة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                    جاري التحميل...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>
                    لا توجد طلبات تعديل مطابقة للبحث
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id}>
                    <td style={{ fontWeight: 700 }}>
                      {req.user?.name || 'موظف محذوف'}
                      {req.user?.agent_info && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                          وكالة: {req.user.agent_info.agency_name}
                        </div>
                      )}
                    </td>
                    <td>{req.user?.personal_phone || '—'}</td>
                    <td>
                      <span className={`type-badge ${req.user?.is_agent ? 'agent' : 'user'}`}>
                        {req.user?.is_agent ? 'وكيل' : 'موظف'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>
                      {new Date(req.created_at).toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td>
                      <span className={`status-pill ${req.status}`}>
                        {req.status === 'approved' ? 'تم القبول' : req.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.85rem', maxWidth: '200px' }}>
                      {req.admin_notes || <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setAdminNotes(req.admin_notes || '');
                          setActionType(null);
                        }}
                        className="btn-outline-sm"
                        style={{ height: 'auto', padding: '6px 12px' }}
                      >
                        <i className="fa-solid fa-magnifying-glass" style={{ marginLeft: 6 }}></i>
                        تدقيق ومراجعة
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review comparison modal */}
      {selectedRequest && (
        <div className="admin-audit-modal">
          <div className="admin-audit-modal-content">
            <div className="admin-audit-modal-header">
              <h3 className="admin-audit-modal-title">
                تدقيق طلب تعديل بيانات: {selectedRequest.user?.name}
                <span className={`type-badge ${selectedRequest.user?.is_agent ? 'agent' : 'user'}`} style={{ marginRight: 10 }}>
                  {selectedRequest.user?.is_agent ? 'وكيل' : 'موظف'}
                </span>
              </h3>
              <button onClick={() => setSelectedRequest(null)} className="admin-audit-modal-close">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div className="admin-audit-modal-body">
              <div className="comparison-grid">
                {/* Left Column: Original / Current Data */}
                <div className="comparison-column original">
                  <div className="comparison-title">البيانات الحالية للطرف</div>
                  {renderComparisonValue(selectedRequest.user?.name, undefined, 'الاسم')}
                  {renderComparisonValue(selectedRequest.user?.personal_phone, undefined, 'رقم الهاتف')}
                  
                  {(selectedRequest.user?.profile_photo_url || selectedRequest.requested_changes.profile_photo_url) && 
                    renderComparisonFile(selectedRequest.user?.profile_photo_url, undefined, 'الصورة الشخصية')}
                    
                  {(selectedRequest.user?.passport_photo_url || selectedRequest.requested_changes.passport_photo_url) && 
                    renderComparisonFile(selectedRequest.user?.passport_photo_url, undefined, 'جواز السفر')}
                    
                  {(selectedRequest.user?.identity_proof_url || selectedRequest.requested_changes.identity_proof_url) && 
                    renderComparisonFile(selectedRequest.user?.identity_proof_url, undefined, 'إثبات الهوية')}
                    
                  {(selectedRequest.user?.national_id_photo_url || selectedRequest.requested_changes.national_id_photo_url) && 
                    renderComparisonFile(selectedRequest.user?.national_id_photo_url, undefined, 'صورة الرقم الوطني')}
                    
                  {(selectedRequest.user?.contract_photo_url || selectedRequest.requested_changes.contract_photo_url) && 
                    renderComparisonFile(selectedRequest.user?.contract_photo_url, undefined, 'صورة العقد')}
                    
                  {(selectedRequest.user?.clearance_certificate_url || selectedRequest.requested_changes.clearance_certificate_url) && 
                    renderComparisonFile(selectedRequest.user?.clearance_certificate_url, undefined, 'شهادة براءة الذمة')}
                    
                  {(selectedRequest.user?.experience_certificate_url || selectedRequest.requested_changes.experience_certificate_url) && 
                    renderComparisonFile(selectedRequest.user?.experience_certificate_url, undefined, 'شهادة الخبرة')}
                    
                  {(selectedRequest.user?.tb_health_certificate_url || selectedRequest.requested_changes.tb_health_certificate_url) && 
                    renderComparisonFile(selectedRequest.user?.tb_health_certificate_url, undefined, 'الشهادة الصحية')}
                    
                  {(selectedRequest.user?.academic_qualification_url || selectedRequest.requested_changes.academic_qualification_url) && 
                    renderComparisonFile(selectedRequest.user?.academic_qualification_url, undefined, 'المؤهل العلمي')}
                    
                  {(selectedRequest.user?.non_bankruptcy_certificate_url || selectedRequest.requested_changes.non_bankruptcy_certificate_url) && 
                    renderComparisonFile(selectedRequest.user?.non_bankruptcy_certificate_url, undefined, 'شهادة عدم الإفلاس')}
                    
                  {(selectedRequest.user?.non_employment_certificate_url || selectedRequest.requested_changes.non_employment_certificate_url) && 
                    renderComparisonFile(selectedRequest.user?.non_employment_certificate_url, undefined, 'شهادة عدم ارتباط بعمل')}
                    
                  {(selectedRequest.user?.activity_license_url || selectedRequest.requested_changes.activity_license_url) && 
                    renderComparisonFile(selectedRequest.user?.activity_license_url, undefined, 'رخصة المزاولة')}
                </div>

                {/* Right Column: Requested Changes */}
                <div className="comparison-column requested">
                  <div className="comparison-title" style={{ color: '#10b981' }}>البيانات والتعديلات المطلوبة</div>
                  {renderComparisonValue(selectedRequest.user?.name, selectedRequest.requested_changes.name, 'الاسم المقترح')}
                  {renderComparisonValue(selectedRequest.user?.personal_phone, selectedRequest.requested_changes.personal_phone, 'رقم الهاتف المقترح')}
                  
                  {(selectedRequest.user?.profile_photo_url || selectedRequest.requested_changes.profile_photo_url) && 
                    renderComparisonFile(selectedRequest.user?.profile_photo_url, selectedRequest.requested_changes.profile_photo_url, 'الصورة الشخصية المقترحة')}
                    
                  {(selectedRequest.user?.passport_photo_url || selectedRequest.requested_changes.passport_photo_url) && 
                    renderComparisonFile(selectedRequest.user?.passport_photo_url, selectedRequest.requested_changes.passport_photo_url, 'جواز السفر المقترح')}
                    
                  {(selectedRequest.user?.identity_proof_url || selectedRequest.requested_changes.identity_proof_url) && 
                    renderComparisonFile(selectedRequest.user?.identity_proof_url, selectedRequest.requested_changes.identity_proof_url, 'إثبات الهوية المقترح')}
                    
                  {(selectedRequest.user?.national_id_photo_url || selectedRequest.requested_changes.national_id_photo_url) && 
                    renderComparisonFile(selectedRequest.user?.national_id_photo_url, selectedRequest.requested_changes.national_id_photo_url, 'صورة الرقم الوطني المقترحة')}
                    
                  {(selectedRequest.user?.contract_photo_url || selectedRequest.requested_changes.contract_photo_url) && 
                    renderComparisonFile(selectedRequest.user?.contract_photo_url, selectedRequest.requested_changes.contract_photo_url, 'صورة العقد المقترحة')}
                    
                  {(selectedRequest.user?.clearance_certificate_url || selectedRequest.requested_changes.clearance_certificate_url) && 
                    renderComparisonFile(selectedRequest.user?.clearance_certificate_url, selectedRequest.requested_changes.clearance_certificate_url, 'شهادة براءة الذمة المقترحة')}
                    
                  {(selectedRequest.user?.experience_certificate_url || selectedRequest.requested_changes.experience_certificate_url) && 
                    renderComparisonFile(selectedRequest.user?.experience_certificate_url, selectedRequest.requested_changes.experience_certificate_url, 'شهادة الخبرة المقترحة')}
                    
                  {(selectedRequest.user?.tb_health_certificate_url || selectedRequest.requested_changes.tb_health_certificate_url) && 
                    renderComparisonFile(selectedRequest.user?.tb_health_certificate_url, selectedRequest.requested_changes.tb_health_certificate_url, 'الشهادة الصحية المقترحة')}
                    
                  {(selectedRequest.user?.academic_qualification_url || selectedRequest.requested_changes.academic_qualification_url) && 
                    renderComparisonFile(selectedRequest.user?.academic_qualification_url, selectedRequest.requested_changes.academic_qualification_url, 'المؤهل العلمي المقترح')}
                    
                  {(selectedRequest.user?.non_bankruptcy_certificate_url || selectedRequest.requested_changes.non_bankruptcy_certificate_url) && 
                    renderComparisonFile(selectedRequest.user?.non_bankruptcy_certificate_url, selectedRequest.requested_changes.non_bankruptcy_certificate_url, 'شهادة عدم الإفلاس المقترحة')}
                    
                  {(selectedRequest.user?.non_employment_certificate_url || selectedRequest.requested_changes.non_employment_certificate_url) && 
                    renderComparisonFile(selectedRequest.user?.non_employment_certificate_url, selectedRequest.requested_changes.non_employment_certificate_url, 'شهادة عدم ارتباط بعمل المقترحة')}
                    
                  {(selectedRequest.user?.activity_license_url || selectedRequest.requested_changes.activity_license_url) && 
                    renderComparisonFile(selectedRequest.user?.activity_license_url, selectedRequest.requested_changes.activity_license_url, 'رخصة المزاولة المقترحة')}
                </div>
              </div>

              {selectedRequest.status === 'pending' && (
                <div className="reject-reason-box">
                  <label style={{ fontWeight: 800 }}>ملاحظات الإدارة / أسباب الرفض (إجبارية عند الرفض)</label>
                  <textarea
                    className="reject-reason-textarea"
                    placeholder="أدخل أسباب رفض التعديل أو أي ملاحظات أخرى للموظف/الوكيل..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="admin-audit-modal-footer">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => setSelectedRequest(null)}
              >
                إغلاق النافذة
              </button>

              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    type="button"
                    className="btn-main"
                    style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }}
                    onClick={() => handleAction(selectedRequest.id, 'reject')}
                    disabled={submitting}
                  >
                    {submitting && actionType === 'reject' ? 'جاري الرفض...' : 'رفض التعديلات'}
                  </button>
                  <button
                    type="button"
                    className="btn-main"
                    style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                    onClick={() => handleAction(selectedRequest.id, 'approve')}
                    disabled={submitting}
                  >
                    {submitting && actionType === 'approve' ? 'جاري الموافقة...' : 'الموافقة واعتماد التعديلات'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
