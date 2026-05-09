import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

const getCountryDisplay = (name: string): string => name;

type Plate = { id: number; plate_number: string; city: { id: number; name_ar: string; name_en: string; order?: number; }; };
type Engine = { id: number; engine_type: 'main' | 'auxiliary'; engine_model?: string; fuel_type?: string; engine_number?: string; manufacturing_country?: string; horsepower?: number; installation_date?: string; cylinders_count?: number; installation_type?: string; };
type MarineStructureInsuranceDocument = {
  id: number; insurance_number: string; issue_date: string; start_date: string; end_date: string; duration: string;
  structure_type: string; license_type?: string; license_purpose?: string; vessel_name?: string;
  registration_code?: string; registration_date?: string; port?: string; registration_authority?: Plate;
  plate_number?: string; hull_number?: string; manufacturing_material?: string; length?: number;
  width?: number; depth?: number; manufacturing_year?: number; manufacturing_country?: string;
  color?: string; fuel_tank_capacity?: number; passenger_count?: number; load_capacity?: number;
  insured_name?: string; phone?: string; whatsapp_number?: string; license_number?: string;
  premium: number; tax: number; stamp: number; issue_fees: number; supervision_fees: number; total: number;
  engines?: Engine[];
};

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

const EngineCard = ({ engine, title }: { engine: Engine | undefined; title: string }) => (
  <SectionCard title={title} icon="fa-gear">
    {engine ? (
      <>
        {engine.engine_model && <Row label="نوع المحرك" value={engine.engine_model} />}
        {engine.fuel_type && <Row label="نوع الوقود" value={engine.fuel_type} />}
        {engine.engine_number && <Row label="رقم المحرك" value={engine.engine_number} />}
        {engine.manufacturing_country && <Row label="مكان الصنع" value={getCountryDisplay(engine.manufacturing_country)} />}
        {engine.horsepower && <Row label="القوة بالحصان" value={`${engine.horsepower} حصان`} />}
        {engine.installation_date && <Row label="تاريخ التركيب" value={fmtDate(engine.installation_date)} />}
        {engine.cylinders_count && <Row label="عدد الإسطوانات" value={engine.cylinders_count} />}
        {engine.installation_type && <Row label="تركيب المحرك" value={engine.installation_type} />}
      </>
    ) : (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>لا توجد بيانات</div>
    )}
  </SectionCard>
);

export default function ViewMarineStructureInsurance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<MarineStructureInsuranceDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) fetchDocument(); }, [id]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/marine-structure-insurance-documents/${id}`, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) { if (res.status === 404) { showToast('الوثيقة غير موجودة', 'error'); setTimeout(() => navigate('/marine-structure-insurance-documents'), 2000); return; } throw new Error(`HTTP error! status: ${res.status}`); }
      setDocument(await res.json());
    } catch (error: any) { showToast(`حدث خطأ: ${error.message || ''}`, 'error'); } finally { setLoading(false); }
  };

  const handlePrint = () => {
    const iframe = window.document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:-9999px;width:0;height:0';
    iframe.src = `${API_BASE_URL}/marine-structure-insurance-documents/${id}/print`;
    window.document.body.appendChild(iframe);
    iframe.onload = () => { setTimeout(() => { if (iframe.contentWindow) { iframe.contentWindow.focus(); iframe.contentWindow.print(); } setTimeout(() => { if (window.document.body.contains(iframe)) window.document.body.removeChild(iframe); }, 300); }, 100); };
  };

  if (loading) return (
    <section className="users-management">
      <div className="users-breadcrumb"><span>وثائق تأمين الهياكل البحرية / عرض وثيقة</span></div>
      <div className="users-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '12px' }}></i><p>جار التحميل...</p></div>
      </div>
    </section>
  );

  if (!document) return (
    <section className="users-management">
      <div className="users-breadcrumb"><span>وثائق تأمين الهياكل البحرية / عرض وثيقة</span></div>
      <div className="users-card" style={{ textAlign: 'center', padding: '40px' }}>
        <i className="fa-solid fa-file-circle-xmark" style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '16px' }}></i>
        <p style={{ marginBottom: '16px' }}>الوثيقة غير موجودة</p>
        <button onClick={() => navigate('/marine-structure-insurance-documents')} className="btn-submit">العودة</button>
      </div>
    </section>
  );

  const mainEngine = document.engines?.find(e => e.engine_type === 'main');
  const auxiliaryEngine = document.engines?.find(e => e.engine_type === 'auxiliary');

  return (
    <section className="users-management">
      <div className="users-breadcrumb"><span>وثائق تأمين الهياكل البحرية / عرض وثيقة</span></div>
      <div className="users-card" style={{ padding: '0' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg,#1e40af,#0284c7)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-ship" style={{ color: '#fff', fontSize: '1.1rem' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600' }}>تأمين الهياكل البحرية - {document.structure_type}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text)' }}>تفاصيل: {document.insurance_number}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: 'العودة', icon: 'fa-arrow-right', bg: 'var(--panel)', border: 'var(--border)', color: 'var(--text)', onClick: () => navigate('/marine-structure-insurance-documents') },
              { label: 'طباعة الوثيقة', icon: 'fa-print', bg: '#0f766e', border: '#0f766e', color: '#fff', onClick: handlePrint },
              { label: 'تعديل', icon: 'fa-pencil', bg: '#2563eb', border: '#2563eb', color: '#fff', onClick: () => navigate(`/marine-structure-insurance-documents/${id}/edit`) },
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <SectionCard title="بيانات التأمين" icon="fa-file-contract">
              <Row label="رقم التأمين" value={document.insurance_number} />
              <Row label="تاريخ الإصدار" value={fmtDateTime(document.issue_date)} />
              <Row label="نوع الهيكل" value={document.structure_type} />
              <Row label="نوع الترخيص" value={document.license_type || '-'} />
              {document.license_purpose && <Row label="الغرض من الترخيص" value={document.license_purpose} />}
            </SectionCard>

            <SectionCard title="بيانات المركب" icon="fa-anchor">
              {document.vessel_name && <Row label="اسم المركب" value={document.vessel_name} />}
              {document.registration_code && <Row label="رمز التسجيل" value={document.registration_code} />}
              {document.registration_date && <Row label="تاريخ التسجيل" value={fmtDate(document.registration_date)} />}
              {document.port && <Row label="الميناء / المرفأ" value={document.port} />}
              {document.registration_authority && <Row label="الجهة المقيد بها" value={`${document.registration_authority.city.name_ar}${document.registration_authority.city.name_en ? ' ' + document.registration_authority.city.name_en : ''}`} />}
              {document.plate_number && <Row label="رقم اللوحة" value={document.registration_authority?.city?.order ? `${document.registration_authority.city.order}-${document.plate_number}` : document.plate_number} />}
              {document.hull_number && <Row label="رقم الهيكل" value={document.hull_number} />}
              {document.manufacturing_material && <Row label="مواد التصنيع" value={document.manufacturing_material} />}
              {document.length && <Row label="الطول" value={`${document.length} م`} />}
              {document.width && <Row label="العرض" value={`${document.width} م`} />}
              {document.depth && <Row label="العمق" value={`${document.depth} م`} />}
              {document.manufacturing_year && <Row label="سنة الصنع" value={document.manufacturing_year} />}
              {document.manufacturing_country && <Row label="مكان الصنع" value={getCountryDisplay(document.manufacturing_country)} />}
              {document.color && <Row label="اللون" value={document.color} />}
              {document.fuel_tank_capacity && <Row label="سعة خزان الوقود" value={`${document.fuel_tank_capacity} لتر`} />}
              {document.passenger_count && <Row label="عدد الركاب" value={document.passenger_count} />}
              {document.load_capacity && <Row label="الحمولة بالطن" value={`${document.load_capacity} طن`} />}
            </SectionCard>

            <SectionCard title="بيانات المؤمن له" icon="fa-user-shield">
              {document.insured_name && <Row label="اسم المؤمن له" value={document.insured_name} />}
              {document.phone && <Row label="رقم الهاتف" value={document.phone} />}
              {document.whatsapp_number && <Row label="رقم الواتساب" value={<span style={{ color: '#25d366', fontWeight: '700' }}><i className="fa-brands fa-whatsapp" style={{ marginLeft: '4px' }}></i>{document.whatsapp_number}</span>} />}
              {document.license_number && <Row label="رقم الرخصة" value={document.license_number} />}
            </SectionCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <EngineCard engine={mainEngine} title="بيانات المحرك الرئيسي" />
            <EngineCard engine={auxiliaryEngine} title="بيانات المحرك المساعد" />
          </div>

          <SectionCard title="البيانات المالية" icon="fa-money-bill-wave">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
              <Row label="القسط المقرر" value={`${toNum(document.premium).toFixed(3)} د.ل`} />
              <Row label="الضريبة" value={`${toNum(document.tax).toFixed(3)} د.ل`} />
              <Row label="الدمغة" value={`${toNum(document.stamp).toFixed(3)} د.ل`} />
              <Row label="مصاريف الإصدار" value={`${toNum(document.issue_fees).toFixed(3)} د.ل`} />
              <Row label="رسوم الإشراف" value={`${toNum(document.supervision_fees).toFixed(3)} د.ل`} />
              <Row label="الإجمالي" value={`${toNum(document.total).toFixed(3)} د.ل`} highlight />
            </div>
          </SectionCard>
        </div>
      </div>
    </section>
  );
}
