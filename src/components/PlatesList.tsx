import { useEffect, useState, useRef } from "react";
import { showToast } from "./Toast";

type City = {
  id: number;
  name_ar: string;
  name_en: string;
};

type Plate = {
  id: number;
  plate_number: string;
  city_id: number;
  city: City;
};

export default function PlatesList() {
  const [plates, setPlates] = useState<Plate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<null | { mode: 'add' | 'edit', plate?: Plate }>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    plate_number: '',
    city_id: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<null | Plate>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  // Select2 for cities
  const [cities, setCities] = useState<City[]>([]);
  const [citySearch, setCitySearch] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPlates();
    fetchCities();
  }, []);



  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, plates.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showForm?.mode === 'edit' && showForm.plate) {
      setFormData({
        plate_number: showForm.plate.plate_number || '',
        city_id: showForm.plate.city_id.toString() || ''
      });
    } else {
      setFormData({
        plate_number: '',
        city_id: ''
      });
    }
    setFormErrors({});
    setCitySearch("");
  }, [showForm]);

  const fetchPlates = async () => {
    try {
      const res = await fetch('/api/plates', {
        headers: {
          'Accept': 'application/json',
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setPlates(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching plates:', error);
      showToast(`حدث خطأ أثناء جلب اللوحات: ${error.message || 'تأكد من أن الخادم يعمل على http://localhost:8000'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const res = await fetch('/api/cities', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setCities(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const filteredPlates = plates.filter(p => 
    p.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.name_en.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPlates = filteredPlates.length;
  const totalPages = totalPlates > 0 ? Math.ceil(totalPlates / perPage) : 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedPlates = filteredPlates.slice(startIndex, endIndex);

  const filteredCities = cities.filter(c => 
    c.name_ar.toLowerCase().includes(citySearch.toLowerCase()) ||
    c.name_en.toLowerCase().includes(citySearch.toLowerCase())
  );

  const handleDeleteClick = (plate: Plate) => {
    setDeleteConfirmation(plate);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/plates/${deleteConfirmation.id}`, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        }
      });
      if (!res.ok) {
        throw new Error(`خطأ ${res.status}`);
      }
      setPlates(plates.filter(p => p.id !== deleteConfirmation.id));
      setDeleteConfirmation(null);
      showToast('تم حذف اللوحة بنجاح', 'success');
    } catch (error: any) {
      console.error('Error deleting plate:', error);
      showToast(`حدث خطأ أثناء حذف اللوحة: ${error.message || 'تأكد من أن الخادم يعمل'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.plate_number.trim()) {
      errors.plate_number = 'رقم اللوحة مطلوب';
    }
    if (!formData.city_id) {
      errors.city_id = 'المدينة مطلوبة';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = showForm?.mode === 'edit' 
        ? `/api/plates/${showForm.plate?.id}` 
        : '/api/plates';
      
      const method = showForm?.mode === 'edit' ? 'PUT' : 'POST';
      
      const body: any = {
        plate_number: formData.plate_number,
        city_id: parseInt(formData.city_id),
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let errorMessage = 'حدث خطأ';
        try {
          const error = await res.json();
          errorMessage = error.message || error.error || errorMessage;
          if (error.errors) {
            setFormErrors(error.errors);
          }
        } catch (e) {
          errorMessage = `خطأ ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      await fetchPlates();
      setShowForm(null);
      setFormData({ plate_number: '', city_id: '' });
      showToast(showForm?.mode === 'add' ? 'تم إضافة اللوحة بنجاح' : 'تم تحديث اللوحة بنجاح', 'success');
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء حفظ اللوحة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCity = cities.find(c => c.id === parseInt(formData.city_id));

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>الإعدادات / اللوحات / قائمة اللوحات</span>
      </div>
      
      <div className="users-card">
        <div className="users-header">
          <div className="users-search-bar">
            <input 
              type="text" 
              placeholder="بحث برقم اللوحة أو المدينة..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="users-search-input"
            />
            <button className="users-search-btn" type="button">
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
          <button 
            className="primary add-user-btn" 
            onClick={() => setShowForm({ mode: 'add' })}
          >
            <i className="fa-solid fa-plus"></i>
            إضافة لوحة
          </button>
        </div>

        {loading ? (
          <p style={{textAlign: 'center', padding: '20px'}}>جار التحميل...</p>
        ) : (
          <>
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>رقم اللوحة</th>
                    <th>المدينة (عربي)</th>
                    <th>المدينة (إنجليزي)</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="empty-table-cell" style={{ textAlign: 'center', padding: '40px 20px', fontSize: '16px', color: '#6b7280' }}>
                        <i className="fa-solid fa-inbox" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', opacity: 0.5 }}></i>
                        لا توجد نتائج
                      </td>
                    </tr>
                  ) : (
                    paginatedPlates.map((p, index) => (
                      <tr key={p.id}>
                        <td>{startIndex + index + 1}</td>
                        <td>{p.plate_number}</td>
                        <td>{p.city.name_ar}</td>
                        <td>{p.city.name_en}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="action-btn edit" 
                              onClick={() => setShowForm({ mode: 'edit', plate: p })}
                              aria-label="تعديل"
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pencil"></i>
                            </button>
                            <button 
                              className="action-btn delete" 
                              onClick={() => handleDeleteClick(p)}
                              aria-label="حذف"
                              title="حذف"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="users-mobile-cards">
              {filteredPlates.length === 0 ? (
                <div className="empty-state">لا توجد نتائج</div>
              ) : (
                paginatedPlates.map((p, index) => (
                  <div key={p.id} className="user-mobile-card">
                    <div className="user-mobile-header">
                      <div>
                        <h4 className="user-mobile-title">{p.plate_number}</h4>
                        <span className="user-mobile-number">#{startIndex + index + 1}</span>
                      </div>
                    </div>
                    <div className="user-mobile-body">
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">المدينة (عربي):</span>
                        <span className="user-mobile-value">{p.city.name_ar}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">المدينة (إنجليزي):</span>
                        <span className="user-mobile-value">{p.city.name_en}</span>
                      </div>
                      <div className="user-mobile-actions">
                        <button 
                          className="action-btn edit" 
                          onClick={() => setShowForm({ mode: 'edit', plate: p })}
                          aria-label="تعديل"
                          title="تعديل"
                        >
                          <i className="fa-solid fa-pencil"></i>
                        </button>
                        <button 
                          className="action-btn delete" 
                          onClick={() => handleDeleteClick(p)}
                          aria-label="حذف"
                          title="حذف"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {totalPlates > perPage && (
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  عرض {startIndex + 1}
                  {' إلى '}
                  {Math.min(endIndex, totalPlates)}
                  {' من '}
                  {totalPlates}
                  {' لوحة'}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn pagination-prev"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                    <span className="pagination-btn-text">السابق</span>
                  </button>
                  {(() => {
                    const items: (number | 'dots')[] = [];
                    if (totalPages <= 3) {
                      for (let p = 1; p <= totalPages; p++) {
                        items.push(p);
                      }
                    } else {
                      items.push(1);
                      let start = Math.max(2, currentPage - 1);
                      let end = Math.min(totalPages - 1, currentPage + 1);
                      if (start > 2) items.push('dots');
                      for (let p = start; p <= end; p++) items.push(p);
                      if (end < totalPages - 1) items.push('dots');
                      items.push(totalPages);
                    }
                    return items.map((item, idx) =>
                      item === 'dots' ? (
                        <span key={`dots-${idx}`} className="pagination-dots">...</span>
                      ) : (
                        <button
                          key={item}
                          className={`pagination-btn pagination-number ${currentPage === item ? 'active' : ''}`}
                          onClick={() => setCurrentPage(item as number)}
                        >
                          {item}
                        </button>
                      )
                    );
                  })()}
                  <button
                    className="pagination-btn pagination-next"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <span className="pagination-btn-text">التالي</span>
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <div className="modal" onClick={(e) => {
          if (e.target === e.currentTarget) setShowForm(null);
        }}>
          <div className="modal-content user-form-modal">
            <div className="modal-header">
              <h3>{showForm.mode === 'add' ? 'إضافة لوحة جديدة' : 'تعديل لوحة'}</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowForm(null)}
                aria-label="إغلاق"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label htmlFor="plate_number">رقم اللوحة <span className="required">*</span></label>
                <input
                  type="text"
                  id="plate_number"
                  value={formData.plate_number}
                  onChange={(e) => setFormData({...formData, plate_number: e.target.value})}
                  className={formErrors.plate_number ? 'error' : ''}
                  placeholder="أدخل رقم اللوحة"
                />
                {formErrors.plate_number && <span className="error-message">{formErrors.plate_number}</span>}
              </div>

              <div className="form-group" ref={cityDropdownRef} style={{ position: 'relative' }}>
                <label htmlFor="city_id">المدينة <span className="required">*</span></label>
                <div
                  onClick={() => {
                    setShowCityDropdown((v) => !v);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: formErrors.city_id ? '1px solid #ef4444' : '1px solid var(--border)',
                    borderRadius: 8,
                    background: 'var(--input-bg)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: 42,
                    color: 'var(--text)'
                  }}
                >
                  <span style={{ color: formData.city_id ? 'var(--text)' : 'var(--muted)' }}>
                    {selectedCity ? `${selectedCity.name_ar} - ${selectedCity.name_en}` : 'اختر المدينة...'}
                  </span>
                  <i
                    className={`fa-solid fa-chevron-${showCityDropdown ? 'up' : 'down'}`}
                    style={{ color: '#9ca3af' }}
                  ></i>
                </div>
                {showCityDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      marginTop: '4px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
                    }}
                  >
                    <div style={{ padding: '8px' }}>
                      <input
                        type="text"
                        placeholder="ابحث عن مدينة..."
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          marginBottom: '8px',
                          background: 'var(--input-bg)',
                          color: 'var(--text)'
                        }}
                      />
                    </div>
                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                      {filteredCities.length === 0 ? (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>
                          لا توجد نتائج
                        </div>
                      ) : (
                        filteredCities.map((city) => (
                          <div
                            key={city.id}
                            onClick={() => {
                              setFormData({ ...formData, city_id: city.id.toString() });
                              setShowCityDropdown(false);
                              setCitySearch('');
                            }}
                            style={{
                              padding: '10px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--border)',
                              backgroundColor: formData.city_id === city.id.toString() ? 'var(--hover-bg)' : 'transparent',
                              color: 'var(--text)'
                            }}
                            onMouseEnter={(e) => {
                              if (formData.city_id !== city.id.toString()) {
                                e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (formData.city_id !== city.id.toString()) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }
                            }}
                          >
                            <div style={{ fontWeight: 500, color: 'var(--text)' }}>{city.name_ar}</div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{city.name_en}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
                {formErrors.city_id && <span className="error-message">{formErrors.city_id}</span>}
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowForm(null)}
                  disabled={submitting}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="btn-submit" 
                  disabled={submitting}
                >
                  {submitting ? 'جاري الحفظ...' : (showForm.mode === 'add' ? 'إضافة' : 'حفظ التعديلات')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmation && (
        <div className="modal" onClick={(e) => {
          if (e.target === e.currentTarget && !deleting) setDeleteConfirmation(null);
        }}>
          <div className="modal-content delete-confirm-modal">
            <div className="delete-confirm-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>تأكيد الحذف</h3>
            <p className="delete-confirm-message">
              هل أنت متأكد من حذف اللوحة <strong>{deleteConfirmation.plate_number}</strong>؟
              <br />
              <span className="delete-warning">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            <div className="delete-confirm-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setDeleteConfirmation(null)}
                disabled={deleting}
              >
                إلغاء
              </button>
              <button 
                className="btn-delete-confirm" 
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
