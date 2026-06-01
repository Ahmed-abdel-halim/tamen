import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { showToast } from '../Toast';
import { API_BASE_URL } from '../../config/api';
import CreateClaimModal from './CreateClaim';
// @ts-ignore
import { saveAs } from 'file-saver';
import { generatePremiumExcel } from '../../utils/excelGenerator';


export default function ClaimsList() {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [statusFilter, setStatusFilter] = useState('');
  const [damageTypeFilter, setDamageTypeFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [editingClaim, setEditingClaim] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [claimIdToDelete, setClaimIdToDelete] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, damageTypeFilter, startDateFilter, endDateFilter, searchQuery, sortBy]);

  useEffect(() => {
    fetchClaims();
  }, [statusFilter, damageTypeFilter]);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const params = new URLSearchParams({
        user_id: user.id || '',
        status: statusFilter,
        damage_type: damageTypeFilter
      });
      const response = await fetch(`${API_BASE_URL}/claims?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Error fetching claims');
      const data = await response.json();
      setClaims(data);
    } catch (error) {
      showToast('حدث خطأ أثناء جلب المطالبات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setClaimIdToDelete(id);
    setShowDeleteConfirm(true);
  };

  const handleEditClick = async (claim: any) => {
    try {
      // Fetch full claim details to ensure all fields are available (e.g., personal_id)
      const response = await fetch(`${API_BASE_URL}/claims/${claim.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const fullClaim = await response.json();
        setEditingClaim(fullClaim);
      } else {
        setEditingClaim(claim);
      }
    } catch {
      setEditingClaim(claim);
    }
    setShowAddModal(true);
  };

  const confirmDelete = async () => {
    if (!claimIdToDelete) return;
    try {
      const response = await fetch(`${API_BASE_URL}/claims/${claimIdToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        showToast('تم حذف المطالبة بنجاح', 'success');
        fetchClaims();
      }
    } catch (error) {
      showToast('خطأ في حذف المطالبة', 'error');
    } finally {
      setShowDeleteConfirm(false);
      setClaimIdToDelete(null);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setDamageTypeFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setSortBy('date_desc');
  };

  const exportToExcel = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const columns = [
        { header: 'رقم المطالبة', key: 'reference_number', width: 25 },
        { header: 'رقم الوثيقة', key: 'insurance_number', width: 25 },
        { header: 'تاريخ الحادث', key: 'accident_date', width: 20 },
        { header: 'تاريخ طلب التعويض', key: 'claim_date', width: 20 },
        { header: 'القيمة المقدرة للتعويض', key: 'estimated_amount', width: 25 },
        { header: 'نوع الأضرار', key: 'damage_type', width: 15 },
        { header: 'مكان الحادث', key: 'accident_location', width: 25 },
        { header: 'مبلغ التعويض النهائي', key: 'final_amount', width: 25 },
        { header: 'وين واصلة المطالبة', key: 'status', width: 25 },
        { header: 'تاريخ التسجيل', key: 'created_at', width: 20 },
      ];

      const toArabicNumerals = (str: string | number) => {
        const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return String(str).replace(/[0-9]/g, w => arabicNumbers[parseInt(w)]);
      };

      const data = filteredClaims.map(claim => {
        // Extract Estimated Amount (from assessor or settlement transfer)
        let estimatedAmount = claim.assessor_amount_dinar ? Number(claim.assessor_amount_dinar) : 0;
        const settlementTransfer = claim.transfers?.find((t: any) => t.transfer_type === 'تسويه وديه');
        if (settlementTransfer && settlementTransfer.details?.total_value) {
          estimatedAmount = Number(settlementTransfer.details.total_value);
        }

        let estimatedText = estimatedAmount ? `${toArabicNumerals(estimatedAmount.toLocaleString('en-US'))} د.ل` : '—';
        if (claim.assessor_other_amount) {
          estimatedText += ` (${claim.assessor_other_amount})`;
        }

        // Extract Final Amount (from payment transfer)
        let finalAmount = 0;
        const paymentTransfer = claim.transfers?.find((t: any) => t.transfer_type === 'للتسديد - الشؤون المالية');
        if (paymentTransfer && paymentTransfer.details?.financial_value) {
          finalAmount = Number(paymentTransfer.details.financial_value);
        }

        return {
          reference_number: toArabicNumerals(claim.claim_number || claim.reference_number),
          insurance_number: toArabicNumerals(claim.document?.insurance_number || '—'),
          accident_date: claim.accident_date ? toArabicNumerals(new Date(String(claim.accident_date).replace(' ', 'T')).toLocaleDateString('en-GB')) : '—',
          claim_date: claim.claim_date ? toArabicNumerals(new Date(String(claim.claim_date).replace(' ', 'T')).toLocaleDateString('en-GB')) : '—',
          estimated_amount: estimatedText,
          damage_type: claim.damage_type ? claim.damage_type.split(/[،,]\s*/).map((t: string) => t === 'اخر' ? (claim.other_damage_type || 'أخرى') : t).join('، ') : '—',
          accident_location: claim.accident_location || '—',
          final_amount: finalAmount ? `${toArabicNumerals(finalAmount.toLocaleString('en-US'))} د.ل` : '—',
          status: getStatusLabel(claim.status),
          created_at: toArabicNumerals(new Date(claim.created_at).toLocaleDateString('en-GB')),
        };
      });

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - إدارة المطالبات',
        subtitle: `تقرير المطالبات المسجلة - تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}`,
        columns,
        data,
        fileName: 'تقرير_المطالبات',
        qrData: `تقرير المطالبات - شركة المدار الليبي\nالتاريخ: ${new Date().toLocaleString('ar-LY')}\nبواسطة: ${currentUser.name || 'النظام'}`
      });

      showToast('تم تصدير التقرير بنجاح', 'success');
    } catch (error) {
      showToast('حدث خطأ أثناء تصدير التقرير', 'error');
    }
  };



  const getStatusLabel = (status: string) => {
    const statuses: any = {
      pending: 'قيد الانتظار',
      'تسويه وديه': 'تسوية ودية',
      'تحويل الى مركز الشرطة': 'مركز الشرطة',
      'تحويل الى النيابة': 'النيابة',
      'تحويل الى المحكمة': 'المحكمة',
      'استئناف في حكم المحكمة': 'استئناف',
      'للتسديد - الشؤون المالية': 'للتسديد'
    };
    return statuses[status] || status;
  };

  const filteredClaims = claims.filter(c => {
    const matchesSearch = 
      c.claim_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.claimant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.document?.insurance_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.status?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

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
  }).sort((a, b) => {
    if (sortBy === 'claim_number_asc') {
      return (a.claim_number || '').localeCompare(b.claim_number || '', 'ar', { numeric: true });
    }
    if (sortBy === 'claim_number_desc') {
      return (b.claim_number || '').localeCompare(a.claim_number || '', 'ar', { numeric: true });
    }
    if (sortBy === 'date_asc') {
      return new Date(a.claim_date).getTime() - new Date(b.claim_date).getTime();
    }
    if (sortBy === 'date_desc') {
      return new Date(b.claim_date).getTime() - new Date(a.claim_date).getTime();
    }
    if (sortBy === 'status') {
      return (a.status || '').localeCompare(b.status || '', 'ar');
    }
    return 0;
  });

  const totalClaims = filteredClaims.length;
  const totalPages = Math.ceil(totalClaims / perPage);
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedClaims = filteredClaims.slice(startIndex, endIndex);

  const handlePrintDetailedReport = () => {
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) return;

    const dateText = startDateFilter || endDateFilter
      ? `الفترة من: ${startDateFilter || 'البداية'} إلى: ${endDateFilter || 'النهاية'}`
      : 'كل التواريخ';

    const statusText = statusFilter ? `حسب الحالة: ${getStatusLabel(statusFilter)}` : 'كل الحالات';

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>تقرير المطالبات التفصيلي</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          @media print { 
            @page { margin: 10mm; size: A4 landscape; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { 
            font-family: 'Cairo', sans-serif; 
            margin: 0; 
            padding: 20px; 
            color: #1e293b;
            background: #fff;
            line-height: 1.5;
            font-size: 11px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #1e293b;
          }
          .header-center {
            text-align: center;
            flex: 1;
          }
          .header-center h1 { margin: 0; font-size: 20px; color: #1e293b; font-weight: 900; }
          .header-center p { margin: 5px 0 0 0; color: #64748b; font-size: 13px; font-weight: 700; }
          
          .logo-container { width: 120px; text-align: right; }
          .logo { height: 60px; width: auto; }
          
          .meta-info {
            display: flex;
            justify-content: space-between;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-weight: 700;
          }

          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; }
          th { background: #f1f5f9; font-weight: 800; color: #0f172a; }
          tr:nth-child(even) { background: #f8fafc; }

          .footer-sigs {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            padding: 0 40px;
          }
          .sig-box { width: 180px; text-align: center; }
          .sig-line { border-top: 1.5px solid #1e293b; margin-bottom: 8px; }
          .sig-text { font-weight: 800; font-size: 13px; }

          .print-meta {
            margin-top: 30px;
            font-size: 9px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
          }
        </style>
      </head>
      <body onload="setTimeout(() => { window.print(); }, 500);">
        <div class="header">
          <div style="width: 120px;"></div>
          <div class="header-center">
            <h1>شركة المدار الليبي للتأمين</h1>
            <p>إدارة المطالبات والحوادث - تقرير تفصيلي</p>
          </div>
          <div class="logo-container">
            <img src="/img/logo.png" class="logo" alt="Logo" onerror="this.style.display='none'">
          </div>
        </div>

        <div class="meta-info">
          <div>تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-LY')}</div>
          <div>${dateText}</div>
          <div>${statusText}</div>
          <div>إجمالي المطالبات: ${filteredClaims.length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px;">#</th>
              <th>رقم المطالبة</th>
              <th>رقم الوثيقة</th>
              <th>تاريخ الحادث</th>
              <th>تاريخ طلب التعويض</th>
              <th>القيمة المقدرة للتعويض</th>
              <th>مقدم المطالبة</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${filteredClaims.map((claim, idx) => {
              let estimatedAmountText = '—';
              if (claim.assessor_amount_dinar) {
                estimatedAmountText = `${Number(claim.assessor_amount_dinar).toLocaleString('ar-LY')} د.ل`;
                if (claim.assessor_other_amount) {
                  estimatedAmountText += ` (${claim.assessor_other_amount})`;
                }
              } else if (claim.assessor_other_amount) {
                estimatedAmountText = claim.assessor_other_amount;
              }

              return `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${claim.claim_number}</strong></td>
                <td>${claim.document?.insurance_number || 'غير متوفر'}</td>
                <td>${claim.accident_date ? new Date(String(claim.accident_date).replace(' ', 'T')).toLocaleDateString('ar-EG') : 'غير متوفر'}</td>
                <td>${claim.claim_date ? new Date(String(claim.claim_date).replace(' ', 'T')).toLocaleDateString('ar-EG') : 'غير متوفر'}</td>
                <td><span style="font-weight: bold; color: #059669;">${estimatedAmountText}</span></td>
                <td>${claim.claimant_name}</td>
                <td>${getStatusLabel(claim.status)}</td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer-sigs">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-text">الموظف المختص</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-text">رئيس قسم المطالبات</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-text">مدير إدارة العمليات</div>
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

  const handlePrintClaim = async (claim: any) => {
    let fullClaim = claim;
    try {
      const response = await fetch(`${API_BASE_URL}/claims/${claim.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        fullClaim = await response.json();
      }
    } catch (e) {}

    const printWindow = window.open('', '', 'width=1000,height=900');
    if (!printWindow) return;

    const qrData = `مطالبة رقم: ${fullClaim.claim_number}\nمقدم المطالبة: ${fullClaim.claimant_name}\nرقم الوثيقة: ${fullClaim.document?.insurance_number || '---'}\nالتاريخ: ${new Date().toLocaleString('ar-LY')}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>طباعة مطالبة - ${fullClaim.claim_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800;900&display=swap');
          @media print { 
            @page { margin: 5mm; size: A4; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; }
          }
          body { 
            font-family: 'Cairo', sans-serif; 
            margin: 0 auto; 
            max-width: 190mm;
            padding: 10px; 
            color: #000;
            background: #fff;
            font-size: 11px;
          }
          .a4-container {
            padding: 12px;
            min-height: 260mm;
            position: relative;
          }
          
          /* Header Grid */
          .print-header-grid {
            position: relative;
            display: grid;
            grid-template-columns: 1fr 200px;
            grid-template-rows: auto auto;
            gap: 15px;
            margin-bottom: 20px;
            align-items: start;
          }
          
          /* Top Right: Title and Logo */
          .header-top-right {
            display: flex;
            align-items: flex-start;
            justify-content: flex-start; /* Push logo to the right */
          }
          .header-top-right .eye-logo {
            height: 70px;
          }
          .main-title {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            top: 5px;
            font-size: 18px;
            font-weight: 900;
            color: #4b5563; /* Gray text color */
            border: 1.5px solid #000;
            padding: 6px 30px;
            border-radius: 8px;
            background-color: #fff;
            text-align: center;
            z-index: 10;
          }
          
          /* Top Left: QR Code */
          .header-top-left {
            display: flex;
            justify-content: flex-end; /* flex-end in RTL pushes to left */
          }
          .qr-wrapper {
            border: 1px solid #000;
            padding: 4px;
            display: inline-block;
          }
          .qr-wrapper img {
            width: 85px;
            height: 85px;
            display: block;
          }
          
          /* Bottom Right: Company Info Box */
          .header-bottom-right {
            border: 1.5px solid #000;
            padding: 10px 15px;
            margin-left: 20px; /* Don't stretch all the way */
          }
          .company-info-row {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            font-weight: 800;
            margin-bottom: 5px;
          }
          .company-info-row .val { font-weight: 900; }
          
          /* Bottom Left: Legal Text Box */
          .header-bottom-left {
            border: 1.5px solid #000;
            padding: 10px;
            font-size: 10px;
            font-weight: 800;
            text-align: center;
            line-height: 1.6;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          /* Sections */
          .section { margin-bottom: 10px; }
          .section-title {
            background-color: #d1d5db;
            color: #000;
            font-weight: 900;
            font-size: 12px;
            text-align: center;
            padding: 4px;
            border: 1.5px solid #000;
            margin-bottom: 8px;
          }
          .grid-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px 20px;
          }
          .field-row {
            display: flex;
            align-items: center;
          }
          .field-label {
            width: 90px;
            font-weight: 800;
            font-size: 11px;
            flex-shrink: 0;
          }
          .field-input {
            flex-grow: 1;
            border: 1px solid #000;
            padding: 2px 6px;
            font-weight: 700;
            font-size: 11px;
            min-height: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            background: #fff;
          }
          .full-width { grid-column: span 2; }
          .full-width .field-label { width: 90px; }
          
          /* Signatures */
          .signature-area {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            padding: 0 40px;
          }
          .sig-box {
            width: 160px;
            text-align: center;
          }
          .sig-box .box-outline {
            border: 1px solid #000;
            height: 60px;
            margin-bottom: 8px;
          }
          .sig-box .label {
            font-size: 11px;
            font-weight: 900;
          }
          
          /* Footer */
          .footer-note {
            text-align: right;
            font-size: 10px;
            font-weight: 800;
            margin-top: 30px;
            line-height: 1.5;
            color: #333;
          }
        </style>
      </head>
      <body onload="setTimeout(() => { window.print(); }, 500);">
        <div class="a4-container">
          
          <div class="print-header-grid">
            <!-- Top Right: Logo and Title -->
            <div class="header-top-right">
              <div class="main-title">ملخص المطالبة التأمينية</div>
              <img src="/img/logo.png" class="eye-logo" onerror="this.style.display='none'" />
            </div>
            
            <!-- Top Left: QR Code -->
            <div class="header-top-left">
              <div class="qr-wrapper">
                <img src="${qrApiUrl}" class="qr-code" />
              </div>
            </div>
            
            <!-- Bottom Right: Company Info Box -->
            <div class="header-bottom-right">
              <div class="company-info-row"><span>الشركة المصدرة للوثيقة</span> <span class="val">المدار الليبي للتأمين</span></div>
              <div class="company-info-row"><span>العنــــــــــــــوان</span> <span class="val">طرابلس</span></div>
              <div class="company-info-row"><span>تاريــــخ التأسيس</span> <span class="val">29/01/2024</span></div>
              <div class="company-info-row"><span>رأس المال المكتتب به</span> <span class="val">10,000,000.00</span></div>
            </div>
            
            <!-- Bottom Left: Legal Text Box -->
            <div class="header-bottom-left">
              هذا المستند يمثل ملخصاً رسمياً<br/>
              لبيانات المطالبة التأمينية<br/>
              والمسجلة في نظام المدار الليبي للتأمين<br/>
              وفقاً للإجراءات المعتمدة.
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">بيانات مقدم المطالبة / المشترك</div>
            <div class="grid-container">
              <div class="field-row"><div class="field-label">اسم مقدم المطالبة</div><div class="field-input">${fullClaim.claimant_name || '---'}</div></div>
              <div class="field-row"><div class="field-label">الجنسيــــــــــــة</div><div class="field-input">${fullClaim.nationality || '---'}</div></div>
              <div class="field-row"><div class="field-label">رقم الإثبات الشخصي</div><div class="field-input">${fullClaim.personal_id || '---'}</div></div>
              <div class="field-row"><div class="field-label">صلـــــة القرابـــــة</div><div class="field-input">${fullClaim.kinship || '---'}</div></div>
              <div class="field-row"><div class="field-label">رقم الهاتـــــــــــف</div><div class="field-input">${fullClaim.phone_number || '---'}</div></div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">بيانات المطالبة / الحادث</div>
            <div class="grid-container">
              <div class="field-row"><div class="field-label">رقم المطالبـــــــة</div><div class="field-input">${fullClaim.claim_number || '---'}</div></div>
              <div class="field-row"><div class="field-label">تاريــــخ المطالبــــة</div><div class="field-input">${fullClaim.claim_date || '---'}</div></div>
              <div class="field-row"><div class="field-label">تاريــــخ الحــــادث</div><div class="field-input">${fullClaim.accident_date || '---'}</div></div>
              <div class="field-row"><div class="field-label">وقـــــت الحــــادث</div><div class="field-input">${fullClaim.accident_time || '---'}</div></div>
              <div class="field-row"><div class="field-label">نـــوع الأضـــــرار</div><div class="field-input">${fullClaim.damage_type ? fullClaim.damage_type.split(/[،,]\s*/).map((t: any) => t === 'اخر' ? (fullClaim.other_damage_type || 'أخرى') : t).join('، ') : '---'}</div></div>
              <div class="field-row"><div class="field-label">حـــالــة المطالبــــة</div><div class="field-input">${fullClaim.status || '---'}</div></div>
              <div class="field-row full-width"><div class="field-label">مكـــان الحــــادث</div><div class="field-input">${fullClaim.accident_location || '---'}</div></div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">بيانات الوثيقة المربوطة</div>
            <div class="grid-container">
              <div class="field-row"><div class="field-label">رقــــم الوثيقــــة</div><div class="field-input">${fullClaim.document?.insurance_number || '---'}</div></div>
              <div class="field-row"><div class="field-label">نــــوع التغطيــــة</div><div class="field-input">${fullClaim.document_coverage || '---'}</div></div>
              <div class="field-row full-width"><div class="field-label">اسم المؤمـــن لـــه</div><div class="field-input">${fullClaim.document?.insured_name || '---'}</div></div>
            </div>
          </div>
          
          ${fullClaim.damaged_body_type === 'سيارة' ? `
          <div class="section">
            <div class="section-title">بيانات المركبة المتضررة</div>
            <div class="grid-container">
              <div class="field-row"><div class="field-label">نــــوع المركبــــة</div><div class="field-input">${fullClaim.damaged_vehicle_model || '---'}</div></div>
              <div class="field-row"><div class="field-label">رقــــم اللوحـــــة</div><div class="field-input">${fullClaim.damaged_vehicle_plate || '---'}</div></div>
              <div class="field-row"><div class="field-label">مبلغ الأضرار المقدر</div><div class="field-input">${fullClaim.damaged_vehicle_amount ? fullClaim.damaged_vehicle_amount + ' د.ل' : '---'}</div></div>
            </div>
          </div>
          ` : ''}

          ${fullClaim.driver_name ? `
          <div class="section">
            <div class="section-title">بيانات السائق المسبب</div>
            <div class="grid-container">
              <div class="field-row"><div class="field-label">اســـم السائـــــق</div><div class="field-input">${fullClaim.driver_name || '---'}</div></div>
              <div class="field-row"><div class="field-label">رقــــم الرخصــــة</div><div class="field-input">${fullClaim.driver_license_number || '---'}</div></div>
            </div>
          </div>
          ` : ''}
          
          <div class="section">
            <div class="section-title">بيانات التقييم المالي</div>
            <div class="grid-container">
              <div class="field-row"><div class="field-label">مقــــدر الأضــــرار</div><div class="field-input">${fullClaim.assessor_name || '---'}</div></div>
              <div class="field-row">
                <div class="field-label">قيمــــة التقييـــــم</div>
                <div class="field-input">
                  ${fullClaim.assessor_amount_dinar ? Number(fullClaim.assessor_amount_dinar).toLocaleString('ar-LY') + ' د.ل' : '---'}
                  ${fullClaim.assessor_other_amount ? ` (ما يعادل ${fullClaim.assessor_other_amount})` : ''}
                </div>
              </div>
            </div>
          </div>
          
          <div class="signature-area">
            <div class="sig-box">
              <div class="box-outline"></div>
              <div class="label">ختم وإعتماد الشركة</div>
            </div>
            <div class="sig-box">
              <div class="box-outline"></div>
              <div class="label">توقيع المستلم / مقدم المطالبة</div>
            </div>
          </div>
          
          <div class="footer-note">
            أي كشط أو تعديل يلغي هذه الوثيقة<br/>
            طبع بواسطة نظام المدار الليبي للتأمين - ${new Date().toLocaleString('ar-LY')}
          </div>
          
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>المطالبات / قائمة المطالبات</span>
      </div>

      <div className="users-card">
        <div className="claims-modern-header">
          <div className="header-main-row">
            <h5 className="claims-title">قائمة المطالبات المسجلة</h5>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="print-report-btn"
                onClick={handlePrintDetailedReport}
                title="طباعة التقرير التفصيلي"
              >
                <i className="fa-solid fa-print"></i>
                <span>طباعة التقرير التفصيلي</span>
              </button>
              <button
                className="export-excel-btn"
                onClick={exportToExcel}
                title="تصدير إكسل"
              >
                <i className="fa-solid fa-file-excel"></i>
                <span>تصدير إكسل</span>
              </button>
              <button
                className="add-claim-btn"
                onClick={() => {
                  setEditingClaim(null);
                  setShowAddModal(true);
                }}
              >
                <i className="fa-solid fa-plus"></i>
                <span>إضافة مطالبة جديدة</span>
              </button>
            </div>
          </div>


          <div className="search-row-modern">
            <label>بحث نصي</label>
            <div className="modern-search-bar">
              <input
                type="text"
                placeholder="بحث برقم المطالبة أو اسم المقدم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="button">
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </div>
          </div>

          <div className="filters-row-modern" style={{ flexWrap: 'wrap', gap: '16px 12px' }}>
            <div className="filter-group" style={{ minWidth: '160px' }}>
              <label>تصفية حسب الحالة</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">كل الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="تسويه وديه">تسوية ودية</option>
                <option value="تحويل الى مركز الشرطة">مركز الشرطة</option>
                <option value="للتسديد - الشؤون المالية">للتسديد</option>
              </select>
            </div>

            <div className="filter-group" style={{ minWidth: '160px' }}>
              <label>نوع الأضرار</label>
              <select
                value={damageTypeFilter}
                onChange={(e) => setDamageTypeFilter(e.target.value)}
              >
                <option value="">كل أنواع الأضرار</option>
                <option value="مادي">مادي</option>
                <option value="بدني">بدني</option>
                <option value="اخر">أخرى</option>
              </select>
            </div>

            <div className="filter-group" style={{ minWidth: '140px' }}>
              <label>من تاريخ</label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border)',
                  background: 'var(--panel)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <div className="filter-group" style={{ minWidth: '140px' }}>
              <label>إلى تاريخ</label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border)',
                  background: 'var(--panel)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>

            <div className="filter-group" style={{ minWidth: '160px' }}>
              <label>ترتيب حسب</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: '10px',
                  border: '1.5px solid var(--border)',
                  background: 'var(--panel)',
                  color: 'var(--text)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="date_desc">تاريخ المطالبة (الأحدث)</option>
                <option value="date_asc">تاريخ المطالبة (الأقدم)</option>
                <option value="claim_number_asc">رقم المطالبة (أ-ي)</option>
                <option value="claim_number_desc">رقم المطالبة (ي-أ)</option>
                <option value="status">الحالة</option>
              </select>
            </div>

            <button className="reset-filters-btn" onClick={handleResetFilters}>
              <i className="fa-solid fa-rotate-left"></i>
              <span>تفريغ</span>
            </button>
          </div>
        </div>

        {/* Custom Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="transfer-overlay">
            <div className="transfer-modal" style={{ maxWidth: '450px' }}>
              <div className="modal-header">
                <h3 style={{ color: '#ef4444' }}><i className="fa-solid fa-triangle-exclamation"></i> تأكيد الحذف</h3>
                <button className="close-btn" onClick={() => setShowDeleteConfirm(false)}>&times;</button>
              </div>
              <div className="form-body" style={{ textAlign: 'center', padding: '30px' }}>
                <i className="fa-solid fa-trash-can" style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '20px', display: 'block' }}></i>
                <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text)', marginBottom: '10px' }}>هل أنت متأكد من حذف المطالبة؟</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>لا يمكن التراجع عن هذا الإجراء بعد التنفيذ.</p>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'center', gap: '15px', paddingBottom: '30px' }}>
                <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>إلغاء</button>
                <button className="btn-confirm" style={{ background: '#ef4444' }} onClick={confirmDelete}>تأكيد الحذف نهائياً</button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .claims-modern-header {
            padding: 0 0 24px 0;
            display: flex;
            flex-direction: column;
            gap: 20px;
            background: transparent !important;
          }
          .header-main-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .claims-title {
            font-size: 1.4rem;
            font-weight: 800;
            color: var(--text) !important;
            margin: 0;
          }
          .add-claim-btn {
            background: var(--sidebar) !important;
            color: white !important;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            transition: all 0.2s;
            cursor: pointer;
          }
          [data-theme='dark'] .add-claim-btn {
            background: var(--accent-cyan) !important;
            box-shadow: 0 4px 12px var(--accent-shadow) !important;
          }
          .add-claim-btn:hover {
            filter: brightness(1.1);
            transform: translateY(-1px);
          }
          
          .export-excel-btn {
            background: #166534 !important;
            color: white !important;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            transition: all 0.2s;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(22, 101, 52, 0.2);
          }
          .export-excel-btn:hover {
            background: #15803d !important;
            transform: translateY(-1px);
            box-shadow: 0 6px 15px rgba(22, 101, 52, 0.3);
          }
          
          .print-report-btn {
            background: #4f46e5 !important;
            color: white !important;
            border: none;
            padding: 10px 20px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 700;
            transition: all 0.2s;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
          }
          .print-report-btn:hover {
            background: #4338ca !important;
            transform: translateY(-1px);
            box-shadow: 0 6px 15px rgba(79, 70, 229, 0.3);
          }

          
          .search-row-modern label, .filter-group label {
            display: block;
            font-size: 0.85rem;
            font-weight: 700;
            color: var(--text-muted) !important;
            margin-bottom: 8px;
          }
          
          .modern-search-bar {
            display: flex;
            background: var(--panel) !important;
            border: 1.5px solid var(--border) !important;
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.2s;
          }
          .modern-search-bar:focus-within {
            border-color: var(--sidebar) !important;
          }
          [data-theme='dark'] .modern-search-bar:focus-within {
            border-color: var(--accent-cyan) !important;
          }
          .modern-search-bar input {
            flex: 1;
            border: none;
            background: transparent !important;
            padding: 12px 16px;
            font-size: 0.95rem;
            outline: none;
            color: var(--text) !important;
          }
          .modern-search-bar button {
            background: var(--sidebar) !important;
            color: white !important;
            border: none;
            width: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.1rem;
            cursor: pointer;
          }
          [data-theme='dark'] .modern-search-bar button {
            background: var(--accent-cyan) !important;
          }

          .filters-row-modern {
            display: flex;
            gap: 16px;
            align-items: flex-end;
            background: var(--panel) !important;
            padding: 20px;
            border-radius: 14px;
            border: 1px solid var(--border) !important;
          }
          .filter-group {
            flex: 1;
          }
          .filter-group select {
            width: 100%;
            height: 42px;
            padding: 0 12px;
            border-radius: 10px;
            border: 1.5px solid var(--border) !important;
            background: var(--panel) !important;
            color: var(--text) !important;
            font-size: 0.9rem;
            font-weight: 500;
            outline: none;
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%233b82f6'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: left 12px center;
            background-size: 16px;
          }
          .filter-group select:focus {
            border-color: var(--sidebar);
          }
          
          .reset-filters-btn {
            height: 42px;
            padding: 0 20px;
            background: transparent !important;
            border: 1.5px solid var(--sidebar) !important;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 700;
            color: var(--sidebar) !important;
            cursor: pointer;
            transition: all 0.2s;
          }
          [data-theme='dark'] .reset-filters-btn {
            border-color: var(--accent-cyan) !important;
            color: var(--accent-cyan) !important;
          }
          .reset-filters-btn:hover {
            background: var(--sidebar) !important;
            color: #fff !important;
          }
          [data-theme='dark'] .reset-filters-btn:hover {
            background: var(--accent-cyan) !important;
            color: #fff !important;
          }

          /* Modal Popup Styling */
          .transfer-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 20px;
          }
          .transfer-modal {
            background: var(--panel);
            width: 100%;
            max-width: 450px;
            border-radius: 20px;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
            overflow: hidden;
            border: 1px solid var(--border);
            animation: modalSlide 0.3s ease-out;
          }
          @keyframes modalSlide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
          
          .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
          .modal-header h3 { margin: 0; font-size: 1.2rem; font-weight: 800; display: flex; align-items: center; gap: 12px; }
          .close-btn { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
          
          .form-body { padding: 30px; }
          .modal-footer { padding: 20px 24px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 12px; }
          .btn-cancel { background: var(--panel); border: 1.5px solid var(--border); color: var(--text); padding: 10px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }
          .btn-confirm { color: #fff; border: none; padding: 10px 30px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        `}</style>

        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>جار التحميل...</p>
        ) : filteredClaims.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fa-solid fa-scale-balanced" style={{ fontSize: '3rem', color: '#ccc', marginBottom: '1rem' }}></i>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
              {searchQuery || statusFilter || damageTypeFilter ? 'لا توجد نتائج للبحث' : 'لا توجد مطالبات مسجلة'}
            </p>
          </div>
        ) : (
          <>
            <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>رقم المطالبة</th>
                  <th>تاريخ المطالبة</th>
                  <th>رقم الوثيقة</th>
                  <th>مقدم المطالبة</th>
                  <th>نوع الأضرار</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClaims.map((claim, index) => (
                  <tr key={claim.id}>
                    <td>{startIndex + index + 1}</td>
                    <td><span className="fw-bold">{claim.claim_number}</span></td>
                    <td>{claim.claim_date ? new Date(String(claim.claim_date).replace(' ', 'T')).toLocaleDateString('ar-EG') : 'غير متوفر'}</td>
                    <td>{claim.document?.insurance_number || 'غير متوفر'}</td>
                    <td>{claim.claimant_name}</td>
                    <td>{claim.damage_type ? claim.damage_type.split(/[،,]\s*/).map((t: any) => t === 'اخر' ? (claim.other_damage_type || 'أخرى') : t).join('، ') : '—'}</td>
                    <td>
                      <span className="badge" style={{
                        background: claim.status === 'pending' ? '#f59e0b' : '#3b82f6',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85rem'
                      }}>
                        {getStatusLabel(claim.status)}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn"
                          title="طباعة نموذج المطالبة"
                          onClick={() => handlePrintClaim(claim)}
                          style={{ color: '#0f766e', background: '#ccfbf1' }}
                        >
                          <i className="fa-solid fa-print"></i>
                        </button>
                        <Link to={`/claims/${claim.id}`} className="action-btn view" title="عرض التفاصيل">
                          <i className="fa-solid fa-eye"></i>
                        </Link>
                        <button
                          className="action-btn edit"
                          title="تعديل"
                          onClick={() => handleEditClick(claim)}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          className="action-btn delete"
                          title="حذف"
                          onClick={() => handleDeleteClick(claim.id)}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination-wrapper">
              <div className="pagination-info">
                عرض {startIndex + 1}
                {' إلى '}
                {Math.min(startIndex + paginatedClaims.length, totalClaims)}
                {' من '}
                {totalClaims}
                {' مطالبة'}
              </div>
              <div className="pagination-controls">
                <button
                  className="pagination-btn pagination-prev"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <i className="fa-solid fa-chevron-right"></i>
                </button>
                {(() => {
                  const items: (number | 'dots')[] = [];
                  if (totalPages <= 3) {
                    for (let p = 1; p <= totalPages; p++) {
                      items.push(p);
                    }
                  } else {
                    items.push(1);
                    let start = Math.max(2, currentPage - 1);
                    let end = Math.min(totalPages - 1, currentPage + 1);
                    if (start > 2) items.push('dots');
                    for (let p = start; p <= end; p++) items.push(p);
                    if (end < totalPages - 1) items.push('dots');
                    items.push(totalPages);
                  }
                  return items.map((item, idx) =>
                    item === 'dots' ? (
                      <span key={`dots-${idx}`} className="pagination-dots">...</span>
                    ) : (
                      <button
                        key={item}
                        className={`pagination-btn pagination-number ${currentPage === item ? 'active' : ''}`}
                        onClick={() => setCurrentPage(item as number)}
                      >
                        {item}
                      </button>
                    )
                  );
                })()}
                <button
                  className="pagination-btn pagination-next"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <i className="fa-solid fa-chevron-left"></i>
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {showAddModal && (
        <CreateClaimModal
          claim={editingClaim}
          onClose={() => {
            setShowAddModal(false);
            setEditingClaim(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingClaim(null);
            fetchClaims();
          }}
        />
      )}
    </section>
  );
}
