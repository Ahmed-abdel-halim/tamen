import React, { useState, useEffect, useRef } from 'react';
import { showToast } from '../Toast';
import { API_BASE_URL } from '../../config/api';

const SearchableSelect = ({
  label,
  options,
  value,
  onChange,
  onSearch,
  placeholder,
  loading = false
}: {
  label: string,
  options: { value: string, label: string }[],
  value: string,
  onChange: (val: string) => void,
  onSearch?: (search: string) => void,
  placeholder: string,
  loading?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = onSearch
    ? options
    : options.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="field-group" ref={dropdownRef} style={{ position: 'relative' }}>
      <label className="premium-label">{label}</label>
      <div
        className="premium-field d-flex align-items-center justify-content-between"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        style={{ cursor: 'pointer', height: '46px', background: 'var(--panel)', border: '1.5px solid var(--border)', borderRadius: '12px' }}
      >
        <span style={{ color: value ? 'var(--text)' : 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'} ms-2`} style={{ fontSize: '0.8rem', opacity: 0.5 }}></i>
      </div>

      {isOpen && (
        <div onClick={(e) => e.stopPropagation()} style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'var(--panel)',
          border: '1.5px solid var(--accent-cyan)',
          borderRadius: '16px',
          marginTop: '8px',
          boxShadow: '0 15px 35px rgba(0,0,0,0.15)',
          maxHeight: '350px',
          display: 'flex',
          flexDirection: 'column',
          padding: '8px',
          backdropFilter: 'blur(10px)'
        }}>
          <div className="mb-3 p-1">
            <div className="input-group" style={{ background: 'var(--panel)', borderRadius: '14px', overflow: 'hidden', border: '2px solid var(--accent-cyan)', boxShadow: '0 0 10px rgba(0, 212, 255, 0.2)' }}>
              <span className="input-group-text bg-transparent border-0 pe-2">
                <i className="fa-solid fa-magnifying-glass fs-5" style={{ color: 'var(--accent-cyan)' }}></i>
              </span>
              <input
                type="text"
                className="form-control border-0 shadow-none bg-transparent py-3"
                placeholder="اكتب للبحث عن رقم الوثيقة أو اسم المؤمن له..."
                autoFocus
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (onSearch) onSearch(e.target.value);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)' }}
              />
            </div>
          </div>
          <div style={{ maxHeight: '250px', overflowY: 'auto', flex: 1 }} className="custom-scrollbar">
            {loading ? (
              <div className="p-4 text-center text-muted small">
                <div className="spinner-border spinner-border-sm text-info me-2"></div>
                جاري البحث في قاعدة البيانات...
              </div>
            ) : filteredOptions.length > 0 ? (
              filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  className="p-2 px-3 mb-1 dropdown-item rounded-3"
                  style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.2s' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  {opt.label}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-muted small">
                <i className="fa-solid fa-face-frown d-block mb-2 fs-4 opacity-50"></i>
                لا توجد نتائج مطابقة
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const safeFormatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'غير متوفر';
  try {
    // Convert MySQL datetime (space separator) to ISO format (T separator)
    const d = new Date(String(dateStr).replace(' ', 'T'));
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('ar-EG');
  } catch {
    return String(dateStr);
  }
};

export default function CreateClaimModal({ onClose, onSuccess, claim }: any) {
  const [loading, setLoading] = useState(false);

  // Document Data
  const [documentType, setDocumentType] = useState(claim?.document_type || 'InsuranceDocument');
  const [availableDocuments, setAvailableDocuments] = useState<{ insurance_number: string, insured_name: string }[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [documentData, setDocumentData] = useState<any>(null);
  const [documentCoverage] = useState(claim?.document_coverage || '');

  const [documentManualData, setDocumentManualData] = useState<any>(claim?.document_manual_data || {
    insurance_number: '', issue_date: '', vehicle_type: '', plate_number: '',
    insured_name: '', end_date: '', year: '', chassis_number: '',
    purpose: '', insurance_type: '', document_coverage: '', phone: '', notes: ''
  });
  const [additionalDocuments, setAdditionalDocuments] = useState<any[]>(claim?.additional_documents || []);

  // Claim Data
  const [claimData, setClaimData] = useState({
    claim_number: claim?.claim_number || '',
    claim_number_auto: !claim?.claim_number,
    reference_number: claim?.reference_number || '',
    admin_number: claim?.admin_number || '',
    claim_date: claim?.claim_date || new Date().toISOString().split('T')[0],
    accident_date: claim?.accident_date || '',
    accident_location: claim?.accident_location || '',
    accident_time: claim?.accident_time || '',
    has_fatalities: claim?.has_fatalities || false,
    fatalities_count: claim?.fatalities_count || '',
    damage_type: claim?.damage_type || 'مادي',
    other_damage_type: claim?.other_damage_type || '',
    claimant_name: claim?.claimant_name || '',
    kinship: claim?.kinship || '',
    personal_id: claim?.personal_id || '',
    nationality: claim?.nationality || '',
    phone_number: claim?.phone_number || '',
    claimant_check_number: claim?.claimant_check_number || '',
    // Driver
    driver_name: claim?.driver_name || '',
    driver_nationality: claim?.driver_nationality || '',
    driver_id_number: claim?.driver_id_number || '',
    driver_license_number: claim?.driver_license_number || '',
    driver_license_issue_date: claim?.driver_license_issue_date || '',
    driver_license_expiry_date: claim?.driver_license_expiry_date || '',
    // Damaged body
    damaged_body_type: claim?.damaged_body_type || 'سيارة',
    damaged_vehicle_model: claim?.damaged_vehicle_model || '',
    damaged_vehicle_plate: claim?.damaged_vehicle_plate || '',
    damaged_vehicle_amount: claim?.damaged_vehicle_amount || '',
    damaged_vehicle_repair_shop: claim?.damaged_vehicle_repair_shop || '',
    damaged_vehicle_details: claim?.damaged_vehicle_details || '',
    damaged_person_name: claim?.damaged_person_name || '',
    damaged_person_amount: claim?.damaged_person_amount || '',
    damaged_person_details: claim?.damaged_person_details || '',
    damaged_building_description: claim?.damaged_building_description || '',
    damaged_building_amount: claim?.damaged_building_amount || '',
    // Victim insurance
    victim_insurance_company: claim?.victim_insurance_company || '',
    victim_insurance_number: claim?.victim_insurance_number || '',
    victim_insurance_type: claim?.victim_insurance_type || '',
    victim_insurance_coverage: claim?.victim_insurance_coverage || '',
    victim_insurance_issue_date: claim?.victim_insurance_issue_date || '',
    victim_insurance_expiry_date: claim?.victim_insurance_expiry_date || '',
    // Assessor
    assessor_name: claim?.assessor_name || '',
    assessor_phone: claim?.assessor_phone || '',
    assessor_date: claim?.assessor_date || '',
    assessor_amount_dinar: claim?.assessor_amount_dinar || '',
    assessor_amount_dollar: claim?.assessor_amount_dollar || '',
    assessor_percentage: claim?.assessor_percentage || '',
    assessor_other_amount: claim?.assessor_other_amount || '',
  });

  const isDamageTypeSelected = (type: string) => {
    if (!claimData.damage_type) return false;
    return claimData.damage_type.split(/[،,]\s*/).includes(type);
  };

  const toggleDamageType = (type: string) => {
    const currentTypes = claimData.damage_type ? claimData.damage_type.split(/[،,]\s*/).filter(Boolean) : [];
    let nextTypes: string[];
    if (currentTypes.includes(type)) {
      nextTypes = currentTypes.filter((t: string) => t !== type);
    } else {
      nextTypes = [...currentTypes, type];
    }
    setClaimData({
      ...claimData,
      damage_type: nextTypes.join('، ')
    });
  };

  const isDamagedBodyTypeSelected = (type: string) => {
    if (!claimData.damaged_body_type) return false;
    return claimData.damaged_body_type.split(/[،,]\s*/).includes(type);
  };

  const toggleDamagedBodyType = (type: string) => {
    const currentTypes = claimData.damaged_body_type ? claimData.damaged_body_type.split(/[،,]\s*/).filter(Boolean) : [];
    let nextTypes: string[];
    if (currentTypes.includes(type)) {
      nextTypes = currentTypes.filter((t: string) => t !== type);
    } else {
      nextTypes = [...currentTypes, type];
    }
    setClaimData({
      ...claimData,
      damaged_body_type: nextTypes.join('، ')
    });
  };

  const [damageCosts, setDamageCosts] = useState<any>(claim?.damage_costs || {
    vehicle: { parts_amount: '', parts_shop: '', repair_amount: '', other_amount: '', total_amount: '' },
    person: { hospital_amount: '', hospital_name: '', medical_tests_amount: '', other_amount: '', total_amount: '' },
    building: { materials_amount: '', materials_shop: '', labor_amount: '', maintenance_amount: '', other_amount: '', total_amount: '' }
  });

  const [damageCostInvoices, setDamageCostInvoices] = useState<any>({});

  const [driverPhoto, setDriverPhoto] = useState<File | null>(null);
  const [driverLicensePhoto, setDriverLicensePhoto] = useState<File | null>(null);
  const [victimInsurancePhoto, setVictimInsurancePhoto] = useState<File | null>(null);
  const [assessorReportPhoto, setAssessorReportPhoto] = useState<File | null>(null);
  const [damagedVehiclePhotos, setDamagedVehiclePhotos] = useState<File[]>([]);
  const [damagedPersonPhotos, setDamagedPersonPhotos] = useState<File[]>([]);
  const [damagedBuildingPhotos, setDamagedBuildingPhotos] = useState<File[]>([]);

  const [reports, setReports] = useState<any[]>(claim?.reports || [
    { id: 1, report_type: 'تقرير طبي معتمد', report_date: '', preparer_name: '', report_number: '', file: null },
    { id: 2, report_type: 'تقرير الجهة الأمنية', report_date: '', preparer_name: '', report_number: '', file: null },
    { id: 3, report_type: 'تقرير مقيم الاضرار', report_date: '', preparer_name: '', report_number: '', file: null },
    { id: 4, report_type: 'تقرير الشؤون الفنية', report_date: '', preparer_name: '', report_number: '', file: null },
  ]);

  useEffect(() => {
    if (claim && claim.document) {
      setInsuranceNumber(claim.document.insurance_number);
      setDocumentData(claim.document);
    }
  }, [claim]);

  const documentTypes = [
    { value: 'InsuranceDocument', label: 'وثائق تأمين السيارات' },
    { value: 'InternationalInsuranceDocument', label: 'تأمين السيارات الدولي' },
    { value: 'TravelInsuranceDocument', label: 'تأمين المسافرين' },
    { value: 'ResidentInsuranceDocument', label: 'تأمين الوافدين للمقيمين' },
    { value: 'MarineStructureInsuranceDocument', label: 'تأمين الهياكل البحرية' },
    { value: 'ProfessionalLiabilityInsuranceDocument', label: 'تأمين المسؤولية المهنية' },
    { value: 'PersonalAccidentInsuranceDocument', label: 'تأمين الحوادث الشخصية' },
    { value: 'SchoolStudentInsuranceDocument', label: 'تأمين حماية طلاب المدارس' },
    { value: 'CashInTransitInsuranceDocument', label: 'تأمين نقل النقدية' },
    { value: 'CargoInsuranceDocument', label: 'تأمين شحن البضائع' },
  ];

  const fetchAvailableDocuments = async (search = '') => {
    setLoadingDocs(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const queryParams = new URLSearchParams({
        document_type: documentType,
        search,
        user_id: user.id || ''
      }).toString();
      const response = await fetch(`${API_BASE_URL}/claims/search-documents?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        setAvailableDocuments([]);
        return;
      }

      const data = await response.json();
      setAvailableDocuments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setAvailableDocuments([]);
      showToast('حدث خطأ أثناء تحميل قائمة الوثائق', 'error');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    if (documentType) {
      fetchAvailableDocuments();
    }
  }, [documentType]);

  const handleSearchDocument = async (number?: string) => {
    const searchNumber = number || insuranceNumber;
    if (!searchNumber) return;

    setDocumentData(null);
    try {
      const queryParams = new URLSearchParams({ document_type: documentType, insurance_number: searchNumber }).toString();
      const response = await fetch(`${API_BASE_URL}/claims/document-info?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        let errMsg = 'الوثيقة غير موجودة';
        try { const e = await response.json(); errMsg = e?.message || errMsg; } catch { }
        showToast(errMsg, 'error');
        return;
      }
      const data = await response.json();
      setDocumentData(data);
      
      // Auto-fill manual data from fetched document
      setDocumentManualData({
        ...documentManualData,
        insurance_number: data.insurance_number || searchNumber,
        issue_date: data.issue_date || '',
        vehicle_type: data.vehicleType?.name || (typeof data.vehicle_type === 'object' ? data.vehicle_type?.name : data.vehicle_type) || '',
        plate_number: data.plate?.plate_number || data.plate_number || '',
        insured_name: data.insured_name || '',
        end_date: data.end_date || '',
        year: data.year || data.manufacture_year || '',
        chassis_number: data.chassis_number || '',
        purpose: data.purpose_of_license || data.purpose || '',
        insurance_type: data.insurance_type || documentType || '',
        phone: data.phone_number || data.phone || ''
      });

      showToast('تم العثور على الوثيقة بنجاح', 'success');

      // Auto fill claimant name if empty
      if (!claimData.claimant_name && data.insured_name) {
        setClaimData({ ...claimData, claimant_name: data.insured_name, kinship: 'المؤمن له' });
      }
    } catch (error: any) {
      showToast(error?.message || 'حدث خطأ أثناء البحث عن الوثيقة', 'error');
    }
  };

  const handleReportChange = (index: number, field: string, value: any) => {
    const updatedReports = [...reports];
    updatedReports[index][field] = value;
    setReports(updatedReports);
  };

  const handleAddReportType = () => {
    setReports([...reports, {
      id: Date.now(),
      report_type: 'اخر',
      other_report_type: '',
      report_date: '',
      preparer_name: '',
      report_number: '',
      file: null
    }]);
  };

  const removeReport = (index: number) => {
    const updated = [...reports];
    updated.splice(index, 1);
    setReports(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      let finalClaimNumber = claimData.claim_number;

      // Generate auto claim number if needed
      if (claimData.claim_number_auto && !finalClaimNumber) {
        finalClaimNumber = 'CLM-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
      }

      Object.keys(claimData).forEach(key => {
        const val = (claimData as any)[key];
        if (key === 'claim_number') {
          formData.append(key, finalClaimNumber);
        } else if (key === 'claim_number_auto') {
          // skip this internal flag
        } else if (typeof val === 'boolean') {
          // Laravel boolean validation requires 1/0, not "true"/"false"
          formData.append(key, val ? '1' : '0');
        } else if (val !== null && val !== undefined && val !== '') {
          formData.append(key, val.toString());
        }
      });
      formData.append('document_type', documentType);
      if (documentData) formData.append('document_id', documentData.id);
      formData.append('document_coverage', documentCoverage);

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id && !claim) formData.append('branch_agent_id', user.branch_agent_id || user.id);

      // File uploads
      if (driverPhoto) formData.append('driver_photo', driverPhoto);
      if (driverLicensePhoto) formData.append('driver_license_photo', driverLicensePhoto);
      if (victimInsurancePhoto) formData.append('victim_insurance_photo', victimInsurancePhoto);
      if (assessorReportPhoto) formData.append('assessor_report_photo', assessorReportPhoto);
      damagedVehiclePhotos.forEach(f => formData.append('damaged_vehicle_photos[]', f));
      damagedPersonPhotos.forEach(f => formData.append('damaged_person_photos[]', f));
      damagedBuildingPhotos.forEach(f => formData.append('damaged_building_photos[]', f));

      formData.append('document_manual_data', JSON.stringify(documentManualData));
      formData.append('additional_documents', JSON.stringify(additionalDocuments));
      formData.append('damage_costs', JSON.stringify(damageCosts));
      
      Object.keys(damageCostInvoices).forEach(key => {
        if (damageCostInvoices[key]) {
          formData.append(key, damageCostInvoices[key]);
        }
      });

      formData.append('reports_count', reports.length.toString());
      reports.forEach((report, index) => {
        if (report.report_type) formData.append(`reports_${index}_report_type`, report.report_type);
        if (report.other_report_type) formData.append(`reports_${index}_other_report_type`, report.other_report_type);
        if (report.report_date) formData.append(`reports_${index}_report_date`, report.report_date);
        if (report.preparer_name) formData.append(`reports_${index}_preparer_name`, report.preparer_name);
        if (report.report_number) formData.append(`reports_${index}_report_number`, report.report_number);
        if (report.file) {
          formData.append(`reports_${index}_report_image`, report.file);
        } else if (report.report_image) {
          // Send existing image path to preserve it
          formData.append(`reports_${index}_existing_image`, report.report_image);
        }
      });

      const url = claim ? `${API_BASE_URL}/claims/${claim.id}?_method=PUT` : `${API_BASE_URL}/claims`;
      const response = await fetch(url, {
        method: 'POST', // Using POST with _method=PUT for multipart support
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw { response: { data: errorData } };
      }

      showToast(claim ? 'تم تحديث المطالبة بنجاح' : 'تم إضافة المطالبة بنجاح', 'success');
      onSuccess();
    } catch (error: any) {
      const errData = error.response?.data;
      let errMsg = 'حدث خطأ أثناء حفظ المطالبة';
      if (errData?.errors) {
        const fieldErrors = Object.values(errData.errors).flat() as string[];
        errMsg = 'خطأ في التحقق من البيانات: ' + fieldErrors[0];
      } else if (errData?.message) {
        errMsg = 'حدث خطأ أثناء حفظ المطالبة: ' + errData.message;
      }
      showToast(errMsg, 'error');
      console.error('Claim save error:', errData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <style>{`
        .premium-modal {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          width: 95%;
          max-width: 1100px;
          height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: modalAppear 0.3s ease-out;
        }
        @keyframes modalAppear {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .premium-modal-header {
          padding: 8px 20px;
          border-bottom: 1px solid var(--border);
          background: var(--panel);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        .premium-modal-body {
          padding: 16px;
          overflow-y: auto;
          flex: 1;
          min-height: 0;
          scrollbar-width: thin;
          scrollbar-color: var(--accent-cyan) transparent;
        }
        .premium-modal-body::-webkit-scrollbar {
          width: 6px;
        }
        .premium-modal-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .premium-modal-body::-webkit-scrollbar-thumb {
          background-color: var(--accent-cyan);
          border-radius: 10px;
        }
        .premium-modal-footer {
          padding: 20px 32px;
          border-top: 1px solid var(--border);
          background: var(--panel);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          flex-shrink: 0;
        }
        .section-card {
          background: color-mix(in srgb, var(--panel) 98%, var(--text) 2%);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 12px 16px;
          margin-bottom: 12px;
          transition: all 0.3s ease;
        }
        .section-card:hover {
          border-color: var(--accent-cyan);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 6px;
        }
        .section-header i {
          font-size: 1.25rem;
          color: var(--accent-cyan);
        }
        .section-header h4 {
          margin: 0;
          font-weight: 800;
          color: var(--text);
          font-size: 1.1rem;
        }
        .field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .premium-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--muted);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          min-height: 20px;
        }
        .dropdown-item:hover {
          background: var(--accent-cyan);
          color: white;
        }
        .premium-field {
          background: var(--panel);
          border: 1.5px solid var(--border);
          border-radius: 12px;
          padding: 10px 16px;
          color: var(--text);
          font-size: 0.9rem;
          width: 100%;
          transition: all 0.2s ease;
          height: 44px;
        }
        .premium-field:focus {
          border-color: var(--accent-cyan) !important;
          box-shadow: 0 0 0 4px var(--accent-shadow) !important;
          outline: none !important;
        }
        .save-btn {
          background: var(--accent-cyan);
          color: white;
          border: none;
          padding: 10px 30px;
          border-radius: 14px;
          font-weight: 700;
          transition: all 0.3s;
        }
        .save-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px var(--accent-shadow);
        }
        .info-pill {
          background: var(--input-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px 16px;
          height: 100%;
        }
        .info-pill .label {
          font-size: 0.75rem;
          color: var(--muted);
          margin-bottom: 4px;
        }
        .info-pill .value {
          font-weight: 700;
          color: var(--text);
          font-size: 0.95rem;
        }
        .report-row {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 14px;
          margin-bottom: 12px;
          padding: 16px;
          display: grid;
          grid-template-columns: 1.5fr 1fr 1.2fr 1fr 1.2fr 40px;
          gap: 12px;
          align-items: center;
          transition: all 0.2s ease;
        }
        .report-row:hover {
          border-color: var(--accent-cyan);
          background: color-mix(in srgb, var(--panel) 98%, var(--accent-cyan) 2%);
        }
        .report-header {
          display: grid;
          grid-template-columns: 1.5fr 1fr 1.2fr 1fr 1.2fr 40px;
          gap: 12px;
          padding: 0 16px 8px;
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--muted);
        }
        .doc-grid-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 0;
        }
        .doc-grid-table td {
          border: 1px solid var(--border);
          padding: 8px 12px;
          font-size: 0.85rem;
          vertical-align: middle;
        }
        .doc-grid-table td.label-cell {
          background: rgba(37, 99, 235, 0.08);
          color: var(--sidebar);
          font-weight: 800;
          white-space: nowrap;
          width: 1%;
          text-align: right;
        }
        .doc-grid-table td.value-cell {
          background: var(--panel);
          color: var(--text);
        }
        .doc-grid-table input[type="text"], .doc-grid-table input[type="date"] {
          width: 100%;
          border: 1.5px solid transparent;
          background: transparent;
          color: var(--text);
          padding: 4px 8px;
          border-radius: 6px;
          outline: none;
          transition: all 0.2s;
        }
        .doc-grid-table input[type="text"]:focus, .doc-grid-table input[type="date"]:focus {
          border-color: #38bdf8;
          background: var(--input-bg);
        }
        .doc-grid-table input[disabled] {
          border: none;
          background: transparent;
          color: var(--text);
          font-weight: 700;
        }
      `}</style>
      <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="premium-modal-header">
            <div className="d-flex align-items-center">
              <i className="fa-solid fa-file-invoice-dollar fs-4 text-primary me-3"></i>
              <div>
                <h3 className="mb-0 fs-5">{claim ? 'تعديل مطالبة' : 'إضافة مطالبة جديدة'}</h3>
                <p className="text-muted small mb-0">{claim ? `تعديل بيانات المطالبة رقم ${claim.claim_number}` : 'قم بتعبئة البيانات لإنشاء مطالبة تأمينية جديدة'}</p>
              </div>
            </div>
            <button type="button" className="btn p-0 border-0" onClick={onClose} style={{ color: 'var(--muted)', fontSize: '1.1rem' }}>
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>

          <div className="premium-modal-body">
            <div className="section-card">
              <div className="section-header">
                <i className="fa-solid fa-file-contract"></i>
                <h4>بيانات الوثيقة</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'end' }}>
                <SearchableSelect
                  label="نوع الوثيقة"
                  options={documentTypes}
                  value={documentType}
                  onChange={(val) => {
                    setDocumentType(val);
                    setInsuranceNumber('');
                    setDocumentData(null);
                  }}
                  placeholder="اختر نوع الوثيقة..."
                />
                <SearchableSelect
                  label="رقم الوثيقة"
                  options={Array.isArray(availableDocuments) ? availableDocuments.map(doc => ({ value: doc.insurance_number, label: `${doc.insurance_number} - ${doc.insured_name}` })) : []}
                  value={insuranceNumber}
                  loading={loadingDocs}
                  onChange={(val) => {
                    setInsuranceNumber(val);
                    handleSearchDocument(val);
                  }}
                  onSearch={(search) => fetchAvailableDocuments(search)}
                  placeholder="ابحث عن رقم الوثيقة..."
                />
              </div>
            </div>

            {(documentData || documentType === 'InternationalInsuranceDocument') && (
              <div className="section-card" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="doc-grid-table">
                  <tbody>
                    <tr>
                      <td className="label-cell">رقم الوثيقة</td>
                      <td className="value-cell">
                        <input type="text" value={documentManualData.insurance_number} onChange={e => setDocumentManualData({...documentManualData, insurance_number: e.target.value})} disabled={documentData && documentType !== 'InternationalInsuranceDocument'} />
                      </td>
                      <td className="label-cell">تاريخ الاصدار</td>
                      <td className="value-cell">
                        <input type="date" value={safeFormatDate(documentManualData.issue_date)} onChange={e => setDocumentManualData({...documentManualData, issue_date: e.target.value})} disabled={documentData && documentType !== 'InternationalInsuranceDocument'} />
                      </td>
                      <td className="label-cell">نوع السيارة</td>
                      <td className="value-cell">
                        <input type="text" value={documentManualData.vehicle_type} onChange={e => setDocumentManualData({...documentManualData, vehicle_type: e.target.value})} disabled={documentData && documentType !== 'InternationalInsuranceDocument'} />
                      </td>
                    </tr>
                    <tr>
                      <td className="label-cell">اسم المؤمن له</td>
                      <td className="value-cell">
                        <input type="text" value={documentManualData.insured_name} onChange={e => setDocumentManualData({...documentManualData, insured_name: e.target.value})} disabled={documentData && documentType !== 'InternationalInsuranceDocument'} />
                      </td>
                      <td className="label-cell">تاريخ الانتهاء</td>
                      <td className="value-cell">
                        <input type="date" value={safeFormatDate(documentManualData.end_date)} onChange={e => setDocumentManualData({...documentManualData, end_date: e.target.value})} disabled={documentData && documentType !== 'InternationalInsuranceDocument'} />
                      </td>
                      <td className="label-cell">سنة الصنع</td>
                      <td className="value-cell">
                        <input type="text" value={documentManualData.year} onChange={e => setDocumentManualData({...documentManualData, year: e.target.value})} disabled={documentData && documentType !== 'InternationalInsuranceDocument'} />
                      </td>
                    </tr>
                    <tr>
                      <td className="label-cell">رقم اللوحة المعدنية</td>
                      <td className="value-cell">
                        <input type="text" value={documentManualData.plate_number} onChange={e => setDocumentManualData({...documentManualData, plate_number: e.target.value})} disabled={documentData && documentType !== 'InternationalInsuranceDocument'} />
                      </td>
                      <td className="label-cell">رقم الهيكل</td>
                      <td className="value-cell">
                        <input type="text" value={documentManualData.chassis_number} onChange={e => setDocumentManualData({...documentManualData, chassis_number: e.target.value})} disabled={documentData && documentType !== 'InternationalInsuranceDocument'} />
                      </td>
                      <td className="label-cell">الغرض من الترخيص</td>
                      <td className="value-cell">
                        <input type="text" value={documentManualData.purpose} onChange={e => setDocumentManualData({...documentManualData, purpose: e.target.value})} disabled={documentData && documentType !== 'InternationalInsuranceDocument'} />
                      </td>
                    </tr>
                    <tr>
                      <td className="label-cell">نوع التأمين</td>
                      <td className="value-cell">
                        <input type="text" value={documentManualData.insurance_type} onChange={e => setDocumentManualData({...documentManualData, insurance_type: e.target.value})} disabled={documentData && documentType !== 'InternationalInsuranceDocument'} />
                      </td>
                      <td className="label-cell">تغطية الوثيقة</td>
                      <td className="value-cell">
                        <input type="text" value={documentManualData.document_coverage} onChange={e => setDocumentManualData({...documentManualData, document_coverage: e.target.value})} disabled={documentData && documentType !== 'InternationalInsuranceDocument'} />
                      </td>
                      <td className="label-cell">رقم الهاتف</td>
                      <td className="value-cell">
                        <input type="text" value={documentManualData.phone} onChange={e => setDocumentManualData({...documentManualData, phone: e.target.value})} disabled={documentData && documentType !== 'InternationalInsuranceDocument'} />
                      </td>
                    </tr>
                    <tr>
                      <td className="label-cell">ملاحظات</td>
                      <td className="value-cell" colSpan={3}>
                        <input type="text" value={documentManualData.notes} onChange={e => setDocumentManualData({...documentManualData, notes: e.target.value})} placeholder="لا يوجد ملاحظات" />
                      </td>
                      <td className="label-cell">أضف صورة الوثيقة</td>
                      <td className="value-cell">
                        <input type="file" style={{ border: 'none', padding: 0 }} />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ background: 'rgba(37, 99, 235, 0.08)', color: 'var(--sidebar)', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, borderTop: '1px solid var(--border)' }}>
                  ملاحظه: بخصوص بيانات الوثيقة في وثائق الدولي يمكن ادخال بيانات الوثيقه يدوي اما باقي الوثائق اختياري يدوي او البحث عن الوثيقه
                </div>
              </div>
            )}

            {/* Additional Documents Section */}
            {additionalDocuments.map((doc, index) => (
              <div key={index} className="section-card" style={{ padding: '0', overflow: 'hidden', marginTop: '16px' }}>
                <div style={{ background: 'rgba(37, 99, 235, 0.08)', color: 'var(--sidebar)', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
                  <span>وثيقة إضافية (توضيح: يتم أحيانا لسيارات النقل شراء وثيقه للسياره وللعربه المجروره)</span>
                  <button type="button" className="btn btn-sm btn-outline-danger py-0 px-2 rounded-pill" onClick={() => {
                    const newDocs = [...additionalDocuments];
                    newDocs.splice(index, 1);
                    setAdditionalDocuments(newDocs);
                  }}><i className="fa-solid fa-times"></i> حذف</button>
                </div>
                <table className="doc-grid-table" style={{ borderTop: 'none', borderRadius: 0, marginBottom: 0 }}>
                  <tbody>
                    <tr>
                      <td className="label-cell">رقم الوثيقة</td>
                      <td className="value-cell"><input type="text" value={doc.insurance_number} onChange={e => { const nd = [...additionalDocuments]; nd[index].insurance_number = e.target.value; setAdditionalDocuments(nd); }} /></td>
                      <td className="label-cell">تاريخ الاصدار</td>
                      <td className="value-cell"><input type="date" value={doc.issue_date} onChange={e => { const nd = [...additionalDocuments]; nd[index].issue_date = e.target.value; setAdditionalDocuments(nd); }} /></td>
                      <td className="label-cell">نوع السيارة</td>
                      <td className="value-cell"><input type="text" value={doc.vehicle_type} onChange={e => { const nd = [...additionalDocuments]; nd[index].vehicle_type = e.target.value; setAdditionalDocuments(nd); }} /></td>
                    </tr>
                    <tr>
                      <td className="label-cell">اسم المؤمن له</td>
                      <td className="value-cell"><input type="text" value={doc.insured_name} onChange={e => { const nd = [...additionalDocuments]; nd[index].insured_name = e.target.value; setAdditionalDocuments(nd); }} /></td>
                      <td className="label-cell">تاريخ الانتهاء</td>
                      <td className="value-cell"><input type="date" value={doc.end_date} onChange={e => { const nd = [...additionalDocuments]; nd[index].end_date = e.target.value; setAdditionalDocuments(nd); }} /></td>
                      <td className="label-cell">سنة الصنع</td>
                      <td className="value-cell"><input type="text" value={doc.year} onChange={e => { const nd = [...additionalDocuments]; nd[index].year = e.target.value; setAdditionalDocuments(nd); }} /></td>
                    </tr>
                    <tr>
                      <td className="label-cell">رقم اللوحة المعدنية</td>
                      <td className="value-cell"><input type="text" value={doc.plate_number} onChange={e => { const nd = [...additionalDocuments]; nd[index].plate_number = e.target.value; setAdditionalDocuments(nd); }} /></td>
                      <td className="label-cell">رقم الهيكل</td>
                      <td className="value-cell"><input type="text" value={doc.chassis_number} onChange={e => { const nd = [...additionalDocuments]; nd[index].chassis_number = e.target.value; setAdditionalDocuments(nd); }} /></td>
                      <td className="label-cell">الغرض من الترخيص</td>
                      <td className="value-cell"><input type="text" value={doc.purpose} onChange={e => { const nd = [...additionalDocuments]; nd[index].purpose = e.target.value; setAdditionalDocuments(nd); }} /></td>
                    </tr>
                    <tr>
                      <td className="label-cell">نوع التأمين</td>
                      <td className="value-cell"><input type="text" value={doc.insurance_type} onChange={e => { const nd = [...additionalDocuments]; nd[index].insurance_type = e.target.value; setAdditionalDocuments(nd); }} /></td>
                      <td className="label-cell">تغطية الوثيقة</td>
                      <td className="value-cell"><input type="text" value={doc.document_coverage} onChange={e => { const nd = [...additionalDocuments]; nd[index].document_coverage = e.target.value; setAdditionalDocuments(nd); }} /></td>
                      <td className="label-cell">رقم الهاتف</td>
                      <td className="value-cell"><input type="text" value={doc.phone} onChange={e => { const nd = [...additionalDocuments]; nd[index].phone = e.target.value; setAdditionalDocuments(nd); }} /></td>
                    </tr>
                    <tr>
                      <td className="label-cell">ملاحظات</td>
                      <td className="value-cell" colSpan={3}><input type="text" value={doc.notes} onChange={e => { const nd = [...additionalDocuments]; nd[index].notes = e.target.value; setAdditionalDocuments(nd); }} placeholder="لا يوجد ملاحظات" /></td>
                      <td className="label-cell">أضف صورة الوثيقة</td>
                      <td className="value-cell"><input type="file" style={{ border: 'none', padding: 0 }} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}

            <div className="text-start mb-4 mt-2">
              <button type="button" className="btn btn-outline-primary btn-sm rounded-pill fw-bold" onClick={() => {
                setAdditionalDocuments([...additionalDocuments, {
                  insurance_number: '', issue_date: '', vehicle_type: '', plate_number: '',
                  insured_name: '', end_date: '', year: '', chassis_number: '',
                  purpose: '', insurance_type: '', document_coverage: '', phone: '', notes: ''
                }]);
              }}>
                <i className="fa-solid fa-plus me-2"></i> أضف وثيقة أخرى
              </button>
            </div>

            <div className="section-card">
              <div className="section-header">
                <i className="fa-solid fa-list-check"></i>
                <h4>بيانات المطالبة</h4>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                <div className="field-group">
                  <div className="premium-label">
                    <span>رقم المطالبة</span>
                    <div className="form-check form-switch m-0 p-0 d-flex align-items-center gap-2 ms-auto">
                      <label className="form-check-label text-muted" style={{ fontSize: '0.65rem' }}>تلقائي</label>
                      <input className="form-check-input m-0" type="checkbox" role="switch"
                        style={{ cursor: 'pointer', transform: 'scale(0.8)' }}
                        checked={claimData.claim_number_auto}
                        onChange={(e) => setClaimData({ ...claimData, claim_number_auto: e.target.checked })}
                      />
                    </div>
                  </div>
                  <input type="text" className="premium-field"
                    value={claimData.claim_number}
                    onChange={(e) => setClaimData({ ...claimData, claim_number: e.target.value })}
                    disabled={claimData.claim_number_auto}
                    placeholder={claimData.claim_number_auto ? "توليد تلقائي..." : "أدخل رقم المطالبة"}
                  />
                </div>

                <div className="field-group">
                  <label className="premium-label">الرقم الإشاري (اختياري)</label>
                  <input type="text" className="premium-field"
                    value={claimData.reference_number}
                    onChange={(e) => setClaimData({ ...claimData, reference_number: e.target.value })}
                    placeholder="رقم مرجعي..."
                  />
                </div>

                <div className="field-group">
                  <label className="premium-label">تاريخ المطالبة</label>
                  <input type="date" className="premium-field" required
                    value={claimData.claim_date}
                    onChange={(e) => setClaimData({ ...claimData, claim_date: e.target.value })}
                  />
                </div>

                <div className="field-group">
                  <label className="premium-label">تاريخ الحادث</label>
                  <input type="date" className="premium-field" required
                    value={claimData.accident_date}
                    onChange={(e) => setClaimData({ ...claimData, accident_date: e.target.value })}
                  />
                </div>

                <div className="field-group" style={{ gridColumn: 'span 2' }}>
                  <label className="premium-label">نوع الأضرار</label>
                  <div className="d-flex gap-3 align-items-center p-2 rounded-3" style={{ background: 'var(--panel)', border: '1px solid var(--border)', minHeight: '44px' }}>
                    {['بدني', 'مادي', 'معنوي'].map(type => (
                      <label key={type} className="m-0 d-flex align-items-center gap-2 cursor-pointer px-3 py-1 rounded-pill"
                        style={{ background: isDamageTypeSelected(type) ? 'var(--accent-cyan)' : 'transparent', color: isDamageTypeSelected(type) ? 'white' : 'inherit', transition: 'all 0.2s' }}>
                        <input type="checkbox" className="form-check-input m-0 d-none"
                          checked={isDamageTypeSelected(type)}
                          onChange={() => toggleDamageType(type)} />
                        <i className={`fa-solid ${type === 'بدني' ? 'fa-user-injured' : type === 'مادي' ? 'fa-car-burst' : 'fa-brain'} ${isDamageTypeSelected(type) ? 'text-white' : 'var(--accent-cyan)'}`}></i>
                        <span className="fw-bold small">{type}</span>
                      </label>
                    ))}
                    <label className="m-0 d-flex align-items-center gap-2 cursor-pointer px-3 py-1 rounded-pill ms-2"
                      style={{ background: isDamageTypeSelected('اخر') ? 'var(--accent-cyan)' : 'transparent', color: isDamageTypeSelected('اخر') ? 'white' : 'inherit', transition: 'all 0.2s' }}>
                      <input type="checkbox" className="form-check-input m-0 d-none"
                        checked={isDamageTypeSelected('اخر')}
                        onChange={() => toggleDamageType('اخر')} />
                      <i className={`fa-solid fa-ellipsis ${isDamageTypeSelected('اخر') ? 'text-white' : 'var(--accent-cyan)'}`}></i>
                      <span className="fw-bold small">آخر</span>
                    </label>
                    {isDamageTypeSelected('اخر') && (
                      <input type="text" className="premium-field ms-auto py-0 px-3"
                        style={{ width: '250px', height: '32px', fontSize: '0.8rem', borderRadius: '8px' }}
                        value={claimData.other_damage_type}
                        onChange={(e) => setClaimData({ ...claimData, other_damage_type: e.target.value })}
                        placeholder="صف نوع الضرر..."
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="field-group">
                  <label className="premium-label">اسم مقدم المطالبة</label>
                  <input type="text" className="premium-field" required
                    value={claimData.claimant_name}
                    onChange={(e) => setClaimData({ ...claimData, claimant_name: e.target.value })}
                    placeholder="الاسم الكامل..."
                  />
                </div>

                <div className="field-group">
                  <label className="premium-label">صلة القرابة</label>
                  <input type="text" className="premium-field" required
                    value={claimData.kinship}
                    onChange={(e) => setClaimData({ ...claimData, kinship: e.target.value })}
                    placeholder="المؤمن له، إلخ..."
                  />
                </div>

                <div className="field-group">
                  <label className="premium-label">إثبات شخصي</label>
                  <input type="text" className="premium-field" required
                    value={claimData.personal_id}
                    onChange={(e) => setClaimData({ ...claimData, personal_id: e.target.value })}
                    placeholder="رقم البطاقة..."
                  />
                </div>

                <div className="field-group">
                  <label className="premium-label">الجنسية</label>
                  <input type="text" className="premium-field" required
                    value={claimData.nationality}
                    onChange={(e) => setClaimData({ ...claimData, nationality: e.target.value })}
                    placeholder="الجنسية..."
                  />
                </div>

                <div className="field-group">
                  <label className="premium-label">رقم الهاتف</label>
                  <input type="text" className="premium-field" required
                    value={claimData.phone_number}
                    onChange={(e) => setClaimData({ ...claimData, phone_number: e.target.value })}
                    placeholder="091XXXXXXX"
                  />
                </div>
                <div className="field-group">
                  <label className="premium-label">رقم الشيك / الإيصال (اختياري)</label>
                  <input type="text" className="premium-field"
                    value={claimData.claimant_check_number}
                    onChange={(e) => setClaimData({ ...claimData, claimant_check_number: e.target.value })}
                    placeholder="رقم الشيك..."
                  />
                </div>
                <div className="field-group">
                  <label className="premium-label">مكان الحادث</label>
                  <input type="text" className="premium-field"
                    value={claimData.accident_location}
                    onChange={(e) => setClaimData({ ...claimData, accident_location: e.target.value })}
                    placeholder="المكان..."
                  />
                </div>
                <div className="field-group">
                  <label className="premium-label">وقت الحادث</label>
                  <input type="time" className="premium-field"
                    value={claimData.accident_time}
                    onChange={(e) => setClaimData({ ...claimData, accident_time: e.target.value })}
                  />
                </div>
                <div className="field-group" style={{ gridColumn: 'span 2' }}>
                  <label className="premium-label d-flex align-items-center gap-3">
                    <span>هل يوجد وفيات؟</span>
                    <input type="checkbox" className="form-check-input m-0"
                      checked={claimData.has_fatalities}
                      onChange={(e) => setClaimData({ ...claimData, has_fatalities: e.target.checked })}
                    />
                    <span style={{ color: claimData.has_fatalities ? '#ef4444' : 'var(--muted)', fontWeight: 700 }}>
                      {claimData.has_fatalities ? 'نعم' : 'لا'}
                    </span>
                  </label>
                  {claimData.has_fatalities && (
                    <div className="mt-2 d-flex align-items-center gap-2">
                      <label className="premium-label text-danger mb-0">عدد القتلى:</label>
                      <input type="number" className="premium-field border-danger py-1"
                        style={{ width: '100px', height: '36px' }}
                        value={claimData.fatalities_count}
                        onChange={(e) => setClaimData({ ...claimData, fatalities_count: e.target.value })}
                        placeholder="العدد..."
                      />
                    </div>
                  )}
                </div>
                <div className="field-group">
                  <label className="premium-label">الرقم الإداري (اختياري)</label>
                  <input type="text" className="premium-field"
                    value={claimData.admin_number}
                    onChange={(e) => setClaimData({ ...claimData, admin_number: e.target.value })}
                    placeholder="الرقم الإداري..."
                  />
                </div>
              </div>
            </div>

            {/* ===== بيانات السائق ===== */}
            <div className="section-card">
              <div className="section-header"><i className="fa-solid fa-id-card"></i><h4>بيانات السائق</h4></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div className="field-group"><label className="premium-label">اسم السائق</label><input className="premium-field" value={claimData.driver_name} onChange={e => setClaimData({ ...claimData, driver_name: e.target.value })} placeholder="الاسم الكامل..." /></div>
                <div className="field-group"><label className="premium-label">الجنسية</label><input className="premium-field" value={claimData.driver_nationality} onChange={e => setClaimData({ ...claimData, driver_nationality: e.target.value })} placeholder="الجنسية..." /></div>
                <div className="field-group"><label className="premium-label">رقم الهوية</label><input className="premium-field" value={claimData.driver_id_number} onChange={e => setClaimData({ ...claimData, driver_id_number: e.target.value })} placeholder="رقم الهوية..." /></div>
                <div className="field-group"><label className="premium-label">رقم رخصة القيادة</label><input className="premium-field" value={claimData.driver_license_number} onChange={e => setClaimData({ ...claimData, driver_license_number: e.target.value })} placeholder="رقم الرخصة..." /></div>
                <div className="field-group"><label className="premium-label">تاريخ إصدار الرخصة</label><input type="date" className="premium-field" value={claimData.driver_license_issue_date} onChange={e => setClaimData({ ...claimData, driver_license_issue_date: e.target.value })} /></div>
                <div className="field-group"><label className="premium-label">تاريخ انتهاء الرخصة</label><input type="date" className="premium-field" value={claimData.driver_license_expiry_date} onChange={e => setClaimData({ ...claimData, driver_license_expiry_date: e.target.value })} /></div>
                <div className="field-group"><label className="premium-label">صورة السائق</label><input type="file" accept="image/*" className="premium-field" style={{ fontSize: '0.8rem' }} onChange={e => setDriverPhoto(e.target.files?.[0] || null)} /></div>
                <div className="field-group"><label className="premium-label">صورة رخصة القيادة</label><input type="file" accept="image/*" className="premium-field" style={{ fontSize: '0.8rem' }} onChange={e => setDriverLicensePhoto(e.target.files?.[0] || null)} /></div>
              </div>
            </div>

             {/* ===== بيانات الجسم المتضرر ===== */}
             <div className="section-card">
               <div className="section-header"><i className="fa-solid fa-car-burst"></i><h4>بيانات الجسم المتضرر</h4></div>
               <div className="d-flex gap-3 mb-3">
                 {['سيارة', 'شخص', 'مبنى'].map(t => (
                   <label key={t} className="d-flex align-items-center gap-2 px-3 py-2 rounded-3"
                     style={{ background: isDamagedBodyTypeSelected(t) ? 'var(--accent-cyan)' : 'var(--input-bg)', color: isDamagedBodyTypeSelected(t) ? 'white' : 'inherit', border: '1.5px solid var(--border)', cursor: 'pointer', fontWeight: 700 }}>
                     <input type="checkbox" className="d-none" checked={isDamagedBodyTypeSelected(t)} onChange={() => toggleDamagedBodyType(t)} />
                     <i className={`fa-solid ${t === 'سيارة' ? 'fa-car' : t === 'شخص' ? 'fa-person' : 'fa-building'}`}></i>{t}
                   </label>
                 ))}
               </div>
               {isDamagedBodyTypeSelected('سيارة') && (
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px', borderBottom: '1px dashed var(--border)', paddingBottom: '20px' }}>
                   <h5 style={{ gridColumn: 'span 2', fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: 0 }}><i className="fa-solid fa-car me-2"></i>أضرار المركبة</h5>
                   <div className="field-group"><label className="premium-label">موديل السيارة المتضررة</label><input className="premium-field" value={claimData.damaged_vehicle_model} onChange={e => setClaimData({ ...claimData, damaged_vehicle_model: e.target.value })} placeholder="الموديل..." /></div>
                   <div className="field-group"><label className="premium-label">رقم لوحة السيارة</label><input className="premium-field" value={claimData.damaged_vehicle_plate} onChange={e => setClaimData({ ...claimData, damaged_vehicle_plate: e.target.value })} placeholder="رقم اللوحة..." /></div>
                   <div className="field-group"><label className="premium-label">ورشة التصليح</label><input className="premium-field" value={claimData.damaged_vehicle_repair_shop} onChange={e => setClaimData({ ...claimData, damaged_vehicle_repair_shop: e.target.value })} placeholder="اسم وعنوان الورشة..." /></div>
                   <div className="field-group"><label className="premium-label">مبلغ الأضرار (دينار)</label><input type="number" className="premium-field" value={claimData.damaged_vehicle_amount} onChange={e => setClaimData({ ...claimData, damaged_vehicle_amount: e.target.value })} placeholder="0.000" /></div>
                   <div className="field-group"><label className="premium-label">بيانات أضرار السيارة</label><input className="premium-field" value={claimData.damaged_vehicle_details} onChange={e => setClaimData({ ...claimData, damaged_vehicle_details: e.target.value })} placeholder="كسر زجاج أمامي، إلخ..." /></div>
                   <div className="field-group" style={{ gridColumn: 'span 2' }}><label className="premium-label">صور الأضرار (يمكن اختيار أكثر من صورة)</label><input type="file" accept="image/*" multiple className="premium-field" style={{ fontSize: '0.8rem' }} onChange={e => setDamagedVehiclePhotos(Array.from(e.target.files || []))} /></div>
                 </div>
               )}
               {isDamagedBodyTypeSelected('شخص') && (
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '20px', borderBottom: '1px dashed var(--border)', paddingBottom: '20px' }}>
                   <h5 style={{ gridColumn: 'span 2', fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: 0 }}><i className="fa-solid fa-person me-2"></i>أضرار الشخص/الإصابة الجسدية</h5>
                   <div className="field-group"><label className="premium-label">اسم الشخص المتضرر</label><input className="premium-field" value={claimData.damaged_person_name} onChange={e => setClaimData({ ...claimData, damaged_person_name: e.target.value })} placeholder="الاسم الكامل..." /></div>
                   <div className="field-group"><label className="premium-label">مبلغ الأضرار (دينار)</label><input type="number" className="premium-field" value={claimData.damaged_person_amount} onChange={e => setClaimData({ ...claimData, damaged_person_amount: e.target.value })} placeholder="0.000" /></div>
                   <div className="field-group"><label className="premium-label">بيانات أضرار الشخص</label><input className="premium-field" value={claimData.damaged_person_details} onChange={e => setClaimData({ ...claimData, damaged_person_details: e.target.value })} placeholder="كسر في اليد، إلخ..." /></div>
                   <div className="field-group" style={{ gridColumn: 'span 2' }}><label className="premium-label">صور الأضرار</label><input type="file" accept="image/*" multiple className="premium-field" style={{ fontSize: '0.8rem' }} onChange={e => setDamagedPersonPhotos(Array.from(e.target.files || []))} /></div>
                 </div>
               )}
               {isDamagedBodyTypeSelected('مبنى') && (
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                   <h5 style={{ gridColumn: 'span 2', fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: 0 }}><i className="fa-solid fa-building me-2"></i>أضرار المبنى/الممتلكات</h5>
                   <div className="field-group" style={{ gridColumn: 'span 2' }}><label className="premium-label">وصف المبنى المتضرر</label><input className="premium-field" value={claimData.damaged_building_description} onChange={e => setClaimData({ ...claimData, damaged_building_description: e.target.value })} placeholder="وصف الضرر..." /></div>
                   <div className="field-group"><label className="premium-label">مبلغ الأضرار (دينار)</label><input type="number" className="premium-field" value={claimData.damaged_building_amount} onChange={e => setClaimData({ ...claimData, damaged_building_amount: e.target.value })} placeholder="0.000" /></div>
                   <div className="field-group"><label className="premium-label">صور الأضرار</label><input type="file" accept="image/*" multiple className="premium-field" style={{ fontSize: '0.8rem' }} onChange={e => setDamagedBuildingPhotos(Array.from(e.target.files || []))} /></div>
                 </div>
               )}
             </div>

            {/* ===== بيانات وثيقة تأمين المتضرر ===== */}
            <div className="section-card">
              <div className="section-header"><i className="fa-solid fa-shield-halved"></i><h4>بيانات وثيقة تأمين المتضرر</h4></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div className="field-group"><label className="premium-label">اسم شركة التأمين</label><input className="premium-field" value={claimData.victim_insurance_company} onChange={e => setClaimData({ ...claimData, victim_insurance_company: e.target.value })} placeholder="شركة التأمين..." /></div>
                <div className="field-group"><label className="premium-label">رقم الوثيقة</label><input className="premium-field" value={claimData.victim_insurance_number} onChange={e => setClaimData({ ...claimData, victim_insurance_number: e.target.value })} placeholder="رقم الوثيقة..." /></div>
                <div className="field-group"><label className="premium-label">نوع الوثيقة</label><input className="premium-field" value={claimData.victim_insurance_type} onChange={e => setClaimData({ ...claimData, victim_insurance_type: e.target.value })} placeholder="شامل / طرف ثالث..." /></div>
                <div className="field-group"><label className="premium-label">تغطية الوثيقة</label><input className="premium-field" value={claimData.victim_insurance_coverage} onChange={e => setClaimData({ ...claimData, victim_insurance_coverage: e.target.value })} placeholder="المسؤولية المدنية..." /></div>
                <div className="field-group"><label className="premium-label">تاريخ إصدار الوثيقة</label><input type="date" className="premium-field" value={claimData.victim_insurance_issue_date} onChange={e => setClaimData({ ...claimData, victim_insurance_issue_date: e.target.value })} /></div>
                <div className="field-group"><label className="premium-label">تاريخ انتهاء الوثيقة</label><input type="date" className="premium-field" value={claimData.victim_insurance_expiry_date} onChange={e => setClaimData({ ...claimData, victim_insurance_expiry_date: e.target.value })} /></div>
                <div className="field-group"><label className="premium-label">صورة الوثيقة</label><input type="file" accept="image/*" className="premium-field" style={{ fontSize: '0.8rem' }} onChange={e => setVictimInsurancePhoto(e.target.files?.[0] || null)} /></div>
              </div>
            </div>

            {/* ===== تقرير مقدر الأضرار ===== */}
            <div className="section-card">
              <div className="section-header"><i className="fa-solid fa-calculator"></i><h4>تقرير مقدر الأضرار</h4></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <div className="field-group"><label className="premium-label">اسم مقدر الأضرار</label><input className="premium-field" value={claimData.assessor_name} onChange={e => setClaimData({ ...claimData, assessor_name: e.target.value })} placeholder="الاسم..." /></div>
                <div className="field-group"><label className="premium-label">رقم الهاتف</label><input className="premium-field" value={claimData.assessor_phone} onChange={e => setClaimData({ ...claimData, assessor_phone: e.target.value })} placeholder="091..." /></div>
                <div className="field-group"><label className="premium-label">تاريخ التقييم</label><input type="date" className="premium-field" value={claimData.assessor_date} onChange={e => setClaimData({ ...claimData, assessor_date: e.target.value })} /></div>
                <div className="field-group"><label className="premium-label">نسبة تقدير الأضرار</label><input className="premium-field" value={claimData.assessor_percentage} onChange={e => setClaimData({ ...claimData, assessor_percentage: e.target.value })} placeholder="%75" /></div>
                <div className="field-group"><label className="premium-label">قيمة الأضرار (دينار)</label><input type="number" className="premium-field" value={claimData.assessor_amount_dinar} onChange={e => setClaimData({ ...claimData, assessor_amount_dinar: e.target.value })} placeholder="0.000" /></div>
                <div className="field-group"><label className="premium-label">قيمة الأضرار (دولار)</label><input type="number" className="premium-field" value={claimData.assessor_amount_dollar} onChange={e => setClaimData({ ...claimData, assessor_amount_dollar: e.target.value })} placeholder="0.00" /></div>
                <div className="field-group"><label className="premium-label">أضف قيمة أخرى</label><input className="premium-field" value={claimData.assessor_other_amount} onChange={e => setClaimData({ ...claimData, assessor_other_amount: e.target.value })} placeholder="تونس. مصر" /></div>
                <div className="field-group"><label className="premium-label">صورة تقرير المقدر</label><input type="file" accept="image/*" className="premium-field" style={{ fontSize: '0.8rem' }} onChange={e => setAssessorReportPhoto(e.target.files?.[0] || null)} /></div>
              </div>
            </div>

            {/* ===== تفاصيل تكاليف الأضرار ===== */}
            <div className="section-card">
              <div className="section-header"><i className="fa-solid fa-file-invoice-dollar"></i><h4>تفاصيل تكاليف الأضرار (تحويل المطالبة)</h4></div>
              
              {claimData.damaged_body_type === 'سيارة' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div className="field-group"><label className="premium-label">١اضف قطع السياره المتضرره والسعر</label><input type="text" className="premium-field" value={damageCosts.vehicle.parts_amount} onChange={e => setDamageCosts({...damageCosts, vehicle: {...damageCosts.vehicle, parts_amount: e.target.value}})} placeholder="القطع المتضررة والسعر..." /></div>
                  <div className="field-group"><label className="premium-label">٢ اسم وعنوان محل قطع الغيار</label><input type="text" className="premium-field" value={damageCosts.vehicle.parts_shop} onChange={e => setDamageCosts({...damageCosts, vehicle: {...damageCosts.vehicle, parts_shop: e.target.value}})} placeholder="اسم وعنوان المحل..." /></div>
                  <div className="field-group"><label className="premium-label">صورة فاتورة قطع الغيار</label><input type="file" className="premium-field py-1" style={{ fontSize: '0.8rem' }} onChange={e => setDamageCostInvoices({...damageCostInvoices, vehicle_parts_invoice: e.target.files?.[0]})} /></div>
                  
                  <div className="field-group"><label className="premium-label">اسم وعنوان ورشة تصليح السيارات والتكلفة</label><input type="text" className="premium-field" value={damageCosts.vehicle.repair_amount} onChange={e => setDamageCosts({...damageCosts, vehicle: {...damageCosts.vehicle, repair_amount: e.target.value}})} placeholder="اسم الورشة والتكلفة..." /></div>
                  <div className="field-group"></div>
                  <div className="field-group"><label className="premium-label">صورة فاتورة الورشة</label><input type="file" className="premium-field py-1" style={{ fontSize: '0.8rem' }} onChange={e => setDamageCostInvoices({...damageCostInvoices, vehicle_repair_invoice: e.target.files?.[0]})} /></div>
                  
                  <div className="field-group"><label className="premium-label">مصاريف أخرى</label><input type="number" className="premium-field" value={damageCosts.vehicle.other_amount} onChange={e => setDamageCosts({...damageCosts, vehicle: {...damageCosts.vehicle, other_amount: e.target.value}})} placeholder="0.000" /></div>
                  <div className="field-group"><label className="premium-label fw-bold" style={{ color: 'var(--brand)' }}>المجموع العام</label><input type="number" className="premium-field fw-bold text-success" value={damageCosts.vehicle.total_amount} onChange={e => setDamageCosts({...damageCosts, vehicle: {...damageCosts.vehicle, total_amount: e.target.value}})} placeholder="0.000" /></div>
                  <div className="field-group"><label className="premium-label">صورة فاتورة مصاريف أخرى</label><input type="file" className="premium-field py-1" style={{ fontSize: '0.8rem' }} onChange={e => setDamageCostInvoices({...damageCostInvoices, vehicle_other_invoice: e.target.files?.[0]})} /></div>
                </div>
              )}
              
              {claimData.damaged_body_type === 'شخص' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div className="field-group"><label className="premium-label">١اضف أسعار العمليات وايواء مستشفى</label><input type="number" className="premium-field" value={damageCosts.person.hospital_amount} onChange={e => setDamageCosts({...damageCosts, person: {...damageCosts.person, hospital_amount: e.target.value}})} placeholder="0.000" /></div>
                  <div className="field-group"><label className="premium-label">٢ اسم وعنوان المستشفى</label><input type="text" className="premium-field" value={damageCosts.person.hospital_name} onChange={e => setDamageCosts({...damageCosts, person: {...damageCosts.person, hospital_name: e.target.value}})} placeholder="اسم وعنوان المستشفى..." /></div>
                  <div className="field-group"><label className="premium-label">صورة فاتورة المستشفى</label><input type="file" className="premium-field py-1" style={{ fontSize: '0.8rem' }} onChange={e => setDamageCostInvoices({...damageCostInvoices, person_hospital_invoice: e.target.files?.[0]})} /></div>
                  
                  <div className="field-group"><label className="premium-label">اضف أسعار الادويه والتحاليل الطبيه</label><input type="number" className="premium-field" value={damageCosts.person.medical_tests_amount} onChange={e => setDamageCosts({...damageCosts, person: {...damageCosts.person, medical_tests_amount: e.target.value}})} placeholder="0.000" /></div>
                  <div className="field-group"></div>
                  <div className="field-group"><label className="premium-label">فاتورة الأدوية والتحاليل</label><input type="file" className="premium-field py-1" style={{ fontSize: '0.8rem' }} onChange={e => setDamageCostInvoices({...damageCostInvoices, person_medical_tests_invoice: e.target.files?.[0]})} /></div>
                  
                  <div className="field-group"><label className="premium-label">مصاريف أخرى</label><input type="number" className="premium-field" value={damageCosts.person.other_amount} onChange={e => setDamageCosts({...damageCosts, person: {...damageCosts.person, other_amount: e.target.value}})} placeholder="0.000" /></div>
                  <div className="field-group"><label className="premium-label fw-bold" style={{ color: 'var(--brand)' }}>المجموع العام</label><input type="number" className="premium-field fw-bold text-success" value={damageCosts.person.total_amount} onChange={e => setDamageCosts({...damageCosts, person: {...damageCosts.person, total_amount: e.target.value}})} placeholder="0.000" /></div>
                  <div className="field-group"><label className="premium-label">صورة فاتورة أخرى</label><input type="file" className="premium-field py-1" style={{ fontSize: '0.8rem' }} onChange={e => setDamageCostInvoices({...damageCostInvoices, person_other_invoice: e.target.files?.[0]})} /></div>
                </div>
              )}
              
              {claimData.damaged_body_type === 'مبنى' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div className="field-group"><label className="premium-label">١اضف أسعار مواد البناء المطلوبة</label><input type="number" className="premium-field" value={damageCosts.building.materials_amount} onChange={e => setDamageCosts({...damageCosts, building: {...damageCosts.building, materials_amount: e.target.value}})} placeholder="0.000" /></div>
                  <div className="field-group"><label className="premium-label">٢ اسم وعنوان محل مواد البناء</label><input type="text" className="premium-field" value={damageCosts.building.materials_shop} onChange={e => setDamageCosts({...damageCosts, building: {...damageCosts.building, materials_shop: e.target.value}})} placeholder="اسم وعنوان المحل..." /></div>
                  <div className="field-group"><label className="premium-label">صورة فاتورة مواد البناء</label><input type="file" className="premium-field py-1" style={{ fontSize: '0.8rem' }} onChange={e => setDamageCostInvoices({...damageCostInvoices, building_materials_invoice: e.target.files?.[0]})} /></div>
                  
                  <div className="field-group"><label className="premium-label">أضف أسعار تكلفه البناء والترميم</label><input type="number" className="premium-field" value={damageCosts.building.labor_amount} onChange={e => setDamageCosts({...damageCosts, building: {...damageCosts.building, labor_amount: e.target.value}})} placeholder="0.000" /></div>
                  <div className="field-group"><label className="premium-label">ثمن الصيانة للسيارة (أو المبنى)</label><input type="number" className="premium-field" value={damageCosts.building.maintenance_amount} onChange={e => setDamageCosts({...damageCosts, building: {...damageCosts.building, maintenance_amount: e.target.value}})} placeholder="0.000" /></div>
                  <div className="field-group"><label className="premium-label">فاتورة العمالة أو الصيانة</label><input type="file" className="premium-field py-1" style={{ fontSize: '0.8rem' }} onChange={e => setDamageCostInvoices({...damageCostInvoices, building_labor_invoice: e.target.files?.[0]})} /></div>
                  
                  <div className="field-group"><label className="premium-label">مصاريف أخرى</label><input type="number" className="premium-field" value={damageCosts.building.other_amount} onChange={e => setDamageCosts({...damageCosts, building: {...damageCosts.building, other_amount: e.target.value}})} placeholder="0.000" /></div>
                  <div className="field-group"><label className="premium-label fw-bold" style={{ color: 'var(--brand)' }}>المجموع العام</label><input type="number" className="premium-field fw-bold text-success" value={damageCosts.building.total_amount} onChange={e => setDamageCosts({...damageCosts, building: {...damageCosts.building, total_amount: e.target.value}})} placeholder="0.000" /></div>
                  <div className="field-group"><label className="premium-label">صورة فاتورة أخرى</label><input type="file" className="premium-field py-1" style={{ fontSize: '0.8rem' }} onChange={e => setDamageCostInvoices({...damageCostInvoices, building_other_invoice: e.target.files?.[0]})} /></div>
                </div>
              )}
            </div>

            <div className="section-card">
              <div className="section-header justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <i className="fa-solid fa-file-pdf"></i>
                  <h4>التقارير المرفقة</h4>
                </div>
                <button type="button" className="btn btn-sm" style={{ background: 'var(--accent-cyan)', color: 'white', borderRadius: '10px', fontWeight: 700 }} onClick={handleAddReportType}>
                  <i className="fa-solid fa-plus me-2"></i> إضافة نوع تقرير
                </button>
              </div>

              <div className="report-header">
                <div>نوع التقرير</div>
                <div>تاريخ التقرير</div>
                <div>معد التقرير</div>
                <div>رقم التقرير</div>
                <div>ملف التقرير</div>
                <div></div>
              </div>

              <div className="reports-container">
                {reports.map((report, index) => (
                  <div className="report-row" key={report.id}>
                    <div>
                      {report.report_type === 'اخر' ? (
                        <input type="text" className="premium-field py-1"
                          placeholder="نوع التقرير..."
                          value={report.other_report_type}
                          onChange={(e) => handleReportChange(index, 'other_report_type', e.target.value)}
                        />
                      ) : (
                        <div className="fw-bold" style={{ color: 'var(--text)' }}>{report.report_type}</div>
                      )}
                    </div>
                    <div>
                      <input type="date" className="premium-field py-1"
                        value={report.report_date}
                        onChange={(e) => handleReportChange(index, 'report_date', e.target.value)}
                      />
                    </div>
                    <div>
                      <input type="text" className="premium-field py-1"
                        placeholder="الاسم..."
                        value={report.preparer_name}
                        onChange={(e) => handleReportChange(index, 'preparer_name', e.target.value)}
                      />
                    </div>
                    <div>
                      <input type="text" className="premium-field py-1"
                        placeholder="رقم..."
                        value={report.report_number}
                        onChange={(e) => handleReportChange(index, 'report_number', e.target.value)}
                      />
                    </div>
                    <div>
                      <input type="file" className="premium-field py-1" style={{ fontSize: '0.7rem' }}
                        onChange={(e) => handleReportChange(index, 'file', e.target.files?.[0])}
                      />
                    </div>
                    <div className="text-center">
                      <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => removeReport(index)}>
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="premium-modal-footer">
            <button type="button" className="btn btn-link text-muted fw-bold text-decoration-none px-4" onClick={onClose}>
              إلغاء
            </button>
            <button type="submit" className="save-btn" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <><i className="fa-solid fa-cloud-upload me-2"></i> {claim ? 'تحديث المطالبة' : 'حفظ وتقديم المطالبة'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
