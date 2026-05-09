import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

type Passenger = { id: number; is_main_passenger: boolean; relationship?: string; name_ar: string; name_en: string; phone?: string; passport_number?: string; address?: string; birth_date?: string; age?: number; gender?: string; nationality?: string; };
type ResidentInsuranceDocument = { id: number; insurance_number: string; insurance_type: string; issue_date: string; start_date: string; end_date: string; duration?: string; geographic_area?: string; premium: number; family_members_premium: number; stamp: number; issue_fees: number; supervision_fees: number; total: number; whatsapp_number?: string; passengers?: Passenger[]; };

const toNum = (v: any) => (typeof v === 'number' ? v : parseFloat(String(v)) || 0);
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('ar-LY', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';
const fmtDateTime = (d?: string) => d ? new Date(d).toLocaleString('ar-LY', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

const Row = ({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) => (
  <div style={{ display: 'flex', padding: '10px 16px', borderBottom: '1px solid var(--border)', background: highlight ? 'rgba(37,99,235,0.06)' : 'transparent', alignItems: 'center', gap: '12px' }}>
    <span style={{ fontWeight: '700', color: 'var(--muted, #64748b)', fontSize: '0.82rem', minWidth: '140px', flexShrink: 0 }}>{label}</span>
    <span style={{ fontWeight: highlight ? '800' : '600', color: highlight ? '#1d4ed8' : 'var(--text)', fontSize: highlight ? '1.05rem' : '0.9rem' }}>{value}</span>
  </div>
);

const SectionCard = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
  <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
    <div style={{ padding: '12px 16px', background: 'linear-gradient(135deg, #0f172a, #1e40af)', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <i className={`fa-solid ${icon}`} style={{ color: '#38bdf8', fontSize: '1rem' }}></i>
      <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.95rem' }}>{title}</span>
    </div>
    <div>{children}</div>
  </div>
);

export default function ViewResidentInsurance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<ResidentInsuranceDocument | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDocument = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/resident-insurance-documents/${id}`, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) { if (res.status === 404) { showToast('الوثيقة غير موجودة', 'error'); setTimeout(() => navigate('/resident-insurance-documents'), 2000); return; } throw new Error(`HTTP error! status: ${res.status}`); }
      setDocument(await res.json());
    } catch (error: any) { showToast(`حدث خطأ: ${error.message || ''}`, 'error'); } finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { if (id) fetchDocument(); }, [id, fetchDocument]);

  const handlePrint = () => {
    const iframe = window.document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:-9999px;width:0;height:0';
    iframe.src = `${API_BASE_URL}/resident-insurance-documents/${id}/print`;
    window.document.body.appendChild(iframe);
    iframe.onload = () => { setTimeout(() => { if (iframe.contentWindow) { iframe.contentWindow.focus(); iframe.contentWindow.print(); } setTimeout(() => { if (window.document.body.contains(iframe)) window.document.body.removeChild(iframe); }, 300); }, 100); };
  };

  if (loading) return (
    <section className="users-management">
      <div className="users-breadcrumb"><span>وثائق تأمين الوافدين للمقيمين / عرض وثيقة</span></div>
      <div className="users-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '12px' }}></i><p>جار التحميل...</p></div>
      </div>
    </section>
  );

  if (!document) return (
    <section className="users-management">
      <div className="users-breadcrumb"><span>وثائق تأمين الوافدين للمقيمين / عرض وثيقة</span></div>
      <div className="users-card" style={{ textAlign: 'center', padding: '40px' }}>
        <i className="fa-solid fa-file-circle-xmark" style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '16px' }}></i>
        <p style={{ marginBottom: '16px' }}>الوثيقة غير موجودة</p>
        <button onClick={() => navigate('/resident-insurance-documents')} className="btn-submit">العودة</button>
      </div>
    </section>
  );

  const mainPassenger = document.passengers?.find(p => p.is_main_passenger);
  const familyMembers = document.passengers?.filter(p => !p.is_main_passenger) || [];

  return (
    <section className="users-management">
      <div className="users-breadcrumb"><span>وثائق تأمين الوافدين للمقيمين / عرض وثيقة</span></div>
      <div className="users-card" style={{ padding: '0' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg,#1e40af,#0284c7)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-users" style={{ color: '#fff', fontSize: '1.1rem' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600' }}>{document.insurance_type}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text)' }}>تفاصيل: {document.insurance_number}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: 'العودة', icon: 'fa-arrow-right', bg: 'var(--panel)', border: 'var(--border)', color: 'var(--text)', onClick: () => navigate('/resident-insurance-documents') },
              { label: 'طباعة الوثيقة', icon: 'fa-print', bg: '#0f766e', border: '#0f766e', color: '#fff', onClick: handlePrint },
              { label: 'تعديل', icon: 'fa-pencil', bg: '#2563eb', border: '#2563eb', color: '#fff', onClick: () => navigate(`/resident-insurance-documents/${id}/edit`) },
            ].map((btn, i) => (
              <button key={i} onClick={btn.onClick} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 16px', fontSize: '0.88rem', fontWeight: '700', background: btn.bg, border: `1px solid ${btn.border}`, color: btn.color, borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                <i className={`fa-solid ${btn.icon}`}></i>{btn.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { icon: 'fa-calendar-check', label: 'تاريخ البداية', value: fmtDate(document.start_date), color: '#10b981' },
              { icon: 'fa-calendar-times', label: 'تاريخ النهاية', value: fmtDate(document.end_date), color: '#ef4444' },
              { icon: 'fa-clock', label: 'مدة التأمين', value: document.duration || '-', color: '#f59e0b' },
              { icon: 'fa-money-bill-wave', label: 'الإجمالي', value: `${toNum(document.total).toFixed(3)} د.ل`, color: '#1d4ed8' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: '1rem' }}></i>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600' }}>{s.label}</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text)' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <SectionCard title="معلومات الوثيقة" icon="fa-file-contract">
              <Row label="رقم التأمين" value={document.insurance_number} />
              <Row label="نوع التأمين" value={document.insurance_type} />
              <Row label="تاريخ الإصدار" value={fmtDateTime(document.issue_date)} />
              <Row label="تاريخ البداية" value={fmtDate(document.start_date)} />
              <Row label="تاريخ النهاية" value={fmtDate(document.end_date)} />
              {document.duration && <Row label="مدة التأمين" value={document.duration} />}
              {document.geographic_area && <Row label="المنطقة الجغرافية" value={document.geographic_area} />}
            </SectionCard>

            <SectionCard title="بيانات المسافر الرئيسي" icon="fa-user-shield">
              {mainPassenger ? (
                <>
                  <Row label="الاسم بالعربي" value={mainPassenger.name_ar} />
                  <Row label="الاسم بالإنجليزي" value={mainPassenger.name_en} />
                  <Row label="رقم الهاتف" value={mainPassenger.phone || '-'} />
                  <Row label="رقم الواتساب" value={document.whatsapp_number ? <span style={{ color: '#25d366', fontWeight: '700' }}><i className="fa-brands fa-whatsapp" style={{ marginLeft: '4px' }}></i>{document.whatsapp_number}</span> : '-'} />
                  <Row label="رقم الجواز" value={mainPassenger.passport_number || '-'} />
                  <Row label="العنوان" value={mainPassenger.address || '-'} />
                  <Row label="تاريخ الميلاد" value={mainPassenger.birth_date ? fmtDate(mainPassenger.birth_date) : '-'} />
                  <Row label="العمر" value={mainPassenger.age || '-'} />
                  <Row label="الجنس" value={mainPassenger.gender || '-'} />
                  <Row label="الجنسية" value={mainPassenger.nationality || '-'} />
                </>
              ) : <div style={{ padding: '16px', color: 'var(--muted)', textAlign: 'center' }}>لا توجد بيانات</div>}
            </SectionCard>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <SectionCard title="البيانات المالية" icon="fa-money-bill-wave">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <Row label="القسط" value={`${toNum(document.premium).toFixed(3)} د.ل`} />
                {document.family_members_premium > 0 && <Row label="قسط أفراد العائلة" value={`${toNum(document.family_members_premium).toFixed(3)} د.ل`} />}
                <Row label="الدمغة" value={`${toNum(document.stamp).toFixed(3)} د.ل`} />
                <Row label="مصاريف الإصدار" value={`${toNum(document.issue_fees).toFixed(3)} د.ل`} />
                <Row label="رسوم الإشراف" value={`${toNum(document.supervision_fees).toFixed(3)} د.ل`} />
                <Row label="الإجمالي" value={`${toNum(document.total).toFixed(3)} د.ل`} highlight />
              </div>
            </SectionCard>
          </div>

          {familyMembers.length > 0 && (
            <SectionCard title={`أفراد العائلة (${familyMembers.length})`} icon="fa-users">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1px', background: 'var(--border)' }}>
                {familyMembers.map((m, i) => (
                  <div key={m.id || i} style={{ background: 'var(--panel)', padding: '14px 16px' }}>
                    <div style={{ fontWeight: '700', color: '#2563eb', marginBottom: '10px', fontSize: '0.9rem' }}>{m.relationship || `فرد ${i + 1}`}</div>
                    {[{ label: 'الاسم بالعربي', val: m.name_ar }, { label: 'الاسم بالإنجليزي', val: m.name_en }, { label: 'رقم الجواز', val: m.passport_number }, { label: 'تاريخ الميلاد', val: m.birth_date ? fmtDate(m.birth_date) : null }, { label: 'العمر', val: m.age }, { label: 'الجنس', val: m.gender }]
                      .filter(r => r.val).map((r, j) => (
                        <div key={j} style={{ display: 'flex', gap: '8px', marginBottom: '6px', fontSize: '0.85rem' }}>
                          <span style={{ color: 'var(--muted)', minWidth: '100px', fontWeight: '600' }}>{r.label}:</span>
                          <span style={{ color: 'var(--text)', fontWeight: '600' }}>{r.val}</span>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </section>
  );
}
