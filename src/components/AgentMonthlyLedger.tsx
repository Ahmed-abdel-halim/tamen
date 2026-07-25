import { useState, useEffect } from 'react';
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

export default function AgentMonthlyLedger() {
  const [agents, setAgents] = useState<BranchAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [excludeCanceled, setExcludeCanceled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState<LedgerData | null>(null);
  const [payModal, setPayModal] = useState<{ row: MonthRow } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });


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


  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = parseInt(e.target.value);
    if (!id) return;
    setSelectedAgentId(id);
    fetchLedger(id);
  };

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
    if (!payModal || !ledger) return;
    setPayLoading(true);
    try {
      const token = localStorage.getItem('token');
      const newPaid = payModal.row.paid_amount + parseFloat(payAmount || '0');
      const res = await fetch(`${API_BASE_URL}/financial-statistics/agent-monthly-ledger/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          branch_agent_id: ledger.agent.id,
          year: payModal.row.year,
          month: payModal.row.month,
          paid_amount: newPaid,
          due_amount: payModal.row.agent_share + payModal.row.carried_balance,
          notes: payNotes,
        }),
      });
      if (!res.ok) throw new Error();
      showToast('تم تسجيل الدفعة بنجاح ✅', 'success');
      setPayModal(null);
      if (selectedAgentId) fetchLedger(selectedAgentId);
    } catch {
      showToast('حدث خطأ أثناء تسجيل الدفعة', 'error');
    } finally {
      setPayLoading(false);
    }
  };

  const exportExcel = async () => {
    if (!ledger) return;
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const columns = [
        { header: '#', key: 'idx', width: 6 },
        { header: 'الشهر', key: 'month_label', width: 22 },
        { header: 'نسبة %', key: 'percentage', width: 14 },
        { header: 'عدد الوثائق', key: 'document_count', width: 16 },
        { header: 'إجمالي المبيعات', key: 'total_sales', width: 22 },
        { header: 'حصة الوكيل', key: 'agent_share', width: 20 },
        { header: 'حصة الشركة', key: 'company_share', width: 20 },
        { header: 'دين مترحل', key: 'carried_balance', width: 18 },
        { header: 'المستلم', key: 'paid_amount', width: 18 },
        { header: 'الباقي', key: 'remaining', width: 18 },
      ];
      const data = ledger.months.map((r, i) => ({
        idx: i + 1,
        month_label: r.month_label,
        percentage: r.percentage > 0 ? `${r.percentage}%` : '—',
        document_count: r.document_count,
        total_sales: `${fmt(r.total_sales)} د.ل`,
        agent_share: `${fmt(r.agent_share)} د.ل`,
        company_share: `${fmt(r.company_share)} د.ل`,
        carried_balance: `${fmt(r.carried_balance)} د.ل`,
        paid_amount: `${fmt(r.paid_amount)} د.ل`,
        remaining: `${fmt(r.remaining)} د.ل`,
      }));
      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - كشف حساب الوكيل الشهري',
        subtitle: `الوكيل: ${ledger.agent.agency_name} | الكود: ${ledger.agent.code} | إجمالي المبيعات: ${fmt(ledger.summary.total_sales)} د.ل | بواسطة: ${currentUser.name || 'النظام'}`,
        columns,
        data,
        fileName: `كشف_حساب_${ledger.agent.code}`,
        qrData: `كشف حساب - ${ledger.agent.agency_name}\nالكود: ${ledger.agent.code}\nبواسطة: ${currentUser.name || 'النظام'}`,
      });
      showToast('تم تصدير التقرير بنجاح ✅', 'success');
    } catch {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  const handlePrint = () => {
    if (!ledger) return;
    const win = window.open('', '', 'width=1400,height=900');
    if (!win) { showToast('يرجى السماح بالنوافذ المنبثقة', 'error'); return; }
    const rows = ledger.months.map((r, i) => {
      const isDebt = r.remaining > 0.01;
      return `<tr class="${isDebt ? 'row-debt' : r.document_count > 0 ? 'row-paid' : ''}">
        <td>${i + 1}</td>
        <td style="font-weight:800;text-align:right;padding-right:12px">${r.month_label}</td>
        <td>${r.percentage > 0 ? r.percentage + '%' : '—'}</td>
        <td>${r.document_count || '—'}</td>
        <td style="color:#1e40af;font-weight:800">${r.total_sales > 0 ? fmt(r.total_sales) : '—'}</td>
        <td style="color:#7c3aed">${r.agent_share > 0 ? fmt(r.agent_share) : '—'}</td>
        <td style="color:#0d9488">${r.company_share > 0 ? fmt(r.company_share) : '—'}</td>
        <td style="color:#dc2626;font-weight:700">${r.carried_balance > 0.01 ? fmt(r.carried_balance) : '—'}</td>
        <td style="color:#059669;font-weight:700">${r.paid_amount > 0 ? fmt(r.paid_amount) : '—'}</td>
        <td style="font-weight:900;color:${isDebt ? '#dc2626' : '#059669'}">${isDebt ? fmt(r.remaining) : r.document_count > 0 ? 'مسدد ✓' : '—'}</td>
      </tr>`;
    }).join('');
    win.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="UTF-8"><title>كشف حساب - ${ledger.agent.agency_name}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
@media print{@page{margin:8mm;size:landscape;}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}
body{font-family:'Cairo',sans-serif;margin:15px;padding:10px;color:#1e293b;direction:rtl;}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:3px solid #1e40af;padding-bottom:10px;}
.header h1{margin:0;color:#1e40af;font-size:20px;font-weight:900;}
.ai{background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;border-radius:10px;padding:10px 16px;margin-bottom:12px;display:flex;gap:20px;flex-wrap:wrap;font-size:13px;font-weight:700;color:#1e40af;}
.cards{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:14px;}
.card{padding:10px;border-radius:10px;text-align:center;}.card .lbl{font-size:10px;font-weight:700;margin-bottom:3px;}.card .val{font-size:13px;font-weight:900;}
.c1{background:linear-gradient(135deg,#dbeafe,#bfdbfe);color:#1e40af;border:1px solid #93c5fd;}
.c2{background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;border:1px solid #6ee7b7;}
.c3{background:linear-gradient(135deg,#ede9fe,#ddd6fe);color:#5b21b6;border:1px solid #c4b5fd;}
.c4{background:linear-gradient(135deg,#ccfbf1,#99f6e4);color:#115e59;border:1px solid #5eead4;}
.c5{background:linear-gradient(135deg,#fce7f3,#fbcfe8);color:#9d174d;border:1px solid #f9a8d4;}
.c6{background:linear-gradient(135deg,#d1fae5,#a7f3d0);color:#065f46;border:1px solid #6ee7b7;}
.c7{background:linear-gradient(135deg,#fee2e2,#fecaca);color:#991b1b;border:1px solid #fca5a5;}
table{width:100%;border-collapse:collapse;font-size:11px;}
th{background:linear-gradient(135deg,#1e40af,#3b82f6);color:white;padding:8px 6px;font-weight:800;text-align:center;}
td{border:1px solid #e2e8f0;padding:7px 6px;text-align:center;}tr:nth-child(even){background:#f8fafc;}
.row-debt td{background:#fff7f7!important;}.row-paid td{background:#f0fdf4!important;}
.total-row{background:linear-gradient(135deg,#f0f9ff,#dbeafe)!important;font-weight:900;font-size:12px;}
.total-row td{border-top:2px solid #1e40af;color:#1e40af;}
.footer{margin-top:16px;text-align:center;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;}</style></head>
<body onload="setTimeout(()=>{window.print();window.close();},600)">
<div class="header"><div><h1>شركة المدار الليبي للتأمين</h1><p style="margin:3px 0 0;font-size:15px;font-weight:bold;color:#334155">كشف حساب الوكيل الشهري</p></div><img src="/img/logo.png" style="height:55px"></div>
<div class="ai"><span>🏢 ${ledger.agent.agency_name}</span><span>🔑 ${ledger.agent.code}</span><span>👤 ${ledger.agent.agent_name || '—'}</span><span>📅 العقد: ${ledger.agent.contract_date || '—'}</span><span>🗓️ ${new Date().toLocaleDateString('ar-LY')}</span></div>
<div class="cards">
<div class="card c1"><div class="lbl">إجمالي المبيعات</div><div class="val">${fmt(ledger.summary.total_sales)} د.ل</div></div>
<div class="card c2"><div class="lbl">إجمالي الوثائق</div><div class="val">${ledger.summary.total_documents}</div></div>
<div class="card c3"><div class="lbl">حصة الوكيل</div><div class="val">${fmt(ledger.summary.total_agent_share)} د.ل</div></div>
<div class="card c4"><div class="lbl">حصة الشركة</div><div class="val">${fmt(ledger.summary.total_company_share)} د.ل</div></div>
<div class="card c5"><div class="lbl">عدد الأشهر</div><div class="val">${ledger.summary.total_months} شهر</div></div>
<div class="card c6"><div class="lbl">إجمالي المستلم</div><div class="val">${fmt(ledger.summary.total_paid)} د.ل</div></div>
<div class="card c7"><div class="lbl">إجمالي الباقي</div><div class="val">${fmt(ledger.summary.total_remaining)} د.ل</div></div>
</div>
<table><thead><tr><th>#</th><th>الشهر</th><th>نسبة%</th><th>وثائق</th><th>المبيعات</th><th>حصة الوكيل</th><th>حصة الشركة</th><th>دين مترحل</th><th>المستلم</th><th>الباقي</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr class="total-row"><td colspan="3">المجموع</td><td>${ledger.summary.total_documents}</td><td>${fmt(ledger.summary.total_sales)} د.ل</td><td>${fmt(ledger.summary.total_agent_share)} د.ل</td><td>${fmt(ledger.summary.total_company_share)} د.ل</td><td>—</td><td>${fmt(ledger.summary.total_paid)} د.ل</td><td style="color:${ledger.summary.total_remaining > 0 ? '#dc2626' : '#059669'}">${fmt(ledger.summary.total_remaining)} د.ل</td></tr></tfoot>
</table>
<div class="footer">تم استخراج هذا التقرير آلياً من نظام المدار الليبي للتأمين - ${new Date().toLocaleString('ar-LY')}</div>
</body></html>`);
    win.document.close();
  };

  const btnStyle = (bg: string): React.CSSProperties => ({
    padding: '10px 20px', borderRadius: '12px', border: 'none', cursor: 'pointer',
    fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '14px', color: 'white',
    background: bg, display: 'inline-flex', alignItems: 'center', gap: '8px',
    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)', boxShadow: `0 4px 15px ${bg}40`,
  });

  const StatCard = ({ grad, icon, label, value, sub, delay = '0.5s' }: { grad: string; icon: string; label: string; value: string; sub: string; delay?: string; }) => (
    <div className="stat-card" style={{ borderRadius: '18px', padding: '20px 22px', position: 'relative', overflow: 'hidden', background: grad, color: 'white', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)', animation: `fadeInUp ${delay} ease forwards` }}>
      <div style={{ position: 'absolute', top: '-20px', left: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
      <div style={{ position: 'absolute', bottom: '-30px', right: '-30px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, opacity: 0.9 }}>{label}</span>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`fa-solid ${icon}`} style={{ fontSize: '18px' }} />
          </div>
        </div>
        <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '-0.5px' }}>{value}</div>
        <div style={{ fontSize: '11px', fontWeight: 600, opacity: 0.8, marginTop: '4px' }}>{sub}</div>
      </div>
    </div>
  );

  const td: React.CSSProperties = { padding: '11px 10px', textAlign: 'center', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };

  return (
    <div style={{ padding: '24px 28px', fontFamily: "'Cairo','Segoe UI',sans-serif", direction: 'rtl', minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <style>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .stat-card:hover{transform:translateY(-6px)!important;box-shadow:0 20px 50px rgba(0,0,0,0.12)!important}
        .ledger-btn:hover{transform:translateY(-2px);filter:brightness(1.1)}
        .ledger-row:hover td{background:var(--hover-bg)!important}
        .pay-btn:hover{filter:brightness(1.15);transform:scale(1.04)}
        .agent-dropdown{position:absolute;top:calc(100% + 4px);right:0;left:0;z-index:9999;background:var(--card-bg);border:2px solid var(--border);border-radius:12px;max-height:280px;overflow-y:auto;box-shadow:0 12px 40px rgba(0,0,0,0.15)}
        .agent-option{padding:12px 16px;cursor:pointer;font-family:'Cairo',sans-serif;font-size:13px;display:flex;align-items:center;gap:10px;transition:background .15s}
        .agent-option:hover{background:var(--hover-bg)}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.55);z-index:1000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
        .modal-box{background:var(--card-bg);border-radius:22px;padding:32px;width:500px;max-width:95vw;box-shadow:0 30px 80px rgba(0,0,0,0.3);border:1px solid var(--border);animation:fadeInUp .3s ease}
        .modal-input{width:100%;padding:12px 16px;border-radius:12px;border:2px solid var(--border);font-family:'Cairo',sans-serif;font-size:14px;outline:none;background:var(--input-bg);color:var(--text);box-sizing:border-box;transition:border-color .2s}
        .modal-input:focus{border-color:#3b82f6}
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '26px', fontWeight: 900, background: 'linear-gradient(135deg,#1e40af,#3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' } as React.CSSProperties}>
          <i className="fa-solid fa-book-open-reader" style={{ fontSize: '28px' }} />
          كشف حساب الوكيل الشهري
        </h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="ledger-btn" style={btnStyle('linear-gradient(135deg,#059669,#10b981)')} onClick={exportExcel} disabled={!ledger}><i className="fa-solid fa-file-excel" />تصدير Excel</button>
          <button className="ledger-btn" style={btnStyle('linear-gradient(135deg,#1e40af,#3b82f6)')} onClick={handlePrint} disabled={!ledger}><i className="fa-solid fa-print" />طباعة</button>
          {selectedAgentId && <button className="ledger-btn" style={btnStyle('linear-gradient(135deg,#7c3aed,#a78bfa)')} onClick={() => fetchLedger(selectedAgentId)} disabled={loading}><i className={`fa-solid fa-arrows-rotate${loading ? ' fa-spin' : ''}`} />تحديث</button>}
        </div>
      </div>

      {/* Filter Box */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '18px', padding: '20px 24px', marginBottom: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <i className="fa-solid fa-filter" style={{ color: '#1e40af', fontSize: '16px' }} />
          <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text)' }}>اختيار الوكيل والإعدادات</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ position: 'relative', minWidth: '300px', flex: 1 }}>
            <i className="fa-solid fa-user-tie" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '14px', pointerEvents: 'none', zIndex: 1 }} />
            <select
              value={selectedAgentId ?? ''}
              onChange={handleSelectChange}
              style={{
                width: '100%',
                padding: '11px 42px 11px 16px',
                borderRadius: '12px',
                border: '2px solid var(--border)',
                fontFamily: "'Cairo',sans-serif",
                fontSize: '14px',
                outline: 'none',
                background: 'var(--input-bg)',
                color: 'var(--text)',
                boxSizing: 'border-box',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
                transition: 'border-color .2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#3b82f6'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <option value="" style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>— اختر الوكيل —</option>
              {agents.map(a => (
                <option key={a.id} value={a.id} style={{ color: '#1e293b', backgroundColor: '#ffffff' }}>
                  {a.code ? `[${a.code}] ` : ''}{a.agency_name || a.agent_name || `وكيل #${a.id}`}
                </option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '12px', pointerEvents: 'none' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none', padding: '10px 16px', borderRadius: '12px', border: `2px solid ${excludeCanceled ? '#dc2626' : 'var(--border)'}`, background: excludeCanceled ? 'rgba(254,226,226,0.4)' : 'var(--card-bg)', transition: 'all .3s' }}>
            <input type="checkbox" checked={excludeCanceled} onChange={handleExcludeToggle} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#dc2626' }} />
            <span style={{ fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '13px', color: excludeCanceled ? '#dc2626' : 'var(--muted)', whiteSpace: 'nowrap' }}>
              <i className="fa-solid fa-ban" style={{ marginLeft: '6px' }} />استبعاد الملغية من الإجباري
            </span>
          </label>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '16px' }}>
          <div style={{ width: '56px', height: '56px', border: '4px solid var(--border)', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: 'var(--muted)', fontWeight: 700, fontSize: '16px', fontFamily: "'Cairo',sans-serif" }}>جاري تحميل كشف الحساب الشهري...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !ledger && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: '16px', color: 'var(--muted)', textAlign: 'center' }}>
          <i className="fa-solid fa-user-tie" style={{ fontSize: '72px', opacity: 0.2 }} />
          <p style={{ fontWeight: 700, fontSize: '18px', fontFamily: "'Cairo',sans-serif" }}>اختر وكيلاً لعرض كشف الحساب الشهري</p>
          <p style={{ fontWeight: 500, fontSize: '14px', fontFamily: "'Cairo',sans-serif", maxWidth: '400px', opacity: 0.7 }}>سيظهر كشف الحساب تفصيلياً من تاريخ التعاقد حتى الشهر الحالي مع تتبع الديون المترحلة وتسجيل المدفوعات</p>
        </div>
      )}

      {/* Main content */}
      {!loading && ledger && (
        <>
          {/* Agent banner */}
          <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', border: '1px solid #bfdbfe', borderRadius: '16px', padding: '16px 24px', marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: 'white', padding: '4px 14px', borderRadius: '10px', fontWeight: 800, fontSize: '13px' }}>{ledger.agent.code}</span>
              <span style={{ fontWeight: 900, fontSize: '17px', color: '#1e40af' }}>{ledger.agent.agency_name}</span>
            </div>
            {ledger.agent.agent_name && <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '14px' }}><i className="fa-solid fa-user" style={{ marginLeft: '6px' }} />{ledger.agent.agent_name}</span>}
            {ledger.agent.contract_date && <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '13px' }}><i className="fa-solid fa-calendar-check" style={{ marginLeft: '6px' }} />تاريخ التعاقد: {ledger.agent.contract_date}</span>}
          </div>

          {/* 7 Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '14px', marginBottom: '24px' }}>
            <StatCard grad="linear-gradient(135deg,#1e40af 0%,#3b82f6 50%,#60a5fa 100%)" icon="fa-coins" label="إجمالي المبيعات" value={fmt(ledger.summary.total_sales)} sub="دينار ليبي" delay="0.45s" />
            <StatCard grad="linear-gradient(135deg,#059669 0%,#10b981 50%,#34d399 100%)" icon="fa-file-lines" label="إجمالي الوثائق" value={ledger.summary.total_documents.toLocaleString()} sub="وثيقة تأمين" delay="0.5s" />
            <StatCard grad="linear-gradient(135deg,#7c3aed 0%,#8b5cf6 50%,#a78bfa 100%)" icon="fa-hand-holding-dollar" label="حصة الوكيل" value={fmt(ledger.summary.total_agent_share)} sub="دينار ليبي" delay="0.55s" />
            <StatCard grad="linear-gradient(135deg,#0d9488 0%,#14b8a6 50%,#2dd4bf 100%)" icon="fa-building-columns" label="حصة الشركة" value={fmt(ledger.summary.total_company_share)} sub="دينار ليبي" delay="0.6s" />
            <StatCard grad="linear-gradient(135deg,#9d174d 0%,#db2777 50%,#f472b6 100%)" icon="fa-calendar-days" label="عدد الأشهر" value={String(ledger.summary.total_months)} sub="شهر منذ التعاقد" delay="0.65s" />
            <StatCard grad="linear-gradient(135deg,#065f46 0%,#059669 50%,#34d399 100%)" icon="fa-money-bill-wave" label="إجمالي المستلم" value={fmt(ledger.summary.total_paid)} sub="دينار ليبي" delay="0.7s" />
            <StatCard
              grad={ledger.summary.total_remaining > 0 ? 'linear-gradient(135deg,#991b1b 0%,#dc2626 50%,#f87171 100%)' : 'linear-gradient(135deg,#065f46 0%,#059669 50%,#34d399 100%)'}
              icon={ledger.summary.total_remaining > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'}
              label={ledger.summary.total_remaining > 0 ? 'إجمالي الباقي (ديون)' : 'الحساب مسدد'}
              value={fmt(ledger.summary.total_remaining)}
              sub="دينار ليبي"
              delay="0.75s"
            />
          </div>

          {/* Table */}
          <div style={{ background: 'var(--card-bg)', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.04)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', background: 'var(--table-header)', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-table-list" style={{ color: '#1e40af', fontSize: '18px' }} />
                <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text)' }}>جدول الإنتاجية الشهرية التفصيلي</span>
                <span style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)', color: 'white', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 800 }}>{ledger.summary.total_months} شهر</span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span style={{ background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)', color: '#065f46', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}><i className="fa-solid fa-circle-check" style={{ marginLeft: '5px' }} />مسدد</span>
                <span style={{ background: 'linear-gradient(135deg,#fee2e2,#fecaca)', color: '#991b1b', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}><i className="fa-solid fa-circle-exclamation" style={{ marginLeft: '5px' }} />باقي عليه</span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--table-header)' }}>
                    {['#','الشهر','نسبة %','عدد الوثائق','إجمالي المبيعات','حصة الوكيل','حصة الشركة','دين مترحل','المستلم','الباقي','إجراء'].map(h => (
                      <th key={h} style={{ padding: '13px 10px', fontWeight: 800, fontSize: '12px', textAlign: 'center', background: 'var(--table-header)', color: 'var(--text)', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledger.months.map((row, idx) => {
                    const isDebt = row.remaining > 0.01;
                    const isPaidFull = !isDebt && (row.document_count > 0 || row.carried_balance > 0.01);
                    const isEmpty = row.document_count === 0 && row.carried_balance < 0.01;
                    const rowBg = isDebt ? 'rgba(254,226,226,0.35)' : isPaidFull ? 'rgba(209,250,229,0.3)' : idx % 2 === 0 ? 'var(--card-bg)' : 'var(--bg)';
                    return (
                      <tr key={row.month_key} className="ledger-row" style={{ background: rowBg, transition: 'background .2s' }}>
                        <td style={{ ...td, fontWeight: 700, color: 'var(--muted)', fontSize: '12px' }}>{idx + 1}</td>
                        <td style={{ ...td, textAlign: 'right', paddingRight: '16px', fontWeight: 800, color: 'var(--text)', fontSize: '13px' }}>{row.month_label}</td>
                        <td style={td}>{row.percentage > 0 ? <span style={{ background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)', color: '#5b21b6', padding: '3px 10px', borderRadius: '20px', fontWeight: 800, fontSize: '12px' }}>{row.percentage}%</span> : <span style={{ color: 'var(--muted)', fontSize: '12px' }}>—</span>}</td>
                        <td style={td}>{row.document_count > 0 ? <span style={{ background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)', color: '#065f46', padding: '3px 12px', borderRadius: '20px', fontWeight: 800, fontSize: '12px' }}>{row.document_count}</span> : <span style={{ color: 'var(--muted)', fontSize: '12px' }}>—</span>}</td>
                        <td style={{ ...td, fontWeight: 800, color: '#3b82f6', fontSize: '13px' }}>{row.total_sales > 0 ? <>{fmt(row.total_sales)}<span style={{ fontSize: '10px', color: 'var(--muted)', marginRight: '3px' }}>د.ل</span></> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#a78bfa', fontSize: '13px' }}>{row.agent_share > 0 ? <>{fmt(row.agent_share)}<span style={{ fontSize: '10px', color: 'var(--muted)', marginRight: '3px' }}>د.ل</span></> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#2dd4bf', fontSize: '13px' }}>{row.company_share > 0 ? <>{fmt(row.company_share)}<span style={{ fontSize: '10px', color: 'var(--muted)', marginRight: '3px' }}>د.ل</span></> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#dc2626', fontSize: '13px' }}>{row.carried_balance > 0.01 ? <><i className="fa-solid fa-triangle-exclamation" style={{ fontSize: '11px', marginLeft: '4px' }} />{fmt(row.carried_balance)}<span style={{ fontSize: '10px', color: 'var(--muted)', marginRight: '3px' }}>د.ل</span></> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#059669', fontSize: '13px' }}>{row.paid_amount > 0 ? <>{fmt(row.paid_amount)}<span style={{ fontSize: '10px', color: 'var(--muted)', marginRight: '3px' }}>د.ل</span></> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                        <td style={{ ...td, fontWeight: 900 }}>
                          {isEmpty ? <span style={{ color: 'var(--muted)', fontSize: '12px' }}>لا يوجد</span>
                            : isDebt ? <span style={{ color: '#dc2626', fontSize: '13px', fontWeight: 900 }}>{fmt(row.remaining)}<span style={{ fontSize: '10px', marginRight: '3px' }}>د.ل</span></span>
                              : <span style={{ color: '#059669', fontSize: '12px', fontWeight: 800 }}><i className="fa-solid fa-circle-check" style={{ marginLeft: '4px' }} />مسدد</span>}
                        </td>
                        <td style={td}>
                          {!isEmpty && (
                            <button className="pay-btn" onClick={() => openPay(row)}
                              style={{ padding: '6px 14px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '12px', color: 'white', background: 'linear-gradient(135deg,#1e40af,#3b82f6)', display: 'inline-flex', alignItems: 'center', gap: '5px', transition: 'all .2s', boxShadow: '0 3px 10px rgba(30,64,175,0.3)' }}>
                              <i className="fa-solid fa-money-bill-transfer" />تسديد
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: 'var(--table-header)', borderTop: '3px solid var(--border)' }}>
                    <td colSpan={3} style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 900, fontSize: '15px', color: 'var(--text)' }}><i className="fa-solid fa-sigma" style={{ marginLeft: '8px' }} />المجموع الكلي</td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: 'var(--text)' }}>{ledger.summary.total_documents.toLocaleString()}</td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: '#3b82f6' }}>{fmt(ledger.summary.total_sales)}<span style={{ fontSize: '11px', marginRight: '3px' }}>د.ل</span></td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: '#a78bfa' }}>{fmt(ledger.summary.total_agent_share)}<span style={{ fontSize: '11px', marginRight: '3px' }}>د.ل</span></td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: '#2dd4bf' }}>{fmt(ledger.summary.total_company_share)}<span style={{ fontSize: '11px', marginRight: '3px' }}>د.ل</span></td>
                    <td style={{ padding: '14px', textAlign: 'center', color: 'var(--muted)' }}>—</td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: '#059669' }}>{fmt(ledger.summary.total_paid)}<span style={{ fontSize: '11px', marginRight: '3px' }}>د.ل</span></td>
                    <td style={{ padding: '14px', textAlign: 'center', fontWeight: 900, fontSize: '14px', color: ledger.summary.total_remaining > 0 ? '#dc2626' : '#059669' }}>{fmt(ledger.summary.total_remaining)}<span style={{ fontSize: '11px', marginRight: '3px' }}>د.ل</span></td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPayModal(null); }}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <h2 style={{ margin: 0, fontFamily: "'Cairo',sans-serif", fontWeight: 900, fontSize: '20px', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-money-bill-transfer" style={{ color: '#1e40af' }} />تسديد دفعة — {payModal.row.month_label}
              </h2>
              <button onClick={() => setPayModal(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '22px', color: 'var(--muted)', lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontFamily: "'Cairo',sans-serif", fontSize: '13px', color: '#334155' }}>
                <span><strong>حصة الشهر:</strong> {fmt(payModal.row.agent_share)} د.ل</span>
                <span><strong>دين مترحل:</strong> {fmt(payModal.row.carried_balance)} د.ل</span>
                <span style={{ color: '#1e40af', fontWeight: 800 }}><strong>الإجمالي المطلوب:</strong> {fmt(payModal.row.agent_share + payModal.row.carried_balance)} د.ل</span>
                <span style={{ color: '#059669' }}><strong>مدفوع سابقاً:</strong> {fmt(payModal.row.paid_amount)} د.ل</span>
              </div>
            </div>
            <label style={{ display: 'block', marginBottom: '8px', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>المبلغ المستلم الآن (د.ل)</label>
            <input type="number" className="modal-input" value={payAmount} onChange={e => setPayAmount(e.target.value)} placeholder="0.00" min="0" style={{ marginBottom: '12px' }} />
            {payAmount !== '' && (
              <div style={{ padding: '10px 16px', borderRadius: '10px', marginBottom: '14px', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '14px', background: ((payModal.row.agent_share + payModal.row.carried_balance) - (payModal.row.paid_amount + parseFloat(payAmount || '0'))) > 0.01 ? 'linear-gradient(135deg,#fee2e2,#fecaca)' : 'linear-gradient(135deg,#d1fae5,#a7f3d0)', color: ((payModal.row.agent_share + payModal.row.carried_balance) - (payModal.row.paid_amount + parseFloat(payAmount || '0'))) > 0.01 ? '#991b1b' : '#065f46' }}>
                الباقي بعد التسديد: {fmt(Math.max(0, (payModal.row.agent_share + payModal.row.carried_balance) - (payModal.row.paid_amount + parseFloat(payAmount || '0'))))} د.ل
              </div>
            )}
            <label style={{ display: 'block', marginBottom: '8px', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>ملاحظات (اختياري)</label>
            <textarea className="modal-input" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="أي ملاحظات إضافية..." rows={3} style={{ marginBottom: '20px', resize: 'none' }} />
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button onClick={() => setPayModal(null)} style={{ padding: '10px 20px', borderRadius: '12px', border: '2px solid var(--border)', background: 'none', cursor: 'pointer', fontFamily: "'Cairo',sans-serif", fontWeight: 700, fontSize: '14px', color: 'var(--muted)' }}>إلغاء</button>
              <button onClick={submitPayment} disabled={payLoading || payAmount === '' || parseFloat(payAmount) <= 0} style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', cursor: payLoading || payAmount === '' ? 'not-allowed' : 'pointer', fontFamily: "'Cairo',sans-serif", fontWeight: 800, fontSize: '14px', color: 'white', background: 'linear-gradient(135deg,#1e40af,#3b82f6)', opacity: payLoading || payAmount === '' ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(30,64,175,0.4)' }}>
                {payLoading ? <><i className="fa-solid fa-circle-notch fa-spin" />جاري الحفظ...</> : <><i className="fa-solid fa-floppy-disk" />حفظ الدفعة</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

