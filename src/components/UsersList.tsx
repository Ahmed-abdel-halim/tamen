import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
import { API_BASE_URL, BACKEND_URL } from "../config/api";

type User = {
  id: number;
  username: string;
  name: string;
  email?: string;
  is_admin?: boolean;
  authorized_documents?: string[];
  user_type?: string;
  branch_agent_info?: {
    id: number;
    type: string;
    agency_name: string;
    agent_name: string;
  } | null;
  salary?: number;
  national_id_number?: string | null;
  job_title?: string | null;
  profile_photo_url?: string | null;
  personal_id_proof_url?: string | null;
  employment_contract_url?: string | null;
  fixed_custodies?: any[];
  consumed_custodies?: any[];
};

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function employeeCardNumber(u: User): string {
  const n = (u.national_id_number || '').trim();
  return n || `EMP-${String(u.id).padStart(5, '0')}`;
}

/** Use absolute URL for <img> and print windows (about:blank cannot resolve /storage). */
function resolvePublicUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/img/')) return `${BACKEND_URL}${path}`;
  if (path.startsWith('img/')) return `${BACKEND_URL}/${path}`;
  if (path.startsWith('/storage/')) return `${BACKEND_URL}${path}`;
  if (path.startsWith('storage/')) return `${BACKEND_URL}/${path}`;
  return `${BACKEND_URL}/storage/${path}`;
}

const INSURANCE_TYPES = [
  'تأمين سيارات إجباري',
  'تأمين سيارات',
  'تأمين سيارة جمرك',
  'تأمين سيارات أجنبية',
  'تأمين طرف ثالث سيارات',
  'تأمين سيارات دولي',
  'تأمين المسافرين',
  'تأمين زائرين ليبيا',
  'تأمين الوافدين',
  'تأمين الهياكل البحرية',
  'تأمين المسؤولية المهنية (الطبية)',
  'تأمين الحوادث الشخصية',
];

const REPORT_PERMISSIONS = [
  'كشف حساب الوكيل',
  'إغلاق حساب شهري',
  'كشف إغلاق الحساب الشهري',
  'إيصالات القبض',
  'إدارة المصروفات',
  'التسويات والعمولات',
  'الديون المستحقة',
  'الأرشيف المالي',
  'المخازن والعهدة',
  'الإحصائيات المالية',
  'مرتبات الموظفين',
];

const ADMIN_SECTION_PERMISSIONS = [
  'إدارة الفروع والوكلاء',
  'إدارة الموظفين',
  'الأرشيف',
];

const SETTINGS_PERMISSIONS = [
  'قائمة المدن',
  'قائمة اللوحات',
  'أنواع السيارات',
];

export default function UsersList() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<null | { mode: 'add' | 'edit', user?: User }>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    password: '',
    is_admin: false,
    authorized_documents: [] as string[],
    salary: '' as string | number,
    national_id_number: '',
    job_title: '',
  });
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [personalIdProofFile, setPersonalIdProofFile] = useState<File | null>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<null | User>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);



  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch a large page once, then paginate الموظفين locally to avoid empty pages after excluding agents.
      const url = `${API_BASE_URL}/users?page=1&per_page=1000`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      
      // إذا كان الـ response يحتوي على pagination data
      if (data.data && Array.isArray(data.data)) {
        setUsers(data.data);
      } else {
        // Fallback للـ response القديم (بدون pagination)
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      showToast(`حدث خطأ أثناء جلب المستخدمين: ${error.message || ''}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const uploadPendingEmployeeFiles = async (userId: number) => {
    const parts: { type: 'profile_photo' | 'personal_id_proof' | 'employment_contract'; file: File }[] = [];
    if (profilePhotoFile) parts.push({ type: 'profile_photo', file: profilePhotoFile });
    if (personalIdProofFile) parts.push({ type: 'personal_id_proof', file: personalIdProofFile });
    if (contractFile) parts.push({ type: 'employment_contract', file: contractFile });
    for (const { type, file } of parts) {
      const fd = new FormData();
      fd.append('type', type);
      fd.append('file', file);
      const r = await fetch(`${API_BASE_URL}/users/${userId}/employee-files`, {
        method: 'POST',
        body: fd,
        headers: { Accept: 'application/json' },
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || `فشل رفع الملف (${type})`);
      }
    }
  };

  const printEmployeeA4 = async (u: User) => {
    // جلب بيانات العهدة للموظف
    let userFixedCustodies: any[] = [];
    let userConsumedCustodies: any[] = [];
    
    try {
      const res = await fetch(`${API_BASE_URL}/inventory/custody?recipient_id=${u.id}&recipient_type=employee`);
      if (res.ok) {
        const allCustody: any[] = await res.json();
        userFixedCustodies = allCustody.filter(c => (c.item?.inventory_type === 'fixed' || c.inventory_type === 'fixed') && c.status === 'active');
        userConsumedCustodies = allCustody.filter(c => (c.item?.inventory_type === 'consumable' || c.inventory_type === 'consumable') && c.status === 'active');
      }
    } catch (e) {
      console.error("Failed to fetch user custody", e);
    }

    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;

    const photoSrc = u.profile_photo_url ? resolvePublicUrl(u.profile_photo_url) : '';
    const logoSrc = resolvePublicUrl('/img/logo3.png');
    const printDate = new Date().toLocaleString('ar-LY');

    const permissionsHtml = (u.authorized_documents || []).length > 0
      ? (u.authorized_documents || []).map(p => `<li>${escapeHtml(p)}</li>`).join('')
      : '<li>لا توجد صلاحيات محددة</li>';

    const fixedCustodyHtml = userFixedCustodies.length > 0 
      ? userFixedCustodies.map(c => `<tr><td>${escapeHtml(c.item?.name || 'صنف عهدة')}</td><td>${c.quantity}</td></tr>`).join('')
      : '<tr><td colspan="2" style="text-align:center;color:#94a3b8">لا توجد عهدة ثابتة</td></tr>';

    const consumedCustodyHtml = userConsumedCustodies.length > 0 
      ? userConsumedCustodies.map(c => `<tr><td>${escapeHtml(c.item?.name || 'صنف عهدة')}</td><td>${c.quantity}</td></tr>`).join('')
      : '<tr><td colspan="2" style="text-align:center;color:#94a3b8">لا توجد عهدة مستهلكة</td></tr>';

    const rows: [string, string][] = [
      ['الاسم بالكامل', escapeHtml(u.name)],
      ['اسم المستخدم', escapeHtml(u.username)],
      ['البريد الإلكتروني', escapeHtml(u.email || '—')],
      ['المعرف الشخصي', escapeHtml(employeeCardNumber(u))],
      ['المسمى الوظيفي', escapeHtml((u.job_title || '').trim() || '—')],
      ['نوع الحساب', escapeHtml(u.user_type || '—')],
      ['الراتب الشهري', u.salary != null ? `${Number(u.salary).toLocaleString('ar-LY')} دينار ليبي` : '—'],
    ];

    const tableRows = rows
      .map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
      .join('');

    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>استمارة بيانات موظف - ${escapeHtml(u.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        @page { size: A4; margin: 10mm; }
        body { font-family: 'Cairo', sans-serif; color: #1e293b; margin: 0; padding: 0; line-height: 1.4; background: #fff; }
        .page-container { border: 1px solid #e2e8f0; padding: 8mm; position: relative; min-height: 270mm; box-sizing: border-box; display: flex; flex-direction: column; }
        
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
        .header-info h1 { margin: 0; color: #1e40af; font-size: 1.6rem; font-weight: 800; }
        .header-info p { margin: 2px 0 0 0; color: #64748b; font-size: 0.9rem; font-weight: 600; }
        
        .header-branding { display: flex; align-items: center; gap: 10px; }
        .brand-text { text-align: left; }
        .brand-text div { font-size: 8pt; font-weight: 800; color: #1e40af; line-height: 1.1; }
        .header-branding img { height: 50px; width: auto; }

        .content-body { display: flex; gap: 20px; }
        .main-data { flex: 1; }
        .photo-sidebar { width: 140px; text-align: center; }
        .photo-box { width: 130px; height: 160px; border: 2px solid #f1f5f9; border-radius: 6px; overflow: hidden; background: #f8fafc; margin-bottom: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .photo-box img { width: 100%; height: 100%; object-fit: cover; }
        .photo-box .no-img { height: 100%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 0.75rem; }

        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
        table th { background: #f1f5f9; color: #475569; text-align: right; padding: 8px 12px; border: 1px solid #e2e8f0; width: 35%; font-weight: 700; font-size: 0.9rem; }
        table td { padding: 8px 12px; border: 1px solid #e2e8f0; color: #1e293b; font-weight: 600; font-size: 0.9rem; }

        .permissions-section { margin-top: 15px; background: #f8fafc; padding: 12px; border-radius: 6px; border-right: 4px solid #1e40af; }
        .permissions-section h3 { margin: 0 0 8px 0; font-size: 1rem; color: #1e40af; }
        .permissions-section ul { margin: 0; padding: 0 20px 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: 3px; }
        .permissions-section li { font-size: 0.8rem; color: #475569; font-weight: 600; list-style: none; }
        .permissions-section li::before { content: "•"; color: #1e40af; margin-left: 5px; }

        /* Custody Styles */
        .section-title { font-size: 0.95rem; color: #1e40af; font-weight: 800; margin: 12px 0 5px 0; display: flex; align-items: center; gap: 5px; }
        .section-title::before { content: ""; width: 4px; height: 15px; background: #1e40af; border-radius: 2px; }
        
        .custody-tables { display: flex; gap: 15px; margin-top: 5px; }
        .custody-col { flex: 1; }
        .custody-table { width: 100%; border-collapse: collapse; }
        .custody-table th { background: #eff6ff; color: #1e40af; text-align: center; font-size: 0.8rem; padding: 5px; border: 1px solid #e2e8f0; }
        .custody-table td { font-size: 0.8rem; padding: 5px 8px; text-align: center; border: 1px solid #e2e8f0; font-weight: 600; }

        .footer { margin-top: auto; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-bottom: 10px; }
        .sig-block { text-align: center; width: 45%; }
        .sig-line { border-top: 1px solid #1e293b; margin-top: 30px; padding-top: 5px; font-weight: 700; color: #1e293b; font-size: 0.9rem; }
        .print-date { position: absolute; bottom: 3mm; left: 8mm; font-size: 0.7rem; color: #94a3b8; font-weight: 600; }
      </style></head><body onload="window.print()">
      <div class="page-container">
        <div class="header">
          <div class="header-info">
            <h1>استمارة بيانات موظف</h1>
            <p>قسم الشؤون الإدارية</p>
          </div>
          <div class="header-branding">
            <div class="brand-text">
              <div>المدار الليبي للتأمين</div>
              <div>Al Madar Libyan Insurance</div>
            </div>
            <img src="${escapeHtml(logoSrc)}" alt="Logo" />
          </div>
        </div>

        <div class="content-body">
          <div class="main-data">
            <table>${tableRows}</table>
            
            <div class="permissions-section">
              <h3>الصلاحيات والأذونات الممنوحة:</h3>
              <ul>${permissionsHtml}</ul>
            </div>

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
          
          <div class="photo-sidebar">
            <div class="photo-box">
              ${photoSrc ? `<img src="${escapeHtml(photoSrc)}" alt="" />` : `<div class="no-img">لا توجد صورة</div>`}
            </div>
            <p style="font-size: 0.8rem; font-weight: 700; color: #64748b;">الصورة الشخصية</p>
          </div>
        </div>

        <div class="footer">
          <div class="sig-block">
            <div class="sig-line">توقيع الموظف المعني</div>
          </div>
          <div class="sig-block">
            <div class="sig-line">اعتماد رئيس قسم الموارد البشرية</div>
          </div>
        </div>
        
        <div class="print-date">تاريخ الطباعة: ${printDate}</div>
      </div>
      </body></html>`);
    w.document.close();
  };

  const printEmployeeIdCard = (u: User) => {
    const w = window.open('', '_blank', 'width=520,height=420');
    if (!w) return;
    const num = escapeHtml(employeeCardNumber(u));
    const name = escapeHtml(u.name);
    const job = escapeHtml((u.job_title || '').trim() || '—');
    const idPhotoSrc = resolvePublicUrl(u.profile_photo_url);
    const logoSrc = resolvePublicUrl('/img/logo3.png');
    
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/><title>بطاقة موظف</title>
      <style>
        @page { margin: 0; size: 85.6mm 53.98mm; }
        body { font-family: Cairo, 'Segoe UI', sans-serif; margin: 0; display: flex; align-items: center; justify-content: center; background: #e2e8f0; }
        
        .card {
          width: 85.6mm;
          height: 53.98mm;
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          position: relative;
          color: #0f172a;
          border: 1px solid #cbd5e1;
          display: flex;
          flex-direction: column;
        }

        .card-header {
          height: 16mm;
          background: #1e40af;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 4mm;
          color: #ffffff;
        }
        .header-title { font-size: 10pt; font-weight: 800; margin: 0; }
        .header-logo-box { display: flex; align-items: center; gap: 3mm; }
        .logo-circle { width: 12mm; height: 12mm; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .header-logo-box img { height: 10mm; width: 10mm; object-fit: contain; }
        .header-company-name { font-size: 8.5pt; font-weight: 700; text-align: left; line-height: 1.2; white-space: nowrap; }
        .header-company-name div:first-child { font-size: 12pt; font-weight: 800; margin-bottom: 0.5mm; line-height: 1; }
        .header-company-name div:last-child { font-size: 8.5pt; opacity: 0.95; font-weight: 800; line-height: 1; }

        .card-body {
          flex: 1;
          display: flex;
          align-items: center;
          padding: 2mm 5mm;
          gap: 5mm;
        }
        .photo-section {
          flex-shrink: 0;
          width: 25mm;
          height: 28mm;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
          background: #f8fafc;
        }
        .photo-section img { width: 100%; height: 100%; object-fit: cover; }

        .info-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2mm;
        }
        .info-row {
          display: flex;
          gap: 2mm;
          font-size: 9pt;
          line-height: 1.2;
        }
        .info-label {
          color: #64748b;
          font-weight: 700;
          min-width: 14mm;
        }
        .info-val {
          color: #0f172a;
          font-weight: 800;
        }

        .card-footer-note {
          position: absolute;
          bottom: 3mm;
          left: 4mm;
          font-size: 6pt;
          color: #94a3b8;
          font-weight: 700;
        }
      </style></head><body onload="window.print()">
      <div class="card">
        <div class="card-header">
          <div class="header-title">بطاقة موظف</div>
          <div class="header-logo-box">
             <div class="header-company-name">
               <div>المدار الليبي للتأمين</div>
               <div>Al Madar Libyan Insurance</div>
             </div>
             <div class="logo-circle"><img src="${escapeHtml(logoSrc)}" alt="Logo" /></div>
          </div>
        </div>
        
        <div class="card-body">
          <div class="photo-section">
            ${idPhotoSrc ? `<img src="${escapeHtml(idPhotoSrc)}" alt="" />` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:7pt">بلا صورة</div>`}
          </div>
          <div class="info-section">
            <div class="info-row">
              <span class="info-label">المعرف:</span>
              <span class="info-val">${num}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الاسم:</span>
              <span class="info-val">${name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">المهنة:</span>
              <span class="info-val">${job}</span>
            </div>
            <div class="info-row">
              <span class="info-label">الإصدار:</span>
              <span class="info-val">${new Date().toLocaleDateString('ar-LY')}</span>
            </div>
          </div>
        </div>

        <div class="card-footer-note">
          صدرت عن قسم الموارد البشرية
        </div>
      </div>
      </body></html>`);
    w.document.close();
  };

  useEffect(() => {
    setProfilePhotoFile(null);
    setPersonalIdProofFile(null);
    setContractFile(null);
    if (showForm?.mode === 'edit' && showForm.user) {
      setFormData({
        username: showForm.user.username || '',
        name: showForm.user.name || '',
        email: showForm.user.email || '',
        password: '',
        is_admin: showForm.user.is_admin || false,
        authorized_documents: showForm.user.authorized_documents || [],
        salary: showForm.user.salary || '',
        national_id_number: showForm.user.national_id_number || '',
        job_title: showForm.user.job_title || '',
      });
    } else {
      setFormData({
        username: '',
        name: '',
        email: '',
        password: '',
        is_admin: false,
        authorized_documents: [],
        salary: '',
        national_id_number: '',
        job_title: '',
      });
    }
    setFormErrors({});
  }, [showForm]);

  // عرض الموظفين فقط (استبعاد الوكلاء/الفروع من شاشة إدارة الموظفين)
  const employeesOnly = users.filter((u) => {
    const userType = (u.user_type || '').trim();
    const isAgentByType = userType.includes('وكيل');
    const isLinkedToBranchAgent = !!u.branch_agent_info;
    return !isAgentByType && !isLinkedToBranchAgent;
  });

  // فلترة الموظفين محلياً (client-side filtering)
  const filteredUsers = employeesOnly.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayTotalUsers = filteredUsers.length;
  const displayTotalPages = filteredUsers.length > 0 ? Math.ceil(filteredUsers.length / perPage) : 1;

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  const handleDeleteClick = (user: User) => {
    setDeleteConfirmation(user);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users/${deleteConfirmation.id}`, { 
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
        }
      });
      if (!res.ok) {
        throw new Error(`خطأ ${res.status}`);
      }
      setDeleteConfirmation(null);
      showToast('تم حذف المستخدم بنجاح', 'success');
      // إعادة جلب البيانات بعد الحذف
      await fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showToast(`حدث خطأ أثناء حذف المستخدم: ${error.message || 'تأكد من أن الخادم يعمل'}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.username.trim()) {
      errors.username = 'اسم المستخدم مطلوب';
    }
    if (!formData.name.trim()) {
      errors.name = 'الاسم مطلوب';
    }
    if (showForm?.mode === 'add' && !formData.password) {
      errors.password = 'كلمة المرور مطلوبة';
    }
    if (formData.password && formData.password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }
    // التحقق من اختيار صلاحية واحدة على الأقل لغير المدير
    if (!formData.is_admin) {
      if (formData.authorized_documents.length === 0) {
        errors.authorized_documents = 'يجب اختيار صلاحية واحدة على الأقل';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = showForm?.mode === 'edit' 
        ? `${API_BASE_URL}/users/${showForm.user?.id}` 
        : `${API_BASE_URL}/users`;
      
      const method = showForm?.mode === 'edit' ? 'PUT' : 'POST';
      
      const body: any = {
        username: formData.username,
        name: formData.name,
        email: formData.email || null,
        is_admin: formData.is_admin,
        salary: formData.salary || null,
        national_id_number: formData.national_id_number.trim() || null,
        job_title: formData.job_title.trim() || null,
      };

      // الصلاحيات فقط للمستخدمين غير المديرين
      if (!formData.is_admin) {
        body.authorized_documents = formData.authorized_documents;
      }

      if (showForm?.mode === 'add' || formData.password) {
        body.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        let errorMessage = 'حدث خطأ';
        try {
          const error = await res.json();
          errorMessage = error.message || error.error || errorMessage;
        } catch (e) {
          errorMessage = `خطأ ${res.status}: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const updatedData = await res.json();
      const savedUserId = showForm?.mode === 'edit' ? showForm.user!.id : updatedData.id;
      let uploadError: string | null = null;
      try {
        await uploadPendingEmployeeFiles(savedUserId);
      } catch (uploadErr: unknown) {
        uploadError = uploadErr instanceof Error ? uploadErr.message : 'فشل رفع المرفقات';
      }

      await fetchUsers();

      // إذا كان المستخدم المحدث هو نفس المستخدم المسجل دخول، حدث localStorage
      const currentUser = localStorage.getItem('user');
      if (currentUser && showForm?.mode === 'edit' && showForm.user?.id === updatedData.id) {
        try {
          const currentUserObj = JSON.parse(currentUser);
          if (currentUserObj.id === updatedData.id) {
            localStorage.setItem('user', JSON.stringify(updatedData));
            // أرسل حدث لتحديث Topbar
            window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedData }));
          }
        } catch {}
      }

      setShowForm(null);
      setFormData({
        username: '',
        name: '',
        email: '',
        password: '',
        is_admin: false,
        authorized_documents: [],
        salary: '',
        national_id_number: '',
        job_title: '',
      });
      if (uploadError) {
        showToast(`تم حفظ البيانات. ${uploadError}`, 'error');
      } else {
        showToast(showForm?.mode === 'add' ? 'تم إضافة الموظف بنجاح' : 'تم تحديث بيانات الموظف بنجاح', 'success');
      }
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء حفظ بيانات الموظف', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="users-management font-cairo">
      <div className="users-breadcrumb">
        <span>إدارة الموظفين / قائمة الموظفين</span>
      </div>
      
      <div className="users-card">
        <div className="users-header">
          <div className="users-search-bar">
            <input 
              type="text" 
              placeholder="بحث باسم المستخدم..." 
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
            onClick={() => setShowForm({ mode: 'add' })}
          >
            <i className="fa-solid fa-plus"></i>
            إضافة موظف
          </button>
        </div>

        {loading ? (
          <p className="empty-state-text">جار التحميل...</p>
        ) : (
          <>
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>صورة</th>
                    <th>إسم المستخدم</th>
                    <th>البريد الإلكتروني</th>
                    <th>حالة المستخدم</th>
                    <th>نوع المستخدم</th>
                    <th>المرتب</th>
                    <th>الرقم الوطني</th>
                    <th>المهنة</th>
                    <th>الصلاحيات</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="empty-state">
                        لا توجد نتائج
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          {u.profile_photo_url ? (
                            <img
                              src={resolvePublicUrl(u.profile_photo_url)}
                              alt=""
                              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }}
                            />
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td>{u.name}</td>
                        <td>{u.email || '-'}</td>
                        <td>
                          <span className="status-badge active">مفعل</span>
                        </td>
                        <td>
                          {u.user_type === 'مدير' && (
                            <span className="type-badge admin">مدير</span>
                          )}
                          {u.user_type === 'وكيل' && (
                            <span className="type-badge agent">
                              <i className="fa-solid fa-user-tie"></i> وكيل
                            </span>
                          )}
                          {u.user_type === 'فرع من شركة' && (
                            <span className="type-badge branch">
                              <i className="fa-solid fa-building"></i> فرع
                            </span>
                          )}
                          {u.user_type === 'مستخدم عادي' && (
                            <span className="type-badge user">
                              <i className="fa-solid fa-user"></i> مستخدم
                            </span>
                          )}
                        </td>
                        <td>
                          {u.salary ? (
                            <span style={{ fontWeight: '700', color: '#0f172a' }}>{Number(u.salary).toLocaleString()} د.ل</span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>-</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>{u.national_id_number || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                        <td style={{ fontSize: '0.8rem', maxWidth: 140 }} title={u.job_title || ''}>
                          {u.job_title ? (
                            u.job_title.length > 28 ? `${u.job_title.slice(0, 28)}…` : u.job_title
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td>
                          {u.is_admin ? (
                            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>جميع الصلاحيات</span>
                          ) : u.authorized_documents && u.authorized_documents.length > 0 ? (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {u.authorized_documents.slice(0, 2).map((doc, idx) => (
                                <div key={idx} style={{ marginBottom: '0.25rem' }}>{doc}</div>
                              ))}
                              {u.authorized_documents.length > 2 && (
                                <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                  +{u.authorized_documents.length - 2} أكثر
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>لا توجد صلاحيات</span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                             <button
                               type="button"
                               className="action-btn"
                               onClick={() => navigate(`/users/${u.id}`)}
                               aria-label="عرض التفاصيل"
                               title="عرض التفاصيل"
                               style={{ color: '#0ea5e9' }}
                             >
                               <i className="fa-solid fa-eye"></i>
                             </button>
                             <button
                               type="button"
                               className="action-btn"
                               onClick={() => printEmployeeA4(u)}
                              aria-label="طباعة A4"
                              title="طباعة بيانات الموظف A4"
                            >
                              <i className="fa-solid fa-file-lines"></i>
                            </button>
                            <button
                              type="button"
                              className="action-btn"
                              onClick={() => printEmployeeIdCard(u)}
                              aria-label="بطاقة عمل"
                              title="طباعة بطاقة عمل"
                            >
                              <i className="fa-solid fa-id-card"></i>
                            </button>
                            <button 
                              className="action-btn edit" 
                              onClick={() => setShowForm({ mode: 'edit', user: u })}
                              aria-label="تعديل"
                              title="تعديل"
                            >
                              <i className="fa-solid fa-pencil"></i>
                            </button>
                            <button 
                              className="action-btn delete" 
                              onClick={() => handleDeleteClick(u)}
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
              {paginatedUsers.length === 0 ? (
                <div className="empty-state">لا توجد نتائج</div>
              ) : (
                paginatedUsers.map((u) => (
                  <div key={u.id} className="user-mobile-card">
                    <div className="user-mobile-header">
                      <div>
                        <h4 className="user-mobile-title">{u.name}</h4>
                      </div>
                    </div>
                    <div className="user-mobile-body">
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">اسم المستخدم:</span>
                        <span className="user-mobile-value">{u.username}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">البريد الإلكتروني:</span>
                        <span className="user-mobile-value">{u.email || '-'}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">حالة المستخدم:</span>
                        <span className="user-mobile-value">
                          <span className="status-badge active">مفعل</span>
                        </span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">نوع المستخدم:</span>
                        <span className="user-mobile-value">
                          {u.user_type === 'مدير' && (
                            <span className="type-badge admin">مدير</span>
                          )}
                          {u.user_type === 'وكيل' && (
                            <span className="type-badge agent">
                              <i className="fa-solid fa-user-tie"></i> وكيل
                            </span>
                          )}
                          {u.user_type === 'فرع من شركة' && (
                            <span className="type-badge branch">
                              <i className="fa-solid fa-building"></i> فرع
                            </span>
                          )}
                          {u.user_type === 'مستخدم عادي' && (
                            <span className="type-badge user">
                              <i className="fa-solid fa-user"></i> مستخدم
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">المرتب:</span>
                        <span className="user-mobile-value">
                          {u.salary ? `${Number(u.salary).toLocaleString()} د.ل` : '—'}
                        </span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">الرقم الوطني:</span>
                        <span className="user-mobile-value">{u.national_id_number || '—'}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">المهنة:</span>
                        <span className="user-mobile-value">{u.job_title || '—'}</span>
                      </div>
                      {u.profile_photo_url && (
                        <div className="user-mobile-row" style={{ alignItems: 'center' }}>
                          <span className="user-mobile-label">صورة:</span>
                          <img src={resolvePublicUrl(u.profile_photo_url)} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
                        </div>
                      )}
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">الصلاحيات:</span>
                        <span className="user-mobile-value">
                          {u.is_admin ? (
                            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>جميع الصلاحيات</span>
                          ) : u.authorized_documents && u.authorized_documents.length > 0 ? (
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {u.authorized_documents.slice(0, 3).map((doc, idx) => (
                                <div key={idx} style={{ marginBottom: '0.25rem' }}>{doc}</div>
                              ))}
                              {u.authorized_documents.length > 3 && (
                                <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>
                                  +{u.authorized_documents.length - 3} أكثر
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>لا توجد صلاحيات</span>
                          )}
                        </span>
                      </div>
                      <div className="user-mobile-actions">
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => navigate(`/users/${u.id}`)}
                          title="التفاصيل"
                          style={{ color: '#0ea5e9' }}
                        >
                          <i className="fa-solid fa-eye"></i>
                        </button>
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => printEmployeeA4(u)}
                          title="طباعة A4"
                        >
                          <i className="fa-solid fa-file-lines"></i>
                        </button>
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => printEmployeeIdCard(u)}
                          title="بطاقة عمل"
                        >
                          <i className="fa-solid fa-id-card"></i>
                        </button>
                        <button 
                          className="action-btn edit" 
                          onClick={() => setShowForm({ mode: 'edit', user: u })}
                          aria-label="تعديل"
                          title="تعديل"
                        >
                          <i className="fa-solid fa-pencil"></i>
                        </button>
                        <button 
                          className="action-btn delete" 
                          onClick={() => handleDeleteClick(u)}
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

            {displayTotalPages > 1 && (
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  عرض {startIndex + 1}
                  {' إلى '}
                  {Math.min(endIndex, displayTotalUsers)}
                  {' من '}
                  {displayTotalUsers}
                  {' مستخدم'}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn pagination-prev"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                    <span className="pagination-btn-text">السابق</span>
                  </button>
                  {(() => {
                    const items: (number | 'dots')[] = [];
                    if (displayTotalPages <= 3) {
                      for (let p = 1; p <= displayTotalPages; p++) {
                        items.push(p);
                      }
                    } else {
                      items.push(1);
                      let start = Math.max(2, currentPage - 1);
                      let end = Math.min(displayTotalPages - 1, currentPage + 1);
                      if (start > 2) items.push('dots');
                      for (let p = start; p <= end; p++) items.push(p);
                      if (end < displayTotalPages - 1) items.push('dots');
                      items.push(displayTotalPages);
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
                    onClick={() => setCurrentPage((prev) => Math.min(displayTotalPages, prev + 1))}
                    disabled={currentPage === displayTotalPages}
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

      {showForm && (
        <div className="modal" onClick={(e) => {
          if (e.target === e.currentTarget) setShowForm(null);
        }}>
          <div className="modal-content user-form-modal">
            <div className="modal-header">
              <h3>{showForm.mode === 'add' ? 'إضافة موظف جديد' : 'تعديل بيانات موظف'}</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowForm(null)}
                aria-label="إغلاق"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label htmlFor="username">اسم المستخدم <span className="required">*</span></label>
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className={formErrors.username ? 'error' : ''}
                  placeholder="أدخل اسم المستخدم"
                />
                {formErrors.username && <span className="error-message">{formErrors.username}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="name">الاسم الكامل <span className="required">*</span></label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={formErrors.name ? 'error' : ''}
                  placeholder="أدخل الاسم الكامل"
                />
                {formErrors.name && <span className="error-message">{formErrors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="salary">المرتب (اختياري)</label>
                <input
                  type="number"
                  id="salary"
                  value={formData.salary}
                  onChange={(e) => setFormData({...formData, salary: e.target.value})}
                  className={formErrors.salary ? 'error' : ''}
                  placeholder="أدخل قيمة المرتب"
                />
              </div>

              <div className="form-group">
                <label htmlFor="national_id_number">الرقم الوطني (اختياري)</label>
                <input
                  type="text"
                  id="national_id_number"
                  value={formData.national_id_number}
                  onChange={(e) => setFormData({ ...formData, national_id_number: e.target.value })}
                  placeholder="الرقم الوطني أو رقم الهوية"
                  maxLength={64}
                />
              </div>

              <div className="form-group">
                <label htmlFor="job_title">المهنة أو الاختصاص (اختياري)</label>
                <input
                  type="text"
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="مثال: محاسب، موظف استقبال..."
                  maxLength={191}
                />
              </div>

              <div className="form-group" style={{ borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: '12px', marginTop: '8px' }}>
                <label className="permissions-section-title">المرفقات (اختياري)</label>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 10px' }}>
                  الصورة الشخصية: صورة فقط. الإثبات وعقد العمل: صورة أو PDF. يُرفع الملف بعد حفظ بيانات الموظف.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    صورة شخصية
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: 'block', marginTop: '6px' }}
                      onChange={(e) => setProfilePhotoFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    إثبات شخصي
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      style={{ display: 'block', marginTop: '6px' }}
                      onChange={(e) => setPersonalIdProofFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    عقد العمل
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      style={{ display: 'block', marginTop: '6px' }}
                      onChange={(e) => setContractFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
                {showForm.mode === 'edit' && showForm.user && (
                  <div style={{ marginTop: '12px', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {showForm.user.profile_photo_url && (
                      <a href={resolvePublicUrl(showForm.user.profile_photo_url)} target="_blank" rel="noreferrer">عرض الصورة الحالية</a>
                    )}
                    {showForm.user.personal_id_proof_url && (
                      <a href={resolvePublicUrl(showForm.user.personal_id_proof_url)} target="_blank" rel="noreferrer">عرض إثبات شخصي محفوظ</a>
                    )}
                    {showForm.user.employment_contract_url && (
                      <a href={resolvePublicUrl(showForm.user.employment_contract_url)} target="_blank" rel="noreferrer">عرض عقد العمل محفوظ</a>
                    )}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email">البريد الإلكتروني</label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className={formErrors.email ? 'error' : ''}
                  placeholder="أدخل البريد الإلكتروني (اختياري)"
                />
                {formErrors.email && <span className="error-message">{formErrors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password">
                  كلمة المرور {showForm.mode === 'add' && <span className="required">*</span>}
                  {showForm.mode === 'edit' && <span className="optional">(اتركه فارغاً إذا لم ترد تغييره)</span>}
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className={formErrors.password ? 'error' : ''}
                  placeholder="أدخل كلمة المرور"
                />
                {formErrors.password && <span className="error-message">{formErrors.password}</span>}
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_admin}
                    onChange={(e) => setFormData({...formData, is_admin: e.target.checked, authorized_documents: e.target.checked ? [] : formData.authorized_documents})}
                    style={{ width: 'auto', cursor: 'pointer' }}
                  />
                  <span>مدير النظام (Admin)</span>
                </label>
                <p className="admin-note">
                  المدير لديه صلاحيات كاملة على جميع أجزاء النظام
                </p>
              </div>

              {!formData.is_admin && (
                <>
                  <div className="form-group">
                    <label className="permissions-section-title">
                      أنواع التأمين المصرح بها <span className="required">*</span>
                    </label>
                    <div className="permissions-grid permissions-grid-scrollable">
                      {INSURANCE_TYPES.map((type) => (
                        <label 
                          key={type} 
                          className="permission-option"
                        >
                          <input
                            type="checkbox"
                            checked={formData.authorized_documents.includes(type)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  authorized_documents: [...formData.authorized_documents, type]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  authorized_documents: formData.authorized_documents.filter(doc => doc !== type)
                                });
                              }
                            }}
                            style={{ width: 'auto', cursor: 'pointer' }}
                          />
                          <span>{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="permissions-section-title">
                      التقارير والأقسام المالية
                    </label>
                    <div className="permissions-grid permissions-grid-scrollable">
                      {REPORT_PERMISSIONS.map((permission) => (
                        <label 
                          key={permission} 
                          className="permission-option"
                        >
                          <input
                            type="checkbox"
                            checked={formData.authorized_documents.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  authorized_documents: [...formData.authorized_documents, permission]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  authorized_documents: formData.authorized_documents.filter(doc => doc !== permission)
                                });
                              }
                            }}
                            style={{ width: 'auto', cursor: 'pointer' }}
                          />
                          <span>{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="permissions-section-title">
                      الأقسام الإدارية
                    </label>
                    <div className="permissions-grid">
                      {ADMIN_SECTION_PERMISSIONS.map((permission) => (
                        <label key={permission} className="permission-option">
                          <input
                            type="checkbox"
                            checked={formData.authorized_documents.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  authorized_documents: [...formData.authorized_documents, permission]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  authorized_documents: formData.authorized_documents.filter(doc => doc !== permission)
                                });
                              }
                            }}
                            style={{ width: 'auto', cursor: 'pointer' }}
                          />
                          <span>{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="permissions-section-title">
                      الإعدادات
                    </label>
                    <div className="permissions-grid">
                      {SETTINGS_PERMISSIONS.map((permission) => (
                        <label key={permission} className="permission-option">
                          <input
                            type="checkbox"
                            checked={formData.authorized_documents.includes(permission)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  authorized_documents: [...formData.authorized_documents, permission]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  authorized_documents: formData.authorized_documents.filter(doc => doc !== permission)
                                });
                              }
                            }}
                            style={{ width: 'auto', cursor: 'pointer' }}
                          />
                          <span>{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {formData.authorized_documents.length === 0 && (
                    <span className="error-message" style={{ display: 'block', marginTop: '0.5rem' }}>
                      يجب اختيار صلاحية واحدة على الأقل
                    </span>
                  )}
                </>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowForm(null)}
                  disabled={submitting}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="btn-submit" 
                  disabled={submitting}
                >
                  {submitting ? 'جاري الحفظ...' : (showForm.mode === 'add' ? 'إضافة' : 'حفظ التعديلات')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmation && (
        <div className="modal" onClick={(e) => {
          if (e.target === e.currentTarget && !deleting) setDeleteConfirmation(null);
        }}>
          <div className="modal-content delete-confirm-modal">
            <div className="delete-confirm-icon">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>تأكيد الحذف</h3>
            <p className="delete-confirm-message">
              هل أنت متأكد من حذف المستخدم <strong>{deleteConfirmation.name}</strong>؟
              <br />
              <span className="delete-warning">لا يمكن التراجع عن هذا الإجراء.</span>
            </p>
            <div className="delete-confirm-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setDeleteConfirmation(null)}
                disabled={deleting}
              >
                إلغاء
              </button>
              <button 
                className="btn-delete-confirm" 
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? 'جاري الحذف...' : 'حذف'}
              </button>
            </div>
          </div>
        </div>
      )}


    </section>
  )
}
