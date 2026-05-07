import { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

type Plate = {
  id: number;
  plate_number: string;
  city: {
    id: number;
    name_ar: string;
    name_en: string;
  };
};

type VehicleType = {
  id: number;
  brand: string;
  category: string;
};

type Color = {
  id: number;
  name: string;
};

// قائمة السنوات من 1960 إلى 2026
const YEARS = Array.from({ length: 67 }, (_, i) => 1960 + i).reverse();

const LICENSE_PURPOSES = [
  { ar: 'خاصة', en: 'Private' },
  { ar: 'عامة', en: 'Public' },
  { ar: 'نقل', en: 'Transport' },
  { ar: 'زراعي', en: 'Agricultural' },
  { ar: 'صناعي', en: 'Industrial' },
];

// قوة المحرك للخاصة
const ENGINE_POWERS_PRIVATE = [
  'أقل من (16) حصان',
  'من (17) الي (30) حصان',
  'أكثر من (30) حصان',
  'سيارة تجارية',
];

// قوة المحرك للعامة
const ENGINE_POWERS_PUBLIC = [
  'سيارة تعليم قيادة',
  'سيارة اسعاف',
  'ركوبة عامة داخل المدينة',
  'ركوبة عامة خارج المدينة',
  'حافلة لنقل الركاب',
  'مركبة مقطورة بحافلة ركاب',
];

// قوة المحرك للنقل
const ENGINE_POWERS_TRANSPORT = [
  'سيارة نقل',
  'رأس جر',
  'شاحنة صندوق',
  'مقطورة',
  'مقطورة سيارة خاصة',
  'سيارة نقل موتى',
];

// قوة المحرك للزراعي
const ENGINE_POWERS_AGRICULTURAL = [
  'جرار زراعي',
  'ألات زراعية',
];

// قوة المحرك للصناعي
const ENGINE_POWERS_INDUSTRIAL = [
  'جرار صناعي',
  'ألات حفر',
  'ألات رفع',
  'ألات تعبيد الطرق',
];

export default function CreateInsuranceDocument() {
  const navigate = useNavigate();
  const [plates, setPlates] = useState<Plate[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [_authorizedDocuments, setAuthorizedDocuments] = useState<string[] | null>(null);
  const prevEnginePowerRef = useRef<string>('');
  const [formData, setFormData] = useState({
    insurance_type: 'تأمين إجباري سيارات' as 'تأمين إجباري سيارات' | 'تأمين طرف ثالث سيارات' | 'تأمين سيارات أجنبية' | 'تأمين سيارة جمرك',
    plate_id: '',
    port: '',
    start_date: '',
    end_date: '',
    duration: 'سنة (365 يوم)' as 'سنة' | 'سنتين' | 'شهر (30 يوم)' | 'شهرين (60 يوم)' | 'ثلاثة أشهر (90 يوم)' | 'سنة (365 يوم)' | 'سنتين (730 يوم)' | 'تأمين من شهرين إلى 3 أشهر' | 'تأمين من شهر إلى شهرين' | 'تأمين من 15 يوم إلى شهر' | 'تأمين من 1 يوم إلى 15 يوم',
    third_party_purpose: '',
    foreign_car_country: '',
    foreign_car_purpose: '',
    chassis_number: '',
    plate_number_manual: '',
    vehicle_type_id: '',
    color: '',
    year: '',
    fuel_type: '',
    license_purpose: '',
    engine_power: '4',
    authorized_passengers: '4',
    load_capacity: '0',
    insured_name: '',
    phone: '',
    whatsapp_number: '',
    email: '',
    driving_license_number: '',
    nid_passport: '',
    premium: '',
    // EIDC vehicle classification fields
    eidc_vehicle_type_id: '',
    eidc_vehicle_spec_id: '',
    eidc_vehicle_detail_id: '',
    nationality: 'ليبي',
    engine_number: '',
    engine_cc: '2000',
    vehicle_weight: '1500',
    notes: '',
    address: '',
    branch_agent_id: '',
  });

  const isMandatoryInsurance = formData.insurance_type === 'تأمين إجباري سيارات';
  const isCustomsInsurance = formData.insurance_type === 'تأمين سيارة جمرك';
  const isThirdPartyInsurance = formData.insurance_type === 'تأمين طرف ثالث سيارات';
  const isForeignCarInsurance = formData.insurance_type === 'تأمين سيارات أجنبية';

  // EIDC data states
  const [eidcVehicleTypes, setEidcVehicleTypes] = useState<any[]>([]);
  const [eidcVehicleSpecs, setEidcVehicleSpecs] = useState<any[]>([]);
  const [eidcVehicleDetails, setEidcVehicleDetails] = useState<any[]>([]);
  const [_loadingEidcData, setLoadingEidcData] = useState(false);
  const [loadingSpecs, setLoadingSpecs] = useState(false);
  const [loadingInquiry, setLoadingInquiry] = useState(false);
  const [eidcPremiumData, setEidcPremiumData] = useState<any>(null);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Select2 states
  // const [plateSearch, setPlateSearch] = useState("");
  const [_showPlateDropdown, setShowPlateDropdown] = useState(false);
  const plateDropdownRef = useRef<HTMLDivElement>(null);

  const [vehicleTypeSearch, setVehicleTypeSearch] = useState("");
  const [showVehicleTypeDropdown, setShowVehicleTypeDropdown] = useState(false);
  const vehicleTypeDropdownRef = useRef<HTMLDivElement>(null);
  // const [newVehicleTypeBrand, setNewVehicleTypeBrand] = useState("");
  // const [newVehicleTypeCategory, setNewVehicleTypeCategory] = useState("");
  // const [useCustomVehicleTypeBrand, setUseCustomVehicleTypeBrand] = useState(false);
  // const [showAddVehicleType, setShowAddVehicleType] = useState(false);
  const [showDeleteVehicleTypeModal, setShowDeleteVehicleTypeModal] = useState<{ id: number; brand: string; category: string } | null>(null);
  const [deletingVehicleType, setDeletingVehicleType] = useState(false);

  // const [categorySearch, setCategorySearch] = useState("");
  const [_showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [colors, setColors] = useState<Color[]>([]);
  // const [colorSearch, setColorSearch] = useState("");
  const [_showColorDropdown, setShowColorDropdown] = useState(false);
  // const [newColorName, setNewColorName] = useState("");
  // const [showAddColor, setShowAddColor] = useState(false);
  const [showDeleteColorModal, setShowDeleteColorModal] = useState<{ id: number; name: string } | null>(null);
  const [deletingColor, setDeletingColor] = useState(false);
  const colorDropdownRef = useRef<HTMLDivElement>(null);

  // const [yearSearch, setYearSearch] = useState("");
  const [_showYearDropdown, setShowYearDropdown] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    fetchPlates();
    fetchVehicleTypes();
    fetchColors();
    loadUserPermissions();
  }, []);

  const loadUserPermissions = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setAuthorizedDocuments(null);
        return;
      }
      
      const user = JSON.parse(userStr);
      setAuthorizedDocuments(user.authorized_documents || null);
    } catch (error) {
      console.error('Error loading user permissions:', error);
      setAuthorizedDocuments(null);
    }
  };



  // ─── EIDC Integration Logic ────────────────────────────────────────────────

  useEffect(() => {
    if (isMandatoryInsurance) {
      fetchEidcVehicleTypes();
    }
  }, [formData.insurance_type]);

  useEffect(() => {
    if (isMandatoryInsurance && formData.eidc_vehicle_type_id) {
      // تصفير فوري قبل الجلب لإزالة البيانات القديمة
      setEidcVehicleSpecs([]);
      setEidcVehicleDetails([]);
      setEidcPremiumData(null);
      fetchEidcVehicleSpecs(formData.eidc_vehicle_type_id);
    } else {
      setEidcVehicleSpecs([]);
      setEidcVehicleDetails([]);
    }
  }, [formData.eidc_vehicle_type_id]);

  useEffect(() => {
    if (isMandatoryInsurance && formData.eidc_vehicle_spec_id) {
      // جلب التفاصيل بناءً على النوع المحدد (Spec ID) أو النوع الرئيسي
      // حسب توثيق الهيئة، التفاصيل تتبع النوع الرئيسي ولكنها تظهر بعد اختيار النوع المحدد
      fetchEidcVehicleDetails(formData.eidc_vehicle_type_id);
    } else {
      setEidcVehicleDetails([]);
    }
  }, [formData.eidc_vehicle_spec_id, formData.eidc_vehicle_type_id, isMandatoryInsurance]);

  const fetchEidcVehicleTypes = async () => {
    setLoadingEidcData(true);
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      
      const headers: any = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };
      
      if (userId) {
        headers['X-User-Id'] = userId.toString();
      }

      const res = await fetch(`${API_BASE_URL}/insurance-documents/eidc/vehicle-types`, {
        headers
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          showToast(data.error || 'فشل جلب بيانات الهيئة', 'error');
          setEidcVehicleTypes([]);
        } else {
          setEidcVehicleTypes(Array.isArray(data) ? data : []);
        }
      } else {
        const data = await res.json();
        showToast(data.message || data.error || 'خطأ في الاتصال بنظام الهيئة', 'error');
        setEidcVehicleTypes([]);
      }
    } catch (error) {
      console.error('Error fetching EIDC vehicle types:', error);
      showToast('خطأ في جلب تصنيفات المركبات', 'error');
    } finally {
      setLoadingEidcData(false);
    }
  };

  const fetchEidcVehicleSpecs = async (typeId: string) => {
    setLoadingSpecs(true);
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;

      const headers: any = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };

      if (userId) {
        headers['X-User-Id'] = userId.toString();
      }

      const res = await fetch(`${API_BASE_URL}/insurance-documents/eidc/vehicle-specs?typeId=${typeId}`, {
        headers
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          showToast(data.error, 'error');
          setEidcVehicleSpecs([]);
        } else {
          const list = Array.isArray(data) ? data : [];
          setEidcVehicleSpecs(list);
        }
      } else {
        setEidcVehicleSpecs([]);
      }
    } catch (error) {
      console.error('Error fetching EIDC vehicle specs:', error);
    } finally {
      setLoadingSpecs(false);
    }
  };

  const fetchEidcVehicleDetails = async (typeId: string) => {
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;

      const headers: any = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      };

      if (userId) {
        headers['X-User-Id'] = userId.toString();
      }

      const res = await fetch(`${API_BASE_URL}/insurance-documents/eidc/vehicle-details?typeId=${typeId}`, {
        headers
      });
      if (res.ok) {
        const data = await res.json();
        if (data.error) {
          showToast(data.error, 'error');
          setEidcVehicleDetails([]);
        } else {
          const list = Array.isArray(data) ? data : [];
          setEidcVehicleDetails(list);
        }
      } else {
        setEidcVehicleDetails([]);
      }
    } catch (error) {
      console.error('Error fetching EIDC vehicle details:', error);
    }
  };

  // تأمين طلب احتساب القسط تلقائياً عند اختيار تصنيف المركبة في المرحلة الثالثة
  useEffect(() => {
    const shouldInquire = isMandatoryInsurance && 
                         currentStep === 3 && 
                         formData.eidc_vehicle_type_id && 
                         formData.eidc_vehicle_spec_id;

    if (shouldInquire) {
      const handler = setTimeout(() => {
        handleEidcInquiry();
      }, 600); // Debounce for 600ms to avoid spamming the EIDC API

      return () => clearTimeout(handler);
    }
  }, [
    currentStep, 
    formData.eidc_vehicle_type_id, 
    formData.eidc_vehicle_spec_id, 
    formData.eidc_vehicle_detail_id, 
    formData.duration,
    formData.authorized_passengers,
    formData.engine_power,
    formData.load_capacity,
    formData.license_purpose,
    formData.plate_number_manual,
    formData.chassis_number,
    isMandatoryInsurance
  ]);

  const handleEidcInquiry = async () => {
    setLoadingInquiry(true);
    // Clear previous premium data to avoid confusion during fetch
    setEidcPremiumData(null);
    
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;

      if (!token) {
        console.error('No token found for EIDC inquiry');
        setLoadingInquiry(false);
        return;
      }

      const headers: any = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      if (userId) {
        headers['X-User-Id'] = userId.toString();
      }

      const selectedPlate = plates.find(p => p.id.toString() === formData.plate_id);
      
      // الهيئة تطلب تاريخ يوم غد (كما ظهر في صورتك)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const fromNoonOf = tomorrow.toISOString().split('T')[0];
      
      if (!formData.phone || !formData.nid_passport || !formData.insured_name) {
        setLoadingInquiry(false);
        return;
      }

      const vt = vehicleTypes.find(t => t.id.toString() === formData.vehicle_type_id);
      const vehicleMakeModel = vt ? `${vt.brand}` : ""; // إرسال الماركة فقط بناءً على طلبك

      const requestBody = {
        FromNoonOf: fromNoonOf,
        TypeOfVehicle: vehicleMakeModel,
        TypeVechicleId: formData.eidc_vehicle_type_id,
        TypeVechicle2Id: formData.eidc_vehicle_spec_id,
        TypeVechicle3Id: formData.eidc_vehicle_detail_id,
        
        PhoneNo: formData.phone,
        NidPassport: formData.nid_passport,
        InsuredsName: formData.insured_name,
        Nationality: formData.nationality,
        Address: formData.address,
        Email: formData.email,
        
        PlateNo: formData.plate_number_manual,
        ChassisNo: formData.chassis_number,
        EngineNo: formData.engine_number,
        Color: formData.color,
        YearMade: formData.year || "",
        RegAuthority: selectedPlate ? selectedPlate.city.name_ar : '',
        
        DayOfCarType: EidcApiServiceMapping.mapDurationToDays(formData.duration),
        PurposeLicense: EidcApiServiceMapping.mapPurposeLicense(formData.license_purpose),
        PassengersNo: Math.max(1, parseInt(formData.authorized_passengers) || 0),
        EngineHp: parseInt(formData.engine_power) || 0,
        Tonnage: parseFloat(formData.load_capacity) || 0,
        LoadTon: formData.load_capacity,
        IssuingFeesOptions: 0
      };

      console.log('Sending Comprehensive EIDC Inquiry Request:', requestBody);

      const res = await fetch(`${API_BASE_URL}/insurance-documents/eidc/inquiry`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('EIDC Inquiry Response:', data);
        
        // إظهار تنبيه بالبيانات المستلمة للمساعدة في التشخيص
        if (data.netPremium || data.net_premium || data.totalPremium || data.total) {
           showToast('تم جلب الأسعار بنجاح', 'success');
        } else if (data.message || data.error) {
           showToast(data.message || data.error, 'error');
        }

        // معالجة البيانات بشكل مرن (دعم كل التنسيقات الممكنة بما فيها التنسيق المكتشف في الصورة)
        const mappedData = {
          netPremium: data.netPremium ?? data.net_premium ?? data.NetPremium ?? data.premiumYear ?? data.premium_year ?? 0,
          tax: data.tax ?? data.tax_amount ?? data.Tax ?? (data.premiumYear ? 1.000 : 0), // افتراضي 1 دينار إذا وجد سعر
          supervisionFees: data.supervisionFees ?? data.supervision_fees ?? data.SupervisionFees ?? (data.premiumYear ? 0.500 : 0), // افتراضي 0.500
          stamp: data.stamp ?? data.stamp_amount ?? data.Stamp ?? 0.250, // الدمغة 0.250 كما في المنظومة
          issuingFees: data.issuingFees ?? data.issue_fees ?? data.IssuingFees ?? (data.premiumYear ? 2.000 : 0), // رسوم الإصدار المعتادة 2 دينار
          totalPremium: data.totalPremium ?? data.total ?? data.TotalPremium ?? 0
        };

        // حساب الإجمالي إذا لم يكن موجوداً
        if (mappedData.totalPremium === 0 && mappedData.netPremium > 0) {
          mappedData.totalPremium = Number(mappedData.netPremium) + Number(mappedData.tax) + Number(mappedData.supervisionFees) + Number(mappedData.stamp) + Number(mappedData.issuingFees);
        }

        if (data.error) {
          showToast(data.error, 'error');
          setEidcPremiumData(null);
        } else {
          setEidcPremiumData(mappedData);
          if (mappedData.totalPremium) {
            setFormData(prev => ({ 
              ...prev, 
              premium: mappedData.totalPremium.toString(),
              // تحديث تاريخ الانتهاء بما حسبته الهيئة بالضبط
              end_date: data.toNoonOf ? data.toNoonOf.split('T')[0] : prev.end_date
            }));
          }
        }
      } else {
        const data = await res.json();
        console.error('EIDC Inquiry Failed:', data);
        showToast(data.message || data.error || 'خطأ في الاتصال بالهيئة', 'error');
        setEidcPremiumData(null);
      }
    } catch (error) {
      console.error('EIDC Inquiry Error:', error);
      showToast('حدث خطأ أثناء الاتصال بالمنظومة', 'error');
    } finally {
      setLoadingInquiry(false);
    }
  };

  // مساعدات التحويل (Mapping Helpers) - لمحاكاة منطق الـ Backend في الـ Frontend للتسعير الفوري
  const EidcApiServiceMapping = {
    mapDurationToDays: (duration: string) => {
      if (duration.includes('سنة')) return 365;
      if (duration.includes('ثلاثة أشهر') || duration.includes('3 أشهر')) return 90;
      if (duration.includes('شهرين')) return 60;
      if (duration.includes('شهر')) return 30;
      if (duration.includes('15 يوم')) return 15;
      return 365;
    },
    mapPurposeLicense: (purpose: string) => {
      if (!purpose) return 'خاصة';
      if (purpose.includes('خاصة')) return 'خاصة';
      if (purpose.includes('عامة')) return 'عامة';
      if (purpose.includes('نقل')) return 'نقل';
      if (purpose.includes('زراعي')) return 'زراعي';
      if (purpose.includes('صناعي')) return 'صناعي';
      return 'خاصة';
    }
  };



  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plateDropdownRef.current && !plateDropdownRef.current.contains(event.target as Node)) {
        setShowPlateDropdown(false);
      }
      if (vehicleTypeDropdownRef.current && !vehicleTypeDropdownRef.current.contains(event.target as Node)) {
        setShowVehicleTypeDropdown(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target as Node)) {
        setShowColorDropdown(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setShowYearDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // إعادة تعيين مدة التأمين عند تغيير نوع التأمين
  useEffect(() => {
    // في تأمين إجباري سيارات، لم تعد المدة مثبتة على سنة واحدة فقط بل تدعم خيارات الهيئة
    if (isMandatoryInsurance && !['سنة (365 يوم)', 'تأمين من شهرين إلى 3 أشهر', 'تأمين من شهر إلى شهرين', 'تأمين من 15 يوم إلى شهر', 'تأمين من 1 يوم إلى 15 يوم'].includes(formData.duration)) {
      setFormData(prev => ({
        ...prev,
        duration: 'سنة (365 يوم)',
        end_date: ''
      }));
    } else if (isCustomsInsurance) {
      // في تأمين جمرك: بداية التأمين = تاريخ الإصدار (تاريخ اليوم)
      setFormData(prev => ({
        ...prev,
        start_date: new Date().toISOString().split('T')[0],
        duration: (prev.duration === 'سنة (365 يوم)' || prev.duration === 'سنتين (730 يوم)' || prev.duration === 'سنة' || prev.duration === 'سنتين') 
          ? 'شهر (30 يوم)' 
          : prev.duration,
        end_date: ''
      }));
    } else if (!isCustomsInsurance && !isForeignCarInsurance && formData.duration && !['سنة (365 يوم)', 'سنتين (730 يوم)'].includes(formData.duration)) {
      setFormData(prev => ({
        ...prev,
        duration: 'سنة (365 يوم)',
        end_date: ''
      }));
    }
  }, [isCustomsInsurance, isForeignCarInsurance, isMandatoryInsurance]);

  // حساب نهاية التأمين عند تغيير المدة
  useEffect(() => {
    // في تأمين إجباري سيارات أو تأمين جمرك، استخدم تاريخ اليوم كبداية التأمين
    const startDateValue = (isMandatoryInsurance || isCustomsInsurance) ? new Date().toISOString().split('T')[0] : formData.start_date;
    const durationValue = formData.duration;
    
    if (startDateValue && durationValue) {
      const startDate = new Date(startDateValue);
      const endDate = new Date(startDate);
      
      if (isCustomsInsurance || isForeignCarInsurance || isMandatoryInsurance) {
        // تأمين جمرك أو سيارات أجنبية أو إجباري - حساب بالأيام
        let days = 0;
        switch (durationValue) {
          case 'ثلاثة أشهر (90 يوم)':
          case 'تأمين من شهرين إلى 3 أشهر':
            days = 90;
            break;
          case 'شهرين (60 يوم)':
          case 'تأمين من شهر إلى شهرين':
            days = 60;
            break;
          case 'شهر (30 يوم)':
          case 'تأمين من 15 يوم إلى شهر':
            days = 30;
            break;
          case 'تأمين من 1 يوم إلى 15 يوم':
            days = 15;
            break;
          case 'سنة (365 يوم)':
            days = 365;
            break;
          case 'سنتين (730 يوم)':
            days = 730;
            break;
          default:
            days = 0;
        }
        endDate.setDate(endDate.getDate() + days);
      } else {
        // تأمين عادي - حساب بالسنوات
        if (durationValue === 'سنتين (730 يوم)') {
          endDate.setFullYear(endDate.getFullYear() + 2);
        } else if (durationValue === 'سنة (365 يوم)') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else if (durationValue === 'سنتين') {
          // للتوافق مع البيانات القديمة
          endDate.setFullYear(endDate.getFullYear() + 2);
        } else if (durationValue === 'سنة') {
          // للتوافق مع البيانات القديمة
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
      }
      
      // تنسيق التاريخ بصيغة YYYY/MM/DD
      const year = endDate.getFullYear();
      const month = String(endDate.getMonth() + 1).padStart(2, '0');
      const day = String(endDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}/${month}/${day}`;
      
      setFormData(prev => ({
        ...prev,
        end_date: formattedDate
      }));
    }
  }, [formData.start_date, formData.duration, isCustomsInsurance, isForeignCarInsurance, isMandatoryInsurance]);

  // حساب القسط تلقائياً بناءً على قوة المحرك أو غرض الطرف الثالث أو غرض السيارة الأجنبية
  useEffect(() => {
    let basePremium = 0;
    
    // تعيين القيم الافتراضية للركاب والحمولة في حالة "تأمين سيارات أجنبية"
    if (isForeignCarInsurance && formData.foreign_car_purpose) {
      if (!formData.authorized_passengers) {
        setFormData(prev => ({
          ...prev,
          authorized_passengers: '1' // 1 راكب افتراضي لجميع أنواع السيارات الأجنبية
        }));
      }
      if (!formData.load_capacity) {
        setFormData(prev => ({
          ...prev,
          load_capacity: '0' // 0 طن افتراضي
        }));
      }
    }
    
    if (isForeignCarInsurance && formData.foreign_car_purpose) {
      // تأمين سيارات أجنبية - حساب بناءً على غرض السيارة
      // القيمة الأساسية هي لليوم الواحد
      let dailyBasePremium = 0;
      let extraPassengerPricePerDay = 0;
      let extraTonPricePerDay = 0;
      
      switch (formData.foreign_car_purpose) {
        case 'سيارات خاصة سياحية':
          dailyBasePremium = 2; // 2 دينار لليوم الواحد
          extraPassengerPricePerDay = 1; // 1 دينار لكل راكب إضافي لليوم الواحد
          extraTonPricePerDay = 1; // 1 دينار لكل طن إضافي لليوم الواحد
          break;
        case 'سيارات نقل ركاب':
          dailyBasePremium = 3; // 3 دينار لليوم الواحد
          extraPassengerPricePerDay = 2; // 2 دينار لكل راكب إضافي لليوم الواحد
          extraTonPricePerDay = 2; // 2 دينار لكل طن إضافي لليوم الواحد
          break;
        case 'سيارات نقل وشحن':
          dailyBasePremium = 4; // 4 دينار لليوم الواحد
          extraPassengerPricePerDay = 3; // 3 دينار لكل راكب إضافي لليوم الواحد
          extraTonPricePerDay = 3; // 3 دينار لكل طن إضافي لليوم الواحد
          break;
        default:
          dailyBasePremium = 0;
          break;
      }
      
      // حساب عدد الأيام بناءً على المدة
      let days = 30; // افتراضي: شهر
      if (formData.duration) {
        switch (formData.duration) {
          case 'شهر (30 يوم)':
            days = 30;
            break;
          case 'شهرين (60 يوم)':
            days = 60;
            break;
          case 'ثلاثة أشهر (90 يوم)':
            days = 90;
            break;
          case 'سنة (365 يوم)':
            days = 365;
            break;
          case 'سنتين (730 يوم)':
            days = 730;
            break;
          default:
            days = 30;
        }
      }
      
      // حساب القسط الأساسي بناءً على المدة
      basePremium = dailyBasePremium * days;
      
      // حساب زيادة الركاب (لكل راكب إضافي بعد الراكب الافتراضي)
      if (formData.authorized_passengers) {
        const currentPassengers = parseInt(formData.authorized_passengers) || 0;
        const defaultPassengers = 1; // 1 راكب افتراضي
        
        if (currentPassengers > defaultPassengers) {
          const extraPassengers = currentPassengers - defaultPassengers;
          const extraCost = extraPassengers * extraPassengerPricePerDay * days;
          basePremium = basePremium + extraCost;
        }
      }
      
      // حساب زيادة الحمولة بالطن (لكل طن إضافي بعد 0 طن افتراضي)
      if (formData.load_capacity) {
        const currentLoadCapacity = parseInt(formData.load_capacity) || 0;
        const defaultLoadCapacity = 0; // 0 طن افتراضي
        
        if (currentLoadCapacity > defaultLoadCapacity) {
          const extraTons = currentLoadCapacity - defaultLoadCapacity;
          const extraCost = extraTons * extraTonPricePerDay * days;
          basePremium = basePremium + extraCost;
        }
      }
      
      setFormData(prev => ({
        ...prev,
        premium: basePremium > 0 ? basePremium.toFixed(3) : ''
      }));
    } else if (isThirdPartyInsurance && formData.third_party_purpose) {
      // تأمين طرف ثالث - حساب بناءً على غرض الطرف الثالث
      switch (formData.third_party_purpose) {
        case 'خاصة':
          basePremium = 365.000;
          break;
        case 'عامة':
          basePremium = 547.500;
          break;
        case 'نقل':
          basePremium = 456.250;
          break;
        default:
          basePremium = 0;
      }
      
      // إذا كانت المدة سنتين، يتضاعف السعر
      const finalPremium = (formData.duration === 'سنتين (730 يوم)' || formData.duration === 'سنتين') ? basePremium * 2 : basePremium;
      
      setFormData(prev => ({
        ...prev,
        premium: finalPremium > 0 ? finalPremium.toFixed(3) : ''
      }));
    }
    
    // حساب الحمولة بناءً على قوة المحرك (الركاب والحمولة لا يتم تعيينهما تلقائياً - يمكن للمستخدم تعديلهما)
    if (formData.engine_power) {
      // تعيين القيمة الافتراضية للركاب عند تغيير قوة المحرك أو إذا كان الحقل فارغاً
      let authorizedPassengers = '';
      const enginePowerChanged = prevEnginePowerRef.current !== formData.engine_power;
      
      if (!formData.authorized_passengers || enginePowerChanged) {
        switch (formData.engine_power) {
          // خاصة
          case 'أقل من (16) حصان':
          case 'من (17) الي (30) حصان':
          case 'أكثر من (30) حصان':
            authorizedPassengers = '4';
            break;
          case 'سيارة تجارية':
            authorizedPassengers = '1';
            break;
          // عامة
          case 'سيارة تعليم قيادة':
          case 'سيارة اسعاف':
            authorizedPassengers = '1';
            break;
          case 'ركوبة عامة داخل المدينة':
          case 'ركوبة عامة خارج المدينة':
            authorizedPassengers = '4';
            break;
          case 'حافلة لنقل الركاب':
          case 'مركبة مقطورة بحافلة ركاب':
            authorizedPassengers = '14';
            break;
          // نقل
          case 'سيارة نقل':
            authorizedPassengers = '1';
            break;
          case 'رأس جر':
            authorizedPassengers = '1';
            break;
          case 'شاحنة صندوق':
            authorizedPassengers = '1';
            break;
          case 'مقطورة':
            authorizedPassengers = '0';
            // لا يوجد ركاب للمقطورة
            break;
          case 'مقطورة سيارة خاصة':
            authorizedPassengers = '0'; // 0 ركاب
            break;
          case 'سيارة نقل موتى':
            authorizedPassengers = '1'; // 1 راكب
            break;
          // زراعي
          case 'جرار زراعي':
          case 'ألات زراعية':
            authorizedPassengers = '1';
            break;
          // صناعي
          case 'جرار صناعي':
          case 'ألات حفر':
          case 'ألات رفع':
          case 'ألات تعبيد الطرق':
            authorizedPassengers = '1';
            break;
          default:
            break;
        }
      }
      
      // تعيين القيمة الافتراضية للحمولة عند تغيير قوة المحرك أو إذا كان الحقل فارغاً
      let loadCapacity = '';
      if (!formData.load_capacity || enginePowerChanged) {
        switch (formData.engine_power) {
          // نقل - جميع أنواع النقل تبدأ بحمولة 0 (يتم إضافتها يدوياً)
          case 'سيارة نقل':
            loadCapacity = '0';
            break;
          case 'شاحنة صندوق':
            loadCapacity = '0';
            break;
          case 'رأس جر':
            loadCapacity = '0';
            break;
          case 'مقطورة':
            loadCapacity = '0';
            break;
          case 'مقطورة سيارة خاصة':
            loadCapacity = '0'; // 0 طن (لا يوجد حمولة)
            break;
          case 'سيارة نقل موتى':
            loadCapacity = '0'; // 0 طن (لا يوجد حمولة)
            break;
          // زراعي - جميع أنواع الزراعي تبدأ بحمولة 0 (يتم إضافتها يدوياً)
          case 'جرار زراعي':
            loadCapacity = '0';
            break;
          case 'ألات زراعية':
            loadCapacity = '0';
            break;
          // صناعي - جميع أنواع الصناعي تبدأ بحمولة 0 (يتم إضافتها يدوياً)
          case 'جرار صناعي':
            loadCapacity = '0';
            break;
          case 'ألات حفر':
            loadCapacity = '0';
            break;
          case 'ألات رفع':
            loadCapacity = '0';
            break;
          case 'ألات تعبيد الطرق':
            loadCapacity = '0';
            break;
          default:
            break;
        }
      }
      
      // تحديث المرجع لتتبع آخر قيمة لـ engine_power
      prevEnginePowerRef.current = formData.engine_power;
      
      setFormData(prev => ({
        ...prev,
        authorized_passengers: authorizedPassengers || prev.authorized_passengers,
        load_capacity: loadCapacity || prev.load_capacity
      }));
    }
    
    // حساب القسط بناءً على قوة المحرك (للتأمين العادي والجمرك فقط)
    if (!isThirdPartyInsurance && !isForeignCarInsurance && formData.engine_power) {
      // تأمين عادي أو جمرك - حساب بناءً على قوة المحرك
      const isPrivatePurpose = formData.license_purpose && formData.license_purpose.includes('خاصة');
      
      if (isCustomsInsurance) {
        // قيم تأمين جمرك - نفس أسعار التأمين العادي
        switch (formData.engine_power) {
          // خاصة
          case 'أقل من (16) حصان':
            basePremium = 64.000;
            break;
          case 'من (17) الي (30) حصان':
            basePremium = 70.000;
            break;
          case 'أكثر من (30) حصان':
            basePremium = 90.000;
            break;
          case 'سيارة تجارية':
            basePremium = 100.000;
            break;
          // عامة
          case 'سيارة تعليم قيادة':
            basePremium = 58.000;
            break;
          case 'سيارة اسعاف':
            basePremium = 50.000;
            break;
          case 'ركوبة عامة داخل المدينة':
            basePremium = 64.000;
            break;
          case 'ركوبة عامة خارج المدينة':
            basePremium = 64.000; // نفس قيمة داخل المدينة
            break;
          case 'حافلة لنقل الركاب':
            basePremium = 84.000;
            break;
          case 'مركبة مقطورة بحافلة ركاب':
            basePremium = 84.000;
            break;
          // نقل
          case 'سيارة نقل':
            basePremium = 65.000; // القسط المقرر: 65 دينار (لـ 1 طن)
            break;
          case 'رأس جر':
            basePremium = 65.000; // القسط المقرر: 65 دينار
            break;
          case 'شاحنة صندوق':
            basePremium = 73.000; // القسط المقرر: 73 دينار
            break;
          case 'مقطورة':
            basePremium = 0; // السعر يعتمد على الحمولة بالطن (8 دينار لكل طن)
            break;
          case 'مقطورة سيارة خاصة':
            basePremium = 30.000; // القسط المقرر: 30 دينار
            break;
          case 'سيارة نقل موتى':
            basePremium = 24.000; // القسط المقرر: 24 دينار
            break;
          // زراعي
          case 'جرار زراعي':
            basePremium = 16.000;
            break;
          case 'ألات زراعية':
            basePremium = 16.000;
            break;
          // صناعي
          case 'جرار صناعي':
            basePremium = 34.000;
            break;
          case 'ألات حفر':
            basePremium = 34.000;
            break;
          case 'ألات رفع':
            basePremium = 34.000;
            break;
          case 'ألات تعبيد الطرق':
            basePremium = 34.000;
            break;
          default:
            basePremium = 0;
        }
      } else {
        // قيم التأمين العادي
        switch (formData.engine_power) {
          // خاصة
          case 'أقل من (16) حصان':
            basePremium = 64.000;
            break;
          case 'من (17) الي (30) حصان':
            basePremium = 70.000;
            break;
          case 'أكثر من (30) حصان':
            basePremium = 90.000;
            break;
          case 'سيارة تجارية':
            basePremium = 100.000;
            break;
          // عامة
          case 'سيارة تعليم قيادة':
            basePremium = 58.000;
            break;
          case 'سيارة اسعاف':
            basePremium = 50.000;
            break;
          case 'ركوبة عامة داخل المدينة':
            basePremium = 64.000;
            break;
          case 'ركوبة عامة خارج المدينة':
            basePremium = 64.000; // نفس قيمة داخل المدينة
            break;
          case 'حافلة لنقل الركاب':
            basePremium = 84.000;
            break;
          case 'مركبة مقطورة بحافلة ركاب':
            basePremium = 84.000;
            break;
          // نقل
          case 'سيارة نقل':
            basePremium = 65.000; // القسط المقرر: 65 دينار (لـ 1 طن)
            break;
          case 'رأس جر':
            basePremium = 65.000; // القسط المقرر: 65 دينار
            break;
          case 'شاحنة صندوق':
            basePremium = 73.000; // القسط المقرر: 73 دينار
            break;
          case 'مقطورة':
            basePremium = 0; // السعر يعتمد على الحمولة بالطن (8 دينار لكل طن)
            break;
          case 'مقطورة سيارة خاصة':
            basePremium = 30.000; // القسط المقرر: 30 دينار
            break;
          case 'سيارة نقل موتى':
            basePremium = 24.000; // القسط المقرر: 24 دينار
            break;
          // زراعي
          case 'جرار زراعي':
            basePremium = 16.000;
            break;
          case 'ألات زراعية':
            basePremium = 16.000;
            break;
          // صناعي
          case 'جرار صناعي':
            basePremium = 34.000;
            break;
          case 'ألات حفر':
            basePremium = 34.000;
            break;
          case 'ألات رفع':
            basePremium = 34.000;
            break;
          case 'ألات تعبيد الطرق':
            basePremium = 34.000;
            break;
          default:
            basePremium = 0;
        }
      }
      
      // حساب إضافي لزيادة عدد الركاب في حالة "خاصة"
      if (isPrivatePurpose && formData.authorized_passengers) {
        const currentPassengers = parseInt(formData.authorized_passengers) || 0;
        let defaultPassengers = 4; // الافتراضي لمعظم السيارات الخاصة
        let extraPassengerPrice = 5; // سعر الراكب الإضافي (دينار)
        
        // تحديد العدد الافتراضي بناءً على قوة المحرك
        if (formData.engine_power === 'سيارة تجارية') {
          defaultPassengers = 1;
          extraPassengerPrice = 15; // للسيارة التجارية: 15 دينار لكل راكب إضافي
        }
        
        // حساب الزيادة في عدد الركاب
        if (currentPassengers > defaultPassengers) {
          const extraPassengers = currentPassengers - defaultPassengers;
          const extraCost = extraPassengers * extraPassengerPrice;
          basePremium = basePremium + extraCost;
        }
      }
      
      // حساب إضافي لزيادة عدد الركاب في حالة "عامة"
      const isPublicPurpose = formData.license_purpose && formData.license_purpose.includes('عامة');
      if (isPublicPurpose && formData.authorized_passengers) {
        const currentPassengers = parseInt(formData.authorized_passengers) || 0;
        let defaultPassengers = 1; // الافتراضي لمعظم السيارات العامة
        let extraPassengerPrice = 10; // سعر الراكب الإضافي الافتراضي (دينار)
        
        // تحديد العدد الافتراضي وسعر الراكب الإضافي بناءً على قوة المحرك
        switch (formData.engine_power) {
          case 'سيارة تعليم قيادة':
            defaultPassengers = 1;
            extraPassengerPrice = 15; // 15 دينار لكل راكب إضافي
            break;
          case 'سيارة اسعاف':
            defaultPassengers = 1;
            extraPassengerPrice = 15; // 15 دينار لكل راكب إضافي
            break;
          case 'ركوبة عامة داخل المدينة':
            defaultPassengers = 1;
            extraPassengerPrice = 10; // 10 دينار لكل راكب إضافي
            break;
          case 'ركوبة عامة خارج المدينة':
            defaultPassengers = 1;
            extraPassengerPrice = 10; // 10 دينار لكل راكب إضافي (نفس داخل المدينة)
            break;
          case 'حافلة لنقل الركاب':
            defaultPassengers = 14;
            extraPassengerPrice = 8; // 8 دينار لكل راكب إضافي
            break;
          case 'مركبة مقطورة بحافلة ركاب':
            defaultPassengers = 14;
            extraPassengerPrice = 8; // 8 دينار لكل راكب إضافي
            break;
          default:
            defaultPassengers = 1;
            extraPassengerPrice = 10;
            break;
        }
        
        // حساب الزيادة في عدد الركاب
        if (currentPassengers > defaultPassengers) {
          const extraPassengers = currentPassengers - defaultPassengers;
          const extraCost = extraPassengers * extraPassengerPrice;
          basePremium = basePremium + extraCost;
        }
      }
      
      // حساب إضافي لزيادة الحمولة بالطن في حالة "نقل"
      const isTransportPurposeForLoad = formData.license_purpose && formData.license_purpose.includes('نقل');
      if (isTransportPurposeForLoad && formData.load_capacity) {
        const currentLoadCapacity = parseInt(formData.load_capacity) || 0;
        let defaultLoadCapacity = 0; // الافتراضي للحمولة بالطن
        let extraTonPrice = 8; // سعر الطن الواحد (دينار)
        let canIncreaseLoad = true; // هل يمكن زيادة الحمولة
        
        // تحديد الحمولة الافتراضية وسعر الطن بناءً على قوة المحرك
        switch (formData.engine_power) {
          case 'سيارة نقل':
            defaultLoadCapacity = 1; // 1 طن افتراضي
            extraTonPrice = 8; // 8 دينار لكل طن إضافي
            canIncreaseLoad = true;
            break;
          case 'رأس جر':
            canIncreaseLoad = false; // لا يوجد حمولة (لا يمكن زيادة الحمولة)
            break;
          case 'شاحنة صندوق':
            defaultLoadCapacity = 1; // 1 طن افتراضي
            extraTonPrice = 8; // 8 دينار لكل طن إضافي
            canIncreaseLoad = true;
            break;
          case 'مقطورة':
            // للمقطورة: السعر = الحمولة × 8 دينار لكل طن (بدون سعر أساسي)
            const tonPrice = 8; // 8 دينار لكل طن
            basePremium = currentLoadCapacity * tonPrice; // السعر الكامل = الحمولة × 8
            canIncreaseLoad = false; // لا حاجة لحساب زيادة، السعر يعتمد كلياً على الحمولة
            break;
          case 'مقطورة سيارة خاصة':
            canIncreaseLoad = false; // لا يوجد حمولة (لا يمكن زيادة الحمولة)
            break;
          case 'سيارة نقل موتى':
            canIncreaseLoad = false; // لا يوجد حمولة (لا يمكن زيادة الحمولة)
            break;
          default:
            canIncreaseLoad = false;
            break;
        }
        
        // حساب الزيادة في الحمولة بالطن (للمركبات الأخرى غير المقطورة)
        if (canIncreaseLoad && currentLoadCapacity > defaultLoadCapacity) {
          const extraTons = currentLoadCapacity - defaultLoadCapacity;
          const extraCost = extraTons * extraTonPrice;
          basePremium = basePremium + extraCost;
        }
      } else if (isTransportPurposeForLoad && formData.engine_power === 'مقطورة' && formData.load_capacity) {
        // للمقطورة: حتى لو كانت الحمولة = 0، يجب حساب السعر بناءً على الحمولة
        const currentLoadCapacity = parseInt(formData.load_capacity) || 0;
        const tonPrice = 8; // 8 دينار لكل طن
        basePremium = currentLoadCapacity * tonPrice;
      }
      
      // حساب إضافي لزيادة عدد الركاب والحمولة في حالة "زراعي"
      const isAgriculturalPurpose = formData.license_purpose && formData.license_purpose.includes('زراعي');
      if (isAgriculturalPurpose) {
        // حساب زيادة الركاب
        if (formData.authorized_passengers) {
          const currentPassengers = parseInt(formData.authorized_passengers) || 0;
          const defaultPassengers = 1; // 1 راكب افتراضي
          const extraPassengerPrice = 15; // 15 دينار لكل راكب إضافي
          
          if (currentPassengers > defaultPassengers) {
            const extraPassengers = currentPassengers - defaultPassengers;
            const extraCost = extraPassengers * extraPassengerPrice;
            basePremium = basePremium + extraCost;
          }
        }
        
        // حساب زيادة الحمولة بالطن
        if (formData.load_capacity) {
          const currentLoadCapacity = parseInt(formData.load_capacity) || 0;
          const defaultLoadCapacity = 0; // 0 طن افتراضي
          const extraTonPrice = 15; // 15 دينار لكل طن إضافي
          
          if (currentLoadCapacity > defaultLoadCapacity) {
            const extraTons = currentLoadCapacity - defaultLoadCapacity;
            const extraCost = extraTons * extraTonPrice;
            basePremium = basePremium + extraCost;
          }
        }
      }
      
      // حساب إضافي لزيادة عدد الركاب والحمولة في حالة "صناعي"
      const isIndustrialPurpose = formData.license_purpose && formData.license_purpose.includes('صناعي');
      if (isIndustrialPurpose) {
        // حساب زيادة الركاب
        if (formData.authorized_passengers) {
          const currentPassengers = parseInt(formData.authorized_passengers) || 0;
          const defaultPassengers = 1; // 1 راكب افتراضي
          const extraPassengerPrice = 15; // 15 دينار لكل راكب إضافي
          
          if (currentPassengers > defaultPassengers) {
            const extraPassengers = currentPassengers - defaultPassengers;
            const extraCost = extraPassengers * extraPassengerPrice;
            basePremium = basePremium + extraCost;
          }
        }
        
        // حساب زيادة الحمولة بالطن
        if (formData.load_capacity) {
          const currentLoadCapacity = parseInt(formData.load_capacity) || 0;
          const defaultLoadCapacity = 0; // 0 طن افتراضي
          const extraTonPrice = 15; // 15 دينار لكل طن إضافي
          
          if (currentLoadCapacity > defaultLoadCapacity) {
            const extraTons = currentLoadCapacity - defaultLoadCapacity;
            const extraCost = extraTons * extraTonPrice;
            basePremium = basePremium + extraCost;
          }
        }
      }
      
      // حساب القسط النهائي بناءً على المدة
      let finalPremium = basePremium;
      
      if (isCustomsInsurance) {
        // في تأمين جمرك، حساب القسط بناءً على المدة والركاب/الحمولة (خاصة أو عامة أو نقل أو زراعي أو صناعي)
        const isPrivatePurpose = formData.license_purpose && formData.license_purpose.includes('خاصة');
        const isPublicPurpose = formData.license_purpose && formData.license_purpose.includes('عامة');
        const isTransportPurpose = formData.license_purpose && formData.license_purpose.includes('نقل');
        const isAgriculturalPurpose = formData.license_purpose && formData.license_purpose.includes('زراعي');
        const isIndustrialPurpose = formData.license_purpose && formData.license_purpose.includes('صناعي');
        
        if (isPrivatePurpose) {
          // تأمين جمرك + خاصة: استخدام الأسعار الجديدة
          let monthlyPremium = 0;
          
          // تحديد القسط الشهري الأساسي بناءً على قوة المحرك
          switch (formData.engine_power) {
            case 'أقل من (16) حصان':
              monthlyPremium = 12.8;
              break;
            case 'من (17) الي (30) حصان':
              monthlyPremium = 14;
              break;
            case 'أكثر من (30) حصان':
              monthlyPremium = 18;
              break;
            case 'سيارة تجارية':
              monthlyPremium = 20;
              break;
            default:
              monthlyPremium = 0;
          }
          
          // حساب القسط الأساسي بناءً على المدة
          let days = 30; // افتراضي: شهر
          if (formData.duration) {
            switch (formData.duration) {
              case 'شهر (30 يوم)':
                days = 30;
                break;
              case 'شهرين (60 يوم)':
                days = 60;
                break;
              case 'ثلاثة أشهر (90 يوم)':
                days = 90;
                break;
              default:
                days = 30;
            }
          }
          
          // حساب القسط الأساسي بناءً على المدة
          if (days === 30) {
            finalPremium = monthlyPremium;
          } else if (days === 60) {
            finalPremium = monthlyPremium * 1.5; // شهرين = شهر × 1.5
          } else if (days === 90) {
            finalPremium = monthlyPremium * 2; // ثلاثة أشهر = شهر × 2
          } else {
            finalPremium = monthlyPremium;
          }
          
          // حساب زيادة الركاب (10 قروش = 100 درهم = 0.10 دينار لكل راكب إضافي لليوم الواحد)
          if (formData.authorized_passengers) {
            const currentPassengers = parseInt(formData.authorized_passengers) || 0;
            let defaultPassengers = 4; // الافتراضي لمعظم السيارات الخاصة
            
            // تحديد العدد الافتراضي بناءً على قوة المحرك
            if (formData.engine_power === 'سيارة تجارية') {
              defaultPassengers = 1;
            }
            
            // حساب الزيادة في عدد الركاب
            if (currentPassengers > defaultPassengers) {
              const extraPassengers = currentPassengers - defaultPassengers;
              const extraCostPerDay = 0.10; // 10 قروش = 100 درهم = 0.10 دينار
              const extraCost = extraPassengers * extraCostPerDay * days;
              finalPremium = finalPremium + extraCost;
            }
          }
        } else if (isPublicPurpose) {
          // تأمين جمرك + عامة: استخدام الأسعار الجديدة
          let monthlyPremium = 0;
          let defaultPassengers = 1; // الافتراضي لمعظم السيارات العامة
          
          // تحديد القسط الشهري الأساسي وعدد الركاب الافتراضي بناءً على قوة المحرك
          switch (formData.engine_power) {
            case 'سيارة تعليم قيادة':
              monthlyPremium = 11.6;
              defaultPassengers = 1;
              break;
            case 'سيارة اسعاف':
              monthlyPremium = 10;
              defaultPassengers = 1;
              break;
            case 'ركوبة عامة داخل المدينة':
              monthlyPremium = 12.8;
              defaultPassengers = 1;
              break;
            case 'ركوبة عامة خارج المدينة':
              monthlyPremium = 12.8;
              defaultPassengers = 1;
              break;
            case 'حافلة لنقل الركاب':
              monthlyPremium = 16.8;
              defaultPassengers = 14;
              break;
            case 'مركبة مقطورة بحافلة ركاب':
              monthlyPremium = 16.8;
              defaultPassengers = 14;
              break;
            default:
              monthlyPremium = 0;
              defaultPassengers = 1;
          }
          
          // حساب القسط الأساسي بناءً على المدة
          let days = 30; // افتراضي: شهر
          if (formData.duration) {
            switch (formData.duration) {
              case 'شهر (30 يوم)':
                days = 30;
                break;
              case 'شهرين (60 يوم)':
                days = 60;
                break;
              case 'ثلاثة أشهر (90 يوم)':
                days = 90;
                break;
              default:
                days = 30;
            }
          }
          
          // حساب القسط الأساسي بناءً على المدة
          if (days === 30) {
            finalPremium = monthlyPremium;
          } else if (days === 60) {
            finalPremium = monthlyPremium * 1.5; // شهرين = شهر × 1.5
          } else if (days === 90) {
            finalPremium = monthlyPremium * 2; // ثلاثة أشهر = شهر × 2
          } else {
            finalPremium = monthlyPremium;
          }
          
          // حساب زيادة الركاب (10 قروش = 100 درهم = 0.10 دينار لكل راكب إضافي لليوم الواحد)
          if (formData.authorized_passengers) {
            const currentPassengers = parseInt(formData.authorized_passengers) || 0;
            
            // حساب الزيادة في عدد الركاب
            if (currentPassengers > defaultPassengers) {
              const extraPassengers = currentPassengers - defaultPassengers;
              const extraCostPerDay = 0.10; // 10 قروش = 100 درهم = 0.10 دينار
              const extraCost = extraPassengers * extraCostPerDay * days;
              finalPremium = finalPremium + extraCost;
            }
          }
        } else if (isTransportPurpose) {
          // تأمين جمرك + نقل: استخدام الأسعار الجديدة بناءً على الحمولة
          let monthlyPremium = 0;
          let hasLoadCapacity = true; // هل يوجد حمولة أم لا
          
          // تحديد القسط الشهري الأساسي بناءً على قوة المحرك
          switch (formData.engine_power) {
            case 'سيارة نقل':
              monthlyPremium = 13;
              hasLoadCapacity = true;
              break;
            case 'رأس جر':
              monthlyPremium = 13;
              hasLoadCapacity = true;
              break;
            case 'شاحنة صندوق':
              monthlyPremium = 14.6;
              hasLoadCapacity = true;
              break;
            case 'مقطورة':
              monthlyPremium = 0; // السعر يعتمد على الحمولة بالطن (8 دينار لكل طن)
              hasLoadCapacity = true;
              break;
            case 'مقطورة سيارة خاصة':
              monthlyPremium = 6;
              hasLoadCapacity = false; // لا يوجد حمولة
              break;
            case 'سيارة نقل موتى':
              monthlyPremium = 4.8;
              hasLoadCapacity = false; // لا يوجد حمولة
              break;
            default:
              monthlyPremium = 0;
              hasLoadCapacity = true;
          }
          
          // حساب القسط الأساسي بناءً على المدة
          let days = 30; // افتراضي: شهر
          if (formData.duration) {
            switch (formData.duration) {
              case 'شهر (30 يوم)':
                days = 30;
                break;
              case 'شهرين (60 يوم)':
                days = 60;
                break;
              case 'ثلاثة أشهر (90 يوم)':
                days = 90;
                break;
              default:
                days = 30;
            }
          }
          
          // حساب القسط الأساسي بناءً على المدة
          if (days === 30) {
            finalPremium = monthlyPremium;
          } else if (days === 60) {
            finalPremium = monthlyPremium * 1.5; // شهرين = شهر × 1.5
          } else if (days === 90) {
            finalPremium = monthlyPremium * 2; // ثلاثة أشهر = شهر × 2
          } else {
            finalPremium = monthlyPremium;
          }
          
          // حساب زيادة الحمولة بالطن
          // فقط إذا كان النوع يدعم الحمولة (hasLoadCapacity = true)
          if (hasLoadCapacity && formData.load_capacity) {
            const currentLoadCapacity = parseFloat(formData.load_capacity) || 0;
            const defaultLoadCapacity = 0; // 0 طن افتراضي
            
            // حساب الزيادة في الحمولة
            if (currentLoadCapacity > defaultLoadCapacity) {
              const extraTons = currentLoadCapacity - defaultLoadCapacity;
              
              // للمقطورة: 8 دينار لكل طن (سعر شهري)
              if (formData.engine_power === 'مقطورة') {
                const tonPricePerMonth = 8; // 8 دينار لكل طن شهرياً
                const extraCost = extraTons * tonPricePerMonth;
                // حساب السعر بناءً على المدة
                if (days === 30) {
                  finalPremium = finalPremium + extraCost;
                } else if (days === 60) {
                  finalPremium = finalPremium + (extraCost * 1.5); // شهرين = شهر × 1.5
                } else if (days === 90) {
                  finalPremium = finalPremium + (extraCost * 2); // ثلاثة أشهر = شهر × 2
                }
              } else {
                // للأنواع الأخرى: 10 قروش = 100 درهم = 0.10 دينار لكل طن إضافي لليوم الواحد
                const extraCostPerDay = 0.10; // 10 قروش = 100 درهم = 0.10 دينار
                const extraCost = extraTons * extraCostPerDay * days;
                finalPremium = finalPremium + extraCost;
              }
            }
          }
        } else if (isAgriculturalPurpose) {
          // تأمين جمرك + زراعي: استخدام الأسعار الجديدة بناءً على الحمولة
          let monthlyPremium = 0;
          
          // تحديد القسط الشهري الأساسي بناءً على قوة المحرك
          switch (formData.engine_power) {
            case 'جرار زراعي':
              monthlyPremium = 3.2;
              break;
            case 'ألات زراعية':
              monthlyPremium = 3.2;
              break;
            default:
              monthlyPremium = 0;
          }
          
          // حساب القسط الأساسي بناءً على المدة
          let days = 30; // افتراضي: شهر
          if (formData.duration) {
            switch (formData.duration) {
              case 'شهر (30 يوم)':
                days = 30;
                break;
              case 'شهرين (60 يوم)':
                days = 60;
                break;
              case 'ثلاثة أشهر (90 يوم)':
                days = 90;
                break;
              default:
                days = 30;
            }
          }
          
          // حساب القسط الأساسي بناءً على المدة
          if (days === 30) {
            finalPremium = monthlyPremium;
          } else if (days === 60) {
            finalPremium = monthlyPremium * 1.5; // شهرين = شهر × 1.5
          } else if (days === 90) {
            finalPremium = monthlyPremium * 2; // ثلاثة أشهر = شهر × 2
          } else {
            finalPremium = monthlyPremium;
          }
          
          // حساب زيادة الحمولة بالطن (10 قروش = 100 درهم = 0.10 دينار لكل طن إضافي لليوم الواحد)
          if (formData.load_capacity) {
            const currentLoadCapacity = parseFloat(formData.load_capacity) || 0;
            const defaultLoadCapacity = 0; // 0 طن افتراضي
            
            // حساب الزيادة في الحمولة
            if (currentLoadCapacity > defaultLoadCapacity) {
              const extraTons = currentLoadCapacity - defaultLoadCapacity;
              const extraCostPerDay = 0.10; // 10 قروش = 100 درهم = 0.10 دينار
              const extraCost = extraTons * extraCostPerDay * days;
              finalPremium = finalPremium + extraCost;
            }
          }
        } else if (isIndustrialPurpose) {
          // تأمين جمرك + صناعي: استخدام الأسعار الجديدة بناءً على الحمولة
          let monthlyPremium = 0;
          
          // تحديد القسط الشهري الأساسي بناءً على قوة المحرك
          switch (formData.engine_power) {
            case 'جرار صناعي':
              monthlyPremium = 6.8;
              break;
            case 'ألات حفر':
              monthlyPremium = 6.8;
              break;
            case 'ألات رفع':
              monthlyPremium = 6.8;
              break;
            case 'ألات تعبيد الطرق':
              monthlyPremium = 6.8;
              break;
            default:
              monthlyPremium = 0;
          }
          
          // حساب القسط الأساسي بناءً على المدة
          let days = 30; // افتراضي: شهر
          if (formData.duration) {
            switch (formData.duration) {
              case 'شهر (30 يوم)':
                days = 30;
                break;
              case 'شهرين (60 يوم)':
                days = 60;
                break;
              case 'ثلاثة أشهر (90 يوم)':
                days = 90;
                break;
              default:
                days = 30;
            }
          }
          
          // حساب القسط الأساسي بناءً على المدة
          if (days === 30) {
            finalPremium = monthlyPremium;
          } else if (days === 60) {
            finalPremium = monthlyPremium * 1.5; // شهرين = شهر × 1.5
          } else if (days === 90) {
            finalPremium = monthlyPremium * 2; // ثلاثة أشهر = شهر × 2
          } else {
            finalPremium = monthlyPremium;
          }
          
          // حساب زيادة الحمولة بالطن (10 قروش = 100 درهم = 0.10 دينار لكل طن إضافي لليوم الواحد)
          if (formData.load_capacity) {
            const currentLoadCapacity = parseFloat(formData.load_capacity) || 0;
            const defaultLoadCapacity = 0; // 0 طن افتراضي
            
            // حساب الزيادة في الحمولة
            if (currentLoadCapacity > defaultLoadCapacity) {
              const extraTons = currentLoadCapacity - defaultLoadCapacity;
              const extraCostPerDay = 0.10; // 10 قروش = 100 درهم = 0.10 دينار
              const extraCost = extraTons * extraCostPerDay * days;
              finalPremium = finalPremium + extraCost;
            }
          }
        } else {
          // تأمين جمرك + غير خاصة/عامة/نقل/زراعي/صناعي: استخدام المنطق القديم
          let days = 30; // افتراضي: شهر
          if (formData.duration) {
            switch (formData.duration) {
              case 'شهر (30 يوم)':
                days = 30;
                break;
              case 'شهرين (60 يوم)':
                days = 60;
                break;
              case 'ثلاثة أشهر (90 يوم)':
                days = 90;
                break;
              default:
                days = 30;
            }
          }
          
          // القسط اليومي = القسط السنوي (بما في ذلك الزيادات) / 365
          const dailyPremium = basePremium / 365;
          // القسط النهائي = القسط اليومي × عدد الأيام
          finalPremium = dailyPremium * days;
        }
      } else {
        // تأمين عادي - إذا كانت المدة سنتين، يتضاعف السعر
        if (formData.duration === 'سنتين' || formData.duration === 'سنتين (730 يوم)') {
          finalPremium = basePremium * 2;
        }
      }
      
      // للمقطورة، حتى لو كانت الحمولة 0، يجب أن يكون premium 0 (وليس فارغ)
      const isTransportPurposeForPremium = formData.license_purpose && formData.license_purpose.includes('نقل');
      const isTrailer = formData.engine_power === 'مقطورة';
      
      setFormData(prev => ({
        ...prev,
        premium: (finalPremium > 0 || (isTransportPurposeForPremium && isTrailer)) ? finalPremium.toFixed(3) : ''
      }));
    }
  }, [formData.engine_power, formData.duration, formData.third_party_purpose, formData.foreign_car_purpose, formData.authorized_passengers, formData.license_purpose, formData.load_capacity, isCustomsInsurance, isThirdPartyInsurance, isForeignCarInsurance]);

  // إعادة تعيين قوة المحرك عند تغيير الغرض من الترخيص
  useEffect(() => {
    if (formData.license_purpose && formData.engine_power) {
      const isPublic = formData.license_purpose.includes('عامة');
      const isPrivate = formData.license_purpose.includes('خاصة');
      const isTransport = formData.license_purpose.includes('نقل');
      const isAgricultural = formData.license_purpose.includes('زراعي');
      const isIndustrial = formData.license_purpose.includes('صناعي');
      
      // إنشاء قائمة بجميع قوائم قوة المحرك الأخرى
      const allOtherPowers = [
        ...ENGINE_POWERS_PRIVATE,
        ...ENGINE_POWERS_PUBLIC,
        ...ENGINE_POWERS_TRANSPORT,
        ...ENGINE_POWERS_AGRICULTURAL,
        ...ENGINE_POWERS_INDUSTRIAL
      ].filter(power => {
        if (isPublic) return !ENGINE_POWERS_PUBLIC.includes(power);
        if (isPrivate) return !ENGINE_POWERS_PRIVATE.includes(power);
        if (isTransport) return !ENGINE_POWERS_TRANSPORT.includes(power);
        if (isAgricultural) return !ENGINE_POWERS_AGRICULTURAL.includes(power);
        if (isIndustrial) return !ENGINE_POWERS_INDUSTRIAL.includes(power);
        return true;
      });
      
      // إذا كانت قوة المحرك الحالية من قائمة أخرى غير المختارة، إعادة تعيين
      if (allOtherPowers.includes(formData.engine_power)) {
        setFormData(prev => ({
          ...prev,
          engine_power: '',
          premium: '',
          authorized_passengers: ''
        }));
      }
    }
  }, [formData.license_purpose]);

  const fetchPlates = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/plates`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setPlates(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching plates:', error);
    }
  };

  const fetchVehicleTypes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/vehicle-types`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setVehicleTypes(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
    }
  };

  const fetchColors = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/colors`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setColors(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching colors:', error);
    }
  };

  /* const filteredPlates = plates.filter(p =>
    p.plate_number.toLowerCase().includes(plateSearch.toLowerCase()) ||
    p.city.name_ar.toLowerCase().includes(plateSearch.toLowerCase()) ||
    p.city.name_en.toLowerCase().includes(plateSearch.toLowerCase())
  ); */

  // الحصول على قائمة فريدة من العلامات التجارية
  const uniqueBrands = Array.from(new Set(vehicleTypes.map(vt => vt.brand)))
    .filter(brand => brand.toLowerCase().includes(vehicleTypeSearch.toLowerCase()))
    .sort();

  const selectedVehicleType = vehicleTypes.find(vt => vt.id === parseInt(formData.vehicle_type_id));
  const selectedBrand = selectedVehicleType ? selectedVehicleType.brand : '';
  const [_selectedCategory, setSelectedCategory] = useState('');
  
  // عرض الفئات الخاصة بالعلامة التجارية المختارة
  const filteredCategories = selectedBrand
    ? vehicleTypes.filter(vt => vt.brand === selectedBrand)
    : [];

  useEffect(() => {
    setSelectedCategory(selectedVehicleType?.category || '');
  }, [selectedVehicleType?.category]);

  /* const filteredColors = colors.filter(color =>
    color.name.toLowerCase().includes(colorSearch.toLowerCase())
  ); */

  /* const filteredYears = YEARS.filter(y =>
    y.toString().includes(yearSearch)
  ); */

  // إضافة نوع سيارة جديد
  /* const handleAddVehicleType = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newVehicleTypeBrand.trim() || !newVehicleTypeCategory.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/vehicle-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          brand: newVehicleTypeBrand.trim(),
          category: newVehicleTypeCategory.trim(),
        }),
      });

      if (res.ok) {
        const newVehicleType = await res.json();
        setVehicleTypes([...vehicleTypes, newVehicleType]);
        setFormData({ ...formData, vehicle_type_id: newVehicleType.id.toString() });
        setSelectedCategory(newVehicleType.category);
        // إبقاء الماركة لتسهيل إضافة أكثر من فئة
        setNewVehicleTypeCategory('');
        setShowAddVehicleType(true);
        setShowVehicleTypeDropdown(true);
        showToast('تم إضافة نوع السيارة بنجاح', 'success');
      } else {
        const data = await res.json();
        showToast(data.message || 'حدث خطأ أثناء إضافة نوع السيارة', 'error');
      }
    } catch (error: any) {
      showToast('حدث خطأ أثناء إضافة نوع السيارة', 'error');
    }
  }; */

  /* const handleDeleteVehicleTypeClick = (e: React.MouseEvent, vehicleType: VehicleType) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteVehicleTypeModal({ id: vehicleType.id, brand: vehicleType.brand, category: vehicleType.category });
  }; */

  const handleDeleteVehicleType = async () => {
    if (!showDeleteVehicleTypeModal) return;
    setDeletingVehicleType(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vehicle-types/${showDeleteVehicleTypeModal.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        setVehicleTypes(vehicleTypes.filter(vt => vt.id !== showDeleteVehicleTypeModal.id));
        if (formData.vehicle_type_id === showDeleteVehicleTypeModal.id.toString()) {
          setFormData({ ...formData, vehicle_type_id: '' });
          setSelectedCategory('');
        }
        setShowDeleteVehicleTypeModal(null);
        showToast('تم حذف نوع السيارة بنجاح', 'success');
      } else {
        const data = await res.json();
        showToast(data.message || 'حدث خطأ أثناء حذف نوع السيارة', 'error');
      }
    } catch (error: any) {
      showToast('حدث خطأ أثناء حذف نوع السيارة', 'error');
    } finally {
      setDeletingVehicleType(false);
    }
  };
  // إضافة لون جديد
  /* const handleAddColor = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newColorName.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/colors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ name: newColorName.trim() }),
      });

      if (res.ok) {
        const newColor = await res.json();
        setColors([...colors, newColor]);
        setFormData({ ...formData, color: newColor.name });
        setNewColorName('');
        setShowAddColor(false);
        setShowColorDropdown(false);
        showToast('تم إضافة اللون بنجاح', 'success');
      } else {
        const data = await res.json();
        showToast(data.message || 'حدث خطأ أثناء إضافة اللون', 'error');
      }
    } catch (error: any) {
      showToast('حدث خطأ أثناء إضافة اللون', 'error');
    }
  }; */

  // حذف لون
  /* const handleDeleteColorClick = (e: React.MouseEvent, colorId: number, colorName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteColorModal({ id: colorId, name: colorName });
  }; */

  const handleDeleteColor = async () => {
    if (!showDeleteColorModal) return;
    setDeletingColor(true);
    try {
      const res = await fetch(`${API_BASE_URL}/colors/${showDeleteColorModal.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        setColors(colors.filter(color => color.id !== showDeleteColorModal.id));
        if (formData.color === showDeleteColorModal.name) {
          setFormData({ ...formData, color: '' });
        }
        setShowDeleteColorModal(null);
        showToast('تم حذف اللون بنجاح', 'success');
      } else {
        const data = await res.json();
        showToast(data.message || 'حدث خطأ أثناء حذف اللون', 'error');
      }
    } catch (error: any) {
      showToast('حدث خطأ أثناء حذف اللون', 'error');
    } finally {
      setDeletingColor(false);
    }
  };


  // const selectedPlate = plates.find(p => p.id === parseInt(formData.plate_id));

  // تحديد قائمة قوة المحرك بناءً على الغرض من الترخيص
  const isPublicPurpose = formData.license_purpose && formData.license_purpose.includes('عامة');
  const isPrivatePurpose = formData.license_purpose && formData.license_purpose.includes('خاصة');
  const isTransportPurpose = formData.license_purpose && formData.license_purpose.includes('نقل');
  const isAgriculturalPurpose = formData.license_purpose && formData.license_purpose.includes('زراعي');
  const isIndustrialPurpose = formData.license_purpose && formData.license_purpose.includes('صناعي');
  
  // تحديد الخيارات المتاحة بناءً على الغرض المختار
  const getAvailableEnginePowers = () => {
    if (isPublicPurpose) {
      return ENGINE_POWERS_PUBLIC;
    } else if (isTransportPurpose) {
      return ENGINE_POWERS_TRANSPORT;
    } else if (isAgriculturalPurpose) {
      return ENGINE_POWERS_AGRICULTURAL;
    } else if (isIndustrialPurpose) {
      return ENGINE_POWERS_INDUSTRIAL;
    } else if (isPrivatePurpose) {
      return ENGINE_POWERS_PRIVATE;
    } else {
      // الافتراضي: خاصة
      return ENGINE_POWERS_PRIVATE;
    }
  };
  
  const availableEnginePowers = getAvailableEnginePowers();
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!isCustomsInsurance && !isForeignCarInsurance && !formData.plate_id) {
      errors.plate_id = 'الجهة المقيد بها مطلوبة';
    }
    if (isCustomsInsurance && !formData.port) {
      errors.port = 'الميناء مطلوب';
    }
    if (!isMandatoryInsurance && !isCustomsInsurance && !formData.start_date) {
      errors.start_date = 'بداية التأمين مطلوبة';
    }
    if (isThirdPartyInsurance && !isForeignCarInsurance && !formData.third_party_purpose) {
      errors.third_party_purpose = 'الغرض من الطرف الثالث مطلوب';
    }
    if (isForeignCarInsurance) {
      if (!formData.foreign_car_country) {
        errors.foreign_car_country = 'دولة السيارة مطلوبة';
      }
      if (!formData.foreign_car_purpose) {
        errors.foreign_car_purpose = 'الغرض من السيارة مطلوب';
      }
    }
    if (!isThirdPartyInsurance && !isForeignCarInsurance && !formData.engine_power) {
      errors.engine_power = 'قوة المحرك مطلوبة';
    }

    if (!formData.chassis_number || !formData.chassis_number.trim()) {
      errors.chassis_number = 'رقم الهيكل مطلوب';
    }
    if (!formData.plate_number_manual || !formData.plate_number_manual.trim()) {
      errors.plate_number_manual = 'رقم اللوحة المعدنية مطلوب';
    }
    if (!formData.vehicle_type_id) {
      errors.vehicle_type_id = 'نوع السيارة مطلوب';
    }
    if (!formData.color || !formData.color.trim()) {
      errors.color = 'اللون مطلوب';
    }
    if (!formData.year || !formData.year.trim()) {
      errors.year = 'سنة الصنع مطلوبة';
    }
    if (!isForeignCarInsurance && !formData.license_purpose) {
      errors.license_purpose = 'الغرض من الترخيص مطلوب';
    }
    if (formData.engine_power) {
      if (!(isTransportPurpose && formData.engine_power === 'مقطورة')) {
        if (!formData.authorized_passengers || !formData.authorized_passengers.trim()) {
          errors.authorized_passengers = 'عدد الركاب مطلوب';
        }
      }
      if (!formData.load_capacity || formData.load_capacity.trim() === '') {
        errors.load_capacity = 'الحمولة بالطن مطلوبة';
      }
    }
    if (isForeignCarInsurance && formData.foreign_car_purpose) {
      if (!formData.authorized_passengers || !formData.authorized_passengers.trim()) {
        errors.authorized_passengers = 'عدد الركاب مطلوب';
      }
      if (!formData.load_capacity || formData.load_capacity.trim() === '') {
        errors.load_capacity = 'الحمولة بالطن مطلوبة';
      }
    }
    if (!formData.insured_name || !formData.insured_name.trim()) {
      errors.insured_name = 'اسم المؤمن له مطلوب';
    }
    if (!formData.phone || !formData.phone.trim()) {
      errors.phone = 'رقم الهاتف مطلوب';
    }

    // EIDC Specific Validations
    if (isMandatoryInsurance) {
      if (!formData.nid_passport || !formData.nid_passport.trim()) {
        errors.nid_passport = 'رقم الهوية الوطنية أو جواز السفر مطلوب للهيئة';
      }
      if (!formData.eidc_vehicle_type_id) {
        errors.eidc_vehicle_type_id = 'تصنيف المركبة (النوع) مطلوب للهيئة';
      }
      if (!formData.eidc_vehicle_spec_id) {
        errors.eidc_vehicle_spec_id = 'تصنيف المركبة (المواصفة) مطلوب للهيئة';
      }
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
      
      // تحضير البيانات للإرسال
      // التأكد من أن premium ليس فارغاً أو NaN
      let premiumValue = 0;
      if (formData.premium && formData.premium.trim() !== '') {
        const parsed = parseFloat(formData.premium);
        premiumValue = isNaN(parsed) ? 0 : parsed;
      }
      
      // إذا كان premium 0 أو فارغ، حاول حساب القيمة الأساسية للمقطورة
      if (premiumValue === 0 && formData.engine_power === 'مقطورة') {
        if (formData.load_capacity && formData.load_capacity.trim() !== '') {
          const loadCap = parseFloat(formData.load_capacity) || 0;
          premiumValue = loadCap * 8; // 8 دينار لكل طن
        } else {
          // إذا لم يتم إدخال الحمولة، استخدم 0 (سيتم رفضه من الـ backend إذا كان required)
          premiumValue = 0;
        }
      }
      
      // التأكد من أن premium ليس 0 (مطلوب من الـ backend)
      if (premiumValue === 0) {
        console.warn('Premium is 0, this may cause validation error');
      }
      const yearValue = formData.year && formData.year.trim() !== '' ? (isNaN(parseInt(formData.year)) ? null : parseInt(formData.year)) : null;
      const authorizedPassengersValue = formData.authorized_passengers && formData.authorized_passengers.trim() !== '' 
        ? (isNaN(parseInt(formData.authorized_passengers)) ? null : parseInt(formData.authorized_passengers)) 
        : null;
      const loadCapacityValue = formData.load_capacity && formData.load_capacity.trim() !== '' 
        ? (isNaN(parseFloat(formData.load_capacity)) ? null : parseFloat(formData.load_capacity)) 
        : null;

      const requestBody: any = {
          insurance_type: formData.insurance_type,
          plate_id: (isCustomsInsurance || isForeignCarInsurance) ? null : (formData.plate_id ? parseInt(formData.plate_id) : null),
          port: formData.port || null,
          start_date: (isMandatoryInsurance || isCustomsInsurance) ? (() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
          })() : formData.start_date,
          end_date: formData.end_date ? formData.end_date.replace(/\//g, '-') : formData.end_date,
          duration: formData.duration || null,
          chassis_number: formData.chassis_number || null,
          plate_number_manual: formData.plate_number_manual || null,
          vehicle_type_id: formData.vehicle_type_id ? parseInt(formData.vehicle_type_id) : null,
          color: formData.color || null,
          year: yearValue,
          fuel_type: formData.fuel_type || null,
          license_purpose: formData.license_purpose || null,
          engine_power: formData.engine_power || null,
          authorized_passengers: authorizedPassengersValue,
          load_capacity: loadCapacityValue,
          insured_name: formData.insured_name || null,
          phone: formData.phone || null,
          whatsapp_number: formData.whatsapp_number || null,
          driving_license_number: formData.driving_license_number || null,
          premium: premiumValue,
          third_party_purpose: formData.third_party_purpose || null,
          foreign_car_country: formData.foreign_car_country || null,
          foreign_car_purpose: formData.foreign_car_purpose || null,
          // EIDC Integration Fields
          nid_passport: formData.nid_passport || null,
          eidc_vehicle_type_id: formData.eidc_vehicle_type_id || null,
          eidc_vehicle_spec_id: formData.eidc_vehicle_spec_id || null,
          eidc_vehicle_detail_id: formData.eidc_vehicle_detail_id || null,
          nationality: formData.nationality || null,
          email: formData.email || null,
          address: formData.address || null,
          engine_number: formData.engine_number || null,
          engine_cc: formData.engine_cc || null,
          vehicle_weight: formData.vehicle_weight || null,
          notes: formData.notes || null,
          // إرسال أسماء الماركة والموديل كنص للهيئة لتظهر في الوثيقة
          vehicle_type_name: (() => {
             const vt = vehicleTypes.find(t => t.id.toString() === formData.vehicle_type_id);
             return vt ? `${vt.brand}` : ''; // إرسال الماركة فقط
          })(),
          eidc_vehicle_type_name: eidcVehicleTypes.find(t => t.id === formData.eidc_vehicle_type_id)?.typeVehicle || '',
          TypeOfVehicle: (() => {
             const vt = vehicleTypes.find(t => t.id.toString() === formData.vehicle_type_id);
             return vt ? `${vt.brand}` : ''; // إرسال الماركة فقط
          })(),
        };
      
      console.log('Sending request data:', requestBody);
      
      const res = await fetch(`${API_BASE_URL}/insurance-documents`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFormErrors(data.errors);
          console.error('Validation errors:', data.errors);
        }
        console.error('Error response:', data);
        throw new Error(data.message || 'حدث خطأ أثناء إنشاء الوثيقة');
      }

      showToast('تم إنشاء الوثيقة بنجاح', 'success');
      setTimeout(() => {
        navigate('/insurance-documents');
      }, 1000);
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء إنشاء الوثيقة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotal = () => {
    const premium = parseFloat(formData.premium) || 0;
    const tax = 1.000;
    const stamp = 0.500;
    const issueFees = 2.000;
    const supervisionFees = 0.500;
    return premium + tax + stamp + issueFees + supervisionFees;
  };

  // الموانئ المتاحة
  /* const PORTS = [
    { value: 'ميناء مصراته', cityName: 'مصراته' },
    { value: 'ميناء طرابلس', cityName: 'طرابلس' },
    { value: 'ميناء الخمس', cityName: 'الخمس' },
    { value: 'ميناء بنغازي', cityName: 'بنغازي' },
  ]; */

  // البحث عن اللوحة حسب الميناء المختار
  // const selectedPort = PORTS.find(p => p.value === formData.port);
  /* const portPlate = selectedPort 
    ? plates.find(p => p.city.name_ar === selectedPort.cityName)
    : null; */

  return (
    <section className="users-management">
    

        <div className="users-card">
          <div className="form-page-container">
            {/* اختيار نوع التأمين - يظهر دائماً في البداية لتحديد شكل النموذج */}
            <div className="form-section" style={{ marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '20px' }}>
              <div className="form-group" style={{ maxWidth: '400px' }}>
                <label htmlFor="main_insurance_type" style={{ fontWeight: 'bold', fontSize: '16px' }}>نوع التأمين <span className="required">*</span></label>
                <select
                  id="main_insurance_type"
                  value={formData.insurance_type}
                  onChange={(e) => setFormData({ ...formData, insurance_type: e.target.value as any })}
                  style={{ padding: '12px', fontSize: '15px', border: '2px solid #2563eb' }}
                >
                  <option value="تأمين إجباري سيارات">تأمين إجباري سيارات</option>
                  <option value="تأمين طرف ثالث سيارات">تأمين طرف ثالث سيارات</option>
                  <option value="تأمين سيارات أجنبية">تأمين سيارات أجنبية</option>
                </select>
              </div>
            </div>

            {isMandatoryInsurance ? (
              /* --- نظام المراحل للتأمين الإجباري فقط --- */
              <>
                <div className="stepper-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px', position: 'relative', padding: '0 20px' }}>
                  <div style={{ position: 'absolute', top: '15px', left: '40px', right: '40px', height: '2px', background: '#e5e7eb', zIndex: 1 }}>
                    <div style={{ width: `${((currentStep - 1) / 2) * 100}%`, height: '100%', background: '#2563eb', transition: 'width 0.3s ease' }}></div>
                  </div>
                  {[
                    { id: 1, title: 'بيانات المؤمن له', icon: 'fa-user' },
                    { id: 2, title: 'بيانات المركبة', icon: 'fa-car' },
                    { id: 3, title: 'احتساب القسط', icon: 'fa-calculator' }
                  ].map((s) => (
                    <div key={s.id} style={{ zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '35px', height: '35px', borderRadius: '50%', 
                        background: currentStep >= s.id ? '#2563eb' : '#fff', 
                        border: `2px solid ${currentStep >= s.id ? '#2563eb' : '#e5e7eb'}`,
                        color: currentStep >= s.id ? '#fff' : '#9ca3af',
                        display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px'
                      }}><i className={`fa-solid ${s.icon}`}></i></div>
                      <span style={{ fontSize: '12px', fontWeight: currentStep === s.id ? '600' : '400' }}>{s.title}</span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="user-form">
            
            {/* Step 1: بيانات المؤمن له والوثيقة */}
            {currentStep === 1 && (
              <div className="form-section animate-fade-in">
                <h3 className="form-section-title">بيانات المؤمن له / المشترك - بيانات الوثيقة</h3>
                
                {/* اختيار الوكيل (للمدراء فقط) */}

                
                  <div className="form-group">
                    <label>تاريخ الإصدار</label>
                    <input type="text" value={new Date().toLocaleDateString('ar-LY')} disabled style={{ background: '#f3f4f6' }} />
                  </div>

                <div className="form-group">
                  <label htmlFor="insured_name">اسم المؤمن له / المشترك <span className="required">*</span></label>
                  <input
                    type="text"
                    id="insured_name"
                    value={formData.insured_name}
                    onChange={(e) => setFormData({ ...formData, insured_name: e.target.value })}
                    placeholder="اسم المؤمن له كما في الإثبات"
                  />
                  {formErrors.insured_name && <span className="error-message">{formErrors.insured_name}</span>}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="nationality">الجنسية <span className="required">*</span></label>
                    <input
                      type="text"
                      id="nationality"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="nid_passport">رقم الهوية الوطنية أو جواز السفر <span className="required">*</span></label>
                    <input
                      type="text"
                      id="nid_passport"
                      value={formData.nid_passport}
                      onChange={(e) => setFormData({ ...formData, nid_passport: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="duration">مدة التأمين <span className="required">*</span></label>
                    <select
                      id="duration"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value as any })}
                    >
                      {isMandatoryInsurance ? (
                        <>
                          <option value="سنة (365 يوم)">تأمين سنوي</option>
                          <option value="تأمين من شهرين إلى 3 أشهر">تأمين من شهرين إلى 3 أشهر</option>
                          <option value="تأمين من شهر إلى شهرين">تأمين من شهر إلى شهرين</option>
                          <option value="تأمين من 15 يوم إلى شهر">تأمين من 15 يوم إلى شهر</option>
                          <option value="تأمين من 1 يوم إلى 15 يوم">تأمين من 1 يوم إلى 15 يوم</option>
                        </>
                      ) : (
                        <>
                          <option value="شهر (30 يوم)">شهر (30 يوم)</option>
                          <option value="سنة (365 يوم)">سنة (365 يوم)</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>تاريخ البدء</label>
                    <input 
                      type={isMandatoryInsurance ? "text" : "date"}
                      value={isMandatoryInsurance ? (() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        return tomorrow.toLocaleDateString('ar-LY');
                      })() : formData.start_date}
                      disabled={isMandatoryInsurance}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      style={isMandatoryInsurance ? { background: '#f3f4f6' } : {}}
                    />
                  </div>
                </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="phone">رقم الهاتف <span className="required">*</span></label>
                      <input type="text" id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="whatsapp_number">رقم الواتساب</label>
                      <input type="text" id="whatsapp_number" value={formData.whatsapp_number} onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })} placeholder="رقم الواتساب للتواصل" />
                    </div>
                  </div>

                <div className="form-group">
                  <label htmlFor="address">العنوان التفصيلي <span className="required">*</span></label>
                  <input type="text" id="address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="مثلاً: طرابلس - حي الأندلس" />
                </div>

                <div className="form-group">
                  <label htmlFor="email">البريد الإلكتروني</label>
                  <input type="email" id="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="example@mail.com" />
                </div>
              </div>
            )}

            {/* Step 2: بيانات المركبة */}
            {currentStep === 2 && (
              <div className="form-section animate-fade-in">
                <h3 className="form-section-title">بيانات المركبة</h3>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>الجهة المقيد بها <span className="required">*</span></label>
                    <select value={formData.plate_id} onChange={(e) => setFormData({ ...formData, plate_id: e.target.value })}>
                      <option value="">اختر الجهة...</option>
                      {plates.map(p => <option key={p.id} value={p.id}>{p.city.name_ar}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>رقم اللوحة <span className="required">*</span></label>
                    <input type="text" value={formData.plate_number_manual} onChange={(e) => setFormData({ ...formData, plate_number_manual: e.target.value })} />
                  </div>
                </div>

                {/* اختيار نوع السيارة (الماركة والموديل) */}
                <div className="form-grid">
                  <div className="form-group relative" ref={vehicleTypeDropdownRef} style={{ position: 'relative' }}>
                    <label>ماركة السيارة <span className="required">*</span></label>
                    <div className="searchable-select" onClick={() => setShowVehicleTypeDropdown(!showVehicleTypeDropdown)}>
                      <div className="select-display">
                        {selectedBrand || (vehicleTypeSearch ? 'جاري البحث...' : 'اختر الماركة...')}
                      </div>
                      <i className={`fa-solid fa-chevron-${showVehicleTypeDropdown ? 'up' : 'down'}`}></i>
                    </div>
                    
                    {showVehicleTypeDropdown && (
                      <div className="select-dropdown animate-fade-in">
                        <div className="select-search">
                          <i className="fa-solid fa-search"></i>
                          <input 
                            type="text" 
                            placeholder="بحث عن ماركة..." 
                            value={vehicleTypeSearch}
                            onChange={(e) => setVehicleTypeSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                        <div className="select-options">
                          {uniqueBrands.length > 0 ? (
                            uniqueBrands.map(brand => (
                              <div 
                                key={brand} 
                                className={`select-option ${selectedBrand === brand ? 'selected' : ''}`}
                                onClick={() => {
                                  const firstOfType = vehicleTypes.find(vt => vt.brand === brand);
                                  if (firstOfType) {
                                    setFormData({ ...formData, vehicle_type_id: firstOfType.id.toString() });
                                    setSelectedCategory(firstOfType.category);
                                  }
                                  setShowVehicleTypeDropdown(false);
                                  setVehicleTypeSearch('');
                                }}
                              >
                                {brand}
                              </div>
                            ))
                          ) : (
                            <div className="no-options">لا توجد نتائج</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>فئة السيارة <span className="required">*</span></label>
                    <select 
                      value={formData.vehicle_type_id} 
                      onChange={(e) => {
                        const vt = vehicleTypes.find(v => v.id.toString() === e.target.value);
                        if (vt) {
                          setFormData({ ...formData, vehicle_type_id: e.target.value });
                          setSelectedCategory(vt.category);
                        }
                      }}
                      disabled={!selectedBrand}
                    >
                      <option value="">-- اختر الفئة --</option>
                      {filteredCategories.map(vt => (
                        <option key={vt.id} value={vt.id.toString()}>{vt.category}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>رقم الهيكل <span className="required">*</span></label>
                    <input type="text" value={formData.chassis_number} onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>سنة الصنع <span className="required">*</span></label>
                    <select value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })}>
                      <option value="">اختر السنة...</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>اللون <span className="required">*</span></label>
                    <select value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}>
                      <option value="">اختر اللون...</option>
                      {colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>الغرض من الترخيص <span className="required">*</span></label>
                    <select value={formData.license_purpose} onChange={(e) => setFormData({ ...formData, license_purpose: e.target.value })}>
                      <option value="">اختر الغرض...</option>
                      {LICENSE_PURPOSES.map(lp => <option key={lp.ar} value={`${lp.ar}/${lp.en}`}>{lp.ar}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>رقم المحرك <span className="required">*</span></label>
                    <input type="text" value={formData.engine_number} onChange={(e) => setFormData({ ...formData, engine_number: e.target.value })} placeholder="Engine Number" />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>قوة المحرك <span className="required">*</span></label>
                    {isMandatoryInsurance ? (
                      <input 
                        type="number" 
                        value={formData.engine_power} 
                        onChange={(e) => setFormData({ ...formData, engine_power: e.target.value })} 
                        placeholder="أدخل قوة المحرك (حصان)" 
                      />
                    ) : (
                      <select value={formData.engine_power} onChange={(e) => setFormData({ ...formData, engine_power: e.target.value })}>
                        <option value="">اختر القوة...</option>
                        {availableEnginePowers.map(ep => <option key={ep} value={ep}>{ep}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="form-group">
                    <label>سعة المحرك (CC) <span className="required">*</span></label>
                    <input type="text" value={formData.engine_cc} onChange={(e) => setFormData({ ...formData, engine_cc: e.target.value })} placeholder="مثلاً: 2000" />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>الركاب المصرح بهم <span className="required">*</span></label>
                    <input type="number" value={formData.authorized_passengers} onChange={(e) => setFormData({ ...formData, authorized_passengers: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>الحمولة (بالطن)</label>
                    <input type="number" value={formData.load_capacity} onChange={(e) => setFormData({ ...formData, load_capacity: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label>وزن المركبة</label>
                  <input type="text" value={formData.vehicle_weight} onChange={(e) => setFormData({ ...formData, vehicle_weight: e.target.value })} placeholder="Vehicle Weight" />
                </div>
              </div>
            )}

            {/* Step 3: بيانات احتساب القسط / الاشتراك */}
            {currentStep === 3 && (
              <div className="form-section animate-fade-in" style={{ border: '1px solid #10b981', borderRadius: '8px', padding: '20px' }}>
                <h3 className="form-section-title" style={{ color: '#10b981', borderBottom: '1px solid #10b981', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-calculator"></i> بيانات احتساب القسط / الاشتراك
                </h3>
                
                {/* الجزء العلوي: تصنيف المركبة */}
                <div className="form-grid" style={{ marginBottom: '30px', background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                  <div className="form-group">
                    <label>نوع المركبة <span className="required">*</span></label>
                    <select value={formData.eidc_vehicle_type_id} onChange={(e) => setFormData({ 
                      ...formData, 
                      eidc_vehicle_type_id: e.target.value,
                      eidc_vehicle_spec_id: '',
                      eidc_vehicle_detail_id: ''
                    })}>
                      <option value="">-- اختر --</option>
                      {eidcVehicleTypes.map(t => <option key={t.id} value={t.id}>{t.typeVehicle || t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>النوع المحدد <span className="required">*</span></label>
                    <select 
                      value={formData.eidc_vehicle_spec_id} 
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        eidc_vehicle_spec_id: e.target.value,
                        eidc_vehicle_detail_id: ''
                      })} 
                      disabled={!formData.eidc_vehicle_type_id || loadingSpecs}
                      style={loadingSpecs ? { background: '#f1f5f9', color: '#94a3b8' } : {}}
                    >
                      <option value="">{loadingSpecs ? 'جاري التحميل...' : '-- اختر --'}</option>
                      {!loadingSpecs && eidcVehicleSpecs.map(s => <option key={s.id} value={s.id}>{s.specVehicle || s.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>التفاصيل</label>
                    <select value={formData.eidc_vehicle_detail_id} onChange={(e) => setFormData({ ...formData, eidc_vehicle_detail_id: e.target.value })} disabled={!formData.eidc_vehicle_spec_id}>
                      <option value="">-- لا يوجد / اختر --</option>
                      {eidcVehicleDetails.map(d => <option key={d.id} value={d.id}>{d.specVehicle || d.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* الجزء السفلي: المبالغ المالية */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
                  <div className="eidc-price-box">
                    <label>مصاريف الإصدار</label>
                    <div className="price-input-wrapper">
                      <span className="currency">د.ل</span>
                      <input type="text" value={loadingInquiry ? '...' : (eidcPremiumData ? Number(eidcPremiumData.issuingFees || 0).toFixed(3) : '0.000')} readOnly />
                    </div>
                  </div>
                  <div className="eidc-price-box">
                    <label>صافي القسط</label>
                    <div className="price-input-wrapper">
                      <span className="currency">د.ل</span>
                      <input type="text" value={loadingInquiry ? 'جاري التحميل...' : (eidcPremiumData ? Number(eidcPremiumData.netPremium || 0).toFixed(3) : '0.000')} readOnly />
                    </div>
                  </div>
                  <div className="eidc-price-box">
                    <label>الضريبة</label>
                    <div className="price-input-wrapper">
                      <span className="currency">د.ل</span>
                      <input type="text" value={loadingInquiry ? '...' : (eidcPremiumData ? Number(eidcPremiumData.tax || 0).toFixed(3) : '0.000')} readOnly />
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                  <div className="eidc-price-box">
                    <label>رسوم الإشراف</label>
                    <div className="price-input-wrapper">
                      <span className="currency">د.ل</span>
                      <input type="text" value={loadingInquiry ? '...' : (eidcPremiumData ? Number(eidcPremiumData.supervisionFees || 0).toFixed(3) : '0.000')} readOnly />
                    </div>
                  </div>
                  <div className="eidc-price-box">
                    <label>الدمغة</label>
                    <div className="price-input-wrapper">
                      <span className="currency">د.ل</span>
                      <input type="text" value={loadingInquiry ? '...' : (eidcPremiumData ? Number(eidcPremiumData.stamp || 0.250).toFixed(3) : '0.250')} readOnly />
                    </div>
                  </div>
                  <div className="eidc-price-box">
                    <label>رسوم الإصدار (النهائي)</label>
                    <div className="price-input-wrapper">
                      <span className="currency">د.ل</span>
                      <input type="text" value={loadingInquiry ? '...' : (eidcPremiumData ? Number(eidcPremiumData.issuingFees || 0).toFixed(3) : '0.000')} readOnly />
                    </div>
                  </div>
                  <div className="eidc-price-box total">
                    <label>الإجمالي</label>
                    <div className="price-input-wrapper" style={{ border: '1px solid #bfdbfe' }}>
                      <span className="currency" style={{ background: '#eff6ff', color: '#1d4ed8' }}>د.ل</span>
                      <input type="text" value={loadingInquiry ? 'جاري الاحتساب...' : (eidcPremiumData ? Number(eidcPremiumData.totalPremium || 0).toFixed(3) : '0.000')} readOnly style={{ color: '#1d4ed8', fontWeight: 'bold' }} />
                    </div>
                  </div>
                </div>

                <style>{`
                  .eidc-price-box {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                  }
                  .eidc-price-box label {
                    font-size: 12px;
                    color: #64748b;
                    text-align: left;
                  }
                  .price-input-wrapper {
                    display: flex;
                    align-items: center;
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                    background: #fff;
                    overflow: hidden;
                  }
                  .price-input-wrapper .currency {
                    background: #f1f5f9;
                    padding: 8px 12px;
                    font-size: 12px;
                    color: #64748b;
                    border-right: 1px solid #e2e8f0;
                  }
                  .price-input-wrapper input {
                    border: none;
                    width: 100%;
                    padding: 8px 12px;
                    font-size: 14px;
                    font-weight: 600;
                    text-align: center;
                    outline: none;
                  }
                  .eidc-price-box.total .price-input-wrapper {
                    background: #f8fafc;
                  }
                `}</style>
              </div>
            )}

            <div className="form-actions" style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ order: 2 }}>
                {currentStep > 1 && (
                  <button type="button" onClick={() => setCurrentStep(currentStep - 1)} className="btn-cancel" style={{ background: '#4b5563', color: '#fff', minWidth: '120px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    السابق <i className="fa-solid fa-arrow-left"></i>
                  </button>
                )}
              </div>

              <div style={{ order: 1 }}>
                {currentStep < 3 ? (
                  <button type="button" onClick={() => setCurrentStep(currentStep + 1)} className="btn-submit" style={{ minWidth: '150px' }}>
                    التالي <i className="fa-solid fa-arrow-right"></i>
                  </button>
                ) : (
                  <button type="submit" disabled={submitting} className="btn-submit" style={{ minWidth: '180px', background: '#10b981', border: 'none' }}>
                    <i className="fa-solid fa-save"></i> {submitting ? 'جاري الحفظ...' : 'حفظ الوثيقة'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </>
      ) : (
              /* --- الشكل القديم (صفحة واحدة) لبقية الأنواع --- */
              <form onSubmit={handleSubmit} className="user-form">
                <div className="form-section">
                  <h3 className="form-section-title">بيانات الوثيقة والمؤمن له</h3>

                  {/* اختيار الوكيل (للمدراء فقط) */}

                  <div className="form-group">
                    <label htmlFor="insured_name">اسم المؤمن له / المشترك <span className="required">*</span></label>
                    <input type="text" id="insured_name" value={formData.insured_name} onChange={(e) => setFormData({ ...formData, insured_name: e.target.value })} />
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="phone">رقم الهاتف <span className="required">*</span></label>
                      <input type="text" id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="whatsapp_number">رقم الواتساب</label>
                      <input type="text" id="whatsapp_number" value={formData.whatsapp_number} onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })} placeholder="رقم الواتساب للتواصل" />
                    </div>
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="nationality">الجنسية</label>
                      <input type="text" id="nationality" value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">البريد الإلكتروني</label>
                      <input type="email" id="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="example@domain.com" />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="duration">مدة التأمين <span className="required">*</span></label>
                      <select id="duration" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value as any })}>
                        <option value="شهر (30 يوم)">شهر (30 يوم)</option>
                        <option value="سنة (365 يوم)">سنة (365 يوم)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="start_date">تاريخ البدء <span className="required">*</span></label>
                      <input type="date" id="start_date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="form-section-title">بيانات المركبة</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>الجهة المقيدة بها <span className="required">*</span></label>
                      <select value={formData.plate_id} onChange={(e) => setFormData({ ...formData, plate_id: e.target.value })}>
                        <option value="">اختر الجهة...</option>
                        {plates.map(p => <option key={p.id} value={p.id}>{p.city.name_ar}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>رقم اللوحة <span className="required">*</span></label>
                      <input type="text" value={formData.plate_number_manual} onChange={(e) => setFormData({ ...formData, plate_number_manual: e.target.value })} />
                    </div>
                  </div>

                  {/* إضافة ماركة وفئة السيارة هنا أيضاً للمساواة مع نموذج المراحل */}
                  <div className="form-grid">
                    <div className="form-group relative" ref={vehicleTypeDropdownRef} style={{ position: 'relative' }}>
                      <label>ماركة السيارة <span className="required">*</span></label>
                      <div className="searchable-select" onClick={() => setShowVehicleTypeDropdown(!showVehicleTypeDropdown)}>
                        <div className="select-display">
                          {selectedBrand || (vehicleTypeSearch ? 'جاري البحث...' : 'اختر الماركة...')}
                        </div>
                        <i className={`fa-solid fa-chevron-${showVehicleTypeDropdown ? 'up' : 'down'}`}></i>
                      </div>
                      
                      {showVehicleTypeDropdown && (
                        <div className="select-dropdown animate-fade-in">
                          <div className="select-search">
                            <i className="fa-solid fa-search"></i>
                            <input 
                              type="text" 
                              placeholder="بحث عن ماركة..." 
                              value={vehicleTypeSearch}
                              onChange={(e) => setVehicleTypeSearch(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          <div className="select-options">
                            {uniqueBrands.length > 0 ? (
                              uniqueBrands.map(brand => (
                                <div 
                                  key={brand} 
                                  className={`select-option ${selectedBrand === brand ? 'selected' : ''}`}
                                  onClick={() => {
                                    const firstOfType = vehicleTypes.find(vt => vt.brand === brand);
                                    if (firstOfType) {
                                      setFormData({ ...formData, vehicle_type_id: firstOfType.id.toString() });
                                      setSelectedCategory(firstOfType.category);
                                    }
                                    setShowVehicleTypeDropdown(false);
                                    setVehicleTypeSearch('');
                                  }}
                                >
                                  {brand}
                                </div>
                              ))
                            ) : (
                              <div className="no-options">لا توجد نتائج</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>فئة السيارة <span className="required">*</span></label>
                      <select 
                        value={formData.vehicle_type_id} 
                        onChange={(e) => {
                          const vt = vehicleTypes.find(v => v.id.toString() === e.target.value);
                          if (vt) {
                            setFormData({ ...formData, vehicle_type_id: e.target.value });
                            setSelectedCategory(vt.category);
                          }
                        }}
                        disabled={!selectedBrand}
                      >
                        <option value="">-- اختر الفئة --</option>
                        {filteredCategories.map(vt => (
                          <option key={vt.id} value={vt.id.toString()}>{vt.category}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label>رقم الهيكل <span className="required">*</span></label>
                      <input type="text" value={formData.chassis_number} onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>سنة الصنع <span className="required">*</span></label>
                      <select value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })}>
                        <option value="">اختر السنة...</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>قوة المحرك</label>
                      {isMandatoryInsurance ? (
                        <input 
                          type="number" 
                          value={formData.engine_power} 
                          onChange={(e) => setFormData({ ...formData, engine_power: e.target.value })} 
                          placeholder="قوة المحرك (حصان)" 
                        />
                      ) : (
                        <select value={formData.engine_power} onChange={(e) => setFormData({ ...formData, engine_power: e.target.value })}>
                          <option value="">اختر القوة...</option>
                          {availableEnginePowers.map(ep => <option key={ep} value={ep}>{ep}</option>)}
                        </select>
                      )}
                    </div>
                    <div className="form-group">
                      <label>اللون</label>
                      <select value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })}>
                        <option value="">اختر اللون...</option>
                        {colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>رقم المحرك</label>
                      <input type="text" value={formData.engine_number} onChange={(e) => setFormData({ ...formData, engine_number: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>سعة المحرك (CC)</label>
                      <input type="text" value={formData.engine_cc} onChange={(e) => setFormData({ ...formData, engine_cc: e.target.value })} />
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>وزن المركبة</label>
                      <input type="text" value={formData.vehicle_weight} onChange={(e) => setFormData({ ...formData, vehicle_weight: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>ملاحظات</label>
                      <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }} />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="form-section-title">المبالغ المالية</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>صافي القسط</label>
                      <input type="text" value={formData.premium} readOnly disabled style={{ background: '#f3f4f6' }} />
                    </div>
                    <div className="form-group">
                      <label>الإجمالي النهائي</label>
                      <input type="text" value={`${calculateTotal().toFixed(3)} د.ل`} readOnly disabled style={{ background: '#f1f5f9', fontWeight: 'bold', color: '#2563eb' }} />
                    </div>
                  </div>
                </div>

                <div className="form-actions" style={{ marginTop: '30px' }}>
                  <button type="submit" disabled={submitting} className="btn-submit" style={{ minWidth: '150px' }}>
                    {submitting ? 'جاري الحفظ...' : 'حفظ الوثيقة'}
                  </button>
                  <button type="button" onClick={() => navigate('/insurance-documents')} className="btn-cancel">إلغاء</button>
                </div>
              </form>
            )}
          </div>
        </div>

      {showDeleteColorModal && (
        <div className="modal-overlay" onClick={() => !deletingColor && setShowDeleteColorModal(null)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>تأكيد الحذف</h3>
            <p className="delete-confirm-message">
              هل أنت متأكد من حذف اللون <strong>{showDeleteColorModal.name}</strong>؟
              <br />
              <span className="delete-warning">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            <div className="delete-confirm-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteColorModal(null)}
                disabled={deletingColor}
              >
                إلغاء
              </button>
              <button
                className="btn-delete-confirm"
                onClick={handleDeleteColor}
                disabled={deletingColor}
              >
                {deletingColor ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteVehicleTypeModal && (
        <div className="modal-overlay" onClick={() => !deletingVehicleType && setShowDeleteVehicleTypeModal(null)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>تأكيد الحذف</h3>
            <p className="delete-confirm-message">
              هل أنت متأكد من حذف الفئة <strong>{showDeleteVehicleTypeModal.category}</strong> من {showDeleteVehicleTypeModal.brand}؟
              <br />
              <span className="delete-warning">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            <div className="delete-confirm-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteVehicleTypeModal(null)}
                disabled={deletingVehicleType}
              >
                إلغاء
              </button>
              <button
                className="btn-delete-confirm"
                onClick={handleDeleteVehicleType}
                disabled={deletingVehicleType}
              >
                {deletingVehicleType ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

