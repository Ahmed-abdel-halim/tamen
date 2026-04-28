import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL, BACKEND_URL } from "../config/api";
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

type BranchAgent = {
  id: number;
  type: 'وكيل' | 'فرع من شركة';
  code: string;
  agency_name: string;
  agent_name: string;
  activity?: string;
  agency_number?: string;
  stamp_number?: string;
  contract_date: string;
  contract_end_date?: string;
  contract_duration?: string;
  city: string;
  address?: string;
  phone?: string;
  nationality?: string;
  national_id?: string;
  identity_number?: string;
  consumed_custodies?: Array<{ description: string; quantity: number }>;
  fixed_custodies?: Array<{ description: string; quantity: number }>;
  personal_photo?: string;
  identity_photo?: string;
  contract_photo?: string;
  user?: { id: number; username: string; name: string };
  notes?: string;
  contract_conditions?: string;
  status: 'نشط' | 'غير نشط';
  created_at: string;
  updated_at: string;
};

type AgentRequest = {
  id: number;
  type: 'stock' | 'support' | 'financial' | 'commission' | 'maintenance' | 'marketing' | 'training' | 'legal' | 'limit_increase' | 'other';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  priority: 'normal' | 'urgent';
  subject: string;
  message: string;
  created_at: string;
  admin_notes?: string;
};

type DocumentRequest = {
  id: number;
  request_type: 'modification' | 'cancellation';
  document_type?: string;
  document_number: string;
  subject: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  admin_message?: string;
  created_at: string;
};

export default function BranchAgentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [branchAgent, setBranchAgent] = useState<BranchAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'agency' | 'contact' | 'custody' | 'permissions' | 'requests' | 'doc_requests'>(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('tab') as any) || 'agency';
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab as any);
    }
  }, [location.search]);
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    type: 'stock' as any,
    priority: 'normal' as any,
    subject: '',
    message: '',
  });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{id: number, status: string} | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [showDocStatusModal, setShowDocStatusModal] = useState(false);
  const [selectedDocRequest, setSelectedDocRequest] = useState<DocumentRequest | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [showNewDocRequestModal, setShowNewDocRequestModal] = useState(false);
  const [newDocRequest, setNewDocRequest] = useState({
    request_type: 'modification',
    document_type: '',
    document_number: '',
    subject: '',
    description: ''
  });

  useEffect(() => {
    if (id) {
      fetchBranchAgent(parseInt(id));
      fetchRequests();
      fetchDocRequests();
    }
  }, [id]);

  const fetchBranchAgent = async (branchAgentId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/branches-agents/${branchAgentId}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error("فشل جلب بيانات الوكيل");
      const data = await res.json();
      setBranchAgent(data);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-requests?branch_agent_id=${id}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {}
  };

  const fetchDocRequests = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/document-requests?branch_agent_id=${id}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setDocRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {}
  };

  const handleUpdateDocStatus = async (status: string) => {
    if (!selectedDocRequest) return;
    setSubmittingStatus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/document-requests/${selectedDocRequest.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ status, admin_message: adminMessage }),
      });
      
      if (!res.ok) throw new Error("فشل تحديث حالة الطلب");
      
      showToast("تم تحديث حالة طلب الوثيقة", 'success');
      setShowDocStatusModal(false);
      fetchDocRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-requests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ...newRequest, branch_agent_id: id }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "فشل تقديم الطلب");
      }
      
      showToast("تم تقديم الطلب بنجاح", 'success');
      setShowRequestModal(false);
      setNewRequest({ type: 'stock', priority: 'normal', subject: '', message: '' });
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCreateDocRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
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
        body: JSON.stringify({ ...newDocRequest, branch_agent_id: id, user_id: user?.id }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "فشل تقديم الطلب");
      }
      
      showToast("تم تقديم الطلب بنجاح", 'success');
      setShowNewDocRequestModal(false);
      setNewDocRequest({ request_type: 'modification', document_type: '', document_number: '', subject: '', description: '' });
      fetchDocRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const openStatusModal = (requestId: number, newStatus: string) => {
    setSelectedRequest({ id: requestId, status: newStatus });
    setAdminNotes('');
    setShowStatusModal(true);
  };

  const handleUpdateRequestStatus = async () => {
    if (!selectedRequest) return;
    setSubmittingStatus(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: selectedRequest.status, admin_notes: adminNotes }),
      });
      
      if (!res.ok) throw new Error("فشل تحديث حالة الطلب");
      
      showToast("تم تحديث حالة الطلب", 'success');
      setShowStatusModal(false);
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handlePrint = () => {
    if (!id) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.src = `${API_BASE_URL}/branches-agents/${id}/print?t=${new Date().getTime()}`;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        setTimeout(() => document.body.removeChild(iframe), 300);
      }, 100);
    };
  };

  const loggedInUserStr = localStorage.getItem('user');
  let isAdmin = false;
  try {
    if (loggedInUserStr) isAdmin = JSON.parse(loggedInUserStr).is_admin;
  } catch {}

  if (loading) return <div className="loading-container font-cairo">جارِ التحميل...</div>;
  if (!branchAgent) return <div className="error-container font-cairo">الوكيل غير موجود.</div>;

  const getRequestTypeName = (type: string) => {
    const types: any = {
      stock: 'طلب عهدة/مستندات',
      support: 'دعم فني',
      financial: 'تسوية مالية',
      commission: 'طلب عمولة',
      maintenance: 'طلب صيانة',
      marketing: 'دعاية وإعلان',
      training: 'تدريب',
      legal: 'استشارة قانونية',
      limit_increase: 'زيادة سقف الإصدار',
      other: 'أخرى'
    };
    return types[type] || type;
  };

  const getStatusName = (status: string) => {
    const statuses: any = {
      pending: 'قيد الانتظار',
      processing: 'جاري المعالجة',
      completed: 'تم التنفيذ',
      rejected: 'مرفوض'
    };
    return statuses[status] || status;
  };

  return (
    <div className="profile-container font-cairo">
      {/* Header Card */}
      <div className="profile-header-card">
        <div className="header-content">
          <div className="profile-avatar-large">
            {branchAgent.personal_photo ? (
              <img src={`${BACKEND_URL}/storage/${branchAgent.personal_photo}`} alt="Profile" />
            ) : (
              <div className="avatar-placeholder">
                <i className="fa-solid fa-building"></i>
              </div>
            )}
          </div>
          <div className="header-info-main">
            <h1 className="profile-name-title">{branchAgent.agency_name}</h1>
            <p className="profile-job-subtitle">{branchAgent.agent_name} - {branchAgent.type}</p>
            <div className="profile-badges-row">
              <span className="profile-badge">
                <i className="fa-solid fa-hashtag"></i>
                كود: {branchAgent.code}
              </span>
              <span className="profile-badge">
                <i className="fa-solid fa-map-marker-alt"></i>
                {branchAgent.city}
              </span>
              <span className="profile-badge">
                <i className="fa-solid fa-calendar-alt"></i>
                تعاقد: {new Date(branchAgent.contract_date).toLocaleDateString('ar-LY')}
              </span>
              <span className={`profile-badge ${branchAgent.status === 'نشط' ? 'status-active' : 'status-inactive'}`}>
                <i className={`fa-solid ${branchAgent.status === 'نشط' ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                {branchAgent.status}
              </span>
            </div>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
            {isAdmin && <button onClick={() => navigate('/branches-agents')} className="btn-outline-sm">العودة للقائمة</button>}
            {isAdmin && (
              <button className="btn-primary-sm" onClick={() => navigate(`/branches-agents/${branchAgent.id}/edit`)} style={{ background: 'var(--sidebar)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-pencil"></i> تعديل البيانات
              </button>
            )}
            <button className="btn-primary-sm" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-print"></i> طباعة العقد
            </button>
          </div>
        </div>
      </div>

      <div className="profile-main-layout">
        <aside className="profile-sidebar">
          <nav className="tab-navigation">
            {[
              { id: 'agency', label: 'بيانات الوكالة', icon: 'fa-building' },
              { id: 'contact', label: 'الاتصال والهوية', icon: 'fa-address-card' },
              { id: 'custody', label: 'العهدة والعهد', icon: 'fa-boxes-stacked' },
              { id: 'permissions', label: 'الصلاحيات', icon: 'fa-shield-halved' },
              { id: 'requests', label: 'طلبات الوكيل', icon: 'fa-paper-plane' },
              { id: 'doc_requests', label: 'طلبات الوثائق', icon: 'fa-file-circle-exclamation' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); navigate(`/branches-agents/${id}?tab=${tab.id}`, { replace: true }); }}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              >
                <i className={`fa-solid ${tab.icon}`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="profile-content-area">
          <div className="content-card">
            {activeTab === 'agency' && (
              <div className="tab-pane">
                <h3 className="tab-title">المعلومات الأساسية للوكالة</h3>
                <div className="info-grid">
                  <InfoItem label="اسم الوكالة" value={branchAgent.agency_name} icon="fa-building" />
                  <InfoItem label="اسم الوكيل المسئول" value={branchAgent.agent_name} icon="fa-user-tie" />
                  <InfoItem label="كود الوكالة" value={branchAgent.code} icon="fa-hashtag" />
                  <InfoItem label="نوع النشاط" value={branchAgent.activity} icon="fa-briefcase" />
                  <InfoItem label="رقم الوكالة" value={branchAgent.agency_number} icon="fa-id-card" />
                  <InfoItem label="رقم الختم" value={branchAgent.stamp_number} icon="fa-stamp" />
                  <InfoItem label="تاريخ التعاقد" value={new Date(branchAgent.contract_date).toLocaleDateString('ar-LY')} icon="fa-calendar-day" />
                  <InfoItem label="تاريخ انتهاء العقد" value={branchAgent.contract_end_date ? new Date(branchAgent.contract_end_date).toLocaleDateString('ar-LY') : '—'} icon="fa-calendar-xmark" />
                  <div className="full-width">
                    <InfoItem label="ملاحظات إضافية" value={branchAgent.notes} icon="fa-comment-dots" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="tab-pane">
                <h3 className="tab-title">معلومات الاتصال والبيانات الشخصية</h3>
                <div className="info-grid">
                  <InfoItem label="المدينة" value={branchAgent.city} icon="fa-city" />
                  <InfoItem label="رقم الهاتف" value={branchAgent.phone} icon="fa-phone" />
                  <InfoItem label="الجنسية" value={branchAgent.nationality} icon="fa-flag" />
                  <InfoItem label="الرقم الوطني" value={branchAgent.national_id} icon="fa-id-card" />
                  <InfoItem label="رقم إثبات الشخصية" value={branchAgent.identity_number} icon="fa-passport" />
                  <InfoItem label="العنوان التفصيلي" value={branchAgent.address} icon="fa-location-dot" />
                </div>
                
                <div style={{ marginTop: '40px' }}>
                  <h4 className="section-title-sm"><i className="fa-solid fa-images"></i> المستندات المرفقة</h4>
                  <div className="documents-grid-layout" style={{ marginTop: '20px' }}>
                    {branchAgent.personal_photo && <DocCard label="الصورة الشخصية" url={branchAgent.personal_photo} />}
                    {branchAgent.identity_photo && <DocCard label="إثبات الهوية" url={branchAgent.identity_photo} />}
                    {branchAgent.contract_photo && <DocCard label="صورة العقد" url={branchAgent.contract_photo} />}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'custody' && (
              <div className="tab-pane">
                <h3 className="tab-title">سجل العهد والمستندات</h3>
                
                <div style={{ marginBottom: '40px' }}>
                  <h4 className="section-title-sm"><i className="fa-solid fa-boxes-stacked" style={{ color: '#3b82f6' }}></i> العهدة الثابتة</h4>
                  <div className="premium-table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>البيان والوصف</th>
                          <th style={{ width: '120px' }}>الكمية</th>
                        </tr>
                      </thead>
                       <tbody>
                        {branchAgent.fixed_custodies && branchAgent.fixed_custodies.length > 0 ? (
                          branchAgent.fixed_custodies.map((c, i) => (
                            <tr key={i}>
                              <td>{c.description}</td>
                              <td><span className="perm-badge-blue">{c.quantity}</span></td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td style={{ padding: '20px', color: '#6b7280' }}>لا يوجد عهد ثابتة</td>
                            <td style={{ color: '#e2e8f0' }}>—</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="section-divider"></div>

                <div>
                  <h4 className="section-title-sm"><i className="fa-solid fa-box-open" style={{ color: '#ef4444' }}></i> العهدة المستهلكة</h4>
                  <div className="premium-table-container">
                    <table className="premium-table">
                      <thead>
                        <tr>
                          <th>البيان والوصف</th>
                          <th style={{ width: '120px' }}>الكمية</th>
                        </tr>
                      </thead>
                       <tbody>
                        {branchAgent.consumed_custodies && branchAgent.consumed_custodies.length > 0 ? (
                          branchAgent.consumed_custodies.map((c, i) => (
                            <tr key={i}>
                              <td>{c.description}</td>
                              <td><span className="perm-badge-blue" style={{ background: '#fef2f2', color: '#ef4444', borderColor: '#fee2e2' }}>{c.quantity}</span></td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td style={{ padding: '20px', color: '#6b7280' }}>لا يوجد عهد مستهلكة</td>
                            <td style={{ color: '#e2e8f0' }}>—</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="tab-pane">
                <h3 className="tab-title">صلاحيات إصدار الوثائق والتقارير</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  <div className="details-section-card">
                    <h4 className="section-title-sm"><i className="fa-solid fa-file-contract"></i> وثائق التأمين المتاحة</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' }}>
                      {(branchAgent as any).authorized_documents?.filter((doc: string) => !['كشف حساب الوكيل', 'إغلاق حساب شهري', 'كشف إغلاق الحساب الشهري', 'إيصالات القبض', 'إدارة المصروفات', 'التسويات والعمولات', 'الديون المستحقة', 'الأرشيف المالي', 'المخازن والعهدة', 'الإحصائيات المالية', 'مرتبات الموظفين'].includes(doc)).map((doc: string, i: number) => (
                        <span key={i} className="perm-badge-blue">{doc}</span>
                      ))}
                    </div>
                  </div>
                  <div className="details-section-card">
                    <h4 className="section-title-sm"><i className="fa-solid fa-chart-line"></i> الصلاحيات الإدارية والمالية</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' }}>
                      {(branchAgent as any).authorized_documents?.filter((doc: string) => ['كشف حساب الوكيل', 'إغلاق حساب شهري', 'كشف إغلاق الحساب الشهري', 'إيصالات القبض', 'إدارة المصروفات', 'التسويات والعمولات', 'الديون المستحقة', 'الأرشيف المالي', 'المخازن والعهدة', 'الإحصائيات المالية', 'مرتبات الموظفين'].includes(doc)).map((doc: string, i: number) => (
                        <span key={i} className="perm-badge-green">{doc}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {branchAgent.user && (
                  <div style={{ marginTop: '40px' }}>
                    <h4 className="section-title-sm"><i className="fa-solid fa-user-lock"></i> بيانات الحساب المرتبط</h4>
                    <div className="info-grid" style={{ marginTop: '15px' }}>
                      <InfoItem label="اسم المستخدم" value={branchAgent.user.username} />
                      <InfoItem label="الاسم الكامل" value={branchAgent.user.name} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="tab-pane">
                <div className="tab-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <h3 className="tab-title" style={{ margin: 0, border: 'none' }}>طلبات الوكيل</h3>
                  <button onClick={() => setShowRequestModal(true)} className="btn-add-request"><i className="fa-solid fa-paper-plane"></i> تقديم طلب جديد</button>
                </div>
                <div className="requests-list">
                  {requests.length === 0 ? (
                    <div className="empty-requests"><i className="fa-solid fa-inbox"></i><p>لا توجد طلبات سابقة لهذا الوكيل</p></div>
                  ) : (
                    requests.map((req) => (
                      <div key={req.id} className="request-item">
                        <div className={`request-icon ${req.priority === 'urgent' ? 'red' : 'blue'}`}>
                          <i className={`fa-solid ${
                            req.type === 'stock' ? 'fa-boxes-stacked' : 
                            req.type === 'support' ? 'fa-headset' : 
                            req.type === 'commission' ? 'fa-money-bill-trend-up' : 
                            req.type === 'maintenance' ? 'fa-screwdriver-wrench' :
                            req.type === 'marketing' ? 'fa-bullhorn' :
                            req.type === 'training' ? 'fa-user-graduate' :
                            req.type === 'legal' ? 'fa-scale-balanced' :
                            req.type === 'limit_increase' ? 'fa-arrow-up-right-dots' :
                            'fa-envelope'
                          }`}></i>
                        </div>
                        <div className="request-body">
                          <div className="request-top">
                            <h4 className="request-type-title">{getRequestTypeName(req.type)} - {req.subject}</h4>
                            <span className={`status-pill ${req.status}`}>{getStatusName(req.status)}</span>
                          </div>
                          <p className="request-reason">{req.message}</p>
                          <div className="request-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                            <div className="request-date">بتاريخ: {new Date(req.created_at).toLocaleString('ar-LY', { dateStyle: 'medium' })}</div>
                            {isAdmin && req.status === 'pending' && (
                              <div className="request-actions" style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => openStatusModal(req.id, 'processing')} className="btn-approve" title="جاري المعالجة" style={{ background: '#3b82f6' }}><i className="fa-solid fa-clock"></i> جاري المعالجة</button>
                                <button onClick={() => openStatusModal(req.id, 'completed')} className="btn-approve" title="تم التنفيذ"><i className="fa-solid fa-check"></i> تم التنفيذ</button>
                                <button onClick={() => openStatusModal(req.id, 'rejected')} className="btn-reject" title="رفض"><i className="fa-solid fa-xmark"></i> رفض</button>
                              </div>
                            )}
                          </div>
                          {req.admin_notes && (
                            <div className="admin-note-box" style={{ marginTop: '10px' }}>
                              <strong>ملاحظة الإدارة:</strong> {req.admin_notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'doc_requests' && (
              <div className="tab-pane">
                <div className="tab-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <h3 className="tab-title" style={{ margin: 0, border: 'none' }}>طلبات تعديل وإلغاء الوثائق</h3>
                  {!isAdmin && <button onClick={() => setShowNewDocRequestModal(true)} className="btn-add-request"><i className="fa-solid fa-file-circle-plus"></i> تقديم طلب جديد</button>}
                </div>
                <div className="requests-list">
                  {docRequests.length === 0 ? (
                    <div className="empty-requests"><i className="fa-solid fa-inbox"></i><p>لا توجد طلبات وثائق لهذا الوكيل</p></div>
                  ) : (
                    docRequests.map((req) => (
                      <div key={req.id} className="request-item">
                        <div className={`request-icon ${req.request_type === 'cancellation' ? 'red' : 'blue'}`}>
                          <i className={`fa-solid ${req.request_type === 'cancellation' ? 'fa-file-circle-xmark' : 'fa-file-signature'}`}></i>
                        </div>
                        <div className="request-body">
                          <div className="request-top">
                            <h4 className="request-type-title">
                              {req.request_type === 'modification' ? 'تعديل' : 'إلغاء'} {req.document_type ? `- ${req.document_type}` : ''} - {req.document_number}
                            </h4>
                            <span className={`status-pill ${req.status}`}>
                              {req.status === 'pending' ? 'في الانتظار' : req.status === 'accepted' ? 'مقبول' : 'مرفوض'}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, marginBottom: '5px' }}>{req.subject}</div>
                          <p className="request-reason">{req.description}</p>
                          <div className="request-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                            <div className="request-date">بتاريخ: {new Date(req.created_at).toLocaleDateString('ar-LY')}</div>
                            {isAdmin && req.status === 'pending' && (
                              <div className="request-actions" style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => { setSelectedDocRequest(req); setAdminMessage(''); setShowDocStatusModal(true); }} className="btn-approve" title="قبول" style={{ background: '#10b981' }}><i className="fa-solid fa-check-double"></i> قبول</button>
                                <button onClick={() => { setSelectedDocRequest(req); setAdminMessage(''); setShowDocStatusModal(true); }} className="btn-reject" title="رفض"><i className="fa-solid fa-ban"></i> رفض</button>
                              </div>
                            )}
                          </div>
                          {req.admin_message && (
                            <div className="admin-note-box" style={{ marginTop: '10px' }}>
                              <strong>رد الإدارة:</strong> {req.admin_message}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* New Request Modal */}
      {showRequestModal && (
        <div className="modal-overlay">
          <div className="modal-inner">
            <div className="modal-top">
              <h3>تقديم طلب جديد للوكالة</h3>
              <button onClick={() => setShowRequestModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <form onSubmit={handleCreateRequest} className="modal-form">
              <div className="input-group">
                <label>نوع الطلب</label>
                <select value={newRequest.type} onChange={(e) => setNewRequest({...newRequest, type: e.target.value})}>
                  <option value="stock">طلب عهدة/مستندات</option>
                  <option value="support">دعم فني</option>
                  <option value="financial">تسوية مالية</option>
                  <option value="commission">طلب عمولة</option>
                  <option value="maintenance">طلب صيانة</option>
                  <option value="marketing">دعاية وإعلان</option>
                  <option value="training">تدريب</option>
                  <option value="legal">استشارة قانونية</option>
                  <option value="limit_increase">زيادة سقف الإصدار</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div className="input-group">
                <label>الأولوية</label>
                <select value={newRequest.priority} onChange={(e) => setNewRequest({...newRequest, priority: e.target.value})}>
                  <option value="normal">عادي</option>
                  <option value="urgent">عاجل</option>
                </select>
              </div>
              <div className="input-group">
                <label>الموضوع</label>
                <input type="text" placeholder="عنوان مختصر للطلب..." value={newRequest.subject} onChange={(e) => setNewRequest({...newRequest, subject: e.target.value})} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', fontWeight: '700' }} />
              </div>
              <div className="input-group">
                <label>التفاصيل</label>
                <textarea placeholder="اكتب تفاصيل طلبك هنا..." value={newRequest.message} onChange={(e) => setNewRequest({...newRequest, message: e.target.value})} style={{ minHeight: '120px' }}></textarea>
              </div>
              <button type="submit" className="btn-submit-full" disabled={submittingRequest}>{submittingRequest ? 'جاري الإرسال...' : 'إرسال الطلب'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Notes Modal */}
      {showStatusModal && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '450px' }}>
            <div className="modal-top">
              <h3>معالجة طلب الوكيل</h3>
              <button onClick={() => setShowStatusModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="modal-form" style={{ padding: '20px' }}>
              <div className="input-group">
                <label style={{ marginBottom: '10px', display: 'block', fontWeight: 800 }}>ملاحظات الإدارة</label>
                <textarea 
                  placeholder="اكتب ردك أو ملاحظاتك هنا..." 
                  value={adminNotes} 
                  onChange={(e) => setAdminNotes(e.target.value)}
                  style={{ minHeight: '120px', width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  onClick={handleUpdateRequestStatus} 
                  className="btn-submit-full" 
                  disabled={submittingStatus}
                  style={{ flex: 1 }}
                >
                  {submittingStatus ? 'جاري الحفظ...' : 'تأكيد وحفظ'}
                </button>
                <button 
                  onClick={() => setShowStatusModal(false)} 
                  className="btn-outline-sm"
                  style={{ flex: 1, height: 'auto' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doc Request Status Modal */}
      {showDocStatusModal && selectedDocRequest && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '450px' }}>
            <div className="modal-top">
              <h3>الرد على طلب الوثيقة</h3>
              <button onClick={() => setShowDocStatusModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="modal-form" style={{ padding: '20px' }}>
              <div className="input-group">
                <label style={{ marginBottom: '10px', display: 'block', fontWeight: 800 }}>رسالة الإدارة</label>
                <textarea 
                  placeholder="اكتب ردك هنا..." 
                  value={adminMessage} 
                  onChange={(e) => setAdminMessage(e.target.value)}
                  style={{ minHeight: '120px', width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => handleUpdateDocStatus('accepted')} className="btn-submit-full" style={{ flex: 1, background: '#10b981' }} disabled={submittingStatus}>قبول</button>
                <button onClick={() => handleUpdateDocStatus('rejected')} className="btn-submit-full" style={{ flex: 1, background: '#ef4444' }} disabled={submittingStatus}>رفض</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Doc Request Modal */}
      {showNewDocRequestModal && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '800px' }}>
            <div className="modal-top">
              <h3>تقديم طلب وثيقة جديد</h3>
              <button onClick={() => setShowNewDocRequestModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <form onSubmit={handleCreateDocRequest} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="input-group">
                  <label>نوع الطلب</label>
                  <select value={newDocRequest.request_type} onChange={(e) => setNewDocRequest({...newDocRequest, request_type: e.target.value as any})}>
                    <option value="modification">تعديل وثيقة</option>
                    <option value="cancellation">إلغاء وثيقة</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>نوع الوثيقة</label>
                  <SearchableSelect 
                    options={documentTypeOptions}
                    placeholder="ابحث واختر نوع الوثيقة..."
                    value={newDocRequest.document_type}
                    onChange={(val) => setNewDocRequest({...newDocRequest, document_type: val})}
                  />
                </div>
                <div className="input-group">
                  <label>رقم الوثيقة</label>
                  <input 
                    type="text" 
                    required
                    placeholder="مثال: LBY0001" 
                    value={newDocRequest.document_number} 
                    onChange={(e) => setNewDocRequest({...newDocRequest, document_number: e.target.value})}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', fontWeight: '800' }}
                  />
                </div>
                <div className="input-group">
                  <label>الموضوع</label>
                  <input 
                    type="text" 
                    required
                    placeholder="عنوان مختصر للطلب..." 
                    value={newDocRequest.subject} 
                    onChange={(e) => setNewDocRequest({...newDocRequest, subject: e.target.value})}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', fontWeight: '700' }}
                  />
                </div>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>التفاصيل (الوصف)</label>
                  <textarea 
                    required
                    placeholder="اكتب تفاصيل التعديل أو سبب الإلغاء هنا..." 
                    value={newDocRequest.description} 
                    onChange={(e) => setNewDocRequest({...newDocRequest, description: e.target.value})}
                    style={{ minHeight: '120px' }}
                  ></textarea>
                </div>
              </div>
              <button type="submit" className="btn-submit-full" disabled={submittingRequest} style={{ marginTop: '20px' }}>
                {submittingRequest ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, icon }: { label: string, value?: string, icon?: string }) {
  return (
    <div className="info-item-box">
      <span className="info-label-text">
        {icon && <i className={`fa-solid ${icon}`}></i>}
        {label}
      </span>
      <span className="info-value-text">{value || '—'}</span>
    </div>
  );
}

function DocCard({ label, url }: { label: string, url: string }) {
  return (
    <div className="doc-card">
      <div className="doc-preview">
        <img src={`${BACKEND_URL}/storage/${url}`} alt={label} />
        <div className="doc-overlay">
          <a href={`${BACKEND_URL}/storage/${url}`} target="_blank" className="overlay-btn" rel="noreferrer"><i className="fa-solid fa-expand"></i></a>
        </div>
      </div>
      <p className="doc-label">{label}</p>
    </div>
  );
}
