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
  
  // في production، استخدم رابط ngrok الحالي للتجربة
  return 'https://nonmetallic-pa-unprojecting.ngrok-free.dev/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const API_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true'
};

export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  // إزالة '/api' من الـ path لو موجود لأن الـ API_BASE_URL فيه '/api' فعلياً
  const finalPath = cleanPath.startsWith('api/') ? cleanPath.slice(4) : cleanPath;
  return `${API_BASE_URL}/${finalPath}`;
};

