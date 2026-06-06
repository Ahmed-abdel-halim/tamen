import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';

interface RentalVoucher {
  id: number;
  owner_name: string;
  phone: string;
  national_id: string;
  notes?: string;
  records_count: number;
  records_sum_total_amount: number;
  created_at: string;
}

export default function RentalVouchersList() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState<RentalVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  // ═══ Filters ═══
  const [search, setSearch] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterMinRecords, setFilterMinRecords] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'owner_name' | 'total_amount' | 'records_count'>('created_at');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchVouchers(); }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/rental-vouchers`);
      if (res.ok) {
        const data = await res.json();
        setVouchers(data.data || []);
      }
    } catch {
      showToast('حدث خطأ أثناء جلب البيانات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف الإيجار العقاري هذا؟')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/rental-vouchers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('تم الحذف بنجاح', 'success');
        fetchVouchers();
      } else {
        showToast('حدث خطأ أثناء الحذف', 'error');
      }
    } catch {
      showToast('حدث خطأ في الاتصال بالسيرفر', 'error');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setFilterFromDate('');
    setFilterToDate('');
    setFilterMinRecords('');
    setSortBy('created_at');
    setSortDir('desc');
  };

  // ═══ Apply Filters + Sort ═══
  const filtered = useMemo(() => {
    let result = [...vouchers];

    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(v =>
        v.owner_name.toLowerCase().includes(q) ||
        v.phone.includes(q) ||
        v.national_id.includes(q)
      );
    }

    // Min amount
    if (filterMinAmount !== '') {
      result = result.filter(v => (v.records_sum_total_amount || 0) >= Number(filterMinAmount));
    }

    // Max amount
    if (filterMaxAmount !== '') {
      result = result.filter(v => (v.records_sum_total_amount || 0) <= Number(filterMaxAmount));
    }

    // Min records
    if (filterMinRecords !== '') {
      result = result.filter(v => (v.records_count || 0) >= Number(filterMinRecords));
    }

    // Date from
    if (filterFromDate) {
      result = result.filter(v => new Date(v.created_at) >= new Date(filterFromDate));
    }

    // Date to
    if (filterToDate) {
      result = result.filter(v => new Date(v.created_at) <= new Date(filterToDate + 'T23:59:59'));
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortBy === 'owner_name') { aVal = a.owner_name; bVal = b.owner_name; }
      else if (sortBy === 'total_amount') { aVal = a.records_sum_total_amount || 0; bVal = b.records_sum_total_amount || 0; }
      else if (sortBy === 'records_count') { aVal = a.records_count || 0; bVal = b.records_count || 0; }
      else { aVal = new Date(a.created_at).getTime(); bVal = new Date(b.created_at).getTime(); }

      if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal, 'ar') : bVal.localeCompare(aVal, 'ar');
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [vouchers, search, filterMinAmount, filterMaxAmount, filterFromDate, filterToDate, filterMinRecords, sortBy, sortDir]);

  // ═══ Stats ═══
  const totalAmount = filtered.reduce((s, v) => s + (Number(v.records_sum_total_amount) || 0), 0);
  const totalRecords = filtered.reduce((s, v) => s + (Number(v.records_count) || 0), 0);
  const activeFilters = [search, filterMinAmount, filterMaxAmount, filterFromDate, filterToDate, filterMinRecords].filter(Boolean).length;

  // ═══ Excel Export (Flat Table) ═══
  const handleExport = async () => {
    if (filtered.length === 0) { showToast('لا توجد بيانات للتصدير', 'error'); return; }
    setExportLoading(true);
    showToast('جاري تجهيز ملف الإكسيل المتميز...', 'success');
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    try {
      // جلب التفاصيل الكاملة لكل وثيقة
      const details = await Promise.all(
        filtered.map(v => fetch(`${API_BASE_URL}/rental-vouchers/${v.id}`).then(r => r.json()).then(d => d.data))
      );

      const columns = [
        { header: '#', key: 'index', width: 8 },
        { header: 'اسم صاحب العقار', key: 'owner_name', width: 30 },
        { header: 'رقم الهاتف', key: 'phone', width: 15 },
        { header: 'الرقم الوطني', key: 'national_id', width: 20 },
        { header: 'الملاحظات', key: 'notes', width: 25 },
        { header: 'تاريخ الإضافة', key: 'created_at', width: 15 },
        { header: 'من تاريخ', key: 'from_date', width: 15 },
        { header: 'الى تاريخ', key: 'to_date', width: 15 },
        { header: 'عدد الشقق', key: 'apartments', width: 12 },
        { header: 'اسم المستلم', key: 'recipient', width: 25 },
        { header: 'المبلغ (د.ل)', key: 'amount', width: 15 },
      ];

      const data: any[] = [];
      let rowNum = 1;

      details.forEach((voucher: any) => {
        const records = voucher.records || [];
        const voucherTotal = records.reduce((s: number, r: any) => s + parseFloat(r.total_amount || 0), 0);

        if (records.length === 0) {
          data.push({
            index: rowNum++,
            owner_name: voucher.owner_name,
            phone: voucher.phone,
            national_id: voucher.national_id,
            notes: voucher.notes || '-',
            created_at: new Date(voucher.created_at).toLocaleDateString('ar-LY'),
            from_date: '-',
            to_date: '-',
            apartments: '-',
            recipient: '-',
            amount: '-',
          });
        } else {
          records.forEach((rec: any, rIdx: number) => {
            data.push({
              index: rIdx === 0 ? rowNum++ : '',
              owner_name: rIdx === 0 ? voucher.owner_name : '',
              phone: rIdx === 0 ? voucher.phone : '',
              national_id: rIdx === 0 ? voucher.national_id : '',
              notes: rIdx === 0 ? (voucher.notes || '-') : '',
              created_at: rIdx === 0 ? new Date(voucher.created_at).toLocaleDateString('ar-LY') : '',
              from_date: rec.from_date ? new Date(rec.from_date).toLocaleDateString('ar-LY') : '-',
              to_date: rec.to_date ? new Date(rec.to_date).toLocaleDateString('ar-LY') : '-',
              apartments: rec.apartments_count + ' شقة',
              recipient: rec.recipient_name,
              amount: parseFloat(rec.total_amount || 0).toLocaleString() + ' د.ل',
            });
          });

          // Add a summary row for this voucher
          data.push({
            index: '',
            owner_name: `إجمالي ${voucher.owner_name}`,
            phone: '',
            national_id: '',
            notes: '',
            created_at: '',
            from_date: '',
            to_date: '',
            apartments: '',
            recipient: '',
            amount: voucherTotal.toLocaleString() + ' د.ل',
          });
        }
      });

      // Grand total row
      data.push({
        index: '',
        owner_name: 'الإجمالي الكلي لجميع الوثائق',
        phone: '',
        national_id: '',
        notes: '',
        created_at: '',
        from_date: '',
        to_date: '',
        apartments: `${totalRecords} سجل`,
        recipient: '',
        amount: totalAmount.toLocaleString() + ' د.ل',
      });

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - سجل الإيجارات العقارية',
        subtitle: `إجمالي المبالغ: ${totalAmount.toLocaleString()} د.ل - عدد الوثائق: ${filtered.length} | إجمالي السجلات: ${totalRecords}`,
        columns,
        data,
        fileName: 'الإيجارات_العقارية',
        qrData: `الإيجارات العقارية - شركة المدار الليبي\nعدد الوثائق: ${filtered.length}\nإجمالي: ${totalAmount.toLocaleString()} د.ل\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير السجل الكامل بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handlePrintVoucher = async (id: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/rental-vouchers/${id}`);
      if (!res.ok) throw new Error();
      const { data: voucher } = await res.json();
      
      const totalAmount = (voucher.records || []).reduce((sum: number, r: any) => sum + parseFloat(r.total_amount || 0), 0);
      const qrData = `ورقة إيجار رقم: ${voucher.id}\nالمالك: ${voucher.owner_name}\nالهاتف: ${voucher.phone}\nالإجمالي: ${totalAmount} د.ل`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

      const printWindow = window.open('', '', 'width=1200,height=900');
      if (!printWindow) return;

      printWindow.document.write(`
        <html dir="rtl">
        <head>
          <title>ورقة إيجار #${voucher.id} - ${voucher.owner_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
            @media print { @page { margin: 10mm; size: A4; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
            body { font-family: 'Cairo', sans-serif; margin: 0; padding: 10px; color: #000; background: #fff; }
            .main-border { border: 2px solid #000; padding: 15px; min-height: 250mm; position: relative; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .header-table td { border: 1px solid #000; padding: 10px; vertical-align: middle; }
            .logo-cell { width: 20%; text-align: center; }
            .title-cell { width: 60%; text-align: center; background: #f8f9fa; }
            .qr-cell { width: 20%; text-align: center; }
            .doc-title { font-size: 20px; font-weight: 900; margin: 0; color: #000; }
            .section-title { background: #e2e8f0; border: 1.5px solid #000; padding: 6px 15px; font-weight: 900; font-size: 15px; margin: 20px 0 0 0; text-align: center; }
            .data-table { width: 100%; border-collapse: collapse; }
            .data-table td { border: 1px solid #000; padding: 8px 12px; font-size: 13px; }
            .label { background: #f8f9fa; font-weight: 800; width: 25%; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: -1px; }
            .items-table th, .items-table td { border: 1px solid #000; padding: 8px; text-align: center; font-size: 13px; }
            .items-table th { background: #f1f5f9; font-weight: 900; }
            .total-row { background: #f8f9fa; font-weight: 900; font-size: 15px; }
            .signature-box { margin-top: 40px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .sig-item { border: 1.5px solid #000; padding: 15px 10px; text-align: center; }
            .sig-line { border-top: 1px dashed #000; margin-top: 35px; padding-top: 5px; font-size: 12px; font-weight: 800; }
            .footer-meta { position: absolute; bottom: 20px; left: 20px; right: 20px; text-align: center; font-size: 10px; color: #666; border-top: 2px solid #000; padding-top: 10px; }
          </style>
        </head>
        <body onload="window.print(); window.onafterprint = () => window.close();">
          <div class="main-border">
            <table class="header-table">
              <tr>
                <td class="logo-cell"><img src="/img/logo.png" style="width: 80px;"></td>
                <td class="title-cell">
                  <div style="font-size: 14px; font-weight: 800; margin-bottom: 5px;">شركة المدار الليبي للتأمين</div>
                  <h1 class="doc-title">إيـصـال سـداد إيـجـار عـقـاري</h1>
                  <div style="font-size: 12px; margin-top: 5px;">إدارة العقارات والتحصيل</div>
                </td>
                <td class="qr-cell"><img src="${qrApiUrl}" style="width: 80px;"></td>
              </tr>
            </table>
            <div class="section-title">بيانات صاحب العقار</div>
            <table class="data-table">
              <tr><td class="label">اسم صاحب العقار:</td><td>${voucher.owner_name}</td><td class="label">رقم الإيصال:</td><td>${voucher.id}</td></tr>
              <tr><td class="label">رقم الهاتف:</td><td>${voucher.phone}</td><td class="label">الرقم الوطني:</td><td>${voucher.national_id}</td></tr>
              <tr><td class="label">تاريخ الإصدار:</td><td>${new Date(voucher.created_at).toLocaleDateString('ar-LY')}</td><td class="label">إجمالي المبلغ:</td><td style="font-weight: 900;">${totalAmount.toLocaleString()} د.ل</td></tr>
            </table>
            <div class="section-title">تفاصيل دفعات الإيجار</div>
            <table class="items-table">
              <thead><tr><th>#</th><th>الفترة من</th><th>الفترة إلى</th><th>الوحدات</th><th>المستلم</th><th>القيمة</th></tr></thead>
              <tbody>
                ${(voucher.records || []).map((rec: any, idx: number) => `
                  <tr><td>${idx + 1}</td><td>${rec.from_date ? new Date(rec.from_date).toLocaleDateString('ar-LY') : '-'}</td><td>${rec.to_date ? new Date(rec.to_date).toLocaleDateString('ar-LY') : '-'}</td><td>${rec.apartments_count}</td><td>${rec.recipient_name}</td><td style="font-weight: bold;">${parseFloat(rec.total_amount).toLocaleString()} د.ل</td></tr>
                `).join('')}
                <tr class="total-row"><td colspan="5" style="text-align: left; padding-left: 20px;">الإجمالي الكلي:</td><td>${totalAmount.toLocaleString()} د.ل</td></tr>
              </tbody>
            </table>
            <div class="section-title">ملاحظات إضافية</div>
            <div style="border: 1px solid #000; padding: 10px; min-height: 50px; font-size: 13px;">${voucher.notes || 'لا توجد ملاحظات'}</div>
            <div class="signature-box">
              <div class="sig-item"><div style="font-weight: 900;">توقيع المحصل</div><div class="sig-line">توقيع / ختم</div></div>
              <div class="sig-item"><div style="font-weight: 900;">توقيع المستأجر</div><div class="sig-line">توقيع / بصمة</div></div>
            </div>
            <div class="footer-meta">تم استخراج هذا المستند آلياً من نظام المدار الليبي للتأمين - بتاريخ ${new Date().toLocaleString('ar-LY')}</div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch {
      showToast('حدث خطأ أثناء طباعة الوصل', 'error');
    }
  };

  const handlePrintReport = () => {
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>تقرير سجل الإيجارات العقارية</title>
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
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: right; font-size: 13px; }
          th { background: #f8fafc; font-weight: 900; color: #0ea5e9; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          .total-row { background: #f0f9ff; font-weight: 900; }
        </style>
      </head>
      <body onload="setTimeout(() => { window.print(); window.close(); }, 500);">
        <div class="header">
          <div>
            <h1>شركة المدار الليبي للتأمين</h1>
            <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #334155;">تقرير سجل الإيجارات العقارية</p>
          </div>
          <img src="/img/logo.png" style="height: 70px;">
        </div>
        <div class="meta-info">
          <div>
            ${filterFromDate || filterToDate ? `<strong>الفترة:</strong> من (${filterFromDate || 'البداية'}) إلى (${filterToDate || 'الآن'})` : '<strong>الفترة:</strong> كل السجلات'}
          </div>
          <div>
            <strong>تاريخ التقرير:</strong> ${new Date().toLocaleString('ar-LY')} &nbsp;|&nbsp; <strong>عدد الوثائق:</strong> ${filtered.length} &nbsp;|&nbsp; <strong>إجمالي المبالغ:</strong> ${totalAmount.toLocaleString()} د.ل
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>اسم صاحب العقار</th>
              <th>رقم الهاتف</th>
              <th>الرقم الوطني</th>
              <th>عدد السجلات</th>
              <th>إجمالي المبالغ</th>
              <th>تاريخ الإضافة</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((v, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td style="font-weight: 700;">${v.owner_name}</td>
                <td>${v.phone}</td>
                <td>${v.national_id}</td>
                <td>${v.records_count}</td>
                <td style="font-weight: 700;">${(v.records_sum_total_amount || 0).toLocaleString()} د.ل</td>
                <td>${new Date(v.created_at).toLocaleDateString('ar-LY')}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4">المجموع الكلي</td>
              <td>${totalRecords}</td>
              <td>${totalAmount.toLocaleString()} د.ل</td>
              <td></td>
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
  };



  const SortIcon = ({ field }: { field: typeof sortBy }) => (
    <span style={{ marginRight: '4px', opacity: sortBy === field ? 1 : 0.3, cursor: 'pointer' }}
      onClick={() => { if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortBy(field); setSortDir('desc'); } }}>
      {sortBy === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <section className="users-management">
      {/* ── Header ── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', background: 'var(--panel)', borderRadius: '12px',
        marginBottom: '20px', border: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
          <i className="fa-solid fa-building" style={{ marginLeft: '10px', color: '#0ea5e9' }}></i>
          سجل الإيجارات العقارية
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handlePrintReport}
            className="secondary"
            style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', border: '1px solid var(--border)', background: '#0ea5e9', color: '#fff' }}
          >
            <i className="fa-solid fa-print"></i> طباعة التقرير
          </button>
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="secondary"
            style={{ padding: '10px 18px', borderRadius: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', border: '1px solid var(--border)', opacity: exportLoading ? 0.7 : 1 }}
          >
            {exportLoading
              ? <><i className="fa-solid fa-spinner fa-spin" style={{ color: '#166534' }}></i> جاري التجهيز...</>
              : <><i className="fa-solid fa-file-excel" style={{ color: '#166534' }}></i> تصدير إكسيل كامل</>
            }
          </button>
          <button
            onClick={() => navigate('/reports/rental-vouchers/create')}
            className="primary"
            style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fa-solid fa-plus"></i>
            إضافة إيجار عقاري جديد
          </button>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'إجمالي الوثائق', value: `${filtered.length}`, sub: `من ${vouchers.length}`, color: '#0ea5e9', icon: 'fa-file-contract' },
          { label: 'إجمالي المبالغ', value: `${totalAmount.toLocaleString()}`, sub: 'دينار ليبي', color: '#22c55e', icon: 'fa-coins' },
          { label: 'إجمالي السجلات', value: `${totalRecords}`, sub: 'سجل إيجار', color: '#f59e0b', icon: 'fa-list-ol' },
          { label: 'متوسط المبلغ', value: filtered.length > 0 ? `${Math.round(totalAmount / filtered.length).toLocaleString()}` : '0', sub: 'د.ل / وثيقة', color: '#a855f7', icon: 'fa-chart-line' },
        ].map((stat, i) => (
          <div key={i} style={{ background: 'var(--panel)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${stat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fa-solid ${stat.icon}`} style={{ color: stat.color, fontSize: '15px' }}></i>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: '12px' }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Filter Bar ── */}
      <div style={{ background: 'var(--panel)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '18px', overflow: 'hidden' }}>
        {/* Search + Toggle */}
        <div style={{ display: 'flex', gap: '10px', padding: '14px 16px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '13px' }}></i>
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الهاتف أو الرقم الوطني..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 40px 10px 14px', borderRadius: '9px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>
          <button
            onClick={() => setShowFilters(p => !p)}
            style={{
              padding: '10px 16px', borderRadius: '9px', border: '1px solid var(--border)',
              background: showFilters ? '#0ea5e9' : 'var(--input-bg)', color: showFilters ? '#fff' : 'var(--text)',
              cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap', transition: 'all .2s'
            }}
          >
            <i className="fa-solid fa-sliders"></i>
            فلاتر متقدمة
            {activeFilters > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                {activeFilters}
              </span>
            )}
          </button>
          {activeFilters > 0 && (
            <button onClick={resetFilters} style={{ padding: '10px 14px', borderRadius: '9px', border: '1px solid #fca5a5', background: '#fef2f2', color: '#991b1b', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <i className="fa-solid fa-xmark"></i> مسح الفلاتر
            </button>
          )}
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '16px', background: 'var(--input-bg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
              {/* Amount Range */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '6px' }}>
                  <i className="fa-solid fa-coins" style={{ marginLeft: '5px', color: '#22c55e' }}></i>
                  الحد الأدنى للمبلغ (د.ل)
                </label>
                <input
                  type="number" min="0" value={filterMinAmount}
                  onChange={e => setFilterMinAmount(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '6px' }}>
                  <i className="fa-solid fa-coins" style={{ marginLeft: '5px', color: '#f59e0b' }}></i>
                  الحد الأقصى للمبلغ (د.ل)
                </label>
                <input
                  type="number" min="0" value={filterMaxAmount}
                  onChange={e => setFilterMaxAmount(e.target.value)}
                  placeholder="غير محدود"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              {/* Min Records */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '6px' }}>
                  <i className="fa-solid fa-list-ol" style={{ marginLeft: '5px', color: '#0ea5e9' }}></i>
                  الحد الأدنى لعدد السجلات
                </label>
                <input
                  type="number" min="0" value={filterMinRecords}
                  onChange={e => setFilterMinRecords(e.target.value)}
                  placeholder="0"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              {/* Date Range */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '6px' }}>
                  <i className="fa-solid fa-calendar-days" style={{ marginLeft: '5px', color: '#a855f7' }}></i>
                  تاريخ الإضافة (من)
                </label>
                <input
                  type="date" value={filterFromDate}
                  onChange={e => setFilterFromDate(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '6px' }}>
                  <i className="fa-solid fa-calendar-days" style={{ marginLeft: '5px', color: '#a855f7' }}></i>
                  تاريخ الإضافة (الى)
                </label>
                <input
                  type="date" value={filterToDate}
                  onChange={e => setFilterToDate(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>
              {/* Sort */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--muted)', marginBottom: '6px' }}>
                  <i className="fa-solid fa-sort" style={{ marginLeft: '5px', color: '#64748b' }}></i>
                  ترتيب حسب
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as any)}
                    style={{ flex: 1, padding: '9px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', fontSize: '13px' }}
                  >
                    <option value="created_at">تاريخ الإضافة</option>
                    <option value="owner_name">اسم المالك</option>
                    <option value="total_amount">إجمالي المبلغ</option>
                    <option value="records_count">عدد السجلات</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                    style={{ padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel)', color: 'var(--text)', cursor: 'pointer', fontSize: '14px' }}
                    title={sortDir === 'asc' ? 'تصاعدي' : 'تنازلي'}
                  >
                    {sortDir === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Result Info */}
      {activeFilters > 0 && (
        <div style={{ padding: '8px 14px', background: '#e0f2fe', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-filter"></i>
          تعرض <strong>{filtered.length}</strong> من أصل <strong>{vouchers.length}</strong> وثيقة
        </div>
      )}

      {/* ── Table ── */}
      <div className="users-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>#</th>
                <th>
                  اسم صاحب العقار
                  <SortIcon field="owner_name" />
                </th>
                <th>رقم الهاتف</th>
                <th>الرقم الوطني</th>
                <th>
                  عدد السجلات
                  <SortIcon field="records_count" />
                </th>
                <th>
                  إجمالي المبالغ
                  <SortIcon field="total_amount" />
                </th>
                <th>
                  تاريخ الإضافة
                  <SortIcon field="created_at" />
                </th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '50px', color: 'var(--muted)' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '28px' }}></i>
                    <div style={{ marginTop: '10px', fontSize: '13px' }}>جاري التحميل...</div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '50px', color: 'var(--muted)' }}>
                    <i className="fa-solid fa-inbox" style={{ fontSize: '36px', marginBottom: '10px', display: 'block', opacity: 0.3 }}></i>
                    {activeFilters > 0 ? 'لا توجد نتائج مطابقة للفلاتر المحددة' : 'لا توجد بيانات بعد'}
                  </td>
                </tr>
              ) : filtered.map((v, idx) => (
                <tr key={v.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/reports/rental-vouchers/${v.id}`)}>
                  <td style={{ fontWeight: 'bold', color: '#0ea5e9' }}>{idx + 1}</td>
                  <td style={{ fontWeight: 'bold' }}>{v.owner_name}</td>
                  <td style={{ direction: 'ltr', textAlign: 'right' }}>{v.phone}</td>
                  <td>{v.national_id}</td>
                  <td>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 11px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                      {v.records_count || 0} سجل
                    </span>
                  </td>
                  <td style={{ color: '#22c55e', fontWeight: 'bold' }}>
                    {(Number(v.records_sum_total_amount) || 0).toLocaleString()} د.ل
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: '13px' }}>
                    {new Date(v.created_at).toLocaleDateString('ar-LY')}
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => handlePrintVoucher(v.id)}
                        style={{ background: '#f0f9ff', border: '1.5px solid #0ea5e9', padding: '7px 11px', borderRadius: '8px', cursor: 'pointer', color: '#0ea5e9' }}
                        title="طباعة الوصل"
                      ><i className="fa-solid fa-print"></i></button>
                      <button
                        onClick={() => navigate(`/reports/rental-vouchers/${v.id}`)}
                        style={{ background: '#e0f2fe', border: 'none', padding: '7px 11px', borderRadius: '8px', cursor: 'pointer', color: '#0369a1' }}
                        title="عرض التفاصيل"
                      ><i className="fa-solid fa-eye"></i></button>
                      <button
                        onClick={() => navigate(`/reports/rental-vouchers/${v.id}/edit`)}
                        style={{ background: '#fef9c3', border: 'none', padding: '7px 11px', borderRadius: '8px', cursor: 'pointer', color: '#a16207' }}
                        title="تعديل"
                      ><i className="fa-solid fa-pen-to-square"></i></button>
                      <button
                        onClick={() => handleDelete(v.id)}
                        style={{ background: '#fee2e2', border: 'none', padding: '7px 11px', borderRadius: '8px', cursor: 'pointer', color: '#991b1b' }}
                        title="حذف"
                      ><i className="fa-solid fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtered.length > 0 && !loading && (
              <tfoot>
                <tr style={{ background: 'var(--input-bg)', fontWeight: 'bold' }}>
                  <td colSpan={4} style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '13px' }}>
                    المجموع ({filtered.length} وثيقة)
                  </td>
                  <td style={{ color: '#0369a1', fontWeight: 'bold' }}>{totalRecords} سجل</td>
                  <td style={{ color: '#22c55e', fontWeight: '900', fontSize: '15px' }}>
                    {totalAmount.toLocaleString()} د.ل
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </section>
  );
}
