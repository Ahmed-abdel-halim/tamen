import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar'

type SidebarItem = {
  label: string;
  icon: string;
  to?: string;
  children?: SidebarItem[];
}

type SidebarSection = {
  title: string;
  items: SidebarItem[];
}

import { Topbar } from './components/Topbar'
import { DashboardPanels } from './components/DashboardPanels'
import UsersList from './components/UsersList';
import Login from './components/Login';
import BranchAgentAccountReport from './components/BranchAgentAccountReport';
import MonthlyAccountClosure from './components/MonthlyAccountClosure';
import MonthlyAccountClosuresReport from './components/MonthlyAccountClosuresReport';
import ProfilePage from './components/ProfilePage';
import BranchesAgentsList from './components/BranchesAgentsList';
import CreateBranchAgent from './components/CreateBranchAgent';
import BranchAgentDetails from './components/BranchAgentDetails';
import EditBranchAgent from './components/EditBranchAgent';
import CitiesList from './components/CitiesList';
import PlatesList from './components/PlatesList';
import VehicleTypesList from './components/VehicleTypesList';
import InsuranceDocumentsList from './components/InsuranceDocumentsList';
import CreateInsuranceDocument from './components/CreateInsuranceDocument';
import EditInsuranceDocument from './components/EditInsuranceDocument';
import ViewInsuranceDocument from './components/ViewInsuranceDocument';
import TransferOwnershipInsuranceDocument from './components/TransferOwnershipInsuranceDocument';
import CreateInternationalInsurance from './components/CreateInternationalInsurance';
import EditInternationalInsurance from './components/EditInternationalInsurance';
import ViewInternationalInsurance from './components/ViewInternationalInsurance';
import InternationalInsuranceList from './components/InternationalInsuranceList';
import CreateTravelInsurance from './components/CreateTravelInsurance';
import EditTravelInsurance from './components/EditTravelInsurance';
import ViewTravelInsurance from './components/ViewTravelInsurance';
import TravelInsuranceList from './components/TravelInsuranceList';
import CreateResidentInsurance from './components/CreateResidentInsurance';
import EditResidentInsurance from './components/EditResidentInsurance';
import ViewResidentInsurance from './components/ViewResidentInsurance';
import ResidentInsuranceList from './components/ResidentInsuranceList';
import CreateMarineStructureInsurance from './components/CreateMarineStructureInsurance';
import EditMarineStructureInsurance from './components/EditMarineStructureInsurance';
import ViewMarineStructureInsurance from './components/ViewMarineStructureInsurance';
import MarineStructureInsuranceList from './components/MarineStructureInsuranceList';
import ProfessionalLiabilityInsuranceList from './components/ProfessionalLiabilityInsuranceList';
import CreateProfessionalLiabilityInsurance from './components/CreateProfessionalLiabilityInsurance';
import ViewProfessionalLiabilityInsurance from './components/ViewProfessionalLiabilityInsurance';
import EditProfessionalLiabilityInsurance from './components/EditProfessionalLiabilityInsurance';
import PersonalAccidentInsuranceList from './components/PersonalAccidentInsuranceList';
import CreatePersonalAccidentInsurance from './components/CreatePersonalAccidentInsurance';
import ViewPersonalAccidentInsurance from './components/ViewPersonalAccidentInsurance';
import EditPersonalAccidentInsurance from './components/EditPersonalAccidentInsurance';
import HomePage from './components/HomePage';
import AboutUs from './components/AboutUs';
import Management from './components/Management';
import BranchesAgentsPage from './components/BranchesAgentsPage';
import InsurancesPage from './components/InsurancesPage';
import ContactUs from './components/ContactUs';
import TestCarInfoAPI from './components/TestCarInfoAPI';
import TestLifoLogin from './components/TestLifoLogin';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = localStorage.getItem('user');
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}


// دالة للتحقق من الصلاحيات بناءً على المسار
function hasAccessToRoute(
  path: string,
  authorizedDocs: string[] | null,
  isAdmin: boolean,
  branchAgentId?: number | null
): boolean {
  // Admin لديه وصول لجميع الصفحات
  if (isAdmin) {
    return true;
  }

  // الفروع/الوكلاء لديهم وصول إلى إعدادات أنواع السيارات فقط
  if (branchAgentId && path.startsWith('/vehicle-types')) {
    return true;
  }

  // إذا لم يكن هناك صلاحيات، لا وصول
  if (!authorizedDocs || authorizedDocs.length === 0) {
    return false;
  }

  // خريطة أنواع التأمين إلى الروابط
  const insuranceTypeMap: Record<string, string[]> = {
    'تأمين سيارات إجباري': ['/insurance-documents'],
    'تأمين سيارات': ['/insurance-documents'],
    'تأمين سيارة جمرك': ['/insurance-documents'],
    'تأمين سيارات أجنبية': ['/insurance-documents'],
    'تأمين طرف ثالث سيارات': ['/insurance-documents'],
    'تأمين سيارات دولي': ['/international-insurance-documents'],
    'تأمين المسافرين': ['/travel-insurance-documents'],
    'تأمين زائرين ليبيا': ['/travel-insurance-documents'],
    'تأمين الوافدين': ['/resident-insurance-documents'],
    'تأمين الهياكل البحرية': ['/marine-structure-insurance-documents'],
    'تأمين المسؤولية المهنية (الطبية)': ['/professional-liability-insurance-documents'],
    'تأمين الحوادث الشخصية': ['/personal-accident-insurance-documents'],
    'كشف حساب الوكيل': ['/reports/branch-agent-account'],
    'إغلاق حساب شهري': ['/reports/monthly-account-closure'],
    'كشف إغلاق الحساب الشهري': ['/reports/monthly-account-closures-report'],
  };

  // جمع جميع الروابط المصرح بها
  const authorizedRoutes = new Set<string>();
  authorizedDocs.forEach((docType) => {
    const routes = insuranceTypeMap[docType];
    if (routes) {
      routes.forEach(route => authorizedRoutes.add(route));
    }
  });

  // التحقق من أن المسار يبدأ بأحد الروابط المصرح بها
  for (const route of authorizedRoutes) {
    if (path.startsWith(route)) {
      return true;
    }
  }

  return false;
}

// Component لحماية الصفحات بناءً على الصلاحيات
function AuthorizedRoute({
  children,
  requiredPath
}: {
  children: React.ReactNode;
  requiredPath: string;
}) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const loadUserPermissions = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          setHasAccess(false);
          return;
        }

        const user = JSON.parse(userStr);
        const isAdmin = user.is_admin || false;
        const authorizedDocs = user.authorized_documents || null;
        const branchAgentId = user.branch_agent_id ?? null;

        setHasAccess(hasAccessToRoute(requiredPath, authorizedDocs, isAdmin, branchAgentId));
      } catch (error) {
        console.error('Error loading user permissions:', error);
        setHasAccess(false);
      }
    };

    loadUserPermissions();

    // استمع لتغييرات localStorage
    const handleStorageChange = () => {
      loadUserPermissions();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', handleStorageChange);
    window.addEventListener('userPermissionsUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleStorageChange);
      window.removeEventListener('userPermissionsUpdated', handleStorageChange);
    };
  }, [requiredPath]);

  // انتظر حتى يتم تحميل الصلاحيات
  if (hasAccess === null) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>جاري التحميل...</div>;
  }

  // إذا لم يكن لديه صلاحية، أعد توجيهه إلى الصفحة الرئيسية
  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const menuSections: SidebarSection[] = [
  {
    title: 'القائمة الرئيسية',
    items: [
      { label: 'لوحة التحكم', icon: 'fa-solid fa-gauge-high', to: '/dashboard' },
      { label: 'وثائق تأمين السيارات', icon: 'fa-solid fa-file-shield', to: '/insurance-documents' },
      { label: 'تأمين السيارات الدولي', icon: 'fa-solid fa-globe', to: '/international-insurance-documents' },
      { label: ' تأمين المسافرين', icon: 'fa-solid fa-plane', to: '/travel-insurance-documents' },
      { label: ' تأمين الوافدين للمقيمين', icon: 'fa-solid fa-user-check', to: '/resident-insurance-documents' },
      { label: 'تأمين الهياكل البحرية', icon: 'fa-solid fa-ship', to: '/marine-structure-insurance-documents' },
      { label: 'تأمين المسؤولية المهنية (الطبية)', icon: 'fa-solid fa-stethoscope', to: '/professional-liability-insurance-documents' },
      { label: 'تأمين الحوادث الشخصية', icon: 'fa-solid fa-user-injured', to: '/personal-accident-insurance-documents' },
      { label: 'إدارة الفروع والوكلاء', icon: 'fa-solid fa-building', to: '/branches-agents' },
    ],
  },
  {
    title: 'إدارة التقارير',
    items: [
      { label: 'كشف حساب الوكيل', icon: 'fa-solid fa-file-invoice-dollar', to: '/reports/branch-agent-account' },
      { label: 'إغلاق حساب شهري', icon: 'fa-solid fa-calendar-check', to: '/reports/monthly-account-closure' },
      { label: 'كشف إغلاق الحساب الشهري', icon: 'fa-solid fa-file-contract', to: '/reports/monthly-account-closures-report' },
    ],
  },
  {
    title: 'إدارة المستخدمين',
    items: [
      { label: 'إدارة المستخدمين', icon: 'fa-solid fa-user-shield', to: '/users' },
    ],
  },
  {
    title: 'الإعدادات',
    items: [
      {
        label: 'الإعدادات', icon: 'fa-solid fa-gear', children: [
          { label: 'قائمة المدن', icon: 'fa-solid fa-city', to: '/cities' },
          { label: 'قائمة اللوحات', icon: 'fa-solid fa-car', to: '/plates' },
          { label: 'أنواع السيارات', icon: 'fa-solid fa-car-side', to: '/vehicle-types' },
        ]
      },
    ],
  },
]

// دالة لإنشاء القائمة بناءً على الصلاحيات
const createMenuSections = (
  authorizedDocs: string[] | null,
  isAdmin: boolean,
  branchAgentId?: number | null
): SidebarSection[] => {
  // إذا كان المستخدم admin، أظهر كل شيء
  if (isAdmin) {
    return menuSections;
  }

  // خريطة أنواع التأمين إلى الروابط
  const insuranceTypeMap: Record<string, { label: string; icon: string; to: string }> = {
    'تأمين سيارات إجباري': { label: 'وثائق تأمين السيارات', icon: 'fa-solid fa-file-shield', to: '/insurance-documents' },
    'تأمين سيارات': { label: 'وثائق تأمين السيارات', icon: 'fa-solid fa-file-shield', to: '/insurance-documents' },
    'تأمين سيارة جمرك': { label: 'وثائق تأمين السيارات', icon: 'fa-solid fa-file-shield', to: '/insurance-documents' },
    'تأمين سيارات أجنبية': { label: 'وثائق تأمين السيارات', icon: 'fa-solid fa-file-shield', to: '/insurance-documents' },
    'تأمين طرف ثالث سيارات': { label: 'وثائق تأمين السيارات', icon: 'fa-solid fa-file-shield', to: '/insurance-documents' },
    'تأمين سيارات دولي': { label: 'تأمين السيارات الدولي', icon: 'fa-solid fa-globe', to: '/international-insurance-documents' },
    'تأمين المسافرين': { label: 'وثائق تأمين المسافرين', icon: 'fa-solid fa-plane', to: '/travel-insurance-documents' },
    'تأمين الهياكل البحرية': { label: 'تأمين الهياكل البحرية', icon: 'fa-solid fa-ship', to: '/marine-structure-insurance-documents' },
    'تأمين زائرين ليبيا': { label: 'وثائق تأمين المسافرين', icon: 'fa-solid fa-plane', to: '/travel-insurance-documents' },
    'تأمين الوافدين': { label: 'وثائق تأمين الوافدين للمقيمين', icon: 'fa-solid fa-user-check', to: '/resident-insurance-documents' },
    'تأمين المسؤولية المهنية (الطبية)': { label: 'تأمين المسؤولية المهنية (الطبية)', icon: 'fa-solid fa-stethoscope', to: '/professional-liability-insurance-documents' },
    'تأمين الحوادث الشخصية': { label: 'تأمين الحوادث الشخصية', icon: 'fa-solid fa-user-injured', to: '/personal-accident-insurance-documents' },
    'كشف حساب الوكيل': { label: 'كشف حساب الوكيل', icon: 'fa-solid fa-file-invoice-dollar', to: '/reports/branch-agent-account' },
    'إغلاق حساب شهري': { label: 'إغلاق حساب شهري', icon: 'fa-solid fa-calendar-check', to: '/reports/monthly-account-closure' },
    'كشف إغلاق الحساب الشهري': { label: 'كشف إغلاق الحساب الشهري', icon: 'fa-solid fa-file-contract', to: '/reports/monthly-account-closures-report' },
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

  // ترتيب التقارير
  const reportsOrder: string[] = [
    '/reports/branch-agent-account',
    '/reports/monthly-account-closure',
    '/reports/monthly-account-closures-report',
  ];

  // إنشاء قائمة التأمين المصرح بها
  const insuranceItemsMap = new Map<string, SidebarItem>(); // لتجنب إضافة نفس الرابط مرتين
  const reportsItemsMap = new Map<string, SidebarItem>(); // للتقارير

  if (authorizedDocs && authorizedDocs.length > 0) {
    authorizedDocs.forEach((docType) => {
      const itemInfo = insuranceTypeMap[docType];
      if (itemInfo) {
        // تحديد إذا كان تقرير أو تأمين
        if (itemInfo.to.startsWith('/reports/')) {
          if (!reportsItemsMap.has(itemInfo.to)) {
            reportsItemsMap.set(itemInfo.to, {
              label: itemInfo.label,
              icon: itemInfo.icon,
              to: itemInfo.to,
            });
          }
        } else {
          if (!insuranceItemsMap.has(itemInfo.to)) {
            insuranceItemsMap.set(itemInfo.to, {
              label: itemInfo.label,
              icon: itemInfo.icon,
              to: itemInfo.to,
            });
          }
        }
      }
    });
  }

  // ترتيب العناصر حسب ترتيب السايدبار الأصلي
  const insuranceItems: SidebarItem[] = sidebarOrder
    .filter(route => insuranceItemsMap.has(route))
    .map(route => insuranceItemsMap.get(route)!);

  // ترتيب التقارير
  const reportsItems: SidebarItem[] = reportsOrder
    .filter(route => reportsItemsMap.has(route))
    .map(route => reportsItemsMap.get(route)!);

  // إنشاء القائمة المصفاة
  const sections: SidebarSection[] = [
    {
      title: 'القائمة الرئيسية',
      items: [
        { label: 'لوحة التحكم', icon: 'fa-solid fa-gauge-high', to: '/dashboard' },
        ...insuranceItems,
      ],
    },
  ];

  // إضافة "كشف حساب الوكيل" دائماً للوكلاء (غير admin)
  if (!isAdmin) {
    const accountReportItem: SidebarItem = {
      label: 'كشف حساب الوكيل',
      icon: 'fa-solid fa-file-invoice-dollar',
      to: '/reports/branch-agent-account',
    };

    // إضافة إلى reportsItems إذا لم يكن موجوداً بالفعل
    if (!reportsItems.some(item => item.to === '/reports/branch-agent-account')) {
      reportsItems.push(accountReportItem);
    }
  }

  // إضافة قسم التقارير إذا كان هناك تقارير مصرح بها
  if (reportsItems.length > 0) {
    sections.push({
      title: 'إدارة التقارير',
      items: reportsItems,
    });
  }

  // إذا كان فرع/وكيل، أضف إعدادات أنواع السيارات فقط
  if (branchAgentId) {
    sections.push({
      title: 'الإعدادات',
      items: [
        {
          label: 'الإعدادات',
          icon: 'fa-solid fa-gear',
          children: [
            { label: 'أنواع السيارات', icon: 'fa-solid fa-car-side', to: '/vehicle-types' },
          ],
        },
      ],
    });
  }

  return sections;
}

export default function App() {
  const [authorizedDocuments, setAuthorizedDocuments] = useState<string[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [branchAgentId, setBranchAgentId] = useState<number | null>(null);

  useEffect(() => {
    const html = document.documentElement
    html.lang = 'ar'
    html.dir = 'rtl'
  }, [])

  // تحميل الصلاحيات للمستخدم الحالي
  useEffect(() => {
    const loadUserPermissions = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          setAuthorizedDocuments(null);
          setIsAdmin(false);
          return;
        }

        const user = JSON.parse(userStr);
        setIsAdmin(user.is_admin || false);
        setAuthorizedDocuments(user.authorized_documents || null);
        setBranchAgentId(user.branch_agent_id ?? null);
      } catch (error) {
        console.error('Error loading user permissions:', error);
        setAuthorizedDocuments(null);
        setIsAdmin(false);
        setBranchAgentId(null);
      }
    };

    loadUserPermissions();

    // استمع لتغييرات localStorage (عند تسجيل الدخول/الخروج)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        loadUserPermissions();
      }
    };

    // استمع لتغييرات localStorage من نفس النافذة (عند تسجيل الدخول)
    const handleCustomStorageChange = () => {
      loadUserPermissions();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', handleCustomStorageChange);
    window.addEventListener('userPermissionsUpdated', handleCustomStorageChange);
    window.addEventListener('userLoggedOut', () => {
      setAuthorizedDocuments(null);
      setIsAdmin(false);
      setBranchAgentId(null);
      window.location.reload(); // إعادة تحميل الصفحة عند تسجيل الخروج
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleCustomStorageChange);
      window.removeEventListener('userPermissionsUpdated', handleCustomStorageChange);
      window.removeEventListener('userLoggedOut', () => { });
    };
  }, [])


  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [showSidebarToggle, setShowSidebarToggle] = useState(window.innerWidth <= 1024)

  useEffect(() => {
    // في الشاشات الصغيرة نغلق السايدبار افتراضياً
    if (window.innerWidth <= 1024) {
      setIsSidebarOpen(false)
    }
    // تحكم بإظهار زر التوغل
    const handleResize = () => {
      const isMobile = window.innerWidth <= 1024
      setShowSidebarToggle(isMobile)
      // إغلاق السايدبار عند التوسيع إلى شاشة كبيرة
      if (!isMobile) {
        setIsSidebarOpen(true)
      }
    };
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // إغلاق السايدبار عند تغيير المسار في الشاشات الصغيرة
  useEffect(() => {
    const handleLocationChange = () => {
      if (window.innerWidth <= 1024) {
        setIsSidebarOpen(false)
      }
    }
    // استمع لتغيير المسار
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  return (
    <Router>
      <Routes>
        {/* Public Website Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/management" element={<Management />} />
        <Route path="/website/branches-agents" element={<BranchesAgentsPage />} />
        <Route path="/insurances" element={<InsurancesPage />} />
        <Route path="/contact-us" element={<ContactUs />} />

        {/* Admin Login */}
        <Route path="/login" element={<Login />} />

        {/* Protected Admin Routes - all other paths */}
        <Route path="/*" element={
          <ProtectedRoute>
            <div className={`app-shell ${isSidebarOpen ? 'is-sidebar-open' : 'is-sidebar-closed'}`}>
              <Sidebar
                sections={createMenuSections(authorizedDocuments, isAdmin, branchAgentId)}
                LinkTag={Link}
                onLinkClick={() => {
                  // إغلاق السايدبار عند النقر على رابط في الشاشات الصغيرة
                  if (window.innerWidth <= 1024) {
                    setIsSidebarOpen(false)
                  }
                }}
                onClose={() => setIsSidebarOpen(false)}
                showCloseButton={showSidebarToggle}
              />
              {/* طبقة خلفية لإغلاق السايدبار في الشاشات الصغيرة */}
              {isSidebarOpen && showSidebarToggle && (
                <button
                  type="button"
                  className="sidebar-backdrop"
                  aria-label="إغلاق القائمة الجانبية"
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}
              <main className="main-area">
                <Topbar
                  onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
                  isSidebarOpen={isSidebarOpen}
                  showSidebarToggle={showSidebarToggle}
                />
                <Routes>
                  <Route path="/dashboard" element={<DashboardPanels />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/users" element={<UsersList />} />
                  {/* إدارة الفروع والوكلاء */}
                  <Route path="/branches-agents" element={<BranchesAgentsList />} />
                  <Route path="/branches-agents/create" element={<CreateBranchAgent />} />
                  <Route path="/branches-agents/:id" element={<BranchAgentDetails />} />
                  <Route path="/branches-agents/:id/edit" element={<EditBranchAgent />} />
                  {/* إدارة المدن */}
                  <Route path="/cities" element={<CitiesList />} />
                  {/* إدارة اللوحات */}
                  <Route path="/plates" element={<PlatesList />} />
                  {/* إدارة أنواع السيارات */}
                  <Route path="/vehicle-types" element={<VehicleTypesList />} />
                  {/* إدارة وثائق تأمين السيارات */}
                  <Route path="/insurance-documents" element={<AuthorizedRoute requiredPath="/insurance-documents"><InsuranceDocumentsList /></AuthorizedRoute>} />
                  <Route path="/insurance-documents/create" element={<AuthorizedRoute requiredPath="/insurance-documents"><CreateInsuranceDocument /></AuthorizedRoute>} />
                  <Route path="/insurance-documents/:id" element={<AuthorizedRoute requiredPath="/insurance-documents"><ViewInsuranceDocument /></AuthorizedRoute>} />
                  <Route path="/insurance-documents/:id/edit" element={<AuthorizedRoute requiredPath="/insurance-documents"><EditInsuranceDocument /></AuthorizedRoute>} />
                  <Route path="/insurance-documents/:id/transfer-ownership" element={<AuthorizedRoute requiredPath="/insurance-documents"><TransferOwnershipInsuranceDocument /></AuthorizedRoute>} />
                  {/* إدارة تأمين السيارات الدولي */}
                  <Route path="/international-insurance-documents" element={<AuthorizedRoute requiredPath="/international-insurance-documents"><InternationalInsuranceList /></AuthorizedRoute>} />
                  <Route path="/international-insurance-documents/create" element={<AuthorizedRoute requiredPath="/international-insurance-documents"><CreateInternationalInsurance /></AuthorizedRoute>} />
                  <Route path="/international-insurance-documents/:id" element={<AuthorizedRoute requiredPath="/international-insurance-documents"><ViewInternationalInsurance /></AuthorizedRoute>} />
                  <Route path="/international-insurance-documents/:id/edit" element={<AuthorizedRoute requiredPath="/international-insurance-documents"><EditInternationalInsurance /></AuthorizedRoute>} />
                  {/* إدارة وثائق تأمين المسافرين */}
                  <Route path="/travel-insurance-documents" element={<AuthorizedRoute requiredPath="/travel-insurance-documents"><TravelInsuranceList /></AuthorizedRoute>} />
                  <Route path="/travel-insurance-documents/create" element={<AuthorizedRoute requiredPath="/travel-insurance-documents"><CreateTravelInsurance /></AuthorizedRoute>} />
                  <Route path="/travel-insurance-documents/:id" element={<AuthorizedRoute requiredPath="/travel-insurance-documents"><ViewTravelInsurance /></AuthorizedRoute>} />
                  <Route path="/travel-insurance-documents/:id/edit" element={<AuthorizedRoute requiredPath="/travel-insurance-documents"><EditTravelInsurance /></AuthorizedRoute>} />

                  {/* إدارة وثائق تأمين الوافدين للمقيمين */}
                  <Route path="/resident-insurance-documents" element={<AuthorizedRoute requiredPath="/resident-insurance-documents"><ResidentInsuranceList /></AuthorizedRoute>} />
                  <Route path="/resident-insurance-documents/create" element={<AuthorizedRoute requiredPath="/resident-insurance-documents"><CreateResidentInsurance /></AuthorizedRoute>} />
                  <Route path="/resident-insurance-documents/:id" element={<AuthorizedRoute requiredPath="/resident-insurance-documents"><ViewResidentInsurance /></AuthorizedRoute>} />
                  <Route path="/resident-insurance-documents/:id/edit" element={<AuthorizedRoute requiredPath="/resident-insurance-documents"><EditResidentInsurance /></AuthorizedRoute>} />
                  {/* إدارة تأمين الهياكل البحرية */}
                  <Route path="/marine-structure-insurance-documents" element={<AuthorizedRoute requiredPath="/marine-structure-insurance-documents"><MarineStructureInsuranceList /></AuthorizedRoute>} />
                  <Route path="/marine-structure-insurance-documents/create" element={<AuthorizedRoute requiredPath="/marine-structure-insurance-documents"><CreateMarineStructureInsurance /></AuthorizedRoute>} />
                  <Route path="/marine-structure-insurance-documents/:id" element={<AuthorizedRoute requiredPath="/marine-structure-insurance-documents"><ViewMarineStructureInsurance /></AuthorizedRoute>} />
                  <Route path="/marine-structure-insurance-documents/:id/edit" element={<AuthorizedRoute requiredPath="/marine-structure-insurance-documents"><EditMarineStructureInsurance /></AuthorizedRoute>} />
                  {/* إدارة تأمين المسؤولية المهنية (الطبية) */}
                  <Route path="/professional-liability-insurance-documents" element={<AuthorizedRoute requiredPath="/professional-liability-insurance-documents"><ProfessionalLiabilityInsuranceList /></AuthorizedRoute>} />
                  <Route path="/professional-liability-insurance-documents/create" element={<AuthorizedRoute requiredPath="/professional-liability-insurance-documents"><CreateProfessionalLiabilityInsurance /></AuthorizedRoute>} />
                  <Route path="/professional-liability-insurance-documents/:id" element={<AuthorizedRoute requiredPath="/professional-liability-insurance-documents"><ViewProfessionalLiabilityInsurance /></AuthorizedRoute>} />
                  <Route path="/professional-liability-insurance-documents/:id/edit" element={<AuthorizedRoute requiredPath="/professional-liability-insurance-documents"><EditProfessionalLiabilityInsurance /></AuthorizedRoute>} />
                  {/* إدارة تأمين الحوادث الشخصية */}
                  <Route path="/personal-accident-insurance-documents" element={<AuthorizedRoute requiredPath="/personal-accident-insurance-documents"><PersonalAccidentInsuranceList /></AuthorizedRoute>} />
                  <Route path="/personal-accident-insurance-documents/create" element={<AuthorizedRoute requiredPath="/personal-accident-insurance-documents"><CreatePersonalAccidentInsurance /></AuthorizedRoute>} />
                  <Route path="/personal-accident-insurance-documents/:id" element={<AuthorizedRoute requiredPath="/personal-accident-insurance-documents"><ViewPersonalAccidentInsurance /></AuthorizedRoute>} />
                  <Route path="/personal-accident-insurance-documents/:id/edit" element={<AuthorizedRoute requiredPath="/personal-accident-insurance-documents"><EditPersonalAccidentInsurance /></AuthorizedRoute>} />
                  {/* تقارير */}
                  <Route path="/reports/branch-agent-account" element={<BranchAgentAccountReport />} />
                  <Route path="/reports/monthly-account-closure" element={<MonthlyAccountClosure />} />
                  <Route path="/reports/monthly-account-closures-report" element={<MonthlyAccountClosuresReport />} />
                  {/* اختبار API */}
                  <Route path="/test-car-info-api" element={<TestCarInfoAPI />} />
                  <Route path="/test-lifo-login" element={<TestLifoLogin />} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  )
}
