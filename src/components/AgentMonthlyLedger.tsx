import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel, generateGroupedDocsExcel } from '../utils/excelGenerator';
import CustomDateInput from './CustomDateInput';

const ARABIC_MONTHS_LDG = [
  'يناير','فبراير','مارس','أبريل','مايو','يونيو',
  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'
];
function ldgArabicMonth(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const m = parseInt(parts[1], 10);
  if (m < 1 || m > 12) return '';
  return `${ARABIC_MONTHS_LDG[m-1]} ${parts[0]}`;
}

interface MonthRow {
  closure_id: number | null;
  year: number;
  month: number;
  month_label: string;
  month_key: string;
  from_date: string;
  to_date: string;
  percentage: number;
  document_count: number;
  active_count?: number;
  expired_count?: number;
  canceled_count?: number;
  total_sales: number;
  agent_share: number;
  company_share: number;
  carried_balance: number;
  paid_amount: number;
  remaining: number;
  notes: string | null;
  is_audited?: boolean;
}

interface AgentInfo {
  id: number;
  code: string;
  agency_name: string;
  agent_name: string;
  contract_date: string | null;
  first_doc_date?: string | null;
  last_doc_date?: string | null;
  contract_end_date?: string | null;
  status?: string | null;
  notes?: string | null;
  is_audited?: boolean;
}

interface LedgerSummary {
  total_months: number;
  total_documents: number;
  active_documents?: number;
  expired_documents?: number;
  canceled_documents?: number;
  total_sales: number;
  total_agent_share: number;
  total_company_share: number;
  total_paid: number;
  total_remaining: number;
  total_canceled_count?: number;
  total_canceled_value?: number;
}

interface LedgerData {
  success: boolean;
  agent: AgentInfo;
  months: MonthRow[];
  summary: LedgerSummary;
}

interface BranchAgent {
  id: number;
  code: string;
  agency_name: string;
  agent_name: string;
}

interface MonthDocItem {
  id: number;
  table: string;
  document_type: string;
  type_label: string;
  document_number: string;
  insured_name: string;
  issue_date: string;
  start_date: string;
  end_date: string;
  premium: number;
  total: number;
  percentage: number;
  agent_share: number;
  company_share: number;
  is_old_document: boolean;
  status: string;
  notes?: string | null;
}

interface MonthDocsSummary {
  total_documents: number;
  active_documents?: number;
  expired_documents?: number;
  canceled_documents?: number;
  total_sales: number;
  total_agent_share: number;
  total_company_share: number;
}

export default function AgentMonthlyLedger() {
  const [agents, setAgents] = useState<BranchAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [excludeCanceled, setExcludeCanceled] = useState(false);
  const [onlyActiveMonths, setOnlyActiveMonths] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState('all');
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [payModal, setPayModal] = useState<{ row: MonthRow } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Audit / Verification State
  const [togglingMonthKey, setTogglingMonthKey] = useState<string | null>(null);

  // Month Documents Modal State
  const [monthDocsModal, setMonthDocsModal] = useState<{ row: MonthRow } | null>(null);
  const [monthDocsList, setMonthDocsList] = useState<MonthDocItem[]>([]);
  const [monthDocsSummary, setMonthDocsSummary] = useState<MonthDocsSummary | null>(null);
  const [loadingMonthDocs, setLoadingMonthDocs] = useState(false);
  const [searchMonthDocs, setSearchMonthDocs] = useState('');
  const [filterDocType, setFilterDocType] = useState('all');
  const [monthStatusFilter, setMonthStatusFilter] = useState<'all' | 'active' | 'expired' | 'canceled'>('all');
  const [exportingDocsExcel, setExportingDocsExcel] = useState(false);

  // Edit Document state
  const [editDocModal, setEditDocModal] = useState<MonthDocItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [editPremium, setEditPremium] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Delete Document state
  const [deleteDocTarget, setDeleteDocTarget] = useState<MonthDocItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Quick Add Old Document Modal State
  const [quickAddModal, setQuickAddModal] = useState(false);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickDocType, setQuickDocType] = useState('compulsory');
  const [quickIssueDate, setQuickIssueDate] = useState('');
  const [quickStartDate, setQuickStartDate] = useState('');
  const [quickEndDate, setQuickEndDate] = useState('');
  const [quickDocNumber, setQuickDocNumber] = useState('');
  const [quickInsuredName, setQuickInsuredName] = useState('');
  const [quickChassisNumber, setQuickChassisNumber] = useState('');
  const [quickPlateNumberManual, setQuickPlateNumberManual] = useState('');
  const [quickLicensePurpose, setQuickLicensePurpose] = useState('خاصة/Private');
  const [quickEnginePower, setQuickEnginePower] = useState('أقل من (16) حصان');
  const [quickPremium, setQuickPremium] = useState('64.000');
  const [quickTax, setQuickTax] = useState('1.000');
  const [quickStamp, setQuickStamp] = useState('0.500');
  const [quickIssueFees, setQuickIssueFees] = useState('2.000');
  const [quickSupervisionFees, setQuickSupervisionFees] = useState('0.500');
  const [quickTotal, setQuickTotal] = useState('68.000');

  // Searchable Dropdown State
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [agentSearchText, setAgentSearchText] = useState('');
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  // Agent Quick Actions State (Full Comprehensive Details & Edit)
  const [agentDetailsModal, setAgentDetailsModal] = useState<any | null>(null);
  const [agentDetailsTab, setAgentDetailsTab] = useState<'agency' | 'contact' | 'permissions' | 'wallet' | 'custody' | 'stats'>('agency');
  const [agentDetailsLoading, setAgentDetailsLoading] = useState(false);

  const [agentEditModal, setAgentEditModal] = useState<any | null>(null);
  const [agentEditTab, setAgentEditTab] = useState<number>(0);
  const [agentEditLoading, setAgentEditLoading] = useState(false);
  const [agentEditForm, setAgentEditForm] = useState<Record<string, any>>({});
  const [agentEditFiles, setAgentEditFiles] = useState<Record<string, File | null>>({});
  const [agentBlockLoading, setAgentBlockLoading] = useState(false);
  const [isAgentBlocked, setIsAgentBlocked] = useState<boolean>(false);

  // Exceptional Percentages for Edit Modal
  const [editOverrideYear, setEditOverrideYear] = useState<string>(new Date().getFullYear().toString());
  const [editOverrideMonth, setEditOverrideMonth] = useState<string>((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [editOverrideDocType, setEditOverrideDocType] = useState<string>('');
  const [editOverridePercentage, setEditOverridePercentage] = useState<number>(0);

  const [editPeriodStartDate, setEditPeriodStartDate] = useState<string>('');
  const [editPeriodEndDate, setEditPeriodEndDate] = useState<string>('');
  const [editPeriodDocType, setEditPeriodDocType] = useState<string>('');
  const [editPeriodPercentage, setEditPeriodPercentage] = useState<number>(0);

  const AGENT_CITIES = [
    'طرابلس', 'بنغازي', 'مصراتة', 'سبها', 'زليتن', 'البيضاء', 'أجدابيا', 'درنة', 'طبرق', 'صبراتة',
    'زوارة', 'غريان', 'يفرن', 'الخمس', 'ترهونة', 'بني وليد', 'سرت', 'هون', 'وادي الشاطئ', 'غات',
    'أوباري', 'مرزق', 'الكفرة', 'الجغبوب'
  ];

  const AGENT_ACTIVITIES_LIST = [
    'تحرير العقود والخدمات القانونية',
    'خدمات عامة ورجال الاعمال',
    'خدمات حجز تذاكر سفر',
    'خدمات تصوير وبيع قرطاسية',
    'خدمات بيع وشراء العقارات',
    'خدمات المحاماة',
    'خدمات تامين السيارات الدولي تونس',
  ];

  const AGENT_INSURANCE_DOCS = [
    'تأمين سيارات إجباري',
    'تأمين سيارة جمرك',
    'تأمين سيارات أجنبية',
    'تأمين طرف ثالث سيارات',
    'تأمين سيارات دولي',
    'تأمين المسافرين',
    'تأمين الهياكل البحرية',
    'تأمين زائرين ليبيا',
    'تأمين الوافدين',
    'تأمين المسؤولية المهنية (الطبية)',
    'تأمين الحوادث الشخصية',
    'تأمين حماية طلاب المدارس',
    'تأمين نقل النقدية',
    'تأمين شحن البضائع',
  ];

  const AGENT_REPORT_PERMS = [
    'كشف حساب الوكيل',
    'إغلاق حساب شهري',
    'كشف إغلاق الحساب الشهري',
    'إيصالات القبض',
    'إدارة المصروفات التشغيلية',
    'التعويضات',
    'رصيد الاتحاد (البطاقة البرتقالية)',
    'التسويات والعمولات',
    'الديون المستحقة',
    'الأرشيف المالي',
    'المخازن والعهدة',
    'الإحصائيات المالية',
    'مرتبات الموظفين',
    'تقرير مصلحة الضرائب',
    'تقرير الضمان الاجتماعي',
  ];

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ===================== Agent Quick Action Helpers =====================
  const resolveAgentPublicUrl = (path: string | null | undefined): string => {
    if (!path) return '';
    const BACKEND_URL = (window as any).__BACKEND_URL__ || '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/storage/')) return `${BACKEND_URL}${path}`;
    if (path.startsWith('storage/')) return `${BACKEND_URL}/${path}`;
    if (path.startsWith('/img/')) return `${window.location.origin}${path}`;
    if (path.startsWith('img/')) return `${window.location.origin}/${path}`;
    return `${BACKEND_URL}/storage/${path}`;
  };

  const fetchAgentFullData = async (agentId: number) => {
    setAgentDetailsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/branches-agents/${agentId}`, {
        headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data;
    } catch {
      showToast('حدث خطأ أثناء جلب بيانات الوكيل', 'error');
      return null;
    } finally {
      setAgentDetailsLoading(false);
    }
  };

  const handleOpenAgentDetails = async () => {
    if (!selectedAgentId) return;
    const data = await fetchAgentFullData(selectedAgentId);
    if (data) {
      setAgentDetailsModal(data);
      setAgentDetailsTab('agency');
    }
  };

  const handleOpenAgentEdit = async () => {
    if (!selectedAgentId) return;
    setAgentDetailsLoading(true);
    const data = await fetchAgentFullData(selectedAgentId);
    if (data) {
      setAgentEditModal(data);
      setAgentEditTab(0);
      setAgentEditFiles({});

      // Parse authorized documents and percentages
      let authDocs = data.authorized_documents || [];
      if (typeof authDocs === 'string') {
        try { authDocs = JSON.parse(authDocs); } catch { authDocs = []; }
      }
      let docPct = data.document_percentages || {};
      if (typeof docPct === 'string') {
        try { docPct = JSON.parse(docPct); } catch { docPct = {}; }
      }

      setAgentEditForm({
        type: data.type || 'وكيل',
        activity: data.activity || '',
        agency_name: data.agency_name || '',
        agent_name: data.agent_name || '',
        agency_number: data.agency_number || '',
        stamp_number: data.stamp_number || '',
        contract_date: data.contract_date ? data.contract_date.substring(0, 10) : '',
        renewal_date: data.renewal_date ? data.renewal_date.substring(0, 10) : '',
        contract_end_date: data.contract_end_date ? data.contract_end_date.substring(0, 10) : '',
        contract_duration: data.contract_duration || '',
        city: data.city || '',
        address: data.address || '',
        phone: data.phone || '',
        office_phone: data.office_phone || '',
        office_location: data.office_location || '',
        nationality: data.nationality || '',
        national_id: data.national_id || '',
        identity_number: data.identity_number || '',
        username: data.user?.username || '',
        password: '',
        notes: data.notes || '',
        contract_conditions: data.contract_conditions || '',
        status: data.status || 'نشط',
        authorized_documents: Array.isArray(authDocs) ? authDocs : [],
        document_percentages: docPct,
        eidc_username: data.user?.eidc_username || '',
        eidc_password: '',
        lifo_username: data.user?.lifo_username || '',
        lifo_password: '',
        lifo_office_id: data.user?.lifo_office_id || '',
      });
    }
    setAgentDetailsLoading(false);
  };

  const handleToggleAuthDoc = (docType: string) => {
    setAgentEditForm(prev => {
      const currentDocs = prev.authorized_documents || [];
      const exists = currentDocs.includes(docType);
      const newDocs = exists ? currentDocs.filter((d: string) => d !== docType) : [...currentDocs, docType];
      
      const pct = { ...(prev.document_percentages || {}) };
      const def = { ...(pct.default || (pct.monthly_overrides || pct.period_overrides ? {} : pct)) };
      if (!exists && def[docType] === undefined) {
        def[docType] = 0;
      }
      return {
        ...prev,
        authorized_documents: newDocs,
        document_percentages: {
          ...pct,
          default: def
        }
      };
    });
  };

  const handleEditDocPercentageChange = (docType: string, val: number) => {
    setAgentEditForm(prev => {
      const pct = { ...(prev.document_percentages || {}) };
      const def = { ...(pct.default || (pct.monthly_overrides || pct.period_overrides ? {} : pct)) };
      def[docType] = val;
      return {
        ...prev,
        document_percentages: {
          ...pct,
          default: def
        }
      };
    });
  };

  const handleAddEditMonthlyOverride = () => {
    if (!editOverrideDocType) {
      showToast('يرجى اختيار نوع التأمين', 'error');
      return;
    }
    const monthKey = `${editOverrideYear}-${editOverrideMonth}`;
    setAgentEditForm(prev => {
      const pct = { ...(prev.document_percentages || {}) };
      const monthlyPct = { ...(pct.monthly_overrides || {}) };
      if (!monthlyPct[monthKey]) monthlyPct[monthKey] = {};
      monthlyPct[monthKey][editOverrideDocType] = editOverridePercentage;
      return {
        ...prev,
        document_percentages: {
          ...pct,
          monthly_overrides: monthlyPct
        }
      };
    });
    setEditOverrideDocType('');
    setEditOverridePercentage(0);
    showToast(`تمت إضافة النسبة الاستثنائية لشهر ${monthKey}`, 'success');
  };

  const handleRemoveEditMonthlyOverride = (monthKey: string, docType: string) => {
    setAgentEditForm(prev => {
      const pct = { ...(prev.document_percentages || {}) };
      const monthlyPct = { ...(pct.monthly_overrides || {}) };
      if (monthlyPct[monthKey]) {
        const copy = { ...monthlyPct[monthKey] };
        delete copy[docType];
        if (Object.keys(copy).length === 0) {
          delete monthlyPct[monthKey];
        } else {
          monthlyPct[monthKey] = copy;
        }
      }
      return {
        ...prev,
        document_percentages: {
          ...pct,
          monthly_overrides: monthlyPct
        }
      };
    });
  };

  const handleAddEditPeriodOverride = () => {
    if (!editPeriodStartDate || !editPeriodEndDate || !editPeriodDocType) {
      showToast('يرجى إكمال بيانات الفترة ونوع التأمين', 'error');
      return;
    }
    setAgentEditForm(prev => {
      const pct = { ...(prev.document_percentages || {}) };
      const periods = Array.isArray(pct.period_overrides) ? [...pct.period_overrides] : [];
      periods.push({
        id: Date.now().toString(),
        start_date: editPeriodStartDate,
        end_date: editPeriodEndDate,
        doc_type: editPeriodDocType,
        percentage: editPeriodPercentage
      });
      return {
        ...prev,
        document_percentages: {
          ...pct,
          period_overrides: periods
        }
      };
    });
    setEditPeriodStartDate('');
    setEditPeriodEndDate('');
    setEditPeriodDocType('');
    setEditPeriodPercentage(0);
    showToast('تمت إضافة النسبة الاستثنائية للفترة', 'success');
  };

  const handleRemoveEditPeriodOverride = (id: string) => {
    setAgentEditForm(prev => {
      const pct = { ...(prev.document_percentages || {}) };
      const periods = (Array.isArray(pct.period_overrides) ? pct.period_overrides : []).filter((item: any) => item.id !== id);
      return {
        ...prev,
        document_percentages: {
          ...pct,
          period_overrides: periods
        }
      };
    });
  };

  const handleSaveAgentEdit = async () => {
    if (!agentEditModal) return;
    if (!agentEditForm.agency_name?.trim()) {
      showToast('اسم الوكالة مطلوب', 'error');
      return;
    }
    if (!agentEditForm.agent_name?.trim()) {
      showToast('اسم الوكيل مطلوب', 'error');
      return;
    }

    setAgentEditLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();

      Object.entries(agentEditForm).forEach(([key, val]) => {
        if (key === 'authorized_documents' || key === 'document_percentages') {
          formDataToSend.append(key, JSON.stringify(val));
        } else if (val !== null && val !== undefined && val !== '') {
          formDataToSend.append(key, val);
        }
      });

      // Append files if selected
      Object.entries(agentEditFiles).forEach(([key, file]) => {
        if (file) formDataToSend.append(key, file);
      });

      formDataToSend.append('_method', 'PUT');

      const res = await fetch(`${API_BASE_URL}/branches-agents/${agentEditModal.id}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formDataToSend
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'تم تحديث بيانات الوكيل بنجاح', 'success');
        setAgentEditModal(null);
        if (selectedAgentId) fetchLedger(selectedAgentId);
      } else {
        showToast(data.message || 'فشل في تحديث بيانات الوكيل', 'error');
      }
    } catch {
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setAgentEditLoading(false);
    }
  };

  const handleToggleAgentBlock = async () => {
    if (!selectedAgentId || !ledger) return;
    setAgentBlockLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/branches-agents/${selectedAgentId}/toggle-block`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        const nextBlocked = typeof data.is_blocked === 'boolean' ? data.is_blocked : !isAgentBlocked;
        setIsAgentBlocked(nextBlocked);
        setLedger(prev => prev ? {
          ...prev,
          agent: {
            ...prev.agent,
            status: nextBlocked ? 'غير نشط' : 'نشط',
            is_blocked: nextBlocked,
            user: { ...(prev.agent as any)?.user, is_blocked: nextBlocked }
          } as any
        } : null);
      } else {
        showToast(data.message || 'فشل في تحديث حالة الحظر', 'error');
      }
    } catch {
      showToast('حدث خطأ في الاتصال بالخادم', 'error');
    } finally {
      setAgentBlockLoading(false);
    }
  };

  const ldgPrintAgentA4 = async (agentId: number) => {
    const data = await fetchAgentFullData(agentId);
    if (!data) return;
    const ba = data;
    const photoSrc = ba.personal_photo ? resolveAgentPublicUrl(ba.personal_photo) : '';
    const logoSrc = resolveAgentPublicUrl('/img/logo3.png');
    const printDate = new Date().toLocaleString('ar-LY');
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) return;
    const permissionsHtml = (ba.authorized_documents || []).length > 0
      ? (ba.authorized_documents || []).map((p: string) => `<li>${p}</li>`).join('')
      : '<li>لا توجد صلاحيات محددة</li>';
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
      <title>بيانات وكيل - ${ba.agency_name}</title>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;box-sizing:border-box}@page{size:A4;margin:8mm}body{font-family:'Cairo',system-ui,sans-serif!important;color:#0f172a;margin:0;padding:0;line-height:1.3;background:#fff}.page-container{border:1px solid #cbd5e1;padding:8mm;position:relative;height:280mm;max-height:280mm;display:flex;flex-direction:column;overflow:hidden}.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;border-bottom:3px double #1e40af;padding-bottom:8px}.header-info h1{margin:0;color:#1e40af;font-size:1.5rem;font-weight:800}.header-info p{margin:1px 0 0;color:#64748b;font-size:.8rem;font-weight:600}.header-branding{display:flex;align-items:center;gap:6px}.brand-text{display:flex;flex-direction:column;align-items:center;line-height:1.2;white-space:nowrap}.brand-text div:first-child{font-size:13pt;font-weight:800;margin-bottom:2px;color:#139625;font-family:'Times New Roman',serif}.brand-text div:last-child{font-size:5.6pt;font-weight:800;font-family:'Times New Roman',serif;letter-spacing:0}.header-branding img{height:48px;width:auto}.content-body{display:flex;flex-direction:column;gap:6px}.profile-card{display:flex;gap:15px;background:#f8fafc!important;border:1px solid #cbd5e1;border-radius:12px;padding:12px;margin-bottom:8px;align-items:center}.photo-container{display:flex;flex-direction:column;align-items:center;gap:4px}.photo-box{width:110px;height:130px;border:3px solid #fff;border-radius:8px;overflow:hidden;background:#fff!important;box-shadow:0 4px 6px -1px rgba(0,0,0,.08)}.photo-box img{width:100%;height:100%;object-fit:cover}.photo-box .no-img{height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:.7rem}.photo-label{font-size:.68rem;font-weight:800;color:#64748b}.details-grid{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:6px 12px}.detail-item{display:flex;flex-direction:column;background:#fff!important;padding:8px 12px;border-radius:8px;border:1px solid #cbd5e1}.detail-label{font-size:.75rem;color:#64748b;font-weight:700;margin-bottom:2px}.detail-value{font-size:.9rem;color:#0f172a;font-weight:800;text-align:right}.detail-value.highlighted{color:#1e40af}.permissions-section{margin-top:15px;background:#eff6ff!important;padding:12px;border-radius:12px;border:1px solid #bfdbfe}.permissions-section h3{margin:0 0 6px;font-size:.9rem;color:#1e40af;font-weight:800}.permissions-section ul{margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;list-style:none}.permissions-section li{font-size:.76rem;color:#1e3a8a;font-weight:600;background:#fff!important;padding:3px 8px;border-radius:6px;border:1px solid #dbeafe}.footer{margin-top:auto;display:flex;justify-content:space-between;border-top:1px dashed #cbd5e1;padding-top:10px}.sig-block{text-align:center;width:45%}.sig-line{border-top:1px solid #475569;margin-top:30px;padding-top:4px;font-weight:700;color:#334155;font-size:.82rem}.print-date{position:absolute;bottom:2mm;left:8mm;font-size:.65rem;color:#94a3b8;font-weight:600}</style></head>
      <body>
      <div class="page-container">
        <div class="header">
          <div class="header-info"><h1>بيانات الوكيل المعتمد</h1><p>قسم الفروع والوكلاء</p></div>
          <div class="header-branding">
            <div class="brand-text"><div>المدار الليبي <span style="color:#1e40af">للتأمين</span></div><div><span style="color:#1e40af">ALMADAR</span> <span style="color:#139625">LIBYAN INSURANCE</span></div></div>
            <img src="${logoSrc}" alt="Logo" />
          </div>
        </div>
        <div class="content-body">
          <div class="profile-card">
            <div class="photo-container">
              <div class="photo-box">${photoSrc ? `<img src="${photoSrc}" alt="" />` : '<div class="no-img">لا توجد صورة</div>'}</div>
              <div class="photo-label">صورة الوكيل</div>
            </div>
            <div class="details-grid">
              <div class="detail-item"><span class="detail-label">اسم الوكالة</span><span class="detail-value highlighted">${ba.agency_name}</span></div>
              <div class="detail-item"><span class="detail-label">اسم الوكيل المسؤول</span><span class="detail-value">${ba.agent_name}</span></div>
              <div class="detail-item"><span class="detail-label">كود الوكيل</span><span class="detail-value">${ba.code}</span></div>
              <div class="detail-item"><span class="detail-label">رقم الترخيص</span><span class="detail-value">${ba.agency_number || ba.code}</span></div>
              <div class="detail-item"><span class="detail-label">المدينة</span><span class="detail-value">${ba.city || ba.address || '—'}</span></div>
              <div class="detail-item"><span class="detail-label">رقم الهاتف</span><span class="detail-value">${ba.phone || '—'}</span></div>
              <div class="detail-item"><span class="detail-label">الحالة</span><span class="detail-value" style="color:${ba.status === 'نشط' ? '#16a34a' : ba.status === 'غير نشط' ? '#dc2626' : '#ea580c'}">${ba.status}</span></div>
              <div class="detail-item"><span class="detail-label">نوع المنشأة</span><span class="detail-value">${ba.type}</span></div>
            </div>
          </div>
          <div class="permissions-section"><h3>الصلاحيات والأذونات الممنوحة:</h3><ul>${permissionsHtml}</ul></div>
        </div>
        <div class="footer">
          <div class="sig-block"><div class="sig-line">توقيع الوكيل المعتمد</div></div>
          <div class="sig-block"><div class="sig-line">مدير إدارة الفروع والوكلاء</div></div>
        </div>
        <div class="print-date">تاريخ الطباعة: ${printDate}</div>
      </div>
      <script>if(document.fonts){document.fonts.ready.then(function(){setTimeout(function(){window.print();},350);})}else{window.onload=function(){setTimeout(function(){window.print();},350);}}<\/script>
      </body></html>`);
    w.document.close();
  };

  const ldgPrintAgentIdCard = async (agentId: number) => {
    const data = await fetchAgentFullData(agentId);
    if (!data) return;
    const ba = data;
    const photoSrc = ba.personal_photo ? resolveAgentPublicUrl(ba.personal_photo) : '';
    const logoSrc = resolveAgentPublicUrl('/img/logo.png');
    const bgSvg = `data:image/svg+xml;utf8,<svg viewBox="0 0 830 540" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M428 0 C328 150 528 350 428 540 L408 540 C508 350 308 150 408 0 Z" fill="%23139625"/></svg>`;
    const w = window.open('', '_blank', 'width=520,height=420');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>بطاقة وكيل معتمد</title>
    <style>@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');@page{margin:0;size:85.6mm 53.98mm;}html,body{height:100%;margin:0;padding:0;overflow:hidden;}body{font-family:Cairo,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;background:#e2e8f0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}@media print{body{background:#fff!important;}}.card{width:85.6mm;height:53.98mm;box-sizing:border-box;background-color:#fff;background-image:url('${bgSvg}');background-size:cover;background-position:center;border-radius:8px;border:3px solid #1e40af;overflow:hidden;position:relative;box-shadow:0 4px 10px rgba(0,0,0,.1);display:flex;}.right-section{width:55%;height:100%;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:4mm 4mm 4mm 2mm;box-sizing:border-box;color:#1e293b;z-index:10;}.photo-circle{width:23mm;height:23mm;border-radius:50%;border:2px solid #139625;background:#fff;overflow:hidden;margin-bottom:4mm;box-shadow:0 4px 6px rgba(0,0,0,.15);display:flex;align-items:center;justify-content:center;}.photo-circle img{width:100%;height:100%;object-fit:cover;}.id-data{width:100%;display:flex;flex-direction:column;gap:1.5mm;padding:0 2mm;box-sizing:border-box;}.id-row{display:flex;justify-content:flex-start;gap:3mm;font-size:7.5pt;font-weight:700;}.id-row span:first-child{color:#1e40af;}.left-section{width:45%;height:100%;display:flex;flex-direction:column;align-items:center;padding:4mm;box-sizing:border-box;color:#1e293b;z-index:10;}.header-box{display:flex;flex-direction:column;align-items:center;justify-content:center;margin-top:6mm;width:100%;}.logo-wrapper{display:flex;align-items:center;justify-content:center;}.logo-wrapper img{height:18mm;width:auto;object-fit:contain;max-width:90%;}.employee-info{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;width:100%;}.emp-name{font-size:11pt;font-weight:800;color:#1e40af;margin-bottom:1mm;line-height:1.2;}.emp-role{font-size:8pt;font-weight:700;color:#139625;}.footer-note{font-size:5pt;color:#64748b;text-align:center;width:100%;margin-top:auto;}.badge-type{position:absolute;top:3mm;left:3mm;background:#1e40af;color:#fff;padding:1mm 2mm;border-radius:4px;font-size:6.5pt;font-weight:800;}</style></head>
    <body onload="window.print()">
      <div class="card">
        <div class="right-section">
          <div class="photo-circle">${photoSrc ? `<img src="${photoSrc}" alt="" />` : '<span style="font-size:7pt;color:#94a3b8">بلا صورة</span>'}</div>
          <div class="id-data">
            <div class="id-row"><span>رقم الوكالة:</span><span>${ba.agency_number || '—'}</span></div>
            <div class="id-row"><span>كود الوكيل:</span><span>${ba.code}</span></div>
            <div class="id-row"><span>الإصدار:</span><span>${new Date().toLocaleDateString('en-GB')}</span></div>
          </div>
        </div>
        <div class="left-section">
          <div class="badge-type">بطاقة وكيل معتمد</div>
          <div class="header-box"><div class="logo-wrapper"><img src="${logoSrc}" alt="Logo" /></div></div>
          <div class="employee-info"><div class="emp-name">${ba.agent_name}</div><div class="emp-role">وكيل معتمد</div></div>
          <div class="footer-note">إدارة الفروع والوكلاء - المدار الليبي للتأمين</div>
        </div>
      </div>
    </body></html>`);
    w.document.close();
  };

  const ldgPrintAgentContract = (agentId: number) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.src = `${API_BASE_URL}/branches-agents/${agentId}/print?t=${new Date().getTime()}`;
    document.body.appendChild(iframe);
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 5000);
  };

  const ldgPrintAgentPermit = (agentId: number) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.src = `${API_BASE_URL}/branches-agents/${agentId}/print-permit?t=${new Date().getTime()}`;
    document.body.appendChild(iframe);
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 5000);
  };

  const ldgPrintProductionReport = (agentId: number) => {
    let url = `${API_BASE_URL}/branches-agents/${agentId}/production-portfolio-report-print?t=${new Date().getTime()}`;
    if (selectedDocType && selectedDocType !== 'all') {
      url += `&document_type=${selectedDocType}`;
    }
    if (excludeCanceled) {
      url += `&exclude_canceled=1`;
    }
    window.open(url, '_blank');
  };
  // ===================== End Agent Quick Action Helpers =====================

  const statCardBase: React.CSSProperties = {
    borderRadius: '18px',
    padding: '22px 24px',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.18)',
    transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
    cursor: 'default',
    boxShadow: '0 8px 25px rgba(0,0,0,0.08)',
  };

  const LEDGER_DOC_TYPES = [
    { key: 'all', label: 'جميع أنواع التأمين (الكل)' },
    { key: 'insurance_documents', label: 'تأمين سيارات' },
    { key: 'international_insurance_documents', label: 'تأمين سيارات دولي' },
    { key: 'travel_insurance_documents', label: 'تأمين المسافرين' },
    { key: 'resident_insurance_documents', label: 'تأمين الوافدين' },
    { key: 'marine_structure_insurance_documents', label: 'تأمين الهياكل البحرية' },
    { key: 'professional_liability_insurance_documents', label: 'تأمين المسؤولية المهنية' },
    { key: 'personal_accident_insurance_documents', label: 'تأمين الحوادث الشخصية' },
    { key: 'school_student_insurance_documents', label: 'تأمين طلاب المدارس' },
    { key: 'cargo_insurance_documents', label: 'تأمين شحن البضائع' },
    { key: 'cash_in_transit_insurance_documents', label: 'تأمين نقل النقدية' },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setIsAgentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const loadAgents = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/branches-agents`, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const d = await res.json();
          const list = Array.isArray(d) ? d : (d.data || []);
          setAgents(list);
        } else {
          showToast(`فشل في جلب قائمة الوكلاء (${res.status})`, 'error');
        }
      } catch (err) {
        console.error('branches-agents fetch error:', err);
        showToast('خطأ في الاتصال بالخادم', 'error');
      }
    };
    loadAgents();
  }, []);

  const fetchLedger = async (agentId: number, exclude?: boolean, docType?: string) => {
    const ex = exclude !== undefined ? exclude : excludeCanceled;
    const dt = docType !== undefined ? docType : selectedDocType;
    setLoading(true);
    setLedger(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/financial-statistics/agent-monthly-ledger?agent_id=${agentId}&exclude_canceled=${ex}&document_type=${dt}`,
        { headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      if (!res.ok) throw new Error();
      const data: LedgerData = await res.json();
      setLedger(data);
      setIsAgentBlocked(Boolean((data.agent as any)?.user?.is_blocked || (data.agent as any)?.is_blocked || data.agent?.status === 'غير نشط'));
    } catch {
      showToast('حدث خطأ أثناء جلب كشف الحساب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDocTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedDocType(val);
    if (selectedAgentId) {
      fetchLedger(selectedAgentId, undefined, val);
    }
  };

  const handleExcludeToggle = () => {
    const next = !excludeCanceled;
    setExcludeCanceled(next);
    if (selectedAgentId) fetchLedger(selectedAgentId, next);
  };


  const openPay = (row: MonthRow) => {
    setPayModal({ row });
    const due = row.company_share + row.carried_balance - row.paid_amount;
    setPayAmount(due > 0 ? due.toFixed(2) : '0');
    setPayNotes(row.notes || '');
  };

  const toggleMonthAuditStatus = async (row: MonthRow) => {
    if (!selectedAgentId) return;
    setTogglingMonthKey(row.month_key);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/financial-statistics/agent-monthly-ledger/audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          branch_agent_id: selectedAgentId,
          year: row.year,
          month: row.month,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.message || 'فشل تحديث حالة التدقيق للشهر');
      showToast(data.message || 'تم تحديث حالة التدقيق للشهر بنجاح', 'success');
      fetchLedger(selectedAgentId);
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء تغيير حالة التدقيق للشهر', 'error');
    } finally {
      setTogglingMonthKey(null);
    }
  };

  const submitPayment = async () => {
    if (!payModal || !selectedAgentId) return;
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt < 0) {
      showToast('يرجى إدخال مبلغ صحيح', 'error');
      return;
    }
    setPayLoading(true);
    try {
      const token = localStorage.getItem('token');
      const dueTotal = payModal.row.company_share + payModal.row.carried_balance;
      const res = await fetch(`${API_BASE_URL}/financial-statistics/agent-monthly-ledger/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          branch_agent_id: selectedAgentId,
          year: payModal.row.year,
          month: payModal.row.month,
          paid_amount: payModal.row.paid_amount + amt,
          due_amount: dueTotal,
          payment_amount: amt,
          notes: payNotes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        const errMsg = data?.message || data?.error || 'حدث خطأ أثناء حفظ الدفعة';
        showToast(errMsg, 'error');
        return;
      }
      showToast(data.message || 'تم تسجيل الدفعة وإنشاء إيصال القبض في إدارة الإيرادات بنجاح', 'success');
      setPayModal(null);
      fetchLedger(selectedAgentId);
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء حفظ الدفعة', 'error');
    } finally {
      setPayLoading(false);
    }
  };

  const handleResetPayment = async (row: MonthRow) => {
    if (!selectedAgentId) return;
    if (
      !window.confirm(
        `هل أنت تأكد من إلغاء وتصفير المبلغ المستلم لشهر (${row.month_label})؟\n\nسيتم حذف إيصالات القبض المسجلة وتصفير المبلغ المستلم وإعادة حساب المستحقات للشهر.`
      )
    ) {
      return;
    }
    setResetLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/financial-statistics/agent-monthly-ledger/reset-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          branch_agent_id: selectedAgentId,
          year: row.year,
          month: row.month,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.message || 'فشل إلغاء التسديد');
      showToast(data.message || 'تم إلغاء وتصفير المبلغ المستلم لهذا الشهر بنجاح', 'success');
      setPayModal(null);
      fetchLedger(selectedAgentId);
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء إلغاء التسديد', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  // Month Documents Modal Handlers
  const openMonthDocs = (row: MonthRow) => {
    setMonthDocsModal({ row });
    setSearchMonthDocs('');
    setFilterDocType('all');
    setMonthStatusFilter('all');
    fetchMonthDocsData(row.year, row.month, '', 'all');
  };

  const fetchMonthDocsData = async (year: number, month: number, search: string, docType: string) => {
    if (!selectedAgentId) return;
    setLoadingMonthDocs(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/financial-statistics/agent-month-documents?agent_id=${selectedAgentId}&year=${year}&month=${month}&search=${encodeURIComponent(search)}&document_type=${docType}`,
        { headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      if (res.ok) {
        const data = await res.json();
        setMonthDocsList(data.documents || []);
        setMonthDocsSummary(data.summary || null);
      } else {
        showToast('فشل في جلب وثائق الشهر', 'error');
      }
    } catch (err) {
      console.error('Fetch month docs error:', err);
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setLoadingMonthDocs(false);
    }
  };

  const handleOpenQuickAddOldDoc = () => {
    if (!monthDocsModal) return;
    const year = monthDocsModal.row.year;
    const month = String(monthDocsModal.row.month).padStart(2, '0');
    const defaultDate = `${year}-${month}-01`;
    const defaultEndDate = `${year + 1}-${month}-01`;

    setQuickDocType('compulsory');
    setQuickIssueDate(defaultDate);
    setQuickStartDate(defaultDate);
    setQuickEndDate(defaultEndDate);
    setQuickDocNumber('');
    setQuickInsuredName('');
    setQuickChassisNumber('');
    setQuickPlateNumberManual('');
    setQuickLicensePurpose('خاصة/Private');
    setQuickEnginePower('أقل من (16) حصان');
    setQuickPremium('64.000');
    setQuickTax('1.000');
    setQuickStamp('0.500');
    setQuickIssueFees('2.000');
    setQuickSupervisionFees('0.500');
    setQuickTotal('68.000');
    setQuickAddModal(true);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId || !monthDocsModal) return;
    setQuickSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      const p = parseFloat(quickPremium) || 0;
      const t = parseFloat(quickTax) || 0;
      const s = parseFloat(quickStamp) || 0;
      const f = parseFloat(quickIssueFees) || 0;
      const sv = parseFloat(quickSupervisionFees) || 0;
      const calcTotal = parseFloat(quickTotal) || (p + t + s + f + sv);

      const payload: Record<string, any> = {
        document_type: quickDocType,
        branch_agent_id: selectedAgentId,
        issue_date: quickIssueDate || quickStartDate,
        start_date: quickStartDate,
        end_date: quickEndDate || null,
        document_number: quickDocNumber || null,
        insured_name: quickInsuredName,
        chassis_number: quickChassisNumber || null,
        plate_number_manual: quickPlateNumberManual || null,
        plate_number: quickPlateNumberManual || null,
        license_purpose: quickLicensePurpose || null,
        engine_power: quickEnginePower || null,
        premium: p,
        premium_amount: p,
        tax: t,
        stamp: s,
        issue_fees: f,
        supervision_fees: sv,
        total: calcTotal,
        user_id: user ? user.id : null,
      };

      const res = await fetch(`${API_BASE_URL}/old-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showToast(data.message || 'تمت إضافة الوثيقة القديمة بنجاح وتحديث الكشف فوريًا', 'success');
        setQuickAddModal(false);
        fetchMonthDocsData(monthDocsModal.row.year, monthDocsModal.row.month, searchMonthDocs, filterDocType);
        fetchLedger(selectedAgentId);
      } else {
        showToast(data.message || data.error || 'فشل في حفظ الوثيقة القديمة', 'error');
      }
    } catch (err: any) {
      console.error('Error quick adding old doc:', err);
      showToast(err?.message || 'حدث خطأ أثناء حفظ الوثيقة القديمة', 'error');
    } finally {
      setQuickSubmitting(false);
    }
  };

  const handleOpenEditDoc = (doc: MonthDocItem) => {
    setEditDocModal(doc);
    setEditName(doc.insured_name || '');
    setEditNumber(doc.document_number || '');
    setEditTotal(doc.total.toString());
    setEditPremium(doc.premium.toString());
    setEditStartDate(doc.start_date ? doc.start_date.substring(0, 10) : '');
    setEditEndDate(doc.end_date ? doc.end_date.substring(0, 10) : '');
    setEditNotes(doc.notes || '');
  };

  const handleUpdateDocument = async () => {
    if (!editDocModal) return;
    setEditLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/financial-statistics/agent-month-document`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          table: editDocModal.table,
          id: editDocModal.id,
          insured_name: editName,
          document_number: editNumber,
          total: parseFloat(editTotal) || 0,
          premium: parseFloat(editPremium) || 0,
          start_date: editStartDate,
          end_date: editEndDate,
          notes: editNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('تم تحديث بيانات الوثيقة بنجاح', 'success');
        setEditDocModal(null);
        if (monthDocsModal) {
          fetchMonthDocsData(monthDocsModal.row.year, monthDocsModal.row.month, searchMonthDocs, filterDocType);
          if (selectedAgentId) fetchLedger(selectedAgentId);
        }
      } else {
        showToast(data.message || 'فشل في تحديث الوثيقة', 'error');
      }
    } catch (err) {
      console.error('Update doc error:', err);
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocTarget) return;
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const res = await fetch(`${API_BASE_URL}/financial-statistics/agent-month-document`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-User-Id': user?.id ? user.id.toString() : '',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          table: deleteDocTarget.table,
          id: deleteDocTarget.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('تم حذف الوثيقة بنجاح', 'success');
        setDeleteDocTarget(null);
        if (monthDocsModal) {
          fetchMonthDocsData(monthDocsModal.row.year, monthDocsModal.row.month, searchMonthDocs, filterDocType);
          if (selectedAgentId) fetchLedger(selectedAgentId);
        }
      } else {
        showToast(data.message || 'فشل في حذف الوثيقة', 'error');
      }
    } catch (err) {
      console.error('Delete doc error:', err);
      showToast('حدث خطأ أثناء اتصال السيرفر', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!ledger) return;
    try {
      const columns = [
        { header: 'الشهر', key: 'month_label', width: 20 },
        { header: 'عدد الوثائق الإجمالي', key: 'document_count', width: 15 },
        { header: 'الوثائق النشطة', key: 'active_count', width: 15 },
        { header: 'الوثائق المنتهية', key: 'expired_count', width: 15 },
        { header: 'الوثائق الملغية', key: 'canceled_count', width: 15 },
        { header: 'إجمالي المبيعات (د.ل)', key: 'total_sales', width: 22 },
        { header: 'حصة الوكيل (د.ل)', key: 'agent_share', width: 20 },
        { header: 'حصة الشركة (د.ل)', key: 'company_share', width: 20 },
        { header: 'المستلم (د.ل)', key: 'paid_amount', width: 18 },
        { header: 'الباقي (د.ل)', key: 'remaining', width: 18 },
        { header: 'دين مترحل (د.ل)', key: 'carried_balance', width: 20 },
        { header: 'ملاحظات', key: 'notes', width: 30 },
      ];

      const data = ledger.months.map((m) => ({
        month_label: m.month_label,
        document_count: m.document_count,
        active_count: m.active_count ?? 0,
        expired_count: m.expired_count ?? 0,
        canceled_count: m.canceled_count ?? 0,
        total_sales: m.total_sales,
        agent_share: m.agent_share,
        company_share: m.company_share,
        paid_amount: m.paid_amount,
        remaining: m.remaining,
        carried_balance: m.carried_balance,
        notes: m.notes || '-',
      }));

      await generatePremiumExcel({
        title: `كشف الحساب الشهري للوكيل - ${ledger.agent.agency_name}`,
        subtitle: `كود الوكيل: ${ledger.agent.code} | المسؤول: ${ledger.agent.agent_name}`,
        columns,
        data,
        fileName: `كشف_حساب_الوكيل_${ledger.agent.agency_name}`,
      });

      showToast('تم تصدير ملف الإكسيل بنجاح', 'success');
    } catch (err) {
      console.error('Excel Export Error:', err);
      showToast('حدث خطأ أثناء تصدير ملف الإكسيل', 'error');
    }
  };

  const handleExportGroupedDocsExcel = async () => {
    if (!ledger || !selectedAgentId) return;
    setExportingDocsExcel(true);
    showToast('جاري تجديد وتجميع وثائق جميع الأشهر لتصدير الإكسيل...', 'success');

    try {
      const token = localStorage.getItem('token');
      const activeMonths = ledger.months.filter((m) => m.document_count > 0);

      if (activeMonths.length === 0) {
        showToast('لا توجد وثائق صادرة في هذا الكشف للتصدير', 'error');
        setExportingDocsExcel(false);
        return;
      }

      const monthDocsResults = await Promise.all(
        activeMonths.map(async (m) => {
          try {
            const res = await fetch(
              `${API_BASE_URL}/financial-statistics/agent-month-documents?agent_id=${selectedAgentId}&year=${m.year}&month=${m.month}&document_type=${selectedDocType}`,
              { headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
            );
            if (!res.ok) return { month: m, docs: [] };
            const data = await res.json();
            return { month: m, docs: data.documents || [] };
          } catch {
            return { month: m, docs: [] };
          }
        })
      );

      const monthGroups = monthDocsResults.map((res) => ({
        month_label: res.month.month_label,
        document_count: res.month.document_count,
        total_sales: res.month.total_sales,
        agent_share: res.month.agent_share,
        company_share: res.month.company_share,
        docs: res.docs,
      }));

      await generateGroupedDocsExcel({
        title: `تفاصيل وثائق كشف الحساب الشهري - ${ledger.agent.agency_name}`,
        subtitle: `كود الوكيل: ${ledger.agent.code} | المسؤول: ${ledger.agent.agent_name}`,
        monthGroups,
        fileName: `تفاصيل_وثائق_كشف_حساب_${ledger.agent.agency_name}`,
      });

      showToast('تم تصدير ملف وثائق الكشف التفصيلي بنجاح', 'success');
    } catch (err) {
      console.error('Error exporting grouped docs excel:', err);
      showToast('حدث خطأ أثناء تصدير وثائق الكشف', 'error');
    } finally {
      setExportingDocsExcel(false);
    }
  };

  const selectedAgentObj = agents.find((a) => a.id === selectedAgentId);
  const filteredAgentsDropdown = agents.filter(
    (a) =>
      a.agency_name.toLowerCase().includes(agentSearchText.toLowerCase()) ||
      a.code.toLowerCase().includes(agentSearchText.toLowerCase()) ||
      a.agent_name.toLowerCase().includes(agentSearchText.toLowerCase())
  );

  const td: React.CSSProperties = {
    padding: '6px 3px',
    textAlign: 'center',
    borderBottom: '1px solid var(--border)',
    fontFamily: "'Cairo', sans-serif",
    fontSize: '11px',
  };

  return (
    <div style={{ padding: '16px 12px', width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        .stat-card:hover { transform: translateY(-6px) !important; box-shadow: 0 20px 50px rgba(0,0,0,0.15) !important; }
      `}</style>
      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          background: 'var(--card-bg)',
          padding: '18px 24px',
          borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg,#1e40af,#3b82f6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(30,64,175,0.3)',
            }}
          >
            <i className="fa-solid fa-file-invoice-dollar" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: 'var(--text)', fontFamily: "'Cairo',sans-serif" }}>
              كشف الحساب الشهري للوكيل
            </h1>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', fontFamily: "'Cairo',sans-serif" }}>
              سجل إنتاجية وتصفية حسابات الوكلاء شهراً بشهر
            </p>
          </div>
        </div>

        {ledger && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              onClick={() => ldgPrintProductionReport(ledger.agent.id)}
              title="طباعة تقرير الحوافظ الإنتاجية بصيغة A4 لجميع التأمينات"
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '13px',
                color: 'white',
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'Cairo',sans-serif",
                boxShadow: '0 4px 12px rgba(30,64,175,0.3)',
              }}
            >
              <i className="fa-solid fa-print" /> طباعة تقرير الحوافظ (A4)
            </button>

            <button
              onClick={handleExportExcel}
              title="تصدير جدول ملخص كشف الحساب الشهري"
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '13px',
                color: 'white',
                background: 'linear-gradient(135deg,#10b981,#059669)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'Cairo',sans-serif",
                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
              }}
            >
              <i className="fa-solid fa-file-excel" /> تصدير إكسيل (الكشف)
            </button>

            <button
              onClick={handleExportGroupedDocsExcel}
              disabled={exportingDocsExcel}
              title="تصدير جميع الوثائق الصادرة مقسمة بشريط عنوان لكل شهر وتفاصيل وثائقه"
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: 'none',
                cursor: exportingDocsExcel ? 'wait' : 'pointer',
                fontWeight: 800,
                fontSize: '13px',
                color: 'white',
                background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontFamily: "'Cairo',sans-serif",
                boxShadow: '0 4px 12px rgba(2,132,199,0.3)',
                opacity: exportingDocsExcel ? 0.7 : 1,
              }}
            >
              <i className={`fa-solid ${exportingDocsExcel ? 'fa-circle-notch fa-spin' : 'fa-file-excel'}`} />
              {exportingDocsExcel ? 'جاري التصدير...' : 'تصدير وثائق الكشف (إكسيل)'}
            </button>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div
        style={{
          background: 'var(--card-bg)',
          padding: '20px 24px',
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: '1', minWidth: '280px', maxWidth: '420px', position: 'relative' }} ref={agentDropdownRef}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '13px', color: 'var(--text)', fontFamily: "'Cairo',sans-serif" }}>
            <i className="fa-solid fa-user-tie" style={{ marginLeft: '6px', color: '#1e40af' }} />
            اختر الوكيل / الفرع:
          </label>

          {/* Trigger Button */}
          <div
            onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
            style={{
              padding: '11px 16px',
              borderRadius: '12px',
              border: '2px solid var(--border)',
              background: 'var(--bg)',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontFamily: "'Cairo',sans-serif",
              fontWeight: 700,
              fontSize: '14px',
              color: selectedAgentObj ? 'var(--text)' : 'var(--muted)',
            }}
          >
            <span>{selectedAgentObj ? `${selectedAgentObj.agency_name} (${selectedAgentObj.code})` : 'ابحث أو اختر الوكيل...'}</span>
            <i className={`fa-solid fa-chevron-${isAgentDropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '12px', color: 'var(--muted)' }} />
          </div>

          {/* Searchable Dropdown */}
          {isAgentDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '6px',
                background: 'var(--card-bg)',
                borderRadius: '14px',
                border: '2px solid var(--border)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                zIndex: 99,
                padding: '10px',
                maxHeight: '320px',
                overflowY: 'auto',
              }}
            >
              <input
                type="text"
                placeholder="ابحث بالاسم أو الكود..."
                value={agentSearchText}
                onChange={(e) => setAgentSearchText(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  fontFamily: "'Cairo',sans-serif",
                  marginBottom: '8px',
                  boxSizing: 'border-box',
                }}
              />
              {filteredAgentsDropdown.length === 0 ? (
                <div style={{ padding: '12px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px', fontFamily: "'Cairo',sans-serif" }}>
                  لا يوجد وكلاء مطابقين للبحث
                </div>
              ) : (
                filteredAgentsDropdown.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => {
                      setSelectedAgentId(a.id);
                      setIsAgentDropdownOpen(false);
                      setAgentSearchText('');
                      fetchLedger(a.id);
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontFamily: "'Cairo',sans-serif",
                      fontWeight: selectedAgentId === a.id ? 800 : 600,
                      background: selectedAgentId === a.id ? 'rgba(30,64,175,0.1)' : 'transparent',
                      color: selectedAgentId === a.id ? '#1e40af' : 'var(--text)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background .15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(30,64,175,0.08)')}
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = selectedAgentId === a.id ? 'rgba(30,64,175,0.1)' : 'transparent')
                    }
                  >
                    <span>{a.agency_name}</span>
                    <span style={{ fontSize: '11px', opacity: 0.7 }}>كود: {a.code}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>


        {/* Filter by Insurance Type */}
        <div style={{ flex: '1', minWidth: '220px', maxWidth: '320px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 800, fontSize: '13px', color: 'var(--text)', fontFamily: "'Cairo',sans-serif" }}>
            <i className="fa-solid fa-layer-group" style={{ marginLeft: '6px', color: '#0284c7' }} />
            نوع الوثيقة / التأمين:
          </label>
          <select
            value={selectedDocType}
            onChange={handleDocTypeChange}
            style={{
              width: '100%',
              padding: '11px 16px',
              borderRadius: '12px',
              border: '2px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontFamily: "'Cairo',sans-serif",
              fontWeight: 700,
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          >
            {LEDGER_DOC_TYPES.map((t) => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Toggle Switch Exclude Canceled */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", cursor: 'pointer' }}>
            استبعاد الملغاة:
          </label>
          <button
            onClick={handleExcludeToggle}
            style={{
              width: '52px',
              height: '28px',
              borderRadius: '14px',
              border: 'none',
              background: excludeCanceled ? '#10b981' : '#cbd5e1',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background .3s',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '3px',
                left: excludeCanceled ? '26px' : '3px',
                transition: 'left .3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            />
          </button>
        </div>

        {/* Toggle Switch Only Active Months */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", cursor: 'pointer' }}>
            عرض أشهر العمل فقط:
          </label>
          <button
            onClick={() => setOnlyActiveMonths(!onlyActiveMonths)}
            style={{
              width: '52px',
              height: '28px',
              borderRadius: '14px',
              border: 'none',
              background: onlyActiveMonths ? '#3b82f6' : '#cbd5e1',
              position: 'relative',
              cursor: 'pointer',
              transition: 'background .3s',
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '3px',
                left: onlyActiveMonths ? '26px' : '3px',
                transition: 'left .3s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
            />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '36px', color: '#1e40af', marginBottom: '16px' }} />
          <p style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '15px' }}>جاري تحميل كشف الحساب...</p>
        </div>
      )}

      {!loading && !ledger && selectedAgentId && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
          <i className="fa-solid fa-folder-open" style={{ fontSize: '42px', marginBottom: '12px' }} />
          <p style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 700 }}>اختر وكيلاً لعرض كشف الحساب</p>
        </div>
      )}

      {!loading && ledger && (
        <>
          {/* Agent Info Banner (Redesigned with Full Width Buttons & 3x2 Balanced Grid) */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
              borderRadius: '22px',
              padding: '24px 28px',
              color: 'white',
              marginBottom: '24px',
              boxShadow: '0 15px 35px rgba(15,23,42,0.3)',
              border: '1px solid rgba(255,255,255,0.09)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Background ambient lighting accents */}
            <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(59,130,246,0.14)', filter: 'blur(35px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', filter: 'blur(35px)', pointerEvents: 'none' }} />

            {/* Header: Agency Info Top Banner */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', position: 'relative', zIndex: 1, marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#fff',
                    boxShadow: '0 6px 20px rgba(59,130,246,0.4)',
                    flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.25)',
                  }}
                >
                  <i className="fa-solid fa-building-user" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 800, fontFamily: "'Cairo',sans-serif", textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      الوكيل / الفرع المحدد
                    </span>
                    <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: isAgentBlocked ? '#ef4444' : '#10b981', boxShadow: `0 0 8px ${isAgentBlocked ? '#ef4444' : '#10b981'}` }} />
                  </div>
                  <h2 style={{ margin: 0, fontSize: '23px', fontWeight: 900, fontFamily: "'Cairo',sans-serif", color: '#ffffff', letterSpacing: '-0.3px' }}>
                    {ledger.agent.agency_name}
                  </h2>
                </div>
              </div>

              {/* Status Pill on Top Left */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    background: isAgentBlocked ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                    border: `1px solid ${isAgentBlocked ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)'}`,
                    color: isAgentBlocked ? '#fca5a5' : '#6ee7b7',
                    padding: '6px 14px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 800,
                    fontFamily: "'Cairo',sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className={`fa-solid ${isAgentBlocked ? 'fa-ban' : 'fa-circle-check'}`} />
                  <span>{isAgentBlocked ? 'حساب محظور' : 'حساب نشط ومفعل'}</span>
                </span>
              </div>
            </div>

            {/* Row 1: Action Toolbar (Spans 100% Full Width Evenly Across 7 Columns) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '8px',
                width: '100%',
                background: 'rgba(255,255,255,0.04)',
                padding: '8px',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                marginBottom: '18px',
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <button
                onClick={handleOpenAgentDetails}
                disabled={agentDetailsLoading}
                title="عرض تفاصيل الوكيل بالكامل"
                style={{ width: '100%', justifyContent: 'center', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Cairo',sans-serif", boxShadow: '0 2px 10px rgba(16,185,129,0.3)', transition: 'all .2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <i className={`fa-solid ${agentDetailsLoading ? 'fa-circle-notch fa-spin' : 'fa-eye'}`} />
                <span>عرض</span>
              </button>

              <button
                onClick={handleOpenAgentEdit}
                disabled={agentDetailsLoading}
                title="تعديل بيانات الوكيل"
                style={{ width: '100%', justifyContent: 'center', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Cairo',sans-serif", boxShadow: '0 2px 10px rgba(245,158,11,0.3)', transition: 'all .2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <i className="fa-solid fa-pencil" />
                <span>تعديل</span>
              </button>

              <button
                onClick={() => ldgPrintAgentA4(selectedAgentId!)}
                title="طباعة بيانات الوكيل A4"
                style={{ width: '100%', justifyContent: 'center', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Cairo',sans-serif", boxShadow: '0 2px 10px rgba(99,102,241,0.3)', transition: 'all .2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <i className="fa-solid fa-file-lines" />
                <span>طباعة بيانات</span>
              </button>

              <button
                onClick={() => ldgPrintAgentIdCard(selectedAgentId!)}
                title="طباعة بطاقة وكيل"
                style={{ width: '100%', justifyContent: 'center', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #ec4899, #db2777)', color: '#fff', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Cairo',sans-serif", boxShadow: '0 2px 10px rgba(236,72,153,0.3)', transition: 'all .2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <i className="fa-solid fa-id-card" />
                <span>بطاقة وكيل</span>
              </button>

              <button
                onClick={() => ldgPrintAgentContract(selectedAgentId!)}
                title="طباعة العقد"
                style={{ width: '100%', justifyContent: 'center', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Cairo',sans-serif", boxShadow: '0 2px 10px rgba(59,130,246,0.3)', transition: 'all .2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <i className="fa-solid fa-print" />
                <span>طباعة العقد</span>
              </button>

              <button
                onClick={() => ldgPrintAgentPermit(selectedAgentId!)}
                title="طباعة إذن مباشرة العمل"
                style={{ width: '100%', justifyContent: 'center', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Cairo',sans-serif", boxShadow: '0 2px 10px rgba(249,115,22,0.3)', transition: 'all .2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <i className="fa-solid fa-file-invoice" />
                <span>إذن مباشرة</span>
              </button>

              <button
                onClick={handleToggleAgentBlock}
                disabled={agentBlockLoading}
                title={isAgentBlocked ? 'إلغاء حظر الوكيل' : 'حظر الوكيل'}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: agentBlockLoading ? 'wait' : 'pointer',
                  background: isAgentBlocked ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: "'Cairo',sans-serif",
                  boxShadow: isAgentBlocked ? '0 2px 10px rgba(16,185,129,0.35)' : '0 2px 10px rgba(239,68,68,0.35)',
                  transition: 'all .2s, opacity .15s',
                  opacity: agentBlockLoading ? 0.7 : 1
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                <i className={`fa-solid ${agentBlockLoading ? 'fa-circle-notch fa-spin' : isAgentBlocked ? 'fa-user-check' : 'fa-user-slash'}`} />
                <span>{isAgentBlocked ? 'إلغاء الحظر' : 'حظر الوكيل'}</span>
              </button>
            </div>

            {/* Row 2: Organized Info Badges (3x2 Balanced Grid Spanning 100% Width) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '10px',
                width: '100%',
                boxSizing: 'border-box',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {/* Card 1: Code */}
              <div style={{ background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.28)', padding: '10px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#e0f2fe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-hashtag" style={{ color: '#38bdf8', fontSize: '13px' }} />
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, fontFamily: "'Cairo',sans-serif" }}>كود الوكيل:</span>
                </div>
                <strong style={{ color: '#38bdf8', fontWeight: 900, fontSize: '13px', fontFamily: "'Cairo',sans-serif" }}>{ledger.agent.code}</strong>
              </div>

              {/* Card 2: Agent Name */}
              <div style={{ background: 'rgba(167, 139, 250, 0.1)', border: '1px solid rgba(167, 139, 250, 0.28)', padding: '10px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#f3e8ff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-user-tie" style={{ color: '#a78bfa', fontSize: '13px' }} />
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, fontFamily: "'Cairo',sans-serif" }}>المسؤول:</span>
                </div>
                <strong style={{ color: '#fff', fontWeight: 800, fontSize: '13px', fontFamily: "'Cairo',sans-serif" }}>{ledger.agent.agent_name}</strong>
              </div>

              {/* Card 3: Contract Date */}
              <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.28)', padding: '10px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#dbeafe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-file-contract" style={{ color: '#60a5fa', fontSize: '13px' }} />
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, fontFamily: "'Cairo',sans-serif" }}>تاريخ التعاقد:</span>
                </div>
                <strong style={{ color: '#93c5fd', fontWeight: 800, fontSize: '13px', fontFamily: "'Cairo',sans-serif" }}>
                  {ledger.agent.contract_date ? ledger.agent.contract_date.substring(0, 10) : '—'}
                </strong>
              </div>

              {/* Card 4: First Doc Date */}
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.28)', padding: '10px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#d1fae5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-play" style={{ color: '#34d399', fontSize: '13px' }} />
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, fontFamily: "'Cairo',sans-serif" }}>بدء النشاط (أول وثيقة):</span>
                </div>
                <strong style={{ color: '#6ee7b7', fontWeight: 800, fontSize: '13px', fontFamily: "'Cairo',sans-serif" }}>
                  {ledger.agent.first_doc_date || '—'}
                </strong>
              </div>

              {/* Card 5: Last Doc Date */}
              <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.28)', padding: '10px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fef3c7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ color: '#fbbf24', fontSize: '13px' }} />
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, fontFamily: "'Cairo',sans-serif" }}>آخر نشاط مسجل:</span>
                </div>
                <strong style={{ color: '#fde68a', fontWeight: 800, fontSize: '13px', fontFamily: "'Cairo',sans-serif" }}>
                  {ledger.agent.last_doc_date || '—'}
                </strong>
              </div>

              {/* Card 6: Cancellation Date or Agency Status */}
              {ledger.agent.contract_end_date ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '10px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fee2e2' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-user-slash" style={{ color: '#f87171', fontSize: '13px' }} />
                    <span style={{ fontSize: '12px', color: '#fca5a5', fontWeight: 700, fontFamily: "'Cairo',sans-serif" }}>تاريخ التوقف / إلغاء الوكالة:</span>
                  </div>
                  <strong style={{ color: '#fca5a5', fontWeight: 900, fontSize: '13px', fontFamily: "'Cairo',sans-serif" }}>{ledger.agent.contract_end_date.substring(0, 10)}</strong>
                </div>
              ) : (
                <div style={{ background: isAgentBlocked ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.1)', border: `1px solid ${isAgentBlocked ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.28)'}`, padding: '10px 14px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: isAgentBlocked ? '#fee2e2' : '#d1fae5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className={`fa-solid ${isAgentBlocked ? 'fa-ban' : 'fa-circle-check'}`} style={{ color: isAgentBlocked ? '#f87171' : '#34d399', fontSize: '13px' }} />
                    <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 700, fontFamily: "'Cairo',sans-serif" }}>حالة الوكالة:</span>
                  </div>
                  <strong style={{ color: isAgentBlocked ? '#f87171' : '#6ee7b7', fontWeight: 900, fontSize: '13px', fontFamily: "'Cairo',sans-serif" }}>
                    {isAgentBlocked ? 'محظور / غير نشط' : (ledger.agent.status || 'نشط ومفعل')}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* 8 Standalone KPI Summary Cards Grid (Live Agents Production Card Style) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '24px' }}>
            {/* Card 1: Total Sales */}
            <div
              className="stat-card"
              style={{
                ...statCardBase,
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
                color: 'white',
              }}
            >
              <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>إجمالي المبيعات</span>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-coins" style={{ fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {fmt(ledger.summary.total_sales)}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, marginTop: '4px' }}>دينار ليبي</div>
              </div>
            </div>

            {/* Card 2: Agent Share */}
            <div
              className="stat-card"
              style={{
                ...statCardBase,
                background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)',
                color: 'white',
              }}
            >
              <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>عمولة الوكيل</span>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-hand-holding-dollar" style={{ fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {fmt(ledger.summary.total_agent_share)}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, marginTop: '4px' }}>دينار ليبي</div>
              </div>
            </div>

            {/* Card 3: Company Share */}
            <div
              className="stat-card"
              style={{
                ...statCardBase,
                background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)',
                color: 'white',
              }}
            >
              <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>حصة الشركة</span>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-building-columns" style={{ fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {fmt(ledger.summary.total_company_share)}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, marginTop: '4px' }}>دينار ليبي</div>
              </div>
            </div>

            {/* Card 4: Total Paid */}
            <div
              className="stat-card"
              style={{
                ...statCardBase,
                background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
                color: 'white',
              }}
            >
              <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>المستلم حتى الآن</span>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-circle-check" style={{ fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {fmt(ledger.summary.total_paid)}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, marginTop: '4px' }}>دينار ليبي</div>
              </div>
            </div>

            {/* Card 5: Total Remaining / Debt */}
            <div
              className="stat-card"
              style={{
                ...statCardBase,
                background: ledger.summary.total_remaining > 0
                  ? 'linear-gradient(135deg, #b91c1c 0%, #ef4444 50%, #f87171 100%)'
                  : 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
                color: 'white',
              }}
            >
              <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>المتبقي المطلوب</span>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`fa-solid ${ledger.summary.total_remaining > 0 ? 'fa-triangle-exclamation' : 'fa-check-double'}`} style={{ fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {fmt(ledger.summary.total_remaining)}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, marginTop: '4px' }}>دينار ليبي</div>
              </div>
            </div>

            {/* Card 6: Total Documents Count */}
            <div
              className="stat-card"
              style={{
                ...statCardBase,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #38bdf8 100%)',
                color: 'white',
              }}
            >
              <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>إجمالي الوثائق المصدَرة</span>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-file-lines" style={{ fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {ledger.summary.total_documents.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 600, opacity: 0.8 }}>وثيقة</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', fontSize: '10px', fontWeight: 700, flexWrap: 'wrap' }}>
                  <span style={{ background: 'rgba(255,255,255,0.22)', padding: '2px 7px', borderRadius: '10px' }}>🟢 {ledger.summary.active_documents ?? 0} نشطة</span>
                  <span style={{ background: 'rgba(255,255,255,0.22)', padding: '2px 7px', borderRadius: '10px' }}>🟠 {ledger.summary.expired_documents ?? 0} منتهية</span>
                  <span style={{ background: 'rgba(255,255,255,0.22)', padding: '2px 7px', borderRadius: '10px' }}>🔴 {ledger.summary.canceled_documents ?? 0} ملغية</span>
                </div>
              </div>
            </div>

            {/* Card 7: Total Months Count */}
            <div
              className="stat-card"
              style={{
                ...statCardBase,
                background: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
                color: 'white',
              }}
            >
              <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>عدد الأشهر المسجلة</span>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-calendar-days" style={{ fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {ledger.summary.total_months}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, marginTop: '4px' }}>شهر مسجل</div>
              </div>
            </div>

            {/* Card 8: Settlement Percentage */}
            <div
              className="stat-card"
              style={{
                ...statCardBase,
                background: 'linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #818cf8 100%)',
                color: 'white',
              }}
            >
              <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>نسبة تصفية الحساب</span>
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fa-solid fa-percent" style={{ fontSize: '20px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 900, letterSpacing: '-0.5px' }}>
                  {ledger.summary.total_agent_share > 0
                    ? Math.min(100, Math.round((ledger.summary.total_paid / ledger.summary.total_agent_share) * 100))
                    : 100}%
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, marginTop: '4px' }}>نسبة السداد الفعلي</div>
              </div>
            </div>
          </div>

          {/* Monthly Table Card */}
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '20px',
              padding: '16px 10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
              border: '1px solid var(--border)',
              overflowX: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: "'Cairo',sans-serif" }}>
                <i className="fa-solid fa-table-list" style={{ color: '#1e40af', fontSize: '17px' }} />
                <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text)' }}>جدول الإنتاجية الشهرية التفصيلي</span>
                <span
                  style={{
                    background: 'linear-gradient(135deg,#1e40af,#3b82f6)',
                    color: 'white',
                    padding: '2px 10px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 800,
                  }}
                >
                  {ledger.summary.total_months} شهر
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span
                  style={{
                    background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
                    color: '#065f46',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  <i className="fa-solid fa-circle-check" style={{ marginLeft: '5px' }} />مسدد
                </span>
                <span
                  style={{
                    background: 'linear-gradient(135deg,#fee2e2,#fecaca)',
                    color: '#991b1b',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  <i className="fa-solid fa-circle-exclamation" style={{ marginLeft: '5px' }} />باقي عليه
                </span>
              </div>
            </div>

            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: 'var(--table-header)' }}>
                    {['#', 'الشهر', 'نسبة %', 'عدد الوثائق', 'نشطة', 'منتهية', 'ملغية', 'إجمالي المبيعات', 'حصة الوكيل', 'حصة الشركة', 'دين مترحل', 'المستلم', 'الباقي', 'إجراء'].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: '7px 2px',
                            fontWeight: 800,
                            fontSize: '10.5px',
                            textAlign: 'center',
                            background: 'var(--table-header)',
                            color: 'var(--text)',
                            borderBottom: '2px solid var(--border)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(onlyActiveMonths ? ledger.months.filter(r => r.document_count > 0 || r.paid_amount > 0 || r.carried_balance > 0.01) : ledger.months).map((row, idx) => {
                    const isDebt = row.remaining > 0.01;
                    const isPaidFull = !isDebt && (row.document_count > 0 || row.carried_balance > 0.01);
                    const isEmpty = row.document_count === 0 && row.carried_balance < 0.01;
                    const rowBg = isDebt
                      ? 'rgba(254,226,226,0.35)'
                      : isPaidFull
                      ? 'rgba(209,250,229,0.3)'
                      : idx % 2 === 0
                      ? 'var(--card-bg)'
                      : 'var(--bg)';
                    return (
                      <tr key={row.month_key} className="ledger-row" style={{ background: rowBg, transition: 'background .2s' }}>
                        <td style={{ ...td, fontWeight: 700, color: 'var(--muted)', fontSize: '11px' }}>{idx + 1}</td>
                        <td style={{ ...td, textAlign: 'right', paddingRight: '8px', fontWeight: 800, color: 'var(--text)', fontSize: '12px' }}>
                          {row.month_label}
                        </td>
                        <td style={td}>
                          {row.percentage > 0 ? (
                            <span style={{ background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', color: '#5b21b6', padding: '2px 8px', borderRadius: '20px', fontWeight: 800, fontSize: '11px' }}>
                              {row.percentage}%
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...td, padding: '6px 4px' }}>
                          {row.document_count > 0 ? (
                            <span style={{ background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)', color: '#0369a1', padding: '2px 10px', borderRadius: '20px', fontWeight: 900, fontSize: '12px' }}>
                              {row.document_count}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>—</span>
                          )}
                        </td>
                        <td style={td}>
                          <span style={{ background: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: '8px', fontWeight: 800, fontSize: '10.5px' }}>
                            {row.active_count ?? 0}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '8px', fontWeight: 800, fontSize: '10.5px' }}>
                            {row.expired_count ?? 0}
                          </span>
                        </td>
                        <td style={td}>
                          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '8px', fontWeight: 800, fontSize: '10.5px' }}>
                            {row.canceled_count ?? 0}
                          </span>
                        </td>
                        <td style={{ ...td, fontWeight: 800, color: '#3b82f6', fontSize: '12px' }}>
                          {row.total_sales > 0 ? (
                            <>
                              {fmt(row.total_sales)}
                              <span style={{ fontSize: '10px', color: 'var(--muted)', marginRight: '2px' }}>د.ل</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...td, fontWeight: 700, color: '#a78bfa', fontSize: '12px' }}>
                          {row.agent_share > 0 ? (
                            <>
                              {fmt(row.agent_share)}
                              <span style={{ fontSize: '10px', color: 'var(--muted)', marginRight: '2px' }}>د.ل</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...td, fontWeight: 700, color: '#2dd4bf', fontSize: '12px' }}>
                          {row.company_share > 0 ? (
                            <>
                              {fmt(row.company_share)}
                              <span style={{ fontSize: '10px', color: 'var(--muted)', marginRight: '2px' }}>د.ل</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...td, fontWeight: 700, color: '#dc2626', fontSize: '12px' }}>
                          {row.carried_balance > 0.01 ? (
                            <>
                              <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '10px', marginLeft: '3px' }} />
                              {fmt(row.carried_balance)}
                              <span style={{ fontSize: '10px', color: 'var(--muted)', marginRight: '2px' }}>د.ل</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...td, fontWeight: 700, color: '#059669', fontSize: '12px' }}>
                          {row.paid_amount > 0 ? (
                            <>
                              {fmt(row.paid_amount)}
                              <span style={{ fontSize: '10px', color: 'var(--muted)', marginRight: '2px' }}>د.ل</span>
                            </>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ ...td, fontWeight: 900 }}>
                          {isEmpty ? (
                            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>لا يوجد</span>
                          ) : isDebt ? (
                            <span style={{ color: '#dc2626', fontSize: '12px', fontWeight: 900 }}>
                              {fmt(row.remaining)}
                              <span style={{ fontSize: '10px', marginRight: '2px' }}>د.ل</span>
                            </span>
                          ) : (
                            <span style={{ color: '#059669', fontSize: '11px', fontWeight: 800 }}>
                              <i className="fa-solid fa-circle-check" style={{ marginLeft: '3px' }} />مسدد
                            </span>
                          )}
                        </td>
                        <td style={{ ...td, whiteSpace: 'nowrap', padding: '4px 2px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
                            {/* Monthly Audit Toggle Button */}
                            <button
                              className="pay-btn"
                              disabled={togglingMonthKey === row.month_key}
                              onClick={() => toggleMonthAuditStatus(row)}
                              title={row.is_audited ? 'انقر لإلغاء التدقيق لهذا الشهر' : 'انقر لتدقيق حساب هذا الشهر'}
                              style={{
                                padding: '3px 6px',
                                borderRadius: '7px',
                                border: 'none',
                                cursor: togglingMonthKey === row.month_key ? 'wait' : 'pointer',
                                fontFamily: "'Cairo',sans-serif",
                                fontWeight: 800,
                                fontSize: '10px',
                                color: 'white',
                                background: row.is_audited
                                  ? 'linear-gradient(135deg,#059669,#10b981)'
                                  : 'linear-gradient(135deg,#dc2626,#ef4444)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all .2s',
                                boxShadow: row.is_audited
                                  ? '0 2px 5px rgba(16,185,129,0.3)'
                                  : '0 2px 5px rgba(220,38,38,0.3)',
                                opacity: togglingMonthKey === row.month_key ? 0.7 : 1,
                              }}
                            >
                              <i
                                className={`fa-solid ${
                                  togglingMonthKey === row.month_key
                                    ? 'fa-circle-notch fa-spin'
                                    : row.is_audited
                                    ? 'fa-circle-check'
                                    : 'fa-circle-xmark'
                                }`}
                                style={{ fontSize: '9px' }}
                              />
                              {row.is_audited ? 'تم التدقيق' : 'لم يتم التدقيق'}
                            </button>

                            {/* View Month Documents Button */}
                            <button
                              className="pay-btn"
                              onClick={() => openMonthDocs(row)}
                              title="عرض وثائق هذا الشهر بالتفصيل"
                              style={{
                                padding: '3px 6px',
                                borderRadius: '7px',
                                border: 'none',
                                cursor: 'pointer',
                                fontFamily: "'Cairo',sans-serif",
                                fontWeight: 800,
                                fontSize: '10px',
                                color: 'white',
                                background: 'linear-gradient(135deg,#0284c7,#0369a1)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'all .2s',
                                boxShadow: '0 2px 5px rgba(2,132,199,0.2)',
                              }}
                            >
                              <i className="fa-solid fa-folder-open" style={{ fontSize: '9px' }} />وثائق الشهر
                            </button>

                            {!isEmpty && (
                              <button
                                className="pay-btn"
                                onClick={() => openPay(row)}
                                title="تسديد دفعة لهذا الشهر"
                                style={{
                                  padding: '3px 6px',
                                  borderRadius: '7px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontFamily: "'Cairo',sans-serif",
                                  fontWeight: 700,
                                  fontSize: '10px',
                                  color: 'white',
                                  background: 'linear-gradient(135deg,#1e40af,#3b82f6)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  transition: 'all .2s',
                                  boxShadow: '0 2px 5px rgba(30,64,175,0.2)',
                                }}
                              >
                                <i className="fa-solid fa-money-bill-transfer" style={{ fontSize: '9px' }} />تسديد
                              </button>
                            )}

                            {row.paid_amount > 0 && (
                              <button
                                className="pay-btn"
                                disabled={resetLoading}
                                onClick={() => handleResetPayment(row)}
                                title="إلغاء وتصفير المبلغ المستلم لهذا الشهر"
                                style={{
                                  padding: '3px 6px',
                                  borderRadius: '7px',
                                  border: 'none',
                                  cursor: resetLoading ? 'wait' : 'pointer',
                                  fontFamily: "'Cairo',sans-serif",
                                  fontWeight: 700,
                                  fontSize: '10px',
                                  color: 'white',
                                  background: 'linear-gradient(135deg,#dc2626,#ef4444)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  transition: 'all .2s',
                                  boxShadow: '0 2px 5px rgba(220,38,38,0.2)',
                                  opacity: resetLoading ? 0.7 : 1,
                                }}
                              >
                                <i className={`fa-solid ${resetLoading ? 'fa-circle-notch fa-spin' : 'fa-rotate-left'}`} style={{ fontSize: '9px' }} />إلغاء المستلم
                              </button>
                            )}


                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--table-header)', borderTop: '3px solid var(--border)' }}>
                    <td colSpan={3} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, fontSize: '13px', color: 'var(--text)' }}>
                      <i className="fa-solid fa-sigma" style={{ marginLeft: '6px' }} />المجموع الكلي
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 900, fontSize: '12px', color: '#0284c7' }}>
                      {ledger.summary.total_documents.toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                      <span style={{ background: '#d1fae5', color: '#065f46', padding: '1px 6px', borderRadius: '8px', fontWeight: 800, fontSize: '10.5px' }}>
                        {ledger.summary.active_documents ?? 0}
                      </span>
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                      <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '8px', fontWeight: 800, fontSize: '10.5px' }}>
                        {ledger.summary.expired_documents ?? 0}
                      </span>
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center' }}>
                      <span style={{ background: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '8px', fontWeight: 800, fontSize: '10.5px' }}>
                        {ledger.summary.canceled_documents ?? 0}
                      </span>
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 900, fontSize: '12px', color: '#3b82f6' }}>
                      {fmt(ledger.summary.total_sales)}
                      <span style={{ fontSize: '10px', marginRight: '2px' }}>د.ل</span>
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 900, fontSize: '12px', color: '#a78bfa' }}>
                      {fmt(ledger.summary.total_agent_share)}
                      <span style={{ fontSize: '10px', marginRight: '2px' }}>د.ل</span>
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 900, fontSize: '12px', color: '#2dd4bf' }}>
                      {fmt(ledger.summary.total_company_share)}
                      <span style={{ fontSize: '10px', marginRight: '2px' }}>د.ل</span>
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', color: 'var(--muted)', fontSize: '11px' }}>—</td>
                    <td style={{ padding: '10px 4px', textAlign: 'center', fontWeight: 900, fontSize: '12px', color: '#059669' }}>
                      {fmt(ledger.summary.total_paid)}
                      <span style={{ fontSize: '10px', marginRight: '2px' }}>د.ل</span>
                    </td>
                    <td
                      style={{
                        padding: '10px 4px',
                        textAlign: 'center',
                        fontWeight: 900,
                        fontSize: '12px',
                        color: ledger.summary.total_remaining > 0 ? '#dc2626' : '#059669',
                      }}
                    >
                      {fmt(ledger.summary.total_remaining)}
                      <span style={{ fontSize: '10px', marginRight: '2px' }}>د.ل</span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}



      {/* Month Documents View Modal */}
      {monthDocsModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMonthDocsModal(null);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '1150px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              animation: 'modalSlideUp 0.25s ease-out',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 28px',
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #0284c7, #0369a1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                  }}
                >
                  <i className="fa-solid fa-folder-open" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 900, fontFamily: "'Cairo',sans-serif" }}>
                    وثائق شهر {monthDocsModal.row.month_label}
                  </h2>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontFamily: "'Cairo',sans-serif" }}>
                    الوكيل: {ledger?.agent.agency_name} (كود: {ledger?.agent.code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMonthDocsModal(null)}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background .2s',
                }}
              >
                ✕
              </button>
            </div>

            {/* Summary Stat Chips Bar (Interactive Filter Buttons) */}
            {monthDocsSummary && (
              <div
                style={{
                  padding: '14px 28px',
                  background: 'var(--table-header)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <button
                  onClick={() => setMonthStatusFilter('all')}
                  title="عرض جميع الوثائق"
                  style={{
                    background: monthStatusFilter === 'all' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'var(--card-bg)',
                    color: monthStatusFilter === 'all' ? 'white' : 'var(--text)',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: monthStatusFilter === 'all' ? '2px solid #0284c7' : '1px solid var(--border)',
                    fontSize: '12px',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: monthStatusFilter === 'all' ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  📄 إجمالي الوثائق: <strong style={{ color: monthStatusFilter === 'all' ? 'white' : '#0284c7' }}>{monthDocsSummary.total_documents}</strong>
                </button>

                <button
                  onClick={() => setMonthStatusFilter('active')}
                  title="تصفية الوثائق النشطة فقط"
                  style={{
                    background: monthStatusFilter === 'active' ? 'linear-gradient(135deg, #059669, #10b981)' : '#d1fae5',
                    color: monthStatusFilter === 'active' ? 'white' : '#065f46',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: monthStatusFilter === 'active' ? '2px solid #059669' : '1px solid #a7f3d0',
                    fontSize: '12px',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: monthStatusFilter === 'active' ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  🟢 نشطة: <strong>{monthDocsSummary.active_documents ?? 0}</strong>
                </button>

                <button
                  onClick={() => setMonthStatusFilter('expired')}
                  title="تصفية الوثائق المنتهية فقط"
                  style={{
                    background: monthStatusFilter === 'expired' ? 'linear-gradient(135deg, #d97706, #f59e0b)' : '#fef3c7',
                    color: monthStatusFilter === 'expired' ? 'white' : '#92400e',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: monthStatusFilter === 'expired' ? '2px solid #d97706' : '1px solid #fde68a',
                    fontSize: '12px',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: monthStatusFilter === 'expired' ? '0 4px 14px rgba(245, 158, 11, 0.35)' : 'none',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  🟠 منتهية: <strong>{monthDocsSummary.expired_documents ?? 0}</strong>
                </button>

                <button
                  onClick={() => setMonthStatusFilter('canceled')}
                  title="تصفية الوثائق الملغية فقط"
                  style={{
                    background: monthStatusFilter === 'canceled' ? 'linear-gradient(135deg, #dc2626, #ef4444)' : '#fee2e2',
                    color: monthStatusFilter === 'canceled' ? 'white' : '#991b1b',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: monthStatusFilter === 'canceled' ? '2px solid #dc2626' : '1px solid #fecaca',
                    fontSize: '12px',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: monthStatusFilter === 'canceled' ? '0 4px 14px rgba(239, 68, 68, 0.35)' : 'none',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  🔴 ملغية: <strong>{monthDocsSummary.canceled_documents ?? 0}</strong>
                </button>

                <div
                  style={{
                    background: 'var(--card-bg)',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 700,
                  }}
                >
                  💰 إجمالي المبيعات (بدون الملغية): <strong style={{ color: '#3b82f6' }}>{fmt(monthDocsSummary.total_sales)} د.ل</strong>
                </div>
                <div
                  style={{
                    background: 'var(--card-bg)',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 700,
                  }}
                >
                  💼 حصة الوكيل: <strong style={{ color: '#8b5cf6' }}>{fmt(monthDocsSummary.total_agent_share)} د.ل</strong>
                </div>
                <div
                  style={{
                    background: 'var(--card-bg)',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 700,
                  }}
                >
                  🏢 حصة الشركة: <strong style={{ color: '#10b981' }}>{fmt(monthDocsSummary.total_company_share)} د.ل</strong>
                </div>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div
              style={{
                padding: '16px 28px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', flex: '1', minWidth: '260px' }}>
                <input
                  type="text"
                  placeholder="ابحث باسم العميل أو رقم الوثيقة..."
                  value={searchMonthDocs}
                  onChange={(e) => {
                    setSearchMonthDocs(e.target.value);
                    if (monthDocsModal) {
                      fetchMonthDocsData(monthDocsModal.row.year, monthDocsModal.row.month, e.target.value, filterDocType);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '9px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontFamily: "'Cairo',sans-serif",
                  }}
                />
                <select
                  value={filterDocType}
                  onChange={(e) => {
                    setFilterDocType(e.target.value);
                    if (monthDocsModal) {
                      fetchMonthDocsData(monthDocsModal.row.year, monthDocsModal.row.month, searchMonthDocs, e.target.value);
                    }
                  }}
                  style={{
                    padding: '9px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 700,
                  }}
                >
                  <option value="all">جميع الأنواع</option>
                  <option value="compulsory">تأمين إجباري سيارات</option>
                  <option value="international">تأمين السيارات الدولي</option>
                  <option value="travel">تأمين المسافرين</option>
                  <option value="resident">تأمين الوافدين</option>
                  <option value="marine">تأمين الهياكل البحرية</option>
                  <option value="medical">تأمين المسؤولية المهنية</option>
                  <option value="personal_accident">تأمين الحوادث الشخصية</option>
                  <option value="school_student">تأمين طلاب المدارس</option>
                  <option value="cash_in_transit">تأمين نقل النقدية</option>
                  <option value="cargo">تأمين شحن البضائع</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={handleOpenQuickAddOldDoc}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '12px',
                    fontFamily: "'Cairo',sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                >
                  <i className="fa-solid fa-plus-circle" style={{ fontSize: '13px' }} />
                  إضافة وثيقة قديمة جديدة
                </button>

                <button
                  onClick={() => {
                    if (monthDocsModal) {
                      fetchMonthDocsData(monthDocsModal.row.year, monthDocsModal.row.month, searchMonthDocs, filterDocType);
                    }
                  }}
                  style={{
                    padding: '9px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg,#0284c7,#0369a1)',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '12px',
                    fontFamily: "'Cairo',sans-serif",
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <i className="fa-solid fa-arrows-rotate" /> تحديث القائمة
                </button>
              </div>
            </div>

            {/* Documents List Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }}>
              {(() => {
                const filteredDocsList = monthDocsList.filter((doc) => {
                  if (monthStatusFilter === 'active') {
                    return doc.status === 'نشطة' || doc.status === 'فعالة' || doc.status === 'سارية';
                  }
                  if (monthStatusFilter === 'expired') {
                    return doc.status === 'منتهية';
                  }
                  if (monthStatusFilter === 'canceled') {
                    return doc.status === 'ملغية';
                  }
                  return true;
                });

                if (loadingMonthDocs) {
                  return (
                    <div style={{ textAlign: 'center', padding: '50px', color: 'var(--muted)' }}>
                      <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '32px', color: '#0284c7', marginBottom: '12px' }} />
                      <p style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 700 }}>جاري تحميل وثائق الشهر...</p>
                    </div>
                  );
                }

                if (filteredDocsList.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '50px', color: 'var(--muted)' }}>
                      <i className="fa-solid fa-folder-open" style={{ fontSize: '40px', marginBottom: '12px' }} />
                      <p style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 700 }}>
                        {monthStatusFilter !== 'all'
                          ? `لا توجد وثائق حالة (${monthStatusFilter === 'active' ? 'نشطة' : monthStatusFilter === 'expired' ? 'منتهية' : 'ملغية'}) في هذا الشهر`
                          : 'لا توجد وثائق صادرة في هذا الشهر بحسب البحث الفعلي'}
                      </p>
                    </div>
                  );
                }

                return (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: 'var(--table-header)' }}>
                        {['#', 'نوع الوثيقة', 'رقم الوثيقة', 'اسم المؤمن له', 'تاريخ الإصدار', 'القيمة الإجمالية', 'عمولة الوكيل', 'حالة الوثيقة', 'إجراءات'].map(
                          (h) => (
                            <th
                              key={h}
                              style={{
                                padding: '10px 8px',
                                fontWeight: 800,
                                fontSize: '11px',
                                textAlign: 'center',
                                color: 'var(--text)',
                                borderBottom: '2px solid var(--border)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocsList.map((doc, i) => (
                        <tr
                          key={`${doc.table}_${doc.id}`}
                          style={{
                            borderBottom: '1px solid var(--border)',
                            background: i % 2 === 0 ? 'var(--card-bg)' : 'var(--bg)',
                          }}
                        >
                          <td style={{ ...td, fontWeight: 700, color: 'var(--muted)' }}>{i + 1}</td>
                          <td style={td}>
                            <span
                              style={{
                                background: 'linear-gradient(135deg,#e0f2fe,#bae6fd)',
                                color: '#0369a1',
                                padding: '3px 9px',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '11px',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {doc.type_label}
                            </span>
                          </td>
                          <td style={{ ...td, fontWeight: 800, color: 'var(--text)', direction: 'ltr' }}>{doc.document_number}</td>
                          <td style={{ ...td, textAlign: 'right', paddingRight: '12px', fontWeight: 800, color: 'var(--text)' }}>
                            {doc.insured_name}
                          </td>
                          <td style={{ ...td, color: 'var(--muted)', fontSize: '11px' }}>
                            {doc.issue_date ? doc.issue_date.substring(0, 10) : '-'}
                          </td>
                          <td style={{ ...td, fontWeight: 800, color: '#3b82f6' }}>
                            {fmt(doc.total)} <span style={{ fontSize: '10px', color: 'var(--muted)' }}>د.ل</span>
                          </td>
                          <td style={{ ...td, fontWeight: 800, color: '#8b5cf6' }}>
                            {fmt(doc.agent_share)} <span style={{ fontSize: '10px', color: 'var(--muted)' }}>د.ل</span>
                          </td>
                          <td style={td}>
                            {doc.is_old_document ? (
                              <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>
                                وثيقة قديمة
                              </span>
                            ) : doc.status === 'ملغية' ? (
                              <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>
                                ملغية
                              </span>
                            ) : doc.status === 'منتهية' ? (
                              <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>
                                منتهية
                              </span>
                            ) : (
                              <span style={{ background: '#d1fae5', color: '#047857', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>
                                نشطة
                              </span>
                            )}
                          </td>
                          <td style={td}>
                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                              <button
                                onClick={() => handleOpenEditDoc(doc)}
                                title="تعديل الوثيقة"
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg,#f59e0b,#d97706)',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 2px 6px rgba(245,158,11,0.25)',
                                }}
                              >
                                <i className="fa-solid fa-pen-to-square" /> تعديل
                              </button>
                              <button
                                onClick={() => setDeleteDocTarget(doc)}
                                title="مسح/حذف الوثيقة"
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                                  color: 'white',
                                  cursor: 'pointer',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  boxShadow: '0 2px 6px rgba(239,68,68,0.25)',
                                }}
                              >
                                <i className="fa-solid fa-trash-can" /> مسح
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 28px',
                background: 'var(--table-header)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setMonthDocsModal(null)}
                style={{
                  padding: '9px 22px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontFamily: "'Cairo',sans-serif",
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Document Modal */}
      {editDocModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditDocModal(null);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '560px',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontFamily: "'Cairo',sans-serif", fontWeight: 900, fontSize: '18px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-pen-to-square" style={{ color: '#f59e0b' }} /> تعديل بيانات الوثيقة
              </h3>
              <button onClick={() => setEditDocModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '20px', color: 'var(--muted)' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Cairo',sans-serif" }}>اسم المؤمن له / العميل</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', fontFamily: "'Cairo',sans-serif" }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Cairo',sans-serif" }}>رقم الوثيقة</label>
                <input type="text" value={editNumber} onChange={(e) => setEditNumber(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', fontFamily: "'Cairo',sans-serif" }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Cairo',sans-serif" }}>صافي القسط (د.ل)</label>
                <input type="number" value={editPremium} onChange={(e) => setEditPremium(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', fontFamily: "'Cairo',sans-serif" }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Cairo',sans-serif" }}>الإجمالي النهائى (د.ل)</label>
                <input type="number" value={editTotal} onChange={(e) => setEditTotal(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', fontFamily: "'Cairo',sans-serif" }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Cairo',sans-serif" }}>تاريخ البداية</label>
                <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', fontFamily: "'Cairo',sans-serif" }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Cairo',sans-serif" }}>تاريخ النهاية</label>
                <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', fontFamily: "'Cairo',sans-serif" }} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Cairo',sans-serif" }}>ملاحظات</label>
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '13px', fontFamily: "'Cairo',sans-serif", resize: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEditDocModal(null)} style={{ padding: '9px 18px', borderRadius: '10px', border: '1px solid var(--border)', background: 'none', cursor: 'pointer', fontFamily: "'Cairo',sans-serif", fontWeight: 700, color: 'var(--muted)' }}>إلغاء</button>
              <button onClick={handleUpdateDocument} disabled={editLoading} style={{ padding: '9px 22px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', cursor: 'pointer', fontFamily: "'Cairo',sans-serif", fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                {editLoading ? <><i className="fa-solid fa-circle-notch fa-spin" />جاري الحفظ...</> : <><i className="fa-solid fa-floppy-disk" />حفظ التغييرات</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteDocTarget && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteDocTarget(null);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              textAlign: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                margin: '0 auto 16px auto',
              }}
            >
              <i className="fa-solid fa-trash-can" />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontFamily: "'Cairo',sans-serif", fontWeight: 900, fontSize: '18px', color: 'var(--text)' }}>
              تأكيد حذف الوثيقة
            </h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--muted)', fontFamily: "'Cairo',sans-serif", lineHeight: 1.6 }}>
              هل أنت تأكد من رغبتك في حذف الوثيقة رقم <strong>{deleteDocTarget.document_number}</strong> للمؤمن له <strong>{deleteDocTarget.insured_name}</strong>؟
              <br />
              <span style={{ color: '#dc2626', fontWeight: 700 }}>سوف يتم تحديث إجمالي الإنتاجية والعمولة فوراً.</span>
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteDocTarget(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Cairo',sans-serif",
                  fontWeight: 700,
                  color: 'var(--muted)',
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteDocument}
                disabled={deleteLoading}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                  color: 'white',
                  cursor: 'pointer',
                  fontFamily: "'Cairo',sans-serif",
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {deleteLoading ? <><i className="fa-solid fa-circle-notch fa-spin" />جاري الحذف...</> : <><i className="fa-solid fa-trash-can" />تأكيد الحذف</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPayModal(null);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className="modal-box"
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              maxWidth: '720px',
              width: '95%',
              boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35), 0 0 0 1px rgba(226, 232, 240, 0.8)',
              overflow: 'hidden',
              animation: 'modalSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              direction: 'rtl',
            }}
          >
            {/* Compact Header */}
            <div
              style={{
                padding: '14px 20px',
                background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    color: '#ffffff',
                  }}
                >
                  <i className="fa-solid fa-money-bill-wave" />
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "'Cairo', sans-serif",
                      fontWeight: 800,
                      fontSize: '16px',
                      lineHeight: 1.2,
                      color: '#ffffff',
                    }}
                  >
                    تسديد دفعة مالية — {payModal.row.month_label}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPayModal(null)}
                style={{
                  border: 'none',
                  background: 'rgba(255, 255, 255, 0.15)',
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)')}
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '16px 20px' }}>
              {/* Summary 4-Column Row */}
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  padding: '12px 14px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <div
                    style={{
                      background: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}>حصة الشركة</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b', marginTop: '2px', fontFamily: "'Cairo', sans-serif" }}>
                      {fmt(payModal.row.company_share)} <small style={{ fontSize: '10px' }}>د.ل</small>
                    </span>
                  </div>

                  <div
                    style={{
                      background: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, fontFamily: "'Cairo', sans-serif" }}>دين متأخر</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: payModal.row.carried_balance > 0 ? '#d97706' : '#1e293b', marginTop: '2px', fontFamily: "'Cairo', sans-serif" }}>
                      {fmt(payModal.row.carried_balance)} <small style={{ fontSize: '10px' }}>د.ل</small>
                    </span>
                  </div>

                  <div
                    style={{
                      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #bfdbfe',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>الإجمالي المطلوب (حصة الشركة)</span>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#1e3a8a', marginTop: '2px', fontFamily: "'Cairo', sans-serif" }}>
                      {fmt(payModal.row.company_share + payModal.row.carried_balance)} <small style={{ fontSize: '10px' }}>د.ل</small>
                    </span>
                  </div>

                  <div
                    style={{
                      background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid #a7f3d0',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <span style={{ fontSize: '11px', color: '#047857', fontWeight: 700, fontFamily: "'Cairo', sans-serif" }}>مدفوع سابقاً</span>
                    <span style={{ fontSize: '14px', fontWeight: 900, color: '#065f46', marginTop: '2px', fontFamily: "'Cairo', sans-serif" }}>
                      {fmt(payModal.row.paid_amount)} <small style={{ fontSize: '10px' }}>د.ل</small>
                    </span>
                  </div>
                </div>
              </div>

              {/* 2-Column Form Layout */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                {/* Right Column: Amount & Status */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label
                      style={{
                        fontFamily: "'Cairo', sans-serif",
                        fontWeight: 800,
                        fontSize: '13px',
                        color: '#0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <i className="fa-solid fa-coins" style={{ color: '#2563eb' }} />
                      المبلغ المستلم الآن
                    </label>

                    {/* Quick Fill Button */}
                    {(() => {
                      const due = Math.max(0, payModal.row.company_share + payModal.row.carried_balance - payModal.row.paid_amount);
                      if (due > 0 && parseFloat(payAmount || '0') !== due) {
                        return (
                          <button
                            type="button"
                            onClick={() => setPayAmount(due.toFixed(2))}
                            style={{
                              border: 'none',
                              background: '#eff6ff',
                              color: '#2563eb',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              fontFamily: "'Cairo', sans-serif",
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#dbeafe')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#eff6ff')}
                          >
                            <i className="fa-solid fa-bolt" style={{ marginLeft: '4px' }} />
                            تسديد الكل ({fmt(due)})
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                    <input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '10px 14px 10px 50px',
                        borderRadius: '10px',
                        border: '2px solid #cbd5e1',
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#0f172a',
                        background: '#ffffff',
                        outline: 'none',
                        fontFamily: "'Cairo', sans-serif",
                        boxSizing: 'border-box',
                        transition: 'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#2563eb';
                        e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#cbd5e1';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: '10px',
                        background: '#f1f5f9',
                        color: '#475569',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 800,
                        fontFamily: "'Cairo', sans-serif",
                        pointerEvents: 'none',
                      }}
                    >
                      د.ل
                    </div>
                  </div>

                  {/* Dynamic Remaining Balance Badge */}
                  {payAmount !== '' && !isNaN(parseFloat(payAmount)) && (() => {
                    const totalReq = payModal.row.company_share + payModal.row.carried_balance;
                    const currentInput = parseFloat(payAmount || '0');
                    const totalAfterPay = payModal.row.paid_amount + currentInput;
                    const rem = totalReq - totalAfterPay;

                    if (rem <= 0.009) {
                      return (
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: '10px',
                            fontFamily: "'Cairo', sans-serif",
                            background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                            border: '1px solid #86efac',
                            color: '#15803d',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <i className="fa-solid fa-circle-check" style={{ fontSize: '15px', color: '#16a34a' }} />
                          <div style={{ fontSize: '12px', fontWeight: 800 }}>تسديد كامل المطلوب (الباقي: 0.00 د.ل)</div>
                        </div>
                      );
                    } else {
                      return (
                        <div
                          style={{
                            padding: '8px 12px',
                            borderRadius: '10px',
                            fontFamily: "'Cairo', sans-serif",
                            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                            border: '1px solid #fcd34d',
                            color: '#92400e',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <i className="fa-solid fa-clock" style={{ fontSize: '15px', color: '#d97706' }} />
                          <div style={{ fontSize: '12px', fontWeight: 800 }}>تسديد جزئي (الباقي: {fmt(rem)} د.ل)</div>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Left Column: Notes */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontFamily: "'Cairo', sans-serif",
                      fontWeight: 800,
                      fontSize: '13px',
                      color: '#334155',
                    }}
                  >
                    ملاحظات التسديد (اختياري)
                  </label>
                  <textarea
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    placeholder="رقم الحوالة، المصرف، أو ملاحظات إضافية..."
                    style={{
                      width: '100%',
                      flex: 1,
                      minHeight: '85px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '2px solid #cbd5e1',
                      fontSize: '12px',
                      fontFamily: "'Cairo', sans-serif",
                      color: '#0f172a',
                      background: '#ffffff',
                      outline: 'none',
                      resize: 'none',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#2563eb';
                      e.target.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                {payModal.row.paid_amount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleResetPayment(payModal.row)}
                    disabled={resetLoading || payLoading}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      cursor: resetLoading || payLoading ? 'wait' : 'pointer',
                      fontFamily: "'Cairo', sans-serif",
                      fontWeight: 800,
                      fontSize: '13px',
                      color: '#ffffff',
                      background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                      marginRight: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                      opacity: resetLoading || payLoading ? 0.7 : 1,
                    }}
                    title="إلغاء وتصفير جميع الدفعات المسجلة لهذا الشهر"
                  >
                    <i className={`fa-solid ${resetLoading ? 'fa-circle-notch fa-spin' : 'fa-rotate-left'}`} />
                    إلغاء المستلم ({fmt(payModal.row.paid_amount)} د.ل)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPayModal(null)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontFamily: "'Cairo', sans-serif",
                    fontWeight: 700,
                    fontSize: '13px',
                    color: '#64748b',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                    e.currentTarget.style.color = '#334155';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#64748b';
                  }}
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={submitPayment}
                  disabled={payLoading || payAmount === '' || parseFloat(payAmount) <= 0}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    cursor: payLoading || payAmount === '' || parseFloat(payAmount) <= 0 ? 'not-allowed' : 'pointer',
                    fontFamily: "'Cairo', sans-serif",
                    fontWeight: 800,
                    fontSize: '13px',
                    color: '#ffffff',
                    background:
                      payLoading || payAmount === '' || parseFloat(payAmount) <= 0
                        ? '#94a3b8'
                        : 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)',
                    opacity: payLoading ? 0.8 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow:
                      payLoading || payAmount === '' || parseFloat(payAmount) <= 0
                        ? 'none'
                        : '0 6px 16px -3px rgba(37, 99, 235, 0.4)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {payLoading ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-floppy-disk" />
                      حفظ الدفعة
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Old Document Modal Overlay */}
      {quickAddModal && monthDocsModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setQuickAddModal(false);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '24px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              animation: 'modalSlideUp 0.25s ease-out',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '18px 24px',
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    color: 'white',
                  }}
                >
                  <i className="fa-solid fa-file-circle-plus" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, fontFamily: "'Cairo',sans-serif" }}>
                    إضافة وثيقة قديمة جديدة لشهر {monthDocsModal.row.month_label}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontFamily: "'Cairo',sans-serif" }}>
                    الوكيل: {ledger?.agent.agency_name} (كود: {ledger?.agent.code}) — سيتم تحديث الكشف المالي فوريًا
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddModal(false)}
                style={{
                  border: 'none',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleQuickAddSubmit} style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {/* 1. نوع الوثيقة */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: 'var(--text)' }}>
                    نوع الوثيقة *
                  </label>
                  <select
                    value={quickDocType}
                    onChange={(e) => setQuickDocType(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontSize: '13px',
                      fontFamily: "'Cairo',sans-serif",
                      fontWeight: 700,
                    }}
                  >
                    <option value="compulsory">تأمين إجباري سيارات</option>
                    <option value="international">تأمين السيارات الدولي</option>
                    <option value="travel">تأمين المسافرين</option>
                    <option value="resident">تأمين الوافدين للمقيمين</option>
                    <option value="marine">تأمين الهياكل البحرية</option>
                    <option value="medical">تأمين المسؤولية المهنية (الطبية)</option>
                    <option value="personal_accident">تأمين الحوادث الشخصية</option>
                    <option value="school_student">تأمين حماية طلاب المدارس</option>
                    <option value="cash_in_transit">تأمين نقل النقدية</option>
                    <option value="cargo">تأمين شحن البضائع</option>
                  </select>
                </div>

                {/* 2. رقم الوثيقة (اختياري) */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: 'var(--text)' }}>
                    رقم الوثيقة يدويًا (اتركه فارغاً للتوليد التلقائي)
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: BKMCI00123"
                    value={quickDocNumber}
                    onChange={(e) => setQuickDocNumber(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontSize: '13px',
                      fontFamily: "'Cairo',sans-serif",
                    }}
                  />
                </div>

                {/* 3. اسم المؤمن له */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: 'var(--text)' }}>
                    اسم المؤمن له *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="أدخل اسم العميل كما في الإثبات"
                    value={quickInsuredName}
                    onChange={(e) => setQuickInsuredName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      fontSize: '13px',
                      fontFamily: "'Cairo',sans-serif",
                      fontWeight: 700,
                    }}
                  />
                </div>

                {/* 4. بداية ونهاية التأمين */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: '#0284c7' }}>
                    بداية التأمين (تاريخ الإصدار) *
                  </label>
                  <CustomDateInput
                    value={quickStartDate}
                    onChange={(val) => {
                      setQuickStartDate(val);
                      setQuickIssueDate(val);
                      if (val) {
                        const d = new Date(val);
                        if (!isNaN(d.getTime())) {
                          d.setFullYear(d.getFullYear() + 1);
                          const y = d.getFullYear();
                          const m = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          setQuickEndDate(`${y}-${m}-${day}`);
                        }
                      }
                    }}
                    style={{
                      borderRadius: '10px',
                      border: '2px solid #0284c7',
                      fontWeight: 800,
                    }}
                  />
                  {quickStartDate && (
                    <div style={{
                      marginTop: '6px',
                      background: quickStartDate.substring(0,7) === `${monthDocsModal?.row.year}-${String(monthDocsModal?.row.month).padStart(2,'0')}`
                        ? 'linear-gradient(135deg,#059669,#047857)'
                        : 'linear-gradient(135deg,#dc2626,#b91c1c)',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '5px 12px',
                      fontSize: '12px',
                      fontWeight: '800',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      <i className="fa-solid fa-calendar-check"></i>
                      الشهر: {ldgArabicMonth(quickStartDate)}
                      {quickStartDate.substring(0,7) !== `${monthDocsModal?.row.year}-${String(monthDocsModal?.row.month).padStart(2,'0')}` && (
                        <span> ⚠️ تحذير: ليس شهر {monthDocsModal?.row.month_label}!</span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: 'var(--text)' }}>
                    نهاية التأمين *
                  </label>
                  <CustomDateInput
                    value={quickEndDate}
                    onChange={(val) => setQuickEndDate(val)}
                    style={{ borderRadius: '10px' }}
                  />
                  {quickEndDate && (
                    <div style={{
                      marginTop: '6px', background: 'linear-gradient(135deg,#0369a1,#075985)',
                      color: '#fff', borderRadius: '8px', padding: '5px 12px',
                      fontSize: '12px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '6px'
                    }}>
                      <i className="fa-solid fa-calendar"></i> شهر الانتهاء: {ldgArabicMonth(quickEndDate)}
                    </div>
                  )}
                </div>

                {/* حقول المركبات */}
                {['compulsory', 'international'].includes(quickDocType) && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: 'var(--text)' }}>
                        رقم اللوحة
                      </label>
                      <input
                        type="text"
                        placeholder="رقم اللوحة المعدنية"
                        value={quickPlateNumberManual}
                        onChange={(e) => setQuickPlateNumberManual(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid var(--border)',
                          background: 'var(--bg)',
                          color: 'var(--text)',
                          fontSize: '13px',
                          fontFamily: "'Cairo',sans-serif",
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, marginBottom: '6px', color: 'var(--text)' }}>
                        رقم الشاصي (الهيكل)
                      </label>
                      <input
                        type="text"
                        placeholder="رقم الشاصي"
                        value={quickChassisNumber}
                        onChange={(e) => setQuickChassisNumber(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid var(--border)',
                          background: 'var(--bg)',
                          color: 'var(--text)',
                          fontSize: '13px',
                          fontFamily: "'Cairo',sans-serif",
                        }}
                      />
                    </div>
                  </>
                )}

                {/* القيم المالية والرسوم */}
                <div style={{ gridColumn: '1 / -1', marginTop: '10px', padding: '16px', background: 'var(--table-header)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 900, color: '#3b82f6', fontFamily: "'Cairo',sans-serif" }}>
                    💳 التفاصيل المالية والرسوم
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>القسط الأساسي</label>
                      <input
                        type="number"
                        step="0.001"
                        value={quickPremium}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuickPremium(val);
                          const p = parseFloat(val) || 0;
                          const t = parseFloat(quickTax) || 0;
                          const s = parseFloat(quickStamp) || 0;
                          const f = parseFloat(quickIssueFees) || 0;
                          const sv = parseFloat(quickSupervisionFees) || 0;
                          setQuickTotal((p + t + s + f + sv).toFixed(3));
                        }}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>الضريبة</label>
                      <input
                        type="number"
                        step="0.001"
                        value={quickTax}
                        onChange={(e) => setQuickTax(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>الدمغة</label>
                      <input
                        type="number"
                        step="0.001"
                        value={quickStamp}
                        onChange={(e) => setQuickStamp(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>رسوم الإصدار</label>
                      <input
                        type="number"
                        step="0.001"
                        value={quickIssueFees}
                        onChange={(e) => setQuickIssueFees(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)' }}>الإشراف</label>
                      <input
                        type="number"
                        step="0.001"
                        value={quickSupervisionFees}
                        onChange={(e) => setQuickSupervisionFees(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 900, color: '#10b981' }}>المجموع الكلي</label>
                      <input
                        type="number"
                        step="0.001"
                        value={quickTotal}
                        onChange={(e) => setQuickTotal(e.target.value)}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '2px solid #10b981', background: 'var(--bg)', color: '#10b981', fontSize: '13px', fontWeight: 800 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setQuickAddModal(false)}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'none',
                    color: 'var(--muted)',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={quickSubmitting || !quickInsuredName}
                  style={{
                    padding: '10px 26px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    color: 'white',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 800,
                    fontSize: '14px',
                    cursor: quickSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {quickSubmitting ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin" /> جاري حفظ الوثيقة...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check-circle" /> حفظ وتثبيت الوثيقة القديمة
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== Full Comprehensive Agent Details Modal ====== */}
      {agentDetailsModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setAgentDetailsModal(null); }}
        >
          <div style={{ background: 'var(--card-bg)', borderRadius: '24px', maxWidth: '1180px', width: '95vw', height: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
            {/* Modal Top Header Banner */}
            <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '20px 28px', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '16px', overflow: 'hidden', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '2px solid rgba(255,255,255,0.2)' }}>
                  {agentDetailsModal.personal_photo ? (
                    <img src={resolveAgentPublicUrl(agentDetailsModal.personal_photo)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <i className="fa-solid fa-building" style={{ fontSize: '26px', color: '#fff' }} />
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontFamily: "'Cairo',sans-serif", fontSize: '20px', fontWeight: 900, color: '#fff' }}>
                      {agentDetailsModal.agency_name}
                    </h2>
                    <span style={{ background: agentDetailsModal.status === 'نشط' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)', color: agentDetailsModal.status === 'نشط' ? '#34d399' : '#f87171', border: `1px solid ${agentDetailsModal.status === 'نشط' ? '#10b981' : '#ef4444'}`, padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                      ● {agentDetailsModal.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '12px', color: '#cbd5e1', flexWrap: 'wrap', fontFamily: "'Cairo',sans-serif" }}>
                    <span><i className="fa-solid fa-user-tie" style={{ marginLeft: '4px', color: '#a78bfa' }} />{agentDetailsModal.agent_name} ({agentDetailsModal.type})</span>
                    <span><i className="fa-solid fa-hashtag" style={{ marginLeft: '4px', color: '#38bdf8' }} />كود: <strong>{agentDetailsModal.code}</strong></span>
                    <span><i className="fa-solid fa-map-pin" style={{ marginLeft: '4px', color: '#fbbf24' }} />{agentDetailsModal.city}</span>
                    {agentDetailsModal.contract_date && (
                      <span><i className="fa-solid fa-calendar-check" style={{ marginLeft: '4px', color: '#6ee7b7' }} />تعاقد: {agentDetailsModal.contract_date.substring(0, 10)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons in Modal Header */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setAgentDetailsModal(null); handleOpenAgentEdit(); }}
                  style={{ padding: '7px 14px', borderRadius: '10px', border: 'none', background: '#f59e0b', color: '#fff', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(245,158,11,0.4)' }}
                >
                  <i className="fa-solid fa-pencil" /> تعديل البيانات
                </button>
                <button
                  onClick={() => ldgPrintAgentA4(agentDetailsModal.id)}
                  style={{ padding: '7px 14px', borderRadius: '10px', border: 'none', background: '#6366f1', color: '#fff', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-file-lines" /> طباعة A4
                </button>
                <button
                  onClick={() => ldgPrintAgentIdCard(agentDetailsModal.id)}
                  style={{ padding: '7px 14px', borderRadius: '10px', border: 'none', background: '#ec4899', color: '#fff', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-id-card" /> بطاقة وكيل
                </button>
                <button
                  onClick={() => ldgPrintAgentContract(agentDetailsModal.id)}
                  style={{ padding: '7px 14px', borderRadius: '10px', border: 'none', background: '#3b82f6', color: '#fff', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <i className="fa-solid fa-print" /> طباعة العقد
                </button>
                <button
                  onClick={() => setAgentDetailsModal(null)}
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg)', padding: '0 20px', gap: '6px', overflowX: 'auto', flexShrink: 0 }}>
              {[
                { key: 'agency', label: 'بيانات الوكالة', icon: 'fa-building' },
                { key: 'contact', label: 'الاتصال والمستندات', icon: 'fa-address-card' },
                { key: 'permissions', label: 'الصلاحيات والحساب', icon: 'fa-shield-halved' },
                { key: 'wallet', label: 'المحفظة والنقاط', icon: 'fa-wallet' },
                { key: 'custody', label: 'سجل العهد', icon: 'fa-boxes-stacked' },
                { key: 'stats', label: 'الإحصائيات المالية', icon: 'fa-chart-pie' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setAgentDetailsTab(t.key as any)}
                  style={{
                    padding: '14px 18px',
                    border: 'none',
                    borderBottom: agentDetailsTab === t.key ? '3px solid #3b82f6' : '3px solid transparent',
                    background: 'none',
                    color: agentDetailsTab === t.key ? '#3b82f6' : 'var(--muted)',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    transition: 'all .2s'
                  }}
                >
                  <i className={`fa-solid ${t.icon}`} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Modal Body Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
              {/* Tab 1: Agency Data */}
              {agentDetailsTab === 'agency' && (
                <div>
                  <h3 style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 900, fontSize: '16px', color: 'var(--text)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-building" style={{ color: '#3b82f6' }} /> المعلومات الأساسية للوكالة
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
                    {[
                      { label: 'اسم الوكالة', value: agentDetailsModal.agency_name, icon: 'fa-building' },
                      { label: 'اسم الوكيل المسؤول', value: agentDetailsModal.agent_name, icon: 'fa-user-tie' },
                      { label: 'كود الوكالة', value: agentDetailsModal.code, icon: 'fa-hashtag' },
                      { label: 'نوع النشاط', value: agentDetailsModal.activity || '—', icon: 'fa-briefcase' },
                      { label: 'رقم الوكالة / الترخيص', value: agentDetailsModal.agency_number || '—', icon: 'fa-id-card' },
                      { label: 'رقم الختم', value: agentDetailsModal.stamp_number || '—', icon: 'fa-stamp' },
                      { label: 'نوع المنشأة', value: agentDetailsModal.type || 'وكيل', icon: 'fa-sitemap' },
                      { label: 'حالة الوكالة', value: agentDetailsModal.status || 'نشط', icon: 'fa-signal' },
                      { label: 'تاريخ التعاقد', value: agentDetailsModal.contract_date ? agentDetailsModal.contract_date.substring(0, 10) : '—', icon: 'fa-calendar-day' },
                      { label: 'تاريخ التجديد', value: agentDetailsModal.renewal_date ? agentDetailsModal.renewal_date.substring(0, 10) : '—', icon: 'fa-calendar-plus' },
                      { label: 'تاريخ انتهاء العقد / التوقف', value: agentDetailsModal.contract_end_date ? agentDetailsModal.contract_end_date.substring(0, 10) : '—', icon: 'fa-calendar-xmark' },
                      { label: 'مدة العقد', value: agentDetailsModal.contract_duration || '—', icon: 'fa-hourglass-half' },
                    ].map(item => (
                      <div key={item.label} style={{ background: 'var(--bg)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border)' }}>
                        <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: '11px', color: 'var(--muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <i className={`fa-solid ${item.icon}`} style={{ color: '#3b82f6' }} /> {item.label}
                        </div>
                        <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: '14px', color: 'var(--text)', fontWeight: 800 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {agentDetailsModal.notes && (
                    <div style={{ marginTop: '20px', background: 'var(--bg)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: '12px', color: 'var(--muted)', fontWeight: 700, marginBottom: '6px' }}>ملاحظات إضافية</div>
                      <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: '14px', color: 'var(--text)', fontWeight: 600 }}>{agentDetailsModal.notes}</div>
                    </div>
                  )}

                  {agentDetailsModal.contract_conditions && (
                    <div style={{ marginTop: '20px', background: 'var(--bg)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border)' }}>
                      <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: '12px', color: 'var(--muted)', fontWeight: 700, marginBottom: '6px' }}>شروط وأحكام العقد الخاصة</div>
                      <pre style={{ fontFamily: "'Cairo',sans-serif", fontSize: '13px', color: 'var(--text)', whiteSpace: 'pre-wrap', margin: 0 }}>{agentDetailsModal.contract_conditions}</pre>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Contact & Documents */}
              {agentDetailsTab === 'contact' && (
                <div>
                  <h3 style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 900, fontSize: '16px', color: 'var(--text)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-address-card" style={{ color: '#10b981' }} /> معلومات الاتصال والهوية الشخصية
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px', marginBottom: '28px' }}>
                    {[
                      { label: 'المدينة', value: agentDetailsModal.city || '—', icon: 'fa-city' },
                      { label: 'رقم الهاتف', value: agentDetailsModal.phone || '—', icon: 'fa-phone' },
                      { label: 'هاتف المكتب', value: agentDetailsModal.office_phone || '—', icon: 'fa-phone-flip' },
                      { label: 'لوكيشن / موقع المكتب', value: agentDetailsModal.office_location || '—', icon: 'fa-location-crosshairs' },
                      { label: 'الجنسية', value: agentDetailsModal.nationality || '—', icon: 'fa-flag' },
                      { label: 'الرقم الوطني', value: agentDetailsModal.national_id || '—', icon: 'fa-id-card' },
                      { label: 'رقم إثبات الشخصية', value: agentDetailsModal.identity_number || '—', icon: 'fa-passport' },
                      { label: 'العنوان التفصيلي', value: agentDetailsModal.address || '—', icon: 'fa-location-dot' },
                    ].map(item => (
                      <div key={item.label} style={{ background: 'var(--bg)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border)' }}>
                        <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: '11px', color: 'var(--muted)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <i className={`fa-solid ${item.icon}`} style={{ color: '#10b981' }} /> {item.label}
                        </div>
                        <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: '14px', color: 'var(--text)', fontWeight: 800 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Attached Documents Cards */}
                  <h3 style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 900, fontSize: '16px', color: 'var(--text)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-images" style={{ color: '#8b5cf6' }} /> المستندات والصور المرفقة
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {[
                      { label: 'الصورة الشخصية', path: agentDetailsModal.personal_photo },
                      { label: 'صورة واجهة المكتب', path: agentDetailsModal.office_facade_photo },
                      { label: 'الرقم القومي (صورة)', path: agentDetailsModal.national_id_photo },
                      { label: 'إثبات الهوية', path: agentDetailsModal.identity_photo },
                      { label: 'صورة العقد', path: agentDetailsModal.contract_photo },
                      { label: 'جواز السفر', path: agentDetailsModal.passport_photo },
                      { label: 'شهادة البراءة', path: agentDetailsModal.clearance_certificate },
                      { label: 'شهادة عدم إفلاس', path: agentDetailsModal.non_bankruptcy_certificate },
                      { label: 'شهادة خبرة', path: agentDetailsModal.experience_certificate },
                      { label: 'شهادة عدم ارتباط بعمل', path: agentDetailsModal.non_employment_certificate },
                      { label: 'شهادة صحية (خلو درن)', path: agentDetailsModal.tb_health_certificate },
                      { label: 'المؤهل العلمي', path: agentDetailsModal.academic_qualification },
                      { label: 'رخصة المزاولة', path: agentDetailsModal.activity_license },
                    ].map(doc => {
                      const url = resolveAgentPublicUrl(doc.path);
                      return (
                        <div key={doc.label} style={{ background: 'var(--bg)', borderRadius: '14px', padding: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <div style={{ width: '100%', height: '140px', borderRadius: '10px', overflow: 'hidden', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', border: '1px solid var(--border)' }}>
                            {doc.path ? (
                              <img src={url} alt={doc.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as any).style.display = 'none'; }} />
                            ) : (
                              <div style={{ color: 'var(--muted)', fontSize: '12px', fontFamily: "'Cairo',sans-serif" }}>
                                <i className="fa-solid fa-file-excel" style={{ fontSize: '28px', display: 'block', marginBottom: '6px', opacity: 0.4 }} />
                                غير متوفر
                              </div>
                            )}
                          </div>
                          <span style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--text)', marginBottom: '8px' }}>{doc.label}</span>
                          {doc.path && (
                            <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#3b82f6', textDecoration: 'none', fontWeight: 700, fontFamily: "'Cairo',sans-serif", display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <i className="fa-solid fa-up-right-from-square" /> عرض بالحجم الكامل
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 3: Permissions & Account */}
              {agentDetailsTab === 'permissions' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                    {/* Authorized Insurance Docs */}
                    <div style={{ background: 'var(--bg)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
                      <h4 style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 900, fontSize: '15px', color: '#1e40af', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-file-contract" /> وثائق التأمين المصرح بإصدارها
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {(agentDetailsModal.authorized_documents || []).length > 0 ? (
                          agentDetailsModal.authorized_documents.map((doc: string) => (
                            <span key={doc} style={{ background: '#dbeafe', color: '#1e40af', padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 800, fontFamily: "'Cairo',sans-serif", border: '1px solid #bfdbfe' }}>
                              <i className="fa-solid fa-shield-check" style={{ marginLeft: '6px' }} />
                              {doc}
                            </span>
                          ))
                        ) : (
                          <div style={{ color: 'var(--muted)', fontSize: '13px' }}>لا توجد وثائق محددة</div>
                        )}
                      </div>
                    </div>

                    {/* Linked User Account */}
                    <div style={{ background: 'var(--bg)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
                      <h4 style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 900, fontSize: '15px', color: '#047857', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <i className="fa-solid fa-user-lock" /> بيانات الحساب المرتبط في المنظومة
                      </h4>
                      {agentDetailsModal.user ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 700 }}>اسم المستخدم:</span>
                            <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: '13px' }}>{agentDetailsModal.user.username}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 700 }}>الاسم الكامل:</span>
                            <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: '13px' }}>{agentDetailsModal.user.name}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            <span style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 700 }}>حساب الهيئة (EIDC):</span>
                            <span style={{ fontWeight: 800, color: '#3b82f6', fontSize: '13px' }}>{agentDetailsModal.user.eidc_username || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 700 }}>حساب الاتحاد (LIFO):</span>
                            <span style={{ fontWeight: 800, color: '#f59e0b', fontSize: '13px' }}>{agentDetailsModal.user.lifo_username || '—'}</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ color: 'var(--muted)', fontSize: '13px' }}>لا يوجد حساب مستخدم مسجل</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Wallet & Points */}
              {agentDetailsTab === 'wallet' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div style={{ background: 'linear-gradient(135deg, #0284c7, #0369a1)', borderRadius: '16px', padding: '20px', color: '#fff' }}>
                      <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: 700, marginBottom: '6px' }}>رصيد المحفظة المالي</div>
                      <div style={{ fontSize: '28px', fontWeight: 900 }}>{agentDetailsModal.wallet?.wallet_balance || '0.00'} <span style={{ fontSize: '14px' }}>د.ل</span></div>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '16px', padding: '20px', color: '#fff' }}>
                      <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: 700, marginBottom: '6px' }}>نقاط الولاء والتحفيز</div>
                      <div style={{ fontSize: '28px', fontWeight: 900 }}>{agentDetailsModal.wallet?.points_balance || '0'} <span style={{ fontSize: '14px' }}>نقطة</span></div>
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '16px', padding: '20px', color: '#fff' }}>
                      <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: 700, marginBottom: '6px' }}>الوكلاء المسجلين عبر الإحالة</div>
                      <div style={{ fontSize: '28px', fontWeight: 900 }}>{agentDetailsModal.wallet?.referrals_count || '0'} <span style={{ fontSize: '14px' }}>وكيل</span></div>
                    </div>
                  </div>

                  {agentDetailsModal.wallet?.referral_code && (
                    <div style={{ background: 'var(--bg)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
                      <h4 style={{ margin: '0 0 10px 0', fontFamily: "'Cairo',sans-serif", fontSize: '14px', fontWeight: 800, color: 'var(--text)' }}>
                        رابط الإحالة الخاص بالوكيل
                      </h4>
                      <div style={{ background: 'var(--card-bg)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '13px', color: 'var(--text)' }}>
                        {`${window.location.origin}/website/branches-agents?ref=${agentDetailsModal.wallet.referral_code}`}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Custody */}
              {agentDetailsTab === 'custody' && (
                <div>
                  <h3 style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 900, fontSize: '16px', color: 'var(--text)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-boxes-stacked" style={{ color: '#f59e0b' }} /> سجل العهد والمستندات المسلمة
                  </h3>
                  <div style={{ background: 'var(--bg)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)', textAlign: 'center', color: 'var(--muted)' }}>
                    <i className="fa-solid fa-box-open" style={{ fontSize: '36px', marginBottom: '10px', display: 'block', opacity: 0.5 }} />
                    لا توجد عهد نشطة مسجلة حالياً
                  </div>
                </div>
              )}

              {/* Tab 6: Financial Stats */}
              {agentDetailsTab === 'stats' && ledger && (
                <div>
                  <h3 style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 900, fontSize: '16px', color: 'var(--text)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-chart-pie" style={{ color: '#6366f1' }} /> ملخص الإنتاجية والإحصائيات المالية
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                    {[
                      { label: 'إجمالي المبيعات', value: fmt(ledger.summary.total_sales) + ' د.ل', bg: '#1e40af' },
                      { label: 'عمولة الوكيل', value: fmt(ledger.summary.total_agent_share) + ' د.ل', bg: '#7c3aed' },
                      { label: 'حصة الشركة', value: fmt(ledger.summary.total_company_share) + ' د.ل', bg: '#0d9488' },
                      { label: 'المستلم حتى الآن', value: fmt(ledger.summary.total_paid) + ' د.ل', bg: '#059669' },
                      { label: 'المتبقي / الدين', value: fmt(ledger.summary.total_remaining) + ' د.ل', bg: ledger.summary.total_remaining > 0 ? '#b91c1c' : '#059669' },
                      { label: 'إجمالي الوثائق', value: ledger.summary.total_documents + ' وثيقة', bg: '#0284c7' },
                    ].map(s => (
                      <div key={s.label} style={{ background: s.bg, borderRadius: '14px', padding: '16px', color: '#fff' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, opacity: 0.9 }}>{s.label}</div>
                        <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '4px' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: "'Cairo',sans-serif" }}>
                كود الوكيل: <strong style={{ color: '#38bdf8' }}>{agentDetailsModal.code}</strong> — {agentDetailsModal.agency_name}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => { setAgentDetailsModal(null); handleOpenAgentEdit(); }}
                  style={{ padding: '10px 22px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fa-solid fa-pencil" /> تعديل البيانات
                </button>
                <button
                  onClick={() => setAgentDetailsModal(null)}
                  style={{ padding: '10px 22px', borderRadius: '12px', border: '1px solid var(--border)', background: 'none', color: 'var(--muted)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, cursor: 'pointer' }}
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== Full Comprehensive Agent Edit Modal ====== */}
      {agentEditModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setAgentEditModal(null); }}
        >
          <div style={{ background: 'var(--card-bg)', borderRadius: '24px', maxWidth: '1180px', width: '95vw', height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
            {/* Modal Top Header */}
            <div style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', padding: '18px 28px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                  <i className="fa-solid fa-pencil" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontFamily: "'Cairo',sans-serif", fontSize: '18px', fontWeight: 900 }}>
                    تعديل بيانات الوكيل / الفرع بالكامل
                  </h2>
                  <p style={{ margin: 0, fontFamily: "'Cairo',sans-serif", fontSize: '12px', opacity: 0.9 }}>
                    {agentEditModal.agency_name} — كود: {agentEditModal.code}
                  </p>
                </div>
              </div>
              <button onClick={() => setAgentEditModal(null)} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Edit Tabs Navigation */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg)', padding: '0 20px', gap: '6px', overflowX: 'auto', flexShrink: 0 }}>
              {[
                { idx: 0, label: 'البيانات الأساسية', icon: 'fa-building' },
                { idx: 1, label: 'التعاقد والعقد', icon: 'fa-file-signature' },
                { idx: 2, label: 'المستندات والصور', icon: 'fa-folder-open' },
                { idx: 3, label: 'الوثائق والنسب والصلاحيات', icon: 'fa-shield-halved' },
                { idx: 4, label: 'دخول المنظومة (الحساب)', icon: 'fa-user-lock' },
              ].map(t => (
                <button
                  key={t.idx}
                  onClick={() => setAgentEditTab(t.idx)}
                  style={{
                    padding: '14px 18px',
                    border: 'none',
                    borderBottom: agentEditTab === t.idx ? '3px solid #f59e0b' : '3px solid transparent',
                    background: 'none',
                    color: agentEditTab === t.idx ? '#d97706' : 'var(--muted)',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 800,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    transition: 'all .2s'
                  }}
                >
                  <i className={`fa-solid ${t.icon}`} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Edit Form Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '28px' }}>
              {/* Tab 0: Basic Data */}
              {agentEditTab === 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>نوع المنشأة *</label>
                    <select
                      value={agentEditForm.type || 'وكيل'}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, type: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="وكيل">وكيل</option>
                      <option value="فرع من شركة">فرع من شركة</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>نشاط الوكيل</label>
                    <select
                      value={agentEditForm.activity || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, activity: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="">اختر النشاط...</option>
                      {AGENT_ACTIVITIES_LIST.map(act => <option key={act} value={act}>{act}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>اسم الوكالة / الفرع *</label>
                    <input
                      type="text"
                      value={agentEditForm.agency_name || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, agency_name: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>اسم الوكيل المسؤول *</label>
                    <input
                      type="text"
                      value={agentEditForm.agent_name || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, agent_name: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>المدينة *</label>
                    <select
                      value={agentEditForm.city || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, city: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="">اختر المدينة...</option>
                      {AGENT_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>العنوان التفصيلي</label>
                    <input
                      type="text"
                      value={agentEditForm.address || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, address: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>رقم الهاتف الشخصي</label>
                    <input
                      type="text"
                      value={agentEditForm.phone || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, phone: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>هاتف المكتب</label>
                    <input
                      type="text"
                      value={agentEditForm.office_phone || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, office_phone: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>موقع / لوكيشن المكتب</label>
                    <input
                      type="text"
                      value={agentEditForm.office_location || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, office_location: e.target.value }))}
                      placeholder="رابط خرائط جوجل أو إحداثيات"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>الجنسية</label>
                    <input
                      type="text"
                      value={agentEditForm.nationality || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, nationality: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>الرقم الوطني</label>
                    <input
                      type="text"
                      value={agentEditForm.national_id || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, national_id: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>رقم إثبات الشخصية (جواز / بطاقة)</label>
                    <input
                      type="text"
                      value={agentEditForm.identity_number || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, identity_number: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>رقم الترخيص / الوكالة</label>
                    <input
                      type="text"
                      value={agentEditForm.agency_number || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, agency_number: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>رقم الختم</label>
                    <input
                      type="text"
                      value={agentEditForm.stamp_number || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, stamp_number: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>حالة الوكيل</label>
                    <select
                      value={agentEditForm.status || 'نشط'}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, status: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="نشط">نشط</option>
                      <option value="غير نشط">غير نشط</option>
                      <option value="قيد الانتظار">قيد الانتظار</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>ملاحظات عامة</label>
                    <textarea
                      value={agentEditForm.notes || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, notes: e.target.value }))}
                      rows={3}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                    />
                  </div>
                </div>
              )}

              {/* Tab 1: Contract & Terms */}
              {agentEditTab === 1 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>تاريخ التعاقد *</label>
                    <input
                      type="date"
                      value={agentEditForm.contract_date || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, contract_date: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>تاريخ التجديد</label>
                    <input
                      type="date"
                      value={agentEditForm.renewal_date || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, renewal_date: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>تاريخ انتهاء العقد / إلغاء الوكالة</label>
                    <input
                      type="date"
                      value={agentEditForm.contract_end_date || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, contract_end_date: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>مدة العقد</label>
                    <input
                      type="text"
                      value={agentEditForm.contract_duration || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, contract_duration: e.target.value }))}
                      placeholder="مثال: سنة واحدة"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>شروط وأحكام العقد</label>
                    <textarea
                      value={agentEditForm.contract_conditions || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, contract_conditions: e.target.value }))}
                      rows={8}
                      style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 600, fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', lineHeight: '1.6' }}
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Photos & Files Uploads */}
              {agentEditTab === 2 && (
                <div>
                  <h4 style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '14px', color: 'var(--text)', marginBottom: '16px' }}>
                    تحميل وتحديث المستندات والصور المرفقة:
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {[
                      { key: 'personal_photo', label: 'الصورة الشخصية', current: agentEditModal.personal_photo },
                      { key: 'office_facade_photo', label: 'صورة واجهة المكتب', current: agentEditModal.office_facade_photo },
                      { key: 'national_id_photo', label: 'صورة الرقم القومي', current: agentEditModal.national_id_photo },
                      { key: 'identity_photo', label: 'إثبات الهوية', current: agentEditModal.identity_photo },
                      { key: 'contract_photo', label: 'صورة العقد المبرم', current: agentEditModal.contract_photo },
                      { key: 'passport_photo', label: 'جواز السفر', current: agentEditModal.passport_photo },
                      { key: 'clearance_certificate', label: 'شهادة البراءة', current: agentEditModal.clearance_certificate },
                      { key: 'non_bankruptcy_certificate', label: 'شهادة عدم إفلاس', current: agentEditModal.non_bankruptcy_certificate },
                      { key: 'experience_certificate', label: 'شهادة خبرة', current: agentEditModal.experience_certificate },
                      { key: 'non_employment_certificate', label: 'شهادة عدم ارتباط بعمل', current: agentEditModal.non_employment_certificate },
                      { key: 'tb_health_certificate', label: 'شهادة خلو من الدرن', current: agentEditModal.tb_health_certificate },
                      { key: 'academic_qualification', label: 'المؤهل العلمي', current: agentEditModal.academic_qualification },
                      { key: 'activity_license', label: 'رخصة المزاولة', current: agentEditModal.activity_license },
                    ].map(f => (
                      <div key={f.key} style={{ background: 'var(--bg)', borderRadius: '12px', padding: '14px', border: '1px solid var(--border)' }}>
                        <div style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--text)', marginBottom: '8px' }}>
                          {f.label}
                        </div>
                        {f.current && (
                          <div style={{ marginBottom: '8px', fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fa-solid fa-circle-check" /> يوجد ملف حالي مرفوع
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setAgentEditFiles(p => ({ ...p, [f.key]: file }));
                          }}
                          style={{ width: '100%', fontSize: '12px', fontFamily: "'Cairo',sans-serif" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Permissions, Docs & Percentages */}
              {agentEditTab === 3 && (
                <div>
                  <h4 style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '14px', color: 'var(--text)', marginBottom: '12px' }}>
                    وثائق التأمين المصرح بها ونسب العمولات الافتراضية (%):
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px', marginBottom: '28px' }}>
                    {AGENT_INSURANCE_DOCS.map(doc => {
                      const isAuth = (agentEditForm.authorized_documents || []).includes(doc);
                      const defPct = agentEditForm.document_percentages?.default?.[doc] ?? 0;
                      return (
                        <div key={doc} style={{ background: isAuth ? 'rgba(59,130,246,0.06)' : 'var(--bg)', border: `1.5px solid ${isAuth ? '#3b82f6' : 'var(--border)'}`, borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '13px', color: isAuth ? '#1e40af' : 'var(--text)' }}>
                            <input
                              type="checkbox"
                              checked={isAuth}
                              onChange={() => handleToggleAuthDoc(doc)}
                              style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                            />
                            {doc}
                          </label>
                          {isAuth && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.5"
                                value={defPct}
                                onChange={(e) => handleEditDocPercentageChange(doc, parseFloat(e.target.value) || 0)}
                                style={{ width: '60px', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 800, textAlign: 'center', fontSize: '12px' }}
                              />
                              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--muted)' }}>%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Monthly Exceptional Overrides */}
                  <div style={{ background: 'var(--bg)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)', marginBottom: '24px' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontFamily: "'Cairo',sans-serif", fontSize: '14px', fontWeight: 800, color: '#d97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-calendar-days" /> النسب الاستثنائية الشهرية (حسب الشهر المحدد)
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>السنة</label>
                        <input
                          type="number"
                          value={editOverrideYear}
                          onChange={(e) => setEditOverrideYear(e.target.value)}
                          style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 700 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>الشهر</label>
                        <select
                          value={editOverrideMonth}
                          onChange={(e) => setEditOverrideMonth(e.target.value)}
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 700 }}
                        >
                          {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>نوع التأمين</label>
                        <select
                          value={editOverrideDocType}
                          onChange={(e) => setEditOverrideDocType(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 700 }}
                        >
                          <option value="">اختر نوع التأمين...</option>
                          {AGENT_INSURANCE_DOCS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>النسبة %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={editOverridePercentage}
                          onChange={(e) => setEditOverridePercentage(parseFloat(e.target.value) || 0)}
                          style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 700 }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEditMonthlyOverride}
                        style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#d97706', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: 'pointer', fontFamily: "'Cairo',sans-serif" }}
                      >
                        <i className="fa-solid fa-plus" /> إضافة
                      </button>
                    </div>

                    {/* Overrides Table */}
                    {Object.entries(agentEditForm.document_percentages?.monthly_overrides || {}).length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {Object.entries(agentEditForm.document_percentages?.monthly_overrides || {}).flatMap(([mKey, docs]: [string, any]) =>
                          Object.entries(docs || {}).map(([doc, pct]: [string, any]) => (
                            <span key={`${mKey}-${doc}`} style={{ background: 'rgba(217,119,6,0.15)', color: '#d97706', border: '1px solid #d97706', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <span>{mKey} — {doc}: <strong>{pct}%</strong></span>
                              <i onClick={() => handleRemoveEditMonthlyOverride(mKey, doc)} className="fa-solid fa-xmark" style={{ cursor: 'pointer', color: '#ef4444' }} />
                            </span>
                          ))
                        )}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--muted)', fontSize: '12px' }}>لا توجد نسب استثنائية شهرية مضافة</div>
                    )}
                  </div>

                  {/* Period Overrides */}
                  <div style={{ background: 'var(--bg)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)', marginBottom: '24px' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontFamily: "'Cairo',sans-serif", fontSize: '14px', fontWeight: 800, color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-calendar-range" /> النسب الاستثنائية حسب الفترة (من تاريخ إلى تاريخ)
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'flex-end', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>من تاريخ</label>
                        <input
                          type="date"
                          value={editPeriodStartDate}
                          onChange={(e) => setEditPeriodStartDate(e.target.value)}
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 700 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>إلى تاريخ</label>
                        <input
                          type="date"
                          value={editPeriodEndDate}
                          onChange={(e) => setEditPeriodEndDate(e.target.value)}
                          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 700 }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>نوع التأمين</label>
                        <select
                          value={editPeriodDocType}
                          onChange={(e) => setEditPeriodDocType(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 700 }}
                        >
                          <option value="">اختر نوع التأمين...</option>
                          {AGENT_INSURANCE_DOCS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--muted)', marginBottom: '4px' }}>النسبة %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={editPeriodPercentage}
                          onChange={(e) => setEditPeriodPercentage(parseFloat(e.target.value) || 0)}
                          style={{ width: '70px', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontWeight: 700 }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddEditPeriodOverride}
                        style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: 'pointer', fontFamily: "'Cairo',sans-serif" }}
                      >
                        <i className="fa-solid fa-plus" /> إضافة فترة
                      </button>
                    </div>

                    {/* Period Overrides List */}
                    {Array.isArray(agentEditForm.document_percentages?.period_overrides) && agentEditForm.document_percentages.period_overrides.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {agentEditForm.document_percentages.period_overrides.map((item: any) => (
                          <span key={item.id} style={{ background: 'rgba(124,58,237,0.15)', color: '#7c3aed', border: '1px solid #7c3aed', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <span>من {item.start_date} إلى {item.end_date} — {item.doc_type}: <strong>{item.percentage}%</strong></span>
                            <i onClick={() => handleRemoveEditPeriodOverride(item.id)} className="fa-solid fa-xmark" style={{ cursor: 'pointer', color: '#ef4444' }} />
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--muted)', fontSize: '12px' }}>لا توجد نسب استثنائية لفترات مضافة</div>
                    )}
                  </div>

                  {/* Administrative Permissions */}
                  <div style={{ background: 'var(--bg)', borderRadius: '16px', padding: '20px', border: '1px solid var(--border)' }}>
                    <h4 style={{ margin: '0 0 14px 0', fontFamily: "'Cairo',sans-serif", fontSize: '14px', fontWeight: 800, color: '#047857', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <i className="fa-solid fa-user-gear" /> الصلاحيات الإدارية والمالية الممنوحة للوكيل
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                      {AGENT_REPORT_PERMS.map(perm => {
                        const isAuth = (agentEditForm.authorized_documents || []).includes(perm);
                        return (
                          <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '12px', color: isAuth ? '#047857' : 'var(--text)' }}>
                            <input
                              type="checkbox"
                              checked={isAuth}
                              onChange={() => handleToggleAuthDoc(perm)}
                              style={{ width: '16px', height: '16px', accentColor: '#047857' }}
                            />
                            {perm}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: System User Account */}
              {agentEditTab === 4 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>اسم المستخدم للدخول (Username)</label>
                    <input
                      type="text"
                      value={agentEditForm.username || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, username: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>كلمة المرور الجديدة (اتركها فارغة إذا لا تريد التغيير)</label>
                    <input
                      type="password"
                      value={agentEditForm.password || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="••••••••"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>اسم المستخدم في هيئة التأمين (EIDC Username)</label>
                    <input
                      type="text"
                      value={agentEditForm.eidc_username || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, eidc_username: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>كلمة مرور هيئة التأمين (EIDC Password)</label>
                    <input
                      type="password"
                      value={agentEditForm.eidc_password || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, eidc_password: e.target.value }))}
                      placeholder="اتركها فارغة لعدم التغيير"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>اسم المستخدم في الاتحاد (LIFO Username)</label>
                    <input
                      type="text"
                      value={agentEditForm.lifo_username || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, lifo_username: e.target.value }))}
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '12px', color: 'var(--muted)' }}>كلمة مرور الاتحاد (LIFO Password)</label>
                    <input
                      type="password"
                      value={agentEditForm.lifo_password || ''}
                      onChange={(e) => setAgentEditForm(p => ({ ...p, lifo_password: e.target.value }))}
                      placeholder="اتركها فارغة لعدم التغيير"
                      style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 28px', borderTop: '1px solid var(--border)', background: 'var(--bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setAgentEditModal(null)}
                style={{ padding: '10px 24px', borderRadius: '12px', border: '1px solid var(--border)', background: 'none', color: 'var(--muted)', fontFamily: "'Cairo',sans-serif", fontWeight: 700, cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveAgentEdit}
                disabled={agentEditLoading}
                style={{ padding: '10px 32px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '14px', cursor: agentEditLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: agentEditLoading ? 0.75 : 1, boxShadow: '0 4px 14px rgba(245,158,11,0.4)' }}
              >
                {agentEditLoading ? (
                  <><i className="fa-solid fa-circle-notch fa-spin" /> جاري حفظ التعديلات...</>
                ) : (
                  <><i className="fa-solid fa-floppy-disk" /> حفظ وتحديث بيانات الوكيل</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
