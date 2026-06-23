import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL, BACKEND_URL } from "../config/api";
import SearchableSelect from "./SearchableSelect";

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

type BranchAgent = {
  id: number;
  type: 'وكيل' | 'فرع من شركة';
  code: string;
  agency_name: string;
  agent_name: string;
  activity?: string;
  agency_number?: string;
  stamp_number?: string;
  contract_date: string;
  contract_end_date?: string;
  contract_duration?: string;
  city: string;
  address?: string;
  phone?: string;
  nationality?: string;
  national_id?: string;
  identity_number?: string;
  consumed_custodies?: Array<{ description: string; quantity: number }>;
  fixed_custodies?: Array<{ description: string; quantity: number }>;
  personal_photo?: string;
  office_facade_photo?: string;
  office_phone?: string;
  office_location?: string;
  national_id_photo?: string;
  identity_photo?: string;
  contract_photo?: string;
  passport_photo?: string;
  clearance_certificate?: string;
  non_bankruptcy_certificate?: string;
  experience_certificate?: string;
  non_employment_certificate?: string;
  tb_health_certificate?: string;
  academic_qualification?: string;
  activity_license?: string;
  user?: { id: number; username: string; name: string };
  notes?: string;
  contract_conditions?: string;
  status: 'نشط' | 'غير نشط' | 'قيد الانتظار';
  requested_documents?: string[];
  authorized_documents?: string[];
  created_at: string;
  updated_at: string;
};

type AgentRequest = {
  id: number;
  type: 'stock' | 'support' | 'financial' | 'commission' | 'maintenance' | 'marketing' | 'training' | 'legal' | 'limit_increase' | 'other';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  priority: 'normal' | 'urgent';
  subject: string;
  message: string;
  created_at: string;
  admin_notes?: string;
};

type DocumentRequest = {
  id: number;
  request_type: 'modification' | 'cancellation';
  document_type?: string;
  document_number: string;
  subject: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  admin_message?: string;
  created_at: string;
};

const getInventoryTypeName = (inventoryType?: string) => {
  if (!inventoryType) return 'غير محدد';
  if (inventoryType === 'fixed') return 'أصول ثابتة';
  if (inventoryType === 'consumable') return 'مخزون مستهلك';
  return inventoryType;
};

export default function BranchAgentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [branchAgent, setBranchAgent] = useState<BranchAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'agency' | 'wallet' | 'contact' | 'custody' | 'permissions' | 'requests' | 'doc_requests' | 'stats'>(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('tab') as any) || 'stats';
  });

  // Financial Stats state
  const [agentStats, setAgentStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) {
      setActiveTab(tab as any);
    }
  }, [location.search]);
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [newRequest, setNewRequest] = useState({
    type: 'stock' as any,
    priority: 'normal' as any,
    subject: '',
    message: '',
  });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{id: number, status: string} | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [showDocStatusModal, setShowDocStatusModal] = useState(false);
  const [selectedDocRequest, setSelectedDocRequest] = useState<DocumentRequest | null>(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [showNewDocRequestModal, setShowNewDocRequestModal] = useState(false);
  const [newDocRequest, setNewDocRequest] = useState({
    request_type: 'modification',
    document_type: '',
    document_number: '',
    subject: '',
    description: ''
  });
  const [custodiesList, setCustodiesList] = useState<any[]>([]);

  // Wallet and Loyalty states
  const [walletDetails, setWalletDetails] = useState<{
    points_balance: number;
    wallet_balance: number;
    referral_code: string;
    referred_by_id: number | null;
    referrals_count: number;
    total_earned_referral_cash: number;
  } | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [walletWithdrawals, setWalletWithdrawals] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [walletTxType, setWalletTxType] = useState<'all' | 'points' | 'cash'>('all');
  
  // Redeem Points Modal states
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [submittingRedeem, setSubmittingRedeem] = useState(false);

  // Points Help Modal states
  const [showPointsHelp, setShowPointsHelp] = useState(false);
  const [pointsRules, setPointsRules] = useState<any[]>([]);

  // Request Withdrawal Modal states
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('نقدي من الإدارة');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Admin Adjust Wallet states
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState('');
  const [adjustCash, setAdjustCash] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  // Admin Process Withdrawal Request states
  const [showWithdrawStatusModal, setShowWithdrawStatusModal] = useState(false);
  const [selectedWithdrawRequest, setSelectedWithdrawRequest] = useState<any | null>(null);
  const [withdrawStatus, setWithdrawStatus] = useState<'approved' | 'rejected'>('approved');
  const [withdrawAdminNotes, setWithdrawAdminNotes] = useState('');
  const [submittingWithdrawStatus, setSubmittingWithdrawStatus] = useState(false);

  const fetchWalletData = async () => {
    if (!id) return;
    setLoadingWallet(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const [detailsRes, txRes, withdrawalsRes, referralsRes, rulesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/agent-wallet/${id}`, { headers }),
        fetch(`${API_BASE_URL}/agent-wallet/${id}/transactions?type=${walletTxType}`, { headers }),
        fetch(`${API_BASE_URL}/agent-wallet/${id}/withdrawals`, { headers }),
        fetch(`${API_BASE_URL}/agent-wallet/${id}/referrals`, { headers }),
        fetch(`${API_BASE_URL}/agent-wallet/settings/loyalty`, { headers }),
      ]);

      if (detailsRes.ok) setWalletDetails(await detailsRes.json());
      if (txRes.ok) setWalletTransactions(await txRes.json());
      if (withdrawalsRes.ok) setWalletWithdrawals(await withdrawalsRes.json());
      if (referralsRes.ok) setReferrals(await referralsRes.json());
      if (rulesRes.ok) setPointsRules(await rulesRes.json());
    } catch (e) {
      console.error("Failed to fetch wallet details", e);
    } finally {
      setLoadingWallet(false);
    }
  };

  useEffect(() => {
    if (id && activeTab === 'wallet') {
      fetchWalletData();
    }
    if (id && activeTab === 'stats') {
      const fetchStats = async () => {
        setLoadingStats(true);
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE_URL}/branches-agents/${id}/financial-stats`, {
            headers: {
              'Accept': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success) setAgentStats(data);
          }
        } catch (e) {
          console.error('Error fetching agent stats:', e);
        } finally {
          setLoadingStats(false);
        }
      };
      fetchStats();
    }
  }, [id, activeTab, walletTxType]);

  const handleRedeemPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointsToRedeem || isNaN(Number(pointsToRedeem)) || Number(pointsToRedeem) < 1000) {
      showToast("يرجى إدخال 1000 نقطة كحد أدنى للاستبدال", "error");
      return;
    }
    setSubmittingRedeem(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-wallet/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          branch_agent_id: id,
          points_to_redeem: parseInt(pointsToRedeem),
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setShowRedeemModal(false);
        setPointsToRedeem('');
        fetchWalletData();
      } else {
        showToast(data.message || "فشلت عملية الاستبدال", "error");
      }
    } catch (e) {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSubmittingRedeem(false);
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      showToast("يرجى إدخال مبلغ صحيح للسحب", "error");
      return;
    }
    setSubmittingWithdraw(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          branch_agent_id: id,
          amount: parseFloat(withdrawAmount),
          payment_method: withdrawMethod,
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setShowWithdrawModal(false);
        setWithdrawAmount('');
        fetchWalletData();
      } else {
        showToast(data.message || "فشل تقديم طلب السحب", "error");
      }
    } catch (e) {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const handleAdjustWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustReason.trim()) {
      showToast("يرجى إدخال سبب التعديل", "error");
      return;
    }
    setSubmittingAdjust(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-wallet/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          branch_agent_id: id,
          points_amount: adjustPoints ? parseInt(adjustPoints) : 0,
          cash_amount: adjustCash ? parseFloat(adjustCash) : 0,
          reason: adjustReason,
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setShowAdjustModal(false);
        setAdjustPoints('');
        setAdjustCash('');
        setAdjustReason('');
        fetchWalletData();
      } else {
        showToast(data.message || "فشل تعديل الأرصدة", "error");
      }
    } catch (e) {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const handleUpdateWithdrawalStatus = async (status: 'approved' | 'rejected') => {
    if (!selectedWithdrawRequest) return;
    setSubmittingWithdrawStatus(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-wallet/withdrawals/${selectedWithdrawRequest.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: status,
          admin_notes: withdrawAdminNotes,
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message, "success");
        setShowWithdrawStatusModal(false);
        setSelectedWithdrawRequest(null);
        setWithdrawAdminNotes('');
        fetchWalletData();
      } else {
        showToast(data.message || "فشل تعديل حالة السحب", "error");
      }
    } catch (e) {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSubmittingWithdrawStatus(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchBranchAgent(parseInt(id));
      fetchRequests();
      fetchDocRequests();
      fetchCustodyData();
    }
  }, [id]);

  const fetchCustodyData = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/custody?recipient_id=${id}&recipient_type=agent`);
      if (res.ok) {
        const allCustody: any[] = await res.json();
        setCustodiesList(allCustody.filter(c => c.status === 'active'));
      }
    } catch (e) {
      console.error("Failed to fetch agent custody", e);
    }
  };

  const fetchBranchAgent = async (branchAgentId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/branches-agents/${branchAgentId}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error("فشل جلب بيانات الوكيل");
      const data = await res.json();
      setBranchAgent(data);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-requests?branch_agent_id=${id}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {}
  };

  const fetchDocRequests = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/document-requests?branch_agent_id=${id}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setDocRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {}
  };

  const handleUpdateDocStatus = async (status: string) => {
    if (!selectedDocRequest) return;
    setSubmittingStatus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/document-requests/${selectedDocRequest.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ status, admin_message: adminMessage }),
      });
      
      if (!res.ok) throw new Error("فشل تحديث حالة الطلب");
      
      showToast("تم تحديث حالة طلب الوثيقة", 'success');
      setShowDocStatusModal(false);
      fetchDocRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-requests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ...newRequest, branch_agent_id: id }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "فشل تقديم الطلب");
      }
      
      showToast("تم تقديم الطلب بنجاح", 'success');
      setShowRequestModal(false);
      setNewRequest({ type: 'stock', priority: 'normal', subject: '', message: '' });
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCreateDocRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRequest(true);
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const res = await fetch(`${API_BASE_URL}/document-requests`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-User-Id': user?.id?.toString() || ''
        },
        body: JSON.stringify({ ...newDocRequest, branch_agent_id: id, user_id: user?.id }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || "فشل تقديم الطلب");
      }
      
      showToast("تم تقديم الطلب بنجاح", 'success');
      setShowNewDocRequestModal(false);
      setNewDocRequest({ request_type: 'modification', document_type: '', document_number: '', subject: '', description: '' });
      fetchDocRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const openStatusModal = (requestId: number, newStatus: string) => {
    setSelectedRequest({ id: requestId, status: newStatus });
    setAdminNotes('');
    setShowStatusModal(true);
  };

  const handleUpdateRequestStatus = async () => {
    if (!selectedRequest) return;
    setSubmittingStatus(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: selectedRequest.status, admin_notes: adminNotes }),
      });
      
      if (!res.ok) throw new Error("فشل تحديث حالة الطلب");
      
      showToast("تم تحديث حالة الطلب", 'success');
      setShowStatusModal(false);
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const handlePrint = () => {
    if (!id) return;
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.src = `${API_BASE_URL}/branches-agents/${id}/print?t=${new Date().getTime()}`;
    document.body.appendChild(iframe);
    iframe.onload = () => {
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        setTimeout(() => document.body.removeChild(iframe), 300);
      }, 100);
    };
  };

  const loggedInUserStr = localStorage.getItem('user');
  let isAdmin = false;
  try {
    if (loggedInUserStr) isAdmin = JSON.parse(loggedInUserStr).is_admin;
  } catch {}

  if (loading) return <div className="loading-container font-cairo">جارِ التحميل...</div>;
  if (!branchAgent) return <div className="error-container font-cairo">الوكيل غير موجود.</div>;

  const getRequestTypeName = (type: string) => {
    const types: any = {
      stock: 'طلب مخزون/مستندات',
      support: 'دعم فني',
      financial: 'تسوية مالية',
      commission: 'طلب عمولة',
      maintenance: 'طلب صيانة',
      marketing: 'دعاية وإعلان',
      training: 'تدريب',
      legal: 'استشارة قانونية',
      limit_increase: 'زيادة سقف الإصدار',
      other: 'أخرى'
    };
    return types[type] || type;
  };

  const getStatusName = (status: string, type?: string) => {
    if (type === 'stock') {
      if (status === 'pending') return 'تحت الطلب';
      if (status === 'completed') return 'نفذت';
    }
    const statuses: any = {
      pending: 'قيد الانتظار',
      processing: 'جاري المعالجة',
      completed: 'تم التنفيذ',
      rejected: 'مرفوض'
    };
    return statuses[status] || status;
  };

  return (
    <div className="profile-container font-cairo">
      {/* Header Card */}
      <div className="profile-header-card">
        <div className="header-content">
          <div className="profile-avatar-large">
            {branchAgent.personal_photo ? (
              <img src={`${BACKEND_URL}/storage/${branchAgent.personal_photo}`} alt="Profile" />
            ) : (
              <div className="avatar-placeholder">
                <i className="fa-solid fa-building"></i>
              </div>
            )}
          </div>
          <div className="header-info-main">
            <h1 className="profile-name-title">{branchAgent.agency_name}</h1>
            <p className="profile-job-subtitle">{branchAgent.agent_name} - {branchAgent.type}</p>
            <div className="profile-badges-row">
              <span className="profile-badge">
                <i className="fa-solid fa-hashtag"></i>
                كود: {branchAgent.code}
              </span>
              <span className="profile-badge">
                <i className="fa-solid fa-map-marker-alt"></i>
                {branchAgent.city}
              </span>
              <span className="profile-badge">
                <i className="fa-solid fa-calendar-alt"></i>
                تعاقد: {new Date(branchAgent.contract_date).toLocaleDateString('ar-LY')}
              </span>
              <span className={`profile-badge ${branchAgent.status === 'نشط' ? 'status-active' : 'status-inactive'}`}>
                <i className={`fa-solid ${branchAgent.status === 'نشط' ? 'fa-check-circle' : 'fa-times-circle'}`}></i>
                {branchAgent.status}
              </span>
            </div>
          </div>
          <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
            {isAdmin && <button onClick={() => navigate('/branches-agents')} className="btn-outline-sm">العودة للقائمة</button>}
            {isAdmin && (
              <button className="btn-primary-sm" onClick={() => navigate(`/branches-agents/${branchAgent.id}/edit`)} style={{ background: 'var(--sidebar)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-pencil"></i> تعديل البيانات
              </button>
            )}
            {!isAdmin && (
              <button 
                className="btn-primary-sm" 
                onClick={() => navigate('/profile?tab=identity')} 
                style={{ background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-user-pen"></i> تقديم طلب تعديل ملفي
              </button>
            )}
            <button className="btn-primary-sm" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-print"></i> طباعة العقد
            </button>
          </div>
        </div>
      </div>

      <div className="profile-main-layout">
        <aside className="profile-sidebar">
          <nav className="tab-navigation">
            {(isAdmin ? [
              { id: 'agency', label: 'بيانات الوكالة', icon: 'fa-building' },
              { id: 'wallet', label: 'المحفظة والنقاط', icon: 'fa-wallet' },
              { id: 'contact', label: 'الاتصال والهوية', icon: 'fa-address-card' },
              { id: 'custody', label: 'العهدة والعهد', icon: 'fa-boxes-stacked' },
              { id: 'permissions', label: 'الصلاحيات', icon: 'fa-shield-halved' },
              { id: 'requests', label: 'طلبات الوكلاء', icon: 'fa-paper-plane' },
              { id: 'doc_requests', label: 'طلبات الوثائق', icon: 'fa-file-circle-exclamation' },
              { id: 'stats', label: 'الإحصائيات المالية', icon: 'fa-chart-pie' },
            ] : [
              { id: 'agency', label: 'بيانات الوكالة', icon: 'fa-building' },
              { id: 'wallet', label: 'المحفظة والنقاط', icon: 'fa-wallet' },
              { id: 'requests', label: 'طلبات الوكلاء', icon: 'fa-paper-plane' },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); navigate(`/branches-agents/${id}?tab=${tab.id}`, { replace: true }); }}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              >
                <i className={`fa-solid ${tab.icon}`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
            {!isAdmin && (
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="tab-btn back-home-btn"
                style={{
                  marginTop: '15px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: '#10b981',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '14px',
                  padding: '12px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  fontWeight: '800'
                }}
              >
                <i className="fa-solid fa-arrow-right-from-bracket" style={{ transform: 'rotate(180deg)' }}></i>
                <span>العودة للصفحة الرئيسية</span>
              </button>
            )}
          </nav>
        </aside>

        <section className="profile-content-area">
          <div className="content-card">
            {activeTab === 'agency' && (
              <div className="tab-pane">
                {!isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '12px', direction: 'rtl', textAlign: 'right' }}>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#10b981' }}>تعديل وتحديث بيانات الوكالة أو المستندات الشخصية</h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>لتحديث الاسم، الهاتف، أو المرفقات (الصورة، جواز السفر، الهوية)، يرجى تقديم طلب مراجعة وتدقيق للإدارة.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => navigate('/profile?tab=identity')}
                      className="btn-primary-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', border: 'none', borderRadius: '8px' }}
                    >
                      <i className="fa-solid fa-user-pen"></i> تقديم طلب تعديل
                    </button>
                  </div>
                )}
                <h3 className="tab-title">المعلومات الأساسية للوكالة</h3>
                <div className="info-grid">
                  <InfoItem label="اسم الوكالة" value={branchAgent.agency_name} icon="fa-building" />
                  <InfoItem label="اسم الوكيل المسئول" value={branchAgent.agent_name} icon="fa-user-tie" />
                  <InfoItem label="كود الوكالة" value={branchAgent.code} icon="fa-hashtag" />
                  <InfoItem label="نوع النشاط" value={branchAgent.activity} icon="fa-briefcase" />
                  <InfoItem label="رقم الوكالة" value={branchAgent.agency_number} icon="fa-id-card" />
                  <InfoItem label="رقم الختم" value={branchAgent.stamp_number} icon="fa-stamp" />
                  <InfoItem label="تاريخ التعاقد" value={new Date(branchAgent.contract_date).toLocaleDateString('ar-LY')} icon="fa-calendar-day" />
                  <InfoItem label="تاريخ انتهاء العقد" value={branchAgent.contract_end_date ? new Date(branchAgent.contract_end_date).toLocaleDateString('ar-LY') : '—'} icon="fa-calendar-xmark" />
                  <div className="full-width">
                    <InfoItem label="ملاحظات إضافية" value={branchAgent.notes} icon="fa-comment-dots" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'wallet' && (
              <div className="tab-pane">
                <h3 className="tab-title">محفظة الوكيل ونقاط الولاء والتحفيز</h3>
                
                {loadingWallet && !walletDetails ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>جاري تحميل تفاصيل المحفظة...</div>
                ) : (
                  <>
                    {/* Wallet Cards Summary */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                      
                      {/* Cash Card */}
                      <div className="details-section-card" style={{ 
                        background: 'linear-gradient(135deg, rgba(1, 76, 177, 0.15) 0%, rgba(1, 76, 177, 0.03) 100%)',
                        border: '1px solid rgba(1, 76, 177, 0.3)',
                        borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 'bold' }}>الرصيد المالي القابل للسحب</span>
                            <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0ea5e9', margin: '5px 0' }}>
                              {walletDetails?.wallet_balance?.toFixed(2) || '0.00'} <span style={{ fontSize: '14px' }}>د.ل</span>
                            </h2>
                          </div>
                          <div style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-wallet" style={{ fontSize: '24px' }}></i>
                          </div>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                          <button 
                            type="button"
                            onClick={() => setShowWithdrawModal(true)} 
                            disabled={!walletDetails || walletDetails.wallet_balance <= 0}
                            className="btn-primary-sm"
                            style={{ width: '100%', background: '#0ea5e9', border: 'none', justifyContent: 'center', borderRadius: '10px', height: '36px', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            <i className="fa-solid fa-money-bill-transfer"></i> طلب سحب رصيد
                          </button>
                        </div>
                      </div>

                      {/* Points Card */}
                      <div className="details-section-card" style={{ 
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.03) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>نقاط الولاء الحالية</span>
                              <i 
                                className="fa-solid fa-circle-info" 
                                style={{ color: '#f59e0b', cursor: 'pointer', fontSize: '14px' }}
                                title="جدول تفاصيل نقاط الوثائق"
                                onClick={() => setShowPointsHelp(true)}
                              ></i>
                            </span>
                            <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#f59e0b', margin: '5px 0' }}>
                              {walletDetails?.points_balance || 0} <span style={{ fontSize: '14px' }}>نقطة</span>
                            </h2>
                            <div style={{ marginTop: '5px', fontSize: '11px', color: 'var(--muted)', lineHeight: '1.4' }}>
                              تكسب نقاط مكافأة تلقائياً مع كل وثيقة تأمين تقوم بإصدارها. اضغط على ℹ️ للمزيد.
                            </div>
                          </div>
                          <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-star" style={{ fontSize: '24px' }}></i>
                          </div>
                        </div>
                        <div style={{ marginTop: '15px' }}>
                          <button 
                            type="button"
                            onClick={() => setShowRedeemModal(true)} 
                            disabled={!walletDetails || walletDetails.points_balance < 1000}
                            className="btn-primary-sm"
                            style={{ width: '100%', background: '#f59e0b', border: 'none', justifyContent: 'center', borderRadius: '10px', height: '36px', display: 'flex', alignItems: 'center', gap: '8px' }}
                          >
                            <i className="fa-solid fa-rotate"></i> استبدال النقاط بكاش
                          </button>
                        </div>
                      </div>

                      {/* Referrals Card */}
                      <div className="details-section-card" style={{ 
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.03) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 'bold' }}>الوكلاء المسجلين عبر إحالتك</span>
                            <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#10b981', margin: '5px 0' }}>
                              {walletDetails?.referrals_count || 0} <span style={{ fontSize: '14px' }}>وكيل</span>
                            </h2>
                          </div>
                          <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className="fa-solid fa-users" style={{ fontSize: '24px' }}></i>
                          </div>
                        </div>
                        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>إجمالي أرباح الإحالة الكاش:</span>
                            <strong style={{ color: '#10b981', fontSize: '13px' }}>{walletDetails?.total_earned_referral_cash?.toFixed(2) || '0.00'} د.ل</strong>
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Referral Link Copy Section */}
                    <div className="details-section-card" style={{ marginBottom: '30px', padding: '20px', border: '1px solid var(--border)', borderRadius: '14px' }}>
                      <h4 className="section-title-sm" style={{ margin: '0 0 10px 0', fontSize: '15px' }}>
                        <i className="fa-solid fa-share-nodes" style={{ color: 'var(--accent-cyan)', marginLeft: '8px' }}></i>
                        نظام دعوة الوكلاء (Referral Program)
                      </h4>
                      <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '0 0 15px 0', lineHeight: '1.6' }}>
                        انسخ رابط الإحالة الخاص بك وأرسله للوكلاء الجدد. عند قيامهم بالتسجيل وإصدار وثائق التأمين، ستحصل تلقائياً على نقاط إضافية وعمولة مالية (كاش) تضاف لمحفظتك مع كل وثيقة يصدرونها!
                      </p>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ 
                          flex: 1, padding: '10px 15px', borderRadius: '10px', 
                          background: 'var(--input-bg)', border: '1px solid var(--border)',
                          fontFamily: 'monospace', fontSize: '13px', color: 'var(--text)',
                          overflowX: 'auto', whiteSpace: 'nowrap'
                        }}>
                          {`${window.location.origin}/website/branches-agents?ref=${walletDetails?.referral_code || ''}`}
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const link = `${window.location.origin}/website/branches-agents?ref=${walletDetails?.referral_code || ''}`;
                            navigator.clipboard.writeText(link);
                            showToast("تم نسخ رابط الإحالة بنجاح!", "success");
                          }}
                          className="btn-outline-sm"
                          style={{ height: '42px', flexShrink: 0, padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px' }}
                        >
                          <i className="fa-solid fa-copy"></i> نسخ الرابط
                        </button>
                      </div>
                    </div>

                    {/* Admin Adjustment Trigger */}
                    {isAdmin && (
                      <div className="details-section-card" style={{ marginBottom: '30px', borderColor: 'rgba(1, 76, 177, 0.3)', background: 'rgba(1, 76, 177, 0.03)', borderRadius: '14px', padding: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ margin: 0, color: 'var(--text)', fontWeight: '800', fontSize: '14px' }}>لوحة التحكم والسيطرة الإدارية (الأدمن)</h4>
                            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>تعديل الأرصدة يدوياً للوكيل أو خصم/إضافة مبالغ للتعويض والتعديل السريع.</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setShowAdjustModal(true)} 
                            className="btn-primary-sm" 
                            style={{ background: 'var(--sidebar)', height: '36px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '10px' }}
                          >
                            <i className="fa-solid fa-user-gear"></i> تعديل أرصدة المحفظة يدوياً
                          </button>
                        </div>
                      </div>
                    )}

                    {/* History Tabs Section */}
                    <div style={{ border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', background: 'var(--card-bg)' }}>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '15px', marginBottom: '20px' }}>
                        <h4 className="section-title-sm" style={{ margin: 0, border: 'none' }}>
                          <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--accent-cyan)', marginLeft: '8px' }}></i> 
                          سجل حركات المحفظة والسحوبات
                        </h4>
                        
                        {/* Transaction Type Filter */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            type="button" 
                            onClick={() => setWalletTxType('all')} 
                            style={{ 
                              padding: '4px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
                              border: '1px solid var(--border)', 
                              background: walletTxType === 'all' ? 'var(--accent-cyan)' : 'var(--input-bg)',
                              color: walletTxType === 'all' ? '#fff' : 'var(--text)'
                            }}
                          >الكل</button>
                          <button 
                            type="button" 
                            onClick={() => setWalletTxType('points')} 
                            style={{ 
                              padding: '4px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
                              border: '1px solid var(--border)', 
                              background: walletTxType === 'points' ? '#f59e0b' : 'var(--input-bg)',
                              color: walletTxType === 'points' ? '#fff' : 'var(--text)'
                            }}
                          >النقاط</button>
                          <button 
                            type="button" 
                            onClick={() => setWalletTxType('cash')} 
                            style={{ 
                              padding: '4px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
                              border: '1px solid var(--border)', 
                              background: walletTxType === 'cash' ? '#0ea5e9' : 'var(--input-bg)',
                              color: walletTxType === 'cash' ? '#fff' : 'var(--text)'
                            }}
                          >الكاش</button>
                        </div>
                      </div>

                      {/* Ledger Lists */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                        
                        {/* 1. Wallet Transactions Table */}
                        <div>
                          <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text)', fontWeight: 'bold' }}>سجل المعاملات المباشر ({walletTransactions.length} حركة)</h5>
                          <div className="premium-table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            <table className="premium-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '18%' }}>التاريخ</th>
                                  <th style={{ width: '12%' }}>النوع</th>
                                  <th style={{ width: '15%' }}>القيمة</th>
                                  <th style={{ width: '18%' }}>العملية</th>
                                  <th>الوصف والتفاصيل</th>
                                </tr>
                              </thead>
                              <tbody>
                                {walletTransactions.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>لا توجد معاملات مسجلة</td>
                                  </tr>
                                ) : (
                                  walletTransactions.map(tx => (
                                    <tr key={tx.id}>
                                      <td style={{ fontSize: '12px' }}>{new Date(tx.created_at).toLocaleString('ar-LY')}</td>
                                      <td>
                                        <span className={`premium-badge ${tx.transaction_type === 'points' ? 'badge-warning' : 'badge-info'}`} style={tx.transaction_type === 'points' ? { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' } : { background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
                                          {tx.transaction_type === 'points' ? 'نقاط' : 'كاش'}
                                        </span>
                                      </td>
                                      <td style={{ fontWeight: 'bold', color: tx.amount >= 0 ? '#10b981' : '#ef4444' }}>
                                        {tx.amount >= 0 ? '+' : ''}{tx.amount}
                                      </td>
                                      <td>
                                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)' }}>
                                          {tx.action === 'earn_points' ? 'كسب نقاط' :
                                           tx.action === 'redeem_points' ? 'استبدال نقاط' :
                                           tx.action === 'withdraw_request' ? 'طلب سحب معلق' :
                                           tx.action === 'withdraw_approved' ? 'سحب معتمد' :
                                           tx.action === 'withdraw_refund' ? 'طلب سحب مرفوض' :
                                           tx.action === 'referral_bonus' ? 'عمولة إحالة' :
                                           tx.action === 'admin_adjustment' ? 'تعديل إداري' : tx.action}
                                        </span>
                                      </td>
                                      <td style={{ fontSize: '13px', color: 'var(--text)' }}>{tx.description}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* 2. Withdrawal Requests Table */}
                        <div>
                          <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text)', fontWeight: 'bold' }}>طلبات السحب المعلقة والسابقة ({walletWithdrawals.length} طلب)</h5>
                          <div className="premium-table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            <table className="premium-table">
                              <thead>
                                <tr>
                                  <th style={{ width: '18%' }}>التاريخ</th>
                                  <th style={{ width: '15%' }}>المبلغ</th>
                                  <th style={{ width: '22%' }}>طريقة السحب</th>
                                  <th style={{ width: '15%' }}>الحالة</th>
                                  <th>ملاحظات الإدارة</th>
                                  {isAdmin && <th style={{ width: '150px' }}>الإجراءات</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {walletWithdrawals.length === 0 ? (
                                  <tr>
                                    <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>لا توجد طلبات سحب مسجلة</td>
                                  </tr>
                                ) : (
                                  walletWithdrawals.map(w => (
                                    <tr key={w.id}>
                                      <td style={{ fontSize: '12px' }}>{new Date(w.created_at).toLocaleString('ar-LY')}</td>
                                      <td style={{ fontWeight: 'bold', color: 'var(--text)' }}>{w.amount} د.ل</td>
                                      <td>{w.payment_method}</td>
                                      <td>
                                        <span className={`status-pill ${w.status}`}>
                                          {w.status === 'pending' ? 'في الانتظار' : w.status === 'approved' ? 'مقبول' : 'مرفوض'}
                                        </span>
                                      </td>
                                      <td style={{ fontSize: '13px', color: 'var(--muted)' }}>{w.admin_notes || '—'}</td>
                                      {isAdmin && (
                                        <td>
                                          {w.status === 'pending' ? (
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                              <button 
                                                type="button"
                                                onClick={() => { setSelectedWithdrawRequest(w); setWithdrawStatus('approved'); setWithdrawAdminNotes(''); setShowWithdrawStatusModal(true); }}
                                                className="btn-approve" style={{ background: '#10b981', padding: '4px 8px', fontSize: '11px', height: 'auto', borderRadius: '6px' }}
                                              >
                                                قبول
                                              </button>
                                              <button 
                                                type="button"
                                                onClick={() => { setSelectedWithdrawRequest(w); setWithdrawStatus('rejected'); setWithdrawAdminNotes(''); setShowWithdrawStatusModal(true); }}
                                                className="btn-reject" style={{ background: '#ef4444', padding: '4px 8px', fontSize: '11px', height: 'auto', borderRadius: '6px' }}
                                              >
                                                رفض
                                              </button>
                                            </div>
                                          ) : (
                                            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>تمت المعالجة</span>
                                          )}
                                        </td>
                                      )}
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* 3. Referred Agents Table */}
                        <div>
                          <h5 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text)', fontWeight: 'bold' }}>الوكلاء المسجلين عبر إحالتك ({referrals.length} وكيل)</h5>
                          <div className="premium-table-container" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            <table className="premium-table">
                              <thead>
                                <tr>
                                  <th>كود الوكيل</th>
                                  <th>اسم الوكالة</th>
                                  <th>الاسم المسؤول</th>
                                  <th>تاريخ التسجيل</th>
                                  <th>حالة الوكيل</th>
                                </tr>
                              </thead>
                              <tbody>
                                {referrals.length === 0 ? (
                                  <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: '20px' }}>لم يتم تسجيل أي وكلاء إحالة بعد</td>
                                  </tr>
                                ) : (
                                  referrals.map(ref => (
                                    <tr key={ref.id}>
                                      <td style={{ fontWeight: 'bold' }}>{ref.code}</td>
                                      <td>{ref.agency_name}</td>
                                      <td>{ref.agent_name}</td>
                                      <td style={{ fontSize: '12px' }}>{new Date(ref.created_at).toLocaleDateString('ar-LY')}</td>
                                      <td>
                                        <span className={`status-pill ${ref.status === 'نشط' ? 'approved' : 'rejected'}`} style={ref.status === 'نشط' ? { background: '#f0fdf4', color: '#16a34a' } : {}}>
                                          {ref.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>

                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="tab-pane">
                {!isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '12px', direction: 'rtl', textAlign: 'right' }}>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#10b981' }}>تعديل وتحديث بيانات الوكالة أو المستندات الشخصية</h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>لتحديث الاسم، الهاتف، أو المرفقات (الصورة، جواز السفر، الهوية)، يرجى تقديم طلب مراجعة وتدقيق للإدارة.</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => navigate('/profile?tab=identity')}
                      className="btn-primary-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#10b981', border: 'none', borderRadius: '8px' }}
                    >
                      <i className="fa-solid fa-user-pen"></i> تقديم طلب تعديل
                    </button>
                  </div>
                )}
                <h3 className="tab-title">معلومات الاتصال والبيانات الشخصية</h3>
                <div className="info-grid">
                  <InfoItem label="المدينة" value={branchAgent.city} icon="fa-city" />
                  <InfoItem label="رقم الهاتف" value={branchAgent.phone} icon="fa-phone" />
                  <InfoItem label="هاتف المكتب" value={branchAgent.office_phone} icon="fa-phone-alt" />
                  <InfoItem label="لوكيشن المكتب" value={branchAgent.office_location} icon="fa-location-crosshairs" />
                  <InfoItem label="الجنسية" value={branchAgent.nationality} icon="fa-flag" />
                  <InfoItem label="الرقم الوطني" value={branchAgent.national_id} icon="fa-id-card" />
                  <InfoItem label="رقم إثبات الشخصية" value={branchAgent.identity_number} icon="fa-passport" />
                  <InfoItem label="العنوان التفصيلي" value={branchAgent.address} icon="fa-location-dot" />
                </div>
                
                <div style={{ marginTop: '40px' }}>
                  <h4 className="section-title-sm"><i className="fa-solid fa-images"></i> المستندات المرفقة</h4>
                  <div className="documents-grid-layout" style={{ marginTop: '20px' }}>
                    {branchAgent.personal_photo && <DocCard label="الصورة الشخصية" url={branchAgent.personal_photo} />}
                    {branchAgent.office_facade_photo && <DocCard label="صورة واجهة المكتب" url={branchAgent.office_facade_photo} />}
                    {branchAgent.national_id_photo && <DocCard label="رقم القومي (صورة)" url={branchAgent.national_id_photo} />}
                    {branchAgent.identity_photo && <DocCard label="إثبات الهوية" url={branchAgent.identity_photo} />}
                    {branchAgent.contract_photo && <DocCard label="صورة العقد" url={branchAgent.contract_photo} />}
                    {branchAgent.passport_photo && <DocCard label="جواز السفر" url={branchAgent.passport_photo} />}
                    {branchAgent.clearance_certificate && <DocCard label="شهادة البراءة" url={branchAgent.clearance_certificate} />}
                    {branchAgent.non_bankruptcy_certificate && <DocCard label="شهادة عدم إفلاس" url={branchAgent.non_bankruptcy_certificate} />}
                    {branchAgent.experience_certificate && <DocCard label="شهادة خبرة" url={branchAgent.experience_certificate} />}
                    {branchAgent.non_employment_certificate && <DocCard label="شهادة عدم ارتباط بعمل" url={branchAgent.non_employment_certificate} />}
                    {branchAgent.tb_health_certificate && <DocCard label="شهادة صحية (خلو من الدرن)" url={branchAgent.tb_health_certificate} />}
                    {branchAgent.academic_qualification && <DocCard label="المؤهل العلمي" url={branchAgent.academic_qualification} />}
                    {branchAgent.activity_license && <DocCard label="رخصة المزاولة" url={branchAgent.activity_license} />}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'custody' && (
              <div className="tab-pane">
                <h3 className="tab-title">سجل العهد والمستندات</h3>
                
                {(() => {
                  if (custodiesList.length === 0) {
                    return <div style={{ padding: '20px', color: '#6b7280', textAlign: 'center' }}>لا توجد عهد نشطة مسجلة</div>;
                  }
                  
                  // Group custodies by inventory type
                  const grouped: Record<string, any[]> = {};
                  custodiesList.forEach(c => {
                    const typeKey = c.item?.inventory_type || c.inventory_type || 'other';
                    const typeName = getInventoryTypeName(typeKey);
                    if (!grouped[typeName]) grouped[typeName] = [];
                    grouped[typeName].push(c);
                  });
                  
                  return Object.keys(grouped).map(typeName => {
                    const list = grouped[typeName];
                    const isConsumable = typeName.toLowerCase().includes('consumable') || typeName.includes('مستهلك');
                    
                    return (
                      <div key={typeName} style={{ marginBottom: '30px' }}>
                        <h4 className="section-title-sm">
                          <i className={`fa-solid ${isConsumable ? 'fa-box-open' : 'fa-boxes-stacked'}`} style={{ color: isConsumable ? '#ef4444' : '#3b82f6', marginLeft: '8px' }}></i> 
                          {typeName}
                        </h4>
                        <div className="premium-table-container">
                          <table className="premium-table">
                            <thead>
                              <tr>
                                <th style={{ width: '60px' }}>#</th>
                                <th>البيان والوصف</th>
                                {!isConsumable && <th>الأرقام التسلسلية</th>}
                                <th style={{ width: '120px' }}>الكمية</th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((item, idx) => {
                                const serial = (item.serial_start || item.serial_end)
                                  ? `${item.serial_start || '—'}${item.serial_end ? ` ➔ ${item.serial_end}` : ''}`
                                  : '—';
                                return (
                                  <tr key={item.id || idx}>
                                    <td>{idx + 1}</td>
                                    <td>{item.item?.name || item.item_name}</td>
                                    {!isConsumable && <td>{serial}</td>}
                                    <td>
                                      <span className={isConsumable ? 'perm-badge-red' : 'perm-badge-blue'} style={isConsumable ? { background: '#fef2f2', color: '#ef4444', borderColor: '#fee2e2' } : {}}>
                                        {item.quantity}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="tab-pane">
                <h3 className="tab-title">صلاحيات إصدار الوثائق والتقارير</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  <div className="details-section-card">
                    <h4 className="section-title-sm"><i className="fa-solid fa-file-contract"></i> وثائق التأمين المتاحة</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' }}>
                      {branchAgent.status === 'قيد الانتظار' ? (
                        <>
                          {branchAgent.requested_documents && branchAgent.requested_documents.length > 0 ? (
                             branchAgent.requested_documents.map((doc: string, i: number) => (
                               <span key={i} className="perm-badge-blue" style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>
                                 {doc} (مطلوب)
                               </span>
                             ))
                          ) : (
                            <span style={{ color: '#64748b' }}>لم يتم اختيار وثائق بعد</span>
                          )}
                        </>
                      ) : (
                        branchAgent.authorized_documents?.filter((doc: string) => !['كشف حساب الوكيل', 'إغلاق حساب شهري', 'كشف إغلاق الحساب الشهري', 'إيصالات القبض', 'إدارة المصروفات', 'التسويات والعمولات', 'الديون المستحقة', 'الأرشيف المالي', 'المخازن والعهدة', 'الإحصائيات المالية', 'مرتبات الموظفين'].includes(doc)).map((doc: string, i: number) => (
                          <span key={i} className="perm-badge-blue">{doc}</span>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="details-section-card">
                    <h4 className="section-title-sm"><i className="fa-solid fa-chart-line"></i> الصلاحيات الإدارية والمالية</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' }}>
                      {(branchAgent as any).authorized_documents?.filter((doc: string) => ['كشف حساب الوكيل', 'إغلاق حساب شهري', 'كشف إغلاق الحساب الشهري', 'إيصالات القبض', 'إدارة المصروفات', 'التسويات والعمولات', 'الديون المستحقة', 'الأرشيف المالي', 'المخازن والعهدة', 'الإحصائيات المالية', 'مرتبات الموظفين'].includes(doc)).map((doc: string, i: number) => (
                        <span key={i} className="perm-badge-green">{doc}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {branchAgent.user && (
                  <div style={{ marginTop: '40px' }}>
                    <h4 className="section-title-sm"><i className="fa-solid fa-user-lock"></i> بيانات الحساب المرتبط</h4>
                    <div className="info-grid" style={{ marginTop: '15px' }}>
                      <InfoItem label="اسم المستخدم" value={branchAgent.user.username} />
                      <InfoItem label="الاسم الكامل" value={branchAgent.user.name} />
                      <InfoItem label="الايميل في الهيئة (EIDC)" value={(branchAgent.user as any).eidc_username} icon="fa-envelope-circle-check" />
                      <InfoItem label="اسم المستخدم في الاتحاد (LIFO)" value={(branchAgent.user as any).lifo_username} icon="fa-envelope-circle-check" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="tab-pane">
                <div className="tab-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <h3 className="tab-title" style={{ margin: 0, border: 'none' }}>طلبات الوكيل</h3>
                  <button onClick={() => setShowRequestModal(true)} className="btn-add-request"><i className="fa-solid fa-paper-plane"></i> تقديم طلب جديد</button>
                </div>
                <div className="requests-list">
                  {requests.length === 0 ? (
                    <div className="empty-requests"><i className="fa-solid fa-inbox"></i><p>لا توجد طلبات سابقة لهذا الوكيل</p></div>
                  ) : (
                    requests.map((req) => (
                      <div key={req.id} className="request-item">
                        <div className={`request-icon ${req.priority === 'urgent' ? 'red' : 'blue'}`}>
                          <i className={`fa-solid ${
                            req.type === 'stock' ? 'fa-boxes-stacked' : 
                            req.type === 'support' ? 'fa-headset' : 
                            req.type === 'commission' ? 'fa-money-bill-trend-up' : 
                            req.type === 'maintenance' ? 'fa-screwdriver-wrench' :
                            req.type === 'marketing' ? 'fa-bullhorn' :
                            req.type === 'training' ? 'fa-user-graduate' :
                            req.type === 'legal' ? 'fa-scale-balanced' :
                            req.type === 'limit_increase' ? 'fa-arrow-up-right-dots' :
                            'fa-envelope'
                          }`}></i>
                        </div>
                        <div className="request-body">
                          <div className="request-top">
                            <h4 className="request-type-title">{getRequestTypeName(req.type)} - {req.subject}</h4>
                            <span className={`status-pill ${req.status}`}>{getStatusName(req.status, req.type)}</span>
                          </div>
                          <p className="request-reason">{req.message}</p>
                          <div className="request-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                            <div className="request-date">بتاريخ: {new Date(req.created_at).toLocaleString('ar-LY', { dateStyle: 'medium' })}</div>
                            {isAdmin && req.status === 'pending' && (
                              <div className="request-actions" style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => openStatusModal(req.id, 'processing')} className="btn-approve" title="جاري المعالجة" style={{ background: '#3b82f6' }}><i className="fa-solid fa-clock"></i> جاري المعالجة</button>
                                <button onClick={() => openStatusModal(req.id, 'completed')} className="btn-approve" title="تم التنفيذ"><i className="fa-solid fa-check"></i> تم التنفيذ</button>
                                <button onClick={() => openStatusModal(req.id, 'rejected')} className="btn-reject" title="رفض"><i className="fa-solid fa-xmark"></i> رفض</button>
                              </div>
                            )}
                          </div>
                          {req.admin_notes && (
                            <div className="admin-note-box" style={{ marginTop: '10px' }}>
                              <strong>ملاحظة الإدارة:</strong> {req.admin_notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'doc_requests' && (
              <div className="tab-pane">
                <div className="tab-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                  <h3 className="tab-title" style={{ margin: 0, border: 'none' }}>طلبات تعديل وإلغاء الوثائق</h3>
                  {!isAdmin && <button onClick={() => setShowNewDocRequestModal(true)} className="btn-add-request"><i className="fa-solid fa-file-circle-plus"></i> تقديم طلب جديد</button>}
                </div>
                <div className="requests-list">
                  {docRequests.length === 0 ? (
                    <div className="empty-requests"><i className="fa-solid fa-inbox"></i><p>لا توجد طلبات وثائق لهذا الوكيل</p></div>
                  ) : (
                    docRequests.map((req) => (
                      <div key={req.id} className="request-item">
                        <div className={`request-icon ${req.request_type === 'cancellation' ? 'red' : 'blue'}`}>
                          <i className={`fa-solid ${req.request_type === 'cancellation' ? 'fa-file-circle-xmark' : 'fa-file-signature'}`}></i>
                        </div>
                        <div className="request-body">
                          <div className="request-top">
                            <h4 className="request-type-title">
                              {req.request_type === 'modification' ? 'تعديل' : 'إلغاء'} {req.document_type ? `- ${req.document_type}` : ''} - {req.document_number}
                            </h4>
                            <span className={`status-pill ${req.status}`}>
                              {req.status === 'pending' ? 'في الانتظار' : req.status === 'accepted' ? 'مقبول' : 'مرفوض'}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, marginBottom: '5px' }}>{req.subject}</div>
                          <p className="request-reason">{req.description}</p>
                          <div className="request-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                            <div className="request-date">بتاريخ: {new Date(req.created_at).toLocaleDateString('ar-LY')}</div>
                            {isAdmin && req.status === 'pending' && (
                              <div className="request-actions" style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => { setSelectedDocRequest(req); setAdminMessage(''); setShowDocStatusModal(true); }} className="btn-approve" title="قبول" style={{ background: '#10b981' }}><i className="fa-solid fa-check-double"></i> قبول</button>
                                <button onClick={() => { setSelectedDocRequest(req); setAdminMessage(''); setShowDocStatusModal(true); }} className="btn-reject" title="رفض"><i className="fa-solid fa-ban"></i> رفض</button>
                              </div>
                            )}
                          </div>
                          {req.admin_message && (
                            <div className="admin-note-box" style={{ marginTop: '10px' }}>
                              <strong>رد الإدارة:</strong> {req.admin_message}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* تبويب الإحصائيات المالية */}
            {activeTab === 'stats' && (
              <div className="tab-pane">
                <h3 className="tab-title">
                  <i className="fa-solid fa-chart-pie" style={{ marginLeft: '8px', color: '#6366f1' }}></i>
                  الإحصائيات المالية للوكيل
                </h3>

                {loadingStats ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>جاري تحميل الإحصائيات...</div>
                ) : !agentStats ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>لا توجد بيانات</div>
                ) : (
                  <>
                    {/* البطاقات الست */}
                    <div className="agent-financial-grid">

                      {/* إجمالي الوثائق */}
                      <div className="service-card" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', cursor: 'default' }}>
                        <div className="service-content">
                          <div className="service-label">إجمالي الوثائق الصادرة</div>
                          <div className="service-statistics">{agentStats.total_documents}</div>
                          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px' }}>
                            نشطة: {agentStats.active_documents} | منتهية: {agentStats.expired_documents}
                          </div>
                        </div>
                        <div className="service-icon">
                          <i className="fa-solid fa-file-shield"></i>
                        </div>
                      </div>

                      {/* إجمالي الإيرادات */}
                      <div className="service-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', cursor: 'default' }}>
                        <div className="service-content">
                          <div className="service-label">إجمالي إيرادات الوثائق</div>
                          <div className="service-statistics">
                            {agentStats.total_revenue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '14px', fontWeight: '500' }}>د.ل</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px' }}>
                            مجموع مبيعات التأمين
                          </div>
                        </div>
                        <div className="service-icon">
                          <i className="fa-solid fa-money-bill-trend-up"></i>
                        </div>
                      </div>

                      {/* حصة الشركة */}
                      <div className="service-card" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', cursor: 'default' }}>
                        <div className="service-content">
                          <div className="service-label">حصة الشركة من الوثائق</div>
                          <div className="service-statistics">
                            {agentStats.company_share?.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '14px', fontWeight: '500' }}>د.ل</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px' }}>
                            صافي المستحقات للشركة
                          </div>
                        </div>
                        <div className="service-icon">
                          <i className="fa-solid fa-building-columns"></i>
                        </div>
                      </div>

                      {/* حصة الوكيل */}
                      <div className="service-card" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', cursor: 'default' }}>
                        <div className="service-content">
                          <div className="service-label">حصة الوكيل (العمولة)</div>
                          <div className="service-statistics">
                            {agentStats.agent_share?.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '14px', fontWeight: '500' }}>د.ل</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px' }}>
                            العمولة المكتسبة من الوثائق
                          </div>
                        </div>
                        <div className="service-icon">
                          <i className="fa-solid fa-user-tie"></i>
                        </div>
                      </div>

                      {/* المدفوع للشركة */}
                      <div className="service-card" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', cursor: 'default' }}>
                        <div className="service-content">
                          <div className="service-label">المدفوع للشركة (حوالات معتمدة)</div>
                          <div className="service-statistics">
                            {agentStats.paid_to_company?.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '14px', fontWeight: '500' }}>د.ل</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px' }}>
                            إيداعات وحوالات معتمدة
                          </div>
                        </div>
                        <div className="service-icon">
                          <i className="fa-solid fa-circle-check"></i>
                        </div>
                      </div>

                      {/* المتبقي على الوكيل */}
                      <div className="service-card" style={{ 
                        background: agentStats.remaining_for_company > 0 
                          ? 'linear-gradient(135deg, #ef4444 0%, #c2410c 100%)' 
                          : 'linear-gradient(135deg, #10b981 0%, #047857 100%)', 
                        cursor: 'default'
                      }}>
                        <div className="service-content">
                          <div className="service-label">المتبقي على الوكيل للشركة</div>
                          <div className="service-statistics">
                            {agentStats.remaining_for_company?.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '14px', fontWeight: '500' }}>د.ل</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px', fontWeight: 'bold' }}>
                            {agentStats.remaining_for_company > 0 ? '⚠️ يوجد رصيد مستحق للشركة' : '✅ الحساب مسوّى بالكامل'}
                          </div>
                        </div>
                        <div className="service-icon">
                          <i className={`fa-solid ${agentStats.remaining_for_company > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'}`}></i>
                        </div>
                      </div>

                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </section>
      </div>

      {/* New Request Modal */}
      {showRequestModal && (
        <div className="modal-overlay">
          <div className="modal-inner">
            <div className="modal-top">
              <h3>تقديم طلب جديد للوكالة</h3>
              <button onClick={() => setShowRequestModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <form onSubmit={handleCreateRequest} className="modal-form">
              <div className="input-group">
                <label>نوع الطلب</label>
                <select value={newRequest.type} onChange={(e) => setNewRequest({...newRequest, type: e.target.value})}>
                  <option value="stock">طلب مخزون/مستندات</option>
                  <option value="support">دعم فني</option>
                  <option value="financial">تسوية مالية</option>
                  <option value="commission">طلب عمولة</option>
                  <option value="maintenance">طلب صيانة</option>
                  <option value="marketing">دعاية وإعلان</option>
                  <option value="training">تدريب</option>
                  <option value="legal">استشارة قانونية</option>
                  <option value="limit_increase">زيادة سقف الإصدار</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
              <div className="input-group">
                <label>الأولوية</label>
                <select value={newRequest.priority} onChange={(e) => setNewRequest({...newRequest, priority: e.target.value})}>
                  <option value="normal">عادي</option>
                  <option value="urgent">عاجل</option>
                </select>
              </div>
              <div className="input-group">
                <label>الموضوع</label>
                <input type="text" placeholder="عنوان مختصر للطلب..." value={newRequest.subject} onChange={(e) => setNewRequest({...newRequest, subject: e.target.value})} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', fontWeight: '700' }} />
              </div>
              <div className="input-group">
                <label>التفاصيل</label>
                <textarea placeholder="اكتب تفاصيل طلبك هنا..." value={newRequest.message} onChange={(e) => setNewRequest({...newRequest, message: e.target.value})} style={{ minHeight: '120px' }}></textarea>
              </div>
              <button type="submit" className="btn-submit-full" disabled={submittingRequest}>{submittingRequest ? 'جاري الإرسال...' : 'إرسال الطلب'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Notes Modal */}
      {showStatusModal && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '450px' }}>
            <div className="modal-top">
              <h3>معالجة طلب الوكيل</h3>
              <button onClick={() => setShowStatusModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="modal-form" style={{ padding: '20px' }}>
              <div className="input-group">
                <label style={{ marginBottom: '10px', display: 'block', fontWeight: 800 }}>ملاحظات الإدارة</label>
                <textarea 
                  placeholder="اكتب ردك أو ملاحظاتك هنا..." 
                  value={adminNotes} 
                  onChange={(e) => setAdminNotes(e.target.value)}
                  style={{ minHeight: '120px', width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  onClick={handleUpdateRequestStatus} 
                  className="btn-submit-full" 
                  disabled={submittingStatus}
                  style={{ flex: 1 }}
                >
                  {submittingStatus ? 'جاري الحفظ...' : 'تأكيد وحفظ'}
                </button>
                <button 
                  onClick={() => setShowStatusModal(false)} 
                  className="btn-outline-sm"
                  style={{ flex: 1, height: 'auto' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Doc Request Status Modal */}
      {showDocStatusModal && selectedDocRequest && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '450px' }}>
            <div className="modal-top">
              <h3>الرد على طلب الوثيقة</h3>
              <button onClick={() => setShowDocStatusModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="modal-form" style={{ padding: '20px' }}>
              <div className="input-group">
                <label style={{ marginBottom: '10px', display: 'block', fontWeight: 800 }}>رسالة الإدارة</label>
                <textarea 
                  placeholder="اكتب ردك هنا..." 
                  value={adminMessage} 
                  onChange={(e) => setAdminMessage(e.target.value)}
                  style={{ minHeight: '120px', width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => handleUpdateDocStatus('accepted')} className="btn-submit-full" style={{ flex: 1, background: '#10b981' }} disabled={submittingStatus}>قبول</button>
                <button onClick={() => handleUpdateDocStatus('rejected')} className="btn-submit-full" style={{ flex: 1, background: '#ef4444' }} disabled={submittingStatus}>رفض</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Doc Request Modal */}
      {showNewDocRequestModal && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '800px' }}>
            <div className="modal-top">
              <h3>تقديم طلب وثيقة جديد</h3>
              <button onClick={() => setShowNewDocRequestModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <form onSubmit={handleCreateDocRequest} className="modal-form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="input-group">
                  <label>نوع الطلب</label>
                  <select value={newDocRequest.request_type} onChange={(e) => setNewDocRequest({...newDocRequest, request_type: e.target.value as any})}>
                    <option value="modification">تعديل وثيقة</option>
                    <option value="cancellation">إلغاء وثيقة</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>نوع الوثيقة</label>
                  <SearchableSelect 
                    options={documentTypeOptions}
                    placeholder="ابحث واختر نوع الوثيقة..."
                    value={newDocRequest.document_type}
                    onChange={(val) => setNewDocRequest({...newDocRequest, document_type: val})}
                  />
                </div>
                <div className="input-group">
                  <label>رقم الوثيقة</label>
                  <input 
                    type="text" 
                    required
                    placeholder="مثال: LBY0001" 
                    value={newDocRequest.document_number} 
                    onChange={(e) => setNewDocRequest({...newDocRequest, document_number: e.target.value})}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', fontWeight: '800' }}
                  />
                </div>
                <div className="input-group">
                  <label>الموضوع</label>
                  <input 
                    type="text" 
                    required
                    placeholder="عنوان مختصر للطلب..." 
                    value={newDocRequest.subject} 
                    onChange={(e) => setNewDocRequest({...newDocRequest, subject: e.target.value})}
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', fontWeight: '700' }}
                  />
                </div>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>التفاصيل (الوصف)</label>
                  <textarea 
                    required
                    placeholder="اكتب تفاصيل التعديل أو سبب الإلغاء هنا..." 
                    value={newDocRequest.description} 
                    onChange={(e) => setNewDocRequest({...newDocRequest, description: e.target.value})}
                    style={{ minHeight: '120px' }}
                  ></textarea>
                </div>
              </div>
              <button type="submit" className="btn-submit-full" disabled={submittingRequest} style={{ marginTop: '20px' }}>
                {submittingRequest ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Redeem Points Modal */}
      {showRedeemModal && (
        <div className="modal-overlay" onClick={() => setShowRedeemModal(false)}>
          <div className="modal-inner" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top">
              <h3>استبدال نقاط الولاء برصيد كاش</h3>
              <button onClick={() => setShowRedeemModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <form onSubmit={handleRedeemPoints} className="modal-form" style={{ padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>رصيد نقاطك الحالي:</span>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#f59e0b', marginTop: '5px' }}>{walletDetails?.points_balance || 0} نقطة</h3>
                <small style={{ color: 'var(--muted)' }}>سعر التحويل: كل 1000 نقطة تساوي 10.00 دينار ليبي</small>
              </div>
              <div className="input-group">
                <label>عدد النقاط المراد تحويلها (مضاعفات الـ 1000)</label>
                <input 
                  type="number" 
                  required 
                  min="1000" 
                  step="1000"
                  max={walletDetails?.points_balance || 0}
                  placeholder="مثال: 1000" 
                  value={pointsToRedeem} 
                  onChange={(e) => setPointsToRedeem(e.target.value)} 
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', fontWeight: '700' }} 
                />
              </div>
              
              {pointsToRedeem && !isNaN(Number(pointsToRedeem)) && Number(pointsToRedeem) >= 1000 && (
                <div style={{ 
                  background: 'rgba(245, 158, 11, 0.05)', border: '1px dashed #f59e0b', 
                  borderRadius: '10px', padding: '15px', marginBottom: '20px', textAlign: 'center' 
                }}>
                  <span style={{ fontSize: '13px', color: 'var(--text)' }}>ستحصل في المقابل على رصيد مالي بقيمة:</span>
                  <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#10b981', marginTop: '5px' }}>
                    {((parseInt(pointsToRedeem) / 1000) * 10).toFixed(2)} د.ل
                  </h3>
                </div>
              )}

              <button type="submit" className="btn-submit-full" style={{ background: '#f59e0b', marginTop: '20px' }} disabled={submittingRedeem}>
                {submittingRedeem ? 'جاري التحويل...' : 'تأكيد عملية التحويل'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Request Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="modal-overlay" onClick={() => setShowWithdrawModal(false)}>
          <div className="modal-inner" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top">
              <h3>تقديم طلب سحب رصيد كاش</h3>
              <button onClick={() => setShowWithdrawModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <form onSubmit={handleRequestWithdrawal} className="modal-form" style={{ padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>الرصيد المالي المتاح للسحب:</span>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#0ea5e9', marginTop: '5px' }}>
                  {walletDetails?.wallet_balance?.toFixed(2) || '0.00'} د.ل
                </h3>
              </div>
              <div className="input-group">
                <label>المبلغ المطلوب سحبه (د.ل)</label>
                <input 
                  type="number" 
                  required 
                  min="1" 
                  step="0.01"
                  max={walletDetails?.wallet_balance || 0}
                  placeholder="مثال: 50.00" 
                  value={withdrawAmount} 
                  onChange={(e) => setWithdrawAmount(e.target.value)} 
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', fontWeight: '700' }} 
                />
              </div>
              <div className="input-group">
                <label>طريقة السحب المفضلة</label>
                <select value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)}>
                  <option value="نقدي من الإدارة">نقدي من الإدارة</option>
                  <option value="حوالة بنكية لحسابي">حوالة بنكية لحسابي</option>
                  <option value="تحويل كاش إلى محفظتي الرقمية">تحويل كاش إلى محفظتي الرقمية</option>
                </select>
              </div>

              <button type="submit" className="btn-submit-full" style={{ background: '#0ea5e9', marginTop: '20px' }} disabled={submittingWithdraw}>
                {submittingWithdraw ? 'جاري إرسال الطلب...' : 'تأكيد إرسال طلب السحب'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Adjust Wallet Modal */}
      {showAdjustModal && (
        <div className="modal-overlay" onClick={() => setShowAdjustModal(false)}>
          <div className="modal-inner" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top">
              <h3>تعديل إداري لأرصدة الوكيل</h3>
              <button onClick={() => setShowAdjustModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <form onSubmit={handleAdjustWallet} className="modal-form" style={{ padding: '20px' }}>
              <div className="input-group">
                <label>تعديل رصيد النقاط (استخدم علامة - للخصم)</label>
                <input 
                  type="number" 
                  placeholder="مثال: 500 أو -500" 
                  value={adjustPoints} 
                  onChange={(e) => setAdjustPoints(e.target.value)} 
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px' }} 
                />
              </div>
              <div className="input-group">
                <label>تعديل رصيد الكاش بالدينار (استخدم علامة - للخصم)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="مثال: 100 أو -100" 
                  value={adjustCash} 
                  onChange={(e) => setAdjustCash(e.target.value)} 
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px' }} 
                />
              </div>
              <div className="input-group">
                <label>سبب التعديل والقرار الإداري <span className="required">*</span></label>
                <textarea 
                  required
                  placeholder="اكتب سبب تعديل الرصيد بالتفصيل للمتابعة..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  style={{ minHeight: '100px' }}
                ></textarea>
              </div>

              <button type="submit" className="btn-submit-full" style={{ background: 'var(--sidebar)', marginTop: '20px' }} disabled={submittingAdjust}>
                {submittingAdjust ? 'جاري تعديل الرصيد...' : 'حفظ وتحديث الأرصدة'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin Process Withdrawal Request Modal */}
      {showWithdrawStatusModal && (
        <div className="modal-overlay" onClick={() => setShowWithdrawStatusModal(false)}>
          <div className="modal-inner" style={{ maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top">
              <h3>معالجة طلب سحب رصيد الوكيل</h3>
              <button onClick={() => setShowWithdrawStatusModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="modal-form" style={{ padding: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>المبلغ المطلوب سحبه:</span>
                <h3 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text)', marginTop: '5px' }}>
                  {selectedWithdrawRequest?.amount} د.ل
                </h3>
                <small style={{ color: 'var(--muted)' }}>القرار الإداري الحالي: <strong style={{ color: withdrawStatus === 'approved' ? '#10b981' : '#ef4444' }}>{withdrawStatus === 'approved' ? 'موافقة وقبول' : 'رفض وإرجاع'}</strong></small>
              </div>
              
              <div className="input-group">
                <label>ملاحظات وتفاصيل المعالجة الإدارية</label>
                <textarea 
                  placeholder="اكتب رقم الحوالة، أو سبب الرفض، أو أي تفاصيل..."
                  value={withdrawAdminNotes}
                  onChange={(e) => setWithdrawAdminNotes(e.target.value)}
                  style={{ minHeight: '100px' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  onClick={() => handleUpdateWithdrawalStatus(withdrawStatus)} 
                  className="btn-submit-full" 
                  disabled={submittingWithdrawStatus}
                  style={{ flex: 1, background: withdrawStatus === 'approved' ? '#10b981' : '#ef4444' }}
                >
                  {submittingWithdrawStatus ? 'جاري المعالجة...' : 'حفظ واعتماد القرار'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowWithdrawStatusModal(false)} 
                  className="btn-outline-sm"
                  style={{ flex: 1, height: '42px', justifyContent: 'center' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Points Help Modal */}
      {showPointsHelp && (
        <div className="modal-overlay" onClick={() => setShowPointsHelp(false)} style={{ zIndex: 1100 }}>
          <div className="modal-inner" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', borderRadius: '16px', padding: '25px', direction: 'rtl' }}>
            <div className="modal-top" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '16px', fontWeight: 'bold' }}>
                <i className="fa-solid fa-award"></i> تفاصيل نقاط مكافآت إصدار الوثائق
              </h3>
              <button type="button" onClick={() => setShowPointsHelp(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            
            <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '15px', lineHeight: '1.5', textAlign: 'right' }}>
              تُمنح نقاط الولاء تلقائياً لمحفظتك فور إصدار أي وثيقة تأمين من حسابك. إليك عدد النقاط المخصصة لكل وثيقة حالياً:
            </p>

            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--table-header-bg)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: '700' }}>نوع الوثيقة</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: '100px', fontWeight: '700' }}>النقاط</th>
                  </tr>
                </thead>
                <tbody>
                  {pointsRules.length > 0 ? (
                    pointsRules.map((rule) => (
                      <tr key={rule.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: '500', color: 'var(--text-color)' }}>{rule.display_name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#f59e0b', fontWeight: 'bold' }}>+{rule.points_reward}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} style={{ padding: '15px', textAlign: 'center', color: 'var(--muted)' }}>جاري تحميل جدول النقاط...</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '15px', background: 'rgba(245, 158, 11, 0.05)', border: '1px dashed rgba(245, 158, 11, 0.3)', borderRadius: '8px', padding: '10px', fontSize: '11px', color: 'var(--muted)', lineHeight: '1.5', textAlign: 'right' }}>
              <i className="fa-solid fa-circle-exclamation" style={{ color: '#f59e0b', marginLeft: '5px' }}></i>
              كما تكسب <strong>20% نقاط إضافية + 1.00 د.ل كاش</strong> كعمولة إحالة عن كل وثيقة يصدرها الوكلاء المسجلين برابط إحالتك!
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, icon }: { label: string, value?: string, icon?: string }) {
  const isLink = value && (value.startsWith('http://') || value.startsWith('https://'));
  return (
    <div className="info-item-box">
      <span className="info-label-text">
        {icon && <i className={`fa-solid ${icon}`}></i>}
        {label}
      </span>
      <span className="info-value-text">
        {isLink ? (
          <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent, #3b82f6)', textDecoration: 'underline' }}>
            اضغط هنا لفتح الرابط
          </a>
        ) : (
          value || '—'
        )}
      </span>
    </div>
  );
}

function DocCard({ label, url }: { label: string, url: string }) {
  return (
    <div className="doc-card">
      <div className="doc-preview">
        <img src={`${BACKEND_URL}/storage/${url}`} alt={label} />
        <div className="doc-overlay">
          <a href={`${BACKEND_URL}/storage/${url}`} target="_blank" className="overlay-btn" rel="noreferrer"><i className="fa-solid fa-expand"></i></a>
        </div>
      </div>
      <p className="doc-label">{label}</p>
    </div>
  );
}
