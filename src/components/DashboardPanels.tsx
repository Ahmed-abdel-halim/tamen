import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

type ServiceCard = {
  label: string;
  icon: string;
  route: string;
  color: 'green' | 'blue';
  statistics?: string;
}

type DashboardPanelsProps = {}

export function DashboardPanels({}: DashboardPanelsProps) {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState<Record<string, number>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [authorizedDocs, setAuthorizedDocs] = useState<string[] | null>(null);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [latestDocuments, setLatestDocuments] = useState<any[]>([]);
  const [branchAgentId, setBranchAgentId] = useState<number | null>(null);
  const [walletStats, setWalletStats] = useState<any>(null);
  const [showPointsHelp, setShowPointsHelp] = useState(false);
  const [pointsRules, setPointsRules] = useState<any[]>([]);
  const [agentFinancialStats, setAgentFinancialStats] = useState<any>(null);
  const [loadingFinancialStats, setLoadingFinancialStats] = useState(false);

  // Load user permissions
  useEffect(() => {
    const loadUserPermissions = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setIsAdmin(user.is_admin || false);
          setAuthorizedDocs(user.authorized_documents || null);
          setUserName(user.name || user.username || '');
          if (user.branch_agent_id) {
            setBranchAgentId(Number(user.branch_agent_id));
          } else {
            setBranchAgentId(null);
          }
        }
      } catch (error) {
        setIsAdmin(false);
        setAuthorizedDocs(null);
        setUserName('');
        setBranchAgentId(null);
      }
    };
    
    loadUserPermissions();
    
    // Listen for storage changes
    const handleStorageChange = () => {
      loadUserPermissions();
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Fetch wallet statistics, points rules, and financial stats
  useEffect(() => {
    // 1. Fetch wallet & points (only if agent)
    if (branchAgentId) {
      const fetchWalletStats = async () => {
        try {
          const token = localStorage.getItem('token');
          const headers = {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          };
          const res = await fetch(`${API_BASE_URL}/agent-wallet/${branchAgentId}`, { headers });
          if (res.ok) {
            const data = await res.json();
            setWalletStats(data);
          }
        } catch (error) {
          console.error("Error fetching wallet stats for dashboard:", error);
        }
      };

      const fetchPointsRules = async () => {
        try {
          const token = localStorage.getItem('token');
          const headers = {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          };
          const res = await fetch(`${API_BASE_URL}/agent-wallet/settings/loyalty`, { headers });
          if (res.ok) {
            const data = await res.json();
            setPointsRules(data);
          }
        } catch (error) {
          console.error("Error fetching points rules for dashboard:", error);
        }
      };
      
      fetchWalletStats();
      fetchPointsRules();
    } else {
      setWalletStats(null);
    }

    // 2. Fetch financial stats (Agent stats if agent, Global stats if admin)
    const fetchFinancialStats = async () => {
      if (!branchAgentId && !isAdmin) return;
      
      setLoadingFinancialStats(true);
      try {
        const token = localStorage.getItem('token');
        const url = branchAgentId 
          ? `${API_BASE_URL}/branches-agents/${branchAgentId}/financial-stats`
          : `${API_BASE_URL}/global-financial-stats`;

        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        if (res.ok) {
          const data = await res.json();
          // The global stats might return directly, let's normalize or check structure
          if (data.success || data.total_documents !== undefined) {
            setAgentFinancialStats(data);
          }
        }
      } catch (e) {
        console.error('Error fetching financial stats:', e);
      } finally {
        setLoadingFinancialStats(false);
      }
    };

    fetchFinancialStats();
  }, [branchAgentId, isAdmin]);

  // Digital clock state
  const [clock, setClock] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setClock(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch statistics
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        const userStr = localStorage.getItem('user');
        let userId = null;
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            userId = user.id;
          } catch (e) {}
        }
        
        const headers: HeadersInit = { 'Accept': 'application/json' };
        if (userId) {
          headers['X-User-Id'] = userId.toString();
        }
        
        const res = await fetch(`${API_BASE_URL}/dashboard/statistics`, {
          headers
        });
        if (res.ok) {
          const data = await res.json();
          setStatistics(data);
        }
      } catch (error) {
        // Error fetching statistics
      }
    };
    
    fetchStatistics();
  }, []);

  // Fetch latest documents
  useEffect(() => {
    const fetchLatestDocuments = async () => {
      try {
        const userStr = localStorage.getItem('user');
        let userId = null;
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            userId = user.id;
          } catch (e) {}
        }
        
        const headers: HeadersInit = { 'Accept': 'application/json' };
        if (userId) {
          headers['X-User-Id'] = userId.toString();
        }
        
        const res = await fetch(`${API_BASE_URL}/dashboard/latest-documents`, {
          headers
        });
        if (res.ok) {
          const data = await res.json();
          setLatestDocuments(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        setLatestDocuments([]);
      }
    };
    
    fetchLatestDocuments();
  }, []);

  // خريطة أنواع التأمين إلى الروابط (مثل السايدبار)
  const insuranceTypeMap: Record<string, { label: string; icon: string; route: string; color: 'green' | 'blue'; statisticsKey?: string }> = {
    'تأمين سيارات إجباري': { label: 'وثيقة تأمين سيارات', icon: 'fa-solid fa-car', route: '/insurance-documents', color: 'green', statisticsKey: 'insurance_documents' },
    'تأمين سيارات': { label: 'وثيقة تأمين سيارات', icon: 'fa-solid fa-car', route: '/insurance-documents', color: 'green', statisticsKey: 'insurance_documents' },
    'تأمين سيارة جمرك': { label: 'وثيقة تأمين سيارات', icon: 'fa-solid fa-car', route: '/insurance-documents', color: 'green', statisticsKey: 'insurance_documents' },
    'تأمين سيارات أجنبية': { label: 'وثيقة تأمين سيارات', icon: 'fa-solid fa-car', route: '/insurance-documents', color: 'green', statisticsKey: 'insurance_documents' },
    'تأمين طرف ثالث سيارات': { label: 'وثيقة تأمين سيارات', icon: 'fa-solid fa-car', route: '/insurance-documents', color: 'green', statisticsKey: 'insurance_documents' },
    'تأمين سيارات دولي': { label: 'تأمين السيارات الدولي', icon: 'fa-solid fa-globe', route: '/international-insurance-documents', color: 'green', statisticsKey: 'international_insurance_documents' },
    'تأمين المسافرين': { label: 'وثيقة تأمين مسافرين', icon: 'fa-solid fa-plane', route: '/travel-insurance-documents', color: 'green', statisticsKey: 'travel_insurance_documents' },
    'تأمين زائرين ليبيا': { label: 'وثيقة تأمين مسافرين', icon: 'fa-solid fa-plane', route: '/travel-insurance-documents', color: 'green', statisticsKey: 'travel_insurance_documents' },
    'تأمين الوافدين': { label: 'تأمين الوافدين للمقيمين', icon: 'fa-solid fa-user-check', route: '/resident-insurance-documents', color: 'green', statisticsKey: 'resident_insurance_documents' },
    'تأمين الهياكل البحرية': { label: 'وثيقة تأمين الهياكل البحرية', icon: 'fa-solid fa-ship', route: '/marine-structure-insurance-documents', color: 'green', statisticsKey: 'marine_structure_insurance_documents' },
    'تأمين المسؤولية المهنية (الطبية)': { label: 'المسؤوليه المهنيه (الطبيه)', icon: 'fa-solid fa-heart-pulse', route: '/professional-liability-insurance-documents', color: 'green', statisticsKey: 'professional_liability_insurance_documents' },
    'تأمين الحوادث الشخصية': { label: 'تأمين الحوادث الشخصيه', icon: 'fa-solid fa-user-injured', route: '/personal-accident-insurance-documents', color: 'green', statisticsKey: 'personal_accident_insurance_documents' },
    'تأمين طلبة المدارس': { label: 'وثيقه تأمين حمايه طلاب المدارس', icon: 'fa-solid fa-graduation-cap', route: '/school-student-insurance', color: 'green', statisticsKey: 'school_student_insurance_documents' },
    'تأمين نقل النقدية': { label: 'تأمين نقل النقديه (الأموال)', icon: 'fa-solid fa-money-bill-transfer', route: '/cash-in-transit-insurance', color: 'green', statisticsKey: 'cash_in_transit_insurance_documents' },
    'تأمين البضائع': { label: 'وثيقه تأمين شحن البضائع', icon: 'fa-solid fa-truck', route: '/cargo-insurance', color: 'green', statisticsKey: 'cargo_insurance_documents' },
  };

  // ترتيب ثابت للعناصر حسب السايدبار الأصلي
  const sidebarOrder: string[] = [
    '/insurance-documents',
    '/international-insurance-documents',
    '/travel-insurance-documents',
    '/resident-insurance-documents',
    '/marine-structure-insurance-documents',
    '/professional-liability-insurance-documents',
    '/personal-accident-insurance-documents',
  ];

  // قائمة الخدمات الأساسية (للأدمن أو الخدمات العامة)
  const allServices: ServiceCard[] = [
    { 
      label: 'وثيقة تأمين سيارات', 
      icon: 'fa-solid fa-car', 
      route: '/insurance-documents', 
      color: 'green', 
      statistics: statistics.insurance_documents?.toString() || '0' 
    },
    { 
      label: 'تأمين السيارات الدولي', 
      icon: 'fa-solid fa-globe', 
      route: '/international-insurance-documents', 
      color: 'green', 
      statistics: statistics.international_insurance_documents?.toString() || '0' 
    },
    { 
      label: 'وثيقة تأمين مسافرين', 
      icon: 'fa-solid fa-plane', 
      route: '/travel-insurance-documents', 
      color: 'green', 
      statistics: statistics.travel_insurance_documents?.toString() || '0' 
    },
    { 
      label: 'تأمين الوافدين للمقيمين', 
      icon: 'fa-solid fa-user-check', 
      route: '/resident-insurance-documents', 
      color: 'green', 
      statistics: statistics.resident_insurance_documents?.toString() || '0' 
    },
    { 
      label: 'وثيقة تأمين الهياكل البحرية', 
      icon: 'fa-solid fa-ship', 
      route: '/marine-structure-insurance-documents', 
      color: 'green', 
      statistics: statistics.marine_structure_insurance_documents?.toString() || '0' 
    },
    { 
      label: 'المسؤوليه المهنيه (الطبيه)', 
      icon: 'fa-solid fa-heart-pulse', 
      route: '/professional-liability-insurance-documents', 
      color: 'green', 
      statistics: statistics.professional_liability_insurance_documents?.toString() || '0' 
    },
    { 
      label: 'تأمين الحوادث الشخصيه', 
      icon: 'fa-solid fa-user-injured', 
      route: '/personal-accident-insurance-documents', 
      color: 'green', 
      statistics: statistics.personal_accident_insurance_documents?.toString() || '0' 
    },
    { 
      label: 'وثيقه تأمين حمايه طلاب المدارس', 
      icon: 'fa-solid fa-graduation-cap', 
      route: '/school-student-insurance', 
      color: 'green', 
      statistics: statistics.school_student_insurance_documents?.toString() || '0' 
    },
    { 
      label: 'تأمين نقل النقديه (الأموال)', 
      icon: 'fa-solid fa-money-bill-transfer', 
      route: '/cash-in-transit-insurance', 
      color: 'green', 
      statistics: statistics.cash_in_transit_insurance_documents?.toString() || '0' 
    },
    { 
      label: 'وثيقه تأمين شحن البضائع', 
      icon: 'fa-solid fa-truck', 
      route: '/cargo-insurance', 
      color: 'green', 
      statistics: statistics.cargo_insurance_documents?.toString() || '0' 
    },
    { label: 'كشف حساب للوكيل', icon: 'fa-solid fa-file-invoice', route: '/reports/branch-agent-account', color: 'blue' },
    { label: 'اغلاق حساب الوكيل', icon: 'fa-solid fa-calendar-days', route: '/reports/monthly-account-closure', color: 'blue' },
  ];

  // تصفية الخدمات بناءً على الصلاحيات
  const getFilteredServices = (): ServiceCard[] => {
    // إذا كان admin، أظهر كل شيء
    if (isAdmin) {
      return allServices;
    }

    // إنشاء خريطة للخدمات المصرح بها
    const authorizedRoutesMap = new Map<string, ServiceCard>();

    if (authorizedDocs && authorizedDocs.length > 0) {
      authorizedDocs.forEach((docType) => {
        const insuranceInfo = insuranceTypeMap[docType];
        if (insuranceInfo && !authorizedRoutesMap.has(insuranceInfo.route)) {
          const statisticsKey = insuranceInfo.statisticsKey;
          authorizedRoutesMap.set(insuranceInfo.route, {
            label: insuranceInfo.label,
            icon: insuranceInfo.icon,
            route: insuranceInfo.route,
            color: insuranceInfo.color,
            statistics: statisticsKey ? (statistics[statisticsKey]?.toString() || '0') : '0'
          });
        }
      });
    }

    // ترتيب العناصر حسب ترتيب السايدبار الأصلي
    const authorizedServices: ServiceCard[] = sidebarOrder
      .filter(route => authorizedRoutesMap.has(route))
      .map(route => authorizedRoutesMap.get(route)!);

    // إضافة الخدمات العامة للجميع (مثل ملفي الوظيفي للموظفين)
    let currentUserId = '';
    let isAgent = false;
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        currentUserId = u.id;
        isAgent = !!u.branch_agent_id;
      } catch (e) {}
    }

    const personalServices: ServiceCard[] = isAgent ? [] : [
      { label: 'ملفي الوظيفي وطلباتي', icon: 'fa-solid fa-address-card', route: `/users/${currentUserId}`, color: 'blue' }
    ];

    if (authorizedServices.length === 0 && !isAdmin) {
      return personalServices;
    }

    return [...authorizedServices, ...personalServices];
  };

  const services = getFilteredServices();

  const handleServiceClick = (service: ServiceCard) => {
    // الخدمات التي تحتاج مودال "قريباً"
    const comingSoonServices: string[] = [];

    if (comingSoonServices.includes(service.label)) {
      setShowComingSoonModal(true);
      return;
    }

    if (service.route && service.route !== '#') {
      navigate(service.route);
    }
  };

  return (
    <section className="dashboard">
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <h1 className="dashboard-title">مرحباً بك، {userName || 'مستخدم'}</h1>
          <p className="dashboard-subtitle">لوحة التحكم الرئيسية</p>
        </div>
        <div className="dashboard-clock-wrapper">
          <div className="dashboard-clock-icon">
            <i className="fa-solid fa-clock"></i>
          </div>
          <div className="dashboard-clock">{clock}</div>
        </div>
      </div>

      {/* Financial Stats Cards for Agents and Admins */}
      {(branchAgentId || isAdmin) && (
        <div style={{ marginBottom: '25px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            <i className="fa-solid fa-chart-pie" style={{ color: '#6366f1' }}></i>
            {isAdmin ? 'ملخص الإحصائيات المالية العامة (جميع الوكلاء)' : 'ملخص الإحصائيات المالية لوثائقي'}
          </h2>
          <div className="agent-financial-grid">

            {/* إجمالي الوثائق */}
            <div className="service-card" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', cursor: 'default' }}>
              <div className="service-content">
                <div className="service-label">{isAdmin ? 'إجمالي الوثائق الصادرة (الكل)' : 'إجمالي الوثائق الصادرة'}</div>
                <div className="service-statistics">
                  {loadingFinancialStats ? '...' : (agentFinancialStats?.total_documents ?? 0)}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px' }}>
                  نشطة: {loadingFinancialStats ? '...' : (agentFinancialStats?.active_documents ?? 0)} | منتهية: {loadingFinancialStats ? '...' : (agentFinancialStats?.expired_documents ?? 0)}
                </div>
              </div>
              <div className="service-icon">
                <i className="fa-solid fa-file-shield"></i>
              </div>
            </div>

            {/* إجمالي الإيرادات */}
            <div className="service-card" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', cursor: 'default' }}>
              <div className="service-content">
                <div className="service-label">{isAdmin ? 'إجمالي إيرادات الشركة' : 'إجمالي إيرادات وثائقي'}</div>
                <div className="service-statistics">
                  {loadingFinancialStats ? '...' : (agentFinancialStats?.total_revenue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00')} <span style={{ fontSize: '14px', fontWeight: '500' }}>د.ل</span>
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
                <div className="service-label">حصة الشركة</div>
                <div className="service-statistics">
                  {loadingFinancialStats ? '...' : (agentFinancialStats?.company_share?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00')} <span style={{ fontSize: '14px', fontWeight: '500' }}>د.ل</span>
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
                <div className="service-label">{isAdmin ? 'إجمالي عمولات الوكلاء' : 'حصة الوكيل (عمولتي)'}</div>
                <div className="service-statistics">
                  {loadingFinancialStats ? '...' : (agentFinancialStats?.agent_share?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00')} <span style={{ fontSize: '14px', fontWeight: '500' }}>د.ل</span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px' }}>
                  {isAdmin ? 'مجموع عمولات الوكلاء المحتسبة' : 'العمولة المكتسبة من الوثائق'}
                </div>
              </div>
              <div className="service-icon">
                <i className="fa-solid fa-user-tie"></i>
              </div>
            </div>

            {/* المدفوع للشركة */}
            <div className="service-card" style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', cursor: 'default' }}>
              <div className="service-content">
                <div className="service-label">{isAdmin ? 'إجمالي المقبوضات (حوالات معتمدة)' : 'المدفوع للشركة'}</div>
                <div className="service-statistics">
                  {loadingFinancialStats ? '...' : (agentFinancialStats?.paid_to_company?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00')} <span style={{ fontSize: '14px', fontWeight: '500' }}>د.ل</span>
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
              background: agentFinancialStats?.remaining_for_company > 0 
                ? 'linear-gradient(135deg, #ef4444 0%, #c2410c 100%)' 
                : 'linear-gradient(135deg, #10b981 0%, #047857 100%)', 
              cursor: 'default'
            }}>
              <div className="service-content">
                <div className="service-label">{isAdmin ? 'إجمالي المتبقي بطرف الوكلاء' : 'المتبقي على الوكيل'}</div>
                <div className="service-statistics">
                  {loadingFinancialStats ? '...' : (agentFinancialStats?.remaining_for_company?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00')} <span style={{ fontSize: '14px', fontWeight: '500' }}>د.ل</span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.85)', marginTop: '4px', fontWeight: 'bold' }}>
                  {agentFinancialStats?.remaining_for_company > 0 
                    ? (isAdmin ? '⚠️ توجد ديون مستحقة للتحصيل' : '⚠️ يوجد رصيد مستحق') 
                    : (isAdmin ? '✅ لا توجد ديون متأخرة للشركة' : '✅ لا توجد مبالغ متأخرة')}
                </div>
              </div>
              <div className="service-icon">
                <i className={`fa-solid ${agentFinancialStats?.remaining_for_company > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'}`}></i>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Wallet Cards Summary for Agents */}
      {branchAgentId && (
        <div className="agent-financial-grid">
          {/* Points Card */}
          <div 
            className="service-card" 
            onClick={() => navigate(`/branches-agents/${branchAgentId}?tab=wallet`)}
            style={{ 
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', // Gold/orange gradient
              cursor: 'pointer'
            }}
          >
            <div className="service-content">
              <div className="service-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>نقاط الولاء الحالية</span>
                <i 
                  className="fa-solid fa-circle-info" 
                  style={{ color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer', fontSize: '14px' }}
                  title="جدول تفاصيل نقاط الوثائق"
                  onClick={(e) => { e.stopPropagation(); setShowPointsHelp(true); }}
                ></i>
              </div>
              <div className="service-statistics">
                {walletStats?.points_balance || 0} نقطة
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.9)', marginTop: '4px' }}>
                اضغط هنا لاستبدال النقاط بكاش
              </div>
            </div>
            <div className="service-icon">
              <i className="fa-solid fa-star"></i>
            </div>
          </div>
        </div>
      )}

      {/* Services Section Title */}
      <div style={{ marginBottom: '16px', marginTop: '10px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
          <i className="fa-solid fa-file-invoice" style={{ color: '#10b981' }}></i>
          إصدار وإدارة وثائق التأمين
        </h2>
      </div>

      <div className="services-grid">
        {services.map((service, index) => (
          <div
            key={index}
            className={`service-card service-card-${service.color}`}
            onClick={() => handleServiceClick(service)}
            style={{ cursor: 'pointer' }}
          >
            <div className="service-content">
              <div className="service-label">{service.label}</div>
              {service.statistics !== undefined && (
                <div className="service-statistics">{service.statistics}</div>
              )}
            </div>
            <div className="service-icon">
              <i className={service.icon}></i>
            </div>
          </div>
        ))}
      </div>

      {/* Latest Documents Section */}
      <div className="latest-documents-section">
        <h2 className="latest-documents-title">آخر 5 تأمينات صادرة</h2>
        {latestDocuments.length > 0 ? (
          <div className="latest-documents-table-wrapper">
            <table className="latest-documents-table">
              <thead>
                <tr>
                  <th>رقم التأمين</th>
                  <th>تاريخ الإصدار</th>
                  <th>اسم المؤمن</th>
                  <th>رقم الهاتف</th>
                  <th>الإجمالي</th>
                  <th>نوع التأمين</th>
                  {isAdmin && <th>الوكيل</th>}
                </tr>
              </thead>
              <tbody>
                {latestDocuments.map((doc) => (
                  <tr key={`${doc.type}-${doc.id}`}>
                    <td>{doc.insurance_number || '-'}</td>
                    <td>{doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('ar-LY') : '-'}</td>
                    <td>{doc.insured_name || '-'}</td>
                    <td>{doc.phone || '-'}</td>
                    <td>{doc.total ? doc.total.toLocaleString() : '0'} د.ل</td>
                    <td>{doc.insurance_type || '-'}</td>
                    {isAdmin && (
                      <td>{doc.agency_name || '-'}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)' }}>
            لا توجد وثائق صادرة
          </p>
        )}
      </div>

      {/* Coming Soon Modal */}
      {showComingSoonModal && (
        <div className="modal-overlay" onClick={() => setShowComingSoonModal(false)}>
          <div className="modal-content coming-soon-modal" onClick={(e) => e.stopPropagation()}>
            <div className="coming-soon-icon">
              <i className="fa-solid fa-clock"></i>
            </div>
            <h3>قريباً في التحديث القادم</h3>
            <p className="coming-soon-message">
              نعمل على إضافة هذه الميزة قريباً. شكراً لصبرك!
            </p>
            <div className="delete-confirm-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowComingSoonModal(false)}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Points Help Modal */}
      {showPointsHelp && (
        <div className="modal-overlay" onClick={() => setShowPointsHelp(false)} style={{ zIndex: 1100 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', borderRadius: '16px', padding: '25px', direction: 'rtl' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontSize: '16px', fontWeight: 'bold' }}>
                <i className="fa-solid fa-award"></i> تفاصيل نقاط مكافآت إصدار الوثائق
              </h3>
              <button type="button" onClick={() => setShowPointsHelp(false)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--muted)', padding: '0 5px' }}>&times;</button>
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
    </section>
  )
}
