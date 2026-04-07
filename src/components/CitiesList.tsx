import { useEffect, useState } from "react";
import { showToast } from "./Toast";

type City = {
  id: number;
  name_ar: string;
  name_en: string;
};

export default function CitiesList() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<null | { mode: 'add' | 'edit', city?: City }>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<null | City>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    fetchCities();
  }, []);



  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, cities.length]);

  const fetchCities = async () => {
    try {
      const res = await fetch('/api/cities', {
        headers: {
          'Accept': 'application/json',
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setCities(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching cities:', error);
      showToast(`حدث خطأ أثناء جلب المدن: ${error.message || 'تأكد من أن الخادم يعمل على http://localhost:8000'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showForm?.mode === 'edit' && showForm.city) {
      setFormData({
        name_ar: showForm.city.name_ar || '',
        name_en: showForm.city.name_en || ''
      });
    } else {
      setFormData({
        name_ar: '',
        name_en: ''
      });
    }
    setFormErrors({});
  }, [showForm]);

  const filteredCities = cities.filter(c => 
    c.name_ar.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.name_en.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCities = filteredCities.length;
  const totalPages = totalCities > 0 ? Math.ceil(totalCities / perPage) : 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedCities = filteredCities.slice(startIndex, endIndex);

  const handleDeleteClick = (city: City) => {
    setDeleteConfirmation(city);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/cities/${deleteConfirmation.id}`, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        }
      });
      if (!res.ok) {
        throw new Error(`خطأ ${res.status}`);
      }
      setCities(cities.filter(c => c.id !== deleteConfirmation.id));
      setDeleteConfirmation(null);
      showToast('تم حذف المدينة بنجاح', 'success');
    } catch (error: any) {
      console.error('Error deleting city:', error);
      showToast(`حدث خطأ أثناء حذف المدينة: ${error.message || 'تأكد من أن الخادم يعمل'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name_ar.trim()) {
      errors.name_ar = 'اسم المدينة بالعربي مطلوب';
    }
    if (!formData.name_en.trim()) {
      errors.name_en = 'اسم المدينة بالإنجليزي مطلوب';
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
        ? `/api/cities/${showForm.city?.id}` 
        : '/api/cities';
      
      const method = showForm?.mode === 'edit' ? 'PUT' : 'POST';
      
      const body: any = {
        name_ar: formData.name_ar,
        name_en: formData.name_en,
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

      await fetchCities();
      setShowForm(null);
      setFormData({ name_ar: '', name_en: '' });
      showToast(showForm?.mode === 'add' ? 'تم إضافة المدينة بنجاح' : 'تم تحديث المدينة بنجاح', 'success');
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء حفظ المدينة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>الإعدادات / المدن / قائمة المدن</span>
      </div>
      
      <div className="users-card">
        <div className="users-header">
          <div className="users-search-bar">
            <input 
              type="text" 
              placeholder="بحث باسم المدينة..." 
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
            إضافة مدينة
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
                    <th>اسم المدينة (عربي)</th>
                    <th>اسم المدينة (إنجليزي)</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-table-cell" style={{ textAlign: 'center', padding: '40px 20px', fontSize: '16px', color: '#6b7280' }}>
                        <i className="fa-solid fa-inbox" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', opacity: 0.5 }}></i>
                        لا توجد نتائج
                      </td>
                    </tr>
                  ) : (
                    paginatedCities.map((c, index) => (
                      <tr key={c.id}>
                        <td>{startIndex + index + 1}</td>
                        <td>{c.name_ar}</td>
                        <td>{c.name_en}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="action-btn edit" 
                              onClick={() => setShowForm({ mode: 'edit', city: c })}
                              aria-label="تعديل"
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pencil"></i>
                            </button>
                            <button 
                              className="action-btn delete" 
                              onClick={() => handleDeleteClick(c)}
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
              {filteredCities.length === 0 ? (
                <div className="empty-state">لا توجد نتائج</div>
              ) : (
                paginatedCities.map((c, index) => (
                  <div key={c.id} className="user-mobile-card">
                    <div className="user-mobile-header">
                      <div>
                        <h4 className="user-mobile-title">{c.name_ar}</h4>
                        <span className="user-mobile-number">#{startIndex + index + 1}</span>
                      </div>
                    </div>
                    <div className="user-mobile-body">
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">اسم المدينة (إنجليزي):</span>
                        <span className="user-mobile-value">{c.name_en}</span>
                      </div>
                      <div className="user-mobile-actions">
                        <button 
                          className="action-btn edit" 
                          onClick={() => setShowForm({ mode: 'edit', city: c })}
                          aria-label="تعديل"
                          title="تعديل"
                        >
                          <i className="fa-solid fa-pencil"></i>
                        </button>
                        <button 
                          className="action-btn delete" 
                          onClick={() => handleDeleteClick(c)}
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

            {totalCities > perPage && (
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  عرض {startIndex + 1}
                  {' إلى '}
                  {Math.min(endIndex, totalCities)}
                  {' من '}
                  {totalCities}
                  {' مدينة'}
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
              <h3>{showForm.mode === 'add' ? 'إضافة مدينة جديدة' : 'تعديل مدينة'}</h3>
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
                <label htmlFor="name_ar">اسم المدينة بالعربي <span className="required">*</span></label>
                <input
                  type="text"
                  id="name_ar"
                  value={formData.name_ar}
                  onChange={(e) => setFormData({...formData, name_ar: e.target.value})}
                  className={formErrors.name_ar ? 'error' : ''}
                  placeholder="أدخل اسم المدينة بالعربي"
                />
                {formErrors.name_ar && <span className="error-message">{formErrors.name_ar}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="name_en">اسم المدينة بالإنجليزي <span className="required">*</span></label>
                <input
                  type="text"
                  id="name_en"
                  value={formData.name_en}
                  onChange={(e) => setFormData({...formData, name_en: e.target.value})}
                  className={formErrors.name_en ? 'error' : ''}
                  placeholder="أدخل اسم المدينة بالإنجليزي"
                />
                {formErrors.name_en && <span className="error-message">{formErrors.name_en}</span>}
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
              هل أنت متأكد من حذف المدينة <strong>{deleteConfirmation.name_ar}</strong>؟
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
