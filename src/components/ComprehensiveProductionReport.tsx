import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';
import '../styles/ComprehensiveProductionReport.css';

interface DocumentItem {
  id?: number;
  document_number: string;
  insured_name: string;
  issue_date: string;
  plate_number?: string;
  premium: number;
  tax: number;
  supervision_fees: number;
  stamp: number;
  issue_fees: number;
  extra_detail?: string;
  total: number;
  agency_name?: string;
  user_name?: string;
}

interface SectionTotals {
  documents_count: number;
  premium: number;
  tax: number;
  supervision_fees: number;
  stamp: number;
  issue_fees: number;
  total: number;
}

interface ReportSection {
  key: string;
  title: string;
  detail_header?: string;
  documents: DocumentItem[];
  totals: SectionTotals;
}

interface GrandTotals {
  documents_count: number;
  premium: number;
  tax: number;
  supervision_fees: number;
  stamp: number;
  issue_fees: number;
  total: number;
}

interface AgentOption {
  id: number;
  agency_name: string;
  agent_name?: string;
  code?: string;
}

export const ComprehensiveProductionReport: React.FC = () => {
  // Filters State
  const [periodType, setPeriodType] = useState<'year' | 'month' | 'range' | 'all'>('year');
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [selectedMonth, setSelectedMonth] = useState<string>('12');
  const [fromDate, setFromDate] = useState<string>('2025-01-01');
  const [toDate, setToDate] = useState<string>('2025-12-31');
  const [selectedDocType, setSelectedDocType] = useState<string>('all');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [excludeCanceled, setExcludeCanceled] = useState<boolean>(false);

  // Search in Agent dropdown
  const [agentSearch, setAgentSearch] = useState<string>('');
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState<boolean>(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  // Data States
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [grandTotals, setGrandTotals] = useState<GrandTotals>({
    documents_count: 0,
    premium: 0,
    tax: 0,
    supervision_fees: 0,
    stamp: 0,
    issue_fees: 0,
    total: 0,
  });
  const [agentLabel, setAgentLabel] = useState<string>('جميع الوكلاء والفروع (الكل)');
  const [periodLabel, setPeriodLabel] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);

  // Section Pagination & Search States
  const [sectionSearch, setSectionSearch] = useState<Record<string, string>>({});
  const [sectionPages, setSectionPages] = useState<Record<string, number>>({});
  const [sectionPageSizes, setSectionPageSizes] = useState<Record<string, number>>({});
  const [showDetailedPrintModal, setShowDetailedPrintModal] = useState<boolean>(false);

  const DOCUMENT_TYPE_OPTIONS = [
    { key: 'all', label: 'جميع أنواع التأمين (الكل)' },
    { key: 'compulsory', label: 'تأمين إجباري سيارات' },
    { key: 'international', label: 'تأمين السيارات الدولي (البطاقة البرتقالية)' },
    { key: 'travel', label: 'تأمين المسافرين' },
    { key: 'resident', label: 'تأمين الوافدين للمقيمين' },
    { key: 'marine', label: 'تأمين الهياكل البحرية' },
    { key: 'medical', label: 'تأمين المسؤولية المهنية (الطبية)' },
    { key: 'personal_accident', label: 'تأمين الحوادث الشخصية' },
    { key: 'school_student', label: 'تأمين حماية طلاب المدارس' },
    { key: 'cash_in_transit', label: 'تأمين نقل النقدية' },
    { key: 'cargo', label: 'تأمين شحن ونقل البضائع' },
  ];

  const MONTHS_NAMES = [
    { id: '1', name: 'يناير (01)' },
    { id: '2', name: 'فبراير (02)' },
    { id: '3', name: 'مارس (03)' },
    { id: '4', name: 'أبريل (04)' },
    { id: '5', name: 'مايو (05)' },
    { id: '6', name: 'يونيو (06)' },
    { id: '7', name: 'يوليو (07)' },
    { id: '8', name: 'أغسطس (08)' },
    { id: '9', name: 'سبتمبر (09)' },
    { id: '10', name: 'أكتوبر (10)' },
    { id: '11', name: 'نوفمبر (11)' },
    { id: '12', name: 'ديسمبر (12)' },
  ];

  // Close agent dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setIsAgentDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch list of agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const cached = sessionStorage.getItem('cached_agents_light');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setAgents(parsed);
        }
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/branches-agents?light=1`, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });
        if (res.ok) {
          const d = await res.json();
          const list = Array.isArray(d) ? d : (d.data || []);
          setAgents(list);
          try {
            sessionStorage.setItem('cached_agents_light', JSON.stringify(list));
          } catch (e) {}
        }
      } catch (e) {
        console.error('Failed to load agents list', e);
      }
    };
    fetchAgents();
  }, []);

  // Fetch report data
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();

      if (selectedAgentId && selectedAgentId !== 'all') {
        params.append('agent_id', selectedAgentId);
      }
      if (selectedDocType && selectedDocType !== 'all') {
        params.append('document_type', selectedDocType);
      }
      if (excludeCanceled) {
        params.append('exclude_canceled', '1');
      }

      if (periodType === 'year' && selectedYear) {
        params.append('year', selectedYear);
      } else if (periodType === 'month' && selectedYear && selectedMonth) {
        params.append('year', selectedYear);
        params.append('month', selectedMonth);
      } else if (periodType === 'range' && fromDate && toDate) {
        params.append('from_date', fromDate);
        params.append('to_date', toDate);
      }

      const res = await fetch(`${API_BASE_URL}/financial-statistics/comprehensive-production-portfolio?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json || !json.success) {
        showToast(json?.message || `خطأ في استجابة الخادم (${res.status})`, 'error');
        return;
      }

      if (json.data) {
        setSections(json.data.sections || []);
        setGrandTotals(json.data.grand_totals || {
          documents_count: 0,
          premium: 0,
          tax: 0,
          supervision_fees: 0,
          stamp: 0,
          issue_fees: 0,
          total: 0,
        });
        setAgentLabel(json.data.agent_label || 'جميع الوكلاء والفروع (الكل)');
        setPeriodLabel(json.data.period_label || '');
      }
    } catch (error: any) {
      console.error('Error fetching comprehensive report:', error);
      showToast('تعذر جلب بيانات التقرير من الخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSectionPages({});
    setSectionSearch({});
    fetchReportData();
  }, [periodType, selectedYear, selectedMonth, fromDate, toDate, selectedDocType, selectedAgentId, excludeCanceled]);

  // Handle Direct A4 Print with support for summary vs detailed modes
  const handlePrintA4 = (mode: 'summary' | 'detailed' = 'summary') => {
    if (sections.length === 0 || grandTotals.documents_count === 0) {
      showToast('لا توجد وثائق لتصديرها أو طباعتها في الفترة المحددة', 'error');
      return;
    }

    if (mode === 'detailed' && grandTotals.documents_count > 300) {
      setShowDetailedPrintModal(true);
      return;
    }

    executePrint(mode, false);
  };

  const executePrint = (mode: 'summary' | 'detailed', forceAll = false, chunk: number | null = null) => {
    const params = new URLSearchParams();
    if (selectedAgentId && selectedAgentId !== 'all') {
      params.append('agent_id', selectedAgentId);
    }
    if (selectedDocType && selectedDocType !== 'all') {
      params.append('document_type', selectedDocType);
    }
    if (excludeCanceled) {
      params.append('exclude_canceled', '1');
    }

    if (periodType === 'year' && selectedYear) {
      params.append('year', selectedYear);
    } else if (periodType === 'month' && selectedYear && selectedMonth) {
      params.append('year', selectedYear);
      params.append('month', selectedMonth);
    } else if (periodType === 'range' && fromDate && toDate) {
      params.append('from_date', fromDate);
      params.append('to_date', toDate);
    }

    params.append('print_mode', mode);
    if (forceAll) {
      params.append('force_all', '1');
    }
    if (chunk) {
      params.append('chunk', chunk.toString());
      params.append('chunk_size', '2000');
    }

    const printUrl = `${API_BASE_URL}/financial-statistics/comprehensive-production-portfolio/print?${params.toString()}`;
    window.open(printUrl, '_blank');
    setShowDetailedPrintModal(false);
  };

  // Handle Excel Export
  const handleExportExcel = async () => {
    if (sections.length === 0 || grandTotals.documents_count === 0) {
      showToast('لا توجد وثائق لتصديرها في الفترة المحددة', 'error');
      return;
    }

    setExportingExcel(true);
    showToast('جاري إنشاء ملف Excel المجمع...', 'success');

    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const allRows: any[] = [];

      sections.forEach((sec) => {
        sec.documents.forEach((doc, idx) => {
          allRows.push({
            section_title: sec.title,
            index: idx + 1,
            document_number: doc.document_number,
            insured_name: doc.insured_name,
            issue_date: doc.issue_date,
            plate_number: doc.plate_number || '-',
            premium: Number(doc.premium || 0).toFixed(3),
            tax: Number(doc.tax || 0).toFixed(3),
            supervision_fees: Number(doc.supervision_fees || 0).toFixed(3),
            stamp: Number(doc.stamp || 0).toFixed(3),
            issue_fees: Number(doc.issue_fees || 0).toFixed(3),
            extra_detail: doc.extra_detail || '-',
            total: Number(doc.total || 0).toFixed(3),
            agency_name: doc.agency_name || doc.user_name || '-',
          });
        });
      });

      const columns = [
        { header: 'نوع التأمين', key: 'section_title', width: 25 },
        { header: '#', key: 'index', width: 6 },
        { header: 'رقم الوثيقة', key: 'document_number', width: 20 },
        { header: 'اسم المؤمن له', key: 'insured_name', width: 32 },
        { header: 'تاريخ الإصدار', key: 'issue_date', width: 14 },
        { header: 'رقم اللوحة / الهيكل', key: 'plate_number', width: 18 },
        { header: 'القسط الصافي (د.ل)', key: 'premium', width: 16 },
        { header: 'الضريبة (د.ل)', key: 'tax', width: 14 },
        { header: 'أ. ورقابة (د.ل)', key: 'supervision_fees', width: 14 },
        { header: 'الدمغة (د.ل)', key: 'stamp', width: 14 },
        { header: 'م. الإصدار (د.ل)', key: 'issue_fees', width: 14 },
        { header: 'التفاصيل', key: 'extra_detail', width: 22 },
        { header: 'الإجمالي (د.ل)', key: 'total', width: 16 },
        { header: 'الوكالة / المستخدم', key: 'agency_name', width: 24 },
      ];

      const safeYear = selectedYear || new Date().getFullYear();
      const fileName = `تقرير_الحوافظ_الإنتاجية_الشامل_${safeYear}`;

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير الحوافظ والإنتاجية الشامل',
        subtitle: `النطاق: ${agentLabel} | الفترة: ${periodLabel} | إجمالي الوثائق: ${grandTotals.documents_count} وثيقة`,
        columns,
        data: allRows,
        fileName,
        qrData: `تقرير الحوافظ والإنتاجية الشامل - المدار الليبي للتأمين\nالوحدات: ${agentLabel}\nالفترة: ${periodLabel}\nإجمالي الوثائق: ${grandTotals.documents_count}\nالقيمة الكلية: ${grandTotals.total.toFixed(3)} د.ل\nالمستخدم: ${currentUser.name || 'النظام'}`
      });

      showToast(`تم تصدير ${grandTotals.documents_count} وثيقة بنجاح`, 'success');
    } catch (e: any) {
      console.error('Excel export error:', e);
      showToast(`حدث خطأ أثناء تصدير ملف الإكسيل: ${e?.message || ''}`, 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const selectedAgentObj = agents.find((a) => a.id.toString() === selectedAgentId);

  return (
    <section className="comprehensive-production-management">
      {/* Header Banner */}
      <div className="cpr-header-card">
        <div className="cpr-title-area">
          <div className="cpr-icon-badge">
            <i className="fa-solid fa-file-invoice-dollar" />
          </div>
          <div>
            <h1 className="cpr-main-heading">تقرير الحوافظ والإنتاجية الشامل</h1>
            <p className="cpr-sub-heading">
              سجل وتحليل حوافظ الإنتاجية المالية لجميع التأمينات والوكلاء مع نماذج الطباعة والتصدير المعتمدة
            </p>
          </div>
        </div>

        <div className="cpr-actions-area">
          <button
            onClick={() => handlePrintA4('summary')}
            disabled={loading || sections.length === 0}
            className="cpr-btn cpr-btn-print-summary"
            title="طباعة كشف الملخص المالي المعتمد لجميع الحوافظ (صفحة واحدة معتمدة للتوقيع والختم)"
          >
            <i className="fa-solid fa-file-invoice-dollar" />
            طباعة كشف الملخص المعتمد (A4)
          </button>

          <button
            onClick={() => handlePrintA4('detailed')}
            disabled={loading || sections.length === 0}
            className="cpr-btn cpr-btn-print"
            title="طباعة كشف الوثائق التفصيلي"
          >
            <i className="fa-solid fa-print" />
            طباعة الكشف التفصيلي (A4)
          </button>

          <button
            onClick={handleExportExcel}
            disabled={loading || exportingExcel || sections.length === 0}
            className="cpr-btn cpr-btn-excel"
            title="تصدير ملف إكسل شامل ومبوب"
          >
            <i className={`fa-solid ${exportingExcel ? 'fa-circle-notch fa-spin' : 'fa-file-excel'}`} />
            {exportingExcel ? 'جاري التصدير...' : 'تصدير إكسيل (الكشف)'}
          </button>

          <button
            onClick={fetchReportData}
            disabled={loading}
            className="cpr-btn cpr-btn-refresh"
            title="تحديث البيانات"
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {/* Advanced Filters Control Panel */}
      <div className="cpr-filters-panel">
        <div className="cpr-filters-grid">
          {/* 1. Period Mode Selection */}
          <div className="cpr-filter-item">
            <label>
              <i className="fa-regular fa-calendar-check" />
              نظام الفترة الزمنية:
            </label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as any)}
              className="cpr-select"
            >
              <option value="year">سنة محددة (كامل السنة)</option>
              <option value="month">شهر وسنة محددة</option>
              <option value="range">نطاق تاريخ مخصص (من .. إلى ..)</option>
              <option value="all">كافة الفترات (سجل كلي)</option>
            </select>
          </div>

          {/* 2. Year Select (if year or month) */}
          {(periodType === 'year' || periodType === 'month') && (
            <div className="cpr-filter-item">
              <label>
                <i className="fa-solid fa-calendar-days" />
                السنة:
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="cpr-select"
              >
                {Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + 1 - i).map((y) => (
                  <option key={y} value={y.toString()}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Month Select (if month) */}
          {periodType === 'month' && (
            <div className="cpr-filter-item">
              <label>
                <i className="fa-regular fa-calendar" />
                الشهر:
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="cpr-select"
              >
                {MONTHS_NAMES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 4. Date Range Inputs (if range) */}
          {periodType === 'range' && (
            <>
              <div className="cpr-filter-item">
                <label>
                  <i className="fa-solid fa-calendar-plus" />
                  من تاريخ:
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="cpr-input"
                />
              </div>
              <div className="cpr-filter-item">
                <label>
                  <i className="fa-solid fa-calendar-minus" />
                  إلى تاريخ:
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="cpr-input"
                />
              </div>
            </>
          )}

          {/* 5. Document / Insurance Type */}
          <div className="cpr-filter-item">
            <label>
              <i className="fa-solid fa-shield-halved" />
              نوع التأمين:
            </label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="cpr-select"
            >
              {DOCUMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Agent / Branch Selector with searchable popup */}
          <div className="cpr-filter-item" ref={agentDropdownRef} style={{ position: 'relative' }}>
            <label>
              <i className="fa-solid fa-user-tie" />
              الوكيل / الفرع:
            </label>
            <div
              onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
              className="cpr-agent-trigger"
            >
              <span>
                {selectedAgentId === 'all'
                  ? 'جميع الوكلاء والفروع (الكل)'
                  : selectedAgentObj
                  ? `${selectedAgentObj.agency_name} (${selectedAgentObj.code || ''})`
                  : 'اختر الوكيل...'}
              </span>
              <i className={`fa-solid ${isAgentDropdownOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} />
            </div>

            {isAgentDropdownOpen && (
              <div className="cpr-agent-dropdown-menu">
                <div className="cpr-agent-search-box">
                  <input
                    type="text"
                    placeholder="ابحث باسم الوكيل أو الكود..."
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    autoFocus
                  />
                  <i className="fa-solid fa-magnifying-glass" />
                </div>
                <div className="cpr-agent-list-scroll">
                  <div
                    className={`cpr-agent-option-row ${selectedAgentId === 'all' ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedAgentId('all');
                      setIsAgentDropdownOpen(false);
                      setAgentSearch('');
                    }}
                  >
                    <i className="fa-solid fa-users" />
                    <span>جميع الوكلاء والفروع (الكل)</span>
                  </div>
                  {agents
                    .filter(
                      (a) =>
                        a.agency_name.toLowerCase().includes(agentSearch.toLowerCase()) ||
                        (a.code && a.code.toLowerCase().includes(agentSearch.toLowerCase())) ||
                        (a.agent_name && a.agent_name.toLowerCase().includes(agentSearch.toLowerCase()))
                    )
                    .map((a) => (
                      <div
                        key={a.id}
                        className={`cpr-agent-option-row ${selectedAgentId === a.id.toString() ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedAgentId(a.id.toString());
                          setIsAgentDropdownOpen(false);
                          setAgentSearch('');
                        }}
                      >
                        <i className="fa-solid fa-building-user" />
                        <div>
                          <strong>{a.agency_name}</strong>
                          {a.code && <span className="cpr-code-badge">{a.code}</span>}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter Quick Toggles & Reset */}
        <div className="cpr-filters-footer">
          <label className="cpr-toggle-label">
            <input
              type="checkbox"
              checked={excludeCanceled}
              onChange={(e) => setExcludeCanceled(e.target.checked)}
            />
            <span className="cpr-toggle-custom" />
            <span>استبعاد الوثائق الملغاة من التقرير</span>
          </label>

          <button
            onClick={() => {
              setPeriodType('year');
              setSelectedYear('2025');
              setSelectedMonth('12');
              setFromDate('2025-01-01');
              setToDate('2025-12-31');
              setSelectedDocType('all');
              setSelectedAgentId('all');
              setExcludeCanceled(false);
            }}
            className="cpr-btn-reset"
          >
            <i className="fa-solid fa-rotate-left" />
            إعادة تعيين الفلاتر
          </button>
        </div>
      </div>

      {/* Global Totals KPI Grid */}
      <div className="cpr-kpi-grid">
        <div className="cpr-kpi-card cpr-kpi-blue">
          <div className="cpr-kpi-icon">
            <i className="fa-solid fa-file-contract" />
          </div>
          <div className="cpr-kpi-info">
            <span className="cpr-kpi-title">إجمالي الوثائق</span>
            <strong className="cpr-kpi-val">{grandTotals.documents_count} وثيقة</strong>
          </div>
        </div>

        <div className="cpr-kpi-card cpr-kpi-emerald">
          <div className="cpr-kpi-icon">
            <i className="fa-solid fa-money-bill-wave" />
          </div>
          <div className="cpr-kpi-info">
            <span className="cpr-kpi-title">القسط الصافي</span>
            <strong className="cpr-kpi-val">{grandTotals.premium.toFixed(3)} د.ل</strong>
          </div>
        </div>

        <div className="cpr-kpi-card cpr-kpi-amber">
          <div className="cpr-kpi-icon">
            <i className="fa-solid fa-percent" />
          </div>
          <div className="cpr-kpi-info">
            <span className="cpr-kpi-title">إجمالي الضرائب</span>
            <strong className="cpr-kpi-val">{grandTotals.tax.toFixed(3)} د.ل</strong>
          </div>
        </div>

        <div className="cpr-kpi-card cpr-kpi-cyan">
          <div className="cpr-kpi-icon">
            <i className="fa-solid fa-building-shield" />
          </div>
          <div className="cpr-kpi-info">
            <span className="cpr-kpi-title">إشراف ورقابة</span>
            <strong className="cpr-kpi-val">{grandTotals.supervision_fees.toFixed(3)} د.ل</strong>
          </div>
        </div>

        <div className="cpr-kpi-card cpr-kpi-purple">
          <div className="cpr-kpi-icon">
            <i className="fa-solid fa-stamp" />
          </div>
          <div className="cpr-kpi-info">
            <span className="cpr-kpi-title">الدمغات وم. الإصدار</span>
            <strong className="cpr-kpi-val">{(grandTotals.stamp + grandTotals.issue_fees).toFixed(3)} د.ل</strong>
          </div>
        </div>

        <div className="cpr-kpi-card cpr-kpi-indigo">
          <div className="cpr-kpi-icon">
            <i className="fa-solid fa-coins" />
          </div>
          <div className="cpr-kpi-info">
            <span className="cpr-kpi-title">المجموع العام الكلي</span>
            <strong className="cpr-kpi-val highlight">{grandTotals.total.toFixed(3)} د.ل</strong>
          </div>
        </div>
      </div>

      {/* Main Content: Report Sections */}
      {loading ? (
        <div className="cpr-loading-box">
          <i className="fa-solid fa-circle-notch fa-spin" />
          <span>جاري تجميع وتحليل حوافظ الإنتاجية المالية...</span>
        </div>
      ) : sections.length === 0 ? (
        <div className="cpr-empty-box">
          <i className="fa-solid fa-folder-open" />
          <h3>لا توجد وثائق مسجلة تطابق محددات البحث</h3>
          <p>يرجى تجربة تعديل خيارات الفترة أو اختيار تأمين أو وكيل آخر.</p>
        </div>
      ) : (
        <div className="cpr-sections-container">
          {sections.map((section) => {
            const query = (sectionSearch[section.key] || '').toLowerCase().trim();
            const filteredDocs = query
              ? section.documents.filter((doc) => {
                  const docNum = (doc.document_number || '').toLowerCase();
                  const name = (doc.insured_name || '').toLowerCase();
                  const plate = (doc.plate_number || '').toLowerCase();
                  const agency = (doc.agency_name || doc.user_name || '').toLowerCase();
                  const detail = (doc.extra_detail || '').toLowerCase();
                  return docNum.includes(query) || name.includes(query) || plate.includes(query) || agency.includes(query) || detail.includes(query);
                })
              : section.documents;

            const pageSize = sectionPageSizes[section.key] || 50;
            const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));
            const currentPage = Math.min(Math.max(1, sectionPages[section.key] || 1), totalPages);
            const startIndex = (currentPage - 1) * pageSize;
            const displayedDocs = filteredDocs.slice(startIndex, startIndex + pageSize);

            return (
              <div key={section.key} className="cpr-section-card">
                {/* Section Header */}
                <div className="cpr-section-head">
                  <div className="cpr-section-title-group">
                    <span className="cpr-badge-tag">قسم التأمين</span>
                    <h2>{section.title}</h2>
                  </div>
                  <div className="cpr-section-metrics">
                    <span>
                      العدد الكلي: <strong>{section.documents.length} وثيقة</strong>
                    </span>
                    <span className="cpr-divider">|</span>
                    <span>
                      القيمة الإجمالية: <strong>{section.totals.total.toFixed(3)} د.ل</strong>
                    </span>
                  </div>
                </div>

                {/* Section Toolbar: Fast Instant Search + Record Range + Page Size */}
                <div className="cpr-section-toolbar">
                  <div className="cpr-toolbar-search">
                    <i className="fa-solid fa-magnifying-glass" />
                    <input
                      type="text"
                      placeholder="بحث سريع برقم الوثيقة، اسم المؤمن له، اللوحة، الوكيل..."
                      value={sectionSearch[section.key] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSectionSearch((prev) => ({ ...prev, [section.key]: val }));
                        setSectionPages((prev) => ({ ...prev, [section.key]: 1 }));
                      }}
                    />
                    {sectionSearch[section.key] && (
                      <button
                        className="cpr-btn-clear-search"
                        onClick={() => {
                          setSectionSearch((prev) => ({ ...prev, [section.key]: '' }));
                          setSectionPages((prev) => ({ ...prev, [section.key]: 1 }));
                        }}
                        title="إلغاء البحث"
                      >
                        <i className="fa-solid fa-xmark" />
                      </button>
                    )}
                  </div>

                  <div className="cpr-toolbar-info">
                    <span className="cpr-record-count-badge">
                      عرض <strong>{filteredDocs.length === 0 ? 0 : startIndex + 1}</strong> إلى <strong>{Math.min(startIndex + pageSize, filteredDocs.length)}</strong> من أصل <strong>{filteredDocs.length}</strong> وثيقة
                      {query && section.documents.length !== filteredDocs.length && (
                        <small className="cpr-filtered-from"> (مفلترة من إجمالي {section.documents.length})</small>
                      )}
                    </span>
                  </div>

                  <div className="cpr-toolbar-size">
                    <span>عدد السجلات:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        const newSize = parseInt(e.target.value, 10);
                        setSectionPageSizes((prev) => ({ ...prev, [section.key]: newSize }));
                        setSectionPages((prev) => ({ ...prev, [section.key]: 1 }));
                      }}
                      className="cpr-size-select"
                    >
                      <option value={25}>25 بالصفحة</option>
                      <option value={50}>50 بالصفحة</option>
                      <option value={100}>100 بالصفحة</option>
                      <option value={200}>200 بالصفحة</option>
                    </select>
                  </div>
                </div>

                {/* Table of Documents (Smoothly Paged - Fast Instant DOM) */}
                <div className="cpr-table-wrapper">
                  <table className="cpr-data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '45px' }}>#</th>
                        <th style={{ width: '130px' }}>رقم الوثيقة</th>
                        <th>اسم المؤمن له</th>
                        <th style={{ width: '105px' }}>تاريخ الإصدار</th>
                        <th style={{ width: '110px' }}>رقم اللوحة</th>
                        <th style={{ width: '95px' }}>القسط الصافي</th>
                        <th style={{ width: '80px' }}>الضريبة</th>
                        <th style={{ width: '85px' }}>أ. ورقابة</th>
                        <th style={{ width: '80px' }}>الدمغة</th>
                        <th style={{ width: '85px' }}>م. الإصدار</th>
                        <th style={{ width: '130px' }}>{section.detail_header || 'التفاصيل'}</th>
                        <th style={{ width: '110px' }}>الإجمالي</th>
                        <th style={{ width: '140px' }}>الوكالة / المستخدم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedDocs.length === 0 ? (
                        <tr>
                          <td colSpan={13} style={{ padding: '26px', color: '#94a3b8', fontSize: '13px' }}>
                            {query ? 'لا توجد وثائق تطابق كلمة البحث المدخلة' : 'لا توجد وثائق مسجلة في هذا القسم'}
                          </td>
                        </tr>
                      ) : (
                        displayedDocs.map((doc, idx) => (
                          <tr key={doc.id || `${section.key}-${startIndex + idx}`}>
                            <td>{startIndex + idx + 1}</td>
                            <td className="cpr-cell-docnum">{doc.document_number}</td>
                            <td className="cpr-cell-name">{doc.insured_name}</td>
                            <td>{doc.issue_date}</td>
                            <td>{doc.plate_number || '-'}</td>
                            <td className="cpr-num-cell">{Number(doc.premium || 0).toFixed(3)}</td>
                            <td className="cpr-num-cell">{Number(doc.tax || 0).toFixed(3)}</td>
                            <td className="cpr-num-cell">{Number(doc.supervision_fees || 0).toFixed(3)}</td>
                            <td className="cpr-num-cell">{Number(doc.stamp || 0).toFixed(3)}</td>
                            <td className="cpr-num-cell">{Number(doc.issue_fees || 0).toFixed(3)}</td>
                            <td className="cpr-cell-details">{doc.extra_detail || '-'}</td>
                            <td className="cpr-cell-total">{Number(doc.total || 0).toFixed(3)} د.ل</td>
                            <td className="cpr-cell-agency">{doc.agency_name || doc.user_name || '-'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Section Pagination Controls */}
                {totalPages > 1 && (
                  <div className="cpr-pagination-bar">
                    <button
                      className="cpr-page-nav-btn"
                      disabled={currentPage <= 1}
                      onClick={() => setSectionPages((prev) => ({ ...prev, [section.key]: 1 }))}
                      title="الصفحة الأولى"
                    >
                      <i className="fa-solid fa-angles-right" />
                      الأولى
                    </button>
                    <button
                      className="cpr-page-nav-btn"
                      disabled={currentPage <= 1}
                      onClick={() => setSectionPages((prev) => ({ ...prev, [section.key]: Math.max(1, currentPage - 1) }))}
                      title="الصفحة السابقة"
                    >
                      <i className="fa-solid fa-chevron-right" />
                      السابقة
                    </button>

                    <div className="cpr-page-status">
                      <span>الصفحة</span>
                      <strong className="cpr-active-page-num">{currentPage}</strong>
                      <span>من</span>
                      <strong>{totalPages}</strong>
                    </div>

                    <button
                      className="cpr-page-nav-btn"
                      disabled={currentPage >= totalPages}
                      onClick={() => setSectionPages((prev) => ({ ...prev, [section.key]: Math.min(totalPages, currentPage + 1) }))}
                      title="الصفحة التالية"
                    >
                      التالية
                      <i className="fa-solid fa-chevron-left" />
                    </button>
                    <button
                      className="cpr-page-nav-btn"
                      disabled={currentPage >= totalPages}
                      onClick={() => setSectionPages((prev) => ({ ...prev, [section.key]: totalPages }))}
                      title="الصفحة الأخيرة"
                    >
                      الأخيرة
                      <i className="fa-solid fa-angles-left" />
                    </button>
                  </div>
                )}

                {/* Section Financial Summary (Matching the A4 report format) */}
                <div className="cpr-summary-box-wrapper">
                  <table className="cpr-summary-table">
                    <thead>
                      <tr>
                        <th>القسط الصافي</th>
                        <th>الضريبة</th>
                        <th>إشراف ورقابة</th>
                        <th>الدمغة</th>
                        <th>مصاريف الإصدار</th>
                        <th className="cpr-total-header">الإجمالي</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{section.totals.premium.toFixed(3)} د.ل</td>
                        <td>{section.totals.tax.toFixed(3)} د.ل</td>
                        <td>{section.totals.supervision_fees.toFixed(3)} د.ل</td>
                        <td>{section.totals.stamp.toFixed(3)} د.ل</td>
                        <td>{section.totals.issue_fees.toFixed(3)} د.ل</td>
                        <td className="cpr-total-val">{section.totals.total.toFixed(3)} د.ل</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Signature and Stamp Box */}
                <div className="cpr-signature-box-container">
                  <div className="cpr-signature-box">
                    <div className="cpr-sig-header">التوقيع والختم المعتمد ({section.title}):</div>
                    <div className="cpr-sig-body" />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Grand Summary at Bottom */}
          {sections.length > 1 && (
            <div className="cpr-grand-summary-banner">
              <div className="cpr-gs-title">
                <i className="fa-solid fa-chart-pie" />
                الملخص المالي العام الإجمالي لجميع التأمينات ({grandTotals.documents_count} وثيقة)
              </div>
              <div className="cpr-summary-box-wrapper">
                <table className="cpr-summary-table">
                  <thead>
                    <tr>
                      <th>إجمالي الأقساط الصافية</th>
                      <th>إجمالي الضرائب</th>
                      <th>إجمالي الإشراف والرقابة</th>
                      <th>إجمالي الدمغات</th>
                      <th>إجمالي مصاريف الإصدار</th>
                      <th className="cpr-total-header">المجموع العام الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{grandTotals.premium.toFixed(3)} د.ل</td>
                      <td>{grandTotals.tax.toFixed(3)} د.ل</td>
                      <td>{grandTotals.supervision_fees.toFixed(3)} د.ل</td>
                      <td>{grandTotals.stamp.toFixed(3)} د.ل</td>
                      <td>{grandTotals.issue_fees.toFixed(3)} د.ل</td>
                      <td className="cpr-total-val" style={{ fontSize: '15px' }}>
                        {grandTotals.total.toFixed(3)} د.ل
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Print Warning Modal for Large Datasets */}
      {showDetailedPrintModal && (
        <div className="cpr-modal-overlay" onClick={() => setShowDetailedPrintModal(false)}>
          <div className="cpr-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="cpr-modal-icon-warn">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <h3 className="cpr-modal-title">تنبيه حجم الطباعة الضخم</h3>
            <p className="cpr-modal-text">
              التقرير يحتوي على <strong>{grandTotals.documents_count} وثيقة</strong> (ما يقارب {Math.ceil(grandTotals.documents_count / 24)} صفحة طباعة).<br />
              طباعة هذا العدد الكبير مباشرة من المتصفح قد يستغرق وقتاً طويلاً ويؤدي إلى بطء أو تجمّد المتصفح ونفاذ الورق.<br />
              <strong>ما هو الإجراء الذي تفضله؟</strong>
            </p>

            <div className="cpr-modal-options">
              <button
                className="cpr-modal-opt-btn cpr-opt-summary"
                onClick={() => executePrint('summary')}
              >
                <i className="fa-solid fa-file-invoice-dollar" />
                <div>
                  <strong>طباعة الملخص المالي المعتمد (موصى به)</strong>
                  <span>كشف رسمي من صفحة واحدة يضم كافة المجاميع والتوقيعات والختم المعتمد</span>
                </div>
              </button>

              <button
                className="cpr-modal-opt-btn cpr-opt-excel"
                onClick={() => {
                  setShowDetailedPrintModal(false);
                  handleExportExcel();
                }}
              >
                <i className="fa-solid fa-file-excel" />
                <div>
                  <strong>تصدير الكشف إلى ملف Excel</strong>
                  <span>تصدير سريع لكافة الـ {grandTotals.documents_count} وثيقة بجميع بياناتها</span>
                </div>
              </button>

              <button
                className="cpr-modal-opt-btn cpr-opt-chunk"
                onClick={() => executePrint('detailed', true, 1)}
              >
                <i className="fa-solid fa-bolt" />
                <div>
                  <strong>طباعة سريعة بالحزم (جزء 1: من 1 إلى 2,000 وثيقة)</strong>
                  <span>توليد فوري لمعاينة الطباعة في ثانيتين فقط للسرعة الفائقة</span>
                </div>
              </button>

              <button
                className="cpr-modal-opt-btn cpr-opt-force"
                onClick={() => executePrint('detailed', true)}
              >
                <i className="fa-solid fa-print" />
                <div>
                  <strong>متابعة طباعة الكشف التفصيلي بالكامل</strong>
                  <span>فتح نافذة الطباعة لجميع الوثائق بالتنسيق فائق السرعة (~{Math.ceil(grandTotals.documents_count / 40)} صفحة)</span>
                </div>
              </button>
            </div>

            <div className="cpr-modal-footer">
              <button className="cpr-modal-close-btn" onClick={() => setShowDetailedPrintModal(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ComprehensiveProductionReport;
