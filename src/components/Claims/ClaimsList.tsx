import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { showToast } from '../Toast';
import { API_BASE_URL } from '../../config/api';
import CreateClaimModal from './CreateClaim';
// @ts-ignore
import { saveAs } from 'file-saver';
import { generatePremiumExcel } from '../../utils/excelGenerator';
import { printClaimsDetailedReport } from '../../utils/printClaimsDetailedReport';


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
  const [yearFilter, setYearFilter] = useState('');
  const [exchangeRates, setExchangeRates] = useState<{ usd_to_lyd: number; tnd_to_lyd: number; eur_to_lyd: number }>({
    usd_to_lyd: 7.15,
    tnd_to_lyd: 2.30,
    eur_to_lyd: 7.65
  });
  const [reportUsdRate, setReportUsdRate] = useState<string>('7.15');
  const [reportTndRate, setReportTndRate] = useState<string>('2.30');
  const [showRatesModal, setShowRatesModal] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  const [modalRates, setModalRates] = useState({ usd_to_lyd: '7.15', tnd_to_lyd: '2.30', eur_to_lyd: '7.65' });
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [settlementClaimId, setSettlementClaimId] = useState<number | null>(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [settlementImage, setSettlementImage] = useState<File | null>(null);
  const [settlementData, setSettlementData] = useState({
    settlement_number: '',
    settlement_presenter: '',
    settlement_date: new Date().toISOString().split('T')[0],
    tnd_amount: '',
    lyd_amount: '',
    committee_manager: '',
    manager_report: '',
  });


  useEffect(() => {
    fetchExchangeRates();
  }, []);

  const fetchExchangeRates = async () => {
    try {
      const cached = localStorage.getItem('mli_exchange_rates');
      if (cached) {
        const parsed = JSON.parse(cached);
        setExchangeRates(parsed);
        setReportUsdRate(String(parsed.usd_to_lyd || 7.15));
        setReportTndRate(String(parsed.tnd_to_lyd || 2.30));
        setModalRates({
          usd_to_lyd: String(parsed.usd_to_lyd || 7.15),
          tnd_to_lyd: String(parsed.tnd_to_lyd || 2.30),
          eur_to_lyd: String(parsed.eur_to_lyd || 7.65)
        });
      }
      const response = await fetch(`${API_BASE_URL}/exchange-rates`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setExchangeRates(data);
        localStorage.setItem('mli_exchange_rates', JSON.stringify(data));
        setReportUsdRate(String(data.usd_to_lyd || 7.15));
        setReportTndRate(String(data.tnd_to_lyd || 2.30));
        setModalRates({
          usd_to_lyd: String(data.usd_to_lyd || 7.15),
          tnd_to_lyd: String(data.tnd_to_lyd || 2.30),
          eur_to_lyd: String(data.eur_to_lyd || 7.65)
        });
      }
    } catch (e) {
      console.warn('Could not fetch exchange rates', e);
    }
  };

  const handleSaveSystemRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRates(true);
    try {
      const payload = {
        usd_to_lyd: parseFloat(modalRates.usd_to_lyd) || 7.15,
        tnd_to_lyd: parseFloat(modalRates.tnd_to_lyd) || 2.30,
        eur_to_lyd: parseFloat(modalRates.eur_to_lyd) || 7.65
      };
      const response = await fetch(`${API_BASE_URL}/exchange-rates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        console.warn('Backend exchange-rates response not ok');
      }
      setExchangeRates(payload);
      localStorage.setItem('mli_exchange_rates', JSON.stringify(payload));
      setReportUsdRate(String(payload.usd_to_lyd));
      setReportTndRate(String(payload.tnd_to_lyd));
      setShowRatesModal(false);
      showToast('تم تحديث وحفظ أسعار الصرف بنجاح', 'success');
    } catch (e) {
      showToast('خطأ في حفظ أسعار الصرف', 'error');
    } finally {
      setSavingRates(false);
    }
  };

  const perPage = 15;

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, damageTypeFilter, startDateFilter, endDateFilter, searchQuery, sortBy, yearFilter]);

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

  const handleCancelPayment = async (id: number) => {
    const reason = window.prompt('يرجى تأكيد سبب إلغاء التسديد وإرجاع الملف غير مسدد:', 'إلغاء التسديد بسبب خطأ في الإدخال');
    if (reason === null) return;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`${API_BASE_URL}/claims/${id}/cancel-payment?user_id=${user.id || ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        showToast('تم إلغاء التسديد وإعادة الملف كغير مسدد بنجاح', 'success');
        fetchClaims();
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.message || 'حدث خطأ أثناء إلغاء التسديد', 'error');
      }
    } catch (error) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handleOpenSettlementModal = (claimId: number) => {
    setSettlementClaimId(claimId);
    setSettlementImage(null);
    setSettlementData({
      settlement_number: '',
      settlement_presenter: '',
      settlement_date: new Date().toISOString().split('T')[0],
      tnd_amount: '',
      lyd_amount: '',
      committee_manager: '',
      manager_report: '',
    });
    setShowSettlementModal(true);
  };

  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settlementClaimId) return;
    setSettlementLoading(true);
    try {
      const formData = new FormData();
      formData.append('transfer_type', 'تسويه وديه');
      formData.append('detail_settlement_number', settlementData.settlement_number);
      formData.append('detail_settlement_presenter', settlementData.settlement_presenter);
      formData.append('detail_settlement_date', settlementData.settlement_date);
      formData.append('detail_tnd_amount', settlementData.tnd_amount);
      formData.append('detail_lyd_amount', settlementData.lyd_amount);
      formData.append('detail_committee_manager', settlementData.committee_manager);
      formData.append('detail_manager_report', settlementData.manager_report);
      if (settlementImage) {
        formData.append('detail_image', settlementImage);
      }
      const response = await fetch(`${API_BASE_URL}/claims/${settlementClaimId}/transfers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        },
        body: formData
      });
      if (!response.ok) throw new Error('Failed');
      showToast('تمت إضافة التسوية بنجاح', 'success');
      setShowSettlementModal(false);
      fetchClaims();
    } catch {
      showToast('خطأ في إضافة التسوية', 'error');
    } finally {
      setSettlementLoading(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setDamageTypeFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setYearFilter('');
    setSortBy('date_desc');
    setReportUsdRate(String(exchangeRates.usd_to_lyd || 7.15));
    setReportTndRate(String(exchangeRates.tnd_to_lyd || 2.30));
  };

  const exportToExcel = async () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      const activeUsdRate = parseFloat(String(reportUsdRate)) || exchangeRates.usd_to_lyd || 7.15;
      const activeTndRate = parseFloat(String(reportTndRate)) || exchangeRates.tnd_to_lyd || 2.30;
      const activeEurRate = exchangeRates.eur_to_lyd || 7.65;

      const columns = [
        { header: 'رقم المطالبة', key: 'reference_number', width: 22 },
        { header: 'رقم الوثيقة', key: 'insurance_number', width: 22 },
        { header: 'المؤمن له', key: 'insured_name', width: 25 },
        { header: 'تاريخ الحادث', key: 'accident_date', width: 18 },
        { header: 'تاريخ طلب التعويض', key: 'claim_date', width: 18 },
        { header: 'نوع الأضرار', key: 'damage_type', width: 18 },
        { header: 'مكان الحادث', key: 'accident_location', width: 22 },
        { header: 'الاحتياطي (عملة أجنبية)', key: 'foreign_amount', width: 22 },
        { header: 'سعر التحويل المعتمد', key: 'applied_rate', width: 18 },
        { header: 'الاحتياطي المحتسب (دينار ليبي)', key: 'reserve_lyd', width: 25 },
        { header: 'مبلغ التعويض النهائي (دينار ليبي)', key: 'final_amount', width: 25 },
        { header: 'وين واصلة المطالبة', key: 'status', width: 22 },
        { header: 'تاريخ التسجيل', key: 'created_at', width: 18 },
      ];

      const toArabicNumerals = (str: string | number) => {
        return String(str);
      };

      const data = filteredClaims.map(claim => {
        let foreignAmountStr = '—';
        let appliedRateStr = '—';
        let reserveLYD = 0;

        if (claim.assessor_amount_dollar && Number(claim.assessor_amount_dollar) > 0) {
          const dollarVal = Number(claim.assessor_amount_dollar);
          foreignAmountStr = `${dollarVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} $`;
          appliedRateStr = `1$ = ${activeUsdRate} د.ل`;
          reserveLYD = dollarVal * activeUsdRate;
        } else if (claim.assessor_other_amount) {
          const match = String(claim.assessor_other_amount).match(/^([\d.]+)\s*(.*)$/);
          if (match) {
            const amt = parseFloat(match[1]) || 0;
            const curr = match[2]?.trim() || '';
            if (curr.includes('تونس') || curr.toUpperCase().includes('TND')) {
              foreignAmountStr = `${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ت`;
              appliedRateStr = `1 د.ت = ${activeTndRate} د.ل`;
              reserveLYD = amt * activeTndRate;
            } else if (curr.includes('يورو') || curr.toUpperCase().includes('EUR')) {
              foreignAmountStr = `${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} €`;
              appliedRateStr = `1€ = ${activeEurRate} د.ل`;
              reserveLYD = amt * activeEurRate;
            } else if (curr.includes('دولار') || curr.toUpperCase().includes('USD')) {
              foreignAmountStr = `${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} $`;
              appliedRateStr = `1$ = ${activeUsdRate} د.ل`;
              reserveLYD = amt * activeUsdRate;
            } else {
              foreignAmountStr = `${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${curr}`;
              appliedRateStr = '1.00';
              reserveLYD = amt;
            }
          } else {
            foreignAmountStr = claim.assessor_other_amount;
            reserveLYD = Number(claim.assessor_amount_dinar) || 0;
          }
        } else if (claim.assessor_amount_dinar) {
          reserveLYD = Number(claim.assessor_amount_dinar) || 0;
          appliedRateStr = '1.00';
        }

        // Final / Settlement Amount
        let finalAmount = 0;
        const settlementTransfer = claim.transfers?.find((t: any) => t.transfer_type === 'تسويه وديه');
        const paymentTransfer = claim.transfers?.find((t: any) => t.transfer_type === 'للتسديد - الشؤون المالية');
        if (claim.total_paid && Number(claim.total_paid) > 0) {
          finalAmount = Number(claim.total_paid);
        } else if (claim.compensation_value && Number(claim.compensation_value) > 0) {
          finalAmount = Number(claim.compensation_value) + (Number(claim.additional_expenses) || 0);
        } else if (paymentTransfer && paymentTransfer.details?.financial_value) {
          finalAmount = Number(paymentTransfer.details.financial_value);
        } else if (settlementTransfer && settlementTransfer.details?.total_value) {
          finalAmount = Number(settlementTransfer.details.total_value);
        }

        const insuredName = claim.document?.insured_name || claim.document_manual_data?.insured_name || (claim.additional_documents && claim.additional_documents[0]?.insured_name) || '—';

        return {
          reference_number: toArabicNumerals(claim.claim_number || claim.reference_number),
          insurance_number: toArabicNumerals(claim.document?.insurance_number || claim.document_manual_data?.insurance_number || (claim.additional_documents && claim.additional_documents[0]?.insurance_number) || '—'),
          insured_name: insuredName,
          accident_date: claim.accident_date ? toArabicNumerals(new Date(String(claim.accident_date).replace(' ', 'T')).toLocaleDateString('en-GB')) : '—',
          claim_date: claim.claim_date ? toArabicNumerals(new Date(String(claim.claim_date).replace(' ', 'T')).toLocaleDateString('en-GB')) : '—',
          damage_type: claim.damage_type ? claim.damage_type.split(/[،,]\s*/).map((t: string) => t === 'اخر' ? (claim.other_damage_type || 'أخرى') : t).join('، ') : '—',
          accident_location: claim.accident_location || '—',
          foreign_amount: foreignAmountStr,
          applied_rate: appliedRateStr,
          reserve_lyd: reserveLYD ? `${reserveLYD.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل` : '—',
          final_amount: finalAmount ? `${finalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل` : '—',
          status: getStatusLabel(claim.status),
          created_at: toArabicNumerals(new Date(claim.created_at).toLocaleDateString('en-GB')),
        };
      });

      await generatePremiumExcel({
        title: 'شركة المدار الليبي للتأمين - إدارة المطالبات',
        subtitle: `تقرير المطالبات المسجلة (سعر الدولار: ${activeUsdRate} د.ل | سعر التونسي: ${activeTndRate} د.ل) - استخراج: ${new Date().toLocaleDateString('en-GB')}`,
        columns,
        data,
        fileName: 'تقرير_المطالبات',
        qrData: `تقرير المطالبات - شركة المدار الليبي\nالتاريخ: ${new Date().toLocaleString('en-GB')}\nسعر الدولار: ${activeUsdRate}\nبواسطة: ${currentUser.name || 'النظام'}`
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

    if (yearFilter) {
      const yearAcc = c.accident_date ? new Date(String(c.accident_date).replace(' ', 'T')).getFullYear().toString() : '';
      const yearClm = c.claim_date ? new Date(String(c.claim_date).replace(' ', 'T')).getFullYear().toString() : '';
      if (yearAcc !== yearFilter && yearClm !== yearFilter) return false;
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
    const activeRates = {
      usd_to_lyd: parseFloat(String(reportUsdRate)) || exchangeRates.usd_to_lyd || 7.15,
      tnd_to_lyd: parseFloat(String(reportTndRate)) || exchangeRates.tnd_to_lyd || 2.30,
      eur_to_lyd: exchangeRates.eur_to_lyd || 7.65,
    };

    const dateText = startDateFilter || endDateFilter
      ? `الفترة من: ${startDateFilter || 'البداية'} إلى: ${endDateFilter || 'النهاية'}`
      : 'كل التواريخ';

    const statusText = statusFilter ? getStatusLabel(statusFilter) : 'كل الحالات';
    const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

    printClaimsDetailedReport(filteredClaims, {
      rates: activeRates,
      dateText,
      statusText,
      yearText: yearFilter ? `حوادث سنة ${yearFilter}` : undefined,
      currentUser
    });
  };


  // @ts-ignore
    const handlePrintCompensationsReport = () => {
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) return;

    const dateText = startDateFilter || endDateFilter
      ? `الفترة من: ${startDateFilter || 'البداية'} إلى: ${endDateFilter || 'النهاية'}`
      : 'كل التواريخ';

    const statusText = statusFilter ? `حسب الحالة: ${getStatusLabel(statusFilter)}` : 'كل الحالات';

    const qrData = `تقرير تعويضات الحوادث - شركة المدار الليبي\nالتاريخ: ${new Date().toLocaleString('en-GB')}\nالفترة: ${dateText}\nعدد الحالات: ${filteredClaims.length}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(qrData)}`;

    // Calculate totals dynamically
    let totalCompensation = 0;
    let totalAdditionalExpenses = 0;
    let totalPaid = 0;

    filteredClaims.forEach(claim => {
      const paymentTransfer = claim.transfers?.find((t: any) => t.transfer_type === 'للتسديد - الشؤون المالية');
      if (paymentTransfer) {
        totalCompensation += Number(paymentTransfer.details?.compensation_value) || 0;
        totalAdditionalExpenses += Number(paymentTransfer.details?.additional_expenses) || 0;
        totalPaid += Number(paymentTransfer.details?.financial_value || paymentTransfer.details?.total_paid) || 0;
      }
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
            justify-content: flex-start;
            padding-right: 50px;
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
          <div>تاريخ الاستخراج: ${new Date().toLocaleDateString('en-GB')}</div>
          <div>${dateText}</div>
          <div>${statusText}</div>
          <div>إجمالي المطالبات: ${filteredClaims.length}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th rowspan="2" style="width: 40px; background: #f1f5f9; border: 1.5px solid #000;">م</th>
              <th colspan="3" class="category-claim">بيانات المطالبة</th>
              <th colspan="4" class="category-accident">بيانات الحادث</th>
              <th colspan="4" class="category-payment">بيانات السداد</th>
              <th colspan="3" class="category-financial">البيانات المالية</th>
              <th rowspan="2" class="category-gray" style="border: 1.5px solid #000;">الحالة</th>
            </tr>
            <tr>
              <th class="category-claim">تاريخ المطالبة</th>
              <th class="category-claim">مقدم المطالبة</th>
              <th class="category-claim">رقم المطالبة</th>
              
              <th class="category-accident">تاريخ الحادث</th>
              <th class="category-accident">نوع الأضرار</th>
              <th class="category-accident">رقم الوثيقة</th>
              <th class="category-accident">المؤمن له</th>
              
              <th class="category-payment">اسم مستلم التعويض</th>
              <th class="category-payment">طريقة السداد</th>
              <th class="category-payment">رقم المستند المالي<br><small>(صك-حوالة)</small></th>
              <th class="category-payment">الفئة البند الفرعي</th>
              
              <th class="category-financial">قيمة التعويض<br><small>(دينار ليبي)</small></th>
              <th class="category-financial">مصاريف اضافية<br><small>(ادارية - ضرائب - الخ)</small></th>
              <th class="category-financial">اجمالي القيمة المسددة<br><small>(دينار ليبي)</small></th>
            </tr>
          </thead>
          <tbody>
            ${filteredClaims.map((claim, idx) => {
              const paymentTransfer = claim.transfers?.find((t: any) => t.transfer_type === 'للتسديد - الشؤون المالية');
              
              const recipientName = paymentTransfer?.details?.recipient_name || '—';
              const paymentMethod = paymentTransfer?.details?.payment_method || '—';
              const docNumber = paymentTransfer?.details?.document_number || paymentTransfer?.details?.book_number || '—';
              const category = paymentTransfer ? 'التعويضات' : '—';
              
              const compVal = paymentTransfer?.details?.compensation_value;
              const compValText = compVal ? `${Number(compVal).toLocaleString('en-US')} د.ل` : '—';
              
              const addExp = paymentTransfer?.details?.additional_expenses;
              const addExpText = addExp ? `${Number(addExp).toLocaleString('en-US')} د.ل` : '—';
              
              const totPaid = paymentTransfer?.details?.financial_value || paymentTransfer?.details?.total_paid;
              const totPaidText = totPaid ? `${Number(totPaid).toLocaleString('en-US')} د.ل` : '—';
              
              const isPaid = claim.status === 'للتسديد - الشؤون المالية' || paymentTransfer;
              const displayStatus = isPaid ? 'مدفوع' : getStatusLabel(claim.status);

              return `
              <tr>
                <td>${idx + 1}</td>
                <td>${claim.claim_date ? new Date(String(claim.claim_date).replace(' ', 'T')).toLocaleDateString('en-GB') : '—'}</td>
                <td>${claim.claimant_name || '—'}</td>
                <td><strong>${claim.claim_number}</strong></td>
                
                <td>${claim.accident_date ? new Date(String(claim.accident_date).replace(' ', 'T')).toLocaleDateString('en-GB') : '—'}</td>
                <td>${claim.damage_type ? claim.damage_type.split(/[,]\s*/).map((t: any) => t === 'اخر' ? (claim.other_damage_type || 'أخرى') : t).join('، ') : '—'}</td>
                <td>${claim.document?.insurance_number || claim.document_manual_data?.insurance_number || (claim.additional_documents && claim.additional_documents[0]?.insurance_number) || '—'}</td>
                <td>${claim.document?.insured_name || claim.document_manual_data?.insured_name || (claim.additional_documents && claim.additional_documents[0]?.insured_name) || '—'}</td>
                
                <td>${recipientName}</td>
                <td>${paymentMethod}</td>
                <td>${docNumber}</td>
                <td>${category}</td>
                
                <td style="color: #000; font-weight: bold;">${compValText}</td>
                <td style="color: #4b5563;">${addExpText}</td>
                <td style="color: #059669; font-weight: bold;">${totPaidText}</td>
                
                <td>
                  <span style="color: ${isPaid ? '#166534' : '#d97706'}; font-weight: bold;">
                    ${displayStatus}
                  </span>
                </td>
              </tr>
            `;
            }).join('')}
            
            <tr class="totals-row">
              <td colspan="12" style="text-align: center; font-weight: 900;">المجمـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــوع العـــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــــام</td>
              <td style="color: #000; font-weight: bold;">${totalCompensation ? `${totalCompensation.toLocaleString('en-US')} دينار ليبي` : '—'}</td>
              <td style="color: #4b5563;">${totalAdditionalExpenses ? `${totalAdditionalExpenses.toLocaleString('en-US')} دينار ليبي` : '—'}</td>
              <td style="color: #059669; font-weight: bold;">${totalPaid ? `${totalPaid.toLocaleString('en-US')} دينار ليبي` : '—'}</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>

        <div class="footer-sigs">
          <div class="sig-box">
            <div class="sig-title">المدار الليبي للتأمين المساهمه</div>
            <div class="sig-title">مدير الشؤون المالية</div>
            <div class="sig-name">خالد محمود حمدان</div>
          </div>
        </div>

        <div class="print-meta">
          تم استخراج هذا التقرير آلياً من نظام المدار الليبي للتأمين - ${new Date().toLocaleString('en-GB')}
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

    const printWindow = window.open('', '', 'width=1100,height=950');
    if (!printWindow) return;

    // --- Document type label ---
    const docTypeLabelMap: Record<string, string> = {
      'InsuranceDocument': 'سيارات محلي',
      'InternationalInsuranceDocument': 'سيارات دولي',
      'TravelInsuranceDocument': 'مسافرين',
      'ResidentInsuranceDocument': 'وافدين مقيمين',
      'MarineStructureInsuranceDocument': 'هياكل بحرية',
      'ProfessionalLiabilityInsuranceDocument': 'مسؤولية مهنية',
      'PersonalAccidentInsuranceDocument': 'حوادث شخصية',
      'SchoolStudentInsuranceDocument': 'طلاب مدارس',
      'CashInTransitInsuranceDocument': 'نقل نقدية',
      'CargoInsuranceDocument': 'شحن بضائع'
    };
    const docTypeLabel = docTypeLabelMap[fullClaim.document_type] || fullClaim.document_manual_data?.insurance_type || fullClaim.document_type || '---';

    // --- Policy fields ---
    const policyNum     = fullClaim.document?.insurance_number || fullClaim.document_manual_data?.insurance_number || (fullClaim.additional_documents?.[0]?.insurance_number) || '---';
    const insuranceType = docTypeLabel;
    const coverage      = fullClaim.document_coverage || fullClaim.document_manual_data?.document_coverage || (fullClaim.additional_documents?.[0]?.document_coverage) || '---';
    const insuredName   = fullClaim.document?.insured_name || fullClaim.document_manual_data?.insured_name || (fullClaim.additional_documents?.[0]?.insured_name) || '---';
    const issueDate     = fullClaim.document?.issue_date || fullClaim.document_manual_data?.issue_date || '---';
    const endDate       = fullClaim.document?.end_date || fullClaim.document_manual_data?.end_date || '---';
    const plateNum      = fullClaim.document?.plate?.plate_number || fullClaim.document?.plate_number || fullClaim.document_manual_data?.plate_number || '---';

    // --- Financial ---
    let tndAmount = fullClaim.assessor_other_amount || '---';
    let rawLyd: any = fullClaim.assessor_amount_dinar;

    if (!rawLyd && fullClaim.assessor_other_amount) {
      const match = String(fullClaim.assessor_other_amount).match(/^([\d.]+)\s*(.*)$/);
      if (match) {
        const amt = parseFloat(match[1]) || 0;
        const curr = match[2]?.trim() || '';
        if (curr.includes('تونس') || curr.toUpperCase().includes('TND')) {
          rawLyd = amt * (exchangeRates.tnd_to_lyd || 2.30);
        } else if (curr.includes('دولار') || curr.toUpperCase().includes('USD')) {
          rawLyd = amt * (exchangeRates.usd_to_lyd || 7.15);
        } else if (curr.includes('يورو') || curr.toUpperCase().includes('EUR')) {
          rawLyd = amt * (exchangeRates.eur_to_lyd || 7.65);
        }
      }
    }
    if (!rawLyd && fullClaim.damaged_vehicle_amount && Number(fullClaim.damaged_vehicle_amount) > 0) {
      rawLyd = fullClaim.damaged_vehicle_amount;
    }
    if (!rawLyd && fullClaim.compensation_value) {
      rawLyd = fullClaim.compensation_value;
    }
    const lydAmount = rawLyd ? (Number(rawLyd).toLocaleString('en-US', { minimumFractionDigits: 3 }) + ' د.ل') : '---';

    // --- Settlements ---
    const settlements = (fullClaim.transfers || []).filter((t: any) => t.transfer_type === 'تسويه وديه');
    const isClaimTnd = Boolean(
      (fullClaim.assessor_other_amount && /تونس|tnd/i.test(fullClaim.assessor_other_amount)) ||
      fullClaim.document_type === 'InternationalInsuranceDocument'
    );

    const settlementsHtml = settlements.length > 0
      ? `<table class="settlements-table">
          <thead>
            <tr>
              <th>#</th>
              <th>تاريخ التسوية</th>
              <th>مقدم التسوية</th>
              <th>رقم التسوية</th>
              <th>مبلغ الأضرار (د.ت)</th>
              <th>قيمة التقييم (د.ل)</th>
              <th>مدير اللجنة</th>
            </tr>
          </thead>
          <tbody>
            ${settlements.map((t: any, i: number) => {
              const isTransferTnd = isClaimTnd || Boolean(
                t.details?.tnd_amount ||
                (t.details?.manager_report && /تونسي|تونس/i.test(t.details.manager_report))
              );

              let rowTnd = '';
              let rowLyd = '';

              if (isTransferTnd) {
                const rawTnd = t.details?.tnd_amount || t.details?.total_value || '';
                const tndVal = parseFloat(rawTnd) || 0;
                if (tndVal > 0) {
                  rowTnd = tndVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
                } else if (rawTnd) {
                  rowTnd = String(rawTnd);
                }

                if (t.details?.lyd_amount && Number(t.details.lyd_amount) > 0) {
                  rowLyd = Number(t.details.lyd_amount).toFixed(3);
                } else if (tndVal > 0) {
                  rowLyd = (tndVal * (exchangeRates.tnd_to_lyd || 2.30)).toFixed(3);
                }
              } else {
                if (t.details?.lyd_amount && Number(t.details.lyd_amount) > 0) {
                  rowLyd = Number(t.details.lyd_amount).toFixed(3);
                } else if (t.details?.total_value) {
                  rowLyd = String(t.details.total_value);
                }
              }

              const displayRowLyd = rowLyd ? (Number(rowLyd).toLocaleString('en-US', { minimumFractionDigits: 3 }) + ' د.ل') : '---';
              const displayRowTnd = rowTnd ? (isNaN(Number(rowTnd.replace(/,/g, ''))) ? rowTnd : (Number(rowTnd.replace(/,/g, '')).toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' د.ت')) : '---';

              return `<tr>
                <td>${i + 1}</td>
                <td>${t.details?.settlement_date || new Date(t.created_at).toLocaleDateString('en-GB')}</td>
                <td>${t.details?.settlement_presenter || t.details?.committee_manager || '---'}</td>
                <td>${t.details?.settlement_number || '---'}</td>
                <td class="money">${displayRowTnd}</td>
                <td class="money lyd">${displayRowLyd}</td>
                <td>${t.details?.committee_manager || '---'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>`
      : '<p class="no-settlements">لا توجد تسويات مسجلة</p>';

    // --- QR ---
    const qrData = `مطالبة رقم: ${fullClaim.claim_number}\nمقدم المطالبة: ${fullClaim.claimant_name}\nرقم الوثيقة: ${policyNum}\nالتاريخ: ${new Date().toLocaleString('en-GB')}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>نموذج المطالبة التأمينية - ${fullClaim.claim_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800;900&display=swap');
          @media print {
            @page { margin: 5mm; size: A4; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Cairo', sans-serif;
            margin: 0 auto;
            max-width: 195mm;
            padding: 8px 10px;
            color: #000;
            background: #fff;
            font-size: 10.5px;
          }

          /* ===== HEADER ===== */
          .print-header {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: start;
            margin-bottom: 14px;
            gap: 10px;
          }
          .hdr-logo { display: flex; align-items: flex-start; }
          .hdr-logo img { height: 68px; }
          .hdr-center { text-align: center; }
          .hdr-title {
            font-size: 17px; font-weight: 900; color: #1e293b;
            border: 2px solid #1e293b; padding: 5px 22px;
            border-radius: 8px; display: inline-block; margin-bottom: 4px;
          }
          .hdr-subtitle { font-size: 11px; font-weight: 700; color: #475569; }
          .hdr-qr { display: flex; justify-content: flex-end; align-items: flex-start; }
          .hdr-qr img { width: 82px; height: 82px; border: 1.5px solid #000; padding: 2px; }

          /* Company strip */
          .company-strip {
            display: grid; grid-template-columns: 1fr 1fr;
            border: 1.5px solid #000; margin-bottom: 10px;
          }
          .cs-box { padding: 6px 12px; border-left: 1px solid #000; }
          .cs-box:last-child { border-left: none; }
          .cs-row { display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; margin-bottom: 2px; }
          .cs-row .val { font-weight: 900; color: #0f172a; }
          .cs-legal { font-size: 9px; font-weight: 700; text-align: center; color: #475569; display: flex; align-items: center; justify-content: center; line-height: 1.5; }

          /* ===== SECTIONS ===== */
          .section { margin-bottom: 9px; }
          .section-title {
            background: #1e293b; color: #f8fafc;
            font-weight: 900; font-size: 11px;
            text-align: center; padding: 4px 8px;
            margin-bottom: 0; letter-spacing: 0.3px;
          }
          .section-body { border: 1.5px solid #1e293b; border-top: none; padding: 5px 8px; }

          /* Grid layouts */
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 10px; }
          .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px 10px; }

          .field-row { display: flex; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; padding-top: 3px; }
          .field-row:last-child { border-bottom: none; }
          .fl { font-weight: 800; font-size: 10px; width: 95px; flex-shrink: 0; color: #334155; }
          .fv {
            flex-grow: 1; font-weight: 700; font-size: 10.5px;
            border: 1px solid #94a3b8; border-radius: 3px;
            padding: 1px 6px; min-height: 17px;
            background: #f8fafc; text-align: center;
            display: flex; align-items: center; justify-content: center;
          }
          .fv.highlight { background: #ecfdf5; color: #065f46; font-weight: 900; }
          .fv.accent { background: #eff6ff; color: #1e40af; }
          .span-2 { grid-column: span 2; }
          .span-3 { grid-column: span 3; }
          .span-4 { grid-column: span 4; }

          /* ===== SETTLEMENTS TABLE ===== */
          .settlements-table {
            width: 100%; border-collapse: collapse; font-size: 9.5px;
            margin-top: 2px;
          }
          .settlements-table th {
            background: #0f172a; color: #fff; font-weight: 800;
            padding: 4px 4px; text-align: center; border: 1px solid #334155;
          }
          .settlements-table td {
            padding: 3px 4px; text-align: center;
            border: 1px solid #cbd5e1; font-weight: 700;
          }
          .settlements-table tr:nth-child(even) td { background: #f8fafc; }
          .settlements-table td.money { font-weight: 900; color: #0369a1; direction: ltr; }
          .settlements-table td.lyd { color: #065f46; }
          .no-settlements { text-align: center; color: #94a3b8; font-size: 10px; padding: 6px; margin: 0; }

          /* ===== SIGNATURES ===== */
          .sig-area {
            display: flex; justify-content: space-between;
            padding: 0 30px; margin-top: 20px;
          }
          .sig-box { width: 160px; text-align: center; }
          .sig-outline { border: 1px solid #000; height: 55px; margin-bottom: 6px; }
          .sig-label { font-size: 11px; font-weight: 900; }

          /* ===== FOOTER ===== */
          .footer-note {
            text-align: right; font-size: 9px; font-weight: 700;
            margin-top: 14px; color: #475569; line-height: 1.5;
            border-top: 1px solid #e2e8f0; padding-top: 5px;
          }
        </style>
      </head>
      <body onload="setTimeout(() => { window.print(); }, 500);">

        <!-- Header -->
        <div class="print-header">
          <div class="hdr-logo">
            <img src="/img/logo.png" onerror="this.style.display='none'" />
          </div>
          <div class="hdr-center">
            <div class="hdr-title">نموذج المطالبة التأمينية</div>
            <div class="hdr-subtitle">شركة المدار الليبي للتأمين المساهمة</div>
            <div class="hdr-subtitle" style="color:#0369a1; font-size:10px;">إدارة المطالبات والحوادث</div>
          </div>
          <div class="hdr-qr">
            <img src="${qrApiUrl}" />
          </div>
        </div>

        <!-- Company Info Strip -->
        <div class="company-strip">
          <div class="cs-box">
            <div class="cs-row"><span>الشركة المصدرة للوثيقة</span> <span class="val">المدار الليبي للتأمين</span></div>
            <div class="cs-row"><span>العنـــوان</span> <span class="val">طرابلس — ليبيا</span></div>
            <div class="cs-row"><span>تاريخ التأسيس</span> <span class="val">29/01/2024</span></div>
            <div class="cs-row"><span>رأس المال المكتتب</span> <span class="val">10,000,000.00 د.ل</span></div>
          </div>
          <div class="cs-box">
            <div class="cs-legal">
              هذا النموذج يمثل وثيقة رسمية معتمدة<br/>
              لبيانات المطالبة التأمينية المسجلة<br/>
              في نظام المدار الليبي للتأمين<br/>
              وفقاً للإجراءات والأنظمة المعتمدة.
            </div>
          </div>
        </div>

        <!-- Section 1: بيانات مقدم المطالبة -->
        <div class="section">
          <div class="section-title">📋 بيانات مقدم المطالبة / المشترك</div>
          <div class="section-body">
            <div class="grid-3">
              <div class="field-row"><div class="fl">اسم مقدم المطالبة</div><div class="fv accent">${fullClaim.claimant_name || '---'}</div></div>
              <div class="field-row"><div class="fl">الجنسيـــة</div><div class="fv">${fullClaim.nationality || '---'}</div></div>
              <div class="field-row"><div class="fl">رقم الإثبات</div><div class="fv">${fullClaim.personal_id || '---'}</div></div>
              <div class="field-row"><div class="fl">صلة القرابة</div><div class="fv">${fullClaim.kinship || '---'}</div></div>
              <div class="field-row"><div class="fl">رقم الهاتف</div><div class="fv">${fullClaim.phone_number || '---'}</div></div>
              ${fullClaim.claimant_check_number ? `<div class="field-row"><div class="fl">رقم الشيك/الإيصال</div><div class="fv">${fullClaim.claimant_check_number}</div></div>` : '<div></div>'}
            </div>
          </div>
        </div>

        <!-- Section 2: بيانات المطالبة / الحادث -->
        <div class="section">
          <div class="section-title">🚨 بيانات المطالبة / الحادث</div>
          <div class="section-body">
            <div class="grid-4">
              <div class="field-row"><div class="fl">رقم المطالبة</div><div class="fv highlight">${fullClaim.claim_number || '---'}</div></div>
              <div class="field-row"><div class="fl">تاريخ المطالبة</div><div class="fv">${fullClaim.claim_date || '---'}</div></div>
              <div class="field-row"><div class="fl">تاريخ الحادث</div><div class="fv">${fullClaim.accident_date || '---'}</div></div>
              <div class="field-row"><div class="fl">وقت الحادث</div><div class="fv">${fullClaim.accident_time || '---'}</div></div>
              <div class="field-row"><div class="fl">نوع الأضرار</div><div class="fv">${fullClaim.damage_type ? fullClaim.damage_type.split(/[،,]\s*/).map((t: any) => t === 'اخر' ? (fullClaim.other_damage_type || 'أخرى') : t).join('، ') : '---'}</div></div>
              <div class="field-row"><div class="fl">حالة المطالبة</div><div class="fv">${fullClaim.status || '---'}</div></div>
              <div class="field-row span-2"><div class="fl">مكان الحادث</div><div class="fv">${fullClaim.accident_location || '---'}</div></div>
            </div>
          </div>
        </div>

        <!-- Section 3: بيانات الوثيقة المربوطة -->
        <div class="section">
          <div class="section-title">📄 بيانات الوثيقة المربوطة</div>
          <div class="section-body">
            <div class="grid-4">
              <div class="field-row"><div class="fl">رقم الوثيقة</div><div class="fv accent">${policyNum}</div></div>
              <div class="field-row"><div class="fl">نوع التأمين</div><div class="fv">${insuranceType}</div></div>
              <div class="field-row"><div class="fl">نوع التغطية</div><div class="fv">${coverage}</div></div>
              <div class="field-row"><div class="fl">رقم اللوحة</div><div class="fv">${plateNum}</div></div>
              <div class="field-row span-2"><div class="fl">اسم المؤمن له</div><div class="fv accent">${insuredName}</div></div>
              <div class="field-row"><div class="fl">تاريخ الإصدار</div><div class="fv">${issueDate !== '---' ? new Date(String(issueDate).replace(' ', 'T')).toLocaleDateString('en-GB') : '---'}</div></div>
              <div class="field-row"><div class="fl">تاريخ الانتهاء</div><div class="fv">${endDate !== '---' ? new Date(String(endDate).replace(' ', 'T')).toLocaleDateString('en-GB') : '---'}</div></div>
            </div>
          </div>
        </div>

        ${fullClaim.additional_documents && fullClaim.additional_documents.length > 0 ? `
        <!-- Section 3b: وثائق إضافية -->
        <div class="section">
          <div class="section-title">📎 وثائق التأمين الإضافية المرفقة</div>
          <div class="section-body">
            ${fullClaim.additional_documents.map((doc: any, index: number) => `
              <div style="margin-bottom:${index < fullClaim.additional_documents.length - 1 ? '6px' : '0'}; border-bottom:${index < fullClaim.additional_documents.length - 1 ? '1px dashed #cbd5e1' : 'none'}; padding-bottom:${index < fullClaim.additional_documents.length - 1 ? '6px' : '0'}">
                <div style="font-weight:800; font-size:10px; color:#0369a1; margin-bottom:3px;">وثيقة إضافية #${index + 1}</div>
                <div class="grid-4">
                  <div class="field-row"><div class="fl">رقم الوثيقة</div><div class="fv">${doc.insurance_number || '---'}</div></div>
                  <div class="field-row"><div class="fl">اسم المؤمن له</div><div class="fv">${doc.insured_name || '---'}</div></div>
                  <div class="field-row"><div class="fl">رقم اللوحة</div><div class="fv">${doc.plate_number || '---'}</div></div>
                  <div class="field-row"><div class="fl">نوع السيارة</div><div class="fv">${doc.vehicle_type || '---'}</div></div>
                  <div class="field-row"><div class="fl">تاريخ الإصدار</div><div class="fv">${doc.issue_date || '---'}</div></div>
                  <div class="field-row"><div class="fl">تاريخ الانتهاء</div><div class="fv">${doc.end_date || '---'}</div></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${fullClaim.damaged_body_type === 'سيارة' ? `
        <!-- Section 4: بيانات المركبة المتضررة -->
        <div class="section">
          <div class="section-title">🚗 بيانات المركبة المتضررة</div>
          <div class="section-body">
            <div class="grid-4">
              <div class="field-row"><div class="fl">نوع المركبة</div><div class="fv">${fullClaim.damaged_vehicle_type || '---'}</div></div>
              <div class="field-row"><div class="fl">الموديل</div><div class="fv">${fullClaim.damaged_vehicle_model || '---'}</div></div>
              <div class="field-row"><div class="fl">اللون</div><div class="fv">${fullClaim.damaged_vehicle_color || '---'}</div></div>
              <div class="field-row"><div class="fl">رقم اللوحة</div><div class="fv">${fullClaim.damaged_vehicle_plate || '---'}</div></div>
              ${fullClaim.damaged_vehicle_repair_shop ? `<div class="field-row span-2"><div class="fl">ورشة التصليح</div><div class="fv">${fullClaim.damaged_vehicle_repair_shop}</div></div>` : ''}
              ${fullClaim.damaged_vehicle_details ? `<div class="field-row span-2"><div class="fl">بيانات الأضرار</div><div class="fv">${fullClaim.damaged_vehicle_details}</div></div>` : ''}
            </div>
          </div>
        </div>
        ` : ''}

        ${fullClaim.driver_name ? `
        <!-- Section 5: بيانات السائق المسبب -->
        <div class="section">
          <div class="section-title">👤 بيانات السائق المسبب</div>
          <div class="section-body">
            <div class="grid-3">
              <div class="field-row"><div class="fl">اسم السائق</div><div class="fv">${fullClaim.driver_name}</div></div>
              <div class="field-row"><div class="fl">رقم الرخصة</div><div class="fv">${fullClaim.driver_license_number || '---'}</div></div>
              <div class="field-row"><div class="fl">الجنسية</div><div class="fv">${fullClaim.driver_nationality || '---'}</div></div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Section 6: بيانات التقييم المالي -->
        <div class="section">
          <div class="section-title">💰 بيانات التقييم المالي</div>
          <div class="section-body">
            <div class="grid-2">
              <div class="field-row">
                <div class="fl">مبلغ الأضرار (بالتونسي)</div>
                <div class="fv" style="color:#0369a1; font-weight:900;">${tndAmount}</div>
              </div>
              <div class="field-row">
                <div class="fl">قيمة التقييم (بالليبي)</div>
                <div class="fv highlight">${lydAmount}</div>
              </div>
              ${fullClaim.assessor_date ? `<div class="field-row"><div class="fl">تاريخ التقييم</div><div class="fv">${fullClaim.assessor_date}</div></div>` : ''}
              ${fullClaim.assessor_percentage ? `<div class="field-row"><div class="fl">نسبة المقدر</div><div class="fv">${fullClaim.assessor_percentage}</div></div>` : ''}
            </div>
          </div>
        </div>

        <!-- Section 7: بيانات التسويات -->
        <div class="section">
          <div class="section-title">🤝 بيانات التسويات الودية</div>
          <div class="section-body" style="padding:6px;">
            ${settlementsHtml}
          </div>
        </div>

        <!-- Signatures -->
        <div class="sig-area">
          <div class="sig-box">
            <div class="sig-outline"></div>
            <div class="sig-label">ختم وإعتماد الشركة</div>
          </div>
          <div class="sig-box" style="text-align:center;">
            <div style="font-size:9px; font-weight:700; color:#64748b; margin-bottom:8px;">رقم المطالبة: ${fullClaim.claim_number}</div>
            <div style="font-size:9px; font-weight:700; color:#64748b;">التاريخ: ${new Date().toLocaleDateString('en-GB')}</div>
          </div>
          <div class="sig-box">
            <div class="sig-outline"></div>
            <div class="sig-label">توقيع المستلم / مقدم المطالبة</div>
          </div>
        </div>

        <div class="footer-note">
          أي كشط أو تعديل يلغي هذا النموذج &nbsp;|&nbsp;
          طبع بواسطة نظام المدار الليبي للتأمين — ${new Date().toLocaleString('en-GB')}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <h5 className="claims-title">قائمة المطالبات المسجلة</h5>
              <div 
                className="exchange-rates-widget" 
                onClick={() => {
                  setModalRates({
                    usd_to_lyd: String(exchangeRates.usd_to_lyd),
                    tnd_to_lyd: String(exchangeRates.tnd_to_lyd),
                    eur_to_lyd: String(exchangeRates.eur_to_lyd || 7.65)
                  });
                  setShowRatesModal(true);
                }}
                title="انقر لتعديل أسعار الصرف الرسمية للمنظومة"
              >
                <span className="rates-title"><i className="fa-solid fa-coins"></i> أسعار الصرف:</span>
                <span className="rate-chip"><i className="fa-solid fa-dollar-sign"></i> 1$ = <strong>{exchangeRates.usd_to_lyd} د.ل</strong></span>
                <span className="rate-chip"><i className="fa-solid fa-money-bill-transfer"></i> 1 د.ت = <strong>{exchangeRates.tnd_to_lyd} د.ل</strong></span>
                <span className="rate-edit-icon"><i className="fa-solid fa-pen-to-square"></i></span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="print-report-btn"
                onClick={handlePrintDetailedReport}
                title="طباعة تقرير المطالبات التفصيلي"
              >
                <i className="fa-solid fa-print"></i>
                <span>تقرير المطالبات التفصيلي</span>
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

          <div className="report-currency-quickbar">
            <div className="quickbar-label">
              <i className="fa-solid fa-sliders" style={{ color: 'var(--accent-cyan)' }}></i>
              <span>سعر الصرف المعتمد بالتقرير (يمكنك تعديله لحظياً لأي سنة أو تقرير):</span>
            </div>
            <div className="quickbar-inputs-wrap">
              <div className="quickbar-field">
                <span className="field-addon">💵 دولار (USD)</span>
                <input 
                  type="number" 
                  step="0.01" 
                  value={reportUsdRate} 
                  onChange={e => setReportUsdRate(e.target.value)}
                  placeholder="سعر الدولار..."
                  title="سعر صرف 1 دولار مقابل الدينار الليبي للتقرير"
                />
                <span className="field-unit">د.ل</span>
              </div>

              <div className="quickbar-field">
                <span className="field-addon">🇹🇳 دينار تونسي (TND)</span>
                <input 
                  type="number" 
                  step="0.01" 
                  value={reportTndRate} 
                  onChange={e => setReportTndRate(e.target.value)}
                  placeholder="سعر التونسي..."
                  title="سعر صرف 1 دينار تونسي مقابل الدينار الليبي للتقرير"
                />
                <span className="field-unit">د.ل</span>
              </div>

              <button 
                type="button" 
                className="quickbar-reset-btn" 
                onClick={() => {
                  setReportUsdRate(String(exchangeRates.usd_to_lyd));
                  setReportTndRate(String(exchangeRates.tnd_to_lyd));
                  showToast('تمت استعادة سعر الصرف الرسمي المعتمد', 'success');
                }}
                title="استعادة السعر الرسمي للمنظومة"
              >
                <i className="fa-solid fa-rotate-left"></i>
                <span>السعر الرسمي</span>
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
            <div className="filter-group" style={{ minWidth: '140px' }}>
              <label>سنة الحوادث</label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
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
                <option value="">كل السنوات</option>
                <option value="2026">حوادث 2026</option>
                <option value="2025">حوادث 2025</option>
                <option value="2024">حوادث 2024</option>
                <option value="2023">حوادث 2023</option>
              </select>
            </div>

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
                <option value="وفاة">وفاة</option>
                <option value="معنوي">معنوي</option>
                <option value="كلي">كلي</option>
                <option value="جزئي">جزئي</option>
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

                {/* Custom Exchange Rates Management Modal */}
        {showRatesModal && (
          <div className="transfer-overlay">
            <div className="transfer-modal" style={{ maxWidth: '480px' }}>
              <div className="modal-header">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <i className="fa-solid fa-coins" style={{ color: 'var(--accent-cyan)' }}></i>
                  تعديل وضبط أسعار الصرف الرسمية
                </h3>
                <button className="close-btn" onClick={() => setShowRatesModal(false)}>&times;</button>
              </div>
              <form onSubmit={handleSaveSystemRates}>
                <div className="form-body" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)', padding: '12px 14px', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>
                    <i className="fa-solid fa-circle-info me-2" style={{ color: 'var(--accent-cyan)' }}></i>
                    هذه الأسعار تمثل السعر المعتمد في المنظومة لجميع المعاملات والتقارير. يمكنك تعديلها في أي وقت وتظل سارية في النظام حتى تعديلها مرة أخرى.
                  </div>

                  <div className="field-group">
                    <label className="premium-label">💵 سعر صرف 1 دولار أمريكي (USD / LYD)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required
                      className="premium-field" 
                      value={modalRates.usd_to_lyd} 
                      onChange={e => setModalRates({ ...modalRates, usd_to_lyd: e.target.value })}
                      placeholder="مثال: 7.15"
                    />
                  </div>

                  <div className="field-group">
                    <label className="premium-label">🇹🇳 سعر صرف 1 دينار تونسي (TND / LYD)</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      required
                      className="premium-field" 
                      value={modalRates.tnd_to_lyd} 
                      onChange={e => setModalRates({ ...modalRates, tnd_to_lyd: e.target.value })}
                      placeholder="مثال: 2.30"
                    />
                  </div>

                  <div className="field-group">
                    <label className="premium-label">💶 سعر صرف 1 يورو (EUR / LYD) — اختياري</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="premium-field" 
                      value={modalRates.eur_to_lyd} 
                      onChange={e => setModalRates({ ...modalRates, eur_to_lyd: e.target.value })}
                      placeholder="مثال: 7.65"
                    />
                  </div>
                </div>

                <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-cancel" onClick={() => setShowRatesModal(false)}>إلغاء</button>
                  <button type="submit" className="btn-confirm" disabled={savingRates} style={{ background: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {savingRates ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                    <span>حفظ واعتماد الأسعار</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
          .exchange-rates-widget {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: var(--panel);
            border: 1.5px solid var(--border);
            padding: 6px 14px;
            border-radius: 30px;
            cursor: pointer;
            transition: all 0.25s ease;
            box-shadow: 0 2px 6px rgba(0,0,0,0.04);
          }
          .exchange-rates-widget:hover {
            border-color: var(--accent-cyan);
            transform: translateY(-1px);
            box-shadow: 0 4px 14px rgba(14, 165, 233, 0.15);
          }
          .rates-title {
            font-size: 0.82rem;
            font-weight: 800;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .rate-chip {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: rgba(14, 165, 233, 0.08);
            color: var(--text);
            padding: 2px 10px;
            border-radius: 20px;
            font-size: 0.8rem;
            border: 1px solid rgba(14, 165, 233, 0.2);
          }
          .rate-chip strong {
            color: var(--accent-cyan);
          }
          .rate-edit-icon {
            color: var(--text-muted);
            font-size: 0.85rem;
            transition: color 0.2s;
          }
          .exchange-rates-widget:hover .rate-edit-icon {
            color: var(--accent-cyan);
          }

          .report-currency-quickbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
            background: var(--panel);
            border: 1.5px solid var(--border);
            border-radius: 12px;
            padding: 10px 16px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.02);
          }
          .quickbar-label {
            font-size: 0.86rem;
            font-weight: 700;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .quickbar-inputs-wrap {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }
          .quickbar-field {
            display: flex;
            align-items: center;
            background: var(--bg);
            border: 1.5px solid var(--border);
            border-radius: 8px;
            padding: 2px 8px;
            transition: all 0.2s;
          }
          .quickbar-field:focus-within {
            border-color: var(--accent-cyan);
            box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.15);
          }
          .field-addon {
            font-size: 0.8rem;
            font-weight: 700;
            color: var(--text-muted);
            padding-left: 6px;
            border-left: 1px solid var(--border);
            margin-left: 6px;
          }
          .quickbar-field input {
            width: 75px;
            border: none;
            background: transparent;
            font-size: 0.88rem;
            font-weight: 800;
            color: var(--text);
            text-align: center;
            outline: none;
            font-family: inherit;
          }
          .field-unit {
            font-size: 0.78rem;
            font-weight: 700;
            color: var(--text-muted);
          }
          .quickbar-reset-btn {
            background: transparent;
            border: 1px dashed var(--border);
            border-radius: 8px;
            color: var(--text-muted);
            font-size: 0.8rem;
            font-weight: 700;
            padding: 6px 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
          }
          .quickbar-reset-btn:hover {
            color: var(--accent-cyan);
            border-color: var(--accent-cyan);
            background: rgba(14, 165, 233, 0.05);
          }

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
                    <td>{claim.claim_date ? new Date(String(claim.claim_date).replace(' ', 'T')).toLocaleDateString('en-GB') : 'غير متوفر'}</td>
                    <td>{claim.document?.insurance_number || claim.document_manual_data?.insurance_number || (claim.additional_documents && claim.additional_documents[0]?.insurance_number) || 'غير متوفر'}</td>
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
                        <button
                          className="action-btn"
                          title="+ إضافة تسوية جديدة"
                          onClick={() => handleOpenSettlementModal(claim.id)}
                          style={{ color: '#0369a1', background: '#e0f2fe' }}
                        >
                          <i className="fa-solid fa-handshake"></i>
                        </button>
                        <Link to={`/claims/${claim.id}`} className="action-btn view" title="عرض التفاصيل">
                          <i className="fa-solid fa-eye"></i>
                        </Link>
                        {(() => {
                          const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                          const canCancelPayment = currentUser.is_admin || 
                            (currentUser.authorized_documents && (
                              currentUser.authorized_documents.includes('إلغاء تسديد التعويضات') || 
                              currentUser.authorized_documents.includes('التعويضات') || 
                              currentUser.authorized_documents.includes('تسديد التعويضات') || 
                              currentUser.authorized_documents.includes('المحاسب المالي') || 
                              currentUser.authorized_documents.includes('الشؤون الفنية')
                            ));

                          const paymentTransfer = claim.transfers?.find((t: any) => t.transfer_type === 'للتسديد - الشؤون المالية' || t.transfer_type === 'تم التسديد');
                          const isPaid = claim.status === 'مدفوع' || claim.status === 'للتسديد - الشؤون المالية' || paymentTransfer || claim.total_paid;

                          if (isPaid && canCancelPayment) {
                            return (
                              <button
                                className="action-btn"
                                title="إلغاء التسديد وإعادة الملف كغير مسدد"
                                onClick={() => handleCancelPayment(claim.id)}
                                style={{ color: '#dc2626', background: '#fee2e2' }}
                              >
                                <i className="fa-solid fa-rotate-left"></i>
                              </button>
                            );
                          }
                          return null;
                        })()}
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

            {showSettlementModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--panel, #fff)', borderRadius: '16px', width: '100%', maxWidth: '560px', padding: '28px', boxShadow: '0 25px 60px rgba(0,0,0,0.25)', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '14px' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.2rem', color: '#0f172a' }}>
                <i className="fa-solid fa-handshake me-2" style={{ color: '#0ea5e9' }}></i>
                إضافة تسوية جديدة
              </h3>
              <button onClick={() => setShowSettlementModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#94a3b8' }}>×</button>
            </div>
            <form onSubmit={handleSubmitSettlement}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontWeight: 800, fontSize: '0.85rem', display: 'block', marginBottom: '4px', color: '#334155' }}>تاريخ التسوية</label>
                  <input type="date" required className="premium-field" value={settlementData.settlement_date}
                    onChange={e => setSettlementData({ ...settlementData, settlement_date: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'Cairo, sans-serif' }} />
                </div>
                <div>
                  <label style={{ fontWeight: 800, fontSize: '0.85rem', display: 'block', marginBottom: '4px', color: '#334155' }}>رقم التسوية</label>
                  <input type="text" required className="premium-field" placeholder="رقم التسوية..." value={settlementData.settlement_number}
                    onChange={e => setSettlementData({ ...settlementData, settlement_number: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'Cairo, sans-serif' }} />
                </div>
                <div>
                  <label style={{ fontWeight: 800, fontSize: '0.85rem', display: 'block', marginBottom: '4px', color: '#334155' }}>مقدم التسوية</label>
                  <input type="text" className="premium-field" placeholder="اسم مقدم التسوية..." value={settlementData.settlement_presenter}
                    onChange={e => setSettlementData({ ...settlementData, settlement_presenter: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'Cairo, sans-serif' }} />
                </div>
                <div>
                  <label style={{ fontWeight: 800, fontSize: '0.85rem', display: 'block', marginBottom: '4px', color: '#334155' }}>مدير اللجنة</label>
                  <input type="text" className="premium-field" placeholder="اسم مدير اللجنة..." value={settlementData.committee_manager}
                    onChange={e => setSettlementData({ ...settlementData, committee_manager: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'Cairo, sans-serif' }} />
                </div>
                <div>
                  <label style={{ fontWeight: 800, fontSize: '0.85rem', display: 'block', marginBottom: '4px', color: '#0369a1' }}>مبلغ الأضرار (د.ت)</label>
                  <input type="text" className="premium-field" placeholder="المبلغ بالدينار التونسي..." value={settlementData.tnd_amount}
                    onChange={e => {
                      const val = e.target.value;
                      const num = parseFloat(val);
                      const autoLyd = !isNaN(num) && num > 0 ? (num * (exchangeRates.tnd_to_lyd || 2.30)).toFixed(3) : settlementData.lyd_amount;
                      setSettlementData({ ...settlementData, tnd_amount: val, lyd_amount: autoLyd });
                    }}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #7dd3fc', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'Cairo, sans-serif', background: '#f0f9ff' }} />
                </div>
                <div>
                  <label style={{ fontWeight: 800, fontSize: '0.85rem', display: 'block', marginBottom: '4px', color: '#059669' }}>قيمة التقييم (د.ل)</label>
                  <input type="text" className="premium-field" placeholder="القيمة بالدينار الليبي..." value={settlementData.lyd_amount}
                    onChange={e => setSettlementData({ ...settlementData, lyd_amount: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #6ee7b7', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'Cairo, sans-serif', background: '#ecfdf5' }} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.85rem', display: 'block', marginBottom: '4px', color: '#0369a1' }}>
                    <i className="fa-solid fa-paperclip me-1"></i>
                    إرفاق صورة / مستند التسوية (مطلوب للتوثيق)
                  </label>
                  <input type="file" accept="image/*,.pdf" className="premium-field"
                    onChange={e => setSettlementImage(e.target.files?.[0] || null)}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px dashed #38bdf8', borderRadius: '8px', fontSize: '0.85rem', fontFamily: 'Cairo, sans-serif', background: '#f0f9ff' }} />
                  {settlementImage && (
                    <div style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '4px', fontWeight: 700 }}>
                      <i className="fa-solid fa-check-circle me-1"></i>
                      تم اختيار الملف: {settlementImage.name}
                    </div>
                  )}
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 800, fontSize: '0.85rem', display: 'block', marginBottom: '4px', color: '#334155' }}>تقرير / ملاحظات التسوية</label>
                  <textarea className="premium-field" placeholder="تفاصيل التسوية وأي ملاحظات..." value={settlementData.manager_report}
                    onChange={e => setSettlementData({ ...settlementData, manager_report: e.target.value })}
                    rows={3}
                    style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'Cairo, sans-serif', resize: 'vertical' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <button type="button" onClick={() => setShowSettlementModal(false)}
                  style={{ padding: '10px 24px', borderRadius: '10px', border: '1.5px solid #cbd5e1', background: '#f8fafc', fontFamily: 'Cairo, sans-serif', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                  إلغاء
                </button>
                <button type="submit" disabled={settlementLoading}
                  style={{ padding: '10px 28px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: '#fff', fontFamily: 'Cairo, sans-serif', fontWeight: 800, cursor: 'pointer', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-handshake"></i>
                  {settlementLoading ? 'جاري الحفظ...' : 'حفظ التسوية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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





