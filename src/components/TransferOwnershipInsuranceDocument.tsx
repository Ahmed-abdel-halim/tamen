import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';

type Plate = {
  id: number;
  plate_number: string;
  city: {
    id: number;
    name_ar: string;
    name_en: string;
  };
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
  vehicle_type?: {
    id: number;
    brand: string;
    category: string;
  };
  color?: string;
  year?: number;
  fuel_type?: string;
  license_purpose?: string;
  engine_power?: string;
  authorized_passengers?: number;
  load_capacity?: number;
  insured_name?: string;
  phone?: string;
  driving_license_number?: string;
  premium: number;
  print_type?: string;
};

export default function TransferOwnershipInsuranceDocument() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [originalDocument, setOriginalDocument] = useState<InsuranceDocument | null>(null);
  const [formData, setFormData] = useState({
    plate_id: '',
    plate_number_manual: '',
    insured_name: '',
    phone: '',
    driving_license_number: '',
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Select2 states
  const [plateSearch, setPlateSearch] = useState("");
  const [showPlateDropdown, setShowPlateDropdown] = useState(false);
  const plateDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPlates();
    if (id) {
      fetchDocument();
    }
  }, [id]);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // تحديث رقم اللوحة المعدنية عند اختيار الجهة المقيد بها
  useEffect(() => {
    if (formData.plate_id) {
      const selectedPlate = plates.find(p => p.id === parseInt(formData.plate_id));
      if (selectedPlate) {
        setFormData(prev => ({
          ...prev,
          plate_number_manual: selectedPlate.plate_number
        }));
      }
    }
  }, [formData.plate_id, plates]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/insurance-documents/${id}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) {
        throw new Error('فشل في جلب الوثيقة');
      }
      const data: InsuranceDocument = await res.json();
      setOriginalDocument(data);
      
      // ملء النموذج بالبيانات الحالية
      setFormData({
        plate_id: data.plate?.id?.toString() || '',
        plate_number_manual: data.plate_number_manual || '',
        insured_name: data.insured_name || '',
        phone: data.phone || '',
        driving_license_number: data.driving_license_number || '',
      });
    } catch (error: any) {
      setToast({
        message: error.message || 'حدث خطأ أثناء جلب الوثيقة',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

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

  const selectedPlate = plates.find(p => p.id === parseInt(formData.plate_id));
  const isMandatoryInsurance = originalDocument?.insurance_type === 'تأمين إجباري سيارات';
  const isThirdPartyInsurance = originalDocument?.insurance_type === 'تأمين طرف ثالث سيارات';

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if ((isMandatoryInsurance || isThirdPartyInsurance) && !formData.plate_id) {
      errors.plate_id = 'الجهة المقيد بها مطلوبة';
    }
    
    if (!formData.insured_name) {
      errors.insured_name = 'اسم المؤمن مطلوب';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/insurance-documents/${id}/transfer-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          plate_id: (isMandatoryInsurance || isThirdPartyInsurance) ? (formData.plate_id ? parseInt(formData.plate_id) : null) : null,
          plate_number_manual: formData.plate_number_manual || null,
          insured_name: formData.insured_name,
          phone: formData.phone || null,
          driving_license_number: formData.driving_license_number || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFormErrors(data.errors);
        }
        throw new Error(data.message || 'حدث خطأ أثناء نقل الملكية');
      }

      setToast({ message: 'تم نقل الملكية بنجاح', type: 'success' });
      setTimeout(() => {
        navigate(`/insurance-documents/${id}`);
      }, 1000);
    } catch (error: any) {
      setToast({
        message: error.message || 'حدث خطأ أثناء نقل الملكية',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-LY');
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString('ar-LY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <section className="users-management">
        <div className="users-breadcrumb">
          <span>وثائق تأمين السيارات / نقل ملكية</span>
        </div>
        <div className="users-card">
          <p style={{ textAlign: 'center', padding: '20px' }}>جار التحميل...</p>
        </div>
      </section>
    );
  }

  if (!originalDocument) {
    return (
      <section className="users-management">
        <div className="users-breadcrumb">
          <span>وثائق تأمين السيارات / نقل ملكية</span>
        </div>
        <div className="users-card">
          <p style={{ textAlign: 'center', padding: '20px' }}>الوثيقة غير موجودة</p>
        </div>
      </section>
    );
  }

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>وثائق تأمين السيارات / نقل ملكية</span>
      </div>

      <div className="users-card">
        <div className="form-page-container">
          <div className="form-page-header">
            <h2 className="form-page-title">
              نقل ملكية وثيقة تأمين
            </h2>
            <button 
              className="btn-cancel" 
              onClick={() => navigate(`/insurance-documents/${id}`)}
            >
              <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i>
              العودة
            </button>
          </div>

          <form onSubmit={handleSubmit} className="user-form" style={{ maxWidth: '100%' }}>
            {/* البيانات غير القابلة للتعديل */}
            <div className="form-section">
              <h3 className="form-section-title">بيانات الوثيقة (غير قابلة للتعديل)</h3>
              
              <div className="form-group">
                <label>رقم التأمين</label>
                <input
                  type="text"
                  value={originalDocument.insurance_number}
                  disabled
                  style={{ background: '#f3f4f6', color: '#6b7280' }}
                />
              </div>

              <div className="form-group">
                <label>نوع التأمين</label>
                <input
                  type="text"
                  value={originalDocument.insurance_type}
                  disabled
                  style={{ background: '#f3f4f6', color: '#6b7280' }}
                />
              </div>

              <div className="form-group">
                <label>تاريخ الإصدار</label>
                <input
                  type="text"
                  value={formatDateTime(originalDocument.issue_date)}
                  disabled
                  style={{ background: '#f3f4f6', color: '#6b7280' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>تاريخ البداية</label>
                  <input
                    type="text"
                    value={formatDate(originalDocument.start_date)}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>
                <div className="form-group">
                  <label>تاريخ النهاية</label>
                  <input
                    type="text"
                    value={originalDocument.end_date ? formatDate(originalDocument.end_date) : '-'}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>مدة التأمين</label>
                <input
                  type="text"
                  value={originalDocument.duration || '-'}
                  disabled
                  style={{ background: '#f3f4f6', color: '#6b7280' }}
                />
              </div>
            </div>

            {/* بيانات المركبة (غير قابلة للتعديل) */}
            <div className="form-section">
              <h3 className="form-section-title">بيانات المركبة (غير قابلة للتعديل)</h3>
              
              <div className="form-group">
                <label>رقم الهيكل</label>
                <input
                  type="text"
                  value={originalDocument.chassis_number || '-'}
                  disabled
                  style={{ background: '#f3f4f6', color: '#6b7280' }}
                />
              </div>

              <div className="form-group">
                <label>نوع المركبة</label>
                <input
                  type="text"
                  value={
                    originalDocument.vehicle_type
                      ? `${originalDocument.vehicle_type.brand}${originalDocument.vehicle_type.category ? ' / ' + originalDocument.vehicle_type.category : ''}`
                      : '-'
                  }
                  disabled
                  style={{ background: '#f3f4f6', color: '#6b7280' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>اللون</label>
                  <input
                    type="text"
                    value={originalDocument.color || '-'}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>
                <div className="form-group">
                  <label>السنة</label>
                  <input
                    type="text"
                    value={originalDocument.year || '-'}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>نوع الوقود</label>
                  <input
                    type="text"
                    value={originalDocument.fuel_type || '-'}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>
                <div className="form-group">
                  <label>الغرض من الترخيص</label>
                  <input
                    type="text"
                    value={originalDocument.license_purpose || '-'}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>قوة المحرك</label>
                  <input
                    type="text"
                    value={originalDocument.engine_power || '-'}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>
                <div className="form-group">
                  <label>الركاب المصرح بهم</label>
                  <input
                    type="text"
                    value={originalDocument.authorized_passengers || '-'}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>
                <div className="form-group">
                  <label>الحمولة بالطن</label>
                  <input
                    type="text"
                    value={originalDocument.load_capacity || '-'}
                    disabled
                    style={{ background: '#f3f4f6', color: '#6b7280' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>القسط</label>
                <input
                  type="text"
                  value={`${Number(originalDocument.premium).toFixed(3)} د.ل`}
                  disabled
                  style={{ background: '#f3f4f6', color: '#6b7280' }}
                />
              </div>
            </div>

            {/* البيانات القابلة للتعديل */}
            <div className="form-section">
              <h3 className="form-section-title">بيانات المؤمن له (قابلة للتعديل)</h3>
              
              {/* الجهة المقيد بها - تظهر عند تأمين إجباري أو طرف ثالث فقط */}
              {(isMandatoryInsurance || isThirdPartyInsurance) && (
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="plate_number_manual">رقم اللوحة المعدنية</label>
                  <input
                    type="text"
                    id="plate_number_manual"
                    value={formData.plate_number_manual}
                    onChange={(e) => setFormData({ ...formData, plate_number_manual: e.target.value })}
                    placeholder="سيتم ملؤه تلقائياً عند اختيار الجهة المقيد بها"
                  />
                </div>
                {(isMandatoryInsurance || isThirdPartyInsurance) && (
                  <div className="form-group">
                    <label>رقم اللوحة</label>
                    <input
                      type="text"
                      value={selectedPlate ? selectedPlate.plate_number : ''}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>
                )}
              </div>

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
                  <label htmlFor="driving_license_number">رقم رخصة القيادة</label>
                  <input
                    type="text"
                    id="driving_license_number"
                    value={formData.driving_license_number}
                    onChange={(e) => setFormData({ ...formData, driving_license_number: e.target.value })}
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
                {submitting ? 'جاري الحفظ...' : 'نقل الملكية'}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/insurance-documents/${id}`)}
                disabled={submitting}
                className="btn-cancel"
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

