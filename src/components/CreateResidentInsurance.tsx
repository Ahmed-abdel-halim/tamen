import { useState, useRef, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { showToast } from "./Toast";

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

const RELATIONSHIPS = [
  { ar: 'أب', en: 'Father' },
  { ar: 'أم', en: 'Mother' },
  { ar: 'أخ', en: 'Brother' },
  { ar: 'أخت', en: 'Sister' },
  { ar: 'أبن', en: 'Son' },
  { ar: 'أبنة', en: 'Daughter' },
  { ar: 'زوج', en: 'Husband' },
  { ar: 'زوجة', en: 'Wife' },
  { ar: 'عم / خال', en: 'Uncle' },
  { ar: 'عمة / خالة', en: 'Aunt' },
  { ar: 'أبن / أبنة عم أو خال', en: 'Cousin' },
  { ar: 'صديق', en: 'Friend' },
];

type FamilyMember = {
  id: string;
  relationship: string;
  name_ar: string;
  name_en: string;
  passport_number: string;
  birth_date: string;
  age: number;
  gender: string;
};

export default function CreateResidentInsurance() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    duration: '',
    geographic_area: '',
    residence_type: '',
    premium: '0',
    // بيانات المسافر الرئيسي
    main_passenger_name_ar: '',
    main_passenger_name_en: '',
    main_passenger_phone: '',
    main_passenger_passport_number: '',
    main_passenger_address: '',
    main_passenger_birth_date: '',
    main_passenger_age: 0,
    main_passenger_gender: '',
    main_passenger_nationality: '',
    main_passenger_occupation: '',
  });

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Select2 states
  const [nationalitySearch, setNationalitySearch] = useState("");
  const [showNationalityDropdown, setShowNationalityDropdown] = useState(false);
  const nationalityDropdownRef = useRef<HTMLDivElement>(null);

  const [geographicAreaSearch, setGeographicAreaSearch] = useState("");
  const [showGeographicAreaDropdown, setShowGeographicAreaDropdown] = useState(false);
  const geographicAreaDropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (nationalityDropdownRef.current && !nationalityDropdownRef.current.contains(event.target as Node)) {
        setShowNationalityDropdown(false);
      }
      if (geographicAreaDropdownRef.current && !geographicAreaDropdownRef.current.contains(event.target as Node)) {
        setShowGeographicAreaDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // حساب نهاية التأمين عند تغيير المدة
  useEffect(() => {
    if (formData.start_date && formData.duration) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(startDate);
      
      let days = 0;
      if (formData.duration === 'سنة (365 يوم)') {
        days = 365;
      }
      
      if (days > 0) {
        endDate.setDate(endDate.getDate() + days);
        setFormData(prev => ({
          ...prev,
          end_date: endDate.toISOString().split('T')[0]
        }));
      }
    }
  }, [formData.start_date, formData.duration]);

  // حساب تاريخ الميلاد عند تغيير العمر
  useEffect(() => {
    if (formData.main_passenger_age > 0 && !formData.main_passenger_birth_date) {
      const today = new Date();
      const birthDate = new Date(today);
      birthDate.setFullYear(today.getFullYear() - formData.main_passenger_age);
      setFormData(prev => ({
        ...prev,
        main_passenger_birth_date: birthDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.main_passenger_age]);

  // حساب العمر عند تغيير تاريخ الميلاد
  useEffect(() => {
    if (formData.main_passenger_birth_date) {
      const today = new Date();
      const birthDate = new Date(formData.main_passenger_birth_date);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age >= 0 && age <= 150) {
        setFormData(prev => ({
          ...prev,
          main_passenger_age: age
        }));
      }
    }
  }, [formData.main_passenger_birth_date]);

  // حساب القسط بناءً على العمر
  useEffect(() => {
    if (formData.geographic_area && formData.duration && formData.main_passenger_age !== undefined) {
      let premiumValue = 0;
      
      // تحديد الفئة العمرية
      if (formData.main_passenger_age >= 1 && formData.main_passenger_age <= 17) {
        premiumValue = 547.500;
      } else if (formData.main_passenger_age >= 18 && formData.main_passenger_age <= 49) {
        premiumValue = 730;
      } else if (formData.main_passenger_age >= 50 && formData.main_passenger_age <= 69) {
        premiumValue = 912.500;
      } else if (formData.main_passenger_age >= 70) {
        premiumValue = 1095.000;
      }
      
      setFormData(prev => ({
        ...prev,
        premium: premiumValue.toFixed(3)
      }));
    }
  }, [formData.geographic_area, formData.duration, formData.main_passenger_age]);

  const getGeographicAreas = () => {
    return [
      'داخل ليبيا (للأفراد)',
      'داخل ليبيا (للعائلات)',
    ];
  };

  const filteredNationalities = NATIONALITIES.filter(n =>
    n.ar.toLowerCase().includes(nationalitySearch.toLowerCase()) ||
    n.en.toLowerCase().includes(nationalitySearch.toLowerCase())
  );

  const filteredGeographicAreas = getGeographicAreas().filter(area =>
    area.toLowerCase().includes(geographicAreaSearch.toLowerCase())
  );

  const isFamilyPlan = formData.geographic_area === 'داخل ليبيا (للعائلات)';

  // حساب قسط أفراد العائلة
  const calculateFamilyMembersPremium = () => {
    if (!isFamilyPlan) return 0;
    let total = 0;
    familyMembers.forEach(member => {
      if (member.age >= 1 && member.age <= 17) {
        total += 547.500;
      } else if (member.age >= 18 && member.age <= 49) {
        total += 730;
      } else if (member.age >= 50 && member.age <= 69) {
        total += 912.500;
      } else if (member.age >= 70) {
        total += 1095.000;
      }
    });
    return total;
  };

  const calculatePremium = () => {
    const basePremium = parseFloat(formData.premium) || 0;
    const familyMembersPremium = calculateFamilyMembersPremium();
    return basePremium + familyMembersPremium;
  };

  const calculateTotal = () => {
    const premium = calculatePremium();
    const tax = 2.500;
    const stamp = 0.500;
    const issueFees = 10.000;
    const supervisionFees = 1.050;
    return premium + tax + stamp + issueFees + supervisionFees;
  };

  const handleAddFamilyMember = () => {
    const newMember: FamilyMember = {
      id: Date.now().toString(),
      relationship: '',
      name_ar: '',
      name_en: '',
      passport_number: '',
      birth_date: '',
      age: 0,
      gender: '',
    };
    setFamilyMembers([...familyMembers, newMember]);
  };

  const handleRemoveFamilyMember = (id: string) => {
    setFamilyMembers(familyMembers.filter(m => m.id !== id));
  };

  const handleFamilyMemberChange = (id: string, field: keyof FamilyMember, value: any) => {
    setFamilyMembers(familyMembers.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  // حساب تاريخ الميلاد عند تغيير العمر لأفراد العائلة
  useEffect(() => {
    familyMembers.forEach(member => {
      if (member.age > 0 && !member.birth_date) {
        const today = new Date();
        const birthDate = new Date(today);
        birthDate.setFullYear(today.getFullYear() - member.age);
        handleFamilyMemberChange(member.id, 'birth_date', birthDate.toISOString().split('T')[0]);
      }
    });
  }, [familyMembers.map(m => m.age).join(',')]);

  // حساب العمر عند تغيير تاريخ الميلاد لأفراد العائلة
  useEffect(() => {
    familyMembers.forEach(member => {
      if (member.birth_date) {
        const today = new Date();
        const birthDate = new Date(member.birth_date);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        if (age >= 0 && age <= 150 && age !== member.age) {
          handleFamilyMemberChange(member.id, 'age', age);
        }
      }
    });
  }, [familyMembers.map(m => m.birth_date).join(',')]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.start_date) {
      errors.start_date = 'بداية التأمين مطلوبة';
    }
    
    if (!formData.duration) {
      errors.duration = 'مدة التأمين مطلوبة';
    }
    
    if (!formData.geographic_area) {
      errors.geographic_area = 'المنطقة الجغرافية مطلوبة';
    }
    
    if (!formData.main_passenger_name_ar) {
      errors.main_passenger_name_ar = 'اسم المسافر (AR) مطلوب';
    }
    
    if (!formData.main_passenger_name_en) {
      errors.main_passenger_name_en = 'اسم المسافر (EN) مطلوب';
    }
    
    if (!formData.main_passenger_gender) {
      errors.main_passenger_gender = 'الجنس مطلوب';
    }
    
    if (!formData.main_passenger_nationality) {
      errors.main_passenger_nationality = 'الجنسية مطلوبة';
    }
    
    familyMembers.forEach((member, index) => {
      if (!member.relationship) {
        errors[`family_member_${index}_relationship`] = 'صلة القرابة مطلوبة';
      }
      if (!member.name_ar) {
        errors[`family_member_${index}_name_ar`] = 'الاسم (AR) مطلوب';
      }
      if (!member.name_en) {
        errors[`family_member_${index}_name_en`] = 'الاسم (EN) مطلوب';
      }
      if (!member.gender) {
        errors[`family_member_${index}_gender`] = 'الجنس مطلوب';
      }
    });
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const total = calculateTotal();

      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      if (userId) {
        headers['X-User-Id'] = userId.toString();
      }

      const res = await fetch('/api/resident-insurance-documents', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          start_date: formData.start_date,
          end_date: formData.end_date,
          duration: formData.duration,
          geographic_area: formData.geographic_area || null,
          residence_type: formData.residence_type || null,
          premium: parseFloat(formData.premium) || 0,
          family_members_premium: calculateFamilyMembersPremium(),
          tax: 2.500,
          stamp: 0.500,
          issue_fees: 10.000,
          supervision_fees: 1.050,
          total: total,
          passengers: [
            {
              is_main_passenger: true,
              name_ar: formData.main_passenger_name_ar,
              name_en: formData.main_passenger_name_en,
              phone: formData.main_passenger_phone || null,
              passport_number: formData.main_passenger_passport_number || null,
              address: formData.main_passenger_address || null,
              birth_date: formData.main_passenger_birth_date || null,
              age: formData.main_passenger_age || null,
              gender: formData.main_passenger_gender,
              nationality: formData.main_passenger_nationality,
              occupation: formData.main_passenger_occupation || null,
            },
            ...familyMembers.map(member => ({
              is_main_passenger: false,
              relationship: member.relationship,
              name_ar: member.name_ar,
              name_en: member.name_en,
              passport_number: member.passport_number || null,
              birth_date: member.birth_date || null,
              age: member.age || null,
              gender: member.gender,
            }))
          ],
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
        navigate('/resident-insurance-documents');
      }, 1000);
    } catch (error: any) {
      showToast(
        error.message || 'حدث خطأ أثناء إنشاء الوثيقة',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>وثائق تأمين الوافدين للمقيمين / إضافة وثيقة</span>
      </div>

      <div className="users-card">
        <div className="form-page-container">
          <div className="form-page-header">
            <h2 className="form-page-title">
              إضافة وثيقة تأمين وافدين للمقيمين جديدة
            </h2>
            <button 
              className="btn-cancel" 
              onClick={() => navigate('/resident-insurance-documents')}
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
                    readOnly
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="duration">مدة التأمين <span className="required">*</span></label>
                  <select
                    id="duration"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className={formErrors.duration ? 'error' : ''}
                  >
                    <option value="">اختر المدة...</option>
                    <option value="سنة (365 يوم)">سنة (365 يوم)</option>
                  </select>
                  {formErrors.duration && <span className="error-message">{formErrors.duration}</span>}
                </div>

                {/* المنطقة الجغرافية */}
                <div className="form-group" ref={geographicAreaDropdownRef} style={{ position: 'relative' }}>
                  <label htmlFor="geographic_area">المنطقة الجغرافية <span className="required">*</span></label>
                  <div
                    onClick={() => {
                      setShowGeographicAreaDropdown((v) => !v);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: formErrors.geographic_area ? '1px solid #ef4444' : '1px solid var(--border)',
                      borderRadius: 8,
                      background: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      minHeight: 42,
                    }}
                  >
                    <span style={{ color: formData.geographic_area ? '#111827' : '#9ca3af' }}>
                      {formData.geographic_area || 'اختر المنطقة الجغرافية...'}
                    </span>
                    <i
                      className={`fa-solid fa-chevron-${showGeographicAreaDropdown ? 'up' : 'down'}`}
                      style={{ color: '#9ca3af' }}
                    ></i>
                  </div>
                  {showGeographicAreaDropdown && (
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
                          placeholder="ابحث عن منطقة..."
                          value={geographicAreaSearch}
                          onChange={(e) => setGeographicAreaSearch(e.target.value)}
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
                        {filteredGeographicAreas.length === 0 ? (
                          <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>
                            لا توجد نتائج
                          </div>
                        ) : (
                          filteredGeographicAreas.map((area) => (
                            <div
                              key={area}
                              onClick={() => {
                                setFormData({ ...formData, geographic_area: area });
                                setShowGeographicAreaDropdown(false);
                                setGeographicAreaSearch('');
                              }}
                              style={{
                                padding: '10px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f3f4f6',
                                backgroundColor: formData.geographic_area === area ? '#f3f4f6' : 'transparent',
                              }}
                              onMouseEnter={(e) => {
                                if (formData.geographic_area !== area) {
                                  e.currentTarget.style.backgroundColor = '#f9fafb';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (formData.geographic_area !== area) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              {area}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                  {formErrors.geographic_area && <span className="error-message">{formErrors.geographic_area}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="residence_type">نوع الإقامة</label>
                  <select
                    id="residence_type"
                    value={formData.residence_type}
                    onChange={(e) => setFormData({ ...formData, residence_type: e.target.value })}
                  >
                    <option value="">اختر نوع الإقامة...</option>
                    <option value="تأشيرة إقامة Residence Visa">تأشيرة إقامة Residence Visa</option>
                    <option value="تأشيرة عمل Work Visa">تأشيرة عمل Work Visa</option>
                  </select>
                </div>
              </div>

              {/* بيانات المسافر */}
              <div className="form-section">
                <h3 className="form-section-title">بيانات المسافر</h3>
                
                <div className="form-group">
                  <label htmlFor="main_passenger_name_ar">الاسم AR <span className="required">*</span></label>
                  <input
                    type="text"
                    id="main_passenger_name_ar"
                    value={formData.main_passenger_name_ar}
                    onChange={(e) => setFormData({ ...formData, main_passenger_name_ar: e.target.value })}
                    className={formErrors.main_passenger_name_ar ? 'error' : ''}
                  />
                  {formErrors.main_passenger_name_ar && <span className="error-message">{formErrors.main_passenger_name_ar}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="main_passenger_name_en">الاسم EN <span className="required">*</span></label>
                  <input
                    type="text"
                    id="main_passenger_name_en"
                    value={formData.main_passenger_name_en}
                    onChange={(e) => setFormData({ ...formData, main_passenger_name_en: e.target.value })}
                    className={formErrors.main_passenger_name_en ? 'error' : ''}
                  />
                  {formErrors.main_passenger_name_en && <span className="error-message">{formErrors.main_passenger_name_en}</span>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="main_passenger_phone">رقم الهاتف</label>
                    <input
                      type="text"
                      id="main_passenger_phone"
                      value={formData.main_passenger_phone}
                      onChange={(e) => setFormData({ ...formData, main_passenger_phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="main_passenger_passport_number">رقم الجواز</label>
                    <input
                      type="text"
                      id="main_passenger_passport_number"
                      value={formData.main_passenger_passport_number}
                      onChange={(e) => setFormData({ ...formData, main_passenger_passport_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="main_passenger_address">العنوان</label>
                  <textarea
                    id="main_passenger_address"
                    value={formData.main_passenger_address}
                    onChange={(e) => setFormData({ ...formData, main_passenger_address: e.target.value })}
                    rows={3}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="main_passenger_birth_date">تاريخ الميلاد</label>
                    <input
                      type="date"
                      id="main_passenger_birth_date"
                      value={formData.main_passenger_birth_date}
                      onChange={(e) => setFormData({ ...formData, main_passenger_birth_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="main_passenger_age">العمر</label>
                    <input
                      type="number"
                      id="main_passenger_age"
                      value={formData.main_passenger_age || 0}
                      readOnly
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label htmlFor="main_passenger_gender">الجنس <span className="required">*</span></label>
                    <select
                      id="main_passenger_gender"
                      value={formData.main_passenger_gender}
                      onChange={(e) => setFormData({ ...formData, main_passenger_gender: e.target.value })}
                      className={formErrors.main_passenger_gender ? 'error' : ''}
                    >
                      <option value="">اختر الجنس...</option>
                      <option value="ذكر">ذكر / Male</option>
                      <option value="أنثى">أنثى / Female</option>
                    </select>
                    {formErrors.main_passenger_gender && <span className="error-message">{formErrors.main_passenger_gender}</span>}
                  </div>
                  <div className="form-group" ref={nationalityDropdownRef} style={{ position: 'relative' }}>
                    <label htmlFor="main_passenger_nationality">الجنسية <span className="required">*</span></label>
                    <div
                      onClick={() => {
                        setShowNationalityDropdown((v) => !v);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: formErrors.main_passenger_nationality ? '1px solid #ef4444' : '1px solid var(--border)',
                        borderRadius: 8,
                        background: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        minHeight: 42,
                      }}
                    >
                      <span style={{ color: formData.main_passenger_nationality ? '#111827' : '#9ca3af' }}>
                        {formData.main_passenger_nationality || 'اختر الجنسية...'}
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
                            filteredNationalities.map((nationality) => (
                              <div
                                key={nationality.ar}
                                onClick={() => {
                                  setFormData({ ...formData, main_passenger_nationality: `${nationality.ar} / ${nationality.en}` });
                                  setShowNationalityDropdown(false);
                                  setNationalitySearch('');
                                }}
                                style={{
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f3f4f6',
                                  backgroundColor: formData.main_passenger_nationality === `${nationality.ar} / ${nationality.en}` ? '#f3f4f6' : 'transparent',
                                }}
                                onMouseEnter={(e) => {
                                  if (formData.main_passenger_nationality !== `${nationality.ar} / ${nationality.en}`) {
                                    e.currentTarget.style.backgroundColor = '#f9fafb';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (formData.main_passenger_nationality !== `${nationality.ar} / ${nationality.en}`) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }
                                }}
                              >
                                <div style={{ fontWeight: 500 }}>{nationality.ar}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{nationality.en}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    {formErrors.main_passenger_nationality && <span className="error-message">{formErrors.main_passenger_nationality}</span>}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="main_passenger_occupation">المهنة</label>
                  <input
                    type="text"
                    id="main_passenger_occupation"
                    value={formData.main_passenger_occupation}
                    onChange={(e) => setFormData({ ...formData, main_passenger_occupation: e.target.value })}
                  />
                </div>

                {/* إضافة أفراد العائلة - تظهر فقط عند اختيار جميع دول العالم (للعائلات) */}
                {isFamilyPlan && (
                  <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '2px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)' }}>أفراد العائلة</h4>
                      <button
                        type="button"
                        onClick={handleAddFamilyMember}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 16px',
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: 500,
                        }}
                      >
                        <i className="fa-solid fa-plus"></i>
                        إضافة
                      </button>
                    </div>

                    {familyMembers.map((member, index) => (
                      <div key={member.id} style={{ marginBottom: '24px', padding: '16px', border: '1px solid var(--border)', borderRadius: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                          <h5 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>فرد العائلة {index + 1}</h5>
                          <button
                            type="button"
                            onClick={() => handleRemoveFamilyMember(member.id)}
                            style={{
                              padding: '4px 8px',
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: '12px',
                            }}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>

                        <div className="form-group">
                          <label>صلة القرابة <span className="required">*</span></label>
                          <select
                            value={member.relationship}
                            onChange={(e) => handleFamilyMemberChange(member.id, 'relationship', e.target.value)}
                            className={formErrors[`family_member_${index}_relationship`] ? 'error' : ''}
                          >
                            <option value="">اختر صلة القرابة...</option>
                            {RELATIONSHIPS.map(rel => (
                              <option key={rel.ar} value={`${rel.ar} / ${rel.en}`}>
                                {rel.ar} / {rel.en}
                              </option>
                            ))}
                          </select>
                          {formErrors[`family_member_${index}_relationship`] && (
                            <span className="error-message">{formErrors[`family_member_${index}_relationship`]}</span>
                          )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className="form-group">
                            <label>الاسم AR <span className="required">*</span></label>
                            <input
                              type="text"
                              value={member.name_ar}
                              onChange={(e) => handleFamilyMemberChange(member.id, 'name_ar', e.target.value)}
                              className={formErrors[`family_member_${index}_name_ar`] ? 'error' : ''}
                            />
                            {formErrors[`family_member_${index}_name_ar`] && (
                              <span className="error-message">{formErrors[`family_member_${index}_name_ar`]}</span>
                            )}
                          </div>
                          <div className="form-group">
                            <label>الاسم EN <span className="required">*</span></label>
                            <input
                              type="text"
                              value={member.name_en}
                              onChange={(e) => handleFamilyMemberChange(member.id, 'name_en', e.target.value)}
                              className={formErrors[`family_member_${index}_name_en`] ? 'error' : ''}
                            />
                            {formErrors[`family_member_${index}_name_en`] && (
                              <span className="error-message">{formErrors[`family_member_${index}_name_en`]}</span>
                            )}
                          </div>
                        </div>

                        <div className="form-group">
                          <label>رقم الجواز</label>
                          <input
                            type="text"
                            value={member.passport_number}
                            onChange={(e) => handleFamilyMemberChange(member.id, 'passport_number', e.target.value)}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className="form-group">
                            <label>تاريخ الميلاد</label>
                            <input
                              type="date"
                              value={member.birth_date}
                              onChange={(e) => handleFamilyMemberChange(member.id, 'birth_date', e.target.value)}
                            />
                          </div>
                          <div className="form-group">
                            <label>العمر</label>
                            <input
                              type="number"
                              value={member.age || 0}
                              readOnly
                              disabled
                              style={{ background: '#f3f4f6', color: '#6b7280' }}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label>الجنس <span className="required">*</span></label>
                          <select
                            value={member.gender}
                            onChange={(e) => handleFamilyMemberChange(member.id, 'gender', e.target.value)}
                            className={formErrors[`family_member_${index}_gender`] ? 'error' : ''}
                          >
                            <option value="">اختر الجنس...</option>
                            <option value="ذكر">ذكر / Male</option>
                            <option value="أنثى">أنثى / Female</option>
                          </select>
                          {formErrors[`family_member_${index}_gender`] && (
                            <span className="error-message">{formErrors[`family_member_${index}_gender`]}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* القيمة المالية */}
              <div className="form-section">
                <h3 className="form-section-title">القيمة المالية</h3>
                
                <div className="form-group">
                  <label>القسط</label>
                  <input
                    type="text"
                    value={formData.premium ? parseFloat(formData.premium).toFixed(3) : '0.000'}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                {isFamilyPlan && (
                  <div className="form-group">
                    <label>قسط أفراد العائلة</label>
                    <input
                      type="text"
                      value={calculateFamilyMembersPremium().toFixed(3)}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>الضريبة</label>
                  <input
                    type="text"
                    value="2.500"
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>الدمغة</label>
                  <input
                    type="text"
                    value="0.500"
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>مصاريف الإصدار</label>
                  <input
                    type="text"
                    value="10.000"
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>

                <div className="form-group">
                  <label>رسوم الإشراف</label>
                  <input
                    type="text"
                    value="1.050"
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
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
                onClick={() => navigate('/resident-insurance-documents')}
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

