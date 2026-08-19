import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { showGlobalLoader, hideGlobalLoader } from './LoaderOverlay';

interface DebtRecord {
  id: number;
  agent_id: number;
  agency_name: string;
  total_sales?: number;
  total_commissions?: number;
  company_share?: number;
  total_paid?: number;
  total_debt: number;
  last_payment_date: string;
  status: 'critical' | 'warning' | 'normal';
  notes: string;
}

export default function OutstandingDebts() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [debtSizeFilter, setDebtSizeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('highest_debt');

  useEffect(() => {
    fetchDebts();
  }, []);

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

      let response: Response;
      try {
        response = await fetch(`${API_BASE_URL}/reports/outstanding-debts`, { headers });
      } catch (primaryErr) {
        console.warn('Primary API endpoint failed, trying fallback /api endpoint...', primaryErr);
        response = await fetch('/api/reports/outstanding-debts', { headers });
      }

      if (response.ok) {
        const data = await response.json();
        setDebts(data);
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

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'critical': return { bg: '#fee2e2', color: '#991b1b', text: 'خطير (متجاوز)' };
      case 'warning': return { bg: '#fef3c7', color: '#92400e', text: 'تنبيه' };
      default: return { bg: '#dcfce7', color: '#166534', text: 'طبيعي' };
    }
  };

  // Dynamic summary calculations
  const totalOutstanding = debts.reduce((sum, d) => sum + (d.total_debt > 0 ? d.total_debt : 0), 0);
  const totalCritical = debts.filter(d => d.status === 'critical').reduce((sum, d) => sum + d.total_debt, 0);
  const totalNormalAgents = debts.filter(d => d.status === 'normal').length;

  // Filtered & Sorted debts
  const filteredDebts = debts
    .filter(debt => {
      // 1. Search Filter
      const matchesSearch = debt.agency_name?.toLowerCase().includes(searchTerm.toLowerCase());

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

  return (
    <section className="users-management">
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
          <i className="fa-solid fa-hand-holding-dollar" style={{ marginLeft: '10px', color: '#ef4444' }}></i>
          متابعة الديون والمديونيات المستحقة
        </span>
        <button className="primary" onClick={fetchDebts}>
          <i className="fa-solid fa-sync" style={{ marginLeft: '8px' }}></i>
          تحديث الكشف
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', borderTop: '4px solid #ef4444' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>إجمالي الديون القائمة</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
            {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل
          </div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', borderTop: '4px solid #f59e0b' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>ديون متأخرة خطيرة (&gt; 10 آلاف)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>
            {totalCritical.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل
          </div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', borderTop: '4px solid #139625' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>وكلاء بمديونية طبيعية</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#139625' }}>{totalNormalAgents} وكيل</div>
        </div>
      </div>

      {/* Filtering and Search Bar */}
      <div style={{
        background: 'var(--panel)',
        padding: '16px 20px',
        borderRadius: '12px',
        marginBottom: '20px',
        border: '1px solid var(--border)',
        display: 'flex',
        gap: '15px',
        alignItems: 'center',
        flexWrap: 'wrap',
        direction: 'rtl'
      }}>
        {/* Search */}
        <div style={{ flex: '1', minWidth: '200px', position: 'relative' }}>
          <input
            type="text"
            placeholder="ابحث باسم الوكالة أو الجهة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 40px 10px 15px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <i className="fa-solid fa-magnifying-glass" style={{
            position: 'absolute',
            right: '15px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
          }}></i>
        </div>

        {/* Filter by Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>الحالة:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 15px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
              outline: 'none',
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
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>حجم الدين:</label>
          <select
            value={debtSizeFilter}
            onChange={(e) => setDebtSizeFilter(e.target.value)}
            style={{
              padding: '10px 15px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
              outline: 'none',
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
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--muted)' }}>ترتيب حسب:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: '10px 15px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--input-bg)',
              color: 'var(--text)',
              fontSize: '13px',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="highest_debt">المديونية الأعلى</option>
            <option value="lowest_debt">المديونية الأقل</option>
            <option value="latest_payment">تاريخ آخر دفعة (الأحدث)</option>
          </select>
        </div>
      </div>

      <div className="users-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="users-table">
          <thead>
            <tr>
              <th>اسم الوكيل / الجهة</th>
              <th>حصة الشركة المستحقة</th>
              <th>إجمالي المدفوع (المقبوضات)</th>
              <th>المديونية المستحقة القائمة</th>
              <th>تاريخ آخر دفعة</th>
              <th>الحالة المادية</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--accent-cyan)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <i className="fa-solid fa-spinner fa-spin fa-2x"></i>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-muted)' }}>جاري جلب بيانات المديونيات...</span>
                  </div>
                </td>
              </tr>
            ) : filteredDebts.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  لا توجد مديونيات مطابقة للبحث أو الفلتر حالياً
                </td>
              </tr>
            ) : filteredDebts.map(debt => {
              const badge = getStatusBadge(debt.status);
              const companyShare = debt.company_share ?? debt.total_debt;
              const totalPaid = debt.total_paid ?? 0;
              return (
                <tr key={debt.id}>
                  <td style={{ fontWeight: 'bold' }}>{debt.agency_name}</td>
                  <td style={{ fontWeight: 'bold', color: 'var(--text)' }}>
                    {companyShare.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل
                  </td>
                  <td style={{ color: '#059669', fontWeight: 'bold' }}>
                    {totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل
                  </td>
                  <td style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '15px' }}>
                    {debt.total_debt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل
                  </td>
                  <td>{debt.last_payment_date}</td>
                  <td>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
                      background: badge.bg,
                      color: badge.color,
                      fontWeight: '800'
                    }}>
                      {badge.text}
                    </span>
                  </td>
                  <td>
                    <button 
                      style={{ background: '#014cb1', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                      onClick={() => window.location.href = `/reports/monthly-account-closure?agent_id=${debt.agent_id}`}
                    >
                      عرض كشف الحساب
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
