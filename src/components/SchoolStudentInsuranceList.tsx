import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";
import { generatePremiumExcel } from "../utils/excelGenerator";
import DocumentStatusFilter, { type DocumentStatusType } from "./DocumentStatusFilter";
import InsuranceTermsModal from "./InsuranceTermsModal";

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
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number | null; isOpen: boolean }>({ id: null, isOpen: false });
  const [isDeleting, setIsDeleting] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [agents, setAgents] = useState<{id: number, agency_name: string}[]>([]);
  const [filters, setFilters] = useState({
    agentId: '',
    year: '',
    month: '',
    day: ''
  });
  const [agentSearch, setAgentSearch] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] = useState<DocumentStatusType>('all');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setShowAgentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setIsAdmin(user.is_admin || false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [currentPage, searchQuery, isArchive, filters, statusFilter]);

  useEffect(() => {
    if (isAdmin) {
      fetchAgents();
    }
  }, [isAdmin]);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/branches-agents`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setAgents(data || []);
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  // Reset to page 1 when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      const headers: HeadersInit = { 'Accept': 'application/json' };
      if (userId) headers['X-User-Id'] = userId.toString();
      
      const params = new URLSearchParams();
      if (isArchive) {
        params.append('archived', 'true');
      } else if (statusFilter) {
        params.append('status', statusFilter);
      }
      params.append('page', currentPage.toString());
      params.append('per_page', perPage.toString());
      if (searchQuery) params.append('search', searchQuery);
      if (filters.agentId) params.append('branch_agent_id', filters.agentId);
      if (filters.year) params.append('year', filters.year);
      if (filters.month) params.append('month', filters.month);
      if (filters.day) params.append('day', filters.day);

      const res = await fetch(`${API_BASE_URL}/school-student-insurance?${params.toString()}`, { headers });
      const data = await res.json();
      
      setDocuments(data.data || []);
      setTotalDocuments(data.total || 0);
    } catch (error: any) {
      showToast(`خطأ في جلب الوثائق: ${error.message || error}`, 'error');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = totalDocuments > 0 ? Math.ceil(totalDocuments / perPage) : 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + documents.length;
  const paginatedDocuments = documents;

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    
    setIsDeleting(true);
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      const token = localStorage.getItem('token');
      
      const headers: HeadersInit = { 'Accept': 'application/json' };
      if (userId) headers['X-User-Id'] = userId.toString();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/school-student-insurance/${deleteConfirm.id}`, { 
        method: 'DELETE',
        headers
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

  const handleExportExcel = async () => {
    if (documents.length === 0) { showToast('لا توجد بيانات لتصديرها', 'error'); return; }
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
      const columns = [
        { header: 'رقم الوثيقة', key: 'policy_number', width: 25 },
        { header: 'تاريخ الإصدار', key: 'created_at', width: 25 },
        { header: 'اسم الطالب', key: 'student_name', width: 35 },
        { header: 'المدرسة', key: 'school_name', width: 30 },
        { header: 'القسط الكلي', key: 'total', width: 15 },
        { header: 'الوكالة', key: 'agency_name', width: 25 },
      ];

      const data = documents.map(doc => ({
        policy_number: doc.policy_number,
        created_at: doc.created_at ? new Date(doc.created_at).toLocaleDateString('ar-LY') : '-',
        student_name: doc.student_name,
        school_name: doc.school_name,
        total: (typeof doc.premium_amount === 'number' ? doc.premium_amount : parseFloat(String(doc.premium_amount)) || 0).toFixed(3) + ' د.ل',
        agency_name: doc.agency_name || (doc as any).branch_agent?.agency_name || '-',
      }));

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير تأمين حماية طلاب المدارس',
        subtitle: `عدد الوثائق: ${totalDocuments} - تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'تقرير_تأمين_الطلاب',
        qrData: `تأمين طلاب مدارس - شركة المدار الليبي\nعدد الوثائق: ${totalDocuments}\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير التقرير بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
        <span>{isArchive ? 'ارشيف الوثائق المنتهيه / تأمين حماية طلاب المدارس' : 'تأمين حماية طلاب المدارس / قائمة الوثائق'}</span>
        {!isArchive && (
          <DocumentStatusFilter
            status={statusFilter}
            onChange={(s) => {
              setStatusFilter(s);
              setCurrentPage(1);
            }}
          />
        )}
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
          {isAdmin && (
            <button
              className="primary add-user-btn"
              onClick={() => setShowTermsModal(true)}
              style={{ background: '#7c3aed', marginRight: '10px' }}
              title="تعديل شروط وإقرارات الوثيقة"
            >
              <i className="fa-solid fa-file-contract"></i>
              شروط الوثيقة
            </button>
          )}
          <button
            className="primary add-user-btn"
            onClick={handleExportExcel}
            style={{ background: '#166534', marginRight: '10px' }}
          >
            <i className="fa-solid fa-file-excel"></i>
            تصدير إكسل
          </button>
        </div>

        {/* Advanced Filters Box */}
        <div className="filters-box-premium" style={{ 
          background: 'var(--panel)', 
          padding: '20px', 
          borderRadius: '16px', 
          marginBottom: '20px', 
          border: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '15px',
          alignItems: 'end'
        }}>
          {isAdmin && (
            <div className="filter-group" ref={agentDropdownRef} style={{ position: 'relative' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px', display: 'block' }}>الوكيل</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="ابحث عن وكيل..."
                  value={agentSearch}
                  onChange={(e) => {
                    setAgentSearch(e.target.value);
                    setShowAgentDropdown(true);
                  }}
                  onFocus={() => setShowAgentDropdown(true)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                />
                {showAgentDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    zIndex: 1000,
                    marginTop: '5px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }}>
                    <div
                      onClick={() => {
                        setFilters({ ...filters, agentId: '' });
                        setAgentSearch("كل الوكلاء");
                        setShowAgentDropdown(false);
                      }}
                      style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}
                    >
                      كل الوكلاء
                    </div>
                    {agents.filter(a => a.agency_name.toLowerCase().includes(agentSearch.toLowerCase())).map(agent => (
                      <div
                        key={agent.id}
                        onClick={() => {
                          setFilters({ ...filters, agentId: agent.id.toString() });
                          setAgentSearch(agent.agency_name);
                          setShowAgentDropdown(false);
                        }}
                        style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}
                      >
                        {agent.agency_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="filter-group">
            <label style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px', display: 'block' }}>السنة</label>
            <select 
              value={filters.year} 
              onChange={(e) => setFilters({...filters, year: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
            >
              <option value="">كل السنوات</option>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px', display: 'block' }}>الشهر</label>
            <select 
              value={filters.month} 
              onChange={(e) => setFilters({...filters, month: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
            >
              <option value="">كل الشهور</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '8px', display: 'block' }}>اليوم</label>
            <select 
              value={filters.day} 
              onChange={(e) => setFilters({...filters, day: e.target.value})}
              style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
            >
              <option value="">كل الأيام</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={() => {
              setFilters({ agentId: '', year: '', month: '', day: '' });
              setAgentSearch("");
              setSearchQuery("");
            }}
            style={{ 
              padding: '10px 20px', 
              borderRadius: '10px', 
              border: 'none', 
              background: 'var(--accent-cyan)', 
              color: 'white', 
              cursor: 'pointer',
              fontWeight: 600,
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <i className="fa-solid fa-rotate-left"></i>
            تفريغ
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>جار التحميل...</p>
        ) : totalDocuments === 0 ? (
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
                {paginatedDocuments.map((doc) => (
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
                            window.open(`${API_BASE_URL}/school-student-insurance/${doc.id}/print?t=${Date.now()}`, '_blank');
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
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
              <div className="pagination-wrapper" style={{ marginTop: '20px' }}>
                <div className="pagination-info">
                  عرض {startIndex + 1} إلى {endIndex} من {totalDocuments} وثيقة
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn pagination-prev"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                  <span className="pagination-current">{currentPage} / {totalPages}</span>
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

      <InsuranceTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        insuranceTypeKey="school"
        insuranceTypeName="تأمين حماية طلاب المدارس"
      />
    </section>
  );
}
