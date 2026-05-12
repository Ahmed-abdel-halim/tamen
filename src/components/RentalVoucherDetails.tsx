import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

interface RentalRecord {
  id: number;
  from_date: string;
  to_date: string;
  apartments_count: number;
  total_amount: number;
  recipient_name: string;
}

interface RentalVoucher {
  id: number;
  owner_name: string;
  phone: string;
  national_id: string;
  notes?: string;
  personal_photo_url?: string;
  id_photo_url?: string;
  national_id_photo_url?: string;
  contract_photos_urls?: string[];
  records: RentalRecord[];
  created_at: string;
}

export default function RentalVoucherDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState<RentalVoucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    fetchVoucher();
  }, [id]);

  const fetchVoucher = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/rental-vouchers/${id}`);
      if (res.ok) {
        const data = await res.json();
        setVoucher(data.data);
      } else {
        showToast('لم يتم العثور على الوثيقة', 'error');
        navigate('/reports/rental-vouchers');
      }
    } catch {
      showToast('خطأ في الاتصال', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '40px', color: '#0ea5e9' }}></i>
    </div>
  );

  if (!voucher) return null;

  const totalAmount = voucher.records.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);

  return (
    <section className="users-management">
      {/* Lightbox */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out'
          }}
        >
          <img src={lightboxImg} alt="صورة" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', boxShadow: '0 0 40px rgba(0,0,0,0.8)' }} />
        </div>
      )}

      {/* Breadcrumb */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', background: 'var(--panel)', borderRadius: '12px',
        marginBottom: '20px', border: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: '17px', fontWeight: 'bold', color: 'var(--text)' }}>
          <i className="fa-solid fa-building" style={{ marginLeft: '10px', color: '#0ea5e9' }}></i>
          تفاصيل الإيجار العقاري
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => window.print()} className="secondary" style={{ padding: '9px 18px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', border: '1px solid var(--border)' }}>
            <i className="fa-solid fa-print"></i> طباعة
          </button>
          <button onClick={() => navigate(`/reports/rental-vouchers/${id}/edit`)} className="primary" style={{ padding: '9px 18px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-pen-to-square"></i> تعديل
          </button>
          <button onClick={() => navigate('/reports/rental-vouchers')} className="ghost" style={{ padding: '9px 18px', borderRadius: '10px', fontSize: '13px', border: '1px solid var(--border)' }}>
            <i className="fa-solid fa-arrow-right" style={{ marginLeft: '6px' }}></i> رجوع
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Owner Info */}
        <div style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#0ea5e908', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-user-tie" style={{ color: '#0ea5e9' }}></i>
            <span style={{ fontWeight: 'bold', fontSize: '15px' }}>بيانات صاحب العقار</span>
          </div>
          <div style={{ padding: '20px', display: 'grid', gap: '14px' }}>
            {[
              { icon: 'fa-user', label: 'الاسم', value: voucher.owner_name },
              { icon: 'fa-phone', label: 'الهاتف', value: voucher.phone },
              { icon: 'fa-id-card', label: 'الرقم الوطني', value: voucher.national_id },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--input-bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#0ea5e915', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`fa-solid ${item.icon}`} style={{ color: '#0ea5e9', fontSize: '14px' }}></i>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>{item.label}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{item.value}</div>
                </div>
              </div>
            ))}
            {voucher.notes && (
              <div style={{ padding: '12px 14px', background: '#fef9c3', borderRadius: '10px', border: '1px solid #fde047', fontSize: '13px' }}>
                <i className="fa-solid fa-note-sticky" style={{ marginLeft: '8px', color: '#a16207' }}></i>
                {voucher.notes}
              </div>
            )}
          </div>
        </div>

        {/* Photos */}
        <div style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#a855f708', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-images" style={{ color: '#a855f7' }}></i>
            <span style={{ fontWeight: 'bold', fontSize: '15px' }}>المستندات والصور</span>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '14px' }}>
              {[
                { url: voucher.personal_photo_url, label: 'صورة شخصية' },
                { url: voucher.id_photo_url, label: 'إثبات شخصي' },
                { url: voucher.national_id_photo_url, label: 'رقم وطني' },
              ].map((photo, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div
                    onClick={() => photo.url && setLightboxImg(photo.url)}
                    style={{
                      width: '100%', aspectRatio: '1', borderRadius: '10px',
                      border: `2px dashed ${photo.url ? '#0ea5e9' : 'var(--border)'}`,
                      background: photo.url ? '#0ea5e908' : 'var(--input-bg)',
                      cursor: photo.url ? 'zoom-in' : 'default',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                  >
                    {photo.url
                      ? <img src={photo.url} alt={photo.label} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                      : <i className="fa-solid fa-image" style={{ fontSize: '24px', color: 'var(--muted)' }}></i>
                    }
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '5px' }}>{photo.label}</div>
                </div>
              ))}
            </div>

            {/* Contract Photos */}
            {(voucher.contract_photos_urls?.length ?? 0) > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', fontWeight: 'bold' }}>
                  <i className="fa-solid fa-file-contract" style={{ marginLeft: '6px', color: '#f59e0b' }}></i>
                  صور عقد الإيجار ({voucher.contract_photos_urls!.length})
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {voucher.contract_photos_urls!.map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setLightboxImg(url)}
                      style={{
                        width: '70px', height: '70px', borderRadius: '8px',
                        border: '2px solid #f59e0b', cursor: 'zoom-in', overflow: 'hidden',
                        background: '#fef3c7'
                      }}
                    >
                      <img src={url} alt={`عقد ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div style={{ background: 'var(--panel)', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: '#22c55e08', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-table-list" style={{ color: '#22c55e' }}></i>
            <span style={{ fontWeight: 'bold', fontSize: '15px' }}>سجل الإيجارات ({voucher.records.length} سجل)</span>
          </div>
          <div style={{ background: '#22c55e15', color: '#166534', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px' }}>
            الإجمالي: {totalAmount.toLocaleString()} د.ل
          </div>
        </div>
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>من تاريخ</th>
                <th>الى تاريخ</th>
                <th>عدد الشقق</th>
                <th>الإجمالي المستلم</th>
                <th>اسم المستلم</th>
              </tr>
            </thead>
            <tbody>
              {voucher.records.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--muted)' }}>
                    لا توجد سجلات إيجار مضافة
                  </td>
                </tr>
              ) : voucher.records.map((rec, idx) => (
                <tr key={rec.id}>
                  <td style={{ color: '#0ea5e9', fontWeight: 'bold' }}>{idx + 1}</td>
                  <td>{new Date(rec.from_date).toLocaleDateString('ar-LY')}</td>
                  <td>{new Date(rec.to_date).toLocaleDateString('ar-LY')}</td>
                  <td>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                      {rec.apartments_count} شقة
                    </span>
                  </td>
                  <td style={{ color: '#22c55e', fontWeight: 'bold' }}>{rec.total_amount.toLocaleString()} د.ل</td>
                  <td style={{ fontWeight: '600' }}>{rec.recipient_name}</td>
                </tr>
              ))}
            </tbody>
            {voucher.records.length > 0 && (
              <tfoot>
                <tr style={{ background: '#22c55e10', fontWeight: 'bold' }}>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '12px', color: '#166534' }}>الإجمالي الكلي</td>
                  <td style={{ color: '#22c55e', fontWeight: '900', fontSize: '16px' }}>{totalAmount.toLocaleString()} د.ل</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </section>
  );
}
