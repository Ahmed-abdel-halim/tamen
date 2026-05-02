import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/CreateInsurance.css';
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

const EditSchoolStudentInsurance: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!formData.student_name?.trim()) errors.student_name = 'اسم الطالب مطلوب';
        if (!formData.school_name?.trim()) errors.school_name = 'اسم المدرسة مطلوب';
        if (!formData.grade?.trim()) errors.grade = 'السنة الدراسية مطلوبة';
        if (!formData.birth_date) errors.birth_date = 'تاريخ الميلاد مطلوب';
        if (!formData.start_date) errors.start_date = 'تاريخ البدء مطلوب';
        if (!formData.whatsapp_number?.trim()) errors.whatsapp_number = 'رقم الواتساب مطلوب';
        if (!formData.premium_amount) errors.premium_amount = 'مبلغ القسط مطلوب';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };


    useEffect(() => {
        const fetchDocument = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/school-student-insurance/${id}`);
                const data = await response.json();
                setFormData(data);
            } catch (error) {
                console.error('Error fetching document:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDocument();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSubmitting(true);
        try {
            const response = await fetch(`${API_BASE_URL}/school-student-insurance/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                showToast('تم تحديث الوثيقة بنجاح', 'success');
                setTimeout(() => navigate('/school-student-insurance'), 1500);
            } else {
                const errorData = await response.json().catch(() => ({}));
                if (errorData.errors) {
                    const formattedErrors: Record<string, string> = {};
                    Object.keys(errorData.errors).forEach(key => {
                        formattedErrors[key] = Array.isArray(errorData.errors[key]) ? errorData.errors[key][0] : errorData.errors[key];
                    });
                    setFormErrors(formattedErrors);
                }
                showToast('فشل تحديث الوثيقة', 'error');
            }
        } catch (error: any) {
            showToast(`حدث خطأ: ${error.message || error}`, 'error');
            console.error('Error updating document:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>جاري التحميل...</div>;
    if (!formData) return <div>الوثيقة غير موجودة</div>;

    return (
        <div className="create-insurance-container">
            <div className="form-header">
                <h2>تعديل وثيقة تأمين حماية طلاب المدارس</h2>
                <button type="button" className="btn-close" onClick={() => navigate(-1)}>إلغاء</button>
            </div>

            <form onSubmit={handleSubmit} className="insurance-form">
                <div className="form-sections">
                    <div className="form-section">
                        <h3>بيانات الطالب والمدرسة</h3>
                        <div className="form-group">
                            <label>اسم الطالب بالكامل <span className="required">*</span></label>
                            <input type="text" value={formData.student_name || ''} onChange={(e) => setFormData({...formData, student_name: e.target.value})} className={formErrors.student_name ? 'error' : ''} />
                            {formErrors.student_name && <span className="error-message">{formErrors.student_name}</span>}
                        </div>
                        <div className="form-group">
                            <label>اسم المدرسة <span className="required">*</span></label>
                            <input type="text" value={formData.school_name || ''} onChange={(e) => setFormData({...formData, school_name: e.target.value})} className={formErrors.school_name ? 'error' : ''} />
                            {formErrors.school_name && <span className="error-message">{formErrors.school_name}</span>}
                        </div>
                        <div className="form-group">
                            <label>رقم الواتساب الخاص بولي الأمر / المؤمن له <span className="required">*</span></label>
                            <p style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px', fontWeight: '500' }}>
                                يجب إضافة رقم الواتساب الخاص بالمؤمن له (إلزامي لإتمام الوثيقة)
                            </p>
                            <input 
                                type="text" 
                                value={formData.whatsapp_number || ''} 
                                onChange={(e) => setFormData({...formData, whatsapp_number: e.target.value})} 
                                className={formErrors.whatsapp_number ? 'error' : ''}
                                placeholder="مثال: 0910000000"
                            />
                            {formErrors.whatsapp_number && <span className="error-message">{formErrors.whatsapp_number}</span>}
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                              <label>السنة الدراسية <span className="required">*</span></label>
                              <input type="text" value={formData.grade || ''} onChange={(e) => setFormData({...formData, grade: e.target.value})} className={formErrors.grade ? 'error' : ''} />
                              {formErrors.grade && <span className="error-message">{formErrors.grade}</span>}
                          </div>
                          <div className="form-group">
                              <label>تاريخ الميلاد <span className="required">*</span></label>
                              <input type="date" value={formData.birth_date || ''} onChange={(e) => setFormData({...formData, birth_date: e.target.value})} className={formErrors.birth_date ? 'error' : ''} />
                              {formErrors.birth_date && <span className="error-message">{formErrors.birth_date}</span>}
                          </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>بيانات التأمين والرسوم</h3>
                        <div className="form-row">
                          <div className="form-group">
                              <label>تاريخ البدء <span className="required">*</span></label>
                              <input type="date" value={formData.start_date || ''} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className={formErrors.start_date ? 'error' : ''} />
                              {formErrors.start_date && <span className="error-message">{formErrors.start_date}</span>}
                          </div>
                          <div className="form-group">
                              <label>تاريخ الانتهاء</label>
                              <input type="date" value={formData.end_date || ''} readOnly style={{ background: '#f3f4f6' }} />
                          </div>
                        </div>
                        <div className="form-group">
                            <label>مبلغ القسط الإجمالي (د.ل) <span className="required">*</span></label>
                            <input type="number" step="0.001" value={formData.premium_amount || ''} onChange={(e) => setFormData({...formData, premium_amount: e.target.value})} className={formErrors.premium_amount ? 'error' : ''} />
                            {formErrors.premium_amount && <span className="error-message">{formErrors.premium_amount}</span>}
                        </div>
                    </div>
                </div>

                <div className="form-actions" style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn-submit" disabled={submitting}>
                        {submitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </button>
                    <button type="button" className="btn-cancel" onClick={() => navigate(-1)} disabled={submitting}>
                        إلغاء
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditSchoolStudentInsurance;
