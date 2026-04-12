import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "./Toast";

type ResidentInsurancePassenger = {
  id: number;
  is_main_passenger: boolean;
  name_ar: string;
  name_en: string;
  phone?: string;
};

type ResidentInsuranceDocument = {
  id: number;
  insurance_number: string;
  issue_date: string;
  total: number | string;
  passengers?: ResidentInsurancePassenger[];
  agency_name?: string; // اسم الوكالة (يظهر للادمن فقط)
};

export default function ResidentInsuranceList({ isArchive = false }: { isArchive?: boolean } = {}) {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ResidentInsuranceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState<ResidentInsuranceDocument | null>(null);
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
      
      const url = `/api/resident-insurance-documents${isArchive ? '?archived=true' : ''}`;
      const res = await fetch(url, {
        headers
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(`حدث خطأ أثناء جلب الوثائق: ${error.message || ''}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const mainPassenger = doc.passengers?.find(p => p.is_main_passenger);
    return (
      doc.insurance_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mainPassenger?.name_ar?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mainPassenger?.name_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mainPassenger?.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalDocuments = filteredDocuments.length;
  const totalPages = totalDocuments > 0 ? Math.ceil(totalDocuments / perPage) : 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  const handleDelete = async () => {
    if (!showDeleteModal) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/resident-insurance-documents/${showDeleteModal.id}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'حدث خطأ أثناء الحذف' }));
        throw new Error(errorData.message || 'حدث خطأ أثناء الحذف');
      }

      showToast('تم حذف الوثيقة بنجاح', 'success');
      setShowDeleteModal(null);
      fetchDocuments();
    } catch (error: any) {
      showToast(`حدث خطأ أثناء حذف الوثيقة: ${error.message || ''}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>{isArchive ? 'الأرشيف / وثائق تأمين الوافدين للمقيمين' : 'وثائق تأمين الوافدين للمقيمين / قائمة الوثائق'}</span>
      </div>

      <div className="users-card">
        <div className="users-header">
          <div className="users-search-bar">
            <input
              type="text"
              placeholder="بحث برقم التأمين، اسم المؤمن أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="users-search-input"
            />
            <button className="users-search-btn" type="button">
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
          {!isArchive && (
            <button
              className="primary add-user-btn"
              onClick={() => navigate('/resident-insurance-documents/create')}
            >
              <i className="fa-solid fa-plus"></i>
              إضافة وثيقة
            </button>
          )}
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>جار التحميل...</p>
        ) : filteredDocuments.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: '3rem', color: '#ccc', marginBottom: '1rem' }}></i>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
              {searchQuery ? 'لا توجد نتائج للبحث' : (isArchive ? 'لا توجد وثائق مؤرشفة' : 'لا توجد وثائق مسجلة')}
            </p>
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
                    {isAdmin && <th>اسم الوكالة</th>}
                    <th>الإجراء</th>
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
                    
                    // الحصول على المسافر الرئيسي
                    const mainPassenger = doc.passengers?.find(p => p.is_main_passenger);
                    
                    return (
                      <tr key={doc.id}>
                        <td>{doc.insurance_number}</td>
                        <td>{issueDate}</td>
                        <td>{mainPassenger?.name_ar || '-'}</td>
                        <td>{mainPassenger?.phone || '-'}</td>
                        <td>{doc.total ? (typeof doc.total === 'number' ? doc.total : parseFloat(String(doc.total)) || 0).toFixed(3) : '0.000'} د.ل</td>
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
                                iframe.src = `/api/resident-insurance-documents/${doc.id}/print`;
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
                              onClick={() => navigate(`/resident-insurance-documents/${doc.id}`)}
                              className="action-btn view"
                              aria-label="عرض"
                              title="عرض"
                              style={{ background: '#10b981', color: '#fff' }}
                            >
                              <i className="fa-solid fa-eye"></i>
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => navigate(`/resident-insurance-documents/${doc.id}/edit`)}
                                className="action-btn edit"
                                aria-label="تعديل"
                                title="تعديل"
                              >
                                <i className="fa-solid fa-pencil"></i>
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => setShowDeleteModal(doc)}
                                className="action-btn delete"
                                aria-label="حذف"
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
                  
                  const mainPassenger = doc.passengers?.find(p => p.is_main_passenger);
                  
                  return (
                    <div key={doc.id} className="user-mobile-card">
                      <div className="user-mobile-header">
                        <div>
                          <h4 className="user-mobile-title">{doc.insurance_number}</h4>
                          <span className="user-mobile-number">تأمين الوافدين</span>
                        </div>
                      </div>
                      <div className="user-mobile-body">
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">تاريخ الإصدار:</span>
                          <span className="user-mobile-value">{issueDate}</span>
                        </div>
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">اسم المؤمن:</span>
                          <span className="user-mobile-value">{mainPassenger?.name_ar || '-'}</span>
                        </div>
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">رقم الهاتف:</span>
                          <span className="user-mobile-value">{mainPassenger?.phone || '-'}</span>
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
                              iframe.src = `/api/resident-insurance-documents/${doc.id}/print`;
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
                            onClick={() => navigate(`/resident-insurance-documents/${doc.id}`)}
                            className="action-btn view"
                            aria-label="عرض"
                            title="عرض"
                            style={{ background: '#10b981', color: '#fff' }}
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => navigate(`/resident-insurance-documents/${doc.id}/edit`)}
                              className="action-btn edit"
                              aria-label="تعديل"
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pencil"></i>
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => setShowDeleteModal(doc)}
                              className="action-btn delete"
                              aria-label="حذف"
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
