import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
      setToast({ 
        message: `حدث خطأ أثناء جلب التفاصيل: ${error.message || 'تأكد من أن الخادم يعمل'}`, 
        type: 'error' 
      });
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
    iframe.src = `/api/branches-agents/${id}/print`;
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
        <div className="engineer-financial-details-container">
          <div className="engineer-financial-details-header">
            <h2 className="engineer-financial-details-title">
              تفاصيل: {branchAgent.agency_name}
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="back-button" 
                onClick={() => navigate('/branches-agents')}
              >
                <i className="fa-solid fa-arrow-right"></i>
                <span className="back-button-text">العودة للقائمة</span>
              </button>
              <button 
                className="back-button print-button" 
                onClick={handlePrint}
              >
                <i className="fa-solid fa-print"></i>
                <span className="back-button-text">طباعة العقد</span>
              </button>
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
              <i className="fa-solid fa-tag engineer-stat-icon"></i>
              <div className="engineer-stat-label">النوع</div>
              <div className="engineer-stat-value">
                <span className={`status-badge ${branchAgent.type === 'وكيل' ? 'active' : 'inactive'}`}>
                  {branchAgent.type}
                </span>
              </div>
            </div>

            <div className="engineer-stat-card">
              <i className="fa-solid fa-circle-check engineer-stat-icon"></i>
              <div className="engineer-stat-label">الحالة</div>
              <div className="engineer-stat-value">
                <span className={`status-badge ${branchAgent.status === 'نشط' ? 'active' : 'inactive'}`}>
                  {branchAgent.status}
                </span>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginTop: '20px' }}>
            {/* المعلومات الأساسية */}
            <div>
              <h3 className="engineer-maps-section-title">المعلومات الأساسية</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '200px' }}>اسم الوكالة</td>
                      <td>{branchAgent.agency_name}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>اسم الوكيل</td>
                      <td>{branchAgent.agent_name}</td>
                    </tr>
                    {branchAgent.activity && (
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>نشاط الوكيل</td>
                        <td>{branchAgent.activity}</td>
                      </tr>
                    )}
                    {branchAgent.agency_number && (
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>رقم الوكالة</td>
                        <td>{branchAgent.agency_number}</td>
                      </tr>
                    )}
                    {branchAgent.stamp_number && (
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>رقم الختم</td>
                        <td>{branchAgent.stamp_number}</td>
                      </tr>
                    )}
                    {branchAgent.contract_duration && (
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>مدة العقد</td>
                        <td>{branchAgent.contract_duration}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* معلومات الاتصال */}
            <div>
              <h3 className="engineer-maps-section-title">معلومات الاتصال</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '200px' }}>المدينة</td>
                      <td>{branchAgent.city}</td>
                    </tr>
                    {branchAgent.address && (
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>العنوان</td>
                        <td>{branchAgent.address}</td>
                      </tr>
                    )}
                    {branchAgent.phone && (
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>رقم الهاتف</td>
                        <td>{branchAgent.phone}</td>
                      </tr>
                    )}
                    {branchAgent.nationality && (
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>الجنسية</td>
                        <td>{branchAgent.nationality}</td>
                      </tr>
                    )}
                    {branchAgent.national_id && (
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>الرقم الوطني</td>
                        <td>{branchAgent.national_id}</td>
                      </tr>
                    )}
                    {branchAgent.identity_number && (
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>رقم إثبات الشخصية</td>
                        <td>{branchAgent.identity_number}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* عهد مستهلكة */}
          {branchAgent.consumed_custodies && branchAgent.consumed_custodies.length > 0 && (
            <div>
              <h3 className="engineer-maps-section-title">عهد مستهلكة</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>البيان</th>
                      <th>العدد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchAgent.consumed_custodies.map((custody, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{custody.description}</td>
                        <td>{custody.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* عهد الوكيل الثابتة */}
          {branchAgent.fixed_custodies && branchAgent.fixed_custodies.length > 0 && (
            <div>
              <h3 className="engineer-maps-section-title">عهد الوكيل الثابتة</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>البيان</th>
                      <th>العدد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchAgent.fixed_custodies.map((custody, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{custody.description}</td>
                        <td>{custody.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* الصور */}
          {(branchAgent.personal_photo || branchAgent.identity_photo || branchAgent.contract_photo) && (
            <div>
              <h3 className="engineer-maps-section-title">الصور</h3>
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

          {/* معلومات المستخدم */}
          {branchAgent.user && (
            <div>
              <h3 className="engineer-maps-section-title">معلومات المستخدم</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '200px' }}>اسم المستخدم</td>
                      <td>{branchAgent.user.username}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>الاسم</td>
                      <td>{branchAgent.user.name}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* الملاحظات */}
          {branchAgent.notes && (
            <div>
              <h3 className="engineer-maps-section-title">ملاحظات</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <tbody>
                    <tr>
                      <td style={{ color: '#374151', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{branchAgent.notes}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* أزرار الإجراءات */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => navigate(`/branches-agents/${branchAgent.id}/edit`)}
              className="btn-submit"
            >
              <i className="fa-solid fa-pencil" style={{ marginLeft: '6px' }}></i>
              تعديل
            </button>
          </div>
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
