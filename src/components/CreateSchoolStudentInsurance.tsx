import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

export default function CreateSchoolStudentInsurance() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    student_name: '',
    school_name: '',
    grade: '',
    birth_date: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    premium_amount: '50.000',
    whatsapp_number: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.student_name.trim()) errors.student_name = 'اسم الطالب مطلوب';
    if (!formData.school_name.trim()) errors.school_name = 'اسم المدرسة مطلوب';
    if (!formData.grade.trim()) errors.grade = 'السنة الدراسية مطلوبة';
    if (!formData.birth_date) errors.birth_date = 'تاريخ الميلاد مطلوب';
    if (!formData.start_date) errors.start_date = 'تاريخ البدء مطلوب';
    if (!formData.whatsapp_number.trim()) errors.whatsapp_number = 'رقم الواتساب مطلوب';
    if (!formData.premium_amount) errors.premium_amount = 'مبلغ القسط مطلوب';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


  useEffect(() => {
    if (formData.start_date) {
      const start = new Date(formData.start_date);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      setFormData(prev => ({ ...prev, end_date: end.toISOString().split('T')[0] }));
    }
  }, [formData.start_date]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setSubmitting(true);
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-User-Id': userId?.toString() || '',
      };

      const res = await fetch(`${API_BASE_URL}/school-student-insurance`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (errorData.errors) {
          const formattedErrors: Record<string, string> = {};
          Object.keys(errorData.errors).forEach(key => {
            formattedErrors[key] = Array.isArray(errorData.errors[key]) ? errorData.errors[key][0] : errorData.errors[key];
          });
          setFormErrors(formattedErrors);
        }
        throw new Error(errorData.message || 'فشل في حفظ الوثيقة');
      }
      showToast('تم إصدار الوثيقة بنجاح', 'success');
      setTimeout(() => navigate('/school-student-insurance'), 1500);
    } catch (error: any) {
      showToast(`حدث خطأ: ${error.message || error}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>تأمين حماية طلاب المدارس / إصدار وثيقة جديدة</span>
      </div>

      <div className="users-card">
        <div className="form-page-header">
          <h2 className="form-page-title">إصدار وثيقة تأمين حماية طلاب المدارس</h2>
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-sections-container">
            <div className="form-section">
              <h3 className="form-section-title">بيانات الطالب والمدرسة</h3>
              <div className="form-group">
                <label>اسم الطالب بالكامل <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                  className={formErrors.student_name ? 'error' : ''}
                />
                {formErrors.student_name && <span className="error-message">{formErrors.student_name}</span>}
              </div>
              <div className="form-group">
                <label>اسم المدرسة <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.school_name}
                  onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                  className={formErrors.school_name ? 'error' : ''}
                />
                {formErrors.school_name && <span className="error-message">{formErrors.school_name}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>السنة الدراسية <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className={formErrors.grade ? 'error' : ''}
                  />
                  {formErrors.grade && <span className="error-message">{formErrors.grade}</span>}
                </div>
                <div className="form-group">
                  <label>تاريخ الميلاد <span className="required">*</span></label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    className={formErrors.birth_date ? 'error' : ''}
                  />
                  {formErrors.birth_date && <span className="error-message">{formErrors.birth_date}</span>}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">بيانات التأمين والرسوم</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>تاريخ البدء <span className="required">*</span></label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className={formErrors.start_date ? 'error' : ''}
                  />
                  {formErrors.start_date && <span className="error-message">{formErrors.start_date}</span>}
                </div>
                <div className="form-group">
                  <label>تاريخ الانتهاء</label>
                  <input
                    type="date"
                    readOnly
                    value={formData.end_date}
                    style={{ background: '#f3f4f6' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>رقم الواتساب الخاص بولي الأمر / المؤمن له <span className="required">*</span></label>
                <p style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px', fontWeight: '500' }}>
                  يجب إضافة رقم الواتساب الخاص بالمؤمن له (إلزامي لإتمام الوثيقة)
                </p>
                <input
                  type="text"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  placeholder="مثال: 0910000000"
                  className={formErrors.whatsapp_number ? 'error' : ''}
                />
                {formErrors.whatsapp_number && <span className="error-message">{formErrors.whatsapp_number}</span>}
              </div>
              <div className="form-group">
                <label>مبلغ القسط الإجمالي (د.ل) <span className="required">*</span></label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.premium_amount}
                  onChange={(e) => setFormData({ ...formData, premium_amount: e.target.value })}
                  className={formErrors.premium_amount ? 'error' : ''}
                />
                {formErrors.premium_amount && <span className="error-message">{formErrors.premium_amount}</span>}
              </div>
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
            <button type="submit" className="primary" disabled={submitting}>
              {submitting ? 'جاري الحفظ...' : 'إصدار الوثيقة وحفظها'}
            </button>
            <button type="button" className="btn-cancel" onClick={() => navigate('/school-student-insurance')}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
