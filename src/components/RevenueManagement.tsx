import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';

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
        const totalPaid = data.stats.find((s: any) => s.label === 'إجمالي المقبوضات الفعلية')?.value 
                       ?? data.stats.find((s: any) => s.label === 'صافي الربح')?.value 
                       || 0;

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

  const exportToExcel = async () => {
    if (!stats) return;
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    try {
      const columns = [
        { header: 'نوع التأمين', key: 'name', width: 40 },
        { header: 'عدد الوثائق الصادرة', key: 'value', width: 25 },
        { header: 'نسبة المساهمة', key: 'contribution', width: 15 },
      ];

      const data = stats.sources.map(s => ({
        name: s.name,
        value: s.value.toLocaleString() + ' وثيقة',
        contribution: '100%',
      }));

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير الإيرادات والمقبوضات المالية',
        subtitle: `إجمالي المقبوضات: ${stats.total_paid.toLocaleString()} د.ل | إجمالي الإيرادات: ${stats.total_revenue.toLocaleString()} د.ل | الأرصدة المعلقة: ${stats.total_outstanding.toLocaleString()} د.ل`,
        columns,
        data,
        fileName: 'تقرير_إيرادات_المدار',
        qrData: `تقرير الإيرادات - شركة المدار الليبي\nإجمالي: ${stats.total_revenue.toLocaleString()} د.ل\nالمقبوض: ${stats.total_paid.toLocaleString()} د.ل\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير التقرير الاحترافي بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  const handlePrintAgentsRevenue = async () => {
    try {
      showToast('جاري تجهيز تقرير إيرادات الوكلاء...', 'success');
      const response = await fetch(`${API_BASE_URL}/financial-statistics/all-agents-revenue`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      const printWindow = window.open('', '', 'width=1200,height=900');
      if (!printWindow) {
        showToast('يرجى السماح بالنوافذ المنبثقة للطباعة', 'error');
        return;
      }

      const rows = data.agents.map((agent: any, idx: number) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-weight: bold; text-align: right;">${agent.agency_name}</td>
          <td style="text-align: right;">${agent.agent_name || '-'}</td>
          <td>${agent.document_count}</td>
          <td style="font-weight: bold; color: #014cb1;">${agent.sales.toLocaleString()} د.ل</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <html dir="rtl">
        <head>
          <title>تقرير إيرادات جميع الوكلاء</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
            @media print { 
              @page { margin: 10mm; } 
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            body { font-family: 'Cairo', sans-serif; margin: 20px; padding: 20px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #0ea5e9; padding-bottom: 15px; }
            .header h1 { margin: 0; color: #0ea5e9; font-size: 24px; font-weight: 900; }
            .meta-info { margin-bottom: 20px; font-size: 14px; color: #64748b; font-weight: 600; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-size: 13px; }
            th { background: #f8fafc; font-weight: 900; color: #0ea5e9; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; }
            .total-row { background: #f0f9ff; font-weight: 900; }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 500);">
          <div class="header">
            <div>
              <h1>شركة المدار الليبي للتأمين</h1>
              <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #334155;">تقرير إيرادات جميع الوكلاء</p>
            </div>
            <img src="/img/logo.png" style="height: 70px;">
          </div>
          <div class="meta-info">
            <div>
              <strong>تاريخ التقرير:</strong> ${new Date().toLocaleString('ar-LY')}
            </div>
            <div>
              <strong>إجمالي الإيرادات:</strong> ${data.total_revenue.toLocaleString()} د.ل &nbsp;|&nbsp; <strong>عدد الوكلاء:</strong> ${data.agents.length}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 30%; text-align: right;">اسم الوكالة</th>
                <th style="width: 25%; text-align: right;">اسم الوكيل</th>
                <th style="width: 15%;">عدد الوثائق</th>
                <th style="width: 25%;">إجمالي الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding-right: 20px;">المجموع الكلي</td>
                <td>${data.agents.reduce((acc: any, a: any) => acc + a.document_count, 0)}</td>
                <td>${data.total_revenue.toLocaleString()} د.ل</td>
              </tr>
            </tfoot>
          </table>
          <div class="footer">
            تم استخراج هذا التقرير آلياً من نظام المدار الليبي للتأمين - ${new Date().toLocaleString('ar-LY')}
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Error printing agents revenue:', error);
      showToast('حدث خطأ أثناء إعداد التقرير للطباعة', 'error');
    }
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
      <style>{`
        [data-theme='dark'] .stat-card {
          background-color: var(--card-bg) !important;
          border-color: var(--border) !important;
        }
        [data-theme='dark'] .chart-container {
          background-color: var(--card-bg) !important;
          border-color: var(--border) !important;
        }
        [data-theme='dark'] .source-item {
          background-color: var(--input-bg) !important;
          border-color: var(--border) !important;
        }
        [data-theme='dark'] .agent-item {
          border-bottom-color: var(--border) !important;
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
          <button onClick={handlePrintAgentsRevenue} style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-print"></i> تقرير إيرادات الوكلاء
          </button>
          <button onClick={exportToExcel} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fa-solid fa-file-excel"></i> تصدير Excel
          </button>
          <button onClick={fetchRevenueData} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer' }}>
            <i className="fa-solid fa-rotate"></i> تحديث
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '25px', marginBottom: '30px' }}>
        <div className="stat-card" style={{ background: 'var(--card-bg)', padding: '25px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div style={{ background: '#dcfce7', color: '#166534', width: '50px', height: '50px', borderRadius: '15px', display: 'grid', placeItems: 'center', fontSize: '20px' }}>
              <i className="fa-solid fa-coins"></i>
            </div>
            <div style={{ color: '#166534', fontSize: '12px', fontWeight: 'bold', background: '#dcfce7', padding: '4px 10px', borderRadius: '20px', height: 'fit-content' }}>+12.5% الشهر الحالي</div>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '5px' }}>إجمالي الإيرادات (المحقق)</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text)' }}>{stats?.total_revenue.toLocaleString()} د.ل</div>
        </div>

        <div className="stat-card" style={{ background: 'var(--card-bg)', padding: '25px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div style={{ background: '#e0f2fe', color: '#0369a1', width: '50px', height: '50px', borderRadius: '15px', display: 'grid', placeItems: 'center', fontSize: '20px' }}>
              <i className="fa-solid fa-hand-holding-dollar"></i>
            </div>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '5px' }}>إجمالي المقبوضات الفعلية</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#014cb1' }}>{stats?.total_paid.toLocaleString()} د.ل</div>
        </div>

        <div className="stat-card" style={{ background: 'var(--card-bg)', padding: '25px', borderRadius: '20px', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div style={{ background: '#fef2f2', color: '#991b1b', width: '50px', height: '50px', borderRadius: '15px', display: 'grid', placeItems: 'center', fontSize: '20px' }}>
              <i className="fa-solid fa-clock-rotate-left"></i>
            </div>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '5px' }}>بقايا أرصدة (قيد التحصيل)</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#ef4444' }}>{stats?.total_outstanding.toLocaleString()} د.ل</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        <div className="chart-container" style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '30px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text)' }}>
              <span style={{ width: '4px', height: '20px', background: '#014cb1', borderRadius: '4px' }}></span>
              توزيع الإيرادات حسب نوع التأمين
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {stats?.sources.map((source, idx) => (
              <div key={idx} className="source-item" style={{
                padding: '20px',
                borderRadius: '16px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
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
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{source.name}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--text)' }}>{source.value.toLocaleString()} وثيقة</div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '900', color: source.color }}>100%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="stat-card" style={{ background: 'var(--card-bg)', borderRadius: '24px', padding: '30px', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 25px', fontSize: '18px', color: 'var(--text)' }}>أفضل الوكلاء تحصيلاً</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {stats?.top_agents.map((agent, idx) => (
              <div key={idx} className="agent-item" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'var(--input-bg)', border: '2px solid var(--border)', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', display: 'grid', placeItems: 'center', fontWeight: 'bold', color: 'var(--text)' }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text)' }}>{agent.name}</div>
                  <div style={{ height: '6px', background: 'var(--input-bg)', borderRadius: '10px', marginTop: '6px', overflow: 'hidden' }}>
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
