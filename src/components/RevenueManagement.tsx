import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

interface RevenueSource {
  name: string;
  value: number;
  total?: number;
  count?: number;
  color: string;
}

interface TopAgent {
  name: string;
  sales: number;
}

interface RevenueStats {
  total_revenue: number;
  total_paid: number;
  total_outstanding: number;
  sources: RevenueSource[];
  top_agents: TopAgent[];
}

export default function RevenueManagement() {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/financial-statistics`);
      if (response.ok) {
        const data = await response.json();

        // Transform generic statistics into Revenue-focused stats
        const totalRevenue = data.stats.find((s: any) => s.label === 'إجمالي الإيرادات')?.value || 0;
        const totalPaid = data.stats.find((s: any) => s.label === 'صافي الربح')?.value || 0; // Temporary mapping

        setStats({
          total_revenue: totalRevenue,
          total_paid: totalPaid,
          total_outstanding: totalRevenue - totalPaid,
          sources: data.categoryData || [],
          top_agents: data.topAgents || []
        });
      }
    } catch (error) {
      console.error('Error fetching revenue:', error);
      showToast('خطأ في جلب بيانات الإيرادات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!stats) return;
    const excelHeader = `
      <div dir="rtl" style="text-align: right; font-family: 'Segoe UI', Arial, sans-serif;">
        <h1 style="color: #014cb1;">شركة المدار الليبي للتأمين - تقرير الإيرادات</h1>
        <p>التاريخ: ${new Date().toLocaleDateString('ar-LY')}</p>
        <hr>
      </div>
    `;
    const table = `
      <table border="1" dir="rtl" style="border-collapse: collapse; width: 100%; text-align: right;">
        <tr style="background: #014cb1; color: #fff;">
          <th style="padding: 10px;">البيان</th>
          <th style="padding: 10px;">القيمة (د.ل)</th>
        </tr>
        <tr><td>إجمالي الإيرادات</td><td>${stats.total_revenue.toLocaleString()}</td></tr>
        <tr><td>إجمالي المقبوضات</td><td>${stats.total_paid.toLocaleString()}</td></tr>
        <tr><td>الأرصدة المعلقة</td><td>${stats.total_outstanding.toLocaleString()}</td></tr>
      </table>
    `;
    const fullHtml = `<html><head><meta charset="utf-8"></head><body>${excelHeader}${table}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_الإيرادات_${new Date().getTime()}.xls`;
    a.click();
    showToast('تم التصدير بنجاح', 'success');
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>جاري تحميل قسم الإيرادات...</div>;

  return (
    <section className="revenue-management" style={{ padding: '20px' }}>
      <div className="breadcrumb" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        background: 'linear-gradient(135deg, #014cb1 0%, #003380 100%)',
        borderRadius: '16px',
        marginBottom: '30px',
        color: '#fff',
        boxShadow: '0 10px 20px rgba(1, 76, 177, 0.2)'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>قسم الإيرادات المالية</h2>
          <p style={{ margin: '5px 0 0', opacity: 0.8, fontSize: '14px' }}>متابعة تدفقات الأموال والتحصيلات من كافة الفروع</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={exportToExcel} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-file-excel"></i> تصدير Excel
          </button>
          <button onClick={fetchRevenueData} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer' }}>
            <i className="fa-solid fa-rotate"></i> تحديث
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', marginBottom: '30px' }}>
        <div className="stat-card" style={{ background: '#fff', padding: '25px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div style={{ background: '#dcfce7', color: '#166534', width: '50px', height: '50px', borderRadius: '15px', display: 'grid', placeItems: 'center', fontSize: '20px' }}>
              <i className="fa-solid fa-coins"></i>
            </div>
            <div style={{ color: '#166534', fontSize: '12px', fontWeight: 'bold', background: '#dcfce7', padding: '4px 10px', borderRadius: '20px', height: 'fit-content' }}>+12.5% الشهر الحالي</div>
          </div>
          <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '5px' }}>إجمالي الإيرادات (المحقق)</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e293b' }}>{stats?.total_revenue.toLocaleString()} د.ل</div>
        </div>

        <div className="stat-card" style={{ background: '#fff', padding: '25px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div style={{ background: '#e0f2fe', color: '#0369a1', width: '50px', height: '50px', borderRadius: '15px', display: 'grid', placeItems: 'center', fontSize: '20px' }}>
              <i className="fa-solid fa-hand-holding-dollar"></i>
            </div>
          </div>
          <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '5px' }}>إجمالي المقبوضات الفعلية</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#014cb1' }}>{stats?.total_paid.toLocaleString()} د.ل</div>
        </div>

        <div className="stat-card" style={{ background: '#fff', padding: '25px', borderRadius: '20px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div style={{ background: '#fef2f2', color: '#991b1b', width: '50px', height: '50px', borderRadius: '15px', display: 'grid', placeItems: 'center', fontSize: '20px' }}>
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
          </div>
          <div style={{ color: '#64748b', fontSize: '14px', marginBottom: '5px' }}>بقايا أرصدة (قيد التحصيل)</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#ef4444' }}>{stats?.total_outstanding.toLocaleString()} د.ل</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        <div style={{ background: '#fff', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '4px', height: '20px', background: '#014cb1', borderRadius: '4px' }}></span>
              توزيع الإيرادات حسب نوع التأمين
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {stats?.sources.map((source, idx) => (
              <div key={idx} style={{
                padding: '20px',
                borderRadius: '16px',
                background: '#f8fafc',
                border: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: source.color + '20', color: source.color,
                  display: 'grid', placeItems: 'center', fontSize: '18px'
                }}>
                  <i className="fa-solid fa-shield-halved"></i>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{source.name}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{source.value.toLocaleString()} وثيقة</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '900', color: source.color }}>100%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '24px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 25px', fontSize: '18px' }}>أفضل الوكلاء تحصيلاً</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {stats?.top_agents.map((agent, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#F1F5F9', border: '2px solid #fff', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'grid', placeItems: 'center', fontWeight: 'bold', color: '#64748b' }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{agent.name}</div>
                  <div style={{ height: '6px', background: '#F1F5F9', borderRadius: '10px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${(agent.sales / stats.total_revenue) * 100}%`, height: '100%', background: '#014cb1', borderRadius: '10px' }}></div>
                  </div>
                </div>
                <div style={{ fontWeight: 'bold', color: '#014cb1', fontSize: '14px' }}>
                  {agent.sales.toLocaleString()} د.ل
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
