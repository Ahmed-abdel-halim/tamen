// API Configuration
// 
// للاستخدام في production على cPanel:
// 1. أنشئ ملف .env في مجلد frontend مع المحتوى التالي:
//    VITE_API_BASE_URL=https://yourdomain.com/api
//    أو إذا كان الـ backend على نفس الـ domain:
//    VITE_API_BASE_URL=/api
//
// 2. أو غيّر القيمة الافتراضية في return '/api' أدناه إلى الـ URL الصحيح
//
// ملاحظة: بعد تغيير .env، يجب إعادة بناء المشروع (npm run build)

const getApiBaseUrl = (): string => {
  // إذا كان هناك environment variable محدد، استخدمه
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // في development، استخدم proxy
  if (import.meta.env.DEV) {
    return 'http://localhost:8000/api';
  }
  
  // في production، استخدم الـ domain المحدد
  return 'https://api.mli.ly/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Ensure BACKEND_URL is absolute or starts with /
const getBackendUrl = () => {
  let base = API_BASE_URL.replace(/\/api\/?$/i, '');
  if (base === '') return ''; // في حالة الـ proxy المحلي
  if (base.startsWith('/') || base.startsWith('http')) return base;
  return `https://${base}`;
};

export const BACKEND_URL = getBackendUrl();

export const apiUrl = (path: string): string => {
  // إزالة الـ slash الأول إذا كان موجوداً
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

/**
 * Resolves a storage path from the backend to a full URL.
 * Handles different storage directory formats and environment-specific domains.
 */
export const resolveImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  
  // 1. Handle absolute URLs already in the DB
  if (path.startsWith('http')) {
    // If it's a localhost URL from a migration but we're on production, fix it
    if (path.includes('localhost') && !window.location.hostname.includes('localhost')) {
      const cleanPath = path.replace(/http:\/\/[^\/]+/, '');
      return resolveImageUrl(cleanPath);
    }
    return path;
  }
  
  // 2. Clean the path
  let cleanPath = path.startsWith('/') ? path.substring(1) : path;
  
  // 3. Determine the base backend URL
  const isLive = window.location.hostname.includes('mli.ly');
  const defaultBackend = isLive ? 'https://api.mli.ly' : 'http://localhost:8000';
  
  // Use BACKEND_URL if it's absolute, otherwise fallback to guessed domain
  const finalBase = (BACKEND_URL && BACKEND_URL.startsWith('http')) 
    ? BACKEND_URL.replace(/\/$/, '') 
    : defaultBackend;

  // 4. Handle paths that already start with storage/
  if (cleanPath.startsWith('storage/')) {
    return `${finalBase}/${cleanPath}`;
  }

  // 5. Handle known storage directories missing the storage/ prefix
  const storageDirs = ['expense_receipts', 'union_receipts', 'public', 'uploads', 'documents', 'treasury_vouchers', 'bank_vouchers', 'pos_reports', 'agent_vouchers'];
  for (const dir of storageDirs) {
    if (cleanPath.startsWith(dir)) {
      const actualPath = cleanPath.startsWith('public') 
        ? cleanPath.replace('public/', 'storage/') 
        : `storage/${cleanPath}`;
      return `${finalBase}/${actualPath}`;
    }
  }
  
  // 6. Generic fallback for anything that looks like a storage file
  if (cleanPath.includes('.') && !cleanPath.includes('/')) {
    // Likely a file in the root of storage? (rare)
    return `${finalBase}/storage/${cleanPath}`;
  }

  // 7. Static assets in the frontend public folder
  return `/${cleanPath}`;
};
