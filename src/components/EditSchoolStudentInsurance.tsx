import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/CreateInsurance.css';
import { showToast } from "./Toast";

const EditSchoolStudentInsurance: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<any>(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const fetchDocument = async () => {
            try {
                const response = await fetch(`/api/school-student-insurance/${id}`);
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
        try {
            const response = await fetch(`/api/school-student-insurance/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                showToast('تم تحديث الوثيقة بنجاح', 'success');
                setTimeout(() => navigate('/school-student-insurance'), 1500);
            } else {
                showToast('فشل تحديث الوثيقة', 'error');
            }
        } catch (error: any) {
            showToast(`حدث خطأ: ${error.message || error}`, 'error');
            console.error('Error updating document:', error);
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
                            <label>اسم الطالب بالكامل *</label>
                            <input type="text" value={formData.student_name} onChange={(e) => setFormData({...formData, student_name: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label>اسم المدرسة *</label>
                            <input type="text" value={formData.school_name} onChange={(e) => setFormData({...formData, school_name: e.target.value})} required />
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                              <label>السنة الدراسية</label>
                              <input type="text" value={formData.grade || ''} onChange={(e) => setFormData({...formData, grade: e.target.value})} />
                          </div>
                          <div className="form-group">
                              <label>تاريخ الميلاد</label>
                              <input type="date" value={formData.birth_date || ''} onChange={(e) => setFormData({...formData, birth_date: e.target.value})} />
                          </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>بيانات التأمين والرسوم</h3>
                        <div className="form-row">
                          <div className="form-group">
                              <label>تاريخ البدء *</label>
                              <input type="date" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} required />
                          </div>
                          <div className="form-group">
                              <label>تاريخ الانتهاء</label>
                              <input type="date" value={formData.end_date} readOnly />
                          </div>
                        </div>
                        <div className="form-group">
                            <label>مبلغ القسط الإجمالي (د.ل) *</label>
                            <input type="number" step="0.001" value={formData.premium_amount} onChange={(e) => setFormData({...formData, premium_amount: e.target.value})} required />
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn-submit">حفظ التغييرات</button>
                </div>
            </form>
        </div>
    );
};

export default EditSchoolStudentInsurance;
