import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL, resolveImageUrl } from "../config/api";

type ExpenseItem = {
  item_number?: string;
  statement: string;
  quantity: number;
  price: number;
  value: number;
};

type Expense = {
  id: number;
  name: string;
  recipient?: string;
  category: string;
  amount: number;
  currency: string;
  voucher_number?: string;
  receipt_image?: string;
  expense_type?: string;
  expense_date: string;
  status: string;
  notes?: string;
  items?: ExpenseItem[];
  created_at: string;
};

export default function ViewExpenseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchExpense();
  }, [id]);

  const fetchExpense = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/expenses/${id}`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch expense');
      const data = await res.json();
      if (data.items && typeof data.items === 'string') {
        try { data.items = JSON.parse(data.items); }
        catch { data.items = []; }
      }
      setExpense(data);
    } catch (error: any) {
      showToast(`حدث خطأ: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };



  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('ar-LY', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const Row = ({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) => (
    <div style={{ display: 'flex', padding: '12px 16px', borderBottom: '1px solid var(--border)', alignItems: 'center', gap: '15px' }}>
      <span style={{ fontWeight: '700', color: 'var(--muted)', fontSize: '0.85rem', minWidth: '150px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: highlight ? '800' : '600', color: highlight ? '#3b82f6' : 'var(--text)', fontSize: highlight ? '1.05rem' : '0.9rem' }}>{value}</span>
    </div>
  );

  if (loading) return (
    <div style={{ padding: '100px', textAlign: 'center', color: 'var(--muted)' }}>
      <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '15px' }}></i>
      <p>جار التحميل...</p>
    </div>
  );

  if (!expense) return (
    <div style={{ padding: '100px', textAlign: 'center' }}>
      <i className="fa-solid fa-circle-exclamation" style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '20px' }}></i>
      <p style={{ color: 'var(--text)' }}>المصروف غير موجود</p>
      <button onClick={() => navigate('/reports/expenses')} className="btn-primary" style={{ marginTop: '20px' }}>العودة للقائمة</button>
    </div>
  );

  return (
    <section className="users-management">
      <div className="users-breadcrumb" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>الشؤون المالية / إدارة المصروفات / تفاصيل المصروف</span>
        <button
          onClick={() => navigate('/reports/expenses')}
          style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <i className="fa-solid fa-arrow-right"></i> رجوع
        </button>
      </div>

      <div className="users-card" style={{ padding: '0', overflow: 'hidden' }}>
        {/* Header Banner */}
        <div style={{ padding: '24px 28px', background: 'linear-gradient(135deg, #014cb1, #003580)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>{expense.name}</h2>
            <p style={{ margin: '6px 0 0', opacity: 0.8, fontSize: '0.9rem' }}>{expense.category} | {formatDate(expense.expense_date)}</p>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
              {expense.amount.toLocaleString()} {expense.currency === 'USD' ? '$' : 'د.ل'}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '4px' }}>{expense.status}</div>
          </div>
        </div>

        {/* Body Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr' }}>
          {/* Left: Main Info */}
          <div style={{ background: 'var(--card-bg)', borderLeft: '1px solid var(--border)' }}>
            {/* Basic Data */}
            <div style={{ padding: '0 0 8px' }}>
              <h3 style={{ padding: '16px 18px 12px', borderBottom: '2px solid #014cb1', color: '#3b82f6', margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-circle-info"></i> البيانات الأساسية
              </h3>
              <Row label="اسم المصروف / البيان" value={expense.name} />
              <Row label="المستلم" value={expense.recipient || 'غير محدد'} />
              <Row label="الفئة" value={expense.category} />
              <Row label="التاريخ" value={formatDate(expense.expense_date)} />
              <Row label="نوع المصروف" value={
                <span style={{ padding: '3px 12px', borderRadius: '20px', background: expense.expense_type === 'fixed' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)', color: expense.expense_type === 'fixed' ? '#3b82f6' : '#10b981', fontWeight: 700, fontSize: '0.82rem' }}>
                  {expense.expense_type === 'fixed' ? 'ثابت' : 'مستهلك'}
                </span>
              } />
              <Row label="رقم الواصل" value={expense.voucher_number || '---'} />
              <Row label="الحالة" value={
                <span style={{ padding: '3px 12px', borderRadius: '20px', background: expense.status === 'مدفوع' ? 'rgba(16,185,129,0.15)' : 'rgba(234,179,8,0.15)', color: expense.status === 'مدفوع' ? '#10b981' : '#ca8a04', fontWeight: 700, fontSize: '0.82rem' }}>
                  {expense.status}
                </span>
              } />
            </div>

            {/* Items Table */}
            <div style={{ padding: '0 0 16px' }}>
              <h3 style={{ padding: '16px 18px 12px', borderBottom: '2px solid #014cb1', borderTop: '1px solid var(--border)', color: '#3b82f6', margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-list-ul"></i> تفاصيل الفاتورة (البنود)
              </h3>
              <div style={{ padding: '16px 18px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid var(--border)', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg)' }}>
                      <th style={{ padding: '11px 12px', border: '1px solid var(--border)', textAlign: 'right', color: 'var(--text)', fontWeight: 700 }}>رقم الصنف</th>
                      <th style={{ padding: '11px 12px', border: '1px solid var(--border)', textAlign: 'right', color: 'var(--text)', fontWeight: 700 }}>البيان</th>
                      <th style={{ padding: '11px 12px', border: '1px solid var(--border)', textAlign: 'center', color: 'var(--text)', fontWeight: 700 }}>الكمية</th>
                      <th style={{ padding: '11px 12px', border: '1px solid var(--border)', textAlign: 'center', color: 'var(--text)', fontWeight: 700 }}>السعر</th>
                      <th style={{ padding: '11px 12px', border: '1px solid var(--border)', textAlign: 'center', color: 'var(--text)', fontWeight: 700 }}>القيمة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expense.items && expense.items.length > 0 ? expense.items.map((item, idx) => (
                      <tr key={idx} style={{ background: idx % 2 === 0 ? 'var(--card-bg)' : 'var(--bg)' }}>
                        <td style={{ padding: '11px 12px', border: '1px solid var(--border)', color: 'var(--text)' }}>{item.item_number || '-'}</td>
                        <td style={{ padding: '11px 12px', border: '1px solid var(--border)', color: 'var(--text)' }}>{item.statement}</td>
                        <td style={{ padding: '11px 12px', border: '1px solid var(--border)', textAlign: 'center', color: 'var(--text)' }}>{item.quantity}</td>
                        <td style={{ padding: '11px 12px', border: '1px solid var(--border)', textAlign: 'center', color: 'var(--text)' }}>{item.price.toLocaleString()}</td>
                        <td style={{ padding: '11px 12px', border: '1px solid var(--border)', textAlign: 'center', fontWeight: 'bold', color: 'var(--text)' }}>{item.value.toLocaleString()}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} style={{ padding: '25px', textAlign: 'center', color: 'var(--muted)', background: 'var(--card-bg)' }}>لا توجد بنود تفصيلية لهذا المصروف</td>
                      </tr>
                    )}
                  </tbody>
                  {expense.items && expense.items.length > 0 && (
                    <tfoot>
                      <tr style={{ background: 'rgba(59,130,246,0.1)' }}>
                        <td colSpan={4} style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: 'var(--text)', border: '1px solid var(--border)' }}>الإجمالي:</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: '900', color: '#3b82f6', fontSize: '1rem', border: '1px solid var(--border)' }}>
                          {expense.amount.toLocaleString()} {expense.currency === 'USD' ? '$' : 'د.ل'}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Notes */}
            <div style={{ padding: '0 18px 20px' }}>
              <h4 style={{ margin: '0 0 10px', color: 'var(--muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-note-sticky"></i> ملاحظات:
              </h4>
              <div style={{ background: 'var(--bg)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text)' }}>
                {expense.notes || 'لا توجد ملاحظات'}
              </div>
            </div>
          </div>

          {/* Right: Receipt Image + Meta */}
          <div style={{ background: 'var(--bg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-camera" style={{ color: '#3b82f6' }}></i> صورة الواصل / الإيصال
            </h3>

            {expense.receipt_image ? (
              <div style={{ textAlign: 'center' }}>
                <a href={resolveImageUrl(expense.receipt_image)} target="_blank" rel="noreferrer">
                  <img
                    src={resolveImageUrl(expense.receipt_image)}
                    alt="Receipt"
                    style={{ maxWidth: '100%', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', border: '3px solid var(--border)', cursor: 'zoom-in' }}
                  />
                </a>
                <button
                  onClick={() => window.open(resolveImageUrl(expense.receipt_image!), '_blank')}
                  style={{ marginTop: '14px', background: '#014cb1', color: '#fff', border: 'none', padding: '9px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <i className="fa-solid fa-expand"></i> عرض الحجم الكامل
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, minHeight: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--card-bg)', borderRadius: '12px', border: '2px dashed var(--border)', color: 'var(--muted)', gap: '10px' }}>
                <i className="fa-solid fa-image-slash" style={{ fontSize: '2.5rem' }}></i>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>لم يتم رفع صورة لهذا الواصل</p>
              </div>
            )}

            {/* Meta card */}
            <div style={{ background: 'var(--card-bg)', padding: '18px', borderRadius: '12px', border: '1px solid var(--border)', marginTop: 'auto' }}>
              <h4 style={{ margin: '0 0 14px', fontSize: '0.85rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-clock-rotate-left"></i> معلومات التسجيل
              </h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="fa-solid fa-user" style={{ color: '#3b82f6' }}></i>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>النظام / المحاسب المالي</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '3px' }}>
                    تاريخ الإضافة: {new Date(expense.created_at).toLocaleString('ar-LY')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
