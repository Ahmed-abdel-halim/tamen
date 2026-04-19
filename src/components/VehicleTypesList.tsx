import { useEffect, useState } from "react";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

type VehicleType = {
  id: number;
  brand: string;
  category: string;
};

export default function VehicleTypesList() {
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<null | { mode: 'add' | 'edit', vehicleType?: VehicleType }>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    brand: '',
    category: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<null | VehicleType>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    fetchVehicleTypes();
  }, []);



  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, vehicleTypes.length]);

  const fetchVehicleTypes = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/vehicle-types`, {
        headers: {
          'Accept': 'application/json',
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setVehicleTypes(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching vehicle types:', error);
      showToast(`حدث خطأ أثناء جلب أنواع السيارات: ${error.message || ''}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showForm?.mode === 'edit' && showForm.vehicleType) {
      setFormData({
        brand: showForm.vehicleType.brand || '',
        category: showForm.vehicleType.category || ''
      });
    } else {
      setFormData({
        brand: '',
        category: ''
      });
    }
    setFormErrors({});
  }, [showForm]);

  const filteredVehicleTypes = vehicleTypes.filter(vt => 
    vt.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vt.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalVehicleTypes = filteredVehicleTypes.length;
  const totalPages = totalVehicleTypes > 0 ? Math.ceil(totalVehicleTypes / perPage) : 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedVehicleTypes = filteredVehicleTypes.slice(startIndex, endIndex);

  const handleDeleteClick = (vehicleType: VehicleType) => {
    setDeleteConfirmation(vehicleType);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vehicle-types/${deleteConfirmation.id}`, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        }
      });
      if (!res.ok) {
        throw new Error(`خطأ ${res.status}`);
      }
      setVehicleTypes(vehicleTypes.filter(vt => vt.id !== deleteConfirmation.id));
      setDeleteConfirmation(null);
      showToast('تم حذف نوع المركبة بنجاح', 'success');
    } catch (error: any) {
      console.error('Error deleting vehicle type:', error);
      showToast(`حدث خطأ أثناء حذف نوع المركبة: ${error.message || 'تأكد من أن الخادم يعمل'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.brand.trim()) {
      errors.brand = 'العلامة التجارية مطلوبة';
    }
    if (!formData.category.trim()) {
      errors.category = 'الفئة مطلوبة';
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
        ? `${API_BASE_URL}/vehicle-types/${showForm.vehicleType?.id}` 
        : `${API_BASE_URL}/vehicle-types`;
      
      const method = showForm?.mode === 'edit' ? 'PUT' : 'POST';
      
      const body: any = {
        brand: formData.brand,
        category: formData.category,
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

      await fetchVehicleTypes();
      setShowForm(null);
      setFormData({ brand: '', category: '' });
      showToast(showForm?.mode === 'add' ? 'تم إضافة نوع المركبة بنجاح' : 'تم تحديث نوع المركبة بنجاح', 'success');
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء حفظ نوع المركبة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>الإعدادات / أنواع السيارات / قائمة أنواع السيارات</span>
      </div>
      
      <div className="users-card">
        <div className="users-header">
          <div className="users-search-bar">
            <input 
              type="text" 
              placeholder="بحث بالعلامة التجارية أو الفئة..." 
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
            إضافة نوع مركبة
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
                    <th>العلامة التجارية</th>
                    <th>الفئة</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicleTypes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-table-cell" style={{ textAlign: 'center', padding: '40px 20px', fontSize: '16px', color: '#6b7280' }}>
                        <i className="fa-solid fa-inbox" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', opacity: 0.5 }}></i>
                        لا توجد نتائج
                      </td>
                    </tr>
                  ) : (
                    paginatedVehicleTypes.map((vt, index) => (
                      <tr key={vt.id}>
                        <td>{startIndex + index + 1}</td>
                        <td>{vt.brand}</td>
                        <td>{vt.category}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="action-btn edit" 
                              onClick={() => setShowForm({ mode: 'edit', vehicleType: vt })}
                              aria-label="تعديل"
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pencil"></i>
                            </button>
                            <button 
                              className="action-btn delete" 
                              onClick={() => handleDeleteClick(vt)}
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
              {filteredVehicleTypes.length === 0 ? (
                <div className="empty-state">لا توجد نتائج</div>
              ) : (
                paginatedVehicleTypes.map((vt, index) => (
                  <div key={vt.id} className="user-mobile-card">
                    <div className="user-mobile-header">
                      <div>
                        <h4 className="user-mobile-title">{vt.brand}</h4>
                        <span className="user-mobile-number">#{startIndex + index + 1}</span>
                      </div>
                    </div>
                    <div className="user-mobile-body">
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">الفئة:</span>
                        <span className="user-mobile-value">{vt.category}</span>
                      </div>
                      <div className="user-mobile-actions">
                        <button 
                          className="action-btn edit" 
                          onClick={() => setShowForm({ mode: 'edit', vehicleType: vt })}
                          aria-label="تعديل"
                          title="تعديل"
                        >
                          <i className="fa-solid fa-pencil"></i>
                        </button>
                        <button 
                          className="action-btn delete" 
                          onClick={() => handleDeleteClick(vt)}
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

            {totalVehicleTypes > perPage && (
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  عرض {startIndex + 1}
                  {' إلى '}
                  {Math.min(endIndex, totalVehicleTypes)}
                  {' من '}
                  {totalVehicleTypes}
                  {' نوع'}
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
              <h3>{showForm.mode === 'add' ? 'إضافة نوع مركبة جديد' : 'تعديل نوع مركبة'}</h3>
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
                <label htmlFor="brand">العلامة التجارية <span className="required">*</span></label>
                <input
                  type="text"
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  className={formErrors.brand ? 'error' : ''}
                  placeholder="أدخل العلامة التجارية (مثل: كيا)"
                />
                {formErrors.brand && <span className="error-message">{formErrors.brand}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="category">الفئة <span className="required">*</span></label>
                <input
                  type="text"
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className={formErrors.category ? 'error' : ''}
                  placeholder="أدخل الفئة (مثل: سبورتاج)"
                />
                {formErrors.category && <span className="error-message">{formErrors.category}</span>}
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
              هل أنت متأكد من حذف نوع المركبة <strong>{deleteConfirmation.brand} - {deleteConfirmation.category}</strong>؟
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
