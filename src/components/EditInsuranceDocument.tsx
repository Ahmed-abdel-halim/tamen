import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

// Helper to get local date string YYYY-MM-DD
const getLocalDateString = (date: Date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

type InsuranceDocument = {
  id: number;
  insurance_type: string;
  insurance_number: string;
  issue_date: string;
  plate?: Plate;
  port?: string;
  start_date: string;
  end_date?: string;
  duration: string;
  third_party_purpose?: string;
  foreign_car_country?: string;
  foreign_car_purpose?: string;
  chassis_number?: string;
  plate_number_manual?: string;
  vehicle_type?: VehicleType;
  color?: string;
  year?: number;
  fuel_type?: string;
  license_purpose?: string;
  engine_power?: string;
  authorized_passengers?: number;
  load_capacity?: number;
  insured_name?: string;
  phone?: string;
  whatsapp_number?: string;
  driving_license_number?: string;
  premium: number;
  print_type?: string;
  eidc_policy_id?: string;
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

// خيارات الجنسية
const NATIONALITIES = ['ليبي', 'مصري', 'تونسي','المغرب','العراق'];

// خيارات البريد الإلكتروني
const EMAIL_OPTIONS = ['info@mli.ly', 'fake@example.com'];

// خيارات المدن الليبية
const LIBYAN_CITIES = [
  'طرابلس', 'بنغازي', 'مصراتة', 'الزاوية', 'زليتن', 'البيضاء', 'غريان', 'طبرق', 'صبراتة', 'سبها', 'الخمس', 'سرت', 'الجميل', 'الكفرة', 'المرج', 'درنة', 'تارونا', 'بني وليد', 'أجدابيا', 'الأبيار'
];

// خيارات رقم المحرك
const ENGINE_NUMBERS = ['123456'];

// خيارات سعة المحرك (1000 إلى 10000) بتدرج 500
const ENGINE_CC_LIST = Array.from({ length: 19 }, (_, i) => (1000 + (i * 500)).toString());

// خيارات عدد الركاب (1 إلى 100)
const PASSENGER_COUNTS = Array.from({ length: 100 }, (_, i) => (i + 1).toString());

// خيارات وزن المركبة
const VEHICLE_WEIGHTS = [
  '500 كيلو', '1 طن', '2 طن', '3 طن', '4 طن', '5 طن', '6 طن', '7 طن', '8 طن', '9 طن', '10 طن'
];

/**
 * مكون Combobox يسمح بالاختيار من قائمة أو إدخال قيمة جديدة
 */
const Combobox = ({ 
  label, 
  value, 
  options, 
  onChange, 
  error, 
  placeholder = "اختر من القائمة...",
  type = "text",
  disabled = false
}: { 
  label: string, 
  value: string, 
  options: string[], 
  onChange: (val: string) => void, 
  error?: string,
  placeholder?: string,
  type?: string,
  disabled?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`form-group ${error ? 'has-error' : ''}`} ref={containerRef}>
      {error ? (
        <span className="error-message">{error}</span>
      ) : (
        <label>{label} <span className="required">*</span></label>
      )}
      <div className="combobox-container">
        <div className="combobox-input-wrapper">
          <input
            ref={inputRef}
            type={type}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              onChange(e.target.value);
              if (e.target.value === "") setIsManual(true);
            }}
            onFocus={() => !isManual && !disabled && setIsOpen(true)}
            onClick={() => !isManual && !disabled && setIsOpen(true)}
            placeholder={isManual ? "أدخل القيمة الجديدة..." : placeholder}
            autoComplete="off"
            style={disabled ? { background: '#f3f4f6', cursor: 'not-allowed' } : {}}
          />
          {!disabled && (
            !isManual ? (
              <i 
                className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`} 
                style={{ position: 'absolute', left: '10px', cursor: 'pointer', color: '#64748b' }}
                onClick={() => setIsOpen(!isOpen)}
              ></i>
            ) : (
              <i 
                className="fas fa-rotate-left" 
                style={{ position: 'absolute', left: '10px', cursor: 'pointer', color: '#2563eb', fontSize: '0.8rem' }}
                title="العودة للقائمة"
                onClick={() => {
                  setIsManual(false);
                  setIsOpen(true);
                  onChange("");
                }}
              ></i>
            )
          )}
        </div>
        {isOpen && !disabled && (
          <div className="combobox-dropdown animate-fade-in">
            {options.map((opt, i) => (
              <div 
                key={i} 
                className="combobox-option"
                onClick={() => {
                  onChange(opt);
                  setIsManual(false);
                  setIsOpen(false);
                }}
              >
                {opt}
              </div>
            ))}
            <div 
              className="combobox-option add-new"
              onClick={() => {
                onChange("");
                setIsManual(true);
                setIsOpen(false);
                setTimeout(() => {
                  inputRef.current?.focus();
                }, 0);
              }}
            >
              <i className="fa-solid fa-plus-circle" style={{ marginLeft: '8px' }}></i> أخرى / كتابة يدوية...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function EditInsuranceDocument() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const prevEnginePowerRef = useRef<string>('');
  const isDataLoadedRef = useRef<boolean>(false);
  const [formData, setFormData] = useState({
    insurance_type: 'تأمين إجباري سيارات' as 'تأمين إجباري سيارات' | 'تأمين طرف ثالث سيارات' | 'تأمين سيارات أجنبية' | 'تأمين سيارة جمرك',
    plate_id: '',
    port: '',
    start_date: '',
    end_date: '',
    duration: 'سنة (365 يوم)' as 'سنة' | 'سنتين' | 'شهر (30 يوم)' | 'شهرين (60 يوم)' | 'ثلاثة أشهر (90 يوم)' | 'سنة (365 يوم)' | 'سنتين (730 يوم)',
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
    engine_number: '',
    engine_power: '',
    engine_cc: '',
    authorized_passengers: '',
    load_capacity: '',
    vehicle_weight: '',
    insured_name: '',
    phone: '',
    whatsapp_number: '',
    driving_license_number: '',
    nid_passport: '',
    nationality: 'ليبي',
    address: '',
    email: '',
    premium: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isSynced, setIsSynced] = useState(false);

  // Select2 states
  const [showDeleteVehicleTypeModal, setShowDeleteVehicleTypeModal] = useState<{ id: number; brand: string; category: string } | null>(null);
  const [deletingVehicleType, setDeletingVehicleType] = useState(false);



  const [colors, setColors] = useState<Color[]>([]);

  const [showDeleteColorModal, setShowDeleteColorModal] = useState<{ id: number; name: string } | null>(null);
  const [deletingColor, setDeletingColor] = useState(false);





  useEffect(() => {
    fetchPlates();
    fetchVehicleTypes();
    fetchColors();
    loadUserPermissions();
    if (id) {
      fetchDocument();
    }
  }, [id]);

  const loadUserPermissions = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        return;
      }
    } catch (error) {
      console.error('Error loading user permissions:', error);
    }
  };

  // تعيين فئة السيارة بعد تحميل البيانات
  useEffect(() => {
    if (formData.vehicle_type_id && vehicleTypes.length > 0) {
      // Logic removed as selectedCategory is no longer used
    }
  }, [formData.vehicle_type_id, vehicleTypes]);



  useEffect(() => {
    const handleClickOutside = (_event: MouseEvent) => {
      // Dropdown refs checks removed as they are no longer used
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/insurance-documents/${id}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) {
        throw new Error('فشل في جلب الوثيقة');
      }
      const data: InsuranceDocument = await res.json();
      setIsSynced(!!data.eidc_policy_id);
      
      // ملء النموذج بالبيانات
      // في تأمين إجباري سيارات، استخدم issue_date كـ start_date
      const isMandatory = data.insurance_type === 'تأمين إجباري سيارات';
      const startDateValue = isMandatory && data.issue_date 
        ? data.issue_date.split('T')[0] 
        : (data.start_date ? data.start_date.split('T')[0] : '');
      
      setFormData({
        insurance_type: data.insurance_type as any,
        plate_id: data.plate?.id?.toString() || '',
        port: data.port || '',
        start_date: startDateValue,
        // تحويل تنسيق التاريخ من YYYY-MM-DD إلى YYYY/MM/DD
        end_date: data.end_date 
          ? data.end_date.split('T')[0].replace(/-/g, '/')
          : '',
        duration: data.duration as any,
        third_party_purpose: data.third_party_purpose || '',
        foreign_car_country: data.foreign_car_country || '',
        foreign_car_purpose: data.foreign_car_purpose || '',
        chassis_number: data.chassis_number || '',
        plate_number_manual: data.plate_number_manual || '',
        vehicle_type_id: data.vehicle_type?.id?.toString() || '',
        color: data.color || '',
        year: data.year?.toString() || '',
        fuel_type: data.fuel_type || '',
        license_purpose: data.license_purpose || '',
        engine_number: (data as any).engine_number || '',
        engine_power: data.engine_power || '',
        engine_cc: (data as any).engine_cc || '',
        authorized_passengers: data.authorized_passengers?.toString() || '',
        load_capacity: data.load_capacity ? Math.floor(data.load_capacity).toString() : '',
        vehicle_weight: (data as any).vehicle_weight || '',
        insured_name: data.insured_name || '',
        phone: data.phone || '',
        whatsapp_number: data.whatsapp_number || '',
        driving_license_number: data.driving_license_number || '',
        nid_passport: (data as any).nid_passport || '',
        nationality: (data as any).nationality || 'ليبي',
        address: (data as any).address || '',
        email: (data as any).email || '',
        premium: data.premium?.toString() || '',
      });
      
      // تحديث المرجع بعد تحميل البيانات لتجنب إعادة تعيين القيم الافتراضية
      if (data.engine_power) {
        prevEnginePowerRef.current = data.engine_power;
      }
      // تعيين علامة أن البيانات تم تحميلها
      isDataLoadedRef.current = true;
      
      // تعيين الفئة المختارة إذا كان هناك نوع سيارة
      if (data.vehicle_type?.category) {
        // setSelectedCategory removed
      }
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء جلب الوثيقة', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isMandatoryInsurance = formData.insurance_type === 'تأمين إجباري سيارات';
  const isCustomsInsurance = formData.insurance_type === 'تأمين سيارة جمرك';
  const isThirdPartyInsurance = formData.insurance_type === 'تأمين طرف ثالث سيارات';
  const isForeignCarInsurance = formData.insurance_type === 'تأمين سيارات أجنبية';

  // إعادة تعيين مدة التأمين عند تغيير نوع التأمين
  useEffect(() => {
    // في تأمين إجباري سيارات، المدة مثبتة على سنة واحدة
    if (isMandatoryInsurance) {
      setFormData(prev => ({
        ...prev,
        duration: 'سنة (365 يوم)',
        end_date: ''
      }));
    } else if (isCustomsInsurance && (formData.duration === 'سنة (365 يوم)' || formData.duration === 'سنتين (730 يوم)' || formData.duration === 'سنة' || formData.duration === 'سنتين')) {
      setFormData(prev => ({
        ...prev,
        duration: 'شهر (30 يوم)',
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
    // في تأمين إجباري سيارات، استخدم تاريخ الإصدار (issue_date) كبداية التأمين والمدة مثبتة على سنة واحدة
    // إذا لم يكن start_date موجوداً، استخدم تاريخ اليوم
    const startDateValue = isMandatoryInsurance && !formData.start_date 
      ? getLocalDateString() 
      : formData.start_date;
    const durationValue = isMandatoryInsurance ? 'سنة (365 يوم)' : formData.duration;
    
    if (startDateValue && durationValue) {
      const startDate = new Date(startDateValue);
      const endDate = new Date(startDate);
      
      if (isCustomsInsurance || isForeignCarInsurance) {
        // تأمين جمرك أو سيارات أجنبية - حساب بالأيام
        let days = 0;
        switch (durationValue) {
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
      // فقط إذا كانت البيانات قد تم تحميلها بالفعل (وليس عند التحميل الأولي)
      const enginePowerChanged = isDataLoadedRef.current && prevEnginePowerRef.current !== formData.engine_power;
      
      // فقط إذا كان الحقل فارغاً أو تغيرت قوة المحرك (وليس عند التحميل الأولي)
      if ((!formData.authorized_passengers || enginePowerChanged) && isDataLoadedRef.current) {
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
      // فقط إذا كان الحقل فارغاً أو تغيرت قوة المحرك (وليس عند التحميل الأولي)
      if ((!formData.load_capacity || enginePowerChanged) && isDataLoadedRef.current) {
        switch (formData.engine_power) {
          // نقل
          case 'سيارة نقل':
            loadCapacity = '1';
            break;
          case 'شاحنة صندوق':
            loadCapacity = '1';
            break;
          case 'رأس جر':
            loadCapacity = '0'; // 0 طن (لا يوجد حمولة)
            break;
          case 'مقطورة':
            loadCapacity = '1'; // 1 طن افتراضي للمقطورة
            break;
          case 'مقطورة سيارة خاصة':
            loadCapacity = '0'; // 0 طن (لا يوجد حمولة)
            break;
          case 'سيارة نقل موتى':
            loadCapacity = '0'; // 0 طن (لا يوجد حمولة)
            break;
          default:
            break;
        }
      }
      
      // تحديث المرجع والقيم فقط إذا كانت البيانات قد تم تحميلها بالفعل
      // (لتجنب استبدال القيم المحملة من قاعدة البيانات بالقيم الافتراضية)
      if (isDataLoadedRef.current) {
        // تحديث المرجع لتتبع آخر قيمة لـ engine_power
        prevEnginePowerRef.current = formData.engine_power;
        
        // تحديث القيم فقط إذا كانت هناك قيم افتراضية يجب تعيينها
        if (authorizedPassengers || loadCapacity) {
          setFormData(prev => ({
            ...prev,
            authorized_passengers: authorizedPassengers || prev.authorized_passengers,
            load_capacity: loadCapacity || prev.load_capacity
          }));
        }
      } else {
        // عند التحميل الأولي، تحديث المرجع فقط (لا نستبدل القيم المحملة)
        prevEnginePowerRef.current = formData.engine_power;
      }
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
      const isTransportPurpose = formData.license_purpose && formData.license_purpose.includes('نقل');
      if (isTransportPurpose && formData.load_capacity) {
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
        
        // حساب الزيادة في الحمولة بالطن
        if (canIncreaseLoad && currentLoadCapacity > defaultLoadCapacity) {
          const extraTons = currentLoadCapacity - defaultLoadCapacity;
          const extraCost = extraTons * extraTonPrice;
          basePremium = basePremium + extraCost;
        }
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
        // في تأمين جمرك، القيم الأساسية والزيادات (الركاب والحمولة) لسنة كاملة (365 يوم)
        // نحسب القسط اليومي ثم نضربه بعدد الأيام المختارة
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
        
        // للمقطورة في تأمين جمرك: السعر = الحمولة × 8 دينار شهرياً
        const isTransportPurposeForCustoms = formData.license_purpose && formData.license_purpose.includes('نقل');
        if (isTransportPurposeForCustoms && formData.engine_power === 'مقطورة' && formData.load_capacity) {
          const currentLoadCapacity = parseFloat(formData.load_capacity) || 0;
          const tonPricePerMonth = 8; // 8 دينار لكل طن شهرياً
          const monthlyCost = currentLoadCapacity * tonPricePerMonth;
          
          // حساب السعر بناءً على المدة
          if (days === 30) {
            finalPremium = monthlyCost;
          } else if (days === 60) {
            finalPremium = monthlyCost * 1.5; // شهرين = شهر × 1.5
          } else if (days === 90) {
            finalPremium = monthlyCost * 2; // ثلاثة أشهر = شهر × 2
          } else {
            finalPremium = monthlyCost;
          }
        } else {
          // القسط اليومي = القسط السنوي (بما في ذلك الزيادات في الركاب والحمولة) / 365
          const dailyPremium = basePremium / 365;
          // القسط النهائي = القسط اليومي × عدد الأيام
          // هذا يعني أن الزيادات في الركاب والحمولة تُحسب أيضاً بناءً على المدة
          finalPremium = dailyPremium * days;
        }
      } else {
        // تأمين عادي - إذا كانت المدة سنتين، يتضاعف السعر
        if (formData.duration === 'سنتين' || formData.duration === 'سنتين (730 يوم)') {
          finalPremium = basePremium * 2;
        }
      }
      
      // للمقطورة في التأمين العادي، حتى لو كانت الحمولة 0، يجب أن يكون premium 0 (وليس فارغ)
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
    if (!formData.insurance_type) errors.insurance_type = 'نوع التأمين مطلوب';
    
    if (formData.insurance_type === 'تأمين إجباري سيارات') {
      if (!formData.plate_id) errors.plate_id = 'الجهة المقيد بها مطلوبة';
    }
    
    if (formData.insurance_type === 'تأمين سيارة جمرك') {
      if (!formData.port) errors.port = 'الميناء مطلوب';
      if (!formData.start_date) errors.start_date = 'بداية التأمين مطلوبة';
    }
    
    if (formData.insurance_type === 'تأمين طرف ثالث سيارات') {
      if (!formData.plate_id) errors.plate_id = 'الجهة المقيد بها مطلوبة';
      if (!formData.start_date) errors.start_date = 'بداية التأمين مطلوبة';
      if (!formData.third_party_purpose) errors.third_party_purpose = 'غرض من الطرف الثالث مطلوب';
    }
    
    if (formData.insurance_type === 'تأمين سيارات أجنبية') {
      if (!formData.start_date) errors.start_date = 'بداية التأمين مطلوبة';
      if (!formData.foreign_car_country) errors.foreign_car_country = 'دولة السيارة مطلوبة';
      if (!formData.foreign_car_purpose) errors.foreign_car_purpose = 'الغرض من السيارة مطلوب';
    }
    
    if (!isThirdPartyInsurance && !isForeignCarInsurance && !formData.engine_power) {
      errors.engine_power = 'قوة المحرك مطلوبة';
    }
    
    if (!formData.insured_name?.trim()) errors.insured_name = 'اسم المؤمن له مطلوب';
    if (!formData.nationality?.trim()) errors.nationality = 'الجنسية مطلوبة';
    
    if (isMandatoryInsurance && !formData.nid_passport?.trim()) {
      errors.nid_passport = 'رقم الهوية / جواز السفر مطلوب للتأمين الإجباري';
    }
    
    if (!formData.phone?.trim()) {
      errors.phone = 'رقم الهاتف مطلوب';
    }
    
    if (!formData.whatsapp_number?.trim()) {
      errors.whatsapp_number = 'رقم الواتساب مطلوب';
    }
    
    if (!formData.address?.trim()) errors.address = 'العنوان التفصيلي مطلوب';
    if (!formData.email?.trim()) errors.email = 'البريد الإلكتروني مطلوب';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('يرجى التحقق من الحقول المطلوبة وتصحيح الأخطاء', 'error');
      console.log('Validation Errors:', errors);
      return false;
    }
    
    setFormErrors({});
    return true;
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
      
      const res = await fetch(`${API_BASE_URL}/insurance-documents/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...formData,
          // في تأمين إجباري سيارات، start_date = issue_date (من البيانات الموجودة أو تاريخ اليوم)
          start_date: isMandatoryInsurance 
            ? (formData.start_date || getLocalDateString())
            : formData.start_date,
          // تحويل end_date من YYYY/MM/DD إلى YYYY-MM-DD للإرسال إلى الـ API
          end_date: formData.end_date ? formData.end_date.replace(/\//g, '-') : formData.end_date,
          plate_id: (isCustomsInsurance || isForeignCarInsurance) ? null : (formData.plate_id ? parseInt(formData.plate_id) : null),
          vehicle_type_id: formData.vehicle_type_id ? parseInt(formData.vehicle_type_id) : null,
          year: formData.year ? parseInt(formData.year) : null,
          authorized_passengers: (formData.authorized_passengers && formData.authorized_passengers.trim() !== '') ? (isNaN(parseInt(formData.authorized_passengers)) ? null : parseInt(formData.authorized_passengers)) : null,
          load_capacity: (formData.load_capacity && formData.load_capacity.trim() !== '') ? (isNaN(parseFloat(formData.load_capacity)) ? null : parseFloat(formData.load_capacity)) : null,
          premium: parseFloat(formData.premium),
          third_party_purpose: formData.third_party_purpose || null,
          foreign_car_country: formData.foreign_car_country || null,
          foreign_car_purpose: formData.foreign_car_purpose || null,
          address: formData.address || null,
          email: formData.email || null,
          whatsapp_number: formData.whatsapp_number || null,
          nationality: formData.nationality || null,
          nid_passport: formData.nid_passport || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFormErrors(data.errors);
        }
        throw new Error(data.message || 'حدث خطأ أثناء تحديث الوثيقة');
      }

      showToast('تم تحديث الوثيقة بنجاح', 'success');
      setTimeout(() => {
        navigate('/insurance-documents');
      }, 1000);
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء تحديث الوثيقة', 'error');
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



  // البحث عن اللوحة حسب الميناء المختار



  return (
    <section className="users-management">
      

      <div className="users-card" style={{ width: '100%', maxWidth: '100%', margin: '0', borderRadius: '0', boxShadow: 'none', background: '#fff' }}>
        <div className="form-page-container" style={{ width: '100%', maxWidth: '100%', padding: '0' }}>
          <div className="modern-form-container animate-fade-in" style={{ borderRadius: '0', border: 'none', boxShadow: 'none' }}>
            <style>{`
                .modern-form-container {
                  background: var(--panel, #fff);
                  padding: 5px 0;
                  width: 100%;
                  margin: 0;
                }
                .modern-grid-4 {
                  display: grid;
                  grid-template-columns: repeat(4, 1fr);
                  gap: 8px 20px;
                  padding: 0 20px;
                }
                .grid-header {
                  grid-column: span 4;
                  font-size: 1.15rem;
                  font-weight: 800;
                  color: #fff;
                  margin: 10px 0 8px;
                  padding: 8px 20px;
                  background: linear-gradient(90deg, #0f172a, #1e40af);
                  border-radius: 8px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 12px;
                  box-shadow: none;
                  border: none;
                }
                .grid-header i {
                  color: #38bdf8;
                  font-size: 1.2rem;
                }
                .form-group {
                  margin-bottom: 2px;
                  min-width: 150px;
                  position: relative;
                }
                .form-group label {
                  font-size: 0.95rem !important;
                  font-weight: 700 !important;
                  color: var(--text, #334155) !important;
                  margin-bottom: 2px !important;
                  display: block !important;
                }
                .form-group input, 
                .form-group select, 
                .form-group textarea,
                .select-display {
                  font-size: 0.95rem !important;
                  font-weight: 600 !important;
                  height: 40px !important;
                  border-radius: 6px !important;
                  border: 1.5px solid var(--border, #cbd5e1) !important;
                  background: var(--input-bg, #fff) !important;
                  color: var(--text) !important;
                  padding: 0 12px !important;
                  width: 100% !important;
                  appearance: none !important;
                  transition: all 0.2s ease;
                }
                .form-group input:focus, .form-group select:focus {
                  border-color: #2563eb !important;
                  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                  outline: none;
                }
                .price-input-wrapper {
                  height: 40px !important;
                  border: 1.5px solid var(--border, #cbd5e1) !important;
                  border-radius: 6px !important;
                  background: var(--input-bg, #fff) !important;
                  width: 100% !important;
                }
                .form-group.has-error input,
                .form-group.has-error select {
                  border-color: #ef4444 !important;
                  background-color: #fef2f2 !important;
                }
                .error-message {
                  color: #ef4444;
                  font-size: 0.8rem;
                  font-weight: 700;
                  margin-bottom: 2px;
                  display: block;
                }
                @media (max-width: 768px) {
                  .modern-grid-4 { grid-template-columns: 1fr; gap: 8px; }
                  .span-2, .span-4, .grid-header { grid-column: 1 / -1; }
                }
            `}</style>

            {loading ? (
              <p style={{ textAlign: 'center', padding: '50px' }}>جار التحميل...</p>
            ) : (
              <>
                {/* التنبيه بالأعلى */}
                {isSynced && isMandatoryInsurance && (
                  <div style={{ 
                    margin: '0 20px 15px', 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    background: '#fff9db', 
                    color: '#856404', 
                    border: '1px solid #ffeeba',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '16px' }}></i>
                    <span>بيانات المركبة والقسط مجمّدة ولا يمكن تعديلها لوجود مزامنة مع الهيئة.</span>
                  </div>
                )}

                {/* المربع العلوي لنوع التأمين */}
                <div className="modern-grid-4" style={{ marginBottom: '8px', background: 'var(--panel, #f8fafc)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border, #e2e8f0)', margin: '0 20px 15px' }}>
                  <div className="form-group span-2">
                    <label style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b', marginBottom: '4px' }}>
                      <i className="fa-solid fa-list-check" style={{ color: '#2563eb', marginLeft: '8px' }}></i> اختر نوع التأمين المطلوب <span className="required">*</span>
                    </label>
                    <select
                      value={formData.insurance_type}
                      disabled={isSynced && isMandatoryInsurance}
                      onChange={(e) => setFormData({ ...formData, insurance_type: e.target.value as any })}
                      style={{ border: '1.5px solid #2563eb' }}
                    >
                      <option value="تأمين إجباري سيارات">تأمين إجباري سيارات</option>
                      <option value="تأمين طرف ثالث سيارات">تأمين طرف ثالث سيارات</option>
                      <option value="تأمين سيارات أجنبية">تأمين سيارات أجنبية</option>
                    </select>
                  </div>
                  <div className="form-group span-2" style={{ display: 'flex', alignItems: 'center', color: '#64748b', fontSize: '0.8rem', paddingTop: '20px' }}>
                    <p><i className="fa-solid fa-circle-info" style={{ marginLeft: '5px' }}></i> اختر نوع التأمين لعرض الحقول المطلوبة.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="user-form">
                  <div className="modern-grid-4">
                    <div className="grid-header"><i className="fa-solid fa-user-shield"></i> بيانات المؤمن له والمشترك</div>
                    
                    <div className={`form-group span-2 ${formErrors.insured_name ? 'has-error' : ''}`}>
                      <label>اسم المؤمن له / المشترك <span className="required">*</span></label>
                      <input
                        type="text"
                        value={formData.insured_name}
                        onChange={(e) => setFormData({ ...formData, insured_name: e.target.value })}
                        placeholder="اسم المؤمن له كما في الإثبات"
                      />
                      {formErrors.insured_name && <span className="error-message">{formErrors.insured_name}</span>}
                    </div>

                    <Combobox 
                      label="الجنسية" 
                      value={formData.nationality} 
                      options={NATIONALITIES} 
                      onChange={(val) => setFormData({ ...formData, nationality: val })} 
                      error={formErrors.nationality}
                    />

                    <div className={`form-group ${formErrors.nid_passport ? 'has-error' : ''}`}>
                      <label>رقم الهوية / الجواز <span className="required">*</span></label>
                      <input type="text" value={formData.nid_passport} onChange={(e) => setFormData({ ...formData, nid_passport: e.target.value })} />
                      {formErrors.nid_passport && <span className="error-message">{formErrors.nid_passport}</span>}
                    </div>

                    <Combobox 
                      label="البريد الإلكتروني" 
                      value={formData.email} 
                      options={EMAIL_OPTIONS} 
                      onChange={(val) => setFormData({ ...formData, email: val })} 
                      error={formErrors.email}
                      type="email"
                    />

                    <div className={`form-group ${formErrors.phone ? 'has-error' : ''}`}>
                      <label>رقم الهاتف <span className="required">*</span></label>
                      <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="09X XXX XXXX" />
                      {formErrors.phone && <span className="error-message">{formErrors.phone}</span>}
                    </div>

                    <div className={`form-group ${formErrors.whatsapp_number ? 'has-error' : ''}`}>
                      <label>رقم الواتساب <span className="required">*</span></label>
                      <input type="text" value={formData.whatsapp_number} onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })} placeholder="09X XXX XXXX" />
                      {formErrors.whatsapp_number && <span className="error-message">{formErrors.whatsapp_number}</span>}
                    </div>

                    <Combobox 
                      label="العنوان التفصيلي" 
                      value={formData.address} 
                      options={LIBYAN_CITIES} 
                      onChange={(val) => setFormData({ ...formData, address: val })} 
                      error={formErrors.address}
                      placeholder="اختر مدينة أو أدخل عنواناً تفصيلياً..."
                    />

                    {/* بيانات المركبة */}
                    <div className="grid-header"><i className="fa-solid fa-car"></i> بيانات المركبة</div>
                    
                    {!isForeignCarInsurance && (
                      <div className={`form-group ${formErrors.plate_id ? 'has-error' : ''}`}>
                        <label>الجهة المقيد بها <span className="required">*</span></label>
                        <select
                          value={formData.plate_id}
                          disabled={isSynced && isMandatoryInsurance}
                          onChange={(e) => setFormData({ ...formData, plate_id: e.target.value })}
                        >
                          <option value="">اختر الجهة...</option>
                          {plates.map(p => <option key={p.id} value={p.id.toString()}>{p.city.name_ar} - {p.plate_number}</option>)}
                        </select>
                        {formErrors.plate_id && <span className="error-message">{formErrors.plate_id}</span>}
                      </div>
                    )}

                    <div className={`form-group ${formErrors.plate_number_manual ? 'has-error' : ''}`}>
                      <label>رقم اللوحة <span className="required">*</span></label>
                      <input
                        type="text"
                        value={formData.plate_number_manual}
                        disabled={isSynced && isMandatoryInsurance}
                        onChange={(e) => setFormData({ ...formData, plate_number_manual: e.target.value })}
                      />
                      {formErrors.plate_number_manual && <span className="error-message">{formErrors.plate_number_manual}</span>}
                    </div>

                    <div className={`form-group ${formErrors.vehicle_type_id ? 'has-error' : ''}`}>
                      <label>ماركة السيارة <span className="required">*</span></label>
                      <select
                        value={formData.vehicle_type_id}
                        disabled={isSynced && isMandatoryInsurance}
                        onChange={(e) => setFormData({ ...formData, vehicle_type_id: e.target.value })}
                      >
                        <option value="">-- اختر الماركة --</option>
                        {Array.from(new Set(vehicleTypes.map(v => v.brand))).map(brand => (
                          <option key={brand} value={vehicleTypes.find(v => v.brand === brand)?.id.toString()}>{brand}</option>
                        ))}
                      </select>
                    </div>

                    <div className={`form-group ${formErrors.vehicle_type_id ? 'has-error' : ''}`}>
                      <label>فئة السيارة <span className="required">*</span></label>
                      <select
                        value={formData.vehicle_type_id}
                        disabled={isSynced && isMandatoryInsurance}
                        onChange={(e) => setFormData({ ...formData, vehicle_type_id: e.target.value })}
                      >
                        <option value="">-- اختر الفئة --</option>
                        {vehicleTypes.filter(v => v.brand === vehicleTypes.find(vt => vt.id.toString() === formData.vehicle_type_id)?.brand).map(vt => (
                          <option key={vt.id} value={vt.id.toString()}>{vt.category}</option>
                        ))}
                      </select>
                      {formErrors.vehicle_type_id && <span className="error-message">{formErrors.vehicle_type_id}</span>}
                    </div>

                    <div className={`form-group ${formErrors.chassis_number ? 'has-error' : ''}`}>
                      <label>رقم الهيكل <span className="required">*</span></label>
                      <input
                        type="text"
                        value={formData.chassis_number}
                        disabled={isSynced && isMandatoryInsurance}
                        onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value })}
                      />
                      {formErrors.chassis_number && <span className="error-message">{formErrors.chassis_number}</span>}
                    </div>

                    <Combobox 
                      label="رقم المحرك" 
                      value={formData.engine_number} 
                      options={ENGINE_NUMBERS} 
                      onChange={(val) => setFormData({ ...formData, engine_number: val })} 
                      error={formErrors.engine_number}
                      disabled={isSynced && isMandatoryInsurance}
                    />

                    <div className={`form-group ${formErrors.year ? 'has-error' : ''}`}>
                      <label>سنة الصنع <span className="required">*</span></label>
                      <select
                        value={formData.year}
                        disabled={isSynced && isMandatoryInsurance}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                      >
                        <option value="">اختر...</option>
                        {YEARS.map(y => <option key={y} value={y.toString()}>{y}</option>)}
                      </select>
                      {formErrors.year && <span className="error-message">{formErrors.year}</span>}
                    </div>

                    <div className={`form-group ${formErrors.color ? 'has-error' : ''}`}>
                      <label>اللون <span className="required">*</span></label>
                      <select
                        value={formData.color}
                        disabled={isSynced && isMandatoryInsurance}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      >
                        <option value="">اختر...</option>
                        {colors.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                      {formErrors.color && <span className="error-message">{formErrors.color}</span>}
                    </div>

                    {!isForeignCarInsurance && (
                      <div className={`form-group ${formErrors.license_purpose ? 'has-error' : ''}`}>
                        <label>الغرض من الترخيص <span className="required">*</span></label>
                        <select
                          value={formData.license_purpose}
                          disabled={isSynced && isMandatoryInsurance}
                          onChange={(e) => setFormData({ ...formData, license_purpose: e.target.value })}
                        >
                          <option value="">اختر...</option>
                          {LICENSE_PURPOSES.map(lp => <option key={lp.ar} value={`${lp.ar}/${lp.en}`}>{lp.ar}</option>)}
                        </select>
                        {formErrors.license_purpose && <span className="error-message">{formErrors.license_purpose}</span>}
                      </div>
                    )}

                    <div className={`form-group ${formErrors.engine_power ? 'has-error' : ''}`}>
                      <label>قوة المحرك (فئة التأمين) <span className="required">*</span></label>
                      <select
                        value={formData.engine_power}
                        disabled={isSynced && isMandatoryInsurance}
                        onChange={(e) => setFormData({ ...formData, engine_power: e.target.value })}
                      >
                        <option value="">اختر الفئة لمطابقة السعر...</option>
                        {availableEnginePowers.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                      {formErrors.engine_power && <span className="error-message">{formErrors.engine_power}</span>}
                    </div>

                    <Combobox 
                      label="سعة المحرك (CC)" 
                      value={formData.engine_cc} 
                      options={ENGINE_CC_LIST} 
                      onChange={(val) => setFormData({ ...formData, engine_cc: val })} 
                      error={formErrors.engine_cc}
                      disabled={isSynced && isMandatoryInsurance}
                    />

                    <Combobox 
                      label="عدد الركاب" 
                      value={formData.authorized_passengers} 
                      options={PASSENGER_COUNTS} 
                      onChange={(val) => setFormData({ ...formData, authorized_passengers: val })} 
                      error={formErrors.authorized_passengers}
                      disabled={isSynced && isMandatoryInsurance}
                    />

                    <div className={`form-group ${formErrors.load_capacity ? 'has-error' : ''}`}>
                      <label>الحمولة بالطن <span className="required">*</span></label>
                      <input
                        type="number"
                        value={formData.load_capacity}
                        disabled={isSynced && isMandatoryInsurance}
                        onChange={(e) => setFormData({ ...formData, load_capacity: e.target.value })}
                      />
                      {formErrors.load_capacity && <span className="error-message">{formErrors.load_capacity}</span>}
                    </div>

                    <Combobox 
                      label="وزن المركبة" 
                      value={formData.vehicle_weight} 
                      options={VEHICLE_WEIGHTS} 
                      onChange={(val) => setFormData({ ...formData, vehicle_weight: val })} 
                      error={formErrors.vehicle_weight}
                      disabled={isSynced && isMandatoryInsurance}
                    />

                    {/* بيانات التأمين */}
                    <div className="grid-header"><i className="fa-solid fa-file-invoice-dollar"></i> بيانات مدة التأمين والمبالغ</div>

                    <div className="form-group">
                      <label>مدة التأمين</label>
                      <select
                        value={formData.duration}
                        disabled={isSynced && isMandatoryInsurance}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value as any })}
                      >
                        <option value="سنة (365 يوم)">تأمين سنوي</option>
                        <option value="سنتين (730 يوم)">تأمين سنتين</option>
                        <option value="شهر (30 يوم)">تأمين شهر</option>
                      </select>
                    </div>

                    {!isMandatoryInsurance && (
                      <div className={`form-group ${formErrors.start_date ? 'has-error' : ''}`}>
                        <label>تاريخ البدء <span className="required">*</span></label>
                        <input
                          type="date"
                          value={formData.start_date}
                          disabled={isSynced && isMandatoryInsurance}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        />
                        {formErrors.start_date && <span className="error-message">{formErrors.start_date}</span>}
                      </div>
                    )}

                    <div className="form-group">
                      <label>صافي القسط</label>
                      <div className="price-input-wrapper" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center' }}>
                        <span className="currency" style={{ padding: '0 10px', color: '#64748b', fontSize: '12px' }}>د.ل</span>
                        <input type="text" value={formData.premium} readOnly disabled style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'center', fontWeight: 'bold' }} />
                      </div>
                    </div>

                    <div className="form-group span-2">
                      <label style={{ color: '#2563eb', fontWeight: '800' }}>الإجمالي النهائي</label>
                      <div className="price-input-wrapper" style={{ border: '2px solid #2563eb', height: '45px', background: '#f0f9ff', display: 'flex', alignItems: 'center' }}>
                        <span className="currency" style={{ background: '#2563eb', color: '#fff', padding: '0 15px', height: '100%', display: 'flex', alignItems: 'center' }}>د.ل</span>
                        <input
                          type="text"
                          value={calculateTotal().toFixed(3)}
                          readOnly
                          style={{ border: 'none', background: 'transparent', width: '100%', textAlign: 'center', fontWeight: '900', color: '#1d4ed8', fontSize: '1.2rem' }}
                        />
                      </div>
                    </div>

                    <div className="form-actions span-4" style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '20px', paddingBottom: '30px' }}>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-submit"
                        style={{ 
                          width: '100%', 
                          maxWidth: '450px', 
                          height: '55px', 
                          fontSize: '18px', 
                          borderRadius: '12px', 
                          background: 'linear-gradient(90deg, #1e40af, #3b82f6)', 
                          color: '#fff', 
                          border: 'none', 
                          fontWeight: '800', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '15px',
                          boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)'
                        }}
                      >
                        <i className="fa-solid fa-save" style={{ fontSize: '20px' }}></i>
                        <span>{submitting ? 'جاري الحفظ...' : 'حفظ وتحديث الوثيقة'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate('/insurance-documents')}
                        disabled={submitting}
                        className="btn-cancel"
                        style={{ width: '100%', maxWidth: '150px', height: '55px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>
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

