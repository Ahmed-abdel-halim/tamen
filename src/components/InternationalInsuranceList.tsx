import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";
import { generatePremiumExcel } from "../utils/excelGenerator";

// LIFO credentials helper (same as LifoReportsDashboard)
const getLifoCredentials = () => {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u.lifo_username && u.lifo_password) {
        return { user_name: u.lifo_username, pass_word: u.lifo_password };
      }
    }
  } catch {}
  return { user_name: 'adminmli', pass_word: '20232024' };
};

const getLifoBaseUrl = () =>
  import.meta.env.DEV
    ? 'http://localhost:8000/api/lifo-prod/api'
    : `${API_BASE_URL}/lifo-prod/api`;


type VehicleType = {
  id: number;
  brand: string;
  category: string;
};

type InternationalInsuranceDocument = {
  id: number;
  document_number: string;
  external_policy_number?: string;
  issue_date: string;
  vehicle_type?: VehicleType;
  insured_name: string;
  phone?: string;
  premium: number | string;
  total: number | string;
  insurance_type?: string;
  agency_name?: string; // اسم الوكالة (يظهر للادمن فقط)
};

export default function InternationalInsuranceList({ isArchive = false }: { isArchive?: boolean } = {}) {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<InternationalInsuranceDocument[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState<InternationalInsuranceDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const [isAdmin, setIsAdmin] = useState(false);
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
    loadUserPermissions();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [currentPage, searchQuery, isArchive, filters]);

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
      if (userId) {
        headers['X-User-Id'] = userId.toString();
      }

      const params = new URLSearchParams();
      if (isArchive) params.append('archived', 'true');
      if (searchQuery) params.append('search', searchQuery);
      if (filters.agentId) params.append('branch_agent_id', filters.agentId);
      if (filters.year) params.append('year', filters.year);
      if (filters.month) params.append('month', filters.month);
      if (filters.day) params.append('day', filters.day);
      params.append('page', currentPage.toString());
      params.append('per_page', perPage.toString());

      const url = `${API_BASE_URL}/international-insurance-documents?${params.toString()}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      
      // Laravel pagination structure: { data: [], total: 100, ... }
      setDocuments(data.data || []);
      setTotalDocuments(data.total || 0);
    } catch (error: any) {
      showToast(`حدث خطأ أثناء جلب الوثائق: ${error.message || ''}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = totalDocuments > 0 ? Math.ceil(totalDocuments / perPage) : 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + documents.length;
  const paginatedDocuments = documents;

  const handleDelete = async () => {
    if (!showDeleteModal) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/international-insurance-documents/${showDeleteModal.id}`, {
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

  // طباعة وثيقة الاتحاد (LIFO) باستخدام رقم الكارت
  const [printingLifo, setPrintingLifo] = useState<number | null>(null);
  const handlePrintLifoCard = async (docId: number, cardNumber: string) => {
    setPrintingLifo(docId);
    try {
      showToast('جاري تحميل وثيقة الاتحاد (LIFO)...', 'success');
      const creds = getLifoCredentials();
      const baseUrl = getLifoBaseUrl();
      const res = await fetch(`${baseUrl}/insurance/orangecard/printcard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ user_name: creds.user_name, pass_word: creds.pass_word, card_number: cardNumber })
      });
      if (!res.ok) throw new Error(`خطأ في خادم الاتحاد: ${res.statusText}`);
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/pdf')) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        const data = await res.json();
        showToast(data.message || data.messages || 'فشلت عملية جلب وثيقة الاتحاد', 'error');
      }
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء تحميل وثيقة الاتحاد', 'error');
    } finally {
      setPrintingLifo(null);
    }
  };


  const handleExportExcel = async () => {
    if (documents.length === 0) { showToast('لا توجد بيانات لتصديرها', 'error'); return; }
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
      const columns = [
        { header: 'رقم التأمين', key: 'document_number', width: 25 },
        { header: 'تاريخ الإصدار', key: 'issue_date', width: 25 },
        { header: 'اسم المؤمن', key: 'insured_name', width: 35 },
        { header: 'رقم الهاتف', key: 'phone', width: 15 },
        { header: 'القسط الكلي', key: 'total', width: 15 },
        { header: 'الوكالة', key: 'agency_name', width: 25 },
      ];

      const data = documents.map(doc => ({
        document_number: doc.document_number,
        issue_date: doc.issue_date ? new Date(doc.issue_date).toLocaleString('ar-LY') : '-',
        insured_name: doc.insured_name,
        phone: doc.phone || '-',
        total: (typeof doc.total === 'number' ? doc.total : parseFloat(String(doc.total)) || 0).toFixed(3) + ' د.ل',
        agency_name: doc.agency_name || '-',
      }));

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير تأمين السيارات الدولي (البطاقة البرتقالية)',
        subtitle: `عدد الوثائق: ${totalDocuments} - تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'تقرير_التأمين_الدولي',
        qrData: `تأمين سيارات دولي - شركة المدار الليبي\nعدد الوثائق: ${totalDocuments}\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير التقرير بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>{isArchive ? 'ارشيف الوثائق المنتهيه / تأمين السيارات الدولي (البطاقة البرتقالية)' : 'تأمين السيارات الدولي / قائمة الوثائق'}</span>
      </div>

      <div className="users-card">
        <div className="users-header">
          <div className="users-search-bar">
            <input
              type="text"
              placeholder="بحث برقم الوثيقة، اسم المؤمن أو رقم الهاتف..."
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
              onClick={() => navigate('/international-insurance-documents/create')}
            >
              <i className="fa-solid fa-plus"></i>
              إضافة وثيقة
            </button>
          )}
          <button
            className="primary add-user-btn"
            onClick={() => navigate('/international-insurance-documents/lifo-dashboard')}
            style={{ background: 'var(--sidebar)', marginRight: '10px' }}
          >
            <i className="fa-solid fa-chart-pie"></i>
            بوابة الاتحاد (LIFO)
          </button>
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
                    <th>رقم التأمين</th>
                    <th>تاريخ الإصدار</th>
                    <th>اسم المؤمن</th>
                    <th>رقم الهاتف</th>
                    <th>القسط</th>
                    <th>نوع التأمين</th>
                    {isAdmin && <th>اسم الوكالة</th>}
                    <th>الاتحاد (LIFO)</th>
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

                    return (
                      <tr key={doc.id}>
                        <td>{doc.document_number}</td>
                        <td>{issueDate}</td>
                        <td>{doc.insured_name || '-'}</td>
                        <td>{doc.phone || '-'}</td>
                        <td>{doc.total ? (typeof doc.total === 'number' ? doc.total : parseFloat(String(doc.total)) || 0).toFixed(3) : '0.000'} د.ل</td>
                        <td>تأمين السيارات الدولي</td>
                        {isAdmin && (
                          <td>{doc.agency_name || '-'}</td>
                        )}
                        <td>
                          {doc.external_policy_number ? (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#dcfce7',
                              color: '#166534',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <i className="fa-solid fa-circle-check"></i>
                              مربوط ({doc.external_policy_number})
                            </span>
                          ) : (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#fee2e2',
                              color: '#991b1b',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <i className="fa-solid fa-triangle-exclamation"></i>
                              غير مربوط
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => {
                                const iframe = document.createElement('iframe');
                                iframe.style.position = 'fixed';
                                iframe.style.right = '-9999px';
                                iframe.style.width = '0';
                                iframe.style.height = '0';
                                iframe.src = `${API_BASE_URL}/international-insurance-documents/${doc.id}/print?t=${new Date().getTime()}`;
                                document.body.appendChild(iframe);
                                setTimeout(() => {
                                  if (document.body.contains(iframe)) {
                                    document.body.removeChild(iframe);
                                  }
                                }, 5000);
                              }}
                              className="action-btn"
                              aria-label="طباعة وثيقة المدار"
                              title="طباعة وثيقة المدار"
                              style={{ background: '#3b82f6', color: '#fff' }}
                            >
                              <i className="fa-solid fa-print"></i>
                            </button>
                            {doc.external_policy_number && (
                              <button
                                onClick={() => handlePrintLifoCard(doc.id, doc.external_policy_number!)}
                                className="action-btn"
                                aria-label="طباعة وثيقة الاتحاد"
                                title={`طباعة وثيقة الاتحاد (${doc.external_policy_number})`}
                                disabled={printingLifo === doc.id}
                                style={{ background: '#f97316', color: '#fff', opacity: printingLifo === doc.id ? 0.6 : 1 }}
                              >
                                {printingLifo === doc.id
                                  ? <i className="fa-solid fa-spinner fa-spin"></i>
                                  : <i className="fa-solid fa-id-card"></i>}
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/international-insurance-documents/${doc.id}`)}
                              className="action-btn view"
                              aria-label="عرض"
                              title="عرض"
                              style={{ background: '#10b981', color: '#fff' }}
                            >
                              <i className="fa-solid fa-eye"></i>
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => navigate(`/international-insurance-documents/${doc.id}/edit`)}
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
              {totalDocuments === 0 ? (
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
                          <h4 className="user-mobile-title">{doc.document_number}</h4>
                          <span className="user-mobile-number">تأمين السيارات الدولي</span>
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
                            {doc.total ? (typeof doc.total === 'number' ? doc.total : parseFloat(String(doc.total)) || 0).toFixed(3) : '0.000'} د.ل
                          </span>
                        </div>
                        {isAdmin && doc.agency_name && (
                          <div className="user-mobile-row">
                            <span className="user-mobile-label">اسم الوكالة:</span>
                            <span className="user-mobile-value">{doc.agency_name}</span>
                          </div>
                        )}
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">الاتحاد (LIFO):</span>
                          <span className="user-mobile-value">
                            {doc.external_policy_number ? (
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '8px',
                                backgroundColor: '#dcfce7',
                                color: '#166534',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}>
                                مربوط ({doc.external_policy_number})
                              </span>
                            ) : (
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '8px',
                                backgroundColor: '#fee2e2',
                                color: '#991b1b',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}>
                                غير مربوط
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="user-mobile-actions">
                          <button
                            onClick={() => {
                              const iframe = document.createElement('iframe');
                              iframe.style.position = 'fixed';
                              iframe.style.right = '-9999px';
                              iframe.style.width = '0';
                              iframe.style.height = '0';
                              iframe.src = `${API_BASE_URL}/international-insurance-documents/${doc.id}/print?t=${new Date().getTime()}`;
                              document.body.appendChild(iframe);
                              setTimeout(() => {
                                if (document.body.contains(iframe)) {
                                  document.body.removeChild(iframe);
                                }
                              }, 5000);
                            }}
                            className="action-btn"
                            aria-label="طباعة وثيقة المدار"
                            title="طباعة وثيقة المدار"
                            style={{ background: '#3b82f6', color: '#fff' }}
                          >
                            <i className="fa-solid fa-print"></i>
                          </button>
                          {doc.external_policy_number && (
                            <button
                              onClick={() => handlePrintLifoCard(doc.id, doc.external_policy_number!)}
                              className="action-btn"
                              aria-label="طباعة وثيقة الاتحاد"
                              title={`طباعة وثيقة الاتحاد (${doc.external_policy_number})`}
                              disabled={printingLifo === doc.id}
                              style={{ background: '#f97316', color: '#fff', opacity: printingLifo === doc.id ? 0.6 : 1 }}
                            >
                              {printingLifo === doc.id
                                ? <i className="fa-solid fa-spinner fa-spin"></i>
                                : <i className="fa-solid fa-id-card"></i>}
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/international-insurance-documents/${doc.id}`)}
                            className="action-btn view"
                            aria-label="عرض"
                            title="عرض"
                            style={{ background: '#10b981', color: '#fff' }}
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => navigate(`/international-insurance-documents/${doc.id}/edit`)}
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
              هل أنت متأكد من حذف الوثيقة <strong>{showDeleteModal.document_number}</strong>؟
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