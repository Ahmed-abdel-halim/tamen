import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';

interface BranchAgent {
  id: number;
  agency_name: string;
  agent_name: string;
  code: string;
  phone?: string;
}

interface Voucher {
  id: number;
  voucher_number: string;
  agent_id: number;
  agent_name: string;
  agent_phone?: string;
  amount: number;
  payment_method: string;
  bank_name?: string;
  reference_number?: string;
  extra_details?: any;
  payment_date: string;
  notes: string;
  created_at: string;
  agent_type?: string;
}

export default function PaymentVouchers() {
  const [agents, setAgents] = useState<BranchAgent[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [selectedAgent, setSelectedAgent] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('نقدي');
  const [bankName, setBankName] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [customMethod, setCustomMethod] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [voucherNumber, setVoucherNumber] = useState('');

  // Custom searchable dropdown states
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState(false);
  const [agentSearchText, setAgentSearchText] = useState('');
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  // Filter States
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, agent, employee
  const [filterMethod, setFilterMethod] = useState('all'); // all, نقدي, شيك, تحويل, أخرى
  const [filterAgentId, setFilterAgentId] = useState('all'); // specific agent ID or 'all'
  const [isFilterAgentDropdownOpen, setIsFilterAgentDropdownOpen] = useState(false);
  const [filterAgentSearchText, setFilterAgentSearchText] = useState('');
  const filterAgentDropdownRef = useRef<HTMLDivElement>(null);


  const resolveImageUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${window.location.origin}/${cleanPath}`;
  };

  const filteredVouchers = React.useMemo(() => {
    return vouchers.filter(v => {
      // Date From
      if (filterDateFrom && v.payment_date < filterDateFrom) return false;
      // Date To
      if (filterDateTo && v.payment_date > filterDateTo) return false;
      
      // Search
      if (filterSearch) {
        const search = filterSearch.toLowerCase();
        const matchesName = v.agent_name?.toLowerCase().includes(search);
        const matchesNum = v.voucher_number?.toLowerCase().includes(search);
        const matchesNotes = v.notes?.toLowerCase().includes(search);
        if (!matchesName && !matchesNum && !matchesNotes) return false;
      }
      
      // Agent ID filter
      if (filterAgentId !== 'all') {
        if (String(v.agent_id) !== String(filterAgentId)) return false;
      }
      
      // Agent Type
      if (filterType === 'agent') {
        if (v.agent_type !== 'وكيل') return false;
      } else if (filterType === 'employee') {
        if (v.agent_type !== 'فرع من شركة' && v.agent_type !== 'موظف') return false;
      }
      
      // Payment Method
      if (filterMethod !== 'all') {
        if (filterMethod === 'أخرى') {
          if (v.payment_method === 'نقدي' || v.payment_method === 'شيك' || v.payment_method === 'تحويل') return false;
        } else {
          if (v.payment_method !== filterMethod) return false;
        }
      }
      
      return true;
    });
  }, [vouchers, filterDateFrom, filterDateTo, filterSearch, filterType, filterMethod, filterAgentId]);

  useEffect(() => {
    fetchAgents();
    fetchVouchers();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setIsAgentDropdownOpen(false);
      }
      if (filterAgentDropdownRef.current && !filterAgentDropdownRef.current.contains(event.target as Node)) {
        setIsFilterAgentDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/branches-agents`);
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      showToast('حدث خطأ أثناء جلب الوكلاء', 'error');
    }
  };

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/payment-vouchers`);
      if (response.ok) {
        const data = await response.json();
        const mappedVouchers = data.map((v: any) => ({
          id: v.id,
          voucher_number: v.voucher_number,
          agent_id: v.branch_agent_id,
          agent_name: v.agent?.agency_name || 'وكيل مجهول',
          agent_phone: v.agent?.phone || '',
          amount: parseFloat(v.amount),
          payment_method: v.payment_method,
          payment_date: v.payment_date,
          notes: v.notes || '',
          bank_name: v.bank_name || '',
          reference_number: v.reference_number || '',
          created_at: v.created_at,
          agent_type: v.agent?.type || 'وكيل'
        }));
        setVouchers(mappedVouchers);
      }
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      showToast('حدث خطأ أثناء جلب إيصالات القبض', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (voucher: Voucher | null = null) => {
    if (voucher) {
      setEditingVoucher(voucher);
      setSelectedAgent(voucher.agent_id.toString());
      setAmount(voucher.amount.toString());
      setPaymentMethod(voucher.payment_method);
      setBankName(voucher.bank_name || '');
      setRefNumber(voucher.reference_number || '');
      setCustomMethod('');
      setPaymentDate(voucher.payment_date);
      setNotes(voucher.notes);
      setVoucherNumber(voucher.voucher_number);
    } else {
      setEditingVoucher(null);
      setSelectedAgent('');
      setAmount('');
      setPaymentMethod('نقدي');
      setBankName('');
      setRefNumber('');
      setCustomMethod('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setVoucherNumber(`PV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    }
    setShowModal(true);
  };

  const handleCreateVoucher = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedAgent || !amount) return;

    setLoading(true);
    try {
      const url = editingVoucher
        ? `${API_BASE_URL}/payment-vouchers/${editingVoucher.id}`
        : `${API_BASE_URL}/payment-vouchers`;

      const method = editingVoucher ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voucher_number: voucherNumber,
          branch_agent_id: parseInt(selectedAgent),
          amount: parseFloat(amount),
          payment_method: paymentMethod === 'أخرى' ? customMethod : paymentMethod,
          bank_name: bankName,
          reference_number: refNumber,
          payment_date: paymentDate,
          notes: notes
        }),
      });

      if (response.ok) {
        const savedVoucher = await response.json();
        showToast(editingVoucher ? 'تم تحديث الإيصال بنجاح' : 'تم إصدار الإيصال بنجاح', 'success');
        setShowModal(false);
        fetchVouchers();

        if (!editingVoucher) {
          const agent = agents.find(a => a.id === parseInt(selectedAgent));
          const voucherToShare: Voucher = {
            id: savedVoucher.id,
            voucher_number: voucherNumber,
            agent_id: parseInt(selectedAgent),
            agent_name: agent?.agency_name || 'وكيل',
            agent_phone: agent?.phone || '',
            amount: parseFloat(amount),
            payment_method: paymentMethod === 'أخرى' ? customMethod : paymentMethod,
            payment_date: paymentDate,
            notes: notes,
            created_at: new Date().toISOString()
          };
          handleWhatsAppShare(voucherToShare);
        }
      } else {
        const errData = await response.json().catch(() => ({}));
        showToast(errData.message || 'فشلت العملية', 'error');
      }
    } catch (error) {
      console.error('Error saving voucher:', error);
      showToast('حدث خطأ أثناء الاتصال بالسيرفر', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVoucher = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الإيصال؟')) return;

    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;

      const headers: HeadersInit = {};
      if (userId) headers['X-User-Id'] = userId.toString();

      const response = await fetch(`${API_BASE_URL}/payment-vouchers/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (response.ok) {
        showToast('تم حذف الإيصال بنجاح', 'success');
        fetchVouchers();
      } else {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.message || errData.error || `خطأ ${response.status}`;
        console.error('Delete error from server:', errMsg);
        showToast(errMsg, 'error');
      }
    } catch (error) {
      console.error('Error deleting voucher:', error);
      showToast('حدث خطأ أثناء الاتصال بالسيرفر', 'error');
    }
  };

  const handlePrintVoucher = (voucher: Voucher) => {
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (!printWindow) {
      alert('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return;
    }

    const logoUrl = `${window.location.origin}/img/logo.png`;
    const fallbackLogo = `${window.location.origin}/img/official_logo.PNG`;

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <title>إيصال قبض - ${voucher.voucher_number}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body {
      font-family: 'Cairo', 'Tahoma', sans-serif;
      direction: rtl;
      background: #fff;
      color: #0f172a;
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      overflow: hidden;
    }

    /* ── Watermark ── */
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 90px;
      font-weight: 900;
      color: rgba(1,76,177,0.04);
      white-space: nowrap;
      pointer-events: none;
      z-index: 0;
      user-select: none;
    }

    /* ── Stripes ── */
    .top-stripe, .bottom-stripe {
      height: 8px;
      background: linear-gradient(90deg, #014cb1 0%, #0ea5e9 50%, #014cb1 100%);
    }
    .bottom-stripe { height: 6px; margin-top: 14px; }

    /* ── Content wrapper ── */
    .content { padding: 16px 22px; position: relative; z-index: 1; }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .company-side { display: flex; align-items: center; gap: 12px; }
    .logo { height: 75px; width: auto; object-fit: contain; }
    .company-name { font-size: 17px; font-weight: 900; color: #014cb1; }
    .company-sub { font-size: 10px; color: #64748b; font-weight: 600; margin-top: 3px; }
    .company-contact { display: flex; gap: 10px; font-size: 9.5px; color: #94a3b8; font-weight: 600; margin-top: 5px; flex-wrap: wrap; }
    .title-side { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 5px; }
    .title-ar { font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: 1px; }
    .title-en { font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 3px; text-transform: uppercase; }
    .num-badge {
      margin-top: 6px;
      background: #014cb1;
      color: #fff;
      font-size: 13px;
      font-weight: 900;
      padding: 5px 22px;
      border-radius: 20px;
      display: inline-block;
    }

    /* ── Divider ── */
    .divider {
      height: 3px;
      background: linear-gradient(90deg, transparent, #014cb1 20%, #22d3ee 50%, #014cb1 80%, transparent);
      border-radius: 4px;
      margin: 12px 0;
    }

    /* ── Info Grid ── */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 10px;
      margin-bottom: 10px;
    }
    .info-cell {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
    }
    .info-label { font-size: 10.5px; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .info-value { font-size: 14px; font-weight: 900; color: #0f172a; }
    .ref-val { color: #dc2626; letter-spacing: 1px; }

    /* ── Full rows ── */
    .row-full {
      display: flex;
      align-items: center;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      gap: 14px;
      margin-bottom: 10px;
    }
    .row-label {
      font-size: 12px;
      font-weight: 800;
      color: #1e3a8a;
      white-space: nowrap;
      min-width: 150px;
      border-left: 2.5px solid #014cb1;
      padding-left: 12px;
    }
    .row-value { font-size: 15px; font-weight: 800; color: #0f172a; flex: 1; }
    .agent-name { font-size: 18px !important; font-weight: 900 !important; }

    /* ── Amount Box ── */
    .amount-box {
      display: flex;
      align-items: center;
      background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
      border: 2.5px solid #014cb1;
      border-radius: 12px;
      padding: 18px 20px;
      gap: 16px;
      margin-bottom: 10px;
      position: relative;
      overflow: hidden;
    }
    .amount-box::after {
      content: '';
      position: absolute;
      left: -20px;
      top: 50%;
      transform: translateY(-50%);
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: rgba(1,76,177,0.05);
    }
    .amount-label-col { min-width: 130px; border-left: 2.5px solid #014cb1; padding-left: 12px; }
    .amount-label { font-size: 13px; font-weight: 800; color: #1e3a8a; }
    .amount-sublabel { font-size: 9px; color: #94a3b8; font-weight: 600; letter-spacing: 1px; margin-top: 2px; }
    .amount-center { flex: 1; text-align: center; }
    .amount-number { font-size: 38px; font-weight: 900; color: #15803d; line-height: 1; }
    .amount-right { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
    .amount-currency {
      font-size: 13px; font-weight: 800; color: #334155;
      background: #fff; border: 1px solid #e2e8f0;
      border-radius: 6px; padding: 4px 12px;
    }
    .amount-only {
      font-size: 10px; font-weight: 700; color: #94a3b8;
      border: 1px dashed #cbd5e1; border-radius: 4px; padding: 2px 8px;
    }

    /* ── Signatures ── */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
      margin-top: 28px;
    }
    .sig-col { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .sig-space { height: 55px; }
    .sig-line { width: 90%; height: 1.5px; background: #014cb1; }
    .sig-label { font-size: 12px; font-weight: 900; color: #1e3a8a; text-align: center; }
    .stamp-circle {
      width: 80px; height: 80px;
      border: 2.5px dashed #94a3b8;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; color: #94a3b8; font-weight: 700;
      text-align: center; line-height: 1.4;
    }

    /* ── Footer ── */
    .footer {
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      padding: 10px 0 0;
      font-size: 9.5px;
      color: #64748b;
      font-weight: 600;
      border-top: 1px solid #e2e8f0;
      margin-top: 14px;
    }

    /* ── Print button (screen only) ── */
    .print-btn {
      display: block;
      margin: 20px auto;
      padding: 12px 40px;
      background: #014cb1;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-family: 'Cairo', sans-serif;
      font-size: 16px;
      font-weight: 800;
      cursor: pointer;
    }
    @media print { .print-btn { display: none !important; } }
  </style>
</head>
<body>
  <div class="watermark">المدار الليبي للتأمين</div>

  <div class="top-stripe"></div>

  <div class="content">

    <!-- HEADER -->
    <div class="header">
      <div class="company-side">
        <img class="logo" src="${logoUrl}" alt="Logo" onerror="this.src='${fallbackLogo}'" />
        <div>
          <div class="company-name">شركة المدار الليبي للتأمين</div>
          <div class="company-sub">شركة مساهمة ليبية للتأمين وإعادة التأمين</div>
          <div class="company-contact">
            <span>📞 218+920003366</span>
            <span>✉ info@mli.ly</span>
            <span>📍 طرابلس - حي الأندلس</span>
          </div>
        </div>
      </div>
      <div class="title-side">
        <div class="title-ar">إيـصال قبـض مالي</div>
        <div class="title-en">PAYMENT RECEIPT</div>
        <div class="num-badge">رقم: ${voucher.voucher_number}</div>
      </div>
    </div>

    <!-- DIVIDER -->
    <div class="divider"></div>

    <!-- INFO GRID -->
    <div class="info-grid">
      <div class="info-cell">
        <div class="info-label">📅 تاريخ القبض</div>
        <div class="info-value">${voucher.payment_date}</div>
      </div>
      <div class="info-cell">
        <div class="info-label">💳 طريقة الدفع</div>
        <div class="info-value">${voucher.payment_method}</div>
      </div>
      ${voucher.bank_name ? `<div class="info-cell"><div class="info-label">🏦 المصرف</div><div class="info-value">${voucher.bank_name}</div></div>` : ''}
      ${voucher.reference_number ? `<div class="info-cell"><div class="info-label">🔖 رقم المرجع</div><div class="info-value ref-val">${voucher.reference_number}</div></div>` : ''}
    </div>

    <!-- RECEIVED FROM -->
    <div class="row-full">
      <div class="row-label">وصلنا من السيد / المكتب</div>
      <div class="row-value agent-name">${voucher.agent_name}</div>
    </div>

    <!-- AMOUNT -->
    <div class="amount-box">
      <div class="amount-label-col">
        <div class="amount-label">مبلغاً وقدره</div>
        <div class="amount-sublabel">Amount Received</div>
      </div>
      <div class="amount-center">
        <div class="amount-number">${voucher.amount.toLocaleString('ar-LY')}</div>
      </div>
      <div class="amount-right">
        <div class="amount-currency">دينار ليبي</div>
        <div class="amount-only">فقط لا غير ✓</div>
      </div>
    </div>

    <!-- NOTES -->
    <div class="row-full">
      <div class="row-label">وذلك مقابل</div>
      <div class="row-value">${voucher.notes || 'تسديد رصيد تأمينات صادرة'}</div>
    </div>

    <!-- SIGNATURES -->
    <div class="signatures">
      <div class="sig-col">
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-label">توقيع المستلم</div>
      </div>
      <div class="sig-col">
        <div class="stamp-circle">الختم<br/>الرسمي</div>
        <div class="sig-label">اعتماد الخزينة</div>
      </div>
      <div class="sig-col">
        <div class="sig-space"></div>
        <div class="sig-line"></div>
        <div class="sig-label">المحاسب المسؤول</div>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <span>📍 طرابلس - ليبيا / حي الأندلس</span>
      <span>📞 218+ 920003366</span>
      <span>✉ info@mli.ly</span>
      <span>🌐 www.mli.ly</span>
    </div>

  </div>

  <div class="bottom-stripe"></div>

  <button class="print-btn" onclick="window.print(); window.onafterprint = () => window.close();">
    🖨️ طباعة الإيصال
  </button>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        window.onafterprint = function() { window.close(); };
      }, 600);
    };
  </script>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleWhatsAppShare = (voucher: Voucher) => {
    const message = `*المدار الليبي للتأمين* 🏢%0A` +
      `*إيصال قبض مالي جديد*%0A%0A` +
      `📌 *رقم الإيصال:* ${voucher.voucher_number}%0A` +
      `👤 *السيد / المكتب:* ${voucher.agent_name}%0A` +
      `💰 *المبلغ:* ${voucher.amount.toLocaleString()} د.ل%0A` +
      `📅 *التاريخ:* ${voucher.payment_date}%0A` +
      `💳 *طريقة الدفع:* ${voucher.payment_method}%0A%0A` +
      `شكراً لتعاملكم معنا. ✨`;

    let cleanPhone = (voucher.agent_phone || '').replace(/\D/g, '');
    if (cleanPhone.startsWith('09')) {
      cleanPhone = '218' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('9')) {
      cleanPhone = '218' + cleanPhone;
    }

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrintAgentsRevenue = async () => {
    try {
      showToast('جاري تجهيز تقرير إيرادات الوكلاء...', 'success');
      const response = await fetch(`${API_BASE_URL}/financial-statistics/all-agents-revenue`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      const printWindow = window.open('', '', 'width=1200,height=900');
      if (!printWindow) {
        showToast('يرجى السماح بالنوافذ المنبثقة للطباعة', 'error');
        return;
      }

      const rows = data.agents.map((agent: any, idx: number) => `
        <tr>
          <td>${idx + 1}</td>
          <td style="font-weight: bold; text-align: right;">${agent.agency_name}</td>
          <td style="text-align: right;">${agent.agent_name || '-'}</td>
          <td>${agent.document_count}</td>
          <td style="font-weight: bold; color: #014cb1;">${agent.sales.toLocaleString()} د.ل</td>
        </tr>
      `).join('');

      printWindow.document.write(`
        <html dir="rtl">
        <head>
          <title>تقرير إيرادات جميع الوكلاء</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
            @media print { 
              @page { margin: 10mm; } 
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
            body { font-family: 'Cairo', sans-serif; margin: 20px; padding: 20px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #0ea5e9; padding-bottom: 15px; }
            .header h1 { margin: 0; color: #0ea5e9; font-size: 24px; font-weight: 900; }
            .meta-info { margin-bottom: 20px; font-size: 14px; color: #64748b; font-weight: 600; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-size: 13px; }
            th { background: #f8fafc; font-weight: 900; color: #0ea5e9; }
            .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; }
            .total-row { background: #f0f9ff; font-weight: 900; }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 500);">
          <div class="header">
            <div>
              <h1>شركة المدار الليبي للتأمين</h1>
              <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #334155;">تقرير إيرادات جميع الوكلاء</p>
            </div>
            <img src="/img/logo.png" style="height: 70px;">
          </div>
          <div class="meta-info">
            <div>
              <strong>تاريخ التقرير:</strong> ${new Date().toLocaleString('ar-LY')}
            </div>
            <div>
              <strong>إجمالي الإيرادات:</strong> ${data.total_revenue.toLocaleString()} د.ل &nbsp;|&nbsp; <strong>عدد الوكلاء:</strong> ${data.agents.length}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 30%; text-align: right;">اسم الوكالة</th>
                <th style="width: 25%; text-align: right;">اسم الوكيل</th>
                <th style="width: 15%;">عدد الوثائق</th>
                <th style="width: 25%;">إجمالي الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3" style="text-align: right; padding-right: 20px;">المجموع الكلي</td>
                <td>${data.agents.reduce((acc: any, a: any) => acc + a.document_count, 0)}</td>
                <td>${data.total_revenue.toLocaleString()} د.ل</td>
              </tr>
            </tfoot>
          </table>
          <div class="footer">
            تم استخراج هذا التقرير آلياً من نظام المدار الليبي للتأمين - ${new Date().toLocaleString('ar-LY')}
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error('Error printing agents revenue:', error);
      showToast('حدث خطأ أثناء إعداد التقرير للطباعة', 'error');
    }
  };

  const handlePrintFilteredVouchers = () => {
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) {
      showToast('يرجى السماح بالنوافذ المنبثقة للطباعة', 'error');
      return;
    }

    const rows = filteredVouchers.map((v, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-weight: bold;">${v.voucher_number}</td>
        <td style="text-align: right; font-weight: bold;">${v.agent_name}</td>
        <td>${v.agent_type || 'وكيل'}</td>
        <td style="font-weight: bold; color: #139625;">${v.amount.toLocaleString()} د.ل</td>
        <td>${v.payment_method}</td>
        <td>${v.payment_date}</td>
        <td style="text-align: right; font-size: 11px; max-width: 200px; word-wrap: break-word;">${v.notes || '-'}</td>
      </tr>
    `).join('');

    const totalAmount = filteredVouchers.reduce((sum, v) => sum + v.amount, 0);

    const reportRange = (filterDateFrom || filterDateTo)
      ? `الفترة: ${filterDateFrom || '-'} إلى ${filterDateTo || '-'}`
      : 'كافة الفترات';

    const providerTypeLabel = filterType === 'all'
      ? 'جميع الجهات'
      : (filterType === 'agent' ? 'الوكلاء فقط' : 'الموظفين والفروع فقط');

    const selectedAgentName = filterAgentId !== 'all'
      ? (agents.find(a => String(a.id) === String(filterAgentId))?.agency_name || '')
      : 'جميع الوكلاء';

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>تقرير إيصالات القبض المالي</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          @media print { 
            @page { margin: 10mm; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { font-family: 'Cairo', sans-serif; margin: 20px; padding: 20px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #139625; padding-bottom: 15px; }
          .header h1 { margin: 0; color: #139625; font-size: 24px; font-weight: 900; }
          .meta-info { margin-bottom: 20px; font-size: 13px; color: #475569; font-weight: 600; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 10px 15px; border-radius: 8px; border: 1px solid #e2e8f0; flex-wrap: wrap; gap: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: center; font-size: 12px; }
          th { background: #f1f5f9; font-weight: 900; color: #1e293b; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          .total-row { background: #f0fdf4; font-weight: 900; }
        </style>
      </head>
      <body onload="setTimeout(() => { window.print(); window.close(); }, 500);">
        <div class="header">
          <div>
            <h1>شركة المدار الليبي للتأمين</h1>
            <p style="margin: 5px 0 0; font-size: 18px; font-weight: bold; color: #334155;">تقرير إيصالات القبض المالي</p>
          </div>
          <img src="/img/logo.png" style="height: 70px;" onerror="this.src='/img/official_logo.PNG'">
        </div>
        <div class="meta-info">
          <div>
            <strong>تاريخ التقرير:</strong> ${new Date().toLocaleString('ar-LY')}
          </div>
          <div>
            <strong>نطاق التصفية:</strong> ${reportRange} &nbsp;|&nbsp; <strong>الوكيل:</strong> ${selectedAgentName} &nbsp;|&nbsp; <strong>نوع الجهة:</strong> ${providerTypeLabel}
          </div>
          <div>
            <strong>إجمالي المقبوضات:</strong> ${totalAmount.toLocaleString()} د.ل &nbsp;|&nbsp; <strong>عدد الإيصالات:</strong> ${filteredVouchers.length}
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th style="width: 15%;">رقم الإيصال</th>
              <th style="width: 25%; text-align: right;">اسم المورد / الوكيل</th>
              <th style="width: 10%;">النوع</th>
              <th style="width: 15%;">المبلغ</th>
              <th style="width: 10%;">طريقة الدفع</th>
              <th style="width: 12%;">التاريخ</th>
              <th style="width: 18%; text-align: right;">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length > 0 ? rows : '<tr><td colspan="8">لا توجد إيصالات قبض مطابقة للفلاتر المحددة</td></tr>'}
          </tbody>
          ${rows.length > 0 ? `
          <tfoot>
            <tr class="total-row">
              <td colspan="4" style="text-align: right; padding-right: 20px;">المجموع الكلي</td>
              <td style="color: #139625;">${totalAmount.toLocaleString()} د.ل</td>
              <td colspan="3"></td>
            </tr>
          </tfoot>` : ''}
        </table>
        <div class="footer">
          تم استخراج هذا التقرير آلياً من نظام المدار الليبي للتأمين - ${new Date().toLocaleString('ar-LY')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb no-print" style={{
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
          <i className="fa-solid fa-receipt" style={{ marginLeft: '10px', color: '#139625' }}></i>
          نظام إيصالات القبض المالي
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handlePrintFilteredVouchers}
            className="secondary"
            style={{
              padding: '10px 20px', borderRadius: '10px',
              fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
              border: '1px solid var(--border)',
              background: '#139625',
              color: '#fff'
            }}
          >
            <i className="fa-solid fa-print"></i>
            طباعة كشف الإيصالات
          </button>
          <button
            onClick={handlePrintAgentsRevenue}
            className="secondary"
            style={{
              padding: '10px 20px', borderRadius: '10px',
              fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
              border: '1px solid var(--border)',
              background: '#0ea5e9',
              color: '#fff'
            }}
          >
            <i className="fa-solid fa-print"></i>
            تقرير الإيرادات
          </button>
          <button
            onClick={async () => {
              const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
              try {
                const columns = [
                  { header: 'رقم الإيصال', key: 'voucher_number', width: 20 },
                  { header: 'اسم الوكيل', key: 'agent_name', width: 35 },
                  { header: 'المبلغ', key: 'amount', width: 20 },
                  { header: 'طريقة الدفع', key: 'payment_method', width: 20 },
                  { header: 'التاريخ', key: 'payment_date', width: 20 },
                  { header: 'ملاحظات', key: 'notes', width: 35 },
                ];

                const data = filteredVouchers.map((v) => ({
                  voucher_number: v.voucher_number,
                  agent_name: v.agent_name,
                  amount: v.amount.toLocaleString() + ' د.ل',
                  payment_method: v.payment_method,
                  payment_date: v.payment_date,
                  notes: v.notes || '-',
                }));

                // Summary row
                data.push({
                  voucher_number: 'الإجمالي',
                  agent_name: '',
                  amount: filteredVouchers.reduce((sum, v) => sum + v.amount, 0).toLocaleString() + ' د.ل',
                  payment_method: '',
                  payment_date: '',
                  notes: '',
                });

                await generatePremiumExcel({
                  title: 'شركة المدار الليبي للتأمين - سجل إيصالات القبض المالي',
                  subtitle: `الوكيل: ${filterAgentId !== 'all' ? (agents.find(a => String(a.id) === String(filterAgentId))?.agency_name || '') : 'الكل'} - إجمالي المقبوضات: ${filteredVouchers.reduce((sum, v) => sum + v.amount, 0).toLocaleString()} د.ل - عدد الإيصالات: ${filteredVouchers.length}`,
                  columns,
                  data,
                  fileName: 'إيصالات_القبض',
                  qrData: `إيصالات القبض - شركة المدار الليبي\nعدد الإيصالات: ${filteredVouchers.length}\nإجمالي: ${filteredVouchers.reduce((sum, v) => sum + v.amount, 0).toLocaleString()} د.ل\nبواسطة: ${currentUser.name || 'النظام'}`
                });

                showToast('تم تصدير سجل الإيصالات بنجاح', 'success');
              } catch (error) {
                showToast('حدث خطأ أثناء تصدير التقرير', 'error');
              }
            }}
            className="secondary"
            style={{
              padding: '10px 20px', borderRadius: '10px',
              fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
              border: '1px solid var(--border)'
            }}
          >
            <i className="fa-solid fa-file-excel" style={{ color: '#166534' }}></i>
            تصدير إكسيل
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="primary"
            style={{
              padding: '10px 20px', borderRadius: '10px',
              fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <i className="fa-solid fa-plus"></i>
            إصدار إيصال جديد
          </button>
        </div>
      </div>

      {/* فلترة وبحث الإيصالات */}
      <div className="no-print" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        background: 'var(--panel)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        marginBottom: '20px'
      }}>
        {/* البحث السريع */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>البحث السريع</label>
          <input
            type="text"
            placeholder="ابحث بالاسم، رقم الإيصال..."
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--card-bg)',
              color: 'var(--text)',
              fontSize: 14,
              minHeight: 42,
            }}
          />
        </div>

        {/* اختيار الوكيل (البحث السريع) */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>الوكيل / المورد</label>
          <div ref={filterAgentDropdownRef} style={{ position: 'relative' }}>
            {/* Select Trigger */}
            <div
              onClick={() => setIsFilterAgentDropdownOpen(!isFilterAgentDropdownOpen)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--card-bg)',
                color: 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                minHeight: 42,
                fontSize: 14,
              }}
            >
              <span>
                {filterAgentId !== 'all'
                  ? agents.find(a => String(a.id) === String(filterAgentId))?.agency_name
                  : 'الكل (جميع الوكلاء)'}
              </span>
              <i className={`fa-solid fa-chevron-${isFilterAgentDropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '12px', color: 'var(--muted)' }}></i>
            </div>

            {/* Dropdown Panel */}
            {isFilterAgentDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '105%',
                  left: 0,
                  right: 0,
                  background: 'var(--panel)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  padding: '8px',
                  maxHeight: '300px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {/* Search Input inside dropdown */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    autoFocus
                    placeholder="ابحث باسم الوكالة أو الكود..."
                    value={filterAgentSearchText}
                    onChange={(e) => setFilterAgentSearchText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 10px 10px 35px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                  <i
                    className="fa-solid fa-magnifying-glass"
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--muted)',
                      fontSize: '14px',
                    }}
                  ></i>
                </div>

                {/* Options List */}
                <div
                  style={{
                    overflowY: 'auto',
                    maxHeight: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Default "All" option */}
                  <div
                    onClick={() => {
                      setFilterAgentId('all');
                      setIsFilterAgentDropdownOpen(false);
                      setFilterAgentSearchText('');
                    }}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'var(--text)',
                      background: filterAgentId === 'all' ? 'rgba(1, 76, 177, 0.1)' : 'transparent',
                      fontWeight: filterAgentId === 'all' ? 'bold' : 'normal',
                      transition: 'background 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      direction: 'rtl'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = filterAgentId === 'all' ? 'rgba(1, 76, 177, 0.1)' : 'transparent'}
                  >
                    <span>الكل (جميع الوكلاء)</span>
                  </div>

                  {/* Filtered agents list */}
                  {agents.filter(agent => {
                    const query = filterAgentSearchText.toLowerCase();
                    return (
                      agent.agency_name?.toLowerCase().includes(query) ||
                      agent.code?.toLowerCase().includes(query) ||
                      agent.agent_name?.toLowerCase().includes(query)
                    );
                  }).map(agent => (
                    <div
                      key={agent.id}
                      onClick={() => {
                        setFilterAgentId(String(agent.id));
                        setIsFilterAgentDropdownOpen(false);
                        setFilterAgentSearchText('');
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        color: 'var(--text)',
                        background: String(agent.id) === String(filterAgentId) ? 'rgba(1, 76, 177, 0.1)' : 'transparent',
                        fontWeight: String(agent.id) === String(filterAgentId) ? 'bold' : 'normal',
                        transition: 'background 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        direction: 'rtl'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = String(agent.id) === String(filterAgentId) ? 'rgba(1, 76, 177, 0.1)' : 'transparent'}
                    >
                      <span>{agent.agency_name}</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--border)', padding: '2px 6px', borderRadius: '4px' }}>
                        {agent.code}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* من تاريخ */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>من تاريخ</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--card-bg)',
              color: 'var(--text)',
              fontSize: 14,
              minHeight: 42,
            }}
          />
        </div>

        {/* إلى تاريخ */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>إلى تاريخ</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--card-bg)',
              color: 'var(--text)',
              fontSize: 14,
              minHeight: 42,
            }}
          />
        </div>

        {/* نوع المورد */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>نوع الجهة (المورد)</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--card-bg)',
              color: 'var(--text)',
              fontSize: 14,
              minHeight: 42,
            }}
          >
            <option value="all">الكل</option>
            <option value="agent">الوكلاء فقط</option>
            <option value="employee">الموظفين والفروع فقط</option>
          </select>
        </div>

        {/* طريقة الدفع */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px', display: 'block' }}>طريقة الدفع</label>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
              background: 'var(--card-bg)',
              color: 'var(--text)',
              fontSize: 14,
              minHeight: 42,
            }}
          >
            <option value="all">الكل</option>
            <option value="نقدي">نقدي</option>
            <option value="شيك">شيك</option>
            <option value="تحويل">تحويل</option>
            <option value="أخرى">أخرى</option>
          </select>
        </div>

        {/* إعادة تعيين */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            onClick={() => {
              setFilterSearch('');
              setFilterDateFrom('');
              setFilterDateTo('');
              setFilterType('all');
              setFilterMethod('all');
              setFilterAgentId('all');
            }}
            className="secondary"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card-bg)',
              color: 'var(--text)',
              fontWeight: 'bold',
              minHeight: 42,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <i className="fa-solid fa-arrow-rotate-left"></i>
            تصفية
          </button>
        </div>
      </div>

      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>إجمالي المقبوضات (المصفاة)</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#139625' }}>
            {filteredVouchers.reduce((sum, v) => sum + v.amount, 0).toLocaleString()} د.ل
          </div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>عدد الإيصالات المصفاة</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#014cb1' }}>{filteredVouchers.length} إيصال</div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>آخر عملية توريد مصفاة</div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>{filteredVouchers[0]?.agent_name || '-'}</div>
        </div>
      </div>

      <div className="users-card no-print" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>رقم الإيصال</th>
                <th>اسم الوكيل</th>
                <th>المبلغ</th>
                <th>طريقة الدفع</th>
                <th>التاريخ</th>
                <th className="no-print">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredVouchers.map((voucher) => (
                <tr key={voucher.id}>
                  <td style={{ fontWeight: 'bold', color: '#014cb1' }}>{voucher.voucher_number}</td>
                  <td>{voucher.agent_name}</td>
                  <td style={{ color: '#139625', fontWeight: 'bold' }}>{voucher.amount.toLocaleString()} د.ل</td>
                  <td>
                    <span style={{
                      padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
                      background: voucher.payment_method === 'نقدي' ? '#dcfce7' : '#e0f2fe',
                      color: voucher.payment_method === 'نقدي' ? '#166534' : '#0369a1',
                      fontWeight: '800'
                    }}>
                      {voucher.payment_method}
                    </span>
                  </td>
                  <td>{voucher.payment_date}</td>
                  <td className="no-print">
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handlePrintVoucher(voucher)}
                        style={{ background: '#f1f5f9', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer' }}
                        title="طباعة الإيصال"
                      >
                        <i className="fa-solid fa-print"></i>
                      </button>
                      <button
                        onClick={() => handleWhatsAppShare(voucher)}
                        style={{ background: '#dcfce7', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: '#166534' }}
                        title="إرسال عبر واتساب"
                      >
                        <i className="fa-brands fa-whatsapp"></i>
                      </button>
                      <button
                        onClick={() => handleOpenModal(voucher)}
                        style={{ background: '#f0f9ff', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: '#0369a1' }}
                        title="تعديل الإيصال"
                      >
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button
                        onClick={() => handleDeleteVoucher(voucher.id)}
                        style={{ background: '#fef2f2', border: 'none', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', color: '#991b1b' }}
                        title="حذف الإيصال"
                      >
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal no-print" onClick={(e) => {
          if (e.target === e.currentTarget) setShowModal(false);
        }}>
          <div className="modal-content" style={{ width: '550px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>
                {editingVoucher ? 'تعديل إيصال القبض' : 'إصدار إيصال قبض جديد'}
              </h3>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
                aria-label="إغلاق"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} style={{ padding: '24px' }}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>رقم الإيصال</label>
                <input
                  type="text"
                  required
                  value={voucherNumber}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                  disabled
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>اختر الوكيل <span className="required">*</span></label>
                <div ref={agentDropdownRef} style={{ position: 'relative' }}>
                  {/* Select Trigger */}
                  <div
                    onClick={() => setIsAgentDropdownOpen(!isAgentDropdownOpen)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      {selectedAgent 
                        ? agents.find(a => String(a.id) === String(selectedAgent))?.agency_name 
                        : '-- اختر الوكيل --'}
                    </span>
                    <i className={`fa-solid fa-chevron-${isAgentDropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '12px', color: 'var(--muted)' }}></i>
                  </div>

                  {/* Dropdown Panel */}
                  {isAgentDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '105%',
                        left: 0,
                        right: 0,
                        background: 'var(--panel)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        zIndex: 1000,
                        padding: '8px',
                        maxHeight: '300px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {/* Search Input */}
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          autoFocus
                          placeholder="ابحث باسم الوكالة أو الكود..."
                          value={agentSearchText}
                          onChange={(e) => setAgentSearchText(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 10px 10px 35px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            background: 'var(--input-bg)',
                            color: 'var(--text)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                        />
                        <i
                          className="fa-solid fa-magnifying-glass"
                          style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--muted)',
                            fontSize: '14px',
                          }}
                        ></i>
                      </div>

                      {/* Options List */}
                      <div
                        style={{
                          overflowY: 'auto',
                          maxHeight: '200px',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {agents.filter(agent => {
                          const query = agentSearchText.toLowerCase();
                          return (
                            agent.agency_name?.toLowerCase().includes(query) ||
                            agent.code?.toLowerCase().includes(query) ||
                            agent.agent_name?.toLowerCase().includes(query)
                          );
                        }).length === 0 ? (
                          <div style={{ padding: '10px', color: 'var(--muted)', textAlign: 'center', fontSize: '13px' }}>
                            لا يوجد نتائج مطابقة
                          </div>
                        ) : (
                          agents
                            .filter(agent => {
                              const query = agentSearchText.toLowerCase();
                              return (
                                agent.agency_name?.toLowerCase().includes(query) ||
                                agent.code?.toLowerCase().includes(query) ||
                                agent.agent_name?.toLowerCase().includes(query)
                              );
                            })
                            .map(agent => (
                              <div
                                key={agent.id}
                                onClick={() => {
                                  setSelectedAgent(String(agent.id));
                                  setIsAgentDropdownOpen(false);
                                  setAgentSearchText('');
                                }}
                                style={{
                                  padding: '10px 12px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '13px',
                                  color: 'var(--text)',
                                  background: String(agent.id) === String(selectedAgent) ? 'rgba(1, 76, 177, 0.1)' : 'transparent',
                                  fontWeight: String(agent.id) === String(selectedAgent) ? 'bold' : 'normal',
                                  transition: 'background 0.2s',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  direction: 'rtl'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = String(agent.id) === String(selectedAgent) ? 'rgba(1, 76, 177, 0.1)' : 'transparent'}
                              >
                                <span>{agent.agency_name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'var(--border)', padding: '2px 6px', borderRadius: '4px' }}>
                                  {agent.code}
                                </span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {/* Hidden field for validation */}
                <input type="hidden" required value={selectedAgent} readOnly />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>المبلغ المدفوع (د.ل) <span className="required">*</span></label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>طريقة الدفع</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      if (e.target.value === 'نقدي') {
                        setBankName('');
                        setRefNumber('');
                      }
                    }}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                  >
                    <option value="نقدي">نقدي</option>
                    <option value="شيك">شيك</option>
                    <option value="تحويل بنكي">حوالة مصرفية</option>
                    <option value="بطاقة مصرفية">بطاقة مصرفية (POS)</option>
                    <option value="أخرى">نوع آخر...</option>
                  </select>
                </div>
              </div>

              {paymentMethod === 'أخرى' && (
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>اسم وسيلة الدفع <span className="required">*</span></label>
                  <input
                    type="text"
                    required
                    value={customMethod}
                    onChange={(e) => setCustomMethod(e.target.value)}
                    placeholder="مثال: نقدي + شيك"
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                  />
                </div>
              )}

              {(paymentMethod === 'شيك' || paymentMethod === 'تحويل بنكي' || paymentMethod === 'بطاقة مصرفية') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                      {paymentMethod === 'شيك' ? 'رقم الشيك' :
                        paymentMethod === 'تحويل بنكي' ? 'رقم الحوالة' : 'رقم الإيصال'} <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={refNumber}
                      onChange={(e) => setRefNumber(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>اسم المصرف <span className="required">*</span></label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                    />
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>تاريخ القبض <span className="required">*</span></label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>ملاحظات</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="اكتب أي ملاحظات إضافية هنا..."
                  rows={3}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', resize: 'none', background: 'var(--input-bg)', color: 'var(--text)' }}
                />
              </div>

              <div className="form-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="ghost"
                  style={{ padding: '12px 24px' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="primary"
                  style={{ padding: '12px 32px' }}
                  disabled={loading}
                >
                  {loading ? 'جاري الحفظ...' : (editingVoucher ? 'تحديث الإيصال' : 'حفظ وإصدار الإيصال')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </section>
  );
}