import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
        }
      } catch (error) {
        setIsAdmin(false);
        setAuthorizedDocs(null);
        setUserName('');
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
        const userId = userStr ? JSON.parse(userStr).id : null;
        
        const headers: HeadersInit = { 'Accept': 'application/json' };
        if (userId) {
          headers['X-User-Id'] = userId.toString();
        }
        
        const res = await fetch('/api/dashboard/statistics', {
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
        const userId = userStr ? JSON.parse(userStr).id : null;
        
        const headers: HeadersInit = { 'Accept': 'application/json' };
        if (userId) {
          headers['X-User-Id'] = userId.toString();
        }
        
        const res = await fetch('/api/dashboard/latest-documents', {
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
    { label: 'إغلاق حساب شهري', icon: 'fa-solid fa-calendar-days', route: '/reports/monthly-account-closure', color: 'blue' },
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

    // إضافة الخدمات الأخرى التي لا تحتاج صلاحيات (مثل وثيقة تأمين حمايه طلاب المدارس)
    const otherServices = allServices.filter(service => 
      service.route === '#' || 
      (service.route.startsWith('/reports/branch-agent-account') && isAdmin)
    );

    return [...authorizedServices, ...otherServices];
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
    </section>
  )
}
