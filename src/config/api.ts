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
    return '/api';
  }
  
  // في production، استخدم الـ domain المحدد
  // Domain: https://con.primes.ly/
  return 'https://api.mli.ly/api';
};

export const API_BASE_URL = getApiBaseUrl();
export const BACKEND_URL = API_BASE_URL.replace(/\/api$/, '');

export const apiUrl = (path: string): string => {
  // إزالة الـ slash الأول إذا كان موجوداً
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_BASE_URL}/${cleanPath}`;
};

