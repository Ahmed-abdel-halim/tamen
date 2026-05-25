import { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";



const LIBYAN_CITIES = [
  { ar: 'طرابلس', en: 'Tripoli' },
  { ar: 'بنغازي', en: 'Benghazi' },
  { ar: 'مصراتة', en: 'Misrata' },
  { ar: 'سبها', en: 'Sabha' },
  { ar: 'زليتن', en: 'Zliten' },
  { ar: 'البيضاء', en: 'Al Bayda' },
  { ar: 'أجدابيا', en: 'Ajdabiya' },
  { ar: 'درنة', en: 'Derna' },
  { ar: 'طبرق', en: 'Tobruk' },
  { ar: 'صبراتة', en: 'Sabratha' },
  { ar: 'زوارة', en: 'Zuwara' },
  { ar: 'غريان', en: 'Gharyan' },
  { ar: 'يفرن', en: 'Yafran' },
  { ar: 'الخمس', en: 'Khoms' },
  { ar: 'ترهونة', en: 'Tarhuna' },
  { ar: 'بني وليد', en: 'Bani Walid' },
  { ar: 'سرت', en: 'Sirte' },
  { ar: 'هون', en: 'Hun' },
  { ar: 'وادي الشاطئ', en: 'Wadi al-Shatii' },
  { ar: 'غات', en: 'Ghat' },
  { ar: 'أوباري', en: 'Ubari' },
  { ar: 'مرزق', en: 'Murzuq' },
  { ar: 'الكفرة', en: 'Kufra' },
  { ar: 'الجغبوب', en: 'Jaghbub' },
];

const AGENT_ACTIVITIES = [
  'تحرير العقود والخدمات القانونية',
  'خدمات عامة ورجال الاعمال',
  'خدمات حجز تذاكر سفر',
  'خدمات تصوير وبيع قرطاسية',
  'خدمات بيع وشراء العقارات',
  'خدمات المحاماة',
  'خدمات تامين السيارات الدولي تونس',
];

const INSURANCE_TYPES = [
  'تأمين سيارات إجباري',
  'تأمين سيارة جمرك',
  'تأمين سيارات أجنبية',
  'تأمين طرف ثالث سيارات',
  'تأمين سيارات دولي',
  'تأمين المسافرين',
  'تأمين الهياكل البحرية',
  'تأمين زائرين ليبيا',
  'تأمين الوافدين',
  'تأمين المسؤولية المهنية (الطبية)',
  'تأمين الحوادث الشخصية',
  'تأمين حماية طلاب المدارس',
  'تأمين نقل النقدية',
  'تأمين شحن البضائع',
];

const REPORT_PERMISSIONS = [
  'كشف حساب الوكيل',
  'إغلاق حساب شهري',
  'كشف إغلاق الحساب الشهري',
  'إيصالات القبض',
  'إدارة المصروفات التشغيلية',
  'التعويضات',
  'رصيد الاتحاد (البطاقة البرتقالية)',
  'التسويات والعمولات',
  'الديون المستحقة',
  'الأرشيف المالي',
  'المخازن والعهدة',
  'الإحصائيات المالية',
  'مرتبات الموظفين',
  'تقرير مصلحة الضرائب',
  'تقرير الضمان الاجتماعي',
];

const DEFAULT_CONTRACT_TERMS = `1. يتعهد الطرف الثاني بأن يعمل لحساب ولصالح الطرف الأول وتحت إشرافه بصفته وكيلاً عنه بإصدار وثائق التأمين الإجبارية التي تقوم الشركة بإصدارها، وذلك وفقاً للقانون والنظام المعمول به والأحكام والضوابط المبينة بهذا العقد.
2. تقوم الشركة بدفع العمولة المستحقة للطرف الثاني وذلك عند نهاية كل شهر بناءً على حوافظ اصدار الوثائق المحالة من الطرف الثاني إلى الطرف الأول بعد استيفاء المراجعة المالية والفنية.
3. 1- اتفق الطرفان على مدة هذا العقد (سنة واحدة) اعتباراً من تاريخ إبرامه. 2- يجدد العقد بحضور الطرف الثاني أو من ينوب عنه ويبرم عقد تجديد العقد في الشركة / الطرف الأول. 3- يلغى الطرف الأول العقد مع الطرف الثاني برسالة إخطار موجهه للطرف الثاني في حال عدم التقيد في شروط هذا العقد.
4. يلتزم الطرف الثاني بشأن تنفيذ أحكام هذا العقد بما يلي:
   أ. مباشرة العمل خلال مدة لا تتجاوز شهر من تاريخ ابرام العقد.
   ب. العمل على إصدار وثائق التأمين عن طريق منظومة الاصدار الخاصة بالشركة فقط.
   ج. عدم مخالفة اسعار الوثائق التي يصدرها وعدم التعهد بأية التزامات أو وعود.
   د. مراعاة الطرف الثاني مبدأ حسن النية في عمليات إصدار الوثائق.
   هـ. عدم قبول التأمين على أخطار قد تحققت فعلاً قبل إصدار وثيقة تأمين.
5. يحق للطرف الأول فسخ العقد دون اخطار الطرف الثاني في حالة ثبوت مخالفته للوائح المالية والفنية النافذة بالشركة.
6. اتفق الطرفان بأنه يحق للطرف الثاني إنهاء العقد ويشترط الحصول على براءة ذمة من الطرف الأول.
7. اتفق الطرفان بأن أي نزاع ينشأ بينهما يختص به القضاء الليبي بعد استنفاذ جميع محاولات التسوية الودية.
8. اتفق الطرفان بأن المراسلات الرسمية التي يتم تبادلها بينهما توجه إلى الطرف الآخر رسالة رسمية صادره من أحدهما.
9. وقع الطرفان على هذا العقد بما يفيد اعتماده والعمل بما جاء فيه من أحكام وشروط من تاريخ إبرامه.`;

export default function CreateBranchAgent() {
  const navigate = useNavigate();
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
    nationality: '',
    national_id: '',
    identity_number: '',
    username: '',
    password: '',
    notes: '',
    status: 'نشط' as 'نشط' | 'غير نشط',
    contract_conditions: DEFAULT_CONTRACT_TERMS,
    authorized_documents: [] as string[],
    document_percentages: {} as Record<string, number>,
    eidc_username: '',
    eidc_password: '',
  });

  const [personalPhoto, setPersonalPhoto] = useState<File | null>(null);
  const [identityPhoto, setIdentityPhoto] = useState<File | null>(null);
  const [nationalIdPhoto, setNationalIdPhoto] = useState<File | null>(null);
  const [contractPhoto, setContractPhoto] = useState<File | null>(null);
  const [passportPhoto, setPassportPhoto] = useState<File | null>(null);
  const [clearanceCertificate, setClearanceCertificate] = useState<File | null>(null);
  const [nonBankruptcyCertificate, setNonBankruptcyCertificate] = useState<File | null>(null);
  const [experienceCertificate, setExperienceCertificate] = useState<File | null>(null);
  const [nonEmploymentCertificate, setNonEmploymentCertificate] = useState<File | null>(null);
  const [tbHealthCertificate, setTbHealthCertificate] = useState<File | null>(null);
  const [academicQualification, setAcademicQualification] = useState<File | null>(null);
  const [activityLicense, setActivityLicense] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCustomCity, setIsCustomCity] = useState(false);
  const personalPhotoRef = useRef<HTMLInputElement>(null);
  const identityPhotoRef = useRef<HTMLInputElement>(null);
  const nationalIdPhotoRef = useRef<HTMLInputElement>(null);
  const contractPhotoRef = useRef<HTMLInputElement>(null);
  const passportPhotoRef = useRef<HTMLInputElement>(null);
  const clearanceCertificateRef = useRef<HTMLInputElement>(null);
  const nonBankruptcyCertificateRef = useRef<HTMLInputElement>(null);
  const experienceCertificateRef = useRef<HTMLInputElement>(null);
  const nonEmploymentCertificateRef = useRef<HTMLInputElement>(null);
  const tbHealthCertificateRef = useRef<HTMLInputElement>(null);
  const academicQualificationRef = useRef<HTMLInputElement>(null);
  const activityLicenseRef = useRef<HTMLInputElement>(null);

  // حساب مدة العقد تلقائياً
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
    if (years > 0) {
      duration += `${years} ${years === 1 ? 'سنة' : 'سنة'}`;
    }
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
      if (duration) {
        setFormData(prev => ({ ...prev, contract_duration: duration }));
      }
    }
  }, [formData.contract_date, formData.contract_end_date]);

  const handleDocumentToggle = (documentType: string) => {
    const isSelected = formData.authorized_documents.includes(documentType);
    if (isSelected) {
      // إزالة الوثيقة
      if (documentType === 'تأمين سيارات إجباري') {
        // إذا كان "تأمين سيارات إجباري" يتم إزالته، أزل "تأمين سيارات" أيضاً
        setFormData(prev => ({
          ...prev,
          authorized_documents: prev.authorized_documents.filter(d => d !== documentType),
          document_percentages: Object.fromEntries(
            Object.entries(prev.document_percentages).filter(([key]) => key !== documentType && key !== 'تأمين سيارات')
          ),
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          authorized_documents: prev.authorized_documents.filter(d => d !== documentType),
          document_percentages: Object.fromEntries(
            Object.entries(prev.document_percentages).filter(([key]) => key !== documentType)
          ),
        }));
      }
    } else {
      // إضافة الوثيقة
      if (documentType === 'تأمين سيارات إجباري') {
        // عند اختيار "تأمين سيارات إجباري"، أضف "تأمين سيارات" تلقائياً
        setFormData(prev => ({
          ...prev,
          authorized_documents: [...prev.authorized_documents, documentType],
          document_percentages: {
            ...prev.document_percentages,
            [documentType]: 0,
            'تأمين سيارات': prev.document_percentages['تأمين سيارات'] || 0,
          },
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          authorized_documents: [...prev.authorized_documents, documentType],
          document_percentages: {
            ...prev.document_percentages,
            [documentType]: 0,
          },
        }));
      }
    }
  };

  const handlePercentageChange = (documentType: string, percentage: number) => {
    setFormData(prev => ({
      ...prev,
      document_percentages: {
        ...prev.document_percentages,
        [documentType]: percentage,
      },
    }));
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
      if (formData.nationality) formDataToSend.append('nationality', formData.nationality);
      if (formData.national_id) formDataToSend.append('national_id', formData.national_id);
      if (formData.identity_number) formDataToSend.append('identity_number', formData.identity_number);

      if (personalPhoto) formDataToSend.append('personal_photo', personalPhoto);
      if (identityPhoto) formDataToSend.append('identity_photo', identityPhoto);
      if (nationalIdPhoto) formDataToSend.append('national_id_photo', nationalIdPhoto);
      if (contractPhoto) formDataToSend.append('contract_photo', contractPhoto);
      if (passportPhoto) formDataToSend.append('passport_photo', passportPhoto);
      if (clearanceCertificate) formDataToSend.append('clearance_certificate', clearanceCertificate);
      if (nonBankruptcyCertificate) formDataToSend.append('non_bankruptcy_certificate', nonBankruptcyCertificate);
      if (experienceCertificate) formDataToSend.append('experience_certificate', experienceCertificate);
      if (nonEmploymentCertificate) formDataToSend.append('non_employment_certificate', nonEmploymentCertificate);
      if (tbHealthCertificate) formDataToSend.append('tb_health_certificate', tbHealthCertificate);
      if (academicQualification) formDataToSend.append('academic_qualification', academicQualification);
      if (activityLicense) formDataToSend.append('activity_license', activityLicense);
      formDataToSend.append('username', formData.username);
      formDataToSend.append('password', formData.password);
      if (formData.notes) formDataToSend.append('notes', formData.notes);
      formDataToSend.append('contract_conditions', formData.contract_conditions || '');
      formDataToSend.append('status', formData.status);
      
      // إرسال الوثائق المصرح بها والنسب (حتى لو كانت فارغة)
      formDataToSend.append('authorized_documents', JSON.stringify(formData.authorized_documents || []));
      formDataToSend.append('document_percentages', JSON.stringify(formData.document_percentages || {}));
      if (formData.eidc_username) formDataToSend.append('eidc_username', formData.eidc_username);
      if (formData.eidc_password) formDataToSend.append('eidc_password', formData.eidc_password);

      const res = await fetch(`${API_BASE_URL}/branches-agents`, {
        method: 'POST',
        body: formDataToSend,
      });

      if (!res.ok) {
        let errorMessage = 'حدث خطأ';
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await res.json();
            console.error('API Error:', error);
            if (error.errors) {
              // معالجة أخطاء التحقق
              const errorMessages = Object.values(error.errors).flat().join(', ');
              errorMessage = error.message || errorMessages || errorMessage;
              // عرض أخطاء التحقق في console للمساعدة في التصحيح
              console.error('Validation errors:', error.errors);
            } else {
              errorMessage = error.message || error.error || errorMessage;
            }
          } else {
            // إذا كان الرد HTML، احصل على النص
            const text = await res.text();
            errorMessage = `خطأ ${res.status}: ${res.statusText}`;
            console.error('Non-JSON response:', text.substring(0, 200));
          }
        } catch (e) {
          errorMessage = `خطأ ${res.status}: ${res.statusText}`;
          console.error('Error parsing response:', e);
        }
        throw new Error(errorMessage);
      }

      const branchAgent = await res.json();
      showToast('تم إنشاء السجل بنجاح', 'success');
      setTimeout(() => {
        navigate(`/branches-agents/${branchAgent.id}`);
      }, 1000);
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء إنشاء السجل', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span onClick={() => navigate('/branches-agents')} className="breadcrumb-link">
          الفروع والوكلاء
        </span>
        <span> / </span>
        <span>إضافة فرع أو وكيل جديد</span>
      </div>

      <div className="users-card">
        <div className="form-page-container">
          <form onSubmit={handleSubmit} className="user-form">
            <div className="form-group">
              <label>النوع *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'وكيل' | 'فرع من شركة' })}
              >
                <option value="وكيل">وكيل</option>
                <option value="فرع من شركة">فرع من شركة</option>
              </select>
            </div>

            <div className="form-group">
              <label>اسم الوكالة *</label>
              <input
                type="text"
                value={formData.agency_name}
                onChange={(e) => setFormData({ ...formData, agency_name: e.target.value })}
                placeholder="اسم الوكالة"
              />
              {formErrors.agency_name && <span className="error-message">{formErrors.agency_name}</span>}
            </div>

            <div className="form-group">
              <label>اسم الوكيل *</label>
              <input
                type="text"
                value={formData.agent_name}
                onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                placeholder="اسم الوكيل"
              />
              {formErrors.agent_name && <span className="error-message">{formErrors.agent_name}</span>}
            </div>

            <div className="form-group">
              <label>نشاط الوكيل</label>
              <select
                value={formData.activity}
                onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
              >
                <option value="">اختر نشاط الوكيل</option>
                {AGENT_ACTIVITIES.map((activity, index) => (
                  <option key={index} value={activity}>
                    {activity}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>رقم الوكالة</label>
                <input
                  type="text"
                  value={formData.agency_number}
                  onChange={(e) => setFormData({ ...formData, agency_number: e.target.value })}
                  placeholder="رقم الوكالة"
                />
              </div>
              <div className="form-group">
                <label>رقم الختم</label>
                <input
                  type="text"
                  value={formData.stamp_number}
                  onChange={(e) => setFormData({ ...formData, stamp_number: e.target.value })}
                  placeholder="رقم الختم"
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>تاريخ التعاقد *</label>
                <input
                  type="date"
                  value={formData.contract_date}
                  onChange={(e) => setFormData({ ...formData, contract_date: e.target.value })}
                />
                {formErrors.contract_date && <span className="error-message">{formErrors.contract_date}</span>}
              </div>
              <div className="form-group">
                <label>تاريخ انتهاء العقد</label>
                <input
                  type="date"
                  value={formData.contract_end_date}
                  onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>مدة العقد</label>
              <input
                type="text"
                value={formData.contract_duration}
                onChange={(e) => setFormData({ ...formData, contract_duration: e.target.value })}
                placeholder="سيتم حسابها تلقائياً عند اختيار تاريخ انتهاء العقد"
                readOnly={!!(formData.contract_date && formData.contract_end_date)}
                style={formData.contract_date && formData.contract_end_date ? { backgroundColor: '#f3f4f6', cursor: 'not-allowed' } : {}}
              />
            </div>

            <div className="form-group">
              <label>المدينة *</label>
              {isCustomCity ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="اكتب اسم المدينة الجديدة"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCity(false);
                      setFormData({ ...formData, city: '' });
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: '#374151',
                      fontWeight: '500'
                    }}
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <select
                  value={formData.city}
                  onChange={(e) => {
                    if (e.target.value === 'other') {
                      setIsCustomCity(true);
                      setFormData({ ...formData, city: '' });
                    } else {
                      setFormData({ ...formData, city: e.target.value });
                    }
                  }}
                >
                  <option value="">اختر المدينة</option>
                  {LIBYAN_CITIES.map((city, index) => (
                    <option key={index} value={city.ar}>
                      {city.ar} - {city.en}
                    </option>
                  ))}
                  <option value="other">أخرى (إضافة مدينة جديدة...)</option>
                </select>
              )}
              {formErrors.city && <span className="error-message">{formErrors.city}</span>}
            </div>

            <div className="form-group">
              <label>العنوان</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="العنوان"
                rows={3}
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>رقم الهاتف</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="رقم الهاتف"
                />
              </div>
              <div className="form-group">
                <label>الجنسية</label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                  placeholder="الجنسية"
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>الرقم الوطني</label>
                <input
                  type="text"
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                  placeholder="الرقم الوطني"
                  maxLength={50}
                />
                {formErrors.national_id && <span className="error-message">{formErrors.national_id}</span>}
              </div>
              <div className="form-group">
                <label>رقم إثبات الشخصية</label>
                <input
                  type="text"
                  value={formData.identity_number}
                  onChange={(e) => setFormData({ ...formData, identity_number: e.target.value })}
                  placeholder="حروف وأرقام"
                />
              </div>
            </div>


            {/* رفع المستندات والأوراق الثبوتية */}
            <div className="profile-section-divider" style={{ marginTop: '24px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h3 className="form-section-title" style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
                <i className="fa-solid fa-paperclip" style={{ marginLeft: '8px', color: '#2563eb' }}></i>
                المستندات والأوراق الثبوتية للوكيل
              </h3>
              <div className="form-grid">
                {[
                  { ref: personalPhotoRef, state: personalPhoto, setter: setPersonalPhoto, label: 'صورة شخصية', accept: 'image/*,.pdf,.doc,.docx' },
                  { ref: identityPhotoRef, state: identityPhoto, setter: setIdentityPhoto, label: 'صورة إثبات الهوية', accept: 'image/*,.pdf,.doc,.docx' },
                  { ref: nationalIdPhotoRef, state: nationalIdPhoto, setter: setNationalIdPhoto, label: 'صورة الرقم الوطني', accept: 'image/*,.pdf,.doc,.docx' },
                  { ref: contractPhotoRef, state: contractPhoto, setter: setContractPhoto, label: 'صورة العقد', accept: 'image/*,.pdf,.doc,.docx' },
                  { ref: passportPhotoRef, state: passportPhoto, setter: setPassportPhoto, label: 'جواز السفر', accept: 'image/*,.pdf,.doc,.docx' },
                  { ref: clearanceCertificateRef, state: clearanceCertificate, setter: setClearanceCertificate, label: 'شهادة البراءة', accept: 'image/*,.pdf,.doc,.docx' },
                  { ref: nonBankruptcyCertificateRef, state: nonBankruptcyCertificate, setter: setNonBankruptcyCertificate, label: 'شهادة عدم الإفلاس', accept: 'image/*,.pdf,.doc,.docx' },
                  { ref: experienceCertificateRef, state: experienceCertificate, setter: setExperienceCertificate, label: 'شهادة خبرة', accept: 'image/*,.pdf,.doc,.docx' },
                  { ref: nonEmploymentCertificateRef, state: nonEmploymentCertificate, setter: setNonEmploymentCertificate, label: 'شهادة عدم عمل', accept: 'image/*,.pdf,.doc,.docx' },
                  { ref: tbHealthCertificateRef, state: tbHealthCertificate, setter: setTbHealthCertificate, label: 'شهادة صحية الدرن', accept: 'image/*,.pdf,.doc,.docx' },
                  { ref: academicQualificationRef, state: academicQualification, setter: setAcademicQualification, label: 'المؤهل العلمي', accept: 'image/*,.pdf,.doc,.docx' },
                  { ref: activityLicenseRef, state: activityLicense, setter: setActivityLicense, label: 'إذن مزاولة نشاط', accept: 'image/*,.pdf,.doc,.docx' },
                ].map((doc, idx) => (
                  <div key={idx} className="form-group">
                    <label>{doc.label}</label>
                    <input
                      ref={doc.ref}
                      type="file"
                      accept={doc.accept}
                      onChange={(e) => doc.setter(e.target.files?.[0] || null)}
                      style={{ display: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => doc.ref.current?.click()}
                      className={doc.state ? 'btn-submit' : 'btn-cancel'}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      <i className={`fa-solid ${doc.state ? 'fa-circle-check' : 'fa-upload'}`}></i>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {doc.state ? doc.state.name : `اختر ${doc.label}`}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>اسم المستخدم *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="اسم المستخدم"
                />
                {formErrors.username && <span className="error-message">{formErrors.username}</span>}
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
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: '#6b7280'
                    }}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {formErrors.password && <span className="error-message">{formErrors.password}</span>}
              </div>
            </div>

            <div className="profile-section-divider" style={{ marginTop: '24px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h3 className="form-section-title" style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
                بيانات الدخول لمنظومة الهيئة (EIDC)
              </h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>الايميل في الهيئة (EIDC Email)</label>
                  <input
                    type="text"
                    value={formData.eidc_username}
                    onChange={(e) => setFormData({ ...formData, eidc_username: e.target.value })}
                    placeholder="الايميل المسجل في الهيئة"
                  />
                </div>
                <div className="form-group">
                  <label>كلمة المرور في الهيئة</label>
                  <input
                    type="password"
                    value={formData.eidc_password}
                    onChange={(e) => setFormData({ ...formData, eidc_password: e.target.value })}
                    placeholder="كلمة المرور في الهيئة"
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>شروط العقد</label>
              <textarea
                value={formData.contract_conditions}
                onChange={(e) => setFormData({ ...formData, contract_conditions: e.target.value })}
                placeholder="أدخل شروط العقد هنا..."
                rows={4}
              />
            </div>

            <div className="form-group">
              <label>ملاحظات عن الوكيل</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="ملاحظات"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>الحالة</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'نشط' | 'غير نشط' })}
              >
                <option value="نشط">نشط</option>
                <option value="غير نشط">غير نشط</option>
              </select>
            </div>

            {/* الوثائق المصرح بها */}
            <div className="form-section" style={{ marginTop: '24px', padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
              <h3 className="form-section-title" style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
                الوثائق المصرح بها
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {INSURANCE_TYPES.map((insuranceType) => {
                  const isSelected = formData.authorized_documents.includes(insuranceType);
                  
                  return (
                    <div key={insuranceType} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id={`doc-${insuranceType}`}
                        checked={isSelected}
                        onChange={() => handleDocumentToggle(insuranceType)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label 
                        htmlFor={`doc-${insuranceType}`}
                        style={{ 
                          cursor: 'pointer',
                          color: '#111827',
                          fontSize: '14px'
                        }}
                      >
                        {insuranceType}
                      </label>
                    </div>
                  );
                })}
              </div>

              <h3 className="form-section-title" style={{ marginTop: '24px', marginBottom: '16px', fontSize: '16px', fontWeight: 'bold' }}>
                تقارير وصلاحيات إضافية
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                {REPORT_PERMISSIONS.map((permission) => {
                  const isSelected = formData.authorized_documents.includes(permission);
                  
                  return (
                    <div key={permission} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id={`perm-${permission}`}
                        checked={isSelected}
                        onChange={() => handleDocumentToggle(permission)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label 
                        htmlFor={`perm-${permission}`}
                        style={{ 
                          cursor: 'pointer',
                          color: '#111827',
                          fontSize: '14px'
                        }}
                      >
                        {permission}
                      </label>
                    </div>
                  );
                })}
              </div>

              {/* النسب الخاصة بالوثائق المصرح بها */}
              {formData.authorized_documents.some(doc => INSURANCE_TYPES.includes(doc)) && (
                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600' }}>
                    النسب الخاصة بالوكيل/الفرع (من القسط المقرر)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* عرض "تأمين سيارات" إذا كان "تأمين سيارات إجباري" محدد */}
                    {formData.authorized_documents.includes('تأمين سيارات إجباري') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#f9fafb', borderRadius: '6px' }}>
                        <label style={{ minWidth: '200px', fontSize: '14px' }}>تأمين سيارات:</label>
                        <select
                          value={formData.document_percentages['تأمين سيارات'] || 0}
                          onChange={(e) => handlePercentageChange('تأمين سيارات', parseInt(e.target.value))}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            minWidth: '120px'
                          }}
                        >
                          {Array.from({ length: 81 }, (_, i) => i).map((percent) => (
                            <option key={percent} value={percent}>
                              {percent}%
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {/* عرض باقي الوثائق المصرح بها (عدا "تأمين سيارات إجباري") */}
                    {formData.authorized_documents.filter(doc => doc !== 'تأمين سيارات إجباري' && INSURANCE_TYPES.includes(doc)).map((docType) => (
                      <div key={docType} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#f9fafb', borderRadius: '6px' }}>
                        <label style={{ minWidth: '200px', fontSize: '14px' }}>{docType}:</label>
                        <select
                          value={formData.document_percentages[docType] || 0}
                          onChange={(e) => handlePercentageChange(docType, parseInt(e.target.value))}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px',
                            minWidth: '120px'
                          }}
                        >
                          {Array.from({ length: 81 }, (_, i) => i).map((percent) => (
                            <option key={percent} value={percent}>
                              {percent}%
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" onClick={() => navigate('/branches-agents')} className="btn-cancel">
                إلغاء
              </button>
              <button type="submit" className="btn-submit" disabled={submitting}>
                {submitting ? 'جاري الحفظ...' : 'إنشاء السجل'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
