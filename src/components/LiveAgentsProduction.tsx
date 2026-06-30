import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';

interface AgentProduction {
  id: number;
  code: string;
  agency_name: string;
  agent_name: string;
  document_count: number;
  total_sales: number;
  agent_share: number;
  company_share: number;
}

interface ProductionSummary {
  total_sales: number;
  total_documents: number;
  total_agent_share: number;
  total_company_share: number;
  agents_count: number;
}

interface ProductionData {
  success: boolean;
  summary: ProductionSummary;
  agents: AgentProduction[];
}

type PresetType = 'today' | 'yesterday' | 'last7days' | 'thisMonth' | 'thisYear' | 'custom';

export default function LiveAgentsProduction() {
  const [data, setData] = useState<ProductionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<PresetType>('thisMonth');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'total_sales' | 'document_count' | 'agent_share' | 'company_share'>('total_sales');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const tableRef = useRef<HTMLDivElement>(null);

  const getDateRange = (p: PresetType): { from: string; to: string } => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    switch (p) {
      case 'today':
        return { from: fmt(now), to: fmt(now) };
      case 'yesterday': {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        return { from: fmt(y), to: fmt(y) };
      }
      case 'last7days': {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        return { from: fmt(d), to: fmt(now) };
      }
      case 'thisMonth':
        return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`, to: fmt(now) };
      case 'thisYear':
        return { from: `${now.getFullYear()}-01-01`, to: fmt(now) };
      case 'custom':
        return { from: customFrom, to: customTo };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(preset);
      if (!from || !to) {
        setLoading(false);
        return;
      }
      const response = await fetch(`${API_BASE_URL}/financial-statistics/live-agents-production?from_date=${from}&to_date=${to}`);
      if (response.ok) {
        const result: ProductionData = await response.json();
        setData(result);
      } else {
        showToast('خطأ في جلب بيانات الإنتاجية', 'error');
      }
    } catch (error) {
      console.error('Error fetching live production:', error);
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (preset !== 'custom') {
      fetchData();
    }
  }, [preset]);

  useEffect(() => {
    if (preset === 'custom' && customFrom && customTo) {
      fetchData();
    }
  }, [customFrom, customTo]);

  const filteredAgents = (data?.agents || [])
    .filter(a =>
      a.agency_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.code?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      return sortDir === 'desc' ? valB - valA : valA - valB;
    });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const formatNumber = (n: number) => {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const presetLabel = (): string => {
    switch (preset) {
      case 'today': return 'اليوم';
      case 'yesterday': return 'أمس';
      case 'last7days': return 'آخر 7 أيام';
      case 'thisMonth': return 'هذا الشهر';
      case 'thisYear': return 'هذه السنة';
      case 'custom': return `${customFrom} إلى ${customTo}`;
    }
  };

  const exportToExcel = async () => {
    if (!data || !data.agents.length) return;
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const columns = [
        { header: '#', key: 'index', width: 8 },
        { header: 'كود الوكيل', key: 'code', width: 18 },
        { header: 'اسم الوكالة', key: 'agency_name', width: 35 },
        { header: 'اسم الوكيل', key: 'agent_name', width: 30 },
        { header: 'عدد الوثائق', key: 'document_count', width: 18 },
        { header: 'إجمالي المبيعات', key: 'total_sales', width: 22 },
        { header: 'حصة الوكيل (العمولة)', key: 'agent_share', width: 22 },
        { header: 'حصة الشركة (الصافي)', key: 'company_share', width: 22 },
      ];

      const excelData = filteredAgents.map((a, idx) => ({
        index: idx + 1,
        code: a.code,
        agency_name: a.agency_name,
        agent_name: a.agent_name || '-',
        document_count: a.document_count,
        total_sales: `${formatNumber(a.total_sales)} د.ل`,
        agent_share: `${formatNumber(a.agent_share)} د.ل`,
        company_share: `${formatNumber(a.company_share)} د.ل`,
      }));

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير إنتاجية الوكلاء',
        subtitle: `الفترة: ${presetLabel()} | إجمالي المبيعات: ${formatNumber(data.summary.total_sales)} د.ل | عدد الوثائق: ${data.summary.total_documents} | حصة الوكلاء: ${formatNumber(data.summary.total_agent_share)} د.ل | حصة الشركة: ${formatNumber(data.summary.total_company_share)} د.ل`,
        columns,
        data: excelData,
        fileName: `تقرير_إنتاجية_الوكلاء_${presetLabel()}`,
        qrData: `تقرير إنتاجية الوكلاء - شركة المدار الليبي\nالفترة: ${presetLabel()}\nإجمالي المبيعات: ${formatNumber(data.summary.total_sales)} د.ل\nبواسطة: ${currentUser.name || 'النظام'}`
      });
      showToast('تم تصدير التقرير بنجاح ✅', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  const handlePrint = () => {
    if (!data || !data.agents.length) return;
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) {
      showToast('يرجى السماح بالنوافذ المنبثقة للطباعة', 'error');
      return;
    }

    const rows = filteredAgents.map((a, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-weight:600;">${a.code}</td>
        <td style="text-align:right; font-weight:700;">${a.agency_name}</td>
        <td style="text-align:right;">${a.agent_name || '-'}</td>
        <td>${a.document_count}</td>
        <td style="font-weight:700; color:#1e40af;">${formatNumber(a.total_sales)}</td>
        <td style="color:#7c3aed;">${formatNumber(a.agent_share)}</td>
        <td style="color:#0d9488; font-weight:700;">${formatNumber(a.company_share)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>تقرير إنتاجية الوكلاء</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          @media print { 
            @page { margin: 8mm; size: landscape; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { font-family: 'Cairo', sans-serif; margin: 15px; padding: 15px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 3px solid #1e40af; padding-bottom: 12px; }
          .header h1 { margin: 0; color: #1e40af; font-size: 22px; font-weight: 900; }
          .meta-info { margin-bottom: 12px; font-size: 13px; color: #475569; font-weight: 600; display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 10px 15px; border-radius: 10px; border: 1px solid #bae6fd; }
          .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
          .summary-card { padding: 12px; border-radius: 10px; text-align: center; }
          .summary-card .label { font-size: 11px; font-weight: 700; margin-bottom: 4px; }
          .summary-card .value { font-size: 16px; font-weight: 900; }
          .card-blue { background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #1e40af; border: 1px solid #93c5fd; }
          .card-green { background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #065f46; border: 1px solid #6ee7b7; }
          .card-purple { background: linear-gradient(135deg, #ede9fe, #ddd6fe); color: #5b21b6; border: 1px solid #c4b5fd; }
          .card-teal { background: linear-gradient(135deg, #ccfbf1, #99f6e4); color: #115e59; border: 1px solid #5eead4; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: center; }
          th { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; font-weight: 800; font-size: 11px; }
          tr:nth-child(even) { background: #f8fafc; }
          tr:hover { background: #eff6ff; }
          .total-row { background: linear-gradient(135deg, #f0f9ff, #dbeafe) !important; font-weight: 900; font-size: 13px; }
          .total-row td { border-top: 2px solid #1e40af; color: #1e40af; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body onload="setTimeout(() => { window.print(); window.close(); }, 600);">
        <div class="header">
          <div>
            <h1>شركة المدار الليبي للتأمين</h1>
            <p style="margin: 3px 0 0; font-size: 16px; font-weight: bold; color: #334155;">تقرير إنتاجية الوكلاء المباشر</p>
          </div>
          <img src="/img/logo.png" style="height: 60px;">
        </div>
        <div class="meta-info">
          <div><strong>تاريخ التقرير:</strong> ${new Date().toLocaleString('ar-LY')}</div>
          <div><strong>الفترة:</strong> ${presetLabel()} &nbsp;|&nbsp; <strong>عدد الوكلاء:</strong> ${filteredAgents.length}</div>
        </div>
        <div class="summary-cards">
          <div class="summary-card card-blue">
            <div class="label">إجمالي المبيعات</div>
            <div class="value">${formatNumber(data.summary.total_sales)} د.ل</div>
          </div>
          <div class="summary-card card-green">
            <div class="label">إجمالي الوثائق</div>
            <div class="value">${data.summary.total_documents}</div>
          </div>
          <div class="summary-card card-purple">
            <div class="label">حصة الوكلاء</div>
            <div class="value">${formatNumber(data.summary.total_agent_share)} د.ل</div>
          </div>
          <div class="summary-card card-teal">
            <div class="label">صافي الشركة</div>
            <div class="value">${formatNumber(data.summary.total_company_share)} د.ل</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:4%;">#</th>
              <th style="width:10%;">الكود</th>
              <th style="width:22%; text-align:right;">اسم الوكالة</th>
              <th style="width:16%; text-align:right;">اسم الوكيل</th>
              <th style="width:10%;">الوثائق</th>
              <th style="width:14%;">المبيعات</th>
              <th style="width:12%;">حصة الوكيل</th>
              <th style="width:12%;">حصة الشركة</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4" style="text-align:right; padding-right:20px;">المجموع الكلي</td>
              <td>${data.summary.total_documents}</td>
              <td>${formatNumber(data.summary.total_sales)} د.ل</td>
              <td>${formatNumber(data.summary.total_agent_share)} د.ل</td>
              <td>${formatNumber(data.summary.total_company_share)} د.ل</td>
            </tr>
          </tfoot>
        </table>
        <div class="footer">
          تم استخراج هذا التقرير آلياً من نظام المدار الليبي للتأمين - ${new Date().toLocaleString('ar-LY')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ────────────── STYLES ──────────────
  const containerStyle: React.CSSProperties = {
    padding: '24px 28px',
    fontFamily: "'Cairo', 'Segoe UI', sans-serif",
    direction: 'rtl',
    minHeight: '100vh',
    background: 'var(--bg)',
    color: 'var(--text)',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '12px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '26px',
    fontWeight: 900,
    background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const actionBtnStyle = (bg: string): React.CSSProperties => ({
    padding: '10px 20px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'Cairo', sans-serif",
    fontWeight: 700,
    fontSize: '14px',
    color: 'white',
    background: bg,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
    boxShadow: `0 4px 15px ${bg}40`,
  });

  const cardGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '18px',
    marginBottom: '24px',
  };

  const statCardBase: React.CSSProperties = {
    borderRadius: '18px',
    padding: '22px 24px',
    position: 'relative',
    overflow: 'hidden',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.15)',
    transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
    cursor: 'default',
  };

  const filterSectionStyle: React.CSSProperties = {
    background: 'var(--card-bg)',
    borderRadius: '18px',
    padding: '20px 24px',
    marginBottom: '20px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  };

  const presetBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: '10px',
    border: active ? '2px solid #1e40af' : '2px solid var(--border)',
    cursor: 'pointer',
    fontFamily: "'Cairo', sans-serif",
    fontWeight: active ? 800 : 600,
    fontSize: '13px',
    color: active ? 'white' : 'var(--muted)',
    background: active ? 'linear-gradient(135deg, #1e40af, #3b82f6)' : 'var(--card-bg)',
    transition: 'all 0.3s ease',
    boxShadow: active ? '0 4px 15px rgba(30,64,175,0.3)' : '0 1px 3px rgba(0,0,0,0.02)',
  });

  const tableSectionStyle: React.CSSProperties = {
    background: 'var(--card-bg)',
    borderRadius: '18px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
    border: '1px solid var(--border)',
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px 16px',
    borderRadius: '10px',
    border: '2px solid var(--border)',
    fontFamily: "'Cairo', sans-serif",
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color 0.3s ease',
    direction: 'rtl',
    minWidth: '140px',
    background: 'var(--input-bg)',
    color: 'var(--text)',
  };

  // ────────────── RENDER ──────────────
  if (loading && !data) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '16px',
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          border: '4px solid #e2e8f0',
          borderTopColor: '#1e40af',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: '#64748b', fontWeight: 700, fontSize: '16px', fontFamily: "'Cairo', sans-serif" }}>
          جاري تحميل تقرير الإنتاجية...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Animations */}
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .stat-card:hover { transform: translateY(-6px) !important; box-shadow: 0 20px 50px rgba(0,0,0,0.12) !important; }
        .preset-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1) !important; }
        .prod-report-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
        .table-row:hover { background: var(--hover-bg) !important; }
        .sort-header:hover { cursor: pointer; background: rgba(255,255,255,0.15) !important; }
        .live-production-table {
          width: 100% !important;
          border-collapse: collapse !important;
          table-layout: fixed !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        @media (max-width: 1100px) {
          .live-production-table {
            min-width: 1100px !important;
          }
        }
        .prod-search-input {
          background: var(--input-bg) !important;
          color: var(--text) !important;
          border: 2px solid var(--border) !important;
        }
        [data-theme='dark'] .prod-search-input {
          border: 2px solid rgba(255, 255, 255, 0.15) !important;
        }
        .prod-search-input::placeholder {
          color: var(--muted) !important;
          opacity: 0.8 !important;
        }
      `}</style>

      {/* Header */}
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          <i className="fa-solid fa-chart-bar" style={{ fontSize: '28px' }}></i>
          تقرير إنتاجية الوكلاء المباشر
        </h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="prod-report-btn"
            style={actionBtnStyle('linear-gradient(135deg, #059669, #10b981)')}
            onClick={exportToExcel}
            disabled={!data || !data.agents.length}
          >
            <i className="fa-solid fa-file-excel"></i>
            تصدير Excel
          </button>
          <button
            className="prod-report-btn"
            style={actionBtnStyle('linear-gradient(135deg, #1e40af, #3b82f6)')}
            onClick={handlePrint}
            disabled={!data || !data.agents.length}
          >
            <i className="fa-solid fa-print"></i>
            طباعة
          </button>
          <button
            className="prod-report-btn"
            style={actionBtnStyle('linear-gradient(135deg, #7c3aed, #a78bfa)')}
            onClick={fetchData}
            disabled={loading}
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i>
            تحديث
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={cardGridStyle}>
        {/* Card 1 - Total Sales */}
        <div
          className="stat-card"
          style={{
            ...statCardBase,
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
            color: 'white',
            animation: 'fadeInUp 0.5s ease forwards',
          }}
        >
          <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>إجمالي المبيعات</span>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-coins" style={{ fontSize: '20px' }}></i>
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {data ? formatNumber(data.summary.total_sales) : '0.00'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, marginTop: '4px' }}>دينار ليبي</div>
          </div>
        </div>

        {/* Card 2 - Total Documents */}
        <div
          className="stat-card"
          style={{
            ...statCardBase,
            background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
            color: 'white',
            animation: 'fadeInUp 0.6s ease forwards',
          }}
        >
          <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>إجمالي الوثائق الصادرة</span>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-file-lines" style={{ fontSize: '20px' }}></i>
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {data ? data.summary.total_documents.toLocaleString() : '0'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, marginTop: '4px' }}>وثيقة تأمين</div>
          </div>
        </div>

        {/* Card 3 - Agent Share */}
        <div
          className="stat-card"
          style={{
            ...statCardBase,
            background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)',
            color: 'white',
            animation: 'fadeInUp 0.7s ease forwards',
          }}
        >
          <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>حصة الوكلاء (العمولات)</span>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-hand-holding-dollar" style={{ fontSize: '20px' }}></i>
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {data ? formatNumber(data.summary.total_agent_share) : '0.00'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, marginTop: '4px' }}>دينار ليبي</div>
          </div>
        </div>

        {/* Card 4 - Company Share */}
        <div
          className="stat-card"
          style={{
            ...statCardBase,
            background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)',
            color: 'white',
            animation: 'fadeInUp 0.8s ease forwards',
          }}
        >
          <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, opacity: 0.9 }}>صافي حصة الشركة</span>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fa-solid fa-building-columns" style={{ fontSize: '20px' }}></i>
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {data ? formatNumber(data.summary.total_company_share) : '0.00'}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8, marginTop: '4px' }}>دينار ليبي</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={filterSectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <i className="fa-solid fa-filter" style={{ color: '#1e40af', fontSize: '16px' }}></i>
          <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text)' }}>الفترة الزمنية</span>
          {loading && (
            <div style={{
              width: '18px', height: '18px',
              border: '2px solid var(--border)', borderTopColor: '#1e40af',
              borderRadius: '50%', animation: 'spin 0.6s linear infinite',
              marginRight: '8px',
            }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {([
            { key: 'today', label: 'اليوم', icon: 'fa-calendar-day' },
            { key: 'yesterday', label: 'أمس', icon: 'fa-calendar-minus' },
            { key: 'last7days', label: 'آخر 7 أيام', icon: 'fa-calendar-week' },
            { key: 'thisMonth', label: 'هذا الشهر', icon: 'fa-calendar' },
            { key: 'thisYear', label: 'هذه السنة', icon: 'fa-calendar-check' },
            { key: 'custom', label: 'تحديد مخصص', icon: 'fa-calendar-alt' },
          ] as { key: PresetType; label: string; icon: string }[]).map(p => (
            <button
              key={p.key}
              className="preset-btn"
              style={presetBtnStyle(preset === p.key)}
              onClick={() => setPreset(p.key)}
            >
              <i className={`fa-solid ${p.icon}`} style={{ marginLeft: '6px' }}></i>
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div style={{ display: 'flex', gap: '14px', marginTop: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontWeight: 700, fontSize: '13px', color: 'var(--muted)' }}>من:</label>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontWeight: 700, fontSize: '13px', color: 'var(--muted)' }}>إلى:</label>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={tableSectionStyle} ref={tableRef}>
        {/* Table Header */}
        <div style={{
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          background: 'var(--table-header)',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-table-list" style={{ color: '#1e40af', fontSize: '18px' }}></i>
            <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text)' }}>
              جدول إنتاجية الوكلاء
            </span>
            <span style={{
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              color: 'white',
              padding: '3px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 800,
            }}>
              {filteredAgents.length} وكيل
            </span>
          </div>
          <div style={{ position: 'relative' }}>
            <i className="fa-solid fa-search" style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '14px',
            }}></i>
            <input
              type="text"
              className="prod-search-input"
              placeholder="ابحث بالاسم أو الكود..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                ...inputStyle,
                paddingRight: '38px',
                width: '250px',
              }}
            />
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto', width: '100%', padding: '0', margin: '0' }}>
          <table className="live-production-table" style={{ fontSize: '14px', width: '100%', margin: '0', padding: '0' }}>
            <thead>
              <tr style={{ background: 'var(--table-header)' }}>
                <th style={{ padding: '14px 12px', color: 'var(--text)', background: 'var(--table-header)', fontWeight: 800, fontSize: '13px', textAlign: 'center', width: '5%' }}>#</th>
                <th style={{ padding: '14px 12px', color: 'var(--text)', background: 'var(--table-header)', fontWeight: 800, fontSize: '13px', textAlign: 'center', width: '10%' }}>الكود</th>
                <th style={{ padding: '14px 12px', color: 'var(--text)', background: 'var(--table-header)', fontWeight: 800, fontSize: '13px', textAlign: 'right', width: '22%' }}>اسم الوكالة</th>
                <th style={{ padding: '14px 12px', color: 'var(--text)', background: 'var(--table-header)', fontWeight: 800, fontSize: '13px', textAlign: 'right', width: '15%' }}>اسم الوكيل</th>
                <th
                  className="sort-header"
                  onClick={() => handleSort('document_count')}
                  style={{ padding: '14px 12px', color: 'var(--text)', background: 'var(--table-header)', fontWeight: 800, fontSize: '13px', textAlign: 'center', width: '10%', cursor: 'pointer', userSelect: 'none' }}
                >
                  عدد الوثائق {sortField === 'document_count' && (sortDir === 'desc' ? '▼' : '▲')}
                </th>
                <th
                  className="sort-header"
                  onClick={() => handleSort('total_sales')}
                  style={{ padding: '14px 12px', color: 'var(--text)', background: 'var(--table-header)', fontWeight: 800, fontSize: '13px', textAlign: 'center', width: '14%', cursor: 'pointer', userSelect: 'none' }}
                >
                  إجمالي المبيعات {sortField === 'total_sales' && (sortDir === 'desc' ? '▼' : '▲')}
                </th>
                <th
                  className="sort-header"
                  onClick={() => handleSort('agent_share')}
                  style={{ padding: '14px 12px', color: 'var(--text)', background: 'var(--table-header)', fontWeight: 800, fontSize: '13px', textAlign: 'center', width: '12%', cursor: 'pointer', userSelect: 'none' }}
                >
                  حصة الوكيل {sortField === 'agent_share' && (sortDir === 'desc' ? '▼' : '▲')}
                </th>
                <th
                  className="sort-header"
                  onClick={() => handleSort('company_share')}
                  style={{ padding: '14px 12px', color: 'var(--text)', background: 'var(--table-header)', fontWeight: 800, fontSize: '13px', textAlign: 'center', width: '12%', cursor: 'pointer', userSelect: 'none' }}
                >
                  حصة الشركة {sortField === 'company_share' && (sortDir === 'desc' ? '▼' : '▲')}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '50px', textAlign: 'center', color: 'var(--muted)' }}>
                    <i className="fa-solid fa-inbox" style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}></i>
                    <span style={{ fontSize: '16px', fontWeight: 700 }}>
                      {searchTerm ? 'لا توجد نتائج مطابقة للبحث' : 'لا توجد بيانات للفترة المحددة'}
                    </span>
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent, idx) => (
                  <tr
                    key={agent.id}
                    className="table-row"
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: idx % 2 === 0 ? 'var(--card-bg)' : 'var(--bg)',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: 'var(--muted)', fontSize: '13px' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                        color: '#1e40af',
                        padding: '4px 12px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        fontSize: '12px',
                        letterSpacing: '0.5px',
                      }}>
                        {agent.code}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: 'var(--text)', fontSize: '14px' }}>
                      {agent.agency_name}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--muted)', fontSize: '13px' }}>
                      {agent.agent_name || '-'}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{
                        background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
                        color: '#065f46',
                        padding: '4px 14px',
                        borderRadius: '20px',
                        fontWeight: 800,
                        fontSize: '13px',
                      }}>
                        {agent.document_count}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800, color: '#3b82f6', fontSize: '14px' }}>
                      {formatNumber(agent.total_sales)}
                      <span style={{ fontSize: '11px', color: 'var(--muted)', marginRight: '4px' }}>د.ل</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: '#a78bfa', fontSize: '13px' }}>
                      {formatNumber(agent.agent_share)}
                      <span style={{ fontSize: '11px', color: 'var(--muted)', marginRight: '4px' }}>د.ل</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: '#2dd4bf', fontSize: '13px' }}>
                      {formatNumber(agent.company_share)}
                      <span style={{ fontSize: '11px', color: 'var(--muted)', marginRight: '4px' }}>د.ل</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredAgents.length > 0 && data && (
              <tfoot>
                <tr style={{
                  background: 'var(--table-header)',
                  borderTop: '3px solid var(--border)',
                }}>
                  <td colSpan={4} style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 900, fontSize: '15px', color: 'var(--text)' }}>
                    <i className="fa-solid fa-sigma" style={{ marginLeft: '8px' }}></i>
                    المجموع الكلي
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '15px', color: 'var(--text)' }}>
                    {data.summary.total_documents.toLocaleString()}
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '15px', color: '#3b82f6' }}>
                    {formatNumber(data.summary.total_sales)}
                    <span style={{ fontSize: '12px', marginRight: '4px' }}>د.ل</span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: '#a78bfa' }}>
                    {formatNumber(data.summary.total_agent_share)}
                    <span style={{ fontSize: '12px', marginRight: '4px' }}>د.ل</span>
                  </td>
                  <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: '#2dd4bf' }}>
                    {formatNumber(data.summary.total_company_share)}
                    <span style={{ fontSize: '12px', marginRight: '4px' }}>د.ل</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
