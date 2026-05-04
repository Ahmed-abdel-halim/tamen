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
  options: {value: string, label: string}[], 
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
  const [availableDocuments, setAvailableDocuments] = useState<{insurance_number: string, insured_name: string}[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [documentData, setDocumentData] = useState<any>(null);
  const [documentCoverage, setDocumentCoverage] = useState(claim?.document_coverage || '');

  // Claim Data
  const [claimData, setClaimData] = useState({
    claim_number: claim?.claim_number || '',
    claim_number_auto: !claim?.claim_number,
    reference_number: claim?.reference_number || '',
    claim_date: claim?.claim_date || new Date().toISOString().split('T')[0],
    accident_date: claim?.accident_date || '',
    damage_type: claim?.damage_type || 'مادي',
    other_damage_type: claim?.other_damage_type || '',
    claimant_name: claim?.claimant_name || '',
    kinship: claim?.kinship || '',
    personal_id: claim?.personal_id || '',
    nationality: claim?.nationality || '',
    phone_number: claim?.phone_number || '',
  });

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
        try { const e = await response.json(); errMsg = e?.message || errMsg; } catch {}
        showToast(errMsg, 'error');
        return;
      }
      const data = await response.json();
      setDocumentData(data);
      showToast('تم العثور على الوثيقة بنجاح', 'success');
      
      // Auto fill claimant name if empty
      if (!claimData.claimant_name && data.insured_name) {
        setClaimData({...claimData, claimant_name: data.insured_name, kinship: 'المؤمن له'});
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
        if (key === 'claim_number') {
          formData.append(key, finalClaimNumber);
        } else {
          formData.append(key, (claimData as any)[key]);
        }
      });
      formData.append('document_type', documentType);
      if (documentData) {
        formData.append('document_id', documentData.id);
      }
      formData.append('document_coverage', documentCoverage);

      // Branch Agent ID from localStorage
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.id && !claim) {
        formData.append('branch_agent_id', user.branch_agent_id || user.id);
      }

      // Append reports
      formData.append('reports_count', reports.length.toString());
      reports.forEach((report, index) => {
        formData.append(`reports_${index}_report_type`, report.report_type);
        formData.append(`reports_${index}_other_report_type`, report.other_report_type || '');
        formData.append(`reports_${index}_report_date`, report.report_date);
        formData.append(`reports_${index}_preparer_name`, report.preparer_name);
        formData.append(`reports_${index}_report_number`, report.report_number);
        if (report.file) {
          formData.append(`reports_${index}_report_image`, report.file);
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
      showToast('حدث خطأ أثناء حفظ المطالبة: ' + (error.response?.data?.message || ''), 'error');
      console.error(error.response?.data);
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

          {documentData && (
            <div className="section-card" style={{ background: 'color-mix(in srgb, var(--accent-cyan) 5%, var(--panel))', borderColor: 'var(--accent-shadow)' }}>
              <div className="row g-3">
                <div className="col-md-3">
                  <div className="info-pill">
                    <div className="label">اسم المؤمن له</div>
                    <div className="value">{documentData.insured_name || 'غير متوفر'}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="info-pill">
                    <div className="label">تاريخ الإصدار</div>
                    <div className="value">{safeFormatDate(documentData.issue_date)}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="info-pill">
                    <div className="label">تاريخ الانتهاء</div>
                    <div className="value">{safeFormatDate(documentData.end_date)}</div>
                  </div>
                </div>
                {documentData.vehicleType?.name && (
                  <div className="col-md-3">
                    <div className="info-pill">
                      <div className="label">نوع السيارة</div>
                      <div className="value">{documentData.vehicleType.name}</div>
                    </div>
                  </div>
                )}
                
                <div className="col-md-12 mt-3">
                  <label className="premium-label fw-bold" style={{ color: 'var(--accent-cyan)' }}>نوع تغطية المطالبة</label>
                  <div className="d-flex flex-wrap gap-4 p-3 rounded-4" style={{ background: 'var(--panel)', border: '1px solid var(--border)' }}>
                    <label className="form-check-label d-flex align-items-center gap-2 cursor-pointer">
                      <input type="radio" name="docCoverage" className="form-check-input m-0" 
                        checked={documentCoverage === 'تغطية شاملة'} onChange={() => setDocumentCoverage('تغطية شاملة')} />
                      <span className="fw-bold">تغطية شاملة</span>
                    </label>
                    <label className="form-check-label d-flex align-items-center gap-2 cursor-pointer">
                      <input type="radio" name="docCoverage" className="form-check-input m-0" 
                        checked={documentCoverage === 'طرف ثالث'} onChange={() => setDocumentCoverage('طرف ثالث')} />
                      <span className="fw-bold">طرف ثالث</span>
                    </label>
                    <label className="d-flex align-items-center gap-3">
                      <div className="d-flex align-items-center gap-2 cursor-pointer">
                        <input type="radio" name="docCoverage" className="form-check-input m-0" 
                          checked={!['تغطية شاملة', 'طرف ثالث', ''].includes(documentCoverage) && documentCoverage !== ''} 
                          onChange={() => setDocumentCoverage('اخر')} />
                        <span className="fw-bold">نوع آخر:</span>
                      </div>
                      {(!['تغطية شاملة', 'طرف ثالث', ''].includes(documentCoverage) || documentCoverage === 'اخر') && (
                        <input type="text" className="premium-field py-1" style={{ width: '200px' }}
                          value={documentCoverage === 'اخر' ? '' : documentCoverage}
                          onChange={(e) => setDocumentCoverage(e.target.value)}
                          placeholder="أدخل نوع التغطية"
                        />
                      )}
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

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
                      onChange={(e) => setClaimData({...claimData, claim_number_auto: e.target.checked})}
                    />
                  </div>
                </div>
                <input type="text" className="premium-field" 
                  value={claimData.claim_number}
                  onChange={(e) => setClaimData({...claimData, claim_number: e.target.value})}
                  disabled={claimData.claim_number_auto}
                  placeholder={claimData.claim_number_auto ? "توليد تلقائي..." : "أدخل رقم المطالبة"}
                />
              </div>

              <div className="field-group">
                <label className="premium-label">الرقم الإشاري (اختياري)</label>
                <input type="text" className="premium-field" 
                  value={claimData.reference_number}
                  onChange={(e) => setClaimData({...claimData, reference_number: e.target.value})}
                  placeholder="رقم مرجعي..."
                />
              </div>

              <div className="field-group">
                <label className="premium-label">تاريخ المطالبة</label>
                <input type="date" className="premium-field" required
                  value={claimData.claim_date}
                  onChange={(e) => setClaimData({...claimData, claim_date: e.target.value})}
                />
              </div>

              <div className="field-group">
                <label className="premium-label">تاريخ الحادث</label>
                <input type="date" className="premium-field" required
                  value={claimData.accident_date}
                  onChange={(e) => setClaimData({...claimData, accident_date: e.target.value})}
                />
              </div>

              <div className="field-group" style={{ gridColumn: 'span 2' }}>
                <label className="premium-label">نوع الأضرار</label>
                <div className="d-flex gap-3 align-items-center p-2 rounded-3" style={{ background: 'var(--panel)', border: '1px solid var(--border)', minHeight: '44px' }}>
                  {['بدني', 'مادي'].map(type => (
                    <label key={type} className="m-0 d-flex align-items-center gap-2 cursor-pointer px-3 py-1 rounded-pill" 
                           style={{ background: claimData.damage_type === type ? 'var(--accent-cyan)' : 'transparent', color: claimData.damage_type === type ? 'white' : 'inherit', transition: 'all 0.2s' }}>
                      <input type="radio" className="form-check-input m-0 d-none" 
                        checked={claimData.damage_type === type} 
                        onChange={() => setClaimData({...claimData, damage_type: type})} />
                      <i className={`fa-solid ${type === 'بدني' ? 'fa-user-injured' : 'fa-car-burst'} ${claimData.damage_type === type ? 'text-white' : 'var(--accent-cyan)'}`}></i>
                      <span className="fw-bold small">{type}</span>
                    </label>
                  ))}
                  <label className="m-0 d-flex align-items-center gap-2 cursor-pointer px-3 py-1 rounded-pill ms-2"
                         style={{ background: claimData.damage_type === 'اخر' ? 'var(--accent-cyan)' : 'transparent', color: claimData.damage_type === 'اخر' ? 'white' : 'inherit', transition: 'all 0.2s' }}>
                    <input type="radio" className="form-check-input m-0 d-none" 
                      checked={claimData.damage_type === 'اخر'} 
                      onChange={() => setClaimData({...claimData, damage_type: 'اخر'})} />
                    <i className={`fa-solid fa-ellipsis ${claimData.damage_type === 'اخر' ? 'text-white' : 'var(--accent-cyan)'}`}></i>
                    <span className="fw-bold small">آخر</span>
                  </label>
                  {claimData.damage_type === 'اخر' && (
                    <input type="text" className="premium-field ms-auto py-0 px-3" 
                      style={{ width: '250px', height: '32px', fontSize: '0.8rem', borderRadius: '8px' }}
                      value={claimData.other_damage_type}
                      onChange={(e) => setClaimData({...claimData, other_damage_type: e.target.value})}
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
                  onChange={(e) => setClaimData({...claimData, claimant_name: e.target.value})}
                  placeholder="الاسم الكامل..."
                />
              </div>

              <div className="field-group">
                <label className="premium-label">صلة القرابة</label>
                <input type="text" className="premium-field" required
                  value={claimData.kinship}
                  onChange={(e) => setClaimData({...claimData, kinship: e.target.value})}
                  placeholder="المؤمن له، إلخ..."
                />
              </div>

              <div className="field-group">
                <label className="premium-label">إثبات شخصي</label>
                <input type="text" className="premium-field" required
                  value={claimData.personal_id}
                  onChange={(e) => setClaimData({...claimData, personal_id: e.target.value})}
                  placeholder="رقم البطاقة..."
                />
              </div>

              <div className="field-group">
                <label className="premium-label">الجنسية</label>
                <input type="text" className="premium-field" required
                  value={claimData.nationality}
                  onChange={(e) => setClaimData({...claimData, nationality: e.target.value})}
                  placeholder="الجنسية..."
                />
              </div>

              <div className="field-group" style={{ gridColumn: 'span 2' }}>
                <label className="premium-label">رقم الهاتف</label>
                <input type="text" className="premium-field" required
                  value={claimData.phone_number}
                  onChange={(e) => setClaimData({...claimData, phone_number: e.target.value})}
                  placeholder="091XXXXXXX"
                />
              </div>
            </div>
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
