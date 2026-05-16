import React, { useState, useRef, useCallback } from 'react';
import { API_BASE_URL as API_BASE } from '../config/api';

type MatchStatus = 'exact' | 'fuzzy' | 'not_found';
type RowAction   = 'link' | 'create_agent' | 'skip' | 'review';

interface AgentCandidate {
  id: number;
  agent_name: string;
  agency_name: string;
  code: string;
  status: string;
  score: number;
}

interface AnalyzedRow {
  row_index: number;
  raw_data: (string | number)[];
  agent_name_in_file: string;
  agency_name_in_file: string;
  match_status: MatchStatus;
  match_score: number;
  suggested_agent: AgentCandidate | null;
  all_candidates: AgentCandidate[];
  selected_agent_id: number | null;
  action: RowAction;
}

interface AnalyzeResult {
  success: boolean;
  total_rows: number;
  exact_count: number;
  fuzzy_count: number;
  new_count: number;
  results: AnalyzedRow[];
  headers: string[];
}

const IMPORT_TYPES = [
  { value: 'insurance',     label: 'تأمين سيارات (إجباري / جمرك / طرف ثالث)' },
  { value: 'travel',        label: 'تأمين سفر' },
  { value: 'resident',      label: 'تأمين مقيم' },
  { value: 'marine',        label: 'تأمين هياكل بحرية' },
  { value: 'professional',  label: 'تأمين مسؤولية مهنية' },
  { value: 'personal',      label: 'تأمين حوادث شخصية' },
  { value: 'international', label: 'تأمين دولي' },
];

const statusBadge: Record<MatchStatus, { bg: string; text: string; label: string }> = {
  exact:     { bg: '#d1fae5', text: '#065f46', label: '✅ تطابق تام' },
  fuzzy:     { bg: '#fef3c7', text: '#92400e', label: '⚠️ تطابق جزئي' },
  not_found: { bg: '#fee2e2', text: '#991b1b', label: '❌ غير موجود' },
};

/* ── helpers ── */
async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message ?? `HTTP ${res.status}`);
  return json;
}

export default function ExcelImportPage() {
  const [step, setStep]               = useState<1 | 2 | 3>(1);
  const [importType, setImportType]   = useState('insurance');
  const [file, setFile]               = useState<File | null>(null);
  const [dragging, setDragging]       = useState(false);
  const [loading, setLoading]         = useState(false);
  const [analyzed, setAnalyzed]       = useState<AnalyzeResult | null>(null);
  const [rows, setRows]               = useState<AnalyzedRow[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError]             = useState('');
  const [allAgents, setAllAgents]     = useState<AgentCandidate[]>([]);
  const [searchAgent, setSearchAgent] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const isXlsFile = (f: File | null) =>
    f?.name?.toLowerCase().endsWith('.xls') && !f?.name?.toLowerCase().endsWith('.xlsx');

  /* ── Step 1: Analyze ── */
  const handleAnalyze = async () => {
    if (!file) { setError('الرجاء اختيار ملف أولاً'); return; }
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('import_type', importType);

      const data: AnalyzeResult = await apiFetch(`${API_BASE}/excel-import/analyze`, {
        method: 'POST', body: fd,
      });
      setAnalyzed(data);
      setRows(data.results.map(r => ({
        ...r,
        // تأكد أن action مناسب
        action: r.action === 'review' ? 'link' : (r.action as RowAction),
      })));

      const agents = await apiFetch(`${API_BASE}/excel-import/agents`);
      setAllAgents(agents);
      setStep(2);
    } catch (e: any) {
      setError(e?.message ?? 'حدث خطأ أثناء تحليل الملف');
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (idx: number, patch: Partial<AnalyzedRow>) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));

  /* ── Step 3: Confirm Import ── */
  const handleConfirm = async () => {
    setLoading(true); setError('');
    try {
      const activeRows = rows.filter(r => r.action !== 'skip');
      const chunkSize = 500;
      let totalImported = 0;
      let totalSkipped = 0;
      let totalCreated = 0;
      let allErrors: any[] = [];

      // إرسال البيانات على دفعات (Chunks) لتجنب انقطاع الاتصال (Timeout)
      for (let i = 0; i < activeRows.length; i += chunkSize) {
        const chunk = activeRows.slice(i, i + chunkSize);
        const payload = {
          import_type: importType,
          rows: chunk.map(r => ({
            raw_data:            r.raw_data,
            selected_agent_id:   r.selected_agent_id,
            action:              r.action,
            agent_name_in_file:  r.agent_name_in_file,
            agency_name_in_file: r.agency_name_in_file,
          })),
        };
        const data = await apiFetch(`${API_BASE}/excel-import/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        totalImported += data.imported_count || 0;
        totalSkipped += data.skipped_count || 0;
        totalCreated += data.agents_created || 0;
        if (data.errors?.length) allErrors = [...allErrors, ...data.errors];
      }

      setImportResult({
        success: true,
        imported_count: totalImported,
        skipped_count: totalSkipped,
        agents_created: totalCreated,
        error_count: allErrors.length,
        errors: allErrors,
        message: `تم استيراد ${totalImported} وثيقة بنجاح`,
      });
      setStep(3);
    } catch (e: any) {
      setError(e?.message ?? 'حدث خطأ أثناء الاستيراد بسبب حجم الملف، تم استيراد جزء من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1); setFile(null); setAnalyzed(null);
    setRows([]); setImportResult(null); setError('');
  };

  return (
    <div dir="rtl" style={{ minHeight:'100vh', background:'#0f172a', fontFamily:"'Cairo',sans-serif", padding:'24px' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:32 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>📥</div>
          <div>
            <h1 style={{ color:'#f1f5f9', margin:0, fontSize:24, fontWeight:700 }}>استيراد الوثائق القديمة</h1>
            <p  style={{ color:'#94a3b8', margin:0, fontSize:14 }}>رفع ملفات Excel ومطابقة الوكلاء تلقائياً</p>
          </div>
        </div>

        <StepBar step={step} />

        {error && (
          <div style={{ background:'#450a0a', border:'1px solid #b91c1c', borderRadius:10, padding:'12px 16px', color:'#fca5a5', marginBottom:24 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── STEP 1 ── */}
        {step === 1 && (
          <div style={{ background:'#1e293b', borderRadius:16, padding:32 }}>
            <h2 style={{ color:'#e2e8f0', marginTop:0 }}>1. اختر نوع التأمين والملف</h2>

            <label style={{ color:'#94a3b8', fontSize:14, display:'block', marginBottom:8 }}>نوع التأمين</label>
            <select value={importType} onChange={e => setImportType(e.target.value)}
              style={{ width:'100%', padding:'10px 14px', background:'#0f172a', border:'1px solid #334155', borderRadius:8, color:'#f1f5f9', fontSize:15, marginBottom:24 }}>
              {IMPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>

            {/* Drop Zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ border:`2px dashed ${dragging?'#6366f1': isXlsFile(file)?'#f59e0b':'#334155'}`, borderRadius:16, padding:48, textAlign:'center', cursor:'pointer', background:dragging?'#1e1b4b22':'#0f172a', transition:'all .2s' }}>
              <div style={{ fontSize:48, marginBottom:12 }}>{file ? (isXlsFile(file)?'⚠️':'✅') : '📂'}</div>
              {file ? (
                <>
                  <p style={{ color: isXlsFile(file)?'#fbbf24':'#a5b4fc', fontSize:16, fontWeight:600, margin:0 }}>{file.name}</p>
                  <p style={{ color:'#64748b', fontSize:13, margin:'4px 0 0' }}>{(file.size/1024).toFixed(1)} KB</p>
                </>
              ) : (
                <>
                  <p style={{ color:'#94a3b8', fontSize:16, margin:0 }}>اسحب الملف هنا أو انقر للاختيار</p>
                  <p style={{ color:'#475569', fontSize:13, margin:'4px 0 0' }}>xlsx, xls, csv مدعوم</p>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:'none' }}
                onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
            </div>

            {/* ⚠️ XLS Warning */}
            {isXlsFile(file) && (
              <div style={{ marginTop:16, background:'#451a03', border:'1px solid #d97706', borderRadius:12, padding:'16px 20px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <span style={{ fontSize:24, flexShrink:0 }}>⚠️</span>
                  <div>
                    <p style={{ color:'#fbbf24', fontWeight:700, margin:'0 0 8px', fontSize:15 }}>
                      ملفات .xls القديمة تحتاج تحويل أولاً
                    </p>
                    <p style={{ color:'#fcd34d', margin:'0 0 12px', fontSize:13, lineHeight:1.7 }}>
                      الملف الذي اخترته بتنسيق <strong>.xls</strong> القديم. يرجى تحويله لـ <strong>.xlsx</strong> باتباع الخطوات:
                    </p>
                    <ol style={{ color:'#fde68a', margin:0, paddingRight:20, fontSize:13, lineHeight:2 }}>
                      <li>افتح الملف في <strong>Microsoft Excel</strong></li>
                      <li>اضغط <strong>ملف ← حفظ باسم</strong></li>
                      <li>من قائمة "نوع الملف" اختر: <strong>Excel Workbook (.xlsx)</strong></li>
                      <li>احفظ الملف الجديد، ثم ارفعه هنا</li>
                    </ol>
                    <button
                      onClick={() => { setFile(null); if(fileInputRef.current) fileInputRef.current.value=''; }}
                      style={{ marginTop:12, padding:'6px 16px', borderRadius:8, background:'#92400e', color:'#fde68a', border:'none', cursor:'pointer', fontSize:13, fontWeight:600 }}>
                      🗑️ حذف الملف واختيار آخر
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button onClick={handleAnalyze} disabled={!file || loading || !!isXlsFile(file)}
              style={{ marginTop:24, width:'100%', padding:'14px', borderRadius:10, background:file?'linear-gradient(135deg,#6366f1,#8b5cf6)':'#334155', color:'#fff', border:'none', fontSize:16, fontWeight:700, cursor:file?'pointer':'not-allowed', opacity:loading?.7:1 }}>
              {loading ? '⏳ جاري التحليل...' : '🔍 تحليل الملف'}
            </button>
          </div>
        )}

        {/* ── STEP 2 ── */}
        {step === 2 && analyzed && (
          <div>
            {/* Cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
              {[
                { label:'إجمالي الصفوف', value:analyzed.total_rows, color:'#6366f1' },
                { label:'تطابق تام',      value:analyzed.exact_count, color:'#10b981' },
                { label:'تطابق جزئي',     value:analyzed.fuzzy_count, color:'#f59e0b' },
                { label:'غير موجود',      value:analyzed.new_count,   color:'#ef4444' },
              ].map(c => (
                <div key={c.label} style={{ background:'#1e293b', borderRadius:12, padding:'16px 20px', borderTop:`3px solid ${c.color}` }}>
                  <div style={{ color:c.color, fontSize:28, fontWeight:800 }}>{c.value}</div>
                  <div style={{ color:'#94a3b8', fontSize:13 }}>{c.label}</div>
                </div>
              ))}
            </div>

            {/* Bulk Actions & Top Confirm Button */}
            <div style={{ background:'#1e293b', borderRadius:12, padding:'12px 20px', marginBottom:16, display:'flex', gap:12, alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
              <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                <span style={{ color:'#94a3b8', fontSize:14 }}>تطبيق على الكل:</span>
                <button onClick={() => setRows(r => r.map(x => ({ ...x, action:'link' as RowAction })))} style={btnStyle('#1d4ed8')}>🔗 ربط الكل</button>
                <button onClick={() => setRows(r => r.map(x => ({ ...x, action:'skip' as RowAction })))} style={btnStyle('#374151')}>⏭ تخطي الكل</button>
                <button onClick={() => setRows(r => r.map(x => x.match_status==='not_found' ? { ...x, action:'create_agent' as RowAction, selected_agent_id:null } : x))} style={btnStyle('#7c3aed')}>➕ إنشاء الغير موجودين</button>
                <button onClick={() => setRows(r => r.map(x => x.match_status==='exact' ? { ...x, action:'link' as RowAction } : x))} style={btnStyle('#065f46')}>✅ قبول التطابق التام فقط</button>
              </div>
              <button onClick={handleConfirm} disabled={loading}
                style={{ padding:'10px 24px', borderRadius:8, background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', border:'none', fontSize:15, fontWeight:700, cursor:'pointer', opacity:loading?.7:1, boxShadow:'0 4px 14px rgba(16, 185, 129, 0.4)' }}>
                {loading ? '⏳ جاري الاستيراد...' : `✅ تأكيد استيراد ${rows.filter(r => r.action!=='skip').length} وثيقة`}
              </button>
            </div>

            {/* Table */}
            <div style={{ background:'#1e293b', borderRadius:16, overflow:'hidden' }}>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'#0f172a' }}>
                      {['#','اسم الوكيل في الملف','اسم الوكالة في الملف','حالة المطابقة','الوكيل المقترح','الإجراء'].map(h => (
                        <th key={h} style={{ padding:'12px 16px', color:'#64748b', fontSize:13, fontWeight:600, textAlign:'right', borderBottom:'1px solid #334155' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <RowItem key={row.row_index} row={row} idx={idx}
                        allAgents={allAgents}
                        searchAgent={searchAgent[idx] ?? ''}
                        onSearchChange={v => setSearchAgent(prev => ({ ...prev, [idx]:v }))}
                        onUpdate={patch => updateRow(idx, patch)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display:'flex', gap:12, marginTop:24 }}>
              <button onClick={() => setStep(1)} style={{ ...btnStyle('#374151'), flex:1, padding:'14px', fontSize:15 }}>← رجوع</button>
              <button onClick={handleConfirm} disabled={loading}
                style={{ flex:2, padding:'14px', borderRadius:10, background:'linear-gradient(135deg,#10b981,#059669)', color:'#fff', border:'none', fontSize:16, fontWeight:700, cursor:'pointer', opacity:loading?.7:1 }}>
                {loading ? '⏳ جاري الاستيراد...' : `✅ تأكيد استيراد ${rows.filter(r => r.action!=='skip').length} وثيقة`}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3 ── */}
        {step === 3 && importResult && (
          <div style={{ background:'#1e293b', borderRadius:16, padding:40, textAlign:'center' }}>
            <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
            <h2 style={{ color:'#10b981', fontSize:28, margin:'0 0 8px' }}>تم الاستيراد بنجاح!</h2>
            <p style={{ color:'#94a3b8', marginBottom:32 }}>{importResult.message}</p>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, maxWidth:560, margin:'0 auto 32px' }}>
              {[
                { label:'وثائق مستوردة', value:importResult.imported_count,  color:'#10b981' },
                { label:'وكلاء جدد أُنشئوا', value:importResult.agents_created ?? 0, color:'#6366f1' },
                { label:'تم تخطيها',     value:importResult.skipped_count,   color:'#f59e0b' },
                { label:'أخطاء',          value:importResult.error_count,     color:'#ef4444' },
              ].map(c => (
                <div key={c.label} style={{ background:'#0f172a', borderRadius:10, padding:16, border:`1px solid ${c.color}33` }}>
                  <div style={{ color:c.color, fontSize:28, fontWeight:800 }}>{c.value}</div>
                  <div style={{ color:'#94a3b8', fontSize:12 }}>{c.label}</div>
                </div>
              ))}
            </div>

            {importResult.agents_created > 0 && (
              <div style={{ background:'#1e1b4b', border:'1px solid #6366f1', borderRadius:10, padding:'12px 16px', marginBottom:24, color:'#a5b4fc', fontSize:14 }}>
                💡 الوكلاء الجدد تم إنشاؤهم بحالة <strong>غير نشط</strong> — يرجى مراجعتهم وتفعيلهم من قائمة الفروع والوكلاء.
              </div>
            )}

            {importResult.errors?.length > 0 && (
              <div style={{ background:'#450a0a', border:'1px solid #b91c1c', borderRadius:10, padding:16, marginBottom:24, textAlign:'right' }}>
                <p style={{ color:'#fca5a5', margin:'0 0 8px', fontWeight:700 }}>الأخطاء:</p>
                {importResult.errors.map((e: any, i: number) => (
                  <p key={i} style={{ color:'#fca5a5', margin:'4px 0', fontSize:13 }}>صف {e.row}: {e.message}</p>
                ))}
              </div>
            )}

            <button onClick={reset}
              style={{ padding:'12px 40px', borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', fontSize:15, fontWeight:700, cursor:'pointer' }}>
              استيراد ملف آخر
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── StepBar ── */
function StepBar({ step }: { step: number }) {
  const steps = ['رفع الملف', 'مراجعة المطابقة', 'النتيجة'];
  return (
    <div style={{ display:'flex', alignItems:'center', marginBottom:32 }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:i+1<=step?'linear-gradient(135deg,#6366f1,#8b5cf6)':'#1e293b', border:`2px solid ${i+1<=step?'#6366f1':'#334155'}`, display:'flex', alignItems:'center', justifyContent:'center', color:i+1<=step?'#fff':'#475569', fontWeight:700, fontSize:15 }}>{i+1}</div>
            <span style={{ color:i+1<=step?'#a5b4fc':'#475569', fontSize:12, marginTop:6 }}>{s}</span>
          </div>
          {i < steps.length-1 && <div style={{ flex:2, height:2, background:i+1<step?'#6366f1':'#334155', margin:'0 4px', marginBottom:18 }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── RowItem ── */
function RowItem({ row, idx, allAgents, searchAgent, onSearchChange, onUpdate }: {
  row: AnalyzedRow; idx: number; allAgents: AgentCandidate[];
  searchAgent: string; onSearchChange: (v: string) => void;
  onUpdate: (p: Partial<AnalyzedRow>) => void;
}) {
  const [open, setOpen] = useState(false);
  const badge = statusBadge[row.match_status];
  const filteredAgents = allAgents.filter(a =>
    !searchAgent || a.agent_name.includes(searchAgent) || a.agency_name.includes(searchAgent)
  ).slice(0, 20);
  const selectedAgent = allAgents.find(a => a.id === row.selected_agent_id);

  const ACTIONS: { key: RowAction; label: string; color: string }[] = [
    { key:'link',         label:'🔗 ربط',             color:'#1d4ed8' },
    { key:'create_agent', label:'➕ إنشاء وكيل جديد', color:'#7c3aed' },
    { key:'skip',         label:'⏭ تخطي',            color:'#374151' },
  ];

  return (
    <tr style={{ borderBottom:'1px solid #1e293b', background:row.action==='skip'?'#0f172a44':'transparent' }}>
      <td style={{ padding:'10px 16px', color:'#64748b', fontSize:13 }}>{idx+1}</td>
      <td style={{ padding:'10px 16px', color:'#e2e8f0', fontSize:13 }}>{row.agent_name_in_file||'-'}</td>
      <td style={{ padding:'10px 16px', color:'#e2e8f0', fontSize:13 }}>{row.agency_name_in_file||'-'}</td>
      <td style={{ padding:'10px 16px' }}>
        <span style={{ background:badge.bg, color:badge.text, padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:600 }}>
          {badge.label} {row.match_score>0 && `(${row.match_score}%)`}
        </span>
      </td>
      <td style={{ padding:'10px 16px', minWidth:240, position:'relative' }}>
        {row.action === 'create_agent' ? (
          <span style={{ color:'#a5b4fc', fontSize:13 }}>➕ سيُنشأ وكيل جديد تلقائياً</span>
        ) : row.action !== 'skip' ? (
          <div>
            <div onClick={() => setOpen(o => !o)}
              style={{ background:'#0f172a', border:'1px solid #334155', borderRadius:8, padding:'8px 12px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:selectedAgent?'#a5b4fc':'#475569', fontSize:13 }}>
                {selectedAgent ? `${selectedAgent.agent_name} | ${selectedAgent.agency_name}` : 'اختر وكيل...'}
              </span>
              <span style={{ color:'#475569' }}>{open?'▲':'▼'}</span>
            </div>
            {open && (
              <div style={{ position:'absolute', zIndex:50, background:'#1e293b', border:'1px solid #334155', borderRadius:8, top:'100%', right:0, left:0, maxHeight:260, overflowY:'auto', boxShadow:'0 8px 32px #00000066' }}>
                <input autoFocus value={searchAgent} onChange={e => onSearchChange(e.target.value)} placeholder="بحث..."
                  style={{ width:'100%', padding:'8px 12px', background:'#0f172a', border:'none', borderBottom:'1px solid #334155', color:'#e2e8f0', fontSize:13, boxSizing:'border-box' }} />
                {row.all_candidates.length > 0 && <div style={{ padding:'6px 10px', color:'#475569', fontSize:11, background:'#0f172a44' }}>مقترحات بناءً على الاسم</div>}
                {row.all_candidates.map(c => (
                  <div key={c.id} onClick={() => { onUpdate({ selected_agent_id:c.id, action:'link' }); setOpen(false); onSearchChange(''); }}
                    style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #1e293b', display:'flex', justifyContent:'space-between', background:row.selected_agent_id===c.id?'#1e1b4b':'transparent' }}
                    onMouseEnter={e => (e.currentTarget.style.background='#1e1b4b')}
                    onMouseLeave={e => (e.currentTarget.style.background=row.selected_agent_id===c.id?'#1e1b4b':'transparent')}>
                    <div>
                      <div style={{ color:'#e2e8f0', fontSize:13 }}>{c.agent_name}</div>
                      <div style={{ color:'#64748b', fontSize:11 }}>{c.agency_name} | {c.code}</div>
                    </div>
                    <span style={{ color:'#10b981', fontSize:12, alignSelf:'center' }}>{c.score}%</span>
                  </div>
                ))}
                {searchAgent && (
                  <>
                    <div style={{ padding:'6px 10px', color:'#475569', fontSize:11, background:'#0f172a44' }}>جميع الوكلاء</div>
                    {filteredAgents.map(a => (
                      <div key={a.id} onClick={() => { onUpdate({ selected_agent_id:a.id, action:'link' }); setOpen(false); onSearchChange(''); }}
                        style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid #1e293b' }}
                        onMouseEnter={e => (e.currentTarget.style.background='#1e1b4b')}
                        onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                        <div style={{ color:'#e2e8f0', fontSize:13 }}>{a.agent_name}</div>
                        <div style={{ color:'#64748b', fontSize:11 }}>{a.agency_name} | {a.code}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        ) : <span style={{ color:'#475569', fontSize:13 }}>—</span>}
      </td>
      <td style={{ padding:'10px 16px' }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {ACTIONS.map(a => (
            <button key={a.key}
              onClick={() => onUpdate({ action:a.key, ...(a.key==='create_agent'?{selected_agent_id:null}:{}) })}
              style={{ padding:'4px 10px', borderRadius:6, fontSize:12, cursor:'pointer', border:'none', fontWeight:600,
                background: row.action===a.key ? a.color : '#1e293b',
                color: row.action===a.key ? '#fff' : '#64748b' }}>
              {a.label}
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}

const btnStyle = (bg: string): React.CSSProperties => ({
  padding:'6px 14px', borderRadius:8, background:bg, color:'#fff',
  border:'none', fontSize:13, cursor:'pointer', fontWeight:600,
});
