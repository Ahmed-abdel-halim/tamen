import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

const YEARS = Array.from({ length: 70 }, (_, i) => new Date().getFullYear() - i);

const LICENSE_PURPOSES = [
  'خاصة/Private',
  'عامة/Public',
  'نقل/Transport',
  'زراعي/Agricultural',
  'صناعي/Industrial',
];

const FUEL_TYPES = [
  'بنزين/Gasoline',
  'ديزل/Diesel',
  'كهرباء/Electric',
  'غاز طبيعي/CNG',
  'هيدروجين/Hydrogen',
];

const DOCUMENT_TYPES = [
  { value: 'compulsory', label: 'تأمين إجباري سيارات' },
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

export default function OldDocumentsManagement() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
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
  const [endDate, setEndDate] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');

  // Client Details
  const [insuredName, setInsuredName] = useState('');
  const [nidPassport, setNidPassport] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [email, setEmail] = useState('info@mli.ly');
  const [address, setAddress] = useState('طرابلس');
  const [nationality, setNationality] = useState('ليبي');
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
  // 1. Vehicles (compulsory / international)
  const [chassisNumber, setChassisNumber] = useState('');
  const [plateNumberManual, setPlateNumberManual] = useState('');
  const [color, setColor] = useState('');
  const [year, setYear] = useState('');
  const [enginePower, setEnginePower] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [engineCc, setEngineCc] = useState('');
  const [authorizedPassengers, setAuthorizedPassengers] = useState('');
  const [loadCapacity, setLoadCapacity] = useState('');
  const [vehicleWeight, setVehicleWeight] = useState('');
  const [vehicleTypeId, setVehicleTypeId] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [licensePurpose, setLicensePurpose] = useState('');

  // 2. International specific
  const [vehicleNationality, setVehicleNationality] = useState('ليبية- LBY');
  const [visitedCountry, setVisitedCountry] = useState('تونس');
  const [numberOfDays, setNumberOfDays] = useState('30');
  const [itemType, setItemType] = useState('سيارات خاصة ملاكي');

  // 3. Travel / Resident
  const [geographicArea, setGeographicArea] = useState('');
  const [duration, setDuration] = useState('سنة');
  const [residenceType, setResidenceType] = useState('تأشيرة إقامة Residence Visa');
  const [residenceDuration, setResidenceDuration] = useState('');
  const [occupation, setOccupation] = useState('');

  // 4. Marine
  const [structureName, setStructureName] = useState('');
  const [structureType, setStructureType] = useState('');
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
    fetchVehicleTypes();
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

  const fetchVehicleTypes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/vehicle-types?per_page=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        setVehicleTypes(data.data || data || []);
      }
    } catch (e) {
      console.error('Error fetching vehicle types:', e);
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
        document_type: documentType,
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
      if (documentType === 'compulsory' || documentType === 'international') {
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

        if (documentType === 'international') {
          payload.vehicle_nationality = vehicleNationality;
          payload.visited_country = visitedCountry;
          payload.number_of_days = parseInt(numberOfDays) || 30;
          payload.item_type = itemType;
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
        payload.work_place = workPlace;
      }

      if (documentType === 'personal_accident') {
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
          <div className="modern-grid-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '10px', marginBottom: '25px' }}>
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

            <div className="form-group">
              <label style={{ fontWeight: '700', color: '#1e293b' }}>
                <i className="fa-solid fa-calendar-day" style={{ marginLeft: '8px', color: '#014cb1' }}></i> تاريخ الإصدار القديم *
              </label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} required />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="user-form">
            {/* القسم الأول: بيانات المؤمن له */}
            <div className="grid-header" style={{ background: '#014cb1', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontWeight: '800', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-user-tag"></i> بيانات المؤمن له والمشترك
            </div>

            <div className="modern-grid-3">
              <div className="form-group span-2">
                <label>اسم المؤمن له كما في الإثبات *</label>
                <input type="text" value={insuredName} onChange={(e) => setInsuredName(e.target.value)} required placeholder="اسم المؤمن له كما في الإثبات" />
              </div>

              <div className="form-group">
                <label>رقم الهوية / الجواز *</label>
                <input type="text" value={nidPassport} onChange={(e) => setNidPassport(e.target.value)} required placeholder="رقم الهوية الوطنية أو جواز السفر" />
              </div>

              <div className="form-group">
                <label>رقم الهاتف *</label>
                <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="0910000000" />
              </div>

              <div className="form-group">
                <label>رقم الواتساب *</label>
                <input type="text" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} placeholder="رقم الواتساب للعميل" />
              </div>

              <div className="form-group">
                <label>البريد الإلكتروني</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
              </div>

              <div className="form-group">
                <label>الجنسية</label>
                <input type="text" value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="مثال: ليبي، مصري..." />
              </div>

              <div className="form-group">
                <label>العنوان التفصيلي</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="طرابلس، ليبيا" />
              </div>

              <div className="form-group">
                <label>تاريخ البدء *</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>تاريخ الانتهاء *</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
              </div>

              <div className="form-group">
                <label>رقم الوثيقة القديمة (يدوي) *</label>
                <input type="text" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} required placeholder="الرقم التعريفي القديم للوثيقة لإعادة كتابته" />
              </div>

              {/* حقول مسافر السفر والوافد */}
              {['travel', 'resident'].includes(documentType) && (
                <>
                  <div className="form-group">
                    <label>الاسم بالإنجليزية (مطلوب للسفر/الوافد) *</label>
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
                  <div className="form-group">
                    <label>المنطقة الجغرافية / الوجهة *</label>
                    <input type="text" value={geographicArea} onChange={(e) => setGeographicArea(e.target.value)} required placeholder="مثال: دول الخليج، أوروبا..." />
                  </div>
                  <div className="form-group">
                    <label>مدة التأمين *</label>
                    <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} required placeholder="سنة، 3 أشهر..." />
                  </div>
                  {documentType === 'resident' && (
                    <>
                      <div className="form-group">
                        <label>نوع الإقامة *</label>
                        <input type="text" value={residenceType} onChange={(e) => setResidenceType(e.target.value)} required placeholder="تأشيرة إقامة" />
                      </div>
                      <div className="form-group">
                        <label>مدة الإقامة (بالأشهر) *</label>
                        <input type="number" value={residenceDuration} onChange={(e) => setResidenceDuration(e.target.value)} required placeholder="12" />
                      </div>
                      <div className="form-group">
                        <label>المهنة / الوظيفة *</label>
                        <input type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)} required placeholder="المهنة للوافد" />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* حقول المركبة (للتأمين الإجباري والدولي) */}
            {(documentType === 'compulsory' || documentType === 'international') && (
              <>
                <div className="grid-header" style={{ background: '#014cb1', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontWeight: '800', margin: '30px 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-car"></i> بيانات المركبة
                </div>

                <div className="modern-grid-3">
                  <div className="form-group">
                    <label>رقم اللوحة المعدنية *</label>
                    <input type="text" value={plateNumberManual} onChange={(e) => setPlateNumberManual(e.target.value)} required placeholder="مثال: 123456" />
                  </div>

                  <div className="form-group">
                    <label>رقم الشاصي (الهيكل) *</label>
                    <input type="text" value={chassisNumber} onChange={(e) => setChassisNumber(e.target.value)} required placeholder="رقم الشاصي" />
                  </div>

                  <div className="form-group">
                    <label>نوع السيارة وموديلها</label>
                    <select value={vehicleTypeId} onChange={(e) => setVehicleTypeId(e.target.value)}>
                      <option value="">-- اختر من القائمة أو اتركها --</option>
                      {vehicleTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.brand} - {type.category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>اللون *</label>
                    <input type="text" value={color} onChange={(e) => setColor(e.target.value)} required placeholder="أحمر، أسود، فضي..." />
                  </div>

                  <div className="form-group">
                    <label>سنة الصنع *</label>
                    <select value={year} onChange={(e) => setYear(e.target.value)} required>
                      <option value="">اختر سنة الصنع...</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>قوة المحرك (حصان)</label>
                    <input type="text" value={enginePower} onChange={(e) => setEnginePower(e.target.value)} placeholder="16، 30، إلخ" />
                  </div>

                  <div className="form-group">
                    <label>عدد الركاب</label>
                    <input type="text" value={authorizedPassengers} onChange={(e) => setAuthorizedPassengers(e.target.value)} placeholder="4" />
                  </div>

                  <div className="form-group">
                    <label>الحمولة (بالطن)</label>
                    <input type="text" value={loadCapacity} onChange={(e) => setLoadCapacity(e.target.value)} placeholder="0" />
                  </div>

                  <div className="form-group">
                    <label>رقم المحرك</label>
                    <input type="text" value={engineNumber} onChange={(e) => setEngineNumber(e.target.value)} placeholder="رقم المحرك" />
                  </div>

                  <div className="form-group">
                    <label>سعة المحرك (CC)</label>
                    <input type="text" value={engineCc} onChange={(e) => setEngineCc(e.target.value)} placeholder="1600، 2000..." />
                  </div>

                  <div className="form-group">
                    <label>وزن المركبة</label>
                    <input type="text" value={vehicleWeight} onChange={(e) => setVehicleWeight(e.target.value)} placeholder="وزن المركبة" />
                  </div>

                  <div className="form-group">
                    <label>الغرض من الترخيص</label>
                    <select value={licensePurpose} onChange={(e) => setLicensePurpose(e.target.value)}>
                      <option value="">-- اختر الغرض --</option>
                      {LICENSE_PURPOSES.map(p => <option key={p} value={p}>{p.split('/')[0]}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>نوع الوقود</label>
                    <select value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                      <option value="">-- اختر نوع الوقود --</option>
                      {FUEL_TYPES.map(f => <option key={f} value={f}>{f.split('/')[0]}</option>)}
                    </select>
                  </div>

                  {documentType === 'international' && (
                    <>
                      <div className="form-group">
                        <label>جنسية السيارة</label>
                        <input type="text" value={vehicleNationality} onChange={(e) => setVehicleNationality(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>البلد المراد زيارته</label>
                        <select value={visitedCountry} onChange={(e) => setVisitedCountry(e.target.value)}>
                          <option value="تونس">تونس</option>
                          <option value="الجزائر">الجزائر</option>
                          <option value="تونس و الجزائر">تونس و الجزائر</option>
                          <option value="مصر">مصر</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>عدد الأيام</label>
                        <input type="number" value={numberOfDays} onChange={(e) => setNumberOfDays(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label>نوع/فئة المركبة</label>
                        <input type="text" value={itemType} onChange={(e) => setItemType(e.target.value)} placeholder="سيارات خاصة ملاكي" />
                      </div>
                    </>
                  )}
                </div>
              </>
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
                    <input type="text" value={structureType} onChange={(e) => setStructureType(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>سنة الصنع *</label>
                    <select value={manufacturingYear} onChange={(e) => setManufacturingYear(e.target.value)} required>
                      <option value="">اختر سنة الصنع...</option>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
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

            {/* القسم المالي (إدخال يدوي بالكامل) */}
            <div className="grid-header" style={{ background: '#014cb1', color: '#fff', padding: '12px 20px', borderRadius: '8px', fontWeight: '800', margin: '30px 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-calculator"></i> بيانات التأمين والأسعار (إدخال يدوي بالكامل)
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
