import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

type SchoolStudentInsuranceDocument = {
  id: number;
  policy_number: string;
  created_at: string;
  student_name: string;
  school_name: string;
  premium_amount: number | string;
  agency_name?: string;
};

export default function SchoolStudentInsuranceList({ isArchive = false }: { isArchive?: boolean } = {}) {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<SchoolStudentInsuranceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number | null; isOpen: boolean }>({ id: null, isOpen: false });
  const [isDeleting, setIsDeleting] = useState(false);


  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setIsAdmin(user.is_admin || false);
    }
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      const headers: HeadersInit = { 'Accept': 'application/json' };
      if (userId) headers['X-User-Id'] = userId.toString();
      
      const res = await fetch(`${API_BASE_URL}/school-student-insurance`, { headers });
      const data = await res.json();
      setDocuments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(`خطأ في جلب الوثائق: ${error.message || error}`, 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.policy_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.school_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/school-student-insurance/${deleteConfirm.id}`, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (res.ok) {
        showToast('تم حذف الوثيقة بنجاح', 'success');
        fetchDocuments();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || 'فشل حذف الوثيقة');
      }
    } catch (err: any) {
      showToast(err.message || 'حدث خطأ أثناء الحذف', 'error');
    } finally {
      setIsDeleting(false);
      setDeleteConfirm({ id: null, isOpen: false });
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>{isArchive ? 'الأرشيف / تأمين حماية طلاب المدارس' : 'تأمين حماية طلاب المدارس / قائمة الوثائق'}</span>
      </div>

      <div className="users-card">
        <div className="users-header">
          <div className="users-search-bar">
            <input
              type="text"
              placeholder="بحث برقم الوثيقة، اسم الطالب أو المدرسة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="users-search-input"
            />
          </div>
          {!isArchive && (
            <button
              className="primary add-user-btn"
              onClick={() => navigate('/school-student-insurance/create')}
            >
              <i className="fa-solid fa-plus"></i>
              إصدار وثيقة جديدة
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
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>رقم الوثيقة</th>
                  <th>تاريخ الإصدار</th>
                  <th>اسم الطالب</th>
                  <th>المدرسة</th>
                  <th>القسط</th>
                  {isAdmin && <th>الوكالة</th>}
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id}>
                    <td>{doc.policy_number}</td>
                    <td>{new Date(doc.created_at).toLocaleDateString('ar-LY')}</td>
                    <td>{doc.student_name}</td>
                    <td>{doc.school_name}</td>
                    <td>{parseFloat(String(doc.premium_amount)).toFixed(3)} د.ل</td>
                    {isAdmin && <td>{doc.agency_name || (doc as any).branch_agent?.agency_name || '-'}</td>}
                    <td>
                      <div className="action-buttons">
                        <button
                          onClick={() => {
                            const iframe = document.createElement('iframe');
                            iframe.style.position = 'fixed';
                            iframe.style.right = '-9999px';
                            iframe.style.width = '0';
                            iframe.style.height = '0';
                            iframe.src = `${API_BASE_URL}/school-student-insurance/${doc.id}/print`;
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
                          title="طباعة الوثيقة"
                          style={{ background: '#3b82f6', color: '#fff' }}
                        >
                          <i className="fa-solid fa-print"></i>
                        </button>
                        <button className="action-btn view" title="عرض" onClick={() => navigate(`/school-student-insurance/${doc.id}`)}>
                          <i className="fa-solid fa-eye"></i>
                        </button>
                        <button className="action-btn edit" title="تعديل" onClick={() => navigate(`/school-student-insurance/edit/${doc.id}`)} style={{ background: '#f59e0b', color: '#fff' }}>
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        {isAdmin && (
                          <button className="action-btn delete" title="حذف" onClick={() => setDeleteConfirm({ id: doc.id, isOpen: true })}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* مودال تأكيد الحذف */}
      {deleteConfirm.isOpen && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm({ id: null, isOpen: false })}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>تأكيد الحذف</h3>
            <p>هل أنت متأكد من رغبتك في حذف هذه الوثيقة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="delete-confirm-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setDeleteConfirm({ id: null, isOpen: false })}
                disabled={isDeleting}
              >
                إلغاء
              </button>
              <button 
                className="btn-delete" 
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
