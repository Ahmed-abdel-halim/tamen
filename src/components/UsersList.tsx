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
  // Personal Data
  full_name_quad?: string;
  mother_name?: string;
  gender?: string;
  birth_date?: string;
  birth_place?: string;
  nationality?: string;
  social_status?: string;
  qualification?: string;
  blood_type?: string;
  personal_phone?: string;
  guardian_phone?: string;
  address?: string;
  // Job Data
  financial_number?: string;
  job_number?: string;
  bank_name?: string;
  bank_branch?: string;
  account_number?: string;
  start_date?: string;
  working_hours_from?: string;
  working_hours_to?: string;
  working_days_from?: string;
  working_days_to?: string;
  contract_type?: string;
  contract_duration?: string;
  contract_conditions?: string;
  // Financial Data
  housing_allowance?: number;
  transportation_allowance?: number;
  communication_allowance?: number;
  fixed_bonuses?: number;
  fixed_fines?: number;
  hourly_leave_deduction?: number;
  daily_leave_deduction?: number;
  // Extra File URLs
  national_id_photo_url?: string;
  identity_proof_url?: string;
  certified_stamp_url?: string;
  approved_signature_url?: string;
  educational_certificate_url?: string;
  health_certificate_url?: string;
  contract_conditions_photo_url?: string;
  is_active?: boolean;
  social_security_percentage?: number;
  tax_percentage?: number;
  salary_type?: string;
  hourly_rate?: number;
  tax_file_number?: string | null;
  social_security_file_number?: string | null;
  end_date?: string | null;
  apply_tax?: boolean;
  apply_social_security?: boolean;
  eidc_username?: string | null;
  eidc_password?: string | null;
  eidc_api_key?: string | null;
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
  if (path.startsWith('data:')) return path;
  if (path.startsWith('http')) return path;

  // Clean path
  let cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // Special case for /img/ which might be in frontend or backend
  // In development, they are often in frontend/public
  // In production, we expect them to be in backend/public/img
  if (cleanPath.startsWith('img/')) {
    return `${window.location.origin}/${cleanPath}`;
  }

  if (cleanPath.startsWith('storage/')) {
    return `${BACKEND_URL}/${cleanPath}`;
  }

  return `${BACKEND_URL}/storage/${cleanPath}`;
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
  'تأمين الحوادث الشخصية',
  'تأمين حماية طلاب المدارس',
  'تأمين نقل النقدية',
  'تأمين شحن البضائع',
];

const REPORT_PERMISSIONS = [
  'المحاسب المالي',
  'اجور ومرتبات ضرائب',
  'اجور ومرتبات ضمان',
];

const ADMIN_SECTION_PERMISSIONS = [
  'إدارة الفروع والوكلاء',
  'إدارة الموظفين',
  'البريد الصادر والوارد',
  'أرشيف المستندات الإدارية',
  'دليل الجهات الخارجية',
  'طلبات الوثائق',
  'الشؤون الفنية',
  'ملفات الشركة',
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
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(0);
  const perPage = 50; // زيادة العدد في الصفحة الواحدة لضمان رؤية الجميع
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
    // الموظفين
    full_name_quad: '',
    mother_name: '',
    gender: '',
    birth_date: '',
    birth_place: '',
    nationality: '',
    social_status: '',
    qualification: '',
    blood_type: '',
    personal_phone: '',
    guardian_phone: '',
    address: '',
    financial_number: '',
    job_number: '',
    bank_name: '',
    bank_branch: '',
    account_number: '',
    start_date: '',
    working_hours_from: '',
    working_hours_to: '',
    working_days_from: '',
    working_days_to: '',
    contract_type: '',
    contract_duration: '',
    contract_conditions: '',
    housing_allowance: '' as string | number,
    transportation_allowance: '' as string | number,
    communication_allowance: '' as string | number,
    fixed_bonuses: '' as string | number,
    fixed_fines: '' as string | number,
    hourly_leave_deduction: '' as string | number,
    daily_leave_deduction: '' as string | number,
    is_active: true,
    social_security_percentage: 19.475 as string | number,
    tax_percentage: 10.000 as string | number,
    apply_tax: true,
    apply_social_security: true,
    salary_type: 'monthly',
    hourly_rate: '' as string | number,
    tax_file_number: '',
    social_security_file_number: '',
    end_date: '',
    eidc_username: '',
    eidc_password: '',
    eidc_api_key: '',
  });

  const [pendingFiles, setPendingFiles] = useState<Record<string, File | null>>({
    profile_photo: null,
    personal_id_proof: null,
    employment_contract: null,
    national_id_photo: null,
    identity_proof: null,
    certified_stamp: null,
    approved_signature: null,
    educational_certificate: null,
    health_certificate: null,
    contract_conditions_photo: null,
    passport_photo: null,
    clearance_certificate: null,
    experience_certificate: null,
    work_commencement_order: null,
    resignation_letter: null,
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<null | User>(null);
  const [deleting, setDeleting] = useState(false);

  const [filterRole, setFilterRole] = useState("all");
  const [filterJobTitle, setFilterJobTitle] = useState("all");
  const [filterPermission, setFilterPermission] = useState("all");
  const [filterActive, setFilterActive] = useState("1");

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchQuery, perPage, filterRole, filterJobTitle, filterPermission, filterActive]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRole, filterJobTitle, filterPermission, filterActive]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: perPage.toString(),
        search: searchQuery,
        role: filterRole,
        job_title: filterJobTitle,
        permission: filterPermission,
        active: filterActive
      });

      const response = await fetch(`${API_BASE_URL}/users?${params}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setUsers(data.data);
      setTotalPages(data.last_page);
      setFrom(data.from);
      setTo(data.to);
      setTotal(data.total);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      showToast(`حدث خطأ أثناء جلب المستخدمين: ${error.message || ''}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const uploadPendingEmployeeFiles = async (userId: number) => {
    const token = localStorage.getItem('token');
    for (const [type, file] of Object.entries(pendingFiles)) {
      if (!file) continue;
      const fd = new FormData();
      fd.append('type', type);
      fd.append('file', file);
      const r = await fetch(`${API_BASE_URL}/users/${userId}/employee-files`, {
        method: 'POST',
        body: fd,
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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

    const fixedCustodyHtml = userFixedCustodies.length > 0
      ? userFixedCustodies.map(c => {
          const serial = (c.serial_start || c.serial_end)
            ? `${c.serial_start || '—'}${c.serial_end ? ` إلى ${c.serial_end}` : ''}`
            : '—';
          return `<tr>
            <td style="text-align: right; border-right: none;">${escapeHtml(c.item?.name || 'صنف عهدة')}</td>
            <td>${c.quantity}</td>
            <td>${escapeHtml(serial)}</td>
            <td>${formatPrintDateTime(c.assigned_at || c.created_at)}</td>
            <td>${formatCondition(c.condition)}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding: 12px;background:#ffffff !important;">لا توجد عهدة ثابتة نشطة حالياً للموظف</td></tr>';

    const consumedCustodyHtml = userConsumedCustodies.length > 0
      ? userConsumedCustodies.map(c => {
          return `<tr>
            <td style="text-align: right; border-right: none;">${escapeHtml(c.item?.name || 'صنف عهدة')}</td>
            <td>${c.quantity}</td>
            <td>${formatPrintDateTime(c.assigned_at || c.created_at)}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding: 12px;background:#ffffff !important;">لا توجد عهدة مستهلكة نشطة حالياً للموظف</td></tr>';

    const detailsGridHtml = `
      <div class="detail-item"><span class="detail-label">الاسم بالكامل</span><span class="detail-value highlighted">${escapeHtml(u.name)}</span></div>
      <div class="detail-item"><span class="detail-label">المعرف الشخصي</span><span class="detail-value">${escapeHtml(employeeCardNumber(u))}</span></div>
      <div class="detail-item"><span class="detail-label">اسم المستخدم</span><span class="detail-value">${escapeHtml(u.username)}</span></div>
      <div class="detail-item"><span class="detail-label">المسمى الوظيفي</span><span class="detail-value">${escapeHtml((u.job_title || '').trim() || '—')}</span></div>
      <div class="detail-item"><span class="detail-label">البريد الإلكتروني</span><span class="detail-value">${escapeHtml(u.email || '—')}</span></div>
      <div class="detail-item"><span class="detail-label">نوع الحساب</span><span class="detail-value">${escapeHtml(u.user_type || '—')}</span></div>
      <div class="detail-item full-width"><span class="detail-label">الراتب الشهري</span><span class="detail-value currency">${u.salary != null ? `${Number(u.salary).toLocaleString('ar-LY')} دينار ليبي` : '—'}</span></div>
    `;

    const totalCustodies = userFixedCustodies.length + userConsumedCustodies.length;
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
      <title>استمارة بيانات موظف - ${escapeHtml(u.name)}</title>
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
        .detail-item.full-width {
          grid-column: span 2;
          background: #f0fdf4 !important;
          border: 1px solid #bbf7d0;
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
        .detail-item.full-width .detail-label {
          color: #15803d;
        }
        .detail-item.full-width .detail-value {
          color: #16a34a;
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
            <h1>استمارة بيانات موظف</h1>
            <p>قسم الشؤون الإدارية</p>
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
                <div class="photo-label">الصورة الشخصية</div>
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
              <p><strong>تعهد وإقرار استلام عهدة:</strong> أقر أنا الموظف الموقع أدناه بأنني قد تسلمت المواد والأصول الموضحة في الجداول أعلاه، وهي في حالة ممتازة وصالحة للاستعمال، وأتعهد بالمحافظة عليها واستعمالها في أغراض العمل المخصصة لها، كما أتعهد بإعادتها كاملة وبحالة جيدة للشركة فور طلبها أو عند انتهاء علاقتي التعاقدية معها لأي سبب كان.</p>
            </div>
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

  const printEmployeeIdCard = (employee: User) => {
    const w = window.open('', '_blank', 'width=520,height=420');
    if (!w) return;

    const num = escapeHtml(employeeCardNumber(employee));
    const name = escapeHtml(employee.name);
    const job = escapeHtml((employee.job_title || '').trim() || '—');
    const idPhotoSrc = resolvePublicUrl(employee.profile_photo_url);
    const logoSrc = resolvePublicUrl('/img/logo.png');

    // Adjusted wave to make blue section visually equal/larger
    const bgSvg = `data:image/svg+xml;utf8,<svg viewBox="0 0 830 540" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M856 0 L428 0 C328 150 528 350 428 540 L856 540 Z" fill="%231e40af"/><path d="M428 0 C328 150 528 350 428 540 L408 540 C508 350 308 150 408 0 Z" fill="%23139625"/></svg>`;

    w.document.write(`<!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>طباعة بطاقة الموظف</title>
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
              ${idPhotoSrc ? `<img src="${escapeHtml(idPhotoSrc)}" alt="Photo" onerror="this.style.display='none'" />` : '<div class="no-img">بلا صورة</div>'}
            </div>
            <div class="id-data">
              <div class="id-row"><span>المعرف:</span> <span>${escapeHtml(num)}</span></div>
              <div class="id-row"><span>الإصدار:</span> <span>${new Date().toLocaleDateString('en-GB')}</span></div>
            </div>
          </div>
          
          <div class="left-section">
            <div class="badge-type">بطاقة موظف</div>
            
            <div class="header-box">
               <div class="logo-wrapper"><img src="${escapeHtml(logoSrc)}" alt="Logo" onerror="this.src='/img/logo.png'" /></div>
            </div>
            
            <div class="employee-info">
              <div class="emp-name">${escapeHtml(name)}</div>
              <div class="emp-role">${escapeHtml(job)}</div>
            </div>
            
            <div class="footer-note">صدرت عن قسم الموارد البشرية</div>
          </div>
        </div>
      </body>
      </html>
    `);
    w.document.close();
  };

  useEffect(() => {
    setPendingFiles({
      profile_photo: null,
      personal_id_proof: null,
      employment_contract: null,
      national_id_photo: null,
      identity_proof: null,
      certified_stamp: null,
      approved_signature: null,
      educational_certificate: null,
      health_certificate: null,
      contract_conditions_photo: null,
      passport_photo: null,
      clearance_certificate: null,
      experience_certificate: null,
      work_commencement_order: null,
      resignation_letter: null,
    });
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
        // الموظفين
        full_name_quad: showForm.user.full_name_quad || '',
        mother_name: showForm.user.mother_name || '',
        gender: showForm.user.gender || '',
        birth_date: showForm.user.birth_date || '',
        birth_place: showForm.user.birth_place || '',
        nationality: showForm.user.nationality || '',
        social_status: showForm.user.social_status || '',
        qualification: showForm.user.qualification || '',
        blood_type: showForm.user.blood_type || '',
        personal_phone: showForm.user.personal_phone || '',
        guardian_phone: showForm.user.guardian_phone || '',
        address: showForm.user.address || '',
        financial_number: showForm.user.financial_number || '',
        job_number: showForm.user.job_number || '',
        bank_name: showForm.user.bank_name || '',
        bank_branch: showForm.user.bank_branch || '',
        account_number: showForm.user.account_number || '',
        start_date: showForm.user.start_date || '',
        working_hours_from: showForm.user.working_hours_from || '',
        working_hours_to: showForm.user.working_hours_to || '',
        working_days_from: showForm.user.working_days_from || '',
        working_days_to: showForm.user.working_days_to || '',
        contract_type: showForm.user.contract_type || '',
        contract_duration: showForm.user.contract_duration || '',
        contract_conditions: showForm.user.contract_conditions || '',
        housing_allowance: showForm.user.housing_allowance || '',
        transportation_allowance: showForm.user.transportation_allowance || '',
        communication_allowance: showForm.user.communication_allowance || '',
        fixed_bonuses: showForm.user.fixed_bonuses || '',
        fixed_fines: showForm.user.fixed_fines || '',
        hourly_leave_deduction: showForm.user.hourly_leave_deduction || '',
        daily_leave_deduction: showForm.user.daily_leave_deduction || '',
        is_active: showForm.user.is_active !== undefined ? showForm.user.is_active : true,
        social_security_percentage: showForm.user.social_security_percentage ?? 19.475,
        tax_percentage: showForm.user.tax_percentage ?? 10.000,
        apply_tax: showForm.user.apply_tax ?? true,
        apply_social_security: showForm.user.apply_social_security ?? true,
        salary_type: showForm.user.salary_type || 'monthly',
        hourly_rate: showForm.user.hourly_rate || '',
        tax_file_number: showForm.user.tax_file_number || '',
        social_security_file_number: showForm.user.social_security_file_number || '',
        end_date: showForm.user.end_date || '',
        eidc_username: showForm.user.eidc_username || '',
        eidc_password: showForm.user.eidc_password || '',
        eidc_api_key: showForm.user.eidc_api_key || '',
      });
    } else {
      const nextId = total + 1;
      const currentYear = new Date().getFullYear();
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
        full_name_quad: '',
        mother_name: '',
        gender: '',
        birth_date: '',
        birth_place: '',
        nationality: '',
        social_status: '',
        qualification: '',
        blood_type: '',
        personal_phone: '',
        guardian_phone: '',
        address: '',
        financial_number: `MLI${nextId}`,
        job_number: `${nextId}-${currentYear}`,
        bank_name: '',
        bank_branch: '',
        account_number: '',
        start_date: '',
        working_hours_from: '',
        working_hours_to: '',
        working_days_from: '',
        working_days_to: '',
        contract_type: '',
        contract_duration: '',
        contract_conditions: '',
        housing_allowance: '',
        transportation_allowance: '',
        communication_allowance: '',
        fixed_bonuses: '',
        fixed_fines: '',
        hourly_leave_deduction: '',
        daily_leave_deduction: '',
        is_active: true,
        social_security_percentage: 19.475,
        tax_percentage: 10.000,
        apply_tax: true,
        apply_social_security: true,
        salary_type: 'monthly',
        hourly_rate: '',
        tax_file_number: '',
        social_security_file_number: '',
        end_date: '',
        eidc_username: '',
        eidc_password: '',
        eidc_api_key: '',
      });
    }
    setFormErrors({});
  }, [showForm]);

  useEffect(() => {
    if (formData.start_date && formData.contract_duration) {
      const start = new Date(formData.start_date);
      let months = 0;
      const duration = formData.contract_duration.trim();
      if (duration === 'شهر') months = 1;
      else if (duration === 'شهرين') months = 2;
      else if (duration === 'تلات اشهر' || duration === 'ثلاثة أشهر' || duration === '3 أشهر') months = 3;
      else if (duration === 'ست اشهر' || duration === 'ستة أشهر' || duration === '6 أشهر') months = 6;
      else if (duration === 'عام' || duration === 'سنة' || duration === 'سنة واحدة' || duration === '12 شهر') months = 12;
      else if (duration === 'سنتين' || duration === '2 سنة' || duration === '24 شهر') months = 24;
      else if (duration === 'تلات سنوات' || duration === 'ثلاث سنوات' || duration === '3 سنوات') months = 36;
      
      if (months > 0) {
        start.setMonth(start.getMonth() + months);
        setFormData(prev => ({ ...prev, end_date: start.toISOString().split('T')[0] }));
      }
    }
  }, [formData.start_date, formData.contract_duration]);

  // إلغاء الفلترة المحلية والاعتماد على بيانات الخادم مباشرة
  const paginatedUsers = users;
  const filteredUsers = users; // للملفات التي تعتمد على هذا المسمى
  const displayTotalPages = totalPages;
  // const displayTotalUsers = total;

  const handleDeleteClick = (user: User) => {
    setDeleteConfirmation(user);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/users/${deleteConfirmation.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
        ...formData,
        email: formData.email || null,
        salary: formData.salary || null,
        national_id_number: formData.national_id_number.trim() || null,
        job_title: formData.job_title.trim() || null,
        housing_allowance: formData.housing_allowance || 0,
        transportation_allowance: formData.transportation_allowance || 0,
        communication_allowance: formData.communication_allowance || 0,
        fixed_bonuses: formData.fixed_bonuses || 0,
        fixed_fines: formData.fixed_fines || 0,
        hourly_leave_deduction: formData.hourly_leave_deduction || 0,
        daily_leave_deduction: formData.daily_leave_deduction || 0,
        is_active: formData.is_active,
        social_security_percentage: formData.social_security_percentage || 0,
        tax_percentage: formData.tax_percentage || 0,
        apply_tax: formData.apply_tax,
        apply_social_security: formData.apply_social_security,
        salary_type: formData.salary_type || 'monthly',
        hourly_rate: formData.hourly_rate || 0,
        tax_file_number: formData.tax_file_number || null,
        social_security_file_number: formData.social_security_file_number || null,
        end_date: formData.end_date || null,
      };

      // الصلاحيات فقط للمستخدمين غير المديرين
      if (!formData.is_admin) {
        body.authorized_documents = formData.authorized_documents;
      }

      if (showForm?.mode === 'add' || formData.password) {
        body.password = formData.password;
      }

      const token = localStorage.getItem('token');
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
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
        } catch { }
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
        full_name_quad: '',
        mother_name: '',
        gender: '',
        birth_date: '',
        birth_place: '',
        nationality: '',
        social_status: '',
        qualification: '',
        blood_type: '',
        personal_phone: '',
        guardian_phone: '',
        address: '',
        financial_number: '',
        job_number: '',
        bank_name: '',
        bank_branch: '',
        account_number: '',
        start_date: '',
        working_hours_from: '',
        working_hours_to: '',
        working_days_from: '',
        working_days_to: '',
        contract_type: '',
        contract_duration: '',
        contract_conditions: '',
        housing_allowance: '',
        transportation_allowance: '',
        communication_allowance: '',
        fixed_bonuses: '',
        fixed_fines: '',
        hourly_leave_deduction: '',
        daily_leave_deduction: '',
        is_active: true,
        social_security_percentage: 19.475,
        tax_percentage: 10.000,
        apply_tax: true,
        apply_social_security: true,
        salary_type: 'monthly',
        hourly_rate: '',
        tax_file_number: '',
        social_security_file_number: '',
        end_date: '',
        eidc_username: '',
        eidc_password: '',
        eidc_api_key: '',
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
      <div className="users-breadcrumb" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', borderRadius: '16px', marginBottom: '30px', color: '#fff'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <i className="fa-solid fa-users-gear" style={{ color: '#38bdf8' }}></i>
                إدارة الموظفين والمستخدمين
            </h2>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>التحكم في بيانات الموظفين، الصلاحيات، والرواتب</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm({ mode: 'add' })} style={{ borderRadius: '10px', padding: '12px 25px', fontSize: '15px', fontWeight: 'bold', background: 'var(--accent-cyan)', border: 'none', boxShadow: '0 4px 12px var(--accent-shadow)' }}>
            <i className="fa-solid fa-user-plus"></i> إضافة موظف جديد
        </button>
      </div>

      <div className="users-card">
        <div className="users-card-header">
            <div className="header-right">
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#2563eb' }}>
                    قائمة الموظفين والمستخدمين بالنظام
                </h3>
            </div>
        </div>

        <div className="filters-row" style={{ 
            padding: '15px 20px', 
            background: 'transparent', 
            border: '1px solid var(--border)', 
            borderRadius: '12px',
            margin: '0 0 20px 0',
            display: 'grid', 
            gridTemplateColumns: '1.5fr 1fr 1fr 1fr 0.5fr', 
            gap: '15px', 
            alignItems: 'end' 
        }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', marginBottom: '5px' }}>بحث بالاسم أو الرقم</label>
                <div className="search-wrapper" style={{ width: '100%' }}>
                    <i className="fa-solid fa-magnifying-glass search-icon"></i>
                    <input 
                        type="text" 
                        placeholder="بحث بالاسم أو الرقم الوطني..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', marginBottom: '5px' }}>حالة الحساب</label>
                <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', width: '100%' }}>
                    <option value="all">كل الحالات</option>
                    <option value="1">حسابات نشطة</option>
                    <option value="0">حسابات متوقفة</option>
                </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', marginBottom: '5px' }}>درجة الوصول</label>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', width: '100%' }}>
                    <option value="all">جميع الدرجات</option>
                    <option value="admin">مدراء النظام</option>
                    <option value="user">موظفين</option>
                </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '12px', marginBottom: '5px' }}>المسمى الوظيفي</label>
                <input 
                    type="text" 
                    placeholder="بحث بالمسمى..." 
                    value={filterJobTitle === 'all' ? '' : filterJobTitle}
                    onChange={(e) => setFilterJobTitle(e.target.value || 'all')}
                    style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--card-bg)', width: '100%' }}
                />
            </div>
            <button onClick={() => { setSearchQuery(''); setFilterActive('1'); setFilterRole('all'); setFilterJobTitle('all'); setFilterPermission('all'); }} className="btn-cancel" style={{ padding: '10px', height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', background: 'var(--accent-cyan)', color: '#fff', border: 'none', fontWeight: 'bold' }}>
                <i className="fa-solid fa-rotate-left"></i> تفريغ
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
                          {u.is_active ? (
                            <span className="status-badge active">نشط</span>
                          ) : (
                            <span className="status-badge inactive" style={{ background: '#fee2e2', color: '#991b1b' }}>غير نشط</span>
                          )}
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
                          {u.salary_type === 'hourly' ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '700', color: 'var(--text)' }}>{Number(u.hourly_rate).toLocaleString()} د.ل / ساعة</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>مقابل الوقت</span>
                            </div>
                          ) : u.salary ? (
                            <span style={{ fontWeight: '700', color: 'var(--text)' }}>{Number(u.salary).toLocaleString()} د.ل</span>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>-</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem' }}>{u.national_id_number || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                        <td style={{ fontSize: '0.8rem', maxWidth: 140 }} title={u.job_title || ''}>
                          {u.job_title ? (
                            u.job_title.length > 28 ? `${u.job_title.slice(0, 28)}…` : u.job_title
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          {u.is_admin ? (
                            <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>جميع الصلاحيات</span>
                          ) : u.authorized_documents && u.authorized_documents.length > 0 ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                              {u.authorized_documents.slice(0, 2).map((doc, idx) => (
                                <div key={idx} style={{ marginBottom: '0.25rem' }}>{doc}</div>
                              ))}
                              {u.authorized_documents.length > 2 && (
                                <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                                  +{u.authorized_documents.length - 2} أكثر
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>لا توجد صلاحيات</span>
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
                            <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>جميع الصلاحيات</span>
                          ) : u.authorized_documents && u.authorized_documents.length > 0 ? (
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                              {u.authorized_documents.slice(0, 3).map((doc, idx) => (
                                <div key={idx} style={{ marginBottom: '0.25rem' }}>{doc}</div>
                              ))}
                              {u.authorized_documents.length > 3 && (
                                <div style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                                  +{u.authorized_documents.length - 3} أكثر
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--muted)' }}>لا توجد صلاحيات</span>
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
                  عرض {from} إلى {to} من {total} مستخدم
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

                  {Array.from({ length: displayTotalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === displayTotalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                    .reduce((acc: (number | string)[], p, i, arr) => {
                      if (i > 0 && p !== (arr[i - 1] as number) + 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) => (
                      item === '...' ? (
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
                    ))
                  }

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

            <form onSubmit={handleSubmit} className="user-form-premium">
              {/* Section 1: Login & Access */}
              <div className="form-section-card fade-in">
                <h4 className="section-title-premium"><i className="fa-solid fa-key"></i> بيانات الدخول ودرجة الوصول</h4>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="username">اسم المستخدم <span className="required">*</span></label>
                    <div className="input-with-icon">
                      <i className="fa-solid fa-user"></i>
                      <input
                        type="text" id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className={formErrors.username ? 'error' : ''}
                        placeholder="أدخل اسم المستخدم"
                      />
                    </div>
                    {formErrors.username && <span className="error-message">{formErrors.username}</span>}
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="password">
                      كلمة المرور {showForm.mode === 'add' && <span className="required">*</span>}
                    </label>
                    <div className="input-with-icon">
                      <i className="fa-solid fa-lock"></i>
                      <input
                        type="password" id="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className={formErrors.password ? 'error' : ''}
                        placeholder={showForm.mode === 'edit' ? "اتركه فارغاً للحفاظ على القديم" : "أدخل كلمة المرور"}
                      />
                    </div>
                    {formErrors.password && <span className="error-message">{formErrors.password}</span>}
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="email">البريد الإلكتروني</label>
                    <div className="input-with-icon">
                      <i className="fa-solid fa-envelope"></i>
                      <input
                        type="email" id="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="example@mail.com"
                      />
                    </div>
                  </div>
                </div>

                {/* EIDC Credentials Section */}
                <div className="form-row" style={{ marginTop: '15px', padding: '15px', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                  <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                    <label style={{ color: '#0369a1', fontWeight: '800' }}>
                      <i className="fa-solid fa-id-card-clip"></i> اسم مستخدم الهيئة (EIDC)
                    </label>
                    <div className="input-with-icon">
                      <i className="fa-solid fa-user-shield" style={{ color: '#0369a1' }}></i>
                      <input
                        type="text"
                        value={formData.eidc_username}
                        onChange={(e) => setFormData({ ...formData, eidc_username: e.target.value })}
                        placeholder="اختياري للوكلاء"
                        style={{ border: '1px solid #7dd3fc' }}
                      />
                    </div>
                  </div>
                  <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                    <label style={{ color: '#0369a1', fontWeight: '800' }}>
                      <i className="fa-solid fa-key"></i> كلمة مرور الهيئة (EIDC)
                    </label>
                    <div className="input-with-icon">
                      <i className="fa-solid fa-lock" style={{ color: '#0369a1' }}></i>
                      <input
                        type="password"
                        value={formData.eidc_password}
                        onChange={(e) => setFormData({ ...formData, eidc_password: e.target.value })}
                        placeholder="اختياري للوكلاء"
                        style={{ border: '1px solid #7dd3fc' }}
                      />
                    </div>
                  </div>
                </div>
                <div className="form-row" style={{ marginTop: '15px' }}>
                  <div className="form-group flex-1">
                    <label className="checkbox-label-premium">
                      <div className="chk-content">
                        <i className="fa-solid fa-user-shield"></i>
                        <div>
                          <span className="chk-title">مدير نظام (Admin)</span>
                          <span className="chk-desc">صلاحيات كاملة للتحكم في النظام</span>
                        </div>
                      </div>
                      <input
                        type="checkbox" checked={formData.is_admin}
                        onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked, authorized_documents: e.target.checked ? [] : formData.authorized_documents })}
                      />
                    </label>
                  </div>
                  <div className="form-group flex-1">
                    <label className="checkbox-label-premium">
                      <div className="chk-content">
                        <i className="fa-solid fa-circle-check"></i>
                        <div>
                          <span className="chk-title">الموظف نشط</span>
                          <span className="chk-desc">تمكين الموظف من تسجيل الدخول</span>
                        </div>
                      </div>
                      <input
                        type="checkbox" checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Section 2: Personal Data */}
              <div className="form-section-card fade-in">
                <h4 className="section-title-premium"><i className="fa-solid fa-user-tag"></i> البيانات الشخصية للموظف</h4>
                <div className="form-row">
                  <div className="form-group flex-2">
                    <label>الاسم بالكامل (رباعي) <span className="required">*</span></label>
                    <input
                      type="text"
                      value={formData.full_name_quad}
                      onChange={(e) => setFormData({ ...formData, full_name_quad: e.target.value, name: e.target.value })}
                      placeholder="الاسم الرباعي كما في الهوية"
                      className={formErrors.name ? 'error' : ''}
                    />
                    {formErrors.name && <span className="error-message">{formErrors.name}</span>}
                  </div>
                  <div className="form-group flex-1">
                    <label>الجنس</label>
                    <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                      <option value="">اختر</option>
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>
                  <div className="form-group flex-1">
                    <label>تاريخ الميلاد</label>
                    <input type="date" value={formData.birth_date} onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>الرقم القومي / الوطني</label>
                    <input type="text" value={formData.national_id_number} onChange={(e) => setFormData({ ...formData, national_id_number: e.target.value })} placeholder="12 رقم" />
                  </div>
                  <div className="form-group flex-1">
                    <label>مكان الميلاد</label>
                    <input type="text" value={formData.birth_place} onChange={(e) => setFormData({ ...formData, birth_place: e.target.value })} placeholder="المحافظة / المدينة" />
                  </div>
                  <div className="form-group flex-1">
                    <label>الجنسية</label>
                    <input type="text" value={formData.nationality} onChange={(e) => setFormData({ ...formData, nationality: e.target.value })} placeholder="مثال: ليبي" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>اسم الأم</label>
                    <input type="text" value={formData.mother_name} onChange={(e) => setFormData({ ...formData, mother_name: e.target.value })} placeholder="اسم الأم الكامل" />
                  </div>
                  <div className="form-group flex-1">
                    <label>الحالة الاجتماعية</label>
                    <select value={formData.social_status} onChange={(e) => setFormData({ ...formData, social_status: e.target.value })}>
                      <option value="">اختر</option>
                      <option value="أعزب">أعزب</option>
                      <option value="متزوج">متزوج</option>
                      <option value="مطلق">مطلق</option>
                      <option value="أرمل">أرمل</option>
                    </select>
                  </div>
                  <div className="form-group flex-1">
                    <label>المؤهل العلمي</label>
                    <input type="text" value={formData.qualification} onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} placeholder="المؤهل" />
                  </div>
                  <div className="form-group flex-1">
                    <label>فصيلة الدم</label>
                    <input type="text" value={formData.blood_type} onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })} placeholder="A+, O- ..." />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>رقم الهاتف الشخصي</label>
                    <input type="text" value={formData.personal_phone} onChange={(e) => setFormData({ ...formData, personal_phone: e.target.value })} placeholder="000 000 000" />
                  </div>
                  <div className="form-group flex-1">
                    <label>هاتف الطوارئ</label>
                    <input type="text" value={formData.guardian_phone} onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })} placeholder="000 000 000" />
                  </div>
                  <div className="form-group flex-2">
                    <label>عنوان السكن بالتفصيل</label>
                    <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="المحافظة - المدينة - الشارع" />
                  </div>
                </div>
              </div>

              {/* Section 3: Job Data */}
              <div className="form-section-card fade-in">
                <h4 className="section-title-premium"><i className="fa-solid fa-briefcase"></i> البيانات الوظيفية والمصرفية</h4>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>الرقم الوظيفي (تلقائي)</label>
                    <input 
                      type="text" 
                      value={formData.job_number} 
                      onChange={(e) => setFormData({ ...formData, job_number: e.target.value })} 
                      placeholder="تلقائي" 
                      readOnly
                      style={{ backgroundColor: '#e2e8f0', cursor: 'not-allowed', color: '#475569', fontWeight: 'bold' }}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>الرقم المالي (تلقائي)</label>
                    <input 
                      type="text" 
                      value={formData.financial_number} 
                      onChange={(e) => setFormData({ ...formData, financial_number: e.target.value })} 
                      placeholder="تلقائي" 
                      readOnly
                      style={{ backgroundColor: '#e2e8f0', cursor: 'not-allowed', color: '#475569', fontWeight: 'bold' }}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>المسمى الوظيفي</label>
                    <input type="text" value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })} placeholder="المسمى" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>تاريخ المباشرة</label>
                    <input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                  </div>
                  <div className="form-group flex-1">
                    <label>مدة العقد</label>
                    <input 
                      list="contract_durations" 
                      value={formData.contract_duration} 
                      onChange={(e) => setFormData({ ...formData, contract_duration: e.target.value })} 
                      placeholder="اختر أو اكتب مدة العقد" 
                    />
                    <datalist id="contract_durations">
                      <option value="شهر" />
                      <option value="شهرين" />
                      <option value="تلات اشهر" />
                      <option value="ست اشهر" />
                      <option value="عام" />
                      <option value="سنتين" />
                      <option value="تلات سنوات" />
                      <option value="غير محدد" />
                    </datalist>
                  </div>
                  <div className="form-group flex-1">
                    <label>تاريخ انتهاء العمل</label>
                    <input type="date" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>رقم الملف الضريبي</label>
                    <input type="text" value={formData.tax_file_number} onChange={(e) => setFormData({ ...formData, tax_file_number: e.target.value })} placeholder="الرقم الضريبي" />
                  </div>
                  <div className="form-group flex-1">
                    <label>رقم الملف الضماني</label>
                    <input type="text" value={formData.social_security_file_number} onChange={(e) => setFormData({ ...formData, social_security_file_number: e.target.value })} placeholder="الرقم الضماني" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>اسم المصرف</label>
                    <input type="text" value={formData.bank_name} onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })} placeholder="اسم البنك" />
                  </div>
                  <div className="form-group flex-1">
                    <label>رقم الحساب (IBAN)</label>
                    <input type="text" value={formData.account_number} onChange={(e) => setFormData({ ...formData, account_number: e.target.value })} placeholder="IBAN" />
                  </div>
                  <div className="form-group flex-1">
                    <label>نوع العقد</label>
                    <input 
                      list="contract_types" 
                      value={formData.contract_type} 
                      onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })} 
                      placeholder="اختر أو اكتب نوع العقد" 
                    />
                    <datalist id="contract_types">
                      <option value="مجلس الاداره" />
                      <option value="مدير عام" />
                      <option value="مدير فرع" />
                      <option value="موظف" />
                      <option value="مندوب" />
                      <option value="متدرب" />
                    </datalist>
                  </div>
                </div>
                <div className="form-group">
                  <label>شروط العمل الخاصة بالموظف المتفق عليها</label>
                  <textarea value={formData.contract_conditions} onChange={(e) => setFormData({ ...formData, contract_conditions: e.target.value })} rows={3} placeholder="شروط أو ملاحظات خاصة..."></textarea>
                </div>
              </div>

              {/* Section 4: Financial Data */}
              <div className="form-section-card fade-in">
                <h4 className="section-title-premium"><i className="fa-solid fa-money-bill-wave"></i> الرواتب والبدلات المالية</h4>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>نوع المرتب</label>
                    <select value={formData.salary_type} onChange={(e) => setFormData({ ...formData, salary_type: e.target.value })}>
                      <option value="monthly">مرتب شهري</option>
                      <option value="hourly">مقابل الوقت (بالساعة)</option>
                    </select>
                  </div>
                  {formData.salary_type === 'monthly' ? (
                    <div className="form-group flex-1">
                      <label>المرتب الأساسي</label>
                      <input type="number" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: e.target.value })} placeholder="0.00" />
                    </div>
                  ) : (
                    <div className="form-group flex-1">
                      <label>قيمة الساعة</label>
                      <input type="number" value={formData.hourly_rate} onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })} placeholder="0.00" />
                    </div>
                  )}
                  <div className="form-group flex-1">
                    <label>بدل سكن</label>
                    <input type="number" value={formData.housing_allowance} onChange={(e) => setFormData({ ...formData, housing_allowance: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="form-group flex-1">
                    <label>بدل مواصلات</label>
                    <input type="number" value={formData.transportation_allowance} onChange={(e) => setFormData({ ...formData, transportation_allowance: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>بدل إتصالات</label>
                    <input type="number" value={formData.communication_allowance} onChange={(e) => setFormData({ ...formData, communication_allowance: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="form-group flex-1">
                    <label>مكافآت ثابتة</label>
                    <input type="number" value={formData.fixed_bonuses} onChange={(e) => setFormData({ ...formData, fixed_bonuses: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="form-group flex-1">
                    <label>غرامات ثابتة</label>
                    <input type="number" value={formData.fixed_fines} onChange={(e) => setFormData({ ...formData, fixed_fines: e.target.value })} placeholder="0.00" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>خصم غياب (ساعة)</label>
                    <input type="number" value={formData.hourly_leave_deduction} onChange={(e) => setFormData({ ...formData, hourly_leave_deduction: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="form-group flex-1">
                    <label>خصم غياب (يوم)</label>
                    <input type="number" value={formData.daily_leave_deduction} onChange={(e) => setFormData({ ...formData, daily_leave_deduction: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="form-group flex-1">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ marginBottom: 0 }}>حصة الضرائب %</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: formData.apply_tax ? 'var(--accent-blue)' : 'var(--muted)' }}>
                        <input type="checkbox" checked={formData.apply_tax} onChange={(e) => setFormData({ ...formData, apply_tax: e.target.checked })} />
                        <span>تنطبق</span>
                      </label>
                    </div>
                    <input type="number" step="0.001" disabled={!formData.apply_tax} value={formData.tax_percentage} onChange={(e) => setFormData({ ...formData, tax_percentage: e.target.value })} placeholder="10" style={{ opacity: formData.apply_tax ? 1 : 0.6 }} />
                  </div>
                  <div className="form-group flex-1">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ marginBottom: 0 }}>حصة الضمان %</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: formData.apply_social_security ? '#139625' : 'var(--muted)' }}>
                        <input type="checkbox" checked={formData.apply_social_security} onChange={(e) => setFormData({ ...formData, apply_social_security: e.target.checked })} />
                        <span>ينطبق</span>
                      </label>
                    </div>
                    <input type="number" step="0.001" disabled={!formData.apply_social_security} value={formData.social_security_percentage} onChange={(e) => setFormData({ ...formData, social_security_percentage: e.target.value })} placeholder="19.475" style={{ opacity: formData.apply_social_security ? 1 : 0.6 }} />
                  </div>
                </div>
              </div>

              {/* Section 5: Attachments */}
              <div className="form-section-card fade-in">
                <h4 className="section-title-premium"><i className="fa-solid fa-paperclip"></i> المستندات والأوراق الثبوتية</h4>
                <div className="permissions-grid-sm">
                  {[
                    { key: 'profile_photo', label: 'صورة شخصية', icon: 'fa-user-circle' },
                    { key: 'national_id_photo', label: 'رقم القومي (صورة)', icon: 'fa-id-card' },
                    { key: 'identity_proof', label: 'إثبات هوية', icon: 'fa-passport' },
                    { key: 'employment_contract', label: 'عقد عمل', icon: 'fa-file-contract' },
                    { key: 'passport_photo', label: 'جواز السفر', icon: 'fa-plane-departure' },
                    { key: 'clearance_certificate', label: 'شهادة البراءة', icon: 'fa-certificate' },
                    { key: 'experience_certificate', label: 'شهادة خبرة', icon: 'fa-award' },
                    { key: 'work_commencement_order', label: 'أمر مباشرة العمل', icon: 'fa-file-signature' },
                    { key: 'resignation_letter', label: 'استقالة / انهاء العقد', icon: 'fa-right-from-bracket' },
                    { key: 'certified_stamp', label: 'توقيع شؤون الموظفين', icon: 'fa-stamp' },
                    { key: 'approved_signature', label: 'توقيع الموظف', icon: 'fa-signature' },
                    { key: 'educational_certificate', label: 'شهادة تعليمية', icon: 'fa-graduation-cap' },
                    { key: 'health_certificate', label: 'شهادة صحية', icon: 'fa-file-medical' },
                    { key: 'contract_conditions_photo', label: 'شروط العقد (صورة)', icon: 'fa-file-lines' },
                  ].map((doc) => (
                    <label key={doc.key} className={`perm-chk ${pendingFiles[doc.key] ? 'active' : ''}`} style={{ flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100px', justifyContent: 'center', position: 'relative' }}>
                      <i className={`fa-solid ${doc.icon}`} style={{ fontSize: '1.5rem', marginBottom: '8px', color: pendingFiles[doc.key] ? '#2563eb' : '#94a3b8' }}></i>
                      <span style={{ fontSize: '0.75rem' }}>{doc.label}</span>
                      <input type="file" accept="image/*,.pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => setPendingFiles({ ...pendingFiles, [doc.key]: e.target.files?.[0] || null })} />
                      {pendingFiles[doc.key] && <div style={{ position: 'absolute', top: '5px', left: '5px', color: '#10b981' }}><i className="fa-solid fa-circle-check"></i></div>}
                      {pendingFiles[doc.key] && <div style={{ fontSize: '0.6rem', color: '#2563eb', marginTop: '2px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pendingFiles[doc.key]!.name}</div>}
                    </label>
                  ))}
                </div>
              </div>

              {!formData.is_admin && (
                <div className="form-section-card fade-in">
                  <h4 className="section-title-premium"><i className="fa-solid fa-shield"></i> الصلاحيات الممنوحة للمستخدم</h4>
                  <div className="permissions-tabs">
                    <div className="form-group">
                      <label className="permissions-label">أنواع التأمين المسموح بها</label>
                      <div className="permissions-grid-sm">
                        {INSURANCE_TYPES.map((type) => (
                          <label key={type} className={`perm-chk ${formData.authorized_documents.includes(type) ? 'active' : ''}`}>
                            <input type="checkbox" checked={formData.authorized_documents.includes(type)} onChange={(e) => {
                              const list = e.target.checked ? [...formData.authorized_documents, type] : formData.authorized_documents.filter(d => d !== type);
                              setFormData({ ...formData, authorized_documents: list });
                            }} />
                            <span>{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="form-group mt-4">
                      <label className="permissions-label">الأقسام الإدارية والمالية</label>
                      <div className="permissions-grid-sm">
                        {[...REPORT_PERMISSIONS, ...ADMIN_SECTION_PERMISSIONS, ...SETTINGS_PERMISSIONS].map((p) => (
                          <label key={p} className={`perm-chk ${formData.authorized_documents.includes(p) ? 'active' : ''}`}>
                            <input type="checkbox" checked={formData.authorized_documents.includes(p)} onChange={(e) => {
                              const list = e.target.checked ? [...formData.authorized_documents, p] : formData.authorized_documents.filter(d => d !== p);
                              setFormData({ ...formData, authorized_documents: list });
                            }} />
                            <span>{p}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {formErrors.authorized_documents && (
                      <div className="error-message" style={{ textAlign: 'center', marginTop: '15px', fontSize: '0.9rem' }}>
                        <i className="fa-solid fa-triangle-exclamation"></i> {formErrors.authorized_documents}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="form-actions-premium">
                <button type="button" className="btn-cancel" onClick={() => setShowForm(null)} disabled={submitting}>إلغاء</button>
                <button type="submit" className="btn-submit-premium" style={{ background: 'var(--accent-cyan)', color: '#fff', border: 'none', padding: '12px 30px', borderRadius: '12px', fontWeight: 'bold', boxShadow: '0 4px 12px var(--accent-shadow)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} disabled={submitting}>
                  {submitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-save"></i>}
                  {submitting ? ' جاري الحفظ...' : (showForm.mode === 'add' ? ' إنشاء الحساب' : ' حفظ التعديلات')}
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
