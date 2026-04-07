import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

interface DebtRecord {
  id: number;
  agent_id: number;
  agency_name: string;
  total_debt: number;
  last_payment_date: string;
  status: 'critical' | 'warning' | 'normal';
  notes: string;
}

export default function OutstandingDebts() {
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reports/outstanding-debts`);
      if (response.ok) {
        const data = await response.json();
        setDebts(data);
      } else {
        showToast('حدث خطأ أثناء جلب مديونيات الوكلاء', 'error');
      }
    } catch (error) {
      showToast('تعذر الاتصال بالسيرفر للمديونيات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'critical': return { bg: '#fee2e2', color: '#991b1b', text: 'خطير (متجاوز)' };
      case 'warning': return { bg: '#fef3c7', color: '#92400e', text: 'تنبيه' };
      default: return { bg: '#dcfce7', color: '#166534', text: 'طبيعي' };
    }
  };

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', borderTop: '4px solid #ef4444' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>إجمالي الديون القائمة</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>16,700 د.ل</div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', borderTop: '4px solid #f59e0b' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>ديون متأخرة (أكثر من 30 يوم)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>8,500 د.ل</div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', borderTop: '4px solid #139625' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>وكلاء ملتزمون بالسداد</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#139625' }}>12 وكيل</div>
        </div>
      </div>

      <div className="users-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="users-table">
          <thead>
            <tr>
              <th>اسم الوكيل / الجهة</th>
              <th>إجمالي المديونية</th>
              <th>تاريخ آخر دفعة</th>
              <th>الحالة المادية</th>
              <th>ملاحظات</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>جاري جلب بيانات المديونيات...</td></tr>
            ) : debts.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>لا توجد ديون مستحقة حالياً</td></tr>
            ) : debts.map(debt => {
              const badge = getStatusBadge(debt.status);
              return (
                <tr key={debt.id}>
                  <td style={{ fontWeight: 'bold' }}>{debt.agency_name}</td>
                  <td style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '16px' }}>{debt.total_debt.toLocaleString()} د.ل</td>
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
                  <td style={{ fontSize: '13px', color: 'var(--muted)' }}>{debt.notes}</td>
                  <td>
                    <button 
                      style={{ background: '#014cb1', color: '#fff', border: 'none', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                      onClick={() => window.location.href = `/reports/branch-agent-account?agent_id=${debt.agent_id}`}
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
