import { useEffect, useState, useRef } from "react";
import { enhanceAuthorizedDocuments } from "../utils/insuranceTypeHelper";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

type BranchAgent = {
  id: number;
  agency_name: string;
  agent_name: string;
  code: string;
  authorized_documents?: string[];
};

type Document = {
  insurance_type: string;
  category: string;
  insured_name: string;
  phone: string;
  insurance_code: string;
  insurance_value: number;
  agent_percentage: number;
  agent_amount: number;
  company_amount: number;
  date: string;
};

type FilterMode = 'monthly' | 'range';
type DatePreset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'custom';

const MONTHS = [
  { value: '1', label: 'يناير' },
  { value: '2', label: 'فبراير' },
  { value: '3', label: 'مارس' },
  { value: '4', label: 'أبريل' },
  { value: '5', label: 'مايو' },
  { value: '6', label: 'يونيو' },
  { value: '7', label: 'يوليو' },
  { value: '8', label: 'أغسطس' },
  { value: '9', label: 'سبتمبر' },
  { value: '10', label: 'أكتوبر' },
  { value: '11', label: 'نوفمبر' },
  { value: '12', label: 'ديسمبر' },
];

const toInputDate = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetRange = (preset: DatePreset) => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  switch (preset) {
    case 'today':
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case 'last7':
      start.setDate(start.getDate() - 6);
      break;
    case 'thisMonth':
      start.setDate(1);
      break;
    case 'lastMonth':
      start.setMonth(start.getMonth() - 1, 1);
      end.setDate(0);
      break;
    default:
      break;
  }

  return { from: toInputDate(start), to: toInputDate(end) };
};

export default function MonthlyAccountClosure() {
  const [filterMode, setFilterMode] = useState<FilterMode>('range');
  const [selectedAgent, setSelectedAgent] = useState<BranchAgent | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const initialRange = getPresetRange('today');
  const [dateFrom, setDateFrom] = useState<string>(initialRange.from);
  const [dateTo, setDateTo] = useState<string>(initialRange.to);
  const [selectedInsuranceType, setSelectedInsuranceType] = useState<string>("all");
  
  const [agents, setAgents] = useState<BranchAgent[]>([]);
  const [agentSearch, setAgentSearch] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  
  const [availableInsuranceTypes, setAvailableInsuranceTypes] = useState<string[]>([]);
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [summary, setSummary] = useState({ total_agent_amount: 0, total_company_amount: 0, due_amount: 0, paid_vouchers_amount: 0, total_vouchers_all_time: 0 });
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [originalPaidAmount, setOriginalPaidAmount] = useState<number>(0); // القيمة المدفوعة الأصلية من جميع الوثائق
  const [loading, setLoading] = useState(false);

  // توليد السنوات (من 2020 إلى السنة الحالية + 1)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 + 2 }, (_, i) => (2020 + i).toString());

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (datePreset !== 'custom') {
      const range = getPresetRange(datePreset);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, [datePreset]);



  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setShowAgentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/branches-agents`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('فشل في جلب الوكلاء');
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(`حدث خطأ: ${error.message}`, 'error');
    }
  };

  // تحديث أنواع التأمينات المتاحة عند اختيار وكيل
  useEffect(() => {
    if (selectedAgent) {
      const authorizedDocs = selectedAgent.authorized_documents || [];
      // استخدام Helper لإضافة "تأمين السيارات" تلقائياً
      const enhancedDocs = enhanceAuthorizedDocuments(authorizedDocs);
      setAvailableInsuranceTypes(enhancedDocs);
      // إعادة تعيين نوع التأمين المحدد
      setSelectedInsuranceType("all");
    } else {
      setAvailableInsuranceTypes([]);
      setSelectedInsuranceType("all");
    }
  }, [selectedAgent]);

  const filteredAgents = agents.filter(agent =>
    agent.agency_name.toLowerCase().includes(agentSearch.toLowerCase()) ||
    agent.agent_name.toLowerCase().includes(agentSearch.toLowerCase()) ||
    agent.code.toLowerCase().includes(agentSearch.toLowerCase())
  );

  // دالة لفلترة الوثائق حسب نوع التأمين
  const filterDocumentsByInsuranceType = (docs: Document[], insuranceType: string, paidAmountValue: number = 0, vouchersData?: { monthly: number, allTime: number }) => {
    const totalCompanyAmountAll = docs.reduce((sum, doc) => sum + doc.company_amount, 0);
    
    if (insuranceType === "all") {
      setDocuments(docs);
      // حساب الملخص من جميع الوثائق
      const totalAgentAmount = docs.reduce((sum, doc) => sum + doc.agent_amount, 0);
      setSummary({
        total_agent_amount: totalAgentAmount,
        total_company_amount: totalCompanyAmountAll,
        due_amount: totalCompanyAmountAll,
        paid_vouchers_amount: vouchersData ? vouchersData.monthly : summary.paid_vouchers_amount,
        total_vouchers_all_time: vouchersData ? vouchersData.allTime : summary.total_vouchers_all_time,
      });
      
      // إعادة تعيين المدفوع إلى القيمة الأصلية
      if (paidAmountValue > 0) {
        const formattedPaidAmount = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(paidAmountValue);
        setPaidAmount(formattedPaidAmount);
      } else {
        setPaidAmount("");
      }
    } else {
      // فلترة الوثائق - نتحقق من insurance_type و category
      const filtered = docs.filter(doc => {
        // معالجة خاصة لتأمين السيارات
        const carInsuranceCategories = [
          'تأمين إجباري سيارات',
          'تأمين سيارات إجباري',
          'تأمين سيارة جمرك',
          'تأمين سيارات أجنبية',
          'تأمين طرف ثالث سيارات'
        ];
        
        // إذا كان النوع المحدد هو "تأمين السيارات"، نعرض جميع أنواع تأمين السيارات
        if (insuranceType === 'تأمين السيارات') {
          // إذا كان insurance_type هو "تأمين السيارات"، نتحقق من category
          if (doc.insurance_type === 'تأمين السيارات') {
            return carInsuranceCategories.includes(doc.category);
          }
          // إذا كان category من أنواع تأمين السيارات
          if (carInsuranceCategories.includes(doc.category)) {
            return true;
          }
        }
        
        // إذا كان النوع المحدد من فئات السيارات
        if (carInsuranceCategories.includes(insuranceType)) {
          // إذا كان insurance_type هو "تأمين السيارات" و category يطابق
          if (doc.insurance_type === 'تأمين السيارات' && doc.category === insuranceType) {
            return true;
          }
          // معالجة الاختلافات في الأسماء لتأمين إجباري سيارات
          if ((insuranceType === 'تأمين إجباري سيارات' || insuranceType === 'تأمين سيارات إجباري')) {
            if (doc.insurance_type === 'تأمين السيارات' && 
                (doc.category === 'تأمين إجباري سيارات' || doc.category === 'تأمين سيارات إجباري')) {
              return true;
            }
          }
        }
        
        // إذا كان النوع المحدد يطابق insurance_type مباشرة
        if (doc.insurance_type === insuranceType) {
          return true;
        }
        
        // إذا كان النوع المحدد يطابق category مباشرة
        if (doc.category === insuranceType) {
          return true;
        }
        
        // معالجة خاصة لتأمين السيارات الدولي
        // قد يكون في authorized_documents بأسماء مختلفة
        const internationalNames = ['تأمين السيارات الدولي', 'تأمين سيارات دولي'];
        if (internationalNames.includes(insuranceType)) {
          return doc.insurance_type === 'تأمين السيارات الدولي' || 
                 doc.category === 'تأمين السيارات الدولي';
        }
        
        return false;
      });
      setDocuments(filtered);
      // حساب الملخص من الوثائق المفلترة فقط
      const totalAgentAmount = filtered.reduce((sum, doc) => sum + doc.agent_amount, 0);
      const totalCompanyAmount = filtered.reduce((sum, doc) => sum + doc.company_amount, 0);
      setSummary({
        total_agent_amount: totalAgentAmount,
        total_company_amount: totalCompanyAmount,
        due_amount: totalCompanyAmount,
        paid_vouchers_amount: vouchersData ? vouchersData.monthly : summary.paid_vouchers_amount,
        total_vouchers_all_time: vouchersData ? vouchersData.allTime : summary.total_vouchers_all_time,
      });
      
      // تحديث المدفوع بناءً على نسبة الوثائق المفلترة
      if (totalCompanyAmountAll > 0 && paidAmountValue > 0) {
        const proportion = totalCompanyAmount / totalCompanyAmountAll;
        const proportionalPaidAmount = paidAmountValue * proportion;
        const formattedPaidAmount = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(proportionalPaidAmount);
        setPaidAmount(formattedPaidAmount);
      } else {
        setPaidAmount("");
      }
    }
  };

  // تحديث الوثائق عند تغيير نوع التأمين
  useEffect(() => {
    if (allDocuments.length > 0) {
      filterDocumentsByInsuranceType(allDocuments, selectedInsuranceType, originalPaidAmount, { monthly: summary.paid_vouchers_amount, allTime: summary.total_vouchers_all_time });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInsuranceType]);

  const handleSearch = async () => {
    if (!selectedAgent) {
      showToast('يرجى اختيار الوكيل', 'error');
      return;
    }
    if (filterMode === 'monthly' && (!selectedYear || !selectedMonth)) {
      showToast('يرجى اختيار السنة والشهر', 'error');
      return;
    }
    if (filterMode === 'range' && (!dateFrom || !dateTo)) {
      showToast('يرجى تحديد من/إلى تاريخ', 'error');
      return;
    }
    if (filterMode === 'range' && dateFrom > dateTo) {
      showToast('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية', 'error');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        branch_agent_id: selectedAgent.id.toString(),
      });
      if (filterMode === 'monthly') {
        params.append('type', 'monthly');
        params.append('year', selectedYear);
        params.append('month', selectedMonth);
      } else {
        params.append('type', 'range');
        params.append('from_date', dateFrom);
        params.append('to_date', dateTo);
      }
      
      // إضافة نوع التأمين إذا كان محدداً
      if (selectedInsuranceType && selectedInsuranceType !== "all") {
        params.append('insurance_type', selectedInsuranceType);
      }

      const res = await fetch(`${API_BASE_URL}/branches-agents/monthly-account-closure?${params}`, {
        headers: { 'Accept': 'application/json' }
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'فشل في جلب البيانات');
      }

      if (data.success) {
        const fetchedDocuments = data.documents || [];
        setAllDocuments(fetchedDocuments);
        
        const vouchersMonthly = Number(data.summary.paid_vouchers_amount || 0);
        const vouchersAllTime = Number(data.summary.total_vouchers_all_time || 0);
        const closurePaid = data.closure ? Number(data.closure.paid_amount) : 0;
        const paidAmountValue = Math.max(vouchersMonthly, closurePaid);
        
        setOriginalPaidAmount(paidAmountValue);
        
        // فلترة البيانات حسب نوع التأمين المحدد (سيتم حساب summary و paidAmount تلقائياً)
        filterDocumentsByInsuranceType(fetchedDocuments, selectedInsuranceType, paidAmountValue, { monthly: vouchersMonthly, allTime: vouchersAllTime });
      } else {
        throw new Error(data.message || 'حدث خطأ');
      }
    } catch (error: any) {
      showToast(`حدث خطأ: ${error.message}`, 'error');
      setDocuments([]);
      setSummary({ 
        total_agent_amount: 0, 
        total_company_amount: 0, 
        due_amount: 0,
        paid_vouchers_amount: 0,
        total_vouchers_all_time: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (filterMode !== 'monthly') {
      showToast('الحفظ متاح في وضع الإغلاق الشهري فقط', 'error');
      return;
    }
    if (!selectedAgent || !selectedYear || !selectedMonth) {
      showToast('يرجى اختيار الوكيل والسنة والشهر', 'error');
      return;
    }

    if (documents.length === 0) {
      showToast('لا توجد بيانات للحفظ', 'error');
      return;
    }

    const paidAmountNum = parseFloat(paidAmount.replace(/,/g, '')) || 0;
    const remainingAmountNum = Math.max(0, summary.due_amount - paidAmountNum);

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/branches-agents/monthly-account-closure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          branch_agent_id: selectedAgent.id,
          year: parseInt(selectedYear),
          month: parseInt(selectedMonth),
          due_amount: summary.due_amount,
          paid_amount: paidAmountNum,
          remaining_amount: remainingAmountNum,
          documents_data: documents,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'فشل في حفظ البيانات');
      }

      if (data.success) {
        showToast('تم حفظ البيانات بنجاح', 'success');
      } else {
        throw new Error(data.message || 'حدث خطأ');
      }
    } catch (error: any) {
      showToast(`حدث خطأ: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!selectedAgent) {
      showToast('يرجى اختيار الوكيل', 'error');
      return;
    }
    if (filterMode === 'monthly' && (!selectedYear || !selectedMonth)) {
      showToast('يرجى اختيار السنة والشهر', 'error');
      return;
    }
    if (filterMode === 'range' && (!dateFrom || !dateTo)) {
      showToast('يرجى تحديد من/إلى تاريخ', 'error');
      return;
    }

    const params = new URLSearchParams();
    let url = '';
    if (filterMode === 'monthly') {
      params.append('year', selectedYear);
      params.append('month', selectedMonth);
      url = `${API_BASE_URL}/branches-agents/${selectedAgent.id}/monthly-account-closure-print?${params.toString()}`;
    } else {
      params.append('type', 'range');
      params.append('from_date', dateFrom);
      params.append('to_date', dateTo);
      url = `${API_BASE_URL}/branches-agents/${selectedAgent.id}/account-report?${params.toString()}`;
    }
    
    // إضافة نوع التأمين إذا كان محدداً
    if (selectedInsuranceType && selectedInsuranceType !== "all") {
      params.append('insurance_type', selectedInsuranceType);
    }

    // إنشاء iframe مخفي للطباعة
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    let printed = false;

    const printFrame = () => {
      if (!printed) {
        printed = true;
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 750);
      }
    };

    iframe.onload = printFrame;
    iframe.src = url;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ' د.ل';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const paidAmountNum = parseFloat(paidAmount.replace(/,/g, '')) || 0;
  const remainingAmount = summary.due_amount - paidAmountNum; // يمكن أن يكون سالباً في حالة الدفع الزائد

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>إغلاق حساب شهري</span>
      </div>

      <div className="users-card">


        {/* Filters */}
        <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="filterMode"
              value="range"
              checked={filterMode === 'range'}
              onChange={(e) => setFilterMode(e.target.value as FilterMode)}
              style={{ marginLeft: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>فترة زمنية</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="filterMode"
              value="monthly"
              checked={filterMode === 'monthly'}
              onChange={(e) => setFilterMode(e.target.value as FilterMode)}
              style={{ marginLeft: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <span>إغلاق شهري</span>
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr auto', gap: '20px', marginBottom: '24px', alignItems: 'flex-end' }}>
          {/* الوكيل (select2) */}
          <div
            className="form-group"
            style={{ marginBottom: 0, position: 'relative' }}
            ref={agentDropdownRef}
          >
            <label>الوكيل</label>
            <div
              onClick={() => {
                setShowAgentDropdown(!showAgentDropdown);
              }}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: '#fff',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                minHeight: 42,
              }}
            >
              <span style={{ color: selectedAgent ? '#111827' : '#9ca3af' }}>
                {selectedAgent ? `${selectedAgent.agency_name} - ${selectedAgent.agent_name}` : 'اختر وكيل...'}
              </span>
              <i
                className={`fa-solid fa-chevron-${showAgentDropdown ? 'up' : 'down'}`}
                style={{ color: '#9ca3af' }}
              ></i>
            </div>
            {showAgentDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  zIndex: 1000,
                  maxHeight: 320,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
                  <input
                    type="text"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder="ابحث..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      fontSize: 14,
                    }}
                    autoFocus
                  />
                </div>
                <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                  <div
                    onClick={() => {
                      setSelectedAgent(null);
                      setAgentSearch('');
                      setShowAgentDropdown(false);
                    }}
                    style={{
                      padding: '9px 12px',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      fontWeight: 500,
                      background: !selectedAgent ? '#f3f4f6' : 'transparent',
                    }}
                  >
                    مسح التحديد
                  </div>
                  {filteredAgents.map((agent) => (
                    <div
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgent(agent);
                        setAgentSearch('');
                        setShowAgentDropdown(false);
                      }}
                      style={{
                        padding: '9px 12px',
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        background: selectedAgent?.id === agent.id ? '#f3f4f6' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedAgent?.id !== agent.id) {
                          e.currentTarget.style.background = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedAgent?.id !== agent.id) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {agent.agency_name} - {agent.agent_name} ({agent.code})
                    </div>
                  ))}
                  {filteredAgents.length === 0 && (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>
                      لا توجد نتائج
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* السنة / الشهر في الوضع الشهري */}
          {filterMode === 'monthly' ? (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>السنة</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: '#fff',
                    fontSize: 14,
                    minHeight: 42,
                  }}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>الشهر</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: '#fff',
                    fontSize: 14,
                    minHeight: 42,
                  }}
                >
                  {MONTHS.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>فترة سريعة</label>
                <select
                  value={datePreset}
                  onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: '#fff',
                    fontSize: 14,
                    minHeight: 42,
                  }}
                >
                  <option value="today">اليوم</option>
                  <option value="yesterday">أمس</option>
                  <option value="last7">آخر 7 أيام</option>
                  <option value="thisMonth">هذا الشهر</option>
                  <option value="lastMonth">الشهر السابق</option>
                  <option value="custom">تحديد مخصص</option>
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>من - إلى</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); if (datePreset !== 'custom') setDatePreset('custom'); }} />
                  <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); if (datePreset !== 'custom') setDatePreset('custom'); }} />
                </div>
              </div>
            </>
          )}

          {/* نوع التأمين */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>نوع التأمين</label>
            <select
              value={selectedInsuranceType}
              onChange={(e) => setSelectedInsuranceType(e.target.value)}
              disabled={!selectedAgent || availableInsuranceTypes.length === 0}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: (!selectedAgent || availableInsuranceTypes.length === 0) ? '#f5f5f5' : '#fff',
                fontSize: 14,
                minHeight: 42,
                cursor: (!selectedAgent || availableInsuranceTypes.length === 0) ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="all">الكل</option>
              {availableInsuranceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* زر البحث */}
          <div style={{ marginBottom: 0 }}>
            <button
              onClick={handleSearch}
              disabled={loading || !selectedAgent || (filterMode === 'monthly' ? (!selectedYear || !selectedMonth) : (!dateFrom || !dateTo))}
              className="btn-submit"
              style={{
                padding: '10px 24px',
                fontSize: '16px',
                fontWeight: 600,
                minHeight: 42,
                opacity: loading || !selectedAgent || (filterMode === 'monthly' ? (!selectedYear || !selectedMonth) : (!dateFrom || !dateTo)) ? 0.6 : 1,
                cursor: loading || !selectedAgent || (filterMode === 'monthly' ? (!selectedYear || !selectedMonth) : (!dateFrom || !dateTo)) ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '8px' }}></i>
                  جاري البحث...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-search" style={{ marginLeft: '8px' }}></i>
                  بحث
                </>
              )}
            </button>
          </div>
        </div>

      {/* Table */}
      {documents.length > 0 && (
        <>
          <div className="users-table-wrapper" style={{ marginBottom: '24px' }}>
            <div className="table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>نوع التأمين</th>
                    <th>الفئة</th>
                    <th>اسم المؤمن</th>
                    <th>رقم الهاتف</th>
                    <th>كود التأمين</th>
                    <th>قيمة التأمين</th>
                    <th>نسبة الوكيل</th>
                    <th>القيمة للوكيل</th>
                    <th>القيمة للشركة</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, index) => (
                    <tr key={index}>
                      <td>{doc.insurance_type}</td>
                      <td>{doc.category}</td>
                      <td>{doc.insured_name}</td>
                      <td>{doc.phone}</td>
                      <td>{doc.insurance_code}</td>
                      <td>{formatCurrency(doc.insurance_value)}</td>
                      <td>{doc.agent_percentage}%</td>
                      <td>{formatCurrency(doc.agent_amount)}</td>
                      <td>{formatCurrency(doc.company_amount)}</td>
                      <td>{formatDate(doc.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="users-mobile-cards">
            {documents.map((doc, index) => (
              <div key={index} className="user-mobile-card">
                <div className="user-mobile-header">
                  <div>
                    <h4 className="user-mobile-title">{doc.insurance_type}</h4>
                    <span className="user-mobile-number">{doc.insurance_code}</span>
                  </div>
                </div>
                <div className="user-mobile-body">
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">الفئة:</span>
                    <span className="user-mobile-value">{doc.category}</span>
                  </div>
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">اسم المؤمن:</span>
                    <span className="user-mobile-value">{doc.insured_name}</span>
                  </div>
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">رقم الهاتف:</span>
                    <span className="user-mobile-value">{doc.phone}</span>
                  </div>
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">قيمة التأمين:</span>
                    <span className="user-mobile-value">{formatCurrency(doc.insurance_value)}</span>
                  </div>
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">نسبة الوكيل:</span>
                    <span className="user-mobile-value">{doc.agent_percentage}%</span>
                  </div>
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">القيمة للوكيل:</span>
                    <span className="user-mobile-value">{formatCurrency(doc.agent_amount)}</span>
                  </div>
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">القيمة للشركة:</span>
                    <span className="user-mobile-value">{formatCurrency(doc.company_amount)}</span>
                  </div>
                  <div className="user-mobile-row">
                    <span className="user-mobile-label">التاريخ:</span>
                    <span className="user-mobile-value">{formatDate(doc.date)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="users-card" style={{ marginTop: '24px' }}>
            <div style={{ 
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '20px',
              marginBottom: '24px',
            }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>القيمة المستحقة</label>
                <input
                  type="text"
                  value={formatCurrency(summary.due_amount)}
                  readOnly
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: '#f5f5f5',
                    fontSize: 14,
                    minHeight: 42,
                    cursor: 'not-allowed',
                  }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>المدفوع</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={paidAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // السماح بالأرقام والفاصلة العشرية والفاصلة للآلاف
                      if (value === '' || /^[\d,\.]+$/.test(value)) {
                        // تحويل القيمة إلى رقم للتحقق من الحد الأقصى
                        const numValue = value === '' ? 0 : parseFloat(value.replace(/,/g, ''));
                        // السماح بالقيمة حتى القيمة المستحقة (يمكن أن تكون أكبر في حالة الدفع الزائد)
                        if (numValue >= 0) {
                          setPaidAmount(value);
                        }
                      }
                    }}
                    placeholder="0.00"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: '#fff',
                      fontSize: 14,
                      minHeight: 42,
                    }}
                  />
                  {summary.paid_vouchers_amount > 0 && (
                    <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', fontWeight: 500 }}>
                      <i className="fa-solid fa-circle-info" style={{ marginLeft: '4px' }}></i>
                      إيصالات الشهر: {formatCurrency(summary.paid_vouchers_amount)}
                    </div>
                  )}
                  {summary.total_vouchers_all_time > 0 && summary.total_vouchers_all_time > summary.paid_vouchers_amount && (
                    <div style={{ fontSize: '11px', color: '#10b981', marginTop: '2px', fontWeight: 500 }}>
                      <i className="fa-solid fa-clock-rotate-left" style={{ marginLeft: '4px' }}></i>
                      إجمالي المقبوضات التراكمي: {formatCurrency(summary.total_vouchers_all_time)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      // نسخ القيمة المستحقة كما هي (مع منزلتين عشريتين)
                      const formattedValue = new Intl.NumberFormat('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(summary.due_amount);
                      setPaidAmount(formattedValue);
                    }}
                    style={{
                      position: 'absolute',
                      left: '8px',
                      padding: '6px 8px',
                      backgroundColor: '#1f2937',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '28px',
                      height: '28px',
                    }}
                    title="نسخ القيمة المستحقة"
                  >
                    <i className="fa-solid fa-copy"></i>
                  </button>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>المتبقي</label>
                <input
                  type="text"
                  value={formatCurrency(Math.abs(remainingAmount)) + (remainingAmount < 0 ? ' (مدفوع زائد)' : '')}
                  readOnly
                  disabled
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: remainingAmount < 0 ? '#fef3c7' : '#f5f5f5',
                    fontSize: 14,
                    minHeight: 42,
                    cursor: 'not-allowed',
                    color: remainingAmount < 0 ? '#92400e' : 'inherit',
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '20px',
              borderTop: '1px solid var(--border)',
            }}>
              <button
                onClick={handleSave}
                className="btn-submit"
                disabled={filterMode !== 'monthly'}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                  backgroundColor: '#10b981',
                  opacity: filterMode !== 'monthly' ? 0.6 : 1,
                  cursor: filterMode !== 'monthly' ? 'not-allowed' : 'pointer',
                }}
              >
                <i className="fa-solid fa-save" style={{ marginLeft: '8px' }}></i>
                حفظ
              </button>
              <button
                onClick={handlePrint}
                className="btn-submit"
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 600,
                }}
              >
                <i className="fa-solid fa-print" style={{ marginLeft: '8px' }}></i>
                طباعة
              </button>
            </div>
          </div>
        </>
      )}

      {documents.length === 0 && !loading && (
          <div className="users-card" style={{ 
            textAlign: 'center', 
            padding: '40px',
            color: 'var(--muted)',
          }}>
            اختر الوكيل وحدد فترة البحث ثم اضغط على "بحث" لعرض البيانات
          </div>
        )}
      </div>
    </section>
  );
}
