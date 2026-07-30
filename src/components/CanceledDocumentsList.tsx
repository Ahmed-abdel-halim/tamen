import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';

interface CanceledDoc {
  id: number;
  table: string;
  doc_type_label: string;
  insurance_number: string;
  insurance_type: string;
  insured_name: string;
  total: number;
  premium: number;
  issue_date: string | null;
  start_date: string | null;
  end_date: string | null;
  branch_agent_id: number | null;
  agency_name: string;
  canceled_at: string | null;
  canceled_by: number | null;
  cancel_reason: string;
}

interface BranchAgent {
  id: number;
  code: string;
  agency_name: string;
  agent_name: string;
}

interface Summary {
  total_count: number;
  total_value: number;
}

const DOC_TYPES = [
  { key: '', label: 'جميع الأنواع' },
  { key: 'insurance_documents', label: 'تأمين السيارات' },
  { key: 'international_insurance_documents', label: 'التأمين الدولي' },
  { key: 'travel_insurance_documents', label: 'تأمين المسافرين' },
  { key: 'resident_insurance_documents', label: 'تأمين الوافدين' },
  { key: 'marine_structure_insurance_documents', label: 'تأمين الهياكل البحرية' },
  { key: 'professional_liability_insurance_documents', label: 'المسؤولية المهنية' },
  { key: 'personal_accident_insurance_documents', label: 'الحوادث الشخصية' },
  { key: 'school_student_insurance_documents', label: 'تأمين الطلاب' },
  { key: 'cash_in_transit_insurance_documents', label: 'نقل النقدية' },
  { key: 'cargo_insurance_documents', label: 'شحن البضائع' },
];

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmtDate = (d: string | null) => {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ar-LY'); } catch { return d; }
};

export default function CanceledDocumentsList() {
  const [docs, setDocs] = useState<CanceledDoc[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<BranchAgent[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterAgentId, setFilterAgentId] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [perPage] = useState(15);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Agent searchable dropdown
  const [agentSearch, setAgentSearch] = useState('');
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) {
        setIsAgentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterType, filterAgentId, filterYear, filterMonth, filterDay]);

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/branches-agents`, {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const d = await res.json();
        setAgents(Array.isArray(d) ? d : (d.data || []));
      }
    } catch { /* silent */ }
  };

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const userId = currentUser?.id ? String(currentUser.id) : (localStorage.getItem('user_id') || localStorage.getItem('userId'));

      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      if (filterAgentId) params.set('branch_agent_id', filterAgentId);
      if (filterYear) params.set('year', filterYear);
      if (filterMonth) params.set('month', filterMonth);
      if (filterDay) params.set('day', filterDay);
      if (userId) params.set('user_id', userId);

      params.set('per_page', String(perPage));
      params.set('page', String(page));

      const res = await fetch(`${API_BASE_URL}/canceled-documents?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(userId ? { 'X-User-Id': userId } : {}),
        }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || 'خطأ في جلب الوثائق الملغية', 'error');
        return;
      }
      const data = await res.json();
      setDocs(data.data || []);
      setSummary(data.summary || null);
      setTotal(data.total || 0);
      setLastPage(data.last_page || 1);
    } catch {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchDocs();
  };

  const handleReset = () => {
    setSearch('');
    setFilterType('');
    setFilterAgentId('');
    setFilterYear('');
    setFilterMonth('');
    setFilterDay('');
    setAgentSearch('');
    setPage(1);
    setTimeout(() => fetchDocs(), 50);
  };

  const exportExcel = async () => {
    if (!docs.length) { showToast('لا توجد بيانات للتصدير', 'error'); return; }
    try {
      const columns = [
        { header: 'رقم الوثيقة', key: 'insurance_number', width: 20 },
        { header: 'نوع التأمين', key: 'doc_type_label', width: 22 },
        { header: 'اسم المؤمن', key: 'insured_name', width: 25 },
        { header: 'الوكيل', key: 'agency_name', width: 25 },
        { header: 'القسط', key: 'premium', width: 15 },
        { header: 'الإجمالي', key: 'total', width: 15 },
        { header: 'تاريخ الإصدار', key: 'issue_date', width: 16 },
        { header: 'تاريخ الإلغاء', key: 'canceled_at', width: 16 },
        { header: 'سبب الإلغاء', key: 'cancel_reason', width: 35 },
      ];
      const data = docs.map((d) => ({
        insurance_number: d.insurance_number,
        doc_type_label: d.doc_type_label,
        insured_name: d.insured_name,
        agency_name: d.agency_name,
        premium: d.premium,
        total: d.total,
        issue_date: fmtDate(d.issue_date),
        canceled_at: fmtDate(d.canceled_at),
        cancel_reason: d.cancel_reason,
      }));
      await generatePremiumExcel({
        title: 'تقرير الوثائق الملغية',
        subtitle: `إجمالي الوثائق: ${total} | القيمة الإجمالية: ${summary ? fmt(summary.total_value) : 0} د.ل`,
        columns,
        data,
        fileName: `الوثائق_الملغية_${new Date().toISOString().substring(0, 10)}`,
      });
      showToast('تم تصدير ملف الإكسيل بنجاح', 'success');
    } catch {
      showToast('حدث خطأ أثناء تصدير ملف الإكسيل', 'error');
    }
  };

  const exportWord = () => {
    if (!docs.length) { showToast('لا توجد بيانات للتصدير', 'error'); return; }

    const rows = docs.map((d, i) => `
      <tr style="border:1px solid #ccc;">
        <td style="padding:6px;border:1px solid #ccc;">${i + 1}</td>
        <td style="padding:6px;border:1px solid #ccc;">${d.insurance_number}</td>
        <td style="padding:6px;border:1px solid #ccc;">${d.doc_type_label}</td>
        <td style="padding:6px;border:1px solid #ccc;">${d.insured_name}</td>
        <td style="padding:6px;border:1px solid #ccc;">${d.agency_name}</td>
        <td style="padding:6px;border:1px solid #ccc;">${fmt(d.total)} د.ل</td>
        <td style="padding:6px;border:1px solid #ccc;">${fmtDate(d.canceled_at)}</td>
        <td style="padding:6px;border:1px solid #ccc;">${d.cancel_reason}</td>
      </tr>`).join('');

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
      <head><meta charset="utf-8"/><title>الوثائق الملغية</title>
      <style>body{font-family:Arial;direction:rtl;} table{width:100%;border-collapse:collapse;} th{background:#1a1a2e;color:#fff;padding:8px;border:1px solid #ccc;}</style></head>
      <body>
        <h2 style="text-align:center;color:#1a1a2e;">تقرير الوثائق الملغية</h2>
        <p style="text-align:center;">إجمالي: ${total} وثيقة | القيمة الإجمالية: ${summary ? fmt(summary.total_value) : 0} د.ل</p>
        <table>
          <thead><tr>
            <th>#</th><th>رقم الوثيقة</th><th>النوع</th><th>المؤمن</th>
            <th>الوكيل</th><th>الإجمالي</th><th>تاريخ الإلغاء</th><th>السبب</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </body></html>`;

    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'الوثائق_الملغية.doc'; a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير ملف Word بنجاح', 'success');
  };

  const filteredAgents = agents.filter(a =>
    a.agency_name?.toLowerCase().includes(agentSearch.toLowerCase()) ||
    a.agent_name?.toLowerCase().includes(agentSearch.toLowerCase()) ||
    a.code?.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const selectedAgent = agents.find(a => String(a.id) === filterAgentId);

  return (
    <div style={{ padding: '24px', direction: 'rtl', fontFamily: "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif", width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', background: 'var(--card-bg, #ffffff)', padding: '20px 24px', borderRadius: '16px', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', color: '#fff', boxShadow: '0 4px 14px rgba(239,68,68,0.3)' }}>
            <i className="fa-solid fa-ban" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: 'var(--text, #0f172a)' }}>
              الوثائق الملغية
            </h1>
            <p style={{ margin: '4px 0 0', color: 'var(--muted, #64748b)', fontSize: '13px' }}>
              جميع الوثائق الملغية مستثناة بالكامل من كشف حساب الوكيل والتقارير المالية
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(239,68,68,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--muted, #64748b)', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>إجمالي الوثائق الملغية</div>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#dc2626' }}>{total.toLocaleString()}</div>
                <div style={{ color: 'var(--muted, #64748b)', fontSize: '12px', marginTop: '2px' }}>وثيقة ملغية</div>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                <i className="fa-solid fa-file-excel" />
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 15px rgba(59,130,246,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: 'var(--muted, #64748b)', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>إجمالي قيمة الملغية</div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#2563eb' }}>{fmt(summary.total_value)} <span style={{ fontSize: '12px', fontWeight: 700 }}>د.ل</span></div>
                <div style={{ color: 'var(--muted, #64748b)', fontSize: '12px', marginTop: '2px' }}>دينار ليبي</div>
              </div>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                <i className="fa-solid fa-coins" />
              </div>
            </div>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px', padding: '20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '26px', color: '#dc2626' }}>
              <i className="fa-solid fa-circle-exclamation" />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text, #1e293b)', lineHeight: '1.6', fontWeight: 600 }}>
              ملاحظة: الوثائق الملغية <strong style={{ color: '#dc2626' }}>تستثنى تلقائياً</strong> من حسابات الوكلاء والتقارير المالية والإنتاجية.
            </div>
          </div>
        </div>
      )}

      {/* Filters Box */}
      <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '16px', padding: '20px', marginBottom: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '16px' }}>
          {/* Search */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--muted, #64748b)' }}>البحث</label>
            <input
              type="text"
              placeholder="رقم الوثيقة، اسم المؤمن..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border, #cbd5e1)', background: 'var(--panel, #f8fafc)', color: 'var(--text, #0f172a)', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Doc Type */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--muted, #64748b)' }}>نوع الوثيقة</label>
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border, #cbd5e1)', background: 'var(--panel, #f8fafc)', color: 'var(--text, #0f172a)', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
            >
              {DOC_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          {/* Agent */}
          <div ref={agentDropdownRef} style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--muted, #64748b)' }}>الوكيل</label>
            <div
              onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
              style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border, #cbd5e1)', background: 'var(--panel, #f8fafc)', color: 'var(--text, #0f172a)', cursor: 'pointer', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>{selectedAgent ? selectedAgent.agency_name : 'جميع الوكلاء'}</span>
              <i className={`fa-solid fa-chevron-${isAgentDropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '11px', opacity: 0.6 }} />
            </div>
            {isAgentDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 100, background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border, #cbd5e1)', borderRadius: '12px', maxHeight: '220px', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', marginTop: '4px' }}>
                <input
                  autoFocus
                  type="text"
                  placeholder="بحث..."
                  value={agentSearch}
                  onChange={e => setAgentSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: '100%', padding: '9px 12px', border: 'none', borderBottom: '1px solid var(--border, #e2e8f0)', background: 'var(--panel, #f8fafc)', color: 'var(--text, #0f172a)', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}
                />
                <div style={{ overflowY: 'auto', maxHeight: '160px' }}>
                  <div onClick={() => { setFilterAgentId(''); setIsAgentDropdownOpen(false); setPage(1); }} style={{ padding: '9px 12px', cursor: 'pointer', color: 'var(--muted)', fontSize: '13px' }}>جميع الوكلاء</div>
                  {filteredAgents.map(a => (
                    <div key={a.id} onClick={() => { setFilterAgentId(String(a.id)); setIsAgentDropdownOpen(false); setPage(1); }} style={{ padding: '9px 12px', cursor: 'pointer', color: 'var(--text, #0f172a)', fontSize: '13px', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                      {a.agency_name} ({a.code})
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Year */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--muted, #64748b)' }}>السنة</label>
            <input type="number" placeholder="2025" value={filterYear} onChange={e => { setFilterYear(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border, #cbd5e1)', background: 'var(--panel, #f8fafc)', color: 'var(--text, #0f172a)', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }} />
          </div>

          {/* Month */}
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: 800, color: 'var(--muted, #64748b)' }}>الشهر</label>
            <select value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border, #cbd5e1)', background: 'var(--panel, #f8fafc)', color: 'var(--text, #0f172a)', outline: 'none', fontSize: '13px', boxSizing: 'border-box' }}>
              <option value="">كل الأشهر</option>
              {['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'].map((m, i) => (
                <option key={i+1} value={String(i+1)}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={handleSearch} style={{ padding: '9px 22px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-magnifying-glass" /> بحث
          </button>
          <button onClick={handleReset} style={{ padding: '9px 18px', borderRadius: '10px', border: '1px solid var(--border, #cbd5e1)', background: 'var(--panel, #f8fafc)', color: 'var(--text, #0f172a)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            🔄 إعادة تعيين
          </button>

          <div style={{ marginRight: 'auto', display: 'flex', gap: '8px' }}>
            <button onClick={exportExcel} style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-file-excel" /> تصدير Excel
            </button>
            <button onClick={exportWord} style={{ padding: '9px 18px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-file-word" /> تصدير Word
            </button>
          </div>
        </div>
      </div>

      {/* Table Box */}
      <div style={{ background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '32px', color: '#dc2626', marginBottom: '12px' }} />
            <div style={{ fontSize: '14px', fontWeight: 700 }}>جاري تحميل الوثائق الملغية...</div>
          </div>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '54px', marginBottom: '16px', opacity: 0.4 }}>🚫</div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text, #0f172a)', marginBottom: '6px' }}>لا توجد وثائق ملغية</div>
            <div style={{ fontSize: '13px' }}>لم يتم إلغاء أي وثيقة مطابقة لفلاتر البحث حتى الآن</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '950px' }}>
                <thead>
                  <tr style={{ background: 'rgba(239, 68, 68, 0.08)', borderBottom: '2px solid var(--border, #e2e8f0)' }}>
                    {['#', 'رقم الوثيقة', 'نوع التأمين', 'اسم المؤمن', 'الوكيل', 'الإجمالي', 'تاريخ الإصدار', 'تاريخ الإلغاء', 'سبب الإلغاء'].map(h => (
                      <th key={h} style={{ padding: '14px 12px', textAlign: 'right', fontSize: '13px', color: '#dc2626', fontWeight: 800, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, idx) => (
                    <tr key={`${doc.table}-${doc.id}`} style={{ borderBottom: '1px solid var(--border, #e2e8f0)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '12px', fontSize: '13px', color: 'var(--muted)' }}>{((page - 1) * perPage) + idx + 1}</td>
                      <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text, #0f172a)', fontWeight: 800 }}>{doc.insurance_number}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: 'rgba(2, 132, 199, 0.08)', border: '1px solid rgba(2, 132, 199, 0.2)', borderRadius: '8px', padding: '4px 10px', fontSize: '12px', color: '#0284c7', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {doc.doc_type_label}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '13px', color: 'var(--text, #0f172a)' }}>{doc.insured_name}</td>
                      <td style={{ padding: '12px', fontSize: '13px', color: 'var(--muted)' }}>{doc.agency_name}</td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#dc2626', fontWeight: 900 }}>{fmt(doc.total)} د.ل</td>
                      <td style={{ padding: '12px', fontSize: '13px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDate(doc.issue_date)}</td>
                      <td style={{ padding: '12px', fontSize: '13px', color: '#dc2626', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtDate(doc.canceled_at)}</td>
                      <td style={{ padding: '12px', fontSize: '12px', color: 'var(--muted)', maxWidth: '220px' }}>
                        <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.cancel_reason}>
                          {doc.cancel_reason}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'rgba(239, 68, 68, 0.05)', borderTop: '2px solid var(--border, #e2e8f0)' }}>
                    <td colSpan={5} style={{ padding: '12px', fontSize: '13px', color: 'var(--muted)', fontWeight: 700 }}>
                      إجمالي الصفحة ({docs.length} وثيقة)
                    </td>
                    <td style={{ padding: '12px', fontSize: '14px', color: '#dc2626', fontWeight: 900 }}>
                      {fmt(docs.reduce((s, d) => s + d.total, 0))} د.ل
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination */}
            {lastPage > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '16px', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border, #cbd5e1)', background: 'var(--panel, #f8fafc)', color: 'var(--text)', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, fontWeight: 600, fontSize: '13px' }}>
                  السابق
                </button>
                <span style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 700 }}>
                  صفحة {page} من {lastPage}
                </span>
                <button onClick={() => setPage(p => Math.min(lastPage, p + 1))} disabled={page === page}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border, #cbd5e1)', background: 'var(--panel, #f8fafc)', color: 'var(--text)', cursor: page === lastPage ? 'not-allowed' : 'pointer', opacity: page === lastPage ? 0.4 : 1, fontWeight: 600, fontSize: '13px' }}>
                  التالي
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

