import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
type PersonalAccidentInsuranceDocument = {
  id: number;
  insurance_number: string;
  issue_date: string;
  start_date: string;
  end_date: string;
  duration: string;
  name: string;
  birth_date?: string;
  age?: number;
  phone?: string;
  id_proof?: string;
  address?: string;
  workplace?: string;
  gender?: string;
  nationality?: string;
  profession?: string;
  claim_authorized_name?: string;
  premium: number;
  tax: number;
  stamp: number;
  issue_fees: number;
  supervision_fees: number;
  total: number;
};

export default function ViewPersonalAccidentInsurance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<PersonalAccidentInsuranceDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDocument();
    }
  }, [id]);


  const fetchDocument = async () => {
    try {
      const res = await fetch(`/api/personal-accident-insurance-documents/${id}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        if (res.status === 404) {
          showToast('الوثيقة غير موجودة', 'error');
          setTimeout(() => navigate('/personal-accident-insurance-documents'), 2000);
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
    iframe.src = `/api/personal-accident-insurance-documents/${id}/print`;
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ar-LY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>تأمين الحوادث الشخصية / عرض الوثيقة</span>
      </div>
      
      <div className="users-card">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>جار التحميل...</p>
        ) : !document ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>الوثيقة غير موجودة</p>
            <button onClick={() => navigate('/personal-accident-insurance-documents')} className="btn btn-primary" style={{ marginTop: '10px' }}>
              العودة إلى القائمة
            </button>
          </div>
        ) : (
          <div className="engineer-financial-details-container">
          <div className="engineer-financial-details-header">
            <h2 className="engineer-financial-details-title">
              تفاصيل: {document.insurance_number}
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="back-button" 
                onClick={() => navigate('/personal-accident-insurance-documents')}
              >
                <i className="fa-solid fa-arrow-right"></i>
                <span className="back-button-text">العودة للقائمة</span>
              </button>
              <button 
                className="back-button print-button" 
                onClick={handlePrint}
              >
                <i className="fa-solid fa-print"></i>
                <span className="back-button-text">طباعة الوثيقة</span>
              </button>
              <button
                onClick={() => navigate(`/personal-accident-insurance-documents/${id}/edit`)}
                className="btn-submit"
              >
                <i className="fa-solid fa-pencil" style={{ marginLeft: '6px' }}></i>
                تعديل
              </button>
            </div>
          </div>

          <div className="engineer-info-card-wrapper">
            <div className="engineer-info-card">
              <div className="engineer-info-content">
                <div className="engineer-info-label">تأمين الحوادث الشخصية</div>
                <div className="engineer-info-value">
                  {document.insurance_number}
                </div>
                {document.name && (
                  <div className="engineer-info-detail">
                    <i className="fa-solid fa-user"></i>
                    {document.name}
                  </div>
                )}
                {document.phone && (
                  <div className="engineer-info-detail">
                    <i className="fa-solid fa-phone"></i>
                    {document.phone}
                  </div>
                )}
                <div className="engineer-info-detail">
                  <i className="fa-solid fa-hashtag"></i>
                  رقم الوثيقة: {document.insurance_number}
                </div>
                <div className="engineer-info-detail">
                  <i className="fa-solid fa-calendar"></i>
                  تاريخ الإصدار: {formatDateTime(document.issue_date)}
                </div>
              </div>
            </div>
          </div>

          <div className="engineer-stats-grid">
            <div className="engineer-stat-card">
              <i className="fa-solid fa-calendar-check engineer-stat-icon"></i>
              <div className="engineer-stat-label">تاريخ البداية</div>
              <div className="engineer-stat-value">
                {formatDate(document.start_date)}
              </div>
            </div>

            <div className="engineer-stat-card">
              <i className="fa-solid fa-calendar-times engineer-stat-icon"></i>
              <div className="engineer-stat-label">تاريخ النهاية</div>
              <div className="engineer-stat-value">
                {formatDate(document.end_date)}
              </div>
            </div>

            <div className="engineer-stat-card">
              <i className="fa-solid fa-clock engineer-stat-icon"></i>
              <div className="engineer-stat-label">مدة التأمين</div>
              <div className="engineer-stat-value">
                {document.duration || '-'}
              </div>
            </div>

            <div className="engineer-stat-card">
              <i className="fa-solid fa-money-bill-wave engineer-stat-icon"></i>
              <div className="engineer-stat-label">الإجمالي</div>
              <div className="engineer-stat-value">
                {Number(document.total).toFixed(3)} د.ل
              </div>
            </div>
          </div>

          {/* معلومات الوثيقة ومعلومات المسافر */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            {/* معلومات الوثيقة */}
            <div>
              <h3 className="engineer-maps-section-title">معلومات الوثيقة</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '200px' }}>رقم الوثيقة</td>
                      <td>{document.insurance_number}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>تاريخ الإصدار</td>
                      <td>{formatDateTime(document.issue_date)}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>تاريخ البداية</td>
                      <td>{formatDate(document.start_date)}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>تاريخ النهاية</td>
                      <td>{formatDate(document.end_date)}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>مدة التأمين</td>
                      <td>{document.duration || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* معلومات المسافر */}
            <div>
              <h3 className="engineer-maps-section-title">معلومات المسافر</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '200px' }}>الاسم</td>
                      <td>{document.name || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>تاريخ الميلاد</td>
                      <td>{formatDate(document.birth_date) || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>العمر</td>
                      <td>{document.age || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>رقم الهاتف</td>
                      <td>{document.phone || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>إثبات شخصي</td>
                      <td>{document.id_proof || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>العنوان</td>
                      <td>{document.address || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>مكان العمل</td>
                      <td>{document.workplace || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>الجنس</td>
                      <td>{document.gender || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>الجنسية</td>
                      <td>{document.nationality || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>المهنة</td>
                      <td>{document.profession || '-'}</td>
                    </tr>
                    {document.claim_authorized_name && (
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>اسم الموكل للمطالبات</td>
                        <td>{document.claim_authorized_name}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* البيانات المالية */}
          <div style={{ marginTop: '20px' }}>
            <h3 className="engineer-maps-section-title">البيانات المالية</h3>
            <div className="users-table-wrapper">
              <table className="users-table">
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold', width: '200px' }}>قيمة القسط المقرر</td>
                    <td>{Number(document.premium).toFixed(3)} د.ل</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>الضريبة</td>
                    <td>{Number(document.tax).toFixed(3)} د.ل</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>الدمغة</td>
                    <td>{Number(document.stamp).toFixed(3)} د.ل</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>مصاريف الإصدار</td>
                    <td>{Number(document.issue_fees).toFixed(3)} د.ل</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold' }}>رسوم الإشراف</td>
                    <td>{Number(document.supervision_fees).toFixed(3)} د.ل</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f0f9ff' }}>
                    <td style={{ fontWeight: 'bold' }}>الإجمالي</td>
                    <td style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e40af' }}>{Number(document.total).toFixed(3)} د.ل</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}
      </div>
    </section>
  );
}

