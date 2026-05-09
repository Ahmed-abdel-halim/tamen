import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';

const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('ar-LY', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';

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

const ViewCashInTransitInsurance: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDocument(); }, [id]);

  const fetchDocument = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/cash-in-transit-insurance/${id}`);
      setDocument(await res.json());
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <section className="users-management">
      <div className="users-breadcrumb"><span>تأمين نقل النقدية / عرض الوثيقة</span></div>
      <div className="users-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '12px' }}></i><p>جار التحميل...</p></div>
      </div>
    </section>
  );

  if (!document) return (
    <section className="users-management">
      <div className="users-breadcrumb"><span>تأمين نقل النقدية / عرض الوثيقة</span></div>
      <div className="users-card" style={{ textAlign: 'center', padding: '40px' }}>
        <i className="fa-solid fa-file-circle-xmark" style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '16px' }}></i>
        <p style={{ marginBottom: '16px' }}>الوثيقة غير موجودة</p>
        <button onClick={() => navigate(-1)} className="btn-submit">العودة</button>
      </div>
    </section>
  );

  return (
    <section className="users-management">
      <div className="users-breadcrumb"><span>تأمين نقل النقدية / عرض الوثيقة</span></div>
      <div className="users-card" style={{ padding: '0' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg,#1e40af,#0284c7)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-vault" style={{ color: '#fff', fontSize: '1.1rem' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600' }}>تأمين نقل النقدية</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text)' }}>تفاصيل: {document.policy_number}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: 'العودة', icon: 'fa-arrow-right', bg: 'var(--panel)', border: 'var(--border)', color: 'var(--text)', onClick: () => navigate(-1) },
              { label: 'طباعة الوثيقة', icon: 'fa-print', bg: '#0f766e', border: '#0f766e', color: '#fff', onClick: () => window.print() },
              { label: 'تعديل', icon: 'fa-pencil', bg: '#2563eb', border: '#2563eb', color: '#fff', onClick: () => navigate(`/cash-in-transit-insurance/edit/${id}`) },
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
              { icon: 'fa-calendar-check', label: 'تاريخ البدء', value: fmtDate(document.start_date), color: '#10b981' },
              { icon: 'fa-calendar-times', label: 'تاريخ الانتهاء', value: fmtDate(document.end_date), color: '#ef4444' },
              { icon: 'fa-route', label: 'مسار النقل', value: document.transit_from && document.transit_to ? `${document.transit_from} ← ${document.transit_to}` : '-', color: '#f59e0b' },
              { icon: 'fa-money-bill-wave', label: 'القسط الإجمالي', value: `${document.premium_amount || '-'} د.ل`, color: '#1d4ed8' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fa-solid ${s.icon}`} style={{ color: s.color, fontSize: '1rem' }}></i>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600' }}>{s.label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text)' }}>{s.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <SectionCard title="بيانات الوثيقة والمؤمن له" icon="fa-file-contract">
              <Row label="رقم الوثيقة" value={document.policy_number} />
              <Row label="اسم المؤمن له" value={document.insured_name || '-'} />
              <Row label="رقم الواتساب" value={document.whatsapp_number ? <span style={{ color: '#25d366', fontWeight: '700' }}><i className="fa-brands fa-whatsapp" style={{ marginLeft: '4px' }}></i>{document.whatsapp_number}</span> : '-'} />
              <Row label="تاريخ البدء" value={fmtDate(document.start_date)} />
              <Row label="تاريخ الانتهاء" value={fmtDate(document.end_date)} />
            </SectionCard>

            <SectionCard title="الحدود والرسوم المالية" icon="fa-money-bill-wave">
              <Row label="مسار النقل" value={document.transit_from && document.transit_to ? `من ${document.transit_from} إلى ${document.transit_to}` : '-'} />
              <Row label="حد النقلة الواحدة" value={document.limit_per_transit ? `${document.limit_per_transit} د.ل` : '-'} />
              <Row label="التداول السنوي" value={document.annual_turnover ? `${document.annual_turnover} د.ل` : '-'} />
              <Row label="القسط الإجمالي" value={document.premium_amount ? `${document.premium_amount} د.ل` : '-'} highlight />
            </SectionCard>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ViewCashInTransitInsurance;
