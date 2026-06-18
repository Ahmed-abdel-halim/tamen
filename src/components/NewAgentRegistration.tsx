import React, { useState, useEffect } from "react";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

const LIBYAN_CITIES = [
  { ar: 'طرابلس', en: 'Tripoli' }, { ar: 'بنغازي', en: 'Benghazi' }, { ar: 'مصراتة', en: 'Misrata' },
  { ar: 'سبها', en: 'Sabha' }, { ar: 'زليتن', en: 'Zliten' }, { ar: 'البيضاء', en: 'Al Bayda' },
  { ar: 'أجدابيا', en: 'Ajdabiya' }, { ar: 'درنة', en: 'Derna' }, { ar: 'طبرق', en: 'Tobruk' },
  { ar: 'صبراتة', en: 'Sabratha' }, { ar: 'زوارة', en: 'Zuwara' }, { ar: 'غريان', en: 'Gharyan' },
  { ar: 'يفرن', en: 'Yafran' }, { ar: 'الخمس', en: 'Khoms' }, { ar: 'ترهونة', en: 'Tarhuna' },
  { ar: 'بني وليد', en: 'Bani Walid' }, { ar: 'سرت', en: 'Sirte' }, { ar: 'هون', en: 'Hun' },
  { ar: 'وادي الشاطئ', en: 'Wadi al-Shatii' }, { ar: 'غات', en: 'Ghat' }, { ar: 'أوباري', en: 'Ubari' },
  { ar: 'مرزق', en: 'Murzuq' }, { ar: 'الكفرة', en: 'Kufra' }, { ar: 'الجغبوب', en: 'Jaghbub' },
];

const AGENT_ACTIVITIES = [
  'تحرير العقود والخدمات القانونية', 'خدمات عامة ورجال الاعمال', 'خدمات حجز تذاكر سفر',
  'خدمات تصوير وبيع قرطاسية', 'خدمات بيع وشراء العقارات', 'خدمات المحاماة', 'خدمات تامين السيارات الدولي تونس',
];

const INSURANCE_TYPES = [
  'تأمين سيارات إجباري', 'تأمين سيارة جمرك', 'تأمين سيارات أجنبية', 'تأمين طرف ثالث سيارات',
  'تأمين سيارات دولي', 'تأمين المسافرين', 'تأمين الهياكل البحرية', 'تأمين زائرين ليبيا',
  'تأمين الوافدين', 'تأمين المسؤولية المهنية (الطبية)', 'تأمين الحوادث الشخصية',
  'تأمين حماية طلاب المدارس', 'تأمين نقل النقدية', 'تأمين شحن البضائع',
];

export default function NewAgentRegistration({ onClose }: { onClose?: () => void }) {
  const [formData, setFormData] = useState({
    type: 'وكيل' as 'وكيل' | 'فرع من شركة',
    agency_name: '',
    agent_name: '',
    activity: '',
    agency_number: '',
    stamp_number: '',
    contract_date: new Date().toISOString().split('T')[0],
    contract_end_date: '',
    contract_duration: '',
    city: '',
    address: '',
    phone: '',
    office_phone: '',
    office_location: '',
    nationality: '',
    national_id: '',
    identity_number: '',
    username: '',
    password: '',
    notes: '',
    requested_documents: [] as string[],
  });

  const [pendingFiles, setPendingFiles] = useState<Record<string, File | null>>({
    personal_photo: null,
    office_facade_photo: null,
    identity_photo: null,
    national_id_photo: null,
    contract_photo: null,
    passport_photo: null,
    clearance_certificate: null,
    non_bankruptcy_certificate: null,
    experience_certificate: null,
    non_employment_certificate: null,
    tb_health_certificate: null,
    academic_qualification: null,
    activity_license: null,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const calculateContractDuration = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) return '';
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;
    
    let duration = '';
    if (years > 0) duration += `${years} ${years === 1 ? 'سنة' : 'سنة'}`;
    if (months > 0) {
      if (duration) duration += ' و ';
      duration += `${months} ${months === 1 ? 'شهر' : 'شهر'}`;
    }
    if (days > 0 && years === 0) {
      if (duration) duration += ' و ';
      duration += `${days} ${days === 1 ? 'يوم' : 'يوم'}`;
    }
    return duration || '';
  };

  useEffect(() => {
    if (formData.contract_date && formData.contract_end_date) {
      const duration = calculateContractDuration(formData.contract_date, formData.contract_end_date);
      if (duration) setFormData(prev => ({ ...prev, contract_duration: duration }));
    }
  }, [formData.contract_date, formData.contract_end_date]);

  const handleDocumentToggle = (documentType: string) => {
    const isSelected = formData.requested_documents.includes(documentType);
    if (isSelected) {
      setFormData(prev => ({
        ...prev,
        requested_documents: prev.requested_documents.filter(d => d !== documentType),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        requested_documents: [...prev.requested_documents, documentType],
      }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.agency_name.trim()) errors.agency_name = 'اسم الوكالة مطلوب';
    if (!formData.agent_name.trim()) errors.agent_name = 'اسم الوكيل مطلوب';
    if (!formData.contract_date) errors.contract_date = 'تاريخ التعاقد مطلوب';
    if (!formData.city) errors.city = 'المدينة مطلوبة';

    if (!formData.username.trim()) errors.username = 'اسم المستخدم مطلوب';
    if (!formData.password || formData.password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('يرجى تصحيح الأخطاء في النموذج', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('type', formData.type);
      formDataToSend.append('agency_name', formData.agency_name);
      formDataToSend.append('agent_name', formData.agent_name);
      if (formData.activity) formDataToSend.append('activity', formData.activity);
      if (formData.agency_number) formDataToSend.append('agency_number', formData.agency_number);
      if (formData.stamp_number) formDataToSend.append('stamp_number', formData.stamp_number);
      formDataToSend.append('contract_date', formData.contract_date);
      if (formData.contract_end_date) formDataToSend.append('contract_end_date', formData.contract_end_date);
      if (formData.contract_duration) formDataToSend.append('contract_duration', formData.contract_duration);
      formDataToSend.append('city', formData.city);
      if (formData.address) formDataToSend.append('address', formData.address);
      if (formData.phone) formDataToSend.append('phone', formData.phone);
      if (formData.office_phone) formDataToSend.append('office_phone', formData.office_phone);
      if (formData.office_location) formDataToSend.append('office_location', formData.office_location);
      if (formData.nationality) formDataToSend.append('nationality', formData.nationality);
      if (formData.national_id) formDataToSend.append('national_id', formData.national_id);
      if (formData.identity_number) formDataToSend.append('identity_number', formData.identity_number);

      Object.entries(pendingFiles).forEach(([key, file]) => {
        if (file) formDataToSend.append(key, file);
      });
      
      formDataToSend.append('username', formData.username);
      formDataToSend.append('password', formData.password);
      if (formData.notes) formDataToSend.append('notes', formData.notes);
      
      formDataToSend.append('requested_documents', JSON.stringify(formData.requested_documents || []));

      const res = await fetch(`${API_BASE_URL}/public/agent-register`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json'
        },
        body: formDataToSend,
      });

      if (!res.ok) {
        let errorMessage = 'حدث خطأ';
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const error = await res.json();
            if (error.errors) {
              errorMessage = Object.values(error.errors).flat().join(', ');
            } else {
              errorMessage = error.message || error.error || errorMessage;
            }
        }
        throw new Error(errorMessage);
      }

      showToast('تم إرسال طلب الانضمام بنجاح! سيتم التواصل معك قريباً', 'success');
      setIsSuccess(true);
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء إرسال الطلب', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', color: '#10b981', marginBottom: '20px' }}>
                <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 style={{ color: '#1e293b', marginBottom: '15px' }}>تم إرسال طلبك بنجاح!</h2>
            <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.6', marginBottom: '30px' }}>
                لقد استلمنا طلب انضمامك كوكيل/فرع في المدار الليبي للتأمين.
                <br />
                سيقوم فريقنا بمراجعة طلبك والتواصل معك في أقرب وقت ممكن.
            </p>
            {onClose && (
                <button 
                    onClick={onClose}
                    style={{
                        padding: '12px 30px',
                        background: '#003173',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    إغلاق
                </button>
            )}
        </div>
    );
  }

  return (
    <div className="form-page-container" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', background: '#fff', borderRadius: '12px' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ color: '#003173', fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
                نموذج طلب انضمام كوكيل/فرع
            </h2>
            <p style={{ color: '#64748b' }}>يرجى تعبئة كافة البيانات المطلوبة بوضوح ليتم مراجعة طلبك</p>
        </div>

      <form onSubmit={handleSubmit} className="user-form" style={{ direction: 'rtl' }}>
        <div className="form-group">
          <label>النوع *</label>
          <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as 'وكيل' | 'فرع من شركة' })}>
            <option value="وكيل">وكيل</option>
            <option value="فرع من شركة">فرع من شركة</option>
          </select>
        </div>

        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
            <label>اسم الوكالة *</label>
            <input type="text" value={formData.agency_name} onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })} placeholder="اسم الوكالة" />
            {formErrors.agency_name && <span className="error-message" style={{color: 'red', fontSize: '12px'}}>{formErrors.agency_name}</span>}
            </div>

            <div className="form-group">
            <label>اسم الوكيل/المدير *</label>
            <input type="text" value={formData.agent_name} onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })} placeholder="الاسم الرباعي" />
            {formErrors.agent_name && <span className="error-message" style={{color: 'red', fontSize: '12px'}}>{formErrors.agent_name}</span>}
            </div>
        </div>

        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
            <label>نشاط الوكيل</label>
            <select value={formData.activity} onChange={(e) => setFormData({ ...formData, activity: e.target.value })}>
                <option value="">اختر النشاط</option>
                {AGENT_ACTIVITIES.map((activity, index) => (
                <option key={index} value={activity}>{activity}</option>
                ))}
            </select>
            </div>
            <div className="form-group">
            <label>رقم الهاتف *</label>
            <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="09X XXX XXXX" />
            </div>
        </div>

        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
            <label>هاتف المكتب</label>
            <input type="text" value={formData.office_phone} onChange={(e) => setFormData({ ...formData, office_phone: e.target.value })} placeholder="هاتف المكتب" />
            </div>
            <div className="form-group">
            <label>لوكيشن المكتب (رابط خرائط جوجل)</label>
            <input type="text" value={formData.office_location} onChange={(e) => setFormData({ ...formData, office_location: e.target.value })} placeholder="رابط الموقع الجغرافي" />
            </div>
        </div>

        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group">
            <label>المدينة *</label>
            {isCustomCity ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="اسم المدينة" style={{ flex: 1 }} />
                <button type="button" onClick={() => { setIsCustomCity(false); setFormData({ ...formData, city: '' }); }} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px' }}>إلغاء</button>
              </div>
            ) : (
              <select value={formData.city} onChange={(e) => {
                if (e.target.value === 'other') { setIsCustomCity(true); setFormData({ ...formData, city: '' }); }
                else { setFormData({ ...formData, city: e.target.value }); }
              }}>
                <option value="">اختر المدينة</option>
                {LIBYAN_CITIES.map((city, index) => (<option key={index} value={city.ar}>{city.ar}</option>))}
                <option value="other">أخرى (إضافة مدينة جديدة...)</option>
              </select>
            )}
            {formErrors.city && <span className="error-message" style={{color: 'red', fontSize: '12px'}}>{formErrors.city}</span>}
          </div>
          <div className="form-group">
            <label>العنوان بالتفصيل</label>
            <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="المنطقة، الشارع، أقرب معلم" />
          </div>
        </div>

        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group">
            <label>تاريخ التعاقد (المقترح) *</label>
            <input type="date" value={formData.contract_date} onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })} />
            {formErrors.contract_date && <span className="error-message" style={{color: 'red', fontSize: '12px'}}>{formErrors.contract_date}</span>}
          </div>
          <div className="form-group">
            <label>تاريخ الانتهاء (المقترح)</label>
            <input type="date" value={formData.contract_end_date} onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })} />
          </div>
        </div>

        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group">
            <label>الرقم الوطني</label>
            <input type="text" value={formData.national_id} onChange={(e) => setFormData({ ...formData, national_id: e.target.value })} placeholder="الرقم الوطني" maxLength={50} />
            {formErrors.national_id && <span className="error-message" style={{color: 'red', fontSize: '12px'}}>{formErrors.national_id}</span>}
          </div>
          <div className="form-group">
            <label>رقم إثبات الشخصية</label>
            <input type="text" value={formData.identity_number} onChange={(e) => setFormData({ ...formData, identity_number: e.target.value })} placeholder="جواز سفر أو بطاقة شخصية" />
          </div>
        </div>

        {/* Uploads */}
        <div className="form-section" style={{ marginTop: '20px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>المستندات المطلوبة</h3>
            <div className="permissions-grid-sm" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
              {[
                { key: 'personal_photo', label: 'صورة شخصية', icon: 'fa-user-circle' },
                { key: 'office_facade_photo', label: 'صورة واجهة المكتب', icon: 'fa-store' },
                { key: 'national_id_photo', label: 'صورة الرقم الوطني', icon: 'fa-id-card' },
                { key: 'identity_photo', label: 'إثبات الهوية', icon: 'fa-passport' },
                { key: 'contract_photo', label: 'صورة العقد المبدئي', icon: 'fa-file-contract' },
                { key: 'passport_photo', label: 'جواز السفر', icon: 'fa-plane-departure' },
                { key: 'clearance_certificate', label: 'شهادة البراءة', icon: 'fa-certificate' },
                { key: 'non_bankruptcy_certificate', label: 'شهادة عدم إفلاس', icon: 'fa-file-invoice' },
                { key: 'experience_certificate', label: 'شهادة خبرة', icon: 'fa-award' },
                { key: 'non_employment_certificate', label: 'شهادة عدم ارتباط بعمل', icon: 'fa-file-circle-xmark' },
                { key: 'tb_health_certificate', label: 'شهادة صحية (درن)', icon: 'fa-file-medical' },
                { key: 'academic_qualification', label: 'المؤهل العلمي', icon: 'fa-graduation-cap' },
                { key: 'activity_license', label: 'رخصة المزاولة', icon: 'fa-id-badge' },
              ].map((doc) => (
                <label key={doc.key} className={`perm-chk ${pendingFiles[doc.key] ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100px', justifyContent: 'center', position: 'relative', border: '1px dashed #94a3b8', borderRadius: '8px', cursor: 'pointer', padding: '10px' }}>
                  <i className={`fa-solid ${doc.icon}`} style={{ fontSize: '1.5rem', marginBottom: '8px', color: pendingFiles[doc.key] ? '#10b981' : '#94a3b8' }}></i>
                  <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600' }}>{doc.label}</span>
                  <input type="file" accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => setPendingFiles({ ...pendingFiles, [doc.key]: e.target.files?.[0] || null })} />
                  {pendingFiles[doc.key] && <div style={{ position: 'absolute', top: '5px', left: '5px', color: '#10b981' }}><i className="fa-solid fa-circle-check"></i></div>}
                  {pendingFiles[doc.key] && <div style={{ fontSize: '0.6rem', color: '#10b981', marginTop: '4px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFiles[doc.key]!.name}</div>}
                </label>
              ))}
            </div>
        </div>

        {/* Document Types */}
        <div className="form-section" style={{ marginTop: '24px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>أنواع الوثائق المرغوب إصدارها</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
            {INSURANCE_TYPES.map((insuranceType) => {
              const isSelected = formData.requested_documents.includes(insuranceType);
              return (
                <div key={insuranceType} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id={`req-doc-${insuranceType}`}
                    checked={isSelected}
                    onChange={() => handleDocumentToggle(insuranceType)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor={`req-doc-${insuranceType}`} style={{ cursor: 'pointer', fontSize: '14px' }}>
                    {insuranceType}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Login Credentials */}
        <div className="form-section" style={{ marginTop: '24px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>بيانات تسجيل الدخول المقترحة</h3>
            <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="form-group">
                <label>اسم المستخدم *</label>
                <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="اسم باللغة الانجليزية" dir="ltr" />
                {formErrors.username && <span className="error-message" style={{color: 'red', fontSize: '12px'}}>{formErrors.username}</span>}
            </div>
            <div className="form-group">
                <label>كلمة المرور *</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="كلمة المرور"
                    style={{ width: '100%', paddingLeft: '40px' }}
                    dir="ltr"
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', left: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
                >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
                </div>
                {formErrors.password && <span className="error-message" style={{color: 'red', fontSize: '12px'}}>{formErrors.password}</span>}
            </div>
            </div>
        </div>

        <div className="form-group" style={{ marginTop: '20px' }}>
          <label>ملاحظات إضافية</label>
          <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="أي معلومات أو أسئلة تود إضافتها..." rows={3} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }} />
        </div>

        <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '15px' }}>
            {onClose && (
                <button 
                    type="button"
                    onClick={onClose}
                    style={{ padding: '12px 30px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    إلغاء
                </button>
            )}
            <button 
                type="submit" 
                disabled={submitting}
                style={{
                    padding: '12px 40px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontWeight: 'bold',
                    opacity: submitting ? 0.7 : 1
                }}
            >
                {submitting ? 'جاري الإرسال...' : 'تقديم الطلب'}
            </button>
        </div>
      </form>
    </div>
  );
}
