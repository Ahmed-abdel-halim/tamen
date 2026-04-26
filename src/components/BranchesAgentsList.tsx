import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  status: 'نشط' | 'غير نشط';
  authorized_documents?: string[];
  consumed_custodies?: Array<{ description: string; quantity: number }>;
  fixed_custodies?: Array<{ description: string; quantity: number }>;
  personal_photo?: string;
  city?: string;
  user?: { id: number; username: string; name: string; is_blocked?: boolean };
};

export default function BranchesAgentsList() {
  const navigate = useNavigate();
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

  const printAgentA4 = (ba: BranchAgent) => {
    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) return;
    const photoSrc = ba.personal_photo ? resolvePublicUrl(ba.personal_photo) : '';
    const logoSrc = resolvePublicUrl('/img/logo3.png');
    const printDate = new Date().toLocaleDateString('ar-LY');

    const rows: [string, string][] = [
      ['اسم الوكالة', escapeHtml(ba.agency_name)],
      ['اسم الوكيل المسؤول', escapeHtml(ba.agent_name)],
      ['رقم الوكالة / الترخيص', escapeHtml(ba.agency_number || ba.code)],
      ['كود الوكيل', escapeHtml(ba.code)],
      ['المدينة', escapeHtml(ba.city || ba.address || '—')],
      ['رقم الهاتف', escapeHtml(ba.phone || '—')],
      ['الحالة', escapeHtml(ba.status)],
      ['نوع المنشأة', escapeHtml(ba.type)],
    ];

    const permissionsHtml = (ba.authorized_documents || []).length > 0 
      ? (ba.authorized_documents || []).map(p => `<li>${escapeHtml(p)}</li>`).join('')
      : '<li>لا توجد صلاحيات محددة</li>';

    const fixedCustodyHtml = (ba.fixed_custodies || []).length > 0 
      ? (ba.fixed_custodies || []).map(c => `<tr><td>${escapeHtml(c.description)}</td><td>${Number(c.quantity)}</td></tr>`).join('')
      : '<tr><td colspan="2" style="text-align:center;color:#94a3b8">لا توجد عهدة ثابتة</td></tr>';

    const consumedCustodyHtml = (ba.consumed_custodies || []).length > 0 
      ? (ba.consumed_custodies || []).map(c => `<tr><td>${escapeHtml(c.description)}</td><td>${Number(c.quantity)}</td></tr>`).join('')
      : '<tr><td colspan="2" style="text-align:center;color:#94a3b8">لا توجد عهدة مستهلكة</td></tr>';

    const tableRows = rows
      .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
      .join('');

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>بيانات وكيل - ${escapeHtml(ba.agency_name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        @page { size: A4; margin: 10mm; }
        body { font-family: 'Cairo', sans-serif; color: #1e293b; margin: 0; padding: 0; line-height: 1.4; background: #fff; }
        .page-container { border: 1px solid #e2e8f0; padding: 8mm; position: relative; min-height: 275mm; box-sizing: border-box; display: flex; flex-direction: column; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 3px solid #1e40af; padding-bottom: 12px; }
        .header-info h1 { margin: 0; color: #1e40af; font-size: 1.7rem; font-weight: 800; }
        .header-branding { display: flex; align-items: center; gap: 4px; }
        .brand-text { display: flex; flex-direction: column; align-items: center; line-height: 1.2; white-space: nowrap; margin-right: 0; }
        .brand-text div:first-child { font-size: 13pt; font-weight: 800; margin-bottom: 2px; line-height: 1; color: #139625; font-family: 'Times New Roman', serif; text-align: center; }
        .brand-text div:last-child { font-size: 5.6pt; font-weight: 800; line-height: 1; font-family: 'Times New Roman', serif; text-align: center; letter-spacing: 0; }
        .header-branding img { height: 50px; width: auto; }
        .content-body { display: flex; gap: 15px; }
        .main-data { flex: 1; }
        .photo-sidebar { width: 130px; text-align: center; }
        .photo-box { width: 120px; height: 140px; border: 2px solid #f1f5f9; border-radius: 6px; overflow: hidden; background: #f8fafc; margin-bottom: 5px; }
        .photo-box img { width: 100%; height: 100%; object-fit: cover; }
        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        table th { background: #f1f5f9; color: #475569; text-align: right; padding: 8px 12px; border: 1px solid #e2e8f0; width: 35%; font-weight: 700; font-size: 0.9rem; }
        table td { padding: 8px 12px; border: 1px solid #e2e8f0; color: #1e293b; font-weight: 600; font-size: 0.9rem; }
        
        .section-title { font-size: 0.95rem; color: #1e40af; font-weight: 800; margin: 12px 0 5px 0; display: flex; align-items: center; gap: 5px; }
        .section-title::before { content: ""; width: 4px; height: 15px; background: #1e40af; border-radius: 2px; }
        
        .permissions-box { background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; }
        .permissions-box ul { margin: 0; padding: 0 15px 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
        .permissions-box li { font-size: 0.8rem; color: #475569; font-weight: 700; list-style: none; display: flex; align-items: center; gap: 5px; }
        .permissions-box li::before { content: "•"; color: #1e40af; }
        
        .custody-tables { display: flex; gap: 15px; margin-top: 5px; }
        .custody-col { flex: 1; }
        .custody-table th { background: #eff6ff; color: #1e40af; text-align: center; font-size: 0.8rem; padding: 5px; }
        .custody-table td { font-size: 0.8rem; padding: 5px 8px; text-align: center; }

        .footer { margin-top: auto; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        .sig-block { text-align: center; width: 45%; }
        .sig-line { border-top: 1px solid #1e293b; margin-top: 25px; padding-top: 5px; font-weight: 700; font-size: 0.9rem; }
        .print-date { position: absolute; bottom: 3mm; left: 8mm; font-size: 0.65rem; color: #94a3b8; }
      </style></head><body onload="window.print()">
      <div class="page-container">
        <div class="header">
          <div class="header-info"><h1>بيانات الوكيل المعتمد</h1><p>قسم الفروع والوكلاء</p></div>
          <div class="header-branding"><div class="brand-text"><div>المدار الليبي <span style="color: #1e40af;">للتأمين</span></div><div><span style="color: #1e40af;">ALMADAR</span> <span style="color: #139625;">LIBYAN INSURANCE</span></div></div><div class="logo-wrapper"><img src="${escapeHtml(logoSrc)}" alt="Logo" /></div></div>
        </div>
        <div class="content-body">
          <div class="main-data">
            <table>${tableRows}</table>
            
            <div class="section-title">الصلاحيات والأذونات الممنوحة</div>
            <div class="permissions-box"><ul>${permissionsHtml}</ul></div>
            
            <div class="custody-tables">
              <div class="custody-col">
                <div class="section-title">العهدة الثابتة</div>
                <table class="custody-table"><thead><tr><th>البيان</th><th>الكمية</th></tr></thead><tbody>${fixedCustodyHtml}</tbody></table>
              </div>
              <div class="custody-col">
                <div class="section-title">العهدة المستهلكة</div>
                <table class="custody-table"><thead><tr><th>البيان</th><th>الكمية</th></tr></thead><tbody>${consumedCustodyHtml}</tbody></table>
              </div>
            </div>
          </div>
          <div class="photo-sidebar"><div class="photo-box">${photoSrc ? `<img src="${escapeHtml(photoSrc)}" alt="" />` : `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:0.7rem">لا توجد صورة</div>`}</div><p style="font-size:0.8rem;font-weight:700;color:#64748b">صورة الوكيل</p></div>
        </div>
        <div class="footer"><div class="sig-block"><div class="sig-line">توقيع الوكيل</div></div><div class="sig-block"><div class="sig-line">مدير إدارة الفروع والوكلاء</div></div></div>
        <div class="print-date">تاريخ الطباعة: ${printDate}</div>
      </div>
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
            </select>
          </div>
        </div>
      </div>

      <div className="users-card">

        {loading ? (
          <p style={{textAlign: 'center', padding: '20px'}}>جار التحميل...</p>
        ) : (
          <>
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>#</th>
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
                    paginatedBranchesAgents.map((branchAgent: BranchAgent, index: number) => (
                      <tr key={branchAgent.id}>
                        <td>{startIndex + index + 1}</td>
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
                            <button
                              onClick={() => setShowDeleteModal(branchAgent)}
                              className="action-btn delete"
                              aria-label="حذف"
                              title="حذف"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
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
                        <button
                          onClick={() => setShowDeleteModal(branchAgent)}
                          className="action-btn delete"
                          aria-label="حذف"
                          title="حذف"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
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
                    <span className="pagination-btn-text">السابق</span>
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
                    <span className="pagination-btn-text">التالي</span>
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
