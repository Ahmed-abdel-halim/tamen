import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchableSelect from './SearchableSelect';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';
import { API_BASE_URL, resolveImageUrl } from '../config/api';

interface ExpenseItem {
  item_number?: string;
  statement: string;
  quantity: number;
  price: number;
  value: number;
}

interface Expense {
  id: number;
  name: string;
  recipient?: string;
  category: string;
  sub_category?: string;
  amount: number;
  currency: 'LYD' | 'USD';
  voucher_number?: string;
  receipt_image?: string;
  expense_type: string;
  expense_date: string;
  status: string;
  notes?: string;
  items?: ExpenseItem[];
  is_indemnity?: boolean;
  indemnity_type?: string;
  payment_source?: string;
}

interface Statistics {
  monthly_total: number;
  monthly_count: number;
  monthly_average: number;
}

interface UnionPurchase {
  id: number;
  request_number: string;
  amount_paid: number;
  card_price: number;
  union_fee_per_card: number;
  company_deposit_per_card: number;
  cards_count: number;
  total_union_fee: number;
  total_company_deposit: number;
  payment_method: string;
  purchase_date: string;
  receipt_image: string | null;
  notes: string;
}




export default function ExpenseManagement({ 
  activeTabOverride = 'expenses',
  hideHeader = false
}: { 
  activeTabOverride?: 'expenses' | 'union' | 'indemnities';
  hideHeader?: boolean;
}) {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    monthly_total: 0,
    monthly_count: 0,
    monthly_average: 0
  });

  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Filter States
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [currentUnionPage, setCurrentUnionPage] = useState(1);
  const unionItemsPerPage = 10;

  // Form states
  const [name, setName] = useState('');
  const [recipient, setRecipient] = useState('');
  const [category, setCategory] = useState('قرطاسية');
  const [subCategory, setSubCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'LYD' | 'USD'>('LYD');
  const [voucherNumber, setVoucherNumber] = useState('');
  const [expenseType, setExpenseType] = useState<string>('حوالة مصرفية');
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [expenseReceiptImage, setExpenseReceiptImage] = useState<File | null>(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState('مدفوع');
  const [notes, setNotes] = useState('');
  const [indemnityType, setIndemnityType] = useState('orange_card');
  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([]);
  const [agents, setAgents] = useState<{ id: number; agency_name: string; agent_name: string }[]>([]);
  const [recipientType, setRecipientType] = useState<'employee' | 'agent' | 'custom'>('employee');
  const [banks, setBanks] = useState<{ id: number; name: string; account_number?: string }[]>([]);
  const [paymentSource, setPaymentSource] = useState<string>('treasury');

  // Categories Management States
  const [dbCategories, setDbCategories] = useState<{ id: number; name: string }[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ id: number; name: string } | null>(null);

  // SubCategories Management States
  const [dbSubCategories, setDbSubCategories] = useState<{ id: number; name: string; category_name: string }[]>([]);
  const [showSubCategoryModal, setShowSubCategoryModal] = useState(false);
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [editingSubCategory, setEditingSubCategory] = useState<{ id: number; name: string; category_name: string } | null>(null);

  // Custom Confirmation Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, title: string, message: string, onConfirm: () => void } | null>(null);

  // Union Balance States
  const [activeTab, setActiveTab] = useState<'expenses' | 'union' | 'indemnities'>(activeTabOverride);

  const handlePrintUnionVoucher = (u: UnionPurchase) => {
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) return;

    const qrData = `وصل رصيد اتحاد رقم: ${u.request_number}\nعدد البطاقات: ${u.cards_count}\nالمبلغ المدفوع: ${u.amount_paid} د.ل\nالتاريخ: ${u.purchase_date}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>وصل رصيد اتحاد #${u.request_number}</title>
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
            grid-template-columns: repeat(2, 1fr);
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
      <body onload="window.print(); window.onafterprint = () => window.close();">
        <div class="main-border">
          <table class="header-table">
            <tr>
              <td class="logo-cell"><img src="/img/logo.png" style="width: 80px;"></td>
              <td class="title-cell">
                <div style="font-size: 14px; font-weight: 800; margin-bottom: 5px;">شركة المدار الليبي للتأمين</div>
                <h1 class="doc-title">إيـصـال شـراء رصـيـد (الـبـرتـقـالـيـة)</h1>
                <div style="font-size: 12px; margin-top: 5px;">إدارة البطاقات الموحدة - رصيد الاتحاد</div>
              </td>
              <td class="qr-cell"><img src="${qrApiUrl}" style="width: 80px;"></td>
            </tr>
          </table>

          <div class="section-title">بيانات طلب الرصيد</div>
          <table class="data-table">
            <tr>
              <td class="label">رقم الطلب:</td>
              <td class="value">${u.request_number}</td>
              <td class="label">تاريخ الطلب:</td>
              <td class="value">${u.purchase_date}</td>
            </tr>
            <tr>
              <td class="label">طريقة الدفع:</td>
              <td class="value">${u.payment_method}</td>
              <td class="label">عدد البطاقات:</td>
              <td class="value">${u.cards_count} بطاقة</td>
            </tr>
          </table>

          <div class="section-title">تفاصيل الحصص والودائع</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%;">البيان</th>
                <th style="width: 20%;">الكمية</th>
                <th style="width: 15%;">سعر الوحدة</th>
                <th style="width: 15%;">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="text-align: right;">شراء رصيد بطاقات اتحاد</td>
                <td>${u.cards_count}</td>
                <td>${u.card_price} د.ل</td>
                <td style="font-weight: 700;">${(u.cards_count * u.card_price).toLocaleString()} د.ل</td>
              </tr>
              <tr>
                <td style="text-align: right;">خصم الاتحاد (المصروفات)</td>
                <td>${u.cards_count}</td>
                <td>${u.union_fee_per_card} د.ل</td>
                <td>${(u.cards_count * u.union_fee_per_card).toLocaleString()} د.ل</td>
              </tr>
              <tr>
                <td style="text-align: right;">وديعة الشركة</td>
                <td>${u.cards_count}</td>
                <td>${u.company_deposit_per_card} د.ل</td>
                <td>${(u.cards_count * u.company_deposit_per_card).toLocaleString()} د.ل</td>
              </tr>
              <tr class="total-row">
                <td colspan="3" style="text-align: left; padding-left: 20px;">صافي المبلغ المدفوع:</td>
                <td style="font-size: 16px;">${parseFloat(u.amount_paid.toString()).toLocaleString()} د.ل</td>
              </tr>
            </tbody>
          </table>

          <div class="section-title">ملاحظات</div>
          <div style="border: 1px solid #000; padding: 10px; min-height: 50px; font-size: 13px;">
            ${u.notes || 'لا توجد ملاحظات'}
          </div>

          <div class="signature-box">
            <div class="sig-item">
              <div style="font-weight: 900;">الموظف المختص</div>
              <div class="sig-line">توقيع / ختم</div>
            </div>
            <div class="sig-item">
              <div style="font-weight: 900;">المدير المالي</div>
              <div class="sig-line">توقيع / ختم</div>
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

  const handlePrintReport = () => {
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) return;

    const currentData = activeTab === 'union' ? filteredUnion : filteredExpenses;
    const title = activeTab === 'union' ? 'تقرير سجل رصيد الاتحاد' :
      activeTab === 'expenses' ? 'تقرير المصروفات التشغيلية' : 'تقرير التعويضات والمطالبات المالية';

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          body { font-family: 'Cairo', sans-serif; margin: 20px; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #014cb1; padding-bottom: 15px; }
          .header h1 { margin: 0; color: #014cb1; font-size: 24px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: right; font-size: 13px; }
          th { background: #f8fafc; font-weight: 900; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #64748b; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body onload="window.print(); window.onafterprint = () => window.close();">
        <div class="header">
          <div><h1>شركة المدار الليبي للتأمين</h1><p>${title}</p></div>
          <img src="/img/logo.png" style="height: 60px;">
        </div>
        <table>
          <thead>
            <tr>
              ${activeTab === 'union' ? `
                <th>رقم الطلب</th>
                <th>المبلغ</th>
                <th>عدد البطاقات</th>
                <th>خصم الاتحاد</th>
                <th>وديعة الشركة</th>
                <th>التاريخ</th>
              ` : `
                <th>البيان</th>
                <th>المستلم</th>
                <th>الفئة / البند الفرعي</th>
                <th>طريقة السداد</th>
                <th>المبلغ</th>
                <th>التاريخ</th>
                <th>الحالة</th>
              `}
            </tr>
          </thead>
          <tbody>
            ${currentData.map((item: any) => `
              <tr>
                ${activeTab === 'union' ? `
                  <td>${item.request_number}</td>
                  <td>${item.amount_paid.toLocaleString()} د.ل</td>
                  <td>${item.cards_count}</td>
                  <td>${(item.cards_count * item.union_fee_per_card).toLocaleString()} د.ل</td>
                  <td>${(item.cards_count * item.company_deposit_per_card).toLocaleString()} د.ل</td>
                  <td>${item.purchase_date ? item.purchase_date.split('T')[0] : '-'}</td>
                ` : `
                  <td>${item.name}</td>
                  <td>${item.recipient || '-'}</td>
                  <td>${item.category} ${item.sub_category ? ` / ${item.sub_category}` : ''}</td>
                  <td>${item.expense_type || '-'}</td>
                  <td>${item.amount.toLocaleString()} ${item.currency}</td>
                  <td>${item.expense_date}</td>
                  <td>${item.status}</td>
                `}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">تم استخراج التقرير بتاريخ: ${new Date().toLocaleString('ar-LY')}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintExpenseVoucher = (expense: Expense) => {
    const qrData = `وصل مصروف رقم: ${expense.voucher_number || expense.id}\nالبيان: ${expense.name}\nالمبلغ: ${expense.amount} ${expense.currency}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;

    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) return;

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>وصل مصروف #${expense.voucher_number || expense.id}</title>
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
          .signature-box { margin-top: 40px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
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
                <h1 class="doc-title">مـلخـص تـفاصـيـل المـصـروف</h1>
                <div style="font-size: 12px; margin-top: 5px;">إدارة الشؤون المالية - الموارد البشرية</div>
              </td>
              <td class="qr-cell"><img src="${qrApiUrl}" style="width: 80px;"></td>
            </tr>
          </table>
          <div class="section-title">بيانات المصروف الأساسية</div>
          <table class="data-table">
            <tr><td class="label">رقم المصروف:</td><td>${expense.voucher_number || expense.id}</td><td class="label">تاريخ الصرف:</td><td>${expense.expense_date}</td></tr>
            <tr><td class="label">الفئة:</td><td>${expense.category} ${expense.sub_category ? ` (${expense.sub_category})` : ''}</td><td class="label">طريقة السداد:</td><td>${expense.expense_type || '—'}</td></tr>
            <tr><td class="label">المستلم:</td><td colspan="3">${expense.recipient || '---'}</td></tr>
            <tr><td class="label">البيان / الغرض:</td><td colspan="3" style="font-weight: 900;">${expense.name}</td></tr>
          </table>
          <div class="section-title">تفاصيل البنود والكميات</div>
          <table class="items-table">
            <thead><tr><th style="width: 15%;">رقم الصنف</th><th style="width: 45%;">البيان التفصيلي</th><th style="width: 10%;">الكمية</th><th style="width: 15%;">سعر الوحدة</th><th style="width: 15%;">القيمة</th></tr></thead>
            <tbody>
              ${expense.items && expense.items.length > 0 ? expense.items.map(item => `
                <tr><td>${item.item_number || '-'}</td><td style="text-align: right;">${item.statement}</td><td>${item.quantity}</td><td>${(item.price || 0).toLocaleString()}</td><td style="font-weight: bold;">${(item.value || 0).toLocaleString()}</td></tr>
              `).join('') : `<tr><td colspan="5" style="padding: 20px;">لا توجد بنود تفصيلية مضافة</td></tr>`}
              <tr class="total-row"><td colspan="4" style="text-align: left; padding-left: 20px;">إجمالي القيمة المستحقة:</td><td style="font-size: 16px;">${(expense.amount || 0).toLocaleString()} ${expense.currency === 'USD' ? '$' : 'د.ل'}</td></tr>
            </tbody>
          </table>
          <div class="signature-box">
            <div class="sig-item"><div style="font-weight: 900;">إعداد المحاسب</div><div class="sig-line">توقيع / ختم</div></div>
            <div class="sig-item"><div style="font-weight: 900;">اعتماد المدير المالي</div><div class="sig-line">توقيع / ختم</div></div>
            <div class="sig-item"><div style="font-weight: 900;">استلام المستفيد</div><div class="sig-line">توقيع / بصمة</div></div>
          </div>
          <div class="footer-meta">تم استخراج هذا المستند آلياً من نظام المدار الليبي للتأمين - بتاريخ ${new Date().toLocaleString('ar-LY')}</div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    setActiveTab(activeTabOverride);
  }, [activeTabOverride]);
  const [unionPurchases, setUnionPurchases] = useState<UnionPurchase[]>([]);
  const [showUnionModal, setShowUnionModal] = useState(false);
  const [editingUnionPurchase, setEditingUnionPurchase] = useState<UnionPurchase | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number>(0);

  // Union Form States
  const [requestNumber, setRequestNumber] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [cardPrice, setCardPrice] = useState('20');
  const [unionFeePerCard, setUnionFeePerCard] = useState('5');
  const [companyDepositPerCard, setCompanyDepositPerCard] = useState('15');
  const [paymentMethod, setPaymentMethod] = useState('حوالة مصرفية');
  const [unionPurchaseDate, setUnionPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [unionNotes, setUnionNotes] = useState('');
  const [receiptImage, setReceiptImage] = useState<File | null>(null);



  // Union Filter States
  const [unionSearchFilter, setUnionSearchFilter] = useState('');
  const [unionYearFilter, setUnionYearFilter] = useState('الكل');
  const [unionMonthFilter, setUnionMonthFilter] = useState('الكل');
  const [unionFromDate, setUnionFromDate] = useState('');
  const [unionToDate, setUnionToDate] = useState('');

  // Calculated derived state for Union UI
  const cardsCount = useMemo(() => {
    const paid = parseFloat(amountPaid) || 0;
    const price = parseFloat(cardPrice) || 1;
    return Math.floor(paid / price);
  }, [amountPaid, cardPrice]);

  const totalUnionFee = useMemo(() => cardsCount * (parseFloat(unionFeePerCard) || 0), [cardsCount, unionFeePerCard]);
  const totalCompanyDeposit = useMemo(() => cardsCount * (parseFloat(companyDepositPerCard) || 0), [cardsCount, companyDepositPerCard]);

  const filteredUnion = useMemo(() => {
    return unionPurchases.filter(u => {
      const matchesSearch = !unionSearchFilter || u.request_number?.toLowerCase().includes(unionSearchFilter.toLowerCase());

      const purchaseDate = new Date(u.purchase_date);
      const matchesYear = unionYearFilter === 'الكل' || purchaseDate.getFullYear().toString() === unionYearFilter;
      const matchesMonth = unionMonthFilter === 'الكل' || (purchaseDate.getMonth() + 1).toString() === unionMonthFilter;

      const pDateClean = new Date(purchaseDate.toISOString().split('T')[0]);
      const matchesFrom = !unionFromDate || pDateClean >= new Date(unionFromDate);
      const matchesTo = !unionToDate || pDateClean <= new Date(unionToDate);

      return matchesSearch && matchesYear && matchesMonth && matchesFrom && matchesTo;
    });
  }, [unionPurchases, unionSearchFilter, unionYearFilter, unionMonthFilter, unionFromDate, unionToDate]);

  const unionFilteredStats = useMemo(() => {
    let totalPaid = 0;
    let totalFee = 0;
    let totalDeposit = 0;
    let totalCards = 0;
    filteredUnion.forEach(u => {
      totalPaid += parseFloat(u.amount_paid.toString()) || 0;
      const cards = (parseFloat(u.cards_count.toString()) || 0);
      totalCards += cards;
      totalFee += cards * (parseFloat(u.union_fee_per_card.toString()) || 0);
      totalDeposit += cards * (parseFloat(u.company_deposit_per_card.toString()) || 0);
    });
    return { totalPaid, totalFee, totalDeposit, totalCards };
  }, [filteredUnion]);

  const dynamicCategories = useMemo(() => {
    const list = dbCategories.map(c => c.name);
    const defaults = ['مصاريف تشغيلية', 'مصاريف فنية', 'مصاريف إدارية'];
    return Array.from(new Set([...defaults, ...list]));
  }, [dbCategories]);

  const filteredSubCategories = useMemo(() => {
    return dbSubCategories.filter(sub => sub.category_name === category).map(sub => sub.name);
  }, [dbSubCategories, category]);

  useEffect(() => {
    const list = dbSubCategories.filter(sub => sub.category_name === category);
    if (list.length > 0) {
      if (!list.some(s => s.name === subCategory)) {
        setSubCategory(list[0].name);
      }
    } else {
      setSubCategory('');
    }
  }, [category, dbSubCategories]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const isIndemnity = e.is_indemnity === true || (e.is_indemnity as any) === 1 || (e.is_indemnity as any) === '1';
      if (activeTab === 'indemnities' && !isIndemnity) return false;
      if (activeTab === 'expenses' && isIndemnity) return false;

      const matchesSearch = e.name.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesCategory = categoryFilter === 'الكل' || e.category === categoryFilter;
      const matchesStatus = statusFilter === 'الكل' || e.status === statusFilter;

      const expenseDate = new Date(e.expense_date);
      const matchesFrom = !fromDate || expenseDate >= new Date(fromDate);
      const matchesTo = !toDate || expenseDate <= new Date(toDate);

      return matchesSearch && matchesCategory && matchesStatus && matchesFrom && matchesTo;
    });
  }, [expenses, searchFilter, categoryFilter, statusFilter, fromDate, toDate, activeTab]);

  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredExpenses, currentPage]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  const paginatedUnion = useMemo(() => {
    const startIndex = (currentUnionPage - 1) * unionItemsPerPage;
    return filteredUnion.slice(startIndex, startIndex + unionItemsPerPage);
  }, [filteredUnion, currentUnionPage]);

  const totalUnionPages = Math.ceil(filteredUnion.length / unionItemsPerPage);

  const getPaginationRange = (current: number, total: number) => {
    const delta = 1;
    const range = [];
    const rangeWithDots: (number | string)[] = [];
    let l;
    for (let i = 1; i <= total; i++) {
      if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
        range.push(i);
      }
    }
    for (const i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };

  const filteredStats = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      total,
      count: filteredExpenses.length,
      average: filteredExpenses.length > 0 ? total / filteredExpenses.length : 0
    };
  }, [filteredExpenses]);

  useEffect(() => {
    fetchExpenses();
    fetchUnionBalances();
    fetchEmployees();
    fetchAgents();
    fetchSubCategories();
    fetchCategories();
    fetchBanks();
  }, []);

  useEffect(() => {
    if (!hideHeader) return;

    const handleOpenExpenseModalEvent = () => {
      handleOpenModal();
    };
    const handleExportExcelEvent = () => {
      exportToExcelFunc();
    };
    const handlePrintReportEvent = () => {
      handlePrintReport();
    };
    const handleOpenCategoryModalEvent = () => {
      setShowCategoryModal(true);
    };

    window.addEventListener('open-expense-modal', handleOpenExpenseModalEvent);
    window.addEventListener('export-expense-excel', handleExportExcelEvent);
    window.addEventListener('print-expense-report', handlePrintReportEvent);
    window.addEventListener('open-category-modal', handleOpenCategoryModalEvent);

    return () => {
      window.removeEventListener('open-expense-modal', handleOpenExpenseModalEvent);
      window.removeEventListener('export-expense-excel', handleExportExcelEvent);
      window.removeEventListener('print-expense-report', handlePrintReportEvent);
      window.removeEventListener('open-category-modal', handleOpenCategoryModalEvent);
    };
  }, [hideHeader, expenses, statistics, filteredExpenses, searchFilter, categoryFilter, statusFilter, fromDate, toDate, activeTab]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/expense-categories`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();
      if (data.success) {
        setDbCategories(data.data);
        if (data.data.length > 0 && category === 'قرطاسية') {
          setCategory(data.data[0].name);
        }
      }
    } catch (e) {
      console.error('Error fetching categories:', e);
    }
  };

  const fetchBanks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/bank-settings/banks`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setBanks(data);
      }
    } catch (e) {
      console.error('Error fetching banks:', e);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/employee-payrolls/employees`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();
      setEmployees(data);
    } catch (e) {
      console.error('Error fetching employees:', e);
    }
  };

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/branches-agents`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        const activeAgents = data.filter((a: any) => a.status === 'نشط');
        setAgents(activeAgents.length > 0 ? activeAgents : data);
      }
    } catch (e) {
      console.error('Error fetching agents:', e);
    }
  };

  const fetchSubCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/expense-subcategories`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await response.json();
      if (data.success) {
        setDbSubCategories(data.data);
      }
    } catch (e) {
      console.error('Error fetching subcategories:', e);
    }
  };

  // Reset pages when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilter, categoryFilter, statusFilter, fromDate, toDate, activeTab]);

  useEffect(() => {
    setCurrentUnionPage(1);
  }, [unionSearchFilter, unionYearFilter, unionMonthFilter, unionFromDate, unionToDate]);

  const fetchUnionBalances = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/union-balances`);
      const data = await response.json();
      if (data.success) {
        setUnionPurchases(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/expenses`);
      const data = await response.json();
      if (data.success) {
        setExpenses(data.data);
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      showToast('حدث خطأ أثناء جلب المصروفات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (expense: Expense | null = null) => {
    if (expense) {
      setEditingExpense(expense);
      setName(expense.name);
      setRecipient(expense.recipient || '');
      setCategory(expense.category);
      setSubCategory((expense as any).sub_category || '');
      setAmount(expense.amount.toString());
      setDate(expense.expense_date);
      setStatus(expense.status);
      setNotes(expense.notes || '');
      setCurrency(expense.currency || 'LYD');
      setVoucherNumber(expense.voucher_number || '');
      setExpenseType(expense.expense_type || 'حوالة مصرفية');
      setItems(expense.items || []);
      setExpenseReceiptImage(null);
      setPaymentSource(expense.payment_source || 'treasury');

      // Determine recipient type
      const isEmployee = employees.some(emp => emp.name === expense.recipient);
      const isAgent = agents.some(a => a.agent_name === expense.recipient || a.agency_name === expense.recipient || `${a.agency_name} - ${a.agent_name}` === expense.recipient);
      if (isEmployee) {
        setRecipientType('employee');
      } else if (isAgent) {
        setRecipientType('agent');
      } else {
        setRecipientType('custom');
      }
    } else {
      setEditingExpense(null);
      setName('');
      setRecipient('');
      setCategory(activeTab === 'indemnities' ? 'التعويضات' : 'مصاريف تشغيلية');
      setSubCategory('');
      setAmount('');
      setCurrency('LYD');
      setVoucherNumber('');
      setExpenseType('حوالة مصرفية');
      setItems([]);
      setExpenseReceiptImage(null);
      setDate(new Date().toISOString().split('T')[0]);
      setStatus('مدفوع');
      setNotes('');
      setIndemnityType('orange_card');
      setRecipientType('employee');
      setPaymentSource('treasury');
    }
    setShowModal(true);
  };

  const handleAddExpense = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !amount) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('recipient', recipient);
      formData.append('category', category);
      formData.append('sub_category', subCategory);
      formData.append('amount', amount);
      formData.append('currency', currency);
      formData.append('voucher_number', voucherNumber);
      formData.append('expense_type', expenseType);
      formData.append('expense_date', date);
      formData.append('status', status);
      formData.append('notes', notes);
      formData.append('items', JSON.stringify(items));
      formData.append('is_indemnity', category === 'التعويضات' ? '1' : '0');
      formData.append('indemnity_type', category === 'التعويضات' ? indemnityType : '');
      formData.append('payment_source', category === 'التعويضات' ? (indemnityType === 'orange_card' ? 'union_deposit' : 'bank') : paymentSource);

      if (expenseReceiptImage) {
        formData.append('receipt_image', expenseReceiptImage);
      }

      if (editingExpense) {
        formData.append('_method', 'PUT');
      }

      const url = editingExpense ? `${API_BASE_URL}/expenses/${editingExpense.id}` : `${API_BASE_URL}/expenses`;
      const response = await fetch(url, {
        method: 'POST', // Use POST for FormData, with _method=PUT if editing
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData,
      });
      if (response.ok) {
        showToast(editingExpense ? 'تم تحديث المصروف بنجاح' : 'تم إضافة المصروف بنجاح', 'success');
        setShowModal(false);
        fetchExpenses();
        fetchUnionBalances();
      } else {
        const errData = await response.json().catch(() => ({}));
        let errMsg = errData.message || 'حدث خطأ أثناء الحفظ';
        if (errData.errors) {
          // If there are validation errors, pick the first one
          const firstKey = Object.keys(errData.errors)[0];
          errMsg = errData.errors[firstKey][0];
        }
        showToast(errMsg, 'error');
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف هذا المصروف نهائياً؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const response = await fetch(`${API_BASE_URL}/expenses/${id}`, { method: 'DELETE' });
          if (response.ok) {
            showToast('تم حذف المصروف بنجاح', 'success');
            fetchExpenses();
          } else {
            showToast('فشل حذف المصروف', 'error');
          }
        } catch (error) {
          console.error('Error deleting expense:', error);
          showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
        }
      }
    });
  };


  const handleOpenUnionModal = (purchase: UnionPurchase | null = null) => {
    if (purchase) {
      setEditingUnionPurchase(purchase);
      setRequestNumber(purchase.request_number || '');
      setAmountPaid(purchase.amount_paid.toString());
      setCardPrice(purchase.card_price.toString());
      setUnionFeePerCard(purchase.union_fee_per_card.toString());
      setCompanyDepositPerCard(purchase.company_deposit_per_card.toString());
      setPaymentMethod(purchase.payment_method);
      setUnionPurchaseDate(purchase.purchase_date ? purchase.purchase_date.split('T')[0] : '');
      setUnionNotes(purchase.notes || '');
    } else {
      setEditingUnionPurchase(null);
      setRequestNumber('');
      setAmountPaid('');
      setCardPrice('20');
      setUnionFeePerCard('5');
      setCompanyDepositPerCard('15');
      setPaymentMethod('حوالة مصرفية');
      setUnionPurchaseDate(new Date().toISOString().split('T')[0]);
      setUnionNotes('');
    }
    setShowUnionModal(true);
  };

  const handleAddUnionPurchase = async (e: FormEvent) => {
    e.preventDefault();
    if (!amountPaid || !cardPrice) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('request_number', requestNumber);
      formData.append('amount_paid', amountPaid);
      formData.append('card_price', cardPrice);
      formData.append('union_fee_per_card', unionFeePerCard);
      formData.append('company_deposit_per_card', companyDepositPerCard);
      formData.append('cards_count', cardsCount.toString());
      formData.append('total_union_fee', totalUnionFee.toString());
      formData.append('total_company_deposit', totalCompanyDeposit.toString());
      formData.append('payment_method', paymentMethod);
      formData.append('purchase_date', unionPurchaseDate);
      formData.append('notes', unionNotes);
      if (receiptImage) formData.append('receipt_image', receiptImage);
      if (editingUnionPurchase) formData.append('_method', 'PUT');

      const url = editingUnionPurchase ? `${API_BASE_URL}/union-balances/${editingUnionPurchase.id}` : `${API_BASE_URL}/union-balances`;
      const response = await fetch(url, { method: 'POST', body: formData });
      if (response.ok) {
        showToast(editingUnionPurchase ? 'تم تحديث الإيصال بنجاح' : 'تم تسجيل إيصال رصيد الاتحاد بنجاح', 'success');
        setShowUnionModal(false);
        setReceiptImage(null);
        setAmountPaid('');
        setRequestNumber('');
        setEditingUnionPurchase(null);
        fetchUnionBalances();
      } else {
        const errData = await response.json().catch(() => ({}));
        let errMsg = errData.message || 'فشلت العملية';
        if (errData.errors) {
          const firstKey = Object.keys(errData.errors)[0];
          errMsg = errData.errors[firstKey][0];
        }
        showToast(errMsg, 'error');
      }
    } catch (e) {
      showToast(`خطأ: ${(e as Error).message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUnionPurchase = async (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف إيصال الاتحاد هذا نهائياً؟',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const response = await fetch(`${API_BASE_URL}/union-balances/${id}`, { method: 'DELETE' });
          if (response.ok) {
            showToast('تم حذف الإيصال بنجاح', 'success');
            fetchUnionBalances();
          }
        } catch (e) {
          showToast('خطأ أثناء الحذف', 'error');
        }
      }
    });
  };


  const exportToExcelFunc = async () => {
    if (expenses.length === 0) { showToast('لا توجد بيانات لتصديرها', 'error'); return; }
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const columns = [
        { header: 'البند (الوصف)', key: 'name', width: 35 },
        { header: 'رقم الواصل', key: 'voucher_number', width: 15 },
        { header: 'طريقة السداد', key: 'expense_type', width: 15 },
        { header: 'المستلم', key: 'recipient', width: 25 },
        { header: 'الفئة', key: 'category', width: 20 },
        { header: 'البند الفرعي', key: 'sub_category', width: 20 },
        { header: 'المبلغ', key: 'amount', width: 20 },
        { header: 'العملة', key: 'currency', width: 10 },
        { header: 'التاريخ', key: 'expense_date', width: 15 },
        { header: 'الحالة', key: 'status', width: 15 },
        { header: 'ملاحظات', key: 'notes', width: 30 },
      ];

      const data = expenses.map((e) => ({
        name: e.name,
        voucher_number: e.voucher_number || '-',
        expense_type: e.expense_type || '-',
        recipient: e.recipient || '-',
        category: e.category,
        sub_category: (e as any).sub_category || '-',
        amount: e.amount.toLocaleString(),
        currency: e.currency === 'USD' ? 'دولار' : 'دينار',
        expense_date: e.expense_date,
        status: e.status,
        notes: e.notes || '-',
      }));

      // Summary row
      data.push({
        name: 'الإجمالي الكلي',
        voucher_number: '',
        expense_type: '',
        recipient: '',
        category: '',
        sub_category: '',
        amount: statistics.monthly_total.toLocaleString(),
        currency: '',
        expense_date: '',
        status: `${statistics.monthly_count} عملية`,
        notes: '',
      });

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير المصروفات التشغيلية',
        subtitle: `إجمالي المصروفات: ${statistics.monthly_total.toLocaleString()} د.ل - عدد العمليات: ${statistics.monthly_count}`,
        columns,
        data,
        fileName: 'تقرير_المصروفات',
        qrData: `تقرير المصروفات - شركة المدار الليبي\nإجمالي: ${statistics.monthly_total.toLocaleString()} د.ل\nعدد العمليات: ${statistics.monthly_count}\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير التقرير باحترافية', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  const exportUnionToExcelFunc = async () => {
    if (unionPurchases.length === 0) { showToast('لا توجد بيانات لتصديرها', 'error'); return; }
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      const columns = [
        { header: 'رقم الواصل/الطلب', key: 'request_number', width: 25 },
        { header: 'المبلغ المدفوع', key: 'amount_paid', width: 20 },
        { header: 'عدد البطاقات', key: 'cards_count', width: 15 },
        { header: 'خصم الاتحاد', key: 'union_fee', width: 20 },
        { header: 'وديعة الشركة', key: 'company_deposit', width: 20 },
        { header: 'تاريخ الطلب', key: 'purchase_date', width: 15 },
        { header: 'البيان/ملاحظات', key: 'notes', width: 30 },
      ];

      const data = filteredUnion.map((u) => ({
        request_number: u.request_number || '-',
        amount_paid: parseFloat(u.amount_paid.toString()).toLocaleString() + ' د.ل',
        cards_count: u.cards_count,
        union_fee: parseFloat((u.cards_count * u.union_fee_per_card).toString()).toLocaleString() + ' د.ل',
        company_deposit: parseFloat((u.cards_count * u.company_deposit_per_card).toString()).toLocaleString() + ' د.ل',
        purchase_date: u.purchase_date ? u.purchase_date.split('T')[0] : '',
        notes: u.notes || '-',
      }));

      // Summary row
      data.push({
        request_number: 'الإجمالي المفلتر',
        amount_paid: unionFilteredStats.totalPaid.toLocaleString() + ' د.ل',
        cards_count: unionFilteredStats.totalCards,
        union_fee: unionFilteredStats.totalFee.toLocaleString() + ' د.ل',
        company_deposit: unionFilteredStats.totalDeposit.toLocaleString() + ' د.ل',
        purchase_date: '',
        notes: '',
      });

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - تقرير رصيد الاتحاد والتكاليف',
        subtitle: `خصم الاتحاد: ${unionFilteredStats.totalFee.toLocaleString()} د.ل - وديعة الشركة: ${unionFilteredStats.totalDeposit.toLocaleString()} د.ل`,
        columns,
        data,
        fileName: 'تقرير_سجل_الاتحاد',
        qrData: `سجل الاتحاد - شركة المدار الليبي\nإجمالي المدفوع: ${unionFilteredStats.totalPaid.toLocaleString()} د.ل\nعدد البطاقات: ${unionFilteredStats.totalCards}\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير سجل الاتحاد بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };

  return (
    <section className="users-management">
      <style>{`
        @media print {
          @page { size: landscape; margin: 15mm; }
          body { background: #fff !important; direction: rtl !important; font-family: 'Arial', sans-serif !important; }
          .no-print, .sidebar, .topbar { display: none !important; }
          .print-official-header { display: flex !important; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          .users-management { padding: 0 !important; }
          .users-table-wrapper { border: none !important; box-shadow: none !important; overflow: visible !important; }
          .users-table { width: 100% !important; border-collapse: collapse !important; border: 1.5px solid #000 !important; }
          .users-table th, .users-table td { border: 1px solid #000 !important; padding: 10px !important; color: #000 !important; font-size: 11pt !important; text-align: center !important; }
          .users-table th { background: #f0f0f0 !important; font-weight: bold !important; }
          * { visibility: hidden; }
          .print-official-header, .print-official-header *, 
          .users-table-wrapper, .users-table-wrapper * { visibility: visible; }
          .print-official-header { position: static; }
          .users-table-wrapper { position: relative; top: 0; }
        }
        .print-official-header { display: none; }
      `}</style>

      {/* Official Corporate Header for Print */}
      <div className="print-official-header" style={{ width: '100%', direction: 'rtl' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={resolveImageUrl('/img/logo.png')} alt="Logo" style={{ width: '90px', height: '90px', objectFit: 'contain' }} />
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#000' }}>المدار الليبي للتأمين</h1>
            <p style={{ margin: '5px 0 0 0', fontSize: '1rem', color: '#000' }}>قسم الشؤون المالية والموارد البشرية</p>
          </div>
        </div>

        <div style={{ textAlign: 'center', flex: 1, marginTop: '15px' }}>
          <div style={{ display: 'inline-block', border: '1.5px solid #000', padding: '12px 40px', borderRadius: '15px', backgroundColor: '#f9f9f9' }}>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>
              {activeTab === 'union' ? 'سجل تداول أرصدة بطاقة الاتحاد (البرتقالية)' :
                activeTab === 'expenses' ? 'كشف المصروفات التشغيلية المعتمدة' : 'كشف التعويضات والمطالبات المالية'}
            </h2>
            <p style={{ margin: '8px 0 0 0', fontSize: '1.1rem', fontWeight: 600 }}>
              بتاريخ: {new Date().toLocaleDateString('ar-LY')}
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'left', minWidth: '180px', marginTop: '10px' }}>
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>الرقم المرجعي: {Math.floor(Math.random() * 900000 + 100000)}</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '1rem' }}>الحالة: وثيقة رسمية معتمدة</p>
          <p style={{ margin: '5px 0 0 0', fontSize: '1rem' }}>المستخدم: المدير المالي</p>
        </div>
      </div>

      {/* Expense/Indemnity Tab */}
      {(activeTab === 'expenses' || activeTab === 'indemnities') && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          {!hideHeader && (
            <div className="users-breadcrumb no-print" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px', marginBottom: '30px', color: '#fff',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.1, pointerEvents: 'none' }}>
              <i className={activeTab === 'expenses' ? "fa-solid fa-file-invoice-dollar" : "fa-solid fa-scale-unbalanced"} style={{ fontSize: '150px', position: 'absolute', left: '-20px', bottom: '-20px' }}></i>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <i className={activeTab === 'expenses' ? "fa-solid fa-file-invoice-dollar" : "fa-solid fa-scale-unbalanced"} style={{ color: activeTab === 'expenses' ? '#38bdf8' : '#fcd34d' }}></i>
                {activeTab === 'expenses' ? 'إدارة المصروفات التشغيلية' : 'إدارة التعويضات والمطالبات المالية'}
              </h2>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>
                {activeTab === 'expenses' ? 'سجل متابعة المصاريف اليومية والتشغيلية للشركة' : 'سجل التعويضات والمطالبات المالية المعتمدة'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', zIndex: 1 }}>
              <button onClick={handlePrintReport} className="btn-secondary" style={{ background: '#014cb1', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-print"></i> طباعة التقرير
              </button>
              <button onClick={exportToExcelFunc} className="btn-secondary" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-file-excel"></i> تصدير Excel
              </button>
              <button onClick={() => handleOpenModal()} className="btn-primary" style={{ background: activeTab === 'expenses' ? '#ef4444' : '#f59e0b', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.2)' }}>
                <i className="fa-solid fa-plus"></i> {activeTab === 'expenses' ? 'إضافة مصروف' : 'إضافة تعويض'}
              </button>
            </div>
          </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>إجمالي مبلغ {activeTab === 'expenses' ? 'المصروفات' : 'التعويضات'}</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#ef4444' }}>{filteredStats.total.toLocaleString()} <span style={{ fontSize: '14px' }}>د.ل</span></div>
            </div>
            <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>عدد العمليات المفلترة</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text)' }}>{filteredStats.count} <span style={{ fontSize: '14px' }}>عملية</span></div>
            </div>
            <div className="stat-box" style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
              <div style={{ color: 'var(--muted)', fontSize: '13px', fontWeight: 600, marginBottom: '5px' }}>متوسط العملية الواحد</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: '#10b981' }}>{filteredStats.average.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span style={{ fontSize: '14px' }}>د.ل</span></div>
            </div>
          </div>

          <div className="no-print" style={{ background: 'var(--card-bg)', padding: '25px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)', fontWeight: 800 }}>فلاتر البحث والتقارير</h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 500 }}>
                  {activeTab === 'expenses' ? 'تخصيص عرض المصروفات والبحث عن بند محدد' : 'تصفية قائمة التعويضات والمطالبات المالية'}
                </p>
              </div>
              {!hideHeader && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowCategoryModal(true)} className="btn-secondary" style={{ background: '#475569', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                    <i className="fa-solid fa-tags"></i> إدارة الفئات
                  </button>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>بحث بالوصف</label>
                <input type="text" placeholder="بحث..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>الفئة</label>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 600 }}>
                  <option value="الكل">كل الفئات</option>
                  {dynamicCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>الحالة</label>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 600 }}>
                  <option value="الكل">كل الحالات</option>
                  <option value="مدفوع">مدفوع</option>
                  <option value="معلق">معلق</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>من تاريخ</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>إلى تاريخ</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => { setSearchFilter(''); setCategoryFilter('الكل'); setStatusFilter('الكل'); setFromDate(''); setToDate(''); }} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>تصفير</button>
              </div>
            </div>
          </div>

          <div className="users-table-wrapper" style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th style={{ verticalAlign: 'middle' }}>البند / الوصف</th>
                  <th style={{ verticalAlign: 'middle' }}>المستلم</th>
                  <th style={{ verticalAlign: 'middle' }}>الفئة / البند الفرعي</th>
                  <th style={{ verticalAlign: 'middle' }}>طريقة السداد</th>
                  <th style={{ verticalAlign: 'middle' }}>المبلغ</th>
                  <th style={{ verticalAlign: 'middle' }}>التاريخ</th>
                  <th style={{ verticalAlign: 'middle' }}>رقم الواصل</th>
                  <th style={{ verticalAlign: 'middle' }}>صورة الواصل</th>
                  <th style={{ verticalAlign: 'middle' }}>الحالة</th>
                  <th className="no-print" style={{ verticalAlign: 'middle' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedExpenses.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: '50px', color: 'var(--muted)' }}>لا توجد بيانات تطابق البحث الحالي</td></tr>
                ) : (
                  paginatedExpenses.map(e => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 700, verticalAlign: 'middle' }}>{e.name}</td>
                      <td style={{ verticalAlign: 'middle' }}>{e.recipient || '-'}</td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '6px', background: 'var(--bg)', fontSize: '0.85rem', fontWeight: 600, width: 'fit-content' }}>{e.category}</span>
                          {(e as any).sub_category && <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 700 }}>{(e as any).sub_category}</span>}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>{e.expense_type || '—'}</td>
                      <td style={{ fontWeight: '900', color: '#ef4444', verticalAlign: 'middle' }}>{e.amount.toLocaleString()} {e.currency === 'USD' ? '$' : 'د.ل'}</td>
                      <td style={{ fontSize: '0.9rem', verticalAlign: 'middle' }}>{e.expense_date}</td>
                      <td style={{ fontWeight: 600, verticalAlign: 'middle' }}>{e.voucher_number || '-'}</td>
                      <td style={{ verticalAlign: 'middle' }}>
                        {e.receipt_image ? (
                          <button onClick={() => { setSelectedImage(resolveImageUrl(e.receipt_image)); setPreviewRotation(0); }} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                            <i className="fa-solid fa-image"></i> عرض
                          </button>
                        ) : <span style={{ color: '#94a3b8' }}>-</span>}
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>
                        <span className={`status-badge ${e.status === 'مدفوع' ? 'active' : 'inactive'}`} style={{
                          background: e.status === 'مدفوع' ? '#dcfce7' : '#fee2e2',
                          color: e.status === 'مدفوع' ? '#166534' : '#991b1b',
                          padding: '4px 12px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700
                        }}>
                          {e.status}
                        </span>
                      </td>
                      <td className="no-print" style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' }}>
                          <button onClick={() => handlePrintExpenseVoucher(e)} style={{ background: '#f59e0b', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} title="طباعة الوصل"><i className="fa-solid fa-print"></i></button>
                          <button onClick={() => navigate(`/reports/expenses/${e.id}`)} style={{ background: '#10b981', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} title="عرض التفاصيل"><i className="fa-solid fa-eye"></i></button>
                          <button onClick={() => handleOpenModal(e)} style={{ background: '#3b82f6', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} title="تعديل"><i className="fa-solid fa-pencil"></i></button>
                          <button onClick={() => handleDeleteExpense(e.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} title="حذف"><i className="fa-solid fa-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '30px', paddingBottom: '20px' }}>
              {getPaginationRange(currentPage, totalPages).map((p, idx) => (
                <button key={idx} onClick={() => typeof p === 'number' && setCurrentPage(p)} disabled={p === '...' || p === currentPage} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: '1px solid var(--border)', background: p === currentPage ? '#014cb1' : 'var(--card-bg)', color: p === currentPage ? '#fff' : 'var(--text)', fontWeight: 700, cursor: p === '...' ? 'default' : 'pointer', boxShadow: p === currentPage ? '0 4px 12px rgba(1, 76, 177, 0.3)' : 'none' }}>{p}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Union Balance Tab */}
      {activeTab === 'union' && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="users-breadcrumb no-print" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px', marginBottom: '30px', color: '#fff',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', position: 'relative', overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.1, pointerEvents: 'none' }}>
              <i className="fa-solid fa-id-card" style={{ fontSize: '150px', position: 'absolute', left: '-20px', bottom: '-20px' }}></i>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '26px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <i className="fa-solid fa-id-card" style={{ color: '#fcd34d' }}></i> سجل شراء رصيد البطاقة البرتقالية (الاتحاد)
              </h2>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>إدارة المدفوعات وحصص الاتحاد وودائع الشركة</p>
            </div>

            <div style={{ display: 'flex', gap: '12px', zIndex: 1 }}>
              <button onClick={handlePrintReport} className="btn-secondary" style={{ background: '#014cb1', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-print"></i> طباعة التقرير
              </button>
              <button onClick={exportUnionToExcelFunc} className="btn-secondary" style={{ background: '#10b981', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-file-excel"></i> تصدير Excel
              </button>
              <button onClick={() => handleOpenUnionModal()} className="btn-primary" style={{ background: '#f59e0b', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.3)' }}>
                <i className="fa-solid fa-plus"></i> طلب رصيد جديد
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div className="stat-box" style={{ background: '#fef3c7', padding: '25px', borderRadius: '15px', border: '1px solid #fde68a', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ color: '#92400e', fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>صافي مبلغ الوديعة (المتبقي للشركة)</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#92400e' }}>{unionFilteredStats.totalDeposit.toLocaleString()} <span style={{ fontSize: '16px' }}>د.ل</span></div>
            </div>
            <div className="stat-box" style={{ background: '#fee2e2', padding: '25px', borderRadius: '15px', border: '1px solid #fecaca', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ color: '#991b1b', fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>إجمالي خصم الاتحاد</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#991b1b' }}>{unionFilteredStats.totalFee.toLocaleString()} <span style={{ fontSize: '16px' }}>د.ل</span></div>
            </div>
            <div className="stat-box" style={{ background: '#d1fae5', padding: '25px', borderRadius: '15px', border: '1px solid #a7f3d0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ color: '#065f46', fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>إجمالي البطاقات المشتراة</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#065f46' }}>{unionFilteredStats.totalCards} <span style={{ fontSize: '16px' }}>بطاقة</span></div>
            </div>
            <div className="stat-box" style={{ background: '#dbeafe', padding: '25px', borderRadius: '15px', border: '1px solid #bfdbfe', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', textAlign: 'center' }}>
              <div style={{ color: '#1e40af', fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>إجمالي المبلغ المدفوع</div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#1e40af' }}>{unionFilteredStats.totalPaid.toLocaleString()} <span style={{ fontSize: '16px' }}>د.ل</span></div>
            </div>
          </div>

          <div className="no-print" style={{ background: '#fff', padding: '25px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>تصفية بيانات سجل الاتحاد</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>بحث برقم الواصل</label>
                <input type="text" placeholder="رقم الطلب / الواصل..." value={unionSearchFilter} onChange={e => setUnionSearchFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
              </div>
              <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>السنة</label>
                <select value={unionYearFilter} onChange={e => setUnionYearFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                  <option value="الكل">كل السنين</option>
                  {['2023', '2024', '2025', '2026'].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>الشهر</label>
                <select value={unionMonthFilter} onChange={e => setUnionMonthFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                  <option value="الكل">كل الشهور</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m.toString()}>{m}</option>)}
                </select>
              </div>
              <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>من تاريخ</label>
                <input type="date" value={unionFromDate} onChange={e => setUnionFromDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
              </div>
              <div><label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>إلى تاريخ</label>
                <input type="date" value={unionToDate} onChange={e => setUnionToDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => { setUnionSearchFilter(''); setUnionYearFilter('الكل'); setUnionMonthFilter('الكل'); setUnionFromDate(''); setUnionToDate(''); }} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>تصفير</button>
              </div>
            </div>
          </div>

          <div className="users-table-wrapper" style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <table className="users-table">
              <thead>
                <tr>
                  <th style={{ verticalAlign: 'middle' }}>رقم الواصل/الطلب</th>
                  <th style={{ verticalAlign: 'middle' }}>المبلغ المدفوع</th>
                  <th style={{ verticalAlign: 'middle' }}>عدد البطاقات</th>
                  <th style={{ verticalAlign: 'middle' }}>خصم الاتحاد (المصروفات)</th>
                  <th style={{ verticalAlign: 'middle' }}>وديعة الشركة</th>
                  <th style={{ verticalAlign: 'middle' }}>تاريخ الطلب</th>
                  <th style={{ verticalAlign: 'middle' }}>صورة الواصل</th>
                  <th className="no-print" style={{ verticalAlign: 'middle' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUnion.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>لا توجد بيانات سجل رصيد الاتحاد</td></tr>
                ) : (
                  paginatedUnion.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 'bold', verticalAlign: 'middle' }}>{u.request_number || '-'}</td>
                      <td style={{ color: '#ef4444', fontWeight: 800, verticalAlign: 'middle' }}>{parseFloat(u.amount_paid.toString()).toLocaleString()} د.ل</td>
                      <td style={{ color: '#065f46', fontWeight: 'bold', verticalAlign: 'middle' }}>{u.cards_count}</td>
                      <td style={{ verticalAlign: 'middle' }}>{(u.cards_count * u.union_fee_per_card).toLocaleString()} د.ل</td>
                      <td style={{ color: '#92400e', fontWeight: 700, verticalAlign: 'middle' }}>{(u.cards_count * u.company_deposit_per_card).toLocaleString()} د.ل</td>
                      <td style={{ verticalAlign: 'middle' }}>{u.purchase_date ? u.purchase_date.split('T')[0] : '-'}</td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          {u.receipt_image ? (
                            <button onClick={() => { setSelectedImage(resolveImageUrl(u.receipt_image)); setPreviewRotation(0); }} className="action-btn" style={{ color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                              <i className="fa-solid fa-image"></i> عرض الواصل
                            </button>
                          ) : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>لا يوجد</span>}
                        </div>
                      </td>
                      <td className="no-print" style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' }}>
                          <button onClick={() => handlePrintUnionVoucher(u)} style={{ background: '#ea580c', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer' }} title="طباعة الواصل"><i className="fa-solid fa-print"></i></button>
                          <button onClick={() => handleOpenUnionModal(u)} style={{ background: '#3b82f6', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer' }}><i className="fa-solid fa-pencil"></i></button>
                          <button onClick={() => handleDeleteUnionPurchase(u.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer' }}><i className="fa-solid fa-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalUnionPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '30px' }}>
              {getPaginationRange(currentUnionPage, totalUnionPages).map((p, idx) => (
                <button key={idx} onClick={() => typeof p === 'number' && setCurrentUnionPage(p)} disabled={p === '...' || p === currentUnionPage} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', border: '1px solid var(--border)', background: p === currentUnionPage ? '#014cb1' : 'var(--card-bg)', color: p === currentUnionPage ? '#fff' : 'var(--text)', fontWeight: 700, cursor: p === '...' ? 'default' : 'pointer' }}>{p}</button>
              ))}
            </div>
          )}
        </div>
      )}
      <div style={{ display: 'none' }}></div>


      {/* Modal for Expense/Indemnity */}
      {showModal && (
        <div className="modal-overlay no-print" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px'
        }}>
          <div style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '1100px', borderRadius: '15px', padding: '30px', position: 'relative', maxHeight: '95vh', overflowY: 'auto' }}>
            <h3>{editingExpense ? 'تعديل بيانات' : (activeTab === 'expenses' ? 'تسجيل مصروف' : 'تسجيل تعويض')}</h3>
            <form onSubmit={handleAddExpense} style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', alignItems: 'start' }}>
              <div style={{ gridColumn: 'span 4' }}>
                <label>الوصف / البيان</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 800 }}>المستلم</label>
                <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => { setRecipientType('employee'); setRecipient(''); }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: recipientType === 'employee' ? '#014cb1' : 'var(--bg)',
                      color: recipientType === 'employee' ? '#fff' : 'var(--text)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    موظف
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRecipientType('agent'); setRecipient(''); }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: recipientType === 'agent' ? '#014cb1' : 'var(--bg)',
                      color: recipientType === 'agent' ? '#fff' : 'var(--text)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    الوكيل
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRecipientType('custom'); setRecipient(''); }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: recipientType === 'custom' ? '#014cb1' : 'var(--bg)',
                      color: recipientType === 'custom' ? '#fff' : 'var(--text)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    اسم آخر
                  </button>
                </div>

                {recipientType === 'employee' && (
                  <SearchableSelect
                    options={employees.map(emp => ({ value: emp.name, label: emp.name }))}
                    value={recipient}
                    onChange={(val) => setRecipient(val)}
                    placeholder="اختر موظف..."
                  />
                )}
                {recipientType === 'agent' && (
                  <SearchableSelect
                    options={agents.map(a => ({ value: a.agency_name, label: `${a.agency_name} (${a.agent_name})` }))}
                    value={recipient}
                    onChange={(val) => setRecipient(val)}
                    placeholder="اختر وكيل..."
                  />
                )}
                {recipientType === 'custom' && (
                  <input
                    type="text"
                    value={recipient}
                    onChange={e => setRecipient(e.target.value)}
                    placeholder="ادخل اسم المستلم..."
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 700 }}
                  />
                )}
              </div>
              <div>
                <label style={{ fontWeight: 800 }}>الفئة</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 600 }}
                  >
                    {dynamicCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: '#014cb1',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '42px',
                      height: '42px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s'
                    }}
                    title="إدارة الفئات"
                  >
                    + / -
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 800 }}>البند الفرعي</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                  <select 
                    value={subCategory} 
                    onChange={e => setSubCategory(e.target.value)} 
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 600 }}
                  >
                    <option value="">-- اختر بند فرعي --</option>
                    {filteredSubCategories.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowSubCategoryModal(true)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: '#014cb1',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '42px',
                      height: '42px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                      transition: 'all 0.2s'
                    }}
                    title="إدارة البنود الفرعية"
                  >
                    + / -
                  </button>
                </div>
              </div>
              <>
                <div>
                  <label>التاريخ</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
                </div>
                {activeTab === 'indemnities' ? (
                  <div>
                    <label>نوع التعويض</label>
                    <select value={indemnityType} onChange={e => setIndemnityType(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                      <option value="orange_card">خصم من رصيد الاتحاد</option>
                      <option value="bank">صرف بنكي (شيك/حوالة)</option>
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label>الحالة</label>
                      <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                        <option value="مدفوع">مدفوع</option>
                        <option value="معلق">معلق</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontWeight: 800 }}>مصدر الصرف (الخزينة / المصرف)</label>
                      <select
                        value={paymentSource}
                        onChange={e => setPaymentSource(e.target.value)}
                        style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 700 }}
                      >
                        <option value="treasury">الخزينة النقدية (كاش)</option>
                        {banks.map(bank => (
                          <option key={bank.id} value={bank.name}>
                            {bank.name} {bank.account_number ? `(${bank.account_number})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </>

              <div>
                <label>المبلغ (د.ل)</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontWeight: 800 }}>نوع العملة</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrency('LYD')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: currency === 'LYD' ? '#014cb1' : 'var(--bg)',
                      color: currency === 'LYD' ? '#fff' : 'var(--text)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    دينار (LYD)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency('USD')}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: currency === 'USD' ? '#014cb1' : 'var(--bg)',
                      color: currency === 'USD' ? '#fff' : 'var(--text)',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    دولار (USD)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontWeight: 800 }}>طريقة السداد</label>
                <select value={expenseType} onChange={e => setExpenseType(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontWeight: 700 }}>
                  <option value="حوالة مصرفية">حوالة مصرفية</option>
                  <option value="وسائل الكترونية">وسائل الكترونية</option>
                  <option value="مكاتب حوالات">مكاتب حوالات</option>
                  <option value="بطاقة مصرفية">بطاقة مصرفية</option>
                </select>
              </div>

              <div>
                <label>رقم الواصل</label>
                <input type="text" value={voucherNumber} onChange={e => setVoucherNumber(e.target.value)} placeholder="مثال: 3167" style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)' }} />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label>صورة الواصل</label>
                <input type="file" accept="image/*,application/pdf" onChange={e => setExpenseReceiptImage(e.target.files?.[0] || null)} style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'var(--bg)', fontSize: '0.8rem' }} />
              </div>

              <div style={{ gridColumn: 'span 4' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <label style={{ fontWeight: 800 }}>تفاصيل الأصناف (الفاتورة)</label>
                  <button type="button" onClick={() => setItems([...items, { statement: '', quantity: 1, price: 0, value: 0 }])} style={{ background: '#10b981', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
                    <i className="fa-solid fa-plus"></i> إضافة صنف
                  </button>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead style={{ background: 'var(--bg)' }}>
                      <tr>
                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>رقم الصنف</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border)', width: '40%' }}>البيان</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>الكمية</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>السعر</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>القيمة</th>
                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '5px' }}>
                            <input type="text" value={item.item_number || ''} onChange={e => {
                              const newItems = [...items];
                              newItems[idx].item_number = e.target.value;
                              setItems(newItems);
                            }} style={{ width: '100%', padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }} />
                          </td>
                          <td style={{ padding: '5px' }}>
                            <input type="text" value={item.statement} onChange={e => {
                              const newItems = [...items];
                              newItems[idx].statement = e.target.value;
                              setItems(newItems);
                            }} style={{ width: '100%', padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }} />
                          </td>
                          <td style={{ padding: '5px' }}>
                            <input type="number" value={item.quantity} onChange={e => {
                              const newItems = [...items];
                              newItems[idx].quantity = parseFloat(e.target.value) || 0;
                              newItems[idx].value = newItems[idx].quantity * newItems[idx].price;
                              setItems(newItems);
                              // Update total amount
                              const total = newItems.reduce((sum, it) => sum + it.value, 0);
                              setAmount(total.toString());
                            }} style={{ width: '100%', padding: '5px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '5px' }}>
                            <input type="number" step="0.01" value={item.price} onChange={e => {
                              const newItems = [...items];
                              newItems[idx].price = parseFloat(e.target.value) || 0;
                              newItems[idx].value = newItems[idx].quantity * newItems[idx].price;
                              setItems(newItems);
                              // Update total amount
                              const total = newItems.reduce((sum, it) => sum + it.value, 0);
                              setAmount(total.toString());
                            }} style={{ width: '100%', padding: '5px', border: '1px solid #ddd', borderRadius: '4px', textAlign: 'center' }} />
                          </td>
                          <td style={{ padding: '5px' }}>
                            <input type="number" value={item.value} readOnly style={{ width: '100%', padding: '5px', border: '1px solid #eee', borderRadius: '4px', textAlign: 'center', background: '#f9f9f9' }} />
                          </td>
                          <td style={{ padding: '5px' }}>
                            <button type="button" onClick={() => {
                              const newItems = items.filter((_, i) => i !== idx);
                              setItems(newItems);
                              const total = newItems.reduce((sum, it) => sum + it.value, 0);
                              setAmount(total.toString());
                            }} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}>
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '15px', color: '#94a3b8' }}>لا توجد بنود مضافة</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ gridColumn: 'span 4' }}>
                <label>ملاحظات</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', minHeight: '60px' }} />
              </div>
              <div style={{ gridColumn: 'span 4', display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', background: '#014cb1', color: '#fff', fontWeight: 'bold' }}>
                  {loading ? 'جاري الحفظ...' : 'حفظ'}
                </button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569' }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Union Purchase */}
      {showUnionModal && (
        <div className="modal-overlay no-print" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px', backdropFilter: 'blur(5px)'
        }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: '850px', borderRadius: '24px', padding: '40px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxHeight: '95vh', overflowY: 'auto' }}>
            <button onClick={() => setShowUnionModal(false)} style={{ position: 'absolute', top: '25px', right: '25px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#94a3b8' }}>&times;</button>

            <h2 style={{ textAlign: 'center', marginBottom: '40px', fontSize: '28px', fontWeight: 900, color: '#1e293b' }}>تسجيل رصيد اتحاد جديد (بطاقة برتقالية)</h2>

            <form onSubmit={handleAddUnionPurchase}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ef4444' }}>*</span> المبلغ المدفوع للاتحاد (د.ل)
                  </label>
                  <input type="number" step="0.01" placeholder="مثال: 10000" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} required style={{ width: '100%', padding: '15px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#ef4444' }}>*</span> تاريخ الشراء / الطلب
                  </label>
                  <input type="date" value={unionPurchaseDate} onChange={e => setUnionPurchaseDate(e.target.value)} required style={{ width: '100%', padding: '15px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>رقم الطلب (إن وجد)</label>
                  <input type="text" placeholder="مثال: 837530" value={requestNumber} onChange={e => setRequestNumber(e.target.value)} style={{ width: '100%', padding: '15px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600, textAlign: 'center' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>طريقة الدفع</label>
                  <select style={{ width: '100%', padding: '15px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', fontWeight: 600, textAlign: 'center', appearance: 'none' }}>
                    <option>حوالة مصرفية</option>
                    <option>نقداً</option>
                    <option>صك مصدق</option>
                  </select>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
                <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textAlign: 'left' }}>إعدادات حساب الوديعة (قابلة للتغيير مستقبلاً)</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>سعر البطاقة الكلي</label>
                    <input type="number" value={cardPrice} onChange={e => setCardPrice(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>خصم الاتحاد الفعلي (مصروف)</label>
                    <input type="number" value={unionFeePerCard} onChange={e => setUnionFeePerCard(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>رصيد/وديعة الشركة للبطاقة</label>
                    <input type="number" value={companyDepositPerCard} onChange={e => setCompanyDepositPerCard(e.target.value)} required style={{ padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: 700 }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '2px dashed #10b981', borderRadius: '20px', padding: '25px', marginBottom: '30px', background: '#f0fdf4' }}>
                <div style={{ textAlign: 'center', borderLeft: '1px solid #d1fae5' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>الكمية المستلمة</p>
                  <p style={{ margin: '10px 0 0 0', fontSize: '1.8rem', fontWeight: 900, color: '#10b981' }}>{cardsCount} <span style={{ fontSize: '1rem' }}>بطاقة</span></p>
                </div>
                <div style={{ textAlign: 'center', borderLeft: '1px solid #d1fae5' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>خصم الاتحاد (المصروفات)</p>
                  <p style={{ margin: '10px 0 0 0', fontSize: '1.8rem', fontWeight: 900, color: '#ef4444' }}>{totalUnionFee.toLocaleString()} <span style={{ fontSize: '1rem' }}>د.ل</span></p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#64748b' }}>تضاف كوديعة للشركة</p>
                  <p style={{ margin: '10px 0 0 0', fontSize: '1.8rem', fontWeight: 900, color: '#f59e0b' }}>{totalCompanyDeposit.toLocaleString()} <span style={{ fontSize: '1rem' }}>د.ل</span></p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>ملاحظات إضافية</label>
                  <textarea value={unionNotes} onChange={e => setUnionNotes(e.target.value)} rows={2} style={{ width: '100%', padding: '15px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '1rem', marginTop: '10px' }} placeholder="أضف أي ملاحظات هنا..." />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>إرفاق صورة الإيصال</label>
                  <input type="file" accept="image/*,application/pdf" onChange={e => setReceiptImage(e.target.files?.[0] || null)} style={{ width: '100%', padding: '15px', marginTop: '10px', borderRadius: '14px', border: '1px dashed #cbd5e1' }} />
                  {editingUnionPurchase?.receipt_image && <p style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '5px' }}>✓ يوجد إيصال مرفق مسبقاً</p>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px' }}>
                <button type="submit" disabled={loading} style={{ flex: 2, padding: '18px', borderRadius: '16px', border: 'none', background: 'linear-gradient(135deg, #014cb1 0%, #003173 100%)', color: '#fff', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(1, 76, 177, 0.3)' }}>
                  {loading ? 'جاري الحفظ...' : (editingUnionPurchase ? 'تحديث البيانات' : 'تأكيد التسجيل')}
                </button>
                <button type="button" onClick={() => setShowUnionModal(false)} style={{ flex: 1, padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer' }}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: '20px' }} onClick={() => setSelectedImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', width: selectedImage.toLowerCase().endsWith('.pdf') ? '80vw' : 'auto', height: selectedImage.toLowerCase().endsWith('.pdf') ? '85vh' : 'auto', background: '#fff', borderRadius: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            {selectedImage.toLowerCase().endsWith('.pdf') ? (
              <div dir="ltr" style={{ width: '100%', height: '100%', direction: 'ltr', transform: `rotate(${previewRotation}deg)`, transition: 'transform 0.3s ease' }}>
                <iframe src={selectedImage} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '24px' }} title="Receipt PDF" />
              </div>
            ) : (
              <img src={selectedImage} alt="Receipt" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', transform: `rotate(${previewRotation}deg)`, transition: 'transform 0.3s ease' }} />
            )}

            {/* Action Buttons */}
            <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '10px', zIndex: 10 }}>
              <button onClick={() => setPreviewRotation(prev => prev + 90)} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="تدوير الصورة">
                <i className="fa-solid fa-rotate-right"></i>
              </button>
              <button onClick={() => setSelectedImage(null)} style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '45px', height: '45px', cursor: 'pointer', fontSize: '22px', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="إغلاق">
                &times;
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Categories Management Modal */}
      {showCategoryModal && (
        <div className="modal-overlay no-print" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999, padding: '20px'
        }} onClick={() => setShowCategoryModal(false)}>
          <div style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '800px', borderRadius: '15px', padding: '30px', position: 'relative', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}><i className="fa-solid fa-tags text-primary me-2"></i> إدارة فئات المصروفات</h3>
              <button type="button" style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }} onClick={() => setShowCategoryModal(false)}>
                &times;
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', overflowX: 'hidden' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  placeholder="اسم الفئة الجديدة..."
                  style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                />
                <button
                  type="button"
                  style={{ whiteSpace: 'nowrap', padding: '10px 20px', borderRadius: '10px', border: 'none', background: editingCategory ? '#f59e0b' : '#38bdf8', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                  onClick={async () => {
                    if (!newCategoryName) return;
                    try {
                      setLoading(true);
                      const url = editingCategory
                        ? `${API_BASE_URL}/expense-categories/${editingCategory.id}`
                        : `${API_BASE_URL}/expense-categories`;

                      const method = editingCategory ? 'PUT' : 'POST';

                      const response = await fetch(url, {
                        method,
                        headers: {
                          'Content-Type': 'application/json',
                          'Accept': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ name: newCategoryName })
                      });

                      if (response.ok) {
                        showToast(editingCategory ? 'تم تعديل الفئة بنجاح' : 'تم إضافة الفئة بنجاح', 'success');
                        setNewCategoryName('');
                        setEditingCategory(null);
                        fetchCategories();
                      } else {
                        const err = await response.json();
                        showToast(err.message || 'فشلت العملية', 'error');
                      }
                    } catch (e) {
                      showToast('خطأ في الاتصال', 'error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? 'جاري الحفظ...' : (editingCategory ? 'تحديث' : 'إضافة')}
                </button>
                {editingCategory && (
                  <button type="button" style={{ padding: '10px 15px', borderRadius: '10px', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer' }} onClick={() => { setEditingCategory(null); setNewCategoryName(''); }}>إلغاء</button>
                )}
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
                <table className="users-table" style={{ width: '100%', tableLayout: 'fixed', wordWrap: 'break-word' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px' }}>اسم الفئة</th>
                      <th style={{ width: '120px', padding: '10px', textAlign: 'center' }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbCategories.map(cat => (
                      <tr key={cat.id}>
                        <td style={{ padding: '10px', whiteSpace: 'normal', lineHeight: '1.5' }}>{cat.name}</td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              style={{ background: cat.name === 'التعويضات' ? '#cbd5e1' : '#3b82f6', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: cat.name === 'التعويضات' ? 'not-allowed' : 'pointer' }}
                              onClick={() => { setEditingCategory(cat); setNewCategoryName(cat.name); }}
                              disabled={cat.name === 'التعويضات'}
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pencil"></i>
                            </button>
                            <button
                              type="button"
                              style={{ background: cat.name === 'التعويضات' ? '#cbd5e1' : '#ef4444', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: cat.name === 'التعويضات' ? 'not-allowed' : 'pointer' }}
                              disabled={cat.name === 'التعويضات'}
                              title="حذف"
                              onClick={async () => {
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'تأكيد حذف الفئة',
                                  message: `هل أنت متأكد من حذف فئة "${cat.name}"؟ قد يؤثر ذلك على تقارير المصروفات القديمة!`,
                                  onConfirm: async () => {
                                    setConfirmDialog(null);
                                    try {
                                      const response = await fetch(`${API_BASE_URL}/expense-categories/${cat.id}`, {
                                        method: 'DELETE',
                                        headers: {
                                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                                        }
                                      });
                                      if (response.ok) {
                                        showToast('تم حذف الفئة بنجاح', 'success');
                                        fetchCategories();
                                      } else {
                                        showToast('لا يمكن حذف هذه الفئة', 'error');
                                      }
                                    } catch (e) {
                                      showToast('خطأ في الاتصال', 'error');
                                    }
                                  }
                                });
                              }}

                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {dbCategories.length === 0 && (
                      <tr><td colSpan={2} style={{ textAlign: 'center', padding: '20px' }}>جاري التحميل أو لا توجد فئات...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="premium-modal-footer">
              <button type="button" className="btn btn-link text-muted fw-bold text-decoration-none px-4" onClick={() => setShowCategoryModal(false)}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SubCategories Management Modal */}
      {showSubCategoryModal && (
        <div className="modal-overlay no-print" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999, padding: '20px'
        }} onClick={() => { setShowSubCategoryModal(false); setEditingSubCategory(null); setNewSubCategoryName(''); }}>
          <div style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '800px', borderRadius: '15px', padding: '30px', position: 'relative', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}><i className="fa-solid fa-list-check text-primary me-2"></i> إدارة البنود الفرعية لـ ({category})</h3>
              <button type="button" style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }} onClick={() => { setShowSubCategoryModal(false); setEditingSubCategory(null); setNewSubCategoryName(''); }}>
                &times;
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '5px', overflowX: 'hidden' }}>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  value={newSubCategoryName}
                  onChange={e => setNewSubCategoryName(e.target.value)}
                  placeholder={editingSubCategory ? `تعديل اسم البند الفرعي...` : "اسم البند الفرعي الجديد..."}
                  style={{ flex: 1, minWidth: '220px', padding: '12px', borderRadius: '10px', border: editingSubCategory ? '2px solid #10b981' : '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Trigger save
                      const btn = document.getElementById('subCategorySubmitBtn');
                      if (btn) btn.click();
                    }
                  }}
                />
                <button
                  id="subCategorySubmitBtn"
                  type="button"
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: editingSubCategory ? '#10b981' : '#38bdf8',
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onClick={async () => {
                    if (!newSubCategoryName.trim()) return;
                    try {
                      setLoading(true);
                      const isEdit = !!editingSubCategory;
                      const url = isEdit
                        ? `${API_BASE_URL}/expense-subcategories/${editingSubCategory.id}`
                        : `${API_BASE_URL}/expense-subcategories`;
                      const method = isEdit ? 'PUT' : 'POST';
                      const bodyData = isEdit
                        ? { name: newSubCategoryName.trim() }
                        : { category_name: category, name: newSubCategoryName.trim() };

                      const response = await fetch(url, {
                        method,
                        headers: {
                          'Content-Type': 'application/json',
                          'Accept': 'application/json',
                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify(bodyData)
                      });

                      if (response.ok) {
                        showToast(isEdit ? 'تم تعديل البند الفرعي بنجاح' : 'تم إضافة البند الفرعي بنجاح', 'success');
                        setNewSubCategoryName('');
                        setEditingSubCategory(null);
                        fetchSubCategories();
                      } else {
                        const err = await response.json();
                        showToast(err.message || 'فشلت العملية', 'error');
                      }
                    } catch (e) {
                      showToast('خطأ في الاتصال', 'error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                >
                  <i className={`fa-solid ${editingSubCategory ? 'fa-check' : 'fa-plus'}`}></i>
                  {loading ? 'جاري الحفظ...' : (editingSubCategory ? 'تحديث' : 'إضافة')}
                </button>

                {editingSubCategory && (
                  <button
                    type="button"
                    style={{ whiteSpace: 'nowrap', padding: '10px 16px', borderRadius: '10px', border: 'none', background: '#64748b', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                    onClick={() => {
                      setEditingSubCategory(null);
                      setNewSubCategoryName('');
                    }}
                  >
                    إلغاء التعديل
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto', overflowX: 'hidden' }}>
                <table className="users-table" style={{ width: '100%', tableLayout: 'fixed', wordWrap: 'break-word' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '55px', padding: '10px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '10px' }}>اسم البند الفرعي</th>
                      <th style={{ width: '130px', padding: '10px', textAlign: 'center' }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dbSubCategories.filter(sub => sub.category_name === category).map((sub, index) => (
                      <tr key={sub.id} style={{ background: editingSubCategory?.id === sub.id ? 'rgba(56, 189, 248, 0.1)' : undefined }}>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: 'var(--muted)' }}>
                          {index + 1}
                        </td>
                        <td style={{ padding: '10px', whiteSpace: 'normal', lineHeight: '1.5', fontWeight: 600 }}>{sub.name}</td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              style={{ background: '#3b82f6', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer' }}
                              title="تعديل"
                              onClick={() => {
                                setEditingSubCategory(sub);
                                setNewSubCategoryName(sub.name);
                              }}
                            >
                              <i className="fa-solid fa-pencil"></i>
                            </button>
                            <button
                              type="button"
                              style={{ background: '#ef4444', color: '#fff', border: 'none', width: '34px', height: '34px', borderRadius: '8px', cursor: 'pointer' }}
                              title="حذف"
                              onClick={async () => {
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'تأكيد حذف البند الفرعي',
                                  message: `هل أنت متأكد من حذف البند الفرعي "${sub.name}"؟`,
                                  onConfirm: async () => {
                                    setConfirmDialog(null);
                                    try {
                                      const response = await fetch(`${API_BASE_URL}/expense-subcategories/${sub.id}`, {
                                        method: 'DELETE',
                                        headers: {
                                          'Authorization': `Bearer ${localStorage.getItem('token')}`
                                        }
                                      });
                                      if (response.ok) {
                                        showToast('تم حذف البند الفرعي بنجاح', 'success');
                                        if (editingSubCategory?.id === sub.id) {
                                          setEditingSubCategory(null);
                                          setNewSubCategoryName('');
                                        }
                                        fetchSubCategories();
                                      } else {
                                        showToast('لا يمكن حذف هذا البند الفرعي', 'error');
                                      }
                                    } catch (e) {
                                      showToast('خطأ في الاتصال', 'error');
                                    }
                                  }
                                });
                              }}
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {dbSubCategories.filter(sub => sub.category_name === category).length === 0 && (
                      <tr><td colSpan={3} style={{ textAlign: 'center', padding: '20px' }}>لا توجد بنود فرعية مضافة بعد...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="premium-modal-footer">
              <button type="button" className="btn btn-link text-muted fw-bold text-decoration-none px-4" onClick={() => { setShowSubCategoryModal(false); setEditingSubCategory(null); setNewSubCategoryName(''); }}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Professional Confirmation Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="modal-overlay no-print" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999999, padding: '20px', backdropFilter: 'blur(4px)'
        }}>
          <div style={{ background: 'var(--card-bg)', width: '100%', maxWidth: '400px', borderRadius: '20px', padding: '30px', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', textAlign: 'center', animation: 'fadeIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2.5rem', margin: '0 auto 20px auto' }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)' }}>
              {confirmDialog.title}
            </h3>
            <p style={{ margin: '0 0 30px 0', fontSize: '1rem', color: 'var(--muted)', lineHeight: '1.6' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#ef4444', color: '#fff', border: 'none', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}
              >
                نعم، تأكيد الحذف
              </button>
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', transition: 'background 0.2s' }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
