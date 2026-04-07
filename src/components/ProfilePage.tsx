import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { showToast } from './Toast';

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: number; username: string; name: string; email: string } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    try {
      const u = userStr ? JSON.parse(userStr) : null;
      if (u) {
        setUser(u);
        setFormData({ ...formData, email: u.email || '' });
        fetchUserDetails(u.id);
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);



  const fetchUserDetails = async (userId: number) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setFormData({ ...formData, email: data.email || '' });
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.email) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }

    // إذا تم إدخال أي حقل من كلمة المرور، يجب إدخال جميع الحقول
    if (formData.current_password || formData.new_password || formData.confirm_password) {
      if (!formData.current_password) {
        errors.current_password = 'كلمة المرور الحالية مطلوبة';
      }
      if (!formData.new_password) {
        errors.new_password = 'كلمة المرور الجديدة مطلوبة';
      } else if (formData.new_password.length < 6) {
        errors.new_password = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
      }
      if (!formData.confirm_password) {
        errors.confirm_password = 'تأكيد كلمة المرور مطلوب';
      } else if (formData.new_password !== formData.confirm_password) {
        errors.confirm_password = 'كلمة المرور الجديدة وتأكيدها غير متطابقين';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !validateForm()) return;

    setSubmitting(true);
    setFormErrors({});

    try {
      // تحديث البريد الإلكتروني
      if (formData.email !== user.email) {
        const emailRes = await fetch(`/api/users/${user.id}/email`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ email: formData.email }),
        });

        if (!emailRes.ok) {
          const errorData = await emailRes.json().catch(() => ({}));
          throw new Error(errorData.message || 'فشل تحديث البريد الإلكتروني');
        }

        const updatedUser = await emailRes.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
      }

      // تحديث كلمة المرور إذا تم إدخالها
      if (formData.current_password && formData.new_password && formData.confirm_password) {
        const passwordRes = await fetch(`/api/users/${user.id}/password`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            current_password: formData.current_password,
            new_password: formData.new_password,
            confirm_password: formData.confirm_password,
          }),
        });

        if (!passwordRes.ok) {
          const errorData = await passwordRes.json().catch(() => ({}));
          throw new Error(errorData.message || 'فشل تحديث كلمة المرور');
        }
      }

      showToast('تم تحديث البيانات بنجاح', 'success');
      setFormData({ ...formData, current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء التحديث', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="users-management font-cairo loading-container">
        <div className="users-card empty-state-container">
          <p>جار التحميل...</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="users-management font-cairo loading-container">
        <div className="users-card empty-state-container">
          <p>لم يتم العثور على بيانات المستخدم</p>
          <button className="btn-cancel" onClick={() => navigate(-1)} style={{ marginTop: 20 }}>
            العودة
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="users-management font-cairo loading-container">
      <div className="users-breadcrumb breadcrumb-spacing">
        <span onClick={() => navigate(-1)} className="breadcrumb-link">
          الرئيسية
        </span>
        <span> / </span>
        <span>الملف الشخصي</span>
      </div>

      <div className="users-card">
        <form onSubmit={handleSubmit} className="user-form profile-form-container">
          <div className="form-group">
            <label>الاسم الكامل</label>
            <input
              type="text"
              value={user.name}
              disabled
              className="input-disabled-bg"
            />
          </div>

          <div className="form-group">
            <label>اسم المستخدم</label>
            <input
              type="text"
              value={user.username}
              disabled
              className="input-disabled-bg"
            />
          </div>

          <div className="form-group">
            <label>البريد الإلكتروني *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="example@email.com"
            />
            {formErrors.email && <span className="error-message">{formErrors.email}</span>}
          </div>

          <div className="profile-section-divider">
            <h3 className="profile-section-title">
              تغيير كلمة المرور
            </h3>
            <p className="profile-section-description">
              اترك الحقول التالية فارغة إذا كنت لا تريد تغيير كلمة المرور
            </p>

            <div className="form-group">
              <label>كلمة المرور الحالية</label>
              <input
                type="password"
                value={formData.current_password}
                onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                placeholder="أدخل كلمة المرور الحالية"
                autoComplete="current-password"
              />
              {formErrors.current_password && <span className="error-message">{formErrors.current_password}</span>}
            </div>

            <div className="form-group">
              <label>كلمة المرور الجديدة</label>
              <input
                type="password"
                value={formData.new_password}
                onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                placeholder="أدخل كلمة المرور الجديدة"
                autoComplete="new-password"
              />
              {formErrors.new_password && <span className="error-message">{formErrors.new_password}</span>}
            </div>

            <div className="form-group">
              <label>تأكيد كلمة المرور الجديدة</label>
              <input
                type="password"
                value={formData.confirm_password}
                onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                placeholder="أعد إدخال كلمة المرور الجديدة"
                autoComplete="new-password"
              />
              {formErrors.confirm_password && <span className="error-message">{formErrors.confirm_password}</span>}
            </div>
          </div>



          <div className="profile-form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate(-1)}
              disabled={submitting}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn-main"
              disabled={submitting}
            >
              {submitting ? 'جار الحفظ...' : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

