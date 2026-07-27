import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';

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
  total_sales: number;
  agent_share: number;
  company_share: number;
  carried_balance: number;
  paid_amount: number;
  remaining: number;
  notes: string | null;
}

interface AgentInfo {
  id: number;
  code: string;
  agency_name: string;
  agent_name: string;
  contract_date: string | null;
}

interface LedgerSummary {
  total_months: number;
  total_documents: number;
  total_sales: number;
  total_agent_share: number;
  total_company_share: number;
  total_paid: number;
  total_remaining: number;
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
  total_sales: number;
  total_agent_share: number;
  total_company_share: number;
}

export default function AgentMonthlyLedger() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<BranchAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [excludeCanceled, setExcludeCanceled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [payModal, setPayModal] = useState<{ row: MonthRow } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  // Month Documents Modal State
  const [monthDocsModal, setMonthDocsModal] = useState<{ row: MonthRow } | null>(null);
  const [monthDocsList, setMonthDocsList] = useState<MonthDocItem[]>([]);
  const [monthDocsSummary, setMonthDocsSummary] = useState<MonthDocsSummary | null>(null);
  const [loadingMonthDocs, setLoadingMonthDocs] = useState(false);
  const [searchMonthDocs, setSearchMonthDocs] = useState('');
  const [filterDocType, setFilterDocType] = useState('all');

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

  // Searchable Dropdown State
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [agentSearchText, setAgentSearchText] = useState('');
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  const fetchLedger = async (agentId: number, exclude?: boolean) => {
    const ex = exclude !== undefined ? exclude : excludeCanceled;
    setLoading(true);
    setLedger(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `${API_BASE_URL}/financial-statistics/agent-monthly-ledger?agent_id=${agentId}&exclude_canceled=${ex}`,
        { headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      );
      if (!res.ok) throw new Error();
      const data: LedgerData = await res.json();
      setLedger(data);
    } catch {
      showToast('حدث خطأ أثناء جلب كشف الحساب', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExcludeToggle = () => {
    const next = !excludeCanceled;
    setExcludeCanceled(next);
    if (selectedAgentId) fetchLedger(selectedAgentId, next);
  };

  const openPay = (row: MonthRow) => {
    setPayModal({ row });
    const due = row.agent_share + row.carried_balance - row.paid_amount;
    setPayAmount(due > 0 ? due.toFixed(2) : '0');
    setPayNotes(row.notes || '');
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
      const dueTotal = payModal.row.agent_share + payModal.row.carried_balance;
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
      if (!res.ok) throw new Error();
      showToast('تم تسجيل الدفعة وإنشاء إيصال القبض في إدارة الإيرادات بنجاح', 'success');
      setPayModal(null);
      fetchLedger(selectedAgentId);
    } catch {
      showToast('حدث خطأ أثناء حفظ الدفعة', 'error');
    } finally {
      setPayLoading(false);
    }
  };

  // Month Documents Modal Handlers
  const openMonthDocs = (row: MonthRow) => {
    setMonthDocsModal({ row });
    setSearchMonthDocs('');
    setFilterDocType('all');
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

  const handleExportExcel = () => {
    if (!ledger) return;
    const excelRows = ledger.months.map((m) => ({
      month_label: m.month_label,
      document_count: m.document_count,
      total_sales: m.total_sales,
      agent_share: m.agent_share,
      company_share: m.company_share,
      paid_amount: m.paid_amount,
      remaining: m.remaining,
      carried_balance: m.carried_balance,
      notes: m.notes || '',
    }));
    generatePremiumExcel(excelRows, `كشف_حساب_الوكيل_${ledger.agent.agency_name}`);
  };

  const selectedAgentObj = agents.find((a) => a.id === selectedAgentId);
  const filteredAgentsDropdown = agents.filter(
    (a) =>
      a.agency_name.toLowerCase().includes(agentSearchText.toLowerCase()) ||
      a.code.toLowerCase().includes(agentSearchText.toLowerCase()) ||
      a.agent_name.toLowerCase().includes(agentSearchText.toLowerCase())
  );

  const td: React.CSSProperties = {
    padding: '8px 4px',
    textAlign: 'center',
    borderBottom: '1px solid var(--border)',
    fontFamily: "'Cairo', sans-serif",
  };

  return (
    <div style={{ padding: '24px', width: '100%', boxSizing: 'border-box' }}>
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
          <button
            onClick={handleExportExcel}
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
            <i className="fa-solid fa-file-excel" /> تصدير إكسيل
          </button>
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

        {/* Toggle Switch Exclude Canceled */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontWeight: 800, fontSize: '13px', color: 'var(--text)', fontFamily: "'Cairo',sans-serif", cursor: 'pointer' }}>
            استبعاد الوثائق الملغاة من الإحصائيات:
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
          {/* Agent Info Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              borderRadius: '20px',
              padding: '24px 30px',
              color: 'white',
              marginBottom: '24px',
              boxShadow: '0 10px 30px rgba(30,64,175,0.25)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <div>
              <div style={{ fontSize: '12px', opacity: 0.85, fontWeight: 700, fontFamily: "'Cairo',sans-serif" }}>
                الوكيل / الفرع المحدد
              </div>
              <h2 style={{ margin: '4px 0 8px 0', fontSize: '24px', fontWeight: 900, fontFamily: "'Cairo',sans-serif" }}>
                {ledger.agent.agency_name}
              </h2>
              <div style={{ display: 'flex', gap: '16px', fontSize: '13px', opacity: 0.9, fontFamily: "'Cairo',sans-serif" }}>
                <span>كود الوكيل: <strong>{ledger.agent.code}</strong></span>
                <span>المسؤول: <strong>{ledger.agent.agent_name}</strong></span>
                {ledger.agent.contract_date && (
                  <span>تاريخ العقد: <strong>{ledger.agent.contract_date.substring(0, 10)}</strong></span>
                )}
              </div>
            </div>

            {/* Summary Badges */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  padding: '12px 18px',
                  borderRadius: '14px',
                  textAlign: 'center',
                  minWidth: '110px',
                }}
              >
                <div style={{ fontSize: '11px', opacity: 0.85, fontFamily: "'Cairo',sans-serif" }}>إجمالي المبيعات</div>
                <div style={{ fontSize: '18px', fontWeight: 900, fontFamily: "'Cairo',sans-serif", marginTop: '2px' }}>
                  {fmt(ledger.summary.total_sales)} <span style={{ fontSize: '11px' }}>د.ل</span>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  padding: '12px 18px',
                  borderRadius: '14px',
                  textAlign: 'center',
                  minWidth: '110px',
                }}
              >
                <div style={{ fontSize: '11px', opacity: 0.85, fontFamily: "'Cairo',sans-serif" }}>عمولة الوكيل</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#fef08a', fontFamily: "'Cairo',sans-serif", marginTop: '2px' }}>
                  {fmt(ledger.summary.total_agent_share)} <span style={{ fontSize: '11px' }}>د.ل</span>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  padding: '12px 18px',
                  borderRadius: '14px',
                  textAlign: 'center',
                  minWidth: '110px',
                }}
              >
                <div style={{ fontSize: '11px', opacity: 0.85, fontFamily: "'Cairo',sans-serif" }}>المستلم حتى الآن</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#a7f3d0', fontFamily: "'Cairo',sans-serif", marginTop: '2px' }}>
                  {fmt(ledger.summary.total_paid)} <span style={{ fontSize: '11px' }}>د.ل</span>
                </div>
              </div>

              <div
                style={{
                  background: ledger.summary.total_remaining > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)',
                  backdropFilter: 'blur(10px)',
                  padding: '12px 18px',
                  borderRadius: '14px',
                  textAlign: 'center',
                  minWidth: '110px',
                  border: ledger.summary.total_remaining > 0 ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(16,185,129,0.5)',
                }}
              >
                <div style={{ fontSize: '11px', opacity: 0.85, fontFamily: "'Cairo',sans-serif" }}>المتبقي المطلوب</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: ledger.summary.total_remaining > 0 ? '#fecaca' : '#a7f3d0', fontFamily: "'Cairo',sans-serif", marginTop: '2px' }}>
                  {fmt(ledger.summary.total_remaining)} <span style={{ fontSize: '11px' }}>د.ل</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Table Card */}
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '20px',
              padding: '20px',
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
                    {['#', 'الشهر', 'نسبة %', 'عدد الوثائق', 'إجمالي المبيعات', 'حصة الوكيل', 'حصة الشركة', 'دين مترحل', 'المستلم', 'الباقي', 'إجراء'].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: '9px 4px',
                            fontWeight: 800,
                            fontSize: '11px',
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
                  {ledger.months.map((row, idx) => {
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
                        <td style={td}>
                          {row.document_count > 0 ? (
                            <span style={{ background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)', color: '#065f46', padding: '2px 8px', borderRadius: '20px', fontWeight: 800, fontSize: '11px' }}>
                              {row.document_count}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>—</span>
                          )}
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
                        <td style={{ ...td, whiteSpace: 'nowrap', padding: '6px 4px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                            {/* View Month Documents Button */}
                            <button
                              className="pay-btn"
                              onClick={() => openMonthDocs(row)}
                              title="عرض وثائق هذا الشهر بالتفصيل"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontFamily: "'Cairo',sans-serif",
                                fontWeight: 800,
                                fontSize: '11px',
                                color: 'white',
                                background: 'linear-gradient(135deg,#0284c7,#0369a1)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all .2s',
                                boxShadow: '0 2px 6px rgba(2,132,199,0.25)',
                              }}
                            >
                              <i className="fa-solid fa-folder-open" style={{ fontSize: '10px' }} />وثائق الشهر
                            </button>

                            {!isEmpty && (
                              <button
                                className="pay-btn"
                                onClick={() => openPay(row)}
                                title="تسديد دفعة لهذا الشهر"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  border: 'none',
                                  cursor: 'pointer',
                                  fontFamily: "'Cairo',sans-serif",
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  color: 'white',
                                  background: 'linear-gradient(135deg,#1e40af,#3b82f6)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all .2s',
                                  boxShadow: '0 2px 6px rgba(30,64,175,0.2)',
                                }}
                              >
                                <i className="fa-solid fa-money-bill-transfer" style={{ fontSize: '10px' }} />تسديد
                              </button>
                            )}

                            <button
                              className="pay-btn"
                              onClick={() =>
                                navigate('/old-documents', {
                                  state: {
                                    branchAgentId: ledger.agent.id,
                                    issueDate: `${row.year}-${String(row.month).padStart(2, '0')}-01`,
                                  },
                                })
                              }
                              title="إضافة وثيقة قديمة لهذا الشهر"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontFamily: "'Cairo',sans-serif",
                                fontWeight: 700,
                                fontSize: '11px',
                                color: 'white',
                                background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all .2s',
                                boxShadow: '0 2px 6px rgba(124,58,237,0.2)',
                              }}
                            >
                              <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: '10px' }} />وثائق قديمة
                            </button>

                            <button
                              className="pay-btn"
                              onClick={() => navigate(`/branches-agents/${ledger.agent.id}`)}
                              title="الانتقال لبروفايل الوكيل"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: 'pointer',
                                fontFamily: "'Cairo',sans-serif",
                                fontWeight: 700,
                                fontSize: '11px',
                                color: 'white',
                                background: 'linear-gradient(135deg,#0d9488,#14b8a6)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all .2s',
                                boxShadow: '0 2px 6px rgba(13,148,136,0.2)',
                              }}
                            >
                              <i className="fa-solid fa-id-card" style={{ fontSize: '10px' }} />البروفايل
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--table-header)', borderTop: '3px solid var(--border)' }}>
                    <td colSpan={3} style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 900, fontSize: '15px', color: 'var(--text)' }}>
                      <i className="fa-solid fa-sigma" style={{ marginLeft: '8px' }} />المجموع الكلي
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: 'var(--text)' }}>
                      {ledger.summary.total_documents.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: '#3b82f6' }}>
                      {fmt(ledger.summary.total_sales)}
                      <span style={{ fontSize: '11px', marginRight: '3px' }}>د.ل</span>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: '#a78bfa' }}>
                      {fmt(ledger.summary.total_agent_share)}
                      <span style={{ fontSize: '11px', marginRight: '3px' }}>د.ل</span>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: '#2dd4bf' }}>
                      {fmt(ledger.summary.total_company_share)}
                      <span style={{ fontSize: '11px', marginRight: '3px' }}>د.ل</span>
                    </td>
                    <td style={{ padding: '14px', textAlign: 'center', color: 'var(--muted)' }}>—</td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: '#059669' }}>
                      {fmt(ledger.summary.total_paid)}
                      <span style={{ fontSize: '11px', marginRight: '3px' }}>د.ل</span>
                    </td>
                    <td
                      style={{
                        padding: '14px',
                        textAlign: 'center',
                        fontWeight: 900,
                        fontSize: '14px',
                        color: ledger.summary.total_remaining > 0 ? '#dc2626' : '#059669',
                      }}
                    >
                      {fmt(ledger.summary.total_remaining)}
                      <span style={{ fontSize: '11px', marginRight: '3px' }}>د.ل</span>
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

            {/* Summary Stat Chips Bar */}
            {monthDocsSummary && (
              <div
                style={{
                  padding: '14px 28px',
                  background: 'var(--table-header)',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    background: 'var(--card-bg)',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 700,
                  }}
                >
                  📄 عدد الوثائق: <strong style={{ color: '#0284c7' }}>{monthDocsSummary.total_documents}</strong>
                </div>
                <div
                  style={{
                    background: 'var(--card-bg)',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    fontSize: '12px',
                    fontFamily: "'Cairo',sans-serif",
                    fontWeight: 700,
                  }}
                >
                  💰 إجمالي المبيعات: <strong style={{ color: '#3b82f6' }}>{fmt(monthDocsSummary.total_sales)} د.ل</strong>
                </div>
                <div
                  style={{
                    background: 'var(--card-bg)',
                    padding: '8px 16px',
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
                    padding: '8px 16px',
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

            {/* Documents List Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px' }}>
              {loadingMonthDocs ? (
                <div style={{ textAlign: 'center', padding: '50px', color: 'var(--muted)' }}>
                  <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '32px', color: '#0284c7', marginBottom: '12px' }} />
                  <p style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 700 }}>جاري تحميل وثائق الشهر...</p>
                </div>
              ) : monthDocsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px', color: 'var(--muted)' }}>
                  <i className="fa-solid fa-folder-open" style={{ fontSize: '40px', marginBottom: '12px' }} />
                  <p style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 700 }}>لا توجد وثائق صادرة في هذا الشهر بحسب البحث الفعلي</p>
                </div>
              ) : (
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
                    {monthDocsList.map((doc, i) => (
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
                          ) : (
                            <span style={{ background: '#d1fae5', color: '#047857', padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 800 }}>
                              فعالة
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
              )}
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
        >
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "'Cairo',sans-serif",
                  fontWeight: 900,
                  fontSize: '20px',
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <i className="fa-solid fa-money-bill-transfer" style={{ color: '#1e40af' }} />تسديد دفعة — {payModal.row.month_label}
              </h2>
              <button onClick={() => setPayModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '22px', color: 'var(--muted)', lineHeight: 1 }}>
                ✕
              </button>
            </div>

            <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontFamily: "'Cairo',sans-serif", fontSize: '13px', color: '#334155' }}>
                <span><strong>حصة الشهر:</strong> {fmt(payModal.row.agent_share)} د.ل</span>
                <span><strong>دين مترحل:</strong> {fmt(payModal.row.carried_balance)} د.ل</span>
                <span style={{ color: '#1e40af', fontWeight: 800 }}><strong>الإجمالي المطلوب:</strong> {fmt(payModal.row.agent_share + payModal.row.carried_balance)} د.ل</span>
                <span style={{ color: '#059669' }}><strong>مدفوع سابقاً:</strong> {fmt(payModal.row.paid_amount)} د.ل</span>
              </div>
            </div>

            <label style={{ display: 'block', marginBottom: '8px', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
              المبلغ المستلم الآن (د.ل)
            </label>
            <input
              type="number"
              className="modal-input"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              style={{ marginBottom: '12px' }}
            />

            {payAmount !== '' && (
              <div
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  marginBottom: '14px',
                  fontFamily: "'Cairo',sans-serif",
                  fontWeight: 800,
                  fontSize: '14px',
                  background:
                    payModal.row.agent_share + payModal.row.carried_balance - (payModal.row.paid_amount + parseFloat(payAmount || '0')) > 0.01
                      ? 'linear-gradient(135deg,#fee2e2,#fecaca)'
                      : 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
                  color:
                    payModal.row.agent_share + payModal.row.carried_balance - (payModal.row.paid_amount + parseFloat(payAmount || '0')) > 0.01
                      ? '#991b1b'
                      : '#065f46',
                }}
              >
                الباقي بعد التسديد: {fmt(Math.max(0, payModal.row.agent_share + payModal.row.carried_balance - (payModal.row.paid_amount + parseFloat(payAmount || '0'))))} د.ل
              </div>
            )}

            <label style={{ display: 'block', marginBottom: '8px', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
              ملاحظات (اختياري)
            </label>
            <textarea
              className="modal-input"
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              placeholder="أي ملاحظات إضافية..."
              rows={3}
              style={{ marginBottom: '20px', resize: 'none' }}
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPayModal(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: '2px solid var(--border)',
                  background: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Cairo',sans-serif",
                  fontWeight: 700,
                  fontSize: '14px',
                  color: 'var(--muted)',
                }}
              >
                إلغاء
              </button>
              <button
                onClick={submitPayment}
                disabled={payLoading || payAmount === '' || parseFloat(payAmount) <= 0}
                style={{
                  padding: '10px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: payLoading || payAmount === '' ? 'not-allowed' : 'pointer',
                  fontFamily: "'Cairo',sans-serif",
                  fontWeight: 800,
                  fontSize: '14px',
                  color: 'white',
                  background: 'linear-gradient(135deg,#1e40af,#3b82f6)',
                  opacity: payLoading || payAmount === '' ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(30,64,175,0.4)',
                }}
              >
                {payLoading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin" />جاري الحفظ...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk" />حفظ الدفعة
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
