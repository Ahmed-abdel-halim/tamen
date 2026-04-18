import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "./Toast";

type BranchAgent = {
  id: number;
  type: 'وكيل' | 'فرع من شركة';
  code: string;
  agency_name: string;
  agent_name: string;
  activity?: string;
  agency_number?: string;
  stamp_number?: string;
  contract_date: string;
  contract_end_date?: string;
  contract_duration?: string;
  city: string;
  address?: string;
  phone?: string;
  nationality?: string;
  national_id?: string;
  identity_number?: string;
  consumed_custodies?: Array<{ description: string; quantity: number }>;
  fixed_custodies?: Array<{ description: string; quantity: number }>;
  personal_photo?: string;
  identity_photo?: string;
  contract_photo?: string;
  user?: { id: number; username: string; name: string };
  notes?: string;
  status: 'نشط' | 'غير نشط';
  created_at: string;
  updated_at: string;
};

export default function BranchAgentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [branchAgent, setBranchAgent] = useState<BranchAgent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchBranchAgent(parseInt(id));
    }
  }, [id]);

  const fetchBranchAgent = async (branchAgentId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/branches-agents/${branchAgentId}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) {
        let errorMessage = `HTTP error! status: ${res.status}`;
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await res.json();
            errorMessage = error.message || error.error || errorMessage;
            console.error('API Error:', error);
          }
        } catch (e) {
          console.error('Error parsing response:', e);
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      console.log('BranchAgent data:', data);
      setBranchAgent(data);
    } catch (error: any) {
      console.error('Error fetching branch agent:', error);
      showToast(
        `حدث خطأ أثناء جلب التفاصيل: ${error.message || 'تأكد من أن الخادم يعمل'}`, 
        'error' 
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!id) return;
    // إنشاء iframe مخفي للطباعة
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.src = `/api/branches-agents/${id}/print?t=${new Date().getTime()}`;
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      // انتظار قصير جداً لتحميل المحتوى
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        // إزالة iframe بعد الطباعة
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 300);
      }, 100);
    };
  };

  if (loading) {
    return (
      <section className="users-management">
        <div className="users-breadcrumb">
          <span>إدارة الفروع والوكلاء / تفاصيل</span>
        </div>
        <div className="users-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>جار التحميل...</p>
        </div>
      </section>
    );
  }

  if (!branchAgent) {
    return (
      <section className="users-management">
        <div className="users-breadcrumb">
          <span>إدارة الفروع والوكلاء / تفاصيل</span>
        </div>
        <div className="users-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>لم يتم العثور على السجل</p>
          <button 
            className="btn-cancel" 
            onClick={() => navigate('/branches-agents')}
            style={{ marginTop: '20px' }}
          >
            العودة للقائمة
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>إدارة الفروع والوكلاء / تفاصيل</span>
      </div>
      
      <div className="users-card">
        <div className="page-header-professional" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', padding: '30px', borderRadius: '16px', color: 'white', marginBottom: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '20px', overflow: 'hidden', border: '4px solid rgba(255,255,255,0.2)', background: 'white' }}>
              {branchAgent.personal_photo ? (
                <img src={`/storage/${branchAgent.personal_photo}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', textAlign: 'center', background: '#f1f5f9', color: '#cbd5e1' }}>
                  <i className="fa-solid fa-user-tie" style={{ fontSize: '40px', margin: 'auto' }}></i>
                </div>
              )}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>{branchAgent.agency_name}</h2>
              <div style={{ display: 'flex', gap: '15px', marginTop: '10px', opacity: 0.9 }}>
                <span><i className="fa-solid fa-user-tie" style={{ marginLeft: '8px' }}></i> {branchAgent.agent_name}</span>
                <span><i className="fa-solid fa-hashtag" style={{ marginLeft: '8px' }}></i> {branchAgent.code}</span>
                <span><i className="fa-solid fa-building" style={{ marginLeft: '8px' }}></i> {branchAgent.type}</span>
              </div>
            </div>
            <div style={{ marginRight: 'auto', display: 'flex', gap: '10px' }}>
              <button 
                className="back-button" 
                onClick={() => navigate('/branches-agents')}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '12px', 
                  fontWeight: '700', 
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <i className="fa-solid fa-arrow-right"></i>
                العودة للقائمة
              </button>
              <button 
                className="back-button print-button" 
                onClick={handlePrint}
                style={{ 
                  padding: '10px 20px', 
                  borderRadius: '12px', 
                  fontWeight: '700', 
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <i className="fa-solid fa-print"></i>
                طباعة العقد
              </button>
            </div>
          </div>
        </div>

          <div className="engineer-info-card-wrapper">
            <div className="engineer-info-card">
              <div className="engineer-info-content">
                <div className="engineer-info-label">اسم الوكالة</div>
                <div className="engineer-info-value">
                  {branchAgent.agency_name}
                </div>
                <div className="engineer-info-detail">
                  <i className="fa-solid fa-user"></i>
                  {branchAgent.agent_name}
                </div>
                {branchAgent.activity && (
                  <div className="engineer-info-detail">
                    <i className="fa-solid fa-briefcase"></i>
                    {branchAgent.activity}
                  </div>
                )}
                {branchAgent.phone && (
                  <div className="engineer-info-detail">
                    <i className="fa-solid fa-phone"></i>
                    {branchAgent.phone}
                  </div>
                )}
                <div className="engineer-info-detail">
                  <i className="fa-solid fa-hashtag"></i>
                  الكود: {branchAgent.code}
                </div>
                <div className="engineer-info-detail">
                  <i className="fa-solid fa-map-marker-alt"></i>
                  {branchAgent.city}
                </div>
              </div>
            </div>
          </div>

          <div className="engineer-stats-grid">
            <div className="engineer-stat-card">
              <i className="fa-solid fa-tag engineer-stat-icon" style={{ color: '#014cb1' }}></i>
              <div className="engineer-stat-label">النوع</div>
              <div className="engineer-stat-value">
                <span className={`status-badge ${branchAgent.type === 'وكيل' ? 'active' : 'inactive'}`}>
                  {branchAgent.type}
                </span>
              </div>
            </div>

            <div className="engineer-stat-card">
              <i className="fa-solid fa-circle-check engineer-stat-icon" style={{ color: '#10b981' }}></i>
              <div className="engineer-stat-label">الحالة</div>
              <div className="engineer-stat-value">
                <span className={`status-badge ${branchAgent.status === 'نشط' ? 'active' : 'inactive'}`}>
                  {branchAgent.status}
                </span>
              </div>
            </div>


            <div className="engineer-stat-card">
              <i className="fa-solid fa-boxes-stacked engineer-stat-icon" style={{ color: '#f59e0b' }}></i>
              <div className="engineer-stat-label">العهدة الثابتة</div>
              <div className="engineer-stat-value">
                {branchAgent.fixed_custodies?.length || 0} بنود
              </div>
            </div>

            <div className="engineer-stat-card">
              <i className="fa-solid fa-box-open engineer-stat-icon" style={{ color: '#ef4444' }}></i>
              <div className="engineer-stat-label">العهدة المستهلكة</div>
              <div className="engineer-stat-value">
                {branchAgent.consumed_custodies?.length || 0} بنود
              </div>
            </div>

            <div className="engineer-stat-card">
              <i className="fa-solid fa-calendar engineer-stat-icon"></i>
              <div className="engineer-stat-label">تاريخ التعاقد</div>
              <div className="engineer-stat-value">
                {new Date(branchAgent.contract_date).toLocaleDateString('ar')}
              </div>
            </div>

            {branchAgent.contract_end_date && (
              <div className="engineer-stat-card">
                <i className="fa-solid fa-calendar-times engineer-stat-icon"></i>
                <div className="engineer-stat-label">تاريخ انتهاء العقد</div>
                <div className="engineer-stat-value">
                  {new Date(branchAgent.contract_end_date).toLocaleDateString('ar')}
                </div>
              </div>
            )}
          </div>

          {/* المعلومات الأساسية ومعلومات الاتصال */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '15px', marginTop: '30px' }}>
            {/* المعلومات الأساسية */}
            <div className="details-section-card">
              <h3 className="section-title-with-icon">
                <i className="fa-solid fa-circle-info"></i>
                المعلومات الأساسية
              </h3>
              <div className="info-table-wrapper">
                <table className="info-display-table">
                  <tbody>
                    <tr>
                      <td className="info-label">
                        <i className="fa-solid fa-building" style={{ marginLeft: '10px', color: '#3b82f6' }}></i>
                        اسم الوكالة
                      </td>
                      <td className="info-value">{branchAgent.agency_name}</td>
                    </tr>
                    <tr>
                      <td className="info-label">
                        <i className="fa-solid fa-user-tie" style={{ marginLeft: '10px', color: '#10b981' }}></i>
                        اسم الوكيل
                      </td>
                      <td className="info-value">{branchAgent.agent_name}</td>
                    </tr>
                    {branchAgent.activity && (
                      <tr>
                        <td className="info-label">
                          <i className="fa-solid fa-briefcase" style={{ marginLeft: '10px', color: '#f59e0b' }}></i>
                          نشاط الوكيل
                        </td>
                        <td className="info-value">{branchAgent.activity}</td>
                      </tr>
                    )}
                    {branchAgent.agency_number && (
                      <tr>
                        <td className="info-label">
                          <i className="fa-solid fa-id-card" style={{ marginLeft: '10px', color: '#6366f1' }}></i>
                          رقم الوكالة
                        </td>
                        <td className="info-value">
                          <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontFamily: 'monospace' }}>
                            {branchAgent.agency_number}
                          </span>
                        </td>
                      </tr>
                    )}
                    {branchAgent.stamp_number && (
                      <tr>
                        <td className="info-label">
                          <i className="fa-solid fa-stamp" style={{ marginLeft: '10px', color: '#ec4899' }}></i>
                          رقم الختم
                        </td>
                        <td className="info-value">
                          <span style={{ padding: '4px 10px', background: '#f1f5f9', borderRadius: '6px', fontFamily: 'monospace' }}>
                            {branchAgent.stamp_number}
                          </span>
                        </td>
                      </tr>
                    )}
                    {branchAgent.contract_duration && (
                      <tr>
                        <td className="info-label">
                          <i className="fa-solid fa-clock-rotate-left" style={{ marginLeft: '10px', color: '#8b5cf6' }}></i>
                          مدة العقد
                        </td>
                        <td className="info-value">{branchAgent.contract_duration}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* معلومات الاتصال */}
            <div className="details-section-card">
              <h3 className="section-title-with-icon">
                <i className="fa-solid fa-address-book"></i>
                معلومات الاتصال والهوية
              </h3>
              <div className="info-table-wrapper">
                <table className="info-display-table">
                  <tbody>
                    <tr>
                      <td className="info-label">
                        <i className="fa-solid fa-city" style={{ marginLeft: '10px', color: '#3b82f6' }}></i>
                        المدينة
                      </td>
                      <td className="info-value">
                        <span style={{ fontWeight: 'bold', color: '#1e40af' }}>{branchAgent.city}</span>
                      </td>
                    </tr>
                    {branchAgent.address && (
                      <tr>
                        <td className="info-label">
                          <i className="fa-solid fa-location-dot" style={{ marginLeft: '10px', color: '#ef4444' }}></i>
                          العنوان
                        </td>
                        <td className="info-value">{branchAgent.address}</td>
                      </tr>
                    )}
                    {branchAgent.phone && (
                      <tr>
                        <td className="info-label">
                          <i className="fa-solid fa-phone-volume" style={{ marginLeft: '10px', color: '#10b981' }}></i>
                          رقم الهاتف
                        </td>
                        <td className="info-value" style={{ direction: 'ltr', textAlign: 'right' }}>
                          {branchAgent.phone}
                        </td>
                      </tr>
                    )}
                    {branchAgent.nationality && (
                      <tr>
                        <td className="info-label">
                          <i className="fa-solid fa-flag" style={{ marginLeft: '10px', color: '#f59e0b' }}></i>
                          الجنسية
                        </td>
                        <td className="info-value">{branchAgent.nationality}</td>
                      </tr>
                    )}
                    {branchAgent.national_id && (
                      <tr>
                        <td className="info-label">
                          <i className="fa-solid fa-fingerprint" style={{ marginLeft: '10px', color: '#6366f1' }}></i>
                          الرقم الوطني
                        </td>
                        <td className="info-value">
                          <span style={{ letterSpacing: '2px', fontFamily: 'monospace' }}>{branchAgent.national_id}</span>
                        </td>
                      </tr>
                    )}
                    {branchAgent.identity_number && (
                      <tr>
                        <td className="info-label">
                          <i className="fa-solid fa-id-card-clip" style={{ marginLeft: '10px', color: '#ec4899' }}></i>
                          رقم إثبات الشخصية
                        </td>
                        <td className="info-value">{branchAgent.identity_number}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* العهد */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px', marginTop: '30px' }}>
            {/* عهد الوكيل الثابتة */}
            <div className="details-section-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 className="section-title-with-icon">
                <i className="fa-solid fa-boxes-stacked" style={{ color: '#f59e0b' }}></i>
                عهدة الوكيل الثابتة
              </h3>
              <div className="users-table-wrapper no-scroll-wrapper" style={{ flex: 1 }}>
                <table className="users-table compact-table" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>البيان والوصف</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>الكمية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchAgent.fixed_custodies && branchAgent.fixed_custodies.length > 0 ? (
                      branchAgent.fixed_custodies.map((custody, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{custody.description}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{custody.quantity}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>لا توجد عهد ثابتة مسجلة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* عهد مستهلكة */}
            <div className="details-section-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 className="section-title-with-icon">
                <i className="fa-solid fa-box-open" style={{ color: '#ef4444' }}></i>
                العهدة المستهلكة
              </h3>
              <div className="users-table-wrapper no-scroll-wrapper" style={{ flex: 1 }}>
                <table className="users-table compact-table" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '60px' }}>#</th>
                      <th>البيان والوصف</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>الكمية</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchAgent.consumed_custodies && branchAgent.consumed_custodies.length > 0 ? (
                      branchAgent.consumed_custodies.map((custody, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{custody.description}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{custody.quantity}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: '#9ca3af', padding: '20px' }}>لا توجد عهد مستهلكة مسجلة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* الصور */}
          {(branchAgent.personal_photo || branchAgent.identity_photo || branchAgent.contract_photo) && (
            <div style={{ marginTop: '40px' }}>
              <h3 className="section-title-with-icon">
                <i className="fa-solid fa-images"></i>
                المرفقات والصور
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {branchAgent.personal_photo && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>صورة شخصية</label>
                    <img 
                      src={`/storage/${branchAgent.personal_photo}`} 
                      alt="صورة شخصية"
                      style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '8px' }}
                    />
                  </div>
                )}
                {branchAgent.identity_photo && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>صورة إثبات الهوية</label>
                    <img 
                      src={`/storage/${branchAgent.identity_photo}`} 
                      alt="صورة إثبات الهوية"
                      style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '8px' }}
                    />
                  </div>
                )}
                {branchAgent.contract_photo && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>صورة العقد</label>
                    {branchAgent.contract_photo.endsWith('.pdf') ? (
                      <a 
                        href={`/storage/${branchAgent.contract_photo}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ display: 'block', padding: '20px', textAlign: 'center', border: '1px solid #ddd', borderRadius: '8px' }}
                      >
                        <i className="fa-solid fa-file-pdf" style={{ fontSize: '48px', color: '#ef4444' }}></i>
                        <div style={{ marginTop: '10px' }}>عرض PDF</div>
                      </a>
                    ) : (
                      <img 
                        src={`/storage/${branchAgent.contract_photo}`} 
                        alt="صورة العقد"
                        style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', border: '1px solid #ddd', borderRadius: '8px' }}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* الصلاحيات والأذونات */}
          <div style={{ marginTop: '40px' }}>
            <h3 className="section-title-with-icon">
              <i className="fa-solid fa-shield-halved" style={{ color: '#0ea5e9' }}></i>
              الصلاحيات والأذونات الممنوحة
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              {/* الوثائق المصرح بها */}
              <div className="details-section-card">
                <h4 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 'bold', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-file-contract"></i>
                  أنواع وثائق التأمين
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(branchAgent as any).authorized_documents && (branchAgent as any).authorized_documents.filter((doc: string) => !['كشف حساب الوكيل', 'إغلاق حساب شهري', 'كشف إغلاق الحساب الشهري', 'إيصالات القبض', 'إدارة المصروفات', 'التسويات والعمولات', 'الديون المستحقة', 'الأرشيف المالي', 'المخازن والعهدة', 'الإحصائيات المالية', 'مرتبات الموظفين'].includes(doc)).length > 0 ? (
                    (branchAgent as any).authorized_documents.filter((doc: string) => !['كشف حساب الوكيل', 'إغلاق حساب شهري', 'كشف إغلاق الحساب الشهري', 'إيصالات القبض', 'إدارة المصروفات', 'التسويات والعمولات', 'الديون المستحقة', 'الأرشيف المالي', 'المخازن والعهدة', 'الإحصائيات المالية', 'مرتبات الموظفين'].includes(doc)).map((doc: string, index: number) => (
                      <span key={index} style={{ 
                        padding: '8px 14px', 
                        background: '#f0f9ff', 
                        color: '#0369a1', 
                        borderRadius: '12px', 
                        fontSize: '0.85rem', 
                        fontWeight: '700', 
                        border: '1px solid #bae6fd',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}>
                        <i className="fa-solid fa-check-circle" style={{ fontSize: '0.75rem', opacity: 0.7 }}></i>
                        {doc}
                      </span>
                    ))
                  ) : (
                    <div style={{ color: '#9ca3af', fontSize: '0.9rem', padding: '10px' }}>لا توجد وثائق مصرح بها</div>
                  )}
                </div>
              </div>

              {/* التقارير والعمليات الإضافية */}
              <div className="details-section-card">
                <h4 style={{ marginBottom: '16px', fontSize: '1rem', fontWeight: 'bold', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-chart-line"></i>
                  التقارير والصلاحيات المالية
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(branchAgent as any).authorized_documents && (branchAgent as any).authorized_documents.filter((doc: string) => ['كشف حساب الوكيل', 'إغلاق حساب شهري', 'كشف إغلاق الحساب الشهري', 'إيصالات القبض', 'إدارة المصروفات', 'التسويات والعمولات', 'الديون المستحقة', 'الأرشيف المالي', 'المخازن والعهدة', 'الإحصائيات المالية', 'مرتبات الموظفين'].includes(doc)).length > 0 ? (
                    (branchAgent as any).authorized_documents.filter((doc: string) => ['كشف حساب الوكيل', 'إغلاق حساب شهري', 'كشف إغلاق الحساب الشهري', 'إيصالات القبض', 'إدارة المصروفات', 'التسويات والعمولات', 'الديون المستحقة', 'الأرشيف المالي', 'المخازن والعهدة', 'الإحصائيات المالية', 'مرتبات الموظفين'].includes(doc)).map((doc: string, index: number) => (
                      <span key={index} style={{ 
                        padding: '8px 14px', 
                        background: '#f0fdf4', 
                        color: '#15803d', 
                        borderRadius: '12px', 
                        fontSize: '0.85rem', 
                        fontWeight: '700', 
                        border: '1px solid #bbf7d0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}>
                        <i className="fa-solid fa-star" style={{ fontSize: '0.75rem', opacity: 0.7 }}></i>
                        {doc}
                      </span>
                    ))
                  ) : (
                    <div style={{ color: '#9ca3af', fontSize: '0.9rem', padding: '10px' }}>لا توجد صلاحيات إضافية</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* معلومات المستخدم والملاحظات */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px', marginTop: '40px' }}>
            {/* معلومات المستخدم */}
            {branchAgent.user && (
              <div className="details-section-card">
                <h3 className="section-title-with-icon">
                  <i className="fa-solid fa-user-gear" style={{ color: '#64748b' }}></i>
                  معلومات الحساب
                </h3>
                <div className="info-table-wrapper">
                  <table className="info-display-table">
                    <tbody>
                      <tr>
                        <td className="info-label">اسم المستخدم</td>
                        <td className="info-value">{branchAgent.user.username}</td>
                      </tr>
                      <tr>
                        <td className="info-label">الاسم الكامل</td>
                        <td className="info-value">{branchAgent.user.name}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* الملاحظات */}
            {branchAgent.notes && (
              <div className="details-section-card">
                <h3 className="section-title-with-icon">
                  <i className="fa-solid fa-comment-dots" style={{ color: '#6366f1' }}></i>
                  ملاحظات إضافية
                </h3>
                <div style={{ 
                  padding: '15px', 
                  background: '#f8fafc', 
                  borderRadius: '10px', 
                  border: '1px dashed #cbd5e1',
                  minHeight: '100px',
                  color: '#475569',
                  lineHeight: '1.7',
                  whiteSpace: 'pre-wrap'
                }}>
                  {branchAgent.notes}
                </div>
              </div>
            )}
          </div>

          {/* أزرار الإجراءات */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-start',
            gap: '15px', 
            marginTop: '50px', 
            padding: '24px', 
            background: 'white', 
            borderRadius: '16px', 
            border: '1px solid var(--border)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)'
          }}>
            <button
              onClick={() => navigate(`/branches-agents/${branchAgent.id}/edit`)}
              className="btn-submit"
              style={{ 
                padding: '12px 36px', 
                borderRadius: '10px', 
                fontWeight: '700', 
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--sidebar)',
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <i className="fa-solid fa-pencil"></i>
              تعديل البيانات
            </button>
          </div>
      </div>
    </section>
  );
}
