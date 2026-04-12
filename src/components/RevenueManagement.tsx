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
    const logoUrl = window.location.origin + '/img/logo.png';
    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; }
          .co-name { font-size: 20pt; font-weight: 900; color: #014cb1; text-align: right; }
          .co-sub { font-size: 12pt; color: #64748b; text-align: right; }
          .report-subtitle { font-size: 14pt; font-weight: bold; background-color: #f0f7ff; color: #014cb1; text-align: center; border: 1px solid #dbeafe; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #014cb1; color: #ffffff; font-weight: bold; border: 1px solid #003173; padding: 12px; text-align: center; }
          td { border: 1px solid #e2e8f0; padding: 10px; text-align: center; vertical-align: middle; }
          .total-box { background-color: #f8fafc; font-weight: bold; border: 1px solid #e2e8f0; }
          .meta-info { color: #94a3b8; font-size: 9pt; text-align: right; }
        </style>
      </head>
      <body dir="rtl">
        <table>
          <tr>
            <td colspan="4" style="border:none; text-align:right; vertical-align: top;">
              <div class="co-name">شركة المدار الليبي للتأمين</div>
              <div class="co-sub">Al Madar Libyan Insurance</div>
              <div class="co-sub">قسم الشؤون المالية والمحاسبية</div>
            </td>
            <td colspan="2" style="border:none; text-align:left; vertical-align: top;">
              <img src="${logoUrl}" width="100" height="80">
            </td>
          </tr>
          <tr><td colspan="6" style="border:none; height:20px;"></td></tr>
          <tr><td colspan="6" class="report-subtitle">تقرير الإيرادات والمقبوضات المالية - تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}</td></tr>
          <tr><td colspan="6" style="border:none; height:20px;"></td></tr>
          
          <tr style="height: 50px;">
            <td colspan="2" class="total-box">إجمالي المقبوضات: ${stats.total_paid.toLocaleString()} د.ل</td>
            <td colspan="2" class="total-box">إجمالي الإيرادات: ${stats.total_revenue.toLocaleString()} د.ل</td>
            <td colspan="2" class="total-box" style="color: #ef4444;">الأرصدة المعلقة: ${stats.total_outstanding.toLocaleString()} د.ل</td>
          </tr>
          <tr><td colspan="6" style="border:none; height:20px;"></td></tr>
          
          <thead>
            <tr>
              <th colspan="3">نوع التأمين</th>
              <th colspan="2">عدد الوثائق الصادرة</th>
              <th colspan="1">نسبة المساهمة</th>
            </tr>
          </thead>
          <tbody>
            ${stats.sources.map(s => `
              <tr>
                <td colspan="3" style="text-align:right; font-weight:bold;">${s.name}</td>
                <td colspan="2">${s.value.toLocaleString()} وثيقة</td>
                <td colspan="1">100%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <br>
        <p class="meta-info">تاريخ الطباعة: ${new Date().toLocaleString('ar-LY')} | تم استخراج هذا التقرير آلياً</p>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_إيرادات_المدار_${new Date().getTime()}.xls`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير التقرير الاحترافي بنجاح', 'success');
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>جاري تحميل قسم الإيرادات...</div>;

  return (
    <section className="revenue-management" style={{ padding: '20px' }}>
      {/* Professional Print-only Header (Employee Salaries Style) */}
      <div className="print-only-header" style={{ display: 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingBottom: '20px', borderBottom: '3px double #e2e8f0' }}>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b', fontWeight: '900' }}>المدار الليبي للتأمين</h1>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '14px' }}>Al Madar Libyan Insurance</p>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '14px' }}>قسم الشؤون المالية والموارد البشرية</p>
          </div>
          <img src="/img/logo.png" alt="Logo" style={{ height: '80px', width: 'auto' }} />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <h2 style={{ 
            display: 'inline-block',
            margin: 0, 
            padding: '10px 40px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '50px',
            fontSize: '18px',
            color: '#1e293b'
          }}>
            تقرير الإيرادات والمقبوضات المالية
          </h2>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: auto; margin: 10mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print, .sidebar, .topbar, button { display: none !important; }
          .print-only-header { display: block !important; }
          .print-only-footer { display: flex !important; }
          .print-date { display: block !important; }
          
          body, html { 
            background: #fff !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            width: 100% !important; 
            direction: rtl !important; 
            font-family: 'Cairo', sans-serif !important;
            color: #1e293b !important;
          }
          
          .app-shell { display: block !important; position: static !important; }
          .main-area { padding: 0 !important; margin: 0 !important; width: 100% !important; position: static !important; display: block !important; }
          
          .stat-card { 
            border: 1px solid #e2e8f0 !important; 
            box-shadow: none !important; 
            break-inside: avoid; 
            margin-bottom: 20px !important; 
            background: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            width: 23% !important;
            display: inline-block !important;
            vertical-align: top;
            margin-right: 1% !important;
            padding: 15px !important;
            border-radius: 12px !important;
          }
          h2, h3 { color: #1e293b !important; margin-top: 30px !important; border-right: 4px solid #014cb1; padding-right: 10px; font-weight: 900 !important; }
          
          /* Force layout for print */
          div[style*="display: grid"] { display: block !important; }
          div[style*="grid-template-columns"] { display: block !important; }
        }
      `}</style>
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

      {/* Professional Print-only Footer (Employee Salaries Style) */}
      <div className="print-only-footer" style={{ display: 'none', marginTop: '60px', justifyContent: 'space-between', textAlign: 'center' }}>
        <div style={{ paddingTop: '50px', borderTop: '1px solid #94a3b8', width: '25%' }}>
          <p style={{ margin: 0, fontWeight: '600', color: '#475569' }}>المحاسب المسؤول</p>
        </div>
        <div style={{ paddingTop: '50px', borderTop: '1px solid #94a3b8', width: '25%' }}>
          <p style={{ margin: 0, fontWeight: '600', color: '#475569' }}>المدير المالي</p>
        </div>
        <div style={{ paddingTop: '50px', borderTop: '1px solid #94a3b8', width: '25%' }}>
          <p style={{ margin: 0, fontWeight: '600', color: '#475569' }}>المدير العام</p>
        </div>
      </div>

      <div className="print-date" style={{ display: 'none', marginTop: '30px', fontSize: '11px', color: '#94a3b8', textAlign: 'left' }}>
        تم استخراج هذا التقرير بتاريخ: {new Date().toLocaleString('ar-LY')}
      </div>
    </section>
  );
}
