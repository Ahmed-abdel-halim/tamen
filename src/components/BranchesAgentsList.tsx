import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL, BACKEND_URL } from "../config/api";

type BranchAgent = {
  id: number;
  type: 'وكيل' | 'فرع من شركة';
  code: string;
  agency_name: string;
  agent_name: string;
  agency_number?: string;
  phone?: string;
  address?: string;
  notes?: string;
  status: 'نشط' | 'غير نشط' | 'قيد الانتظار';
  authorized_documents?: string[];
  consumed_custodies?: Array<{ description: string; quantity: number }>;
  fixed_custodies?: Array<{ description: string; quantity: number }>;
  personal_photo?: string;
  city?: string;
  user?: { id: number; username: string; name: string; is_blocked?: boolean };
};

export default function BranchesAgentsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const [branchesAgents, setBranchesAgents] = useState<BranchAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState<BranchAgent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("نشط");
  const perPage = 10;

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    if (queryParams.get('status') === 'pending') {
      setFilterStatus('قيد الانتظار');
    } else {
      setFilterStatus('نشط');
    }
  }, [location.search]);

  useEffect(() => {
    fetchBranchesAgents();
  }, []);



  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterType, filterStatus, branchesAgents.length]);

  const fetchBranchesAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/branches-agents`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setBranchesAgents(data);
    } catch (error: any) {
      showToast(`حدث خطأ أثناء جلب الفروع والوكلاء: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredBranchesAgents = branchesAgents.filter((ba: BranchAgent) => {
    const matchesSearch = ba.agency_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ba.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ba.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ba.phone && ba.phone.includes(searchQuery)) ||
      (ba.agency_number && ba.agency_number.includes(searchQuery));

    const matchesType = filterType === 'all' || ba.type === filterType;
    const matchesStatus = filterStatus === 'all' || ba.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalBranchesAgents = filteredBranchesAgents.length;
  const totalPages = totalBranchesAgents > 0 ? Math.ceil(totalBranchesAgents / perPage) : 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedBranchesAgents = filteredBranchesAgents.slice(startIndex, endIndex);

  const handlePrint = async (ba: BranchAgent) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.src = `${API_BASE_URL}/branches-agents/${ba.id}/print?t=${new Date().getTime()}`;
    document.body.appendChild(iframe);

    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 5000);
  };

  const escapeHtml = (s: string): string => {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const resolvePublicUrl = (path: string | null | undefined): string => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/img/')) return `${window.location.origin}${path}`;
    if (path.startsWith('img/')) return `${window.location.origin}/${path}`;
    if (path.startsWith('/storage/')) return `${BACKEND_URL}${path}`;
    if (path.startsWith('storage/')) return `${BACKEND_URL}/${path}`;
    return `${BACKEND_URL}/storage/${path}`;
  };

  const printAgentA4 = async (ba: BranchAgent) => {
    // جلب بيانات العهدة للوكيل/الفرع
    let agentFixedCustodies: any[] = [];
    let agentConsumedCustodies: any[] = [];

    try {
      const res = await fetch(`${API_BASE_URL}/inventory/custody?recipient_id=${ba.id}&recipient_type=agent`);
      if (res.ok) {
        const allCustody: any[] = await res.json();
        agentFixedCustodies = allCustody.filter((c: any) => (c.item?.inventory_type === 'fixed' || c.inventory_type === 'fixed') && c.status === 'active');
        agentConsumedCustodies = allCustody.filter((c: any) => (c.item?.inventory_type === 'consumable' || c.inventory_type === 'consumable') && c.status === 'active');
      } else {
        agentFixedCustodies = (ba.fixed_custodies || []).map(c => ({ item: { name: c.description }, quantity: c.quantity }));
        agentConsumedCustodies = (ba.consumed_custodies || []).map(c => ({ item: { name: c.description }, quantity: c.quantity }));
      }
    } catch (e) {
      console.error("Failed to fetch agent custody", e);
      agentFixedCustodies = (ba.fixed_custodies || []).map(c => ({ item: { name: c.description }, quantity: c.quantity }));
      agentConsumedCustodies = (ba.consumed_custodies || []).map(c => ({ item: { name: c.description }, quantity: c.quantity }));
    }

    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) return;
    const photoSrc = ba.personal_photo ? resolvePublicUrl(ba.personal_photo) : '';
    const logoSrc = resolvePublicUrl('/img/logo3.png');
    const printDate = new Date().toLocaleString('ar-LY');

    const permissionsHtml = (ba.authorized_documents || []).length > 0
      ? (ba.authorized_documents || []).map(p => `<li>${escapeHtml(p)}</li>`).join('')
      : '<li>لا توجد صلاحيات محددة</li>';

    const formatPrintDateTime = (dateStr?: string) => {
      if (!dateStr) return '—';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
      } catch (e) {
        return dateStr;
      }
    };

    const formatCondition = (cond?: string) => {
      if (!cond) return '—';
      const c = cond.toLowerCase();
      if (c === 'new') return 'جديد';
      if (c === 'used') return 'مستعمل';
      if (c === 'damaged') return 'تالف';
      if (c === 'lost') return 'مفقود';
      return cond;
    };

    const cleanNotes = (notes?: string) => {
      if (!notes) return '—';
      let n = notes.trim();
      const boilerplates = [
        /إقرار استلام العهدة والمحافظة عليها وتعهد بإرجاعها في حال طلبها من الشركة أو انتهاء علاقة العمل/g,
        /إقرار استلام العهدة والمحافظة عليها وتعهد بإرجاعها في حال طلبها من الشركة أو انتهاء فترة العمل لديها/g,
        /إقرار استلام العهدة والمحافظة عليها وتعهد بإرجاعها/g,
        /في حال طلبها من الشركة أو انتهاء علاقة العمل/g,
        /في حال طلبها من الشركة أو انتهاء فترة العمل لديها/g,
      ];
      for (const pattern of boilerplates) {
        n = n.replace(pattern, '');
      }
      n = n.trim().replace(/^[-–—:\s]+/, '').trim();
      return n || '—';
    };

    const fixedCustodyHtml = agentFixedCustodies.length > 0
      ? agentFixedCustodies.map(c => {
          const serial = (c.serial_start || c.serial_end)
            ? `${c.serial_start || '—'}${c.serial_end ? ` إلى ${c.serial_end}` : ''}`
            : '—';
          return `<tr>
            <td style="text-align: right; border-right: none;">${escapeHtml(c.item?.name || c.description || 'صنف عهدة')}</td>
            <td>${c.quantity}</td>
            <td>${escapeHtml(serial)}</td>
            <td>${formatPrintDateTime(c.assigned_at || c.created_at)}</td>
            <td>${formatCondition(c.condition)}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding: 12px;background:#ffffff !important;">لا توجد عهدة ثابتة نشطة حالياً</td></tr>';

    const consumedCustodyHtml = agentConsumedCustodies.length > 0
      ? agentConsumedCustodies.map(c => {
          return `<tr>
            <td style="text-align: right; border-right: none;">${escapeHtml(c.item?.name || c.description || 'صنف عهدة')}</td>
            <td>${c.quantity}</td>
            <td>${formatPrintDateTime(c.assigned_at || c.created_at)}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding: 12px;background:#ffffff !important;">لا توجد عهدة مستهلكة نشطة حالياً</td></tr>';

    const statusColorClass = ba.status === 'نشط' ? 'status-active' : ba.status === 'غير نشط' ? 'status-inactive' : 'status-pending';

    const detailsGridHtml = `
      <div class="detail-item"><span class="detail-label">اسم الوكالة</span><span class="detail-value highlighted">${escapeHtml(ba.agency_name)}</span></div>
      <div class="detail-item"><span class="detail-label">اسم الوكيل المسؤول</span><span class="detail-value">${escapeHtml(ba.agent_name)}</span></div>
      <div class="detail-item"><span class="detail-label">كود الوكيل</span><span class="detail-value">${escapeHtml(ba.code)}</span></div>
      <div class="detail-item"><span class="detail-label">رقم الترخيص</span><span class="detail-value">${escapeHtml(ba.agency_number || ba.code)}</span></div>
      <div class="detail-item"><span class="detail-label">المدينة</span><span class="detail-value">${escapeHtml(ba.city || ba.address || '—')}</span></div>
      <div class="detail-item"><span class="detail-label">رقم الهاتف</span><span class="detail-value">${escapeHtml(ba.phone || '—')}</span></div>
      <div class="detail-item"><span class="detail-label">الحالة</span><span class="detail-value ${statusColorClass}">${escapeHtml(ba.status)}</span></div>
      <div class="detail-item"><span class="detail-label">نوع المنشأة</span><span class="detail-value">${escapeHtml(ba.type)}</span></div>
    `;

    const totalCustodies = agentFixedCustodies.length + agentConsumedCustodies.length;
    const isVeryLong = totalCustodies > 10;
    const isMediumLong = totalCustodies > 5 && totalCustodies <= 10;

    const rowPadding = isVeryLong ? '2px 4px' : isMediumLong ? '4px 6px' : '7px 10px';
    const fontSize = isVeryLong ? '0.64rem' : isMediumLong ? '0.72rem' : '0.8rem';
    const sectionMargin = isVeryLong ? '4px 0 2px 0' : isMediumLong ? '8px 0 3px 0' : '15px 0 6px 0';
    
    const detailPadding = isVeryLong ? '3px 6px' : isMediumLong ? '5px 8px' : '8px 12px';
    const detailFontSize = isVeryLong ? '0.74rem' : isMediumLong ? '0.8rem' : '0.9rem';
    
    const permMarginTop = isVeryLong ? '4px' : isMediumLong ? '8px' : '15px';
    const permPadding = isVeryLong ? '4px 8px' : isMediumLong ? '6px 10px' : '12px';
    
    const photoWidth = isVeryLong ? '75px' : isMediumLong ? '95px' : '110px';
    const photoHeight = isVeryLong ? '85px' : isMediumLong ? '110px' : '130px';
    
    const sigLineMarginTop = isVeryLong ? '10px' : isMediumLong ? '18px' : '30px';
    const containerPadding = isVeryLong ? '3mm' : isMediumLong ? '5mm' : '8mm';
    const containerHeight = isVeryLong ? '284mm' : isMediumLong ? '283mm' : '280mm';
    const containerBorder = isVeryLong ? 'none' : '1px solid #cbd5e1';

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
      <title>بيانات وكيل - ${escapeHtml(ba.agency_name)}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          box-sizing: border-box;
        }
        @page { size: A4; margin: 4mm; }
        body { 
          font-family: 'Cairo', system-ui, -apple-system, sans-serif !important; 
          color: #0f172a; 
          margin: 0; 
          padding: 0; 
          line-height: 1.25; 
          background: #ffffff;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .page-container { border: ${containerBorder}; padding: ${containerPadding}; position: relative; height: ${containerHeight}; max-height: ${containerHeight}; display: flex; flex-direction: column; overflow: hidden; }
        
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: ${isVeryLong ? '4px' : '10px'}; border-bottom: 3px double #1e40af; padding-bottom: ${isVeryLong ? '3px' : '8px'}; }
        .header-info h1 { margin: 0; color: #1e40af; font-size: ${isVeryLong ? '1.25rem' : '1.5rem'}; font-weight: 800; letter-spacing: -0.5px; }
        .header-info p { margin: 1px 0 0 0; color: #64748b; font-size: 0.8rem; font-weight: 600; }
        
        .header-branding { display: flex; align-items: center; gap: 6px; }
        .brand-text { display: flex; flex-direction: column; align-items: center; line-height: 1.2; white-space: nowrap; margin-right: 0; }
        .brand-text div:first-child { font-size: 13pt; font-weight: 800; margin-bottom: 2px; line-height: 1; color: #139625; font-family: 'Times New Roman', serif; text-align: center; }
        .brand-text div:last-child { font-size: 5.6pt; font-weight: 800; line-height: 1; font-family: 'Times New Roman', serif; text-align: center; letter-spacing: 0; }
        .header-branding img { height: ${isVeryLong ? '35px' : '48px'}; width: auto; }

        .content-body { display: flex; flex-direction: column; gap: 2px; }
        .main-data { width: 100%; }
        
        /* Modern Profile Card */
        .profile-card {
          display: flex;
          gap: 15px;
          background: #f8fafc !important;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: ${isVeryLong ? '6px' : '12px'};
          margin-bottom: ${isVeryLong ? '4px' : '8px'};
          align-items: center;
        }
        .photo-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .photo-box {
          width: ${photoWidth};
          height: ${photoHeight};
          border: 3px solid #ffffff;
          border-radius: 8px;
          overflow: hidden;
          background: #ffffff !important;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -1px rgba(0,0,0,0.04);
        }
        .photo-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .photo-box .no-img {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #94a3b8;
          font-size: 0.7rem;
        }
        .photo-label {
          font-size: 0.68rem;
          font-weight: 800;
          color: #64748b;
        }
        .details-grid {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: ${isVeryLong ? '4px 8px' : '6px 12px'};
        }
        .detail-item {
          display: flex;
          flex-direction: column;
          background: #ffffff !important;
          padding: ${detailPadding};
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .detail-label {
          font-size: calc(${detailFontSize} - 0.12rem);
          color: #64748b;
          font-weight: 700;
          margin-bottom: 2px;
        }
        .detail-value {
          font-size: ${detailFontSize};
          color: #0f172a;
          font-weight: 800;
          text-align: right;
        }
        .detail-value.highlighted {
          color: #1e40af;
        }
        .detail-value.status-active {
          color: #16a34a;
          font-weight: 800;
        }
        .detail-value.status-inactive {
          color: #dc2626;
          font-weight: 800;
        }
        .detail-value.status-pending {
          color: #ea580c;
          font-weight: 800;
        }

        /* Permissions Card */
        .permissions-section {
          margin-top: ${permMarginTop};
          background: #eff6ff !important;
          padding: ${permPadding};
          border-radius: 12px;
          border: 1px solid #bfdbfe;
        }
        .permissions-section h3 {
          margin: 0 0 6px 0;
          font-size: ${isVeryLong ? '0.78rem' : '0.9rem'};
          color: #1e40af;
          font-weight: 800;
        }
        .permissions-section ul {
          margin: 0;
          padding: 0;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 4px;
          list-style: none;
        }
        .permissions-section li {
          font-size: ${isVeryLong ? '0.64rem' : '0.76rem'};
          color: #1e3a8a;
          font-weight: 600;
          background: #ffffff !important;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid #dbeafe;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: flex;
          align-items: center;
        }
        .permissions-section li::before {
          content: "✓";
          color: #16a34a;
          margin-left: 6px;
          font-weight: 800;
        }

        /* Custody Section & Tables */
        .section-title { font-size: ${isVeryLong ? '0.78rem' : '0.9rem'}; color: #1e40af; font-weight: 800; margin: ${sectionMargin}; display: flex; align-items: center; gap: 5px; }
        .section-title::before { content: ""; width: 4px; height: 14px; background: #1e40af; border-radius: 2px; }
        
        .custody-tables { display: grid; grid-template-columns: 1fr 1fr; gap: ${isVeryLong ? '8px' : '15px'}; margin-top: 2px; align-items: start; }
        .custody-col { width: 100%; overflow: hidden; }
        .custody-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin-top: 3px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #cbd5e1;
        }
        .custody-table th {
          background: #1e40af !important;
          color: #ffffff !important;
          text-align: center;
          font-size: ${fontSize};
          padding: ${rowPadding};
          font-weight: 700;
          border-bottom: 2px solid #1e3a8a;
        }
        .custody-table td {
          font-size: ${fontSize};
          padding: ${rowPadding};
          text-align: center;
          border-bottom: 1px solid #cbd5e1;
          border-left: 1px solid #cbd5e1;
          color: #0f172a;
          font-weight: 600;
          background: #ffffff !important;
        }
        .custody-table tr:last-child td {
          border-bottom: none;
        }
        .custody-table td:last-child {
          border-left: none;
        }
        .custody-table tr:nth-child(even) td {
          background: #f8fafc !important;
        }

        .undertaking-box {
          margin-top: ${isVeryLong ? '4px' : '10px'};
          background: #f8fafc !important;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          padding: ${isVeryLong ? '4px 8px' : '8px 12px'};
          font-size: ${isVeryLong ? '0.62rem' : '0.72rem'};
          color: #475569;
          line-height: 1.4;
          text-align: justify;
        }
        .undertaking-box p {
          margin: 0;
        }
        .undertaking-box strong {
          color: #1e40af;
        }

        .footer { margin-top: auto; display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: ${isVeryLong ? '4px' : '10px'}; margin-bottom: 2px; }
        .sig-block { text-align: center; width: 45%; }
        .sig-line { border-top: 1px solid #475569; margin-top: ${sigLineMarginTop}; padding-top: 4px; font-weight: 700; color: #334155; font-size: ${isVeryLong ? '0.72rem' : '0.82rem'}; }
        .print-date { position: absolute; bottom: 2mm; left: 8mm; font-size: 0.65rem; color: #94a3b8; font-weight: 600; }
      </style></head>
      <body>
      <div class="page-container">
        <div class="header">
          <div class="header-info">
            <h1>بيانات الوكيل المعتمد</h1>
            <p>قسم الفروع والوكلاء</p>
          </div>
          <div class="header-branding">
            <div class="brand-text">
              <div>المدار الليبي <span style="color: #1e40af;">للتأمين</span></div>
              <div><span style="color: #1e40af;">ALMADAR</span> <span style="color: #139625;">LIBYAN INSURANCE</span></div>
            </div>
            <img src="${escapeHtml(logoSrc)}" alt="Logo" />
          </div>
        </div>

        <div class="content-body">
          <div class="main-data">
            <div class="profile-card">
              <div class="photo-container">
                <div class="photo-box">
                  ${photoSrc ? `<img src="${escapeHtml(photoSrc)}" alt="" />` : `<div class="no-img">لا توجد صورة</div>`}
                </div>
                <div class="photo-label">صورة الوكيل</div>
              </div>
              <div class="details-grid">
                ${detailsGridHtml}
              </div>
            </div>
            
            <div class="permissions-section">
              <h3>الصلاحيات والأذونات الممنوحة:</h3>
              <ul>${permissionsHtml}</ul>
            </div>

            <div class="custody-tables">
              <div class="custody-col">
                <div class="section-title">العهدة الثابتة (الأصول والمعدات)</div>
                <table class="custody-table">
                  <thead>
                    <tr>
                      <th style="width: 35%; text-align: right;">البيان (اسم الصنف)</th>
                      <th style="width: 10%;">الكمية</th>
                      <th style="width: 20%;">الأرقام التسلسلية</th>
                      <th style="width: 20%;">تاريخ الصرف</th>
                      <th style="width: 15%;">حالة الاستلام</th>
                    </tr>
                  </thead>
                  <tbody>${fixedCustodyHtml}</tbody>
                </table>
              </div>
              <div class="custody-col">
                <div class="section-title">العهدة المستهلكة (المطبوعات والمستلزمات)</div>
                <table class="custody-table">
                  <thead>
                    <tr>
                      <th style="width: 50%; text-align: right;">البيان (اسم الصنف)</th>
                      <th style="width: 15%;">الكمية</th>
                      <th style="width: 35%;">تاريخ الصرف</th>
                    </tr>
                  </thead>
                  <tbody>${consumedCustodyHtml}</tbody>
                </table>
              </div>
            </div>

            <div class="undertaking-box">
              <p><strong>تعهد وإقرار استلام عهدة:</strong> أقر أنا الوكيل الموقع أدناه بأنني قد تسلمت المواد والأصول الموضحة في الجداول أعلاه، وهي في حالة ممتازة وصالحة للاستعمال، وأتعهد بالمحافظة عليها واستعمالها في أغراض العمل المخصصة لها، كما أتعهد بإعادتها كاملة وبحالة جيدة للشركة فور طلبها أو عند انتهاء علاقتي التعاقدية معها لأي سبب كان.</p>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="sig-block">
            <div class="sig-line">توقيع الوكيل المعتمد</div>
          </div>
          <div class="sig-block">
            <div class="sig-line">مدير إدارة الفروع والوكلاء</div>
          </div>
        </div>
        
        <div class="print-date">تاريخ الطباعة: ${printDate}</div>
      </div>
      
      <script>
        // Wait for all fonts to finish loading before showing the print dialog
        if (document.fonts) {
          document.fonts.ready.then(function() {
            setTimeout(function() { window.print(); }, 350);
          });
        } else {
          window.onload = function() {
            setTimeout(function() { window.print(); }, 350);
          };
        }
      </script>
      </body></html>`);
    w.document.close();
  };

  const printAgentIdCard = (ba: BranchAgent) => {
    const w = window.open('', '_blank', 'width=520,height=420');
    if (!w) return;
    const photoSrc = ba.personal_photo ? resolvePublicUrl(ba.personal_photo) : '';
    const logoSrc = resolvePublicUrl('/img/logo.png');

    // Adjusted wave to make blue section visually equal/larger
    const bgSvg = `data:image/svg+xml;utf8,<svg viewBox="0 0 830 540" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M856 0 L428 0 C328 150 528 350 428 540 L856 540 Z" fill="%231e40af"/><path d="M428 0 C328 150 528 350 428 540 L408 540 C508 350 308 150 408 0 Z" fill="%23139625"/></svg>`;

    w.document.write(`<!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>بطاقة وكيل معتمد</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
          @page { margin: 0; size: 85.6mm 53.98mm; }
          body { 
            font-family: Cairo, 'Segoe UI', sans-serif; 
            margin: 0; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            background: #e2e8f0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .card { 
            width: 85.6mm; 
            height: 53.98mm; 
            background-color: #ffffff; 
            background-image: url('${bgSvg}');
            background-size: cover;
            background-position: center;
            border-radius: 8px; 
            overflow: hidden; 
            position: relative; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            display: flex; 
          }
          
          /* Dark Blue Section (Logical Right in RTL, Physical Right) - Visually balanced */
          .right-section {
            width: 55%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: flex-start; /* Align to Right in RTL */
            justify-content: center;
            padding: 4mm 4mm 4mm 2mm; /* Reduced right padding to move content closer to edge */
            box-sizing: border-box;
            color: #ffffff;
            z-index: 10;
          }
          
          .photo-circle {
            width: 23mm;
            height: 23mm;
            border-radius: 50%;
            border: 2px solid #139625;
            background: #ffffff;
            overflow: hidden;
            margin-bottom: 4mm;
            box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .photo-circle img { width: 100%; height: 100%; object-fit: cover; }
          .photo-circle .no-img { font-size: 7pt; color: #94a3b8; }
          
          .id-data {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1.5mm;
            padding: 0 2mm;
            box-sizing: border-box;
          }
          .id-row {
            display: flex;
            justify-content: flex-start; /* Group label and value together */
            gap: 3mm; /* Gap between label and value */
            font-size: 7.5pt;
            font-weight: 700;
          }
          .id-row span:first-child { color: #93c5fd; }
          
          /* White Left Section (Physical Left) - Visually balanced */
          .left-section {
            width: 45%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 4mm;
            box-sizing: border-box;
            z-index: 10;
          }
          
          .header-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin-top: 6mm;
            width: 100%;
          }
          .logo-wrapper {
            display: flex; align-items: center; justify-content: center; 
          }
          .logo-wrapper img { height: 18mm; width: auto; object-fit: contain; max-width: 90%; }
          
          .employee-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            width: 100%;
          }
          .emp-name { font-size: 11pt; font-weight: 800; color: #1e40af; margin-bottom: 1mm; line-height: 1.2; }
          .emp-role { font-size: 8pt; font-weight: 700; color: #139625; }
          
          .footer-note {
            font-size: 5pt;
            color: #64748b;
            text-align: center;
            width: 100%;
            margin-top: auto;
          }
          
          .badge-type {
            position: absolute;
            top: 3mm;
            left: 3mm;
            background: #1e40af;
            color: white;
            padding: 1mm 2mm;
            border-radius: 4px;
            font-size: 6.5pt;
            font-weight: 800;
          }
        </style>
      </head>
      <body onload="window.print()">
        <div class="card">
          <div class="right-section">
            <div class="photo-circle">
              ${photoSrc ? `<img src="${escapeHtml(photoSrc)}" alt="Photo" onerror="this.style.display='none'" />` : '<div class="no-img">بلا صورة</div>'}
            </div>
            <div class="id-data">
              <div class="id-row"><span>رقم الوكالة:</span> <span>${escapeHtml(ba.agency_number || '—')}</span></div>
              <div class="id-row"><span>كود الوكيل:</span> <span>${escapeHtml(ba.code)}</span></div>
              <div class="id-row"><span>الإصدار:</span> <span>${new Date().toLocaleDateString('en-GB')}</span></div>
            </div>
          </div>
          
          <div class="left-section">
            <div class="badge-type">بطاقة وكيل معتمد</div>
            
            <div class="header-box">
               <div class="logo-wrapper"><img src="${escapeHtml(logoSrc)}" alt="Logo" onerror="this.src='/img/logo.png'" /></div>
            </div>
            
            <div class="employee-info">
              <div class="emp-name">${escapeHtml(ba.agent_name)}</div>
              <div class="emp-role">وكيل معتمد</div>
            </div>
            
            <div class="footer-note">إدارة الفروع والوكلاء - المدار الليبي للتأمين</div>
          </div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
  };

  const handleDeleteBranchAgent = async () => {
    if (!showDeleteModal) return;

    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/branches-agents/${showDeleteModal.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        let errorMessage = 'حدث خطأ أثناء حذف السجل';
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const error = await res.json();
            errorMessage = error.message || error.error || errorMessage;
            console.error('Delete error:', error);
          }
        } catch (e) {
          console.error('Error parsing delete response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();
      showToast(data.message || 'تم حذف السجل بنجاح', 'success');
      setShowDeleteModal(null);
      fetchBranchesAgents();
    } catch (error: any) {
      console.error('Delete error:', error);
      showToast(error.message || 'حدث خطأ أثناء حذف السجل', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleBlock = async (ba: BranchAgent) => {
    if (!ba.user) {
      showToast('هذا الوكيل ليس لديه حساب مستخدم مرتبط', 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/branches-agents/${ba.id}/toggle-block`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'حدث خطأ أثناء تحديث حالة الحظر');
      }

      const data = await res.json();
      showToast(data.message, 'success');

      // Update local state
      setBranchesAgents(prev => prev.map(item => {
        if (item.id === ba.id && item.user) {
          return {
            ...item,
            user: { ...item.user, is_blocked: data.is_blocked }
          };
        }
        return item;
      }));
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleApproveAgent = async (ba: BranchAgent) => {
    if (!window.confirm(`هل أنت متأكد من تفعيل الوكيل "${ba.agency_name}"؟`)) {
        return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/branches-agents/${ba.id}/approve`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'حدث خطأ أثناء التفعيل');
      }

      const data = await res.json();
      showToast(data.message || 'تم التفعيل بنجاح', 'success');
      fetchBranchesAgents();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>إدارة الفروع والوكلاء / قائمة الفروع والوكلاء</span>
      </div>

      <div className="users-filters-box" style={{
        background: '#ffffff',
        padding: '25px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        marginBottom: '30px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '15px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b', fontWeight: 800 }}>الفلاتر والبحث</h3>
            <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>إدارة وتصفية قائمة الفروع والوكلاء المعتمدين في النظام</p>
          </div>
          <button
            className="primary add-user-btn"
            onClick={() => navigate('/branches-agents/create')}
            style={{ height: '42px', padding: '0 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 700 }}
          >
            <i className="fa-solid fa-plus"></i>
            إضافة فرع أو وكيل جديد
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div className="filter-group">
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>بحث سريع</label>
            <div className="users-search-bar" style={{ marginBottom: 0, width: '100%' }}>
              <input
                type="text"
                placeholder="اسم الوكالة، الكود، الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="users-search-input"
                style={{ width: '100%', height: '42px', borderRadius: '10px' }}
              />
              <button className="users-search-btn" type="button" style={{ height: '42px' }}>
                <i className="fa-solid fa-magnifying-glass"></i>
              </button>
            </div>
          </div>

          <div className="filter-group">
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>نوع المنشأة</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="users-search-input"
              style={{ width: '100%', padding: '0 12px', height: '42px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, color: '#475569' }}
            >
              <option value="all">الكل (فرع/وكيل)</option>
              <option value="فرع من شركة">الفروع</option>
              <option value="وكيل">الوكلاء</option>
            </select>
          </div>

          <div className="filter-group">
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>حالة النشاط</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="users-search-input"
              style={{ width: '100%', padding: '0 12px', height: '42px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#f8fafc', fontWeight: 600, color: '#475569' }}
            >
              <option value="all">كل الحالات</option>
              <option value="نشط">نشط</option>
              <option value="غير نشط">غير نشط</option>
              <option value="قيد الانتظار">الوكلاء الجدد (قيد الانتظار)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="users-card">

        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>جار التحميل...</p>
        ) : (
          <>
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>الصورة</th>
                    <th>كود الوكيل</th>
                    <th>اسم الوكالة</th>
                    <th>اسم الوكيل</th>
                    <th>رقم الترخيص</th>
                    <th>رقم الهاتف</th>
                    <th>العنوان</th>
                    <th>الملاحظات</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBranchesAgents.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="empty-table-cell">
                        لا توجد نتائج
                      </td>
                    </tr>
                  ) : (
                    paginatedBranchesAgents.map((branchAgent: BranchAgent) => (
                      <tr key={branchAgent.id}>
                        <td>
                          <div style={{ width: '45px', height: '45px', borderRadius: '8px', overflow: 'hidden', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                            {branchAgent.personal_photo ? (
                              <img
                                src={resolvePublicUrl(branchAgent.personal_photo)}
                                alt=""
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/img/default-avatar.png';
                                }}
                              />
                            ) : (
                              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                <i className="fa-solid fa-user" style={{ fontSize: '1.2rem' }}></i>
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{branchAgent.code}</td>
                        <td>{branchAgent.agency_name}</td>
                        <td>{branchAgent.agent_name}</td>
                        <td>{branchAgent.agency_number || '-'}</td>
                        <td>{branchAgent.phone || '-'}</td>
                        <td>{branchAgent.address || '-'}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {branchAgent.notes || '-'}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => navigate(`/branches-agents/${branchAgent.id}`)}
                              className="action-btn view"
                              aria-label="عرض التفاصيل"
                              title="عرض التفاصيل"
                              style={{ background: '#10b981', color: '#fff' }}
                            >
                              <i className="fa-solid fa-eye"></i>
                            </button>
                            <button
                              onClick={() => navigate(`/branches-agents/${branchAgent.id}/edit`)}
                              className="action-btn edit"
                              aria-label="تعديل"
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pencil"></i>
                            </button>
                            {branchAgent.status !== 'قيد الانتظار' && (
                              <>
                                <button
                                  onClick={() => printAgentA4(branchAgent)}
                                  className="action-btn"
                                  aria-label="طباعة البيانات"
                                  title="طباعة بيانات الوكيل A4"
                                  style={{ background: '#6366f1', color: '#fff' }}
                                >
                                  <i className="fa-solid fa-file-lines"></i>
                                </button>
                                <button
                                  onClick={() => printAgentIdCard(branchAgent)}
                                  className="action-btn"
                                  aria-label="بطاقة وكيل"
                                  title="طباعة بطاقة وكيل"
                                  style={{ background: '#f59e0b', color: '#fff' }}
                                >
                                  <i className="fa-solid fa-id-card"></i>
                                </button>
                                <button
                                  onClick={() => handlePrint(branchAgent)}
                                  className="action-btn"
                                  aria-label="طباعة العقد"
                                  title="طباعة العقد"
                                  style={{ background: '#3b82f6', color: '#fff' }}
                                >
                                  <i className="fa-solid fa-print"></i>
                                </button>
                                <button
                                  onClick={() => handleToggleBlock(branchAgent)}
                                  className={`action-btn ${branchAgent.user?.is_blocked ? 'unblock' : 'block'}`}
                                  aria-label={branchAgent.user?.is_blocked ? "إلغاء الحظر" : "حظر"}
                                  title={branchAgent.user?.is_blocked ? "إلغاء حظر الوكيل" : "حظر الوكيل"}
                                  style={{
                                    background: branchAgent.user?.is_blocked ? '#10b981' : '#ef4444',
                                    color: '#fff'
                                  }}
                                >
                                  <i className={`fa-solid ${branchAgent.user?.is_blocked ? 'fa-user-check' : 'fa-user-slash'}`}></i>
                                </button>
                              </>
                            )}
                            {branchAgent.status === 'قيد الانتظار' && (
                              <button
                                onClick={() => handleApproveAgent(branchAgent)}
                                className="action-btn"
                                aria-label="تفعيل الوكيل"
                                title="تفعيل الوكيل"
                                style={{ background: '#10b981', color: '#fff' }}
                              >
                                <i className="fa-solid fa-check"></i>
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

            {/* Mobile Cards View */}
            <div className="users-mobile-cards">
              {filteredBranchesAgents.length === 0 ? (
                <div className="empty-state">لا توجد نتائج</div>
              ) : (
                paginatedBranchesAgents.map((branchAgent: BranchAgent, index: number) => (
                  <div key={branchAgent.id} className="user-mobile-card">
                    <div className="user-mobile-header">
                      <div>
                        <h4 className="user-mobile-title">{branchAgent.agency_name}</h4>
                        <span className="user-mobile-number">#{startIndex + index + 1} - {branchAgent.code}</span>
                      </div>
                    </div>
                    <div className="user-mobile-body">
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">اسم الوكيل:</span>
                        <span className="user-mobile-value">{branchAgent.agent_name}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">رقم الترخيص:</span>
                        <span className="user-mobile-value">{branchAgent.agency_number || '-'}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">رقم الهاتف:</span>
                        <span className="user-mobile-value">{branchAgent.phone || '-'}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">العنوان:</span>
                        <span className="user-mobile-value">{branchAgent.address || '-'}</span>
                      </div>
                      {branchAgent.notes && (
                        <div className="user-mobile-row">
                          <span className="user-mobile-label">الملاحظات:</span>
                          <span className="user-mobile-value" style={{ fontSize: '0.9em' }}>{branchAgent.notes}</span>
                        </div>
                      )}
                      <div className="user-mobile-actions">
                        <button
                          onClick={() => navigate(`/branches-agents/${branchAgent.id}`)}
                          className="action-btn view"
                          aria-label="عرض التفاصيل"
                          title="عرض التفاصيل"
                          style={{ background: '#10b981', color: '#fff' }}
                        >
                          <i className="fa-solid fa-eye"></i>
                        </button>
                        <button
                          onClick={() => navigate(`/branches-agents/${branchAgent.id}/edit`)}
                          className="action-btn edit"
                          aria-label="تعديل"
                          title="تعديل"
                        >
                          <i className="fa-solid fa-pencil"></i>
                        </button>
                        {branchAgent.status !== 'قيد الانتظار' && (
                          <>
                            <button
                              onClick={() => printAgentA4(branchAgent)}
                              className="action-btn"
                              aria-label="طباعة البيانات"
                              title="طباعة بيانات الوكيل A4"
                              style={{ background: '#6366f1', color: '#fff' }}
                            >
                              <i className="fa-solid fa-file-lines"></i>
                            </button>
                            <button
                              onClick={() => printAgentIdCard(branchAgent)}
                              className="action-btn"
                              aria-label="بطاقة وكيل"
                              title="طباعة بطاقة وكيل"
                              style={{ background: '#f59e0b', color: '#fff' }}
                            >
                              <i className="fa-solid fa-id-card"></i>
                            </button>
                            <button
                              onClick={() => handlePrint(branchAgent)}
                              className="action-btn"
                              aria-label="طباعة العقد"
                              title="طباعة العقد"
                              style={{ background: '#3b82f6', color: '#fff' }}
                            >
                              <i className="fa-solid fa-print"></i>
                            </button>
                            <button
                              onClick={() => handleToggleBlock(branchAgent)}
                              className={`action-btn ${branchAgent.user?.is_blocked ? 'unblock' : 'block'}`}
                              aria-label={branchAgent.user?.is_blocked ? "إلغاء الحظر" : "حظر"}
                              title={branchAgent.user?.is_blocked ? "إلغاء حظر الوكيل" : "حظر الوكيل"}
                              style={{
                                background: branchAgent.user?.is_blocked ? '#10b981' : '#ef4444',
                                color: '#fff'
                              }}
                            >
                              <i className={`fa-solid ${branchAgent.user?.is_blocked ? 'fa-user-check' : 'fa-user-slash'}`}></i>
                            </button>
                          </>
                        )}
                        {branchAgent.status === 'قيد الانتظار' && (
                          <button
                            onClick={() => handleApproveAgent(branchAgent)}
                            className="action-btn"
                            aria-label="تفعيل الوكيل"
                            title="تفعيل الوكيل"
                            style={{ background: '#10b981', color: '#fff' }}
                          >
                            <i className="fa-solid fa-check"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {totalBranchesAgents > perPage && (
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  عرض {startIndex + 1}
                  {' إلى '}
                  {Math.min(endIndex, totalBranchesAgents)}
                  {' من '}
                  {totalBranchesAgents}
                  {' وكيل/فرع'}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn pagination-prev"
                    onClick={() => setCurrentPage((prev: number) => Math.max(1, prev - 1))}
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
                    onClick={() => setCurrentPage((prev: number) => Math.min(totalPages, prev + 1))}
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



      {showDeleteModal && (
        <div className="modal" onClick={(e) => {
          if (e.target === e.currentTarget && !deleting) setShowDeleteModal(null);
        }}>
          <div className="modal-content delete-confirm-modal">
            <div className="delete-confirm-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>تأكيد الحذف</h3>
            <p className="delete-confirm-message">
              هل أنت متأكد من حذف السجل <strong>{showDeleteModal.agency_name}</strong>؟
              <br />
              <span className="delete-warning">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            <div className="delete-confirm-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowDeleteModal(null)}
                disabled={deleting}
              >
                إلغاء
              </button>
              <button
                className="btn-delete-confirm"
                onClick={handleDeleteBranchAgent}
                disabled={deleting}
              >
                {deleting ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
