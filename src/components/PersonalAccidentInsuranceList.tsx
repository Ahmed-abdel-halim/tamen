import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type PersonalAccidentInsuranceDocument = {
  id: number;
  insurance_number: string;
  issue_date: string;
  name?: string;
  phone?: string;
  total: number | string;
  agency_name?: string; // اسم الوكالة (يظهر للادمن فقط)
};

export default function PersonalAccidentInsuranceList() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<PersonalAccidentInsuranceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<PersonalAccidentInsuranceDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadUserPermissions();
    fetchDocuments();
  }, []);

  const loadUserPermissions = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setIsAdmin(user.is_admin || false);
      }
    } catch (error) {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, documents.length]);

  const fetchDocuments = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      
      const headers: HeadersInit = { 'Accept': 'application/json' };
      if (userId) {
        headers['X-User-Id'] = userId.toString();
      }
      
      const res = await fetch('/api/personal-accident-insurance-documents', {
        headers
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setToast({
        message: `حدث خطأ أثناء جلب الوثائق: ${error.message || ''}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.insurance_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    'تأمين الحوادث الشخصية'.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDocuments = filteredDocuments.length;
  const totalPages = totalDocuments > 0 ? Math.ceil(totalDocuments / perPage) : 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  const handleDelete = async () => {
    if (!showDeleteModal) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/personal-accident-insurance-documents/${showDeleteModal.id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'حدث خطأ أثناء الحذف' }));
        throw new Error(errorData.message || 'حدث خطأ أثناء الحذف');
      }

      setToast({ message: 'تم حذف الوثيقة بنجاح', type: 'success' });
      setShowDeleteModal(null);
      fetchDocuments();
    } catch (error: any) {
      setToast({
        message: `حدث خطأ أثناء حذف الوثيقة: ${error.message || ''}`,
        type: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>وثائق تأمين الحوادث الشخصية / قائمة الوثائق</span>
      </div>

      <div className="users-card">
        <div className="users-header">
          <div className="users-search-bar">
            <input
              type="text"
              placeholder="بحث برقم التأمين، اسم المؤمن، رقم الهاتف أو نوع التأمين..."
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
            onClick={() => navigate('/personal-accident-insurance-documents/create')}
          >
            <i className="fa-solid fa-plus"></i>
            إضافة وثيقة
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>جار التحميل...</p>
        ) : filteredDocuments.length === 0 ? (
          <div className="empty-state">
            <i className="fa-solid fa-file-invoice" style={{ fontSize: '3rem', color: '#ccc', marginBottom: '1rem' }}></i>
            <p>{searchQuery ? 'لا توجد نتائج للبحث' : 'لا توجد وثائق مسجلة'}</p>
          </div>
        ) : (
          <>
            <div className="users-table-wrapper">
              <table className="users-table">
                  <thead>
                    <tr>
                      <th>رقم التأمين</th>
                      <th>تاريخ الإصدار</th>
                      <th>اسم المؤمن</th>
                      <th>رقم الهاتف</th>
                      <th>القسط</th>
                      <th>نوع التأمين</th>
                      {isAdmin && <th>اسم الوكالة</th>}
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDocuments.map((doc) => {
                      // تنسيق تاريخ الإصدار مع الوقت
                      const issueDate = doc.issue_date 
                        ? new Date(doc.issue_date).toLocaleString('ar-LY', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })
                        : '-';
                      
                      return (
                        <tr key={doc.id}>
                          <td>{doc.insurance_number}</td>
                          <td>{issueDate}</td>
                          <td>{doc.name || '-'}</td>
                          <td>{doc.phone || '-'}</td>
                          <td>{doc.total ? (typeof doc.total === 'number' ? doc.total : parseFloat(String(doc.total)) || 0).toFixed(3) : '0.000'} د.ل</td>
                          <td>تأمين الحوادث الشخصية</td>
                          {isAdmin && (
                            <td>{doc.agency_name || '-'}</td>
                          )}
                          <td>
                        <div className="action-buttons">
                          <button
                            onClick={() => {
                              const iframe = document.createElement('iframe');
                              iframe.style.position = 'fixed';
                              iframe.style.right = '-9999px';
                              iframe.style.width = '0';
                              iframe.style.height = '0';
                              iframe.src = `/api/personal-accident-insurance-documents/${doc.id}/print`;
                              document.body.appendChild(iframe);
                              
                              iframe.onload = () => {
                                setTimeout(() => {
                                  if (iframe.contentWindow) {
                                    iframe.contentWindow.focus();
                                    iframe.contentWindow.print();
                                  }
                                  setTimeout(() => {
                                    if (document.body.contains(iframe)) {
                                      document.body.removeChild(iframe);
                                    }
                                  }, 300);
                                }, 100);
                              };
                            }}
                            className="action-btn"
                            aria-label="طباعة الوثيقة"
                            title="طباعة الوثيقة"
                            style={{ background: '#3b82f6', color: '#fff' }}
                          >
                            <i className="fa-solid fa-print"></i>
                          </button>
                          <button
                            className="action-btn view"
                            onClick={() => navigate(`/personal-accident-insurance-documents/${doc.id}`)}
                            title="عرض"
                            style={{ background: '#10b981', color: '#fff' }}
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                          {isAdmin && (
                            <button
                              className="action-btn edit"
                              onClick={() => navigate(`/personal-accident-insurance-documents/${doc.id}/edit`)}
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              className="action-btn delete"
                              onClick={() => setShowDeleteModal(doc)}
                              title="حذف"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            {/* Mobile Cards View */}
            <div className="users-mobile-cards">
              {filteredDocuments.length === 0 ? (
                <div className="empty-state">لا توجد نتائج</div>
              ) : (
                paginatedDocuments.map((doc) => {
                  const issueDate = doc.issue_date 
                    ? new Date(doc.issue_date).toLocaleString('ar-LY', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })
                    : '-';
                  
                  return (
                    <div key={doc.id} className="user-mobile-card">
                      <div className="user-mobile-header">
                        <div>
                          <h4 className="user-mobile-title">{doc.insurance_number}</h4>
                          <span className="user-mobile-number">تأمين الحوادث الشخصية</span>
                        </div>
                      </div>
                      <div className="user-mobile-body">
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">تاريخ الإصدار:</span>
                          <span className="user-mobile-value">{issueDate}</span>
                        </div>
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">اسم المؤمن:</span>
                          <span className="user-mobile-value">{doc.name || '-'}</span>
                        </div>
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">رقم الهاتف:</span>
                          <span className="user-mobile-value">{doc.phone || '-'}</span>
                        </div>
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">الإجمالي:</span>
                          <span className="user-mobile-value">
                            {doc.total ? (typeof doc.total === 'number' ? doc.total : parseFloat(String(doc.total)) || 0).toFixed(3) : '0.000'} د.ل
                          </span>
                        </div>
                        {isAdmin && doc.agency_name && (
                          <div className="user-mobile-row">
                            <span className="user-mobile-label">اسم الوكالة:</span>
                            <span className="user-mobile-value">{doc.agency_name}</span>
                          </div>
                        )}
                        <div className="user-mobile-actions">
                          <button
                            onClick={() => {
                              const iframe = document.createElement('iframe');
                              iframe.style.position = 'fixed';
                              iframe.style.right = '-9999px';
                              iframe.style.width = '0';
                              iframe.style.height = '0';
                              iframe.src = `/api/personal-accident-insurance-documents/${doc.id}/print`;
                              document.body.appendChild(iframe);
                              
                              iframe.onload = () => {
                                setTimeout(() => {
                                  if (iframe.contentWindow) {
                                    iframe.contentWindow.focus();
                                    iframe.contentWindow.print();
                                  }
                                  setTimeout(() => {
                                    if (document.body.contains(iframe)) {
                                      document.body.removeChild(iframe);
                                    }
                                  }, 300);
                                }, 100);
                              };
                            }}
                            className="action-btn"
                            aria-label="طباعة الوثيقة"
                            title="طباعة الوثيقة"
                            style={{ background: '#3b82f6', color: '#fff' }}
                          >
                            <i className="fa-solid fa-print"></i>
                          </button>
                          <button
                            className="action-btn view"
                            onClick={() => navigate(`/personal-accident-insurance-documents/${doc.id}`)}
                            title="عرض"
                            style={{ background: '#10b981', color: '#fff' }}
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                          {isAdmin && (
                            <button
                              className="action-btn edit"
                              onClick={() => navigate(`/personal-accident-insurance-documents/${doc.id}/edit`)}
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              className="action-btn delete"
                              onClick={() => setShowDeleteModal(doc)}
                              title="حذف"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {totalPages > 1 && (
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  عرض {startIndex + 1}
                  {' إلى '}
                  {Math.min(endIndex, totalDocuments)}
                  {' من '}
                  {totalDocuments}
                  {' وثيقة'}
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

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => !deleting && setShowDeleteModal(null)}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>تأكيد الحذف</h3>
            <p className="delete-confirm-message">
              هل أنت متأكد من حذف الوثيقة <strong>{showDeleteModal.insurance_number}</strong>؟
              <br />
              <span className="delete-warning">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            <div className="delete-confirm-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteModal(null)}
                disabled={deleting}
              >
                إلغاء
              </button>
              <button
                className="btn-delete-confirm"
                onClick={handleDelete}
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

