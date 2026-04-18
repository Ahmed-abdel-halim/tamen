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
import FinancialStatistics from './components/FinancialStatistics';
import PaymentVouchers from './components/PaymentVouchers';
import ExpenseManagement from './components/ExpenseManagement';
import ProfilePage from './components/ProfilePage';
import RevenueManagement from './components/RevenueManagement';
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
import UserDetails from './components/UserDetails';

import SchoolStudentInsuranceList from './components/SchoolStudentInsuranceList';
import CreateSchoolStudentInsurance from './components/CreateSchoolStudentInsurance';
import ViewSchoolStudentInsurance from './components/ViewSchoolStudentInsurance';
import EditSchoolStudentInsurance from './components/EditSchoolStudentInsurance';
import CashInTransitInsuranceList from './components/CashInTransitInsuranceList';
import CreateCashInTransitInsurance from './components/CreateCashInTransitInsurance';
import ViewCashInTransitInsurance from './components/ViewCashInTransitInsurance';
import EditCashInTransitInsurance from './components/EditCashInTransitInsurance';
import CargoInsuranceList from './components/CargoInsuranceList';
import CreateCargoInsurance from './components/CreateCargoInsurance';
import ViewCargoInsurance from './components/ViewCargoInsurance';
import EditCargoInsurance from './components/EditCargoInsurance';

import ArchiveDashboard from './components/archive/ArchiveDashboard';
import HomePage from './components/HomePage';
import AboutUs from './components/AboutUs';
import Management from './components/Management';
import BranchesAgentsPage from './components/BranchesAgentsPage';
import InsurancesPage from './components/InsurancesPage';
import ContactUs from './components/ContactUs';
import TestCarInfoAPI from './components/TestCarInfoAPI';
import TestLifoLogin from './components/TestLifoLogin';
import CommissionManagement from './components/CommissionManagement';
import BankReconciliation from './components/BankReconciliation';
import FinancialArchive from './components/FinancialArchive';
import OutstandingDebts from './components/OutstandingDebts';
import InventoryManagement from './components/InventoryManagement';
import EmployeeSalaries from './components/EmployeeSalaries';
import { ToastContainer } from './components/Toast';

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
    'تأمين حماية طلاب المدارس': ['/school-student-insurance'],
    'تأمين نقل النقدية': ['/cash-in-transit-insurance'],
    'تأمين شحن البضائع': ['/cargo-insurance'],
    'كشف حساب الوكيل': ['/reports/branch-agent-account'],
    'إغلاق حساب شهري': ['/reports/monthly-account-closure'],
    'كشف إغلاق الحساب الشهري': ['/reports/monthly-account-closures-report'],
    'المخازن والعهدة': ['/reports/inventory'],
    'مرتبات الموظفين': ['/reports/employee-salaries'],
    'إدارة الإيرادات': ['/reports/revenue'],
    'إدارة المصروفات': ['/reports/expenses', '/reports/union-balances', '/reports/indemnities'],
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

const SHOW_BANK_RECONCILIATION = false;

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
      { label: 'تأمين حماية طلاب المدارس', icon: 'fa-solid fa-graduation-cap', to: '/school-student-insurance' },
      { label: 'تأمين نقل النقدية', icon: 'fa-solid fa-money-bill-transfer', to: '/cash-in-transit-insurance' },
      { label: 'تأمين شحن البضائع', icon: 'fa-solid fa-truck', to: '/cargo-insurance' },
    ],
  },
  {
    title: 'الشؤون الادارية',
    items: [
      { label: 'إدارة الفروع والوكلاء', icon: 'fa-solid fa-building', to: '/branches-agents' },
      { label: 'إدارة الموظفين', icon: 'fa-solid fa-user-shield', to: '/users' },
      { label: 'الأرشيف', icon: 'fa-solid fa-box-archive', to: '/archive' },
    ],
  },
  {
    title: 'الشؤون المالية',
    items: [
      { label: 'الإحصائيات المالية', icon: 'fa-solid fa-chart-line', to: '/reports/financial-statistics' },
      { label: 'إدارة الإيرادات', icon: 'fa-solid fa-money-bill-trend-up', to: '/reports/revenue' },
      { label: 'الديون المستحقة', icon: 'fa-solid fa-hand-holding-dollar', to: '/reports/outstanding-debts' },
      { label: 'التسويات والعمولات', icon: 'fa-solid fa-percent', to: '/reports/commissions' },
      { label: 'إيصالات القبض', icon: 'fa-solid fa-receipt', to: '/reports/payment-vouchers' },
      { label: 'المخازن والعهدة', icon: 'fa-solid fa-boxes-stacked', to: '/reports/inventory' },
      { label: 'مرتبات الموظفين', icon: 'fa-solid fa-money-check-dollar', to: '/reports/employee-salaries' },
      { label: 'كشف حساب الوكيل', icon: 'fa-solid fa-file-invoice-dollar', to: '/reports/branch-agent-account' },
      { label: 'إغلاق حساب شهري', icon: 'fa-solid fa-calendar-check', to: '/reports/monthly-account-closure' },
      { label: 'كشف إغلاق الحساب الشهري', icon: 'fa-solid fa-file-contract', to: '/reports/monthly-account-closures-report' },
      ...(SHOW_BANK_RECONCILIATION
        ? [{ label: 'التحصيلات البنكية', icon: 'fa-solid fa-building-columns', to: '/reports/bank-reconciliation' as const }]
        : []),
      { label: 'الأرشيف المالي', icon: 'fa-solid fa-folder-open', to: '/reports/financial-archive' },
      { 
        label: 'إدارة المصروفات', icon: 'fa-solid fa-vault', children: [
          { label: 'المصروفات التشغيلية', icon: 'fa-solid fa-money-bill-wave', to: '/reports/expenses' },
          { label: 'التعويضات', icon: 'fa-solid fa-scale-unbalanced', to: '/reports/indemnities' },
          { label: 'رصيد الاتحاد (البطاقة البرتقالية)', icon: 'fa-solid fa-id-card', to: '/reports/union-balances' },
        ] 
      },
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
    'تأمين حماية طلاب المدارس': { label: 'تأمين حماية طلاب المدارس', icon: 'fa-solid fa-graduation-cap', to: '/school-student-insurance' },
    'تأمين نقل النقدية': { label: 'تأمين نقل النقدية', icon: 'fa-solid fa-money-bill-transfer', to: '/cash-in-transit-insurance' },
    'تأمين شحن البضائع': { label: 'تأمين شحن البضائع', icon: 'fa-solid fa-truck', to: '/cargo-insurance' },
    'كشف حساب الوكيل': { label: 'كشف حساب الوكيل', icon: 'fa-solid fa-file-invoice-dollar', to: '/reports/branch-agent-account' },
    'إغلاق حساب شهري': { label: 'إغلاق حساب شهري', icon: 'fa-solid fa-calendar-check', to: '/reports/monthly-account-closure' },
    'كشف إغلاق الحساب الشهري': { label: 'كشف إغلاق الحساب الشهري', icon: 'fa-solid fa-file-contract', to: '/reports/monthly-account-closures-report' },
    'إيصالات القبض': { label: 'إيصالات القبض', icon: 'fa-solid fa-receipt', to: '/reports/payment-vouchers' },
    'التسويات والعمولات': { label: 'التسويات والعمولات', icon: 'fa-solid fa-percent', to: '/reports/commissions' },
    'التحصيلات البنكية': { label: 'التحصيلات البنكية', icon: 'fa-solid fa-building-columns', to: '/reports/bank-reconciliation' },
    'الديون المستحقة': { label: 'الديون المستحقة', icon: 'fa-solid fa-hand-holding-dollar', to: '/reports/outstanding-debts' },
    'الأرشيف المالي': { label: 'الأرشيف المالي', icon: 'fa-solid fa-folder-open', to: '/reports/financial-archive' },
    'المخازن والعهدة': { label: 'المخازن والعهدة', icon: 'fa-solid fa-boxes-stacked', to: '/reports/inventory' },
    'الإحصائيات المالية': { label: 'الإحصائيات المالية', icon: 'fa-solid fa-chart-line', to: '/reports/financial-statistics' },
    'إدارة الإيرادات': { label: 'إدارة الإيرادات', icon: 'fa-solid fa-money-bill-trend-up', to: '/reports/revenue' },
    'مرتبات الموظفين': { label: 'مرتبات الموظفين', icon: 'fa-solid fa-money-check-dollar', to: '/reports/employee-salaries' },
    'إدارة الفروع والوكلاء': { label: 'إدارة الفروع والوكلاء', icon: 'fa-solid fa-building', to: '/branches-agents' },
    'إدارة الموظفين': { label: 'إدارة الموظفين', icon: 'fa-solid fa-user-shield', to: '/users' },
    'الأرشيف': { label: 'الأرشيف', icon: 'fa-solid fa-box-archive', to: '/archive' },
    'قائمة المدن': { label: 'قائمة المدن', icon: 'fa-solid fa-city', to: '/cities' },
    'قائمة اللوحات': { label: 'قائمة اللوحات', icon: 'fa-solid fa-car', to: '/plates' },
    'أنواع السيارات': { label: 'أنواع السيارات', icon: 'fa-solid fa-car-side', to: '/vehicle-types' },
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
    '/school-student-insurance',
    '/cash-in-transit-insurance',
    '/cargo-insurance',
    '/coming-soon',
  ];

  // ترتيب التقارير
  const reportsOrder: string[] = [
    '/reports/financial-statistics',
    '/reports/revenue',
    '/reports/outstanding-debts',
    '/reports/commissions',
    '/reports/payment-vouchers',
    '/reports/inventory',
    '/reports/employee-salaries',
    '/reports/branch-agent-account',
    '/reports/monthly-account-closure',
    '/reports/monthly-account-closures-report',
    ...(SHOW_BANK_RECONCILIATION ? ['/reports/bank-reconciliation'] : []),
    '/reports/financial-archive',
    '/reports/expenses',
    '/reports/indemnities',
    '/reports/union-balances',
  ];
  const adminOrder: string[] = ['/branches-agents', '/users', '/archive'];
  const settingsOrder: string[] = ['/cities', '/plates', '/vehicle-types'];

  // إنشاء قائمة التأمين المصرح بها
  const insuranceItemsMap = new Map<string, SidebarItem>(); // لتجنب إضافة نفس الرابط مرتين
  const reportsItemsMap = new Map<string, SidebarItem>(); // للتقارير
  const adminItemsMap = new Map<string, SidebarItem>(); // للإدارة
  const settingsItemsMap = new Map<string, SidebarItem>(); // للإعدادات

  if (authorizedDocs && authorizedDocs.length > 0) {
    authorizedDocs.forEach((docType) => {
      // التعامل الخاص مع إدارة المصروفات لجعلها قائمة فرعية
      if (docType === 'إدارة المصروفات') {
        reportsItemsMap.set('/reports/expenses', { label: 'المصروفات التشغيلية', icon: 'fa-solid fa-money-bill-wave', to: '/reports/expenses' });
        reportsItemsMap.set('/reports/indemnities', { label: 'التعويضات', icon: 'fa-solid fa-scale-unbalanced', to: '/reports/indemnities' });
        reportsItemsMap.set('/reports/union-balances', { label: 'رصيد الاتحاد (البطاقة البرتقالية)', icon: 'fa-solid fa-id-card', to: '/reports/union-balances' });
        return;
      }

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
        } else if (adminOrder.includes(itemInfo.to)) {
          if (!adminItemsMap.has(itemInfo.to)) {
            adminItemsMap.set(itemInfo.to, {
              label: itemInfo.label,
              icon: itemInfo.icon,
              to: itemInfo.to,
            });
          }
        } else if (settingsOrder.includes(itemInfo.to)) {
          if (!settingsItemsMap.has(itemInfo.to)) {
            settingsItemsMap.set(itemInfo.to, {
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
  const adminItems: SidebarItem[] = adminOrder
    .filter(route => adminItemsMap.has(route))
    .map(route => adminItemsMap.get(route)!);
  const settingsItems: SidebarItem[] = settingsOrder
    .filter(route => settingsItemsMap.has(route))
    .map(route => settingsItemsMap.get(route)!);

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
  if (adminItems.length > 0) {
    sections.push({
      title: 'الشؤون الادارية',
      items: adminItems,
    });
  }

  if (reportsItems.length > 0) {
    const expensesGroup = reportsItems.filter(i => i.to === '/reports/expenses' || i.to === '/reports/union-balances' || i.to === '/reports/indemnities');
    const otherReports = reportsItems.filter(i => i.to !== '/reports/expenses' && i.to !== '/reports/union-balances' && i.to !== '/reports/indemnities');
    
    const finalReports = [...otherReports];
    if (expensesGroup.length > 0) {
      finalReports.push({
        label: 'إدارة المصروفات',
        icon: 'fa-solid fa-vault',
        children: expensesGroup
      });
    }

    sections.push({
      title: 'الشؤون المالية',
      items: finalReports,
    });
  }

  if (settingsItems.length > 0) {
    sections.push({
      title: 'الإعدادات',
      items: [
        {
          label: 'الإعدادات',
          icon: 'fa-solid fa-gear',
          children: settingsItems,
        },
      ],
    });
  }

  // إذا كان فرع/وكيل، أضف إعدادات أنواع السيارات فقط
  if (branchAgentId && !settingsItems.some(item => item.to === '/vehicle-types')) {
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
      <ToastContainer />
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
                  <Route path="/users/:id" element={<UserDetails />} />
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
                  
                  {/* تأمين نقل النقدية */}
                  <Route path="/cash-in-transit-insurance" element={<AuthorizedRoute requiredPath="/cash-in-transit-insurance"><CashInTransitInsuranceList /></AuthorizedRoute>} />
                  <Route path="/cash-in-transit-insurance/create" element={<AuthorizedRoute requiredPath="/cash-in-transit-insurance"><CreateCashInTransitInsurance /></AuthorizedRoute>} />
                  <Route path="/cash-in-transit-insurance/:id" element={<AuthorizedRoute requiredPath="/cash-in-transit-insurance"><ViewCashInTransitInsurance /></AuthorizedRoute>} />
                  <Route path="/cash-in-transit-insurance/edit/:id" element={<AuthorizedRoute requiredPath="/cash-in-transit-insurance"><EditCashInTransitInsurance /></AuthorizedRoute>} />

                  {/* تأمين شحن البضائع */}
                  <Route path="/cargo-insurance" element={<AuthorizedRoute requiredPath="/cargo-insurance"><CargoInsuranceList /></AuthorizedRoute>} />
                  <Route path="/cargo-insurance/create" element={<AuthorizedRoute requiredPath="/cargo-insurance"><CreateCargoInsurance /></AuthorizedRoute>} />
                  <Route path="/cargo-insurance/:id" element={<AuthorizedRoute requiredPath="/cargo-insurance"><ViewCargoInsurance /></AuthorizedRoute>} />
                  <Route path="/cargo-insurance/edit/:id" element={<AuthorizedRoute requiredPath="/cargo-insurance"><EditCargoInsurance /></AuthorizedRoute>} />

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
                  
                  {/* تأمين حماية طلاب المدارس */}
                  <Route path="/school-student-insurance" element={<AuthorizedRoute requiredPath="/school-student-insurance"><SchoolStudentInsuranceList /></AuthorizedRoute>} />
                  <Route path="/school-student-insurance/create" element={<AuthorizedRoute requiredPath="/school-student-insurance"><CreateSchoolStudentInsurance /></AuthorizedRoute>} />
                  <Route path="/school-student-insurance/:id" element={<AuthorizedRoute requiredPath="/school-student-insurance"><ViewSchoolStudentInsurance /></AuthorizedRoute>} />
                  <Route path="/school-student-insurance/edit/:id" element={<AuthorizedRoute requiredPath="/school-student-insurance"><EditSchoolStudentInsurance /></AuthorizedRoute>} />

                  {/* تأمين نقل النقدية */}
                  <Route path="/cash-in-transit-insurance" element={<AuthorizedRoute requiredPath="/cash-in-transit-insurance"><CashInTransitInsuranceList /></AuthorizedRoute>} />
                  <Route path="/cash-in-transit-insurance/create" element={<AuthorizedRoute requiredPath="/cash-in-transit-insurance"><CreateCashInTransitInsurance /></AuthorizedRoute>} />

                  {/* تأمين شحن البضائع */}
                  <Route path="/cargo-insurance" element={<AuthorizedRoute requiredPath="/cargo-insurance"><CargoInsuranceList /></AuthorizedRoute>} />
                  <Route path="/cargo-insurance/create" element={<AuthorizedRoute requiredPath="/cargo-insurance"><CreateCargoInsurance /></AuthorizedRoute>} />

                  {/* تقارير */}
                  <Route path="/reports/financial-statistics" element={<FinancialStatistics />} />
                  <Route path="/reports/revenue" element={<RevenueManagement />} />
                  <Route path="/reports/branch-agent-account" element={<BranchAgentAccountReport />} />
                  <Route path="/reports/monthly-account-closure" element={<MonthlyAccountClosure />} />
                  <Route path="/reports/monthly-account-closures-report" element={<MonthlyAccountClosuresReport />} />
                  <Route path="/reports/payment-vouchers" element={<PaymentVouchers />} />
                  <Route path="/reports/commissions" element={<CommissionManagement />} />
                  <Route path="/reports/bank-reconciliation" element={<BankReconciliation />} />
                  <Route path="/reports/outstanding-debts" element={<OutstandingDebts />} />
                  <Route path="/reports/financial-archive" element={<FinancialArchive />} />
                  <Route path="/reports/inventory" element={<InventoryManagement />} />
                  <Route path="/reports/employee-salaries" element={<AuthorizedRoute requiredPath="/reports/employee-salaries"><EmployeeSalaries /></AuthorizedRoute>} />
                  <Route path="/reports/expenses" element={<AuthorizedRoute requiredPath="/reports/expenses"><ExpenseManagement activeTabOverride="expenses" /></AuthorizedRoute>} />
                  <Route path="/reports/indemnities" element={<AuthorizedRoute requiredPath="/reports/indemnities"><ExpenseManagement activeTabOverride="indemnities" /></AuthorizedRoute>} />
                  <Route path="/reports/union-balances" element={<AuthorizedRoute requiredPath="/reports/union-balances"><ExpenseManagement activeTabOverride="union" /></AuthorizedRoute>} />
                  {/* اختبار API */}
                  <Route path="/test-car-info-api" element={<TestCarInfoAPI />} />
                  <Route path="/test-lifo-login" element={<TestLifoLogin />} />
                  {/* الأرشيف */}
                  <Route path="/archive" element={<ArchiveDashboard />} />
                  <Route path="/coming-soon" element={<div style={{ padding: '40px', textAlign: 'center' }}><h3>قريباً...</h3><p>هذا القسم قيد التطوير وسيتم تفعيله في التحديث القادم.</p></div>} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  )
}
