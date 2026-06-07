import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from '../Toast';
import { API_BASE_URL } from '../../config/api';
import { generatePremiumExcel } from '../../utils/excelGenerator';

export default function CompensationsList() {
  const [claims, setClaims] = useState<any[]>([]);
  const [allTechnicalClaims, setAllTechnicalClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 15;

  // Modal State for Entering Compensation Details
  const [showModal, setShowModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [compensationValue, setCompensationValue] = useState('');
  const [additionalExpenses, setAdditionalExpenses] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('خصم من وديعة');
  const [docNumber, setDocNumber] = useState('');
  const [currency, setCurrency] = useState('LYD');
  const [subCategory, setSubCategory] = useState('التعويضات');
  const [notes, setNotes] = useState('');
  const [financialImage, setFinancialImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal State for Adding/Importing Claims to Compensations
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSearch, setImportSearch] = useState('');

  const [claimIdToDelete, setClaimIdToDelete] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const navigate = useNavigate();

  const handleDeleteClick = (id: number) => {
    setClaimIdToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!claimIdToDelete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/claims/${claimIdToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        showToast('تم حذف ملف التعويض بنجاح', 'success');
        fetchClaims();
      } else {
        showToast('فشل حذف الملف', 'error');
      }
    } catch (error) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setShowDeleteConfirm(false);
      setClaimIdToDelete(null);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/claims`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error fetching claims');
      const data = await response.json();
      setClaims(data);

      // Filter other claims that are technical/pending to be imported if needed
      const technicalOnly = data.filter((c: any) => c.status === 'pending' || c.status === 'تسويه وديه');
      setAllTechnicalClaims(technicalOnly);
    } catch (error) {
      showToast('حدث خطأ أثناء جلب ملفات التعويضات', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter only claims in the Compensations workflow
  // Statuses: 'التعويضات', 'للتسديد - الشؤون المالية', 'مدفوع'
  const compensationsClaims = useMemo(() => {
    return claims.filter((c: any) => 
      c.status === 'التعويضات' || 
      c.status === 'للتسديد - الشؤون المالية' || 
      c.status === 'مدفوع' ||
      c.finance_status === 'rejected'
    );
  }, [claims]);

  const filteredCompensations = useMemo(() => {
    return compensationsClaims.filter((c: any) => {
      const matchesSearch = 
        c.claim_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.claimant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.document?.insurance_number || c.document_manual_data?.insurance_number || '').toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter !== 'الكل') {
        if (statusFilter === 'التعويضات' && c.status !== 'التعويضات') return false;
        if (statusFilter === 'للتسديد' && c.status !== 'للتسديد - الشؤون المالية') return false;
        if (statusFilter === 'مدفوع' && c.status !== 'مدفوع') return false;
        if (statusFilter === 'مرفوض' && c.finance_status !== 'rejected') return false;
      }

      if (startDateFilter) {
        const claimDate = new Date(c.claim_date);
        const startDate = new Date(startDateFilter);
        if (claimDate < startDate) return false;
      }
      if (endDateFilter) {
        const claimDate = new Date(c.claim_date);
        const endDate = new Date(endDateFilter);
        endDate.setHours(23, 59, 59, 999);
        if (claimDate > endDate) return false;
      }

      return true;
    });
  }, [compensationsClaims, searchQuery, statusFilter, startDateFilter, endDateFilter]);

  const totalPages = Math.ceil(filteredCompensations.length / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const paginatedClaims = filteredCompensations.slice(startIndex, startIndex + perPage);

  const handleOpenCompensationModal = (claim: any) => {
    setSelectedClaim(claim);
    const settlementTransfer = claim.transfers?.find((t: any) => t.transfer_type === 'تسويه وديه');
    const defaultCompensation = claim.compensation_value || settlementTransfer?.details?.total_value || '';
    setCompensationValue(defaultCompensation);
    setAdditionalExpenses(claim.additional_expenses || '');
    setRecipientName(claim.recipient_name || claim.claimant_name || '');
    setPaymentMethod(claim.payment_method || 'خصم من وديعة');
    setDocNumber(claim.document_number || '');
    setCurrency(claim.currency || 'LYD');
    setSubCategory(claim.sub_category || 'التعويضات');
    setNotes(claim.finance_notes || '');
    setFinancialImage(null);
    setShowModal(true);
  };

  const handleCompensationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compensationValue || !recipientName) {
      showToast('يرجى ملء الحقول الإلزامية', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('compensation_value', compensationValue);
      formData.append('additional_expenses', additionalExpenses || '0');
      formData.append('recipient_name', recipientName);
      formData.append('payment_method', paymentMethod);
      formData.append('document_number', docNumber);
      formData.append('currency', currency);
      formData.append('sub_category', subCategory);
      formData.append('notes', notes);
      if (financialImage) {
        formData.append('financial_value_image', financialImage);
      }

      const response = await fetch(`${API_BASE_URL}/claims/${selectedClaim.id}/submit-compensation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        showToast('تم حفظ تفاصيل التعويض وإرسال الملف للمالية بنجاح', 'success');
        setShowModal(false);
        fetchClaims();
      } else {
        const err = await response.json();
        showToast(err.message || 'حدث خطأ أثناء حفظ التعويض', 'error');
      }
    } catch (error) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Transition claim to compensations workflow
  const handleImportClaim = async (claimId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/claims/${claimId}/transfers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          transfer_type: 'التعويضات'
        })
      });

      if (response.ok) {
        showToast('تم فتح ملف تعويض للمطالبة بنجاح', 'success');
        setShowImportModal(false);
        fetchClaims();
      } else {
        showToast('فشل إحالة المطالبة', 'error');
      }
    } catch (error) {
      showToast('حدث خطأ أثناء الاتصال بالخادم', 'error');
    }
  };

  const getStatusLabel = (status: string, finance_status?: string) => {
    if (finance_status === 'rejected') return 'مرفوض من المالية';
    if (status === 'التعويضات') return 'معلق بالتعويضات';
    if (status === 'للتسديد - الشؤون المالية') return 'محول للمالية (جاهز للتسديد)';
    if (status === 'مدفوع') return 'مدفوع';
    return status;
  };

  const getStatusBadgeStyle = (status: string, finance_status?: string) => {
    if (finance_status === 'rejected') return { bg: '#fee2e2', color: '#991b1b' };
    if (status === 'التعويضات') return { bg: '#fef3c7', color: '#d97706' };
    if (status === 'للتسديد - الشؤون المالية') return { bg: '#e0f2fe', color: '#0369a1' };
    if (status === 'مدفوع') return { bg: '#dcfce7', color: '#166534' };
    return { bg: '#f1f5f9', color: '#475569' };
  };

  // Filter list of technical claims to import
  const filteredImportClaims = useMemo(() => {
    return allTechnicalClaims.filter((c: any) => {
      const isAlreadyInComp = compensationsClaims.some((compClaim) => compClaim.id === c.id);
      if (isAlreadyInComp) return false;

      return (
        c.claim_number?.toLowerCase().includes(importSearch.toLowerCase()) ||
        c.claimant_name?.toLowerCase().includes(importSearch.toLowerCase())
      );
    });
  }, [allTechnicalClaims, importSearch, compensationsClaims]);

  const handlePrintCompensationsReport = () => {
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) return;

    const dateText = startDateFilter || endDateFilter
      ? `الفترة من: ${startDateFilter || 'البداية'} إلى: ${endDateFilter || 'النهاية'}`
      : 'كل التواريخ';

    const statusText = statusFilter !== 'الكل' ? `حسب الحالة: ${statusFilter}` : 'كل الحالات';

    const qrData = `تقرير تعويضات الحوادث - شركة المدار الليبي\nالتاريخ: ${new Date().toLocaleString('ar-LY')}\nعدد المطالبات: ${filteredCompensations.length}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}`;

    let totalComp = 0;
    let totalAdd = 0;
    let totalTot = 0;

    filteredCompensations.forEach((c) => {
      const settlement = c.transfers?.find((t: any) => t.transfer_type === 'تسويه وديه');
      const compVal = Number(c.compensation_value) || Number(settlement?.details?.total_value) || 0;
      const addExp = Number(c.additional_expenses) || 0;
      const totPaid = Number(c.total_paid) || (compVal + addExp);
      
      totalComp += compVal;
      totalAdd += addExp;
      totalTot += totPaid;
    });

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>تقرير تعويضات الحوادث</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          @media print { 
            @page { margin: 5mm; size: A4 landscape; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; padding: 10px; }
          }
          body { 
            font-family: 'Cairo', sans-serif; 
            margin: 0 auto; 
            padding: 15px; 
            color: #000;
            background: #fff;
            line-height: 1.4;
            font-size: 10px;
            direction: rtl;
          }
          .report-header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            border-bottom: 1.5px solid #000;
            padding-bottom: 10px;
          }
          .header-right {
            width: 150px;
            text-align: right;
          }
          .header-right .logo {
            height: 60px;
            width: auto;
          }
          .header-center {
            text-align: center;
            flex: 1;
          }
          .header-center h2 {
            margin: 0;
            font-size: 16px;
            font-weight: 900;
          }
          .header-center h3 {
            margin: 5px 0 0 0;
            font-size: 13px;
            font-weight: 700;
            color: #4b5563;
          }
          .header-left {
            width: 150px;
            text-align: left;
          }
          .header-left .qr-code {
            height: 60px;
            width: 60px;
          }
          .meta-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-weight: 700;
            font-size: 10px;
            border: 1px solid #000;
            padding: 6px 12px;
            background: #f8fafc;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
          }
          th, td {
            border: 1.5px solid #000;
            padding: 6px;
            text-align: center;
            vertical-align: middle;
            font-weight: 700;
          }
          th {
            font-weight: 900;
            font-size: 10px;
          }
          .category-claim { background-color: #fef08a !important; color: #000; }
          .category-accident { background-color: #bbf7d0 !important; color: #000; }
          .category-payment { background-color: #bae6fd !important; color: #000; }
          .category-financial { background-color: #fecaca !important; color: #000; }
          .category-gray { background-color: #f1f5f9 !important; color: #000; }
          
          .totals-row td {
            font-weight: 900;
            background-color: #f8fafc !important;
            border-top: 2.5px solid #000;
          }
          
          .footer-sigs {
            margin-top: 35px;
            display: flex;
            justify-content: space-between;
            padding: 0 50px;
          }
          .sig-box {
            text-align: center;
            font-size: 11px;
            line-height: 1.6;
          }
          .sig-title {
            font-weight: 700;
          }
          .sig-name {
            font-weight: 900;
            margin-top: 20px;
            font-size: 12px;
          }
          .print-meta {
            margin-top: 20px;
            font-size: 8px;
            color: #6b7280;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            padding-top: 5px;
          }
        </style>
      </head>
      <body onload="setTimeout(() => { window.print(); }, 500);">
        <div class="report-header-container">
          <div class="header-right">
            <img src="/img/logo.png" class="logo" onerror="this.style.display='none'" />
          </div>
          <div class="header-center">
            <h2>شركة المدار الليبي للتأمين</h2>
            <h3>تقرير تعويضات الحوادث</h3>
          </div>
          <div class="header-left">
            <img src="${qrApiUrl}" class="qr-code" />
          </div>
        </div>

        <div class="meta-info">
          <div>تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}</div>
          <div>${dateText}</div>
          <div>${statusText}</div>
          <div>إجمالي الملفات: ${filteredCompensations.length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width: 40px; background: #f1f5f9; border: 1.5px solid #000;">م</th>
              <th colspan="3" class="category-claim">بيانات المطالبة</th>
              <th colspan="3" class="category-accident">بيانات الحادث</th>
              <th colspan="4" class="category-payment">بيانات الـتعويض</th>
              <th colspan="3" class="category-financial">البيانات المالية</th>
              <th rowspan="2" class="category-gray" style="border: 1.5px solid #000;">الحالة</th>
            </tr>
            <tr>
              <th class="category-claim">تاريخ المطالبة</th>
              <th class="category-claim">مقدم المطالبة</th>
              <th class="category-claim">رقم المطالبة</th>
              
              <th class="category-accident">تاريخ الحادث</th>
              <th class="category-accident">رقم الوثيقة</th>
              <th class="category-accident">المؤمن له</th>
              
              <th class="category-payment">اسم مستلم التعويض</th>
              <th class="category-payment">طريقة السداد</th>
              <th class="category-payment">رقم المستند المالي</th>
              <th class="category-payment">الفئة البند الفرعي</th>
              
              <th class="category-financial">قيمة التعويض</th>
              <th class="category-financial">مصاريف اضافية</th>
              <th class="category-financial">اجمالي القيمة المسددة</th>
            </tr>
          </thead>
          <tbody>
            ${filteredCompensations.map((c, idx) => {
              const claimant = c.claimant_name || '—';
              const insuranceNumber = c.document?.insurance_number || c.document_manual_data?.insurance_number || '—';
              const insuredName = c.document?.insured_name || c.document_manual_data?.insured_name || '—';
              const claimDate = c.claim_date ? new Date(c.claim_date).toLocaleDateString('ar-EG') : '—';
              const accidentDate = c.accident_date ? new Date(c.accident_date).toLocaleDateString('ar-EG') : '—';
              
              const recipient = c.recipient_name || c.claimant_name || '—';
              const payMethod = c.payment_method || '—';
              const docNum = c.document_number || '—';
              const subCat = c.sub_category || 'التعويضات';
              
              const settlement = c.transfers?.find((t: any) => t.transfer_type === 'تسويه وديه');
              const rawComp = c.compensation_value || settlement?.details?.total_value;
              const rawAdd = c.additional_expenses;
              const rawTot = c.total_paid || (rawComp ? (Number(rawComp) + (Number(rawAdd) || 0)) : null);

              const compVal = rawComp ? `${Number(rawComp).toLocaleString('ar-EG')} ${c.currency === 'USD' ? '$' : 'د.ل'}` : '—';
              const addExp = rawAdd ? `${Number(rawAdd).toLocaleString('ar-EG')} ${c.currency === 'USD' ? '$' : 'د.ل'}` : '—';
              const totalVal = rawTot ? `${Number(rawTot).toLocaleString('ar-EG')} ${c.currency === 'USD' ? '$' : 'د.ل'}` : '—';
              
              const statusDisplay = getStatusLabel(c.status, c.finance_status);

              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${claimDate}</td>
                  <td>${claimant}</td>
                  <td><strong>${c.claim_number}</strong></td>
                  <td>${accidentDate}</td>
                  <td>${insuranceNumber}</td>
                  <td>${insuredName}</td>
                  
                  <td>${recipient}</td>
                  <td>${payMethod}</td>
                  <td>${docNum}</td>
                  <td>${subCat}</td>
                  
                  <td style="color: #1e3a8a; font-weight: bold;">${compVal}</td>
                  <td style="color: #4b5563;">${addExp}</td>
                  <td style="color: #166534; font-weight: bold;">${totalVal}</td>
                  
                  <td>${statusDisplay}</td>
                </tr>
              `;
            }).join('')}
            
            <tr class="totals-row">
              <td colspan="11" style="text-align: center; font-weight: 900;">المجمـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــوع العـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــام</td>
              <td style="color: #1e3a8a; font-weight: bold;">${totalComp.toLocaleString('ar-EG')} د.ل</td>
              <td style="color: #4b5563;">${totalAdd.toLocaleString('ar-EG')} د.ل</td>
              <td style="color: #166534; font-weight: bold;">${totalTot.toLocaleString('ar-EG')} د.ل</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>

        <div class="footer-sigs">
          <div class="sig-box">
            <div class="sig-title">المدار الليبي للتأمين المساهمة</div>
            <div class="sig-title">مدير إدارة المطالبات والتعويضات</div>
            <div class="sig-name">أشرف محمد الشافعي</div>
          </div>
          <div class="sig-box">
            <div class="sig-title">المدار الليبي للتأمين المساهمة</div>
            <div class="sig-title">مدير الشؤون المالية</div>
            <div class="sig-name">خالد محمود حمدان</div>
          </div>
        </div>

        <div class="print-meta">
          تم استخراج هذا التقرير آلياً من نظام المدار الليبي للتأمين - ${new Date().toLocaleString('ar-LY')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportToExcel = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const columns = [
        { header: 'رقم المطالبة', key: 'claim_number', width: 20 },
        { header: 'تاريخ المطالبة', key: 'claim_date', width: 15 },
        { header: 'مقدم المطالبة', key: 'claimant_name', width: 30 },
        { header: 'رقم الوثيقة', key: 'insurance_number', width: 20 },
        { header: 'المؤمن له', key: 'insured_name', width: 30 },
        { header: 'تاريخ الحادث', key: 'accident_date', width: 15 },
        { header: 'المستلم', key: 'recipient_name', width: 30 },
        { header: 'طريقة السداد', key: 'payment_method', width: 20 },
        { header: 'رقم المستند', key: 'document_number', width: 15 },
        { header: 'قيمة التعويض', key: 'compensation_value', width: 15 },
        { header: 'مصاريف إضافية', key: 'additional_expenses', width: 15 },
        { header: 'إجمالي المسدد', key: 'total_paid', width: 15 },
        { header: 'الحالة', key: 'status', width: 25 },
      ];

      const data = filteredCompensations.map((c) => {
        const settlement = c.transfers?.find((t: any) => t.transfer_type === 'تسويه وديه');
        const rawComp = c.compensation_value || settlement?.details?.total_value;
        const rawAdd = c.additional_expenses;
        const rawTot = c.total_paid || (rawComp ? (Number(rawComp) + (Number(rawAdd) || 0)) : null);

        return {
          claim_number: c.claim_number,
          claim_date: c.claim_date,
          claimant_name: c.claimant_name,
          insurance_number: c.document?.insurance_number || c.document_manual_data?.insurance_number || '—',
          insured_name: c.document?.insured_name || c.document_manual_data?.insured_name || '—',
          accident_date: c.accident_date,
          recipient_name: c.recipient_name || c.claimant_name || '—',
          payment_method: c.payment_method || '—',
          document_number: c.document_number || '—',
          compensation_value: rawComp ? `${Number(rawComp).toLocaleString()} د.ل` : '—',
          additional_expenses: rawAdd ? `${Number(rawAdd).toLocaleString()} د.ل` : '—',
          total_paid: rawTot ? `${Number(rawTot).toLocaleString()} د.ل` : '—',
          status: getStatusLabel(c.status, c.finance_status),
        };
      });

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - سجل تعويضات الحوادث',
        subtitle: `تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'سجل_تعويضات_الحوادث',
        qrData: `تقرير التعويضات - شركة المدار الليبي\nعدد المعاملات: ${filteredCompensations.length}\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير التقرير بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير ملف Excel', 'error');
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb no-print" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '12px', marginBottom: '20px', color: '#fff'
      }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
          <i className="fa-solid fa-scale-unbalanced" style={{ marginLeft: '10px', color: '#f59e0b' }}></i>
          إدارة وتسوية تعويضات الحوادث (الشؤون الفنية)
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handlePrintCompensationsReport} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            <i className="fa-solid fa-print"></i> طباعة التقرير الملون
          </button>
          <button onClick={handleExportToExcel} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            <i className="fa-solid fa-file-excel"></i> تصدير Excel
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#ea580c', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
            <i className="fa-solid fa-plus"></i> إدراج مطالبة جديدة للتعويض
          </button>
        </div>
      </div>

      {/* Filter panel */}
      <div className="no-print" style={{ background: 'var(--panel)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>بحث (رقم المطالبة / الاسم / الوثيقة)</label>
            <input type="text" placeholder="ابحث..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>حالة التعويض</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
              <option value="الكل">كل الحالات</option>
              <option value="التعويضات">معلق بالتعويضات</option>
              <option value="للتسديد">محول للمالية</option>
              <option value="مدفوع">مدفوع</option>
              <option value="مرفوض">مرفوض ماليًا</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>من تاريخ المطالبة</label>
            <input type="date" value={startDateFilter} onChange={(e) => setStartDateFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>إلى تاريخ</label>
            <input type="date" value={endDateFilter} onChange={(e) => setEndDateFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="users-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--border)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</div>
        ) : (
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th colSpan={3} style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#b45309', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>بيانات المطالبة</th>
                  <th colSpan={3} style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#047857', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>بيانات الحادث</th>
                  <th colSpan={4} style={{ background: 'rgba(14, 165, 233, 0.12)', color: '#0369a1', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>تفاصيل التسوية</th>
                  <th colSpan={3} style={{ background: 'rgba(244, 63, 94, 0.12)', color: '#be123c', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>المالية</th>
                  <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', background: 'var(--panel)', borderLeft: '1px solid var(--border)', borderBottom: '2px solid var(--border)' }}>الحالة</th>
                  <th rowSpan={2} style={{ verticalAlign: 'middle', textAlign: 'center', fontWeight: 'bold', fontSize: '13px', background: 'var(--panel)', borderBottom: '2px solid var(--border)' }}>الإجراءات</th>
                </tr>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ background: 'rgba(245, 158, 11, 0.05)', color: '#b45309', fontSize: '12px', borderLeft: '1px solid var(--border)' }}>رقم المطالبة</th>
                  <th style={{ background: 'rgba(245, 158, 11, 0.05)', color: '#b45309', fontSize: '12px', borderLeft: '1px solid var(--border)' }}>مقدم المطالبة</th>
                  <th style={{ background: 'rgba(245, 158, 11, 0.05)', color: '#b45309', fontSize: '12px', borderLeft: '1px solid var(--border)' }}>التاريخ</th>
                  <th style={{ background: 'rgba(16, 185, 129, 0.05)', color: '#047857', fontSize: '12px', borderLeft: '1px solid var(--border)' }}>تاريخ الحادث</th>
                  <th style={{ background: 'rgba(16, 185, 129, 0.05)', color: '#047857', fontSize: '12px', borderLeft: '1px solid var(--border)' }}>رقم الوثيقة</th>
                  <th style={{ background: 'rgba(16, 185, 129, 0.05)', color: '#047857', fontSize: '12px', borderLeft: '1px solid var(--border)' }}>المؤمن له</th>
                  <th style={{ background: 'rgba(14, 165, 233, 0.05)', color: '#0369a1', fontSize: '12px', borderLeft: '1px solid var(--border)' }}>المستلم</th>
                  <th style={{ background: 'rgba(14, 165, 233, 0.05)', color: '#0369a1', fontSize: '12px', borderLeft: '1px solid var(--border)' }}>طريقة السداد</th>
                  <th style={{ background: 'rgba(14, 165, 233, 0.05)', color: '#0369a1', fontSize: '12px', borderLeft: '1px solid var(--border)' }}>رقم المستند</th>
                  <th style={{ background: 'rgba(14, 165, 233, 0.05)', color: '#0369a1', fontSize: '12px', borderLeft: '1px solid var(--border)' }}>البند</th>
                  <th style={{ background: 'rgba(244, 63, 94, 0.05)', color: '#be123c', fontSize: '12px', borderLeft: '1px solid var(--border)' }}>التعويض</th>
                  <th style={{ background: 'rgba(244, 63, 94, 0.05)', color: '#be123c', fontSize: '12px', borderLeft: '1px solid var(--border)' }}>المصاريف</th>
                  <th style={{ background: 'rgba(244, 63, 94, 0.05)', color: '#be123c', fontSize: '12px', borderLeft: '1px solid var(--border)' }}>الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClaims.length === 0 ? (
                  <tr>
                    <td colSpan={15} style={{ textAlign: 'center', padding: '30px' }}>لا توجد تعويضات مسجلة تطابق التصفية.</td>
                  </tr>
                ) : (
                  paginatedClaims.map((c) => {
                    const statusStyle = getStatusBadgeStyle(c.status, c.finance_status);
                    return (
                      <tr key={c.id}>
                        <td><strong>{c.claim_number}</strong></td>
                        <td>{c.claimant_name}</td>
                        <td>{c.claim_date}</td>
                        <td>{c.accident_date}</td>
                        <td>{c.document?.insurance_number || c.document_manual_data?.insurance_number || '—'}</td>
                        <td>{c.document?.insured_name || c.document_manual_data?.insured_name || '—'}</td>
                        <td>{c.recipient_name || c.claimant_name || '—'}</td>
                        <td>{c.payment_method || '—'}</td>
                        <td>{c.document_number || '—'}</td>
                        <td>{c.sub_category || 'التعويضات'}</td>
                        <td style={{ fontWeight: 800 }}>
                          {c.compensation_value 
                            ? `${parseFloat(c.compensation_value).toLocaleString()} ${c.currency === 'USD' ? '$' : 'د.ل'}` 
                            : (() => {
                                const settlement = c.transfers?.find((t: any) => t.transfer_type === 'تسويه وديه');
                                const sVal = settlement?.details?.total_value;
                                return sVal ? (
                                  <span style={{ color: '#0284c7', fontStyle: 'italic' }} title="قيمة مقترحة من التسوية الودية">
                                    {parseFloat(sVal).toLocaleString()} د.ل *
                                  </span>
                                ) : '—';
                              })()
                          }
                        </td>
                        <td>{c.additional_expenses ? `${parseFloat(c.additional_expenses).toLocaleString()} د.ل` : '—'}</td>
                        <td style={{ fontWeight: 850, color: '#166534' }}>
                          {c.total_paid 
                            ? `${parseFloat(c.total_paid).toLocaleString()} ${c.currency === 'USD' ? '$' : 'د.ل'}` 
                            : (() => {
                                const settlement = c.transfers?.find((t: any) => t.transfer_type === 'تسويه وديه');
                                const sVal = settlement?.details?.total_value;
                                return sVal ? (
                                  <span style={{ color: '#166534', fontStyle: 'italic' }} title="قيمة مقترحة من التسوية الودية">
                                    {parseFloat(sVal).toLocaleString()} د.ل *
                                  </span>
                                ) : '—';
                              })()
                          }
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'center' }}>
                            <span style={{
                              padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '800',
                              background: statusStyle.bg, color: statusStyle.color
                            }}>
                              {getStatusLabel(c.status, c.finance_status)}
                            </span>
                            {c.finance_status === 'rejected' && c.finance_notes && (
                              <span style={{ fontSize: '10px', color: '#ef4444', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.finance_notes}>
                                السبب: {c.finance_notes}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button onClick={() => navigate(`/claims/${c.id}`)} style={{ background: '#f1f5f9', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }} title="عرض التفاصيل">
                              <i className="fa-solid fa-eye" style={{ color: '#014cb1' }}></i>
                            </button>
                            {(c.status === 'التعويضات' || c.finance_status === 'rejected') && (
                              <button onClick={() => handleOpenCompensationModal(c)} style={{ background: '#fef3c7', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }} title="إدخال/تعديل التسوية المالية">
                                <i className="fa-solid fa-calculator" style={{ color: '#d97706' }}></i>
                              </button>
                            )}
                            <button onClick={() => handleDeleteClick(c.id)} style={{ background: '#fee2e2', border: 'none', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer' }} title="حذف">
                              <i className="fa-solid fa-trash-can" style={{ color: '#ef4444' }}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '20px', background: 'var(--panel)', borderTop: '1px solid var(--border)' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setCurrentPage(p)} disabled={p === currentPage} style={{
                width: '35px', height: '35px', borderRadius: '8px', border: '1px solid var(--border)',
                background: p === currentPage ? '#014cb1' : 'var(--bg)', color: p === currentPage ? '#fff' : 'var(--text)',
                fontWeight: 'bold', cursor: 'pointer'
              }}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Enter Compensation Details */}
      {showModal && selectedClaim && (
        <div className="modal no-print" onClick={(e) => e.target === e.currentTarget && setShowModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100 }}>
          <div className="modal-content" style={{ width: '600px', maxWidth: '95%', background: 'var(--card-bg)', borderRadius: '14px', padding: '24px', overflowY: 'auto', maxHeight: '90vh' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '15px', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--text)' }}>
                <i className="fa-solid fa-calculator text-warning" style={{ marginLeft: '8px' }}></i>
                تسجيل التسوية والتعويض المالي للمطالبة #{selectedClaim.claim_number}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>

            <form onSubmit={handleCompensationSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>اسم مستلم التعويض <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="text" required value={recipientName} onChange={(e) => setRecipientName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>طريقة السداد</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}>
                    <option value="خصم من وديعة">خصم من وديعة</option>
                    <option value="شيك (صك)">شيك (صك)</option>
                    <option value="كاش">كاش</option>
                    <option value="حوالة مصرفية">حوالة مصرفية</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>رقم المستند المالي (صك / حوالة)</label>
                  <input type="text" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="رقم الشيك أو الحوالة..." style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>البند / الفئة الفرعية</label>
                  <input type="text" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>قيمة التعويض المتفق عليها <span style={{ color: '#ef4444' }}>*</span></label>
                  <input type="number" required step="any" value={compensationValue} onChange={(e) => setCompensationValue(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>مصاريف إضافية (تحويلات/لجنة/ضرائب)</label>
                  <input type="number" step="any" value={additionalExpenses} onChange={(e) => setAdditionalExpenses(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>نوع العملة</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setCurrency('LYD')} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: currency === 'LYD' ? '#014cb1' : 'var(--bg)', color: currency === 'LYD' ? '#fff' : 'var(--text)', fontWeight: 'bold', cursor: 'pointer' }}>دينار ليبي (LYD)</button>
                    <button type="button" onClick={() => setCurrency('USD')} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid var(--border)', background: currency === 'USD' ? '#014cb1' : 'var(--bg)', color: currency === 'USD' ? '#fff' : 'var(--text)', fontWeight: 'bold', cursor: 'pointer' }}>دولار ($)</button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>إجمالي القيمة المسددة (تلقائي)</label>
                  <input type="text" readOnly value={`${(Number(compensationValue) || 0) + (Number(additionalExpenses) || 0)} ${currency}`} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel)', color: '#166534', fontWeight: 'bold' }} />
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>إرفاق إثبات التسوية / قرار التحويل (صورة)</label>
                <input type="file" accept="image/*,application/pdf" onChange={(e) => setFinancialImage(e.target.files?.[0] || null)} style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'var(--bg)', color: 'var(--text)' }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>ملاحظات إضافية</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', resize: 'none' }}></textarea>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '15px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}>إلغاء</button>
                <button type="submit" disabled={submitting} style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#014cb1', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                  {submitting ? 'جاري الإرسال...' : 'حفظ وإرسال للمالية 📤'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Import Claims for Compensation */}
      {showImportModal && (
        <div className="modal no-print" onClick={(e) => e.target === e.currentTarget && setShowImportModal(false)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100 }}>
          <div className="modal-content" style={{ width: '500px', maxWidth: '95%', background: 'var(--card-bg)', borderRadius: '14px', padding: '24px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '15px', marginBottom: '15px' }}>
              <h3 style={{ margin: 0 }}>إحالة مطالبة إلى قسم التعويضات</h3>
              <button onClick={() => setShowImportModal(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            
            <input type="text" placeholder="ابحث باسم مقدم المطالبة أو الرقم..." value={importSearch} onChange={(e) => setImportSearch(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '15px', background: 'var(--bg)', color: 'var(--text)' }} />

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredImportClaims.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>لا توجد مطالبات جاهزة للإحالة</div>
              ) : (
                filteredImportClaims.map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>مطالبة #{c.claim_number}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>مقدم الطلب: {c.claimant_name} | تاريخ: {c.claim_date}</div>
                    </div>
                    <button onClick={() => handleImportClaim(c.id)} style={{ padding: '6px 12px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                      إحالة للتعويض ➡️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="transfer-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div className="transfer-modal" style={{
            background: 'var(--panel)', width: '100%', maxWidth: '450px',
            borderRadius: '20px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
            overflow: 'hidden', border: '1px solid var(--border)'
          }}>
            <div className="modal-header" style={{
              padding: '20px 24px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ color: '#ef4444', margin: 0, fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ marginLeft: '8px' }}></i> تأكيد الحذف
              </h3>
              <button onClick={() => setShowDeleteConfirm(false)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <div className="form-body" style={{ textAlign: 'center', padding: '30px' }}>
              <i className="fa-solid fa-trash-can" style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '20px', display: 'block' }}></i>
              <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text)', marginBottom: '10px' }}>هل أنت متأكد من حذف هذا الملف؟</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>سيتم حذف الملف نهائياً ولا يمكن التراجع عن الإجراء.</p>
            </div>
            <div className="modal-footer" style={{
              padding: '20px 24px', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'center', gap: '15px', paddingBottom: '30px'
            }}>
              <button type="button" className="btn-cancel" onClick={() => setShowDeleteConfirm(false)} style={{
                background: 'var(--panel)', border: '1.5px solid var(--border)',
                color: 'var(--text)', padding: '10px 24px', borderRadius: '10px',
                fontWeight: 600, cursor: 'pointer'
              }}>إلغاء</button>
              <button type="button" className="btn-confirm" onClick={confirmDelete} style={{
                background: '#ef4444', color: '#fff', border: 'none',
                padding: '10px 30px', borderRadius: '10px', fontWeight: 700,
                cursor: 'pointer'
              }}>تأكيد الحذف نهائياً</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
