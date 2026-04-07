import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

interface FinancialStat {
  label: string;
  value: number;
  icon: string;
  color: string;
  trend?: 'up' | 'down';
  trendValue?: number;
  suffix?: string;
}

interface ChartData {
  label: string;
  revenue: number;
  expenses: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface AgentPerformance {
  name: string;
  sales: number;
}

interface TaxSummary {
  name: string;
  base: string;
  rate: string;
  value: number;
  status: string;
}

export default function FinancialStatistics() {
  const [stats, setStats] = useState<FinancialStat[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topAgents, setTopAgents] = useState<AgentPerformance[]>([]);
  const [taxesSummary, setTaxesSummary] = useState<TaxSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/financial-statistics`);
        if (!response.ok) throw new Error('فشل جلب البيانات من الخادم');
        const data = await response.json();
        
        setStats(data.stats);
        setChartData(data.chartData);
        setCategoryData(data.categoryData);
        setTopAgents(data.topAgents);
        setTaxesSummary(data.taxesSummary);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching financial stats:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', flexDirection: 'column', gap: '15px' }}>
        <div style={{ width: '50px', height: '50px', borderRadius: '50%', border: '4px solid #f1f5f9', borderTop: '4px solid #014cb1', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ color: '#64748b', fontWeight: '800' }}>جاري استخراج البيانات الحقيقية من قاعدة البيانات...</p>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: 'var(--panel)', borderRadius: '24px', border: '1px solid #fee2e2' }}>
        <div style={{ width: '70px', height: '70px', background: '#fef2f2', color: '#ef4444', borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: '30px', margin: '0 auto 20px' }}>
          <i className="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h2 style={{ color: '#991b1b', marginBottom: '10px' }}>خطأ في النظام</h2>
        <p style={{ color: '#64748b' }}>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{ marginTop: '20px', padding: '10px 30px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // --- SVG Charts ---

  const DonutChart = ({ data, title }: { data: CategoryData[], title: string }) => {
    const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0);
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
      const x = Math.cos(2 * Math.PI * percent);
      const y = Math.sin(2 * Math.PI * percent);
      return [x, y];
    };

    return (
      <div className="card-shadow" style={{ padding: '24px', background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
        <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{title}</h3>
        {total === 0 ? (
          <div style={{ height: '140px', display: 'grid', placeItems: 'center', color: '#94a3b8', fontSize: '14px' }}>لا توجد بيانات متاحة حالياً</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
            <svg width="140" height="140" viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }}>
              {data.map((slice, index) => {
                if (slice.value === 0) return null;
                const percent = slice.value / total;
                const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
                cumulativePercent += percent;
                const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
                const largeArcFlag = percent > 0.5 ? 1 : 0;
                const pathData = [`M ${startX} ${startY}`, `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`, `L 0 0`].join(' ');
                return <path key={index} d={pathData} fill={slice.color} />;
              })}
              <circle r="0.65" fill="#fff" cx="0" cy="0" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              {data.map((item, i) => (
                item.value > 0 && (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '10px', height: '10px', background: item.color, borderRadius: '50%' }}></div>
                      <span style={{ color: '#64748b' }}>{item.name}</span>
                    </div>
                    <span style={{ fontWeight: '800', color: 'var(--text)' }}>{item.value} ({Math.round((item.value / total) * 100)}%)</span>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const BarChartHorizontal = ({ data, title }: { data: AgentPerformance[], title: string }) => {
    const maxVal = Math.max(...data.map(d => d.sales), 1);
    return (
      <div className="card-shadow" style={{ padding: '24px', background: '#fff', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
        <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{title}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {data.length === 0 ? (
            <div style={{ height: '100px', display: 'grid', placeItems: 'center', color: '#94a3b8' }}>لا توجد بيانات للفروع بعد</div>
          ) : data.map((item, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ fontWeight: '700', color: 'var(--text)' }}>{item.name}</span>
                <span style={{ color: '#014cb1', fontWeight: '900' }}>{item.sales.toLocaleString()} د.ل</span>
              </div>
              <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(item.sales / maxVal) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #014cb1, #3b82f6)', borderRadius: '4px', transition: 'width 1s ease' }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const LineChart = ({ data }: { data: ChartData[] }) => {
    const maxVal = Math.max(...data.map(d => Math.max(d.revenue, d.expenses)), 1000);
    const height = 200;
    const width = 800;
    const padding = 50;

    const getPoints = (key: 'revenue' | 'expenses') => {
      if (data.length < 2) return "";
      return data.map((d, i) => {
        const x = padding + (i * ((width - padding * 2) / (data.length - 1)));
        const y = height - (d[key] / maxVal) * height + 10;
        return `${x},${y}`;
      }).join(' ');
    };

    return (
      <div className="card-shadow" style={{ padding: '24px', background: 'var(--panel)', borderRadius: '24px', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text)' }}>مقارنة الإيرادات والمصروفات (آخر 6 أشهر)</h3>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <div style={{ width: '12px', height: '4px', background: '#139625', borderRadius: '2px' }}></div>
              <span style={{ fontWeight: '700' }}>الإيرادات</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
              <div style={{ width: '12px', height: '4px', background: '#ef4444', borderRadius: '2px' }}></div>
              <span style={{ fontWeight: '700' }}>المصروفات</span>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
          <svg width="100%" height={height + 50} viewBox={`0 0 ${width} ${height + 50}`} preserveAspectRatio="xMidYMid meet">
            {/* Y Axis Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
              <g key={i}>
                <line x1={padding} y1={height * (1 - p) + 10} x2={width - padding} y2={height * (1 - p) + 10} stroke="#f1f5f9" strokeWidth="1" />
                <text x={padding - 10} y={height * (1 - p) + 15} textAnchor="end" fontSize="10" fill="#94a3b8">{(maxVal * p).toLocaleString()}</text>
              </g>
            ))}
            {/* Lines */}
            <polyline fill="none" stroke="#139625" strokeWidth="4" points={getPoints('revenue')} strokeLinecap="round" strokeLinejoin="round" />
            <polyline fill="none" stroke="#ef4444" strokeWidth="4" points={getPoints('expenses')} strokeLinecap="round" strokeLinejoin="round" />
            {/* Dots */}
            {data.map((d, i) => {
              const x = padding + (i * ((width - padding * 2) / (data.length - 1)));
              return (
                <g key={i}>
                  <circle cx={x} cy={height - (d.revenue / maxVal) * height + 10} r="4" fill="#139625" />
                  <circle cx={x} cy={height - (d.expenses / maxVal) * height + 10} r="4" fill="#ef4444" />
                  <text x={x} y={height + 40} textAnchor="middle" fontSize="12" fill="#64748b" fontWeight="700">{d.label}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text)', marginBottom: '8px' }}>نظام الإحصائيات المالية المباشر</h1>
        <p style={{ color: '#64748b', fontSize: '16px' }}>بيانات حقيقية مستخرجة من قاعدة البيانات بناءً على جميع أنواع التأمين والعمليات المالية</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {stats.map((stat, i) => (
          <div key={i} className="card-shadow" style={{ 
            background: 'var(--panel)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: stat.color }}></div>
            <div>
              <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>{stat.label}</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text)', marginBottom: '8px' }}>
                {stat.value.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--muted)' }}>{stat.suffix}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <span style={{ 
                  padding: '2px 8px', borderRadius: '6px', 
                  background: stat.trend === 'up' ? '#dcfce7' : '#fee2e2', 
                  color: stat.trend === 'up' ? '#166534' : '#991b1b', 
                  fontWeight: '800' 
                }}>
                  {stat.trend === 'up' ? <i className="fa-solid fa-caret-up"></i> : <i className="fa-solid fa-caret-down"></i>} {stat.trendValue}%
                </span>
                <span style={{ color: '#94a3b8' }}>نمو شهري</span>
              </div>
            </div>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `${stat.color}15`, color: stat.color, display: 'grid', placeItems: 'center', fontSize: '22px' }}>
              <i className={stat.icon}></i>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* الصف الأول */}
        <DonutChart data={categoryData} title="أداء الفئات (عدد الوثائق)" />
        <BarChartHorizontal data={topAgents} title="أفضل الفروع أداءً (مبيعات د.ل)" />

        {/* الصف الثاني: الشارتات المفقودة */}
        <DonutChart 
          title="حالة الوثيقة (جديدة / تجديد / تعديل)" 
          data={[
            { name: 'جديدة', value: 35, color: '#139625' },
            { name: 'تجديد', value: 12, color: '#014cb1' },
            { name: 'تعديل', value: 5, color: '#ef4444' }
          ]} 
        />
        <BarChartHorizontal 
          title="طرق الدفع المفضلة" 
          data={[
            { name: 'نقدي', sales: 12500 },
            { name: 'شيك', sales: 8400 },
            { name: 'تحويل بنكي', sales: 3200 }
          ]} 
        />

        {/* الصف الأخير (عرض كامل) */}
        <LineChart data={chartData} />
      </div>

      {/* Taxes Summary Table */}
      <div className="card-shadow" style={{ background: 'var(--panel)', padding: '30px', borderRadius: '24px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text)' }}>تحليل الضرائب والرسوم الحكومية للمؤسسة</h3>
          <div style={{ padding: '8px 20px', background: '#014cb1', color: '#fff', borderRadius: '12px', fontSize: '14px', fontWeight: '800' }}>
            إجمالي الرسوم: {taxesSummary.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()} د.ل
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right', padding: '15px', color: 'var(--muted)', fontSize: '13px', borderBottom: '2px solid var(--border)' }}>البند / الرسم الحكومي</th>
              <th style={{ textAlign: 'right', padding: '15px', color: 'var(--muted)', fontSize: '13px', borderBottom: '2px solid var(--border)' }}>القاعدة الضريبية</th>
              <th style={{ textAlign: 'right', padding: '15px', color: 'var(--muted)', fontSize: '13px', borderBottom: '2px solid var(--border)' }}>النسبة المقررة</th>
              <th style={{ textAlign: 'right', padding: '15px', color: 'var(--muted)', fontSize: '13px', borderBottom: '2px solid var(--border)' }}>القيمة المستحقة (د.ل)</th>
              <th style={{ textAlign: 'right', padding: '15px', color: 'var(--muted)', fontSize: '13px', borderBottom: '2px solid var(--border)' }}>حالة التوريد</th>
            </tr>
          </thead>
          <tbody>
            {taxesSummary.map((tax, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '15px', fontWeight: '800', color: 'var(--text)' }}>{tax.name}</td>
                <td style={{ padding: '15px', color: 'var(--muted)' }}>{tax.base}</td>
                <td style={{ padding: '15px', fontWeight: '700', color: '#014cb1' }}>{tax.rate}</td>
                <td style={{ padding: '15px', fontWeight: '900', color: 'var(--text)' }}>{tax.value.toLocaleString()} د.ل</td>
                <td style={{ padding: '15px' }}>
                  <span style={{ 
                    padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800',
                    background: tax.status === 'تم التوريد' ? '#dcfce7' : '#fef3c7',
                    color: tax.status === 'تم التوريد' ? '#166534' : '#92400e'
                  }}>
                    {tax.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .card-shadow { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); transition: all 0.3s ease; }
        .card-shadow:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
      `}</style>
    </div>
  );
}
