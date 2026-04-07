import { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { showToast } from "./Toast";

type VehicleType = {
  id: number;
  brand: string;
  category: string;
};

type ExternalCar = {
  id: number;
  name: string;
  symbol: string;
  active: number;
  created_at: string;
};

type ExternalCountry = {
  id: number;
  name: string;
  symbol?: string;
  active?: number;
  created_at?: string;
};

type ExternalCountryCondition = {
  id: number;
  name?: string;
  country_id?: number;
  condition?: string;
  description?: string;
  active?: number;
  created_at?: string;
};

type ExternalVehicleNationality = {
  id: number;
  name: string;
  symbol?: string;
  code?: string;
  active?: number;
  created_at?: string;
};

type ExternalInsuranceClause = {
  id: number;
  name?: string;
  type?: string;
  active?: number;
  created_at?: string;
};

type ExternalPrices = {
  installment_daily_1?: number;
  installment_daily_2?: number;
  supervision?: number;
  tax?: number;
  version?: number;
  stamp?: number;
  increase?: number;
};

// بيانات الاعتماد للنظام الخارجي
const EXTERNAL_API_CREDENTIALS = {
  user_name: 'adminmli',
  pass_word: '12345678'
};

const EXTERNAL_API_BASE_URL = '/external-api';

// قائمة السنوات من 1960 إلى 2026
const YEARS = Array.from({ length: 67 }, (_, i) => 1960 + i).reverse();

// قائمة البنود
const ITEM_TYPES = [
  'سيارات خاصة ملاكي',
  'دراجة نارية',
  'سيارة تعليم قيادة',
  'سيارة اسعاف',
  'سيارة نقل الموتى',
  'مقطورة',
  'السيارات التجارية',
  'الجرارات',
  'سيارات نقل بضائع',
  'سيارات الركوبة الحافلات'
];

// البنود التي قيمتها 49 (القسط اليومي = 7)
const LOW_VALUE_ITEMS = [
  'سيارات خاصة ملاكي',
  'دراجة نارية',
  'سيارة تعليم قيادة',
  'سيارة اسعاف',
  'سيارة نقل الموتى'
];

// البنود التي قيمتها 56 (القسط اليومي = 8)
const HIGH_VALUE_ITEMS = [
  'مقطورة',
  'السيارات التجارية',
  'الجرارات',
  'سيارات نقل بضائع',
  'سيارات الركوبة الحافلات'
];

export default function CreateInternationalInsurance() {
  const navigate = useNavigate();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [externalCars, setExternalCars] = useState<ExternalCar[]>([]);
  const [externalCountries, setExternalCountries] = useState<ExternalCountry[]>([]);
  const [externalCountriesConditions, setExternalCountriesConditions] = useState<ExternalCountryCondition[]>([]);
  const [externalVehicleNationalities, setExternalVehicleNationalities] = useState<ExternalVehicleNationality[]>([]);
  const [, setExternalInsuranceClauses] = useState<ExternalInsuranceClause[]>([]);
  const [, setExternalPrices] = useState<ExternalPrices | null>(null);
  const [selectedCountryInfo, setSelectedCountryInfo] = useState<ExternalCountry | null>(null);
  const [selectedCarInfo, setSelectedCarInfo] = useState<ExternalCar | null>(null);
  const [selectedVehicleNationalityInfo, setSelectedVehicleNationalityInfo] = useState<ExternalVehicleNationality | null>(null);
  const [selectedInsuranceClauseId, setSelectedInsuranceClauseId] = useState<string>('1'); // القيمة الافتراضية
  const [loading, setLoading] = useState(false);
  const [syncingExternal, setSyncingExternal] = useState(false);
  const [loadingCountryInfo, setLoadingCountryInfo] = useState(false);
  const [loadingCarInfo, setLoadingCarInfo] = useState(false);
  const [loadingVehicleNationalityInfo, setLoadingVehicleNationalityInfo] = useState(false);
  const [formData, setFormData] = useState({
    insured_name: '',
    insured_address: '',
    phone: '',
    chassis_number: '',
    plate_number: '',
    motor_number: '', // رقم المحرك (مطلوب للنظام الخارجي)
    vehicle_type_id: '',
    external_car_id: '', // ID السيارة من النظام الخارجي
    year: '',
    vehicle_nationality: '',
    external_vehicle_nationality_id: '', // ID جنسية المركبة من النظام الخارجي
    visited_country: '',
    external_country_id: '', // ID الدولة من النظام الخارجي
    start_date: '',
    number_of_days: '',
    end_date: '',
    item_type: '' as '' | typeof ITEM_TYPES[number],
    number_of_countries: 1,
    daily_premium: 0,
    premium: 0,
    tax: 0,
    supervision_fees: 0,
    issue_fees: 10.000,
    stamp: 0.250,
    total: 0,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Select2 states
  const [vehicleTypeSearch, setVehicleTypeSearch] = useState("");
  const [showVehicleTypeDropdown, setShowVehicleTypeDropdown] = useState(false);
  const vehicleTypeDropdownRef = useRef<HTMLDivElement>(null);

  const [yearSearch, setYearSearch] = useState("");
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVehicleTypes();
    fetchExternalData();
  }, []);

  // جلب البيانات من النظام الخارجي
  const fetchExternalData = async () => {
    try {
      setLoading(true);
      // جلب السيارات والدول وشروط الدول وجنسيات المركبات وبنود التأمين والأسعار من النظام الخارجي
      await Promise.all([
        fetchExternalCars(),
        fetchExternalCountries(),
        fetchExternalCountriesConditions(),
        fetchExternalVehicleNationalities(),
        fetchExternalInsuranceClauses(),
        fetchExternalPrices()
      ]);
    } catch (error) {
      console.error('Error fetching external data:', error);
    } finally {
      setLoading(false);
    }
  };

  // تسجيل الدخول إلى النظام الخارجي (Company Login)
  const authenticateExternalAPI = async (): Promise<boolean> => {
    try {
      // Company Login يستخدم POST مع FormData (حسب استجابة الـ API)
      const formData = new FormData();
      formData.append('user_name', EXTERNAL_API_CREDENTIALS.user_name);
      formData.append('pass_word', EXTERNAL_API_CREDENTIALS.pass_word);
      
      const res = await fetch(`${EXTERNAL_API_BASE_URL}/auth/company`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          console.error('Error parsing auth response:', text.substring(0, 200));
          return false;
        }
      }

      const isAuthenticated = data.code === 1 && (data.statues === true || data.status === true);
      if (isAuthenticated) {
        console.log('✅ Company Login successful');
        if (data.data) {
          console.log('📋 بيانات المستخدم:', data.data);
        }
      } else {
        console.warn('⚠️ Company Login failed:', data);
      }
      return isAuthenticated;
    } catch (error) {
      console.error('❌ Company Login error:', error);
      return false;
    }
  };

  // جلب جميع السيارات من النظام الخارجي
  const fetchExternalCars = async () => {
    try {
      const formData = new FormData();
      formData.append('user_name', EXTERNAL_API_CREDENTIALS.user_name);
      formData.append('pass_word', EXTERNAL_API_CREDENTIALS.pass_word);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/cars/all`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.code === 1 && data.data && Array.isArray(data.data)) {
        const cars = data.data.filter((car: ExternalCar) => car.active === 1);
        setExternalCars(cars);
        // حفظ السيارات محلياً
        await syncCarsToLocal(cars);
      }
    } catch (error) {
      console.error('Error fetching external cars:', error);
    }
  };

  // جلب جميع الدول من النظام الخارجي
  const fetchExternalCountries = async () => {
    try {
      const formData = new FormData();
      formData.append('user_name', EXTERNAL_API_CREDENTIALS.user_name);
      formData.append('pass_word', EXTERNAL_API_CREDENTIALS.pass_word);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/countries/all`, {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          console.error('Error parsing countries response:', text.substring(0, 200));
          return;
        }
      }

      if (data.code === 1 && data.data && Array.isArray(data.data)) {
        // تصفية الدول النشطة فقط وترتيبها
        const activeCountries = data.data
          .filter((country: ExternalCountry) => {
            // التحقق من أن الدولة نشطة (active === 1 أو غير محدد)
            return country.active === 1 || country.active === undefined;
          })
          .sort((a: ExternalCountry, b: ExternalCountry) => 
            (a.name || '').localeCompare(b.name || '')
          );
        setExternalCountries(activeCountries);
        console.log('Fetched external countries:', activeCountries.length);
      } else {
        console.warn('Failed to fetch countries:', data);
      }
    } catch (error) {
      console.error('Error fetching external countries:', error);
    }
  };

  // جلب جميع شروط الدول من النظام الخارجي
  const fetchExternalCountriesConditions = async () => {
    try {
      const formData = new FormData();
      formData.append('user_name', EXTERNAL_API_CREDENTIALS.user_name);
      formData.append('pass_word', EXTERNAL_API_CREDENTIALS.pass_word);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/countriescondition/all`, {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          console.error('Error parsing countries conditions response:', text.substring(0, 200));
          return;
        }
      }

      if (data.code === 1 && data.data && Array.isArray(data.data)) {
        // تصفية الشروط النشطة فقط وترتيبها
        const activeConditions = data.data
          .filter((condition: ExternalCountryCondition) => {
            // التحقق من أن الشرط نشط (active === 1 أو غير محدد)
            return condition.active === 1 || condition.active === undefined;
          })
          .sort((a: ExternalCountryCondition, b: ExternalCountryCondition) => {
            // ترتيب حسب country_id ثم حسب الاسم
            if (a.country_id && b.country_id && a.country_id !== b.country_id) {
              return a.country_id - b.country_id;
            }
            return (a.name || '').localeCompare(b.name || '');
          });
        setExternalCountriesConditions(activeConditions);
        console.log('Fetched external countries conditions:', activeConditions.length);
      } else {
        console.warn('Failed to fetch countries conditions:', data);
      }
    } catch (error) {
      console.error('Error fetching external countries conditions:', error);
    }
  };

  // جلب معلومات سيارة محددة من النظام الخارجي
  const fetchCarInfo = async (carId: number) => {
    if (!carId) {
      setSelectedCarInfo(null);
      return;
    }

    setLoadingCarInfo(true);
    try {
      const formData = new FormData();
      formData.append('user_name', EXTERNAL_API_CREDENTIALS.user_name);
      formData.append('pass_word', EXTERNAL_API_CREDENTIALS.pass_word);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/cars/getinfo/${carId}`, {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          console.error('Error parsing car info response:', text.substring(0, 200));
          setLoadingCarInfo(false);
          return;
        }
      }

      if (data.code === 1 && data.data) {
        setSelectedCarInfo(data.data);
        console.log('Fetched car info:', data.data);
      } else {
        console.warn('Failed to fetch car info:', data);
        setSelectedCarInfo(null);
      }
    } catch (error) {
      console.error('Error fetching car info:', error);
      setSelectedCarInfo(null);
    } finally {
      setLoadingCarInfo(false);
    }
  };

  // جلب جميع جنسيات المركبات من النظام الخارجي
  const fetchExternalVehicleNationalities = async () => {
    try {
      const formData = new FormData();
      formData.append('user_name', EXTERNAL_API_CREDENTIALS.user_name);
      formData.append('pass_word', EXTERNAL_API_CREDENTIALS.pass_word);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/vehiclenationality/all`, {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          console.error('Error parsing vehicle nationalities response:', text.substring(0, 200));
          return;
        }
      }

      if (data.code === 1 && data.data && Array.isArray(data.data)) {
        // تصفية الجنسيات النشطة فقط وترتيبها
        const activeNationalities = data.data
          .filter((nationality: ExternalVehicleNationality) => {
            // التحقق من أن الجنسية نشطة (active === 1 أو غير محدد)
            return nationality.active === 1 || nationality.active === undefined;
          })
          .sort((a: ExternalVehicleNationality, b: ExternalVehicleNationality) => 
            (a.name || '').localeCompare(b.name || '')
          );
        setExternalVehicleNationalities(activeNationalities);
        console.log('Fetched external vehicle nationalities:', activeNationalities.length);
      } else {
        console.warn('Failed to fetch vehicle nationalities:', data);
      }
    } catch (error) {
      console.error('Error fetching external vehicle nationalities:', error);
    }
  };

  // جلب معلومات جنسية مركبة محددة من النظام الخارجي
  const fetchVehicleNationalityInfo = async (nationalityId: number) => {
    if (!nationalityId) {
      setSelectedVehicleNationalityInfo(null);
      return;
    }

    setLoadingVehicleNationalityInfo(true);
    try {
      const formData = new FormData();
      formData.append('user_name', EXTERNAL_API_CREDENTIALS.user_name);
      formData.append('pass_word', EXTERNAL_API_CREDENTIALS.pass_word);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/vehiclenationality/getinfo/${nationalityId}`, {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          console.error('Error parsing vehicle nationality info response:', text.substring(0, 200));
          setLoadingVehicleNationalityInfo(false);
          return;
        }
      }

      if (data.code === 1 && data.data) {
        setSelectedVehicleNationalityInfo(data.data);
        console.log('Fetched vehicle nationality info:', data.data);
      } else {
        console.warn('Failed to fetch vehicle nationality info:', data);
        setSelectedVehicleNationalityInfo(null);
      }
    } catch (error) {
      console.error('Error fetching vehicle nationality info:', error);
      setSelectedVehicleNationalityInfo(null);
    } finally {
      setLoadingVehicleNationalityInfo(false);
    }
  };

  // جلب جميع بنود التأمين من النظام الخارجي
  const fetchExternalInsuranceClauses = async () => {
    try {
      const formData = new FormData();
      formData.append('user_name', EXTERNAL_API_CREDENTIALS.user_name);
      formData.append('pass_word', EXTERNAL_API_CREDENTIALS.pass_word);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/insuranceclause/all`, {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          console.error('Error parsing insurance clauses response:', text.substring(0, 200));
          return;
        }
      }

      if (data.code === 1 && data.data && Array.isArray(data.data)) {
        const clauses = data.data.filter((clause: ExternalInsuranceClause) => clause.active !== 0);
        setExternalInsuranceClauses(clauses);
        console.log('Fetched external insurance clauses:', clauses.length);
        
        // استخدام أول بند تأمين نشط كقيمة افتراضية
        if (clauses.length > 0 && !selectedInsuranceClauseId) {
          setSelectedInsuranceClauseId(clauses[0].id.toString());
        }
      } else {
        console.warn('Failed to fetch insurance clauses:', data);
      }
    } catch (error) {
      console.error('Error fetching external insurance clauses:', error);
    }
  };

  // جلب الأسعار من النظام الخارجي
  const fetchExternalPrices = async () => {
    try {
      const formData = new FormData();
      formData.append('user_name', EXTERNAL_API_CREDENTIALS.user_name);
      formData.append('pass_word', EXTERNAL_API_CREDENTIALS.pass_word);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/prices/getprice`, {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          console.error('Error parsing prices response:', text.substring(0, 200));
          return;
        }
      }

      if (data.code === 1 && data.data) {
        setExternalPrices(data.data);
        console.log('Fetched external prices:', data.data);
        
        // تحديث الأسعار في formData إذا كانت موجودة
        if (data.data.tax) {
          setFormData(prev => ({ ...prev, tax: parseFloat(data.data.tax) || 0 }));
        }
        if (data.data.stamp) {
          setFormData(prev => ({ ...prev, stamp: parseFloat(data.data.stamp) || 0.250 }));
        }
        if (data.data.supervision) {
          setFormData(prev => ({ ...prev, supervision_fees: parseFloat(data.data.supervision) || 0 }));
        }
        if (data.data.version) {
          setFormData(prev => ({ ...prev, issue_fees: parseFloat(data.data.version) || 10.000 }));
        }
      } else {
        console.warn('Failed to fetch prices:', data);
      }
    } catch (error) {
      console.error('Error fetching external prices:', error);
    }
  };

  // التحقق من حالة الوثيقة في النظام الخارجي
  const checkPolicyStatus = async (policyNumber: string) => {
    try {
      console.log('🔍 التحقق من حالة الوثيقة:', policyNumber);
      
      const requestBody = {
        user_name: EXTERNAL_API_CREDENTIALS.user_name,
        pass_word: EXTERNAL_API_CREDENTIALS.pass_word,
        POL_OC_NO: policyNumber
      };

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/insurance/policy/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          console.error('Error parsing policy status response:', text.substring(0, 200));
          return;
        }
      }

      if (data.code === 1 && data.data) {
        console.log('✅ حالة الوثيقة:', data.data);
        console.log('📋 رسالة الحالة:', data.message);
        
        // التحقق من أن الوثيقة معتمدة (Approved)
        if (data.message && data.message.toLowerCase().includes('approved')) {
          console.log('✅ الوثيقة معتمدة (Approved)');
        } else {
          console.warn('⚠️ تحذير: الوثيقة قد لا تكون معتمدة بعد');
        }
      } else {
        console.warn('⚠️ فشل التحقق من حالة الوثيقة:', data);
        if (data.message && data.message.toLowerCase().includes('does not exist')) {
          console.warn('⚠️ الوثيقة غير موجودة في النظام الخارجي أو غير مرتبطة بالمستخدم الحالي');
        }
      }
    } catch (error) {
      console.error('❌ خطأ في التحقق من حالة الوثيقة:', error);
      throw error;
    }
  };

  // جلب معلومات دولة محددة من النظام الخارجي
  const fetchCountryInfo = async (countryId: number) => {
    if (!countryId) {
      setSelectedCountryInfo(null);
      return;
    }

    setLoadingCountryInfo(true);
    try {
      const formData = new FormData();
      formData.append('user_name', EXTERNAL_API_CREDENTIALS.user_name);
      formData.append('pass_word', EXTERNAL_API_CREDENTIALS.pass_word);

      const res = await fetch(`${EXTERNAL_API_BASE_URL}/countries/getinfo/${countryId}`, {
        method: 'POST',
        body: formData,
      });

      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          console.error('Error parsing country info response:', text.substring(0, 200));
          setLoadingCountryInfo(false);
          return;
        }
      }

      if (data.code === 1 && data.data) {
        setSelectedCountryInfo(data.data);
        console.log('Fetched country info:', data.data);
      } else {
        console.warn('Failed to fetch country info:', data);
        setSelectedCountryInfo(null);
      }
    } catch (error) {
      console.error('Error fetching country info:', error);
      setSelectedCountryInfo(null);
    } finally {
      setLoadingCountryInfo(false);
    }
  };

  // مزامنة السيارات مع النظام المحلي
  const syncCarsToLocal = async (cars: ExternalCar[]) => {
    try {
      // ملاحظة: endpoint المزامنة غير موجود حالياً، يمكن إضافته لاحقاً
      // للآن، نستخدم البيانات من النظام الخارجي مباشرة
      console.log('Loaded cars from external API:', cars.length, 'cars');
      
      // يمكن إضافة endpoint لاحقاً للمزامنة:
      // const res = await fetch('/api/vehicle-types/sync-external', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Accept': 'application/json',
      //   },
      //   body: JSON.stringify({ cars }),
      // });
      // if (res.ok) {
      //   await fetchVehicleTypes();
      // }
    } catch (error) {
      console.error('Error syncing cars to local:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (vehicleTypeDropdownRef.current && !vehicleTypeDropdownRef.current.contains(event.target as Node)) {
        setShowVehicleTypeDropdown(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setShowYearDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // حساب end_date عند تغيير start_date أو number_of_days
  useEffect(() => {
    if (formData.start_date && formData.number_of_days) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + parseInt(formData.number_of_days));
      setFormData(prev => ({
        ...prev,
        end_date: endDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.start_date, formData.number_of_days]);

  // حساب daily_premium و tax و supervision_fees و premium عند تغيير item_type
  useEffect(() => {
    if (formData.item_type) {
      let dailyPremium = 0;
      let tax = 0;
      let supervisionFees = 0;
      let premium = 0;

      if (LOW_VALUE_ITEMS.includes(formData.item_type)) {
        dailyPremium = 7;
        tax = 0.5;
        supervisionFees = 0.245;
        premium = 49; // قيمة البند
      } else if (HIGH_VALUE_ITEMS.includes(formData.item_type)) {
        dailyPremium = 8;
        tax = 1.0;
        supervisionFees = 0.280;
        premium = 56; // قيمة البند
      }

      setFormData(prev => ({
        ...prev,
        daily_premium: dailyPremium,
        tax: tax,
        supervision_fees: supervisionFees,
        premium: premium
      }));
    }
  }, [formData.item_type]);

  // حساب total عند تغيير أي من القيم المالية
  useEffect(() => {
    const total = formData.premium + formData.tax + formData.supervision_fees + formData.issue_fees + formData.stamp;
    setFormData(prev => ({
      ...prev,
      total: total
    }));
  }, [formData.premium, formData.tax, formData.supervision_fees, formData.issue_fees, formData.stamp]);

  const fetchVehicleTypes = async () => {
    try {
      const res = await fetch('/api/vehicle-types', {
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setVehicleTypes(data);
      }
    } catch (error) {
      console.error('Error fetching vehicle types:', error);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.insured_name.trim()) {
      errors.insured_name = 'اسم المؤمن مطلوب';
    }
    if (!formData.motor_number.trim()) {
      errors.motor_number = 'رقم المحرك مطلوب';
    }
    if (!formData.vehicle_nationality) {
      errors.vehicle_nationality = 'جنسية المركبة مطلوبة';
    }
    if (!formData.start_date) {
      errors.start_date = 'من يوم مطلوب';
    } else {
      // التحقق من أن التاريخ بعد أو يساوي تاريخ اليوم
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(formData.start_date);
      startDate.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        const todayStr = today.toISOString().split('T')[0];
        errors.start_date = `تاريخ البدء يجب أن يكون بعد أو يساوي تاريخ اليوم (${todayStr})`;
      }
    }
    if (!formData.number_of_days || parseInt(formData.number_of_days) < 1) {
      errors.number_of_days = 'عدد الأيام مطلوب';
    }
    if (!formData.end_date) {
      errors.end_date = 'إلي يوم مطلوب';
    }
    if (!formData.item_type) {
      errors.item_type = 'البند مطلوب';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    console.log('═══════════════════════════════════════════════════════');
    console.log('📝 بدء عملية إنشاء وثيقة تأمين دولي');
    console.log('═══════════════════════════════════════════════════════');

    setSubmitting(true);
    setSyncingExternal(false);
    
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
      
      const documentData = {
        ...formData,
        vehicle_type_id: formData.vehicle_type_id ? parseInt(formData.vehicle_type_id) : null,
        external_car_id: formData.external_car_id ? parseInt(formData.external_car_id) : null,
        external_vehicle_nationality_id: formData.external_vehicle_nationality_id ? parseInt(formData.external_vehicle_nationality_id) : null,
        external_country_id: formData.external_country_id ? parseInt(formData.external_country_id) : null,
        year: formData.year ? parseInt(formData.year) : null,
        number_of_days: parseInt(formData.number_of_days),
        number_of_countries: 1,
      };

      console.log('📋 بيانات الوثيقة قبل الإرسال:');
      console.table({
        'اسم المؤمن': documentData.insured_name,
        'عنوان المؤمن': documentData.insured_address,
        'الهاتف': documentData.phone,
        'رقم الهيكل': documentData.chassis_number,
        'رقم اللوحة': documentData.plate_number,
        'رقم المحرك': documentData.motor_number,
        'نوع السيارة (محلي)': documentData.vehicle_type_id,
        'معرف السيارة (خارجي)': documentData.external_car_id,
        'السنة': documentData.year,
        'جنسية المركبة': documentData.vehicle_nationality,
        'معرف جنسية المركبة (خارجي)': documentData.external_vehicle_nationality_id,
        'الدولة المزارة': documentData.visited_country,
        'معرف الدولة (خارجي)': documentData.external_country_id,
        'تاريخ البدء': documentData.start_date,
        'تاريخ الانتهاء': documentData.end_date,
        'عدد الأيام': documentData.number_of_days,
        'نوع البند': documentData.item_type,
        'القيمة': documentData.premium,
        'الضريبة': documentData.tax,
        'المجموع': documentData.total,
      });

      // 1. حفظ الوثيقة في النظام المحلي أولاً
      console.log('💾 جاري حفظ الوثيقة في النظام المحلي...');
      const res = await fetch('/api/international-insurance-documents', {
        method: 'POST',
        headers,
        body: JSON.stringify(documentData),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('❌ خطأ في حفظ الوثيقة محلياً:');
        console.error('Validation errors:', data.errors);
        console.error('Request data:', documentData);
        
        if (data.errors) {
          setFormErrors(data.errors);
          // عرض تفاصيل الأخطاء للمستخدم
          const errorMessages = Object.values(data.errors).flat().join(', ');
          throw new Error(`خطأ في التحقق من البيانات: ${errorMessages}`);
        }
        throw new Error(data.message || 'حدث خطأ أثناء إنشاء الوثيقة');
      }

      console.log('✅ تم حفظ الوثيقة في النظام المحلي بنجاح');
      console.log('📄 رقم الوثيقة المحلية:', data.id || data.data?.id);

      // 2. إرسال الوثيقة إلى النظام الخارجي
      setSyncingExternal(true);
      try {
        const externalResponse = await sendDocumentToExternalAPI(documentData, data.id || data.data?.id);
        
        // عرض رسالة نجاح مع رقم الوثيقة من النظام الخارجي إن وجد
        const policyNumber = externalResponse?.policyNumber || externalResponse?.data?.policyNumber || externalResponse?.data || '';
        const successMessage = policyNumber 
          ? `تم إنشاء الوثيقة بنجاح ومزامنتها مع النظام الخارجي. رقم الوثيقة: ${policyNumber}`
          : 'تم إنشاء الوثيقة بنجاح ومزامنتها مع النظام الخارجي';
        
        showToast(successMessage, 'success');
        
        console.log('✅ تم حفظ الوثيقة محلياً وإرسالها إلى النظام الخارجي بنجاح');
        console.log('📄 رقم الوثيقة المحلية:', data.id || data.data?.id);
        console.log('🌐 استجابة النظام الخارجي:', externalResponse);
        
        // ملخص نهائي
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ تمت العملية بنجاح!');
        console.log('📄 رقم الوثيقة المحلية:', data.id || data.data?.id);
        if (policyNumber) {
          console.log('🎫 رقم الوثيقة في النظام الخارجي:', policyNumber);
        }
        console.log('═══════════════════════════════════════════════════════');
      } catch (externalError: any) {
        // إذا فشل الإرسال للخارجي، الوثيقة محفوظة محلياً بنجاح
        console.warn('⚠️ فشل المزامنة مع النظام الخارجي:', externalError.message);
        console.warn('📋 الوثيقة محفوظة محلياً برقم:', data.id || data.data?.id);
        
        // ملخص نهائي مع تحذير
        console.log('═══════════════════════════════════════════════════════');
        console.log('⚠️ تم حفظ الوثيقة محلياً فقط');
        console.log('📄 رقم الوثيقة المحلية:', data.id || data.data?.id);
        console.log('❌ فشل المزامنة مع النظام الخارجي:', externalError.message);
        console.log('═══════════════════════════════════════════════════════');
        
        // عرض رسالة تحذيرية بدلاً من خطأ
        showToast(
          `تم إنشاء الوثيقة محلياً بنجاح. تحذير: فشل المزامنة مع النظام الخارجي - ${externalError.message}`, 
          'error' 
        );
      } finally {
        setSyncingExternal(false);
      }

      setTimeout(() => {
        navigate('/international-insurance-documents');
      }, 1500);
    } catch (error: any) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ فشلت العملية');
      console.error('خطأ:', error.message);
      console.error('═══════════════════════════════════════════════════════');
      
      showToast(error.message || 'حدث خطأ أثناء إنشاء الوثيقة', 'error');
    } finally {
      setSubmitting(false);
      setSyncingExternal(false);
    }
  };

  // إرسال الوثيقة إلى النظام الخارجي
  const sendDocumentToExternalAPI = async (documentData: any, _localDocumentId: number) => {
    try {
      console.log('🚀 بدء إرسال الوثيقة إلى النظام الخارجي...');
      console.log('📋 بيانات الوثيقة المحلية:', documentData);
      
      // التحقق من تسجيل الدخول أولاً
      console.log('🔐 التحقق من تسجيل الدخول...');
      const isAuthenticated = await authenticateExternalAPI();
      if (!isAuthenticated) {
        throw new Error('فشل تسجيل الدخول إلى النظام الخارجي');
      }
      console.log('✅ تم تسجيل الدخول بنجاح');

      // إعداد البيانات للإرسال حسب الوثائق: POST /api/insurance/create
      const formData = new FormData();
      formData.append('user_name', EXTERNAL_API_CREDENTIALS.user_name);
      formData.append('pass_word', EXTERNAL_API_CREDENTIALS.pass_word);
      
      // الحقول المطلوبة حسب الوثائق (حسب المثال المرفق)
      // insurance_location: location of customer
      const insuranceLocation = documentData.insured_address || '';
      formData.append('insurance_location', insuranceLocation);
      
      // insurance_name: name of customer
      const insuranceName = documentData.insured_name || '';
      formData.append('insurance_name', insuranceName);
      
      // insurance_phone: phone number of customer
      const insurancePhone = documentData.phone || '';
      formData.append('insurance_phone', insurancePhone);
      
      // motor_number: motor number (مطلوب من النظام الخارجي)
      const motorNumber = documentData.motor_number || '';
      if (!motorNumber) {
        throw new Error('رقم المحرك مطلوب (motor_number)');
      }
      formData.append('motor_number', motorNumber);
      
      // chassis_number: chassis number
      const chassisNumber = documentData.chassis_number || '';
      if (chassisNumber) {
        formData.append('chassis_number', chassisNumber);
      }
      
      // plate_number: plate number
      const plateNumber = documentData.plate_number || '';
      if (plateNumber) {
        formData.append('plate_number', plateNumber);
      }
      
      // car_made_date: car made date (year only)
      const carMadeDate = documentData.year ? documentData.year.toString() : '';
      if (carMadeDate) {
        formData.append('car_made_date', carMadeDate);
      }
      
      // cars_id: Car ID from external system
      if (!documentData.external_car_id) {
        throw new Error('معرف السيارة مطلوب (external_car_id)');
      }
      const carsId = documentData.external_car_id.toString();
      formData.append('cars_id', carsId);
      
      // vehicle_nationalities_id: Vehicle nationality ID from external system
      if (!documentData.external_vehicle_nationality_id) {
        throw new Error('معرف جنسية المركبة مطلوب (external_vehicle_nationality_id)');
      }
      const vehicleNationalitiesId = documentData.external_vehicle_nationality_id.toString();
      formData.append('vehicle_nationalities_id', vehicleNationalitiesId);
      
      // countries_id: Country ID from external system
      if (!documentData.external_country_id) {
        throw new Error('معرف الدولة مطلوب (external_country_id)');
      }
      const countriesId = documentData.external_country_id.toString();
      formData.append('countries_id', countriesId);
      
      // insurance_day_from: start date of insurance (يجب أن يكون بعد أو يساوي تاريخ اليوم)
      if (!documentData.start_date) {
        throw new Error('تاريخ بداية التأمين مطلوب');
      }
      
      // استخراج التاريخ فقط (YYYY-MM-DD) من documentData.start_date
      // قد يكون التاريخ بتنسيق YYYY-MM-DD أو YYYY-MM-DD HH:mm:ss
      const startDateOnly = documentData.start_date.split(' ')[0]; // أخذ الجزء الأول فقط (التاريخ)
      
      // التحقق من أن التاريخ بعد أو يساوي تاريخ اليوم
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = new Date(startDateOnly);
      startDate.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        const todayStr = today.toISOString().split('T')[0];
        throw new Error(`تاريخ بداية التأمين يجب أن يكون بعد أو يساوي تاريخ اليوم (${todayStr})`);
      }
      
      // insurance_day_from: يجب أن يكون تاريخ فقط (YYYY-MM-DD) حسب الوثائق
      // النظام الخارجي يحسب الوقت تلقائياً
      formData.append('insurance_day_from', startDateOnly);
      
      // insurance_days_number: number of days
      if (!documentData.number_of_days) {
        throw new Error('عدد أيام التأمين مطلوب');
      }
      const insuranceDaysNumber = documentData.number_of_days.toString();
      formData.append('insurance_days_number', insuranceDaysNumber);
      
      // insurance_clauses_id: Insurance clause ID من النظام الخارجي
      const insuranceClausesId = selectedInsuranceClauseId || '1'; // استخدام القيمة المختارة أو القيمة الافتراضية
      formData.append('insurance_clauses_id', insuranceClausesId);
      
      // insurance_country_number: Insurance country number
      const insuranceCountryNumber = documentData.number_of_countries ? documentData.number_of_countries.toString() : '1';
      formData.append('insurance_country_number', insuranceCountryNumber);

      // عرض جميع البيانات المرسلة في console
      const sentData = {
        user_name: EXTERNAL_API_CREDENTIALS.user_name,
        pass_word: '***',
        insurance_location: insuranceLocation,
        insurance_name: insuranceName,
        insurance_phone: insurancePhone,
        motor_number: motorNumber,
        chassis_number: chassisNumber,
        plate_number: plateNumber,
        car_made_date: carMadeDate,
        cars_id: carsId,
        vehicle_nationalities_id: vehicleNationalitiesId,
        countries_id: countriesId,
        insurance_day_from: startDateOnly,
        insurance_days_number: insuranceDaysNumber,
        insurance_clauses_id: insuranceClausesId,
        insurance_country_number: insuranceCountryNumber,
      };
      
      console.log('📤 البيانات المرسلة إلى النظام الخارجي:');
      console.table(sentData);
      console.log('🌐 URL:', `${EXTERNAL_API_BASE_URL}/insurance/create`);
      
      // التحقق من أن جميع الحقول المطلوبة موجودة
      const requiredFields = [
        'user_name',
        'pass_word',
        'insurance_location',
        'insurance_name',
        'insurance_phone',
        'motor_number',
        'cars_id',
        'vehicle_nationalities_id',
        'countries_id',
        'insurance_day_from',
        'insurance_days_number',
        'insurance_clauses_id',
        'insurance_country_number'
      ];
      
      const missingFields = requiredFields.filter(field => {
        if (field === 'user_name' || field === 'pass_word') return false; // موجودة دائماً
        return !(sentData as any)[field] || (sentData as any)[field] === '';
      });
      
      if (missingFields.length > 0) {
        console.warn('⚠️ تحذير: الحقول التالية مفقودة أو فارغة:', missingFields);
      } else {
        console.log('✅ جميع الحقول المطلوبة موجودة');
      }

      // إرسال إلى النظام الخارجي باستخدام الـ endpoint الصحيح
      console.log('📡 جاري الإرسال...');
      const res = await fetch(`${EXTERNAL_API_BASE_URL}/insurance/create`, {
        method: 'POST',
        body: formData,
      });

      console.log('📥 حالة الاستجابة:', res.status, res.statusText);

      // التحقق من نوع الاستجابة
      const contentType = res.headers.get('content-type');
      let responseData;
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await res.json();
      } else {
        const text = await res.text();
        console.log('📄 نص الاستجابة:', text.substring(0, 500));
        try {
          responseData = JSON.parse(text);
        } catch {
          throw new Error(`خطأ في استجابة النظام الخارجي: ${text.substring(0, 200)}`);
        }
      }
      
      console.log('📦 بيانات الاستجابة من النظام الخارجي:');
      console.log(JSON.stringify(responseData, null, 2));
      
      // التحقق من وجود أخطاء في الاستجابة (حتى لو كان status 200)
      if (responseData.error && Array.isArray(responseData.error) && responseData.error.length > 0) {
        const errorMessages = responseData.error.join(', ');
        console.error('❌ أخطاء من النظام الخارجي:', responseData.error);
        throw new Error(`أخطاء من النظام الخارجي: ${errorMessages}`);
      }
      
      // التحقق من رسائل الخطأ الأخرى
      if (responseData.message && typeof responseData.message === 'string') {
        const lowerMessage = responseData.message.toLowerCase();
        if (lowerMessage.includes('privilege') || lowerMessage.includes('permission') || lowerMessage.includes('authorized')) {
          console.error('❌ خطأ في الصلاحيات:', responseData.message);
          throw new Error(`خطأ في الصلاحيات: ${responseData.message}. يرجى التحقق من صلاحيات المستخدم في النظام الخارجي.`);
        }
        if (lowerMessage.includes('user not found') || lowerMessage.includes('user is not active')) {
          console.error('❌ خطأ في المستخدم:', responseData.message);
          throw new Error(`خطأ في المستخدم: ${responseData.message}. يرجى التحقق من بيانات المستخدم في النظام الخارجي.`);
        }
      }
      
      // التحقق من نجاح العملية (code === 1 يعني نجاح)
      if (!res.ok || (responseData.code !== undefined && responseData.code !== 1)) {
        const errorMessage = responseData.message || responseData.messages || 'فشل إرسال الوثيقة إلى النظام الخارجي';
        console.error('❌ خطأ من النظام الخارجي:', responseData);
        throw new Error(errorMessage);
      }

      // في حالة النجاح، الـ response يحتوي على policy number
      console.log('✅ تم إرسال الوثيقة بنجاح إلى النظام الخارجي!');
      const policyNumber = responseData.policyNumber || responseData.data?.policyNumber || responseData.data;
      console.log('🎫 رقم الوثيقة في النظام الخارجي:', policyNumber);
      
      // عرض تفاصيل الوثيقة المُنشأة
      if (responseData.data) {
        console.log('📋 تفاصيل الوثيقة المُنشأة في النظام الخارجي:');
        console.log('   - ID:', responseData.data.id);
        console.log('   - رقم الوثيقة:', policyNumber);
        console.log('   - تاريخ الإصدار:', responseData.data.issuing_date);
        console.log('   - اسم المؤمن:', responseData.data.insurance_name);
        console.log('   - موقع المؤمن:', responseData.data.insurance_location);
        console.log('   - هاتف المؤمن:', responseData.data.insurance_phone);
        console.log('   - رقم الهيكل:', responseData.data.chassis_number);
        console.log('   - رقم اللوحة:', responseData.data.plate_number);
        console.log('   - رقم المحرك:', responseData.data.motor_number);
        console.log('   - معرف السيارة:', responseData.data.cars_id);
        console.log('   - معرف جنسية المركبة:', responseData.data.vehicle_nationalities_id);
        console.log('   - معرف الدولة:', responseData.data.countries_id);
        console.log('   - تاريخ البدء:', responseData.data.insurance_day_from);
        console.log('   - عدد الأيام:', responseData.data.insurance_days_number);
        console.log('   - معرف الشركة:', responseData.data.companies_id);
        console.log('   - معرف مستخدم الشركة:', responseData.data.company_users_id);
        console.log('   - معرف المكتب:', responseData.data.offices_id);
        console.log('   - معرف مستخدم المكتب:', responseData.data.office_users_id);
        
        // التحقق من البيانات المهمة
        if (!responseData.data.companies_id) {
          console.warn('⚠️ تحذير: الوثيقة لا تحتوي على معرف الشركة');
        }
        if (!responseData.data.company_users_id) {
          console.warn('⚠️ تحذير: الوثيقة لا تحتوي على معرف مستخدم الشركة');
        }
      }
      
      // التحقق من وجود رقم الوثيقة
      if (!policyNumber) {
        console.warn('⚠️ تحذير: لم يتم إرجاع رقم الوثيقة من النظام الخارجي');
        console.warn('📋 الاستجابة الكاملة:', responseData);
      } else {
        // التحقق من حالة الوثيقة بعد إنشائها
        try {
          await checkPolicyStatus(policyNumber);
        } catch (statusError) {
          console.warn('⚠️ تحذير: فشل التحقق من حالة الوثيقة:', statusError);
        }
      }
      
      return responseData;
    } catch (error: any) {
      console.error('❌ خطأ في إرسال الوثيقة إلى النظام الخارجي:', error);
      throw error;
    }
  };

  // الحصول على قائمة فريدة من أنواع السيارات من النظام الخارجي
  const uniqueCars = externalCars.length > 0 
    ? externalCars
        .filter(car => car.active === 1)
        .filter(car => car.name.toLowerCase().includes(vehicleTypeSearch.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))
    : Array.from(new Set(vehicleTypes.map(vt => vt.brand)))
        .filter(brand => brand.toLowerCase().includes(vehicleTypeSearch.toLowerCase()))
        .sort()
        .map(brand => {
          const firstVehicleType = vehicleTypes.find(vt => vt.brand === brand);
          return {
            id: firstVehicleType?.id || 0,
            name: brand,
            symbol: '',
            active: 1,
            created_at: ''
          };
        });

  const filteredYears = YEARS.filter(year => 
    year.toString().includes(yearSearch)
  );

  // تحديد السيارة المختارة
  const selectedCar = externalCars.length > 0
    ? externalCars.find(car => car.id.toString() === formData.external_car_id)
    : null;
  
  const selectedVehicleType = vehicleTypes.find(vt => vt.id.toString() === formData.vehicle_type_id);
  const selectedBrand = selectedCar 
    ? selectedCar.name 
    : selectedVehicleType 
    ? selectedVehicleType.brand 
    : '';

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>تأمين السيارات الدولي / إضافة وثيقة</span>
      </div>

      <div className="users-card">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>جار التحميل...</p>
        ) : (
          <div className="form-page-container">
            <div className="form-page-header">
              <h2 className="form-page-title">
                إضافة وثيقة تأمين دولي جديدة
              </h2>
              <button 
                className="btn-cancel" 
                onClick={() => navigate('/international-insurance-documents')}
              >
                <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i>
                العودة للقائمة
              </button>
            </div>

            <form onSubmit={handleSubmit} className="user-form" style={{ maxWidth: '100%' }}>
              {/* بيانات المؤمن ومدة التأمين بجانب بعض */}
              <div className="form-sections-container">
                {/* بيانات المؤمن */}
                <div className="form-section">
                  <h3 className="form-section-title">بيانات المؤمن</h3>
                  
                  <div className="form-group">
                    <label htmlFor="insured_name">اسم المؤمن <span className="required">*</span></label>
                    <input
                      type="text"
                      id="insured_name"
                      value={formData.insured_name}
                      onChange={(e) => setFormData({ ...formData, insured_name: e.target.value })}
                      className={formErrors.insured_name ? 'error' : ''}
                    />
                    {formErrors.insured_name && <span className="error-message">{formErrors.insured_name}</span>}
                  </div>

                <div className="form-group">
                  <label htmlFor="insured_address">العنوان</label>
                  <input
                    type="text"
                    id="insured_address"
                    value={formData.insured_address}
                    onChange={(e) => setFormData({ ...formData, insured_address: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">الهاتف</label>
                  <input
                    type="text"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="chassis_number">رقم الهيكل</label>
                  <input
                    type="text"
                    id="chassis_number"
                    value={formData.chassis_number}
                    onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="plate_number">رقم اللوحة المعدنية</label>
                  <input
                    type="text"
                    id="plate_number"
                    value={formData.plate_number}
                    onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="motor_number">رقم المحرك <span style={{ color: 'red' }}>*</span></label>
                  <input
                    type="text"
                    id="motor_number"
                    value={formData.motor_number}
                    onChange={(e) => setFormData({ ...formData, motor_number: e.target.value })}
                    required
                  />
                  {formErrors.motor_number && (
                    <span className="error-message">{formErrors.motor_number}</span>
                  )}
                </div>

                <div className="form-group" ref={vehicleTypeDropdownRef} style={{ position: 'relative' }}>
                  <label htmlFor="vehicle_type_id">نوع السيارة (بدون فئة)</label>
                  <div
                    onClick={() => setShowVehicleTypeDropdown((v) => !v)}
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
                      </div>
                      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {uniqueCars.length === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>
                            {loading ? 'جاري التحميل...' : 'لا توجد نتائج'}
                          </div>
                        ) : (
                          uniqueCars.map((car) => {
                            const carName = externalCars.length > 0 ? car.name : (car as any).name || '';
                            const carId = externalCars.length > 0 ? car.id : (car as any).id || 0;
                            const isSelected = externalCars.length > 0
                              ? formData.external_car_id === car.id.toString()
                              : formData.vehicle_type_id === carId.toString();
                            
                            return (
                              <div
                                key={carId}
                                onClick={() => {
                                  if (externalCars.length > 0) {
                                    // استخدام بيانات النظام الخارجي
                                    const selectedCarId = car.id;
                                    setFormData({ 
                                      ...formData, 
                                      external_car_id: selectedCarId.toString(),
                                      vehicle_type_id: '' // مسح ID المحلي إذا كان موجوداً
                                    });
                                    // جلب معلومات السيارة المختارة
                                    fetchCarInfo(selectedCarId);
                                  } else {
                                    // استخدام البيانات المحلية كبديل
                                    setFormData({ 
                                      ...formData, 
                                      vehicle_type_id: carId.toString() 
                                    });
                                    setSelectedCarInfo(null);
                                  }
                                  setShowVehicleTypeDropdown(false);
                                  setVehicleTypeSearch('');
                                }}
                                style={{
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f3f4f6',
                                  backgroundColor: isSelected ? '#f3f4f6' : 'transparent',
                                }}
                                onMouseEnter={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = '#f9fafb';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (!isSelected) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }
                                }}
                              >
                                {carName}
                                {externalCars.length > 0 && car.symbol && (
                                  <span style={{ 
                                    marginRight: '8px', 
                                    color: '#6b7280', 
                                    fontSize: '12px',
                                    fontFamily: 'monospace'
                                  }}>
                                    ({car.symbol})
                                  </span>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                  {loadingCarInfo && (
                    <small style={{ 
                      display: 'block', 
                      marginTop: '4px', 
                      color: '#3b82f6', 
                      fontSize: '12px' 
                    }}>
                      جاري جلب معلومات السيارة...
                    </small>
                  )}
                  {selectedCarInfo && !loadingCarInfo && (
                    <div style={{
                      marginTop: '8px',
                      padding: '10px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px', color: '#1e40af' }}>
                        معلومات السيارة المختارة:
                      </div>
                      <div style={{ color: '#374151' }}>
                        <div><strong>الاسم:</strong> {selectedCarInfo.name}</div>
                        {selectedCarInfo.symbol && (
                          <div><strong>الرمز:</strong> {selectedCarInfo.symbol}</div>
                        )}
                        {selectedCarInfo.created_at && (
                          <div><strong>تاريخ الإنشاء:</strong> {selectedCarInfo.created_at}</div>
                        )}
                        <div>
                          <strong>الحالة:</strong>{' '}
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500',
                            backgroundColor: selectedCarInfo.active === 1 ? '#dcfce7' : '#fee2e2',
                            color: selectedCarInfo.active === 1 ? '#166534' : '#991b1b'
                          }}>
                            {selectedCarInfo.active === 1 ? 'نشط' : 'غير نشط'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group" ref={yearDropdownRef} style={{ position: 'relative' }}>
                  <label htmlFor="year">السنة (1960-2026)</label>
                  <div
                    onClick={() => setShowYearDropdown((v) => !v)}
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
                        {filteredYears.length === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>
                            لا توجد نتائج
                          </div>
                        ) : (
                          filteredYears.map((year) => (
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
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                  <div className="form-group">
                    <label htmlFor="vehicle_nationality">جنسية المركبة <span className="required">*</span></label>
                    <select
                      id="vehicle_nationality"
                      value={formData.vehicle_nationality}
                      onChange={(e) => {
                        const selectedNationality = externalVehicleNationalities.find(n => n.name === e.target.value);
                        const nationalityId = selectedNationality ? selectedNationality.id : null;
                        
                        setFormData({ 
                          ...formData, 
                          vehicle_nationality: e.target.value,
                          external_vehicle_nationality_id: nationalityId ? nationalityId.toString() : ''
                        });

                        // جلب معلومات الجنسية المختارة
                        if (nationalityId) {
                          fetchVehicleNationalityInfo(nationalityId);
                        } else {
                          setSelectedVehicleNationalityInfo(null);
                        }
                      }}
                      disabled={loading}
                      required
                      className={formErrors.vehicle_nationality ? 'error' : ''}
                    >
                      <option value="">
                        {loading ? 'جاري تحميل الجنسيات...' : 'اختر جنسية المركبة'}
                      </option>
                      {externalVehicleNationalities.length > 0 ? (
                        externalVehicleNationalities.map((nationality) => (
                          <option key={nationality.id} value={nationality.name}>
                            {nationality.name}
                            {nationality.symbol && ` (${nationality.symbol})`}
                            {nationality.code && ` - ${nationality.code}`}
                          </option>
                        ))
                      ) : (
                        <option value="ليبية- LBY">ليبية- LBY</option>
                      )}
                    </select>
                    {externalVehicleNationalities.length > 0 && (
                      <small style={{ 
                        display: 'block', 
                        marginTop: '4px', 
                        color: '#6b7280', 
                        fontSize: '12px' 
                      }}>
                        تم تحميل {externalVehicleNationalities.length} جنسية من النظام الخارجي
                      </small>
                    )}
                    {loadingVehicleNationalityInfo && (
                      <small style={{ 
                        display: 'block', 
                        marginTop: '4px', 
                        color: '#3b82f6', 
                        fontSize: '12px' 
                      }}>
                        جاري جلب معلومات الجنسية...
                      </small>
                    )}
                    {selectedVehicleNationalityInfo && !loadingVehicleNationalityInfo && (
                      <div style={{
                        marginTop: '8px',
                        padding: '10px',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #fde047',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}>
                        <div style={{ fontWeight: '600', marginBottom: '4px', color: '#92400e' }}>
                          معلومات الجنسية المختارة:
                        </div>
                        <div style={{ color: '#374151' }}>
                          <div><strong>الاسم:</strong> {selectedVehicleNationalityInfo.name}</div>
                          {selectedVehicleNationalityInfo.symbol && (
                            <div><strong>الرمز:</strong> {selectedVehicleNationalityInfo.symbol}</div>
                          )}
                          {selectedVehicleNationalityInfo.code && (
                            <div><strong>الكود:</strong> {selectedVehicleNationalityInfo.code}</div>
                          )}
                          {selectedVehicleNationalityInfo.created_at && (
                            <div><strong>تاريخ الإنشاء:</strong> {selectedVehicleNationalityInfo.created_at}</div>
                          )}
                          <div>
                            <strong>الحالة:</strong>{' '}
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500',
                              backgroundColor: selectedVehicleNationalityInfo.active === 1 ? '#dcfce7' : '#fee2e2',
                              color: selectedVehicleNationalityInfo.active === 1 ? '#166534' : '#991b1b'
                            }}>
                              {selectedVehicleNationalityInfo.active === 1 ? 'نشط' : 'غير نشط'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                <div className="form-group">
                  <label htmlFor="visited_country">البلد المزار</label>
                  <select
                    id="visited_country"
                    value={formData.visited_country}
                    onChange={(e) => {
                      const selectedCountry = externalCountries.find(c => c.name === e.target.value);
                      const countryId = selectedCountry ? selectedCountry.id : null;
                      
                      setFormData({ 
                        ...formData, 
                        visited_country: e.target.value,
                        external_country_id: countryId ? countryId.toString() : ''
                      });

                      // جلب معلومات الدولة المختارة
                      if (countryId) {
                        fetchCountryInfo(countryId);
                      } else {
                        setSelectedCountryInfo(null);
                      }
                    }}
                    disabled={loading}
                  >
                    <option value="">
                      {loading ? 'جاري تحميل الدول...' : 'اختر البلد المزار'}
                    </option>
                    {externalCountries.length > 0 ? (
                      externalCountries.map((country) => (
                        <option key={country.id} value={country.name}>
                          {country.name}
                          {country.symbol && ` (${country.symbol})`}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="تونس">تونس</option>
                        <option value="الجزائر">الجزائر</option>
                        <option value="تونس و الجزائر">تونس و الجزائر</option>
                        <option value="مصر">مصر</option>
                      </>
                    )}
                  </select>
                  {externalCountries.length > 0 && (
                    <small style={{ 
                      display: 'block', 
                      marginTop: '4px', 
                      color: '#6b7280', 
                      fontSize: '12px' 
                    }}>
                      تم تحميل {externalCountries.length} دولة من النظام الخارجي
                      {externalCountriesConditions.length > 0 && (
                        <span style={{ marginRight: '8px' }}>
                          • {externalCountriesConditions.length} شرط دولة
                        </span>
                      )}
                    </small>
                  )}
                  {loadingCountryInfo && (
                    <small style={{ 
                      display: 'block', 
                      marginTop: '4px', 
                      color: '#3b82f6', 
                      fontSize: '12px' 
                    }}>
                      جاري جلب معلومات الدولة...
                    </small>
                  )}
                  {selectedCountryInfo && !loadingCountryInfo && (
                    <div style={{
                      marginTop: '8px',
                      padding: '10px',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px', color: '#166534' }}>
                        معلومات الدولة المختارة:
                      </div>
                      <div style={{ color: '#374151' }}>
                        <div><strong>الاسم:</strong> {selectedCountryInfo.name}</div>
                        {selectedCountryInfo.symbol && (
                          <div><strong>الرمز:</strong> {selectedCountryInfo.symbol}</div>
                        )}
                        {selectedCountryInfo.created_at && (
                          <div><strong>تاريخ الإنشاء:</strong> {selectedCountryInfo.created_at}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                </div>

                {/* مدة التأمين */}
                <div className="form-section">
                  <h3 className="form-section-title">مدة التأمين</h3>
                  
                  <div className="form-group">
                    <label htmlFor="start_date">من يوم <span className="required">*</span></label>
                    <input
                      type="date"
                      id="start_date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className={formErrors.start_date ? 'error' : ''}
                    />
                    {formErrors.start_date && <span className="error-message">{formErrors.start_date}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="number_of_days">عدد الأيام <span className="required">*</span></label>
                    <input
                      type="number"
                      id="number_of_days"
                      min="1"
                      value={formData.number_of_days}
                      onChange={(e) => setFormData({ ...formData, number_of_days: e.target.value })}
                      className={formErrors.number_of_days ? 'error' : ''}
                    />
                    {formErrors.number_of_days && <span className="error-message">{formErrors.number_of_days}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="end_date">إلي يوم <span className="required">*</span></label>
                    <input
                      type="date"
                      id="end_date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className={formErrors.end_date ? 'error' : ''}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                    {formErrors.end_date && <span className="error-message">{formErrors.end_date}</span>}
                  </div>
                </div>
              </div>

              {/* احتساب القسط والقيمة المالية بجانب بعض */}
              <div className="form-sections-container">
                {/* احتساب القسط */}
                <div className="form-section">
                  <h3 className="form-section-title">احتساب القسط</h3>
                  
                  <div className="form-group">
                    <label htmlFor="item_type">البند <span className="required">*</span></label>
                    <select
                      id="item_type"
                      value={formData.item_type}
                      onChange={(e) => setFormData({ ...formData, item_type: e.target.value as any })}
                      className={formErrors.item_type ? 'error' : ''}
                    >
                      <option value="">اختر البند</option>
                      {ITEM_TYPES.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                    {formErrors.item_type && <span className="error-message">{formErrors.item_type}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="number_of_countries">عدد الدول</label>
                    <input
                      type="number"
                      id="number_of_countries"
                      value={formData.number_of_countries}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="daily_premium">القسط اليومي</label>
                    <input
                      type="number"
                      id="daily_premium"
                      value={formData.daily_premium}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>
                </div>

                {/* القيمة المالية */}
                <div className="form-section">
                  <h3 className="form-section-title">القيمة المالية</h3>
                  
                  <div className="form-group">
                    <label htmlFor="premium">القسط</label>
                    <input
                      type="number"
                      id="premium"
                      value={formData.premium > 0 ? formData.premium.toFixed(0) : ''}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="tax">الضريبة</label>
                    <input
                      type="number"
                      id="tax"
                      value={formData.tax.toFixed(3)}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="supervision_fees">الإشراف</label>
                    <input
                      type="number"
                      id="supervision_fees"
                      value={formData.supervision_fees.toFixed(3)}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="issue_fees">الإصدار</label>
                    <input
                      type="number"
                      id="issue_fees"
                      value={formData.issue_fees.toFixed(3)}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="stamp">دمغة المحررات</label>
                    <input
                      type="number"
                      id="stamp"
                      value={formData.stamp.toFixed(3)}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="total">الإجمالي</label>
                    <input
                      type="text"
                      id="total"
                      value={`${formData.total.toFixed(3)} دينار`}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280', fontWeight: 'bold' }}
                    />
                  </div>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={submitting || syncingExternal}
                  className="btn-submit"
                >
                  {syncingExternal 
                    ? 'جاري المزامنة مع النظام الخارجي...' 
                    : submitting 
                    ? 'جاري الحفظ...' 
                    : 'حفظ'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/international-insurance-documents')}
                  disabled={submitting}
                  className="btn-cancel"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

