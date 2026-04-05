import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type BranchAgent = {
  id: number;
  type: 'وكيل' | 'فرع من شركة';
  code: string;
  agency_name: string;
  agent_name: string;
  agency_number?: string;
  phone?: string;
  address?: string;
  notes?: string;
  status: 'نشط' | 'غير نشط';
  user?: { id: number; username: string; name: string };
};

export default function BranchesAgentsList() {
  const navigate = useNavigate();
  const [branchesAgents, setBranchesAgents] = useState<BranchAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<BranchAgent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    fetchBranchesAgents();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, branchesAgents.length]);

  const fetchBranchesAgents = async () => {
    try {
      const res = await fetch('/api/branches-agents', {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setBranchesAgents(data);
    } catch (error: any) {
      setToast({ 
        message: `حدث خطأ أثناء جلب الفروع والوكلاء: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredBranchesAgents = branchesAgents.filter(ba => 
    ba.agency_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ba.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ba.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ba.phone && ba.phone.includes(searchQuery)) ||
    (ba.agency_number && ba.agency_number.includes(searchQuery))
  );

  const totalBranchesAgents = filteredBranchesAgents.length;
  const totalPages = totalBranchesAgents > 0 ? Math.ceil(totalBranchesAgents / perPage) : 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedBranchesAgents = filteredBranchesAgents.slice(startIndex, endIndex);

  const handleDeleteBranchAgent = async () => {
    if (!showDeleteModal) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/branches-agents/${showDeleteModal.id}`, {
        method: 'DELETE',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        let errorMessage = 'حدث خطأ أثناء حذف السجل';
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await res.json();
            errorMessage = error.message || error.error || errorMessage;
            console.error('Delete error:', error);
          }
        } catch (e) {
          console.error('Error parsing delete response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      setToast({ message: data.message || 'تم حذف السجل بنجاح', type: 'success' });
      setShowDeleteModal(null);
      fetchBranchesAgents();
    } catch (error: any) {
      console.error('Delete error:', error);
      setToast({ message: error.message || 'حدث خطأ أثناء حذف السجل', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>إدارة الفروع والوكلاء / قائمة الفروع والوكلاء</span>
      </div>

      <div className="users-card">
        <div className="users-header">
          <div className="users-search-bar">
            <input 
              type="text" 
              placeholder="بحث باسم الوكالة، الوكيل، الكود، رقم الترخيص أو الهاتف..." 
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
            onClick={() => navigate('/branches-agents/create')}
          >
            <i className="fa-solid fa-plus"></i>
            إضافة فرع أو وكيل جديد
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
                    <th>كود الوكيل</th>
                    <th>اسم الوكالة</th>
                    <th>اسم الوكيل</th>
                    <th>رقم الترخيص</th>
                    <th>رقم الهاتف</th>
                    <th>العنوان</th>
                    <th>الملاحظات</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBranchesAgents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="empty-table-cell">
                        لا توجد نتائج
                      </td>
                    </tr>
                  ) : (
                    paginatedBranchesAgents.map((branchAgent, index) => (
                      <tr key={branchAgent.id}>
                        <td>{startIndex + index + 1}</td>
                        <td>{branchAgent.code}</td>
                        <td>{branchAgent.agency_name}</td>
                        <td>{branchAgent.agent_name}</td>
                        <td>{branchAgent.agency_number || '-'}</td>
                        <td>{branchAgent.phone || '-'}</td>
                        <td>{branchAgent.address || '-'}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {branchAgent.notes || '-'}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => navigate(`/branches-agents/${branchAgent.id}`)}
                              className="action-btn view"
                              aria-label="عرض التفاصيل"
                              title="عرض التفاصيل"
                              style={{ background: '#10b981', color: '#fff' }}
                            >
                              <i className="fa-solid fa-eye"></i>
                            </button>
                            <button
                              onClick={() => navigate(`/branches-agents/${branchAgent.id}/edit`)}
                              className="action-btn edit"
                              aria-label="تعديل"
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pencil"></i>
                            </button>
                            <button
                              onClick={() => {
                                const iframe = document.createElement('iframe');
                                iframe.style.position = 'fixed';
                                iframe.style.right = '-9999px';
                                iframe.style.width = '0';
                                iframe.style.height = '0';
                                iframe.src = `/api/branches-agents/${branchAgent.id}/print?t=${new Date().getTime()}`;
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
                              aria-label="طباعة العقد"
                              title="طباعة العقد"
                              style={{ background: '#3b82f6', color: '#fff' }}
                            >
                              <i className="fa-solid fa-print"></i>
                            </button>
                            <button
                              onClick={() => setShowDeleteModal(branchAgent)}
                              className="action-btn delete"
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
              {filteredBranchesAgents.length === 0 ? (
                <div className="empty-state">لا توجد نتائج</div>
              ) : (
                paginatedBranchesAgents.map((branchAgent, index) => (
                  <div key={branchAgent.id} className="user-mobile-card">
                    <div className="user-mobile-header">
                      <div>
                        <h4 className="user-mobile-title">{branchAgent.agency_name}</h4>
                        <span className="user-mobile-number">#{startIndex + index + 1} - {branchAgent.code}</span>
                      </div>
                    </div>
                    <div className="user-mobile-body">
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">اسم الوكيل:</span>
                        <span className="user-mobile-value">{branchAgent.agent_name}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">رقم الترخيص:</span>
                        <span className="user-mobile-value">{branchAgent.agency_number || '-'}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">رقم الهاتف:</span>
                        <span className="user-mobile-value">{branchAgent.phone || '-'}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">العنوان:</span>
                        <span className="user-mobile-value">{branchAgent.address || '-'}</span>
                      </div>
                      {branchAgent.notes && (
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">الملاحظات:</span>
                          <span className="user-mobile-value" style={{ fontSize: '0.9em' }}>{branchAgent.notes}</span>
                        </div>
                      )}
                      <div className="user-mobile-actions">
                        <button
                          onClick={() => navigate(`/branches-agents/${branchAgent.id}`)}
                          className="action-btn view"
                          aria-label="عرض التفاصيل"
                          title="عرض التفاصيل"
                          style={{ background: '#10b981', color: '#fff' }}
                        >
                          <i className="fa-solid fa-eye"></i>
                        </button>
                        <button
                          onClick={() => navigate(`/branches-agents/${branchAgent.id}/edit`)}
                          className="action-btn edit"
                          aria-label="تعديل"
                          title="تعديل"
                        >
                          <i className="fa-solid fa-pencil"></i>
                        </button>
                        <button
                          onClick={() => {
                            const iframe = document.createElement('iframe');
                            iframe.style.position = 'fixed';
                            iframe.style.right = '-9999px';
                            iframe.style.width = '0';
                            iframe.style.height = '0';
                            iframe.src = `/api/branches-agents/${branchAgent.id}/print?t=${new Date().getTime()}`;
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
                          aria-label="طباعة العقد"
                          title="طباعة العقد"
                          style={{ background: '#3b82f6', color: '#fff' }}
                        >
                          <i className="fa-solid fa-print"></i>
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(branchAgent)}
                          className="action-btn delete"
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
            {totalBranchesAgents > perPage && (
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  عرض {startIndex + 1}
                  {' إلى '}
                  {Math.min(endIndex, totalBranchesAgents)}
                  {' من '}
                  {totalBranchesAgents}
                  {' وكيل/فرع'}
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
        <div className="modal" onClick={(e) => {
          if (e.target === e.currentTarget && !deleting) setShowDeleteModal(null);
        }}>
          <div className="modal-content delete-confirm-modal">
            <div className="delete-confirm-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>تأكيد الحذف</h3>
            <p className="delete-confirm-message">
              هل أنت متأكد من حذف السجل <strong>{showDeleteModal.agency_name}</strong>؟
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
                onClick={handleDeleteBranchAgent}
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
