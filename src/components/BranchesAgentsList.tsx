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
  user?: { id: number; username: string; name: string };
};

export default function BranchesAgentsList() {
  const navigate = useNavigate();
  const [branchesAgents, setBranchesAgents] = useState<BranchAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState<BranchAgent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    fetchBranchesAgents();
  }, []);



  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, branchesAgents.length]);

  const fetchBranchesAgents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/branches-agents`, {
        headers: { 'Accept': 'application/json' }
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

  const filteredBranchesAgents = branchesAgents.filter((ba: BranchAgent) => 
    ba.agency_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ba.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ba.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ba.phone && ba.phone.includes(searchQuery)) ||
    (ba.agency_number && ba.agency_number.includes(searchQuery))
  );

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
        .header-branding { display: flex; align-items: center; gap: 12px; }
        .brand-text { text-align: left; }
        .brand-text div { font-size: 9pt; font-weight: 800; color: #1e40af; line-height: 1.2; }
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
          <div class="header-branding"><div class="brand-text"><div>المدار الليبي للتأمين</div><div>Al Madar Libyan Insurance</div></div><div class="logo-wrapper"><img src="${escapeHtml(logoSrc)}" alt="Logo" /></div></div>
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
    const logoSrc = resolvePublicUrl('/img/logo3.png');

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>بطاقة وكيل</title>
      <style>
        @page { margin: 0; size: 85.6mm 53.98mm; }
        body { font-family: Cairo, 'Segoe UI', sans-serif; margin: 0; display: flex; align-items: center; justify-content: center; background: #e2e8f0; }
        .card { width: 85.6mm; height: 53.98mm; background: #fff; border-radius: 8px; overflow: hidden; position: relative; border: 1px solid #cbd5e1; display: flex; flex-direction: column; }
        .header { height: 16mm; background: #1e40af; display: flex; justify-content: space-between; align-items: center; padding: 0 4mm; color: #fff; }
        .header-branding { display: flex; align-items: center; gap: 2.5mm; }
        .logo-wrapper { width: 12mm; height: 12mm; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .header-branding img { height: 10mm; width: 10mm; object-fit: contain; }
        .brand-text { font-size: 8.5pt; font-weight: 700; text-align: left; line-height: 1.2; color: #fff; white-space: nowrap; }
        .brand-text div:first-child { font-size: 12pt; font-weight: 800; margin-bottom: 0.5mm; line-height: 1; }
        .brand-text div:last-child { font-size: 8.5pt; opacity: 0.95; font-weight: 800; line-height: 1; }
        .card-body { flex: 1; display: flex; align-items: center; padding: 2mm 5mm; gap: 4mm; }
        .photo-box { width: 24mm; height: 30mm; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; background: #f8fafc; flex-shrink: 0; }
        .photo-box img { width: 100%; height: 100%; object-fit: cover; }
        .info-box { flex: 1; display: flex; flex-direction: column; gap: 2mm; }
        .info-row { display: flex; gap: 2mm; font-size: 9.5pt; }
        .info-label { color: #64748b; font-weight: 700; min-width: 18mm; }
        .info-val { color: #0f172a; font-weight: 800; }
        .footer-note { position: absolute; bottom: 2mm; left: 4mm; font-size: 6.5pt; color: #94a3b8; font-weight: 700; }
      </style></head><body onload="window.print()">
      <div class="card">
        <div class="header">
          <div style="font-size: 11pt; font-weight: 800; color: #fff;">بطاقة وكيل معتمد</div>
          <div class="header-branding">
            <div class="brand-text"><div>المدار الليبي للتأمين</div><div>Al Madar Libyan Insurance</div></div>
            <div class="logo-wrapper"><img src="${escapeHtml(logoSrc)}" alt="Logo" /></div>
          </div>
        </div>
        <div class="card-body">
          <div class="photo-box">
            ${photoSrc ? `<img src="${escapeHtml(photoSrc)}" alt="" />` : `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:7pt">بلا صورة</div>`}
          </div>
          <div class="info-box">
            <div class="info-row"><span class="info-label">اسم الوكيل:</span><span class="info-val">${escapeHtml(ba.agent_name)}</span></div>
            <div class="info-row"><span class="info-label">رقم الوكالة:</span><span class="info-val">${escapeHtml(ba.agency_number || '—')}</span></div>
            <div class="info-row"><span class="info-label">كود الوكيل:</span><span class="info-val">${escapeHtml(ba.code)}</span></div>
            <div class="info-row"><span class="info-label">الإصدار:</span><span class="info-val">${new Date().toLocaleDateString('ar-LY')}</span></div>
          </div>
        </div>
        <div class="footer-note">إدارة الفروع والوكلاء - شركة المدار الليبي للتأمين</div>
      </div>
      </body></html>`);
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

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>إدارة الفروع والوكلاء / قائمة الفروع والوكلاء</span>
      </div>

      <div className="users-card">
        <div className="users-header">
          <div className="users-search-bar">
            <input 
              type="text" 
              placeholder="بحث باسم الوكالة، الوكيل، الكود، رقم الترخيص أو الهاتف..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="users-search-input"
            />
            <button className="users-search-btn" type="button">
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>
          </div>
          <button
            className="primary add-user-btn"
            onClick={() => navigate('/branches-agents/create')}
          >
            <i className="fa-solid fa-plus"></i>
            إضافة فرع أو وكيل جديد
          </button>
        </div>

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
