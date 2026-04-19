import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";
type VehicleType = {
  id: number;
  brand: string;
  category: string;
};

type InternationalInsuranceDocument = {
  id: number;
  document_number: string;
  issue_date: string;
  insured_name: string;
  insured_address?: string;
  phone?: string;
  chassis_number?: string;
  plate_number?: string;
  vehicle_type_id?: number;
  vehicleType?: VehicleType;
  year?: number;
  vehicle_nationality?: string;
  visited_country?: string;
  start_date: string;
  number_of_days: number;
  end_date: string;
  item_type?: string;
  number_of_countries: number;
  daily_premium: number;
  premium: number;
  tax: number;
  supervision_fees: number;
  issue_fees: number;
  stamp: number;
  total: number;
};

export default function ViewInternationalInsurance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<InternationalInsuranceDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDocument();
    }
  }, [id]);


  const fetchDocument = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/international-insurance-documents/${id}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        if (res.status === 404) {
          showToast('الوثيقة غير موجودة', 'error');
          setTimeout(() => navigate('/international-insurance-documents'), 2000);
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setDocument(data);
    } catch (error: any) {
      showToast(`حدث خطأ أثناء جلب البيانات: ${error.message || ''}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const iframe = window.document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.src = `${API_BASE_URL}/international-insurance-documents/${id}/print`;
    window.document.body.appendChild(iframe);
    
    iframe.onload = () => {
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        setTimeout(() => {
          if (window.document.body.contains(iframe)) {
            window.document.body.removeChild(iframe);
          }
        }, 300);
      }, 100);
    };
  };

  if (loading) {
    return (
      <section className="users-management">
        <div className="users-breadcrumb">
          <span>تأمين السيارات الدولي / عرض وثيقة</span>
        </div>
        <div className="users-card">
          <p style={{ textAlign: 'center', padding: '20px' }}>جار التحميل...</p>
        </div>
      </section>
    );
  }

  if (!document) {
    return (
      <section className="users-management">
        <div className="users-breadcrumb">
          <span>تأمين السيارات الدولي / عرض وثيقة</span>
        </div>
        <div className="users-card">
          <p style={{ textAlign: 'center', padding: '20px' }}>الوثيقة غير موجودة</p>
        </div>
      </section>
    );
  }

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>تأمين السيارات الدولي / عرض وثيقة</span>
      </div>

      <div className="users-card">
        <div className="engineer-financial-details-container">
          <div className="engineer-financial-details-header">
            <h2 className="engineer-financial-details-title">عرض وثيقة تأمين دولي</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="back-button"
                onClick={() => navigate('/international-insurance-documents')}
              >
                <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i>
                العودة للقائمة
              </button>
              <button
                className="back-button print-button"
                onClick={handlePrint}
              >
                <i className="fa-solid fa-print"></i>
                <span className="back-button-text">طباعة الوثيقة</span>
              </button>
              <button
                className="btn-submit"
                onClick={() => navigate(`/international-insurance-documents/${id}/edit`)}
              >
                <i className="fa-solid fa-pencil" style={{ marginLeft: '6px' }}></i>
                تعديل
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '24px' }}>
            {/* معلومات الوثيقة */}
            <div className="form-section">
              <h3 className="form-section-title">معلومات الوثيقة</h3>
              <div className="form-group">
                <label>رقم الوثيقة</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.document_number}
                </div>
              </div>
              <div className="form-group">
                <label>تاريخ الإصدار</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {new Date(document.issue_date).toLocaleString('ar-LY', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>

            {/* معلومات المركبة */}
            <div className="form-section">
              <h3 className="form-section-title">معلومات المركبة</h3>
              <div className="form-group">
                <label>نوع السيارة</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.vehicleType?.brand
                    ? `${document.vehicleType.brand}${document.vehicleType.category ? ' / ' + document.vehicleType.category : ''}`
                    : '-'
                  }
                </div>
              </div>
              <div className="form-group">
                <label>السنة</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.year || '-'}
                </div>
              </div>
              <div className="form-group">
                <label>جنسية المركبة</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.vehicle_nationality || '-'}
                </div>
              </div>
              <div className="form-group">
                <label>رقم الهيكل</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.chassis_number || '-'}
                </div>
              </div>
              <div className="form-group">
                <label>رقم اللوحة المعدنية</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.plate_number || '-'}
                </div>
              </div>
            </div>

            {/* معلومات المؤمن له */}
            <div className="form-section">
              <h3 className="form-section-title">معلومات المؤمن له</h3>
              <div className="form-group">
                <label>اسم المؤمن</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.insured_name}
                </div>
              </div>
              <div className="form-group">
                <label>العنوان</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.insured_address || '-'}
                </div>
              </div>
              <div className="form-group">
                <label>رقم الهاتف</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.phone || '-'}
                </div>
              </div>
            </div>

            {/* البيانات المالية */}
            <div className="form-section">
              <h3 className="form-section-title">البيانات المالية</h3>
              <div className="form-group">
                <label>القسط</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.premium === 'number' ? document.premium : parseFloat(String(document.premium)) || 0).toFixed(3)} د.ل
                </div>
              </div>
              <div className="form-group">
                <label>الضريبة</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.tax === 'number' ? document.tax : parseFloat(String(document.tax)) || 0).toFixed(3)} د.ل
                </div>
              </div>
              <div className="form-group">
                <label>الإشراف</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.supervision_fees === 'number' ? document.supervision_fees : parseFloat(String(document.supervision_fees)) || 0).toFixed(3)} د.ل
                </div>
              </div>
              <div className="form-group">
                <label>الإصدار</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.issue_fees === 'number' ? document.issue_fees : parseFloat(String(document.issue_fees)) || 0).toFixed(3)} د.ل
                </div>
              </div>
              <div className="form-group">
                <label>دمغة المحررات</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.stamp === 'number' ? document.stamp : parseFloat(String(document.stamp)) || 0).toFixed(3)} د.ل
                </div>
              </div>
              <div className="form-group">
                <label>الإجمالي</label>
                <div style={{ padding: '10px 12px', background: '#f0f9ff', borderRadius: 8, border: '2px solid #3b82f6', fontWeight: 'bold', color: '#1e40af' }}>
                  {(typeof document.total === 'number' ? document.total : parseFloat(String(document.total)) || 0).toFixed(3)} د.ل
                </div>
              </div>
            </div>
          </div>

          {/* مدة التأمين */}
          <div className="form-section" style={{ marginTop: '20px' }}>
            <h3 className="form-section-title">مدة التأمين</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>من يوم</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {new Date(document.start_date).toLocaleDateString('ar-LY')}
                </div>
              </div>
              <div className="form-group">
                <label>عدد الأيام</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.number_of_days} يوم
                </div>
              </div>
              <div className="form-group">
                <label>إلي يوم</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {new Date(document.end_date).toLocaleDateString('ar-LY')}
                </div>
              </div>
            </div>
          </div>

          {/* احتساب القسط */}
          <div className="form-section" style={{ marginTop: '20px' }}>
            <h3 className="form-section-title">احتساب القسط</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label>البند</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.item_type || '-'}
                </div>
              </div>
              <div className="form-group">
                <label>عدد الدول</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.number_of_countries}
                </div>
              </div>
              <div className="form-group">
                <label>القسط اليومي</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.daily_premium === 'number' ? document.daily_premium : parseFloat(String(document.daily_premium)) || 0).toFixed(3)} د.ل
                </div>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>البلد المزار</label>
              <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                {document.visited_country || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

