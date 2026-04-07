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
  
  // Math CAPTCHA state
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  
  // Generate random CAPTCHA on mount and when needed
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaNum1(num1);
    setCaptchaNum2(num2);
    setCaptchaAnswer('');
    setCaptchaError(null);
  };
  
  useEffect(() => {
    generateCaptcha();
  }, []);

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
    setCaptchaError(null);
    
    // Validate CAPTCHA
    const correctAnswer = captchaNum1 + captchaNum2;
    const userAnswer = parseInt(captchaAnswer);
    
    if (isNaN(userAnswer) || userAnswer !== correctAnswer) {
      setCaptchaError('الإجابة غير صحيحة. يرجى المحاولة مرة أخرى.');
      generateCaptcha();
      return;
    }
    
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
        console.error('Expected JSON but got:', text.substring(0, 200));
        throw new Error('استجابة غير صحيحة من الخادم. تأكد من أن الـ API يعمل بشكل صحيح.');
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
    <main className="login-page">
      <section className="login-container">
        <h2 className="login-title">تسجيل الدخول</h2>
        <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
          <label className="login-label">اسم المستخدم</label>
          <input 
            type="text"
            value={username}
            onChange={e=>setUsername(e.target.value)}
            placeholder="أدخل اسم المستخدم" 
            className="login-input"
            required
            autoFocus
          />
          <label className="login-label">كلمة المرور</label>
          <div className="login-password-wrapper">
            <input 
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e=>setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور" 
              className="login-input login-password-input"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="login-password-toggle"
              aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            >
              <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
          
          {/* Math CAPTCHA */}
          <div className="login-captcha">
            <label className="login-label">التحقق من الهوية</label>
            <div className="login-captcha-container">
              <div className="login-captcha-question">
                <span className="login-captcha-number">{captchaNum1}</span>
                <span className="login-captcha-operator">+</span>
                <span className="login-captcha-number">{captchaNum2}</span>
                <span className="login-captcha-equals">=</span>
              </div>
              <div className="login-captcha-input-wrapper">
                <input
                  type="number"
                  value={captchaAnswer}
                  onChange={(e) => {
                    setCaptchaAnswer(e.target.value);
                    setCaptchaError(null);
                  }}
                  placeholder="?"
                  className={`login-captcha-input ${captchaError ? 'error' : ''}`}
                  required
                  min="0"
                />
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="login-captcha-refresh"
                  aria-label="تحديث السؤال"
                  title="تحديث السؤال"
                >
                  <i className="fa-solid fa-rotate"></i>
                </button>
              </div>
            </div>
            {captchaError && <div className="login-error">{captchaError}</div>}
          </div>
          
          <button 
            type="submit" 
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? '... جاري التحقق' : (<><i className="fa-solid fa-arrow-right-to-bracket"></i> تسجيل الدخول</>)}
          </button>
          {error && <div className="login-error">{error}</div>}
        </form>
      </section>
    </main>
  );
}
