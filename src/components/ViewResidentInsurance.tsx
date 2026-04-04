import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

type ResidentInsurancePassenger = {
  id: number;
  is_main_passenger: boolean;
  relationship?: string;
  name_ar: string;
  name_en: string;
  phone?: string;
  passport_number?: string;
  address?: string;
  birth_date?: string;
  age?: number;
  gender?: string;
  nationality?: string;
};

type ResidentInsuranceDocument = {
  id: number;
  insurance_number: string;
  insurance_type: string;
  issue_date: string;
  start_date: string;
  end_date: string;
  duration?: string;
  geographic_area?: string;
  premium: number;
  family_members_premium: number;
  stamp: number;
  issue_fees: number;
  supervision_fees: number;
  total: number;
  passengers?: ResidentInsurancePassenger[];
};

export default function ViewResidentInsurance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<ResidentInsuranceDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchDocument = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/resident-insurance-documents/${id}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        if (res.status === 404) {
          setToast({ message: 'الوثيقة غير موجودة', type: 'error' });
          setTimeout(() => navigate('/resident-insurance-documents'), 2000);
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setDocument(data);
    } catch (error: any) {
      setToast({
        message: `حدث خطأ أثناء جلب البيانات: ${error.message || ''}`,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (id) {
      fetchDocument();
    }
  }, [id, fetchDocument]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handlePrint = () => {
    const iframe = window.document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.src = `/api/resident-insurance-documents/${id}/print`;
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
          <span>وثائق تأمين الوافدين للمقيمين / عرض وثيقة</span>
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
          <span>وثائق تأمين الوافدين للمقيمين / عرض وثيقة</span>
        </div>
        <div className="users-card">
          <p style={{ textAlign: 'center', padding: '20px' }}>الوثيقة غير موجودة</p>
        </div>
      </section>
    );
  }

  const mainPassenger = document.passengers?.find(p => p.is_main_passenger);
  const familyMembers = document.passengers?.filter(p => !p.is_main_passenger) || [];

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>وثائق تأمين الوافدين للمقيمين / عرض وثيقة</span>
      </div>

      <div className="users-card">
        <div className="engineer-financial-details-container">
          <div className="engineer-financial-details-header">
            <h2 className="engineer-financial-details-title">عرض وثيقة تأمين مسافرين</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="back-button"
                onClick={() => navigate('/resident-insurance-documents')}
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
                onClick={() => navigate(`/resident-insurance-documents/${id}/edit`)}
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
                <label>رقم التأمين</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.insurance_number}
                </div>
              </div>
              <div className="form-group">
                <label>نوع التأمين</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.insurance_type}
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
              {document.geographic_area && (
                <div className="form-group">
                  <label>المنطقة الجغرافية</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.geographic_area}
                  </div>
                </div>
              )}
            </div>

            {/* بيانات المسافر */}
            <div className="form-section">
              <h3 className="form-section-title">بيانات المسافر</h3>
              {mainPassenger && (
                <>
                  <div className="form-group">
                    <label>الاسم بالعربي</label>
                    <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                      {mainPassenger.name_ar}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>الاسم بالإنجليزي</label>
                    <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                      {mainPassenger.name_en}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>رقم الهاتف</label>
                    <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                      {mainPassenger.phone || '-'}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>رقم الجواز</label>
                    <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                      {mainPassenger.passport_number || '-'}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>العنوان</label>
                    <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                      {mainPassenger.address || '-'}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>تاريخ الميلاد</label>
                    <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                      {mainPassenger.birth_date ? new Date(mainPassenger.birth_date).toLocaleDateString('ar-LY') : '-'}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>العمر</label>
                    <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                      {mainPassenger.age || '-'}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>الجنس</label>
                    <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                      {mainPassenger.gender || '-'}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>الجنسية</label>
                    <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                      {mainPassenger.nationality || '-'}
                    </div>
                  </div>
                </>
              )}
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
              {document.family_members_premium > 0 && (
                <div className="form-group">
                  <label>قسط أفراد العائلة</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {(typeof document.family_members_premium === 'number' ? document.family_members_premium : parseFloat(String(document.family_members_premium)) || 0).toFixed(3)} د.ل
                  </div>
                </div>
              )}
              <div className="form-group">
                <label>الدمغة</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.stamp === 'number' ? document.stamp : parseFloat(String(document.stamp)) || 0).toFixed(3)} د.ل
                </div>
              </div>
              <div className="form-group">
                <label>مصاريف الإصدار</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.issue_fees === 'number' ? document.issue_fees : parseFloat(String(document.issue_fees)) || 0).toFixed(3)} د.ل
                </div>
              </div>
              <div className="form-group">
                <label>رسوم الإشراف</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.supervision_fees === 'number' ? document.supervision_fees : parseFloat(String(document.supervision_fees)) || 0).toFixed(3)} د.ل
                </div>
              </div>
              <div className="form-group">
                <label>الإجمالي</label>
                <div style={{ padding: '10px 12px', background: '#f0f9ff', borderRadius: 8, border: '2px solid #3b82f6', fontWeight: 'bold', color: '#1e40af' }}>
                  {(typeof document.total === 'number' ? document.total : parseFloat(String(document.total)) || 0).toFixed(3)} د.ل
                </div>
              </div>
            </div>

            {/* مدة التأمين */}
            <div className="form-section">
              <h3 className="form-section-title">مدة التأمين</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>من يوم</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {new Date(document.start_date).toLocaleDateString('ar-LY')}
                  </div>
                </div>
                <div className="form-group">
                  <label>إلي يوم</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {new Date(document.end_date).toLocaleDateString('ar-LY')}
                  </div>
                </div>
              </div>
              {document.duration && (
                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>مدة التأمين</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.duration}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* أفراد العائلة */}
          {familyMembers.length > 0 && (
            <div className="form-section" style={{ marginTop: '20px' }}>
              <h3 className="form-section-title">أفراد العائلة</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {familyMembers.map((member, index) => (
                  <div key={member.id || index} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>
                      {member.relationship || `فرد العائلة ${index + 1}`}
                    </h4>
                    <div style={{ display: 'grid', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>الاسم بالعربي</label>
                        <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid var(--border)' }}>
                          {member.name_ar}
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>الاسم بالإنجليزي</label>
                        <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid var(--border)' }}>
                          {member.name_en}
                        </div>
                      </div>
                      {member.passport_number && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>رقم الجواز</label>
                          <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid var(--border)' }}>
                            {member.passport_number}
                          </div>
                        </div>
                      )}
                      {member.birth_date && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>تاريخ الميلاد</label>
                          <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid var(--border)' }}>
                            {new Date(member.birth_date).toLocaleDateString('ar-LY')}
                          </div>
                        </div>
                      )}
                      {member.age && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>العمر</label>
                          <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid var(--border)' }}>
                            {member.age}
                          </div>
                        </div>
                      )}
                      {member.gender && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>الجنس</label>
                          <div style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 6, border: '1px solid var(--border)' }}>
                            {member.gender}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          <div className="toast-content">
            <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i>
            <span>{toast.message}</span>
          </div>
          <button
            className="toast-close"
            onClick={() => setToast(null)}
            aria-label="إغلاق"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}
    </section>
  );
}

