import { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';

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
  const [authorizedDocuments, setAuthorizedDocuments] = useState<string[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const prevEnginePowerRef = useRef<string>('');
  const [formData, setFormData] = useState({
    insurance_type: 'تأمين إجباري سيارات' as 'تأمين إجباري سيارات' | 'تأمين سيارة جمرك' | 'تأمين طرف ثالث سيارات' | 'تأمين سيارات أجنبية',
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
    engine_power: '',
    authorized_passengers: '',
    load_capacity: '',
    insured_name: '',
    phone: '',
    driving_license_number: '',
    premium: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Select2 states
  const [plateSearch, setPlateSearch] = useState("");
  const [showPlateDropdown, setShowPlateDropdown] = useState(false);
  const plateDropdownRef = useRef<HTMLDivElement>(null);

  const [vehicleTypeSearch, setVehicleTypeSearch] = useState("");
  const [showVehicleTypeDropdown, setShowVehicleTypeDropdown] = useState(false);
  const vehicleTypeDropdownRef = useRef<HTMLDivElement>(null);
  const [newVehicleTypeBrand, setNewVehicleTypeBrand] = useState("");
  const [newVehicleTypeCategory, setNewVehicleTypeCategory] = useState("");
  const [useCustomVehicleTypeBrand, setUseCustomVehicleTypeBrand] = useState(false);
  const [showAddVehicleType, setShowAddVehicleType] = useState(false);
  const [showDeleteVehicleTypeModal, setShowDeleteVehicleTypeModal] = useState<{ id: number; brand: string; category: string } | null>(null);
  const [deletingVehicleType, setDeletingVehicleType] = useState(false);

  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [colors, setColors] = useState<Color[]>([]);
  const [colorSearch, setColorSearch] = useState("");
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [showAddColor, setShowAddColor] = useState(false);
  const [showDeleteColorModal, setShowDeleteColorModal] = useState<{ id: number; name: string } | null>(null);
  const [deletingColor, setDeletingColor] = useState(false);
  const colorDropdownRef = useRef<HTMLDivElement>(null);

  const [yearSearch, setYearSearch] = useState("");
  const [showYearDropdown, setShowYearDropdown] = useState(false);
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
        setIsAdmin(false);
        return;
      }
      
      const user = JSON.parse(userStr);
      setIsAdmin(user.is_admin || false);
      setAuthorizedDocuments(user.authorized_documents || null);
    } catch (error) {
      console.error('Error loading user permissions:', error);
      setAuthorizedDocuments(null);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
      const res = await fetch('/api/plates', {
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
      const res = await fetch('/api/vehicle-types', {
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
      const res = await fetch('/api/colors', {
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

  const filteredPlates = plates.filter(p =>
    p.plate_number.toLowerCase().includes(plateSearch.toLowerCase()) ||
    p.city.name_ar.toLowerCase().includes(plateSearch.toLowerCase()) ||
    p.city.name_en.toLowerCase().includes(plateSearch.toLowerCase())
  );

  // الحصول على قائمة فريدة من العلامات التجارية
  const uniqueBrands = Array.from(new Set(vehicleTypes.map(vt => vt.brand)))
    .filter(brand => brand.toLowerCase().includes(vehicleTypeSearch.toLowerCase()))
    .sort();

  const selectedVehicleType = vehicleTypes.find(vt => vt.id === parseInt(formData.vehicle_type_id));
  const selectedBrand = selectedVehicleType ? selectedVehicleType.brand : '';
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // عرض الفئات الخاصة بالعلامة التجارية المختارة
  const filteredCategories = selectedBrand
    ? vehicleTypes.filter(vt => vt.brand === selectedBrand)
    : [];

  useEffect(() => {
    setSelectedCategory(selectedVehicleType?.category || '');
  }, [selectedVehicleType?.category]);

  const filteredColors = colors.filter(color =>
    color.name.toLowerCase().includes(colorSearch.toLowerCase())
  );

  const filteredYears = YEARS.filter(y =>
    y.toString().includes(yearSearch)
  );

  // إضافة نوع سيارة جديد
  const handleAddVehicleType = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newVehicleTypeBrand.trim() || !newVehicleTypeCategory.trim()) return;

    try {
      const res = await fetch('/api/vehicle-types', {
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
        setToast({ message: 'تم إضافة نوع السيارة بنجاح', type: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: data.message || 'حدث خطأ أثناء إضافة نوع السيارة', type: 'error' });
      }
    } catch (error: any) {
      setToast({ message: 'حدث خطأ أثناء إضافة نوع السيارة', type: 'error' });
    }
  };

  const handleDeleteVehicleTypeClick = (e: React.MouseEvent, vehicleType: VehicleType) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteVehicleTypeModal({ id: vehicleType.id, brand: vehicleType.brand, category: vehicleType.category });
  };

  const handleDeleteVehicleType = async () => {
    if (!showDeleteVehicleTypeModal) return;
    setDeletingVehicleType(true);
    try {
      const res = await fetch(`/api/vehicle-types/${showDeleteVehicleTypeModal.id}`, {
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
        setToast({ message: 'تم حذف نوع السيارة بنجاح', type: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: data.message || 'حدث خطأ أثناء حذف نوع السيارة', type: 'error' });
      }
    } catch (error: any) {
      setToast({ message: 'حدث خطأ أثناء حذف نوع السيارة', type: 'error' });
    } finally {
      setDeletingVehicleType(false);
    }
  };
  // إضافة لون جديد
  const handleAddColor = async (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newColorName.trim()) return;

    try {
      const res = await fetch('/api/colors', {
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
        setToast({ message: 'تم إضافة اللون بنجاح', type: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: data.message || 'حدث خطأ أثناء إضافة اللون', type: 'error' });
      }
    } catch (error: any) {
      setToast({ message: 'حدث خطأ أثناء إضافة اللون', type: 'error' });
    }
  };

  // حذف لون
  const handleDeleteColorClick = (e: React.MouseEvent, colorId: number, colorName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteColorModal({ id: colorId, name: colorName });
  };

  const handleDeleteColor = async () => {
    if (!showDeleteColorModal) return;
    setDeletingColor(true);
    try {
      const res = await fetch(`/api/colors/${showDeleteColorModal.id}`, {
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
        setToast({ message: 'تم حذف اللون بنجاح', type: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: data.message || 'حدث خطأ أثناء حذف اللون', type: 'error' });
      }
    } catch (error: any) {
      setToast({ message: 'حدث خطأ أثناء حذف اللون', type: 'error' });
    } finally {
      setDeletingColor(false);
    }
  };


  const selectedPlate = plates.find(p => p.id === parseInt(formData.plate_id));

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
    if (!formData.insurance_type) {
      errors.insurance_type = 'نوع التأمين مطلوب';
    }
    
    // التحقق من أن الحمولة مطلوبة للمقطورة
    const isTransportPurpose = formData.license_purpose && formData.license_purpose.includes('نقل');
    if (isTransportPurpose && formData.engine_power === 'مقطورة') {
      if (!formData.load_capacity || formData.load_capacity.trim() === '') {
        errors.load_capacity = 'الحمولة بالطن مطلوبة للمقطورة';
      } else {
        const loadCap = parseFloat(formData.load_capacity);
        if (isNaN(loadCap) || loadCap < 0) {
          errors.load_capacity = 'الحمولة يجب أن تكون رقم صحيح أكبر من أو يساوي 0';
        }
      }
    }
    if (formData.insurance_type === 'تأمين إجباري سيارات') {
      if (!formData.plate_id) {
        errors.plate_id = 'الجهة المقيد بها مطلوبة';
      }
      // في تأمين إجباري سيارات، بداية التأمين = تاريخ الإصدار (يتم إنشاؤه تلقائياً)
    }
    if (formData.insurance_type === 'تأمين سيارة جمرك') {
      if (!formData.port) {
        errors.port = 'الميناء مطلوب';
      }
      // في تأمين جمرك، بداية التأمين = تاريخ الإصدار (يتم تعيينه تلقائياً)
    }
    if (formData.insurance_type === 'تأمين طرف ثالث سيارات') {
      if (!formData.plate_id) {
        errors.plate_id = 'الجهة المقيد بها مطلوبة';
      }
      if (!formData.start_date) {
        errors.start_date = 'بداية التأمين مطلوبة';
      }
      if (!formData.third_party_purpose) {
        errors.third_party_purpose = 'غرض من الطرف الثالث مطلوب';
      }
    }
    if (formData.insurance_type === 'تأمين سيارات أجنبية') {
      if (!formData.start_date) {
        errors.start_date = 'بداية التأمين مطلوبة';
      }
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
    if (!formData.premium || parseFloat(formData.premium) <= 0) {
      errors.premium = 'القسط مطلوب (يتم حسابه تلقائياً بناءً على قوة المحرك)';
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
          start_date: (isMandatoryInsurance || isCustomsInsurance) ? new Date().toISOString().split('T')[0] : formData.start_date,
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
          driving_license_number: formData.driving_license_number || null,
          premium: premiumValue,
          third_party_purpose: formData.third_party_purpose || null,
          foreign_car_country: formData.foreign_car_country || null,
          foreign_car_purpose: formData.foreign_car_purpose || null,
        };
      
      console.log('Sending request data:', requestBody);
      
      const res = await fetch('/api/insurance-documents', {
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

      setToast({ message: 'تم إنشاء الوثيقة بنجاح', type: 'success' });
      setTimeout(() => {
        navigate('/insurance-documents');
      }, 1000);
    } catch (error: any) {
      setToast({
        message: error.message || 'حدث خطأ أثناء إنشاء الوثيقة',
        type: 'error',
      });
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
  const PORTS = [
    { value: 'ميناء مصراته', cityName: 'مصراته' },
    { value: 'ميناء طرابلس', cityName: 'طرابلس' },
    { value: 'ميناء الخمس', cityName: 'الخمس' },
    { value: 'ميناء بنغازي', cityName: 'بنغازي' },
  ];

  // البحث عن اللوحة حسب الميناء المختار
  const selectedPort = PORTS.find(p => p.value === formData.port);
  const portPlate = selectedPort 
    ? plates.find(p => p.city.name_ar === selectedPort.cityName)
    : null;

  return (
    <section className="users-management">
    

      <div className="users-card">
        <div className="form-page-container">
          <form onSubmit={handleSubmit} className="user-form" style={{ maxWidth: '100%' }}>
          {/* الهيدرات الثلاثة بجانب بعض */}
          <div className="form-sections-container">
            {/* بيانات التأمين - تظهر عند اختيار تأمين إجباري أو جمرك أو طرف ثالث أو سيارات أجنبية */}
            {(isMandatoryInsurance || isCustomsInsurance || isThirdPartyInsurance || isForeignCarInsurance) && (
              <div className="form-section">
              <h3 className="form-section-title">بيانات التأمين</h3>
              
              <div className="form-group">
                <label htmlFor="insurance_type">نوع التأمين <span className="required">*</span></label>
                <select
                  id="insurance_type"
                  value={formData.insurance_type}
                  onChange={(e) => setFormData({ ...formData, insurance_type: e.target.value as any })}
                  className={formErrors.insurance_type ? 'error' : ''}
                >
                  {(() => {
                    // جميع أنواع التأمين المتاحة
                    const allInsuranceTypes = [
                      { value: 'تأمين إجباري سيارات', label: 'تأمين إجباري سيارات' },
                      { value: 'تأمين سيارة جمرك', label: 'تأمين سيارة جمرك' },
                      { value: 'تأمين طرف ثالث سيارات', label: 'تأمين طرف ثالث سيارات' },
                      { value: 'تأمين سيارات أجنبية', label: 'تأمين سيارات أجنبية' },
                    ];

                    // إذا كان admin، أظهر كل شيء
                    if (isAdmin) {
                      return allInsuranceTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ));
                    }

                    // إذا لم يكن admin، قم بتصفية الأنواع المصرح بها
                    if (authorizedDocuments && authorizedDocuments.length > 0) {
                      // خريطة أنواع التأمين في الواجهة إلى أنواع التأمين في الصلاحيات
                      const insuranceTypeMap: Record<string, string[]> = {
                        'تأمين إجباري سيارات': ['تأمين سيارات إجباري', 'تأمين سيارات'],
                        'تأمين سيارة جمرك': ['تأمين سيارة جمرك'],
                        'تأمين طرف ثالث سيارات': ['تأمين طرف ثالث سيارات'],
                        'تأمين سيارات أجنبية': ['تأمين سيارات أجنبية'],
                      };

                      const allowedTypes = allInsuranceTypes.filter(type => {
                        const permissionTypes = insuranceTypeMap[type.value] || [];
                        return permissionTypes.some(permType => authorizedDocuments.includes(permType));
                      });

                      if (allowedTypes.length === 0) {
                        return <option value="">لا توجد أنواع تأمين متاحة</option>;
                      }

                      // إذا كان النوع الحالي غير مسموح، قم بتغييره إلى أول نوع مسموح
                      if (allowedTypes.length > 0 && !allowedTypes.find(t => t.value === formData.insurance_type)) {
                        setTimeout(() => {
                          setFormData(prev => ({ ...prev, insurance_type: allowedTypes[0].value as any }));
                        }, 0);
                      }

                      return allowedTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ));
                    }

                    // إذا لم يكن هناك صلاحيات، لا تظهر أي خيارات
                    return <option value="">لا توجد صلاحيات لإضافة وثائق تأمين</option>;
                  })()}
                </select>
                {formErrors.insurance_type && <span className="error-message">{formErrors.insurance_type}</span>}
              </div>

              <div className="form-group">
                <label>تاريخ الإصدار</label>
                <input
                  type="text"
                  value={new Date().toLocaleString('ar-LY')}
                  disabled
                  style={{ background: '#f3f4f6', color: '#6b7280' }}
                />
              </div>

              {/* الجهة المقيد بها - تظهر عند تأمين إجباري أو طرف ثالث فقط */}
              {(isMandatoryInsurance || isThirdPartyInsurance) && !isForeignCarInsurance && (
                <div className="form-group" ref={plateDropdownRef} style={{ position: 'relative' }}>
                  <label htmlFor="plate_id">الجهة المقيد بها <span className="required">*</span></label>
                <div
                  onClick={() => {
                    setShowPlateDropdown((v) => !v);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: formErrors.plate_id ? '1px solid #ef4444' : '1px solid var(--border)',
                    borderRadius: 8,
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: 42,
                  }}
                >
                  <span style={{ color: formData.plate_id ? '#111827' : '#9ca3af' }}>
                    {selectedPlate
                      ? `${selectedPlate.city.name_ar} - ${selectedPlate.plate_number}`
                      : 'اختر الجهة المقيد بها...'}
                  </span>
                  <i
                    className={`fa-solid fa-chevron-${showPlateDropdown ? 'up' : 'down'}`}
                    style={{ color: '#9ca3af' }}
                  ></i>
                </div>
                {showPlateDropdown && (
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
                        placeholder="ابحث عن لوحة..."
                        value={plateSearch}
                        onChange={(e) => setPlateSearch(e.target.value)}
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
                      {filteredPlates.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>
                          لا توجد نتائج
                        </div>
                      ) : (
                        filteredPlates.map((plate) => (
                          <div
                            key={plate.id}
                            onClick={() => {
                              setFormData({ ...formData, plate_id: plate.id.toString() });
                              setShowPlateDropdown(false);
                              setPlateSearch('');
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              backgroundColor: formData.plate_id === plate.id.toString() ? '#f3f4f6' : 'transparent',
                            }}
                            onMouseEnter={(e) => {
                              if (formData.plate_id !== plate.id.toString()) {
                                e.currentTarget.style.backgroundColor = '#f9fafb';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (formData.plate_id !== plate.id.toString()) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <div style={{ fontWeight: 500 }}>{plate.city.name_ar} - {plate.plate_number}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{plate.city.name_en}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                {formErrors.plate_id && <span className="error-message">{formErrors.plate_id}</span>}
              </div>
              )}

              {/* الميناء - يظهر فقط عند تأمين جمرك */}
              {isCustomsInsurance && (
                <div className="form-group">
                  <label htmlFor="port">الميناء <span className="required">*</span></label>
                  <select
                    id="port"
                    value={formData.port}
                    onChange={(e) => {
                      setFormData({ ...formData, port: e.target.value });
                    }}
                    className={formErrors.port ? 'error' : ''}
                  >
                    <option value="">اختر الميناء...</option>
                    {PORTS.map((port) => (
                      <option key={port.value} value={port.value}>
                        {port.value}
                      </option>
                    ))}
                  </select>
                  {formErrors.port && <span className="error-message">{formErrors.port}</span>}
                </div>
              )}

              {/* بداية التأمين - لا تظهر في تأمين إجباري سيارات */}
              {!isMandatoryInsurance && !isCustomsInsurance && (
                <div className="form-group">
                  <label htmlFor="start_date">بداية التأمين <span className="required">*</span></label>
                  <input
                    type="date"
                    id="start_date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className={formErrors.start_date ? 'error' : ''}
                  />
                  {formErrors.start_date && <span className="error-message">{formErrors.start_date}</span>}
                </div>
              )}
              
              {/* بداية التأمين - لتأمين جمرك (معطلة، تعرض تاريخ الإصدار) */}
              {isCustomsInsurance && (
                <div className="form-group">
                  <label>بداية التأمين</label>
                  <input
                    type="text"
                    value={formData.start_date ? new Date(formData.start_date).toLocaleDateString('ar-LY') : new Date().toLocaleDateString('ar-LY')}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="end_date">نهاية التأمين</label>
                <input
                  type="text"
                  id="end_date"
                  value={formData.end_date}
                  readOnly
                  style={{ background: '#f3f4f6', color: '#6b7280' }}
                />
              </div>

              {/* مدة التأمين - لا تظهر في تأمين إجباري سيارات (مثبتة على سنة واحدة) */}
              {!isMandatoryInsurance && (
                <div className="form-group">
                  <label htmlFor="duration">مدة التأمين</label>
                  <select
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value as any })}
                  >
                    {isCustomsInsurance ? (
                      <>
                        <option value="شهر (30 يوم)">شهر (30 يوم)</option>
                        <option value="شهرين (60 يوم)">شهرين (60 يوم)</option>
                        <option value="ثلاثة أشهر (90 يوم)">ثلاثة أشهر (90 يوم)</option>
                      </>
                    ) : isForeignCarInsurance ? (
                      <>
                        <option value="شهر (30 يوم)">شهر (30 يوم)</option>
                        <option value="شهرين (60 يوم)">شهرين (60 يوم)</option>
                        <option value="ثلاثة أشهر (90 يوم)">ثلاثة أشهر (90 يوم)</option>
                        <option value="سنة (365 يوم)">سنة (365 يوم)</option>
                        <option value="سنتين (730 يوم)">سنتين (730 يوم)</option>
                      </>
                    ) : (
                      <>
                        <option value="سنة (365 يوم)">سنة (365 يوم)</option>
                        <option value="سنتين (730 يوم)">سنتين (730 يوم)</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              {/* غرض من الطرف الثالث - يظهر فقط عند تأمين طرف ثالث */}
              {isThirdPartyInsurance && !isForeignCarInsurance && (
                <div className="form-group">
                  <label htmlFor="third_party_purpose">غرض من الطرف الثالث <span className="required">*</span></label>
                  <select
                    id="third_party_purpose"
                    value={formData.third_party_purpose}
                    onChange={(e) => setFormData({ ...formData, third_party_purpose: e.target.value })}
                    className={formErrors.third_party_purpose ? 'error' : ''}
                  >
                    <option value="">اختر الغرض...</option>
                    <option value="خاصة">خاصة</option>
                    <option value="عامة">عامة</option>
                    <option value="نقل">نقل</option>
                  </select>
                  {formErrors.third_party_purpose && <span className="error-message">{formErrors.third_party_purpose}</span>}
                </div>
              )}
            </div>
            )}

            {/* الهيدر الثاني: بيانات المركبة */}
            <div className="form-section" style={{ flex: '2 1 auto', minWidth: '50%' }}>
            <h3 className="form-section-title">بيانات المركبة</h3>
            
            <div className="form-group">
              <label htmlFor="chassis_number">رقم الهيكل</label>
              <input
                type="text"
                id="chassis_number"
                value={formData.chassis_number}
                onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label htmlFor="plate_number_manual">رقم اللوحة المعدنية</label>
                <input
                  type="text"
                  id="plate_number_manual"
                  value={formData.plate_number_manual}
                  onChange={(e) => setFormData({ ...formData, plate_number_manual: e.target.value })}
                />
              </div>
              {!isForeignCarInsurance && (
                <div className="form-group">
                  <label>رقم اللوحة</label>
                  <input
                    type="text"
                    value={
                      isCustomsInsurance 
                        ? (portPlate ? portPlate.plate_number : '')
                        : (selectedPlate ? selectedPlate.plate_number : '')
                    }
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" ref={vehicleTypeDropdownRef} style={{ position: 'relative' }}>
                <label htmlFor="vehicle_type_id">نوع السيارة</label>
                <div
                  onClick={() => {
                    setShowVehicleTypeDropdown((v) => !v);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: 42,
                  }}
                >
                  <span style={{ color: selectedBrand ? '#111827' : '#9ca3af' }}>
                    {selectedBrand || 'اختر نوع السيارة...'}
                  </span>
                  <i
                    className={`fa-solid fa-chevron-${showVehicleTypeDropdown ? 'up' : 'down'}`}
                    style={{ color: '#9ca3af' }}
                  ></i>
                </div>
                {showVehicleTypeDropdown && (
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
                        placeholder="ابحث عن نوع السيارة..."
                        value={vehicleTypeSearch}
                        onChange={(e) => setVehicleTypeSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          marginBottom: '8px',
                        }}
                      />
                      {!showAddVehicleType && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowAddVehicleType(true);
                            setVehicleTypeSearch('');
                            const hasBrands = uniqueBrands.length > 0;
                            setUseCustomVehicleTypeBrand(!hasBrands);
                            if (hasBrands && !newVehicleTypeBrand) {
                              setNewVehicleTypeBrand(selectedBrand || uniqueBrands[0] || '');
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontFamily: "'Cairo', 'Segoe UI', system-ui, sans-serif",
                          }}
                        >
                          <i className="fa-solid fa-plus"></i>
                          إضافة نوع سيارة
                        </button>
                      )}
                      {showAddVehicleType && (
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {useCustomVehicleTypeBrand ? (
                            <input
                              type="text"
                              placeholder="اسم الماركة..."
                              value={newVehicleTypeBrand}
                              onChange={(e) => setNewVehicleTypeBrand(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid var(--border)',
                                borderRadius: 6,
                              }}
                            />
                          ) : (
                            <select
                              value={newVehicleTypeBrand}
                              onChange={(e) => setNewVehicleTypeBrand(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid var(--border)',
                                borderRadius: 6,
                                background: '#fff',
                              }}
                            >
                              <option value="">اختر الماركة...</option>
                              {uniqueBrands.map((brand) => (
                                <option key={brand} value={brand}>{brand}</option>
                              ))}
                            </select>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setUseCustomVehicleTypeBrand(!useCustomVehicleTypeBrand);
                              if (!useCustomVehicleTypeBrand) {
                                setNewVehicleTypeBrand('');
                              } else {
                                setNewVehicleTypeBrand(selectedBrand || uniqueBrands[0] || '');
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              background: '#2563eb',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontFamily: "'Cairo', 'Segoe UI', system-ui, sans-serif",
                            }}
                          >
                            {useCustomVehicleTypeBrand ? 'اختر ماركة موجودة' : 'إضافة ماركة جديدة'}
                          </button>
                          <input
                            type="text"
                            placeholder="اسم الفئة..."
                            value={newVehicleTypeCategory}
                            onChange={(e) => setNewVehicleTypeCategory(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddVehicleType(e as any);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                            }}
                          />
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddVehicleType(e);
                              }}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: '#10b981',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                              }}
                            >
                              <i className="fa-solid fa-check"></i>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowAddVehicleType(false);
                                setNewVehicleTypeCategory('');
                              }}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: '#ef4444',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                              }}
                            >
                              <i className="fa-solid fa-times"></i>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setShowAddVehicleType(false);
                            setNewVehicleTypeBrand('');
                                setNewVehicleTypeCategory('');
                                setShowVehicleTypeDropdown(false);
                            setUseCustomVehicleTypeBrand(false);
                              }}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                background: '#6b7280',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                cursor: 'pointer',
                              }}
                              title="إنهاء الإضافة"
                            >
                              <i className="fa-solid fa-circle-check"></i>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {uniqueBrands.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>
                          لا توجد نتائج
                        </div>
                      ) : (
                        uniqueBrands.map((brand) => {
                          // الحصول على أول ID لهذه العلامة التجارية
                          const firstVehicleType = vehicleTypes.find(vt => vt.brand === brand);
                          return (
                            <div
                              key={brand}
                              onClick={() => {
                                if (firstVehicleType) {
                                  setFormData({ ...formData, vehicle_type_id: firstVehicleType.id.toString() });
                                  setSelectedCategory(firstVehicleType.category);
                                } else {
                                  setSelectedCategory('');
                                }
                                setShowVehicleTypeDropdown(false);
                                setVehicleTypeSearch('');
                              }}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                backgroundColor: selectedBrand === brand ? '#f3f4f6' : 'transparent',
                              }}
                            >
                              {brand}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedBrand && (
                <div className="form-group" ref={categoryDropdownRef} style={{ position: 'relative' }}>
                  <label htmlFor="category">فئة السيارة</label>
                  <div
                    onClick={() => {
                      setShowCategoryDropdown((v) => !v);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      minHeight: 42,
                    }}
                  >
                    <span style={{ color: selectedCategory ? '#111827' : '#9ca3af' }}>
                      {selectedCategory || 'اختر الفئة...'}
                    </span>
                    <i
                      className={`fa-solid fa-chevron-${showCategoryDropdown ? 'up' : 'down'}`}
                      style={{ color: '#9ca3af' }}
                    ></i>
                  </div>
                  {showCategoryDropdown && (
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
                          placeholder="ابحث عن فئة..."
                          value={categorySearch}
                          onChange={(e) => setCategorySearch(e.target.value)}
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
                        {filteredCategories
                          .filter(c => c.category.toLowerCase().includes(categorySearch.toLowerCase()))
                          .map((vt) => (
                            <div
                              key={vt.id}
                              onClick={() => {
                                setSelectedCategory(vt.category);
                                setFormData({ ...formData, vehicle_type_id: vt.id.toString() });
                                setShowCategoryDropdown(false);
                                setCategorySearch('');
                              }}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                backgroundColor: selectedCategory === vt.category ? '#f3f4f6' : 'transparent',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <span>{vt.category}</span>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteVehicleTypeClick(e, vt)}
                                style={{
                                  padding: '4px 8px',
                                  background: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: 4,
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                }}
                                title="حذف الفئة"
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" ref={colorDropdownRef} style={{ position: 'relative' }}>
                <label htmlFor="color">اللون</label>
                <div
                  onClick={() => {
                    setShowColorDropdown((v) => !v);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: 42,
                  }}
                >
                  <span style={{ color: formData.color ? '#111827' : '#9ca3af' }}>
                    {formData.color || 'اختر اللون...'}
                  </span>
                  <i
                    className={`fa-solid fa-chevron-${showColorDropdown ? 'up' : 'down'}`}
                    style={{ color: '#9ca3af' }}
                  ></i>
                </div>
                {showColorDropdown && (
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
                        placeholder="ابحث عن لون..."
                        value={colorSearch}
                        onChange={(e) => setColorSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          marginBottom: '8px',
                        }}
                      />
                      {!showAddColor && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowAddColor(true);
                            setColorSearch('');
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontFamily: "'Cairo', 'Segoe UI', system-ui, sans-serif",
                          }}
                        >
                          <i className="fa-solid fa-plus"></i>
                          إضافة لون جديد
                        </button>
                      )}
                      {showAddColor && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="أدخل اسم اللون..."
                            value={newColorName}
                            onChange={(e) => setNewColorName(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddColor(e as any);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddColor(e);
                            }}
                            style={{
                              padding: '8px 12px',
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            <i className="fa-solid fa-check"></i>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowAddColor(false);
                              setNewColorName('');
                            }}
                            style={{
                              padding: '8px 12px',
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 6,
                              cursor: 'pointer',
                            }}
                          >
                            <i className="fa-solid fa-times"></i>
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {filteredColors.length === 0 && !showAddColor ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>
                          لا توجد نتائج
                        </div>
                      ) : (
                        filteredColors.map((color) => (
                          <div
                            key={color.id}
                            onClick={() => {
                              setFormData({ ...formData, color: color.name });
                              setShowColorDropdown(false);
                              setColorSearch('');
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                              backgroundColor: formData.color === color.name ? '#f3f4f6' : 'transparent',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                            onMouseEnter={(e) => {
                              if (formData.color !== color.name) {
                                e.currentTarget.style.backgroundColor = '#f9fafb';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (formData.color !== color.name) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <span>{color.name}</span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteColorClick(e, color.id, color.name)}
                              style={{
                                padding: '4px 8px',
                                background: '#ef4444',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                              title="حذف اللون"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group" ref={yearDropdownRef} style={{ position: 'relative' }}>
                <label htmlFor="year">السنة</label>
                <div
                  onClick={() => {
                    setShowYearDropdown((v) => !v);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: 42,
                  }}
                >
                  <span style={{ color: formData.year ? '#111827' : '#9ca3af' }}>
                    {formData.year || 'اختر السنة...'}
                  </span>
                  <i
                    className={`fa-solid fa-chevron-${showYearDropdown ? 'up' : 'down'}`}
                    style={{ color: '#9ca3af' }}
                  ></i>
                </div>
                {showYearDropdown && (
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
                        placeholder="ابحث عن سنة..."
                        value={yearSearch}
                        onChange={(e) => setYearSearch(e.target.value)}
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
                      {filteredYears.map((year) => (
                        <div
                          key={year}
                          onClick={() => {
                            setFormData({ ...formData, year: year.toString() });
                            setShowYearDropdown(false);
                            setYearSearch('');
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f3f4f6',
                          }}
                        >
                          {year}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isForeignCarInsurance && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="license_purpose">الغرض من الترخيص</label>
                    <select
                      id="license_purpose"
                      value={formData.license_purpose}
                      onChange={(e) => setFormData({ ...formData, license_purpose: e.target.value })}
                    >
                      <option value="">اختر الغرض...</option>
                      {LICENSE_PURPOSES.map((lp) => (
                        <option key={lp.ar} value={`${lp.ar}/${lp.en}`}>
                          {lp.ar} / {lp.en}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="engine_power">قوة المحرك بالحصان {!isThirdPartyInsurance && <span className="required">*</span>}</label>
                    <select
                      id="engine_power"
                      value={formData.engine_power}
                      onChange={(e) => setFormData({ ...formData, engine_power: e.target.value })}
                      className={formErrors.engine_power ? 'error' : ''}
                    >
                      <option value="">اختر قوة المحرك...</option>
                      {availableEnginePowers.map((ep) => (
                        <option key={ep} value={ep}>
                          {ep}
                        </option>
                      ))}
                    </select>
                    {formErrors.engine_power && <span className="error-message">{formErrors.engine_power}</span>}
                  </div>
                </div>

                {/* الركاب المصرح بهم والحمولة بالطن - تظهر فقط عند اختيار قوة المحرك */}
                {formData.engine_power && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {!(isTransportPurpose && formData.engine_power === 'مقطورة') && (
                      <div className="form-group">
                        <label htmlFor="authorized_passengers">الركاب المصرح بهم</label>
                        <input
                          type="number"
                          id="authorized_passengers"
                          min="1"
                          max="100"
                          value={formData.authorized_passengers}
                          onChange={(e) => setFormData({ ...formData, authorized_passengers: e.target.value })}
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label htmlFor="load_capacity">الحمولة بالطن</label>
                      <input
                        type="number"
                        id="load_capacity"
                        min="0"
                        max="1000"
                        step="1"
                        value={formData.load_capacity}
                        onChange={(e) => {
                          const value = e.target.value;
                          // قبول الأرقام الصحيحة فقط (من 0 إلى 1000)
                          if (value === '') {
                            setFormData({ ...formData, load_capacity: '' });
                          } else {
                            const numValue = parseInt(value);
                            if (!isNaN(numValue) && numValue >= 0 && numValue <= 1000) {
                              setFormData({ ...formData, load_capacity: numValue.toString() });
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* بيانات تأمين السيارات الأجنبية - يظهر فقط عند تأمين سيارات أجنبية وتكون داخل بيانات المركبة */}
            {isForeignCarInsurance && (
              <>
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '2px solid var(--border)' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>بيانات تأمين السيارات الأجنبية</h4>
                </div>
                <div className="form-group">
                  <label htmlFor="foreign_car_country">دولة السيارة <span className="required">*</span></label>
                  <select
                    id="foreign_car_country"
                    value={formData.foreign_car_country}
                    onChange={(e) => setFormData({ ...formData, foreign_car_country: e.target.value })}
                    className={formErrors.foreign_car_country ? 'error' : ''}
                  >
                    <option value="">اختر دولة السيارة...</option>
                    <option value="تونسية">تونسية</option>
                    <option value="جزائرية">جزائرية</option>
                    <option value="مصرية">مصرية</option>
                    <option value="أردنية">أردنية</option>
                    <option value="سورية">سورية</option>
                    <option value="فلسطينية">فلسطينية</option>
                    <option value="سودانية">سودانية</option>
                    <option value="مغربية">مغربية</option>
                    <option value="بحرينية">بحرينية</option>
                    <option value="إماراتية">إماراتية</option>
                    <option value="عراقية">عراقية</option>
                    <option value="كويتية">كويتية</option>
                    <option value="لبنانية">لبنانية</option>
                    <option value="مورتانية">مورتانية</option>
                    <option value="عُمانية">عُمانية</option>
                    <option value="قطرية">قطرية</option>
                    <option value="صومالية">صومالية</option>
                    <option value="يمنية">يمنية</option>
                  </select>
                  {formErrors.foreign_car_country && <span className="error-message">{formErrors.foreign_car_country}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="foreign_car_purpose">الغرض من السيارة <span className="required">*</span></label>
                  <select
                    id="foreign_car_purpose"
                    value={formData.foreign_car_purpose}
                    onChange={(e) => setFormData({ ...formData, foreign_car_purpose: e.target.value })}
                    className={formErrors.foreign_car_purpose ? 'error' : ''}
                  >
                    <option value="">اختر الغرض...</option>
                    <option value="سيارات خاصة سياحية">سيارات خاصة سياحية</option>
                    <option value="سيارات نقل ركاب">سيارات نقل ركاب</option>
                    <option value="سيارات نقل وشحن">سيارات نقل وشحن</option>
                  </select>
                  {formErrors.foreign_car_purpose && <span className="error-message">{formErrors.foreign_car_purpose}</span>}
                </div>

                {/* الركاب المصرح بهم والحمولة بالطن - تظهر عند اختيار غرض السيارة */}
                {formData.foreign_car_purpose && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label htmlFor="authorized_passengers_foreign">الركاب المصرح بهم</label>
                      <input
                        type="number"
                        id="authorized_passengers_foreign"
                        min="1"
                        max="100"
                        value={formData.authorized_passengers}
                        onChange={(e) => setFormData({ ...formData, authorized_passengers: e.target.value })}
                        placeholder="من 1 إلى 100 راكب"
                      />
                      <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        يرجى إدخال من الرقم 1 راكب إلى 100 راكب بالتسلسل (مثال: 1-2-3-4-5)
                      </small>
                    </div>
                    <div className="form-group">
                      <label htmlFor="load_capacity_foreign">الحمولة بالطن</label>
                      <input
                        type="number"
                        id="load_capacity_foreign"
                        min="0"
                        max="1000"
                        step="1"
                        value={formData.load_capacity}
                        onChange={(e) => {
                          const value = e.target.value;
                          // قبول الأرقام الصحيحة فقط (من 0 إلى 1000)
                          if (value === '') {
                            setFormData({ ...formData, load_capacity: '' });
                          } else {
                            const numValue = parseInt(value);
                            if (!isNaN(numValue) && numValue >= 0 && numValue <= 1000) {
                              setFormData({ ...formData, load_capacity: numValue.toString() });
                            }
                          }
                        }}
                        placeholder="من 1 إلى 1000 طن"
                      />
                      <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                        {formData.foreign_car_purpose === 'سيارات نقل وشحن' 
                          ? 'يرجى إدخال الحمولة بالطن من الرقم 1 طن إلى 1000 طن بالتسلسل (مثال: 1-2-3-4-5)'
                          : 'يرجى إدخال الحمولة بالطن من الرقم 0 طن إلى 1000 طن'}
                      </small>
                    </div>
                  </div>
                )}
              </>
            )}
            </div>

            {/* الهيدر الثالث: بيانات المؤمن له */}
            <div className="form-section">
              <h3 className="form-section-title">بيانات المؤمن له</h3>
              
              <div className="form-group">
                <label htmlFor="insured_name">اسم المؤمن</label>
                <input
                  type="text"
                  id="insured_name"
                  value={formData.insured_name}
                  onChange={(e) => setFormData({ ...formData, insured_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">رقم الهاتف</label>
                <input
                  type="text"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              {/* القيمة المالية */}
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '2px solid var(--border)' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>القيمة المالية</h4>
                
                <div className="form-group">
                  <label htmlFor="premium">القسط <span className="required">*</span></label>
                  <input
                    type="text"
                    id="premium"
                    value={formData.premium}
                    readOnly
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' }}
                    className={formErrors.premium ? 'error' : ''}
                  />
                  {formErrors.premium && <span className="error-message">{formErrors.premium}</span>}
                </div>

                <div className="form-group">
                  <label>الإجمالي</label>
                  <input
                    type="text"
                    value={`${calculateTotal().toFixed(3)} دينار`}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280', fontWeight: 'bold' }}
                  />
                </div>
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
              onClick={() => navigate('/insurance-documents')}
              disabled={submitting}
              className="btn-cancel"
            >
              إلغاء
            </button>
          </div>
        </form>
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

