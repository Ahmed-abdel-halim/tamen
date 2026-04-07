import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "./Toast";

type ProfessionalLiabilityInsuranceDocument = {
  id: number;
  insurance_number: string;
  issue_date: string;
  insured_name?: string;
  phone?: string;
  profession?: string;
  premium: number | string;
  total: number | string;
  agency_name?: string; // اسم الوكالة (يظهر للادمن فقط)
};

export default function ProfessionalLiabilityInsuranceList({ isArchive = false }: { isArchive?: boolean } = {}) {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<ProfessionalLiabilityInsuranceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState<ProfessionalLiabilityInsuranceDocument | null>(null);
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
      
      const url = `/api/professional-liability-insurance-documents${isArchive ? '?archived=true' : ''}`;
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

  const filteredDocuments = documents.filter((doc) =>
    doc.insurance_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.insured_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.profession?.toLowerCase().includes(searchQuery.toLowerCase())
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
      const res = await fetch(`/api/professional-liability-insurance-documents/${showDeleteModal.id}`, {
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
        <span>{isArchive ? 'الأرشيف / تأمين المسؤولية المهنية (الطبية)' : ' تأمين المسؤولية المهنية (الطبية) / قائمة الوثائق'}</span>
      </div>

      <div className="users-card">
        <div className="users-header">
          <div className="users-search-bar">
            <input
              type="text"
              placeholder="بحث برقم التأمين، اسم المؤمن، رقم الهاتف أو المهنة..."
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
              onClick={() => navigate('/professional-liability-insurance-documents/create')}
            >
              <i className="fa-solid fa-plus"></i>
              إضافة وثيقة
            </button>
          )}
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
                        <td>{doc.insured_name || '-'}</td>
                        <td>{doc.phone || '-'}</td>
                        <td>{doc.total ? (typeof doc.total === 'number' ? doc.total : parseFloat(String(doc.total)) || 0).toFixed(3) : '0.000'} دينار</td>
                        <td>تأمين المسؤولية المهنية (الطبية)</td>
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
                              iframe.src = `/api/professional-liability-insurance-documents/${doc.id}/print`;
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
                            onClick={() => navigate(`/professional-liability-insurance-documents/${doc.id}`)}
                            title="عرض"
                            style={{ background: '#10b981', color: '#fff' }}

                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                          {isAdmin && (
                            <button
                              className="action-btn edit"
                              onClick={() => navigate(`/professional-liability-insurance-documents/${doc.id}/edit`)}
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
                          <span className="user-mobile-number">تأمين المسؤولية المهنية</span>
                        </div>
                      </div>
                      <div className="user-mobile-body">
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">تاريخ الإصدار:</span>
                          <span className="user-mobile-value">{issueDate}</span>
                        </div>
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">اسم المؤمن:</span>
                          <span className="user-mobile-value">{doc.insured_name || '-'}</span>
                        </div>
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">رقم الهاتف:</span>
                          <span className="user-mobile-value">{doc.phone || '-'}</span>
                        </div>
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">الإجمالي:</span>
                          <span className="user-mobile-value">
                            {doc.total ? (typeof doc.total === 'number' ? doc.total : parseFloat(String(doc.total)) || 0).toFixed(3) : '0.000'} دينار
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
                              iframe.src = `/api/professional-liability-insurance-documents/${doc.id}/print`;
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
                            onClick={() => navigate(`/professional-liability-insurance-documents/${doc.id}`)}
                            title="عرض"
                            style={{ background: '#10b981', color: '#fff' }}
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                          {isAdmin && (
                            <button
                              className="action-btn edit"
                              onClick={() => navigate(`/professional-liability-insurance-documents/${doc.id}/edit`)}
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
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="pagination-btn"
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
                <span className="pagination-info">
                  صفحة {currentPage} من {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
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

