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
  { key: '', label: 'جميع أنواع التأمين' },
  { key: 'insurance_documents', label: 'تأمين السيارات' },
  { key: 'international_insurance_documents', label: 'التأمين الدولي (LIFO)' },
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
        { header: 'الإجمالي (د.ل)', key: 'total_str', width: 18 },
        { header: 'تاريخ الإصدار', key: 'issue_date_str', width: 18 },
        { header: 'تاريخ الإلغاء', key: 'canceled_at_str', width: 18 },
        { header: 'سبب الإلغاء', key: 'cancel_reason', width: 35 },
      ];

      const data = docs.map(d => ({
        insurance_number: d.insurance_number || '-',
        doc_type_label: d.doc_type_label || '-',
        insured_name: d.insured_name || '-',
        agency_name: d.agency_name || '-',
        total_str: fmt(d.total),
        issue_date_str: fmtDate(d.issue_date),
        canceled_at_str: fmtDate(d.canceled_at),
        cancel_reason: d.cancel_reason || '-',
      }));

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير الوثائق الملغية',
        subtitle: `إجمالي الوثائق: ${total} - القيمة الإجمالية: ${fmt(summary?.total_value || 0)} د.ل - تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: `تقرير_الوثائق_الملغية_${new Date().toISOString().split('T')[0]}`,
        qrData: `مستخرج من منظومة المدار - تقرير الوثائق الملغية\nالعدد: ${total}\nالإجمالي: ${fmt(summary?.total_value || 0)} د.ل`
      });
      showToast('تم تصدير ملف الإكسيل بنجاح', 'success');
    } catch {
      showToast('حدث خطأ أثناء تصدير الإكسيل', 'error');
    }
  };

  const exportWord = () => {
    if (!docs.length) { showToast('لا توجد بيانات للتصدير', 'error'); return; }
    try {
      const rows = docs.map((d, i) => `
        <tr>
          <td>${i + 1}</td>
          <td style="font-weight: bold;">${d.insurance_number}</td>
          <td>${d.doc_type_label}</td>
          <td>${d.insured_name}</td>
          <td>${d.agency_name}</td>
          <td style="color: #dc2626; font-weight: bold;">${fmt(d.total)} د.ل</td>
          <td>${fmtDate(d.issue_date)}</td>
          <td>${fmtDate(d.canceled_at)}</td>
          <td>${d.cancel_reason}</td>
        </tr>
      `).join('');

      const html = `
        <html dir="rtl">
        <head>
          <meta charset="utf-8"/>
          <title>تقرير الوثائق الملغية</title>
          <style>
            body { font-family: 'Cairo', sans-serif; padding: 20px; color: #1e293b; }
            h2 { text-align: center; color: #dc2626; font-size: 24px; margin-bottom: 5px; }
            p.sub { text-align: center; color: #64748b; font-size: 13px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: right; }
            th { background-color: #fee2e2; color: #dc2626; font-weight: bold; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <h2>شركة المدار الليبي للتأمين</h2>
          <p class="sub">تقرير الوثائق والبطاقات الملغية | تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')} | عدد الوثائق: ${total}</p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>رقم الوثيقة</th>
                <th>نوع التأمين</th>
                <th>اسم المؤمن</th>
                <th>الوكيل</th>
                <th>الإجمالي</th>
                <th>تاريخ الإصدار</th>
                <th>تاريخ الإلغاء</th>
                <th>سبب الإلغاء</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `تقرير_الوثائق_الملغية_${new Date().toISOString().split('T')[0]}.doc`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('تم تصدير ملف الوورد بنجاح', 'success');
    } catch {
      showToast('حدث خطأ أثناء تصدير الوورد', 'error');
    }
  };

  const filteredAgents = agents.filter(a =>
    a.agency_name?.toLowerCase().includes(agentSearch.toLowerCase()) ||
    a.agent_name?.toLowerCase().includes(agentSearch.toLowerCase()) ||
    a.code?.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const selectedAgent = agents.find(a => String(a.id) === filterAgentId);

  // Pagination page numbers list helper
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (lastPage <= 7) {
      for (let i = 1; i <= lastPage; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(lastPage - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < lastPage - 2) pages.push('...');
      pages.push(lastPage);
    }
    return pages;
  };

  // Modern UI Styles
  const containerStyle: React.CSSProperties = {
    padding: '24px',
    direction: 'rtl',
    fontFamily: "'Cairo', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    width: '100%',
    boxSizing: 'border-box',
  };

  const cardGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginBottom: '28px',
  };

  const statCardBase: React.CSSProperties = {
    borderRadius: '20px',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const filterBoxStyle: React.CSSProperties = {
    background: 'var(--card-bg, #ffffff)',
    border: '1px solid var(--border, #e2e8f0)',
    borderRadius: '20px',
    padding: '24px',
    marginBottom: '28px',
    boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 16px',
    borderRadius: '12px',
    border: '2px solid var(--border, #e2e8f0)',
    background: 'var(--panel, #f8fafc)',
    color: 'var(--text, #0f172a)',
    outline: 'none',
    fontSize: '13px',
    boxSizing: 'border-box',
    fontFamily: "'Cairo', sans-serif",
    transition: 'all 0.3s ease',
  };

  const actionBtnStyle = (bg: string): React.CSSProperties => ({
    padding: '11px 22px',
    borderRadius: '12px',
    border: 'none',
    background: bg,
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: '13px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: `0 4px 15px ${bg}40`,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: "'Cairo', sans-serif",
  });

  return (
    <div style={containerStyle}>
      {/* Animations CSS */}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .canceled-stat-card:hover { transform: translateY(-6px) !important; box-shadow: 0 20px 45px rgba(0,0,0,0.15) !important; }
        .canceled-btn:hover { transform: translateY(-2px); filter: brightness(1.08); }
        .canceled-table-row:hover { background: rgba(239, 68, 68, 0.04) !important; }
        .canceled-input:focus { border-color: #2563eb !important; background: #ffffff !important; box-shadow: 0 0 0 4px rgba(37,99,235,0.1) !important; }
      `}</style>

      {/* Header Banner */}
      <div style={{
        marginBottom: '28px',
        background: 'var(--card-bg, #ffffff)',
        padding: '24px 28px',
        borderRadius: '20px',
        border: '1px solid var(--border, #e2e8f0)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        animation: 'fadeInUp 0.4s ease forwards'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: '#ffffff',
            boxShadow: '0 8px 20px rgba(220,38,38,0.3)',
          }}>
            <i className="fa-solid fa-ban" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: 'var(--text, #0f172a)' }}>
                الوثائق والبطاقات الملغية
              </h1>
              <span style={{
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                color: '#dc2626',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 800
              }}>
                إجمالي: {total.toLocaleString('ar-LY')} وثيقة
              </span>
            </div>
            <p style={{ margin: '6px 0 0', color: 'var(--muted, #64748b)', fontSize: '13px', fontWeight: 600 }}>
              سجل واستعلام الوثائق الملغية المستبعدة تلقائياً من كشوفات حسابات الوكلاء والتقارير المالية
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="canceled-btn"
            style={actionBtnStyle('linear-gradient(135deg, #7c3aed, #8b5cf6)')}
            onClick={fetchDocs}
            disabled={loading}
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Summary Cards (Matching Live Production Cards Style) */}
      <div style={cardGridStyle}>
        {/* Card 1 - Total Canceled Count */}
        <div
          className="canceled-stat-card"
          style={{
            ...statCardBase,
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
            color: '#ffffff',
            animation: 'fadeInUp 0.5s ease forwards',
          }}
        >
          <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '110px', height: '110px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, opacity: 0.95 }}>إجمالي الوثائق الملغية</span>
              <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-file-circle-xmark" style={{ fontSize: '22px', color: '#ffffff' }} />
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {total.toLocaleString('ar-LY')}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, opacity: 0.85, marginTop: '6px' }}>وثيقة ملغية ومستبعدة</div>
          </div>
        </div>

        {/* Card 2 - Total Canceled Value */}
        <div
          className="canceled-stat-card"
          style={{
            ...statCardBase,
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
            color: '#ffffff',
            animation: 'fadeInUp 0.6s ease forwards',
          }}
        >
          <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '110px', height: '110px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, opacity: 0.95 }}>إجمالي قيمة الملغية</span>
              <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-coins" style={{ fontSize: '22px', color: '#ffffff' }} />
              </div>
            </div>
            <div style={{ fontSize: '30px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {summary ? fmt(summary.total_value) : '0.000'}
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, opacity: 0.85, marginTop: '6px' }}>دينار ليبي (د.ل)</div>
          </div>
        </div>

        {/* Card 3 - Notice & Exclusion Info Card */}
        <div
          className="canceled-stat-card"
          style={{
            ...statCardBase,
            background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)',
            color: '#ffffff',
            animation: 'fadeInUp 0.7s ease forwards',
          }}
        >
          <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '110px', height: '110px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '14px', fontWeight: 800, opacity: 0.95 }}>استثناء تلقائي وحماية الحسابات</span>
              <div style={{ width: '46px', height: '46px', borderRadius: '14px', background: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-shield-halved" style={{ fontSize: '22px', color: '#ffffff' }} />
              </div>
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, lineHeight: '1.6', opacity: 0.95, marginTop: '4px' }}>
              ملاحظة: الوثائق الملغية تستثنى تلقائياً بالكامل من كشوفات حساب الوكلاء والتقارير المالية والإنتاجية.
            </div>
          </div>
        </div>
      </div>

      {/* Filters Box */}
      <div style={{ ...filterBoxStyle, animation: 'fadeInUp 0.8s ease forwards' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {/* Search Input */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 800, color: 'var(--muted, #64748b)' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ marginLeft: '6px' }} />
              البحث
            </label>
            <input
              type="text"
              className="canceled-input"
              placeholder="رقم الوثيقة، اسم المؤمن..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              style={inputStyle}
            />
          </div>

          {/* Doc Type Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 800, color: 'var(--muted, #64748b)' }}>
              <i className="fa-solid fa-layer-group" style={{ marginLeft: '6px' }} />
              نوع الوثيقة
            </label>
            <select
              className="canceled-input"
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setPage(1); }}
              style={inputStyle}
            >
              {DOC_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>

          {/* Agent Filter */}
          <div ref={agentDropdownRef} style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 800, color: 'var(--muted, #64748b)' }}>
              <i className="fa-solid fa-user-tie" style={{ marginLeft: '6px' }} />
              الوكيل / المكتب
            </label>
            <div
              onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
              style={{
                ...inputStyle,
                cursor: 'pointer',
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                background: isAgentDropdownOpen ? '#ffffff' : 'var(--panel, #f8fafc)',
              }}
            >
              <span style={{ fontWeight: selectedAgent ? 800 : 600 }}>{selectedAgent ? selectedAgent.agency_name : 'جميع الوكلاء'}</span>
              <i className={`fa-solid fa-chevron-${isAgentDropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '11px', opacity: 0.6 }} />
            </div>
            {isAgentDropdownOpen && (
              <div style={{ position: 'absolute', top: '100%', right: 0, left: 0, zIndex: 100, background: 'var(--card-bg, #ffffff)', border: '1px solid var(--border, #cbd5e1)', borderRadius: '14px', maxHeight: '240px', overflow: 'hidden', boxShadow: '0 12px 35px rgba(0,0,0,0.15)', marginTop: '6px' }}>
                <input
                  autoFocus
                  type="text"
                  placeholder="بحث باسم الوكيل أو الكود..."
                  value={agentSearch}
                  onChange={e => setAgentSearch(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid var(--border, #e2e8f0)', background: 'var(--panel, #f8fafc)', color: 'var(--text, #0f172a)', outline: 'none', fontSize: '13px', boxSizing: 'border-box', fontFamily: "'Cairo', sans-serif" }}
                />
                <div style={{ overflowY: 'auto', maxHeight: '180px' }}>
                  <div onClick={() => { setFilterAgentId(''); setIsAgentDropdownOpen(false); setPage(1); }} style={{ padding: '10px 14px', cursor: 'pointer', color: 'var(--muted)', fontSize: '13px', fontWeight: 700 }}>جميع الوكلاء</div>
                  {filteredAgents.map(a => (
                    <div key={a.id} onClick={() => { setFilterAgentId(String(a.id)); setIsAgentDropdownOpen(false); setPage(1); }} style={{ padding: '10px 14px', cursor: 'pointer', color: 'var(--text, #0f172a)', fontSize: '13px', borderTop: '1px solid var(--border, #e2e8f0)', fontWeight: 600 }}>
                      {a.agency_name} <span style={{ color: '#2563eb', fontSize: '11px', fontWeight: 800 }}>({a.code})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Year Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 800, color: 'var(--muted, #64748b)' }}>
              <i className="fa-solid fa-calendar-days" style={{ marginLeft: '6px' }} />
              السنة
            </label>
            <input
              type="number"
              className="canceled-input"
              placeholder="2026"
              value={filterYear}
              onChange={e => { setFilterYear(e.target.value); setPage(1); }}
              style={inputStyle}
            />
          </div>

          {/* Month Filter */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 800, color: 'var(--muted, #64748b)' }}>
              <i className="fa-solid fa-calendar-week" style={{ marginLeft: '6px' }} />
              الشهر
            </label>
            <select
              className="canceled-input"
              value={filterMonth}
              onChange={e => { setFilterMonth(e.target.value); setPage(1); }}
              style={inputStyle}
            >
              <option value="">كل الأشهر</option>
              {['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'].map((m, i) => (
                <option key={i+1} value={String(i+1)}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            className="canceled-btn"
            onClick={handleSearch}
            style={actionBtnStyle('linear-gradient(135deg, #1e40af, #3b82f6)')}
          >
            <i className="fa-solid fa-magnifying-glass" />
            بحث
          </button>

          <button
            className="canceled-btn"
            onClick={handleReset}
            style={{
              padding: '11px 20px',
              borderRadius: '12px',
              border: '2px solid var(--border, #cbd5e1)',
              background: 'var(--panel, #f8fafc)',
              color: 'var(--text, #0f172a)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: "'Cairo', sans-serif",
              transition: 'all 0.3s ease',
            }}
          >
            <i className="fa-solid fa-rotate-left" />
            إعادة تعيين
          </button>

          <div style={{ marginRight: 'auto', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              className="canceled-btn"
              onClick={exportExcel}
              style={actionBtnStyle('linear-gradient(135deg, #059669, #10b981)')}
            >
              <i className="fa-solid fa-file-excel" />
              تصدير Excel
            </button>
            <button
              className="canceled-btn"
              onClick={exportWord}
              style={actionBtnStyle('linear-gradient(135deg, #2563eb, #3b82f6)')}
            >
              <i className="fa-solid fa-file-word" />
              تصدير Word
            </button>
          </div>
        </div>
      </div>

      {/* Table Box */}
      <div style={{
        background: 'var(--card-bg, #ffffff)',
        border: '1px solid var(--border, #e2e8f0)',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
        animation: 'fadeInUp 0.9s ease forwards'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '70px', color: 'var(--muted)' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '36px', color: '#dc2626', marginBottom: '16px' }} />
            <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text, #0f172a)' }}>جاري تحميل الوثائق الملغية...</div>
          </div>
        ) : docs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px', color: 'var(--muted)' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px', opacity: 0.5 }}>🚫</div>
            <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text, #0f172a)', marginBottom: '8px' }}>لا توجد وثائق ملغية</div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>لم يتم العثور على أي وثيقة ملغية مطابقة للفلاتر المحددة</div>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)', borderBottom: '2px solid var(--border, #e2e8f0)' }}>
                    {['#', 'رقم الوثيقة', 'نوع التأمين', 'اسم المؤمن', 'الوكيل / المكتب', 'الإجمالي', 'تاريخ الإصدار', 'تاريخ الإلغاء', 'سبب الإلغاء'].map((h, i) => (
                      <th key={h} style={{ padding: '16px 14px', textAlign: i === 5 ? 'center' : 'right', fontSize: '13px', color: '#dc2626', fontWeight: 900, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {docs.map((doc, idx) => (
                    <tr
                      key={`${doc.table}-${doc.id}`}
                      className="canceled-table-row"
                      style={{ borderBottom: '1px solid var(--border, #e2e8f0)', transition: 'all 0.2s ease' }}
                    >
                      <td style={{ padding: '14px', fontSize: '13px', color: 'var(--muted)', fontWeight: 700 }}>{((page - 1) * perPage) + idx + 1}</td>
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontWeight: 800,
                          fontSize: '13px',
                          color: '#0f172a',
                          background: 'var(--panel, #f1f5f9)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: '1px solid var(--border, #cbd5e1)'
                        }}>
                          {doc.insurance_number}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          background: 'rgba(2, 132, 199, 0.08)',
                          border: '1px solid rgba(2, 132, 199, 0.2)',
                          borderRadius: '10px',
                          padding: '5px 12px',
                          fontSize: '12px',
                          color: '#0284c7',
                          fontWeight: 800,
                          whiteSpace: 'nowrap'
                        }}>
                          {doc.doc_type_label}
                        </span>
                      </td>
                      <td style={{ padding: '14px', fontSize: '13px', color: 'var(--text, #0f172a)', fontWeight: 700 }}>{doc.insured_name}</td>
                      <td style={{ padding: '14px', fontSize: '13px', color: 'var(--text, #334155)', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fa-solid fa-building-user" style={{ color: '#64748b', fontSize: '12px' }} />
                          {doc.agency_name || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '14px', fontSize: '14px', color: '#dc2626', fontWeight: 900, textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {fmt(doc.total)} <span style={{ fontSize: '11px' }}>د.ل</span>
                      </td>
                      <td style={{ padding: '14px', fontSize: '13px', color: 'var(--muted)', whiteSpace: 'nowrap', fontWeight: 600 }}>{fmtDate(doc.issue_date)}</td>
                      <td style={{ padding: '14px', fontSize: '13px', color: '#dc2626', fontWeight: 800, whiteSpace: 'nowrap' }}>{fmtDate(doc.canceled_at)}</td>
                      <td style={{ padding: '14px', fontSize: '12px', color: 'var(--muted)', maxWidth: '240px' }}>
                        <div style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }} title={doc.cancel_reason}>
                          {doc.cancel_reason}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.03) 100%)', borderTop: '2px solid var(--border, #e2e8f0)' }}>
                    <td colSpan={5} style={{ padding: '14px 16px', fontSize: '14px', color: 'var(--text, #0f172a)', fontWeight: 900 }}>
                      إجمالي الصفحة ({docs.length} وثيقة)
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '15px', color: '#dc2626', fontWeight: 900, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {fmt(docs.reduce((s, d) => s + d.total, 0))} د.ل
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination Controls */}
            <div style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              padding: '18px 24px',
              borderTop: '1px solid var(--border, #e2e8f0)',
              flexWrap: 'wrap',
              gap: '14px'
            }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 800 }}>
                عرض {docs.length === 0 ? 0 : (page - 1) * perPage + 1} إلى {Math.min(page * perPage, total)} من أصل {total.toLocaleString('ar-LY')} وثيقة
              </div>

              {lastPage > 1 && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border, #cbd5e1)',
                      background: 'var(--panel, #f8fafc)',
                      color: 'var(--text)',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      opacity: page === 1 ? 0.4 : 1,
                      fontWeight: 700,
                      fontSize: '13px',
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  >
                    السابق
                  </button>

                  {getPageNumbers().map((pNum, idx) => {
                    const isNum = typeof pNum === 'number';
                    const isActive = pNum === page;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!isNum}
                        onClick={() => isNum && setPage(pNum)}
                        style={{
                          minWidth: '38px',
                          height: '38px',
                          padding: '0 10px',
                          borderRadius: '10px',
                          border: isActive ? '2px solid #2563eb' : '1px solid var(--border, #cbd5e1)',
                          background: isActive ? 'linear-gradient(135deg, #1e40af, #3b82f6)' : 'var(--panel, #f8fafc)',
                          color: isActive ? '#ffffff' : 'var(--text)',
                          cursor: isNum && !isActive ? 'pointer' : 'default',
                          fontWeight: isActive ? 900 : 700,
                          fontSize: '13px',
                          fontFamily: "'Cairo', sans-serif",
                          boxShadow: isActive ? '0 4px 12px rgba(37,99,235,0.3)' : 'none',
                        }}
                      >
                        {pNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={page === lastPage}
                    onClick={() => setPage(p => Math.min(lastPage, p + 1))}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--border, #cbd5e1)',
                      background: 'var(--panel, #f8fafc)',
                      color: 'var(--text)',
                      cursor: page === lastPage ? 'not-allowed' : 'pointer',
                      opacity: page === lastPage ? 0.4 : 1,
                      fontWeight: 700,
                      fontSize: '13px',
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  >
                    التالي
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
