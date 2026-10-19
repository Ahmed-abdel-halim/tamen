import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { API_BASE_URL, resolveImageUrl } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';
import { canEditFinancial, ReadOnlyNotice } from '../utils/financialPermissions';
import { tafqeetDinar } from '../utils/printInsuranceSupervisionReport';
import {
  printCompulsoryDocumentRequestLetter,
  type CompulsoryDocumentRequestData
} from '../utils/printCompulsoryDocumentRequestLetter';

interface StoreItemOption {
  id: number;
  name: string;
  unit: string;
  category?: string;
}

interface RequestStatistics {
  total_requests: number;
  total_requested_docs: number;
  total_amount: number;
  total_received_docs: number;
  pending_count: number;
  received_count: number;
}

export default function CompulsoryDocumentRequestsTab() {
  const canEdit = canEditFinancial('إدارة الإيرادات');

  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<CompulsoryDocumentRequestData[]>([]);
  const [statistics, setStatistics] = useState<RequestStatistics | null>(null);
  const [storeItems, setStoreItems] = useState<StoreItemOption[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Create / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<CompulsoryDocumentRequestData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [docsCount, setDocsCount] = useState<number | ''>(200);
  const [feePerDoc, setFeePerDoc] = useState<number>(5);
  const [requestDate, setRequestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [refNumber, setRefNumber] = useState<string>('');
  const [amountInWords, setAmountInWords] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('صك مصرفي');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [signatoryName, setSignatoryName] = useState<string>('محمد حوشي');
  const [signatoryTitle, setSignatoryTitle] = useState<string>('مدير الشؤون الإدارية');
  const [subject, setSubject] = useState<string>('الموضوع / طلب تزويد وثائق التأمين الاجباري');
  const [addressedTo, setAddressedTo] = useState<string>('السيد / مدير عام هيئة الإشراف على التأمين');
  const [status, setStatus] = useState<'draft' | 'pending_approval' | 'pending_payment' | 'sent' | 'received' | 'canceled'>('draft');
  const [notes, setNotes] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [deleteReceiptFile, setDeleteReceiptFile] = useState(false);

  // Receive Modal State
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [receivingRequest, setReceivingRequest] = useState<CompulsoryDocumentRequestData | null>(null);
  const [receivedQty, setReceivedQty] = useState<number | ''>('');
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [serialFrom, setSerialFrom] = useState<string>('');
  const [serialTo, setSerialTo] = useState<string>('');
  const [selectedStoreItemId, setSelectedStoreItemId] = useState<number | ''>('');
  const [warehouseLocation, setWarehouseLocation] = useState<string>('المخزن الرئيسي');
  const [receiveNotes, setReceiveNotes] = useState<string>('');
  const [submittingReceive, setSubmittingReceive] = useState(false);

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Calculate Total & Tafqeet in Realtime
  const calculatedTotal = useMemo(() => {
    const count = typeof docsCount === 'number' ? docsCount : 0;
    return count * (feePerDoc || 5);
  }, [docsCount, feePerDoc]);

  useEffect(() => {
    if (calculatedTotal > 0) {
      setAmountInWords(tafqeetDinar(calculatedTotal));
    } else {
      setAmountInWords('');
    }
  }, [calculatedTotal]);

  // Fetch Requests
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const url = `${API_BASE_URL}/compulsory-document-requests?${params.toString()}`;
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const res = await response.json();
      if (res.success) {
        setRequests(res.data || []);
        if (res.statistics) setStatistics(res.statistics);
        if (res.store_items) setStoreItems(res.store_items);
      } else {
        showToast(res.message || 'تعذر جلب طلبات الوثائق', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('حدث خطأ أثناء الاتصال بالخادم لجلب طلبات الوثائق', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, fromDate, toDate]);

  // Handle Open Create/Edit Modal
  const handleOpenModal = (req: CompulsoryDocumentRequestData | null = null) => {
    if (!canEdit) {
      showToast('عذراً، تملك صلاحية العرض والاطلاع فقط ولا يمكنك إنشاء أو تعديل الطلبات', 'error');
      return;
    }

    if (req) {
      setEditingRequest(req);
      setDocsCount(req.documents_count);
      setFeePerDoc(req.fee_per_document || 5);
      setRequestDate(req.request_date ? req.request_date.substring(0, 10) : new Date().toISOString().split('T')[0]);
      setRefNumber(req.reference_number || '');
      setAmountInWords(req.amount_in_words || tafqeetDinar(req.total_amount));
      setPaymentMethod(req.payment_method || 'صك مصرفي');
      setPaymentReference(req.payment_reference || '');
      const rawTitle = req.signatory_title;
      setSignatoryTitle((!rawTitle || rawTitle.includes('إدارية') || rawTitle.includes('ادارية')) ? 'مدير الشؤون الإدارية' : rawTitle);
      setSubject(req.subject || 'الموضوع / طلب تزويد وثائق التأمين الاجباري');
      setAddressedTo(req.addressed_to || 'السيد / مدير عام هيئة الإشراف على التأمين');
      setStatus(req.status || 'draft');
      setNotes(req.notes || '');
      setReceiptFile(null);
      setDeleteReceiptFile(false);
    } else {
      setEditingRequest(null);
      setDocsCount(200);
      setFeePerDoc(5);
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      setRequestDate(todayStr);
      setRefNumber(`أ / ${today.getMonth() + 1} - ${today.getFullYear()}`);
      setAmountInWords(tafqeetDinar(200 * 5));
      setPaymentMethod('صك مصرفي');
      setPaymentReference('');
      setSignatoryName('محمد حوشي');
      setSignatoryTitle('مدير الشؤون الإدارية');
      setSubject('الموضوع / طلب تزويد وثائق التأمين الاجباري');
      setAddressedTo('السيد / مدير عام هيئة الإشراف على التأمين');
      setStatus('draft');
      setNotes('');
      setReceiptFile(null);
      setDeleteReceiptFile(false);
    }
    setShowModal(true);
  };

  // Submit Create/Edit Form
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!docsCount || docsCount <= 0) {
      showToast('يرجى إدخال عدد وثائق صحيح', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('documents_count', docsCount.toString());
      formData.append('fee_per_document', feePerDoc.toString());
      formData.append('request_date', requestDate);
      if (refNumber) formData.append('reference_number', refNumber);
      if (amountInWords) formData.append('amount_in_words', amountInWords);
      if (paymentMethod) formData.append('payment_method', paymentMethod);
      if (paymentReference) formData.append('payment_reference', paymentReference);
      if (signatoryName) formData.append('signatory_name', signatoryName);
      if (signatoryTitle) formData.append('signatory_title', signatoryTitle);
      if (subject) formData.append('subject', subject);
      if (addressedTo) formData.append('addressed_to', addressedTo);
      formData.append('status', status);
      if (notes) formData.append('notes', notes);

      if (receiptFile) {
        formData.append('payment_receipt_image', receiptFile);
      }
      if (deleteReceiptFile) {
        formData.append('delete_receipt_image', '1');
      }

      const url = editingRequest
        ? `${API_BASE_URL}/compulsory-document-requests/${editingRequest.id}`
        : `${API_BASE_URL}/compulsory-document-requests`;

      if (editingRequest) {
        formData.append('_method', 'PUT');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });

      const res = await response.json();
      if (response.ok && res.success) {
        showToast(res.message || 'تم حفظ الطلب بنجاح', 'success');
        setShowModal(false);
        fetchRequests();
      } else {
        showToast(res.message || 'فشلت عملية حفظ الطلب', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('حدث خطأ أثناء حفظ الطلب', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Receive Modal
  const handleOpenReceiveModal = (req: CompulsoryDocumentRequestData) => {
    if (!canEdit) {
      showToast('عذراً، تملك صلاحية العرض والاطلاع فقط ولا يمكنك تسجيل استلام الوثائق', 'error');
      return;
    }
    setReceivingRequest(req);
    setReceivedQty(req.received_quantity || req.documents_count);
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setSerialFrom(req.serial_from || '');
    setSerialTo(req.serial_to || '');
    setSelectedStoreItemId(req.store_item_id || (storeItems.length > 0 ? storeItems[0].id : ''));
    setWarehouseLocation(req.warehouse_location || 'المخزن الرئيسي');
    setReceiveNotes('');
    setShowReceiveModal(true);
  };

  // Submit Receive Form
  const handleSubmitReceive = async (e: FormEvent) => {
    e.preventDefault();
    if (!receivingRequest) return;
    if (!receivedQty || receivedQty <= 0) {
      showToast('يرجى تحديد الكمية المستلمة', 'error');
      return;
    }

    setSubmittingReceive(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/compulsory-document-requests/${receivingRequest.id}/receive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          received_quantity: Number(receivedQty),
          received_date: receivedDate,
          serial_from: serialFrom,
          serial_to: serialTo,
          store_item_id: selectedStoreItemId || null,
          warehouse_location: warehouseLocation,
          notes: receiveNotes,
        })
      });

      const res = await response.json();
      if (response.ok && res.success) {
        showToast(res.message || 'تم تسجيل الاستلام وتغذية المخزون بنجاح', 'success');
        setShowReceiveModal(false);
        fetchRequests();
      } else {
        showToast(res.message || 'فشل تسجيل استلام الوثائق', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('حدث خطأ أثناء تسجيل الاستلام', 'error');
    } finally {
      setSubmittingReceive(false);
    }
  };

  // Quick Status Switcher
  const handleQuickStatusChange = async (req: CompulsoryDocumentRequestData, newStatus: string) => {
    if (!canEdit) {
      showToast('عذراً، تملك صلاحية العرض والاطلاع فقط', 'error');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/compulsory-document-requests/${req.id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });
      const res = await response.json();
      if (response.ok && res.success) {
        showToast('تم تغيير حالة الطلب بنجاح', 'success');
        fetchRequests();
      } else {
        showToast(res.message || 'تعذر تغيير الحالة', 'error');
      }
    } catch (e) {
      showToast('حدث خطأ أثناء تغيير الحالة', 'error');
    }
  };

  // Delete Request
  const handleDelete = async (req: CompulsoryDocumentRequestData) => {
    if (!canEdit) {
      showToast('عذراً، تملك صلاحية العرض والاطلاع فقط', 'error');
      return;
    }
    if (!window.confirm(`هل أنت متأكد من حذف الطلب رقم (${req.reference_number || req.request_number}) نهائياً؟`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/compulsory-document-requests/${req.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const res = await response.json();
      if (response.ok && res.success) {
        showToast('تم حذف الطلب بنجاح', 'success');
        fetchRequests();
      } else {
        showToast(res.message || 'فشل حذف الطلب', 'error');
      }
    } catch (e) {
      showToast('حدث خطأ أثناء حذف الطلب', 'error');
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (st: string) => {
    switch (st) {
      case 'draft':
        return <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>مسودة</span>;
      case 'pending_approval':
        return <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>بانتظار الاعتماد</span>;
      case 'pending_payment':
        return <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>بانتظار السداد</span>;
      case 'sent':
        return <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>تم إرسال الطلب</span>;
      case 'received':
        return <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>تم استلام الوثائق</span>;
      case 'canceled':
        return <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>ملغي</span>;
      default:
        return <span>{st}</span>;
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (requests.length === 0) {
      showToast('لا توجد بيانات لتصديرها', 'error');
      return;
    }

    const columns = [
      { header: 'الرقم الإشاري', key: 'reference_number', width: 20 },
      { header: 'رقم الطلب', key: 'request_number', width: 18 },
      { header: 'تاريخ الطلب', key: 'request_date', width: 15 },
      { header: 'عدد الوثائق', key: 'documents_count', width: 15 },
      { header: 'رسم الوثيقة (د.ل)', key: 'fee_per_document', width: 18 },
      { header: 'إجمالي الرسوم (د.ل)', key: 'total_amount', width: 20 },
      { header: 'طريقة السداد', key: 'payment_method', width: 18 },
      { header: 'رقم الصك / الإحالة', key: 'payment_reference', width: 22 },
      { header: 'الحالة', key: 'status_label', width: 18 },
      { header: 'الكمية المستلمة', key: 'received_quantity', width: 16 },
      { header: 'تاريخ الاستلام', key: 'received_date', width: 16 },
      { header: 'السيريال من', key: 'serial_from', width: 15 },
      { header: 'السيريال إلى', key: 'serial_to', width: 15 },
      { header: 'عنصر المخزن', key: 'store_item_name', width: 25 },
      { header: 'الموقّع', key: 'signatory_name', width: 20 },
      { header: 'ملاحظات', key: 'notes', width: 30 },
    ];

    const data = requests.map(r => ({
      reference_number: r.reference_number || '—',
      request_number: r.request_number || '—',
      request_date: r.request_date ? r.request_date.substring(0, 10) : '—',
      documents_count: r.documents_count,
      fee_per_document: r.fee_per_document,
      total_amount: r.total_amount,
      payment_method: r.payment_method || '—',
      payment_reference: r.payment_reference || '—',
      status_label: r.status === 'received' ? 'تم استلام الوثائق' : (r.status === 'sent' ? 'تم إرسال الطلب' : (r.status === 'pending_payment' ? 'بانتظار السداد' : (r.status === 'pending_approval' ? 'بانتظار الاعتماد' : (r.status === 'draft' ? 'مسودة' : 'ملغي')))),
      received_quantity: r.received_quantity ?? '—',
      received_date: r.received_date ? r.received_date.substring(0, 10) : '—',
      serial_from: r.serial_from || '—',
      serial_to: r.serial_to || '—',
      store_item_name: r.store_item?.name || '—',
      signatory_name: `${r.signatory_name || 'محمد حوشي'} (${(!r.signatory_title || r.signatory_title.includes('إدارية') || r.signatory_title.includes('ادارية')) ? 'مدير الشؤون الإدارية' : r.signatory_title})`,
      notes: r.notes || '',
    }));

    generatePremiumExcel({
      fileName: `طلبات_تزويد_وثائق_الإجباري_${new Date().toISOString().split('T')[0]}`,
      title: 'سجل طلبات تزويد وثائق التأمين الإجباري — هيئة الإشراف على التأمين',
      subtitle: `إجمالي الوثائق: ${(statistics?.total_requested_docs || 0).toLocaleString()} وثيقة | إجمالي الرسوم: ${(statistics?.total_amount || 0).toLocaleString()} د.ل`,
      columns,
      data,
    });
    showToast('تم تصدير ملف Excel بنجاح', 'success');
  };

  return (
    <div style={{ marginTop: '10px' }}>
      {!canEdit && <ReadOnlyNotice message="وضع العرض والاطلاع: تملك صلاحية استعراض طلبات تزويد وثائق الإجباري وطباعة الخطابات الرسمية فقط دون إمكانية التعديل أو الحذف." />}

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '22px' }}>
        {/* Total Requests */}
        <div style={{ background: 'var(--card-bg)', padding: '18px 20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 5px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--muted)' }}>إجمالي طلبات التزويد</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-file-contract"></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#091e3a' }}>
            {statistics?.total_requests || 0} <span style={{ fontSize: '13px', fontWeight: 700 }}>طلب</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>مسجلة رسمياً بالمنظومة</div>
        </div>

        {/* Total Requested Documents */}
        <div style={{ background: 'var(--card-bg)', padding: '18px 20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 5px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--muted)' }}>إجمالي الوثائق المطلوبة</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-layer-group"></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#4f46e5' }}>
            {(statistics?.total_requested_docs || 0).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 700 }}>وثيقة</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>من هيئة الإشراف على التأمين</div>
        </div>

        {/* Total Amount in LYD */}
        <div style={{ background: 'var(--card-bg)', padding: '18px 20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 5px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--muted)' }}>إجمالي الرسوم (5 د.ل/وثيقة)</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-coins"></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#059669' }}>
            {(statistics?.total_amount || 0).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 700 }}>د.ل</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>المسددة والمستحقة للهيئة</div>
        </div>

        {/* Total Received Docs */}
        <div style={{ background: 'var(--card-bg)', padding: '18px 20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 5px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--muted)' }}>المستلم والمُغذى بالمخزن</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(13, 148, 136, 0.1)', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-boxes-stacked"></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#0d9488' }}>
            {(statistics?.total_received_docs || 0).toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 700 }}>وثيقة</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>تم إدخالها بالمخازن والعهدة</div>
        </div>

        {/* Pending Requests */}
        <div style={{ background: 'var(--card-bg)', padding: '18px 20px', borderRadius: '16px', border: '1px solid var(--border)', boxShadow: '0 2px 5px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--muted)' }}>طلبات قيد المتابعة</span>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-hourglass-half"></i>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: '#d97706' }}>
            {statistics?.pending_count || 0} <span style={{ fontSize: '13px', fontWeight: 700 }}>طلب</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>بانتظار الإرسال أو الاستلام</div>
        </div>
      </div>

      {/* Actions and Filters Bar */}
      <div style={{ background: 'var(--card-bg)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--border)', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-file-signature" style={{ color: '#0284c7' }}></i>
              إدارة طلبات تزويد وثائق التأمين الإجباري والخطابات الرسمية
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--muted)' }}>
              إنشاء ومتابعة طلبات التزويد الموجهة لهيئة الإشراف، احتساب الرسوم آلياً، طباعة الخطابات الرسمية، والربط بالمخازن
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {canEdit && (
              <button
                onClick={() => handleOpenModal()}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 800,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.25)'
                }}
              >
                <i className="fa-solid fa-plus"></i> إنشاء طلب بطاقات جديد
              </button>
            )}

            <button
              onClick={handleExportExcel}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                padding: '9px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 800,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.25)'
              }}
            >
              <i className="fa-solid fa-file-excel"></i> تصدير Excel
            </button>

            <button
              onClick={fetchRequests}
              style={{
                background: 'var(--hover)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                padding: '9px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              title="تحديث البيانات"
            >
              <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>
        </div>

        {/* Search and Filters Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '5px' }}>بحث سريع:</label>
            <input
              type="text"
              placeholder="الرقم الإشاري، رقم الصك..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchRequests()}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg, #fff)',
                color: 'var(--text)',
                fontSize: '12px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '5px' }}>حالة الطلب:</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg, #fff)',
                color: 'var(--text)',
                fontSize: '12px'
              }}
            >
              <option value="all">كل الحالات ({statistics?.total_requests || 0})</option>
              <option value="draft">مسودة</option>
              <option value="pending_approval">بانتظار اعتماد الإدارة</option>
              <option value="pending_payment">بانتظار السداد</option>
              <option value="sent">تم إرسال الطلب</option>
              <option value="received">تم استلام الوثائق</option>
              <option value="canceled">ملغي</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '5px' }}>من تاريخ:</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg, #fff)',
                color: 'var(--text)',
                fontSize: '12px'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--muted)', marginBottom: '5px' }}>إلى تاريخ:</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--input-bg, #fff)',
                color: 'var(--text)',
                fontSize: '12px'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <button
              onClick={fetchRequests}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                border: 'none',
                background: '#091e3a',
                color: '#fff',
                fontWeight: 800,
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              تصفية
            </button>
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setFromDate('');
                setToDate('');
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--hover)',
                color: 'var(--text)',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer'
              }}
              title="تصفير الفلاتر"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: 'rgba(9, 30, 58, 0.04)', borderBottom: '2px solid var(--border)', color: '#091e3a', fontWeight: 900 }}>
                <th style={{ padding: '12px 14px' }}>#</th>
                <th style={{ padding: '12px 14px' }}>الرقم الإشاري</th>
                <th style={{ padding: '12px 14px' }}>تاريخ الطلب</th>
                <th style={{ padding: '12px 14px' }}>العدد المطلوب</th>
                <th style={{ padding: '12px 14px' }}>إجمالي الرسوم (5 د.ل)</th>
                <th style={{ padding: '12px 14px' }}>بيانات السداد</th>
                <th style={{ padding: '12px 14px' }}>الحالة</th>
                <th style={{ padding: '12px 14px' }}>الاستلام والمخزن</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>المرفقات</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading && requests.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                    <i className="fa-solid fa-spinner fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: '10px' }}></i>
                    <div>جاري تحميل طلبات التزويد...</div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                    <i className="fa-solid fa-file-circle-xmark fa-3x" style={{ color: '#cbd5e1', marginBottom: '10px' }}></i>
                    <div style={{ fontWeight: 800, fontSize: '15px' }}>لا توجد طلبات تزويد وثائق مسجلة حالياً</div>
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px' }}>يمكنك إنشاء طلب جديد الآن بالنقر على زر "إنشاء طلب بطاقات جديد"</p>
                  </td>
                </tr>
              ) : (
                requests.map((r, index) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--muted)' }}>{index + 1}</td>
                    
                    {/* Reference Number */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 900, color: '#0369a1', fontSize: '13px' }}>
                        {r.reference_number || '—'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>{r.request_number}</div>
                    </td>

                    {/* Request Date */}
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#334155' }}>
                      {r.request_date ? r.request_date.substring(0, 10) : '—'}
                    </td>

                    {/* Docs Count */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: 900, color: '#4f46e5', background: 'rgba(99, 102, 241, 0.08)', padding: '3px 8px', borderRadius: '6px' }}>
                        {r.documents_count.toLocaleString()} وثيقة
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 900, color: '#059669', fontSize: '13px' }}>
                        {Number(r.total_amount || 0).toLocaleString()} <span style={{ fontSize: '10px' }}>د.ل</span>
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.amount_in_words || ''}>
                        {r.amount_in_words || '—'}
                      </div>
                    </td>

                    {/* Payment Details */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#091e3a' }}>{r.payment_method || 'صك مصرفي'}</div>
                      {r.payment_reference && (
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          رقم: <span style={{ fontWeight: 700 }}>{r.payment_reference}</span>
                        </div>
                      )}
                    </td>

                    {/* Status with Quick Select */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ marginBottom: '4px' }}>{renderStatusBadge(r.status)}</div>
                      {canEdit && (
                        <select
                          value={r.status}
                          onChange={e => handleQuickStatusChange(r, e.target.value)}
                          style={{
                            fontSize: '10.5px',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            background: 'var(--input-bg, #fff)',
                            color: 'var(--text)',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="draft">مسودة</option>
                          <option value="pending_approval">بانتظار الاعتماد</option>
                          <option value="pending_payment">بانتظار السداد</option>
                          <option value="sent">تم إرسال الطلب</option>
                          <option value="received">تم استلام الوثائق</option>
                          <option value="canceled">ملغي</option>
                        </select>
                      )}
                    </td>

                    {/* Received & Store details */}
                    <td style={{ padding: '12px 14px' }}>
                      {r.status === 'received' || r.received_quantity ? (
                        <div>
                          <div style={{ fontWeight: 800, color: '#0d9488', fontSize: '11.5px' }}>
                            <i className="fa-solid fa-circle-check"></i> استُلم {r.received_quantity || r.documents_count} وثيقة
                          </div>
                          {r.serial_from && r.serial_to && (
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                              سيريال: {r.serial_from} &larr; {r.serial_to}
                            </div>
                          )}
                          {r.store_item && (
                            <div style={{ fontSize: '10px', color: '#475569', fontWeight: 700 }}>
                              المخزن: {r.store_item.name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '11.5px' }}>— لم يتم الاستلام بعد</span>
                      )}
                    </td>

                    {/* Receipt Image */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      {r.payment_receipt_image ? (
                        <button
                          onClick={() => setPreviewImage(resolveImageUrl(r.payment_receipt_image))}
                          style={{
                            border: 'none',
                            background: 'rgba(2, 132, 199, 0.1)',
                            color: '#0284c7',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 800
                          }}
                          title="عرض إشعار أو صك السداد"
                        >
                          <i className="fa-solid fa-paperclip"></i> معاينة
                        </button>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: '11px' }}>—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* Official Print Letter Button */}
                        <button
                          onClick={() => printCompulsoryDocumentRequestLetter(r)}
                          style={{
                            background: 'linear-gradient(135deg, #091e3a 0%, #1e3a8a 100%)',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 5px rgba(9, 30, 58, 0.2)'
                          }}
                          title="طباعة الخطاب الرسمي المعتمد لهيئة الإشراف على التأمين"
                        >
                          <i className="fa-solid fa-print"></i> الخطاب الرسمي
                        </button>

                        {/* Receive & Link Store Button */}
                        {canEdit && r.status !== 'received' && (
                          <button
                            onClick={() => handleOpenReceiveModal(r)}
                            style={{
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title="تسجيل استلام الوثائق وتغذية المخزون"
                          >
                            <i className="fa-solid fa-boxes-packing"></i> استلام
                          </button>
                        )}

                        {/* Edit Button */}
                        {canEdit && (
                          <button
                            onClick={() => handleOpenModal(r)}
                            style={{
                              background: 'var(--hover)',
                              color: 'var(--text)',
                              border: '1px solid var(--border)',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                            title="تعديل الطلب"
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>
                        )}

                        {/* Delete Button */}
                        {canEdit && (
                          <button
                            onClick={() => handleDelete(r)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: 'none',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '11px'
                            }}
                            title="حذف الطلب"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
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

      {/* ─── Modal 1: Create / Edit Request ─── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid #cbd5e1' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#091e3a', color: '#fff', borderRadius: '18px 18px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-file-circle-plus" style={{ fontSize: '18px', color: '#fcd34d' }}></i>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>
                  {editingRequest ? 'تعديل طلب تزويد وثائق التأمين الإجباري' : 'إنشاء طلب تزويد وثائق التأمين الإجباري جديد'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '22px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                {/* Documents Count */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                    عدد الوثائق المطلوبة: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={docsCount}
                    onChange={e => setDocsCount(e.target.value === '' ? '' : parseInt(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #0284c7', fontSize: '14px', fontWeight: 800, color: '#091e3a', background: '#f0f9ff' }}
                    placeholder="مثلاً: 200 وثيقة"
                  />
                </div>

                {/* Fee Per Document */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                    رسم الهيئة للوثيقة (د.ل):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={feePerDoc}
                    onChange={e => setFeePerDoc(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700 }}
                  />
                </div>
              </div>

              {/* Total Calculation Banner */}
              <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', padding: '12px 16px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#166534' }}>إجمالي المبلغ المحسوب تلقائياً:</div>
                  <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>
                    {docsCount || 0} وثيقة &times; {feePerDoc} د.ل
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: '#15803d' }}>
                    {calculatedTotal.toLocaleString()} <span style={{ fontSize: '12px' }}>د.ل</span>
                  </div>
                </div>
              </div>

              {/* Amount in words */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                  المبلغ كتابةً (التفقيط المعتمد بالخطاب):
                </label>
                <input
                  type="text"
                  value={amountInWords}
                  onChange={e => setAmountInWords(e.target.value)}
                  placeholder="مثلاً: ألف دينار ليبي فقط لا غير"
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700, color: '#091e3a', background: '#fafafa' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                {/* Reference Number */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                    الرقم الإشاري للخطاب:
                  </label>
                  <input
                    type="text"
                    value={refNumber}
                    onChange={e => setRefNumber(e.target.value)}
                    placeholder="مثلاً: أ / 9 - 2026"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 700 }}
                  />
                </div>

                {/* Request Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                    تاريخ الطلب: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={requestDate}
                    onChange={e => setRequestDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                {/* Payment Method */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>طريقة السداد:</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="صك مصرفي">صك مصرفي</option>
                    <option value="حوالة مصرفية">حوالة مصرفية</option>
                    <option value="إيداع نقدي">إيداع نقدي</option>
                  </select>
                </div>

                {/* Payment Reference */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>رقم الصك / الحوالة / الإحالة:</label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder="مثلاً: رقم الصك 002341"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                {/* Signatory Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>اسم الموقّع بالخطاب:</label>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={e => setSignatoryName(e.target.value)}
                    placeholder="افتراضياً: محمد حوشي"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                {/* Signatory Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>صفة الموقّع بالخطاب:</label>
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={e => setSignatoryTitle(e.target.value)}
                    placeholder="افتراضياً: مدير الشؤون الإدارية"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '14px' }}>
                {/* Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>مرحلة / حالة الطلب:</label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as any)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    <option value="draft">مسودة</option>
                    <option value="pending_approval">بانتظار اعتماد الإدارة</option>
                    <option value="pending_payment">بانتظار السداد</option>
                    <option value="sent">تم إرسال الطلب</option>
                    <option value="received">تم استلام الوثائق</option>
                    <option value="canceled">ملغي</option>
                  </select>
                </div>

                {/* Upload Receipt / Check File */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>إرفاق صورة صك / إيصال السداد:</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={e => setReceiptFile(e.target.files ? e.target.files[0] : null)}
                    style={{ width: '100%', fontSize: '12px' }}
                  />
                  {editingRequest?.payment_receipt_image && (
                    <div style={{ marginTop: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a href={resolveImageUrl(editingRequest.payment_receipt_image)} target="_blank" rel="noreferrer" style={{ color: '#0284c7', fontWeight: 700 }}>
                        عرض المرفق الحالي
                      </a>
                      <label style={{ color: '#ef4444', cursor: 'pointer' }}>
                        <input type="checkbox" checked={deleteReceiptFile} onChange={e => setDeleteReceiptFile(e.target.checked)} /> حذف المرفق
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>ملاحظات إضافية:</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="أي تفاصيل خاصة بتسليم أو متابعة هذا الطلب..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '9px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #091e3a 0%, #0369a1 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'جاري الحفظ...' : (editingRequest ? 'حفظ التعديلات' : 'إنشاء وحفظ الطلب')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 2: Receive Documents & Link Stock ─── */}
      {showReceiveModal && receivingRequest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#fff', borderRadius: '18px', width: '100%', maxWidth: '580px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)', border: '1px solid #cbd5e1' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#10b981', color: '#fff', borderRadius: '18px 18px 0 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <i className="fa-solid fa-boxes-packing" style={{ fontSize: '18px' }}></i>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900 }}>
                  تسجيل استلام الوثائق وتغذية المخزون
                </h3>
              </div>
              <button onClick={() => setShowReceiveModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '18px' }}>✕</button>
            </div>

            <form onSubmit={handleSubmitReceive} style={{ padding: '22px' }}>
              <div style={{ background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px', fontSize: '12px', color: '#334155' }}>
                <div><strong>طلب رقم:</strong> {receivingRequest.reference_number || receivingRequest.request_number}</div>
                <div><strong>الكمية الأصلية المطلوبة:</strong> {receivingRequest.documents_count} وثيقة</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                {/* Received Quantity */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                    الكمية المستلمة فعلياً: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={receivedQty}
                    onChange={e => setReceivedQty(e.target.value === '' ? '' : parseInt(e.target.value))}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1.5px solid #10b981', fontSize: '14px', fontWeight: 800, color: '#065f46' }}
                  />
                </div>

                {/* Received Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                    تاريخ الاستلام: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={receivedDate}
                    onChange={e => setReceivedDate(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                {/* Serial From */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                    رقم السيريال (من):
                  </label>
                  <input
                    type="text"
                    value={serialFrom}
                    onChange={e => setSerialFrom(e.target.value)}
                    placeholder="مثلاً: 001001"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  />
                </div>

                {/* Serial To */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                    رقم السيريال (إلى):
                  </label>
                  <input
                    type="text"
                    value={serialTo}
                    onChange={e => setSerialTo(e.target.value)}
                    placeholder="مثلاً: 001200"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                  />
                </div>
              </div>

              {/* Link Store Item */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                  عنصر المخزون المراد تغذيته تلقائياً:
                </label>
                <select
                  value={selectedStoreItemId}
                  onChange={e => setSelectedStoreItemId(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="">-- اختر عنصر المخزون (اختياري) --</option>
                  {storeItems.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.unit}) {item.category ? `— ${item.category}` : ''}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                  عند اختيار عنصر المخزن، سيتم زيادة رصيد المخزن مباشرة بهذه الكمية المستلمة في قسم المخازن والعهدة.
                </div>
              </div>

              {/* Warehouse Location */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                  موقع المخزن:
                </label>
                <input
                  type="text"
                  value={warehouseLocation}
                  onChange={e => setWarehouseLocation(e.target.value)}
                  placeholder="افتراضياً: المخزن الرئيسي"
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px' }}
                />
              </div>

              {/* Receive Notes */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#334155', marginBottom: '5px' }}>
                  ملاحظات الاستلام:
                </label>
                <textarea
                  rows={2}
                  value={receiveNotes}
                  onChange={e => setReceiveNotes(e.target.value)}
                  placeholder="ملاحظات حول حالة الطرود، اسم مندوب الاستلام، إلخ..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12.5px', resize: 'vertical' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submittingReceive}
                  style={{
                    padding: '9px 24px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: submittingReceive ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submittingReceive ? 'جاري تسجيل الاستلام...' : 'تأكيد الاستلام وتغذية المخزون'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal 3: Image Preview ─── */}
      {previewImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <button
              onClick={() => setPreviewImage(null)}
              style={{ position: 'absolute', top: '-40px', right: 0, background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 900 }}
            >
              ✕
            </button>
            <img src={previewImage} alt="مرفق السداد" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
