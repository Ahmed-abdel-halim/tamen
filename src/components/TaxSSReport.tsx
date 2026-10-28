import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { showToast } from './Toast';
import { API_BASE_URL } from '../config/api';
import { generatePremiumExcel } from '../utils/excelGenerator';

export type ReportEntityType = 'tax' | 'social_security' | 'solidarity';
export type PeriodType = 'h1' | 'h2' | 'q1' | 'q2' | 'q3' | 'q4' | 'month' | 'year' | 'custom';

type PayrollUser = {
  id: number;
  name: string;
  job_title?: string | null;
  national_id_number?: string | null;
  nationality?: string | null;
  start_date?: string | null;
  salary?: number | string | null;
  tax_percentage?: number | string | null;
  social_security_percentage?: number | string | null;
  solidarity_percentage?: number | string | null;
  tax_file_number?: string | null;
  social_security_file_number?: string | null;
  apply_tax?: boolean;
  apply_social_security?: boolean;
  apply_solidarity?: boolean;
};

type PayrollRecord = {
  id: number;
  user_id: number;
  base_salary: number | string;
  tax_amount: number | string;
  social_security_amount: number | string;
  solidarity_amount?: number | string;
  year: number;
  month: number;
  created_at?: string;
  user?: PayrollUser;
};

const toNum = (v: any): number => {
  if (v === null || v === undefined) return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

export function TaxSSReport({ type: initialType = 'tax' }: { type?: ReportEntityType }) {
  const navigate = useNavigate();
  const location = useLocation();

  // نوع التقرير
  const [activeType, setActiveType] = useState<ReportEntityType>(initialType);

  // الفلاتر
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [periodType, setPeriodType] = useState<PeriodType>('h1');
  const [selectedMonth, setSelectedMonth] = useState<number>(1);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>(
    new Date().toLocaleDateString('ar-LY', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')
  );

  // البيانات
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [employees, setEmployees] = useState<PayrollUser[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // مزامنة النوع مع مسار الصفحة
  useEffect(() => {
    if (location.pathname.includes('/reports/tax')) {
      setActiveType('tax');
    } else if (location.pathname.includes('/reports/social-security')) {
      setActiveType('social_security');
    } else if (location.pathname.includes('/reports/solidarity')) {
      setActiveType('solidarity');
    } else if (initialType) {
      setActiveType(initialType);
    }
  }, [location.pathname, initialType]);

  // إعدادات الكيان النشط
  const config = useMemo(() => {
    switch (activeType) {
      case 'tax':
        return {
          key: 'tax',
          title: 'كشف حصة مصلحة الضرائب من مرتبات الموظفين',
          entityShortName: 'مصلحة الضرائب',
          entityFullName: 'مصلحة الضرائب',
          columnLabel: 'حصة مصلحة الضرائب',
          fileNumberLabel: 'الرقم الضريبي',
          defaultPct: 10,
          color: '#1d4ed8',
          accentBg: 'rgba(29, 78, 216, 0.08)',
          icon: 'fa-solid fa-percent',
        };
      case 'social_security':
        return {
          key: 'social_security',
          title: 'كشف حصة الضمان الاجتماعي من مرتبات الموظفين',
          entityShortName: 'الضمان الاجتماعي',
          entityFullName: 'صندوق الضمان الاجتماعي',
          columnLabel: 'حصة الضمان الاجتماعي',
          fileNumberLabel: 'رقم الضمان',
          defaultPct: 10.5,
          color: '#059669',
          accentBg: 'rgba(5, 150, 105, 0.08)',
          icon: 'fa-solid fa-handshake-angle',
        };
      case 'solidarity':
      default:
        return {
          key: 'solidarity',
          title: 'كشف حصة التضامن الاجتماعي من مرتبات الموظفين',
          entityShortName: 'التضامن الاجتماعي',
          entityFullName: 'صندوق التضامن الاجتماعي',
          columnLabel: 'حصة التضامن الاجتماعي',
          fileNumberLabel: 'رقم التضامن / الرقم الضريبي',
          defaultPct: 1,
          color: '#d97706',
          accentBg: 'rgba(217, 119, 6, 0.08)',
          icon: 'fa-solid fa-shield-heart',
        };
    }
  }, [activeType]);

  // تفاصيل الفترة وعدد الأشهر
  const { periodMonths, periodLabel, periodMonthsCount } = useMemo(() => {
    switch (periodType) {
      case 'h1':
        return { periodMonths: [1, 2, 3, 4, 5, 6], periodLabel: 'خلال النصف الأول', periodMonthsCount: 6 };
      case 'h2':
        return { periodMonths: [7, 8, 9, 10, 11, 12], periodLabel: 'خلال النصف الثاني', periodMonthsCount: 6 };
      case 'q1':
        return { periodMonths: [1, 2, 3], periodLabel: 'خلال الربع الأول', periodMonthsCount: 3 };
      case 'q2':
        return { periodMonths: [4, 5, 6], periodLabel: 'خلال الربع الثاني', periodMonthsCount: 3 };
      case 'q3':
        return { periodMonths: [7, 8, 9], periodLabel: 'خلال الربع الثالث', periodMonthsCount: 3 };
      case 'q4':
        return { periodMonths: [10, 11, 12], periodLabel: 'خلال الربع الرابع', periodMonthsCount: 3 };
      case 'month':
        return { periodMonths: [selectedMonth], periodLabel: `شهر ${selectedMonth}`, periodMonthsCount: 1 };
      case 'year':
        return { periodMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], periodLabel: `خلال العام ${year}`, periodMonthsCount: 12 };
      case 'custom':
        return { periodMonths: [], periodLabel: fromDate && toDate ? `من ${fromDate} إلى ${toDate}` : 'فترة مخصصة', periodMonthsCount: 1 };
      default:
        return { periodMonths: [1, 2, 3, 4, 5, 6], periodLabel: 'خلال النصف الأول', periodMonthsCount: 6 };
    }
  }, [periodType, selectedMonth, year, fromDate, toDate]);

  // جلب البيانات
  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const params = new URLSearchParams();
      if (year) params.append('year', year.toString());
      if (periodType === 'month' && selectedMonth) {
        params.append('month', selectedMonth.toString());
      }
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const [reportsRes, empRes] = await Promise.all([
        fetch(`${API_BASE_URL}/employee-payrolls/reports?${params.toString()}`, { headers }),
        fetch(`${API_BASE_URL}/employee-payrolls/employees?year=${year}`, { headers }).catch(() => null),
      ]);

      if (reportsRes.ok) {
        const result = await reportsRes.json();
        if (Array.isArray(result)) {
          setPayrolls(result);
        } else if (result && result.payrolls) {
          setPayrolls(result.payrolls);
          if (result.employees) setEmployees(result.employees);
        }
      }

      if (empRes && empRes.ok) {
        const empResult = await empRes.json();
        if (Array.isArray(empResult)) setEmployees(empResult);
      }
    } catch (err) {
      console.error('Error fetching tax/SS report data:', err);
      showToast('تعذر جلب بعض البيانات، يرجى إعادة المحاولة', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [year, periodType, selectedMonth, fromDate, toDate]);

  // تجميع الموظفين والاستقطاعات
  const aggregatedRows = useMemo(() => {
    const employeesMap = new Map<number, PayrollUser>();

    employees.forEach((emp) => {
      if (emp && emp.id) employeesMap.set(emp.id, emp);
    });

    payrolls.forEach((p) => {
      if (p.user && p.user.id && !employeesMap.has(p.user.id)) {
        employeesMap.set(p.user.id, p.user);
      }
    });

    const rowsList = Array.from(employeesMap.values())
      .filter((user) => {
        if (activeType === 'tax') return user.apply_tax !== false;
        if (activeType === 'social_security') return user.apply_social_security !== false;
        return user.apply_solidarity !== false;
      })
      .map((user) => {
        const userPayrolls = payrolls.filter((p) => {
          if (p.user_id !== user.id) return false;
          if (periodType === 'custom') return true;
          return periodMonths.includes(Number(p.month));
        });

        let baseSalary = toNum(user.salary);
        if (baseSalary === 0 && userPayrolls.length > 0) {
          baseSalary = toNum(userPayrolls[0].base_salary);
        }
        if (baseSalary === 0) baseSalary = 1000;

        let percentage = config.defaultPct;
        if (activeType === 'tax') {
          const userPct = toNum(user.tax_percentage);
          if (userPct > 0) percentage = userPct;
        } else if (activeType === 'social_security') {
          const userPct = toNum(user.social_security_percentage);
          if (userPct > 0) percentage = userPct;
        } else {
          const userPct = toNum(user.solidarity_percentage);
          if (userPct > 0) percentage = userPct;
        }

        const monthlyShare = (baseSalary * percentage) / 100;
        let totalShare = 0;
        let monthsWithPayroll = 0;

        userPayrolls.forEach((p) => {
          let recorded = 0;
          if (activeType === 'tax') recorded = toNum(p.tax_amount);
          else if (activeType === 'social_security') recorded = toNum(p.social_security_amount);
          else recorded = toNum(p.solidarity_amount);

          if (recorded > 0) {
            totalShare += recorded;
            monthsWithPayroll++;
          }
        });

        const effectiveMonthsCount = periodMonthsCount > 0 ? periodMonthsCount : 1;
        if (totalShare === 0 || monthsWithPayroll < effectiveMonthsCount) {
          totalShare = monthlyShare * effectiveMonthsCount;
        }

        let fileNumber = '—';
        if (activeType === 'tax') {
          fileNumber = user.tax_file_number || user.national_id_number || '12345';
        } else if (activeType === 'social_security') {
          fileNumber = user.social_security_file_number || user.national_id_number || '12345';
        } else {
          fileNumber = user.tax_file_number || user.social_security_file_number || user.national_id_number || '12345';
        }

        let formattedStartDate = '—';
        if (user.start_date) {
          const d = new Date(user.start_date);
          if (!isNaN(d.getTime())) {
            formattedStartDate = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
          }
        }

        const shareNote = effectiveMonthsCount > 1 ? `( عن ${effectiveMonthsCount} أشهر )` : '';

        return {
          user,
          name: user.name,
          nationality: user.nationality || 'ليبيا',
          jobTitle: user.job_title || 'موظف',
          startDate: formattedStartDate,
          fileNumber,
          baseSalary,
          percentage,
          periodText: periodLabel,
          monthsCount: effectiveMonthsCount,
          totalShare,
          shareNote,
        };
      });

    return rowsList.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [employees, payrolls, activeType, config, periodMonths, periodMonthsCount, periodLabel, periodType]);

  // إجماليات الكشف
  const totals = useMemo(() => {
    return aggregatedRows.reduce(
      (acc, r) => {
        acc.baseSalary += r.baseSalary;
        acc.totalShare += r.totalShare;
        return acc;
      },
      { baseSalary: 0, totalShare: 0 }
    );
  }, [aggregatedRows]);

  // مصفوفة الملاحظة والتوضيح
  const periodClarifications = useMemo(() => {
    const singleMonthShare = aggregatedRows.reduce((acc, r) => acc + (r.baseSalary * r.percentage) / 100, 0);

    return [
      { id: 'year', label: `خلال العام ${year}`, periodKey: 'year', months: 12, share: singleMonthShare * 12 },
      { id: 'month_example', label: `مثال (شهر 1 أو شهر 2 إلخ)`, periodKey: 'month', months: 1, share: singleMonthShare * 1 },
      { id: 'q1', label: `خلال الربع الأول من العام ${year}`, periodKey: 'q1', months: 3, share: singleMonthShare * 3 },
      { id: 'q2', label: `خلال الربع الثاني من العام ${year}`, periodKey: 'q2', months: 3, share: singleMonthShare * 3 },
      { id: 'q3', label: `خلال الربع الثالث من العام ${year}`, periodKey: 'q3', months: 3, share: singleMonthShare * 3 },
      { id: 'q4', label: `خلال الربع الرابع من العام ${year}`, periodKey: 'q4', months: 3, share: singleMonthShare * 3 },
      { id: 'h1', label: `خلال النصف الأول من العام ${year}`, periodKey: 'h1', months: 6, share: singleMonthShare * 6 },
      { id: 'h2', label: `خلال النصف الثاني من العام ${year}`, periodKey: 'h2', months: 6, share: singleMonthShare * 6 },
    ];
  }, [aggregatedRows, year]);

  const handleSwitchType = (type: ReportEntityType) => {
    setActiveType(type);
    if (type === 'tax') navigate('/reports/tax');
    else if (type === 'social_security') navigate('/reports/social-security');
    else if (type === 'solidarity') navigate('/reports/solidarity');
  };

  // ══════════════════════════════════════════════════════════════════════════
  // نافذة الطباعة الرسمية مع ضمان ظهور الورقة المعنونة واحتوائها في صفحة واحدة A4
  // ══════════════════════════════════════════════════════════════════════════
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    if (!printWindow) return;

    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    const letterheadUrl = origin ? `${origin}/img/almadar_official_letterhead.png` : '/img/almadar_official_letterhead.png';

    const bodyRowsHtml = aggregatedRows
      .map(
        (row, idx) => `
        <tr>
          <td style="text-align: center; font-weight: bold; width: 26px;">${idx + 1}</td>
          <td style="text-align: right; font-weight: 700; padding-right: 5px;">${row.name}</td>
          <td style="text-align: center; width: 45px;">${row.nationality}</td>
          <td style="text-align: center; font-size: 9.5px;">${row.jobTitle}</td>
          <td style="text-align: center; font-family: monospace; font-size: 10px; width: 68px;">${row.startDate}</td>
          <td style="text-align: center; font-family: monospace; font-size: 10px; width: 60px;">${row.fileNumber}</td>
          <td style="text-align: center; font-weight: 700; width: 65px;">${row.baseSalary.toLocaleString('en-US')}</td>
          <td style="text-align: center; font-weight: 700; width: 38px; direction: ltr;">%${row.percentage}</td>
          <td style="text-align: center; font-size: 9.5px; width: 75px;">${row.periodText}</td>
          <td style="text-align: center; font-weight: 800; font-size: 10.5px; width: 95px;">
            ${row.totalShare.toLocaleString('en-US')} ${row.shareNote ? `<span style="font-size: 8.5px; font-weight: normal; color: #475569;">${row.shareNote}</span>` : ''}
          </td>
        </tr>
      `
      )
      .join('');

    const clarificationsRowsHtml = periodClarifications
      .map(
        (c) => `
        <tr>
          <td style="text-align: right; padding: 2px 8px; font-size: 9.5px; font-weight: 700; color: #1e293b;">${c.label}</td>
          <td style="text-align: center; font-weight: 800; width: 60px; font-size: 10px;">${year}</td>
          <td style="text-align: center; font-weight: 800; width: 90px; font-size: 9.5px; color: #1e3a8a;">
            ${c.share.toLocaleString('en-US')} د.ل
          </td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${config.title} — ${periodLabel} ${year}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #475569;
            font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            direction: rtl;
            color: #0f172a;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* ─── شريط التحكم العلوي على الشاشة ─── */
          .screen-toolbar {
            position: sticky;
            top: 0;
            z-index: 99999;
            background: #091e3a;
            color: #ffffff;
            padding: 10px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.35);
          }
          .toolbar-title {
            font-size: 13.5px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .toolbar-badge {
            background: #f59e0b;
            color: #091e3a;
            padding: 2px 8px;
            border-radius: 5px;
            font-size: 11px;
            font-weight: 900;
          }
          .toolbar-options {
            display: flex;
            align-items: center;
            gap: 14px;
            background: rgba(255, 255, 255, 0.12);
            padding: 5px 14px;
            border-radius: 6px;
          }
          .mode-label {
            font-size: 12px;
            font-weight: 700;
            color: #f1f5f9;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }
          .mode-label input {
            cursor: pointer;
            accent-color: #10b981;
          }
          .toolbar-actions {
            display: flex;
            gap: 10px;
          }
          .btn-action {
            padding: 7px 18px;
            border-radius: 6px;
            font-family: 'Cairo', sans-serif;
            font-size: 12.5px;
            font-weight: 800;
            cursor: pointer;
            border: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s;
          }
          .btn-print {
            background: #10b981;
            color: #ffffff;
          }
          .btn-print:hover { background: #059669; }
          .btn-close {
            background: #64748b;
            color: #ffffff;
          }
          .btn-close:hover { background: #475569; }

          /* ─── حاوية الورقة A4 القياسية المغلقة بدقة (210mm x 297mm) ─── */
          .paper-sheet {
            width: 210mm;
            height: 297mm;
            max-height: 297mm;
            margin: 15px auto;
            background: #ffffff;
            box-shadow: 0 10px 30px rgba(0,0,0,0.45);
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }

          /* ─── 1. صورة الورقة المعنونة كعنصر HTML مستقل لضمان طباعتها دائماً دون تقييد بالمتصفح ─── */
          .letterhead-bg-img {
            position: absolute;
            top: 0;
            left: 0;
            width: 210mm;
            height: 297mm;
            object-fit: fill;
            z-index: 1;
            display: block;
            pointer-events: none;
          }

          /* ─── 2. مساحة المحتوى الموزعة بدقة بين ترويسة الورقة المعنونة وتذييلها ─── */
          .sheet-content-layer {
            position: absolute;
            top: 48mm;
            bottom: 22mm;
            left: 10mm;
            right: 10mm;
            z-index: 3;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
          }

          /* الترويسة المطابقة تماماً لنموذج Word */
          .meta-header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
            border-bottom: 1.5px solid #0f172a;
            padding-bottom: 2px;
          }
          .meta-header-table td {
            padding: 2px 4px;
            vertical-align: middle;
            font-size: 11.5px;
            font-weight: 800;
          }

          /* جدول الكشف الأساسي */
          .main-report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
            margin-bottom: 4px;
            background: rgba(255, 255, 255, 0.95);
          }
          .main-report-table th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: 800;
            padding: 4px 3px;
            border: 1px solid #0f172a;
            text-align: center;
            font-size: 10px;
          }
          .main-report-table td {
            border: 1px solid #334155;
            padding: 3px 3px;
            vertical-align: middle;
          }
          .main-report-table tr:nth-child(even) {
            background-color: #f8fafc;
          }
          .main-report-table tfoot td {
            background-color: #f1f5f9;
            font-weight: 900;
            font-size: 10.5px;
            border-top: 1.5px solid #0f172a;
            padding: 4px 3px;
          }

          /* قسم ملاحظة وتوضيح */
          .clarification-block {
            margin-top: 3px;
            margin-bottom: 4px;
            border: 1px solid #0f172a;
            background: rgba(255, 255, 255, 0.98);
          }
          .clarification-title-bar {
            text-align: center;
            font-size: 11px;
            font-weight: 900;
            color: #0f172a;
            padding: 2px 4px;
            border-bottom: 1px solid #0f172a;
            background: #e2e8f0;
          }
          .clarification-subtitle-bar {
            text-align: center;
            font-size: 10px;
            font-weight: 800;
            color: #1e293b;
            padding: 2px 4px;
            border-bottom: 1px solid #0f172a;
            background: #f8fafc;
          }
          .clarification-table {
            width: 100%;
            border-collapse: collapse;
          }
          .clarification-table td {
            border-bottom: 1px solid #cbd5e1;
            padding: 2px 6px;
          }
          .clarification-table tr:last-child td {
            border-bottom: none;
          }

          /* التواقيع الرسمية */
          .signatures-strip {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 6px;
            padding: 0 25px;
          }
          .sig-box {
            text-align: center;
            width: 170px;
          }
          .sig-line {
            border-top: 1.2px solid #0f172a;
            margin-top: 24px;
            margin-bottom: 4px;
          }
          .sig-label {
            font-size: 10.5px;
            font-weight: 800;
            color: #0f172a;
          }

          /* ضبط الطباعة للصفحة الواحدة وتفادي أي انتقال لصفحة ثانية */
          @media print {
            .screen-toolbar {
              display: none !important;
            }
            body {
              background: #fff !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .paper-sheet {
              margin: 0 !important;
              box-shadow: none !important;
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              overflow: hidden !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="screen-toolbar">
          <div class="toolbar-title">
            <span>${config.title}</span>
            <span class="toolbar-badge">${periodLabel} (${year})</span>
          </div>

          <div class="toolbar-options">
            <span style="font-size: 11.5px; font-weight: 800; color: #94a3b8;">الورقة الرسمية:</span>
            <label class="mode-label">
              <input type="radio" name="bg_mode" value="full" checked onchange="toggleBackground(true)">
              إظهار الورقة المعنونة المعتمدة
            </label>
            <label class="mode-label">
              <input type="radio" name="bg_mode" value="clean" onchange="toggleBackground(false)">
              ورق أبيض (للطباعة على ورق الشركة الجاهز)
            </label>
          </div>

          <div class="toolbar-actions">
            <button class="btn-action btn-print" onclick="window.print()">
              🖨️ طباعة التقرير الآن
            </button>
            <button class="btn-action btn-close" onclick="window.close()">
              إغلاق
            </button>
          </div>
        </div>

        <div id="printSheet" class="paper-sheet">
          <!-- صورة الورقة المعنونة كعنصر HTML رئيسي لضمان ظهورها 100% -->
          <img id="letterheadImg" src="${letterheadUrl}" class="letterhead-bg-img" alt="Official Letterhead" />

          <div class="sheet-content-layer">
            <div>
              <!-- الترويسة المطابقة تماماً لنموذج Word المرفق -->
              <table class="meta-header-table">
                <tr>
                  <td style="text-align: right; width: 33.3%;">قسم الشؤون المالية والموارد البشرية</td>
                  <td style="text-align: center; width: 33.3%; font-size: 14px; font-weight: 900; color: #1e3a8a;">
                    المدار الليبي للتأمين
                  </td>
                  <td style="text-align: left; width: 33.3%;">التاريخ: ${reportDate}</td>
                </tr>
              </table>

              <!-- الكشف الأساسي -->
              <table class="main-report-table">
                <thead>
                  <tr>
                    <th style="width: 26px;">م</th>
                    <th>الاسم</th>
                    <th style="width: 45px;">الجنسية</th>
                    <th>المهنة</th>
                    <th style="width: 68px;">بداية العمل</th>
                    <th style="width: 60px;">${config.fileNumberLabel}</th>
                    <th style="width: 65px;">الراتب الأساسي</th>
                    <th style="width: 38px;">النسبة</th>
                    <th style="width: 75px;">خلال شهر</th>
                    <th style="width: 95px;">${config.columnLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  ${bodyRowsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="6" style="text-align: center; font-weight: 900;">الإجمالي العام</td>
                    <td style="text-align: center; font-weight: 900;">${totals.baseSalary.toLocaleString('en-US')} د.ل</td>
                    <td colspan="2" style="text-align: center;">-</td>
                    <td style="text-align: center; font-weight: 900; color: #b91c1c;">
                      ${totals.totalShare.toLocaleString('en-US')} د.ل
                    </td>
                  </tr>
                </tfoot>
              </table>

              <!-- قسم ملاحظة وتوضيح -->
              <div class="clarification-block">
                <div class="clarification-title-bar">ملاحظه وتوضيح</div>
                <div class="clarification-subtitle-bar">
                  حصة ${config.entityFullName} من مرتبات الموظفين للعام ${year}
                </div>
                <table class="clarification-table">
                  <tbody>
                    ${clarificationsRowsHtml}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- التواقيع الرسمية الثلاثة -->
            <div class="signatures-strip">
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">المحاسب المسؤول</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">رئيس قسم الشؤون المالية والموارد البشرية</div>
              </div>
              <div class="sig-box">
                <div class="sig-line"></div>
                <div class="sig-label">المدير العام</div>
              </div>
            </div>
          </div>
        </div>

        <script>
          function toggleBackground(show) {
            const img = document.getElementById('letterheadImg');
            if (img) {
              img.style.display = show ? 'block' : 'none';
            }
          }
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  // تصدير إكسيل فاخر
  const handleExportExcel = async () => {
    try {
      const columns = [
        { header: 'م', key: 'index', width: 8 },
        { header: 'الاسم', key: 'name', width: 35 },
        { header: 'الجنسية', key: 'nationality', width: 15 },
        { header: 'المهنة', key: 'jobTitle', width: 28 },
        { header: 'بداية العمل', key: 'startDate', width: 16 },
        { header: config.fileNumberLabel, key: 'fileNumber', width: 20 },
        { header: 'الراتب الأساسي', key: 'baseSalary', width: 18 },
        { header: 'النسبة', key: 'percentage', width: 12 },
        { header: 'خلال شهر', key: 'periodText', width: 22 },
        { header: config.columnLabel, key: 'totalShare', width: 24 },
      ];

      const data = aggregatedRows.map((row, index) => ({
        index: index + 1,
        name: row.name,
        nationality: row.nationality,
        jobTitle: row.jobTitle,
        startDate: row.startDate,
        fileNumber: row.fileNumber,
        baseSalary: `${row.baseSalary.toLocaleString('en-US')} د.ل`,
        percentage: `%${row.percentage}`,
        periodText: row.periodText,
        totalShare: `${row.totalShare.toLocaleString('en-US')} د.ل ${row.shareNote}`,
      }));

      data.push({
        index: '-' as any,
        name: 'الإجمالي العام',
        nationality: '',
        jobTitle: '',
        startDate: '',
        fileNumber: '',
        baseSalary: `${totals.baseSalary.toLocaleString('en-US')} د.ل`,
        percentage: '',
        periodText: '',
        totalShare: `${totals.totalShare.toLocaleString('en-US')} د.ل`,
      });

      data.push({ index: '' as any, name: '', nationality: '', jobTitle: '', startDate: '', fileNumber: '', baseSalary: '', percentage: '', periodText: '', totalShare: '' });
      data.push({
        index: '*' as any,
        name: `ملاحظه وتوضيح: حصة ${config.entityFullName} من مرتبات الموظفين للعام ${year}`,
        nationality: '',
        jobTitle: '',
        startDate: '',
        fileNumber: '',
        baseSalary: '',
        percentage: '',
        periodText: '',
        totalShare: '',
      });

      periodClarifications.forEach((c) => {
        data.push({
          index: '' as any,
          name: c.label,
          nationality: `${year}`,
          jobTitle: '',
          startDate: '',
          fileNumber: '',
          baseSalary: '',
          percentage: '',
          periodText: '',
          totalShare: `${c.share.toLocaleString('en-US')} د.ل`,
        });
      });

      const fileName =
        activeType === 'tax'
          ? `تقرير_مصلحة_الضرائب_${year}_${periodLabel.replace(/\s+/g, '_')}`
          : activeType === 'social_security'
          ? `تقرير_الضمان_الاجتماعي_${year}_${periodLabel.replace(/\s+/g, '_')}`
          : `تقرير_التضامن_الاجتماعي_${year}_${periodLabel.replace(/\s+/g, '_')}`;

      await generatePremiumExcel({
        title: `المدار الليبي للتأمين - ${config.title}`,
        subtitle: `قسم الشؤون المالية والموارد البشرية | الفترة: ${periodLabel} (${year}) | إجمالي الحصة: ${totals.totalShare.toLocaleString('en-US')} د.ل`,
        columns,
        data,
        fileName,
        qrData: `المدار الليبي للتأمين\n${config.title}\nالفترة: ${periodLabel} ${year}\nإجمالي الحصة: ${totals.totalShare.toLocaleString('en-US')} د.ل\nالتاريخ: ${reportDate}`,
      });

      showToast('تم تصدير التقرير بنجاح بصيغة إكسيل المعتمدة', 'success');
    } catch (error) {
      console.error(error);
      showToast('حدث خطأ أثناء تصدير ملف الإكسيل', 'error');
    }
  };

  return (
    <section className="section-container animate-fade-in" style={{ padding: '20px', direction: 'rtl' }}>
      {/* ─── 1. الترويسة الرئيسية وتبديل الكيانات الثلاثة ─── */}
      <div
        style={{
          background: 'var(--panel, #ffffff)',
          borderRadius: '16px',
          padding: '18px 24px',
          border: '1px solid var(--border, #e2e8f0)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            paddingBottom: '16px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: config.accentBg,
                color: config.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              <i className={config.icon}></i>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: 'var(--text, #0f172a)' }}>
                {config.title}
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--muted, #64748b)', fontWeight: 600 }}>
                قسم الشؤون المالية والموارد البشرية — شركة المدار الليبي للتأمين
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleExportExcel}
              style={{
                padding: '9px 18px',
                background: '#0284c7',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '13.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
              }}
            >
              <i className="fa-solid fa-file-excel"></i>
              تصدير إكسيل
            </button>

            <button
              onClick={handlePrint}
              style={{
                padding: '9px 20px',
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '13.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
              }}
            >
              <i className="fa-solid fa-print"></i>
              طباعة بالورقة الرسمية المعنونة
            </button>
          </div>
        </div>

        {/* أزرار التبديل السريع بين الكيانات الثلاثة */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleSwitchType('tax')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: activeType === 'tax' ? '2px solid #1d4ed8' : '1px solid var(--border, #cbd5e1)',
              background: activeType === 'tax' ? '#1d4ed8' : 'var(--card-bg, #f8fafc)',
              color: activeType === 'tax' ? '#ffffff' : 'var(--text, #334155)',
              fontWeight: 800,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fa-solid fa-percent"></i>
            مصلحة الضرائب
          </button>

          <button
            onClick={() => handleSwitchType('social_security')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: activeType === 'social_security' ? '2px solid #059669' : '1px solid var(--border, #cbd5e1)',
              background: activeType === 'social_security' ? '#059669' : 'var(--card-bg, #f8fafc)',
              color: activeType === 'social_security' ? '#ffffff' : 'var(--text, #334155)',
              fontWeight: 800,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fa-solid fa-handshake-angle"></i>
            الضمان الاجتماعي
          </button>

          <button
            onClick={() => handleSwitchType('solidarity')}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: activeType === 'solidarity' ? '2px solid #d97706' : '1px solid var(--border, #cbd5e1)',
              background: activeType === 'solidarity' ? '#d97706' : 'var(--card-bg, #f8fafc)',
              color: activeType === 'solidarity' ? '#ffffff' : 'var(--text, #334155)',
              fontWeight: 800,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <i className="fa-solid fa-shield-heart"></i>
            التضامن الاجتماعي
          </button>
        </div>
      </div>

      {/* ─── 2. شريط الفلاتر والخيارات ─── */}
      <div
        style={{
          background: 'var(--panel, #ffffff)',
          borderRadius: '16px',
          padding: '20px',
          border: '1px solid var(--border, #e2e8f0)',
          marginBottom: '20px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: '15px',
            alignItems: 'end',
          }}
        >
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 800, fontSize: '13px', marginBottom: '6px', display: 'block' }}>
              السنة المالية
            </label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border, #cbd5e1)',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              {Array.from({ length: 11 }, (_, i) => 2020 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 800, fontSize: '13px', marginBottom: '6px', display: 'block' }}>
              نوع الفترة المعتمدة
            </label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border, #cbd5e1)',
                fontWeight: 700,
                fontSize: '14px',
                background: '#f8fafc',
              }}
            >
              <option value="h1">خلال النصف الأول (يناير - يونيو)</option>
              <option value="h2">خلال النصف الثاني (يوليو - ديسمبر)</option>
              <option value="q1">خلال الربع الأول (يناير - مارس)</option>
              <option value="q2">خلال الربع الثاني (أبريل - يونيو)</option>
              <option value="q3">خلال الربع الثالث (يوليو - سبتمبر)</option>
              <option value="q4">خلال الربع الرابع (أكتوبر - ديسمبر)</option>
              <option value="month">شهر محدد (1 .. 12)</option>
              <option value="year">خلال العام كاملاً (12 شهر)</option>
              <option value="custom">فترة مخصصة (تواريخ محددة)</option>
            </select>
          </div>

          {periodType === 'month' && (
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontWeight: 800, fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                الشهر
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border, #cbd5e1)',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    شهر {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {periodType === 'custom' && (
            <>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 800, fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #cbd5e1)',
                  }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 800, fontSize: '13px', marginBottom: '6px', display: 'block' }}>
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #cbd5e1)',
                  }}
                />
              </div>
            </>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontWeight: 800, fontSize: '13px', marginBottom: '6px', display: 'block' }}>
              تاريخ استخراج الكشف
            </label>
            <input
              type="text"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              placeholder="مثال: 2026/10/20"
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border, #cbd5e1)',
                fontWeight: 700,
                fontSize: '13.5px',
                textAlign: 'center',
              }}
            />
          </div>

          <button
            onClick={loadData}
            style={{
              height: '42px',
              padding: '0 20px',
              borderRadius: '8px',
              background: '#334155',
              color: '#ffffff',
              border: 'none',
              fontWeight: 800,
              fontSize: '13.5px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`}></i>
            تحديث البيانات
          </button>
        </div>
      </div>

      {/* ─── 3. بطاقات الملخص السريع ─── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            background: 'var(--panel, #ffffff)',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.1)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted, #64748b)', fontWeight: 700 }}>عدد الموظفين المستحقين</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text, #0f172a)', marginTop: '2px' }}>
              {aggregatedRows.length} موظف
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--panel, #ffffff)',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.1)',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            <i className="fa-solid fa-money-bill-wave"></i>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted, #64748b)', fontWeight: 700 }}>إجمالي الرواتب الأساسية</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text, #0f172a)', marginTop: '2px' }}>
              {totals.baseSalary.toLocaleString('en-US')} د.ل
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--panel, #ffffff)',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: config.accentBg,
              color: config.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            <i className="fa-solid fa-coins"></i>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted, #64748b)', fontWeight: 700 }}>
              إجمالي {config.columnLabel} ({periodLabel})
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: config.color, marginTop: '2px' }}>
              {totals.totalShare.toLocaleString('en-US')} د.ل
            </div>
          </div>
        </div>

        <div
          style={{
            background: 'var(--panel, #ffffff)',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid var(--border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.1)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            <i className="fa-solid fa-calendar-check"></i>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted, #64748b)', fontWeight: 700 }}>الفترة المعتمدة</div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: 'var(--text, #0f172a)', marginTop: '2px' }}>
              {periodLabel} ({year})
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. نموذج المستند المعتمد المطابق تماماً لصورة النموذج ─── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '2px solid #0f172a',
          boxShadow: '0 6px 25px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          marginBottom: '25px',
        }}
      >
        {/* الترويسة العلوية */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 20px',
            borderBottom: '2px solid #0f172a',
            background: '#f8fafc',
            fontWeight: 800,
            fontSize: '14px',
            color: '#0f172a',
          }}
        >
          <div style={{ flex: 1, textAlign: 'right' }}>قسم الشؤون المالية والموارد البشرية</div>
          <div style={{ flex: 1, textAlign: 'center', fontSize: '17px', fontWeight: 900, color: '#1e3a8a' }}>
            المدار الليبي للتأمين
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>التاريخ: {reportDate}</div>
        </div>

        {/* الجدول الرئيسي */}
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              textAlign: 'center',
            }}
          >
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ width: '45px', padding: '10px 6px', border: '1px solid #334155', fontWeight: 800 }}>م</th>
                <th style={{ padding: '10px 8px', border: '1px solid #334155', fontWeight: 800, textAlign: 'right' }}>الاسم</th>
                <th style={{ width: '90px', padding: '10px 6px', border: '1px solid #334155', fontWeight: 800 }}>الجنسية</th>
                <th style={{ padding: '10px 8px', border: '1px solid #334155', fontWeight: 800 }}>المهنة</th>
                <th style={{ width: '105px', padding: '10px 6px', border: '1px solid #334155', fontWeight: 800 }}>بداية العمل</th>
                <th style={{ width: '115px', padding: '10px 6px', border: '1px solid #334155', fontWeight: 800 }}>{config.fileNumberLabel}</th>
                <th style={{ width: '115px', padding: '10px 6px', border: '1px solid #334155', fontWeight: 800 }}>الراتب الأساسي</th>
                <th style={{ width: '75px', padding: '10px 6px', border: '1px solid #334155', fontWeight: 800 }}>النسبة</th>
                <th style={{ width: '130px', padding: '10px 6px', border: '1px solid #334155', fontWeight: 800 }}>خلال شهر</th>
                <th style={{ width: '160px', padding: '10px 6px', border: '1px solid #334155', fontWeight: 800 }}>{config.columnLabel}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ padding: '50px', textAlign: 'center', color: 'var(--muted, #64748b)' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', color: '#1d4ed8' }}></i>
                    <p style={{ marginTop: '10px', fontWeight: 700 }}>جاري استخراج وتجميع بيانات الكشف...</p>
                  </td>
                </tr>
              ) : aggregatedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '50px', textAlign: 'center', color: 'var(--muted, #64748b)' }}>
                    <i className="fa-solid fa-folder-open" style={{ fontSize: '32px', marginBottom: '10px' }}></i>
                    <p style={{ fontWeight: 700 }}>لا توجد بيانات موظفين مسجلة لهذه الفترة</p>
                  </td>
                </tr>
              ) : (
                aggregatedRows.map((row, idx) => (
                  <tr
                    key={row.user.id || idx}
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    }}
                  >
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px 6px', fontWeight: 'bold' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px 10px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      {row.name}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px 6px' }}>{row.nationality}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px 6px' }}>{row.jobTitle}</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px 6px', fontFamily: 'monospace', fontSize: '13px' }}>
                      {row.startDate}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px 6px', fontFamily: 'monospace', fontSize: '13px' }}>
                      {row.fileNumber}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px 6px', fontWeight: 700 }}>
                      {row.baseSalary.toLocaleString('en-US')}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px 6px', fontWeight: 800, direction: 'ltr' }}>
                      %{row.percentage}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px 6px', fontSize: '12.5px', fontWeight: 600 }}>
                      {row.periodText}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '9px 8px', fontWeight: 900, color: '#0f172a' }}>
                      {row.totalShare.toLocaleString('en-US')}{' '}
                      {row.shareNote && (
                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>{row.shareNote}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f1f5f9', fontWeight: 900, fontSize: '14px' }}>
                <td colSpan={6} style={{ border: '1.5px solid #0f172a', padding: '12px', textAlign: 'center' }}>
                  الإجمالي العام
                </td>
                <td style={{ border: '1.5px solid #0f172a', padding: '12px' }}>
                  {totals.baseSalary.toLocaleString('en-US')} د.ل
                </td>
                <td colSpan={2} style={{ border: '1.5px solid #0f172a', padding: '12px' }}>
                  -
                </td>
                <td style={{ border: '1.5px solid #0f172a', padding: '12px', color: '#b91c1c', fontSize: '15px' }}>
                  {totals.totalShare.toLocaleString('en-US')} د.ل
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* ─── قسم ملاحظة وتوضيح ─── */}
        <div style={{ borderTop: '2px solid #0f172a', background: '#ffffff' }}>
          <div
            style={{
              padding: '10px 15px',
              textAlign: 'center',
              fontWeight: 900,
              fontSize: '17px',
              color: '#0f172a',
              background: '#e2e8f0',
              borderBottom: '1.5px solid #0f172a',
            }}
          >
            ملاحظه وتوضيح
          </div>

          <div
            style={{
              padding: '8px 15px',
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '14px',
              color: '#1e293b',
              background: '#f8fafc',
              borderBottom: '1px solid #0f172a',
            }}
          >
            حصة {config.entityFullName} من مرتبات الموظفين للعام {year}
          </div>

          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}
          >
            <tbody>
              {periodClarifications.map((item, idx) => (
                <tr
                  key={item.id}
                  onClick={() => {
                    if (item.periodKey === 'month') {
                      setPeriodType('month');
                      setSelectedMonth(1);
                    } else {
                      setPeriodType(item.periodKey as PeriodType);
                    }
                  }}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  title="انقر لتصفية الكشف الرئيسي على هذه الفترة مباشرة"
                >
                  <td
                    style={{
                      padding: '8px 20px',
                      borderBottom: '1px solid #e2e8f0',
                      fontWeight: 700,
                      color: '#1e293b',
                      textAlign: 'right',
                    }}
                  >
                    <i
                      className="fa-solid fa-arrow-turn-down-left"
                      style={{ marginLeft: '8px', color: '#94a3b8', fontSize: '11px' }}
                    ></i>
                    {item.label}
                  </td>
                  <td
                    style={{
                      width: '120px',
                      padding: '8px 12px',
                      borderBottom: '1px solid #e2e8f0',
                      textAlign: 'center',
                      fontWeight: 800,
                      color: '#0f172a',
                    }}
                  >
                    {year}
                  </td>
                  <td
                    style={{
                      width: '180px',
                      padding: '8px 16px',
                      borderBottom: '1px solid #e2e8f0',
                      textAlign: 'center',
                      fontWeight: 900,
                      color: '#1e3a8a',
                    }}
                  >
                    {item.share.toLocaleString('en-US')} د.ل
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
