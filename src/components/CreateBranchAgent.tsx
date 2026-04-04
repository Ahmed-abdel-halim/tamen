import { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';

type Custody = {
  description: string;
  quantity: number;
};

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
];

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
    authorized_documents: [] as string[],
    document_percentages: {} as Record<string, number>,
  });
  const [consumedCustodies, setConsumedCustodies] = useState<Custody[]>([]);
  const [fixedCustodies, setFixedCustodies] = useState<Custody[]>([]);
  const [personalPhoto, setPersonalPhoto] = useState<File | null>(null);
  const [identityPhoto, setIdentityPhoto] = useState<File | null>(null);
  const [contractPhoto, setContractPhoto] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const personalPhotoRef = useRef<HTMLInputElement>(null);
  const identityPhotoRef = useRef<HTMLInputElement>(null);
  const contractPhotoRef = useRef<HTMLInputElement>(null);

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

  const addConsumedCustody = () => {
    setConsumedCustodies([...consumedCustodies, { description: '', quantity: 1 }]);
  };

  const removeConsumedCustody = (index: number) => {
    setConsumedCustodies(consumedCustodies.filter((_, i) => i !== index));
  };

  const updateConsumedCustody = (index: number, field: keyof Custody, value: string | number) => {
    const newCustodies = [...consumedCustodies];
    newCustodies[index] = { ...newCustodies[index], [field]: value };
    setConsumedCustodies(newCustodies);
  };

  const addFixedCustody = () => {
    setFixedCustodies([...fixedCustodies, { description: '', quantity: 1 }]);
  };

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

  const removeFixedCustody = (index: number) => {
    setFixedCustodies(fixedCustodies.filter((_, i) => i !== index));
  };

  const updateFixedCustody = (index: number, field: keyof Custody, value: string | number) => {
    const newCustodies = [...fixedCustodies];
    newCustodies[index] = { ...newCustodies[index], [field]: value };
    setFixedCustodies(newCustodies);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.agency_name.trim()) errors.agency_name = 'اسم الوكالة مطلوب';
    if (!formData.agent_name.trim()) errors.agent_name = 'اسم الوكيل مطلوب';
    if (!formData.contract_date) errors.contract_date = 'تاريخ التعاقد مطلوب';
    if (!formData.city) errors.city = 'المدينة مطلوبة';
    if (formData.national_id && formData.national_id.length !== 12) {
      errors.national_id = 'الرقم الوطني يجب أن يكون 12 رقم بالضبط';
    }
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
      setToast({ message: 'يرجى تصحيح الأخطاء في النموذج', type: 'error' });
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
      if (consumedCustodies.length > 0) {
        formDataToSend.append('consumed_custodies', JSON.stringify(consumedCustodies));
      }
      if (fixedCustodies.length > 0) {
        formDataToSend.append('fixed_custodies', JSON.stringify(fixedCustodies));
      }
      if (personalPhoto) formDataToSend.append('personal_photo', personalPhoto);
      if (identityPhoto) formDataToSend.append('identity_photo', identityPhoto);
      if (contractPhoto) formDataToSend.append('contract_photo', contractPhoto);
      formDataToSend.append('username', formData.username);
      formDataToSend.append('password', formData.password);
      if (formData.notes) formDataToSend.append('notes', formData.notes);
      formDataToSend.append('status', formData.status);
      
      // إرسال الوثائق المصرح بها والنسب (حتى لو كانت فارغة)
      formDataToSend.append('authorized_documents', JSON.stringify(formData.authorized_documents || []));
      formDataToSend.append('document_percentages', JSON.stringify(formData.document_percentages || {}));

      const res = await fetch('/api/branches-agents', {
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
      setToast({ message: 'تم إنشاء السجل بنجاح', type: 'success' });
      setTimeout(() => {
        navigate(`/branches-agents/${branchAgent.id}`);
      }, 1000);
    } catch (error: any) {
      setToast({ message: error.message || 'حدث خطأ أثناء إنشاء السجل', type: 'error' });
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
              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              >
                <option value="">اختر المدينة</option>
                {LIBYAN_CITIES.map((city, index) => (
                  <option key={index} value={city.ar}>
                    {city.ar} - {city.en}
                  </option>
                ))}
              </select>
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
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 12);
                    setFormData({ ...formData, national_id: value });
                  }}
                  placeholder="12 رقم"
                  maxLength={12}
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

            {/* عهد مستهلكة */}
            <div className="payment-section">
              <div className="payment-section-header">
                <h3>عهد مستهلكة</h3>
                <button type="button" onClick={addConsumedCustody} className="btn-submit">
                  <i className="fa-solid fa-plus" style={{ marginLeft: '6px' }}></i>
                  إضافة عهدة
                </button>
              </div>
              {consumedCustodies.map((custody, index) => (
                <div key={index} className="payment-card">
                  <div className="payment-card-header">
                    <strong>عهدة #{index + 1}</strong>
                    <button type="button" onClick={() => removeConsumedCustody(index)} className="btn-cancel" style={{ padding: '5px 10px' }}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                  <div className="payment-card-grid">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>البيان *</label>
                      <input
                        type="text"
                        value={custody.description}
                        onChange={(e) => updateConsumedCustody(index, 'description', e.target.value)}
                        placeholder="البيان"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>العدد *</label>
                      <input
                        type="number"
                        min="1"
                        value={custody.quantity}
                        onChange={(e) => updateConsumedCustody(index, 'quantity', parseInt(e.target.value) || 1)}
                        placeholder="العدد"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* عهد الوكيل الثابتة */}
            <div className="payment-section">
              <div className="payment-section-header">
                <h3>عهد الوكيل الثابتة</h3>
                <button type="button" onClick={addFixedCustody} className="btn-submit">
                  <i className="fa-solid fa-plus" style={{ marginLeft: '6px' }}></i>
                  إضافة عهدة
                </button>
              </div>
              {fixedCustodies.map((custody, index) => (
                <div key={index} className="payment-card">
                  <div className="payment-card-header">
                    <strong>عهدة #{index + 1}</strong>
                    <button type="button" onClick={() => removeFixedCustody(index)} className="btn-cancel" style={{ padding: '5px 10px' }}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </div>
                  <div className="payment-card-grid">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>البيان *</label>
                      <input
                        type="text"
                        value={custody.description}
                        onChange={(e) => updateFixedCustody(index, 'description', e.target.value)}
                        placeholder="البيان"
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label>العدد *</label>
                      <input
                        type="number"
                        min="1"
                        value={custody.quantity}
                        onChange={(e) => updateFixedCustody(index, 'quantity', parseInt(e.target.value) || 1)}
                        placeholder="العدد"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* رفع الصور */}
            <div className="form-grid">
              <div className="form-group">
                <label>صورة شخصية</label>
                <input
                  ref={personalPhotoRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPersonalPhoto(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => personalPhotoRef.current?.click()}
                  className="btn-submit"
                  style={{ width: '100%' }}
                >
                  {personalPhoto ? personalPhoto.name : 'اختر صورة شخصية'}
                </button>
              </div>
              <div className="form-group">
                <label>صورة إثبات الهوية</label>
                <input
                  ref={identityPhotoRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => setIdentityPhoto(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => identityPhotoRef.current?.click()}
                  className="btn-submit"
                  style={{ width: '100%' }}
                >
                  {identityPhoto ? identityPhoto.name : 'اختر صورة إثبات الهوية'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>صورة العقد (غير إجباري)</label>
              <input
                ref={contractPhotoRef}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setContractPhoto(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => contractPhotoRef.current?.click()}
                className="btn-submit"
                style={{ width: '100%' }}
              >
                {contractPhoto ? contractPhoto.name : 'اختر صورة العقد'}
              </button>
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
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="كلمة المرور"
                />
                {formErrors.password && <span className="error-message">{formErrors.password}</span>}
              </div>
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

              {/* النسب الخاصة بالوثائق المصرح بها */}
              {(formData.authorized_documents.length > 0 || (formData.authorized_documents.includes('تأمين سيارات إجباري') && formData.document_percentages['تأمين سيارات'] !== undefined)) && (
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
                    {formData.authorized_documents.filter(doc => doc !== 'تأمين سيارات إجباري').map((docType) => (
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

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i>
            <span>{toast.message}</span>
          </div>
          <button 
            className="toast-close" 
            onClick={() => setToast(null)}
            aria-label="إغلاق"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}
    </section>
  );
}

