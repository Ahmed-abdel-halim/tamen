import { useEffect, useState } from "react";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

type Color = {
  id: number;
  name: string;
};

export default function ColorsList() {
  const [colors, setColors] = useState<Color[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<null | { mode: 'add' | 'edit', color?: Color }>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    name: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<null | Color>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    fetchColors();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, colors.length]);

  const fetchColors = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/colors`, {
        headers: {
          'Accept': 'application/json',
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setColors(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching colors:', error);
      showToast(`حدث خطأ أثناء جلب الألوان: ${error.message || ''}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showForm?.mode === 'edit' && showForm.color) {
      setFormData({
        name: showForm.color.name || ''
      });
    } else {
      setFormData({
        name: ''
      });
    }
    setFormErrors({});
  }, [showForm]);

  const filteredColors = colors.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalColors = filteredColors.length;
  const totalPages = totalColors > 0 ? Math.ceil(totalColors / perPage) : 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedColors = filteredColors.slice(startIndex, endIndex);

  const handleDeleteClick = (color: Color) => {
    setDeleteConfirmation(color);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/colors/${deleteConfirmation.id}`, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        }
      });
      if (!res.ok) {
        throw new Error(`خطأ ${res.status}`);
      }
      setColors(colors.filter(c => c.id !== deleteConfirmation.id));
      setDeleteConfirmation(null);
      showToast('تم حذف اللون بنجاح', 'success');
    } catch (error: any) {
      console.error('Error deleting color:', error);
      showToast(`حدث خطأ أثناء حذف اللون: ${error.message || ''}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'اسم اللون مطلوب';
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
        ? `${API_BASE_URL}/colors/${showForm.color?.id}` 
        : `${API_BASE_URL}/colors`;
      
      const method = showForm?.mode === 'edit' ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ name: formData.name }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'حدث خطأ أثناء الحفظ');
      }

      await fetchColors();
      setShowForm(null);
      setFormData({ name: '' });
      showToast(showForm?.mode === 'add' ? 'تم إضافة اللون بنجاح' : 'تم تحديث اللون بنجاح', 'success');
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء حفظ اللون', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>الإعدادات / الألوان / قائمة الألوان</span>
      </div>
      
      <div className="users-card">
        <div className="users-header">
          <div className="users-search-bar">
            <input 
              type="text" 
              placeholder="بحث باسم اللون..." 
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
            إضافة لون
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
                    <th>اسم اللون</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredColors.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="empty-table-cell" style={{ textAlign: 'center', padding: '40px 20px', fontSize: '16px', color: '#6b7280' }}>
                        <i className="fa-solid fa-palette" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', opacity: 0.5 }}></i>
                        لا توجد نتائج
                      </td>
                    </tr>
                  ) : (
                    paginatedColors.map((c, index) => (
                      <tr key={c.id}>
                        <td>{startIndex + index + 1}</td>
                        <td>{c.name}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="action-btn edit" 
                              onClick={() => setShowForm({ mode: 'edit', color: c })}
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
              {filteredColors.length === 0 ? (
                <div className="empty-state">لا توجد نتائج</div>
              ) : (
                paginatedColors.map((c, index) => (
                  <div key={c.id} className="user-mobile-card">
                    <div className="user-mobile-header">
                      <div>
                        <h4 className="user-mobile-title">{c.name}</h4>
                        <span className="user-mobile-number">#{startIndex + index + 1}</span>
                      </div>
                    </div>
                    <div className="user-mobile-body">
                      <div className="user-mobile-actions">
                        <button 
                          className="action-btn edit" 
                          onClick={() => setShowForm({ mode: 'edit', color: c })}
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

            {totalColors > perPage && (
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  عرض {startIndex + 1}
                  {' إلى '}
                  {Math.min(endIndex, totalColors)}
                  {' من '}
                  {totalColors}
                  {' لون'}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn pagination-prev"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
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
              <h3>{showForm.mode === 'add' ? 'إضافة لون جديد' : 'تعديل لون'}</h3>
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
                <label htmlFor="name">اسم اللون <span className="required">*</span></label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({name: e.target.value})}
                  className={formErrors.name ? 'error' : ''}
                  placeholder="أدخل اسم اللون (مثلاً: أبيض - White)"
                />
                {formErrors.name && <span className="error-message">{formErrors.name}</span>}
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
              <i className="fa-solid fa-palette"></i>
            </div>
            <h3>تأكيد الحذف</h3>
            <p className="delete-confirm-message">
              هل أنت متأكد من حذف اللون <strong>{deleteConfirmation.name}</strong>؟
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
