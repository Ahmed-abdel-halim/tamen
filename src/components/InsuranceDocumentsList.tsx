import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";
import { generatePremiumExcel } from "../utils/excelGenerator";

type Plate = {
  id: number;
  plate_number: string;
  city: {
    id: number;
    name_ar: string;
    name_en: string;
  };
};

type VehicleType = {
  id: number;
  brand: string;
  category: string;
};

type InsuranceDocument = {
  id: number;
  insurance_type: string;
  insurance_number: string;
  issue_date: string;
  plate?: Plate;
  port?: string;
  vehicle_type?: VehicleType;
  insured_name?: string;
  phone?: string;
  premium: number | string;
  total: number | string;
  ownership_transfer_count?: number;
  has_ownership_transfer?: boolean;
  agency_name?: string; // اسم الوكالة (يظهر للادمن فقط)
  eidc_sync_status?: 'pending' | 'synced' | 'failed' | null;
  eidc_policy_id?: string | null;
  eidc_pdf_url?: string | null;
};

export default function InsuranceDocumentsList({ isArchive = false }: { isArchive?: boolean } = {}) {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<InsuranceDocument[]>([]);
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState<InsuranceDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Cancel document state
  const [showCancelModal, setShowCancelModal] = useState<InsuranceDocument | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [canceling, setCanceling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const perPage = 15;
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

      const url = `${API_BASE_URL}/insurance-documents?${params.toString()}`;
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
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      const token = localStorage.getItem('token');

      const headers: HeadersInit = { 'Accept': 'application/json' };
      if (userId) {
        headers['X-User-Id'] = userId.toString();
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/insurance-documents/${showDeleteModal.id}`, {
        method: 'DELETE',
        headers
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

  // ─── Cancel Document Handler ───────────────────────────────────────────────
  const handleCancel = async () => {
    if (!showCancelModal) return;
    if (!cancelReason.trim()) {
      showToast('يرجى إدخال سبب الإلغاء', 'error');
      return;
    }
    setCanceling(true);
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      const token = localStorage.getItem('token');
      const headers: HeadersInit = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
      if (userId) headers['X-User-Id'] = userId.toString();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/insurance-documents/${showCancelModal.id}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ cancel_reason: cancelReason.trim(), user_id: userId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'حدث خطأ أثناء إلغاء الوثيقة');
      }

      showToast('تم إلغاء الوثيقة بنجاح — لن تظهر في الحسابات', 'success');
      setShowCancelModal(null);
      setCancelReason('');
      fetchDocuments();
    } catch (error: any) {
      showToast(`خطأ: ${error.message || ''}`, 'error');
    } finally {
      setCanceling(false);
    }
  };

  const handleRetryEidcSync = async (id: number) => {
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      const token = localStorage.getItem('token');

      const headers: HeadersInit = { 'Accept': 'application/json' };
      if (userId) {
        headers['X-User-Id'] = userId.toString();
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/insurance-documents/${id}/eidc-retry`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (res.ok) {
        showToast('تمت إعادة محاولة المزامنة بنجاح', 'success');
        fetchDocuments();
      } else {
        showToast(data.message || 'فشلت إعادة محاولة المزامنة', 'error');
      }
    } catch (error) {
      showToast('حدث خطأ أثناء الاتصال بالنظام', 'error');
    }
  };

  const handleGlobalSync = async () => {
    setSyncing(true);
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      const token = localStorage.getItem('token');

      const headers: HeadersInit = { 'Accept': 'application/json' };
      if (userId) {
        headers['X-User-Id'] = userId.toString();
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // If filters.agentId is set, pass it to the sync endpoint
      const params = new URLSearchParams();
      if (filters.agentId) {
        params.append('branch_agent_id', filters.agentId);
      }

      const res = await fetch(`${API_BASE_URL}/insurance-documents/eidc-sync-all?${params.toString()}`, {
        method: 'POST',
        headers
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'تمت المزامنة الكلية بنجاح', 'success');
        fetchDocuments();
      } else {
        showToast(data.message || 'فشلت المزامنة الكلية', 'error');
      }
    } catch (error) {
      showToast('حدث خطأ أثناء الاتصال بالنظام', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleExportExcel = async () => {
    if (documents.length === 0) { showToast('لا توجد بيانات لتصديرها', 'error'); return; }
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    
    try {
      const columns = [
        { header: 'رقم التأمين', key: 'insurance_number', width: 25 },
        { header: 'تاريخ الإصدار', key: 'issue_date', width: 25 },
        { header: 'اسم المؤمن له', key: 'insured_name', width: 35 },
        { header: 'رقم الهاتف', key: 'phone', width: 15 },
        { header: 'نوع التأمين', key: 'insurance_type', width: 20 },
        { header: 'القسط الكلي', key: 'total', width: 15 },
        { header: 'الوكالة', key: 'agency_name', width: 25 },
      ];

      const data = documents.map(doc => ({
        insurance_number: doc.insurance_number,
        issue_date: doc.issue_date ? new Date(doc.issue_date).toLocaleString('ar-LY') : '-',
        insured_name: doc.insured_name || '-',
        phone: doc.phone || '-',
        insurance_type: doc.insurance_type,
        total: (typeof doc.total === 'number' ? doc.total : parseFloat(String(doc.total)) || 0).toFixed(2) + ' د.ل',
        agency_name: doc.agency_name || '-',
      }));

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير وثائق تأمين السيارات',
        subtitle: `إجمالي الوثائق المعروضة: ${totalDocuments} - تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'تقرير_تأمين_السيارات',
        qrData: `تقرير وثائق السيارات - شركة المدار الليبي\nعدد الوثائق: ${totalDocuments}\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير التقرير بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>{isArchive ? 'ارشيف الوثائق المنتهيه / وثائق تأمين السيارات' : 'وثائق تأمين السيارات / قائمة الوثائق'}</span>
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
          {!isArchive && (
            <button
              className="primary add-user-btn"
              onClick={() => navigate('/insurance-documents/create')}
            >
              <i className="fa-solid fa-plus"></i>
              إضافة وثيقة
            </button>
          )}
          {!isArchive && isAdmin && (
            <button
              className="primary add-user-btn"
              onClick={handleGlobalSync}
              disabled={syncing}
              style={{ background: '#0284c7', marginRight: '10px' }}
            >
              {syncing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-sync"></i>}
              {syncing ? ' جاري المزامنة...' : ' مزامنة مع الهيئة'}
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
                      style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}
                    >
                      كل الوكلاء
                    </div>
                    {agents.filter(a => a.agency_name.toLowerCase().includes(agentSearch.toLowerCase())).map(a => (
                      <div
                        key={a.id}
                        onClick={() => {
                          setFilters({ ...filters, agentId: a.id.toString() });
                          setAgentSearch(a.agency_name);
                          setShowAgentDropdown(false);
                        }}
                        style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}
                      >
                        {a.agency_name}
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
              {Array.from({length: 10}, (_, i) => 2024 + i).map(y => <option key={y} value={y}>{y}</option>)}
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
              {Array.from({length: 12}, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
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
              {Array.from({length: 31}, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button 
            onClick={() => {
              setFilters({ agentId: '', year: '', month: '', day: '' });
              setSearchQuery('');
              setAgentSearch('');
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
                    <th>القسط </th>
                    <th>نوع التأمين</th>
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

                    return (
                      <tr key={doc.id}>
                        <td>{doc.insurance_number}</td>
                        <td>{issueDate}</td>
                        <td>{doc.insured_name || '-'}</td>
                        <td>{doc.phone || '-'}</td>
                        <td>{doc.total ? (typeof doc.total === 'number' ? doc.total : parseFloat(String(doc.total)) || 0).toFixed(2) : '0.00'} د.ل</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{doc.insurance_type}</span>
                            {doc.has_ownership_transfer && (
                              <span
                                title={`تم نقل الملكية ${doc.ownership_transfer_count || 0} مرة`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: '#10b981',
                                  color: '#fff',
                                  borderRadius: '50%',
                                  width: '20px',
                                  height: '20px',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  flexShrink: 0,
                                }}
                              >
                                <i className="fa-solid fa-exchange-alt"></i>
                              </span>
                            )}
                            {doc.insurance_type === 'تأمين إجباري سيارات' && doc.eidc_sync_status && (
                              <span
                                title={
                                  doc.eidc_policy_id ? 'مسجلة في الهيئة' : 
                                  doc.eidc_sync_status === 'failed' ? 'فشل التسجيل في الهيئة' : 'في انتظار المزامنة'
                                }
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 
                                    doc.eidc_policy_id ? '#10b981' : 
                                    doc.eidc_sync_status === 'failed' ? '#ef4444' : '#f59e0b',
                                  fontSize: '14px',
                                  cursor: 'help'
                                }}
                              >
                                <i className={`fa-solid ${
                                  doc.eidc_policy_id ? 'fa-circle-check' : 
                                  doc.eidc_sync_status === 'failed' ? 'fa-circle-xmark' : 'fa-clock'
                                }`}></i>
                              </span>
                            )}
                          </div>
                        </td>
                        {isAdmin && (
                          <td>{doc.agency_name || '-'}</td>
                        )}
                        <td>
                          <div className="action-buttons">
                            {doc.insurance_type !== 'تأمين إجباري سيارات' && (
                              <button
                                onClick={() => {
                                  const iframe = document.createElement('iframe');
                                  iframe.style.position = 'fixed';
                                  iframe.style.right = '-9999px';
                                  iframe.style.width = '0';
                                  iframe.style.height = '0';
                                  iframe.src = `${API_BASE_URL}/insurance-documents/${doc.id}/print?t=${new Date().getTime()}`;
                                  document.body.appendChild(iframe);

                                  setTimeout(() => {
                                    if (document.body.contains(iframe)) {
                                      document.body.removeChild(iframe);
                                    }
                                  }, 5000);
                                }}
                                className="action-btn"
                                aria-label="طباعة الوثيقة"
                                title="طباعة الوثيقة"
                                style={{ background: '#3b82f6', color: '#fff' }}
                              >
                                <i className="fa-solid fa-print"></i>
                              </button>
                            )}
                              {doc.eidc_sync_status === 'failed' && (
                                <button
                                  onClick={() => handleRetryEidcSync(doc.id)}
                                  className="action-btn"
                                  title="إعادة محاولة المزامنة مع الهيئة"
                                  style={{ background: '#f59e0b', color: '#fff' }}
                                >
                                  <i className="fa-solid fa-rotate"></i>
                                </button>
                              )}
                              {doc.eidc_pdf_url && (
                                <button
                                  onClick={() => {
                                    const iframe = document.createElement('iframe');
                                    iframe.style.position = 'fixed';
                                    iframe.style.right = '-9999px';
                                    iframe.style.width = '0';
                                    iframe.style.height = '0';
                                    iframe.src = `${API_BASE_URL}/insurance-documents/${doc.id}/eidc-print?t=${new Date().getTime()}`;
                                    document.body.appendChild(iframe);

                                    iframe.onload = () => {
                                      try {
                                        iframe.contentWindow?.focus();
                                        iframe.contentWindow?.print();
                                      } catch (e) {
                                        window.open(`${API_BASE_URL}/insurance-documents/${doc.id}/eidc-print`, '_blank');
                                      }
                                    };

                                    setTimeout(() => {
                                      if (document.body.contains(iframe)) {
                                        document.body.removeChild(iframe);
                                      }
                                    }, 10000);
                                  }}
                                  className="action-btn"
                                  title="طابعة الهيئة"
                                  style={{ background: '#7c3aed', color: '#fff' }}
                                >
                                  <i className="fa-solid fa-print"></i>
                                </button>
                              )}
                              <button
                              onClick={() => navigate(`/insurance-documents/${doc.id}`)}
                              className="action-btn view"
                              aria-label="عرض"
                              title="عرض"
                              style={{ background: '#10b981', color: '#fff' }}
                            >
                              <i className="fa-solid fa-eye"></i>
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => navigate(`/insurance-documents/${doc.id}/edit`)}
                                className="action-btn edit"
                                aria-label="تعديل"
                                title="تعديل"
                              >
                                <i className="fa-solid fa-pencil"></i>
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => { setShowCancelModal(doc); setCancelReason(''); }}
                                className="action-btn cancel-btn"
                                style={{ background: '#e74c3c', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}
                                aria-label="إلغاء الوثيقة"
                                title="إلغاء الوثيقة (تستثنى من الحسابات)"
                              >
                                <i className="fa-solid fa-ban"></i> إلغاء
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
                          <h4 className="user-mobile-title">{doc.insurance_number}</h4>
                          <span className="user-mobile-number">{doc.insurance_type}</span>
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
                            {doc.total ? (typeof doc.total === 'number' ? doc.total : parseFloat(String(doc.total)) || 0).toFixed(2) : '0.00'} د.ل
                          </span>
                        </div>
                        {doc.has_ownership_transfer && (
                          <div className="user-mobile-row">
                            <span className="user-mobile-label">نقل الملكية:</span>
                            <span className="user-mobile-value">
                              <span
                                title={`تم نقل الملكية ${doc.ownership_transfer_count || 0} مرة`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: '#10b981',
                                  color: '#fff',
                                  borderRadius: '50%',
                                  width: '20px',
                                  height: '20px',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                }}
                              >
                                <i className="fa-solid fa-exchange-alt"></i>
                              </span>
                            </span>
                          </div>
                        )}
                        {isAdmin && doc.agency_name && (
                          <div className="user-mobile-row">
                            <span className="user-mobile-label">اسم الوكالة:</span>
                            <span className="user-mobile-value">{doc.agency_name}</span>
                          </div>
                        )}
                        <div className="user-mobile-actions">
                          {doc.insurance_type !== 'تأمين إجباري سيارات' && (
                            <button
                              onClick={() => {
                                const iframe = document.createElement('iframe');
                                iframe.style.position = 'fixed';
                                iframe.style.right = '-9999px';
                                iframe.style.width = '0';
                                iframe.style.height = '0';
                                iframe.src = `${API_BASE_URL}/insurance-documents/${doc.id}/print?t=${new Date().getTime()}`;
                                document.body.appendChild(iframe);

                                setTimeout(() => {
                                  if (document.body.contains(iframe)) {
                                    document.body.removeChild(iframe);
                                  }
                                }, 5000);
                              }}
                              className="action-btn"
                              aria-label="طباعة الوثيقة"
                              title="طباعة الوثيقة"
                              style={{ background: '#3b82f6', color: '#fff' }}
                            >
                              <i className="fa-solid fa-print"></i>
                            </button>
                          )}
                          {doc.eidc_pdf_url && (
                            <button
                              onClick={() => {
                                const iframe = document.createElement('iframe');
                                iframe.style.position = 'fixed';
                                iframe.style.right = '-9999px';
                                iframe.style.width = '0';
                                iframe.style.height = '0';
                                iframe.src = `${API_BASE_URL}/insurance-documents/${doc.id}/eidc-print?t=${new Date().getTime()}`;
                                document.body.appendChild(iframe);

                                iframe.onload = () => {
                                  try {
                                    iframe.contentWindow?.focus();
                                    iframe.contentWindow?.print();
                                  } catch (e) {
                                    window.open(`${API_BASE_URL}/insurance-documents/${doc.id}/eidc-print`, '_blank');
                                  }
                                };

                                setTimeout(() => {
                                  if (document.body.contains(iframe)) {
                                    document.body.removeChild(iframe);
                                  }
                                }, 10000);
                              }}
                              className="action-btn"
                              title="طابعة الهيئة"
                              style={{ background: '#7c3aed', color: '#fff' }}
                            >
                              <i className="fa-solid fa-print"></i>
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/insurance-documents/${doc.id}`)}
                            className="action-btn view"
                            aria-label="عرض"
                            title="عرض"
                            style={{ background: '#10b981', color: '#fff' }}
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => navigate(`/insurance-documents/${doc.id}/edit`)}
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

      {showCancelModal && (
        <div className="modal-overlay" onClick={() => !canceling && setShowCancelModal(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: '#1e1e38', border: '1px solid rgba(231,76,60,0.4)', borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '90%', direction: 'rtl', color: '#fff' }}>
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(231,76,60,0.2)', color: '#e74c3c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 12px' }}>
                🚫
              </div>
              <h3 style={{ margin: 0, fontSize: '20px', color: '#e74c3c' }}>إلغاء الوثيقة</h3>
              <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                الوثيقة رقم: <strong style={{ color: '#fff' }}>{showCancelModal.insurance_number}</strong>
              </p>
            </div>

            <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '12px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>
              💡 <strong>تنويه هام:</strong> سيتم إلغاء هذه الوثيقة واستبعادها تماماً من كشف حساب الوكيل والتقارير المالية، لكن يمكن استعراضها دائماً في قسم "الوثائق الملغية".
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>
                سبب الإلغاء <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="اكتب سبب إلغاء الوثيقة هنا (مثال: بناءً على طلب المؤمن / استبدال بوليسة)..."
                rows={4}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '14px', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCancelModal(null)}
                disabled={canceling}
                style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '14px' }}
              >
                تراجع
              </button>
              <button
                onClick={handleCancel}
                disabled={canceling}
                style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #e74c3c, #c0392b)', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
              >
                {canceling ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


