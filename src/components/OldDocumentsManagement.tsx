import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

type Agent = {
  id: number;
  agency_name: string;
  code: string;
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

const YEARS = Array.from({ length: 70 }, (_, i) => new Date().getFullYear() - i);

const LICENSE_PURPOSES = [
  'خاصة/Private',
  'عامة/Public',
  'نقل/Transport',
  'زراعي/Agricultural',
  'صناعي/Industrial',
];



const DOCUMENT_TYPES = [
  { value: 'compulsory', label: 'تأمين إجباري سيارات' },
  { value: 'customs', label: 'تأمين سيارة جمرك' },
  { value: 'third_party', label: 'تأمين طرف ثالث سيارات' },
  { value: 'foreign_car', label: 'تأمين سيارات أجنبية' },
  { value: 'international', label: 'تأمين السيارات الدولي' },
  { value: 'travel', label: 'تأمين المسافرين' },
  { value: 'resident', label: 'تأمين الوافدين للمقيمين' },
  { value: 'marine', label: 'تأمين الهياكل البحرية' },
  { value: 'medical', label: 'تأمين المسؤولية المهنية (الطبية)' },
  { value: 'personal_accident', label: 'تأمين الحوادث الشخصية' },
  { value: 'school_student', label: 'تأمين حماية طلاب المدارس' },
  { value: 'cash_in_transit', label: 'تأمين نقل النقدية' },
  { value: 'cargo', label: 'تأمين شحن البضائع' },
];

const ENGINE_POWERS_PRIVATE = [
  'أقل من (16) حصان',
  'من (17) الي (30) حصان',
  'أكثر من (30) حصان',
  'سيارة تجارية',
];

const ENGINE_POWERS_PUBLIC = [
  'سيارة تعليم قيادة',
  'سيارة اسعاف',
  'ركوبة عامة داخل المدينة',
  'ركوبة عامة خارج المدينة',
  'حافلة لنقل الركاب',
  'مركبة مقطورة بحافلة ركاب',
];

const ENGINE_POWERS_TRANSPORT = [
  'سيارة نقل',
  'رأس جر',
  'شاحنة صندوق',
  'مقطورة',
  'مقطورة سيارة خاصة',
  'سيارة نقل موتى',
];

const ENGINE_POWERS_AGRICULTURAL = [
  'جرار زراعي',
  'ألات زراعية',
];

const ENGINE_POWERS_INDUSTRIAL = [
  'جرار صناعي',
  'ألات حفر',
  'ألات رفع',
  'ألات تعبيد الطرق',
];

const LOW_VALUE_ITEMS = [
  'سيارات خاصة ملاكي',
  'دراجة نارية',
  'سيارة تعليم قيادة',
  'سيارة اسعاف',
  'سيارة نقل الموتى'
];

const HIGH_VALUE_ITEMS = [
  'مقطورة',
  'السيارات التجارية',
  'الجرارات',
  'سيارات نقل بضائع',
  'سيارات الركوبة الحافلات'
];

export default function OldDocumentsManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Search Agent Dropdown State
  const [agentSearch, setAgentSearch] = useState('');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  // Form State
  const [documentType, setDocumentType] = useState('compulsory');
  const [branchAgentId, setBranchAgentId] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (location.state) {
      const stateObj = location.state as { branchAgentId?: number | string; issueDate?: string };
      if (stateObj.branchAgentId) {
        setBranchAgentId(stateObj.branchAgentId.toString());
      }
      if (stateObj.issueDate) {
        setIssueDate(stateObj.issueDate);
        setStartDate(stateObj.issueDate);
      }
    }
  }, [location.state]);
  const [endDate, setEndDate] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');

  // Client Details
  const [insuredName, setInsuredName] = useState('');
  const nidPassport = '111111111111';
  const phone = '0910000000';
  const whatsappNumber = '0910000000';
  const email = 'info@mli.ly';
  const address = 'طرابلس';
  const nationality = 'ليبي';
  const [gender, setGender] = useState('ذكر');
  const [age, setAge] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [nameEn, setNameEn] = useState('');

  // Financial Details (All Manual)
  const [premium, setPremium] = useState('0');
  const [tax, setTax] = useState('0');
  const [stamp, setStamp] = useState('0');
  const [issueFees, setIssueFees] = useState('0');
  const [supervisionFees, setSupervisionFees] = useState('0');
  const [total, setTotal] = useState('0');

  // Type Specific Details
  // 1. Vehicles (compulsory / international / customs / third_party / foreign_car)
  const [chassisNumber, setChassisNumber] = useState('');
  const [plateNumberManual, setPlateNumberManual] = useState('');
  const color = 'أبيض';
  const year = new Date().getFullYear().toString();
  const [enginePower, setEnginePower] = useState('');
  const engineNumber = '';
  const engineCc = '';
  const [authorizedPassengers, setAuthorizedPassengers] = useState('');
  const [loadCapacity, setLoadCapacity] = useState('');
  const vehicleWeight = '';
  const vehicleTypeId = '';
  const fuelType = '';
  const [licensePurpose, setLicensePurpose] = useState('');

  // Vehicle Subtype Specifics
  const [port, setPort] = useState('ميناء طرابلس');
  const [thirdPartyPurpose, setThirdPartyPurpose] = useState('خاصة');
  const [foreignCarCountry, setForeignCarCountry] = useState('تونس');
  const [foreignCarPurpose, setForeignCarPurpose] = useState('سيارات خاصة سياحية');
  const prevEnginePowerRef = useRef<string>('');

  // 2. International specific
  const vehicleNationality = 'ليبية- LBY';
  const visitedCountry = 'تونس';
  const numberOfDays = '30';
  const itemType = 'سيارات خاصة ملاكي';

  // 3. Travel / Resident
  const [geographicArea, setGeographicArea] = useState('');
  const [duration, setDuration] = useState('سنة');
  const [residenceType, setResidenceType] = useState('تأشيرة إقامة Residence Visa');
  const residenceDuration = '12';
  const occupation = 'موظف';

  // 4. Marine
  const [structureName, setStructureName] = useState('');
  const [structureType, setStructureType] = useState('القوارب الشخصية والدراجات');
  const [manufacturingYear, setManufacturingYear] = useState('');
  const [engineModel, setEngineModel] = useState('');

  // 5. Medical
  const [profession, setProfession] = useState('');
  const [workPlace, setWorkPlace] = useState('');

  // 6. Personal Accident
  const [job, setJob] = useState('');

  // 7. School Student
  const [schoolName, setSchoolName] = useState('');
  const [grade, setGrade] = useState('');

  // 8. Cash in Transit
  const [transitFrom, setTransitFrom] = useState('');
  const [transitTo, setTransitTo] = useState('');
  const [limitPerTransit, setLimitPerTransit] = useState('');
  const [annualTurnover, setAnnualTurnover] = useState('');

  // 9. Cargo
  const [cargoDescription, setCargoDescription] = useState('');
  const [transportType, setTransportType] = useState('Sea');
  const [voyageFrom, setVoyageFrom] = useState('');
  const [voyageTo, setVoyageTo] = useState('');
  const [sumInsured, setSumInsured] = useState('');

  useEffect(() => {
    fetchAgents();
  }, []);

  // Click outside listener to close the searchable agent select
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setShowAgentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedAgent = agents.find(a => a.id.toString() === branchAgentId);
  const filteredAgents = agents.filter(agent =>
    agent.agency_name.toLowerCase().includes(agentSearch.toLowerCase()) ||
    agent.code.toLowerCase().includes(agentSearch.toLowerCase())
  );

  // Recalculate total manually if user changes any cost field
  useEffect(() => {
    const p = parseFloat(premium) || 0;
    const t = parseFloat(tax) || 0;
    const s = parseFloat(stamp) || 0;
    const i = parseFloat(issueFees) || 0;
    const sv = parseFloat(supervisionFees) || 0;
    
    // For school student, cash in transit, cargo, they use premium_amount as total directly or premium_amount field
    if (['school_student', 'cash_in_transit', 'cargo'].includes(documentType)) {
      setTotal(premium);
    } else {
      setTotal((p + t + s + i + sv).toFixed(3));
    }
  }, [premium, tax, stamp, issueFees, supervisionFees, documentType]);

  // Auto-fill default rates when documentType changes (editable by the user)
  useEffect(() => {
    switch (documentType) {
      case 'compulsory':
      case 'customs':
      case 'third_party':
      case 'foreign_car':
        setPremium('0');
        setTax('1.000');
        setStamp('0.500');
        setIssueFees('2.000');
        setSupervisionFees('0.500');
        if (documentType === 'customs') {
          setDuration('شهر (30 يوم)');
          setPort('ميناء طرابلس');
        } else if (documentType === 'third_party') {
          setDuration('سنة (365 يوم)');
          setThirdPartyPurpose('خاصة');
        } else if (documentType === 'foreign_car') {
          setDuration('شهر (30 يوم)');
          setForeignCarCountry('تونس');
          setForeignCarPurpose('سيارات خاصة سياحية');
          setAuthorizedPassengers('1');
          setLoadCapacity('0');
        } else {
          setDuration('سنة (365 يوم)');
        }
        break;
      case 'international':
        setPremium('60.000');
        setTax('2.000');
        setStamp('0.500');
        setIssueFees('5.000');
        setSupervisionFees('0.500');
        break;
      case 'travel':
        setPremium('20.000');
        setTax('0.000');
        setStamp('0.500');
        setIssueFees('3.770');
        setSupervisionFees('0.180');
        break;
      case 'resident':
        setPremium('730.000');
        setTax('2.500');
        setStamp('0.500');
        setIssueFees('10.000');
        setSupervisionFees('1.050');
        setDuration('سنة (365 يوم)');
        setGeographicArea('داخل ليبيا (للأفراد)');
        setResidenceType('تأشيرة إقامة Residence Visa');
        break;
      case 'marine':
        setPremium('500.000');
        setTax('5.000');
        setStamp('0.500');
        setIssueFees('10.000');
        setSupervisionFees('0.500');
        break;
      case 'medical':
        setPremium('210.000');
        setTax('2.500');
        setStamp('0.500');
        setIssueFees('10.000');
        setSupervisionFees('1.050');
        break;
      case 'personal_accident':
        setPremium('100.000');
        setTax('2.500');
        setStamp('0.500');
        setIssueFees('10.000');
        setSupervisionFees('1.050');
        break;
      case 'school_student':
        setPremium('10.000');
        setTax('0.000');
        setStamp('0.000');
        setIssueFees('0.000');
        setSupervisionFees('0.000');
        break;
      case 'cash_in_transit':
        setPremium('150.000');
        setTax('0.000');
        setStamp('0.000');
        setIssueFees('0.000');
        setSupervisionFees('0.000');
        break;
      case 'cargo':
        setPremium('200.000');
        setTax('0.000');
        setStamp('0.000');
        setIssueFees('0.000');
        setSupervisionFees('0.000');
        break;
      default:
        setPremium('0');
        setTax('0');
        setStamp('0');
        setIssueFees('0');
        setSupervisionFees('0');
        break;
    }
  }, [documentType]);

  // Helper to normalize geographic area for travel pricing
  const getNormalizedGeographicArea = (area: string): string => {
    const clean = (area || '').toLowerCase();
    if (clean.includes('شنغن') || clean.includes('schengen') || clean.includes('اوروب') || clean.includes('europa') || clean.includes('eu')) {
      return 'schengen';
    }
    if (clean.includes('عائل')) {
      return 'family_world';
    }
    return 'individual_world';
  };

  // Helper to normalize duration to travel pricing categories
  const getNormalizedDuration = (dur: string): string => {
    const clean = (dur || '').toLowerCase();
    if (clean.includes('سنتين') || clean.includes('730') || clean.includes('2 year')) return '730';
    if (clean.includes('سنة') || clean.includes('عام') || clean.includes('365') || clean.includes('1 year')) return '365';
    if (clean.includes('ستة') || clean.includes('6 أشهر') || clean.includes('180') || clean.includes('6 month')) return '180';
    if (clean.includes('ثلاث') || clean.includes('3 أشهر') || clean.includes('90') || clean.includes('3 month')) return '90';
    if (clean.includes('شهرين') || clean.includes('60') || clean.includes('2 month')) return '60';
    if (clean.includes('شهر') || clean.includes('30') || clean.includes('1 month')) return '30';
    if (clean.includes('ثلاثة أسابيع') || clean.includes('21')) return '21';
    if (clean.includes('أسبوعين') || clean.includes('14')) return '14';
    if (clean.includes('عشر') || clean.includes('10')) return '10';
    if (clean.includes('أسبوع') || clean.includes('7')) return '7';
    if (clean.includes('خمس') || clean.includes('5')) return '5';
    return '365'; // default fallback
  };

  // Calculate age from birthDate automatically
  useEffect(() => {
    if (birthDate) {
      const today = new Date();
      const birth = new Date(birthDate);
      let calculatedAge = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
      if (calculatedAge >= 0 && calculatedAge <= 150) {
        setAge(calculatedAge.toString());
      }
    }
  }, [birthDate]);

  // Calculate birthDate from age automatically (only if birthDate is empty or manually cleared)
  useEffect(() => {
    const ageNum = parseInt(age);
    if (ageNum > 0 && !birthDate) {
      const today = new Date();
      const birthYear = today.getFullYear() - ageNum;
      const calculatedBirthDate = `${birthYear}-01-01`;
      setBirthDate(calculatedBirthDate);
    }
  }, [age]);

  // Dynamic premium and fees calculation (just like creating a new document normally)
  useEffect(() => {
    if (!['travel', 'resident'].includes(documentType)) {
      return;
    }

    const ageNum = parseInt(age) || 30; // default to 30 if not set

    if (documentType === 'resident') {
      let basePremium = 730.000;
      if (ageNum >= 1 && ageNum <= 17) {
        basePremium = 547.500;
      } else if (ageNum >= 18 && ageNum <= 49) {
        basePremium = 730.000;
      } else if (ageNum >= 50 && ageNum <= 69) {
        basePremium = 912.500;
      } else if (ageNum >= 70) {
        basePremium = 1095.000;
      }

      setPremium(basePremium.toFixed(3));
      setTax('2.500');
      setStamp('0.500');
      setIssueFees('10.000');
      setSupervisionFees('1.050');
    } 
    else if (documentType === 'travel') {
      const normArea = getNormalizedGeographicArea(geographicArea);
      const normDuration = getNormalizedDuration(duration);
      let basePremium = 0;

      if (normArea === 'schengen' || normArea === 'family_world') {
        const isChild = ageNum >= 0 && ageNum <= 17;
        const rates: Record<string, number> = isChild ? {
          '5': 8.209,
          '7': 9.174,
          '10': 15.155,
          '14': 16.150,
          '21': 19.135,
          '30': 22.120,
          '60': 35.055,
          '90': 52.465,
          '180': 75.350,
          '365': 112.660,
          '730': 204.000
        } : {
          '5': 13.165,
          '7': 20.000,
          '10': 25.105,
          '14': 28.090,
          '21': 31.075,
          '30': 36.050,
          '60': 55.450,
          '90': 83.310,
          '180': 117.635,
          '365': 175.840,
          '730': 312.610
        };
        basePremium = rates[normDuration] || 175.840;
      } else {
        // world individual
        const isChild = ageNum >= 0 && ageNum <= 15;
        const rates: Record<string, number> = isChild ? {
          '5': 5.412,
          '7': 7.195,
          '10': 10.825,
          '14': 15.155,
          '21': 24.110,
          '30': 27.095,
          '60': 41.228,
          '90': 43.015,
          '180': 83.310,
          '365': 125.100,
          '730': 204.195
        } : {
          '5': 9.300,
          '7': 12.170,
          '10': 18.600,
          '14': 26.100,
          '21': 39.035,
          '30': 44.010,
          '60': 65.400,
          '90': 68.385,
          '180': 130.570,
          '365': 193.750,
          '730': 316.625
        };
        basePremium = rates[normDuration] || 193.750;
      }

      setPremium(basePremium.toFixed(3));
      setTax('0.000');
      setStamp('0.500');
      setIssueFees('3.770');
      setSupervisionFees('0.180');
    }
  }, [documentType, geographicArea, duration, age]);

  // Determine available engine power options based on license purpose
  const getAvailableEnginePowers = () => {
    const isPublic = licensePurpose && licensePurpose.includes('عامة');
    const isTransport = licensePurpose && licensePurpose.includes('نقل');
    const isAgricultural = licensePurpose && licensePurpose.includes('زراعي');
    const isIndustrial = licensePurpose && licensePurpose.includes('صناعي');
    const isPrivate = licensePurpose && licensePurpose.includes('خاصة');

    if (isPublic) return ENGINE_POWERS_PUBLIC;
    if (isTransport) return ENGINE_POWERS_TRANSPORT;
    if (isAgricultural) return ENGINE_POWERS_AGRICULTURAL;
    if (isIndustrial) return ENGINE_POWERS_INDUSTRIAL;
    if (isPrivate) return ENGINE_POWERS_PRIVATE;
    return ENGINE_POWERS_PRIVATE; // fallback
  };

  // Reset engine power if license purpose changes and current engine power is not in the new purpose's list
  useEffect(() => {
    if (licensePurpose && enginePower) {
      const isPublic = licensePurpose.includes('عامة');
      const isPrivate = licensePurpose.includes('خاصة');
      const isTransport = licensePurpose.includes('نقل');
      const isAgricultural = licensePurpose.includes('زراعي');
      const isIndustrial = licensePurpose.includes('صناعي');

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

      if (allOtherPowers.includes(enginePower)) {
        setEnginePower('');
      }
    }
  }, [licensePurpose]);

  // Auto-set default passengers and load capacity when enginePower changes
  useEffect(() => {
    if (!['compulsory', 'customs', 'third_party', 'foreign_car'].includes(documentType)) {
      return;
    }
    if (!enginePower) return;

    const enginePowerChanged = prevEnginePowerRef.current !== enginePower;
    prevEnginePowerRef.current = enginePower;

    if (enginePowerChanged) {
      let defaultPassengers = '';
      let defaultLoad = '';

      switch (enginePower) {
        case 'أقل من (16) حصان':
        case 'من (17) الي (30) حصان':
        case 'أكثر من (30) حصان':
          defaultPassengers = '4';
          break;
        case 'سيارة تجارية':
        case 'سيارة تعليم قيادة':
        case 'سيارة اسعاف':
        case 'سيارة نقل موتى':
        case 'سيارة نقل':
        case 'رأس جر':
        case 'شاحنة صندوق':
        case 'جرار زراعي':
        case 'ألات زراعية':
        case 'جرار صناعي':
        case 'ألات حفر':
        case 'ألات رفع':
        case 'ألات تعبيد الطرق':
          defaultPassengers = '1';
          break;
        case 'ركوبة عامة داخل المدينة':
        case 'ركوبة عامة خارج المدينة':
          defaultPassengers = '4';
          break;
        case 'حافلة لنقل الركاب':
        case 'مركبة مقطورة بحافلة ركاب':
          defaultPassengers = '14';
          break;
        case 'مقطورة':
        case 'مقطورة سيارة خاصة':
          defaultPassengers = '0';
          break;
      }

      switch (enginePower) {
        case 'سيارة نقل':
        case 'شاحنة صندوق':
        case 'رأس جر':
        case 'مقطورة':
        case 'مقطورة سيارة خاصة':
        case 'سيارة نقل موتى':
        case 'جرار زراعي':
        case 'ألات زراعية':
        case 'جرار صناعي':
        case 'ألات حفر':
        case 'ألات رفع':
        case 'ألات تعبيد الطرق':
          defaultLoad = '0';
          break;
      }

      if (defaultPassengers) setAuthorizedPassengers(defaultPassengers);
      if (defaultLoad) setLoadCapacity(defaultLoad);
    }
  }, [enginePower, documentType]);

  // Auto-calculate vehicle insurance end date based on start date and duration
  useEffect(() => {
    if (!['compulsory', 'customs', 'third_party', 'foreign_car'].includes(documentType)) {
      return;
    }
    const startDateValue = startDate;
    const durationValue = documentType === 'compulsory' ? 'سنة (365 يوم)' : duration;

    if (startDateValue && durationValue) {
      const start = new Date(startDateValue);
      const end = new Date(start);

      if (['customs', 'foreign_car'].includes(documentType)) {
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
            days = 30;
        }
        end.setDate(end.getDate() + days);
      } else {
        // Normal or third party
        if (durationValue === 'سنتين (730 يوم)' || durationValue === 'سنتين') {
          end.setFullYear(end.getFullYear() + 2);
        } else {
          end.setFullYear(end.getFullYear() + 1);
        }
      }

      const y = end.getFullYear();
      const m = String(end.getMonth() + 1).padStart(2, '0');
      const d = String(end.getDate()).padStart(2, '0');
      setEndDate(`${y}-${m}-${d}`);
    }
  }, [startDate, duration, documentType]);

  // Dynamic premium and fees calculation for vehicle insurance types
  useEffect(() => {
    if (!['compulsory', 'customs', 'third_party', 'foreign_car', 'international'].includes(documentType)) {
      return;
    }

    let calculatedPremium = 0;
    let calculatedTax = 1.000;
    let calculatedStamp = 0.500;
    let calculatedIssueFees = 2.000;
    let calculatedSupervisionFees = 0.500;

    const passengers = parseInt(authorizedPassengers) || 0;
    const capacity = parseFloat(loadCapacity) || 0;

    if (documentType === 'international') {
      calculatedIssueFees = 10.000;
      calculatedStamp = 0.250;
      let dailyPremium = 0;

      if (LOW_VALUE_ITEMS.includes(itemType)) {
        dailyPremium = 7;
        calculatedTax = 0.5;
        calculatedSupervisionFees = 0.245;
      } else if (HIGH_VALUE_ITEMS.includes(itemType)) {
        dailyPremium = 8;
        calculatedTax = 1.0;
        calculatedSupervisionFees = 0.280;
      }

      const days = parseInt(numberOfDays) || 0;
      calculatedPremium = dailyPremium * days;
    }
    else if (documentType === 'third_party') {
      switch (thirdPartyPurpose) {
        case 'خاصة':
          calculatedPremium = 365.000;
          break;
        case 'عامة':
          calculatedPremium = 547.500;
          break;
        case 'نقل':
          calculatedPremium = 456.250;
          break;
        default:
          calculatedPremium = 0;
      }

      if (duration.includes('سنتين') || duration.includes('730')) {
        calculatedPremium = calculatedPremium * 2;
      }
    }
    else if (documentType === 'foreign_car') {
      let dailyBase = 0;
      let extraPassengerPrice = 0;
      let extraTonPrice = 0;

      switch (foreignCarPurpose) {
        case 'سيارات خاصة سياحية':
          dailyBase = 2;
          extraPassengerPrice = 1;
          extraTonPrice = 1;
          break;
        case 'سيارات نقل ركاب':
          dailyBase = 3;
          extraPassengerPrice = 2;
          extraTonPrice = 2;
          break;
        case 'سيارات نقل وشحن':
          dailyBase = 4;
          extraPassengerPrice = 3;
          extraTonPrice = 3;
          break;
      }

      let days = 30;
      switch (duration) {
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

      calculatedPremium = dailyBase * days;

      // Extra passengers (> 1)
      if (passengers > 1) {
        calculatedPremium += (passengers - 1) * extraPassengerPrice * days;
      }
      // Extra tonnage (> 0)
      if (capacity > 0) {
        calculatedPremium += capacity * extraTonPrice * days;
      }
    }
    else if (documentType === 'compulsory' || documentType === 'customs') {
      let basePremium = 0;

      // Engine power basic premium
      switch (enginePower) {
        // Private
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
        // Public
        case 'سيارة تعليم قيادة':
          basePremium = 58.000;
          break;
        case 'سيارة اسعاف':
          basePremium = 50.000;
          break;
        case 'ركوبة عامة داخل المدينة':
        case 'ركوبة عامة خارج المدينة':
          basePremium = 64.000;
          break;
        case 'حافلة لنقل الركاب':
        case 'مركبة مقطورة بحافلة ركاب':
          basePremium = 84.000;
          break;
        // Transport
        case 'سيارة نقل':
        case 'رأس جر':
          basePremium = 65.000;
          break;
        case 'شاحنة صندوق':
          basePremium = 73.000;
          break;
        case 'مقطورة':
          basePremium = 0;
          break;
        case 'مقطورة سيارة خاصة':
          basePremium = 30.000;
          break;
        case 'سيارة نقل موتى':
          basePremium = 24.000;
          break;
        // Agricultural
        case 'جرار زراعي':
        case 'ألات زراعية':
          basePremium = 16.000;
          break;
        // Industrial
        case 'جرار صناعي':
        case 'ألات حفر':
        case 'ألات رفع':
        case 'ألات تعبيد الطرق':
          basePremium = 34.000;
          break;
      }

      // Surcharges by license purpose
      const isPrivate = licensePurpose && licensePurpose.includes('خاصة');
      const isPublic = licensePurpose && licensePurpose.includes('عامة');
      const isTransport = licensePurpose && licensePurpose.includes('نقل');
      const isAgricultural = licensePurpose && licensePurpose.includes('زراعي');
      const isIndustrial = licensePurpose && licensePurpose.includes('صناعي');

      if (documentType === 'customs' && isPrivate) {
        // Customs + Private uses a monthly rate
        let monthlyPremium = 0;
        switch (enginePower) {
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
        }

        let days = 30;
        switch (duration) {
          case 'شهر (30 يوم)':
            days = 30;
            basePremium = monthlyPremium;
            break;
          case 'شهرين (60 يوم)':
            days = 60;
            basePremium = monthlyPremium * 1.5;
            break;
          case 'ثلاثة أشهر (90 يوم)':
            days = 90;
            basePremium = monthlyPremium * 2.0;
            break;
          default:
            days = 30;
            basePremium = monthlyPremium;
        }

        const defaultPassengers = enginePower === 'سيارة تجارية' ? 1 : 4;
        if (passengers > defaultPassengers) {
          basePremium += (passengers - defaultPassengers) * 0.10 * days;
        }
      } 
      else if (documentType === 'customs' && isPublic) {
        // Customs + Public monthly rates
        let monthlyPremium = 0;
        let defaultPassengers = 1;

        switch (enginePower) {
          case 'سيارة تعليم قيادة':
            monthlyPremium = 11.6;
            defaultPassengers = 1;
            break;
          case 'سيارة اسعاف':
            monthlyPremium = 10;
            defaultPassengers = 1;
            break;
          case 'ركوبة عامة داخل المدينة':
          case 'ركوبة عامة خارج المدينة':
            monthlyPremium = 12.8;
            defaultPassengers = 1;
            break;
          case 'حافلة لنقل الركاب':
          case 'مركبة مقطورة بحافلة ركاب':
            monthlyPremium = 16.8;
            defaultPassengers = 14;
            break;
        }

        let days = 30;
        switch (duration) {
          case 'شهر (30 يوم)':
            days = 30;
            basePremium = monthlyPremium;
            break;
          case 'شهرين (60 يوم)':
            days = 60;
            basePremium = monthlyPremium * 1.5;
            break;
          case 'ثلاثة أشهر (90 يوم)':
            days = 90;
            basePremium = monthlyPremium * 2.0;
            break;
          default:
            days = 30;
            basePremium = monthlyPremium;
        }

        if (passengers > defaultPassengers) {
          basePremium += (passengers - defaultPassengers) * 0.10 * days;
        }
      }
      else if (documentType === 'customs' && isTransport) {
        // Customs + Transport monthly rates
        let monthlyPremium = 0;
        let hasLoad = true;

        switch (enginePower) {
          case 'سيارة نقل':
          case 'رأس جر':
            monthlyPremium = 13;
            break;
          case 'شاحنة صندوق':
            monthlyPremium = 14.6;
            break;
          case 'مقطورة':
            monthlyPremium = 0;
            break;
          case 'مقطورة سيارة خاصة':
            monthlyPremium = 6;
            hasLoad = false;
            break;
          case 'سيارة نقل موتى':
            monthlyPremium = 4.8;
            hasLoad = false;
            break;
        }

        let days = 30;
        switch (duration) {
          case 'شهر (30 يوم)':
            days = 30;
            basePremium = monthlyPremium;
            break;
          case 'شهرين (60 يوم)':
            days = 60;
            basePremium = monthlyPremium * 1.5;
            break;
          case 'ثلاثة أشهر (90 يوم)':
            days = 90;
            basePremium = monthlyPremium * 2.0;
            break;
          default:
            days = 30;
            basePremium = monthlyPremium;
        }

        if (hasLoad && capacity > 0) {
          if (enginePower === 'مقطورة') {
            const tonPrice = 8;
            const extra = capacity * tonPrice;
            if (duration === 'شهر (30 يوم)') {
              basePremium += extra;
            } else if (duration === 'شهرين (60 يوم)') {
              basePremium += extra * 1.5;
            } else if (duration === 'ثلاثة أشهر (90 يوم)') {
              basePremium += extra * 2.0;
            }
          } else {
            basePremium += capacity * 0.10 * days;
          }
        }
      }
      else if (documentType === 'customs' && isAgricultural) {
        let monthlyPremium = 3.2;
        let days = 30;
        switch (duration) {
          case 'شهر (30 يوم)':
            days = 30;
            basePremium = monthlyPremium;
            break;
          case 'شهرين (60 يوم)':
            days = 60;
            basePremium = monthlyPremium * 1.5;
            break;
          case 'ثلاثة أشهر (90 يوم)':
            days = 90;
            basePremium = monthlyPremium * 2.0;
            break;
          default:
            days = 30;
            basePremium = monthlyPremium;
        }
        if (capacity > 0) {
          basePremium += capacity * 0.10 * days;
        }
      }
      else if (documentType === 'customs' && isIndustrial) {
        let monthlyPremium = 6.8;
        let days = 30;
        switch (duration) {
          case 'شهر (30 يوم)':
            days = 30;
            basePremium = monthlyPremium;
            break;
          case 'شهرين (60 يوم)':
            days = 60;
            basePremium = monthlyPremium * 1.5;
            break;
          case 'ثلاثة أشهر (90 يوم)':
            days = 90;
            basePremium = monthlyPremium * 2.0;
            break;
          default:
            days = 30;
            basePremium = monthlyPremium;
        }
        if (capacity > 0) {
          basePremium += capacity * 0.10 * days;
        }
      }
      else if (documentType === 'customs') {
        // Fallback for customs (divide compulsory by 365)
        let days = 30;
        switch (duration) {
          case 'شهر (30 يوم)': days = 30; break;
          case 'شهرين (60 يوم)': days = 60; break;
          case 'ثلاثة أشهر (90 يوم)': days = 90; break;
        }
        // Calculate compulsory premium for base first, then scale
        let compPremium = basePremium;
        if (isPrivate) {
          const defaultPass = enginePower === 'سيارة تجارية' ? 1 : 4;
          const extraPrice = enginePower === 'سيارة تجارية' ? 15 : 5;
          if (passengers > defaultPass) {
            compPremium += (passengers - defaultPass) * extraPrice;
          }
        }
        basePremium = (compPremium / 365) * days;
      }
      else {
        // Compulsory standard pricing
        if (isPrivate) {
          const defaultPass = enginePower === 'سيارة تجارية' ? 1 : 4;
          const extraPrice = enginePower === 'سيارة تجارية' ? 15 : 5;
          if (passengers > defaultPass) {
            basePremium += (passengers - defaultPass) * extraPrice;
          }
        } 
        else if (isPublic) {
          let defaultPass = 1;
          let extraPrice = 10;
          switch (enginePower) {
            case 'سيارة تعليم قيادة':
            case 'سيارة اسعاف':
              defaultPass = 1;
              extraPrice = 15;
              break;
            case 'ركوبة عامة داخل المدينة':
            case 'ركوبة عامة خارج المدينة':
              defaultPass = 1;
              extraPrice = 10;
              break;
            case 'حافلة لنقل الركاب':
            case 'مركبة مقطورة بحافلة ركاب':
              defaultPass = 14;
              extraPrice = 8;
              break;
          }
          if (passengers > defaultPass) {
            basePremium += (passengers - defaultPass) * extraPrice;
          }
        }
        else if (isTransport) {
          let defaultLoad = 0;
          let extraTon = 8;
          let canIncrease = true;
          switch (enginePower) {
            case 'سيارة نقل':
            case 'شاحنة صندوق':
              defaultLoad = 1;
              extraTon = 8;
              break;
            case 'مقطورة':
              basePremium = capacity * 8;
              canIncrease = false;
              break;
            case 'رأس جر':
            case 'مقطورة سيارة خاصة':
            case 'سيارة نقل موتى':
              canIncrease = false;
              break;
          }
          if (canIncrease && capacity > defaultLoad) {
            basePremium += (capacity - defaultLoad) * extraTon;
          }
        }
        else if (isAgricultural) {
          if (passengers > 1) basePremium += (passengers - 1) * 15;
          if (capacity > 0) basePremium += capacity * 15;
        }
        else if (isIndustrial) {
          if (passengers > 1) basePremium += (passengers - 1) * 15;
          if (capacity > 0) basePremium += capacity * 15;
        }

        // Duration multiplier for compulsory
        if (duration.includes('سنتين') || duration.includes('730')) {
          basePremium = basePremium * 2;
        }
      }

      calculatedPremium = basePremium;
    }

    setPremium(calculatedPremium.toFixed(3));
    setTax(calculatedTax.toFixed(3));
    setStamp(calculatedStamp.toFixed(3));
    setIssueFees(calculatedIssueFees.toFixed(3));
    setSupervisionFees(calculatedSupervisionFees.toFixed(3));
  }, [
    documentType,
    enginePower,
    licensePurpose,
    authorizedPassengers,
    loadCapacity,
    duration,
    thirdPartyPurpose,
    foreignCarPurpose,
    itemType,
    numberOfDays
  ]);

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/branches-agents?per_page=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data.data || data || []);
      }
    } catch (e) {
      console.error('Error fetching agents:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      // Build payload dynamically based on type
      const payload: Record<string, any> = {
        document_type: ['customs', 'third_party', 'foreign_car'].includes(documentType) ? 'compulsory' : documentType,
        branch_agent_id: branchAgentId || null,
        issue_date: issueDate,
        start_date: startDate,
        end_date: endDate || null,
        document_number: documentNumber || null,
        user_id: user ? user.id : null,
        
        insured_name: insuredName,
        nid_passport: nidPassport,
        phone: phone,
        whatsapp_number: whatsappNumber,
        email: email,
        address: address,
        nationality: nationality,
        gender: gender,
        age: age ? parseInt(age) : null,
        birth_date: birthDate || null,
        name_en: nameEn || null,

        // Financial
        premium: parseFloat(premium) || 0,
        premium_amount: parseFloat(premium) || 0, // for new types
        tax: parseFloat(tax) || 0,
        stamp: parseFloat(stamp) || 0,
        issue_fees: parseFloat(issueFees) || 0,
        supervision_fees: parseFloat(supervisionFees) || 0,
        total: parseFloat(total) || 0,
      };

      // Type-specific additions
      if (['compulsory', 'customs', 'third_party', 'foreign_car', 'international'].includes(documentType)) {
        payload.chassis_number = chassisNumber;
        payload.plate_number_manual = plateNumberManual;
        payload.plate_number = plateNumberManual;
        payload.color = color;
        payload.year = year ? parseInt(year) : null;
        payload.engine_power = enginePower;
        payload.engine_number = engineNumber;
        payload.engine_cc = engineCc;
        payload.authorized_passengers = authorizedPassengers ? parseInt(authorizedPassengers) : null;
        payload.load_capacity = loadCapacity ? parseFloat(loadCapacity) : null;
        payload.vehicle_weight = vehicleWeight;
        payload.vehicle_type_id = vehicleTypeId || null;
        payload.fuel_type = fuelType;
        payload.license_purpose = licensePurpose;

        if (documentType === 'compulsory') {
          payload.insurance_type = 'تأمين إجباري سيارات';
        } else if (documentType === 'customs') {
          payload.insurance_type = 'تأمين سيارة جمرك';
          payload.port = port;
          payload.duration = duration;
        } else if (documentType === 'third_party') {
          payload.insurance_type = 'تأمين طرف ثالث سيارات';
          payload.third_party_purpose = thirdPartyPurpose;
          payload.duration = duration;
        } else if (documentType === 'foreign_car') {
          payload.insurance_type = 'تأمين سيارات أجنبية';
          payload.foreign_car_country = foreignCarCountry;
          payload.foreign_car_purpose = foreignCarPurpose;
          payload.duration = duration;
        }

        if (documentType === 'international') {
          payload.vehicle_nationality = vehicleNationality;
          payload.visited_country = visitedCountry;
          payload.number_of_days = parseInt(numberOfDays) || 30;
          payload.item_type = itemType;
          payload.daily_premium = LOW_VALUE_ITEMS.includes(itemType) ? 7 : 8;
        }
      }

      if (documentType === 'travel' || documentType === 'resident') {
        payload.geographic_area = geographicArea;
        payload.duration = duration;
        payload.passport_number = nidPassport;

        if (documentType === 'resident') {
          payload.residence_type = residenceType;
          payload.residence_duration = residenceDuration ? parseInt(residenceDuration) : null;
          payload.occupation = occupation;
        }
      }

      if (documentType === 'marine') {
        payload.structure_name = structureName;
        payload.structure_type = structureType;
        payload.manufacturing_year = manufacturingYear ? parseInt(manufacturingYear) : null;
        payload.engine_model = engineModel;
        payload.engine_power = enginePower;
      }

      if (documentType === 'medical') {
        payload.profession = profession;
        payload.workplace = workPlace;
        payload.work_place = workPlace;
      }

      if (documentType === 'personal_accident') {
        payload.name = insuredName;
        payload.id_proof = nidPassport;
        payload.profession = job;
        payload.job = job;
      }

      if (documentType === 'school_student') {
        payload.student_name = insuredName;
        payload.school_name = schoolName;
        payload.grade = grade;
        payload.birth_date = birthDate;
      }

      if (documentType === 'cash_in_transit') {
        payload.transit_from = transitFrom;
        payload.transit_to = transitTo;
        payload.limit_per_transit = parseFloat(limitPerTransit) || 0;
        payload.annual_turnover = parseFloat(annualTurnover) || 0;
      }

      if (documentType === 'cargo') {
        payload.cargo_description = cargoDescription;
        payload.transport_type = transportType;
        payload.voyage_from = voyageFrom;
        payload.voyage_to = voyageTo;
        payload.sum_insured = parseFloat(sumInsured) || 0;
      }

      const res = await fetch(`${API_BASE_URL}/old-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message || 'تم حفظ الوثيقة القديمة بنجاح', 'success');
        // Reset or Navigate
        navigate('/dashboard');
      } else {
        showToast(data.message || 'فشل في حفظ الوثيقة القديمة', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ الوثيقة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="document-section">
      <div className="card">
        <div className="card-header" style={{ background: 'linear-gradient(135deg, #014cb1, #002d75)', color: '#fff', padding: '20px', borderRadius: '12px 12px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.15)', width: '50px', height: '50px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '24px' }}></i>
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>إدارة وإصدار الوثائق القديمة</h2>
              <p style={{ fontSize: '13px', opacity: 0.8, margin: '5px 0 0 0' }}>لإضافة الوثائق القديمة والملغاة يدوياً بكامل المبالغ والتواريخ القديمة وبدون أي قيود أو تحقق</p>
            </div>
          </div>
        </div>

        <div className="card-body" style={{ padding: '25px' }}>
          {/* الاختيارات الرئيسية العلوية */}
          <div className="modern-grid-2" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '10px', marginBottom: '25px' }}>
            <div className="form-group" ref={agentDropdownRef} style={{ position: 'relative' }}>
              <label style={{ fontWeight: '700', color: '#1e293b' }}>
                <i className="fa-solid fa-building-user" style={{ marginLeft: '8px', color: '#014cb1' }}></i> اختر الوكيل المطلوب *
              </label>
              <div
                onClick={() => setShowAgentDropdown((v) => !v)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 42,
                }}
              >
                <span style={{ color: branchAgentId ? '#1e293b' : '#9ca3af', fontWeight: branchAgentId ? '700' : 'normal' }}>
                  {selectedAgent ? `${selectedAgent.agency_name} (${selectedAgent.code})` : '-- اختر الوكيل --'}
                </span>
                <i className={`fa-solid fa-chevron-${showAgentDropdown ? 'up' : 'down'}`} style={{ color: '#9ca3af' }}></i>
              </div>
              
              {showAgentDropdown && (
                <div
                  className="searchable-dropdown-list"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    marginTop: '4px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                    <input
                      type="text"
                      placeholder="ابحث عن وكيل بالاسم أو الكود..."
                      value={agentSearch}
                      onChange={(e) => setAgentSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        background: '#f8fafc',
                        outline: 'none',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div style={{ maxHeight: '230px', overflowY: 'auto' }}>
                    {filteredAgents.length === 0 ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                        لا توجد نتائج
                      </div>
                    ) : (
                      filteredAgents.map((agent) => (
                        <div
                          key={agent.id}
                          className={`searchable-dropdown-item ${branchAgentId === agent.id.toString() ? 'selected' : ''}`}
                          onClick={() => {
                            setBranchAgentId(agent.id.toString());
                            setShowAgentDropdown(false);
                            setAgentSearch('');
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            backgroundColor: branchAgentId === agent.id.toString() ? '#f0f9ff' : 'transparent',
                            color: branchAgentId === agent.id.toString() ? '#0284c7' : '#1e293b',
                            fontWeight: branchAgentId === agent.id.toString() ? '700' : 'normal',
                            fontSize: '14px',
                          }}
                          onMouseEnter={(e) => {
                            if (branchAgentId !== agent.id.toString()) {
                              e.currentTarget.style.backgroundColor = '#f8fafc';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (branchAgentId !== agent.id.toString()) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          {agent.agency_name} ({agent.code})
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label style={{ fontWeight: '700', color: '#1e293b' }}>
                <i className="fa-solid fa-file-invoice" style={{ marginLeft: '8px', color: '#014cb1' }}></i> اختر نوع التأمين المطلوب *
              </label>
              <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} required>
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="user-form">
            {/* القسم الأول: البيانات الأساسية للوثيقة يدوياً وبالتسلسل المطلوب */}
            <div className="grid-header" style={{ background: '#014cb1', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-file-contract"></i> بيانات الوثيقة القديمة والمعلومات الأساسية
            </div>

            <div className="modern-grid-3">
              {/* 1. رقم الوثيقة */}
              <div className="form-group">
                <label>1. رقم الوثيقة (يدوي) *</label>
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  required
                  placeholder="رقم الوثيقة القديمة"
                />
              </div>

              {/* 2. اسم المؤمن له */}
              <div className="form-group span-2">
                <label>2. اسم المؤمن له *</label>
                <input
                  type="text"
                  value={insuredName}
                  onChange={(e) => setInsuredName(e.target.value)}
                  required
                  placeholder="اسم المؤمن له كما في الإثبات"
                />
              </div>

              {/* 3. بداية التأمين (وتلقائياً يحسب التاريخ بعد سنة) */}
              <div className="form-group">
                <label>3. بداية التأمين *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartDate(val);
                    setIssueDate(val);
                    if (val) {
                      const d = new Date(val);
                      if (!isNaN(d.getTime())) {
                        d.setFullYear(d.getFullYear() + 1);
                        const y = d.getFullYear();
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        setEndDate(`${y}-${m}-${day}`);
                      }
                    }
                  }}
                  required
                />
              </div>

              {/* 4. نهاية التأمين */}
              <div className="form-group">
                <label>4. نهاية التأمين (تلقائياً بعد سنة) *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>

              {/* 5. الغرض من الترخيص */}
              <div className="form-group">
                <label>5. الغرض من الترخيص *</label>
                <select
                  value={licensePurpose}
                  onChange={(e) => setLicensePurpose(e.target.value)}
                  required={['compulsory', 'customs', 'third_party', 'foreign_car'].includes(documentType)}
                >
                  <option value="">-- اختر الغرض --</option>
                  {LICENSE_PURPOSES.map(p => <option key={p} value={p}>{p.split('/')[0]}</option>)}
                </select>
              </div>

              {/* 6. قوة المحرك [[حصان]] */}
              <div className="form-group">
                <label>6. قوة المحرك [[حصان]] *</label>
                {['compulsory', 'customs', 'third_party', 'foreign_car'].includes(documentType) ? (
                  <select value={enginePower} onChange={(e) => setEnginePower(e.target.value)} required>
                    <option value="">-- اختر الفئة / قوة المحرك --</option>
                    {getAvailableEnginePowers().map((ep) => (
                      <option key={ep} value={ep}>{ep}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" value={enginePower} onChange={(e) => setEnginePower(e.target.value)} placeholder="قوة المحرك بالحُصان" />
                )}
              </div>

              {/* 7. رقم اللوحة */}
              <div className="form-group">
                <label>7. رقم اللوحة *</label>
                <input
                  type="text"
                  value={plateNumberManual}
                  onChange={(e) => setPlateNumberManual(e.target.value)}
                  required
                  placeholder="رقم اللوحة المعدنية"
                />
              </div>

              {/* 8. رقم الشاصي */}
              <div className="form-group">
                <label>8. رقم الشاصي (الهيكل) *</label>
                <input
                  type="text"
                  value={chassisNumber}
                  onChange={(e) => setChassisNumber(e.target.value)}
                  required
                  placeholder="رقم الشاصي"
                />
              </div>

              {/* 9. عدد الركاب */}
              <div className="form-group">
                <label>9. عدد الركاب</label>
                <input
                  type="text"
                  value={authorizedPassengers}
                  onChange={(e) => setAuthorizedPassengers(e.target.value)}
                  placeholder="عدد الركاب"
                />
              </div>

              {/* 10. الحمولة بالطن */}
              <div className="form-group">
                <label>10. الحمولة بالطن</label>
                <input
                  type="text"
                  value={loadCapacity}
                  onChange={(e) => setLoadCapacity(e.target.value)}
                  placeholder="الحمولة بالطن"
                />
              </div>

              {/* حقول مسافر السفر والوافد الإضافية إذا تم تحديدها */}
              {['travel', 'resident'].includes(documentType) && (
                <>
                  <div className="form-group">
                    <label>الاسم بالإنجليزية *</label>
                    <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} required placeholder="English Name" />
                  </div>
                  <div className="form-group">
                    <label>تاريخ الميلاد *</label>
                    <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>العمر *</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)} required placeholder="العمر" />
                  </div>
                  <div className="form-group">
                    <label>النوع *</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* تفاصيل إضافية مخصصة حسب نوع الوثيقة */}
            {documentType === 'customs' && (
              <div className="modern-grid-3" style={{ marginTop: '15px' }}>
                <div className="form-group">
                  <label>الميناء *</label>
                  <select value={port} onChange={(e) => setPort(e.target.value)} required>
                    <option value="ميناء طرابلس">ميناء طرابلس</option>
                    <option value="ميناء مصراته">ميناء مصراته</option>
                    <option value="ميناء الخمس">ميناء الخمس</option>
                    <option value="ميناء بنغازي">ميناء بنغازي</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>مدة التأمين *</label>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)} required>
                    <option value="شهر (30 يوم)">شهر (30 يوم)</option>
                    <option value="شهرين (60 يوم)">شهرين (60 يوم)</option>
                    <option value="ثلاثة أشهر (90 يوم)">ثلاثة أشهر (90 يوم)</option>
                  </select>
                </div>
              </div>
            )}

            {documentType === 'third_party' && (
              <div className="modern-grid-3" style={{ marginTop: '15px' }}>
                <div className="form-group">
                  <label>الغرض من الطرف الثالث *</label>
                  <select value={thirdPartyPurpose} onChange={(e) => setThirdPartyPurpose(e.target.value)} required>
                    <option value="خاصة">خاصة</option>
                    <option value="عامة">عامة</option>
                    <option value="نقل">نقل</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>مدة التأمين *</label>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)} required>
                    <option value="سنة (365 يوم)">سنة (365 يوم)</option>
                    <option value="سنتين (730 يوم)">سنتين (730 يوم)</option>
                  </select>
                </div>
              </div>
            )}

            {documentType === 'foreign_car' && (
              <div className="modern-grid-3" style={{ marginTop: '15px' }}>
                <div className="form-group">
                  <label>دولة السيارة *</label>
                  <input type="text" value={foreignCarCountry} onChange={(e) => setForeignCarCountry(e.target.value)} required placeholder="مثال: تونس، الجزائر" />
                </div>
                <div className="form-group">
                  <label>الغرض من السيارة *</label>
                  <select value={foreignCarPurpose} onChange={(e) => setForeignCarPurpose(e.target.value)} required>
                    <option value="سيارات خاصة سياحية">سيارات خاصة سياحية</option>
                    <option value="سيارات نقل ركاب">سيارات نقل ركاب</option>
                    <option value="سيارات نقل وشحن">سيارات نقل وشحن</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>مدة التأمين *</label>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)} required>
                    <option value="شهر (30 يوم)">شهر (30 يوم)</option>
                    <option value="شهرين (60 يوم)">شهرين (60 يوم)</option>
                    <option value="ثلاثة أشهر (90 يوم)">ثلاثة أشهر (90 يوم)</option>
                    <option value="سنة (365 يوم)">سنة (365 يوم)</option>
                    <option value="سنتين (730 يوم)">سنتين (730 يوم)</option>
                  </select>
                </div>
              </div>
            )}

            {/* الحقول الخاصة بالتأمين البحري */}
            {documentType === 'marine' && (
              <>
                <div className="grid-header" style={{ background: '#014cb1', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontWeight: '800', margin: '30px 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-ship"></i> بيانات الهيكل البحري
                </div>
                <div className="modern-grid-3">
                  <div className="form-group">
                    <label>اسم الهيكل *</label>
                    <input type="text" value={structureName} onChange={(e) => setStructureName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>نوع الهيكل *</label>
                    <select value={structureType} onChange={(e) => setStructureType(e.target.value)} required>
                      <option value="القوارب الشخصية والدراجات">القوارب الشخصية والدراجات</option>
                      <option value="الآلات والرافعات البحرية">الآلات والرافعات البحرية</option>
                      <option value="قوارب الصيد">قوارب الصيد</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>سنة الصنع *</label>
                    <select value={manufacturingYear} onChange={(e) => setManufacturingYear(e.target.value)} required>
                      <option value="">اختر سنة الصنع...</option>
                      {Array.from({ length: 70 }, (_, i) => new Date().getFullYear() - i).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>موديل المحرك</label>
                    <input type="text" value={engineModel} onChange={(e) => setEngineModel(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>قوة المحرك (حصان)</label>
                    <input type="text" value={enginePower} onChange={(e) => setEnginePower(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {/* الحقول الخاصة بالتأمين الطبي والمسؤولية المهنية */}
            {documentType === 'medical' && (
              <>
                <div className="grid-header" style={{ background: '#014cb1', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontWeight: '800', margin: '30px 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-stethoscope"></i> بيانات المهنة والعمل
                </div>
                <div className="modern-grid-3">
                  <div className="form-group">
                    <label>المهنة الطبية *</label>
                    <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>جهة وموقع العمل *</label>
                    <input type="text" value={workPlace} onChange={(e) => setWorkPlace(e.target.value)} required />
                  </div>
                </div>
              </>
            )}

            {/* الحقول الخاصة بالحوادث الشخصية */}
            {documentType === 'personal_accident' && (
              <>
                <div className="grid-header" style={{ background: '#014cb1', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontWeight: '800', margin: '30px 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-user-injured"></i> تفاصيل النشاط
                </div>
                <div className="modern-grid-3">
                  <div className="form-group">
                    <label>المهنة / الوظيفة *</label>
                    <input type="text" value={job} onChange={(e) => setJob(e.target.value)} required />
                  </div>
                </div>
              </>
            )}

            {/* الحقول الخاصة بحماية طلاب المدارس */}
            {documentType === 'school_student' && (
              <>
                <div className="grid-header" style={{ background: '#014cb1', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontWeight: '800', margin: '30px 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-graduation-cap"></i> بيانات المدرسة والصف
                </div>
                <div className="modern-grid-3">
                  <div className="form-group">
                    <label>اسم المدرسة *</label>
                    <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>الصف الدراسي / السنة الدراسية</label>
                    <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {/* الحقول الخاصة بنقل النقدية */}
            {documentType === 'cash_in_transit' && (
              <>
                <div className="grid-header" style={{ background: '#014cb1', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontWeight: '800', margin: '30px 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-money-bill-transfer"></i> تفاصيل النقل والمسارات
                </div>
                <div className="modern-grid-3">
                  <div className="form-group">
                    <label>نقل من (المنشأ) *</label>
                    <input type="text" value={transitFrom} onChange={(e) => setTransitFrom(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>نقل إلى (الوجهة) *</label>
                    <input type="text" value={transitTo} onChange={(e) => setTransitTo(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>الحد الأقصى للنقلة الواحدة *</label>
                    <input type="number" value={limitPerTransit} onChange={(e) => setLimitPerTransit(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>حجم الدوران السنوي المتوقع</label>
                    <input type="number" value={annualTurnover} onChange={(e) => setAnnualTurnover(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            {/* الحقول الخاصة بشحن البضائع */}
            {documentType === 'cargo' && (
              <>
                <div className="grid-header" style={{ background: '#014cb1', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontWeight: '800', margin: '30px 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-truck"></i> تفاصيل الشحنة والرحلة
                </div>
                <div className="modern-grid-3">
                  <div className="form-group span-2">
                    <label>وصف البضائع المشحونة *</label>
                    <input type="text" value={cargoDescription} onChange={(e) => setCargoDescription(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>طريقة الشحن (بحري/جوي/بري)</label>
                    <select value={transportType} onChange={(e) => setTransportType(e.target.value)}>
                      <option value="Sea">بحري / Sea</option>
                      <option value="Air">جوي / Air</option>
                      <option value="Land">بري / Land</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>من ميناء / مطار *</label>
                    <input type="text" value={voyageFrom} onChange={(e) => setVoyageFrom(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>إلى ميناء / مطار *</label>
                    <input type="text" value={voyageTo} onChange={(e) => setVoyageTo(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>مبلغ التأمين الكلي (المشحون) *</label>
                    <input type="number" value={sumInsured} onChange={(e) => setSumInsured(e.target.value)} required />
                  </div>
                </div>
              </>
            )}

            {/* القسم المالي */}
            <div className="grid-header" style={{ background: '#014cb1', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontWeight: '800', margin: '30px 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-calculator"></i> بيانات التأمين والأسعار
            </div>

            <div className="modern-grid-3">
              <div className="form-group">
                <label>صافي القسط (Premium) *</label>
                <div className="price-input-wrapper">
                  <span className="currency">د.ل</span>
                  <input type="number" step="any" value={premium} onChange={(e) => setPremium(e.target.value)} required />
                </div>
              </div>

              {!['school_student', 'cash_in_transit', 'cargo'].includes(documentType) && (
                <>
                  <div className="form-group">
                    <label>الضريبة (Tax)</label>
                    <div className="price-input-wrapper">
                      <span className="currency">د.ل</span>
                      <input type="number" step="any" value={tax} onChange={(e) => setTax(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>الدمغة (Stamp)</label>
                    <div className="price-input-wrapper">
                      <span className="currency">د.ل</span>
                      <input type="number" step="any" value={stamp} onChange={(e) => setStamp(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>رسوم الإصدار (Issue Fees)</label>
                    <div className="price-input-wrapper">
                      <span className="currency">د.ل</span>
                      <input type="number" step="any" value={issueFees} onChange={(e) => setIssueFees(e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>رسوم الإشراف (Supervision Fees)</label>
                    <div className="price-input-wrapper">
                      <span className="currency">د.ل</span>
                      <input type="number" step="any" value={supervisionFees} onChange={(e) => setSupervisionFees(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group span-2" style={{ paddingTop: '5px' }}>
                <label style={{ color: '#014cb1', fontWeight: '800' }}>الإجمالي النهائي (شامل الرسوم والضرائب)</label>
                <div className="price-input-wrapper" style={{ border: '2px solid #014cb1', height: '40px', background: '#f0f9ff' }}>
                  <span className="currency" style={{ background: '#014cb1', color: '#fff', fontSize: '13px' }}>د.ل</span>
                  <input type="text" value={total} readOnly style={{ fontWeight: '900', color: '#014cb1', fontSize: '1.2rem' }} />
                </div>
              </div>
            </div>

            <div className="form-actions span-4" style={{ marginTop: '30px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button type="submit" disabled={submitting} className="btn-submit" style={{ background: '#10b981', border: 'none', height: '55px', fontSize: '18px', borderRadius: '10px', width: '100%', maxWidth: '350px', fontWeight: '700', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)' }}>
                <i className="fa-solid fa-check-circle"></i> {submitting ? 'جاري الحفظ...' : 'اعتماد وحفظ الوثيقة القديمة'}
              </button>
              <button type="button" onClick={() => navigate('/dashboard')} className="btn-cancel" style={{ height: '55px', fontSize: '16px', borderRadius: '10px', width: '100%', maxWidth: '150px' }}>
                إلغاء
              </button>
            </div>
          </form>

          <style>{`
            .modern-grid-3 {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 20px;
            }
            .span-2 {
              grid-column: span 2;
            }
            .span-3 {
              grid-column: span 3;
            }
            @media (max-width: 992px) {
              .modern-grid-3 {
                grid-template-columns: repeat(2, 1fr);
              }
              .span-2, .span-3 {
                grid-column: span 2;
              }
            }
            @media (max-width: 576px) {
              .modern-grid-3 {
                grid-template-columns: 1fr;
              }
              .span-2, .span-3 {
                grid-column: span 1;
              }
            }
            .price-input-wrapper {
              display: flex;
              align-items: center;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              background: #fff;
              overflow: hidden;
              height: 40px;
            }
            .price-input-wrapper .currency {
              background: #f1f5f9;
              padding: 0 12px;
              height: 100%;
              display: flex;
              align-items: center;
              font-size: 12px;
              color: #64748b;
              border-right: 1px solid #cbd5e1;
            }
            .price-input-wrapper input {
              border: none;
              width: 100%;
              padding: 0 12px;
              font-size: 15px;
              font-weight: 700;
              text-align: center;
              outline: none;
              background: transparent;
            }
          `}</style>
        </div>
      </div>
    </section>
  );
}
