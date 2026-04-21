import { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config/api';
import { exportToExcel } from '../utils/excelExport';

type PayrollData = {
  id: number;
  user_id: number;
  base_salary: number | string;
  tax_amount: number | string;
  social_security_amount: number | string;
  year: number;
  month: number;
  created_at: string;
  user: {
    id: number;
    name: string;
    job_title: string;
    national_id_number: string;
    nationality: string;
    start_date: string;
    tax_percentage: number | string;
    social_security_percentage: number | string;
  };
};

const toNum = (v: any) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

const money = new Intl.NumberFormat('en-LY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function TaxSSReport({ type }: { type: 'tax' | 'social_security' }) {
  const [data, setData] = useState<PayrollData[]>([]);
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const reportTitle = type === 'tax' ? 'تقرير ضريبة الدخل (مصلحة الضرائب)' : 'تقرير الضمان الاجتماعي (صندوق الضمان)';
  const columnLabel = type === 'tax' ? 'حصة مصلحة الضرائب' : 'حصة الضمان الاجتماعي';

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (month) params.append('month', month.toString());
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const response = await fetch(`${API_BASE_URL}/employee-payrolls/reports?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [type, year, month, fromDate, toDate]);

  const getRowShare = (row: PayrollData) => {
    let share = type === 'tax' ? toNum(row.tax_amount) : toNum(row.social_security_amount);
    if (share === 0) {
      const pct = type === 'tax' ? toNum(row.user?.tax_percentage) : toNum(row.user?.social_security_percentage);
      share = (toNum(row.base_salary) * pct) / 100;
    }
    return share;
  };

  const totals = useMemo(() => {
    return data.reduce((acc, r) => {
      acc.base += toNum(r.base_salary);
      acc.share += getRowShare(r);
      return acc;
    }, { base: 0, share: 0 });
  }, [data, type]);

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) return;

    const bodyRows = data.map((row, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td style="text-align:right; font-weight:bold;">${row.user?.name}</td>
        <td>${row.user?.job_title || '-'}</td>
        <td style="font-family:monospace">${row.user?.national_id_number || '-'}</td>
        <td>${row.user?.nationality || '-'}</td>
        <td>${row.user?.start_date ? new Date(row.user.start_date).toLocaleDateString('ar-LY') : '-'}</td>
        <td>%${type === 'tax' ? row.user?.tax_percentage : row.user?.social_security_percentage}</td>
        <td>${money.format(toNum(row.base_salary))}</td>
        <td style="font-weight:bold;">${money.format(getRowShare(row))}</td>
      </tr>
    `).join('');

    const displayTitle = type === 'tax' 
      ? `حصه ضريبة الدخل من أجور ومرتبات الموظفين` 
      : `حصه الضمان الاجتماعي من أجور ومرتبات الموظفين`;

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>${displayTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          @media print { 
            @page { margin: 8mm; size: A4; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { 
            font-family: 'Cairo', sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #1e293b;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 3px double #1a365d;
          }
          .header-right {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          .header-left {
            text-align: left;
            font-size: 13px;
            color: #1a365d;
            font-weight: 600;
          }
          .header-info h1 { margin: 0; font-size: 22px; color: #1a365d; font-weight: 900; line-height: 1.2; }
          .header-info p { margin: 2px 0; color: #4a5568; font-size: 13px; }
          .logo { height: 75px; width: 75px; object-fit: contain; }
          
          .report-title-container {
            text-align: center;
            margin: 20px 0;
          }
          .report-title-pill { 
            display: inline-block;
            padding: 12px 40px;
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 50px;
            font-size: 19px;
            font-weight: 700;
            color: #1a365d;
          }

          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px; 
            font-size: 13px;
          }
          th { 
            background-color: #f1f5f9; 
            color: #1e293b; 
            font-weight: 700; 
            padding: 12px 10px; 
            border: 1px solid #1a365d;
            text-align: center;
          }
          td { 
            padding: 12px 10px; 
            border: 1px solid #cbd5e1; 
            text-align: center;
            vertical-align: middle;
          }
          tr:nth-child(even) { background-color: #f8fafc; }
          
          .footer-signatures {
            margin-top: 60px;
            display: flex;
            justify-content: space-between;
            padding: 0 20px;
          }
          .sig-box {
            width: 220px;
            text-align: center;
          }
          .sig-line {
            border-top: 1.5px solid #1a365d;
            margin-bottom: 10px;
          }
          .sig-label {
            font-weight: 700;
            font-size: 16px;
            color: #1a365d;
          }
          .print-meta {
            margin-top: 40px;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="header">
          <div class="header-right">
            <img src="/img/logo.png" style="height: 90px; width: auto;" alt="Logo">
            <div class="header-info" style="margin-right: 15px;">
              <h1 style="font-size: 20px; margin-bottom: 2px;">المدار الليبي للتأمين</h1>
              <p><strong>قسم الشؤون المالية والموارد البشرية</strong></p>
            </div>
          </div>
          <div class="header-left">
            التاريخ: ${new Date().toLocaleDateString('ar-LY')}<br/>
            الوقت: ${new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div class="report-title-container">
          <div class="report-title-pill">
            ${displayTitle} خلال ( شهر ${year}/${month} )
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th width="40">م</th>
              <th>الاسم</th>
              <th>المهنة</th>
              <th>الرقم القومي</th>
              <th>الجنسية</th>
              <th>بداية العمل</th>
              <th>النسبة</th>
              <th>الراتب الأساسي</th>
              <th>${columnLabel}</th>
            </tr>
          </thead>
          <tbody>
            ${bodyRows}
          </tbody>
          <tfoot>
            <tr style="background:#f8fafc; font-weight:900">
              <td colspan="7" style="text-align:center">الإجمالي العام</td>
              <td>${money.format(totals.base)}</td>
              <td style="color:#c53030; font-size:14px">${money.format(totals.share)} د.ل</td>
            </tr>
          </tfoot>
        </table>

        <div class="footer-signatures">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">المحاسب المسؤول</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">مدير الموارد البشرية</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-label">المدير العام</div>
          </div>
        </div>

        <div class="print-meta">
          <span>تم استخراج هذا التقرير من نظام المدار بتاريخ: ${new Date().toLocaleString('ar-LY')}</span>
          <span>صفحة 1 من 1</span>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportExcel = () => {
    const period = fromDate && toDate ? `من: ${fromDate} إلى: ${toDate}` : (year ? `خلال ( شهر ${year}/${month} )` : 'جميع الفترات');
    const displayTitle = type === 'tax' 
      ? `حصه ضريبة الدخل من أجور ومرتبات الموظفين` 
      : `حصه الضمان الاجتماعي من أجور ومرتبات الموظفين`;
    
    exportToExcel({
      title: `${displayTitle} ${period}`,
      fileName: type === 'tax' ? 'تقرير_الضرائب' : 'تقرير_الضمان_الاجتماعي',
      columnCount: 9,
      summaryRight: `شامل الفترة: ${period}`,
      summaryLeft: `إجمالي الحصة: ${money.format(totals.share)} د.ل`,
      tableHeaders: `
        <tr height="40">
          <th width="50">م</th>
          <th width="250">الاسم</th>
          <th width="150">المهنة</th>
          <th width="150">الرقم القومي</th>
          <th width="120">الجنسية</th>
          <th width="120">بداية العمل</th>
          <th width="80">النسبة</th>
          <th width="150">الراتب الأساسي</th>
          <th width="150">${columnLabel}</th>
        </tr>
      `,
      tableBody: data.map((row, index) => `
        <tr class="${index % 2 === 0 ? 'row-even' : ''}">
          <td align="center">${index + 1}</td>
          <td class="bold">${row.user?.name}</td>
          <td>${row.user?.job_title || '-'}</td>
          <td style="mso-number-format:'\@';">${row.user?.national_id_number || '-'}</td>
          <td>${row.user?.nationality || '-'}</td>
          <td>${row.user?.start_date || '-'}</td>
          <td align="center">${type === 'tax' ? row.user?.tax_percentage : row.user?.social_security_percentage}%</td>
          <td>${row.base_salary}</td>
          <td class="green">${getRowShare(row)}</td>
        </tr>
      `).join('') + `
        <tr height="40" style="background-color: #f3f4f6; font-weight: bold;">
          <td colspan="7" align="center">الإجمالي</td>
          <td>${totals.base}</td>
          <td class="blue">${totals.share}</td>
        </tr>
      `
    });
  };

  return (
    <section className="section-container animate-fade-in">
      <div className="users-breadcrumb" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 20px',
        background: 'var(--panel)',
        borderRadius: '12px',
        marginBottom: '20px',
        border: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
          <i className={type === 'tax' ? "fa-solid fa-percent" : "fa-solid fa-handshake-angle"} style={{ marginLeft: '10px', color: 'var(--primary)' }}></i>
          {reportTitle}
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={handleExportExcel}
          >
            <i className="fa-solid fa-file-excel"></i>
            تصدير إكسيل
          </button>
          <button
            style={{ padding: '8px 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={handlePrint}
          >
            <i className="fa-solid fa-print"></i>
            طباعة التقرير
          </button>
        </div>
      </div>

      <div className="users-card" style={{ marginBottom: '20px', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', alignItems: 'end' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>السنة</label>
            <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}>
              {Array.from({ length: 11 }, (_, i) => 2020 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>الشهر</label>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}>
              <option value="">كل الأشهر</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>من تاريخ</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>إلى تاريخ</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <button className="primary" style={{ height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={loadData}>
            <i className="fa-solid fa-rotate"></i>
            تحديث البيانات
          </button>
        </div>
      </div>

      <div className="users-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>م</th>
                <th>الاسم</th>
                <th>المهنة</th>
                <th>الرقم القومي</th>
                <th>الجنسية</th>
                <th>بداية العمل</th>
                <th>النسبة</th>
                <th>الراتب الأساسي</th>
                <th>{columnLabel}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '50px' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', color: 'var(--primary)' }}></i>
                  <p style={{ marginTop: '10px' }}>جاري تحميل البيانات...</p>
                </td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '50px', color: 'var(--muted)' }}>
                  <i className="fa-solid fa-folder-open" style={{ fontSize: '32px', marginBottom: '10px' }}></i>
                  <p>لا توجد بيانات للفترة المحددة</p>
                </td></tr>
              ) : (
                <>
                  {data.map((row, idx) => (
                    <tr key={row.id}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 'bold' }}>{row.user?.name}</td>
                      <td>{row.user?.job_title || '-'}</td>
                      <td style={{ fontFamily: 'monospace' }}>{row.user?.national_id_number || '-'}</td>
                      <td>{row.user?.nationality || '-'}</td>
                      <td>{row.user?.start_date ? new Date(row.user.start_date).toLocaleDateString('ar-LY') : '-'}</td>
                      <td style={{ textAlign: 'center' }}>%{type === 'tax' ? row.user?.tax_percentage : row.user?.social_security_percentage}</td>
                      <td>{money.format(toNum(row.base_salary))}</td>
                      <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                        {money.format(getRowShare(row))}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--panel)', fontWeight: 'bold' }}>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '15px' }}>الإجمالي</td>
                    <td>{money.format(totals.base)}</td>
                    <td style={{ color: 'var(--primary)', fontSize: '1.2em' }}>{money.format(totals.share)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
