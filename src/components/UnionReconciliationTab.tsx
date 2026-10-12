import React, { useState, useEffect, useMemo } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';

interface ReconciliationRow {
  request_number: string;
  purchase_date: string | null;
  payment_method: string;
  receipt_image: string | null;
  amount_paid: number;
  local_cards_count: number;
  lifo_cards_count: number;
  cards_diff: number;
  financial_diff: number;
  card_price: number;
  lifo_issued_cards: number;
  lifo_assigned_cards: number;
  lifo_canceled_cards: number;
  min_card_number: string | null;
  max_card_number: string | null;
  status: 'matched' | 'diff' | 'not_in_lifo' | 'only_in_lifo';
  is_in_lifo: boolean;
  is_in_local: boolean;
}

interface ReconciliationSummary {
  total_amount_paid: number;
  total_cards_paid: number;
  total_lifo_cards: number;
  total_cards_diff: number;
  total_financial_diff: number;
  total_lifo_issued: number;
  total_lifo_assigned: number;
  total_lifo_canceled: number;
  total_company_deposit: number;
  consumed_deposit_value: number;
  remaining_deposit_value: number;
  matched_requests_count: number;
  discrepancy_requests_count: number;
  unmatched_in_lifo_count: number;
  lifo_only_count: number;
  unassociated_purchases_count: number;
}

export default function UnionReconciliationTab() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number>(0);

  // Filters
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Fetch reconciliation data
  const fetchReconciliation = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/lifo-reports/reconciliation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ force_refresh: forceRefresh })
      });

      const data = await response.json();
      if (data && data.success) {
        setSummary(data.summary);
        setRows(data.reconciliation_rows || []);
        if (forceRefresh) {
          showToast('تمت المزامنة والتحديث الفوري مع الاتحاد بنجاح', 'success');
        }
      } else {
        showToast(data?.message || 'فشل جلب بيانات المطابقة', 'error');
      }
    } catch (err) {
      console.error('Error fetching reconciliation:', err);
      showToast('حدث خطأ في الاتصال بالخادم أثناء مطابقة الرصيد', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReconciliation(false);
  }, []);

  const resolveImageUrl = (path: string | null) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const base = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${base}${cleanPath}`;
  };

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      // Search
      const search = searchFilter.trim().toLowerCase();
      if (search && !row.request_number.toLowerCase().includes(search)) {
        return false;
      }

      // Status
      if (statusFilter !== 'all' && row.status !== statusFilter) {
        return false;
      }

      // Date range
      if (fromDate && row.purchase_date && row.purchase_date < fromDate) {
        return false;
      }
      if (toDate && row.purchase_date && row.purchase_date > toDate) {
        return false;
      }

      return true;
    });
  }, [rows, searchFilter, statusFilter, fromDate, toDate]);

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredRows.length === 0) {
      showToast('لا توجد بيانات مطابقة لتصديرها', 'warning');
      return;
    }

    const exportData = filteredRows.map((r, index) => ({
      'م': index + 1,
      'رقم الطلب / الواصل': r.request_number,
      'تاريخ الشراء': r.purchase_date || '—',
      'المبلغ المسدد (د.ل)': r.amount_paid,
      'البطاقات المسددة بالدفاتر': r.local_cards_count,
      'البطاقات المسجلة بالاتحاد (LIFO)': r.lifo_cards_count,
      'فارق الكمية': r.cards_diff,
      'الفارق المالي (د.ل)': r.financial_diff,
      'البطاقات المصدرة/المباعة': r.lifo_issued_cards,
      'البطاقات المتبقية بالمخزون': r.lifo_assigned_cards,
      'البطاقات الملغية': r.lifo_canceled_cards,
      'تسلسل البطاقات': r.min_card_number && r.max_card_number ? `${r.min_card_number} إلى ${r.max_card_number}` : '—',
      'حالة المطابقة':
        r.status === 'matched' ? 'مطابق 100%' :
        r.status === 'diff' ? 'يوجد فارق بالكمية' :
        r.status === 'not_in_lifo' ? 'مسدد بالدفاتر وغير مقيد بالاتحاد' :
        'مقيد بالاتحاد بدون سند محلي',
      'طريقة السداد': r.payment_method,
    }));

    generatePremiumExcel({
      title: 'تقرير مطابقة رصيد الاتحاد مع المدفوعات والبطاقات (LIFO)',
      fileName: `مطابقة_رصيد_الاتحاد_${new Date().toISOString().split('T')[0]}`,
      data: exportData,
      themeColor: '014cb1',
      showStats: true
    });
    showToast('تم تصدير ملف المطابقة بنجاح', 'success');
  };

  // Print Official Audit Report
  const handlePrintAudit = () => {
    window.print();
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Top Banner / Breadcrumb */}
      <div className="users-breadcrumb no-print" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '28px 32px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '18px',
        marginBottom: '26px',
        color: '#fff',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.08, pointerEvents: 'none' }}>
          <i className="fa-solid fa-scale-balanced" style={{ fontSize: '180px', position: 'absolute', left: '-20px', bottom: '-30px' }}></i>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              background: '#0ea5e9',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '20px',
              letterSpacing: '0.5px'
            }}>
              LIFO Reconciliation
            </span>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-scale-balanced" style={{ color: '#38bdf8' }}></i>
              مطابقة رصيد الاتحاد مع البطاقات والمدفوعات
            </h2>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>
            مطابقة دقيقة بين سندات الشراء والتحويلات المسجلة محلياً وبين بيانات منظومة الاتحاد الفعلية (المباعة، المعينة في المخزون، والودائع)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', zIndex: 1, flexWrap: 'wrap' }}>
          <button
            onClick={() => fetchReconciliation(true)}
            disabled={refreshing || loading}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              border: 'none',
              padding: '11px 18px',
              borderRadius: '10px',
              cursor: refreshing || loading ? 'not-allowed' : 'pointer',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.3)',
              fontSize: '0.9rem'
            }}
          >
            <i className={`fa-solid fa-arrows-rotate ${refreshing ? 'fa-spin' : ''}`}></i>
            {refreshing ? 'جاري المزامنة...' : 'تحديث من الاتحاد الآن'}
          </button>

          <button
            onClick={handleExportExcel}
            style={{
              background: '#10b981',
              color: '#fff',
              border: 'none',
              padding: '11px 18px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.25)',
              fontSize: '0.9rem'
            }}
          >
            <i className="fa-solid fa-file-excel"></i> تصدير Excel
          </button>

          <button
            onClick={handlePrintAudit}
            style={{
              background: '#475569',
              color: '#fff',
              border: 'none',
              padding: '11px 18px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem'
            }}
          >
            <i className="fa-solid fa-print"></i> طباعة التقرير
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Total Amount Paid Locally */}
        <div style={{
          background: 'var(--card-bg)',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted)' }}>إجمالي المدفوع للاتحاد محلياً</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-money-bill-wave"></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e40af' }}>
            {(summary?.total_amount_paid || 0).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 700 }}>د.ل</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            عبر {summary?.total_cards_paid ? (summary.total_cards_paid).toLocaleString() : 0} بطاقة مسددة بالدفاتر
          </div>
        </div>

        {/* Total Cards In LIFO */}
        <div style={{
          background: 'var(--card-bg)',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted)' }}>إجمالي البطاقات بالاتحاد (LIFO)</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-id-card"></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#065f46' }}>
            {(summary?.total_lifo_cards || 0).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 700 }}>بطاقة</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            المسجلة على حساب الشركة بمنظومة الاتحاد
          </div>
        </div>

        {/* Cards Discrepancy */}
        <div style={{
          background: summary && summary.total_cards_diff === 0 ? '#f0fdf4' : (summary && summary.total_cards_diff > 0 ? '#fefce8' : '#fef2f2'),
          padding: '20px',
          borderRadius: '16px',
          border: summary && summary.total_cards_diff === 0 ? '1px solid #bbf7d0' : (summary && summary.total_cards_diff > 0 ? '1px solid #fef08a' : '1px solid #fecaca'),
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: summary && summary.total_cards_diff === 0 ? '#15803d' : '#991b1b' }}>
              فارق المطابقة الإجمالي
            </span>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: summary && summary.total_cards_diff === 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: summary && summary.total_cards_diff === 0 ? '#16a34a' : '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <i className={`fa-solid ${summary && summary.total_cards_diff === 0 ? 'fa-circle-check' : 'fa-triangle-exclamation'}`}></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: summary && summary.total_cards_diff === 0 ? '#16a34a' : (summary && summary.total_cards_diff > 0 ? '#b45309' : '#dc2626') }}>
            {summary && summary.total_cards_diff === 0 ? 'مطابق 100%' : `${summary?.total_cards_diff > 0 ? '+' : ''}${(summary?.total_cards_diff || 0).toLocaleString()} بطاقة`}
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: summary && summary.total_cards_diff === 0 ? '#15803d' : '#b91c1c' }}>
            {summary && summary.total_cards_diff === 0 ? 'لا توجد أي فروقات بين الدفاتر والاتحاد' : `أثر مالي: ${(summary?.total_financial_diff || 0).toLocaleString()} د.ل`}
          </div>
        </div>

        {/* Issued vs In-Stock */}
        <div style={{
          background: 'var(--card-bg)',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted)' }}>البطاقات المباعة / المصدرة</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-stamp"></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#b45309' }}>
            {(summary?.total_lifo_issued || 0).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 700 }}>بطاقة</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            استهلكت من الوديعة: {(summary?.consumed_deposit_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} د.ل
          </div>
        </div>

        {/* Remaining in Stock & Company Deposit */}
        <div style={{
          background: 'var(--card-bg)',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted)' }}>رصيد وديعة الشركة بالمخزون</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-boxes-stacked"></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#4338ca' }}>
            {(summary?.remaining_deposit_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} <span style={{ fontSize: '13px', fontWeight: 700 }}>د.ل</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            يقابلها {(summary?.total_lifo_assigned || 0).toLocaleString()} بطاقة متاحة بالمخزون
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="no-print" style={{
        background: 'var(--card-bg)',
        padding: '20px 24px',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
              بحث برقم الطلب / الواصل
            </label>
            <input
              type="text"
              placeholder="اكتب رقم الطلب..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontWeight: 600
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
              حالة المطابقة
            </label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontWeight: 700
              }}
            >
              <option value="all">كل الحالات ({rows.length})</option>
              <option value="matched">مطابق تماماً ({summary?.matched_requests_count || 0})</option>
              <option value="diff">يوجد فارق في الكمية ({summary?.discrepancy_requests_count || 0})</option>
              <option value="not_in_lifo">مسدد وغير مقيد بالاتحاد ({summary?.unmatched_in_lifo_count || 0})</option>
              <option value="only_in_lifo">مقيد بالاتحاد فقط ({summary?.lifo_only_count || 0})</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
              من تاريخ
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
              إلى تاريخ
            </label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => {
                setSearchFilter('');
                setStatusFilter('all');
                setFromDate('');
                setToDate('');
              }}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#f1f5f9',
                color: '#475569',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              تصفير الفلاتر
            </button>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="users-table-wrapper" style={{
        background: 'var(--card-bg)',
        borderRadius: '18px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '36px', color: '#014cb1', marginBottom: '15px' }}></i>
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text)', fontSize: '1.1rem' }}>جاري مطابقة ومقارنة سجلات الاتحاد...</p>
            <p style={{ margin: '6px 0 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>يتم الاتصال بقاعدة البيانات ومنظومة LIFO لتدقيق البطاقات</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '42px', color: '#94a3b8', marginBottom: '15px' }}></i>
            <h4 style={{ margin: 0, fontWeight: 800, color: 'var(--text)' }}>لا توجد بيانات مطابقة ضمن الفلاتر المحددة</h4>
            <p style={{ margin: '8px 0 0 0', color: 'var(--muted)' }}>تأكد من تعديل شروط البحث أو اضغط على تحديث لجلب السجلات</p>
          </div>
        ) : (
          <table className="users-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                <th style={{ verticalAlign: 'middle', padding: '14px 16px' }}>رقم الطلب / الواصل</th>
                <th style={{ verticalAlign: 'middle', padding: '14px 16px' }}>تاريخ الشراء</th>
                <th style={{ verticalAlign: 'middle', padding: '14px 16px' }}>المبلغ المسدد</th>
                <th style={{ verticalAlign: 'middle', padding: '14px 16px' }}>البطاقات بالدفاتر</th>
                <th style={{ verticalAlign: 'middle', padding: '14px 16px' }}>البطاقات بالاتحاد (LIFO)</th>
                <th style={{ verticalAlign: 'middle', padding: '14px 16px' }}>حالة المطابقة</th>
                <th style={{ verticalAlign: 'middle', padding: '14px 16px' }}>الفارق</th>
                <th style={{ verticalAlign: 'middle', padding: '14px 16px' }}>حالة البطاقات (LIFO)</th>
                <th style={{ verticalAlign: 'middle', padding: '14px 16px' }}>تسلسل الأرقام</th>
                <th className="no-print" style={{ verticalAlign: 'middle', padding: '14px 16px', textAlign: 'center' }}>الواصل</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => {
                const isMatched = row.status === 'matched';
                const isDiff = row.status === 'diff';
                const isNotInLifo = row.status === 'not_in_lifo';
                const isOnlyInLifo = row.status === 'only_in_lifo';

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    {/* Request Number */}
                    <td style={{ fontWeight: 800, verticalAlign: 'middle', padding: '14px 16px' }}>
                      <span style={{
                        background: '#f1f5f9',
                        color: '#0f172a',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontSize: '0.95rem'
                      }}>
                        {row.request_number || '—'}
                      </span>
                    </td>

                    {/* Date */}
                    <td style={{ verticalAlign: 'middle', padding: '14px 16px', color: 'var(--text)', fontWeight: 600 }}>
                      {row.purchase_date || '—'}
                    </td>

                    {/* Amount Paid */}
                    <td style={{ verticalAlign: 'middle', padding: '14px 16px', fontWeight: 800, color: '#1e40af' }}>
                      {row.amount_paid > 0 ? `${row.amount_paid.toLocaleString()} د.ل` : '—'}
                    </td>

                    {/* Local Cards Count */}
                    <td style={{ verticalAlign: 'middle', padding: '14px 16px', fontWeight: 700 }}>
                      <span style={{ color: '#065f46', fontSize: '1rem' }}>
                        {row.local_cards_count.toLocaleString()}
                      </span>
                    </td>

                    {/* LIFO Cards Count */}
                    <td style={{ verticalAlign: 'middle', padding: '14px 16px', fontWeight: 700 }}>
                      <span style={{ color: '#0369a1', fontSize: '1rem' }}>
                        {row.lifo_cards_count.toLocaleString()}
                      </span>
                    </td>

                    {/* Match Badge */}
                    <td style={{ verticalAlign: 'middle', padding: '14px 16px' }}>
                      {isMatched && (
                        <span style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <i className="fa-solid fa-check-circle"></i> مطابق 100%
                        </span>
                      )}
                      {isDiff && (
                        <span style={{
                          background: '#fee2e2',
                          color: '#b91c1c',
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <i className="fa-solid fa-triangle-exclamation"></i> فارق في الكمية
                        </span>
                      )}
                      {isNotInLifo && (
                        <span style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <i className="fa-solid fa-clock"></i> غير مقيد بالاتحاد
                        </span>
                      )}
                      {isOnlyInLifo && (
                        <span style={{
                          background: '#f3e8ff',
                          color: '#6b21a8',
                          padding: '5px 12px',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <i className="fa-solid fa-asterisk"></i> مقيد بالاتحاد فقط
                        </span>
                      )}
                    </td>

                    {/* Discrepancy Amount */}
                    <td style={{ verticalAlign: 'middle', padding: '14px 16px', fontWeight: 800 }}>
                      {row.cards_diff === 0 ? (
                        <span style={{ color: '#16a34a', fontWeight: 700 }}>0 (مطابق)</span>
                      ) : (
                        <span style={{ color: row.cards_diff > 0 ? '#b45309' : '#dc2626' }}>
                          {row.cards_diff > 0 ? `+${row.cards_diff}` : row.cards_diff} بطاقة
                          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>
                            ({row.financial_diff.toLocaleString()} د.ل)
                          </span>
                        </span>
                      )}
                    </td>

                    {/* Status Breakdown (LIFO) */}
                    <td style={{ verticalAlign: 'middle', padding: '14px 16px', fontSize: '0.82rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ color: '#065f46', fontWeight: 700 }}>
                          <i className="fa-solid fa-circle-check text-success" style={{ fontSize: '10px' }}></i> مباعة: {row.lifo_issued_cards}
                        </span>
                        <span style={{ color: '#1e40af', fontWeight: 700 }}>
                          <i className="fa-solid fa-box text-primary" style={{ fontSize: '10px' }}></i> بالمخزون: {row.lifo_assigned_cards}
                        </span>
                        {row.lifo_canceled_cards > 0 && (
                          <span style={{ color: '#b91c1c', fontWeight: 700 }}>
                            <i className="fa-solid fa-ban text-danger" style={{ fontSize: '10px' }}></i> ملغية: {row.lifo_canceled_cards}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Serial Numbers Range */}
                    <td style={{ verticalAlign: 'middle', padding: '14px 16px', fontSize: '0.82rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                      {row.min_card_number && row.max_card_number ? (
                        <div>
                          <div>من: <strong style={{ color: 'var(--text)' }}>{row.min_card_number}</strong></div>
                          <div>إلى: <strong style={{ color: 'var(--text)' }}>{row.max_card_number}</strong></div>
                        </div>
                      ) : (
                        <span>—</span>
                      )}
                    </td>

                    {/* Receipt Preview */}
                    <td className="no-print" style={{ verticalAlign: 'middle', padding: '14px 16px', textAlign: 'center' }}>
                      {row.receipt_image ? (
                        <button
                          onClick={() => {
                            setSelectedImage(resolveImageUrl(row.receipt_image));
                            setPreviewRotation(0);
                          }}
                          style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#2563eb',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                          title="عرض إيصال الشراء"
                        >
                          <i className="fa-solid fa-file-invoice"></i> الواصل
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>لا يوجد</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Image Preview Modal */}
      {selectedImage && (
        <div
          className="modal-overlay no-print"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setSelectedImage(null)}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: selectedImage.toLowerCase().endsWith('.pdf') ? '80vw' : 'auto',
              height: selectedImage.toLowerCase().endsWith('.pdf') ? '85vh' : 'auto',
              background: '#fff',
              borderRadius: '20px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {selectedImage.toLowerCase().endsWith('.pdf') ? (
              <iframe src={selectedImage} style={{ width: '100%', height: '100%', border: 'none' }} title="Receipt PDF" />
            ) : (
              <img
                src={selectedImage}
                alt="Receipt"
                style={{
                  maxWidth: '100%',
                  maxHeight: '90vh',
                  transform: `rotate(${previewRotation}deg)`,
                  transition: 'transform 0.3s ease'
                }}
              />
            )}

            <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '10px', zIndex: 10 }}>
              <button
                onClick={() => setPreviewRotation(prev => prev + 90)}
                style={{
                  background: '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '42px',
                  height: '42px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="تدوير الصورة"
              >
                <i className="fa-solid fa-rotate-right"></i>
              </button>
              <button
                onClick={() => setSelectedImage(null)}
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '42px',
                  height: '42px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}
                title="إغلاق"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
