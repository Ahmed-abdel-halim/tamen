import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "./Toast";

export default function CreateCity() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.name_ar.trim()) errors.name_ar = 'اسم المدينة بالعربي مطلوب';
    if (!formData.name_en.trim()) errors.name_en = 'اسم المدينة بالإنجليزي مطلوب';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/cities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) {
          setFormErrors(data.errors);
        }
        throw new Error(data.message || 'حدث خطأ أثناء إنشاء المدينة');
      }

      showToast('تم إنشاء المدينة بنجاح', 'success');
      setTimeout(() => {
        navigate('/cities');
      }, 1000);
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء إنشاء المدينة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>إضافة مدينة</h1>
        <button
          onClick={() => navigate('/cities')}
          className="btn btn-secondary"
        >
          <i className="fa-solid fa-arrow-right"></i>
          العودة للقائمة
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-container">
        <div className="form-group">
          <label htmlFor="name_ar">
            اسم المدينة بالعربي <span className="required">*</span>
          </label>
          <input
            type="text"
            id="name_ar"
            value={formData.name_ar}
            onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
            className={formErrors.name_ar ? 'error' : ''}
          />
          {formErrors.name_ar && (
            <span className="error-message">{formErrors.name_ar}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="name_en">
            اسم المدينة بالإنجليزي <span className="required">*</span>
          </label>
          <input
            type="text"
            id="name_en"
            value={formData.name_en}
            onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
            className={formErrors.name_en ? 'error' : ''}
          />
          {formErrors.name_en && (
            <span className="error-message">{formErrors.name_en}</span>
          )}
        </div>

        <div className="form-actions">
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
          >
            {submitting ? 'جاري الحفظ...' : 'حفظ'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/cities')}
            className="btn btn-secondary"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}

