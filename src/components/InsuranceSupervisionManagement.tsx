import { useState, useEffect, type FormEvent } from 'react';
import { API_BASE_URL, resolveImageUrl } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';
import { canEditFinancial, ReadOnlyNotice } from '../utils/financialPermissions';
import {
  printSupervisionFinancialStatement,
  printSupervisionDetailedDocsReport,
  printSinglePaymentVoucher
} from '../utils/printInsuranceSupervisionReport';
import CompulsoryDocumentRequestsTab from './CompulsoryDocumentRequestsTab';

interface SupervisionSummary {
  total_supervision_due: number;
  total_paid_to_authority: number;
  remaining_due_to_authority: number;
  total_premiums: number;
  total_documents_count: number;
  payments_count: number;
}

interface CategoryBreakdown {
  key: string;
  name: string;
  document_count: number;
  total_premium: number;
  supervision_fee: number;
  fee_rate: number;
  fixed_fee: number;
}

interface SupervisionPayment {
  id: number;
  voucher_number: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  bank_name: string | null;
  check_number: string | null;
  period_from: string | null;
  period_to: string | null;
  receipt_image: string | null;
  notes: string | null;
  created_at: string;
}

interface SupervisionSetting {
  id?: number;
  insurance_type_key: string;
  insurance_type_name: string;
  fee_rate_percentage: number;
  fixed_fee_amount: number;
  is_active: boolean;
  notes?: string;
}

interface DetailedDocRow {
  id: number;
  module_key: string;
  insurance_type_name: string;
  policy_number: string;
  insured_name: string;
  issue_date: string;
  premium: number;
  supervision_fee: number;
  fee_rate: number;
  branch_name: string;
}

export default function InsuranceSupervisionManagement() {
  const canEdit = canEditFinancial('إدارة الإيرادات');
  const [activeTab, setActiveTab] = useState<'ledger' | 'reports' | 'payments' | 'requests' | 'settings'>('ledger');
  const [loading, setLoading] = useState(false);

  // Summary State
  const [summary, setSummary] = useState<SupervisionSummary | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);

  // Detailed Report State
  const [docsList, setDocsList] = useState<DetailedDocRow[]>([]);
  const [docsPagination, setDocsPagination] = useState({ current_page: 1, total_pages: 1, total: 0 });
  const [docsAggregates, setDocsAggregates] = useState({ total_supervision_fee: 0, total_premium: 0 });
  const [docSearch, setDocSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [docFromDate, setDocFromDate] = useState('');
  const [docToDate, setDocToDate] = useState('');

  // Payments State
  const [payments, setPayments] = useState<SupervisionPayment[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SupervisionPayment | null>(null);

  // Payment Form State
  const [payVoucherNumber, setPayVoucherNumber] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bank_transfer');
  const [payBankName, setPayBankName] = useState('');
  const [payCheckNumber, setPayCheckNumber] = useState('');
  const [payPeriodFrom, setPayPeriodFrom] = useState('');
  const [payPeriodTo, setPayPeriodTo] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payReceiptFile, setPayReceiptFile] = useState<File | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<SupervisionSetting[]>([]);
  const [savingSettings, setSavingSettings] = useState(false);

  // Image Preview Modal
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewRotation, setPreviewRotation] = useState<number>(0);

  // Print Menu State
  const [showPrintMenu, setShowPrintMenu] = useState(false);

  // Date Filters for Summary / Ledger
  const [yearFilter, setYearFilter] = useState('الكل');
  const [monthFilter, setMonthFilter] = useState('الكل');
  const [summaryFromDate, setSummaryFromDate] = useState('');
  const [summaryToDate, setSummaryToDate] = useState('');

  // Fetch Dashboard Summary
  const fetchSummary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (yearFilter && yearFilter !== 'الكل') params.append('year', yearFilter);
      if (monthFilter && monthFilter !== 'الكل') params.append('month', monthFilter);
      if (summaryFromDate) params.append('from_date', summaryFromDate);
      if (summaryToDate) params.append('to_date', summaryToDate);

      const res = await fetch(`${API_BASE_URL}/insurance-supervision/summary?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data && data.success) {
        setSummary(data.summary);
        setCategories(data.categories || []);
      }
    } catch (e) {
      console.error('Error fetching supervision summary:', e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Detailed Report
  const fetchDetailedReport = async (page = 1) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('per_page', '25');
      if (selectedType !== 'all') params.append('insurance_type', selectedType);
      if (docSearch) params.append('search', docSearch);
      if (docFromDate) params.append('from_date', docFromDate);
      if (docToDate) params.append('to_date', docToDate);

      const res = await fetch(`${API_BASE_URL}/insurance-supervision/detailed-report?${params.toString()}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data && data.success) {
        setDocsList(data.data || []);
        setDocsPagination(data.pagination || { current_page: 1, total_pages: 1, total: 0 });
        setDocsAggregates(data.aggregates || { total_supervision_fee: 0, total_premium: 0 });
      }
    } catch (e) {
      console.error('Error fetching detailed report:', e);
    }
  };

  // Fetch Payments
  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/insurance-supervision/payments`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data && data.success) {
        setPayments(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching supervision payments:', e);
    }
  };

  // Fetch Settings
  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/insurance-supervision/settings`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data && data.success) {
        setSettings(data.data || []);
      }
    } catch (e) {
      console.error('Error fetching supervision settings:', e);
    }
  };

  useEffect(() => {
    fetchSummary();
    fetchPayments();
    fetchSettings();
  }, [yearFilter, monthFilter, summaryFromDate, summaryToDate]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchDetailedReport(1);
    }
  }, [activeTab, selectedType, docFromDate, docToDate]);

  // Open Payment Modal
  const handleOpenPaymentModal = (pay: SupervisionPayment | null = null) => {
    if (!canEdit) {
      showToast('عذراً، تملك صلاحية العرض والاطلاع فقط ولا يمكنك تسجيل أو تعديل الدفعات', 'error');
      return;
    }
    setEditingPayment(pay);
    if (pay) {
      setPayVoucherNumber(pay.voucher_number || '');
      setPayDate(pay.payment_date ? pay.payment_date.split('T')[0] : '');
      setPayAmount(pay.amount.toString());
      setPayMethod(pay.payment_method || 'bank_transfer');
      setPayBankName(pay.bank_name || '');
      setPayCheckNumber(pay.check_number || '');
      setPayPeriodFrom(pay.period_from ? pay.period_from.split('T')[0] : '');
      setPayPeriodTo(pay.period_to ? pay.period_to.split('T')[0] : '');
      setPayNotes(pay.notes || '');
      setPayReceiptFile(null);
    } else {
      setPayVoucherNumber(`SUP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`);
      setPayDate(new Date().toISOString().split('T')[0]);
      setPayAmount('');
      setPayMethod('bank_transfer');
      setPayBankName('مصرف الصحارى');
      setPayCheckNumber('');
      setPayPeriodFrom('');
      setPayPeriodTo('');
      setPayNotes('');
      setPayReceiptFile(null);
    }
    setShowPaymentModal(true);
  };

  // Save Payment
  const handleSavePayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!canEdit) {
      showToast('عذراً، لا تملك صلاحية تسجيل أو تعديل الدفعات (عرض فقط)', 'error');
      return;
    }
    if (!payAmount || parseFloat(payAmount) <= 0) {
      showToast('يرجى إدخال مبلغ صحيح للسداد', 'error');
      return;
    }

    setSubmittingPayment(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('voucher_number', payVoucherNumber);
      formData.append('payment_date', payDate);
      formData.append('amount', payAmount);
      formData.append('payment_method', payMethod);
      if (payBankName) formData.append('bank_name', payBankName);
      if (payCheckNumber) formData.append('check_number', payCheckNumber);
      if (payPeriodFrom) formData.append('period_from', payPeriodFrom);
      if (payPeriodTo) formData.append('period_to', payPeriodTo);
      if (payNotes) formData.append('notes', payNotes);
      if (payReceiptFile) formData.append('receipt_image', payReceiptFile);

      const url = editingPayment
        ? `${API_BASE_URL}/insurance-supervision/payments/${editingPayment.id}`
        : `${API_BASE_URL}/insurance-supervision/payments`;

      if (editingPayment) {
        formData.append('_method', 'PUT');
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData,
      });

      const data = await res.json();
      if (data && data.success) {
        showToast(editingPayment ? 'تم تحديث سند السداد بنجاح' : 'تم تسجيل سند السداد بنجاح', 'success');
        setShowPaymentModal(false);
        fetchPayments();
        fetchSummary();
      } else {
        showToast(data?.message || 'فشل حفظ سند السداد', 'error');
      }
    } catch (err) {
      console.error('Error saving payment:', err);
      showToast('حدث خطأ في الاتصال أثناء حفظ السند', 'error');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Delete Payment
  const handleDeletePayment = async (id: number) => {
    if (!canEdit) {
      showToast('عذراً، لا تملك صلاحية الحذف (عرض فقط)', 'error');
      return;
    }
    if (!window.confirm('هل أنت متأكد من حذف سند السداد هذا نهائياً؟')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/insurance-supervision/payments/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data && data.success) {
        showToast('تم حذف سند السداد بنجاح', 'success');
        fetchPayments();
        fetchSummary();
      }
    } catch (e) {
      console.error('Error deleting payment:', e);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    if (!canEdit) {
      showToast('عذراً، لا تملك صلاحية تعديل الإعدادات (عرض فقط)', 'error');
      return;
    }
    setSavingSettings(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/insurance-supervision/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ settings })
      });
      const data = await res.json();
      if (data && data.success) {
        showToast('تم حفظ نسب وإعدادات هيئة الإشراف بنجاح', 'success');
        fetchSummary();
      }
    } catch (e) {
      console.error('Error saving settings:', e);
      showToast('حدث خطأ أثناء حفظ الإعدادات', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Export Detailed Report
  const handleExportDetailedExcel = () => {
    if (docsList.length === 0) {
      showToast('لا توجد بيانات وثائق لتصديرها', 'error');
      return;
    }

    const columns = [
      { header: 'م', key: 'seq', width: 8 },
      { header: 'رقم الوثيقة', key: 'policy_number', width: 22 },
      { header: 'نوع التأمين', key: 'type', width: 20 },
      { header: 'اسم المؤمن له', key: 'insured_name', width: 25 },
      { header: 'تاريخ الإصدار', key: 'issue_date', width: 15 },
      { header: 'الفرع / الوكيل', key: 'branch', width: 20 },
      { header: 'قسط التأمين (د.ل)', key: 'premium', width: 18 },
      { header: 'نسبة الرسم (%)', key: 'fee_rate', width: 15 },
      { header: 'رسم هيئة الإشراف (د.ل)', key: 'supervision_fee', width: 20 },
    ];

    const data = docsList.map((doc, idx) => ({
      seq: idx + 1,
      policy_number: doc.policy_number,
      type: doc.insurance_type_name,
      insured_name: doc.insured_name,
      issue_date: doc.issue_date,
      branch: doc.branch_name,
      premium: doc.premium,
      fee_rate: `${doc.fee_rate}%`,
      supervision_fee: doc.supervision_fee,
    }));

    generatePremiumExcel({
      title: 'تقرير رسوم هيئة الإشراف على التأمين التفصيلي للوثائق',
      subtitle: `تاريخ الاستخراج: ${new Date().toISOString().split('T')[0]} - إجمالي الوثائق: ${docsList.length}`,
      columns,
      data,
      fileName: `رسوم_هيئة_الإشراف_${new Date().toISOString().split('T')[0]}`,
    });
    showToast('تم تصدير ملف الوثائق بنجاح', 'success');
  };

  // Export Categories Statement
  const handleExportCategoriesExcel = () => {
    if (categories.length === 0) {
      showToast('لا توجد بيانات فئات لتصديرها', 'error');
      return;
    }

    const columns = [
      { header: 'م', key: 'seq', width: 8 },
      { header: 'فرع / نوع التأمين', key: 'name', width: 25 },
      { header: 'عدد الوثائق الصادرة', key: 'count', width: 18 },
      { header: 'إجمالي الأقساط المكتتبة (د.ل)', key: 'premium', width: 24 },
      { header: 'نسبة الرسم القانونية (%)', key: 'fee_rate', width: 20 },
      { header: 'إجمالي رسم هيئة الإشراف (د.ل)', key: 'supervision_fee', width: 24 },
    ];

    const data = categories.map((cat, idx) => ({
      seq: idx + 1,
      name: cat.name,
      count: cat.document_count,
      premium: cat.total_premium,
      fee_rate: `${cat.fee_rate}%`,
      supervision_fee: cat.supervision_fee,
    }));

    generatePremiumExcel({
      title: 'كشف حساب رسوم هيئة الإشراف على التأمين حسب الفروع',
      subtitle: `تاريخ الاستخراج: ${new Date().toISOString().split('T')[0]} - إجمالي الفروع: ${categories.length}`,
      columns,
      data,
      fileName: `كشف_حساب_هيئة_الإشراف_${new Date().toISOString().split('T')[0]}`,
    });
    showToast('تم تصدير كشف الحساب بنجاح', 'success');
  };

  // Method Labels
  const getMethodLabel = (m: string) => {
    switch (m) {
      case 'check': return 'صك مصرفي مصدق';
      case 'bank_transfer': return 'تحويل مصرفي';
      case 'deposit': return 'إيداع نقدي بالحساب';
      case 'cash': return 'نقداً (خزينة)';
      default: return m;
    }
  };

  // Handler for Professional Official Reports Printing
  const handlePrintReport = (forcedType?: 'statement' | 'docs' | 'payments') => {
    setShowPrintMenu(false);
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    if (forcedType === 'docs' || (!forcedType && activeTab === 'reports')) {
      if (docsList.length === 0) {
        showToast('لا توجد وثائق في الجدول لطباعتها', 'error');
        return;
      }
      printSupervisionDetailedDocsReport({
        docs: docsList,
        aggregates: docsAggregates,
        totalCount: docsPagination.total || docsList.length,
        filters: {
          fromDate: docFromDate,
          toDate: docToDate,
          search: docSearch,
          typeLabel: categories.find(c => c.key === selectedType)?.name || (selectedType === 'all' ? 'كل فروع التأمين' : selectedType),
        },
        currentUser,
      });
      return;
    }

    // Default: Official Financial Statement & Position
    printSupervisionFinancialStatement({
      summary: {
        total_premiums: summary?.total_premiums || 0,
        total_supervision_due: summary?.total_supervision_due || 0,
        total_paid: summary?.total_paid_to_authority || 0,
        net_balance: summary?.remaining_due_to_authority || 0,
        total_documents_count: summary?.total_documents_count || 0,
      },
      categories,
      payments,
      filters: {
        year: yearFilter,
        month: monthFilter,
        fromDate: summaryFromDate,
        toDate: summaryToDate,
      },
      currentUser,
    });
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', padding: '0 5px' }}>
      <ReadOnlyNotice message="وضع القراءة فقط: يمكنك مراجعة كشف حساب هيئة الإشراف، تصفح التقارير التفصيلية، استخدام الفلاتر، وطباعة السندات والكشوفات وتصديرها. تسجيل التوريدات وتعديل النسب مقيد بحسب صلاحياتك." />
      {/* Top Banner / Header */}
      <div className="users-breadcrumb no-print" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '28px 32px',
        background: 'linear-gradient(135deg, #091e3a 0%, #17325c 100%)',
        borderRadius: '18px',
        marginBottom: '26px',
        color: '#fff',
        boxShadow: '0 10px 25px -5px rgba(9, 30, 58, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.08, pointerEvents: 'none' }}>
          <i className="fa-solid fa-building-columns" style={{ fontSize: '180px', position: 'absolute', left: '-20px', bottom: '-30px' }}></i>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              background: '#38bdf8',
              color: '#091e3a',
              fontSize: '12px',
              fontWeight: 900,
              padding: '4px 12px',
              borderRadius: '20px'
            }}>
              {loading ? 'جاري التحميل...' : 'قسم الشؤون الرقابية والمحاسبية'}
            </span>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-building-columns" style={{ color: '#fcd34d' }}></i>
              هيئة الإشراف على التأمين - الحسابات والتقارير
            </h2>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>
            كشف حساب المستحقات والمسددات، تقارير الرسوم المحصلة لكافة الوثائق، وسندات التوريد الدورية
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', zIndex: 1, flexWrap: 'wrap' }}>
          {canEdit && (
            <button
              onClick={() => handleOpenPaymentModal()}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                padding: '11px 20px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                fontSize: '0.9rem'
              }}
            >
              <i className="fa-solid fa-file-invoice-dollar"></i> تسجيل توريد دفعة
            </button>
          )}

          {/* Professional Printing Button & Menu */}
          <div style={{ position: 'relative' }}>
            <div style={{
              display: 'inline-flex',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 4px 10px rgba(2, 132, 199, 0.35)'
            }}>
              <button
                onClick={() => handlePrintReport()}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '11px 18px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.9rem'
                }}
                title="طباعة التقرير الرسمي المعتمد"
              >
                <i className="fa-solid fa-print"></i> طباعة التقرير الرسمي
              </button>
              <button
                onClick={() => setShowPrintMenu(!showPrintMenu)}
                style={{
                  background: '#0369a1',
                  color: '#fff',
                  border: 'none',
                  borderRight: '1px solid rgba(255,255,255,0.25)',
                  padding: '11px 12px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.85rem'
                }}
                title="خيارات الطباعة"
              >
                <i className={`fa-solid fa-chevron-${showPrintMenu ? 'up' : 'down'}`}></i>
              </button>
            </div>

            {showPrintMenu && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '12px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                border: '1px solid #cbd5e1',
                padding: '6px',
                zIndex: 1000,
                minWidth: '270px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <button
                  onClick={() => handlePrintReport('statement')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'right',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: '#0f172a',
                    width: '100%'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <i className="fa-solid fa-building-columns" style={{ color: '#0284c7', fontSize: '1.1rem' }}></i>
                  <div>
                    <div style={{ fontWeight: 800 }}>كشف الحساب والموقف المالي الشامل</div>
                    <small style={{ color: '#64748b', fontSize: '0.72rem' }}>الموقف المالي، الفروع، والسندات المسددة (A4)</small>
                  </div>
                </button>

                <button
                  onClick={() => handlePrintReport('docs')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    textAlign: 'right',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    color: '#0f172a',
                    width: '100%'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <i className="fa-solid fa-file-invoice" style={{ color: '#10b981', fontSize: '1.1rem' }}></i>
                  <div>
                    <div style={{ fontWeight: 800 }}>تقرير رسوم الوثائق التفصيلي</div>
                    <small style={{ color: '#64748b', fontSize: '0.72rem' }}>حصر وثائق التأمين المصدرة والرسوم (A4 أفقي)</small>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Total Due */}
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
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted)' }}>إجمالي الرسوم المستحقة</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-coins"></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#dc2626' }}>
            {(summary?.total_supervision_due || 0).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 700 }}>د.ل</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            عبر {summary?.total_documents_count ? (summary.total_documents_count).toLocaleString() : 0} وثيقة مصدرة
          </div>
        </div>

        {/* Total Paid */}
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
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted)' }}>إجمالي المسدد والمورد</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-circle-check"></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#16a34a' }}>
            {(summary?.total_paid_to_authority || 0).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 700 }}>د.ل</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            عبر {summary?.payments_count || 0} سند توريد مسجل
          </div>
        </div>

        {/* Net Remaining Balance */}
        <div style={{
          background: summary && summary.remaining_due_to_authority <= 0 ? '#f0fdf4' : '#fff7ed',
          padding: '20px',
          borderRadius: '16px',
          border: summary && summary.remaining_due_to_authority <= 0 ? '1px solid #bbf7d0' : '1px solid #fed7aa',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: summary && summary.remaining_due_to_authority <= 0 ? '#15803d' : '#c2410c' }}>
              الرصيد المتبقي للهيئة
            </span>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px',
              background: summary && summary.remaining_due_to_authority <= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(249, 115, 22, 0.15)',
              color: summary && summary.remaining_due_to_authority <= 0 ? '#16a34a' : '#ea580c',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <i className={`fa-solid ${summary && summary.remaining_due_to_authority <= 0 ? 'fa-badge-check' : 'fa-hourglass-half'}`}></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: summary && summary.remaining_due_to_authority <= 0 ? '#16a34a' : '#c2410c' }}>
            {(summary?.remaining_due_to_authority || 0).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 700 }}>د.ل</span>
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: summary && summary.remaining_due_to_authority <= 0 ? '#15803d' : '#9a3412' }}>
            {summary && summary.remaining_due_to_authority <= 0 ? 'تمت تسوية وسداد كافة الرسوم المستحقة' : 'رصيد دائن مستحق السداد للهيئة'}
          </div>
        </div>

        {/* Total Insured Premiums */}
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
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--muted)' }}>إجمالي الأقساط المكتتبة</span>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-chart-line"></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#1e40af' }}>
            {(summary?.total_premiums || 0).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 700 }}>د.ل</span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            حجم العمليات التأمينية الخاضعة للرسم
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="no-print" style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        borderBottom: '2px solid var(--border)',
        paddingBottom: '14px',
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('ledger')}
          style={{
            padding: '11px 22px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'ledger' ? 'linear-gradient(135deg, #091e3a 0%, #17325c 100%)' : 'var(--card-bg)',
            color: activeTab === 'ledger' ? '#fff' : 'var(--text)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'ledger' ? '0 4px 10px rgba(9, 30, 58, 0.25)' : 'none'
          }}
        >
          <i className="fa-solid fa-scale-balanced"></i> كشف الحساب والموقف المالي
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          style={{
            padding: '11px 22px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'reports' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'var(--card-bg)',
            color: activeTab === 'reports' ? '#fff' : 'var(--text)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'reports' ? '0 4px 10px rgba(2, 132, 199, 0.25)' : 'none'
          }}
        >
          <i className="fa-solid fa-file-invoice"></i> تقرير رسوم الوثائق التفصيلي
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          style={{
            padding: '11px 22px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'payments' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'var(--card-bg)',
            color: activeTab === 'payments' ? '#fff' : 'var(--text)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'payments' ? '0 4px 10px rgba(16, 185, 129, 0.25)' : 'none'
          }}
        >
          <i className="fa-solid fa-receipt"></i> سجل سندات وتوريد الدفعات ({payments.length})
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          style={{
            padding: '11px 22px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'requests' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'var(--card-bg)',
            color: activeTab === 'requests' ? '#fff' : 'var(--text)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'requests' ? '0 4px 10px rgba(2, 132, 199, 0.25)' : 'none'
          }}
        >
          <i className="fa-solid fa-file-signature"></i> طلبات وثائق الإجباري (الخطابات الرسمية)
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '11px 22px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'settings' ? 'linear-gradient(135deg, #475569 0%, #334155 100%)' : 'var(--card-bg)',
            color: activeTab === 'settings' ? '#fff' : 'var(--text)',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'settings' ? '0 4px 10px rgba(71, 85, 105, 0.25)' : 'none'
          }}
        >
          <i className="fa-solid fa-sliders"></i> إعدادات نسب الرسوم
        </button>
      </div>

      {/* TAB 1: LEDGER & FINANCIAL STATEMENT */}
      {activeTab === 'ledger' && (
        <div>
          {/* Filter Bar for Ledger */}
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
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>السنة</label>
                <select
                  value={yearFilter}
                  onChange={e => setYearFilter(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 700 }}
                >
                  <option value="الكل">كل السنوات</option>
                  {['2023', '2024', '2025', '2026', '2027'].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>الشهر</label>
                <select
                  value={monthFilter}
                  onChange={e => setMonthFilter(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 700 }}
                >
                  <option value="الكل">كل الشهور</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m.toString()}>{m}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>من تاريخ</label>
                <input
                  type="date"
                  value={summaryFromDate}
                  onChange={e => setSummaryFromDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>إلى تاريخ</label>
                <input
                  type="date"
                  value={summaryToDate}
                  onChange={e => setSummaryToDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => { setYearFilter('الكل'); setMonthFilter('الكل'); setSummaryFromDate(''); setSummaryToDate(''); }}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  تصفير
                </button>
                <button
                  onClick={handleExportCategoriesExcel}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '10px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  <i className="fa-solid fa-file-excel"></i> Excel
                </button>
                <button
                  onClick={() => handlePrintReport('statement')}
                  style={{ flex: 1.2, padding: '10px 14px', borderRadius: '10px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  title="طباعة كشف الحساب والموقف المالي المعتمد"
                >
                  <i className="fa-solid fa-print"></i> طباعة كشف الحساب
                </button>
              </div>
            </div>
          </div>

          {/* Categories Statement Table */}
          <div className="users-table-wrapper" style={{
            background: 'var(--card-bg)',
            borderRadius: '18px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            marginBottom: '30px'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>توزيع رسوم هيئة الإشراف حسب فروع التأمين</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>بيان إجمالي للوثائق الصادرة وحصة الهيئة لكل فرع تأميني</p>
              </div>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>
                {categories.length} فروع تأمينية
              </span>
            </div>

            <table className="users-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  <th style={{ padding: '14px 18px', verticalAlign: 'middle' }}>فرع التأمين</th>
                  <th style={{ padding: '14px 18px', verticalAlign: 'middle' }}>عدد الوثائق</th>
                  <th style={{ padding: '14px 18px', verticalAlign: 'middle' }}>إجمالي الأقساط (د.ل)</th>
                  <th style={{ padding: '14px 18px', verticalAlign: 'middle' }}>نسبة الرسم</th>
                  <th style={{ padding: '14px 18px', verticalAlign: 'middle' }}>رسم الهيئة المستحق (د.ل)</th>
                  <th style={{ padding: '14px 18px', verticalAlign: 'middle' }}>نسبة المساهمة</th>
                  <th className="no-print" style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'center' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, idx) => {
                  const share = summary?.total_supervision_due && summary.total_supervision_due > 0
                    ? ((cat.supervision_fee / summary.total_supervision_due) * 100).toFixed(1)
                    : '0';

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 18px', fontWeight: 800, verticalAlign: 'middle' }}>
                        <i className="fa-solid fa-folder-closed text-primary me-2"></i> {cat.name}
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, verticalAlign: 'middle' }}>
                        <span style={{ color: cat.document_count > 0 ? 'var(--text)' : 'var(--muted)' }}>
                          {cat.document_count.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 700, verticalAlign: 'middle', color: '#1e40af' }}>
                        {cat.total_premium.toLocaleString()} د.ل
                      </td>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <span style={{ background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '0.85rem' }}>
                          {cat.fee_rate}% {cat.fixed_fee > 0 ? `+ ${cat.fixed_fee} د.ل` : ''}
                        </span>
                      </td>
                      <td style={{ padding: '14px 18px', fontWeight: 900, color: '#dc2626', verticalAlign: 'middle' }}>
                        {cat.supervision_fee.toLocaleString()} د.ل
                      </td>
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, parseFloat(share))}%`, height: '100%', background: '#0284c7', borderRadius: '4px' }}></div>
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: '35px' }}>{share}%</span>
                        </div>
                      </td>
                      <td className="no-print" style={{ padding: '14px 18px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <button
                          onClick={() => {
                            setSelectedType(cat.key);
                            setActiveTab('reports');
                          }}
                          style={{
                            background: 'rgba(2, 132, 199, 0.1)',
                            color: '#0284c7',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.82rem',
                            fontWeight: 700
                          }}
                        >
                          عرض الوثائق
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg)', fontWeight: 900, borderTop: '2px solid var(--border)' }}>
                  <td style={{ padding: '16px 18px' }}>الإجمالي العام</td>
                  <td style={{ padding: '16px 18px' }}>{(summary?.total_documents_count || 0).toLocaleString()}</td>
                  <td style={{ padding: '16px 18px', color: '#1e40af' }}>{(summary?.total_premiums || 0).toLocaleString()} د.ل</td>
                  <td style={{ padding: '16px 18px' }}>—</td>
                  <td style={{ padding: '16px 18px', color: '#dc2626' }}>{(summary?.total_supervision_due || 0).toLocaleString()} د.ل</td>
                  <td style={{ padding: '16px 18px' }}>100%</td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED POLICIES REPORT */}
      {activeTab === 'reports' && (
        <div>
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
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>نوع التأمين</label>
                <select
                  value={selectedType}
                  onChange={e => setSelectedType(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 700 }}
                >
                  <option value="all">كل فروع التأمين</option>
                  {categories.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>بحث برقم الوثيقة أو العميل</label>
                <input
                  type="text"
                  placeholder="رقم الوثيقة أو الاسم..."
                  value={docSearch}
                  onChange={e => setDocSearch(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>من تاريخ</label>
                <input
                  type="date"
                  value={docFromDate}
                  onChange={e => setDocFromDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700 }}>إلى تاريخ</label>
                <input
                  type="date"
                  value={docToDate}
                  onChange={e => setDocToDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                <button
                  onClick={() => fetchDetailedReport(1)}
                  style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', border: 'none', background: '#0284c7', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  <i className="fa-solid fa-magnifying-glass"></i> بحث
                </button>
                <button
                  onClick={handleExportDetailedExcel}
                  style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                >
                  <i className="fa-solid fa-file-excel"></i> Excel
                </button>
                <button
                  onClick={() => handlePrintReport('docs')}
                  style={{ flex: 1.2, padding: '10px 16px', borderRadius: '10px', border: 'none', background: '#334155', color: '#fff', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  title="طباعة تقرير الوثائق التفصيلي"
                >
                  <i className="fa-solid fa-print"></i> طباعة التقرير
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="users-table-wrapper" style={{
            background: 'var(--card-bg)',
            borderRadius: '18px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <table className="users-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  <th style={{ padding: '14px 16px' }}>رقم الوثيقة</th>
                  <th style={{ padding: '14px 16px' }}>نوع التأمين</th>
                  <th style={{ padding: '14px 16px' }}>اسم المؤمن له</th>
                  <th style={{ padding: '14px 16px' }}>تاريخ الإصدار</th>
                  <th style={{ padding: '14px 16px' }}>الفرع / الوكيل</th>
                  <th style={{ padding: '14px 16px' }}>قسط التأمين</th>
                  <th style={{ padding: '14px 16px' }}>نسبة الرسم</th>
                  <th style={{ padding: '14px 16px' }}>رسم هيئة الإشراف</th>
                </tr>
              </thead>
              <tbody>
                {docsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                      لا توجد وثائق تطابق الفلاتر المحددة
                    </td>
                  </tr>
                ) : (
                  docsList.map((doc, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800 }}>
                        <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                          {doc.policy_number}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{doc.insurance_type_name}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>{doc.insured_name}</td>
                      <td style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: '0.9rem' }}>{doc.issue_date}</td>
                      <td style={{ padding: '14px 16px' }}>{doc.branch_name}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 800, color: '#1e40af' }}>{doc.premium.toLocaleString()} د.ل</td>
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>{doc.fee_rate}%</td>
                      <td style={{ padding: '14px 16px', fontWeight: 900, color: '#dc2626' }}>{doc.supervision_fee.toLocaleString()} د.ل</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg)', fontWeight: 900, borderTop: '2px solid var(--border)' }}>
                  <td colSpan={5} style={{ padding: '14px 16px' }}>الإجمالي العام للوثائق المعروضة</td>
                  <td style={{ padding: '14px 16px', color: '#1e40af' }}>{docsAggregates.total_premium.toLocaleString()} د.ل</td>
                  <td style={{ padding: '14px 16px' }}>—</td>
                  <td style={{ padding: '14px 16px', color: '#dc2626' }}>{docsAggregates.total_supervision_fee.toLocaleString()} د.ل</td>
                </tr>
              </tfoot>
            </table>

            {/* Pagination Controls */}
            {docsPagination.total_pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '20px' }}>
                <button
                  disabled={docsPagination.current_page <= 1}
                  onClick={() => fetchDetailedReport(docsPagination.current_page - 1)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', cursor: 'pointer' }}
                >
                  السابق
                </button>
                <span style={{ padding: '8px 16px', fontWeight: 800 }}>
                  صفحة {docsPagination.current_page} من {docsPagination.total_pages} (إجمالي {docsPagination.total} وثيقة)
                </span>
                <button
                  disabled={docsPagination.current_page >= docsPagination.total_pages}
                  onClick={() => fetchDetailedReport(docsPagination.current_page + 1)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', cursor: 'pointer' }}
                >
                  التالي
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS & VOUCHERS */}
      {activeTab === 'payments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>سجل سندات التوريد والسداد لهيئة الإشراف</h3>
              <p style={{ margin: '4px 0 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>قائمة الدفعات المسددة للهيئة بموجب إيصالات الإيداع والصكوك</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => handlePrintReport('statement')}
                style={{
                  background: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '11px 18px',
                  borderRadius: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.9rem'
                }}
              >
                <i className="fa-solid fa-print"></i> طباعة كشف التوريدات والموقف المالي
              </button>
              {canEdit && (
                <button
                  onClick={() => handleOpenPaymentModal()}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '11px 20px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.9rem'
                  }}
                >
                  <i className="fa-solid fa-plus"></i> إضافة سند توريد جديد
                </button>
              )}
            </div>
          </div>

          <div className="users-table-wrapper" style={{
            background: 'var(--card-bg)',
            borderRadius: '18px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <table className="users-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg)' }}>
                  <th style={{ padding: '14px 16px' }}>رقم السند / الإشعار</th>
                  <th style={{ padding: '14px 16px' }}>تاريخ السداد</th>
                  <th style={{ padding: '14px 16px' }}>المبلغ المسدد</th>
                  <th style={{ padding: '14px 16px' }}>طريقة السداد</th>
                  <th style={{ padding: '14px 16px' }}>المصرف المسحوب عليه</th>
                  <th style={{ padding: '14px 16px' }}>رقم الصك / الحوالة</th>
                  <th style={{ padding: '14px 16px' }}>الفترة المغطاة</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>إيصال التوريد</th>
                  <th className="no-print" style={{ padding: '14px 16px', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                      لا توجد سندات سداد مسجلة حتى الآن
                    </td>
                  </tr>
                ) : (
                  payments.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800, fontFamily: 'monospace' }}>
                        {p.voucher_number || `SUP-${p.id}`}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>{p.payment_date?.split('T')[0]}</td>
                      <td style={{ padding: '14px 16px', fontWeight: 900, color: '#16a34a' }}>
                        {parseFloat(p.amount.toString()).toLocaleString()} د.ل
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }}>
                          {getMethodLabel(p.payment_method)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>{p.bank_name || '—'}</td>
                      <td style={{ padding: '14px 16px', fontFamily: 'monospace' }}>{p.check_number || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: 'var(--muted)' }}>
                        {p.period_from && p.period_to ? `${p.period_from?.split('T')[0]} إلى ${p.period_to?.split('T')[0]}` : '—'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {p.receipt_image ? (
                          <button
                            onClick={() => {
                              setSelectedImage(resolveImageUrl(p.receipt_image));
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
                              fontSize: '0.82rem'
                            }}
                          >
                            <i className="fa-solid fa-file-invoice"></i> عرض الإيصال
                          </button>
                        ) : (
                          <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>لا يوجد</span>
                        )}
                      </td>
                      <td className="no-print" style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            onClick={() => printSinglePaymentVoucher(p, JSON.parse(localStorage.getItem('user') || '{}'))}
                            style={{ background: '#0284c7', color: '#fff', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}
                            title="طباعة سند التوريد الرسمي"
                          >
                            <i className="fa-solid fa-print"></i>
                          </button>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleOpenPaymentModal(p)}
                                style={{ background: '#3b82f6', color: '#fff', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}
                                title="تعديل"
                              >
                                <i className="fa-solid fa-pencil"></i>
                              </button>
                              <button
                                onClick={() => handleDeletePayment(p.id)}
                                style={{ background: '#ef4444', color: '#fff', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}
                                title="حذف"
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{
            background: 'var(--card-bg)',
            padding: '30px',
            borderRadius: '18px',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '1px solid var(--border)', paddingBottom: '15px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>إعدادات نسب ورسوم هيئة الإشراف على التأمين</h3>
                <p style={{ margin: '5px 0 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>تحديد النسبة المئوية القانونية أو المبلغ المقطوع المحتسب لصالح الهيئة لكل فرع</p>
              </div>
              {canEdit && (
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  style={{
                    background: 'linear-gradient(135deg, #014cb1 0%, #003173 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    fontWeight: 800,
                    cursor: savingSettings ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <i className="fa-solid fa-floppy-disk"></i> {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {settings.map((s, idx) => (
                <div
                  key={s.insurance_type_key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr',
                    gap: '15px',
                    alignItems: 'center',
                    padding: '14px 18px',
                    borderRadius: '12px',
                    background: 'var(--bg)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <div>
                    <label style={{ fontWeight: 800, fontSize: '0.95rem' }}>{s.insurance_type_name}</label>
                    <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
                      {s.insurance_type_key}
                    </span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>النسبة المئوية (%)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={s.fee_rate_percentage}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setSettings(prev => prev.map((item, i) => i === idx ? { ...item, fee_rate_percentage: val } : item));
                        }}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', fontWeight: 800 }}
                      />
                      <span style={{ fontWeight: 800 }}>%</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>مبلغ مقطوع (د.ل)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={s.fixed_fee_amount}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setSettings(prev => prev.map((item, i) => i === idx ? { ...item, fixed_fee_amount: val } : item));
                        }}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--card-bg)', fontWeight: 800 }}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>د.ل</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMPULSORY DOCUMENT SUPPLY REQUESTS & OFFICIAL LETTERS */}
      {activeTab === 'requests' && (
        <CompulsoryDocumentRequestsTab />
      )}

      {/* MODAL: ADD / EDIT PAYMENT */}
      {showPaymentModal && (
        <div
          className="modal-overlay no-print"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              width: '100%',
              maxWidth: '750px',
              borderRadius: '20px',
              padding: '30px',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900 }}>
                <i className="fa-solid fa-file-invoice-dollar text-primary me-2"></i>
                {editingPayment ? 'تعديل سند توريد هيئة الإشراف' : 'تسجيل سند توريد وسداد لهيئة الإشراف'}
              </h3>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePayment}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700 }}>رقم السند / الإشعار</label>
                  <input
                    type="text"
                    value={payVoucherNumber}
                    onChange={e => setPayVoucherNumber(e.target.value)}
                    required
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 700 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700 }}>تاريخ التوريد</label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={e => setPayDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700 }}>المبلغ المورد (د.ل)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 800, fontSize: '1.1rem', color: '#16a34a' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700 }}>طريقة السداد</label>
                  <select
                    value={payMethod}
                    onChange={e => setPayMethod(e.target.value)}
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 700 }}
                  >
                    <option value="bank_transfer">تحويل مصرفي</option>
                    <option value="check">صك مصرفي مصدق</option>
                    <option value="deposit">إيداع نقدي بالحساب</option>
                    <option value="cash">نقداً (خزينة)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700 }}>المصرف المسحوب عليه</label>
                  <input
                    type="text"
                    value={payBankName}
                    onChange={e => setPayBankName(e.target.value)}
                    placeholder="اسم المصرف..."
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700 }}>رقم الصك أو الحوالة</label>
                  <input
                    type="text"
                    value={payCheckNumber}
                    onChange={e => setPayCheckNumber(e.target.value)}
                    placeholder="رقم الصك أو المرجع..."
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700 }}>عن الفترة من</label>
                  <input
                    type="date"
                    value={payPeriodFrom}
                    onChange={e => setPayPeriodFrom(e.target.value)}
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700 }}>عن الفترة إلى</label>
                  <input
                    type="date"
                    value={payPeriodTo}
                    onChange={e => setPayPeriodTo(e.target.value)}
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700 }}>إرفاق صورة إيصال التوريد</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={e => setPayReceiptFile(e.target.files?.[0] || null)}
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px dashed var(--border)', background: 'var(--bg)' }}
                  />
                  {editingPayment?.receipt_image && (
                    <span style={{ fontSize: '0.8rem', color: '#16a34a', display: 'block', marginTop: '4px' }}>
                      ✓ يوجد إيصال مرفق مسبقاً
                    </span>
                  )}
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: 700 }}>ملاحظات وبيان التوريد</label>
                  <textarea
                    rows={2}
                    value={payNotes}
                    onChange={e => setPayNotes(e.target.value)}
                    placeholder="أي ملاحظات إضافية حول التوريد..."
                    style={{ width: '100%', padding: '11px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  style={{
                    flex: 2,
                    padding: '14px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '1rem',
                    cursor: submittingPayment ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingPayment ? 'جاري الحفظ...' : (editingPayment ? 'تحديث السند' : 'تأكيد تسجيل السداد')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            zIndex: 99999,
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
