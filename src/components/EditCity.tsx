import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { showToast } from "./Toast";

export default function EditCity() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState({
    name_ar: "",
    name_en: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchCity();
    }
  }, [id]);

  const fetchCity = async () => {
    try {
      const res = await fetch(`/api/cities/${id}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setFormData({
        name_ar: data.name_ar || "",
        name_en: data.name_en || "",
      });
    } catch (error: any) {
      showToast(`حدث خطأ أثناء جلب البيانات: ${error.message || ''}`, 'error');
    } finally {
      setLoading(false);
    }
  };

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
      const res = await fetch(`/api/cities/${id}`, {
        method: 'PUT',
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
        throw new Error(data.message || 'حدث خطأ أثناء تحديث المدينة');
      }

      showToast('تم تحديث المدينة بنجاح', 'success');
      setTimeout(() => {
        navigate('/cities');
      }, 1000);
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء تحديث المدينة', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>تعديل مدينة</h1>
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

