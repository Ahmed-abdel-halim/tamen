import { useEffect, useState, useMemo } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import SearchableSelect from './SearchableSelect';

const documentTypeOptions = [
  { value: 'تأمين سيارات', label: 'تأمين سيارات' },
  { value: 'تأمين سيارات دولي', label: 'تأمين سيارات دولي' },
  { value: 'تأمين طبي (مسافرين)', label: 'تأمين طبي (مسافرين)' },
  { value: 'تأمين طبي (وافدين)', label: 'تأمين طبي (وافدين)' },
  { value: 'تأمين هياكل بحرية', label: 'تأمين هياكل بحرية' },
  { value: 'تأمين مسؤولية مهنية', label: 'تأمين مسؤولية مهنية' },
  { value: 'تأمين حوادث شخصية', label: 'تأمين حوادث شخصية' },
  { value: 'تأمين نقل نقدية', label: 'تأمين نقل نقدية' },
  { value: 'تأمين نقل بضائع', label: 'تأمين نقل بضائع' },
  { value: 'تأمين حماية طلاب مدارس', label: 'تأمين حماية طلاب مدارس' },
  { value: 'تأمين أخطار هندسية', label: 'تأمين أخطار هندسية' },
  { value: 'تأمين خيانة أمانة', label: 'تأمين خيانة أمانة' },
  { value: 'تأمين سطو', label: 'تأمين سطو' },
  { value: 'تأمين حريق', label: 'تأمين حريق' },
  { value: 'أخرى', label: 'أخرى' },
];

type DocumentRequest = {
  id: number;
  request_code?: string;
  branch_agent_id: number;
  user_id: number;
  request_type: 'modification' | 'cancellation';
  document_type?: string;
  document_number: string;
  document_id?: number | string;
  insured_name?: string;
  cancellation_reason?: string;
  cancellation_reason_other?: string;
  notes?: string;
  legal_acknowledged?: boolean;
  applicant_name?: string;
  subject: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  admin_message?: string;
  reviewed_by?: number;
  reviewed_at?: string;
  reviewer?: {
    id: number;
    name: string;
  };
  created_at: string;
  branch_agent?: {
    id?: number;
    agency_name: string;
    agent_name: string;
    agency_number?: string;
    code?: string;
  };
  user?: {
    id: number;
    name: string;
    username?: string;
  };
};

export default function DocumentRequestsList() {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [detailModalRequest, setDetailModalRequest] = useState<DocumentRequest | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<DocumentRequest | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState<'all' | 'cancellation' | 'modification'>('all');
  const [insuranceTypeFilter, setInsuranceTypeFilter] = useState<string>('all');

  const [newRequest, setNewRequest] = useState({
    request_type: 'modification',
    document_type: '',
    document_number: '',
    subject: '',
    description: '',
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const userId = user?.id;

      const res = await fetch(`${API_BASE_URL}/document-requests?user_id=${userId}`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error('فشل جلب الطلبات');
      const data = await res.json();
      setRequests(data);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.is_admin || false);
      } catch {
        setIsAdmin(false);
      }
    }
    fetchRequests();
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('تم نسخ رقم الوثيقة بنجاح', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const res = await fetch(`${API_BASE_URL}/document-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-User-Id': user?.id?.toString() || '',
        },
        body: JSON.stringify({
          ...newRequest,
          applicant_name: user?.name || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || 'فشل تقديم الطلب');
      }

      showToast('تم تقديم طلب الوثيقة بنجاح', 'success');
      window.dispatchEvent(new CustomEvent('documentRequestsUpdated'));
      setShowRequestModal(false);
      setNewRequest({
        request_type: 'modification',
        document_type: '',
        document_number: '',
        subject: '',
        description: '',
      });
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: 'accepted' | 'rejected') => {
    setSubmitting(true);
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const res = await fetch(`${API_BASE_URL}/document-requests/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-User-Id': user?.id?.toString() || '',
        },
        body: JSON.stringify({ status, admin_message: adminMessage }),
      });

      if (!res.ok) throw new Error('فشل تحديث حالة الطلب');

      const actionText = status === 'accepted' ? 'تم قبول واعتماد الطلب' : 'تم رفض الطلب';
      showToast(`${actionText} وتم إرسال الإشعار للوكيل بنجاح`, 'success');

      window.dispatchEvent(new CustomEvent('documentRequestsUpdated'));
      setShowStatusModal(false);
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintNotice = (reqId: number) => {
    const printUrl = `${API_BASE_URL}/document-requests/${reqId}/print-cancellation`;
    window.open(printUrl, '_blank', 'width=900,height=800');
  };

  // Distinct unique insurance types from current requests
  const uniqueDocTypes = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      if (r.document_type) set.add(r.document_type.trim());
    });
    return Array.from(set);
  }, [requests]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter((r) => r.status === 'pending').length,
      accepted: requests.filter((r) => r.status === 'accepted').length,
      rejected: requests.filter((r) => r.status === 'rejected').length,
    };
  }, [requests]);

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (requestTypeFilter !== 'all' && req.request_type !== requestTypeFilter) return false;
      if (insuranceTypeFilter !== 'all' && req.document_type !== insuranceTypeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = (req.request_code || `AL-${String(req.id).padStart(6, '0')}`).toLowerCase();
        const docNum = (req.document_number || '').toLowerCase();
        const insured = (req.insured_name || '').toLowerCase();
        const agency = (req.branch_agent?.agency_name || '').toLowerCase();
        const applicant = (req.applicant_name || req.user?.name || '').toLowerCase();
        const reason = (req.cancellation_reason || req.subject || '').toLowerCase();
        const reasonOther = (req.cancellation_reason_other || '').toLowerCase();
        const notes = (req.notes || '').toLowerCase();
        const docType = (req.document_type || '').toLowerCase();

        return (
          code.includes(q) ||
          docNum.includes(q) ||
          insured.includes(q) ||
          agency.includes(q) ||
          applicant.includes(q) ||
          reason.includes(q) ||
          reasonOther.includes(q) ||
          notes.includes(q) ||
          docType.includes(q)
        );
      }
      return true;
    });
  }, [requests, statusFilter, requestTypeFilter, insuranceTypeFilter, searchQuery]);

  const getStatusBadge = (status: string) => {
    if (status === 'accepted') {
      return (
        <span className="doc-status-badge accepted">
          <i className="fa-solid fa-circle-check"></i>
          <span>مقبول</span>
        </span>
      );
    }
    if (status === 'rejected') {
      return (
        <span className="doc-status-badge rejected">
          <i className="fa-solid fa-circle-xmark"></i>
          <span>مرفوض</span>
        </span>
      );
    }
    return (
      <span className="doc-status-badge pending">
        <i className="fa-solid fa-clock"></i>
        <span>في الانتظار</span>
      </span>
    );
  };

  const getTypeName = (type: string) => {
    return type === 'modification' ? 'تعديل وثيقة' : 'إلغاء وثيقة';
  };

  // Dedicated badge for Insurance Type column
  const getInsuranceTypeBadge = (docType?: string) => {
    if (!docType) {
      return (
        <span className="doc-type-badge default">
          <i className="fa-solid fa-shield-halved"></i>
          <span>غير محدد</span>
        </span>
      );
    }

    let icon = 'fa-shield-halved';
    let badgeClass = 'default';

    if (docType.includes('سيارات') || docType.includes('مركبات') || docType.includes('إجباري')) {
      icon = 'fa-car-side';
      badgeClass = 'motor';
    } else if (docType.includes('دولي') || docType.includes('مسافرين')) {
      icon = 'fa-earth-americas';
      badgeClass = 'travel';
    } else if (docType.includes('طبي') || docType.includes('وافدين')) {
      icon = 'fa-heart-pulse';
      badgeClass = 'medical';
    } else if (docType.includes('بحري') || docType.includes('هياكل')) {
      icon = 'fa-ship';
      badgeClass = 'marine';
    } else if (docType.includes('نقدية') || docType.includes('أموال')) {
      icon = 'fa-money-bill-transfer';
      badgeClass = 'cash';
    } else if (docType.includes('بضائع') || docType.includes('شحن') || docType.includes('نقل')) {
      icon = 'fa-truck-fast';
      badgeClass = 'cargo';
    } else if (docType.includes('حريق')) {
      icon = 'fa-fire-flame-curved';
      badgeClass = 'fire';
    } else if (docType.includes('هندسي') || docType.includes('أخطار')) {
      icon = 'fa-helmet-safety';
      badgeClass = 'engineering';
    }

    return (
      <span className={`doc-type-badge ${badgeClass}`} title={docType}>
        <i className={`fa-solid ${icon}`}></i>
        <span>{docType}</span>
      </span>
    );
  };

  return (
    <section className="users-management font-cairo" style={{ direction: 'rtl' }}>
      <style>{`
        .doc-requests-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .doc-requests-header-card {
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.03);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .doc-requests-title-wrapper h2 {
          font-size: 1.35rem;
          font-weight: 900;
          color: var(--text, #0f172a);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .doc-requests-title-wrapper p {
          color: var(--muted, #64748b);
          font-size: 0.88rem;
          margin: 4px 0 0 0;
        }
        .doc-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        @media (max-width: 992px) {
          .doc-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 540px) {
          .doc-stats-grid { grid-template-columns: 1fr; }
        }
        .doc-stat-card {
          background: var(--card-bg, #ffffff);
          border: 1.5px solid var(--border, #e2e8f0);
          border-radius: 14px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
          position: relative;
          overflow: hidden;
        }
        .doc-stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.06);
          border-color: #cbd5e1;
        }
        .doc-stat-card.active {
          border-color: #2563eb;
          background: #f8fafc;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
        }
        .doc-stat-card.active::before {
          content: '';
          position: absolute;
          bottom: 0;
          right: 0;
          left: 0;
          height: 3.5px;
          background: #2563eb;
        }
        .doc-stat-card.pending.active::before { background: #f59e0b; }
        .doc-stat-card.accepted.active::before { background: #10b981; }
        .doc-stat-card.rejected.active::before { background: #ef4444; }

        .stat-icon-box {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }
        .stat-icon-box.total { background: #eff6ff; color: #2563eb; }
        .stat-icon-box.pending { background: #fffbeb; color: #d97706; }
        .stat-icon-box.accepted { background: #ecfdf5; color: #059669; }
        .stat-icon-box.rejected { background: #fef2f2; color: #dc2626; }

        .stat-info { display: flex; flex-direction: column; }
        .stat-label { font-size: 0.82rem; font-weight: 700; color: var(--muted, #64748b); }
        .stat-number { font-size: 1.55rem; font-weight: 900; color: var(--text, #0f172a); line-height: 1.2; }

        .doc-filter-card {
          background: var(--card-bg, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 14px;
          padding: 14px 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .search-box-wrapper {
          flex: 1;
          min-width: 280px;
          position: relative;
          display: flex;
          align-items: center;
        }
        .search-icon {
          position: absolute;
          right: 14px;
          color: #94a3b8;
          font-size: 0.95rem;
          pointer-events: none;
        }
        .doc-search-input {
          width: 100%;
          padding: 10px 40px 10px 36px;
          border: 1.5px solid var(--border, #e2e8f0);
          border-radius: 10px;
          background: #f8fafc;
          color: var(--text, #1e293b);
          font-size: 0.88rem;
          outline: none;
          transition: all 0.2s ease;
        }
        .doc-search-input:focus {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        .clear-search-btn {
          position: absolute;
          left: 12px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 0.85rem;
        }
        .filter-controls-group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .doc-filter-select {
          padding: 9px 14px;
          border: 1.5px solid var(--border, #e2e8f0);
          border-radius: 10px;
          background: #f8fafc;
          color: var(--text, #1e293b);
          font-size: 0.84rem;
          font-weight: 700;
          outline: none;
          cursor: pointer;
        }
        .doc-filter-select:focus {
          border-color: #2563eb;
        }
        .doc-btn-refresh {
          padding: 9px 14px;
          border: 1.5px solid var(--border, #e2e8f0);
          border-radius: 10px;
          background: #f8fafc;
          color: var(--text, #475569);
          cursor: pointer;
          font-size: 0.9rem;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .doc-btn-refresh:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        /* Table styling - 100% Width No Scroll & Full Legibility */
        .users-table-wrapper.no-scroll-wrapper {
          overflow-x: hidden !important;
          width: 100% !important;
          max-width: 100% !important;
          box-sizing: border-box;
        }
        .modern-doc-table {
          width: 100% !important;
          max-width: 100% !important;
          table-layout: fixed !important;
          border-collapse: separate;
          border-spacing: 0;
          box-sizing: border-box;
        }
        .modern-doc-table thead th {
          background: #f8fafc;
          color: #475569;
          font-size: 0.76rem;
          font-weight: 800;
          padding: 10px 4px;
          border-bottom: 2px solid #e2e8f0;
          text-align: center;
          white-space: normal;
          word-break: break-word;
          line-height: 1.3;
          vertical-align: middle;
          box-sizing: border-box;
        }
        .modern-doc-table tbody tr {
          transition: background 0.15s ease;
        }
        .modern-doc-table tbody tr:hover {
          background: #f8fafc;
        }
        .modern-doc-table tbody td {
          padding: 8px 4px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          font-size: 0.77rem;
          text-align: center;
          box-sizing: border-box;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        /* Code badge */
        .req-code-pill {
          display: inline-block;
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          padding: 3px 6px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 800;
          direction: ltr;
          font-family: 'Courier New', monospace;
          white-space: nowrap;
          letter-spacing: -0.2px;
        }
        .agency-cell {
          display: flex;
          flex-direction: column;
          gap: 3px;
          text-align: right;
          padding: 0 4px;
          width: 100%;
          box-sizing: border-box;
        }
        .agency-name {
          font-weight: 800;
          color: var(--text, #1e293b);
          display: flex;
          align-items: flex-start;
          gap: 5px;
          font-size: 0.77rem;
          line-height: 1.3;
          word-break: break-word;
          white-space: normal;
        }
        .agency-name i {
          margin-top: 3px;
          flex-shrink: 0;
        }
        .agency-name span {
          word-break: break-word;
          white-space: normal;
        }
        .applicant-sub {
          font-size: 0.71rem;
          color: var(--muted, #64748b);
          display: flex;
          align-items: center;
          gap: 4px;
          line-height: 1.2;
          word-break: break-word;
          white-space: normal;
        }
        .applicant-sub i {
          flex-shrink: 0;
        }
        .applicant-sub span {
          word-break: break-word;
          white-space: normal;
        }
        .req-type-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 4px 7px;
          border-radius: 6px;
          font-size: 0.74rem;
          font-weight: 800;
          white-space: nowrap;
        }
        .req-type-pill.cancellation {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fca5a5;
        }
        .req-type-pill.modification {
          background: #e0e7ff;
          color: #4338ca;
          border: 1px solid #c7d2fe;
        }

        /* Dedicated Insurance Type Pill */
        .doc-type-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 3px 6px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 800;
          white-space: normal;
          word-break: break-word;
          text-align: center;
          line-height: 1.25;
          max-width: 100%;
          box-sizing: border-box;
        }
        .doc-type-badge i {
          flex-shrink: 0;
        }
        .doc-type-badge span {
          white-space: normal;
          word-break: break-word;
        }
        .doc-type-badge.motor {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        .doc-type-badge.travel {
          background: #f0fdf4;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }
        .doc-type-badge.medical {
          background: #fdf2f8;
          color: #be185d;
          border: 1px solid #fbcfe8;
        }
        .doc-type-badge.marine {
          background: #ecfeff;
          color: #0e7490;
          border: 1px solid #a5f3fc;
        }
        .doc-type-badge.cash {
          background: #fefce8;
          color: #a16207;
          border: 1px solid #fef08a;
        }
        .doc-type-badge.cargo {
          background: #faf5ff;
          color: #7e22ce;
          border: 1px solid #e9d5ff;
        }
        .doc-type-badge.fire {
          background: #fff7ed;
          color: #c2410c;
          border: 1px solid #fed7aa;
        }
        .doc-type-badge.engineering {
          background: #f8fafc;
          color: #475569;
          border: 1px solid #cbd5e1;
        }
        .doc-type-badge.default {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #e2e8f0;
        }

        /* Document Data Cell */
        .doc-data-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: center;
          justify-content: center;
          padding: 0 2px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .doc-num-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 3px 6px;
          cursor: pointer;
          transition: all 0.15s ease;
          max-width: 100%;
          box-sizing: border-box;
        }
        .doc-num-wrapper:hover {
          background: #e2e8f0;
          border-color: #94a3b8;
        }
        .doc-num-text {
          font-family: 'Courier New', monospace;
          font-weight: 800;
          color: #dc2626;
          direction: ltr;
          font-size: 0.72rem;
          white-space: normal;
          word-break: break-all;
          overflow-wrap: anywhere;
          line-height: 1.25;
          text-align: center;
          letter-spacing: -0.2px;
        }
        .copy-btn {
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.70rem;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .insured-name-text {
          font-size: 0.73rem;
          font-weight: 700;
          color: var(--text, #1e293b);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          line-height: 1.25;
          text-align: center;
          word-break: break-word;
          white-space: normal;
          width: 100%;
          box-sizing: border-box;
        }
        .insured-name-text i {
          flex-shrink: 0;
        }

        /* Reason Cell */
        .reason-cell {
          display: flex;
          flex-direction: column;
          gap: 3px;
          text-align: right;
          padding: 0 4px;
        }
        .reason-pill {
          font-weight: 800;
          color: #b91c1c;
          font-size: 0.75rem;
          display: flex;
          align-items: flex-start;
          gap: 4px;
          line-height: 1.3;
        }
        .reason-pill i {
          margin-top: 3px;
          flex-shrink: 0;
        }
        .reason-pill span {
          word-break: break-word;
          white-space: normal;
        }
        .reason-detail-text {
          font-size: 0.70rem;
          color: var(--muted, #475569);
          line-height: 1.25;
          word-break: break-word;
          white-space: normal;
        }
        .notes-pill {
          font-size: 0.70rem;
          color: var(--muted, #64748b);
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 4px;
          padding: 2px 5px;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          width: fit-content;
          line-height: 1.2;
        }
        .notes-pill span {
          word-break: break-word;
          white-space: normal;
        }

        /* Date Cell */
        .date-cell {
          display: flex;
          flex-direction: column;
          gap: 1px;
          font-size: 0.74rem;
          color: var(--text, #334155);
          align-items: center;
        }
        .date-day {
          font-weight: 700;
          white-space: nowrap;
        }
        .date-time {
          font-size: 0.68rem;
          color: var(--muted, #94a3b8);
          display: flex;
          align-items: center;
          gap: 2px;
          white-space: nowrap;
        }

        /* Status Badge */
        .doc-status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 3px 8px;
          border-radius: 16px;
          font-size: 0.72rem;
          font-weight: 800;
          white-space: nowrap;
        }
        .doc-status-badge.accepted {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #86efac;
        }
        .doc-status-badge.pending {
          background: #fef3c7;
          color: #b45309;
          border: 1px solid #fde68a;
        }
        .doc-status-badge.rejected {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }
        .reviewed-by-sub {
          font-size: 0.68rem;
          color: var(--muted, #64748b);
          margin-top: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          white-space: nowrap;
        }

        /* Actions */
        .actions-cell {
          display: flex;
          align-items: center;
          gap: 4px;
          justify-content: center;
          flex-wrap: wrap;
          width: 100%;
        }
        .action-btn-print {
          background: #0f766e;
          color: #ffffff;
          border: none;
          padding: 4px 7px;
          border-radius: 6px;
          font-size: 0.70rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .action-btn-print:hover {
          background: #115e59;
          transform: translateY(-1px);
        }
        .action-btn-decision {
          background: #10b981;
          color: #ffffff;
          border: none;
          padding: 4px 7px;
          border-radius: 6px;
          font-size: 0.70rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .action-btn-decision:hover {
          background: #059669;
          transform: translateY(-1px);
        }
        .action-btn-detail {
          background: #f1f5f9;
          color: var(--text, #334155);
          border: 1px solid var(--border, #cbd5e1);
          padding: 4px 6px;
          border-radius: 6px;
          font-size: 0.72rem;
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .action-btn-detail:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .admin-msg-badge {
          font-size: 0.70rem;
          color: #0284c7;
          background: #e0f2fe;
          border: 1px solid #bae6fd;
          padding: 3px 5px;
          border-radius: 5px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        /* Dark mode adaptations */
        [data-theme='dark'] .doc-requests-header-card,
        [data-theme='dark'] .doc-stat-card,
        [data-theme='dark'] .doc-filter-card {
          background: #1e293b;
          border-color: #334155;
        }
        [data-theme='dark'] .modern-doc-table thead th {
          background: #0f172a;
          border-bottom-color: #334155;
          color: #94a3b8;
        }
        [data-theme='dark'] .modern-doc-table tbody tr:hover {
          background: #1e293b;
        }
        [data-theme='dark'] .modern-doc-table tbody td {
          border-bottom-color: #334155;
        }
        [data-theme='dark'] .doc-search-input,
        [data-theme='dark'] .doc-filter-select,
        [data-theme='dark'] .doc-btn-refresh {
          background: #0f172a;
          border-color: #334155;
          color: #e2e8f0;
        }
        [data-theme='dark'] .doc-num-wrapper {
          background: #0f172a;
          border-color: #334155;
        }
        [data-theme='dark'] .notes-pill,
        [data-theme='dark'] .admin-msg-badge {
          background: #0f172a;
          border-color: #334155;
          color: #94a3b8;
        }
        [data-theme='dark'] .action-btn-detail {
          background: #0f172a;
          border-color: #334155;
          color: #cbd5e1;
        }
      `}</style>

      <div className="users-breadcrumb">
        <span>الشؤون الإدارية / طلبات الوثائق</span>
      </div>

      <div className="doc-requests-container">
        {/* Header Card */}
        <div className="doc-requests-header-card">
          <div className="doc-requests-title-wrapper">
            <h2>
              <i className="fa-solid fa-file-circle-exclamation" style={{ color: '#2563eb' }}></i>
              سجل طلبات الوثائق وإلغاء الإصدار
            </h2>
            <p>متابعة وتدقيق طلبات التعديل والإلغاء المعتمدة مع إخلاء المسؤولية القانونية</p>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="btn-primary-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', fontWeight: 800 }}
            >
              <i className="fa-solid fa-plus"></i> تقديم طلب جديد
            </button>
          )}
        </div>

        {/* Statistics Grid */}
        <div className="doc-stats-grid">
          <div
            className={`doc-stat-card ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
            title="عرض جميع الطلبات"
          >
            <div className="stat-icon-box total">
              <i className="fa-solid fa-folder-open"></i>
            </div>
            <div className="stat-info">
              <span className="stat-label">إجمالي الطلبات</span>
              <span className="stat-number">{stats.total}</span>
            </div>
          </div>

          <div
            className={`doc-stat-card pending ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => setStatusFilter('pending')}
            title="تصفية الطلبات قيد المراجعة"
          >
            <div className="stat-icon-box pending">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
            <div className="stat-info">
              <span className="stat-label">قيد المراجعة</span>
              <span className="stat-number">{stats.pending}</span>
            </div>
          </div>

          <div
            className={`doc-stat-card accepted ${statusFilter === 'accepted' ? 'active' : ''}`}
            onClick={() => setStatusFilter('accepted')}
            title="تصفية الطلبات المقبولة"
          >
            <div className="stat-icon-box accepted">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <div className="stat-info">
              <span className="stat-label">ملغية ومعتمدة</span>
              <span className="stat-number">{stats.accepted}</span>
            </div>
          </div>

          <div
            className={`doc-stat-card rejected ${statusFilter === 'rejected' ? 'active' : ''}`}
            onClick={() => setStatusFilter('rejected')}
            title="تصفية الطلبات المرفوضة"
          >
            <div className="stat-icon-box rejected">
              <i className="fa-solid fa-circle-xmark"></i>
            </div>
            <div className="stat-info">
              <span className="stat-label">طلبات مرفوضة</span>
              <span className="stat-number">{stats.rejected}</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="doc-filter-card">
          <div className="search-box-wrapper">
            <i className="fa-solid fa-magnifying-glass search-icon"></i>
            <input
              type="text"
              className="doc-search-input"
              placeholder="بحث برقم الوثيقة، كود الطلب، اسم المؤمن له، أو الوكالة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search-btn" onClick={() => setSearchQuery('')} title="مسح البحث">
                <i className="fa-solid fa-times"></i>
              </button>
            )}
          </div>

          <div className="filter-controls-group">
            {/* Filter by Request Type */}
            <select
              className="doc-filter-select"
              value={requestTypeFilter}
              onChange={(e) => setRequestTypeFilter(e.target.value as any)}
            >
              <option value="all">جميع أنواع الطلبات</option>
              <option value="cancellation">إلغاء وثيقة فقط</option>
              <option value="modification">تعديل وثيقة فقط</option>
            </select>

            {/* Filter by Insurance Type */}
            <select
              className="doc-filter-select"
              value={insuranceTypeFilter}
              onChange={(e) => setInsuranceTypeFilter(e.target.value)}
            >
              <option value="all">جميع فروع التأمين</option>
              {uniqueDocTypes.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>

            {/* Status Filter select */}
            <select
              className="doc-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">جميع الحالات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="accepted">مقبول</option>
              <option value="rejected">مرفوض</option>
            </select>

            {/* Refresh Button */}
            <button
              className="doc-btn-refresh"
              onClick={fetchRequests}
              title="تحديث البيانات"
              disabled={loading}
            >
              <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Requests Table Card */}
        <div className="users-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border, #e2e8f0)', borderRadius: '16px' }}>
          <div className="users-table-wrapper no-scroll-wrapper" style={{ overflowX: 'hidden', width: '100%' }}>
            <table className="users-table modern-doc-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: isAdmin ? '7.5%' : '9%' }}>كود الطلب</th>
                  {isAdmin && <th style={{ width: '15%' }}>الوكالة / مقدم الطلب</th>}
                  <th style={{ width: isAdmin ? '8%' : '10%' }}>نوع الطلب</th>
                  <th style={{ width: isAdmin ? '11%' : '13%' }}>نوع التأمين</th>
                  <th style={{ width: isAdmin ? '18%' : '22%' }}>بيانات الوثيقة والمؤمن له</th>
                  <th style={{ width: isAdmin ? '16.5%' : '20%' }}>السبب والتفاصيل</th>
                  <th style={{ width: isAdmin ? '8%' : '9%' }}>تاريخ التقديم</th>
                  <th style={{ width: isAdmin ? '7%' : '8%' }}>الحالة</th>
                  <th style={{ width: isAdmin ? '9%' : '9%', textAlign: 'center' }}>الرد / الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '40px' }}>
                      <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '8px', fontSize: '1.2rem', color: '#2563eb' }}></i>
                      <span>جاري تحميل بيانات الطلبات...</span>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 9 : 8} style={{ textAlign: 'center', padding: '45px', color: 'var(--muted, #64748b)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-regular fa-folder-open" style={{ fontSize: '2.2rem', color: '#94a3b8' }}></i>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          {searchQuery || statusFilter !== 'all' || requestTypeFilter !== 'all' || insuranceTypeFilter !== 'all'
                            ? 'لا توجد طلبات مطابقة لخيارات البحث أو التصفية الحالية'
                            : 'لا توجد طلبات مسجلة حالياً'}
                        </span>
                        {(searchQuery || statusFilter !== 'all' || requestTypeFilter !== 'all' || insuranceTypeFilter !== 'all') && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setStatusFilter('all');
                              setRequestTypeFilter('all');
                              setInsuranceTypeFilter('all');
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              fontWeight: 700,
                              cursor: 'pointer',
                              marginTop: '4px',
                            }}
                          >
                            إعادة ضبط خيارات البحث
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id}>
                      {/* 1. Request Code */}
                      <td>
                        <span className="req-code-pill" title={`كود الطلب: ${req.request_code || `AL-${String(req.id).padStart(6, '0')}`}`}>
                          {req.request_code || `AL-${String(req.id).padStart(6, '0')}`}
                        </span>
                      </td>

                      {/* 2. Agency & Applicant Name (Admin view) */}
                      {isAdmin && (
                        <td>
                          <div className="agency-cell">
                            <div className="agency-name">
                              <i className="fa-solid fa-building-shield" style={{ color: '#0284c7' }}></i>
                              <span>{req.branch_agent?.agency_name || 'الفرع الرئيسي'}</span>
                            </div>
                            <div className="applicant-sub">
                              <i className="fa-regular fa-user"></i>
                              <span>{req.applicant_name || req.user?.name || '-'}</span>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* 3. Request Type Badge */}
                      <td>
                        <span className={`req-type-pill ${req.request_type}`}>
                          <i
                            className={`fa-solid ${
                              req.request_type === 'cancellation' ? 'fa-ban' : 'fa-pen-to-square'
                            }`}
                          ></i>
                          <span>{getTypeName(req.request_type)}</span>
                        </span>
                      </td>

                      {/* 4. Insurance Type (Dedicated separate column!) */}
                      <td>
                        {getInsuranceTypeBadge(req.document_type)}
                      </td>

                      {/* 5. Document Number & Insured Name */}
                      <td>
                        <div className="doc-data-cell">
                          <div
                            className="doc-num-wrapper"
                            title="انقر لنسخ رقم الوثيقة"
                            onClick={() => handleCopy(req.document_number, `doc-${req.id}`)}
                          >
                            <span className="doc-num-text">{req.document_number}</span>
                            <button type="button" className="copy-btn" aria-label="نسخ رقم الوثيقة">
                              <i
                                className={`fa-solid ${
                                  copiedId === `doc-${req.id}` ? 'fa-check' : 'fa-copy'
                                }`}
                                style={{ color: copiedId === `doc-${req.id}` ? '#16a34a' : '#64748b' }}
                              ></i>
                            </button>
                          </div>
                          {req.insured_name && (
                            <div className="insured-name-text" title={req.insured_name}>
                              <i className="fa-regular fa-address-card" style={{ color: '#64748b' }}></i>
                              <span>{req.insured_name}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. Reason & Details */}
                      <td>
                        {req.request_type === 'cancellation' ? (
                          <div className="reason-cell">
                            <div className="reason-pill" title={req.cancellation_reason}>
                              <i className="fa-solid fa-triangle-exclamation"></i>
                              <span>{req.cancellation_reason || 'طلب إلغاء من الوكيل'}</span>
                            </div>
                            {req.cancellation_reason_other && (
                              <div className="reason-detail-text" title={req.cancellation_reason_other}>
                                <span style={{ fontWeight: 700 }}>تفاصيل: </span>
                                {req.cancellation_reason_other}
                              </div>
                            )}
                            {req.notes && (
                              <div className="notes-pill" title={req.notes}>
                                <i className="fa-regular fa-comment-dots"></i>
                                <span>{req.notes}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="reason-cell">
                            <div style={{ fontWeight: 700, color: 'var(--text, #1e293b)' }}>{req.subject}</div>
                            {req.description && (
                              <small style={{ color: 'var(--muted, #64748b)' }}>{req.description}</small>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 7. Date & Time */}
                      <td>
                        <div className="date-cell">
                          <div className="date-day">
                            {new Date(req.created_at).toLocaleDateString('ar-LY')}
                          </div>
                          <div className="date-time">
                            <i className="fa-regular fa-clock"></i>
                            <span>
                              {new Date(req.created_at).toLocaleTimeString('ar-LY', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 8. Status */}
                      <td>
                        {getStatusBadge(req.status)}
                        {req.reviewed_at && (
                          <div
                            className="reviewed-by-sub"
                            title={`تمت المراجعة: ${req.reviewer?.name || 'الإدارة'}`}
                          >
                            <i className="fa-solid fa-user-check"></i>
                            <span>{req.reviewer?.name || 'الإدارة'}</span>
                          </div>
                        )}
                      </td>

                      {/* 9. Actions & Print */}
                      <td>
                        <div className="actions-cell">
                          {/* Print Notice for Cancellation Requests */}
                          {req.request_type === 'cancellation' && (
                            <button
                              type="button"
                              onClick={() => handlePrintNotice(req.id)}
                              className="action-btn-print"
                              title="طباعة إشعار الإلغاء الرسمي الاقتصادي"
                            >
                              <i className="fa-solid fa-print"></i>
                              <span>إشعار</span>
                            </button>
                          )}

                          {/* Admin Action Button */}
                          {isAdmin && req.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRequest(req);
                                setAdminMessage('');
                                setShowStatusModal(true);
                              }}
                              className="action-btn-decision"
                              title="البت في الطلب (قبول أو رفض)"
                            >
                              <i className="fa-solid fa-gavel"></i>
                              <span>قرار</span>
                            </button>
                          )}

                          {/* View Details Button */}
                          <button
                            type="button"
                            onClick={() => setDetailModalRequest(req)}
                            className="action-btn-detail"
                            title="عرض تفاصيل الطلب الكاملة"
                          >
                            <i className="fa-regular fa-eye"></i>
                          </button>

                          {/* Admin Message Display if any */}
                          {req.admin_message && (
                            <span
                              title={`ملاحظة الإدارة: ${req.admin_message}`}
                              className="admin-msg-badge"
                            >
                              <i className="fa-solid fa-circle-info"></i>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FULL REQUEST DETAIL MODAL */}
      {detailModalRequest && (
        <div className="modal-overlay" onClick={() => setDetailModalRequest(null)}>
          <div className="modal-inner" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-file-lines" style={{ color: '#2563eb' }}></i>
                <h3>تفاصيل طلب الوثيقة #{detailModalRequest.request_code || detailModalRequest.id}</h3>
              </div>
              <button onClick={() => setDetailModalRequest(null)} className="close-btn">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Badges row */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className={`req-type-pill ${detailModalRequest.request_type}`}>
                  <i className={`fa-solid ${detailModalRequest.request_type === 'cancellation' ? 'fa-ban' : 'fa-pen-to-square'}`}></i>
                  {getTypeName(detailModalRequest.request_type)}
                </span>
                {getInsuranceTypeBadge(detailModalRequest.document_type)}
                {getStatusBadge(detailModalRequest.status)}
              </div>

              {/* Information Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  background: '#f8fafc',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '0.88rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>رقم الوثيقة:</span>
                  <span style={{ fontWeight: 800, color: '#dc2626', direction: 'ltr', display: 'inline-block' }}>
                    {detailModalRequest.document_number}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>اسم المؤمن له:</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>
                    {detailModalRequest.insured_name || 'غير محدد'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>الوكالة / الفرع:</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>
                    {detailModalRequest.branch_agent?.agency_name || 'الفرع الرئيسي'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>مقدم الطلب:</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>
                    {detailModalRequest.applicant_name || detailModalRequest.user?.name || '-'}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>تاريخ التقديم:</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>
                    {new Date(detailModalRequest.created_at).toLocaleString('ar-LY')}
                  </span>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.78rem' }}>المراجع / المعتمد:</span>
                  <span style={{ fontWeight: 600, color: '#334155' }}>
                    {detailModalRequest.reviewer?.name || '-'}
                  </span>
                </div>
              </div>

              {/* Reason / Notes */}
              {detailModalRequest.cancellation_reason && (
                <div style={{ background: '#fef2f2', padding: '12px 14px', borderRadius: '10px', border: '1px solid #fecaca' }}>
                  <span style={{ color: '#991b1b', fontWeight: 800, fontSize: '0.84rem', display: 'block' }}>
                    سبب الإلغاء: {detailModalRequest.cancellation_reason}
                  </span>
                  {detailModalRequest.cancellation_reason_other && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#7f1d1d' }}>
                      تفاصيل إضافية: {detailModalRequest.cancellation_reason_other}
                    </p>
                  )}
                  {detailModalRequest.notes && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#475569' }}>
                      ملاحظة الوكيل: {detailModalRequest.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Admin Note if reviewed */}
              {detailModalRequest.admin_message && (
                <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                  <span style={{ color: '#1e293b', fontWeight: 800, fontSize: '0.84rem', display: 'block' }}>
                    ملاحظة الإدارة عند المراجعة:
                  </span>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.84rem', color: '#475569' }}>
                    {detailModalRequest.admin_message}
                  </p>
                </div>
              )}

              {/* Actions in Detail Modal */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                {detailModalRequest.request_type === 'cancellation' && (
                  <button
                    type="button"
                    onClick={() => handlePrintNotice(detailModalRequest.id)}
                    className="action-btn-print"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    <i className="fa-solid fa-print"></i> طباعة إشعار الإلغاء
                  </button>
                )}
                {isAdmin && detailModalRequest.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequest(detailModalRequest);
                      setAdminMessage('');
                      setShowStatusModal(true);
                      setDetailModalRequest(null);
                    }}
                    className="action-btn-decision"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    <i className="fa-solid fa-gavel"></i> اتخاذ قرار
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetailModalRequest(null)}
                  style={{
                    background: '#e2e8f0',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW REQUEST MODAL (FOR GENERAL MODIFICATION) */}
      {showRequestModal && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '750px' }}>
            <div className="modal-top">
              <h3>تقديم طلب وثيقة جديد</h3>
              <button onClick={() => setShowRequestModal(false)} className="close-btn">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmitRequest} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="input-group">
                  <label>نوع الطلب</label>
                  <select
                    value={newRequest.request_type}
                    onChange={(e) => setNewRequest({ ...newRequest, request_type: e.target.value as any })}
                  >
                    <option value="modification">تعديل وثيقة</option>
                    <option value="cancellation">إلغاء وثيقة</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>نوع الوثيقة</label>
                  <SearchableSelect
                    options={documentTypeOptions}
                    placeholder="ابحث واختر نوع الوثيقة..."
                    value={newRequest.document_type}
                    onChange={(val) => setNewRequest({ ...newRequest, document_type: val })}
                  />
                </div>
                <div className="input-group">
                  <label>رقم الوثيقة</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: LBY0001"
                    value={newRequest.document_number}
                    onChange={(e) => setNewRequest({ ...newRequest, document_number: e.target.value })}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px',
                      fontWeight: '800',
                    }}
                  />
                </div>
                <div className="input-group">
                  <label>الموضوع</label>
                  <input
                    type="text"
                    required
                    placeholder="عنوان مختصر للطلب..."
                    value={newRequest.subject}
                    onChange={(e) => setNewRequest({ ...newRequest, subject: e.target.value })}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '12px',
                      fontWeight: '700',
                    }}
                  />
                </div>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>التفاصيل (الوصف)</label>
                  <textarea
                    required
                    placeholder="اكتب تفاصيل التعديل أو سبب الإلغاء هنا..."
                    value={newRequest.description}
                    onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                    style={{ minHeight: '100px' }}
                  ></textarea>
                </div>
              </div>
              <button
                type="submit"
                className="btn-submit-full"
                disabled={submitting}
                style={{ marginTop: '16px' }}
              >
                {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN STATUS REVIEW MODAL */}
      {showStatusModal && selectedRequest && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '520px' }}>
            <div className="modal-top">
              <h3>البت في طلب الوثيقة</h3>
              <button onClick={() => setShowStatusModal(false)} className="close-btn">
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div style={{ padding: '20px' }}>
              {/* Request Summary Card */}
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                  fontSize: '0.88rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>كود الطلب:</span>
                  <span style={{ fontWeight: 800, color: '#1d4ed8', direction: 'ltr' }}>
                    {selectedRequest.request_code || `AL-${String(selectedRequest.id).padStart(6, '0')}`}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>رقم الوثيقة:</span>
                  <span style={{ fontWeight: 800, color: '#dc2626', direction: 'ltr' }}>
                    {selectedRequest.document_number}
                  </span>
                </div>
                {selectedRequest.insured_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>المؤمن له:</span>
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>{selectedRequest.insured_name}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b' }}>الوكيل / مقدم الطلب:</span>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>
                    {selectedRequest.applicant_name || selectedRequest.branch_agent?.agency_name || '-'}
                  </span>
                </div>
                {selectedRequest.cancellation_reason && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>سبب الإلغاء:</span>
                    <span style={{ fontWeight: 800, color: '#b91c1c' }}>
                      {selectedRequest.cancellation_reason}
                    </span>
                  </div>
                )}
                {selectedRequest.legal_acknowledged && (
                  <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '4px', fontWeight: 700 }}>
                    <i className="fa-solid fa-circle-check" style={{ marginLeft: '4px' }}></i>
                    الوكيل أقر بتحمل المسؤولية القانونية والمالية كاملة.
                  </div>
                )}
              </div>

              {/* Admin Note / Rejection Reason Input */}
              <div className="input-group">
                <label style={{ marginBottom: '8px', display: 'block', fontWeight: 800, fontSize: '0.88rem' }}>
                  ملاحظة الإدارة أو سبب الرفض (سيصل كإشعار للوكيل):
                </label>
                <textarea
                  placeholder="في حال الرفض، يرجى كتابة السبب هنا لإشعار الوكيل به..."
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  style={{
                    minHeight: '100px',
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                ></textarea>
              </div>

              {/* Warning Notice for Acceptance */}
              {selectedRequest.request_type === 'cancellation' && (
                <div
                  style={{
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginTop: '12px',
                    fontSize: '0.8rem',
                    color: '#92400e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  <span>عند قبول الطلب سيتم إيقاف الوثيقة فوراً في النظام واعتبارها ملغية رسمياً.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'accepted')}
                  className="btn-submit-full"
                  style={{
                    flex: 1,
                    background: '#10b981',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-check"></i>
                  )}
                  قبول واعتماد الإلغاء
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                  className="btn-submit-full"
                  style={{
                    flex: 1,
                    background: '#ef4444',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                  disabled={submitting}
                >
                  {submitting ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fa-solid fa-ban"></i>
                  )}
                  رفض الطلب
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}