import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { showGlobalLoader, hideGlobalLoader } from './LoaderOverlay';

interface DebtRecord {
  id: number;
  agent_id: number;
  agency_name: string;
  agent_code?: string;
  agent_phone?: string;
  delay_reason?: string;
  selected_month?: number | string;
  selected_year?: number;
  month_sales?: number;
  month_commissions?: number;
  month_company_share?: number;
  month_paid?: number;
  month_debt?: number;
  total_sales?: number;
  total_commissions?: number;
  company_share?: number;
  total_paid?: number;
  total_debt: number;
  cumulative_debt?: number;
  past_overdue_debt?: number;
  current_month_debt?: number;
  last_payment_date: string;
  status: 'critical' | 'warning' | 'normal';
  notes: string;
}

const MONTHS_LIST = [
  { value: 'all', label: 'جميع الأشهر (إجمالي الديون التراكمية)' },
  { value: '1', label: 'شهر 1 - يناير' },
  { value: '2', label: 'شهر 2 - فبراير' },
  { value: '3', label: 'شهر 3 - مارس' },
  { value: '4', label: 'شهر 4 - أبريل' },
  { value: '5', label: 'شهر 5 - مايو' },
  { value: '6', label: 'شهر 6 - يونيو' },
  { value: '7', label: 'شهر 7 - يوليو' },
  { value: '8', label: 'شهر 8 - أغسطس' },
  { value: '9', label: 'شهر 9 - سبتمبر' },
  { value: '10', label: 'شهر 10 - أكتوبر' },
  { value: '11', label: 'شهر 11 - نوفمبر' },
  { value: '12', label: 'شهر 12 - ديسمبر' },
];

const PRESET_REASONS = [
  'وعد بالسداد قريباً',
  'بانتظار سيولة مصرفية',
  'بانتظار تحصيل شيكات',
  'مراجعة وتدقيق الفواتير',
  'تم الاتفاق على جدولة السداد',
  'تأخر تحصيل الأقساط من الزبائن'
];

export default function OutstandingDebts() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Month & Year Filter states
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Search & Sorting & Size states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [debtSizeFilter, setDebtSizeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('highest_debt');

  // Modal for adding / updating debt delay note
  const [noteModal, setNoteModal] = useState<{
    agentId: number;
    agencyName: string;
    phone?: string;
    totalDebt: number;
    currentNote: string;
  } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchDebts();
  }, [selectedMonth, selectedYear]);

  const fetchDebts = async () => {
    setLoading(true);
    showGlobalLoader('جاري جلب بيانات المديونيات...');
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const queryParams = new URLSearchParams({
        month: selectedMonth,
        year: String(selectedYear)
      });

      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}/reports/outstanding-debts?${queryParams.toString()}`, { headers });
      } catch (primaryErr) {
        console.warn('Primary API endpoint failed, trying fallback /api endpoint...', primaryErr);
        response = await fetch(`/api/reports/outstanding-debts?${queryParams.toString()}`, { headers });
      }

      if (response.ok) {
        const rawData: DebtRecord[] = await response.json();
        setDebts(rawData);
      } else {
        const errText = await response.text().catch(() => '');
        console.error('Error response fetching debts:', response.status, errText);
        showToast('حدث خطأ أثناء جلب مديونيات الوكلاء', 'error');
      }
    } catch (error) {
      console.error('Network error fetching debts:', error);
      showToast('تعذر الاتصال بالسيرفر للمديونيات', 'error');
    } finally {
      setLoading(false);
      hideGlobalLoader();
    }
  };

  const openNoteModal = (debt: DebtRecord) => {
    const existing = debt.delay_reason || debt.notes || '';
    setNoteModal({
      agentId: debt.agent_id,
      agencyName: debt.agency_name,
      phone: debt.agent_phone,
      totalDebt: debt.total_debt,
      currentNote: existing
    });
    setNoteText(existing);
  };

  const handleSaveNote = async () => {
    if (!noteModal) return;
    setSavingNote(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/reports/outstanding-debts/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          branch_agent_id: noteModal.agentId,
          note: noteText,
          year: selectedYear,
          month: selectedMonth
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('تم حفظ سبب تأخير الديون والملاحظة بنجاح', 'success');
        // Update local state instantly
        setDebts(prev =>
          prev.map(d =>
            d.agent_id === noteModal.agentId
              ? { ...d, delay_reason: noteText, notes: noteText }
              : d
          )
        );
        setNoteModal(null);
      } else {
        showToast(data.message || 'فشل في حفظ الملاحظة', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('تعذر الاتصال بالسيرفر لحفظ الملاحظة', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast(`تم نسخ رقم الهاتف: ${text}`, 'success');
  };

  const getCleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/[^\d+]/g, '');
  };

  const getStatusBadge = (debt: DebtRecord) => {
    if (debt.status === 'critical') {
      return {
        bg: '#fee2e2',
        color: '#991b1b',
        text: `خطير (متأخرات: ${(debt.past_overdue_debt ?? debt.total_debt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل)`
      };
    }
    if (debt.status === 'warning') {
      return {
        bg: '#fef3c7',
        color: '#92400e',
        text: `تنبيه (متأخرات: ${(debt.past_overdue_debt ?? debt.total_debt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل)`
      };
    }
    if ((debt.current_month_debt ?? 0) > 0) {
      return {
        bg: '#e0f2fe',
        color: '#0369a1',
        text: `طبيعي (إنتاج الشهر: ${(debt.current_month_debt ?? debt.total_debt).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل)`
      };
    }
    return { bg: '#dcfce7', color: '#166534', text: 'طبيعي (خالص الحساب)' };
  };

  // Dynamic summary calculations
  const totalOutstanding = debts.reduce((sum, d) => sum + (d.total_debt > 0 ? d.total_debt : 0), 0);
  const totalCritical = debts.filter(d => d.status === 'critical').reduce((sum, d) => sum + d.total_debt, 0);
  const totalNormalAgents = debts.filter(d => d.status === 'normal').length;

  // Filtered & Sorted debts
  const filteredDebts = debts
    .filter(debt => {
      // 1. Search Filter (agency name, code, or phone)
      const matchesSearch =
        debt.agency_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        debt.agent_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        debt.agent_phone?.includes(searchTerm);

      // 2. Status Filter
      const matchesStatus = statusFilter === 'all' || debt.status === statusFilter;

      // 3. Debt Size Filter
      let matchesDebtSize = true;
      if (debtSizeFilter === 'high') {
        matchesDebtSize = debt.total_debt > 10000;
      } else if (debtSizeFilter === 'medium') {
        matchesDebtSize = debt.total_debt >= 5000 && debt.total_debt <= 10000;
      } else if (debtSizeFilter === 'low') {
        matchesDebtSize = debt.total_debt < 5000;
      }

      return matchesSearch && matchesStatus && matchesDebtSize;
    })
    .sort((a, b) => {
      // 4. Sorting logic
      if (sortBy === 'highest_debt') {
        return b.total_debt - a.total_debt;
      } else if (sortBy === 'lowest_debt') {
        return a.total_debt - b.total_debt;
      } else if (sortBy === 'latest_payment') {
        const dateA = a.last_payment_date === 'لا يوجد' ? '' : a.last_payment_date;
        const dateB = b.last_payment_date === 'لا يوجد' ? '' : b.last_payment_date;
        return dateB.localeCompare(dateA);
      }
      return 0;
    });

  const isMonthSelected = selectedMonth !== 'all';
  const selectedMonthObj = MONTHS_LIST.find(m => m.value === selectedMonth);

  return (
    <section className="users-management">
      <div className="users-breadcrumb" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 22px',
        background: 'var(--panel)',
        borderRadius: '14px',
        marginBottom: '20px',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            boxShadow: '0 4px 12px rgba(239,68,68,0.3)'
          }}>
            <i className="fa-solid fa-hand-holding-dollar" />
          </div>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text)', display: 'block' }}>
              متابعة الديون والمديونيات المستحقة
            </span>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
              {isMonthSelected
                ? `عرض ديون ${selectedMonthObj?.label} لسنة ${selectedYear} (${filteredDebts.length} وكيل)`
                : `عرض إجمالي الديون التراكمية لكافة الشهور (${filteredDebts.length} وكيل)`}
            </span>
          </div>
        </div>

        <button
          className="primary"
          onClick={fetchDebts}
          style={{
            padding: '9px 18px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 800,
            fontSize: '13px'
          }}
        >
          <i className="fa-solid fa-arrows-rotate" />
          تحديث الكشف
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--panel)', padding: '18px 20px', borderRadius: '15px', border: '1px solid var(--border)', borderTop: '4px solid #ef4444' }}>
          <div style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
            {isMonthSelected ? `إجمالي ديون شهر ${selectedMonth}` : 'إجمالي الديون القائمة التراكمية'}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#ef4444' }}>
            {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '14px' }}>د.ل</span>
          </div>
        </div>

        <div style={{ background: 'var(--panel)', padding: '18px 20px', borderRadius: '15px', border: '1px solid var(--border)', borderTop: '4px solid #f59e0b' }}>
          <div style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>ديون متأخرة خطيرة (&gt; 10 آلاف)</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#f59e0b' }}>
            {totalCritical.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '14px' }}>د.ل</span>
          </div>
        </div>

        <div style={{ background: 'var(--panel)', padding: '18px 20px', borderRadius: '15px', border: '1px solid var(--border)', borderTop: '4px solid #10b981' }}>
          <div style={{ color: 'var(--muted)', fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>وكلاء بمديونية عادية / مسددة</div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#10b981' }}>{totalNormalAgents} <span style={{ fontSize: '14px' }}>وكيل</span></div>
        </div>
      </div>

      {/* Filtering and Search Controls Bar */}
      <div style={{
        background: 'var(--panel)',
        padding: '18px 20px',
        borderRadius: '14px',
        marginBottom: '20px',
        border: '1px solid var(--border)',
        display: 'flex',
        gap: '14px',
        alignItems: 'center',
        flexWrap: 'wrap',
        direction: 'rtl'
      }}>
        {/* Month Selector: خيارات ديون الشهر نفسه */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 800, color: '#0284c7', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <i className="fa-solid fa-calendar-days" />
            ديون الشهر:
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: '9px 14px',
              borderRadius: '9px',
              border: '2px solid #0284c7',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              outline: 'none',
              fontFamily: "'Cairo',sans-serif",
            }}
          >
            {MONTHS_LIST.map(m => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--muted)' }}>السنة:</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            style={{
              padding: '9px 12px',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              fontFamily: "'Cairo',sans-serif",
            }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div style={{ flex: '1', minWidth: '220px', position: 'relative' }}>
          <input
            type="text"
            placeholder="ابحث بالاسم، الكود، أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 38px 9px 14px',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              fontSize: '13px',
              outline: 'none',
              fontFamily: "'Cairo',sans-serif",
            }}
          />
          <i className="fa-solid fa-magnifying-glass" style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
            fontSize: '13px'
          }} />
        </div>

        {/* Filter by Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>الحالة:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: "'Cairo',sans-serif",
            }}
          >
            <option value="all">الكل</option>
            <option value="critical">خطير (متجاوز)</option>
            <option value="warning">تنبيه</option>
            <option value="normal">طبيعي</option>
          </select>
        </div>

        {/* Filter by Debt Size */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>حجم الدين:</label>
          <select
            value={debtSizeFilter}
            onChange={(e) => setDebtSizeFilter(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: "'Cairo',sans-serif",
            }}
          >
            <option value="all">الكل</option>
            <option value="high">أكثر من 10,000 د.ل</option>
            <option value="medium">بين 5,000 و 10,000 د.ل</option>
            <option value="low">أقل من 5,000 د.ل</option>
          </select>
        </div>

        {/* Sort By */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)' }}>ترتيب:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
              outline: 'none',
              fontFamily: "'Cairo',sans-serif",
            }}
          >
            <option value="highest_debt">المديونية الأعلى</option>
            <option value="lowest_debt">المديونية الأقل</option>
            <option value="latest_payment">تاريخ آخر دفعة (الأحدث)</option>
          </select>
        </div>
      </div>

      {/* Main Debts Table Card */}
      <div className="users-card" style={{ padding: '0', overflow: 'hidden', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <table className="users-table" style={{ width: '100%', fontSize: '12.5px' }}>
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>#</th>
              <th>اسم الوكيل / الجهة</th>
              <th style={{ minWidth: '150px' }}>رقم هاتف الوكيل</th>
              <th>حصة الشركة {isMonthSelected ? `(شهر ${selectedMonth})` : 'المستحقة'}</th>
              <th>المقبوضات (المدفوع)</th>
              <th>المديونية المستحقة {isMonthSelected ? `(شهر ${selectedMonth})` : 'القائمة'}</th>
              <th style={{ minWidth: '220px' }}>سبب تأخير الديون / الملاحظة</th>
              <th>تاريخ آخر دفعة</th>
              <th>الحالة</th>
              <th style={{ textAlign: 'center' }}>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <i className="fa-solid fa-spinner fa-spin fa-2x" />
                    <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>جاري جلب بيانات المديونيات...</span>
                  </div>
                </td>
              </tr>
            ) : filteredDebts.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '40px' }}>
                  {isMonthSelected
                    ? `لا توجد مديونيات مسجلة في شهر ${selectedMonth} لسنة ${selectedYear} مطابقة للبحث`
                    : 'لا توجد مديونيات مطابقة للبحث أو الفلتر حالياً'}
                </td>
              </tr>
            ) : (
              filteredDebts.map((debt, index) => {
                const badge = getStatusBadge(debt);
                const companyShare = debt.company_share ?? debt.total_debt;
                const totalPaid = debt.total_paid ?? 0;
                const phone = debt.agent_phone || '';
                const cleanPhone = getCleanPhone(phone);
                const noteDisplay = debt.delay_reason || debt.notes || '';

                return (
                  <tr key={debt.id}>
                    <td style={{ textAlign: 'center', color: 'var(--muted)', fontWeight: 700 }}>
                      {index + 1}
                    </td>

                    {/* Agent Name & Code */}
                    <td style={{ fontWeight: 800 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ color: 'var(--text)', fontSize: '13px' }}>{debt.agency_name}</span>
                        {debt.agent_code && (
                          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                            كود: <span style={{ direction: 'ltr', display: 'inline-block' }}>{debt.agent_code}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Agent Phone with Direct Call, WhatsApp & Copy */}
                    <td>
                      {phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' }}>
                          <span
                            style={{
                              direction: 'ltr',
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '12px',
                              color: '#0284c7',
                              background: 'rgba(2,132,199,0.08)',
                              padding: '3px 7px',
                              borderRadius: '6px',
                              border: '1px solid rgba(2,132,199,0.2)'
                            }}
                          >
                            {phone}
                          </span>

                          <button
                            onClick={() => copyToClipboard(phone)}
                            title="نسخ رقم الهاتف"
                            style={{
                              padding: '4px 6px',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'var(--card-bg)',
                              cursor: 'pointer',
                              color: 'var(--muted)',
                              fontSize: '11px'
                            }}
                          >
                            <i className="fa-solid fa-copy" />
                          </button>

                          <a
                            href={`tel:${cleanPhone}`}
                            title="اتصال هاتفي مباشر"
                            style={{
                              padding: '4px 6px',
                              borderRadius: '6px',
                              background: '#0284c7',
                              color: 'white',
                              textDecoration: 'none',
                              fontSize: '11px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <i className="fa-solid fa-phone" />
                          </a>

                          <a
                            href={`https://wa.me/${cleanPhone.startsWith('0') ? '218' + cleanPhone.substring(1) : cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="مراسلة عبر واتساب"
                            style={{
                              padding: '4px 6px',
                              borderRadius: '6px',
                              background: '#25D366',
                              color: 'white',
                              textDecoration: 'none',
                              fontSize: '11px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <i className="fa-brands fa-whatsapp" />
                          </a>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '11px' }}>غير مسجل</span>
                      )}
                    </td>

                    {/* Company Share */}
                    <td style={{ fontWeight: 800, color: 'var(--text)' }}>
                      {companyShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small style={{ fontSize: '10px' }}>د.ل</small>
                    </td>

                    {/* Paid */}
                    <td style={{ color: '#059669', fontWeight: 800 }}>
                      {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small style={{ fontSize: '10px' }}>د.ل</small>
                    </td>

                    {/* Outstanding Debt */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{
                          color: debt.total_debt > 0 ? (debt.status === 'critical' ? '#ef4444' : debt.status === 'warning' ? '#d97706' : '#2563eb') : '#059669',
                          fontWeight: 900,
                          fontSize: '14px'
                        }}>
                          {debt.total_debt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <small style={{ fontSize: '10px' }}>د.ل</small>
                        </span>
                        {isMonthSelected && debt.cumulative_debt && debt.cumulative_debt !== debt.total_debt && (
                          <span style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600 }}>
                            إجمالي التراكمي: {debt.cumulative_debt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Delay Reason & Note with Add/Edit Button */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {noteDisplay ? (
                            <span
                              title={noteDisplay}
                              style={{
                                display: 'inline-block',
                                maxWidth: '180px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '11.5px',
                                color: '#1e293b',
                                background: 'rgba(245, 158, 11, 0.12)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontWeight: 700
                              }}
                            >
                              <i className="fa-solid fa-comment-dots" style={{ marginLeft: '4px', color: '#d97706' }} />
                              {noteDisplay}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: '11px', fontStyle: 'italic' }}>
                              لا توجد ملاحظة
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => openNoteModal(debt)}
                          title="إضافة أو تعديل سبب تأخير الديون والملاحظة"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            background: 'var(--card-bg)',
                            color: '#0284c7',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 800,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#0284c7';
                            e.currentTarget.style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--card-bg)';
                            e.currentTarget.style.color = '#0284c7';
                          }}
                        >
                          <i className="fa-solid fa-pen-to-square" />
                          {noteDisplay ? 'تعديل' : 'إضافة سبب'}
                        </button>
                      </div>
                    </td>

                    {/* Last Payment Date */}
                    <td style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>
                      {debt.last_payment_date}
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span style={{
                        padding: '4px 9px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        background: badge.bg,
                        color: badge.color,
                        fontWeight: '800',
                        display: 'inline-block',
                        whiteSpace: 'nowrap'
                      }}>
                        {badge.text}
                      </span>
                    </td>

                    {/* Action: Open Agent Ledger */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        style={{
                          background: 'linear-gradient(135deg, #014cb1, #0284c7)',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 2px 6px rgba(1,76,177,0.25)',
                          transition: 'all 0.2s',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                        onClick={() => window.location.href = `/reports/agent-monthly-ledger?agent_id=${debt.agent_id}`}
                      >
                        <i className="fa-solid fa-file-invoice-dollar" />
                        إدارة الوكيل
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Note / Delay Reason Modal */}
      {noteModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setNoteModal(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid var(--border)',
              direction: 'rtl',
              animation: 'modalSlideIn 0.25s ease-out'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #014cb1 0%, #0284c7 100%)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px'
                }}>
                  <i className="fa-solid fa-comment-dollar" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, fontFamily: "'Cairo',sans-serif" }}>
                    تسجيل سبب تأخير السداد والملاحظات
                  </h3>
                  <span style={{ fontSize: '12px', opacity: 0.9 }}>{noteModal.agencyName}</span>
                </div>
              </div>

              <button
                onClick={() => setNoteModal(null)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <i className="fa-solid fa-xmark" />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Agent Quick Info Bar */}
              <div
                style={{
                  background: 'var(--panel)',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  marginBottom: '18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>إجمالي المديونية</div>
                  <div style={{ fontSize: '15px', fontWeight: 900, color: '#ef4444' }}>
                    {noteModal.totalDebt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل
                  </div>
                </div>

                {noteModal.phone && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>رقم الهاتف</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0284c7', direction: 'ltr' }}>
                      {noteModal.phone}
                    </div>
                  </div>
                )}

                {isMonthSelected && (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 700 }}>الشهر المحدد</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>
                      شهر {selectedMonth} - {selectedYear}
                    </div>
                  </div>
                )}
              </div>

              {/* Preset Tags */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--muted)', marginBottom: '8px' }}>
                  اختيارات سريعة لأسباب التأخير الشائعة:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {PRESET_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        if (noteText) {
                          setNoteText(prev => prev + ' - ' + preset);
                        } else {
                          setNoteText(preset);
                        }
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        border: '1px solid var(--border)',
                        background: 'var(--card-bg)',
                        color: 'var(--text)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontFamily: "'Cairo',sans-serif",
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#0284c7';
                        e.currentTarget.style.color = '#0284c7';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.color = 'var(--text)';
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px' }}>
                  سبب تأخير الديون / تفاصيل الاتفاق:
                </label>
                <textarea
                  rows={4}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="اكتب سبب تأخير السداد أو تفاصيل التواصل والاتفاق مع الوكيل هنا..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--input-bg)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    fontFamily: "'Cairo',sans-serif",
                    lineHeight: '1.6',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '16px 24px',
                background: 'var(--table-header)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
              }}
            >
              <button
                type="button"
                onClick={() => setNoteModal(null)}
                disabled={savingNote}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: '1px solid var(--border)',
                  background: 'var(--card-bg)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '12px',
                  fontFamily: "'Cairo',sans-serif"
                }}
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleSaveNote}
                disabled={savingNote}
                style={{
                  padding: '9px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #014cb1, #0284c7)',
                  color: 'white',
                  cursor: savingNote ? 'wait' : 'pointer',
                  fontWeight: 800,
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: "'Cairo',sans-serif",
                  boxShadow: '0 4px 12px rgba(1,76,177,0.3)',
                  opacity: savingNote ? 0.7 : 1
                }}
              >
                <i className={`fa-solid ${savingNote ? 'fa-circle-notch fa-spin' : 'fa-check'}`} />
                {savingNote ? 'جاري الحفظ...' : 'حفظ الملاحظة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
