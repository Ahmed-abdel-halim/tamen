import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar'
import { API_BASE_URL } from './config/api';
import './premium-hr.css';

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
import DocumentRequestsList from './components/DocumentRequestsList';
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
import ColorsList from './components/ColorsList';
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
import ViewExpenseDetails from './components/ViewExpenseDetails';
// // import UserDetails from './components/UserDetails';
import EmployeeProfile from './components/EmployeeProfile';

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
import AllEmployeeRequests from './components/AllEmployeeRequests';
import AllAgentRequests from './components/AllAgentRequests';
import EmployeeSalaries from './components/EmployeeSalaries';
import { ToastContainer } from './components/Toast';
import { TaxSSReport } from './components/TaxSSReport';
import ExternalEntitiesManagement from './components/ExternalEntitiesManagement';
import MailManagement from './components/MailManagement';
import ViewMailDocument from './components/ViewMailDocument';
import ClaimsList from './components/Claims/ClaimsList';
import ViewClaim from './components/Claims/ViewClaim';
import AgencyCancellations from './components/AgencyCancellations';
import CompanyDocuments from './components/CompanyDocuments';
import RentalVouchersList from './components/RentalVouchersList';
import RentalVoucherDetails from './components/RentalVoucherDetails';
import CreateRentalVoucher from './components/CreateRentalVoucher';
import EditRentalVoucher from './components/EditRentalVoucher';
import ExcelImportPage from './components/ExcelImportPage';



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
    'إدارة الفروع والوكلاء': ['/branches-agents', '/agent-requests', '/agency-cancellations'],

    'إدارة الموظفين': ['/users', '/employee-requests'],
    'الشؤون الفنية': ['/claims', '/reports/indemnities'],
    'المطالبات': ['/claims'],
    'البريد الصادر والوارد': ['/mail/incoming', '/mail/outgoing'],
    'البريد الوارد والصادر': ['/mail/incoming', '/mail/outgoing'],
    'المراسلات الإدارية': ['/mail/incoming', '/mail/outgoing'],
    'دليل الجهات الخارجية': ['/external-entities'],
    'أرشيف المستندات الإدارية': ['/archive'],
    'طلبات الوثائق': ['/document-requests'],
    'ملفات الشركة': ['/company-documents'],

    'المحاسب المالي': [
      '/reports/financial-statistics',
      '/reports/revenue',
      '/reports/outstanding-debts',
      '/reports/commissions',
      '/reports/payment-vouchers',
      '/reports/inventory',
      '/reports/branch-agent-account',
      '/reports/monthly-account-closure',
      '/reports/monthly-account-closures-report',
      '/reports/bank-reconciliation',
      '/reports/expenses',
      '/reports/indemnities',
      '/reports/union-balances',
      '/reports/rental-vouchers',
      '/reports/employee-salaries',
      '/reports/financial-archive'
    ],
    'اجور ومرتبات ضرائب': ['/reports/tax'],
    'اجور ومرتبات ضمان': ['/reports/social-security'],
    'قائمة المدن': ['/cities'],
    'قائمة اللوحات': ['/plates'],
    'قائمة الألوان': ['/colors'],
    'أنواع السيارات': ['/vehicle-types'],
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
      // { label: 'استيراد Excel', icon: 'fa-solid fa-file-excel', to: '/excel-import' },
      {
        label: 'إدارة الوثائق', icon: 'fa-solid fa-folder-open', children: [
          { label: 'طلبات الوثائق', icon: 'fa-solid fa-file-circle-exclamation', to: '/document-requests' },
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
        ]
      },
      { label: 'ملفات الشركة', icon: 'fa-solid fa-folder-open', to: '/company-documents' },
    ],
  },

  {
    title: 'الشؤون الادارية',
    items: [
      {
        label: 'إدارة الفروع والوكلاء', icon: 'fa-solid fa-building', children: [
          { label: 'قائمة الفروع والوكلاء', icon: 'fa-solid fa-list-check', to: '/branches-agents' },
          { label: 'الوكلاء الجدد', icon: 'fa-solid fa-user-plus', to: '/branches-agents?status=pending' },
          { label: 'طلبات الوكلاء', icon: 'fa-solid fa-paper-plane', to: '/agent-requests' },
          { label: 'إلغاء الوكالات', icon: 'fa-solid fa-user-slash', to: '/agency-cancellations' },
        ]
      },
      {
        label: 'إدارة الموظفين', icon: 'fa-solid fa-user-shield', children: [
          { label: 'قائمة الموظفين', icon: 'fa-solid fa-users-gear', to: '/users' },
          { label: 'طلبات الموظفين', icon: 'fa-solid fa-file-invoice', to: '/employee-requests' },
        ]
      },
      { label: 'دليل الجهات الخارجية', icon: 'fa-solid fa-address-book', to: '/external-entities' },
      {
        label: 'البريد الصادر والوارد', icon: 'fa-solid fa-envelope-open-text', children: [
          { label: 'البريد الوارد', icon: 'fa-solid fa-file-import', to: '/mail/incoming' },
          { label: 'البريد الصادر', icon: 'fa-solid fa-file-export', to: '/mail/outgoing' },
        ]
      },
      { label: 'أرشيف المستندات الإدارية', icon: 'fa-solid fa-box-archive', to: '/archive' },
    ],


  },
  {
    title: 'الشؤون الفنية',
    items: [
      { label: 'المطالبات', icon: 'fa-solid fa-scale-balanced', to: '/claims' },
      { label: 'التعويضات', icon: 'fa-solid fa-scale-unbalanced', to: '/reports/indemnities' },
    ],
  },
  {
    title: 'الشؤون المالية',
    items: [
      { label: 'الإحصائيات المالية', icon: 'fa-solid fa-chart-line', to: '/reports/financial-statistics' },
      { label: 'الديون المستحقة', icon: 'fa-solid fa-hand-holding-dollar', to: '/reports/outstanding-debts' },
      { label: 'مرتبات الموظفين', icon: 'fa-solid fa-money-check-dollar', to: '/reports/employee-salaries' },
      { label: 'الأرشيف المالي', icon: 'fa-solid fa-folder-open', to: '/reports/financial-archive' },
      { label: 'اجور ومرتبات ضرائب', icon: 'fa-solid fa-percent', to: '/reports/tax' },
      { label: 'اجور ومرتبات ضمان', icon: 'fa-solid fa-handshake-angle', to: '/reports/social-security' },
      {
        label: 'المحاسب المالي', icon: 'fa-solid fa-file-contract', children: [
          { label: 'إحصائيات الإيرادات', icon: 'fa-solid fa-chart-pie', to: '/reports/revenue' },
          { label: 'إدارة الإيرادات', icon: 'fa-solid fa-receipt', to: '/reports/payment-vouchers' },
          { label: 'المخازن والعهدة', icon: 'fa-solid fa-boxes-stacked', to: '/reports/inventory' },
          {
            label: 'إدارة المصروفات', icon: 'fa-solid fa-vault', children: [
              { label: 'المصروفات التشغيلية', icon: 'fa-solid fa-money-bill-wave', to: '/reports/expenses' },
              { label: 'رصيد الاتحاد (البطاقة البرتقالية)', icon: 'fa-solid fa-id-card', to: '/reports/union-balances' },
              { label: 'الإيجارات العقارية', icon: 'fa-solid fa-building', to: '/reports/rental-vouchers' },
            ]
          },
          { label: 'التسويات والعمولات', icon: 'fa-solid fa-percent', to: '/reports/commissions' },
          { label: 'كشف حساب الوكيل', icon: 'fa-solid fa-file-invoice-dollar', to: '/reports/branch-agent-account' },
          { label: 'اغلاق حساب الوكيل', icon: 'fa-solid fa-calendar-check', to: '/reports/monthly-account-closure' },
          { label: 'كشف حساب الوكلاء', icon: 'fa-solid fa-file-contract', to: '/reports/monthly-account-closures-report' },
          ...(SHOW_BANK_RECONCILIATION
            ? [{ label: 'التحصيلات البنكية', icon: 'fa-solid fa-building-columns', to: '/reports/bank-reconciliation' as const }]
            : []),
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
          { label: 'قائمة الألوان', icon: 'fa-solid fa-palette', to: '/colors' },
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
  branchAgentId?: number | null,
  userId?: number | null
): SidebarSection[] => {
  // إذا كان المستخدم admin، أظهر كل شيء
  if (isAdmin) {
    return menuSections;
  }

  // خريطة الصلاحيات إلى العناصر الجانبية
  // يمكن أن تشير الصلاحية الواحدة إلى عنصر واحد أو مصفوفة عناصر
  const insuranceTypeMap: Record<string, SidebarItem | SidebarItem[]> = {
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
    'طلبات الوثائق': { label: 'طلبات الوثائق', icon: 'fa-solid fa-file-circle-exclamation', to: '/document-requests' },
    'إدارة الفروع والوكلاء': [
      { label: 'قائمة الفروع والوكلاء', icon: 'fa-solid fa-list-check', to: '/branches-agents' },
      { label: 'الوكلاء الجدد', icon: 'fa-solid fa-user-plus', to: '/branches-agents?status=pending' },
      { label: 'طلبات الوكلاء', icon: 'fa-solid fa-paper-plane', to: '/agent-requests' },
      { label: 'إلغاء الوكالات', icon: 'fa-solid fa-user-slash', to: '/agency-cancellations' },
    ],
    'إدارة الموظفين': [
      { label: 'قائمة الموظفين', icon: 'fa-solid fa-users-gear', to: '/users' },
      { label: 'طلبات الموظفين', icon: 'fa-solid fa-file-invoice', to: '/employee-requests' },
    ],
    'دليل الجهات الخارجية': { label: 'دليل الجهات الخارجية', icon: 'fa-solid fa-address-book', to: '/external-entities' },
    'البريد الصادر والوارد': [
      { label: 'البريد الوارد', icon: 'fa-solid fa-file-import', to: '/mail/incoming' },
      { label: 'البريد الصادر', icon: 'fa-solid fa-file-export', to: '/mail/outgoing' },
    ],
    'البريد الوارد والصادر': [
      { label: 'البريد الوارد', icon: 'fa-solid fa-file-import', to: '/mail/incoming' },
      { label: 'البريد الصادر', icon: 'fa-solid fa-file-export', to: '/mail/outgoing' },
    ],
    'أرشيف المستندات الإدارية': { label: 'أرشيف المستندات الإدارية', icon: 'fa-solid fa-box-archive', to: '/archive' },
    'ملفات الشركة': { label: 'ملفات الشركة', icon: 'fa-solid fa-folder-open', to: '/company-documents' },
    'المحاسب المالي': [

      { label: 'الإحصائيات المالية', icon: 'fa-solid fa-chart-line', to: '/reports/financial-statistics' },
      { label: 'الديون المستحقة', icon: 'fa-solid fa-hand-holding-dollar', to: '/reports/outstanding-debts' },
      { label: 'مرتبات الموظفين', icon: 'fa-solid fa-money-check-dollar', to: '/reports/employee-salaries' },
      { label: 'الأرشيف المالي', icon: 'fa-solid fa-folder-open', to: '/reports/financial-archive' },
      { label: 'إحصائيات الإيرادات', icon: 'fa-solid fa-chart-pie', to: '/reports/revenue' },
      { label: 'إدارة الإيرادات', icon: 'fa-solid fa-receipt', to: '/reports/payment-vouchers' },
      { label: 'المخازن والعهدة', icon: 'fa-solid fa-boxes-stacked', to: '/reports/inventory' },
      { label: 'المصروفات التشغيلية', icon: 'fa-solid fa-money-bill-wave', to: '/reports/expenses' },
      { label: 'رصيد الاتحاد (البطاقة البرتقالية)', icon: 'fa-solid fa-id-card', to: '/reports/union-balances' },
      { label: 'الإيجارات العقارية', icon: 'fa-solid fa-building', to: '/reports/rental-vouchers' },
      { label: 'التسويات والعمولات', icon: 'fa-solid fa-percent', to: '/reports/commissions' },
      { label: 'كشف حساب الوكيل', icon: 'fa-solid fa-file-invoice-dollar', to: '/reports/branch-agent-account' },
      { label: 'اغلاق حساب الوكيل', icon: 'fa-solid fa-calendar-check', to: '/reports/monthly-account-closure' },
      { label: 'كشف حساب الوكلاء', icon: 'fa-solid fa-file-contract', to: '/reports/monthly-account-closures-report' },
      { label: 'التحصيلات البنكية', icon: 'fa-solid fa-building-columns', to: '/reports/bank-reconciliation' as const },
    ],
    'الشؤون الفنية': [
      { label: 'المطالبات', icon: 'fa-solid fa-scale-balanced', to: '/claims' },
      { label: 'التعويضات', icon: 'fa-solid fa-scale-unbalanced', to: '/reports/indemnities' },
    ],
    'اجور ومرتبات ضرائب': { label: 'اجور ومرتبات ضرائب', icon: 'fa-solid fa-percent', to: '/reports/tax' },
    'اجور ومرتبات ضمان': { label: 'اجور ومرتبات ضمان', icon: 'fa-solid fa-handshake-angle', to: '/reports/social-security' },
    'قائمة المدن': { label: 'قائمة المدن', icon: 'fa-solid fa-city', to: '/cities' },
    'قائمة اللوحات': { label: 'قائمة اللوحات', icon: 'fa-solid fa-car', to: '/plates' },
    'قائمة الألوان': { label: 'قائمة الألوان', icon: 'fa-solid fa-palette', to: '/colors' },
    'أنواع السيارات': { label: 'أنواع السيارات', icon: 'fa-solid fa-car-side', to: '/vehicle-types' },
  };

  // ترتيب ثابت للعناصر حسب السايدبار الأصلي
  const sidebarOrder: string[] = [
    '/document-requests',
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
    '/reports/tax',
    '/reports/social-security',
    ...(SHOW_BANK_RECONCILIATION ? ['/reports/bank-reconciliation'] : []),
    '/reports/financial-archive',
    '/reports/expenses',
    '/reports/indemnities',
    '/reports/union-balances',
    '/reports/rental-vouchers',
  ];
  const adminOrder: string[] = [
    '/branches-agents', 
    '/branches-agents?status=pending',
    '/users', 
    '/employee-requests', 
    '/agent-requests', 
    '/agency-cancellations', 
    '/external-entities',
    '/mail/incoming',
    '/mail/outgoing',
    '/archive'
  ];
  const technicalOrder: string[] = ['/claims', '/reports/indemnities'];
  const settingsOrder: string[] = ['/cities', '/plates', '/colors', '/vehicle-types'];

  // إنشاء قائمة التأمين المصرح بها
  const insuranceItemsMap = new Map<string, SidebarItem>(); // لتجنب إضافة نفس الرابط مرتين
  const reportsItemsMap = new Map<string, SidebarItem>(); // للتقارير
  const adminItemsMap = new Map<string, SidebarItem>(); // للإدارة
  const settingsItemsMap = new Map<string, SidebarItem>(); // للإعدادات

  if (authorizedDocs && authorizedDocs.length > 0) {
    authorizedDocs.forEach(docType => {
      const items = insuranceTypeMap[docType];
      if (items) {
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (item.to) {
              if (item.to.startsWith('/reports/')) {
                if (!reportsItemsMap.has(item.to)) {
                  reportsItemsMap.set(item.to, item);
                }
              } else if (adminOrder.includes(item.to) || technicalOrder.includes(item.to)) {
                if (!adminItemsMap.has(item.to)) {
                  adminItemsMap.set(item.to, item);
                }
              } else if (settingsOrder.includes(item.to)) {
                if (!settingsItemsMap.has(item.to)) {
                  settingsItemsMap.set(item.to, item);
                }
              } else {
                if (!insuranceItemsMap.has(item.to)) {
                  insuranceItemsMap.set(item.to, item);
                }
              }
            }
          });
        } else {
          const itemInfo = items as SidebarItem;
          if (itemInfo.to) {
            if (itemInfo.to.startsWith('/reports/')) {
              if (!reportsItemsMap.has(itemInfo.to)) {
                reportsItemsMap.set(itemInfo.to, itemInfo);
              }
            } else if (adminOrder.includes(itemInfo.to) || technicalOrder.includes(itemInfo.to)) {
              if (!adminItemsMap.has(itemInfo.to)) {
                adminItemsMap.set(itemInfo.to, itemInfo);
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
        }
      }
    });
  }



  // إنشاء قائمة التأمين المصرح بها
  const insuranceItems: SidebarItem[] = sidebarOrder
    .filter(route => insuranceItemsMap.has(route))
    .map(route => insuranceItemsMap.get(route)!);

  // العناصر الإضافية التي تظهر في القائمة الرئيسية مباشرة
  const extraMainItems: SidebarItem[] = [];
  if (insuranceItemsMap.has('/company-documents')) {
    extraMainItems.push(insuranceItemsMap.get('/company-documents')!);
  }
  insuranceItemsMap.delete('/company-documents');


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
  const mainMenuItems: SidebarItem[] = [
    { label: 'لوحة التحكم', icon: 'fa-solid fa-gauge-high', to: '/dashboard' },
    ...extraMainItems
  ];


  if (insuranceItems.length > 0) {
    mainMenuItems.push({
      label: 'إدارة الوثائق',
      icon: 'fa-solid fa-folder-open',
      children: insuranceItems,
    });
  }

  const sections: SidebarSection[] = [
    {
      title: 'القائمة الرئيسية',
      items: mainMenuItems,
    },
  ];

  // إضافة قسم الشؤون الإدارية إذا كان هناك عناصر مصرح بها
  if (adminItems.length > 0) {
    const hrGroup = adminItems.filter(i => i.to === '/users' || i.to === '/employee-requests');
    const agentsGroup = adminItems.filter(i => i.to === '/branches-agents' || i.to === '/agent-requests');
    const mailGroup = adminItems.filter(i => i.to === '/mail/incoming' || i.to === '/mail/outgoing');
    
    const otherAdmin = adminItems.filter(i =>
      !hrGroup.some(g => g.to === i.to) &&
      !agentsGroup.some(g => g.to === i.to) &&
      !mailGroup.some(g => g.to === i.to) &&
      i.to !== '/document-requests' &&
      i.to !== '/external-entities' &&
      i.to !== '/archive'
    );

    const finalAdmin = [...otherAdmin];

    if (agentsGroup.length > 0) {
      if (agentsGroup.length === 1 && agentsGroup[0].to === '/branches-agents') {
        finalAdmin.push(agentsGroup[0]);
      } else {
        finalAdmin.push({
          label: 'إدارة الفروع والوكلاء',
          icon: 'fa-solid fa-building',
          children: agentsGroup
        });
      }
    }

    if (hrGroup.length > 0) {
      if (hrGroup.length === 1 && hrGroup[0].to === '/users') {
        finalAdmin.push(hrGroup[0]);
      } else {
        finalAdmin.push({
          label: 'إدارة الموظفين',
          icon: 'fa-solid fa-user-shield',
          children: hrGroup
        });
      }
    }

    if (mailGroup.length > 0) {
      finalAdmin.push({
        label: 'البريد الصادر والوارد',
        icon: 'fa-solid fa-envelope-open-text',
        children: mailGroup
      });
    }

    // إضافة دليل الجهات الخارجية والأرشيف إذا كانا موجودين
    const extItem = adminItems.find(i => i.to === '/external-entities');
    if (extItem) finalAdmin.push(extItem);
    
    const archiveItem = adminItems.find(i => i.to === '/archive');
    if (archiveItem) finalAdmin.push(archiveItem);

    sections.push({
      title: 'الشؤون الادارية',
      items: finalAdmin,
    });
  }

  // إضافة قسم الشؤون الفنية إذا كان هناك عناصر مصرح بها
  const technicalItems: SidebarItem[] = technicalOrder
    .filter(route => adminItemsMap.has(route))
    .map(route => adminItemsMap.get(route)!);

  if (technicalItems.length > 0) {
    sections.push({
      title: 'الشؤون الفنية',
      items: technicalItems,
    });
  }

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

  if (reportsItems.length > 0) {
    const expensesGroup = reportsItems.filter(i => i.to === '/reports/expenses' || i.to === '/reports/union-balances' || i.to === '/reports/rental-vouchers');
    const accountantGroup = reportsItems.filter(i =>
      i.to === '/reports/commissions' ||
      i.to === '/reports/branch-agent-account' ||
      i.to === '/reports/monthly-account-closure' ||
      i.to === '/reports/monthly-account-closures-report' ||
      i.to === '/reports/bank-reconciliation' ||
      i.to === '/reports/inventory' ||
      i.to === '/reports/revenue' ||
      i.to === '/reports/payment-vouchers' ||
      i.to === '/reports/financial-statistics' ||
      i.to === '/reports/outstanding-debts' ||
      i.to === '/reports/employee-salaries' ||
      i.to === '/reports/financial-archive'
    );

    // العناصر التي لا تنتمي لأي مجموعة (ستظهر كعناصر أساسية في الشؤون المالية)
    const otherReports = reportsItems.filter(i =>
      !expensesGroup.some(eg => eg.to === i.to) &&
      !accountantGroup.some(ag => ag.to === i.to)
    );

    const finalReports = [...otherReports];

    if (accountantGroup.length > 0 || expensesGroup.length > 0) {
      const accountantChildren = [...accountantGroup];

      if (expensesGroup.length > 0) {
        accountantChildren.push({
          label: 'إدارة المصروفات',
          icon: 'fa-solid fa-vault',
          children: expensesGroup
        });
      }

      finalReports.push({
        label: 'المحاسب المالي',
        icon: 'fa-solid fa-file-contract',
        children: accountantChildren
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

  // إضافة قسم "حسابي الشخصي"
  if (userId) {
    if (branchAgentId) {
      // للوكلاء والفرع
      sections.push({
        title: 'حسابي الشخصي',
        items: [
          { label: 'بيانات الوكالة', icon: 'fa-solid fa-building-user', to: `/branches-agents/${branchAgentId}?tab=agency` },
          { label: 'طلبات الوكلاء', icon: 'fa-solid fa-paper-plane', to: `/branches-agents/${branchAgentId}?tab=requests` },
          { label: 'طلبات الوثائق', icon: 'fa-solid fa-file-contract', to: `/branches-agents/${branchAgentId}?tab=doc_requests` },
          { label: 'إلغاء الوكالة', icon: 'fa-solid fa-user-slash', to: '/agency-cancellations' },
          { label: 'إعدادات الحساب', icon: 'fa-solid fa-user-gear', to: '/profile' },
        ],
      });
    } else {
      // للموظفين والأدمن فقط
      sections.push({
        title: 'حسابي الشخصي',
        items: [
          { label: 'ملفي الوظيفي', icon: 'fa-solid fa-address-card', to: `/users/${userId}?tab=personal` },
          { label: 'بياناتي الوظيفية', icon: 'fa-solid fa-briefcase', to: `/users/${userId}?tab=job` },
          { label: 'طلباتي الشخصية', icon: 'fa-solid fa-paper-plane', to: `/users/${userId}?tab=requests` },
          { label: 'إعدادات الحساب', icon: 'fa-solid fa-user-gear', to: '/profile' },
        ],
      });
    }
  }

  return sections;
}

export default function App() {
  const [authorizedDocuments, setAuthorizedDocuments] = useState<string[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [branchAgentId, setBranchAgentId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

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
        setCurrentUserId(user.id);
      } catch (error) {
        console.error('Error loading user permissions:', error);
        setAuthorizedDocuments(null);
        setIsAdmin(false);
        setBranchAgentId(null);
        setCurrentUserId(null);
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
      setCurrentUserId(null);
      window.location.reload(); // إعادة تحميل الصفحة عند تسجيل الخروج
    });

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', handleCustomStorageChange);
      window.removeEventListener('userPermissionsUpdated', handleCustomStorageChange);
      window.removeEventListener('userLoggedOut', () => { });
    };
  }, [])

  // تحديث بيانات المستخدم من الخادم عند التحميل لضمان مزامنة الصلاحيات
  useEffect(() => {
    const refreshUserProfile = async () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      if (!userStr || !token) return;

      try {
        const user = JSON.parse(userStr);
        // لا نحتاج للتحديث إذا كان المستخدم وكيلاً (بياناتهم عادة لا تتغير من قسم الموظفين)
        if (user.branch_agent_id) return;

        const res = await fetch(`${API_BASE_URL}/users/${user.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });

        if (res.ok) {
          const latestUser = await res.json();
          // تأكد من أن البيانات صالحة قبل الحفظ
          if (latestUser && latestUser.id) {
            localStorage.setItem('user', JSON.stringify(latestUser));
            // تحديث الصلاحيات في الواجهة
            setAuthorizedDocuments(latestUser.authorized_documents || null);
            setIsAdmin(latestUser.is_admin || false);
            setBranchAgentId(latestUser.branch_agent_id || null);
            setCurrentUserId(latestUser.id);
          }
        }
      } catch (error) {
        console.error('Failed to auto-refresh user profile:', error);
      }
    };

    refreshUserProfile();
  }, []);

  const getMenuSectionsSafely = () => {
    try {
      return createMenuSections(authorizedDocuments, isAdmin, branchAgentId, currentUserId);
    } catch (e) {
      console.error('Error creating menu sections:', e);
      return [];
    }
  };


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
                sections={getMenuSectionsSafely()}
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
                  <Route path="/company-documents" element={isAdmin ? <CompanyDocuments /> : <Navigate to="/dashboard" />} />
                  <Route path="/excel-import" element={isAdmin ? <ExcelImportPage /> : <Navigate to="/dashboard" />} />
                  <Route path="/dashboard" element={<DashboardPanels />} />

                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/users" element={<UsersList />} />
                  <Route path="/employee-requests" element={<AllEmployeeRequests />} />
                  <Route path="/users/:id" element={<EmployeeProfile />} />
                  <Route path="/agent-requests" element={<AuthorizedRoute requiredPath="/agent-requests"><AllAgentRequests /></AuthorizedRoute>} />
                  <Route path="/agency-cancellations" element={<AuthorizedRoute requiredPath="/agency-cancellations"><AgencyCancellations /></AuthorizedRoute>} />

                  <Route path="/document-requests" element={<AuthorizedRoute requiredPath="/document-requests"><DocumentRequestsList /></AuthorizedRoute>} />
                  {/* إدارة الفروع والوكلاء */}
                  <Route path="/branches-agents" element={<BranchesAgentsList />} />
                  <Route path="/branches-agents/create" element={<CreateBranchAgent />} />
                  <Route path="/branches-agents/:id" element={<BranchAgentDetails />} />
                  <Route path="/branches-agents/:id/edit" element={<EditBranchAgent />} />
                  {/* إدارة المدن */}
                  <Route path="/cities" element={<AuthorizedRoute requiredPath="/cities"><CitiesList /></AuthorizedRoute>} />
                  {/* إدارة اللوحات */}
                  <Route path="/plates" element={<AuthorizedRoute requiredPath="/plates"><PlatesList /></AuthorizedRoute>} />
                  {/* إدارة الألوان */}
                  <Route path="/colors" element={<AuthorizedRoute requiredPath="/colors"><ColorsList /></AuthorizedRoute>} />
                  {/* إدارة أنواع السيارات */}
                  <Route path="/vehicle-types" element={<AuthorizedRoute requiredPath="/vehicle-types"><VehicleTypesList /></AuthorizedRoute>} />
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
                  <Route path="/reports/tax" element={<AuthorizedRoute requiredPath="/reports/tax"><TaxSSReport type="tax" /></AuthorizedRoute>} />
                  <Route path="/reports/social-security" element={<AuthorizedRoute requiredPath="/reports/social-security"><TaxSSReport type="social_security" /></AuthorizedRoute>} />
                  <Route path="/reports/expenses" element={<AuthorizedRoute requiredPath="/reports/expenses"><ExpenseManagement activeTabOverride="expenses" /></AuthorizedRoute>} />
                  <Route path="/reports/expenses/:id" element={<AuthorizedRoute requiredPath="/reports/expenses"><ViewExpenseDetails /></AuthorizedRoute>} />
                  <Route path="/reports/indemnities" element={<AuthorizedRoute requiredPath="/reports/indemnities"><ExpenseManagement activeTabOverride="indemnities" /></AuthorizedRoute>} />
                  <Route path="/reports/union-balances" element={<AuthorizedRoute requiredPath="/reports/union-balances"><ExpenseManagement activeTabOverride="union" /></AuthorizedRoute>} />
                  {/* ورقة الإيجارات */}
                  <Route path="/reports/rental-vouchers" element={<RentalVouchersList />} />
                  <Route path="/reports/rental-vouchers/create" element={<CreateRentalVoucher />} />
                  <Route path="/reports/rental-vouchers/:id" element={<RentalVoucherDetails />} />
                  <Route path="/reports/rental-vouchers/:id/edit" element={<EditRentalVoucher />} />
                  {/* اختبار API */}
                  <Route path="/test-car-info-api" element={<TestCarInfoAPI />} />
                  <Route path="/test-lifo-login" element={<TestLifoLogin />} />
                  {/* الأرشيف */}
                  <Route path="/archive" element={<ProtectedRoute><ArchiveDashboard /></ProtectedRoute>} />
                  <Route path="/external-entities" element={<ProtectedRoute><ExternalEntitiesManagement /></ProtectedRoute>} />
                  <Route path="/mail/:type" element={<ProtectedRoute><MailManagement /></ProtectedRoute>} />
                  <Route path="/mail/view/:id" element={<ProtectedRoute><ViewMailDocument /></ProtectedRoute>} />

                  <Route path="/claims" element={<ProtectedRoute><AuthorizedRoute requiredPath="/claims"><ClaimsList /></AuthorizedRoute></ProtectedRoute>} />
                  <Route path="/claims/:id" element={<ProtectedRoute><AuthorizedRoute requiredPath="/claims"><ViewClaim /></AuthorizedRoute></ProtectedRoute>} />
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
