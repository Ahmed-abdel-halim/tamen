import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL, BACKEND_URL, STORAGE_URL } from "../config/api";

type User = {
  id: number;
  username: string;
  name: string;
  email?: string;
  is_admin?: boolean;
  authorized_documents?: string[];
  salary?: number;
  national_id_number?: string | null;
  job_title?: string | null;
  // Personal Data
  full_name_quad?: string;
  mother_name?: string;
  gender?: string;
  birth_date?: string;
  birth_place?: string;
  nationality?: string;
  social_status?: string;
  qualification?: string;
  blood_type?: string;
  personal_phone?: string;
  guardian_phone?: string;
  address?: string;
  // Job Data
  financial_number?: string;
  job_number?: string;
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  start_date?: string;
  working_hours_from?: string;
  working_hours_to?: string;
  working_days_from?: string;
  working_days_to?: string;
  contract_type?: string;
  contract_conditions?: string;
  // Financial Data
  housing_allowance?: number;
  transportation_allowance?: number;
  communication_allowance?: number;
  fixed_bonuses?: number;
  fixed_fines?: number;
  hourly_leave_deduction?: number;
  daily_leave_deduction?: number;
  is_active?: boolean;
  social_security_percentage?: number;
  tax_percentage?: number;
  // URLs
  profile_photo_url?: string | null;
  personal_id_proof_url?: string | null;
  employment_contract_url?: string | null;
  national_id_photo_url?: string | null;
  identity_proof_url?: string | null;
  certified_stamp_url?: string | null;
  approved_signature_url?: string | null;
  educational_certificate_url?: string | null;
  health_certificate_url?: string | null;
  contract_conditions_photo_url?: string | null;
};

type EmployeeRequest = {
  id: number;
  type: 'termination' | 'leave_hourly' | 'leave_daily' | 'salary_advance' | 'allowance' | 'complaint' | 'maintenance' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  with_salary: boolean;
  reason: string;
  created_at: string;
  admin_notes?: string;
};

function resolvePublicUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/img/')) return `${window.location.origin}${path}`;
  if (path.startsWith('img/')) return `${window.location.origin}/${path}`;
  
  if (path.startsWith('/storage/')) {
    const p = path.replace('/storage/', '');
    return `${STORAGE_URL}/${p}`;
  }
  if (path.startsWith('storage/')) {
    const p = path.replace('storage/', '');
    return `${STORAGE_URL}/${p}`;
  }
  return `${STORAGE_URL}/${path}`;
}

const DOCUMENT_TYPES = [
  { key: 'profile_photo', label: 'الصورة الشخصية', urlAttr: 'profile_photo_url' },
  { key: 'national_id_photo', label: 'صورة البطاقة الوطنية', urlAttr: 'national_id_photo_url' },
  { key: 'identity_proof', label: 'إثبات الهوية', urlAttr: 'identity_proof_url' },
  { key: 'employment_contract', label: 'عقد العمل', urlAttr: 'employment_contract_url' },
  { key: 'certified_stamp', label: 'الختم المعتمد', urlAttr: 'certified_stamp_url' },
  { key: 'approved_signature', label: 'التوقيع المعتمد', urlAttr: 'approved_signature_url' },
  { key: 'educational_certificate', label: 'الشهادة التعليمية', urlAttr: 'educational_certificate_url' },
  { key: 'health_certificate', label: 'الشهادة الصحية', urlAttr: 'health_certificate_url' },
  { key: 'contract_conditions_photo', label: 'شروط العقد', urlAttr: 'contract_conditions_photo_url' },
];

export default function EmployeeProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'personal' | 'job' | 'financial' | 'documents' | 'requests'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['personal', 'job', 'financial', 'documents', 'requests'].includes(tab)) {
      return tab as any;
    }
    return 'personal';
  });
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    type: 'leave_daily' as any,
    with_salary: true,
    reason: '',
  });

  useEffect(() => {
    fetchUser();
    fetchRequests();
    
    // Update active tab if URL parameter changes
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab && ['personal', 'job', 'financial', 'documents', 'requests'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, [id, window.location.search]);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users/${id}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error("فشل جلب بيانات الموظف");
      const data = await res.json();
      setUser(data);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/employee-requests?user_id=${id}`, {
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

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/employee-requests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ...newRequest, user_id: id }),
      });
      
      if (!res.ok) {
        let errorMsg = "فشل تقديم الطلب";
        try {
          const errData = await res.json();
          errorMsg = errData.message || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }
      
      showToast("تم تقديم الطلب بنجاح", 'success');
      setShowRequestModal(false);
      setNewRequest({ type: 'leave_daily', with_salary: true, reason: '' });
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleUpdateRequestStatus = async (requestId: number, newStatus: 'approved' | 'rejected') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/employee-requests/${requestId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) throw new Error("فشل تحديث حالة الطلب");
      
      showToast(newStatus === 'approved' ? "تمت الموافقة على الطلب" : "تم رفض الطلب", 'success');
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const loggedInUserStr = localStorage.getItem('user');
  let isAdmin = false;
  try {
    if (loggedInUserStr) isAdmin = JSON.parse(loggedInUserStr).is_admin;
  } catch {}

  if (loading) return <div className="loading-container font-cairo">جارِ التحميل...</div>;
  if (!user) return <div className="error-container font-cairo">الموظف غير موجود.</div>;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('ar-LY');
  };

  const printDocument = (url: string, label: string) => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>طباعة مستند - ${label}</title>
          <style>
            body { margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; }
            img { max-width: 100%; max-height: 100%; object-fit: contain; }
          </style>
        </head>
        <body onload="window.print(); window.onafterprint = () => window.close();">
          <img src="${resolvePublicUrl(url)}" />
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <div className="profile-container font-cairo">
      {/* Header Info */}
      <div className="profile-header-card">
        <div className="header-content">
          <div className="profile-avatar-large">
            {user.profile_photo_url ? (
              <img src={resolvePublicUrl(user.profile_photo_url)} alt="Profile" />
            ) : (
              <div className="avatar-placeholder">
                <i className="fa-solid fa-user"></i>
              </div>
            )}
          </div>
          <div className="header-info-main">
            <h1 className="profile-name-title">{user.name}</h1>
            <p className="profile-job-subtitle">{user.job_title || 'موظف'}</p>
            <div className="profile-badges-row">
              <span className="profile-badge">
                <i className="fa-solid fa-id-card"></i>
                {user.national_id_number || 'بدون رقم هويّة'}
              </span>
              <span className="profile-badge">
                <i className="fa-solid fa-hashtag"></i>
                {user.username}
              </span>
              <span className="profile-badge">
                <i className="fa-solid fa-calendar-check"></i>
                مباشرة: {formatDate(user.start_date)}
              </span>
            </div>
          </div>
          <div className="header-actions">
            <button onClick={() => navigate('/users')} className="btn-outline-sm">عودة للقائمة</button>
            <button className="btn-primary-sm" onClick={() => window.print()}>
              <i className="fa-solid fa-print"></i> طباعة الاستمارة
            </button>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="profile-main-layout">
        <aside className="profile-sidebar">
          <nav className="tab-navigation">
            {[
              { id: 'personal', label: 'البيانات الشخصية', icon: 'fa-user' },
              { id: 'job', label: 'البيانات الوظيفية', icon: 'fa-briefcase' },
              { id: 'financial', label: 'البيانات المالية', icon: 'fa-money-bill-wave' },
              { id: 'documents', label: 'الأوراق والمستندات', icon: 'fa-file-invoice' },
              { id: 'requests', label: 'طلبات الموظف', icon: 'fa-envelope-open-text' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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
            {activeTab === 'personal' && (
              <div className="tab-pane">
                <h3 className="tab-title">المعلومات الشخصية الأساسية</h3>
                <div className="info-grid">
                  <InfoItem label="الاسم الرباعي" value={user.full_name_quad} />
                  <InfoItem label="اسم الأم" value={user.mother_name} />
                  <InfoItem label="الجنس" value={user.gender} />
                  <InfoItem label="تاريخ الميلاد" value={formatDate(user.birth_date)} />
                  <InfoItem label="مكان الميلاد" value={user.birth_place} />
                  <InfoItem label="الجنسية" value={user.nationality} />
                  <InfoItem label="الحالة الاجتماعية" value={user.social_status} />
                  <InfoItem label="المؤهل العلمي" value={user.qualification} />
                  <InfoItem label="فصيلة الدم" value={user.blood_type} />
                  <InfoItem label="رقم الهاتف الشخصي" value={user.personal_phone} />
                  <InfoItem label="هاتف ولي الأمر" value={user.guardian_phone} />
                  <InfoItem label="حالة الموظف" value={user.is_active === false ? 'غير نشط (لا يمكنه الدخول)' : 'نشط'} />
                  <div className="full-width">
                    <InfoItem label="العنوان بالتفصيل" value={user.address} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'job' && (
              <div className="tab-pane">
                <h3 className="tab-title">المعلومات الوظيفية وتفاصيل العمل</h3>
                <div className="info-grid">
                  <InfoItem label="الرقم المالي" value={user.financial_number} />
                  <InfoItem label="الرقم الوظيفي" value={user.job_number} />
                  <InfoItem label="اسم المصرف" value={user.bank_name} />
                  <InfoItem label="فرع المصرف" value={user.bank_branch} />
                  <InfoItem label="رقم الحساب" value={user.account_number} />
                  <InfoItem label="تاريخ مباشرة العمل" value={formatDate(user.start_date)} />
                  <InfoItem label="ساعات الدوام" value={user.working_hours_from ? `${user.working_hours_from} إلى ${user.working_hours_to}` : '—'} />
                  <InfoItem label="أيام العمل" value={user.working_days_from ? `من ${user.working_days_from} إلى ${user.working_days_to}` : '—'} />
                  <InfoItem label="نوع العقد" value={user.contract_type} />
                  <div className="full-width">
                    <InfoItem label="شروط العقد الخاصة" value={user.contract_conditions} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="tab-pane">
                <h3 className="tab-title">تكوين المرتب والبدلات المعتمدة</h3>
                <div className="financial-grid">
                  <FinancialCard label="المرتب الأساسي" value={user.salary} type="primary" />
                  <FinancialCard label="بدل سكن" value={user.housing_allowance} type="allowance" />
                  <FinancialCard label="بدل مواصلات" value={user.transportation_allowance} type="allowance" />
                  <FinancialCard label="بدل اتصالات" value={user.communication_allowance} type="allowance" />
                  <FinancialCard label="علاوات ثابتة" value={user.fixed_bonuses} type="bonus" />
                  <FinancialCard label="خصومات ثابتة" value={user.fixed_fines} type="fine" />
                  <FinancialCard label="خصم غياب (ساعة)" value={user.hourly_leave_deduction} type="penalty" />
                  <FinancialCard label="خصم غياب (يوم)" value={user.daily_leave_deduction} type="penalty" />
                  <PercentCard label="حصة مصلحة الضرائب" value={user.tax_percentage} type="penalty" />
                  <PercentCard label="حصة الضمان الاجتماعي" value={user.social_security_percentage} type="penalty" />
                </div>
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="tab-pane">
                <h3 className="tab-title">المستندات والأوراق الثبوتية المؤرشفة</h3>
                <div className="documents-grid-layout">
                  {DOCUMENT_TYPES.map((doc) => {
                    const url = user[doc.urlAttr as keyof User] as string | null;
                    return (
                      <div key={doc.key} className="doc-card">
                        <div className="doc-preview">
                          {url ? (
                            <>
                              <img src={resolvePublicUrl(url)} alt={doc.label} />
                              <div className="doc-overlay">
                                <a href={resolvePublicUrl(url)} target="_blank" className="overlay-btn" title="توسيع"><i className="fa-solid fa-expand"></i></a>
                                <button onClick={() => printDocument(url, doc.label)} className="overlay-btn" title="طباعة"><i className="fa-solid fa-print"></i></button>
                              </div>
                            </>
                          ) : (
                            <div className="doc-empty"><i className="fa-solid fa-file-circle-minus"></i><p>لا يوجد مرفق</p></div>
                          )}
                        </div>
                        <p className="doc-label">{doc.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="tab-pane">
                <div className="tab-header-row">
                  <h3 className="tab-title">طلبات شؤون الموظفين</h3>
                  <button onClick={() => setShowRequestModal(true)} className="btn-add-request"><i className="fa-solid fa-plus-circle"></i> تقديم طلب جديد</button>
                </div>
                <div className="requests-list">
                  {requests.length === 0 ? (
                    <div className="empty-requests"><i className="fa-solid fa-inbox"></i><p>لا توجد طلبات سابقة</p></div>
                  ) : (
                    requests.map((req) => (
                      <div key={req.id} className="request-item">
                          <div className={`request-icon ${req.type === 'termination' ? 'red' : (req.type === 'complaint' ? 'red' : 'blue')}`}>
                            <i className={`fa-solid ${
                              req.type === 'termination' ? 'fa-user-slash' : 
                              req.type === 'leave_hourly' ? 'fa-clock' : 
                              req.type === 'leave_daily' ? 'fa-calendar-day' :
                              req.type === 'salary_advance' ? 'fa-money-bill-transfer' :
                              req.type === 'allowance' ? 'fa-hand-holding-dollar' :
                              req.type === 'complaint' ? 'fa-circle-exclamation' :
                              req.type === 'maintenance' ? 'fa-screwdriver-wrench' :
                              'fa-envelope'
                            }`}></i>
                          </div>
                          <div className="request-body">
                            <div className="request-top">
                              <h4 className="request-type-title">
                                {req.type === 'termination' ? 'طلب إنهاء خدمة' : 
                                 req.type === 'leave_hourly' ? 'طلب إجازة ساعية' : 
                                 req.type === 'leave_daily' ? 'طلب إجازة يومية' :
                                 req.type === 'salary_advance' ? 'طلب سلفة مرتب' :
                                 req.type === 'allowance' ? 'طلب بدلات' :
                                 req.type === 'complaint' ? 'تقديم شكوى' :
                                 req.type === 'maintenance' ? 'طلب صيانة مرافق' :
                                 'طلب آخر'}
                              </h4>
                            <span className={`status-pill ${req.status}`}>{req.status === 'approved' ? 'تمت الموافقة' : req.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}</span>
                          </div>
                          <p className="request-reason">{req.reason || 'بدون تفاصيل'}</p>
                          <div className="request-footer">
                            <div className="request-date">بتاريخ: {new Date(req.created_at).toLocaleString('ar-LY', { dateStyle: 'medium' })}</div>
                            {isAdmin && req.status === 'pending' && (
                              <div className="request-actions">
                                <button onClick={() => handleUpdateRequestStatus(req.id, 'approved')} className="btn-approve" title="موافقة"><i className="fa-solid fa-check"></i> موافقة</button>
                                <button onClick={() => handleUpdateRequestStatus(req.id, 'rejected')} className="btn-reject" title="رفض"><i className="fa-solid fa-xmark"></i> رفض</button>
                              </div>
                            )}
                          </div>
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
              <h3>تقديم طلب جديد</h3>
              <button onClick={() => setShowRequestModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <form onSubmit={handleCreateRequest} className="modal-form">
              <div className="input-group">
                <label>نوع الطلب</label>
                <select value={newRequest.type} onChange={(e) => setNewRequest({...newRequest, type: e.target.value})}>
                  <option value="leave_daily">إجازة يومية</option>
                  <option value="leave_hourly">إجازة ساعية</option>
                  <option value="termination">إنهاء خدمة (استقالة)</option>
                  <option value="salary_advance">سلفة مرتب</option>
                  <option value="allowance">طلب بدلات</option>
                  <option value="complaint">تقديم شكوى</option>
                  <option value="maintenance">صيانة (مرافق)</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div className="checkbox-row">
                <input type="checkbox" id="withSalary" checked={newRequest.with_salary} onChange={(e) => setNewRequest({...newRequest, with_salary: e.target.checked})} />
                <label htmlFor="withSalary">هل الطلب مدفوع وبخصم من الرصيد؟</label>
              </div>
              <div className="input-group">
                <label>السبب أو الملاحظات</label>
                <textarea placeholder="اكتب تفاصيل طلبك هنا..." value={newRequest.reason} onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}></textarea>
              </div>
              <button type="submit" className="btn-submit-full" disabled={submittingRequest}>{submittingRequest ? 'جاري الإرسال...' : 'إرسال الطلب'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string, value?: string }) {
  return (
    <div className="info-item-box">
      <span className="info-label-text">{label}</span>
      <span className="info-value-text">{value || '—'}</span>
    </div>
  );
}

function FinancialCard({ label, value, type }: { label: string, value?: number, type: string }) {
  return (
    <div className={`financial-card-box ${type}`}>
      <span className="fin-label">{label}</span>
      <div className="fin-value-row">
        <span className="fin-num">{value ? Number(value).toLocaleString() : '0.00'}</span>
        <span className="fin-currency">د.ل</span>
      </div>
    </div>
  );
}

function PercentCard({ label, value, type }: { label: string, value?: number, type: string }) {
  return (
    <div className={`financial-card-box ${type}`}>
      <span className="fin-label">{label}</span>
      <div className="fin-value-row">
        <span className="fin-num">{value !== undefined ? Number(value).toLocaleString() : '0.000'}</span>
        <span className="fin-currency">%</span>
      </div>
    </div>
  );
}
