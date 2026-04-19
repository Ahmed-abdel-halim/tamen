import { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

// قائمة الجنسيات (جميع دول العالم ما عدا إسرائيل)
const NATIONALITIES = [
  { ar: 'مصري', en: 'Egyptian' },
  { ar: 'سوداني', en: 'Sudanese' },
  { ar: 'ليبي', en: 'Libyan' },
  { ar: 'تونسي', en: 'Tunisian' },
  { ar: 'جزائري', en: 'Algerian' },
  { ar: 'مغربي', en: 'Moroccan' },
  { ar: 'موريتاني', en: 'Mauritanian' },
  { ar: 'صحراوي', en: 'Sahrawi' },
  { ar: 'تشادي', en: 'Chadian' },
  { ar: 'نيجري', en: 'Nigerien' },
  { ar: 'مالي', en: 'Malian' },
  { ar: 'سنغالي', en: 'Senegalese' },
  { ar: 'غامبي', en: 'Gambian' },
  { ar: 'غيني', en: 'Guinean' },
  { ar: 'غيني-بيساوي', en: 'Bissau-Guinean' },
  { ar: 'سيراليوني', en: 'Sierra Leonean' },
  { ar: 'ليبيري', en: 'Liberian' },
  { ar: 'إيفواري (ساحل العاج)', en: 'Ivorian' },
  { ar: 'غاني', en: 'Ghanaian' },
  { ar: 'توغولي', en: 'Togolese' },
  { ar: 'بنيني', en: 'Beninese' },
  { ar: 'نيجيري', en: 'Nigerian' },
  { ar: 'كاميروني', en: 'Cameroonian' },
  { ar: 'كونغولي', en: 'Congolese' },
  { ar: 'كونغولي (جمهورية الكونغو الديمقراطية)', en: 'Congolese (DRC)' },
  { ar: 'أنغولي', en: 'Angolan' },
  { ar: 'زامبي', en: 'Zambian' },
  { ar: 'زيمبابوي', en: 'Zimbabwean' },
  { ar: 'بوتسواني', en: 'Botswanan' },
  { ar: 'ناميبي', en: 'Namibian' },
  { ar: 'ليسوتوي', en: 'Basotho' },
  { ar: 'إسواتيني', en: 'Swazi' },
  { ar: 'مدغشقري', en: 'Malagasy' },
  { ar: 'موريشي', en: 'Mauritian' },
  { ar: 'سيشيلي', en: 'Seychellois' },
  { ar: 'جزر قمري', en: 'Comorian' },
  { ar: 'جيبوتي', en: 'Djiboutian' },
  { ar: 'صومالي', en: 'Somali' },
  { ar: 'إثيوبي', en: 'Ethiopian' },
  { ar: 'إريتري', en: 'Eritrean' },
  { ar: 'جنوب سوداني', en: 'South Sudanese' },
  { ar: 'أوغندي', en: 'Ugandan' },
  { ar: 'كيني', en: 'Kenyan' },
  { ar: 'تنزاني', en: 'Tanzanian' },
  { ar: 'رواندي', en: 'Rwandan' },
  { ar: 'بوروندي', en: 'Burundian' },
  { ar: 'ملاوي', en: 'Malawian' },
  { ar: 'موزمبيقي', en: 'Mozambican' },
  { ar: 'سعودي', en: 'Saudi' },
  { ar: 'كويتي', en: 'Kuwaiti' },
  { ar: 'قطري', en: 'Qatari' },
  { ar: 'بحريني', en: 'Bahraini' },
  { ar: 'إماراتي', en: 'Emirati' },
  { ar: 'عماني', en: 'Omani' },
  { ar: 'يمني', en: 'Yemeni' },
  { ar: 'عراقي', en: 'Iraqi' },
  { ar: 'سوري', en: 'Syrian' },
  { ar: 'لبناني', en: 'Lebanese' },
  { ar: 'أردني', en: 'Jordanian' },
  { ar: 'فلسطيني', en: 'Palestinian' },
  { ar: 'تركي', en: 'Turkish' },
  { ar: 'إيراني', en: 'Iranian' },
  { ar: 'أفغاني', en: 'Afghan' },
  { ar: 'باكستاني', en: 'Pakistani' },
  { ar: 'هندي', en: 'Indian' },
  { ar: 'نيبالي', en: 'Nepali' },
  { ar: 'بنغلاديشي', en: 'Bangladeshi' },
  { ar: 'سريلانكي', en: 'Sri Lankan' },
  { ar: 'بوتاني', en: 'Bhutanese' },
  { ar: 'مالديفي', en: 'Maldivian' },
  { ar: 'صيني', en: 'Chinese' },
  { ar: 'ياباني', en: 'Japanese' },
  { ar: 'كوري جنوبي', en: 'South Korean' },
  { ar: 'كوري شمالي', en: 'North Korean' },
  { ar: 'منغولي', en: 'Mongolian' },
  { ar: 'كازاخستاني', en: 'Kazakh' },
  { ar: 'أوزبكي', en: 'Uzbek' },
  { ar: 'تركماني', en: 'Turkmen' },
  { ar: 'طاجيكي', en: 'Tajik' },
  { ar: 'قيرغيزي', en: 'Kyrgyz' },
  { ar: 'ميانماري', en: 'Burmese' },
  { ar: 'تايلاندي', en: 'Thai' },
  { ar: 'كامبودي', en: 'Cambodian' },
  { ar: 'فيتنامي', en: 'Vietnamese' },
  { ar: 'لاوسي', en: 'Laotian' },
  { ar: 'ماليزاي', en: 'Malaysian' },
  { ar: 'سنغافوري', en: 'Singaporean' },
  { ar: 'إندونيسي', en: 'Indonesian' },
  { ar: 'فلبيني', en: 'Filipino' },
  { ar: 'تيموري', en: 'Timorese' },
  { ar: 'جورجي', en: 'Georgian' },
  { ar: 'أرميني', en: 'Armenian' },
  { ar: 'أذربيجاني', en: 'Azerbaijani' },
  { ar: 'قبرصي', en: 'Cypriot' },
  { ar: 'بريطاني', en: 'British' },
  { ar: 'إنجليزي', en: 'English' },
  { ar: 'إسكتلندي', en: 'Scottish' },
  { ar: 'ويلزي', en: 'Welsh' },
  { ar: 'إيرلندي', en: 'Irish' },
  { ar: 'فرنسي', en: 'French' },
  { ar: 'ألماني', en: 'German' },
  { ar: 'إيطالي', en: 'Italian' },
  { ar: 'إسباني', en: 'Spanish' },
  { ar: 'برتغالي', en: 'Portuguese' },
  { ar: 'هولندي', en: 'Dutch' },
  { ar: 'بلجيكي', en: 'Belgian' },
  { ar: 'لوكسمبورغي', en: 'Luxembourger' },
  { ar: 'نمساوي', en: 'Austrian' },
  { ar: 'سويسري', en: 'Swiss' },
  { ar: 'دنماركي', en: 'Danish' },
  { ar: 'سويدي', en: 'Swedish' },
  { ar: 'نرويجي', en: 'Norwegian' },
  { ar: 'فنلندي', en: 'Finnish' },
  { ar: 'آيسلندي', en: 'Icelandic' },
  { ar: 'بولندي', en: 'Polish' },
  { ar: 'تشيكي', en: 'Czech' },
  { ar: 'سلوفاكي', en: 'Slovak' },
  { ar: 'هنغاري', en: 'Hungarian' },
  { ar: 'روماني', en: 'Romanian' },
  { ar: 'بلغاري', en: 'Bulgarian' },
  { ar: 'صربي', en: 'Serbian' },
  { ar: 'كرواتي', en: 'Croatian' },
  { ar: 'بوسني', en: 'Bosnian' },
  { ar: 'سلوفيني', en: 'Slovenian' },
  { ar: 'مقدوني', en: 'Macedonian' },
  { ar: 'ألباني', en: 'Albanian' },
  { ar: 'يوناني', en: 'Greek' },
  { ar: 'مالطي', en: 'Maltese' },
  { ar: 'ليتواني', en: 'Lithuanian' },
  { ar: 'لاتفي', en: 'Latvian' },
  { ar: 'إستوني', en: 'Estonian' },
  { ar: 'أوكراني', en: 'Ukrainian' },
  { ar: 'روسي', en: 'Russian' },
  { ar: 'بيلاروسي', en: 'Belarusian' },
  { ar: 'مولدوفي', en: 'Moldovan' },
  { ar: 'أمريكي', en: 'American' },
  { ar: 'كندي', en: 'Canadian' },
  { ar: 'مكسيكي', en: 'Mexican' },
  { ar: 'غواتيمالي', en: 'Guatemalan' },
  { ar: 'هندوراسي', en: 'Honduran' },
  { ar: 'سلفادوري', en: 'Salvadoran' },
  { ar: 'نيكاراغوي', en: 'Nicaraguan' },
  { ar: 'كوستاريكي', en: 'Costa Rican' },
  { ar: 'بانامي', en: 'Panamanian' },
  { ar: 'كوبي', en: 'Cuban' },
  { ar: 'دومينيكاني', en: 'Dominican' },
  { ar: 'هايتي', en: 'Haitian' },
  { ar: 'جامايكي', en: 'Jamaican' },
  { ar: 'باهامي', en: 'Bahamian' },
  { ar: 'بربادوسي', en: 'Barbadian' },
  { ar: 'ترينيدادي', en: 'Trinidadian' },
  { ar: 'أنتيغوي', en: 'Antiguan' },
  { ar: 'سانت لوسي', en: 'Saint Lucian' },
  { ar: 'غرينادي', en: 'Grenadian' },
  { ar: 'برازيلي', en: 'Brazilian' },
  { ar: 'أرجنتيني', en: 'Argentine' },
  { ar: 'أوروغواياني', en: 'Uruguayan' },
  { ar: 'باراغوايي', en: 'Paraguayan' },
  { ar: 'تشيلي', en: 'Chilean' },
  { ar: 'بوليفي', en: 'Bolivian' },
  { ar: 'بيروفي', en: 'Peruvian' },
  { ar: 'إكوادوري', en: 'Ecuadorian' },
  { ar: 'سورينامي', en: 'Surinamese' },
  { ar: 'غوياني', en: 'Guyanese' },
  { ar: 'أسترالي', en: 'Australian' },
  { ar: 'نيوزيلندي', en: 'New Zealander' },
  { ar: 'بابواني', en: 'Papuan' },
  { ar: 'فيجياني', en: 'Fijian' },
  { ar: 'سامواني', en: 'Samoan' },
  { ar: 'تونغاني', en: 'Tongan' },
  { ar: 'فانواتي', en: 'Vanuatuan' },
  { ar: 'كيريباتي', en: 'Kiribati' },
  { ar: 'ميكرونيزي', en: 'Micronesian' },
  { ar: 'مارشالي', en: 'Marshallese' },
  { ar: 'ناورووي', en: 'Nauruan' },
  { ar: 'بالاوي', en: 'Palauan' },
  { ar: 'توفالي', en: 'Tuvaluan' },
];

// قائمة المهن (تأمين الحوادث الشخصية)
const ALL_PROFESSIONS = [
  'مهندس',
  'طبيب',
  'عمل حر',
  'صيدلي',
  'مدرس',
  'محاسب',
  'مزارع',
  'سائق',
  'مبرمج',
  'مصمم',
  'محامي',
  'مدرب رياضي',
  'ممرضة',
  'فني كهرباء',
  'فني ميكانيكي',
  'محاسب قانوني',
  'إداري',
  'رائد أعمال',
  'صحفي',
  'كاتب',
  'رسام',
  'موسيقي',
  'مخرج',
  'ممثل',
  'مغني',
  'عامل بناء',
  'خياط',
  'خباز',
  'نجار',
  'مصور فوتوغرافي',
  'مبرمج ويب',
  'مهندس مدني',
  'مهندس ميكانيكي',
  'مهندس كهرباء',
  'طبيب اسنان',
  'جراح',
  'صيدلي مستشفيات',
  'مدرب لياقة',
  'محلل مالي',
  'باحث علمي',
  'طباخ',
  'سائق تاكسي',
  'مزارع عضوي',
  'مطور تطبيقات',
  'مصمم جرافيك',
  'مدير مشروع',
  'فنان تشكيلي',
  'موسيقي محترف',
  'مهندس برمجيات',
  'خبير تسويق',
  'طالب',
];

export default function CreatePersonalAccidentInsurance() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    end_date: '',
    name: '',
    birth_date: '',
    age: 0,
    phone: '',
    id_proof: '',
    address: '',
    workplace: '',
    gender: '',
    nationality: '',
    profession: '',
    claim_authorized_name: '',
    premium: '200.000',
    tax: '2.500',
    stamp: '0.500',
    issue_fees: '10.000',
    supervision_fees: '1.050',
    total: '214.050',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Select2 states
  const [nationalitySearch, setNationalitySearch] = useState("");
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const nationalityDropdownRef = useRef<HTMLDivElement>(null);

  const [professionSearch, setProfessionSearch] = useState("");
  const [showProfessionDropdown, setShowProfessionDropdown] = useState(false);
  const professionDropdownRef = useRef<HTMLDivElement>(null);



  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target as Node)) {
        setShowNationalityDropdown(false);
      }
      if (professionDropdownRef.current && !professionDropdownRef.current.contains(event.target as Node)) {
        setShowProfessionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // حساب نهاية التأمين تلقائياً (بعد سنة من تاريخ الإصدار)
  useEffect(() => {
    const issueDate = new Date();
    const endDate = new Date(issueDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    // تنسيق التاريخ كـ DD/MM/YYYY
    const day = String(endDate.getDate()).padStart(2, '0');
    const month = String(endDate.getMonth() + 1).padStart(2, '0');
    const year = endDate.getFullYear();
    setFormData(prev => ({
      ...prev,
      end_date: `${day}/${month}/${year}`
    }));
  }, []);

  // حساب العمر عند تغيير تاريخ الميلاد
  useEffect(() => {
    if (formData.birth_date) {
      const today = new Date();
      const birthDate = new Date(formData.birth_date);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age >= 0 && age <= 150) {
        setFormData(prev => ({
          ...prev,
          age: age
        }));
      }
    }
  }, [formData.birth_date]);

  // حساب الإجمالي
  useEffect(() => {
    const premium = parseFloat(formData.premium) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const stamp = parseFloat(formData.stamp) || 0;
    const issueFees = parseFloat(formData.issue_fees) || 0;
    const supervisionFees = parseFloat(formData.supervision_fees) || 0;
    const total = premium + tax + stamp + issueFees + supervisionFees;
    setFormData(prev => ({
      ...prev,
      total: total.toFixed(3)
    }));
  }, [formData.premium, formData.tax, formData.stamp, formData.issue_fees, formData.supervision_fees]);

  const filteredNationalities = NATIONALITIES.filter(n =>
    n.ar.toLowerCase().includes(nationalitySearch.toLowerCase()) ||
    n.en.toLowerCase().includes(nationalitySearch.toLowerCase())
  );

  // فلترة المهن بناءً على العمر: إذا كان العمر من 1-18 سنة يظهر "طالب" فقط، وإلا يظهر الباقي
  const availableProfessions = formData.age >= 1 && formData.age <= 18 
    ? ['طالب']
    : ALL_PROFESSIONS.filter(prof => prof !== 'طالب');

  const filteredProfessions = availableProfessions.filter(prof =>
    prof.toLowerCase().includes(professionSearch.toLowerCase())
  );

  const getNationalityDisplay = (nationality: string) => {
    const found = NATIONALITIES.find(n => n.ar === nationality || `${n.ar} ${n.en}` === nationality);
    if (found) {
      return `${found.ar} ${found.en}`;
    }
    return nationality;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.name) {
      errors.name = 'الاسم مطلوب';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (userId) {
        headers['X-User-Id'] = userId.toString();
      }

      const res = await fetch(`${API_BASE_URL}/personal-accident-insurance-documents`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: formData.name,
          birth_date: formData.birth_date || null,
          age: formData.age || null,
          phone: formData.phone || null,
          id_proof: formData.id_proof || null,
          address: formData.address || null,
          workplace: formData.workplace || null,
          gender: formData.gender || null,
          nationality: formData.nationality || null,
          profession: formData.profession || null,
          claim_authorized_name: formData.claim_authorized_name || null,
          premium: parseFloat(formData.premium) || 0,
          tax: parseFloat(formData.tax) || 0,
          stamp: parseFloat(formData.stamp) || 0,
          issue_fees: parseFloat(formData.issue_fees) || 0,
          supervision_fees: parseFloat(formData.supervision_fees) || 0,
          total: parseFloat(formData.total) || 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFormErrors(data.errors);
        }
        throw new Error(data.message || 'حدث خطأ أثناء إنشاء الوثيقة');
      }

      showToast('تم إنشاء الوثيقة بنجاح', 'success');
      setTimeout(() => {
        navigate('/personal-accident-insurance-documents');
      }, 1000);
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء إنشاء الوثيقة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>الإعدادات / تأمين الحوادث الشخصية / إضافة وثيقة</span>
      </div>

      <div className="users-card">
        <div className="form-page-container">
          <div className="form-page-header">
            <h2 className="form-page-title">
              إضافة وثيقة تأمين حوادث شخصية جديدة
            </h2>
            <button 
              className="btn-cancel" 
              onClick={() => navigate('/personal-accident-insurance-documents')}
            >
              <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i>
              العودة للقائمة
            </button>
          </div>

          <form onSubmit={handleSubmit} className="user-form" style={{ maxWidth: '100%' }}>
            {/* بيانات التأمين */}
            <div className="form-sections-container">
              <div className="form-section">
                <h3 className="form-section-title">بيانات التأمين</h3>
                
                <div className="form-group">
                  <label>رقم التأمين</label>
                  <input
                    type="text"
                    value="سيتم توليده تلقائياً"
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>تاريخ الإصدار</label>
                  <input
                    type="text"
                    value={new Date().toLocaleString('ar-LY', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="end_date">نهاية التأمين</label>
                  <input
                    type="text"
                    id="end_date"
                    value={formData.end_date}
                    readOnly
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    (بعد سنة من تاريخ الإصدار)
                  </small>
                </div>
              </div>

              {/* بيانات المسافر */}
              <div className="form-section">
                <h3 className="form-section-title">بيانات المسافر</h3>
                
                <div className="form-group">
                  <label htmlFor="name">الاسم <span className="required">*</span></label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={formErrors.name ? 'error' : ''}
                  />
                  {formErrors.name && <span className="error-message">{formErrors.name}</span>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="birth_date">تاريخ الميلاد</label>
                    <input
                      type="date"
                      id="birth_date"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="age">العمر</label>
                    <input
                      type="number"
                      id="age"
                      value={formData.age || 0}
                      readOnly
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="phone">رقم الهاتف</label>
                    <input
                      type="text"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="id_proof">إثبات شخصي</label>
                    <input
                      type="text"
                      id="id_proof"
                      value={formData.id_proof}
                      onChange={(e) => setFormData({ ...formData, id_proof: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="address">العنوان</label>
                  <input
                    type="text"
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="workplace">مكان العمل</label>
                  <input
                    type="text"
                    id="workplace"
                    value={formData.workplace}
                    onChange={(e) => setFormData({ ...formData, workplace: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gender">الجنس</label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">اختر الجنس...</option>
                    <option value="ذكر Male">ذكر Male</option>
                    <option value="انثى Female">انثى Female</option>
                  </select>
                </div>

                {/* الجنسية - Select2 */}
                <div className="form-group" ref={nationalityDropdownRef} style={{ position: 'relative' }}>
                  <label htmlFor="nationality">الجنسية</label>
                  <div
                    onClick={() => {
                      setShowNationalityDropdown((v) => !v);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: formErrors.nationality ? '1px solid #ef4444' : '1px solid var(--border)',
                      borderRadius: 8,
                      background: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      minHeight: 42,
                    }}
                  >
                    <span style={{ color: formData.nationality ? '#111827' : '#9ca3af' }}>
                      {formData.nationality ? getNationalityDisplay(formData.nationality) : 'اختر الجنسية...'}
                    </span>
                    <i
                      className={`fa-solid fa-chevron-${showNationalityDropdown ? 'up' : 'down'}`}
                      style={{ color: '#9ca3af' }}
                    ></i>
                  </div>
                  {showNationalityDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        marginTop: '4px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        zIndex: 1000,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      }}
                    >
                      <div style={{ padding: '8px' }}>
                        <input
                          type="text"
                          placeholder="ابحث عن جنسية..."
                          value={nationalitySearch}
                          onChange={(e) => setNationalitySearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            marginBottom: '8px',
                          }}
                        />
                      </div>
                      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {filteredNationalities.length === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>
                            لا توجد نتائج
                          </div>
                        ) : (
                          filteredNationalities.map((nat) => {
                            const displayValue = `${nat.ar} ${nat.en}`;
                            return (
                              <div
                                key={displayValue}
                                onClick={() => {
                                  setFormData({ ...formData, nationality: displayValue });
                                  setShowNationalityDropdown(false);
                                  setNationalitySearch('');
                                }}
                                style={{
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f3f4f6',
                                  backgroundColor: formData.nationality === displayValue ? '#f3f4f6' : 'transparent',
                                }}
                                onMouseEnter={(e) => {
                                  if (formData.nationality !== displayValue) {
                                    e.currentTarget.style.backgroundColor = '#f9fafb';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (formData.nationality !== displayValue) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }
                                }}
                              >
                                {displayValue}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                  {formErrors.nationality && <span className="error-message">{formErrors.nationality}</span>}
                </div>

                {/* المهنة - Select2 */}
                <div className="form-group" ref={professionDropdownRef} style={{ position: 'relative' }}>
                  <label htmlFor="profession">المهنة</label>
                  <div
                    onClick={() => {
                      setShowProfessionDropdown((v) => !v);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: formErrors.profession ? '1px solid #ef4444' : '1px solid var(--border)',
                      borderRadius: 8,
                      background: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      minHeight: 42,
                    }}
                  >
                    <span style={{ color: formData.profession ? '#111827' : '#9ca3af' }}>
                      {formData.profession || 'اختر المهنة...'}
                    </span>
                    <i
                      className={`fa-solid fa-chevron-${showProfessionDropdown ? 'up' : 'down'}`}
                      style={{ color: '#9ca3af' }}
                    ></i>
                  </div>
                  {showProfessionDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#fff',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        marginTop: '4px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        zIndex: 1000,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      }}
                    >
                      <div style={{ padding: '8px' }}>
                        <input
                          type="text"
                          placeholder="ابحث عن مهنة..."
                          value={professionSearch}
                          onChange={(e) => setProfessionSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            marginBottom: '8px',
                          }}
                        />
                      </div>
                      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {filteredProfessions.length === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>
                            لا توجد نتائج
                          </div>
                        ) : (
                          filteredProfessions.map((prof) => (
                            <div
                              key={prof}
                              onClick={() => {
                                setFormData({ ...formData, profession: prof });
                                setShowProfessionDropdown(false);
                                setProfessionSearch('');
                              }}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                backgroundColor: formData.profession === prof ? '#f3f4f6' : 'transparent',
                              }}
                              onMouseEnter={(e) => {
                                if (formData.profession !== prof) {
                                  e.currentTarget.style.backgroundColor = '#f9fafb';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (formData.profession !== prof) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              {prof}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  {formErrors.profession && <span className="error-message">{formErrors.profession}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="claim_authorized_name">اسم الموكل للمطالبات</label>
                  <input
                    type="text"
                    id="claim_authorized_name"
                    value={formData.claim_authorized_name}
                    onChange={(e) => setFormData({ ...formData, claim_authorized_name: e.target.value })}
                  />
                </div>
              </div>

              {/* القيمة المالية */}
              <div className="form-section">
                <h3 className="form-section-title">القيمة المالية</h3>
                
                <div className="form-group">
                  <label>القسط المقرر</label>
                  <input
                    type="text"
                    value={formData.premium}
                    readOnly
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>الضريبة</label>
                  <input
                    type="text"
                    value={formData.tax}
                    readOnly
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>الدمغة</label>
                  <input
                    type="text"
                    value={formData.stamp}
                    readOnly
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>مصاريف الإصدار</label>
                  <input
                    type="text"
                    value={formData.issue_fees}
                    readOnly
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>رسوم الإشراف</label>
                  <input
                    type="text"
                    value={formData.supervision_fees}
                    readOnly
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>الإجمالي</label>
                  <input
                    type="text"
                    value={`${formData.total} دينار`}
                    readOnly
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280', fontWeight: 'bold' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button
                type="submit"
                disabled={submitting}
                className="btn-submit"
              >
                {submitting ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/personal-accident-insurance-documents')}
                disabled={submitting}
                className="btn-cancel"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      </div>

    </section>
  );
}

