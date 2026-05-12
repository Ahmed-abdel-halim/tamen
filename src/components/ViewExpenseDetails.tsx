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
      const json = await res.json();
      const expenseData = json.data;
      if (expenseData.items && typeof expenseData.items === 'string') {
        try { expenseData.items = JSON.parse(expenseData.items); }
        catch { expenseData.items = []; }
      }
      setExpense(expenseData);
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

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow || !expense) return;

    const qrData = `مصروف رقم: ${expense.voucher_number || expense.id}\nالبيان: ${expense.name}\nالمبلغ: ${expense.amount} ${expense.currency}\nالتاريخ: ${formatDate(expense.expense_date)}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>وصل مصروف #${expense.voucher_number || expense.id}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          @media print { 
            @page { margin: 10mm; size: A4; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { 
            font-family: 'Cairo', sans-serif; 
            margin: 0; 
            padding: 10px; 
            color: #000;
            background: #fff;
          }
          .main-border {
            border: 2px solid #000;
            padding: 15px;
            min-height: 250mm;
            position: relative;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .header-table td {
            border: 1px solid #000;
            padding: 10px;
            vertical-align: middle;
          }
          .logo-cell { width: 20%; text-align: center; }
          .title-cell { width: 60%; text-align: center; background: #f8f9fa; }
          .qr-cell { width: 20%; text-align: center; }
          
          .doc-title {
            font-size: 20px;
            font-weight: 900;
            margin: 0;
            color: #000;
          }

          .section-title {
            background: #e2e8f0;
            border: 1.5px solid #000;
            padding: 6px 15px;
            font-weight: 900;
            font-size: 15px;
            margin: 20px 0 0 0;
            text-align: center;
          }

          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0;
          }
          .data-table td {
            border: 1px solid #000;
            padding: 8px 12px;
            font-size: 13px;
          }
          .label {
            background: #f8f9fa;
            font-weight: 800;
            width: 25%;
          }
          .value {
            width: 25%;
            font-weight: 600;
          }

          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: -1px;
          }
          .items-table th, .items-table td {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
            font-size: 13px;
          }
          .items-table th {
            background: #f1f5f9;
            font-weight: 900;
          }

          .total-row {
            background: #f8f9fa;
            font-weight: 900;
            font-size: 15px;
          }

          .signature-box {
            margin-top: 40px;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .sig-item {
            border: 1.5px solid #000;
            padding: 15px 10px;
            text-align: center;
          }
          .sig-line {
            border-top: 1px dashed #000;
            margin-top: 35px;
            padding-top: 5px;
            font-size: 12px;
            font-weight: 800;
          }

          .footer-meta {
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 2px solid #000;
            padding-top: 10px;
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="main-border">
          <table class="header-table">
            <tr>
              <td class="logo-cell"><img src="/img/logo.png" style="width: 80px;"></td>
              <td class="title-cell">
                <div style="font-size: 14px; font-weight: 800; margin-bottom: 5px;">شركة المدار الليبي للتأمين</div>
                <h1 class="doc-title">مـلخـص تـفاصـيـل المـصـروف</h1>
                <div style="font-size: 12px; margin-top: 5px;">إدارة الشؤون المالية - الموارد البشرية</div>
              </td>
              <td class="qr-cell"><img src="${qrApiUrl}" style="width: 80px;"></td>
            </tr>
          </table>

          <div class="section-title">بيانات المصروف الأساسية</div>
          <table class="data-table">
            <tr>
              <td class="label">رقم المصروف:</td>
              <td class="value">${expense.voucher_number || expense.id}</td>
              <td class="label">تاريخ الصرف:</td>
              <td class="value">${formatDate(expense.expense_date)}</td>
            </tr>
            <tr>
              <td class="label">الفئة:</td>
              <td class="value">${expense.category}</td>
              <td class="label">نوع المصروف:</td>
              <td class="value">${expense.expense_type === 'fixed' ? 'ثابت' : 'مستهلك'}</td>
            </tr>
            <tr>
              <td class="label">المستلم:</td>
              <td class="value" colspan="3">${expense.recipient || '---'}</td>
            </tr>
            <tr>
              <td class="label">البيان / الغرض:</td>
              <td class="value" colspan="3" style="font-weight: 900; font-size: 14px;">${expense.name}</td>
            </tr>
          </table>

          <div class="section-title">تفاصيل البنود والكميات</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 15%;">رقم الصنف</th>
                <th style="width: 45%;">البيان التفصيلي</th>
                <th style="width: 10%;">الكمية</th>
                <th style="width: 15%;">سعر الوحدة</th>
                <th style="width: 15%;">القيمة</th>
              </tr>
            </thead>
            <tbody>
              ${expense.items && expense.items.length > 0 ? expense.items.map(item => `
                <tr>
                  <td>${item.item_number || '-'}</td>
                  <td style="text-align: right;">${item.statement}</td>
                  <td>${item.quantity}</td>
                  <td>${(item.price || 0).toLocaleString()}</td>
                  <td style="font-weight: bold;">${(item.value || 0).toLocaleString()}</td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="5" style="padding: 20px;">لا توجد بنود تفصيلية مضافة</td>
                </tr>
              `}
              <tr class="total-row">
                <td colspan="4" style="text-align: left; padding-left: 20px;">إجمالي القيمة المستحقة:</td>
                <td style="font-size: 16px; color: #000;">${(expense.amount || 0).toLocaleString()} ${expense.currency === 'USD' ? '$' : 'د.ل'}</td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">ملاحظات إضافية</div>
          <div style="border: 1px solid #000; padding: 10px; min-height: 60px; font-size: 13px;">
            ${expense.notes || 'لا توجد ملاحظات إضافية'}
          </div>

          <div class="signature-box">
            <div class="sig-item">
              <div style="font-weight: 900;">إعداد المحاسب</div>
              <div class="sig-line">توقيع / ختم</div>
            </div>
            <div class="sig-item">
              <div style="font-weight: 900;">اعتماد المدير المالي</div>
              <div class="sig-line">توقيع / ختم</div>
            </div>
            <div class="sig-item">
              <div style="font-weight: 900;">استلام المستفيد</div>
              <div class="sig-line">توقيع / بصمة</div>
            </div>
          </div>

          <div class="footer-meta">
            تم استخراج هذا المستند آلياً من نظام المدار الليبي للتأمين - بتاريخ ${new Date().toLocaleString('ar-LY')}
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

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
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handlePrint}
            style={{ background: '#014cb1', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fa-solid fa-print"></i> طباعة الواصل
          </button>
          <button
            onClick={() => navigate('/reports/expenses')}
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fa-solid fa-arrow-right"></i> رجوع
          </button>
        </div>
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
              {(expense.amount || 0).toLocaleString()} {expense.currency === 'USD' ? '$' : 'د.ل'}
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
                        <td style={{ padding: '11px 12px', border: '1px solid var(--border)', textAlign: 'center', color: 'var(--text)' }}>{(item.price || 0).toLocaleString()}</td>
                        <td style={{ padding: '11px 12px', border: '1px solid var(--border)', textAlign: 'center', fontWeight: 'bold', color: 'var(--text)' }}>{(item.value || 0).toLocaleString()}</td>
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
                          {(expense.amount || 0).toLocaleString()} {expense.currency === 'USD' ? '$' : 'د.ل'}
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
                {expense.receipt_image.toLowerCase().endsWith('.pdf') ? (
                  <div style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                    <iframe
                      src={resolveImageUrl(expense.receipt_image)}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      title="Receipt PDF"
                    />
                  </div>
                ) : (
                  <a href={resolveImageUrl(expense.receipt_image)} target="_blank" rel="noreferrer">
                    <img
                      src={resolveImageUrl(expense.receipt_image)}
                      alt="Receipt"
                      style={{ maxWidth: '100%', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', border: '3px solid var(--border)', cursor: 'zoom-in' }}
                    />
                  </a>
                )}
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
