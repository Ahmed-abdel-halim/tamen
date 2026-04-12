import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "./Toast";

type User = {
  id: number;
  username: string;
  name: string;
  email: string | null;
  is_admin: boolean;
  authorized_documents: string[];
  salary: number | null;
  national_id_number: string | null;
  job_title: string | null;
  profile_photo_url: string | null;
  personal_id_proof_url: string | null;
  employment_contract_url: string | null;
};

export default function UserDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [fixedCustodies, setFixedCustodies] = useState<any[]>([]);
  const [consumedCustodies, setConsumedCustodies] = useState<any[]>([]);

  useEffect(() => {
    fetchUserData();
    fetchCustodyData();
  }, [id]);

  const fetchUserData = async () => {
    try {
      const res = await fetch(`/api/users/${id}`);
      if (!res.ok) throw new Error("فشل جلب بيانات الموظف");
      const data = await res.json();
      setUser(data);
    } catch (error: any) {
      showToast(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchCustodyData = async () => {
    try {
      const res = await fetch(`/api/inventory/custody?recipient_id=${id}&recipient_type=employee`);
      if (res.ok) {
        const allCustody: any[] = await res.json();
        setFixedCustodies(allCustody.filter(c => (c.item?.inventory_type === 'fixed' || c.inventory_type === 'fixed') && c.status === 'active'));
        setConsumedCustodies(allCustody.filter(c => (c.item?.inventory_type === 'consumable' || c.inventory_type === 'consumable') && c.status === 'active'));
      }
    } catch (e) {
      console.error("Failed to fetch user custody", e);
    }
  };

  const resolvePublicUrl = (path: string | null | undefined): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  if (loading) return <div className="loading-container">جاري التحميل...</div>;
  if (!user) return <div className="error-container">تعذر العثور على الموظف</div>;

  return (
    <section className="agent-details-section">
      <div className="container-fluid">
        <div className="page-header-professional" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', padding: '30px', borderRadius: '16px', color: 'white', marginBottom: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '20px', overflow: 'hidden', border: '4px solid rgba(255,255,255,0.2)', background: 'white' }}>
              {user.profile_photo_url ? (
                <img src={resolvePublicUrl(user.profile_photo_url)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifySelf: 'center', background: '#f1f5f9', color: '#cbd5e1' }}>
                  <i className="fa-solid fa-user" style={{ fontSize: '40px', margin: 'auto' }}></i>
                </div>
              )}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>{user.name}</h2>
              <div style={{ display: 'flex', gap: '15px', marginTop: '10px', opacity: 0.9 }}>
                <span><i className="fa-solid fa-id-badge" style={{ marginLeft: '8px' }}></i> {user.username}</span>
                <span><i className="fa-solid fa-user-tag" style={{ marginLeft: '8px' }}></i> {user.is_admin ? 'مدير نظام' : 'موظف'}</span>
                {user.job_title && <span><i className="fa-solid fa-briefcase" style={{ marginLeft: '8px' }}></i> {user.job_title}</span>}
              </div>
            </div>
            <div style={{ marginRight: 'auto' }}>
              <button
                onClick={() => navigate('/users')}
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
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                <i className="fa-solid fa-arrow-right"></i>
                العودة للقائمة
              </button>
            </div>
          </div>
        </div>

        <div className="details-grid">
          {/* المعلومات الأساسية */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '15px', marginTop: '30px' }}>
            <div className="details-section-card">
              <h3 className="section-title-with-icon">
                <i className="fa-solid fa-circle-info" style={{ color: '#3b82f6' }}></i>
                المعلومات الشخصية والوظيفية
              </h3>
              <div className="info-table-wrapper">
                <table className="info-display-table">
                  <tbody>
                    <tr>
                      <td className="info-label"><i className="fa-solid fa-user" style={{ marginLeft: '10px', color: '#10b981' }}></i> الاسم الكامل</td>
                      <td className="info-value">{user.name}</td>
                    </tr>
                    <tr>
                      <td className="info-label"><i className="fa-solid fa-id-card" style={{ marginLeft: '10px', color: '#6366f1' }}></i> الرقم الوطني</td>
                      <td className="info-value"><span style={{ letterSpacing: '2px', fontFamily: 'monospace' }}>{user.national_id_number || '—'}</span></td>
                    </tr>
                    <tr>
                      <td className="info-label"><i className="fa-solid fa-briefcase" style={{ marginLeft: '10px', color: '#f59e0b' }}></i> المسمى الوظيفي</td>
                      <td className="info-value">{user.job_title || '—'}</td>
                    </tr>
                    <tr>
                      <td className="info-label"><i className="fa-solid fa-money-bill-wave" style={{ marginLeft: '10px', color: '#10b981' }}></i> المرتب الأساسي</td>
                      <td className="info-value">{user.salary ? `${Number(user.salary).toLocaleString()} د.ل` : '—'}</td>
                    </tr>
                    <tr>
                      <td className="info-label"><i className="fa-solid fa-envelope" style={{ marginLeft: '10px', color: '#3b82f6' }}></i> البريد الإلكتروني</td>
                      <td className="info-value">{user.email || '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="details-section-card">
              <h3 className="section-title-with-icon">
                <i className="fa-solid fa-shield-halved" style={{ color: '#ef4444' }}></i>
                الصلاحيات والأذونات
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {user.is_admin ? (
                  <div style={{ padding: '15px', background: '#f0fdf4', color: '#166534', borderRadius: '12px', border: '1px solid #bbf7d0', fontWeight: 'bold', width: '100%', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <i className="fa-solid fa-unlock-keyhole"></i>
                    هذا المستخدم مدير نظام (Admin) ولديه صلاحيات كاملة.
                  </div>
                ) : user.authorized_documents && user.authorized_documents.length > 0 ? (
                  user.authorized_documents.map((doc, index) => (
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
                  <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '10px' }}>لا توجد صلاحيات مسجلة</div>
                )}
              </div>
            </div>
          </div>

          {/* العهدة */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '15px', marginTop: '30px' }}>
            <div className="details-section-card" style={{ display: 'flex', flexDirection: 'column' }}>
              <h3 className="section-title-with-icon">
                <i className="fa-solid fa-boxes-stacked" style={{ color: '#f59e0b' }}></i>
                العهدة الثابتة
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
                    {fixedCustodies.length > 0 ? (
                      fixedCustodies.map((item, idx) => (
                        <tr key={item.id}>
                          <td>{idx + 1}</td>
                          <td>{item.item?.name || item.item_name}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                          لا توجد عهد ثابتة مسجلة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

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
                    {consumedCustodies.length > 0 ? (
                      consumedCustodies.map((item, idx) => (
                        <tr key={item.id}>
                          <td>{idx + 1}</td>
                          <td>{item.item?.name || item.item_name}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>
                          لا توجد عهد مستهلكة مسجلة
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* المرفقات */}
          {(user.personal_id_proof_url || user.employment_contract_url) && (
            <div style={{ marginTop: '40px' }}>
              <h3 className="section-title-with-icon">
                <i className="fa-solid fa-file-pdf"></i>
                المسودات والمرفقات الرسمية
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {user.personal_id_proof_url && (
                  <div className="details-section-card" style={{ textAlign: 'center' }}>
                    <label style={{ display: 'block', marginBottom: '15px', fontWeight: 'bold' }}>إثبات الشخصية</label>
                    <a href={resolvePublicUrl(user.personal_id_proof_url)} target="_blank" rel="noreferrer" className="btn-submit" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none' }}>
                      <i className="fa-solid fa-file-arrow-down"></i> عرض الملف
                    </a>
                  </div>
                )}
                {user.employment_contract_url && (
                  <div className="details-section-card" style={{ textAlign: 'center' }}>
                    <label style={{ display: 'block', marginBottom: '15px', fontWeight: 'bold' }}>عقد العمل</label>
                    <a href={resolvePublicUrl(user.employment_contract_url)} target="_blank" rel="noreferrer" className="btn-submit" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none' }}>
                      <i className="fa-solid fa-file-contract"></i> عرض العقد
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
  );
}
