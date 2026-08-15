import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiUrl } from '../config/api';
import { showToast } from './Toast';

// مهلة عدم النشاط: 15 دقيقة (بالمللي ثانية)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
const CHECK_INTERVAL_MS = 5000; // فحص كل 5 ثوانٍ
const ACTIVITY_DEBOUNCE_MS = 2500; // تحديث وقت النشاط كل 2.5 ثانية كحد أقصى

export default function SessionLockScreen() {
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return localStorage.getItem('is_session_locked') === 'true';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const lastDebounceRef = useRef<number>(0);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // جلب بيانات المستخدم الحالي
  const refreshUserData = useCallback(() => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      } else {
        setCurrentUser(null);
      }
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  // تحديث وقت آخر نشاط للمستخدم
  const recordActivity = useCallback(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const locked = localStorage.getItem('is_session_locked') === 'true';

    if (!token || !user || locked) return;

    const now = Date.now();
    if (now - lastDebounceRef.current > ACTIVITY_DEBOUNCE_MS) {
      lastDebounceRef.current = now;
      localStorage.setItem('last_active_time', now.toString());
    }
  }, []);

  // قفل الجلسة
  const lockSession = useCallback(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) return;

    localStorage.setItem('is_session_locked', 'true');
    setIsLocked(true);
    setPassword('');
    setErrorMessage(null);
    refreshUserData();
  }, [refreshUserData]);

  // إلغاء قفل الجلسة
  const unlockSessionState = useCallback(() => {
    localStorage.setItem('is_session_locked', 'false');
    localStorage.setItem('last_active_time', Date.now().toString());
    setIsLocked(false);
    setPassword('');
    setErrorMessage(null);
  }, []);

  // فحص وقت الخمول الدوري
  useEffect(() => {
    if (localStorage.getItem('token') && !localStorage.getItem('last_active_time')) {
      localStorage.setItem('last_active_time', Date.now().toString());
    }

    const checkInactivity = () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      const locked = localStorage.getItem('is_session_locked') === 'true';

      if (!token || !user) {
        if (isLocked) setIsLocked(false);
        return;
      }

      if (locked) {
        if (!isLocked) setIsLocked(true);
        return;
      }

      const lastActiveStr = localStorage.getItem('last_active_time');
      const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : Date.now();
      const elapsed = Date.now() - lastActive;

      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        lockSession();
      }
    };

    checkInactivity();

    const intervalId = setInterval(checkInactivity, CHECK_INTERVAL_MS);

    // الاستماع لأحداث تفاعل المستخدم
    const eventTypes: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
      'click',
    ];

    const handleUserInteraction = () => {
      recordActivity();
    };

    eventTypes.forEach((evt) => {
      window.addEventListener(evt, handleUserInteraction, { passive: true });
    });

    // مزامنة القفل بين التبويبات المتعددة عبر localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'is_session_locked') {
        setIsLocked(e.newValue === 'true');
        if (e.newValue === 'true') {
          refreshUserData();
        }
      }
      if (e.key === 'user' || e.key === 'token') {
        refreshUserData();
        if (!localStorage.getItem('token')) {
          setIsLocked(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userLoggedIn', refreshUserData);
    window.addEventListener('userPermissionsUpdated', refreshUserData);

    return () => {
      clearInterval(intervalId);
      eventTypes.forEach((evt) => {
        window.removeEventListener(evt, handleUserInteraction);
      });
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userLoggedIn', refreshUserData);
      window.removeEventListener('userPermissionsUpdated', refreshUserData);
    };
  }, [isLocked, lockSession, recordActivity, refreshUserData]);

  // التركيز التلقائي على حقل كلمة المرور عند القفل
  useEffect(() => {
    if (isLocked) {
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [isLocked]);

  // تسجيل الخروج التام
  const handleLogout = () => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch(apiUrl('logout'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      }).catch(() => {});
    }

    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('is_session_locked');
    localStorage.removeItem('last_active_time');
    setIsLocked(false);
    window.dispatchEvent(new Event('userLoggedOut'));
    window.location.href = '/login';
  };

  // معالجة إلغاء القفل
  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage('يرجى إدخال كلمة المرور لإلغاء القفل');
      return;
    }

    const username = currentUser?.username;
    if (!username) {
      handleLogout();
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(apiUrl('unlock-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          password: password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'كلمة المرور غير صحيحة، يرجى المحاولة مجدداً');
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      unlockSessionState();
      showToast('تم إلغاء قفل الجلسة بنجاح، مرحباً بعودتك!', 'success');
      window.dispatchEvent(new Event('userPermissionsUpdated'));
    } catch (err: any) {
      setErrorMessage(err.message || 'حدث خطأ أثناء إلغاء القفل');
      showToast(err.message || 'كلمة المرور غير صحيحة', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isLocked || !currentUser) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '1.5rem',
        direction: 'rtl',
        fontFamily: 'inherit',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          padding: '2.5rem 2rem',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #e0e7ff 0%, #ede9fe 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)',
              border: '3px solid #ffffff',
            }}
          >
            <i
              className="fa-solid fa-lock"
              style={{ fontSize: '36px', color: '#4f46e5' }}
            />
          </div>
          <span
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              padding: '3px 8px',
              borderRadius: '12px',
              fontSize: '11px',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
            }}
          >
            مقفلة
          </span>
        </div>

        <h2
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            color: '#1e293b',
            margin: '0 0 0.5rem 0',
          }}
        >
          تم قفل الشاشة لعدم النشاط
        </h2>
        <p
          style={{
            fontSize: '0.88rem',
            color: '#64748b',
            lineHeight: 1.6,
            margin: '0 0 1.5rem 0',
          }}
        >
          لحماية بيانات حسابك وسرية المنظومة، تم قفل الجلسة تلقائياً بعد مرور أكثر من 15 دقيقة بدون استخدام.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: '#f1f5f9',
            padding: '10px 16px',
            borderRadius: '14px',
            marginBottom: '1.5rem',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '18px',
              flexShrink: 0,
            }}
          >
            {currentUser?.name ? currentUser.name.charAt(0) : <i className="fa-solid fa-user" />}
          </div>
          <div style={{ textAlign: 'right', flex: 1, overflow: 'hidden' }}>
            <div
              style={{
                fontWeight: 700,
                color: '#1e293b',
                fontSize: '0.95rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentUser?.name || currentUser?.username}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              اسم المستخدم: <strong style={{ color: '#0f172a' }}>{currentUser?.username}</strong>
            </div>
          </div>
        </div>

        <form onSubmit={handleUnlockSubmit}>
          <div style={{ marginBottom: '1.25rem', textAlign: 'right' }}>
            <label
              htmlFor="session-lock-password"
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              كلمة المرور لإلغاء القفل:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="session-lock-password"
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 14px',
                  borderRadius: '12px',
                  border: errorMessage ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s',
                  backgroundColor: '#ffffff',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '15px',
                  padding: '4px',
                }}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'عرض كلمة المرور'}
              >
                <i className={showPassword ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'} />
              </button>
            </div>
            {errorMessage && (
              <div
                style={{
                  color: '#ef4444',
                  fontSize: '0.82rem',
                  marginTop: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="fa-solid fa-circle-exclamation" />
                {errorMessage}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.2s',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin" />
                  جاري التحقق وإلغاء القفل...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-unlock" />
                  إلغاء القفل والمتابعة
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '12px',
                background: '#f8fafc',
                color: '#dc2626',
                border: '1px solid #fee2e2',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <i className="fa-solid fa-arrow-right-from-bracket" />
              تسجيل الخروج والتبديل إلى حساب آخر
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}