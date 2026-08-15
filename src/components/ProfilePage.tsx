import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from './Toast';
import { API_BASE_URL, resolveImageUrl } from '../config/api';

interface UserType {
  id: number;
  username: string;
  name: string;
  email: string;
  personal_phone?: string;
  profile_photo_url?: string;
  passport_photo_url?: string;
  identity_proof_url?: string;
  national_id_photo_url?: string;
  employment_contract_url?: string;
  clearance_certificate_url?: string;
  experience_certificate_url?: string;
  health_certificate_url?: string;
  educational_certificate_url?: string;
  eidc_username?: string;
  eidc_password?: string;
  lifo_username?: string;
  lifo_password?: string;
  branch_agent?: {
    id: number;
    personal_photo?: string;
    identity_photo?: string;
    national_id_photo?: string;
    contract_photo?: string;
    passport_photo?: string;
    clearance_certificate?: string;
    non_bankruptcy_certificate?: string;
    experience_certificate?: string;
    non_employment_certificate?: string;
    tb_health_certificate?: string;
    academic_qualification?: string;
    activity_license?: string;
  } | null;
}

const resolveFileUrl = (urlOrPath: string | undefined) => {
  if (!urlOrPath) return undefined;
  return resolveImageUrl(urlOrPath);
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'account' | 'identity'>('account');
  const [user, setUser] = useState<UserType | null>(null);
  
  // Tab 1: Account settings form
  const [formData, setFormData] = useState({
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
    eidc_username: '',
    eidc_password: '',
    lifo_username: '',
    lifo_password: '',
  });

  // Tab 2: Profile update request form
  const [identityFormData, setIdentityFormData] = useState({
    name: '',
    personal_phone: '',
  });

  // Files state
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [identityProof, setIdentityProof] = useState<File | null>(null);
  const [nationalIdPhoto, setNationalIdPhoto] = useState<File | null>(null);
  const [contractPhoto, setContractPhoto] = useState<File | null>(null);
  const [clearanceCertificate, setClearanceCertificate] = useState<File | null>(null);
  const [nonBankruptcyCertificate, setNonBankruptcyCertificate] = useState<File | null>(null);
  const [experienceCertificate, setExperienceCertificate] = useState<File | null>(null);
  const [nonEmploymentCertificate, setNonEmploymentCertificate] = useState<File | null>(null);
  const [tbHealthCertificate, setTbHealthCertificate] = useState<File | null>(null);
  const [academicQualification, setAcademicQualification] = useState<File | null>(null);
  const [activityLicense, setActivityLicense] = useState<File | null>(null);

  // Status state
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [hasPending, setHasPending] = useState(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // Parse active tab from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'identity' || tabParam === 'account') {
      setActiveTab(tabParam as any);
    }
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    try {
      const u = userStr ? JSON.parse(userStr) : null;
      if (u) {
        setUser(u);
        setFormData({ ...formData, email: u.email || '' });
        fetchUserDetails(u.id);
        fetchPendingRequestStatus();
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  const fetchPendingRequestStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/profile-update-requests/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHasPending(data.has_pending);
        setPendingRequest(data.pending_request);
      }
    } catch (error) {
      console.error('Error fetching pending request status:', error);
    }
  };

  const fetchUserDetails = async (userId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setFormData({ 
          ...formData, 
          email: data.email || '',
          eidc_username: data.eidc_username || '',
          eidc_password: data.eidc_password || '',
          lifo_username: data.lifo_username || '',
          lifo_password: data.lifo_password || '',
        });
        setIdentityFormData({
          name: data.name || '',
          personal_phone: data.personal_phone || '',
        });
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateAccountForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }

    if (formData.current_password || formData.new_password || formData.confirm_password) {
      if (!formData.current_password) {
        errors.current_password = 'كلمة المرور الحالية مطلوبة';
      }
      if (!formData.new_password) {
        errors.new_password = 'كلمة المرور الجديدة مطلوبة';
      } else if (formData.new_password.length < 6) {
        errors.new_password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      }
      if (!formData.confirm_password) {
        errors.confirm_password = 'تأكيد كلمة المرور مطلوب';
      } else if (formData.new_password !== formData.confirm_password) {
        errors.confirm_password = 'كلمة المرور الجديدة وتأكيدها غير متطابقين';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !validateAccountForm()) return;

    setSubmitting(true);
    setFormErrors({});

    try {
      const token = localStorage.getItem('token');
      // 1. Update email
      if (formData.email !== user.email) {
        const emailRes = await fetch(`${API_BASE_URL}/users/${user.id}/email`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email: formData.email }),
        });

        if (!emailRes.ok) {
          const errorData = await emailRes.json().catch(() => ({}));
          throw new Error(errorData.message || 'فشل تحديث البريد الإلكتروني');
        }

        const updatedUser = await emailRes.json();
        setUser(prev => prev ? { ...prev, email: updatedUser.email } : null);
        localStorage.setItem('user', JSON.stringify({ ...user, email: updatedUser.email }));
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: { ...user, email: updatedUser.email } }));
      }

      // 2. Update password
      if (formData.current_password && formData.new_password && formData.confirm_password) {
        const passwordRes = await fetch(`${API_BASE_URL}/users/${user.id}/password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            current_password: formData.current_password,
            new_password: formData.new_password,
            confirm_password: formData.confirm_password,
          }),
        });

        if (!passwordRes.ok) {
          const errorData = await passwordRes.json().catch(() => ({}));
          throw new Error(errorData.message || 'فشل تحديث كلمة المرور');
        } else {
          const passData = await passwordRes.json().catch(() => ({}));
          if (passData.token) {
            localStorage.setItem('token', passData.token);
          }
        }
      }

      // 3. Update EIDC credentials
      if (formData.eidc_username !== (user.eidc_username || '') || formData.eidc_password !== (user.eidc_password || '')) {
        const eidcRes = await fetch(`${API_BASE_URL}/users/${user.id}/eidc-credentials`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            eidc_username: formData.eidc_username,
            eidc_password: formData.eidc_password,
          }),
        });

        if (!eidcRes.ok) {
          const errorData = await eidcRes.json().catch(() => ({}));
          throw new Error(errorData.message || 'فشل تحديث بيانات الهيئة');
        }
      }

      // 4. Update LIFO credentials
      if (formData.lifo_username !== (user.lifo_username || '') || formData.lifo_password !== (user.lifo_password || '')) {
        const lifoRes = await fetch(`${API_BASE_URL}/users/${user.id}/lifo-credentials`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            lifo_username: formData.lifo_username,
            lifo_password: formData.lifo_password,
          }),
        });

        if (!lifoRes.ok) {
          const errorData = await lifoRes.json().catch(() => ({}));
          throw new Error(errorData.message || 'فشل تحديث بيانات الاتحاد (LIFO)');
        }
      }

      showToast('تم تحديث البيانات بنجاح', 'success');
      setFormData({ ...formData, current_password: '', new_password: '', confirm_password: '' });
      fetchUserDetails(user.id);
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء التحديث', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleIdentitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!identityFormData.name.trim()) {
      showToast('الاسم الكامل مطلوب', 'error');
      return;
    }
    if (!identityFormData.personal_phone.trim()) {
      showToast('رقم الهاتف مطلوب', 'error');
      return;
    }

    setSubmitting(true);

    const data = new FormData();
    data.append('name', identityFormData.name);
    data.append('personal_phone', identityFormData.personal_phone);
    if (profilePhoto) data.append('profile_photo', profilePhoto);
    if (passportPhoto) data.append('passport_photo', passportPhoto);
    if (identityProof) data.append('identity_proof', identityProof);
    if (nationalIdPhoto) data.append('national_id_photo', nationalIdPhoto);
    if (contractPhoto) data.append('contract_photo', contractPhoto);
    if (clearanceCertificate) data.append('clearance_certificate', clearanceCertificate);
    if (nonBankruptcyCertificate) data.append('non_bankruptcy_certificate', nonBankruptcyCertificate);
    if (experienceCertificate) data.append('experience_certificate', experienceCertificate);
    if (nonEmploymentCertificate) data.append('non_employment_certificate', nonEmploymentCertificate);
    if (tbHealthCertificate) data.append('tb_health_certificate', tbHealthCertificate);
    if (academicQualification) data.append('academic_qualification', academicQualification);
    if (activityLicense) data.append('activity_license', activityLicense);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/profile-update-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: data
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.message || 'حدث خطأ أثناء إرسال طلب التعديل');
      }

      showToast(responseData.message || 'تم تقديم طلب التعديل للمراجعة', 'success');
      setProfilePhoto(null);
      setPassportPhoto(null);
      setIdentityProof(null);
      setNationalIdPhoto(null);
      setContractPhoto(null);
      setClearanceCertificate(null);
      setNonBankruptcyCertificate(null);
      setExperienceCertificate(null);
      setNonEmploymentCertificate(null);
      setTbHealthCertificate(null);
      setAcademicQualification(null);
      setActivityLicense(null);
      fetchPendingRequestStatus();
    } catch (error: any) {
      showToast(error.message || 'فشل إرسال طلب التعديل', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const renderFilePreview = (url: string | undefined, title: string) => {
    if (!url) {
      return <span style={{ fontSize: 13, color: 'var(--muted)' }}>لا يوجد ملف مرفق حالياً</span>;
    }
    const resolvedUrl = resolveImageUrl(url);
    const isPdf = url.toLowerCase().endsWith('.pdf');
    return (
      <div className="profile-file-preview-container">
        {isPdf ? (
          <div className="profile-file-pdf-thumb">
            <i className="fa fa-file-pdf-o" style={{ fontSize: 24 }}></i>
            <span>PDF</span>
          </div>
        ) : (
          <img src={resolvedUrl} alt={title} className="profile-file-preview-thumb" />
        )}
        <div className="profile-file-info">
          <a href={resolvedUrl} target="_blank" rel="noopener noreferrer" className="profile-file-link">
            عرض الملف الحالي
          </a>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <section className="users-management font-cairo loading-container">
        <div className="users-card empty-state-container">
          <p>جار التحميل...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="users-management font-cairo loading-container">
        <div className="users-card empty-state-container">
          <p>لم يتم العثور على بيانات المستخدم</p>
          <button className="btn-cancel" onClick={() => navigate(-1)} style={{ marginTop: 20 }}>
            العودة
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="users-management font-cairo loading-container">
      <div className="users-breadcrumb breadcrumb-spacing">
        <span onClick={() => navigate(-1)} className="breadcrumb-link">
          الرئيسية
        </span>
        <span> / </span>
        <span>الملف الشخصي</span>
      </div>

      <div className="profile-tabs-container">
        <button 
          type="button"
          onClick={() => setActiveTab('account')}
          className={`profile-tab-button ${activeTab === 'account' ? 'active' : ''}`}
        >
          بيانات الحساب
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('identity')}
          className={`profile-tab-button ${activeTab === 'identity' ? 'active' : ''}`}
        >
          تحديث الهوية والمستندات الشخصية
        </button>
      </div>

      <div className="users-card">
        {activeTab === 'account' && (
          <form onSubmit={handleAccountSubmit} className="user-form profile-form-container">
            <div className="form-group">
              <label>الاسم الكامل</label>
              <input
                type="text"
                value={user.name}
                disabled
                className="input-disabled-bg"
              />
            </div>

            <div className="form-group">
              <label>اسم المستخدم</label>
              <input
                type="text"
                value={user.username}
                disabled
                className="input-disabled-bg"
              />
            </div>

            <div className="form-group">
              <label>البريد الإلكتروني *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
              />
              {formErrors.email && <span className="error-message">{formErrors.email}</span>}
            </div>

            <div className="profile-section-divider">
              <h3 className="profile-section-title">تغيير كلمة المرور</h3>
              <p className="profile-section-description">
                اترك الحقول التالية فارغة إذا كنت لا تريد تغيير كلمة المرور
              </p>

              <div className="form-group">
                <label>كلمة المرور الحالية</label>
                <input
                  type="password"
                  value={formData.current_password}
                  onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                  placeholder="أدخل كلمة المرور الحالية"
                  autoComplete="current-password"
                />
                {formErrors.current_password && <span className="error-message">{formErrors.current_password}</span>}
              </div>

              <div className="form-group">
                <label>كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={formData.new_password}
                  onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                  placeholder="أدخل كلمة المرور الجديدة"
                  autoComplete="new-password"
                />
                {formErrors.new_password && <span className="error-message">{formErrors.new_password}</span>}
              </div>

              <div className="form-group">
                <label>تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  autoComplete="new-password"
                />
                {formErrors.confirm_password && <span className="error-message">{formErrors.confirm_password}</span>}
              </div>
            </div>

            <div className="profile-section-divider">
              <h3 className="profile-section-title">بيانات الدخول لمنظومة الهيئة (EIDC)</h3>
              <p className="profile-section-description">
                أدخل بيانات حسابك الخاص في الهيئة إذا كنت تمتلك حساباً، ليتم استخدامه عند إصدار الوثائق باسمك.
              </p>

              <div className="form-group">
                <label>اسم المستخدم في الهيئة</label>
                <input
                  type="text"
                  value={formData.eidc_username}
                  onChange={(e) => setFormData({ ...formData, eidc_username: e.target.value })}
                  placeholder="أدخل اسم المستخدم في منظومة الهيئة"
                />
              </div>

              <div className="form-group">
                <label>كلمة المرور في الهيئة</label>
                <input
                  type="password"
                  value={formData.eidc_password}
                  onChange={(e) => setFormData({ ...formData, eidc_password: e.target.value })}
                  placeholder="أدخل كلمة المرور في منظومة الهيئة"
                />
              </div>
            </div>

            <div className="profile-section-divider">
              <h3 className="profile-section-title">بيانات الدخول لمنظومة الاتحاد (LIFO)</h3>
              <p className="profile-section-description">
                أدخل بيانات حسابك الخاص في الاتحاد إذا كنت تمتلك حساباً، ليتم استخدامه عند إصدار وثائق التأمين الدولي باسمك.
              </p>

              <div className="form-group">
                <label>اسم المستخدم في الاتحاد</label>
                <input
                  type="text"
                  value={formData.lifo_username}
                  onChange={(e) => setFormData({ ...formData, lifo_username: e.target.value })}
                  placeholder="أدخل اسم المستخدم في منظومة الاتحاد"
                />
              </div>

              <div className="form-group">
                <label>كلمة المرور في الاتحاد</label>
                <input
                  type="password"
                  value={formData.lifo_password}
                  onChange={(e) => setFormData({ ...formData, lifo_password: e.target.value })}
                  placeholder="أدخل كلمة المرور في منظومة الاتحاد"
                />
              </div>
            </div>

            <div className="profile-form-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate(-1)}
                disabled={submitting}
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="btn-main"
                disabled={submitting}
              >
                {submitting ? 'جار الحفظ...' : 'حفظ التغييرات'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'identity' && (
          <div className="profile-form-container">
            {hasPending && pendingRequest && (
              <div className="pending-alert-banner">
                <div className="pending-alert-title">
                  <i className="fa fa-info-circle"></i>
                  <span>طلب التعديل قيد المراجعة حالياً</span>
                </div>
                <div className="pending-alert-desc">
                  لقد قمت بتقديم طلب لتعديل بياناتك الشخصية ومستنداتك. هذا الطلب قيد التدقيق حالياً من قبل الإدارة. لن تتمكن من إجراء تعديلات إضافية حتى يتم قبول أو رفض هذا الطلب.
                  {pendingRequest.admin_notes && (
                    <div style={{ marginTop: 10, fontWeight: 700 }}>
                      ملاحظة الإدارة: {pendingRequest.admin_notes}
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleIdentitySubmit} className="user-form">
              <div className="form-group">
                <label>الاسم الكامل المقترح</label>
                <input
                  type="text"
                  value={identityFormData.name}
                  onChange={(e) => setIdentityFormData({ ...identityFormData, name: e.target.value })}
                  disabled={hasPending}
                  className={hasPending ? 'input-disabled-bg' : ''}
                  placeholder="أدخل الاسم الكامل باللغة العربية"
                />
              </div>

              <div className="form-group">
                <label>رقم الهاتف الشخصي</label>
                <input
                  type="text"
                  value={identityFormData.personal_phone}
                  onChange={(e) => setIdentityFormData({ ...identityFormData, personal_phone: e.target.value })}
                  disabled={hasPending}
                  className={hasPending ? 'input-disabled-bg' : ''}
                  placeholder="أدخل رقم الهاتف الشخصي الفعال"
                />
              </div>

              <div className="profile-section-divider">
                <h3 className="profile-section-title">المستندات والوثائق الشخصية</h3>
                <p className="profile-section-description">
                  قم بتحميل صورتك الشخصية ووثائق إثبات الهوية والشهادات لمطابقتها واعتمادها.
                </p>

                {/* 1. Profile Photo */}
                <div className="form-group" style={{ marginBottom: 25 }}>
                  <label style={{ fontWeight: 700 }}>الصورة الشخصية</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!hasPending && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
                      />
                    )}
                    {renderFilePreview(user.profile_photo_url, 'الصورة الشخصية')}
                  </div>
                </div>

                {/* 2. Passport Photo */}
                <div className="form-group" style={{ marginBottom: 25 }}>
                  <label style={{ fontWeight: 700 }}>صورة جواز السفر</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!hasPending && (
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setPassportPhoto(e.target.files?.[0] || null)}
                      />
                    )}
                    {renderFilePreview(user.passport_photo_url, 'جواز السفر')}
                  </div>
                </div>

                {/* 3. Identity Proof */}
                <div className="form-group" style={{ marginBottom: 25 }}>
                  <label style={{ fontWeight: 700 }}>إثبات الهوية الشخصية (البطاقة الوطنية / الهوية)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!hasPending && (
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setIdentityProof(e.target.files?.[0] || null)}
                      />
                    )}
                    {renderFilePreview(user.identity_proof_url, 'إثبات الهوية')}
                  </div>
                </div>

                {/* 4. National ID Photo */}
                <div className="form-group" style={{ marginBottom: 25 }}>
                  <label style={{ fontWeight: 700 }}>صورة الرقم الوطني</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!hasPending && (
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setNationalIdPhoto(e.target.files?.[0] || null)}
                      />
                    )}
                    {renderFilePreview(user.national_id_photo_url || resolveFileUrl(user.branch_agent?.national_id_photo), 'صورة الرقم الوطني')}
                  </div>
                </div>

                {/* 5. Contract Photo */}
                <div className="form-group" style={{ marginBottom: 25 }}>
                  <label style={{ fontWeight: 700 }}>صورة العقد</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!hasPending && (
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setContractPhoto(e.target.files?.[0] || null)}
                      />
                    )}
                    {renderFilePreview(user.employment_contract_url || resolveFileUrl(user.branch_agent?.contract_photo), 'صورة العقد')}
                  </div>
                </div>

                {/* 6. Clearance Certificate */}
                <div className="form-group" style={{ marginBottom: 25 }}>
                  <label style={{ fontWeight: 700 }}>شهادة براءة الذمة</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!hasPending && (
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setClearanceCertificate(e.target.files?.[0] || null)}
                      />
                    )}
                    {renderFilePreview(user.clearance_certificate_url || resolveFileUrl(user.branch_agent?.clearance_certificate), 'شهادة براءة الذمة')}
                  </div>
                </div>

                {/* 7. Experience Certificate */}
                <div className="form-group" style={{ marginBottom: 25 }}>
                  <label style={{ fontWeight: 700 }}>شهادة خبرة</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!hasPending && (
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setExperienceCertificate(e.target.files?.[0] || null)}
                      />
                    )}
                    {renderFilePreview(user.experience_certificate_url || resolveFileUrl(user.branch_agent?.experience_certificate), 'شهادة خبرة')}
                  </div>
                </div>

                {/* 8. TB Health Certificate */}
                <div className="form-group" style={{ marginBottom: 25 }}>
                  <label style={{ fontWeight: 700 }}>شهادة صحية (خلو من الدرن)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!hasPending && (
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setTbHealthCertificate(e.target.files?.[0] || null)}
                      />
                    )}
                    {renderFilePreview(user.health_certificate_url || resolveFileUrl(user.branch_agent?.tb_health_certificate), 'شهادة صحية (خلو من الدرن)')}
                  </div>
                </div>

                {/* 9. Academic Qualification */}
                <div className="form-group" style={{ marginBottom: 25 }}>
                  <label style={{ fontWeight: 700 }}>المؤهل العلمي</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {!hasPending && (
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => setAcademicQualification(e.target.files?.[0] || null)}
                      />
                    )}
                    {renderFilePreview(user.educational_certificate_url || resolveFileUrl(user.branch_agent?.academic_qualification), 'المؤهل العلمي')}
                  </div>
                </div>

                {/* Agent-only files */}
                {!!user.branch_agent && (
                  <>
                    {/* 10. Non-Bankruptcy Certificate */}
                    <div className="form-group" style={{ marginBottom: 25 }}>
                      <label style={{ fontWeight: 700 }}>شهادة عدم إفلاس</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {!hasPending && (
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => setNonBankruptcyCertificate(e.target.files?.[0] || null)}
                          />
                        )}
                        {renderFilePreview(resolveFileUrl(user.branch_agent.non_bankruptcy_certificate), 'شهادة عدم إفلاس')}
                      </div>
                    </div>

                    {/* 11. Non-Employment Certificate */}
                    <div className="form-group" style={{ marginBottom: 25 }}>
                      <label style={{ fontWeight: 700 }}>شهادة عدم ارتباط بعمل</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {!hasPending && (
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => setNonEmploymentCertificate(e.target.files?.[0] || null)}
                          />
                        )}
                        {renderFilePreview(resolveFileUrl(user.branch_agent.non_employment_certificate), 'شهادة عدم ارتباط بعمل')}
                      </div>
                    </div>

                    {/* 12. Activity License */}
                    <div className="form-group" style={{ marginBottom: 25 }}>
                      <label style={{ fontWeight: 700 }}>رخصة المزاولة</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {!hasPending && (
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={(e) => setActivityLicense(e.target.files?.[0] || null)}
                          />
                        )}
                        {renderFilePreview(resolveFileUrl(user.branch_agent.activity_license), 'رخصة المزاولة')}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="profile-form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => navigate(-1)}
                  disabled={submitting}
                >
                  العودة
                </button>
                <button
                  type="submit"
                  className="btn-main"
                  disabled={submitting || hasPending}
                >
                  {submitting ? 'جار الإرسال...' : 'تقديم طلب التعديل'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}


