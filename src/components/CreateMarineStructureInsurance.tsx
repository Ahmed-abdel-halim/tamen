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

type Engine = {
  id: string;
  engine_type: 'main' | 'auxiliary';
  engine_model: string;
  fuel_type: string;
  engine_number: string;
  manufacturing_country: string;
  horsepower: string;
  installation_date: string;
  cylinders_count: string;
  installation_type: string;
};

// قائمة الألوان
const COLORS = [
  { ar: 'أحمر', en: 'Red' },
  { ar: 'أزرق', en: 'Blue' },
  { ar: 'أبيض', en: 'White' },
  { ar: 'أسود', en: 'Black' },
  { ar: 'أخضر', en: 'Green' },
  { ar: 'أصفر', en: 'Yellow' },
  { ar: 'رمادي', en: 'Gray' },
  { ar: 'فضي', en: 'Silver' },
  { ar: 'برتقالي', en: 'Orange' },
  { ar: 'بني', en: 'Brown' },
];

// قائمة السنوات من 1960 إلى 2026
const YEARS = Array.from({ length: 67 }, (_, i) => 1960 + i).reverse();

// قائمة بلدان الصنع (جميع دول العالم عدا إسرائيل) - نفس القائمة من CreateInsuranceDocument
const COUNTRIES = [
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

const FUEL_TYPES = [
  { ar: 'بنزين', en: 'Gasoline' },
  { ar: 'ديزل', en: 'Diesel' },
  { ar: 'كهرباء', en: 'Electric' },
  { ar: 'غاز طبيعي', en: 'Natural Gas' },
  { ar: 'هيدروجين', en: 'Hydrogen' },
];

const MANUFACTURING_MATERIALS = [
  'البولي ايثيلين',
  'GRB',
  'الاسمنت المسلح',
  'فولاذ',
  'خشب',
  'خشب GRB',
  'الالمونيوم',
  'الكربون',
  'عوامات الالمونيوم',
  'مركب زجاج ايبوكسيد',
  'مركب كربون ايبوكسيد',
  'مركب زجاج ايبوكسيد رغوة',
  'المطاط',
];

const PORTS = [
  'ميناء مصراته',
  'ميناء طرابلس',
  'ميناء الخمس',
  'ميناء بنغازي',
  'مرفأ النادي البحري',
];

export default function CreateMarineStructureInsurance() {
  const navigate = useNavigate();
  const [plates, setPlates] = useState<Plate[]>([]);
  const [engines, setEngines] = useState<Engine[]>([
    {
      id: 'engine-main',
      engine_type: 'main',
      engine_model: '',
      fuel_type: '',
      engine_number: '',
      manufacturing_country: '',
      horsepower: '',
      installation_date: '',
      cylinders_count: '',
      installation_type: '',
    },
    {
      id: 'engine-aux',
      engine_type: 'auxiliary',
      engine_model: '',
      fuel_type: '',
      engine_number: '',
      manufacturing_country: '',
      horsepower: '',
      installation_date: '',
      cylinders_count: '',
      installation_type: '',
    },
  ]);
  const [engineModels, setEngineModels] = useState<string[]>([]);
  // تحميل الموانئ المخصصة من localStorage أو استخدام array فارغ
  const [customPorts, setCustomPorts] = useState<string[]>(() => {
    const saved = localStorage.getItem('marine_custom_ports');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeEngineTab, setActiveEngineTab] = useState<'main' | 'auxiliary'>('main');
  const [showAddEngineModel, setShowAddEngineModel] = useState(false);
  const [showAddPort, setShowAddPort] = useState(false);
  const [newEngineModel, setNewEngineModel] = useState('');
  const [newPort, setNewPort] = useState('');
  
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    duration: 'سنة (365 يوم)' as 'سنة (365 يوم)' | 'سنتين (730 يوم)',
    structure_type: '' as '' | 'القوارب الشخصية والدراجات' | 'الآلات والرافعات البحرية' | 'قوارب الصيد',
    license_type: '',
    license_purpose: '',
    vessel_name: '',
    registration_code: '',
    registration_date: '',
    port: '',
    registration_authority_id: '',
    plate_number: '',
    hull_number: '',
    manufacturing_material: '',
    length: '',
    width: '',
    depth: '',
    manufacturing_year: '',
    manufacturing_country: '',
    color: '',
    fuel_tank_capacity: '',
    passenger_count: '',
    load_capacity: '',
    insured_name: '',
    phone: '',
    license_number: '',
    premium: '',
    tax: '1.000',
    stamp: '0.500',
    issue_fees: '2.000',
    supervision_fees: '0.500',
    total: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Select2 states
  const [plateSearch, setPlateSearch] = useState("");
  const [showPlateDropdown, setShowPlateDropdown] = useState(false);
  const plateDropdownRef = useRef<HTMLDivElement>(null);

  const [materialSearch, setMaterialSearch] = useState("");
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const materialDropdownRef = useRef<HTMLDivElement>(null);

  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [colorSearch, setColorSearch] = useState("");
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  
  // State للبحث في مكان التصنيع للمحركات (لكل محرك)
  const [engineCountrySearch, setEngineCountrySearch] = useState<Record<string, string>>({});
  const [showEngineCountryDropdown, setShowEngineCountryDropdown] = useState<Record<string, boolean>>({});
  const engineCountryDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [yearSearch, setYearSearch] = useState("");
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPlates();
    fetchEngineModels();
  }, []);

  const fetchEngineModels = async () => {
    try {
      const res = await fetch('/api/marine-engine-models', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setEngineModels(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching engine models:', error);
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
      if (materialDropdownRef.current && !materialDropdownRef.current.contains(event.target as Node)) {
        setShowMaterialDropdown(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
      if (colorDropdownRef.current && !colorDropdownRef.current.contains(event.target as Node)) {
        setShowColorDropdown(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
        setShowYearDropdown(false);
      }
      // إغلاق القوائم المنسدلة للمحركات
      Object.keys(engineCountryDropdownRefs.current).forEach((engineId) => {
        const ref = engineCountryDropdownRefs.current[engineId];
        if (ref && !ref.contains(event.target as Node)) {
          setShowEngineCountryDropdown(prev => ({ ...prev, [engineId]: false }));
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // حساب نهاية التأمين عند تغيير المدة
  useEffect(() => {
    if (formData.start_date && formData.duration) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(startDate);
      
      if (formData.duration === 'سنتين (730 يوم)') {
        endDate.setDate(endDate.getDate() + 730);
      } else {
        endDate.setDate(endDate.getDate() + 365);
      }
      
      setFormData(prev => ({
        ...prev,
        end_date: endDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.start_date, formData.duration]);

  // تحديد نوع الترخيص بناءً على نوع الهيكل
  useEffect(() => {
    if (formData.structure_type) {
      let licenseType = '';
      switch (formData.structure_type) {
        case 'القوارب الشخصية والدراجات':
          licenseType = 'خاص';
          break;
        case 'الآلات والرافعات البحرية':
          licenseType = 'صناعي';
          break;
        case 'قوارب الصيد':
          licenseType = 'تجاري';
          break;
      }
      setFormData(prev => ({
        ...prev,
        license_type: licenseType
      }));
    } else {
      // إذا لم يكن هناك نوع هيكل محدد، امسح القيم
      setFormData(prev => ({
        ...prev,
        license_type: ''
      }));
    }
  }, [formData.structure_type]);

  // حساب القسط المقرر
  useEffect(() => {
    let basePremium = 0;
    if (formData.duration === 'سنة (365 يوم)') {
      if (formData.structure_type === 'القوارب الشخصية والدراجات') {
        basePremium = 100.010;
      } else if (formData.structure_type) {
        basePremium = 150.015;
      }
    } else if (formData.duration === 'سنتين (730 يوم)') {
      if (formData.structure_type === 'القوارب الشخصية والدراجات') {
        basePremium = 200.020;
      } else if (formData.structure_type) {
        basePremium = 300.030;
      }
    }

    // إضافة 10 لكل راكب
    const passengerCount = parseFloat(formData.passenger_count) || 0;
    const premium = basePremium + (passengerCount * 10);

    // حساب الإجمالي
    const tax = 1.000;
    const stamp = 0.500;
    const issueFees = 2.000;
    const supervisionFees = 0.500;
    const total = premium + tax + stamp + issueFees + supervisionFees;

    setFormData(prev => ({
      ...prev,
      premium: premium > 0 ? premium.toFixed(3) : '',
      total: total > 0 ? total.toFixed(3) : '',
    }));
  }, [formData.duration, formData.structure_type, formData.passenger_count]);

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

  const filteredPlates = plates.filter(p =>
    p.plate_number.toLowerCase().includes(plateSearch.toLowerCase()) ||
    p.city.name_ar.toLowerCase().includes(plateSearch.toLowerCase()) ||
    p.city.name_en.toLowerCase().includes(plateSearch.toLowerCase())
  );

  const filteredMaterials = MANUFACTURING_MATERIALS.filter(m =>
    m.toLowerCase().includes(materialSearch.toLowerCase())
  );

  const filteredColors = COLORS.filter(c =>
    c.ar.toLowerCase().includes(colorSearch.toLowerCase()) ||
    c.en.toLowerCase().includes(colorSearch.toLowerCase())
  );

  const filteredYears = YEARS.filter(y =>
    y.toString().includes(yearSearch)
  );

  const filteredCountries = COUNTRIES.filter(c =>
    c.ar.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.en.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const selectedPlate = plates.find(p => p.id === parseInt(formData.registration_authority_id));

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.start_date) {
      errors.start_date = 'بداية التأمين مطلوبة';
    }
    if (!formData.duration) {
      errors.duration = 'مدة التأمين مطلوبة';
    }
    if (!formData.structure_type) {
      errors.structure_type = 'نوع الهيكل البحري مطلوب';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const enginesData = engines.map(eng => ({
        engine_type: eng.engine_type,
        engine_model: eng.engine_model,
        fuel_type: eng.fuel_type,
        engine_number: eng.engine_number,
        manufacturing_country: eng.manufacturing_country,
        horsepower: eng.horsepower ? parseFloat(eng.horsepower) : null,
        installation_date: eng.installation_date || null,
        cylinders_count: eng.cylinders_count ? parseInt(eng.cylinders_count) : null,
        installation_type: eng.installation_type || null,
      }));

      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (userId) {
        headers['X-User-Id'] = userId.toString();
      }

      const res = await fetch('/api/marine-structure-insurance-documents', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          registration_authority_id: formData.registration_authority_id ? parseInt(formData.registration_authority_id) : null,
          registration_date: formData.registration_date || null,
          length: formData.length ? parseFloat(formData.length) : null,
          width: formData.width ? parseFloat(formData.width) : null,
          depth: formData.depth ? parseFloat(formData.depth) : null,
          manufacturing_year: formData.manufacturing_year ? parseInt(formData.manufacturing_year) : null,
          fuel_tank_capacity: formData.fuel_tank_capacity ? parseFloat(formData.fuel_tank_capacity) : null,
          passenger_count: formData.passenger_count ? parseInt(formData.passenger_count) : null,
          load_capacity: formData.load_capacity ? parseFloat(formData.load_capacity) : null,
          premium: parseFloat(formData.premium) || 0,
          engines: enginesData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFormErrors(data.errors);
        }
        throw new Error(data.message || 'حدث خطأ أثناء إنشاء الوثيقة');
      }

      setToast({ message: 'تم إنشاء الوثيقة بنجاح', type: 'success' });
      setTimeout(() => {
        navigate('/marine-structure-insurance-documents');
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

  const updateEngine = (id: string, field: keyof Engine, value: string) => {
    setEngines(engines.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addEngineModel = async () => {
    if (newEngineModel.trim()) {
      const trimmedModel = newEngineModel.trim();
      // التأكد من عدم إضافة نوع مكرر محلياً
      if (!engineModels.includes(trimmedModel)) {
        try {
          const res = await fetch('/api/marine-engine-models', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ name: trimmedModel }),
          });

          if (res.ok) {
            // إعادة جلب جميع أنواع المحركات من API
            await fetchEngineModels();
            setToast({ message: 'تم إضافة نوع المحرك بنجاح', type: 'success' });
          } else {
            const errorData = await res.json().catch(() => ({ message: 'حدث خطأ أثناء الإضافة' }));
            setToast({ message: errorData.message || 'حدث خطأ أثناء إضافة نوع المحرك', type: 'error' });
          }
        } catch (error: any) {
          setToast({ message: 'حدث خطأ أثناء إضافة نوع المحرك', type: 'error' });
        }
      }
      setNewEngineModel('');
      setShowAddEngineModel(false);
    }
  };

  const addCustomPort = () => {
    if (newPort.trim()) {
      const trimmedPort = newPort.trim();
      // التأكد من عدم إضافة ميناء مكرر
      if (!customPorts.includes(trimmedPort)) {
        const updatedPorts = [...customPorts, trimmedPort];
        setCustomPorts(updatedPorts);
        // حفظ في localStorage
        localStorage.setItem('marine_custom_ports', JSON.stringify(updatedPorts));
      }
      setNewPort('');
      setShowAddPort(false);
    }
  };

  const allPorts = [...PORTS, ...customPorts];

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>وثائق تأمين الهياكل البحرية / إضافة وثيقة</span>
      </div>

      <div className="users-card">
        <div className="form-page-container">
          <div className="form-page-header">
            <h2 className="form-page-title">إضافة وثيقة تأمين هياكل بحرية جديدة</h2>
            <button 
              className="btn-cancel" 
              onClick={() => navigate('/marine-structure-insurance-documents')}
            >
              <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i>
              العودة للقائمة
            </button>
          </div>

          <form onSubmit={handleSubmit} className="user-form" style={{ maxWidth: '100%' }}>
            {/* الهيدرات الثلاثة بجانب بعض */}
            <div className="form-sections-container">
              {/* بيانات التأمين */}
              <div className="form-section">
                <h3 className="form-section-title">بيانات التأمين</h3>
              
              <div className="form-group">
                <label>رقم التأمين</label>
                <input
                  type="text"
                  value="MLMAR00001"
                  disabled
                  style={{ background: '#f3f4f6', color: '#6b7280' }}
                />
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

              <div className="form-group">
                <label htmlFor="end_date">نهاية التأمين</label>
                <input
                  type="date"
                  id="end_date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  readOnly
                  style={{ background: '#f3f4f6', color: '#6b7280' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="duration">مدة التأمين <span className="required">*</span></label>
                <select
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value as any })}
                  className={formErrors.duration ? 'error' : ''}
                >
                  <option value="سنة (365 يوم)">سنة (365 يوم)</option>
                  <option value="سنتين (730 يوم)">سنتين (730 يوم)</option>
                </select>
                {formErrors.duration && <span className="error-message">{formErrors.duration}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="structure_type">نوع الهيكل البحري <span className="required">*</span></label>
                <select
                  id="structure_type"
                  value={formData.structure_type}
                  onChange={(e) => setFormData({ ...formData, structure_type: e.target.value as any })}
                  className={formErrors.structure_type ? 'error' : ''}
                >
                  <option value="">اختر نوع الهيكل...</option>
                  <option value="القوارب الشخصية والدراجات">القوارب الشخصية والدراجات</option>
                  <option value="الآلات والرافعات البحرية">الآلات والرافعات البحرية</option>
                  <option value="قوارب الصيد">قوارب الصيد</option>
                </select>
                {formErrors.structure_type && <span className="error-message">{formErrors.structure_type}</span>}
              </div>

              <div className="form-group">
                <label>نوع الترخيص</label>
                <input
                  type="text"
                  value={formData.license_type}
                  disabled
                  style={{ background: '#f3f4f6', color: '#6b7280' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="license_purpose">الغرض من الترخيص</label>
                <select
                  id="license_purpose"
                  value={formData.license_purpose}
                  onChange={(e) => setFormData({ ...formData, license_purpose: e.target.value })}
                >
                  <option value="">اختر الغرض...</option>
                  <option value="قارب تجاري">قارب تجاري</option>
                  <option value="قارب حرفي">قارب حرفي</option>
                  <option value="قارب الترولة">قارب الترولة</option>
                  <option value="قارب الشباك السينية">قارب الشباك السينية</option>
                  <option value="قارب الخيوط السنارية">قارب الخيوط السنارية</option>
                  <option value="قارب الصيد بالفخ">قارب الصيد بالفخ</option>
                </select>
              </div>
              </div>

              {/* بيانات المحرك */}
              <div className="form-section">
                <h3 className="form-section-title">بيانات المحرك</h3>
              
              <div style={{ 
                display: 'flex', 
                gap: '0', 
                marginBottom: '24px', 
                borderBottom: '2px solid var(--border)',
                backgroundColor: '#f9fafb',
                borderRadius: '8px 8px 0 0',
                padding: '4px',
              }}>
                <button
                  type="button"
                  onClick={() => setActiveEngineTab('main')}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    background: activeEngineTab === 'main' ? '#fff' : 'transparent',
                    color: activeEngineTab === 'main' ? '#111827' : '#6b7280',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    fontWeight: activeEngineTab === 'main' ? '600' : '400',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    boxShadow: activeEngineTab === 'main' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  بيانات المحرك الرئيسي
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEngineTab('auxiliary')}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    background: activeEngineTab === 'auxiliary' ? '#fff' : 'transparent',
                    color: activeEngineTab === 'auxiliary' ? '#111827' : '#6b7280',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    fontWeight: activeEngineTab === 'auxiliary' ? '600' : '400',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    boxShadow: activeEngineTab === 'auxiliary' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                    fontFamily: 'inherit',
                  }}
                >
                  بيانات المحرك المساعد إن وجد
                </button>
              </div>

              {engines.filter(e => e.engine_type === activeEngineTab).map((engine) => (
                <div key={engine.id} style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <h4>{engine.engine_type === 'main' ? 'المحرك الرئيسي' : 'المحرك المساعد'}</h4>
                  </div>

                  <div className="form-group">
                    <label>نوع المحرك</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        key={`engine-model-${engine.id}-${engineModels.join(',')}`}
                        value={engine.engine_model}
                        onChange={(e) => updateEngine(engine.id, 'engine_model', e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="">اختر نوع المحرك...</option>
                        {engineModels.map((model, idx) => (
                          <option key={`${model}-${idx}`} value={model}>{model}</option>
                        ))}
                      </select>
                      {!showAddEngineModel && (
                        <button
                          type="button"
                          onClick={() => setShowAddEngineModel(true)}
                          style={{
                            padding: '10px 12px',
                            background: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            transition: 'background 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '42px',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                        >
                          <i className="fa-solid fa-plus"></i>
                        </button>
                      )}
                    </div>
                    {showAddEngineModel && (
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <input
                          type="text"
                          value={newEngineModel}
                          onChange={(e) => setNewEngineModel(e.target.value)}
                          placeholder="أدخل نوع المحرك الجديد"
                          style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }}
                        />
                        <button 
                          type="button" 
                          onClick={addEngineModel}
                          style={{
                            padding: '10px 20px',
                            background: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: 'inherit',
                            transition: 'background 0.2s ease',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                        >
                          إضافة
                        </button>
                        <button 
                          type="button" 
                          onClick={() => {
                            setShowAddEngineModel(false);
                            setNewEngineModel('');
                          }}
                          style={{
                            padding: '10px 20px',
                            background: '#f3f4f6',
                            color: '#374151',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            fontFamily: 'inherit',
                            transition: 'background 0.2s ease',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label>نوع الوقود</label>
                    <select
                      value={engine.fuel_type}
                      onChange={(e) => updateEngine(engine.id, 'fuel_type', e.target.value)}
                    >
                      <option value="">اختر نوع الوقود...</option>
                      {FUEL_TYPES.map((ft) => (
                        <option key={ft.ar} value={`${ft.ar} ${ft.en}`}>{ft.ar} {ft.en}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>رقم المحرك</label>
                      <input
                        type="text"
                        value={engine.engine_number}
                        onChange={(e) => updateEngine(engine.id, 'engine_number', e.target.value)}
                      />
                    </div>

                    <div className="form-group" ref={(el) => { engineCountryDropdownRefs.current[engine.id] = el; }} style={{ position: 'relative' }}>
                      <label>مكان الصنع</label>
                      <div
                        onClick={() => setShowEngineCountryDropdown(prev => ({ ...prev, [engine.id]: !prev[engine.id] }))}
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
                        <span style={{ color: engine.manufacturing_country ? '#111827' : '#9ca3af' }}>
                          {engine.manufacturing_country || 'اختر مكان الصنع...'}
                        </span>
                        <i className={`fa-solid fa-chevron-${showEngineCountryDropdown[engine.id] ? 'up' : 'down'}`} style={{ color: '#9ca3af' }}></i>
                      </div>
                      {showEngineCountryDropdown[engine.id] && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, marginTop: '4px', maxHeight: '300px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                          <div style={{ padding: '8px' }}>
                            <input
                              type="text"
                              placeholder="ابحث..."
                              value={engineCountrySearch[engine.id] || ''}
                              onChange={(e) => setEngineCountrySearch(prev => ({ ...prev, [engine.id]: e.target.value }))}
                              onClick={(e) => e.stopPropagation()}
                              style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: '8px' }}
                            />
                          </div>
                          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            {(() => {
                              const searchTerm = (engineCountrySearch[engine.id] || '').toLowerCase();
                              const filtered = COUNTRIES.filter(c =>
                                c.ar.toLowerCase().includes(searchTerm) || c.en.toLowerCase().includes(searchTerm)
                              );
                              return filtered.length === 0 ? (
                                <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>لا توجد نتائج</div>
                              ) : (
                                filtered.map((country) => (
                                  <div
                                    key={country.ar}
                                    onClick={() => {
                                      updateEngine(engine.id, 'manufacturing_country', country.ar);
                                      setShowEngineCountryDropdown(prev => ({ ...prev, [engine.id]: false }));
                                      setEngineCountrySearch(prev => ({ ...prev, [engine.id]: '' }));
                                    }}
                                    style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', backgroundColor: engine.manufacturing_country === country.ar ? '#f3f4f6' : 'transparent' }}
                                  >
                                    {country.ar} {country.en}
                                  </div>
                                ))
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>القوة بالحصان</label>
                      <input
                        type="number"
                        step="0.01"
                        value={engine.horsepower}
                        onChange={(e) => updateEngine(engine.id, 'horsepower', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>تاريخ التركيب</label>
                      <input
                        type="date"
                        value={engine.installation_date}
                        onChange={(e) => updateEngine(engine.id, 'installation_date', e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>عدد الإسطوانات</label>
                      <input
                        type="number"
                        value={engine.cylinders_count}
                        onChange={(e) => updateEngine(engine.id, 'cylinders_count', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label>تركيب المحرك</label>
                      <select
                        value={engine.installation_type}
                        onChange={(e) => updateEngine(engine.id, 'installation_type', e.target.value)}
                      >
                        <option value="">اختر نوع التركيب...</option>
                        <option value="داخلي">داخلي</option>
                        <option value="خارجي">خارجي</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              </div>

              {/* بيانات المركب أو الهيكل البحري */}
              <div className="form-section">
                <h3 className="form-section-title">بيانات المركب أو الهيكل البحري</h3>
              
              <div className="form-group">
                <label htmlFor="vessel_name">اسم المركب / الهيكل</label>
                <input
                  type="text"
                  id="vessel_name"
                  value={formData.vessel_name}
                  onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="registration_code">رمز ورقم التسجيل</label>
                  <input
                    type="text"
                    id="registration_code"
                    value={formData.registration_code}
                    onChange={(e) => setFormData({ ...formData, registration_code: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="registration_date">تاريخ التسجيل</label>
                  <input
                    type="date"
                    id="registration_date"
                    value={formData.registration_date}
                    onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="port">الميناء أو المرفأ</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    id="port"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                    style={{ flex: 1 }}
                  >
                    <option value="">اختر الميناء...</option>
                    {allPorts.map((port) => (
                      <option key={port} value={port}>{port}</option>
                    ))}
                  </select>
                  {!showAddPort && (
                    <button
                      type="button"
                      onClick={() => setShowAddPort(true)}
                      style={{
                        padding: '10px 12px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        transition: 'background 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '42px',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                    >
                      <i className="fa-solid fa-plus"></i>
                    </button>
                  )}
                </div>
                {showAddPort && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      value={newPort}
                      onChange={(e) => setNewPort(e.target.value)}
                      placeholder="أدخل الميناء أو المرفأ الجديد"
                      style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }}
                    />
                    <button 
                      type="button" 
                      onClick={addCustomPort}
                      style={{
                        padding: '10px 20px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        fontFamily: 'inherit',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}
                    >
                      إضافة
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowAddPort(false);
                        setNewPort('');
                      }}
                      style={{
                        padding: '10px 20px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        fontFamily: 'inherit',
                        transition: 'background 0.2s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group" ref={plateDropdownRef} style={{ position: 'relative' }}>
                <label htmlFor="registration_authority_id">الجهة المقيد بها</label>
                <div
                  onClick={() => setShowPlateDropdown(!showPlateDropdown)}
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
                  <span style={{ color: formData.registration_authority_id ? '#111827' : '#9ca3af' }}>
                    {selectedPlate ? `${selectedPlate.city.name_ar} - ${selectedPlate.plate_number}` : 'اختر الجهة المقيد بها...'}
                  </span>
                  <i className={`fa-solid fa-chevron-${showPlateDropdown ? 'up' : 'down'}`} style={{ color: '#9ca3af' }}></i>
                </div>
                {showPlateDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, marginTop: '4px', maxHeight: '300px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '8px' }}>
                      <input
                        type="text"
                        placeholder="ابحث عن لوحة..."
                        value={plateSearch}
                        onChange={(e) => setPlateSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: '8px' }}
                      />
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {filteredPlates.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>لا توجد نتائج</div>
                      ) : (
                        filteredPlates.map((plate) => (
                          <div
                            key={plate.id}
                            onClick={() => {
                              setFormData({ ...formData, registration_authority_id: plate.id.toString() });
                              setShowPlateDropdown(false);
                              setPlateSearch('');
                            }}
                            style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', backgroundColor: formData.registration_authority_id === plate.id.toString() ? '#f3f4f6' : 'transparent' }}
                          >
                            <div style={{ fontWeight: 500 }}>{plate.city.name_ar} - {plate.plate_number}</div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{plate.city.name_en}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                  <label>رقم اللوحة</label>
                  <input
                    type="text"
                    value={selectedPlate ? selectedPlate.plate_number : ''}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="hull_number">رقم الهيكل</label>
                <input
                  type="text"
                  id="hull_number"
                  value={formData.hull_number}
                  onChange={(e) => setFormData({ ...formData, hull_number: e.target.value })}
                />
              </div>

              <div className="form-group" ref={materialDropdownRef} style={{ position: 'relative' }}>
                <label htmlFor="manufacturing_material">نوع مواد التصنيع</label>
                <div
                  onClick={() => setShowMaterialDropdown(!showMaterialDropdown)}
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
                  <span style={{ color: formData.manufacturing_material ? '#111827' : '#9ca3af' }}>
                    {formData.manufacturing_material || 'اختر نوع مواد التصنيع...'}
                  </span>
                  <i className={`fa-solid fa-chevron-${showMaterialDropdown ? 'up' : 'down'}`} style={{ color: '#9ca3af' }}></i>
                </div>
                {showMaterialDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, marginTop: '4px', maxHeight: '300px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '8px' }}>
                      <input
                        type="text"
                        placeholder="ابحث..."
                        value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: '8px' }}
                      />
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {filteredMaterials.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>لا توجد نتائج</div>
                      ) : (
                        filteredMaterials.map((material) => (
                          <div
                            key={material}
                            onClick={() => {
                              setFormData({ ...formData, manufacturing_material: material });
                              setShowMaterialDropdown(false);
                              setMaterialSearch('');
                            }}
                            style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', backgroundColor: formData.manufacturing_material === material ? '#f3f4f6' : 'transparent' }}
                          >
                            {material}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="length">الطول</label>
                  <input
                    type="number"
                    step="0.01"
                    id="length"
                    value={formData.length}
                    onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="width">العرض</label>
                  <input
                    type="number"
                    step="0.01"
                    id="width"
                    value={formData.width}
                    onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="depth">العمق</label>
                  <input
                    type="number"
                    step="0.01"
                    id="depth"
                    value={formData.depth}
                    onChange={(e) => setFormData({ ...formData, depth: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" ref={yearDropdownRef} style={{ position: 'relative' }}>
                  <label htmlFor="manufacturing_year">تاريخ الصنع</label>
                  <div
                    onClick={() => setShowYearDropdown(!showYearDropdown)}
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
                    <span style={{ color: formData.manufacturing_year ? '#111827' : '#9ca3af' }}>
                      {formData.manufacturing_year || 'اختر السنة...'}
                    </span>
                    <i className={`fa-solid fa-chevron-${showYearDropdown ? 'up' : 'down'}`} style={{ color: '#9ca3af' }}></i>
                  </div>
                  {showYearDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, marginTop: '4px', maxHeight: '300px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                      <div style={{ padding: '8px' }}>
                        <input
                          type="text"
                          placeholder="ابحث..."
                          value={yearSearch}
                          onChange={(e) => setYearSearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: '8px' }}
                        />
                      </div>
                      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {filteredYears.length === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>لا توجد نتائج</div>
                        ) : (
                          filteredYears.map((year) => (
                            <div
                              key={year}
                              onClick={() => {
                                setFormData({ ...formData, manufacturing_year: year.toString() });
                                setShowYearDropdown(false);
                                setYearSearch('');
                              }}
                              style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', backgroundColor: formData.manufacturing_year === year.toString() ? '#f3f4f6' : 'transparent' }}
                            >
                              {year}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group" ref={countryDropdownRef} style={{ position: 'relative' }}>
                  <label htmlFor="manufacturing_country">مكان الصنع</label>
                  <div
                    onClick={() => setShowCountryDropdown(!showCountryDropdown)}
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
                    <span style={{ color: formData.manufacturing_country ? '#111827' : '#9ca3af' }}>
                      {formData.manufacturing_country || 'اختر مكان الصنع...'}
                    </span>
                    <i className={`fa-solid fa-chevron-${showCountryDropdown ? 'up' : 'down'}`} style={{ color: '#9ca3af' }}></i>
                  </div>
                  {showCountryDropdown && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, marginTop: '4px', maxHeight: '300px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                      <div style={{ padding: '8px' }}>
                        <input
                          type="text"
                          placeholder="ابحث..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: '8px' }}
                        />
                      </div>
                      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        {filteredCountries.length === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>لا توجد نتائج</div>
                        ) : (
                          filteredCountries.map((country) => (
                            <div
                              key={country.ar}
                              onClick={() => {
                                setFormData({ ...formData, manufacturing_country: country.ar });
                                setShowCountryDropdown(false);
                                setCountrySearch('');
                              }}
                              style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', backgroundColor: formData.manufacturing_country === country.ar ? '#f3f4f6' : 'transparent' }}
                            >
                              {country.ar} {country.en}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group" ref={colorDropdownRef} style={{ position: 'relative' }}>
                <label htmlFor="color">اللون</label>
                <div
                  onClick={() => setShowColorDropdown(!showColorDropdown)}
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
                  <i className={`fa-solid fa-chevron-${showColorDropdown ? 'up' : 'down'}`} style={{ color: '#9ca3af' }}></i>
                </div>
                {showColorDropdown && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 8, marginTop: '4px', maxHeight: '300px', overflowY: 'auto', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <div style={{ padding: '8px' }}>
                      <input
                        type="text"
                        placeholder="ابحث..."
                        value={colorSearch}
                        onChange={(e) => setColorSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 6, marginBottom: '8px' }}
                      />
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {filteredColors.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>لا توجد نتائج</div>
                      ) : (
                        filteredColors.map((color) => (
                          <div
                            key={color.ar}
                            onClick={() => {
                              setFormData({ ...formData, color: `${color.ar} ${color.en}` });
                              setShowColorDropdown(false);
                              setColorSearch('');
                            }}
                            style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', backgroundColor: formData.color === `${color.ar} ${color.en}` ? '#f3f4f6' : 'transparent' }}
                          >
                            {color.ar} {color.en}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="fuel_tank_capacity">سعة خزان الوقود</label>
                  <input
                    type="number"
                    step="0.01"
                    id="fuel_tank_capacity"
                    value={formData.fuel_tank_capacity}
                    onChange={(e) => setFormData({ ...formData, fuel_tank_capacity: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="passenger_count">عدد الركاب</label>
                  <input
                    type="number"
                    id="passenger_count"
                    value={formData.passenger_count}
                    onChange={(e) => setFormData({ ...formData, passenger_count: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="load_capacity">الحمولة بالطن</label>
                  <input
                    type="number"
                    step="0.01"
                    id="load_capacity"
                    value={formData.load_capacity}
                    onChange={(e) => setFormData({ ...formData, load_capacity: e.target.value })}
                  />
                </div>
              </div>
              </div>
            </div>

            {/* بيانات المؤمن له والقيمة المالية بجانب بعض */}
            <div className="form-sections-container">
              {/* بيانات المؤمن له */}
              <div className="form-section">
                <h3 className="form-section-title">بيانات المؤمن له</h3>
                
                <div className="form-group">
                  <label htmlFor="insured_name">اسم المؤمن له</label>
                  <input
                    type="text"
                    id="insured_name"
                    value={formData.insured_name}
                    onChange={(e) => setFormData({ ...formData, insured_name: e.target.value })}
                  />
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
                    <label htmlFor="license_number">رقم الرخصة</label>
                    <input
                      type="text"
                      id="license_number"
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* القيمة المالية */}
              <div className="form-section">
                <h3 className="form-section-title">القيمة المالية</h3>
                
                <div className="form-group">
                  <label>القسط المقرر</label>
                  <input
                    type="text"
                    value={formData.premium || '0.000'}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>الضريبة</label>
                  <input
                    type="text"
                    value={formData.tax}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>الدمغة</label>
                  <input
                    type="text"
                    value={formData.stamp}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>مصاريف الإصدار</label>
                  <input
                    type="text"
                    value={formData.issue_fees}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>رسوم الإشراف</label>
                  <input
                    type="text"
                    value={formData.supervision_fees}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>الإجمالي</label>
                  <input
                    type="text"
                    value={`${formData.total || '0.000'} دينار`}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280', fontWeight: 'bold' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary" disabled={submitting}>
                {submitting ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate('/marine-structure-insurance-documents')}
              >
                إلغاء
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

