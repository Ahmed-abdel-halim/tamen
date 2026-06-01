import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../config/api';
import { showToast } from './Toast';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  


  useEffect(() => {
    // تأكيد أن صفحة تسجيل الدخول تبقى باتجاه عربي حتى لو تم اختيار الإنجليزية للموقع
    const html = document.documentElement;
    html.lang = 'ar';
    html.dir = 'rtl';
    document.body.dir = 'rtl';
    document.body.style.direction = 'rtl';
  }, []);

  useEffect(() => {
    if (localStorage.getItem('user')) {
      navigate('/dashboard'); // إذا كان المستخدم مسجل دخول، اذهب إلى لوحة التحكم
    }
  }, [navigate]);

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    
    setLoading(true);
    try {
      const res = await fetch(apiUrl('login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        let msg = 'بيانات الدخول غير صحيحة';
        try { 
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json(); 
            msg = data.message || data.error || msg;
          } else {
            const text = await res.text();
            console.error('Non-JSON response:', text.substring(0, 200));
            msg = `خطأ في الاتصال بالخادم (${res.status}). تأكد من أن الـ API يعمل بشكل صحيح.`;
          }
        } catch (e) {
          console.error('Error parsing response:', e);
          msg = `خطأ في الاتصال بالخادم (${res.status}). تأكد من أن الـ API يعمل بشكل صحيح.`;
        }
        throw new Error(msg);
      }
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Expected JSON but got:', text.substring(0, 500));
        let additionalInfo = text.substring(0, 100).replace(/\n/g, ' ').trim();
        if (additionalInfo) additionalInfo = ` | محتوى الاستجابة: (${additionalInfo}...)`;
        throw new Error(`استجابة غير صحيحة من الخادم (Status: ${res.status}). تأكد من أن الـ API يعمل بشكل صحيح.${additionalInfo}`);
      }
      
      const data = await res.json();
      showToast('تم تسجيل الدخول بنجاح!', 'success');
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token || '');
      // إرسال event لتحديث الصلاحيات في App.tsx
      window.dispatchEvent(new Event('userLoggedIn'));
      setTimeout(() => {
        window.location.href = '/dashboard'; // التوجيه إلى لوحة التحكم
      }, 1300);
    } catch (e: any) {
      showToast(e.message, 'error');
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page-new">
      <div className="login-split-card">
        {/* Left Side: Form Column */}
        <div className="login-form-column-new">
          <div className="login-logo-header">
            <img src="/img/logo3.png" alt="المدار الليبي للتأمين" />
            <h3>المدار الليبي للتأمين</h3>
            <span className="logo-sub-text">Al Madar Libyan Insurance</span>
          </div>
          
          <h2 className="login-title-new">تسجيل الدخول</h2>
          
          <form onSubmit={handleSubmit} className="login-form-new" autoComplete="off">
            <div className="form-group-new">
              <label className="login-label-new">اسم المستخدم</label>
              <div className="login-input-wrapper">
                <i className="fa-solid fa-user input-icon"></i>
                <input 
                  type="text"
                  value={username}
                  onChange={e=>setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم" 
                  className="login-input-new"
                  style={{ paddingRight: '60px', paddingLeft: '60px' }}
                  required
                  autoFocus
                />
              </div>
            </div>
            
            <div className="form-group-new">
              <label className="login-label-new">كلمة المرور</label>
              <div className="login-input-wrapper">
                <i className="fa-solid fa-lock input-icon"></i>
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور" 
                  className="login-input-new login-password-input-new"
                  style={{ paddingRight: '60px', paddingLeft: '60px' }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-password-toggle-new"
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
            

            
            <button 
              type="submit" 
              className="login-submit-btn-new"
              disabled={loading}
            >
              {loading ? (
                <span>... جاري التحقق</span>
              ) : (
                <>
                  <i className="fa-solid fa-arrow-right-to-bracket icon-btn"></i> 
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
            {error && <div className="login-error-text-new">{error}</div>}
          </form>
        </div>
        
        {/* Right Side: Image Column */}
        <div 
          className="login-image-column-new" 
          style={{ 
            backgroundImage: "url('/new/Frame 148 (1) 1.png')",
            backgroundSize: 'calc(100% + 40px) 100%',
            backgroundPosition: '-40px center',
            backgroundRepeat: 'no-repeat',
            backgroundColor: '#003173'
          }}
        >
        </div>
      </div>
    </main>
  );
}
