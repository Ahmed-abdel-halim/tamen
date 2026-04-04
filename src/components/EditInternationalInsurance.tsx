import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from 'react-router-dom';

type VehicleType = {
  id: number;
  brand: string;
  category: string;
};

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

export default function EditInternationalInsurance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    insured_name: '',
    insured_address: '',
    phone: '',
    chassis_number: '',
    plate_number: '',
    vehicle_type_id: '',
    year: '',
    vehicle_nationality: 'ليبية- LBY' as 'ليبية- LBY',
    visited_country: '' as '' | 'تونس' | 'الجزائر' | 'تونس و الجزائر' | 'مصر',
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Select2 states
  const [vehicleTypeSearch, setVehicleTypeSearch] = useState("");
  const [showVehicleTypeDropdown, setShowVehicleTypeDropdown] = useState(false);
  const vehicleTypeDropdownRef = useRef<HTMLDivElement>(null);

  const [yearSearch, setYearSearch] = useState("");
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchVehicleTypes();
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
    const premium = typeof formData.premium === 'number' ? formData.premium : parseFloat(String(formData.premium)) || 0;
    const tax = typeof formData.tax === 'number' ? formData.tax : parseFloat(String(formData.tax)) || 0;
    const supervisionFees = typeof formData.supervision_fees === 'number' ? formData.supervision_fees : parseFloat(String(formData.supervision_fees)) || 0;
    const issueFees = typeof formData.issue_fees === 'number' ? formData.issue_fees : parseFloat(String(formData.issue_fees)) || 0;
    const stamp = typeof formData.stamp === 'number' ? formData.stamp : parseFloat(String(formData.stamp)) || 0;
    const total = premium + tax + supervisionFees + issueFees + stamp;
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

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/international-insurance-documents/${id}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        if (res.status === 404) {
          setToast({ message: 'الوثيقة غير موجودة', type: 'error' });
          setTimeout(() => navigate('/international-insurance-documents'), 2000);
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setFormData({
        insured_name: data.insured_name || '',
        insured_address: data.insured_address || '',
        phone: data.phone || '',
        chassis_number: data.chassis_number || '',
        plate_number: data.plate_number || '',
        vehicle_type_id: data.vehicle_type_id ? data.vehicle_type_id.toString() : '',
        year: data.year ? data.year.toString() : '',
        vehicle_nationality: data.vehicle_nationality || 'ليبية- LBY',
        visited_country: data.visited_country || '',
        start_date: data.start_date || '',
        number_of_days: data.number_of_days ? data.number_of_days.toString() : '',
        end_date: data.end_date || '',
        item_type: data.item_type || '',
        number_of_countries: data.number_of_countries || 1,
        daily_premium: typeof data.daily_premium === 'number' ? data.daily_premium : parseFloat(data.daily_premium) || 0,
        premium: typeof data.premium === 'number' ? data.premium : parseFloat(data.premium) || 0,
        tax: typeof data.tax === 'number' ? data.tax : parseFloat(data.tax) || 0,
        supervision_fees: typeof data.supervision_fees === 'number' ? data.supervision_fees : parseFloat(data.supervision_fees) || 0,
        issue_fees: typeof data.issue_fees === 'number' ? data.issue_fees : parseFloat(data.issue_fees) || 10.000,
        stamp: typeof data.stamp === 'number' ? data.stamp : parseFloat(data.stamp) || 0.250,
        total: typeof data.total === 'number' ? data.total : parseFloat(data.total) || 0,
      });
    } catch (error: any) {
      setToast({
        message: `حدث خطأ أثناء جلب البيانات: ${error.message || ''}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.insured_name.trim()) {
      errors.insured_name = 'اسم المؤمن مطلوب';
    }
    if (!formData.start_date) {
      errors.start_date = 'من يوم مطلوب';
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
      
      const res = await fetch(`/api/international-insurance-documents/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...formData,
          vehicle_type_id: formData.vehicle_type_id ? parseInt(formData.vehicle_type_id) : null,
          year: formData.year ? parseInt(formData.year) : null,
          number_of_days: parseInt(formData.number_of_days),
          number_of_countries: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFormErrors(data.errors);
        }
        throw new Error(data.message || 'حدث خطأ أثناء تحديث الوثيقة');
      }

      setToast({ message: 'تم تحديث الوثيقة بنجاح', type: 'success' });
      setTimeout(() => {
        navigate('/international-insurance-documents');
      }, 1500);
    } catch (error: any) {
      setToast({
        message: error.message || 'حدث خطأ أثناء تحديث الوثيقة',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // الحصول على قائمة فريدة من العلامات التجارية (بدون تكرار)
  const uniqueBrands = Array.from(new Set(vehicleTypes.map(vt => vt.brand)))
    .filter(brand => brand.toLowerCase().includes(vehicleTypeSearch.toLowerCase()))
    .sort();

  const filteredYears = YEARS.filter(year => 
    year.toString().includes(yearSearch)
  );

  const selectedVehicleType = vehicleTypes.find(vt => vt.id.toString() === formData.vehicle_type_id);
  const selectedBrand = selectedVehicleType ? selectedVehicleType.brand : '';

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>تأمين السيارات الدولي / تعديل وثيقة</span>
      </div>

      <div className="users-card">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>جار التحميل...</p>
        ) : (
          <div className="form-page-container">
            <div className="form-page-header">
              <h2 className="form-page-title">
                تعديل وثيقة تأمين دولي
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
                                onMouseEnter={(e) => {
                                  if (selectedBrand !== brand) {
                                    e.currentTarget.style.backgroundColor = '#f9fafb';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (selectedBrand !== brand) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }
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
                      onChange={(e) => setFormData({ ...formData, vehicle_nationality: e.target.value as 'ليبية- LBY' })}
                    >
                      <option value="ليبية- LBY">ليبية- LBY</option>
                    </select>
                  </div>

                <div className="form-group">
                  <label htmlFor="visited_country">البلد المزار</label>
                  <select
                    id="visited_country"
                    value={formData.visited_country}
                    onChange={(e) => setFormData({ ...formData, visited_country: e.target.value as any })}
                  >
                    <option value="">اختر البلد المزار</option>
                    <option value="تونس">تونس</option>
                    <option value="الجزائر">الجزائر</option>
                    <option value="تونس و الجزائر">تونس و الجزائر</option>
                    <option value="مصر">مصر</option>
                  </select>
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
                      value={typeof formData.premium === 'number' && formData.premium > 0 ? formData.premium.toFixed(0) : (formData.premium || '')}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="tax">الضريبة</label>
                    <input
                      type="number"
                      id="tax"
                      value={typeof formData.tax === 'number' ? formData.tax.toFixed(3) : (parseFloat(String(formData.tax)) || 0).toFixed(3)}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="supervision_fees">الإشراف</label>
                    <input
                      type="number"
                      id="supervision_fees"
                      value={typeof formData.supervision_fees === 'number' ? formData.supervision_fees.toFixed(3) : (parseFloat(String(formData.supervision_fees)) || 0).toFixed(3)}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="issue_fees">الإصدار</label>
                    <input
                      type="number"
                      id="issue_fees"
                      value={typeof formData.issue_fees === 'number' ? formData.issue_fees.toFixed(3) : (parseFloat(String(formData.issue_fees)) || 0).toFixed(3)}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="stamp">دمغة المحررات</label>
                    <input
                      type="number"
                      id="stamp"
                      value={typeof formData.stamp === 'number' ? formData.stamp.toFixed(3) : (parseFloat(String(formData.stamp)) || 0).toFixed(3)}
                      disabled
                      style={{ background: '#f3f4f6', color: '#6b7280' }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="total">الإجمالي</label>
                    <input
                      type="text"
                      id="total"
                      value={`${typeof formData.total === 'number' ? formData.total.toFixed(3) : (parseFloat(String(formData.total)) || 0).toFixed(3)} دينار`}
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

