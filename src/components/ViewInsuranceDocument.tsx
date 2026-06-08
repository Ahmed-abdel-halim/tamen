import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

type Plate = {
  id: number;
  plate_number: string;
  city: { id: number; name_ar: string; name_en: string; order?: number; };
};
type VehicleType = { id: number; brand: string; category: string; };
type InsuranceDocument = {
  id: number; insurance_type: string; insurance_number: string;
  issue_date: string; start_date: string; end_date?: string; duration?: string;
  plate?: Plate; port?: string; plate_number_manual?: string; chassis_number?: string;
  vehicle_type_id?: number; vehicleType?: VehicleType; vehicle_type?: VehicleType;
  color?: string; year?: number; fuel_type?: string; license_purpose?: string;
  engine_power?: string; authorized_passengers?: number; load_capacity?: number;
  insured_name?: string; phone?: string; driving_license_number?: string;
  premium: number; tax: number; stamp: number; issue_fees: number;
  supervision_fees: number; total: number; third_party_purpose?: string;
  foreign_car_country?: string; foreign_car_purpose?: string; print_type?: string;
  whatsapp_number?: string; eidc_policy_id?: string; eidc_transaction_code?: string;
  eidc_sync_status?: string; eidc_pdf_url?: string; eidc_error?: string;
  nationality?: string; nid_passport?: string; address?: string;
  email?: string; engine_number?: string; engine_cc?: string;
  vehicle_weight?: string; notes?: string;
};
type OwnershipTransfer = {
  id: number; previous_plate_id?: number; previous_plate?: Plate;
  previous_plate_number_manual?: string; previous_insured_name?: string;
  previous_phone?: string; previous_driving_license_number?: string;
  new_plate_id?: number; new_plate?: Plate; new_plate_number_manual?: string;
  new_insured_name: string; new_phone?: string; new_driving_license_number?: string;
  transferred_at: string; created_at: string;
};

export default function ViewInsuranceDocument() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<InsuranceDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownershipTransfers, setOwnershipTransfers] = useState<OwnershipTransfer[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadUserPermissions();
    if (id) { fetchDocument(); fetchOwnershipTransferHistory(); }
  }, [id]);

  const loadUserPermissions = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) { const user = JSON.parse(userStr); setIsAdmin(user.is_admin || false); }
    } catch { setIsAdmin(false); }
  };

  const fetchDocument = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/insurance-documents/${id}`, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) {
        if (res.status === 404) { showToast('الوثيقة غير موجودة', 'error'); setTimeout(() => navigate('/insurance-documents'), 2000); return; }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      setDocument(await res.json());
    } catch (error: any) {
      showToast(`حدث خطأ: ${error.message || ''}`, 'error');
    } finally { setLoading(false); }
  };

  const fetchOwnershipTransferHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/insurance-documents/${id}/ownership-transfer-history`, { headers: { 'Accept': 'application/json' } });
      if (res.ok) { const data = await res.json(); setOwnershipTransfers(Array.isArray(data) ? data : []); }
    } catch (error: any) { console.error(error); }
  };

  const handlePrint = () => {
    const iframe = window.document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:-9999px;width:0;height:0';
    iframe.src = `${API_BASE_URL}/insurance-documents/${id}/print?t=${Date.now()}`;
    window.document.body.appendChild(iframe);
    setTimeout(() => { if (window.document.body.contains(iframe)) window.document.body.removeChild(iframe); }, 5000);
  };

  const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('ar-LY', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-';
  const formatDateTime = (d?: string) => d ? new Date(d).toLocaleString('ar-LY', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

  const getPortNumber = (portName?: string): string | null => {
    if (!portName) return null;
    const ports: Record<string, string> = { 'ميناء مصراته': '3', 'ميناء طرابلس': '5', 'ميناء الخمس': '6', 'ميناء بنغازي': '8' };
    for (const [port, number] of Object.entries(ports)) { if (portName.includes(port) || port.includes(portName)) return number; }
    const match = portName.match(/\d+/); return match ? match[0] : null;
  };

  const formatPlateNumber = () => {
    if (!document) return '-';
    const isCustoms = document.insurance_type === 'تأمين سيارة جمرك';
    const plateNumber = document.plate_number_manual ?? (document.plate?.plate_number ?? null);
    const cityOrder = document.plate?.city?.order ?? null;
    if (isCustoms && document.port) {
      const portNum = getPortNumber(document.port);
      if (plateNumber && portNum) return `${portNum}-${plateNumber}`;
      if (plateNumber) return `${document.port.trim()} - ${plateNumber}`;
      if (portNum) return portNum;
      return document.port.trim();
    }
    if (plateNumber && cityOrder) return `${cityOrder}-${plateNumber}`;
    if (plateNumber) return plateNumber;
    if (document.port) return 'جمرك';
    return '-';
  };

  const formatCityName = () => {
    if (!document) return '-';
    const isCustoms = document.insurance_type === 'تأمين سيارة جمرك';
    if (isCustoms) return document.port ? document.port.trim() : '-';
    if (document.plate?.city) { const c = document.plate.city; return c.name_ar + (c.name_en ? ' ' + c.name_en : ''); }
    if (document.port) return document.port.trim();
    return '-';
  };

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

  if (loading) return (
    <section className="users-management">
      <div className="users-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '12px' }}></i>
          <p>جار التحميل...</p>
        </div>
      </div>
    </section>
  );

  if (!document) return (
    <section className="users-management">
      <div className="users-card" style={{ textAlign: 'center', padding: '40px' }}>
        <i className="fa-solid fa-file-circle-xmark" style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '16px' }}></i>
        <p style={{ marginBottom: '16px', color: 'var(--text)' }}>الوثيقة غير موجودة</p>
        <button onClick={() => navigate('/insurance-documents')} className="btn-submit">العودة إلى القائمة</button>
      </div>
    </section>
  );

  const isMandatory = document.insurance_type === 'تأمين إجباري سيارات';
  const vt = document.vehicleType || document.vehicle_type;

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>الإعدادات / وثائق تأمين السيارات / عرض الوثيقة</span>
      </div>

      <div className="users-card" style={{ padding: '0' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: 'var(--panel)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg,#1e40af,#0284c7)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-file-shield" style={{ color: '#fff', fontSize: '1.1rem' }}></i>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: '600' }}>{document.insurance_type}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text)' }}>تفاصيل: {document.insurance_number}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {[
              { label: 'العودة', icon: 'fa-arrow-right', bg: 'var(--panel)', border: 'var(--border)', color: 'var(--text)', onClick: () => navigate('/insurance-documents') },
              { label: 'طباعة الوثيقة', icon: 'fa-print', bg: '#0f766e', border: '#0f766e', color: '#fff', onClick: handlePrint },
              ...(document.eidc_pdf_url ? [{ label: 'وثيقة الهيئة (PDF)', icon: 'fa-file-pdf', bg: '#0284c7', border: '#0284c7', color: '#fff', onClick: () => window.open(`${API_BASE_URL}/insurance-documents/${id}/eidc-print`, '_blank') }] : []),
              ...(isAdmin ? [{ label: 'تعديل', icon: 'fa-pencil', bg: '#2563eb', border: '#2563eb', color: '#fff', onClick: () => navigate(`/insurance-documents/${id}/edit`) }] : []),
              { label: 'نقل ملكية', icon: 'fa-exchange-alt', bg: '#10b981', border: '#10b981', color: '#fff', onClick: () => navigate(`/insurance-documents/${id}/transfer-ownership`) },
            ].map((btn, i) => (
              <button key={i} onClick={btn.onClick} style={{ display: 'flex', alignItems: 'center', gap: '7px', height: '38px', padding: '0 16px', fontSize: '0.88rem', fontWeight: '700', background: btn.bg, border: `1px solid ${btn.border}`, color: btn.color, borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                <i className={`fa-solid ${btn.icon}`}></i>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
            {[
              { icon: 'fa-calendar-check', label: 'تاريخ البداية', value: formatDate(document.start_date), color: '#10b981' },
              { icon: 'fa-calendar-times', label: 'تاريخ النهاية', value: formatDate(document.end_date), color: '#ef4444' },
              { icon: 'fa-clock', label: 'مدة التأمين', value: document.duration || '-', color: '#f59e0b' },
              { icon: 'fa-money-bill-wave', label: 'الإجمالي', value: `${Number(document.total).toFixed(3)} د.ل`, color: '#1d4ed8' },
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

          {/* Main Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <SectionCard title="معلومات الوثيقة" icon="fa-file-contract">
              <Row label="رقم الوثيقة" value={document.insurance_number} />
              <Row label="نوع التأمين" value={document.insurance_type} />
              <Row label="تاريخ الإصدار" value={formatDateTime(document.issue_date)} />
              <Row label="تاريخ البداية" value={formatDate(document.start_date)} />
              <Row label="تاريخ النهاية" value={formatDate(document.end_date)} />
              <Row label="مدة التأمين" value={document.duration || '-'} />
              {isMandatory && (
                <>
                  <Row label="حالة الربط بالهيئة" value={
                    <span style={{ color: document.eidc_policy_id ? '#10b981' : (document.eidc_sync_status === 'failed' ? '#ef4444' : '#f59e0b'), fontWeight: '700' }}>
                      {document.eidc_policy_id ? '✓ تم الربط بنجاح' : (document.eidc_sync_status === 'failed' ? '✗ فشل الربط' : '⏳ قيد الانتظار')}
                    </span>
                  } />
                  {document.eidc_transaction_code && <Row label="كود المعاملة (الهيئة)" value={document.eidc_transaction_code} />}
                  {document.eidc_policy_id && (
                    <Row label="رقم الوثيقة (الهيئة)" value={
                      <a href={`${API_BASE_URL}/insurance-documents/${id}/eidc-print`} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', textDecoration: 'underline', fontWeight: '700' }}>
                        {document.eidc_policy_id} <i className="fa-solid fa-external-link" style={{ fontSize: '10px' }}></i>
                      </a>
                    } />
                  )}
                </>
              )}
            </SectionCard>

            <SectionCard title="معلومات المؤمن له" icon="fa-user-shield">
              <Row label="اسم المؤمن له" value={document.insured_name || '-'} />
              <Row label="الجنسية" value={document.nationality || '-'} />
              <Row label="الرقم الوطني / جواز السفر" value={document.nid_passport || '-'} />
              <Row label="العنوان" value={document.address || '-'} />
              <Row label="رقم الهاتف" value={document.phone || '-'} />
              <Row label="رقم الواتساب" value={
                document.whatsapp_number
                  ? <span style={{ color: '#25d366', fontWeight: '700' }}><i className="fa-brands fa-whatsapp" style={{ marginLeft: '4px' }}></i>{document.whatsapp_number}</span>
                  : '-'
              } />
              <Row label="البريد الإلكتروني" value={document.email || '-'} />
              <Row label="رقم رخصة القيادة" value={document.driving_license_number || '-'} />
              {document.third_party_purpose && <Row label="غرض الطرف الثالث" value={document.third_party_purpose} />}
              {document.notes && <Row label="ملاحظات" value={document.notes} />}
            </SectionCard>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <SectionCard title="معلومات المركبة" icon="fa-car">
              <Row label="رقم اللوحة المعدنية" value={formatPlateNumber()} />
              <Row label="الميناء / الجهة المقيّد بها" value={formatCityName()} />
              <Row label="رقم الهيكل" value={document.chassis_number || '-'} />
              <Row label="نوع المركبة" value={vt ? (isMandatory ? vt.brand : `${vt.brand}${vt.category ? ' / ' + vt.category : ''}`) : '-'} />
              <Row label="اللون" value={document.color || '-'} />
              <Row label="سنة الصنع" value={document.year || '-'} />
              <Row label="نوع الوقود" value={document.fuel_type || '-'} />
              <Row label="الغرض من الترخيص" value={document.license_purpose || '-'} />
              <Row label="قوة المحرك بالحصان" value={document.engine_power || '-'} />
              <Row label="الركاب المصرح بهم" value={document.authorized_passengers || '-'} />
              <Row label="الحمولة بالطن" value={
                document.load_capacity
                  ? (() => { const c = typeof document.load_capacity === 'string' ? parseFloat(document.load_capacity) : document.load_capacity; return isNaN(c) ? '-' : Number.isInteger(c) ? c.toString() : c.toFixed(2); })()
                  : '-'
              } />
              {document.engine_number && <Row label="رقم المحرك" value={document.engine_number} />}
              {document.engine_cc && <Row label="سعة المحرك (سي سي)" value={document.engine_cc} />}
              {document.vehicle_weight && <Row label="وزن المركبة" value={document.vehicle_weight} />}
            </SectionCard>

            <SectionCard title="البيانات المالية" icon="fa-money-bill-wave">
              <Row label="قيمة القسط المقرر" value={`${Number(document.premium).toFixed(3)} د.ل`} />
              <Row label="الضريبة" value={`${Number(document.tax).toFixed(3)} د.ل`} />
              <Row label="الدمغة" value={`${Number(document.stamp).toFixed(3)} د.ل`} />
              <Row label="مصاريف الإصدار" value={`${Number(document.issue_fees).toFixed(3)} د.ل`} />
              <Row label="رسوم الإشراف" value={`${Number(document.supervision_fees).toFixed(3)} د.ل`} />
              <Row label="الإجمالي" value={`${Number(document.total).toFixed(3)} د.ل`} highlight />
            </SectionCard>
          </div>

          {(document.foreign_car_country || document.foreign_car_purpose) && (
            <div style={{ marginBottom: '14px' }}>
              <SectionCard title="معلومات السيارة الأجنبية" icon="fa-globe">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  {document.foreign_car_country && <Row label="بلد السيارة" value={document.foreign_car_country} />}
                  {document.foreign_car_purpose && <Row label="غرض السيارة" value={document.foreign_car_purpose} />}
                </div>
              </SectionCard>
            </div>
          )}

          {ownershipTransfers.length > 0 && (
            <SectionCard title="تاريخ نقل الملكية" icon="fa-exchange-alt">
              <div style={{ overflowX: 'auto' }}>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>التاريخ والوقت</th>
                      <th>المؤمن (السابق)</th>
                      <th>المؤمن (الجديد)</th>
                      <th>الجهة (السابقة)</th>
                      <th>الجهة (الجديدة)</th>
                      <th>اللوحة (السابقة)</th>
                      <th>اللوحة (الجديدة)</th>
                      <th>الهاتف (السابق)</th>
                      <th>الهاتف (الجديد)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownershipTransfers.map((t) => (
                      <tr key={t.id}>
                        <td>{new Date(t.transferred_at).toLocaleString('ar-LY', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                        <td>{t.previous_insured_name || '-'}</td>
                        <td style={{ fontWeight: 'bold', color: '#10b981' }}>{t.new_insured_name}</td>
                        <td>{t.previous_plate ? `${t.previous_plate.city.name_ar} - ${t.previous_plate.plate_number}` : (t.previous_plate_number_manual || '-')}</td>
                        <td style={{ fontWeight: 'bold', color: '#10b981' }}>{t.new_plate ? `${t.new_plate.city.name_ar} - ${t.new_plate.plate_number}` : (t.new_plate_number_manual || '-')}</td>
                        <td>{t.previous_plate_number_manual || '-'}</td>
                        <td style={{ fontWeight: 'bold', color: '#10b981' }}>{t.new_plate_number_manual || '-'}</td>
                        <td>{t.previous_phone || '-'}</td>
                        <td style={{ fontWeight: 'bold', color: '#10b981' }}>{t.new_phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </section>
  );
}
