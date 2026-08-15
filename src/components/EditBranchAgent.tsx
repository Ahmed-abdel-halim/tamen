import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL, BACKEND_URL } from "../config/api";
import SearchableSelect from "./SearchableSelect";



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

export default function EditBranchAgent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [formData, setFormData] = useState({
    type: 'وكيل' as 'وكيل' | 'فرع من شركة',
    agency_name: '',
    agent_name: '',
    activity: '',
    agency_number: '',
    stamp_number: '',
    contract_date: new Date().toISOString().split('T')[0],
    renewal_date: '',
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
    status: 'نشط' as 'نشط' | 'غير نشط' | 'قيد الانتظار',
    contract_conditions: '',
    authorized_documents: [] as string[],
    requested_documents: [] as string[],
    document_percentages: {} as any,
    eidc_username: '',
    eidc_password: '',
    lifo_username: '',
    lifo_password: '',
    lifo_office_id: '',
  });

  const [lifoOffices, setLifoOffices] = useState<{ id: string; name: string }[]>([]);

  const [personalPhoto, setPersonalPhoto] = useState<File | null>(null);
  const [officeFacadePhoto, setOfficeFacadePhoto] = useState<File | null>(null);
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
  const [existingPersonalPhoto, setExistingPersonalPhoto] = useState<string | null>(null);
  const [existingOfficeFacadePhoto, setExistingOfficeFacadePhoto] = useState<string | null>(null);
  const [existingIdentityPhoto, setExistingIdentityPhoto] = useState<string | null>(null);
  const [existingNationalIdPhoto, setExistingNationalIdPhoto] = useState<string | null>(null);
  const [existingContractPhoto, setExistingContractPhoto] = useState<string | null>(null);
  const [existingPassportPhoto, setExistingPassportPhoto] = useState<string | null>(null);
  const [existingClearanceCertificate, setExistingClearanceCertificate] = useState<string | null>(null);
  const [existingNonBankruptcyCertificate, setExistingNonBankruptcyCertificate] = useState<string | null>(null);
  const [existingExperienceCertificate, setExistingExperienceCertificate] = useState<string | null>(null);
  const [existingNonEmploymentCertificate, setExistingNonEmploymentCertificate] = useState<string | null>(null);
  const [existingTbHealthCertificate, setExistingTbHealthCertificate] = useState<string | null>(null);
  const [existingAcademicQualification, setExistingAcademicQualification] = useState<string | null>(null);
  const [existingActivityLicense, setExistingActivityLicense] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isCustomCity, setIsCustomCity] = useState(false);
  const personalPhotoRef = useRef<HTMLInputElement>(null);
  const officeFacadePhotoRef = useRef<HTMLInputElement>(null);
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

  // الحالات الخاصة بالنسب الاستثنائية الشهرية للعمولات
  const [overrideYear, setOverrideYear] = useState<string>(new Date().getFullYear().toString());
  const [overrideMonth, setOverrideMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [overrideDocType, setOverrideDocType] = useState<string>('');
  const [overridePercentage, setOverridePercentage] = useState<number>(0);

  // الحالات الخاصة بالنسب الاستثنائية حسب الفترة (من تاريخ إلى تاريخ)
  const [periodStartDate, setPeriodStartDate] = useState<string>('');
  const [periodEndDate, setPeriodEndDate] = useState<string>('');
  const [periodDocType, setPeriodDocType] = useState<string>('');
  const [periodPercentage, setPeriodPercentage] = useState<number>(0);

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
    if (id) {
      fetchBranchAgent(parseInt(id));
    }
  }, [id]);

  useEffect(() => {
    if (formData.contract_date && formData.contract_end_date) {
      const duration = calculateContractDuration(formData.contract_date, formData.contract_end_date);
      if (duration) {
        setFormData(prev => ({ ...prev, contract_duration: duration }));
      }
    }
  }, [formData.contract_date, formData.contract_end_date]);

  useEffect(() => {
    const fetchLifoOffices = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/lifo-prod/api/offices/all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            user_name: 'adminmli',
            pass_word: '20232024'
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.code === 1 && Array.isArray(data.data)) {
            setLifoOffices(data.data.map((o: any) => ({
              id: o.id.toString(),
              name: o.name
            })));
          }
        }
      } catch (e) {
        console.error('Error fetching LIFO offices:', e);
      }
    };
    fetchLifoOffices();
  }, []);

  const fetchBranchAgent = async (branchAgentId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/branches-agents/${branchAgentId}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) {
        let errorMessage = 'فشل جلب البيانات';
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await res.json();
            errorMessage = error.message || error.error || errorMessage;
          }
        } catch (e) {
          // Error parsing response
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      let parsedPct: any = data.document_percentages;
      if (typeof parsedPct === 'string') {
        try { parsedPct = JSON.parse(parsedPct); } catch (e) { parsedPct = {}; }
      }
      if (!parsedPct || typeof parsedPct !== 'object' || Array.isArray(parsedPct)) {
        parsedPct = {};
      }
      if (parsedPct.default === undefined && parsedPct.monthly_overrides === undefined && parsedPct.period_overrides === undefined) {
        parsedPct = {
          default: parsedPct,
          monthly_overrides: {},
          period_overrides: []
        };
      } else {
        parsedPct = {
          default: parsedPct.default || {},
          monthly_overrides: parsedPct.monthly_overrides || {},
          period_overrides: Array.isArray(parsedPct.period_overrides) ? parsedPct.period_overrides : []
        };
      }

      setFormData({
        type: data.type,
        agency_name: data.agency_name || '',
        agent_name: data.agent_name || '',
        activity: data.activity || '',
        agency_number: data.agency_number || '',
        stamp_number: data.stamp_number || '',
        contract_date: data.contract_date ? new Date(data.contract_date).toISOString().split('T')[0] : '',
        renewal_date: data.renewal_date ? new Date(data.renewal_date).toISOString().split('T')[0] : '',
        contract_end_date: data.contract_end_date ? new Date(data.contract_end_date).toISOString().split('T')[0] : '',
        contract_duration: data.contract_duration || '',
        city: data.city || '',
        address: data.address || '',
        phone: data.phone || '',
        office_phone: data.office_phone || '',
        office_location: data.office_location || '',
        nationality: data.nationality || '',
        national_id: data.national_id || '',
        identity_number: data.identity_number || '',
        username: data.user?.username || '',
        password: '',
        notes: data.notes || '',
        status: data.status || 'نشط',
        contract_conditions: data.contract_conditions || DEFAULT_CONTRACT_TERMS,
        authorized_documents: (data.authorized_documents && data.authorized_documents.length > 0) 
          ? data.authorized_documents 
          : (data.status === 'قيد الانتظار' ? (data.requested_documents || []) : []),
        requested_documents: data.requested_documents || [],
        document_percentages: parsedPct,
        eidc_username: data.user?.eidc_username || '',
        eidc_password: data.user?.eidc_password || '',
        lifo_username: data.user?.lifo_username || '',
        lifo_password: data.user?.lifo_password || '',
        lifo_office_id: data.user?.lifo_office_id || '',
      });

      if (data.city && !LIBYAN_CITIES.some(c => c.ar === data.city)) {
        setIsCustomCity(true);
      } else {
        setIsCustomCity(false);
      }

      setExistingPersonalPhoto(data.personal_photo || null);
      setExistingOfficeFacadePhoto(data.office_facade_photo || null);
      setExistingIdentityPhoto(data.identity_photo || null);
      setExistingNationalIdPhoto(data.national_id_photo || null);
      setExistingContractPhoto(data.contract_photo || null);
      setExistingPassportPhoto(data.passport_photo || null);
      setExistingClearanceCertificate(data.clearance_certificate || null);
      setExistingNonBankruptcyCertificate(data.non_bankruptcy_certificate || null);
      setExistingExperienceCertificate(data.experience_certificate || null);
      setExistingNonEmploymentCertificate(data.non_employment_certificate || null);
      setExistingTbHealthCertificate(data.tb_health_certificate || null);
      setExistingAcademicQualification(data.academic_qualification || null);
      setExistingActivityLicense(data.activity_license || null);
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء جلب البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentToggle = (documentType: string) => {
    const isSelected = formData.authorized_documents.includes(documentType);
    if (isSelected) {
      // إزالة الوثيقة
      setFormData(prev => {
        const pct: any = prev.document_percentages || {};
        const defaultPct = pct.default || (pct.monthly_overrides || pct.period_overrides ? {} : pct);
        const monthlyPct = pct.monthly_overrides || {};
        const periodPct = Array.isArray(pct.period_overrides) ? pct.period_overrides : [];

        const defaultFiltered = Object.fromEntries(
          Object.entries(defaultPct).filter(([key]) => key !== documentType && (documentType !== 'تأمين سيارات إجباري' || key !== 'تأمين سيارات'))
        );

        return {
          ...prev,
          authorized_documents: prev.authorized_documents.filter(d => d !== documentType),
          document_percentages: {
            default: defaultFiltered,
            monthly_overrides: monthlyPct,
            period_overrides: periodPct
          }
        } as any;
      });
    } else {
      // إضافة الوثيقة
      setFormData(prev => {
        const pct: any = prev.document_percentages || {};
        const defaultPct = pct.default || (pct.monthly_overrides || pct.period_overrides ? {} : pct);
        const monthlyPct = pct.monthly_overrides || {};
        const periodPct = Array.isArray(pct.period_overrides) ? pct.period_overrides : [];

        return {
          ...prev,
          authorized_documents: [...prev.authorized_documents, documentType],
          document_percentages: {
            default: {
              ...defaultPct,
              [documentType]: 0,
              ...(documentType === 'تأمين سيارات إجباري' ? { 'تأمين سيارات': (defaultPct['تأمين سيارات'] || 0) } : {})
            },
            monthly_overrides: monthlyPct,
            period_overrides: periodPct
          }
        } as any;
      });
    }
  };

  const handlePercentageChange = (documentType: string, percentage: number) => {
    setFormData(prev => {
      const currentPct: any = prev.document_percentages || {};
      const defaultPct = currentPct.default || (currentPct.monthly_overrides || currentPct.period_overrides ? {} : currentPct);
      const monthlyPct = currentPct.monthly_overrides || {};
      const periodPct = Array.isArray(currentPct.period_overrides) ? currentPct.period_overrides : [];

      return {
        ...prev,
        document_percentages: {
          default: {
            ...defaultPct,
            [documentType]: percentage
          },
          monthly_overrides: monthlyPct,
          period_overrides: periodPct
        }
      } as any;
    });
  };

  const getDefaultPercentageValue = (documentType: string): number => {
    const pct: any = formData.document_percentages || {};
    if (pct.default !== undefined) {
      return pct.default[documentType] || 0;
    }
    return pct[documentType] || 0; // Fallback to flat format
  };

  const handleAddMonthlyOverride = () => {
    if (!overrideDocType) {
      showToast('يرجى اختيار نوع التأمين', 'error');
      return;
    }
    const monthKey = `${overrideYear}-${overrideMonth}`; // e.g. "2026-05"
    
    setFormData(prev => {
      const pct: any = prev.document_percentages || {};
      const defaultPct = pct.default || (pct.monthly_overrides || pct.period_overrides ? {} : pct);
      const monthlyPct = JSON.parse(JSON.stringify(pct.monthly_overrides || {}));
      const periodPct = Array.isArray(pct.period_overrides) ? pct.period_overrides : [];
      
      if (!monthlyPct[monthKey]) {
        monthlyPct[monthKey] = {};
      }
      
      monthlyPct[monthKey][overrideDocType] = overridePercentage;
      
      return {
        ...prev,
        document_percentages: {
          default: defaultPct,
          monthly_overrides: monthlyPct,
          period_overrides: periodPct
        }
      } as any;
    });
    
    setOverrideDocType('');
    setOverridePercentage(0);
    showToast(`تمت إضافة نسبة استثنائية لـ ${overrideDocType} في شهر ${overrideMonth}/${overrideYear} (يُرجى الضغط على زر "تحديث بيانات الوكيل" بالأسفل لحفظ التغييرات)`, 'success');
  };

  const handleRemoveMonthlyOverride = (monthKey: string, docType: string) => {
    setFormData(prev => {
      const pct: any = prev.document_percentages || {};
      const defaultPct = pct.default || (pct.monthly_overrides || pct.period_overrides ? {} : pct);
      const monthlyPct = JSON.parse(JSON.stringify(pct.monthly_overrides || {}));
      const periodPct = Array.isArray(pct.period_overrides) ? pct.period_overrides : [];
      
      if (monthlyPct[monthKey]) {
        delete monthlyPct[monthKey][docType];
        if (Object.keys(monthlyPct[monthKey]).length === 0) {
          delete monthlyPct[monthKey];
        }
      }
      
      return {
        ...prev,
        document_percentages: {
          default: defaultPct,
          monthly_overrides: monthlyPct,
          period_overrides: periodPct
        }
      } as any;
    });
  };

  const getMonthlyOverridesList = () => {
    const pct: any = formData.document_percentages || {};
    const monthlyPct = pct.monthly_overrides || {};
    const list: Array<{ monthKey: string; docType: string; percentage: number }> = [];
    
    Object.entries(monthlyPct).forEach(([monthKey, docs]: [string, any]) => {
      if (docs && typeof docs === 'object') {
        Object.entries(docs).forEach(([docType, percentage]: [string, any]) => {
          list.push({ monthKey, docType, percentage: Number(percentage) });
        });
      }
    });
    
    list.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    return list;
  };

  const handleAddPeriodOverride = () => {
    if (!periodStartDate || !periodEndDate) {
      showToast('يرجى تحديد تاريخ البداية وتاريخ النهاية للفترة', 'error');
      return;
    }
    if (!periodDocType) {
      showToast('يرجى اختيار نوع التأمين', 'error');
      return;
    }
    if (periodStartDate > periodEndDate) {
      showToast('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية', 'error');
      return;
    }

    setFormData(prev => {
      const pct: any = prev.document_percentages || {};
      const defaultPct = pct.default || (pct.monthly_overrides || pct.period_overrides ? {} : pct);
      const monthlyPct = pct.monthly_overrides || {};
      const periodPct = Array.isArray(pct.period_overrides) ? [...pct.period_overrides] : [];

      periodPct.push({
        id: Date.now().toString(),
        start_date: periodStartDate,
        end_date: periodEndDate,
        doc_type: periodDocType,
        percentage: periodPercentage
      });

      return {
        ...prev,
        document_percentages: {
          default: defaultPct,
          monthly_overrides: monthlyPct,
          period_overrides: periodPct
        }
      } as any;
    });

    setPeriodStartDate('');
    setPeriodEndDate('');
    setPeriodDocType('');
    setPeriodPercentage(0);

    showToast(`تمت إضافة نسبة استثنائية للفترة (${periodStartDate} إلى ${periodEndDate}) (يُرجى الضغط على زر "تحديث بيانات الوكيل" بالأسفل لحفظ التغييرات)`, 'success');
  };

  const handleRemovePeriodOverride = (id: string) => {
    setFormData(prev => {
      const pct: any = prev.document_percentages || {};
      const defaultPct = pct.default || (pct.monthly_overrides || pct.period_overrides ? {} : pct);
      const monthlyPct = pct.monthly_overrides || {};
      const periodPct = (Array.isArray(pct.period_overrides) ? pct.period_overrides : []).filter((item: any) => item.id !== id);

      return {
        ...prev,
        document_percentages: {
          default: defaultPct,
          monthly_overrides: monthlyPct,
          period_overrides: periodPct
        }
      } as any;
    });
  };

  const getPeriodOverridesList = () => {
    const pct: any = formData.document_percentages || {};
    return (pct.period_overrides || []) as Array<{ id: string; start_date: string; end_date: string; doc_type: string; percentage: number }>;
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.agency_name.trim()) errors.agency_name = 'اسم الوكالة مطلوب';
    if (!formData.agent_name.trim()) errors.agent_name = 'اسم الوكيل مطلوب';
    if (!formData.contract_date) errors.contract_date = 'تاريخ التعاقد مطلوب';
    if (!formData.city) errors.city = 'المدينة مطلوبة';

    if (!formData.username.trim()) errors.username = 'اسم المستخدم مطلوب';
    if (formData.password && formData.password.length < 6) {
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
      if (formData.renewal_date) formDataToSend.append('renewal_date', formData.renewal_date);
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

      if (personalPhoto) formDataToSend.append('personal_photo', personalPhoto);
      if (officeFacadePhoto) formDataToSend.append('office_facade_photo', officeFacadePhoto);
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
      if (formData.password) formDataToSend.append('password', formData.password);
      if (formData.notes) formDataToSend.append('notes', formData.notes);
      formDataToSend.append('contract_conditions', formData.contract_conditions || '');
      formDataToSend.append('status', formData.status);

      // إرسال الوثائق المصرح بها والنسب (حتى لو كانت فارغة)
      const authorizedDocsJson = JSON.stringify(formData.authorized_documents || []);
      const percentagesJson = JSON.stringify(formData.document_percentages || {});

      formDataToSend.append('authorized_documents', authorizedDocsJson);
      formDataToSend.append('document_percentages', percentagesJson);
      if (formData.eidc_username) formDataToSend.append('eidc_username', formData.eidc_username);
      if (formData.eidc_password) formDataToSend.append('eidc_password', formData.eidc_password);
      if (formData.lifo_username) formDataToSend.append('lifo_username', formData.lifo_username);
      if (formData.lifo_password) formDataToSend.append('lifo_password', formData.lifo_password);
      if (formData.lifo_office_id) formDataToSend.append('lifo_office_id', formData.lifo_office_id);
      formDataToSend.append('_method', 'PUT');

      const res = await fetch(`${API_BASE_URL}/branches-agents/${id}`, {
        method: 'POST',
        body: formDataToSend,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!res.ok) {
        let errorMessage = 'حدث خطأ';
        try {
          const error = await res.json();
          errorMessage = error.message || error.error || errorMessage;
        } catch (e) {
          errorMessage = `خطأ ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const updatedData = await res.json();

      // تحديث localStorage إذا كان المستخدم المحدث هو نفسه المستخدم الحالي
      try {
        const currentUserStr = localStorage.getItem('user');
        if (currentUserStr && updatedData && updatedData.user) {
          const currentUser = JSON.parse(currentUserStr);
          const updatedUserId = updatedData.user.id;

          // التحقق من أن المستخدم المحدث هو نفسه المستخدم الحالي
          if (updatedUserId && updatedUserId === currentUser.id) {
            // جلب البيانات المحدثة من الخادم
            const refreshRes = await fetch(`${API_BASE_URL}/user/${updatedUserId}/refresh`, {
              headers: { 'Accept': 'application/json' },
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData && refreshData.user) {
                // تحديث localStorage بالبيانات المحدثة
                localStorage.setItem('user', JSON.stringify(refreshData.user));
                // إرسال event لتحديث الصلاحيات في App.tsx
                window.dispatchEvent(new Event('userPermissionsUpdated'));
              }
            }
          }
        }
      } catch (e) {
        // لا نوقف العملية إذا فشل تحديث localStorage
      }

      showToast('تم تحديث السجل بنجاح', 'success');
      setTimeout(() => {
        navigate(`/branches-agents/${id}`);
      }, 1000);
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء تحديث السجل', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="users-management">
        <div className="users-breadcrumb">
          <span>إدارة الفروع والوكلاء / تعديل</span>
        </div>
        <div className="users-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>جار التحميل...</p>
        </div>
      </section>
    );
  }

  const TABS = [
    { icon: 'fa-solid fa-building', label: 'البيانات الرئيسية', shortLabel: 'الرئيسية' },
    { icon: 'fa-solid fa-file-signature', label: 'التعاقد والعقد', shortLabel: 'العقد' },
    { icon: 'fa-solid fa-folder-open', label: 'المستندات الثبوتية', shortLabel: 'المستندات' },
    { icon: 'fa-solid fa-shield-halved', label: 'الوثائق والنسب', shortLabel: 'الوثائق' },
    { icon: 'fa-solid fa-user-lock', label: 'دخول المنظومة', shortLabel: 'الدخول' },
  ];

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span onClick={() => navigate('/branches-agents')} className="breadcrumb-link">
          الفروع والوكلاء
        </span>
        <span> / </span>
        <span>تعديل</span>
      </div>

      <div className="users-card">
        <div className="edit-agent-wrapper">
          <form onSubmit={handleSubmit}>

            {/* ===== TAB NAVIGATION BAR ===== */}
            <div className="edit-agent-tabs">
              {TABS.map((tab, index) => (
                <button
                  key={index}
                  type="button"
                  className={`edit-agent-tab ${activeTab === index ? 'active' : ''}`}
                  onClick={() => setActiveTab(index)}
                >
                  <span className="edit-agent-tab-icon">
                    <i className={tab.icon}></i>
                  </span>
                  <span className="edit-agent-tab-label">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* ===== TAB 1: البيانات الرئيسية للوكالة/الفرع ===== */}
            {activeTab === 0 && (
              <div className="edit-agent-panel" key="tab-0">
                {/* Header */}
                <div className="edit-agent-section-header">
                  <div className="edit-agent-section-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                    <i className="fa-solid fa-building"></i>
                  </div>
                  <div>
                    <h3 className="edit-agent-section-title">البيانات الرئيسية للوكالة / الفرع</h3>
                    <p className="edit-agent-section-subtitle">بيانات الوكالة الأساسية والموقع</p>
                  </div>
                </div>

                <div className="edit-agent-grid">
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
                    <label>الجنسية</label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder="الجنسية"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>العنوان</label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="العنوان"
                      rows={1}
                      style={{ minHeight: '45px' }}
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>لوكيشن المكتب (رابط خرائط جوجل)</label>
                    <input
                      type="text"
                      value={formData.office_location}
                      onChange={(e) => setFormData({ ...formData, office_location: e.target.value })}
                      placeholder="رابط الموقع الجغرافي"
                    />
                  </div>
                </div>

                {/* بيانات الوكيل الشخصية */}
                <div className="edit-agent-subsection">
                  <h4 className="edit-agent-subsection-title">
                    <i className="fa-solid fa-id-card" style={{ color: '#8b5cf6' }}></i>
                    بيانات الوكيل الشخصية
                  </h4>
                  <div className="edit-agent-grid">
                    <div className="form-group">
                      <label>الرقم الوطني / رقم إثبات الشخصية</label>
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

                    <div className="form-group">
                      <label>رقم الهاتف الشخصي</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="رقم الهاتف الشخصي"
                      />
                    </div>

                    <div className="form-group">
                      <label>رقم هاتف الوكالة</label>
                      <input
                        type="text"
                        value={formData.office_phone}
                        onChange={(e) => setFormData({ ...formData, office_phone: e.target.value })}
                        placeholder="رقم هاتف الوكالة"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ===== TAB 2: بيانات التعاقد والعقد ===== */}
            {activeTab === 1 && (
              <div className="edit-agent-panel" key="tab-1">
                <div className="edit-agent-section-header">
                  <div className="edit-agent-section-icon" style={{ background: '#f0fdf4', color: '#10b981' }}>
                    <i className="fa-solid fa-file-signature"></i>
                  </div>
                  <div>
                    <h3 className="edit-agent-section-title">بيانات التعاقد والعقد</h3>
                    <p className="edit-agent-section-subtitle">تفاصيل العقد والتواريخ وشروط التعاقد</p>
                  </div>
                </div>

                <div className="edit-agent-grid">
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
                    <label>تاريخ التجديد</label>
                    <input
                      type="date"
                      value={formData.renewal_date}
                      onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>تاريخ انتهاء العقد</label>
                    <input
                      type="date"
                      value={formData.contract_end_date}
                      onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                    />
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
                </div>

                {/* شروط العقد */}
                <div className="edit-agent-subsection">
                  <h4 className="edit-agent-subsection-title">
                    <i className="fa-solid fa-scroll" style={{ color: '#10b981' }}></i>
                    شروط العقد
                  </h4>
                  <div className="form-group">
                    <textarea
                      value={formData.contract_conditions}
                      onChange={(e) => setFormData({ ...formData, contract_conditions: e.target.value })}
                      placeholder="أدخل شروط العقد هنا..."
                      rows={5}
                    />
                  </div>
                </div>

                {/* الحالة */}
                <div className="edit-agent-subsection">
                  <h4 className="edit-agent-subsection-title">
                    <i className="fa-solid fa-toggle-on" style={{ color: '#f59e0b' }}></i>
                    حالة الوكالة
                  </h4>
                  <div className="edit-agent-grid">
                    <div className="form-group">
                      <label>الحالة</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as 'نشط' | 'غير نشط' })}
                      >
                        <option value="نشط">وكالة نشطة</option>
                        <option value="غير نشط">وكالة ملغية</option>
                        {formData.status === 'قيد الانتظار' && <option value="قيد الانتظار">قيد الانتظار</option>}
                      </select>
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', paddingTop: '24px' }}>
                      <span className={`agent-status-badge ${formData.status === 'نشط' ? 'active' : formData.status === 'قيد الانتظار' ? 'pending' : 'cancelled'}`}>
                        <i className={`fa-solid ${formData.status === 'نشط' ? 'fa-circle-check' : formData.status === 'قيد الانتظار' ? 'fa-clock' : 'fa-circle-xmark'}`}></i>
                        {formData.status === 'نشط' ? 'وكالة نشطة' : formData.status === 'قيد الانتظار' ? 'قيد الانتظار' : 'وكالة ملغية'}
                      </span>
                    </div>
                  </div>

                  {/* عرض تاريخ الإلغاء عند اختيار غير نشط */}
                  {formData.status === 'غير نشط' && formData.contract_end_date && (
                    <div className="agent-cancellation-info">
                      <i className="fa-solid fa-calendar-xmark"></i>
                      وكالة ملغية بتاريخ: {formData.contract_end_date}
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label>ملاحظات عن الوكيل</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="ملاحظات"
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ===== TAB 3: المستندات والأوراق الثبوتية ===== */}
            {activeTab === 2 && (
              <div className="edit-agent-panel" key="tab-2">
                <div className="edit-agent-section-header">
                  <div className="edit-agent-section-icon" style={{ background: '#f0fdfa', color: '#14b8a6' }}>
                    <i className="fa-solid fa-folder-open"></i>
                  </div>
                  <div>
                    <h3 className="edit-agent-section-title">المستندات والأوراق الثبوتية للوكيل</h3>
                    <p className="edit-agent-section-subtitle">الصور والشهادات والمستندات الرسمية</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                  {[
                    { ref: personalPhotoRef, newFile: personalPhoto, setter: setPersonalPhoto, existing: existingPersonalPhoto, label: 'صورة شخصية', icon: 'fa-user' },
                    { ref: officeFacadePhotoRef, newFile: officeFacadePhoto, setter: setOfficeFacadePhoto, existing: existingOfficeFacadePhoto, label: 'صورة واجهة المكتب', icon: 'fa-store' },
                    { ref: identityPhotoRef, newFile: identityPhoto, setter: setIdentityPhoto, existing: existingIdentityPhoto, label: 'صورة إثبات الهوية', icon: 'fa-id-card' },
                    { ref: nationalIdPhotoRef, newFile: nationalIdPhoto, setter: setNationalIdPhoto, existing: existingNationalIdPhoto, label: 'صورة الرقم الوطني', icon: 'fa-hashtag' },
                    { ref: contractPhotoRef, newFile: contractPhoto, setter: setContractPhoto, existing: existingContractPhoto, label: 'صورة العقد', icon: 'fa-file-contract' },
                    { ref: passportPhotoRef, newFile: passportPhoto, setter: setPassportPhoto, existing: existingPassportPhoto, label: 'جواز السفر', icon: 'fa-passport' },
                    { ref: clearanceCertificateRef, newFile: clearanceCertificate, setter: setClearanceCertificate, existing: existingClearanceCertificate, label: 'شهادة البراءة', icon: 'fa-certificate' },
                    { ref: nonBankruptcyCertificateRef, newFile: nonBankruptcyCertificate, setter: setNonBankruptcyCertificate, existing: existingNonBankruptcyCertificate, label: 'شهادة عدم الإفلاس', icon: 'fa-file-shield' },
                    { ref: experienceCertificateRef, newFile: experienceCertificate, setter: setExperienceCertificate, existing: existingExperienceCertificate, label: 'شهادة خبرة', icon: 'fa-award' },
                    { ref: nonEmploymentCertificateRef, newFile: nonEmploymentCertificate, setter: setNonEmploymentCertificate, existing: existingNonEmploymentCertificate, label: 'شهادة عدم عمل', icon: 'fa-file-circle-check' },
                    { ref: tbHealthCertificateRef, newFile: tbHealthCertificate, setter: setTbHealthCertificate, existing: existingTbHealthCertificate, label: 'شهادة صحية الدرن', icon: 'fa-heart-pulse' },
                    { ref: academicQualificationRef, newFile: academicQualification, setter: setAcademicQualification, existing: existingAcademicQualification, label: 'المؤهل العلمي', icon: 'fa-graduation-cap' },
                    { ref: activityLicenseRef, newFile: activityLicense, setter: setActivityLicense, existing: existingActivityLicense, label: 'إذن مزاولة نشاط', icon: 'fa-stamp' },
                  ].map((doc, idx) => (
                    <div key={idx} style={{ 
                      border: doc.newFile ? '2px solid #3b82f6' : doc.existing ? '2px solid #10b981' : '2px dashed #cbd5e1', 
                      borderRadius: '14px', 
                      padding: '16px', 
                      background: doc.newFile ? '#eff6ff' : doc.existing ? '#f0fdf4' : 'var(--panel, #ffffff)',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <i className={`fa-solid ${(doc as any).icon}`} style={{ fontSize: '22px', color: doc.newFile ? '#3b82f6' : doc.existing ? '#10b981' : '#94a3b8' }}></i>
                        <label style={{ margin: 0, fontWeight: 700, fontSize: '12px', color: 'var(--text)' }}>{doc.label}</label>
                      </div>
                      
                      {doc.existing && !doc.newFile && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          {doc.existing.match(/\.(pdf|doc|docx)$/i) ? (
                            <a
                              href={`${BACKEND_URL}/storage/${doc.existing}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#2563eb', fontSize: '0.8rem', textDecoration: 'none', background: '#fff' }}
                            >
                              <i className="fa-solid fa-file-pdf" style={{ color: '#ef4444', fontSize: '14px' }}></i>
                              عرض الملف
                            </a>
                          ) : (
                            <img
                              src={`${BACKEND_URL}/storage/${doc.existing}`}
                              alt={doc.label}
                              style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            />
                          )}
                        </div>
                      )}

                      <input
                        ref={doc.ref}
                        type="file"
                        accept="image/*,.pdf,.doc,.docx"
                        onChange={(e) => doc.setter(e.target.files?.[0] || null)}
                        style={{ display: 'none' }}
                      />
                      
                      <button
                        type="button"
                        onClick={() => doc.ref.current?.click()}
                        style={{ 
                          width: '100%', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px', 
                          padding: '8px',
                          borderRadius: '8px',
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          boxShadow: 'none',
                          border: '1px solid',
                          borderColor: doc.newFile ? '#3b82f6' : doc.existing ? '#10b981' : '#cbd5e1',
                          background: doc.newFile ? '#3b82f6' : 'transparent',
                          color: doc.newFile ? '#ffffff' : doc.existing ? '#10b981' : '#374151',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontFamily: 'inherit'
                        }}
                      >
                        <i className={`fa-solid ${doc.newFile ? 'fa-circle-check' : doc.existing ? 'fa-arrows-rotate' : 'fa-upload'}`}></i>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.newFile ? doc.newFile.name : doc.existing ? 'تغيير' : 'اختر ملف'}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== TAB 4: الوثائق المصرح بها والنسب ===== */}
            {activeTab === 3 && (
              <div className="edit-agent-panel" key="tab-3">
                <div className="edit-agent-section-header">
                  <div className="edit-agent-section-icon" style={{ background: '#eff6ff', color: '#0ea5e9' }}>
                    <i className="fa-solid fa-shield-halved"></i>
                  </div>
                  <div>
                    <h3 className="edit-agent-section-title">الوثائق المصرح بها والنسب</h3>
                    <p className="edit-agent-section-subtitle">أنواع التأمين المصرح بها ونسب العمولة</p>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  {INSURANCE_TYPES.map((insuranceType) => {
                    const isSelected = formData.authorized_documents.includes(insuranceType);

                    return (
                      <div key={insuranceType} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          id={`doc-edit-${insuranceType}`}
                          checked={isSelected}
                          onChange={() => handleDocumentToggle(insuranceType)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label
                          htmlFor={`doc-edit-${insuranceType}`}
                          style={{
                            cursor: 'pointer',
                            color: '#111827',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          {insuranceType}
                          {formData.requested_documents.includes(insuranceType) && (
                            <span style={{ fontSize: '10px', background: '#fef3c7', color: '#92400e', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>مطلوب</span>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>

                <h3 className="edit-agent-subsection-title" style={{ marginTop: '24px' }}>
                  <i className="fa-solid fa-key" style={{ color: '#f59e0b' }}></i>
                  تقارير وصلاحيات إضافية
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                  {REPORT_PERMISSIONS.map((permission) => {
                    const isSelected = formData.authorized_documents.includes(permission);

                    return (
                      <div key={permission} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          id={`perm-edit-${permission}`}
                          checked={isSelected}
                          onChange={() => handleDocumentToggle(permission)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <label
                          htmlFor={`perm-edit-${permission}`}
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
                    <h4 className="edit-agent-subsection-title">
                      <i className="fa-solid fa-percent" style={{ color: '#10b981' }}></i>
                      النسب الخاصة بالوكيل/الفرع (من القسط المقرر)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* عرض "تأمين سيارات" إذا كان "تأمين سيارات إجباري" محدد */}
                      {formData.authorized_documents.includes('تأمين سيارات إجباري') && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <label style={{ minWidth: '200px', fontSize: '14px' }}>تأمين سيارات:</label>
                          <select
                            value={getDefaultPercentageValue('تأمين سيارات')}
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
                            value={getDefaultPercentageValue(docType)}
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

                {/* النسب الاستثنائية الشهرية */}
                <div style={{ marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                  <h4 className="edit-agent-subsection-title">
                    <i className="fa-solid fa-calendar-days" style={{ color: '#6366f1' }}></i>
                    النسب والعمولات الاستثنائية حسب الأشهر (اختياري)
                  </h4>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                    يمكنك تحديد نسبة عمولة استثنائية لوثيقة معينة لشهر محدد. إذا لم يتم تحديد نسبة لشهر معين، فسيقوم النظام باعتماد النسبة الافتراضية أعلاه.
                  </p>
                  
                  {/* نموذج إضافة النسبة الاستثنائية */}
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '12px', 
                    alignItems: 'flex-end', 
                    padding: '16px', 
                    background: '#f8fafc', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>السنة</label>
                      <select 
                        value={overrideYear} 
                        onChange={(e) => setOverrideYear(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      >
                        {['2023', '2024', '2025', '2026', '2027', '2028', '2029', '2030'].map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>الشهر</label>
                      <select 
                        value={overrideMonth} 
                        onChange={(e) => setOverrideMonth(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      >
                        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>نوع التأمين المصرح به</label>
                      <select 
                        value={overrideDocType} 
                        onChange={(e) => setOverrideDocType(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '100%' }}
                      >
                        <option value="">اختر نوع التأمين...</option>
                        {formData.authorized_documents.filter(doc => INSURANCE_TYPES.includes(doc)).map(docType => (
                          <option key={docType} value={docType}>{docType}</option>
                        ))}
                        {formData.authorized_documents.includes('تأمين سيارات إجباري') && (
                          <option value="تأمين سيارات">تأمين سيارات (مظلة التأمين الإجباري)</option>
                        )}
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>النسبة الاستثنائية</label>
                      <select 
                        value={overridePercentage} 
                        onChange={(e) => setOverridePercentage(parseInt(e.target.value))}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '80px' }}
                      >
                        {Array.from({ length: 81 }, (_, i) => i).map((percent) => (
                          <option key={percent} value={percent}>{percent}%</option>
                        ))}
                      </select>
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={handleAddMonthlyOverride}
                      style={{ 
                        padding: '10px 20px', 
                        background: '#1e293b', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '6px', 
                        fontWeight: 'bold', 
                        fontSize: '13px',
                        cursor: 'pointer' 
                      }}
                    >
                      إضافة النسبة الاستثنائية
                    </button>
                  </div>
                  
                  {/* جدول عرض النسب الاستثنائية الشهرية المضافة */}
                  {getMonthlyOverridesList().length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                      لا توجد نسب استثنائية شهرية مضافة حالياً.
                    </p>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '25px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '10px 16px', fontWeight: 'bold' }}>الشهر / السنة</th>
                            <th style={{ padding: '10px 16px', fontWeight: 'bold' }}>نوع التأمين</th>
                            <th style={{ padding: '10px 16px', fontWeight: 'bold' }}>النسبة الاستثنائية</th>
                            <th style={{ padding: '10px 16px', fontWeight: 'bold', width: '80px' }}>الإجراء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getMonthlyOverridesList().map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 16px', fontWeight: 'bold', direction: 'ltr', textAlign: 'right' }}>{item.monthKey}</td>
                              <td style={{ padding: '10px 16px' }}>{item.docType}</td>
                              <td style={{ padding: '10px 16px', color: '#10b981', fontWeight: 'bold' }}>{item.percentage}%</td>
                              <td style={{ padding: '10px 16px' }}>
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveMonthlyOverride(item.monthKey, item.docType)}
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: '#ef4444', 
                                    cursor: 'pointer', 
                                    fontSize: '14px',
                                    padding: 0 
                                  }}
                                  title="إزالة نسبة استثنائية"
                                >
                                  <i className="fa-solid fa-trash-can"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* النسب الاستثنائية حسب الفترة (من تاريخ إلى تاريخ) */}
                <div style={{ marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                  <h4 className="edit-agent-subsection-title">
                    <i className="fa-solid fa-calendar-week" style={{ color: '#0284c7' }}></i>
                    النسب والعمولات الاستثنائية حسب الفترة المحددة (من تاريخ - إلى تاريخ)
                  </h4>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                    يمكنك تحديد فترة زمنية محددة (مثل: من 01/01/2025 إلى 15/01/2025) بنسبة عمولة خاصة بالوكيل.
                  </p>
                  
                  {/* نموذج إضافة النسبة بالفترة */}
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '12px', 
                    alignItems: 'flex-end', 
                    padding: '16px', 
                    background: '#f8fafc', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>من تاريخ</label>
                      <input 
                        type="date"
                        value={periodStartDate}
                        onChange={(e) => setPeriodStartDate(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>إلى تاريخ</label>
                      <input 
                        type="date"
                        value={periodEndDate}
                        onChange={(e) => setPeriodEndDate(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>نوع التأمين المصرح به</label>
                      <select 
                        value={periodDocType} 
                        onChange={(e) => setPeriodDocType(e.target.value)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', width: '100%' }}
                      >
                        <option value="">اختر نوع التأمين...</option>
                        {formData.authorized_documents.filter(doc => INSURANCE_TYPES.includes(doc)).map(docType => (
                          <option key={docType} value={docType}>{docType}</option>
                        ))}
                        {formData.authorized_documents.includes('تأمين سيارات إجباري') && (
                          <option value="تأمين سيارات">تأمين سيارات (مظلة التأمين الإجباري)</option>
                        )}
                      </select>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 'bold' }}>النسبة الاستثنائية</label>
                      <select 
                        value={periodPercentage} 
                        onChange={(e) => setPeriodPercentage(parseInt(e.target.value))}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', minWidth: '80px' }}
                      >
                        {Array.from({ length: 81 }, (_, i) => i).map((percent) => (
                          <option key={percent} value={percent}>{percent}%</option>
                        ))}
                      </select>
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={handleAddPeriodOverride}
                      style={{ 
                        padding: '10px 20px', 
                        background: '#0284c7', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '6px', 
                        fontWeight: 'bold', 
                        fontSize: '13px',
                        cursor: 'pointer' 
                      }}
                    >
                      إضافة نسبة الفترة
                    </button>
                  </div>
                  
                  {/* جدول عرض نسب الفترات الاستثنائية */}
                  {getPeriodOverridesList().length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '10px' }}>
                      لا توجد نسب فترات استثنائية مضافة حالياً.
                    </p>
                  ) : (
                    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '10px 16px', fontWeight: 'bold' }}>من تاريخ</th>
                            <th style={{ padding: '10px 16px', fontWeight: 'bold' }}>إلى تاريخ</th>
                            <th style={{ padding: '10px 16px', fontWeight: 'bold' }}>نوع التأمين</th>
                            <th style={{ padding: '10px 16px', fontWeight: 'bold' }}>النسبة الاستثنائية</th>
                            <th style={{ padding: '10px 16px', fontWeight: 'bold', width: '80px' }}>الإجراء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getPeriodOverridesList().map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 16px', fontWeight: 'bold', direction: 'ltr', textAlign: 'right' }}>{item.start_date}</td>
                              <td style={{ padding: '10px 16px', fontWeight: 'bold', direction: 'ltr', textAlign: 'right' }}>{item.end_date}</td>
                              <td style={{ padding: '10px 16px' }}>{item.doc_type}</td>
                              <td style={{ padding: '10px 16px', color: '#0284c7', fontWeight: 'bold' }}>{item.percentage}%</td>
                              <td style={{ padding: '10px 16px' }}>
                                <button 
                                  type="button" 
                                  onClick={() => handleRemovePeriodOverride(item.id)}
                                  style={{ 
                                    background: 'none', 
                                    border: 'none', 
                                    color: '#ef4444', 
                                    cursor: 'pointer', 
                                    fontSize: '14px',
                                    padding: 0 
                                  }}
                                  title="إزالة نسبة الفترة"
                                >
                                  <i className="fa-solid fa-trash-can"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== TAB 5: بيانات دخول المنظومة وصلاحيات الوكيل ===== */}
            {activeTab === 4 && (
              <div className="edit-agent-panel" key="tab-4">
                <div className="edit-agent-section-header">
                  <div className="edit-agent-section-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>
                    <i className="fa-solid fa-user-lock"></i>
                  </div>
                  <div>
                    <h3 className="edit-agent-section-title">بيانات دخول المنظومة وصلاحيات الوكيل</h3>
                    <p className="edit-agent-section-subtitle">بيانات الدخول للمدار والهيئة والاتحاد</p>
                  </div>
                </div>

                {/* تحذير مهم */}
                <div className="agent-warning-box danger">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <div>
                    <strong>تنبيه مهم:</strong> الوكيل ليس لديه صلاحيات في المنظومة إلا <strong>كشف حسابه فقط</strong>.
                    <br/>
                    يرجى عدم منح الوكيل صلاحيات موظف عن طريق الخطأ.
                  </div>
                </div>

                {/* بطاقات بيانات الدخول */}
                <div className="agent-credentials-grid" style={{ marginTop: '24px' }}>
                  
                  {/* بطاقة المدار (لوحة التحكم) */}
                  <div className="agent-credential-card">
                    <div className="agent-credential-card-header">
                      <div className="agent-credential-card-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>
                        <i className="fa-solid fa-desktop"></i>
                      </div>
                      <span className="agent-credential-card-title">المدار (لوحة التحكم)</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>اسم المستخدم *</label>
                        <input
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          placeholder="اسم المستخدم"
                          autoComplete="off"
                        />
                        {formErrors.username && <span className="error-message">{formErrors.username}</span>}
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>كلمة المرور (اتركها فارغة إذا لم ترد التغيير)</label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="كلمة المرور"
                            style={{ width: '100%', paddingLeft: '40px' }}
                            autoComplete="new-password"
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
                            {showPassword ? '👁' : '👁‍🗨'}
                          </button>
                        </div>
                        {formErrors.password && <span className="error-message">{formErrors.password}</span>}
                      </div>
                    </div>
                  </div>

                  {/* بطاقة الهيئة (EIDC) */}
                  <div className="agent-credential-card">
                    <div className="agent-credential-card-header">
                      <div className="agent-credential-card-icon" style={{ background: '#ede9fe', color: '#6366f1' }}>
                        <i className="fa-solid fa-globe"></i>
                      </div>
                      <span className="agent-credential-card-title">الهيئة (EIDC)</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>الايميل في الهيئة</label>
                        <input
                          type="text"
                          value={formData.eidc_username}
                          onChange={(e) => setFormData({ ...formData, eidc_username: e.target.value })}
                          placeholder="الايميل المسجل في الهيئة"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
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

                  {/* بطاقة الاتحاد (LIFO) */}
                  <div className="agent-credential-card">
                    <div className="agent-credential-card-header">
                      <div className="agent-credential-card-icon" style={{ background: '#fce7f3', color: '#ec4899' }}>
                        <i className="fa-solid fa-network-wired"></i>
                      </div>
                      <span className="agent-credential-card-title">الاتحاد (LIFO)</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>اسم المستخدم في الاتحاد</label>
                        <input
                          type="text"
                          value={formData.lifo_username}
                          onChange={(e) => setFormData({ ...formData, lifo_username: e.target.value })}
                          placeholder="اسم المستخدم المسجل في الاتحاد"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>كلمة المرور في الاتحاد</label>
                        <input
                          type="password"
                          value={formData.lifo_password}
                          onChange={(e) => setFormData({ ...formData, lifo_password: e.target.value })}
                          placeholder="كلمة المرور في الاتحاد"
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>مكتب الاتحاد المرتبط</label>
                        <SearchableSelect
                          options={lifoOffices.map((office) => ({
                            value: office.id,
                            label: `${office.name} (معرف: ${office.id})`
                          }))}
                          placeholder="اختر مكتب الاتحاد..."
                          value={formData.lifo_office_id}
                          onChange={(val) => setFormData({ ...formData, lifo_office_id: val })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ملاحظة الصلاحيات */}
                <div className="agent-warning-box warning" style={{ marginTop: '20px' }}>
                  <i className="fa-solid fa-info-circle"></i>
                  <div>
                    <strong>صلاحيات الوكيل:</strong> الوكيل لديه صلاحية <strong>كشف حسابه فقط</strong> في المنظومة.
                    لا يحق للوكيل الوصول لأي صلاحيات أخرى.
                  </div>
                </div>
              </div>
            )}

            {/* ===== STICKY SAVE/CANCEL BUTTONS ===== */}
            <div className="edit-agent-actions">
              <button type="button" onClick={() => navigate('/branches-agents')} className="btn-cancel">
                <i className="fa-solid fa-xmark" style={{ marginLeft: '6px' }}></i>
                إلغاء
              </button>
              <button type="submit" className="btn-submit" disabled={submitting}>
                <i className="fa-solid fa-floppy-disk" style={{ marginLeft: '6px' }}></i>
                {submitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </section>
  );
}
