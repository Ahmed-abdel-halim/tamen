import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Fix for ngrok + Vercel
const originalFetch = window.fetch;
window.fetch = (...args) => {
  let [resource, config] = args;
  
  // 1. تحويل الروابط النسبية لوابط ngrok مباشرة لتجنب مشاكل بروكسي فيرسل
  if (typeof resource === 'string' && resource.startsWith('/api')) {
    resource = 'https://nonmetallic-pa-unprojecting.ngrok-free.dev' + resource;
  }
  
  // 2. إضافة هيدر تخطي تحذير ngrok لكل الطلبات
  const newConfig = { ...config } as RequestInit;
  newConfig.headers = {
    ...newConfig.headers,
    'ngrok-skip-browser-warning': 'true',
    'Accept': 'application/json'
  };
  
  return originalFetch(resource, newConfig);
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)


