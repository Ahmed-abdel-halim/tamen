import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar'
import { API_BASE_URL } from './config/api';
import './premium-hr.css';

type SidebarItem = {
  label: string;
  icon: string;
  to?: string;
  children?: SidebarItem[];
  badge?: number;
}

type SidebarSection = {
  title: string;
  items: SidebarItem[];
}

import { Topbar } from './components/Topbar'
import { DashboardPanels } from './components/DashboardPanels'
import UsersList from './components/UsersList';
import DepartmentsList from './components/DepartmentsList';
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
import LoyaltySettings from './components/LoyaltySettings';
import InsuranceDocumentsList from './components/InsuranceDocumentsList';
import CanceledDocumentsList from './components/CanceledDocumentsList';
import CreateInsuranceDocument from './components/CreateInsuranceDocument';
import EditInsuranceDocument from './components/EditInsuranceDocument';
import ViewInsuranceDocument from './components/ViewInsuranceDocument';
import TransferOwnershipInsuranceDocument from './components/TransferOwnershipInsuranceDocument';
import CreateInternationalInsurance from './components/CreateInternationalInsurance';
import EditInternationalInsurance from './components/EditInternationalInsurance';
import ViewInternationalInsurance from './components/ViewInternationalInsurance';
import InternationalInsuranceList from './components/InternationalInsuranceList';
import LifoReportsDashboard from './components/LifoReportsDashboard';
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
import ComprehensiveProductionReport from './components/ComprehensiveProductionReport';

import ArchiveDashboard from './components/archive/ArchiveDashboard';
import HomePage from './components/HomePage';
import AboutUs from './components/AboutUs';
import CompanyInvestments from './components/CompanyInvestments';
import MediaCenter from './components/MediaCenter';
import DepartmentView from './components/DepartmentView';
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
import ProfileUpdateRequestsList from './components/ProfileUpdateRequestsList';
import { TaxSSReport } from './components/TaxSSReport';
import ExternalEntitiesManagement from './components/ExternalEntitiesManagement';
import MailManagement from './components/MailManagement';
import ViewMailDocument from './components/ViewMailDocument';
import ClaimsList from './components/Claims/ClaimsList';
import ViewClaim from './components/Claims/ViewClaim';
import CompensationsList from './components/Claims/CompensationsList';
import FinanceClaimsList from './components/Claims/FinanceClaimsList';
import AgencyCancellations from './components/AgencyCancellations';
import CompanyDocuments from './components/CompanyDocuments';
import RentalVouchersList from './components/RentalVouchersList';
import RentalVoucherDetails from './components/RentalVoucherDetails';
import CreateRentalVoucher from './components/CreateRentalVoucher';
import EditRentalVoucher from './components/EditRentalVoucher';
import ExcelImportPage from './components/ExcelImportPage';
import TreasuryAndBanksPage from './components/TreasuryAndBanksPage';
import AgentTransfers from './components/AgentTransfers';
import NotificationsPage from './components/NotificationsPage';
import OfficeUsers from './components/OfficeUsers';
import OldDocumentsManagement from './components/OldDocumentsManagement';
import WebsiteSettingsManagement from './components/WebsiteSettingsManagement';
import PublicInsuranceRequestsList from './components/PublicInsuranceRequestsList';
import LoaderOverlay from './components/LoaderOverlay';
import LiveAgentsProduction from './components/LiveAgentsProduction';
import AgentMonthlyLedger from './components/AgentMonthlyLedger';
import SessionLockScreen from './components/SessionLockScreen';


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = localStorage.getItem('user');
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}


// دالة للتحقق من الصلاحيات بناءً على المسار
function hasAccessToRoute(
  path: string,
  authorizedDocs: string[] | null,
  isAdmin: boolean,
  branchAgentId?: number | null,
  isAgentCancelled?: boolean
): boolean {
  // Admin لديه وصول لجميع الصفحات
  if (isAdmin) {
    return true;
  }

  // إذا كانت الوكالة ملغية أو مجمدة، يمنع تماماً من الوصول لمسارات إنشاء وإصدار وثائق جديدة
  if (isAgentCancelled && (path.includes('/create') || path.endsWith('/create'))) {
    return false;
  }

  // الفروع/الوكلاء لديهم وصول إلى صفحاتهم الخاصة وإعدادات أنواع السيارات وحوالات الوكلاء وطلبات الوثائق
  if (branchAgentId) {
    if (path.startsWith('/vehicle-types')) {
      return true;
    }
    if (path.startsWith(`/branches-agents/${branchAgentId}`)) {
      return true;
    }
    if (path.startsWith('/agent-transfers') || path.startsWith('/reports/agent-transfers')) {
      return true;
    }
    if (path.startsWith('/reports/branch-agent-account')) {
      return true;
    }
    if (path.startsWith('/document-requests')) {
      return true;
    }
    if (path.startsWith('/reports/agent-monthly-ledger') || path.startsWith('/old-documents')) {
      return true;
    }
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
    'إدارة الوثائق القديمة': ['/old-documents'],
    'الوثائق الملغية': ['/canceled-documents'],

    // تفصيل صلاحيات الفروع والوكلاء
    'قائمة الفروع والوكلاء': ['/branches-agents'],
    'الوكلاء الجدد': ['/branches-agents'],
    'طلبات الوكلاء': ['/agent-requests'],
    'إلغاء الوكالات': ['/agency-cancellations'],
    'طلبات تعديل بيانات الوكلاء': ['/profile-update-requests'],

    'إدارة الموظفين': ['/users', '/employee-requests', '/departments'],
    // تفصيل صلاحيات الموظفين
    'قائمة الموظفين': ['/users'],
    'إدارة أقسام الشركة': ['/departments', '/management/department'],
    'طلبات الموظفين': ['/employee-requests'],
    'طلبات تعديل بيانات الموظفين': ['/profile-update-requests'],

    'الشؤون الفنية': ['/claims', '/reports/indemnities'],
    'المطالبات': ['/claims'],
    'التعويضات': ['/reports/indemnities'],

    'البريد الصادر والوارد': ['/mail/incoming', '/mail/outgoing'],
    'البريد الوارد والصادر': ['/mail/incoming', '/mail/outgoing'],
    'المراسلات الإدارية': ['/mail/incoming', '/mail/outgoing'],
    // تفصيل صلاحيات البريد الصادر والوارد
    'البريد الوارد': ['/mail/incoming', '/mail/view'],
    'البريد الصادر': ['/mail/outgoing', '/mail/view'],

    'دليل الجهات الخارجية': ['/external-entities'],
    'أرشيف المستندات الإدارية': ['/archive'],
    'الوثائق المنتهية': ['/archive'],
    'طلبات الوثائق': ['/document-requests'],
    'ملفات الشركة': ['/company-documents'],
    'الوثائق القديمة': ['/old-documents'],

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
      '/reports/finance-claims',
      '/reports/union-balances',
      '/reports/rental-vouchers',
      '/reports/employee-salaries',
      '/reports/financial-archive',
      '/reports/treasury-banks',
      '/reports/financial-reconciliation',
      '/reports/live-agents-production',
      '/reports/agent-monthly-ledger',
      '/old-documents'
    ],
    // تفصيل صلاحيات المحاسب المالي
    'المصارف والخزنة': ['/reports/treasury-banks'],
    'المطابقة والتحصيلات المالية': ['/reports/financial-reconciliation'],
    'إدخال مبيعات نقاط البيع (POS)': ['/reports/financial-reconciliation'],
    'مطابقة مبيعات نقاط البيع (POS)': ['/reports/financial-reconciliation'],
    'الإحصائيات المالية': ['/reports/financial-statistics'],
    'الديون المستحقة': ['/reports/outstanding-debts'],
    'مرتبات الموظفين': ['/reports/employee-salaries'],
    'الأرشيف المالي': ['/reports/financial-archive'],
    'إحصائيات الإيرادات': ['/reports/revenue'],
    'إدارة الإيرادات': ['/reports/payment-vouchers'],
    'المخازن والعهدة': ['/reports/inventory'],
    'رصيد الاتحاد (البطاقة البرتقالية)': ['/reports/union-balances'],
    'الإيجارات العقارية': ['/reports/rental-vouchers'],
    'المصروفات التشغيلية': ['/reports/expenses'],
    'التسويات والعمولات': ['/reports/commissions'],
    'كشف حساب الوكيل': ['/reports/branch-agent-account'],
    'حوالات الوكلاء المالية': ['/reports/agent-transfers', '/agent-transfers'],
    'اغلاق حساب الوكيل': ['/reports/monthly-account-closure'],
    'كشف حساب الوكلاء': ['/reports/monthly-account-closures-report'],
    'تسديد التعويضات': ['/reports/finance-claims'],
    'التحصيلات البنكية': ['/reports/bank-reconciliation'],
    'تقرير الإنتاجية المباشر': ['/reports/live-agents-production'],
    'كشف الحساب الشهري للوكيل': ['/reports/agent-monthly-ledger', '/old-documents'],
    'تقرير الحوافظ والإنتاجية الشامل': ['/reports/comprehensive-production'],

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
  requiredPath?: string;
}) {
  const location = useLocation();
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
        const isAgentCancelled = user.branch_agent_status === 'غير نشط' || 
                                 user.branch_agent?.status === 'غير نشط' || 
                                 user.status === 'غير نشط' || 
                                 user.is_cancelled === true;

        const pathToCheck = requiredPath || location.pathname;
        setHasAccess(hasAccessToRoute(pathToCheck, authorizedDocs, isAdmin, branchAgentId, isAgentCancelled));
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
  }, [requiredPath, location.pathname]);

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
          {
            label: 'تأمين السيارات الدولي', icon: 'fa-solid fa-globe', children: [
              { label: 'وثائق التأمين الدولي', icon: 'fa-solid fa-globe', to: '/international-insurance-documents' },
              { label: 'بوابة الاتحاد (LIFO)', icon: 'fa-solid fa-chart-pie', to: '/international-insurance-documents/lifo-dashboard' }
            ]
          },
          { label: ' تأمين المسافرين', icon: 'fa-solid fa-plane', to: '/travel-insurance-documents' },
          { label: ' تأمين الوافدين للمقيمين', icon: 'fa-solid fa-user-check', to: '/resident-insurance-documents' },
          { label: 'تأمين الهياكل البحرية', icon: 'fa-solid fa-ship', to: '/marine-structure-insurance-documents' },
          { label: 'تأمين المسؤولية المهنية (الطبية)', icon: 'fa-solid fa-stethoscope', to: '/professional-liability-insurance-documents' },
          { label: 'تأمين الحوادث الشخصية', icon: 'fa-solid fa-user-injured', to: '/personal-accident-insurance-documents' },
          { label: 'تأمين حماية طلاب المدارس', icon: 'fa-solid fa-graduation-cap', to: '/school-student-insurance' },
          { label: 'تأمين نقل النقدية', icon: 'fa-solid fa-money-bill-transfer', to: '/cash-in-transit-insurance' },
          { label: 'تأمين شحن البضائع', icon: 'fa-solid fa-truck', to: '/cargo-insurance' },
          { label: 'إدارة الوثائق القديمة', icon: 'fa-solid fa-clock-rotate-left', to: '/old-documents' },
          { label: 'الوثائق الملغية', icon: 'fa-solid fa-ban', to: '/canceled-documents' },
          { label: 'الوثائق المنتهية', icon: 'fa-solid fa-box-archive', to: '/archive' },
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
          { label: 'طلبات تعديل بيانات الوكلاء', icon: 'fa-solid fa-user-pen', to: '/profile-update-requests?type=agent' },
        ]
      },
      {
        label: 'إدارة الموظفين', icon: 'fa-solid fa-user-shield', children: [
          { label: 'قائمة الموظفين', icon: 'fa-solid fa-users-gear', to: '/users' },
          { label: 'إدارة أقسام الشركة', icon: 'fa-solid fa-sitemap', to: '/departments' },
          { label: 'طلبات الموظفين', icon: 'fa-solid fa-file-invoice', to: '/employee-requests' },
          { label: 'طلبات تعديل بيانات الموظفين', icon: 'fa-solid fa-user-pen', to: '/profile-update-requests?type=employee' },
        ]
      },
      { label: 'دليل الجهات الخارجية', icon: 'fa-solid fa-address-book', to: '/external-entities' },
      {
        label: 'البريد الصادر والوارد', icon: 'fa-solid fa-envelope-open-text', children: [
          { label: 'البريد الوارد', icon: 'fa-solid fa-file-import', to: '/mail/incoming' },
          { label: 'البريد الصادر', icon: 'fa-solid fa-file-export', to: '/mail/outgoing' },
        ]
      },
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
      { label: 'المصارف والخزنة', icon: 'fa-solid fa-building-columns', to: '/reports/treasury-banks' },
      { label: 'الإحصائيات المالية', icon: 'fa-solid fa-chart-line', to: '/reports/financial-statistics' },
      { label: 'الديون المستحقة', icon: 'fa-solid fa-hand-holding-dollar', to: '/reports/outstanding-debts' },
      { label: 'مرتبات الموظفين', icon: 'fa-solid fa-money-check-dollar', to: '/reports/employee-salaries' },
      { label: 'الأرشيف المالي', icon: 'fa-solid fa-folder-open', to: '/reports/financial-archive' },
      { label: 'اجور ومرتبات ضرائب', icon: 'fa-solid fa-percent', to: '/reports/tax' },
      { label: 'اجور ومرتبات ضمان', icon: 'fa-solid fa-handshake-angle', to: '/reports/social-security' },
      {
        label: 'المحاسب المالي', icon: 'fa-solid fa-file-contract', children: [
          { label: 'إحصائيات الإيرادات', icon: 'fa-solid fa-chart-pie', to: '/reports/revenue' },
          { label: 'تقرير الإنتاجية المباشر', icon: 'fa-solid fa-chart-bar', to: '/reports/live-agents-production' },
          { label: 'كشف الحساب الشهري للوكيل', icon: 'fa-solid fa-book-open-reader', to: '/reports/agent-monthly-ledger' },
          { label: 'تقرير الحوافظ والإنتاجية الشامل', icon: 'fa-solid fa-file-invoice-dollar', to: '/reports/comprehensive-production' },
          { label: 'إدارة الإيرادات', icon: 'fa-solid fa-receipt', to: '/reports/payment-vouchers' },
          { label: 'المخازن والعهدة', icon: 'fa-solid fa-boxes-stacked', to: '/reports/inventory' },
          { label: 'المطابقة والتحصيلات المالية', icon: 'fa-solid fa-scale-balanced', to: '/reports/financial-reconciliation' },
          {
            label: 'إدارة المصروفات', icon: 'fa-solid fa-vault', children: [
              { label: 'رصيد الاتحاد (البطاقة البرتقالية)', icon: 'fa-solid fa-id-card', to: '/reports/union-balances' },
              { label: 'الإيجارات العقارية', icon: 'fa-solid fa-building', to: '/reports/rental-vouchers' },
              { label: 'المصروفات التشغيلية', icon: 'fa-solid fa-money-bill-wave', to: '/reports/expenses' },
            ]
          },
          { label: 'التسويات والعمولات', icon: 'fa-solid fa-percent', to: '/reports/commissions' },
          { label: 'كشف حساب الوكيل', icon: 'fa-solid fa-file-invoice-dollar', to: '/reports/branch-agent-account' },
          { label: 'حوالات الوكلاء المالية', icon: 'fa-solid fa-money-bill-transfer', to: '/reports/agent-transfers' },
          { label: 'اغلاق حساب الوكيل', icon: 'fa-solid fa-calendar-check', to: '/reports/monthly-account-closure' },
          { label: 'كشف حساب الوكلاء', icon: 'fa-solid fa-file-contract', to: '/reports/monthly-account-closures-report' },
          { label: 'تسديد التعويضات', icon: 'fa-solid fa-receipt', to: '/reports/finance-claims' },
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
          { label: 'نقاط مكافآت الوكلاء', icon: 'fa-solid fa-award', to: '/settings/loyalty' },
        ]
      },
    ],
  },
  {
    title: 'إدارة الموقع الإلكتروني',
    items: [
      {
        label: 'إدارة الموقع',
        icon: 'fa-solid fa-globe',
        children: [
          { label: 'إعدادات ومحتوى الموقع', icon: 'fa-solid fa-sliders', to: '/website-settings' },
          { label: 'طلبات التأمين العامة', icon: 'fa-solid fa-file-invoice', to: '/public-insurance-requests' },
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
  userId?: number | null,
  pendingDocsCount: number = 0,
  adminCounts?: {
    new_agents: number;
    agent_requests: number;
    agency_cancellations: number;
    agent_profile_updates: number;
    employee_requests: number;
    employee_profile_updates: number;
    agent_transfers?: number;
  }
): SidebarSection[] => {
  // إذا كان المستخدم admin، أظهر كل شيء
  if (isAdmin) {
    return menuSections.map(section => ({
      ...section,
      items: section.items.map(item => {
        if (item.label === 'إدارة الوثائق' && item.children) {
          return {
            ...item,
            children: item.children.map(child => {
              if (child.label === 'طلبات الوثائق') {
                return { ...child, badge: pendingDocsCount };
              }
              return child;
            })
          };
        }
        if (item.label === 'إدارة الفروع والوكلاء' && item.children) {
          return {
            ...item,
            children: item.children.map(child => {
              if (child.label === 'الوكلاء الجدد') {
                return { ...child, badge: adminCounts?.new_agents };
              }
              if (child.label === 'طلبات الوكلاء') {
                return { ...child, badge: adminCounts?.agent_requests };
              }
              if (child.label === 'إلغاء الوكالات') {
                return { ...child, badge: adminCounts?.agency_cancellations };
              }
              if (child.label === 'طلبات تعديل بيانات الوكلاء') {
                return { ...child, badge: adminCounts?.agent_profile_updates };
              }
              return child;
            })
          };
        }
        if (item.label === 'إدارة الموظفين' && item.children) {
          return {
            ...item,
            children: item.children.map(child => {
              if (child.label === 'طلبات الموظفين') {
                return { ...child, badge: adminCounts?.employee_requests };
              }
              if (child.label === 'طلبات تعديل بيانات الموظفين') {
                return { ...child, badge: adminCounts?.employee_profile_updates };
              }
              return child;
            })
          };
        }
        if (item.label === 'المحاسب المالي' && item.children) {
          return {
            ...item,
            children: item.children.map(child => {
              if (child.label === 'حوالات الوكلاء المالية') {
                return { ...child, badge: adminCounts?.agent_transfers };
              }
              if (child.label === 'إدارة المصروفات' && child.children) {
                return {
                  ...child,
                  children: child.children.map(grandchild => grandchild)
                };
              }
              return child;
            })
          };
        }
        return item;
      })
    }));
  }

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isSubUser = !!(currentUser?.lifo_permissions && currentUser.lifo_permissions.length > 0) || !!currentUser?.lifo_user_id;

  // خريطة الصلاحيات إلى العناصر الجانبية
  // يمكن أن تشير الصلاحية الواحدة إلى عنصر واحد أو مصفوفة عناصر
  const insuranceTypeMap: Record<string, SidebarItem | SidebarItem[]> = {
    'تأمين سيارات إجباري': { label: 'وثائق تأمين السيارات', icon: 'fa-solid fa-file-shield', to: '/insurance-documents' },
    'تأمين سيارات': { label: 'وثائق تأمين السيارات', icon: 'fa-solid fa-file-shield', to: '/insurance-documents' },
    'تأمين سيارة جمرك': { label: 'وثائق تأمين السيارات', icon: 'fa-solid fa-file-shield', to: '/insurance-documents' },
    'تأمين سيارات أجنبية': { label: 'وثائق تأمين السيارات', icon: 'fa-solid fa-file-shield', to: '/insurance-documents' },
    'تأمين طرف ثالث سيارات': { label: 'وثائق تأمين السيارات', icon: 'fa-solid fa-file-shield', to: '/insurance-documents' },
    'تأمين سيارات دولي': {
      label: 'تأمين السيارات الدولي',
      icon: 'fa-solid fa-globe',
      to: '/international-insurance-documents',
      children: [
        { label: 'وثائق التأمين الدولي', icon: 'fa-solid fa-globe', to: '/international-insurance-documents' },
        { label: 'بوابة الاتحاد (LIFO)', icon: 'fa-solid fa-chart-pie', to: '/international-insurance-documents/lifo-dashboard' }
      ]
    },
    'تأمين المسافرين': { label: 'وثائق تأمين المسافرين', icon: 'fa-solid fa-plane', to: '/travel-insurance-documents' },
    'تأمين الهياكل البحرية': { label: 'تأمين الهياكل البحرية', icon: 'fa-solid fa-ship', to: '/marine-structure-insurance-documents' },
    'تأمين زائرين ليبيا': { label: 'وثائق تأمين المسافرين', icon: 'fa-solid fa-plane', to: '/travel-insurance-documents' },
    'تأمين الوافدين': { label: 'وثائق تأمين الوافدين للمقيمين', icon: 'fa-solid fa-user-check', to: '/resident-insurance-documents' },
    'تأمين المسؤولية المهنية (الطبية)': { label: 'تأمين المسؤولية المهنية (الطبية)', icon: 'fa-solid fa-stethoscope', to: '/professional-liability-insurance-documents' },
    'تأمين الحوادث الشخصية': { label: 'تأمين الحوادث الشخصية', icon: 'fa-solid fa-user-injured', to: '/personal-accident-insurance-documents' },
    'تأمين حماية طلاب المدارس': { label: 'تأمين حماية طلاب المدارس', icon: 'fa-solid fa-graduation-cap', to: '/school-student-insurance' },
    'تأمين نقل النقدية': { label: 'تأمين نقل النقدية', icon: 'fa-solid fa-money-bill-transfer', to: '/cash-in-transit-insurance' },
    'تأمين شحن البضائع': { label: 'تأمين شحن البضائع', icon: 'fa-solid fa-truck', to: '/cargo-insurance' },
    'طلبات الوثائق': { label: 'طلبات الوثائق', icon: 'fa-solid fa-file-circle-exclamation', to: '/document-requests', badge: pendingDocsCount },
    'إدارة الوثائق القديمة': { label: 'إدارة الوثائق القديمة', icon: 'fa-solid fa-clock-rotate-left', to: '/old-documents' },
    'الوثائق الملغية': { label: 'الوثائق الملغية', icon: 'fa-solid fa-ban', to: '/canceled-documents' },
    'إدارة الفروع والوكلاء': [
      { label: 'قائمة الفروع والوكلاء', icon: 'fa-solid fa-list-check', to: '/branches-agents' },
      { label: 'الوكلاء الجدد', icon: 'fa-solid fa-user-plus', to: '/branches-agents?status=pending', badge: adminCounts?.new_agents },
      { label: 'طلبات الوكلاء', icon: 'fa-solid fa-paper-plane', to: '/agent-requests', badge: adminCounts?.agent_requests },
      { label: 'إلغاء الوكالات', icon: 'fa-solid fa-user-slash', to: '/agency-cancellations', badge: adminCounts?.agency_cancellations },
      { label: 'طلبات تعديل بيانات الوكلاء', icon: 'fa-solid fa-user-pen', to: '/profile-update-requests?type=agent', badge: adminCounts?.agent_profile_updates },
    ],
    // تفصيل صلاحيات الفروع والوكلاء
    'قائمة الفروع والوكلاء': { label: 'قائمة الفروع والوكلاء', icon: 'fa-solid fa-list-check', to: '/branches-agents' },
    'الوكلاء الجدد': { label: 'الوكلاء الجدد', icon: 'fa-solid fa-user-plus', to: '/branches-agents?status=pending', badge: adminCounts?.new_agents },
    'طلبات الوكلاء': { label: 'طلبات الوكلاء', icon: 'fa-solid fa-paper-plane', to: '/agent-requests', badge: adminCounts?.agent_requests },
    'إلغاء الوكالات': { label: 'إلغاء الوكالات', icon: 'fa-solid fa-user-slash', to: '/agency-cancellations', badge: adminCounts?.agency_cancellations },
    'طلبات تعديل بيانات الوكلاء': { label: 'طلبات تعديل بيانات الوكلاء', icon: 'fa-solid fa-user-pen', to: '/profile-update-requests?type=agent', badge: adminCounts?.agent_profile_updates },

    'إدارة الموظفين': [
      { label: 'قائمة الموظفين', icon: 'fa-solid fa-users-gear', to: '/users' },
      { label: 'إدارة أقسام الشركة', icon: 'fa-solid fa-sitemap', to: '/departments' },
      { label: 'طلبات الموظفين', icon: 'fa-solid fa-file-invoice', to: '/employee-requests', badge: adminCounts?.employee_requests },
      { label: 'طلبات تعديل بيانات الموظفين', icon: 'fa-solid fa-user-pen', to: '/profile-update-requests?type=employee', badge: adminCounts?.employee_profile_updates },
    ],
    // تفصيل صلاحيات الموظفين
    'قائمة الموظفين': { label: 'قائمة الموظفين', icon: 'fa-solid fa-users-gear', to: '/users' },
    'إدارة أقسام الشركة': { label: 'إدارة أقسام الشركة', icon: 'fa-solid fa-sitemap', to: '/departments' },
    'طلبات الموظفين': { label: 'طلبات الموظفين', icon: 'fa-solid fa-file-invoice', to: '/employee-requests', badge: adminCounts?.employee_requests },
    'طلبات تعديل بيانات الموظفين': { label: 'طلبات تعديل بيانات الموظفين', icon: 'fa-solid fa-user-pen', to: '/profile-update-requests?type=employee', badge: adminCounts?.employee_profile_updates },

    'دليل الجهات الخارجية': { label: 'دليل الجهات الخارجية', icon: 'fa-solid fa-address-book', to: '/external-entities' },
    'البريد الصادر والوارد': [
      { label: 'البريد الوارد', icon: 'fa-solid fa-file-import', to: '/mail/incoming' },
      { label: 'البريد الصادر', icon: 'fa-solid fa-file-export', to: '/mail/outgoing' },
    ],
    'البريد الوارد والصادر': [
      { label: 'البريد الوارد', icon: 'fa-solid fa-file-import', to: '/mail/incoming' },
      { label: 'البريد الصادر', icon: 'fa-solid fa-file-export', to: '/mail/outgoing' },
    ],
    // تفصيل صلاحيات البريد الصادر والوارد
    'البريد الوارد': { label: 'البريد الوارد', icon: 'fa-solid fa-file-import', to: '/mail/incoming' },
    'البريد الصادر': { label: 'البريد الصادر', icon: 'fa-solid fa-file-export', to: '/mail/outgoing' },

    'الوثائق المنتهية': { label: 'الوثائق المنتهية', icon: 'fa-solid fa-box-archive', to: '/archive' },
    'أرشيف المستندات الإدارية': { label: 'الوثائق المنتهية', icon: 'fa-solid fa-box-archive', to: '/archive' },
    'ملفات الشركة': { label: 'ملفات الشركة', icon: 'fa-solid fa-folder-open', to: '/company-documents' },
    'المحاسب المالي': [
      { label: 'المصارف والخزنة', icon: 'fa-solid fa-building-columns', to: '/reports/treasury-banks' },
      { label: 'الإحصائيات المالية', icon: 'fa-solid fa-chart-line', to: '/reports/financial-statistics' },
      { label: 'الديون المستحقة', icon: 'fa-solid fa-hand-holding-dollar', to: '/reports/outstanding-debts' },
      { label: 'مرتبات الموظفين', icon: 'fa-solid fa-money-check-dollar', to: '/reports/employee-salaries' },
      { label: 'الأرشيف المالي', icon: 'fa-solid fa-folder-open', to: '/reports/financial-archive' },
      { label: 'إحصائيات الإيرادات', icon: 'fa-solid fa-chart-pie', to: '/reports/revenue' },
      { label: 'تقرير الإنتاجية المباشر', icon: 'fa-solid fa-chart-bar', to: '/reports/live-agents-production' },
      { label: 'كشف الحساب الشهري للوكيل', icon: 'fa-solid fa-book-open-reader', to: '/reports/agent-monthly-ledger' },
      { label: 'تقرير الحوافظ والإنتاجية الشامل', icon: 'fa-solid fa-file-invoice-dollar', to: '/reports/comprehensive-production' },
      { label: 'إدارة الإيرادات', icon: 'fa-solid fa-receipt', to: '/reports/payment-vouchers' },
      { label: 'المخازن والعهدة', icon: 'fa-solid fa-boxes-stacked', to: '/reports/inventory' },
      { label: 'رصيد الاتحاد (البطاقة البرتقالية)', icon: 'fa-solid fa-id-card', to: '/reports/union-balances' },
      { label: 'الإيجارات العقارية', icon: 'fa-solid fa-building', to: '/reports/rental-vouchers' },
      { label: 'التسويات والعمولات', icon: 'fa-solid fa-percent', to: '/reports/commissions' },
      { label: 'كشف حساب الوكيل', icon: 'fa-solid fa-file-invoice-dollar', to: '/reports/branch-agent-account' },
      { label: 'حوالات الوكلاء المالية', icon: 'fa-solid fa-money-bill-transfer', to: '/reports/agent-transfers', badge: adminCounts?.agent_transfers },
      { label: 'اغلاق حساب الوكيل', icon: 'fa-solid fa-calendar-check', to: '/reports/monthly-account-closure' },
      { label: 'كشف حساب الوكلاء', icon: 'fa-solid fa-file-contract', to: '/reports/monthly-account-closures-report' },
      { label: 'التحصيلات البنكية', icon: 'fa-solid fa-building-columns', to: '/reports/bank-reconciliation' as const },
      { label: 'المصروفات التشغيلية', icon: 'fa-solid fa-money-bill-wave', to: '/reports/expenses' },
      { label: 'المطابقة والتحصيلات المالية', icon: 'fa-solid fa-scale-balanced', to: '/reports/financial-reconciliation' as const },
      { label: 'تسديد التعويضات', icon: 'fa-solid fa-receipt', to: '/reports/finance-claims' },
    ],
    // تفصيل صلاحيات المحاسب المالي
    'المصارف والخزنة': { label: 'المصارف والخزنة', icon: 'fa-solid fa-building-columns', to: '/reports/treasury-banks' },
    'إدخال مبيعات نقاط البيع (POS)': { label: 'المطابقة والتحصيلات المالية', icon: 'fa-solid fa-scale-balanced', to: '/reports/financial-reconciliation' as const },
    'مطابقة مبيعات نقاط البيع (POS)': { label: 'المطابقة والتحصيلات المالية', icon: 'fa-solid fa-scale-balanced', to: '/reports/financial-reconciliation' as const },
    'الإحصائيات المالية': { label: 'الإحصائيات المالية', icon: 'fa-solid fa-chart-line', to: '/reports/financial-statistics' },
    'الديون المستحقة': { label: 'الديون المستحقة', icon: 'fa-solid fa-hand-holding-dollar', to: '/reports/outstanding-debts' },
    'مرتبات الموظفين': { label: 'مرتبات الموظفين', icon: 'fa-solid fa-money-check-dollar', to: '/reports/employee-salaries' },
    'الأرشيف المالي': { label: 'الأرشيف المالي', icon: 'fa-solid fa-folder-open', to: '/reports/financial-archive' },
    'إحصائيات الإيرادات': { label: 'إحصائيات الإيرادات', icon: 'fa-solid fa-chart-pie', to: '/reports/revenue' },
    'إدارة الإيرادات': { label: 'إدارة الإيرادات', icon: 'fa-solid fa-receipt', to: '/reports/payment-vouchers' },
    'المخازن والعهدة': { label: 'المخازن والعهدة', icon: 'fa-solid fa-boxes-stacked', to: '/reports/inventory' },
    'رصيد الاتحاد (البطاقة البرتقالية)': { label: 'رصيد الاتحاد (البطاقة البرتقالية)', icon: 'fa-solid fa-id-card', to: '/reports/union-balances' },
    'الإيجارات العقارية': { label: 'الإيجارات العقارية', icon: 'fa-solid fa-building', to: '/reports/rental-vouchers' },
    'التسويات والعمولات': { label: 'التسويات والعمولات', icon: 'fa-solid fa-percent', to: '/reports/commissions' },
    'كشف حساب الوكيل': { label: 'كشف حساب الوكيل', icon: 'fa-solid fa-file-invoice-dollar', to: '/reports/branch-agent-account' },
    'حوالات الوكلاء المالية': { label: 'حوالات الوكلاء المالية', icon: 'fa-solid fa-money-bill-transfer', to: '/reports/agent-transfers', badge: adminCounts?.agent_transfers },
    'اغلاق حساب الوكيل': { label: 'اغلاق حساب الوكيل', icon: 'fa-solid fa-calendar-check', to: '/reports/monthly-account-closure' },
    'كشف حساب الوكلاء': { label: 'كشف حساب الوكلاء', icon: 'fa-solid fa-file-contract', to: '/reports/monthly-account-closures-report' },
    'التحصيلات البنكية': { label: 'التحصيلات البنكية', icon: 'fa-solid fa-building-columns', to: '/reports/bank-reconciliation' as const },
    'المصروفات التشغيلية': { label: 'المصروفات التشغيلية', icon: 'fa-solid fa-money-bill-wave', to: '/reports/expenses' },
    'المطابقة والتحصيلات المالية': { label: 'المطابقة والتحصيلات المالية', icon: 'fa-solid fa-scale-balanced', to: '/reports/financial-reconciliation' as const },
    'تسديد التعويضات': { label: 'تسديد التعويضات', icon: 'fa-solid fa-receipt', to: '/reports/finance-claims' },
    'تقرير الإنتاجية المباشر': { label: 'تقرير الإنتاجية المباشر', icon: 'fa-solid fa-chart-bar', to: '/reports/live-agents-production' },
    'كشف الحساب الشهري للوكيل': { label: 'كشف الحساب الشهري للوكيل', icon: 'fa-solid fa-book-open-reader', to: '/reports/agent-monthly-ledger' },
    'تقرير الحوافظ والإنتاجية الشامل': { label: 'تقرير الحوافظ والإنتاجية الشامل', icon: 'fa-solid fa-file-invoice-dollar', to: '/reports/comprehensive-production' },

    'الشؤون الفنية': [
      { label: 'المطالبات', icon: 'fa-solid fa-scale-balanced', to: '/claims' },
      { label: 'التعويضات', icon: 'fa-solid fa-scale-unbalanced', to: '/reports/indemnities' },
    ],
    // تفصيل صلاحيات الشؤون الفنية والمطالبات
    'المطالبات': { label: 'المطالبات', icon: 'fa-solid fa-scale-balanced', to: '/claims' },
    'التعويضات': { label: 'التعويضات', icon: 'fa-solid fa-scale-unbalanced', to: '/reports/indemnities' },

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
    '/old-documents',
    '/canceled-documents',
    '/archive',
    '/coming-soon',
  ];

  // ترتيب التقارير
  const reportsOrder: string[] = [
    '/reports/treasury-banks',
    '/reports/financial-statistics',
    '/reports/revenue',
    '/reports/live-agents-production',
    '/reports/agent-monthly-ledger',
    '/reports/outstanding-debts',
    '/reports/commissions',
    '/reports/payment-vouchers',
    '/reports/inventory',
    '/reports/employee-salaries',
    '/reports/branch-agent-account',
    '/reports/agent-transfers',
    '/reports/monthly-account-closure',
    '/reports/monthly-account-closures-report',
    '/reports/tax',
    '/reports/social-security',
    ...(SHOW_BANK_RECONCILIATION ? ['/reports/bank-reconciliation'] : []),
    '/reports/financial-archive',
    '/reports/indemnities',
    '/reports/finance-claims',
    '/reports/union-balances',
    '/reports/rental-vouchers',
    '/reports/expenses',
    '/reports/financial-reconciliation',
  ];
  const adminOrder: string[] = [
    '/branches-agents', 
    '/branches-agents?status=pending',
    '/users', 
    '/departments',
    '/employee-requests', 
    '/agent-requests', 
    '/agency-cancellations', 
    '/profile-update-requests?type=agent',
    '/profile-update-requests?type=employee',
    '/external-entities',
    '/mail/incoming',
    '/mail/outgoing'
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
              if (adminOrder.includes(item.to) || technicalOrder.includes(item.to)) {
                if (!adminItemsMap.has(item.to)) {
                  adminItemsMap.set(item.to, item);
                }
              } else if (settingsOrder.includes(item.to)) {
                if (!settingsItemsMap.has(item.to)) {
                  settingsItemsMap.set(item.to, item);
                }
              } else if (item.to.startsWith('/reports/')) {
                if (!reportsItemsMap.has(item.to)) {
                  reportsItemsMap.set(item.to, item);
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
            if (adminOrder.includes(itemInfo.to) || technicalOrder.includes(itemInfo.to)) {
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
            } else if (itemInfo.to.startsWith('/reports/')) {
              if (!reportsItemsMap.has(itemInfo.to)) {
                reportsItemsMap.set(itemInfo.to, itemInfo);
              }
            } else {
              if (!insuranceItemsMap.has(itemInfo.to)) {
                insuranceItemsMap.set(itemInfo.to, {
                  label: itemInfo.label,
                  icon: itemInfo.icon,
                  to: itemInfo.to,
                  children: itemInfo.children,
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

  // إضافة "طلبات الوثائق" دائماً للوكلاء (غير admin وغير sub-user)
  if (branchAgentId && !isAdmin && !isSubUser) {
    const docRequestItem: SidebarItem = {
      label: 'طلبات الوثائق',
      icon: 'fa-solid fa-file-circle-exclamation',
      to: '/document-requests',
      badge: pendingDocsCount,
    };
    if (!insuranceItems.some(item => item.to === '/document-requests')) {
      insuranceItems.push(docRequestItem);
    }
  }

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

  // إضافة "كشف حساب الوكيل" و"حوالات الوكلاء المالية" دائماً للوكلاء (غير admin وغير sub-user)
  if (branchAgentId && !isAdmin && !isSubUser) {
    const accountReportItem: SidebarItem = {
      label: 'كشف حساب الوكيل',
      icon: 'fa-solid fa-file-invoice-dollar',
      to: '/reports/branch-agent-account',
    };
    if (!reportsItems.some(item => item.to === '/reports/branch-agent-account')) {
      reportsItems.push(accountReportItem);
    }

    const transfersItem: SidebarItem = {
      label: 'حوالات الوكلاء المالية',
      icon: 'fa-solid fa-money-bill-transfer',
      to: '/reports/agent-transfers',
      badge: adminCounts?.agent_transfers,
    };
    if (!reportsItems.some(item => item.to === '/reports/agent-transfers')) {
      reportsItems.push(transfersItem);
    }
  }
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
    const hrOrder = [
      '/users',
      '/departments',
      '/employee-requests',
      '/profile-update-requests?type=employee'
    ];
    const agentsOrder = [
      '/branches-agents',
      '/branches-agents?status=pending',
      '/agent-requests',
      '/agency-cancellations',
      '/profile-update-requests?type=agent'
    ];
    const mailOrder = [
      '/mail/incoming',
      '/mail/outgoing'
    ];

    const hrGroup = adminItems
      .filter(i => i.to && hrOrder.includes(i.to))
      .sort((a, b) => hrOrder.indexOf(a.to!) - hrOrder.indexOf(b.to!));

    const agentsGroup = adminItems
      .filter(i => i.to && agentsOrder.includes(i.to))
      .sort((a, b) => agentsOrder.indexOf(a.to!) - agentsOrder.indexOf(b.to!));

    const mailGroup = adminItems
      .filter(i => i.to && mailOrder.includes(i.to))
      .sort((a, b) => mailOrder.indexOf(a.to!) - mailOrder.indexOf(b.to!));
    
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
      if (hrGroup.length === 1) {
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

    // إضافة دليل الجهات الخارجية إذا كان موجوداً
    const extItem = adminItems.find(i => i.to === '/external-entities');
    if (extItem) finalAdmin.push(extItem);

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

  // تم نقل إضافة "كشف حساب الوكيل" و"حوالات الوكلاء المالية" و"طلبات الوثائق" للوكلاء إلى أعلى مع بقية العناصر المصفاة

  if (reportsItems.length > 0) {
    const rootFinanceOrder = [
      '/reports/treasury-banks',
      '/reports/financial-statistics',
      '/reports/outstanding-debts',
      '/reports/employee-salaries',
      '/reports/financial-archive',
      '/reports/tax',
      '/reports/social-security'
    ];
    const accountantOrder = [
      '/reports/revenue',
      '/reports/live-agents-production',
      '/reports/agent-monthly-ledger',
      '/reports/payment-vouchers',
      '/reports/inventory',
      '/reports/financial-reconciliation',
      '/reports/commissions',
      '/reports/branch-agent-account',
      '/reports/agent-transfers',
      '/reports/monthly-account-closure',
      '/reports/monthly-account-closures-report',
      '/reports/finance-claims',
      '/reports/bank-reconciliation'
    ];
    const expensesOrder = [
      '/reports/union-balances',
      '/reports/rental-vouchers',
      '/reports/expenses'
    ];

    const otherReports = reportsItems
      .filter(i => i.to && rootFinanceOrder.includes(i.to))
      .sort((a, b) => rootFinanceOrder.indexOf(a.to!) - rootFinanceOrder.indexOf(b.to!));

    const accountantGroup = reportsItems
      .filter(i => i.to && accountantOrder.includes(i.to))
      .sort((a, b) => accountantOrder.indexOf(a.to!) - accountantOrder.indexOf(b.to!));

    const expensesGroup = reportsItems
      .filter(i => i.to && expensesOrder.includes(i.to))
      .sort((a, b) => expensesOrder.indexOf(a.to!) - expensesOrder.indexOf(b.to!));

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

  // إذا كان فرع/وكيل وغير sub-user، أضف إعدادات أنواع السيارات فقط
  if (branchAgentId && !isSubUser && !settingsItems.some(item => item.to === '/vehicle-types')) {
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
      const agentItems: SidebarItem[] = [];

      if (isSubUser) {
        // للموظف الفرعي تحت الوكيل، فقط نعرض إعدادات الحساب لملفه الشخصي
        agentItems.push({ label: 'إعدادات الحساب', icon: 'fa-solid fa-user-gear', to: '/profile' });
      } else {
        // للوكيل الرئيسي (المكتب)
        agentItems.push(
          { label: 'بيانات الوكالة', icon: 'fa-solid fa-building-user', to: `/branches-agents/${branchAgentId}?tab=agency` },
          { label: 'المحفظة والنقاط', icon: 'fa-solid fa-wallet', to: `/branches-agents/${branchAgentId}?tab=wallet` },
          { label: 'طلبات الوكلاء', icon: 'fa-solid fa-paper-plane', to: `/branches-agents/${branchAgentId}?tab=requests` },
          { label: 'العودة للصفحة الرئيسية', icon: 'fa-solid fa-house', to: '/dashboard' }
        );
      }

      sections.push({
        title: 'حسابي الشخصي',
        items: agentItems,
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
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState('جاري تحميل البيانات...');

  useEffect(() => {
    const handleShowLoader = (e: Event) => {
      const customEvent = e as CustomEvent;
      setGlobalLoading(!!customEvent.detail?.show);
      if (customEvent.detail?.message) {
        setGlobalLoadingMessage(customEvent.detail.message);
      } else {
        setGlobalLoadingMessage('جاري تحميل البيانات...');
      }
    };
    window.addEventListener('show-loader', handleShowLoader);
    return () => window.removeEventListener('show-loader', handleShowLoader);
  }, []);

  useEffect(() => {
    let activeRequestsCount = 0;
    let timeoutId: any = null;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      
      // Exclude background polling/interval endpoints
      const isBackground = 
        url.includes('/branches-agents/pending-counts') || 
        url.includes('/document-requests/pending-count') || 
        url.includes('/notifications/unread-count') ||
        url.includes('/sync-union-status') ||
        (url.includes('/notifications') && !url.includes('/read-all') && !url.includes('/read'));

      if (!isBackground) {
        activeRequestsCount++;
        if (activeRequestsCount === 1) {
          // Trigger the show-loader event after 150ms delay to avoid flickering on fast API responses
          timeoutId = setTimeout(() => {
            window.dispatchEvent(new CustomEvent('show-loader', { 
              detail: { show: true, message: 'جاري تحميل وتحديث البيانات...' } 
            }));
          }, 150);
        }
      }

      try {
        const response = await originalFetch(...args);
        if (response.status === 401 && !url.includes('/login') && !url.includes('/unlock-session')) {
          if (localStorage.getItem('token')) {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('is_session_locked');
            localStorage.removeItem('last_active_time');
            window.dispatchEvent(new Event('userLoggedOut'));
            window.location.href = '/login';
          }
        }
        return response;
      } finally {
        if (!isBackground) {
          activeRequestsCount--;
          if (activeRequestsCount === 0) {
            if (timeoutId) clearTimeout(timeoutId);
            window.dispatchEvent(new CustomEvent('show-loader', { detail: { show: false } }));
          }
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  const [authorizedDocuments, setAuthorizedDocuments] = useState<string[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [branchAgentId, setBranchAgentId] = useState<number | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [pendingDocsCount, setPendingDocsCount] = useState<number>(0);
  const [adminPendingCounts, setAdminPendingCounts] = useState<{
    new_agents: number;
    agent_requests: number;
    agency_cancellations: number;
    agent_profile_updates: number;
    employee_requests: number;
    employee_profile_updates: number;
    agent_transfers: number;
  }>({
    new_agents: 0,
    agent_requests: 0,
    agency_cancellations: 0,
    agent_profile_updates: 0,
    employee_requests: 0,
    employee_profile_updates: 0,
    agent_transfers: 0,
  });

  const fetchPendingDocsCount = async () => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr) return;

    try {
      const user = JSON.parse(userStr);
      const userId = user.id;
      const res = await fetch(`${API_BASE_URL}/document-requests/pending-count?user_id=${userId}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingDocsCount(data.count || 0);
      }
    } catch (error) {
      console.error('Error fetching pending docs count:', error);
    }
  };

  const hasPendingCountsAccess = isAdmin || (
    authorizedDocuments !== null && (
      authorizedDocuments.includes('إدارة الفروع والوكلاء') ||
      authorizedDocuments.includes('إدارة الموظفين') ||
      authorizedDocuments.includes('المحاسب المالي') ||
      authorizedDocuments.includes('الوكلاء الجدد') ||
      authorizedDocuments.includes('طلبات الوكلاء') ||
      authorizedDocuments.includes('إلغاء الوكالات') ||
      authorizedDocuments.includes('طلبات تعديل بيانات الوكلاء') ||
      authorizedDocuments.includes('طلبات الموظفين') ||
      authorizedDocuments.includes('طلبات تعديل بيانات الموظفين') ||
      authorizedDocuments.includes('حوالات الوكلاء المالية')
    )
  );

  const fetchAdminPendingCounts = async () => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!userStr) return;

    try {
      const user = JSON.parse(userStr);
      const hasAccess = user.is_admin || (
        Array.isArray(user.authorized_documents) && (
          user.authorized_documents.includes('إدارة الفروع والوكلاء') ||
          user.authorized_documents.includes('إدارة الموظفين') ||
          user.authorized_documents.includes('المحاسب المالي') ||
          user.authorized_documents.includes('الوكلاء الجدد') ||
          user.authorized_documents.includes('طلبات الوكلاء') ||
          user.authorized_documents.includes('إلغاء الوكالات') ||
          user.authorized_documents.includes('طلبات تعديل بيانات الوكلاء') ||
          user.authorized_documents.includes('طلبات الموظفين') ||
          user.authorized_documents.includes('طلبات تعديل بيانات الموظفين') ||
          user.authorized_documents.includes('حوالات الوكلاء المالية')
        )
      );
      if (!hasAccess) return;

      const userId = user.id;
      const res = await fetch(`${API_BASE_URL}/branches-agents/pending-counts?user_id=${userId}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminPendingCounts(data);
      }
    } catch (error) {
      console.error('Error fetching admin pending counts:', error);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      fetchPendingDocsCount();
      const interval = setInterval(fetchPendingDocsCount, 30000);

      const handleUpdate = () => {
        fetchPendingDocsCount();
      };
      const handleFocus = () => {
        if (document.visibilityState === 'visible') {
          fetchPendingDocsCount();
        }
      };
      window.addEventListener('documentRequestsUpdated', handleUpdate);
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleFocus);

      return () => {
        clearInterval(interval);
        window.removeEventListener('documentRequestsUpdated', handleUpdate);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleFocus);
      };
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId && hasPendingCountsAccess) {
      fetchAdminPendingCounts();
      const interval = setInterval(fetchAdminPendingCounts, 30000);

      const handleUpdate = () => {
        fetchAdminPendingCounts();
      };
      window.addEventListener('adminPendingCountsUpdated', handleUpdate);

      return () => {
        clearInterval(interval);
        window.removeEventListener('adminPendingCountsUpdated', handleUpdate);
      };
    }
  }, [currentUserId, hasPendingCountsAccess]);

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
        // لا نحتاج للتحديث إذا كان المستخدم وكيلاً (بياناتهم عادة لا تتغير من قسم الموظفين)، ما عدا مستخدمي المكتب الفرعيين لمزامنة صلاحياتهم
        if (user.branch_agent_id && !user.lifo_user_id && (!user.lifo_permissions || user.lifo_permissions.length === 0)) return;

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
            window.dispatchEvent(new Event('userPermissionsUpdated'));
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
      return createMenuSections(authorizedDocuments, isAdmin, branchAgentId, currentUserId, pendingDocsCount, adminPendingCounts);
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
      <SessionLockScreen />
      <Routes>
        {/* Public Website Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/investments" element={<CompanyInvestments />} />
        <Route path="/media/:type" element={<MediaCenter />} />
        <Route path="/media/:type/:id" element={<MediaCenter />} />
        <Route path="/management" element={<Navigate to="/management/work-team" replace />} />
        <Route path="/management/work-team" element={<DepartmentView />} />
        <Route path="/management/department/:id" element={<DepartmentView />} />
        <Route path="/website/branches-agents" element={<BranchesAgentsPage />} />
        <Route path="/insurances" element={<InsurancesPage />} />
        <Route path="/contact-us" element={<ContactUs />} />

        {/* Admin Login */}
        <Route path="/login" element={<Login />} />

        {/* Protected Admin Routes - all other paths */}
        <Route path="/*" element={
          <ProtectedRoute>
            <div className={`app-shell ${isSidebarOpen ? 'is-sidebar-open' : 'is-sidebar-closed'}`}>
              <LoaderOverlay show={globalLoading} message={globalLoadingMessage} />
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
                  <Route path="/company-documents" element={<AuthorizedRoute requiredPath="/company-documents"><CompanyDocuments /></AuthorizedRoute>} />
                  <Route path="/excel-import" element={isAdmin ? <ExcelImportPage /> : <Navigate to="/dashboard" />} />
                  <Route path="/dashboard" element={<DashboardPanels />} />
                  <Route path="/notifications" element={<NotificationsPage />} />

                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/old-documents" element={<AuthorizedRoute requiredPath="/old-documents"><OldDocumentsManagement /></AuthorizedRoute>} />
                  <Route path="/office-users" element={<OfficeUsers />} />
                  <Route path="/profile-update-requests" element={<AuthorizedRoute requiredPath="/profile-update-requests"><ProfileUpdateRequestsList /></AuthorizedRoute>} />
                  <Route path="/users" element={<AuthorizedRoute requiredPath="/users"><UsersList /></AuthorizedRoute>} />
                  <Route path="/departments" element={<AuthorizedRoute requiredPath="/departments"><DepartmentsList /></AuthorizedRoute>} />
                  <Route path="/employee-requests" element={<AuthorizedRoute requiredPath="/employee-requests"><AllEmployeeRequests /></AuthorizedRoute>} />
                  <Route path="/users/:id" element={<EmployeeProfile />} />
                  <Route path="/agent-requests" element={<AuthorizedRoute requiredPath="/agent-requests"><AllAgentRequests /></AuthorizedRoute>} />
                  <Route path="/agency-cancellations" element={<AuthorizedRoute requiredPath="/agency-cancellations"><AgencyCancellations /></AuthorizedRoute>} />

                  <Route path="/document-requests" element={<AuthorizedRoute requiredPath="/document-requests"><DocumentRequestsList /></AuthorizedRoute>} />
                  {/* إدارة الفروع والوكلاء */}
                  <Route path="/branches-agents" element={<AuthorizedRoute requiredPath="/branches-agents"><BranchesAgentsList /></AuthorizedRoute>} />
                  <Route path="/branches-agents/create" element={<AuthorizedRoute requiredPath="/branches-agents"><CreateBranchAgent /></AuthorizedRoute>} />
                  <Route path="/branches-agents/:id" element={<AuthorizedRoute><BranchAgentDetails /></AuthorizedRoute>} />
                  <Route path="/branches-agents/:id/edit" element={<AuthorizedRoute><EditBranchAgent /></AuthorizedRoute>} />
                  {/* إدارة المدن */}
                  <Route path="/cities" element={<AuthorizedRoute requiredPath="/cities"><CitiesList /></AuthorizedRoute>} />
                  {/* إدارة اللوحات */}
                  <Route path="/plates" element={<AuthorizedRoute requiredPath="/plates"><PlatesList /></AuthorizedRoute>} />
                  {/* إدارة الألوان */}
                  <Route path="/colors" element={<AuthorizedRoute requiredPath="/colors"><ColorsList /></AuthorizedRoute>} />
                  {/* إدارة أنواع السيارات */}
                  <Route path="/vehicle-types" element={<AuthorizedRoute requiredPath="/vehicle-types"><VehicleTypesList /></AuthorizedRoute>} />
                  {/* إعدادات نقاط الولاء للوكلاء */}
                  <Route path="/settings/loyalty" element={isAdmin ? <LoyaltySettings /> : <Navigate to="/dashboard" />} />
                  <Route path="/website-settings" element={isAdmin ? <WebsiteSettingsManagement /> : <Navigate to="/dashboard" />} />
                  <Route path="/public-insurance-requests" element={isAdmin ? <PublicInsuranceRequestsList /> : <Navigate to="/dashboard" />} />
                  {/* إدارة وثائق تأمين السيارات */}
                  <Route path="/insurance-documents" element={<AuthorizedRoute requiredPath="/insurance-documents"><InsuranceDocumentsList /></AuthorizedRoute>} />
                  <Route path="/canceled-documents" element={<AuthorizedRoute requiredPath="/canceled-documents"><CanceledDocumentsList /></AuthorizedRoute>} />
                  <Route path="/insurance-documents/create" element={<AuthorizedRoute requiredPath="/insurance-documents"><CreateInsuranceDocument /></AuthorizedRoute>} />
                  <Route path="/insurance-documents/:id" element={<AuthorizedRoute requiredPath="/insurance-documents"><ViewInsuranceDocument /></AuthorizedRoute>} />
                  <Route path="/insurance-documents/:id/edit" element={<AuthorizedRoute requiredPath="/insurance-documents"><EditInsuranceDocument /></AuthorizedRoute>} />
                  <Route path="/insurance-documents/:id/transfer-ownership" element={<AuthorizedRoute requiredPath="/insurance-documents"><TransferOwnershipInsuranceDocument /></AuthorizedRoute>} />
                  {/* إدارة تأمين السيارات الدولي */}
                  <Route path="/international-insurance-documents" element={<AuthorizedRoute requiredPath="/international-insurance-documents"><InternationalInsuranceList /></AuthorizedRoute>} />
                  <Route path="/international-insurance-documents/lifo-dashboard" element={<AuthorizedRoute requiredPath="/international-insurance-documents"><LifoReportsDashboard /></AuthorizedRoute>} />
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

                  {/* المصارف والخزنة */}
                  <Route path="/reports/treasury-banks" element={<AuthorizedRoute requiredPath="/reports/treasury-banks"><TreasuryAndBanksPage /></AuthorizedRoute>} />
                  {/* المطابقة والتحصيلات المالية */}
                  <Route path="/reports/financial-reconciliation" element={<AuthorizedRoute requiredPath="/reports/financial-reconciliation"><TreasuryAndBanksPage hideExpenses={true} /></AuthorizedRoute>} />
                  {/* تقارير */}
                  <Route path="/reports/financial-statistics" element={<AuthorizedRoute requiredPath="/reports/financial-statistics"><FinancialStatistics /></AuthorizedRoute>} />
                  <Route path="/reports/revenue" element={<AuthorizedRoute requiredPath="/reports/revenue"><RevenueManagement /></AuthorizedRoute>} />
                  <Route path="/reports/live-agents-production" element={<AuthorizedRoute requiredPath="/reports/live-agents-production"><LiveAgentsProduction /></AuthorizedRoute>} />
                  <Route path="/reports/agent-monthly-ledger" element={<AuthorizedRoute requiredPath="/reports/agent-monthly-ledger"><AgentMonthlyLedger /></AuthorizedRoute>} />
                  <Route path="/reports/comprehensive-production" element={<AuthorizedRoute requiredPath="/reports/agent-monthly-ledger"><ComprehensiveProductionReport /></AuthorizedRoute>} />
                  <Route path="/reports/branch-agent-account" element={<AuthorizedRoute requiredPath="/reports/branch-agent-account"><BranchAgentAccountReport /></AuthorizedRoute>} />
                  <Route path="/reports/agent-transfers" element={<AuthorizedRoute requiredPath="/reports/agent-transfers"><AgentTransfers /></AuthorizedRoute>} />
                  <Route path="/agent-transfers" element={<AuthorizedRoute requiredPath="/agent-transfers"><AgentTransfers /></AuthorizedRoute>} />
                  <Route path="/reports/monthly-account-closure" element={<AuthorizedRoute requiredPath="/reports/monthly-account-closure"><MonthlyAccountClosure /></AuthorizedRoute>} />
                  <Route path="/reports/monthly-account-closures-report" element={<AuthorizedRoute requiredPath="/reports/monthly-account-closures-report"><MonthlyAccountClosuresReport /></AuthorizedRoute>} />
                  <Route path="/reports/payment-vouchers" element={<AuthorizedRoute requiredPath="/reports/payment-vouchers"><PaymentVouchers /></AuthorizedRoute>} />
                  <Route path="/reports/commissions" element={<AuthorizedRoute requiredPath="/reports/commissions"><CommissionManagement /></AuthorizedRoute>} />
                  <Route path="/reports/bank-reconciliation" element={<AuthorizedRoute requiredPath="/reports/bank-reconciliation"><BankReconciliation /></AuthorizedRoute>} />
                  <Route path="/reports/outstanding-debts" element={<AuthorizedRoute requiredPath="/reports/outstanding-debts"><OutstandingDebts /></AuthorizedRoute>} />
                  <Route path="/reports/financial-archive" element={<AuthorizedRoute requiredPath="/reports/financial-archive"><FinancialArchive /></AuthorizedRoute>} />
                  <Route path="/reports/inventory" element={<AuthorizedRoute requiredPath="/reports/inventory"><InventoryManagement /></AuthorizedRoute>} />
                  <Route path="/reports/employee-salaries" element={<AuthorizedRoute requiredPath="/reports/employee-salaries"><EmployeeSalaries /></AuthorizedRoute>} />
                  <Route path="/reports/tax" element={<AuthorizedRoute requiredPath="/reports/tax"><TaxSSReport type="tax" /></AuthorizedRoute>} />
                  <Route path="/reports/social-security" element={<AuthorizedRoute requiredPath="/reports/social-security"><TaxSSReport type="social_security" /></AuthorizedRoute>} />
                  <Route path="/reports/expenses" element={<AuthorizedRoute requiredPath="/reports/expenses"><ExpenseManagement activeTabOverride="expenses" /></AuthorizedRoute>} />
                  <Route path="/reports/expenses/:id" element={<AuthorizedRoute requiredPath="/reports/expenses"><ViewExpenseDetails /></AuthorizedRoute>} />
                  <Route path="/reports/indemnities" element={<AuthorizedRoute requiredPath="/reports/indemnities"><CompensationsList /></AuthorizedRoute>} />
                  <Route path="/reports/finance-claims" element={<AuthorizedRoute requiredPath="/reports/finance-claims"><FinanceClaimsList /></AuthorizedRoute>} />
                  <Route path="/reports/union-balances" element={<AuthorizedRoute requiredPath="/reports/union-balances"><ExpenseManagement activeTabOverride="union" /></AuthorizedRoute>} />
                  {/* ورقة الإيجارات */}
                  <Route path="/reports/rental-vouchers" element={<AuthorizedRoute requiredPath="/reports/rental-vouchers"><RentalVouchersList /></AuthorizedRoute>} />
                  <Route path="/reports/rental-vouchers/create" element={<AuthorizedRoute requiredPath="/reports/rental-vouchers"><CreateRentalVoucher /></AuthorizedRoute>} />
                  <Route path="/reports/rental-vouchers/:id" element={<AuthorizedRoute requiredPath="/reports/rental-vouchers"><RentalVoucherDetails /></AuthorizedRoute>} />
                  <Route path="/reports/rental-vouchers/:id/edit" element={<AuthorizedRoute requiredPath="/reports/rental-vouchers"><EditRentalVoucher /></AuthorizedRoute>} />
                  {/* اختبار API */}
                  <Route path="/test-car-info-api" element={<TestCarInfoAPI />} />
                  <Route path="/test-lifo-login" element={<TestLifoLogin />} />
                  {/* الأرشيف */}
                  <Route path="/archive" element={<AuthorizedRoute requiredPath="/archive"><ArchiveDashboard /></AuthorizedRoute>} />
                  <Route path="/external-entities" element={<AuthorizedRoute requiredPath="/external-entities"><ExternalEntitiesManagement /></AuthorizedRoute>} />
                  <Route path="/mail/:type" element={<AuthorizedRoute><MailManagement /></AuthorizedRoute>} />
                  <Route path="/mail/view/:id" element={<AuthorizedRoute><ViewMailDocument /></AuthorizedRoute>} />

                  <Route path="/claims" element={<AuthorizedRoute requiredPath="/claims"><ClaimsList /></AuthorizedRoute>} />
                  <Route path="/claims/:id" element={<AuthorizedRoute requiredPath="/claims"><ViewClaim /></AuthorizedRoute>} />
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
