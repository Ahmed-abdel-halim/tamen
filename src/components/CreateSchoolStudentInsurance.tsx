import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { showToast } from "./Toast";

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
  });

  const [submitting, setSubmitting] = useState(false);


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
    setSubmitting(true);
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).id : null;
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-User-Id': userId?.toString() || '',
      };

      const res = await fetch('/api/school-student-insurance', {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('فشل في حفظ الوثيقة');
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
                  required
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>اسم المدرسة <span className="required">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.school_name}
                  onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>السنة الدراسية</label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  />
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
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
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
                <label>مبلغ القسط الإجمالي (د.ل) <span className="required">*</span></label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={formData.premium_amount}
                  onChange={(e) => setFormData({ ...formData, premium_amount: e.target.value })}
                />
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
