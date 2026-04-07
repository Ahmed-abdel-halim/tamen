
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showToast } from './Toast';
import '../styles/CreateInsurance.css';

const EditCargoInsurance: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDocument = async () => {
            try {
                const response = await fetch(`/api/cargo-insurance/${id}`);
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
            const response = await fetch(`/api/cargo-insurance/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                showToast('تم تحديث الوثيقة بنجاح', 'success');
                setTimeout(() => navigate('/cargo-insurance'), 1500);
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
                <h2>تعديل وثيقة تأمين شحن البضائع</h2>
                <button type="button" className="btn-close" onClick={() => navigate(-1)}>إلغاء</button>
            </div>

            <form onSubmit={handleSubmit} className="insurance-form">
                <div className="form-sections">
                    <div className="form-section">
                        <h3>بيانات المؤمن والشحنة</h3>
                        <div className="form-group">
                            <label>اسم المؤمن له بالكامل *</label>
                            <input type="text" value={formData.insured_name} onChange={(e) => setFormData({...formData, insured_name: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label>وصف البضاعة (النوع والكمية) *</label>
                            <textarea value={formData.cargo_description} onChange={(e) => setFormData({...formData, cargo_description: e.target.value})} required rows={3}></textarea>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                              <label>نوع النقل (بري/بحري/جوي) *</label>
                              <input type="text" value={formData.transport_type} onChange={(e) => setFormData({...formData, transport_type: e.target.value})} required />
                          </div>
                          <div className="form-group">
                              <label>مسار الرحلة من/إلى *</label>
                              <input type="text" value={formData.voyage_from} onChange={(e) => setFormData({...formData, voyage_from: e.target.value})} required placeholder="مثال: من طرابلس إلى بنغازي" />
                          </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>التغطية والرسوم</h3>
                        <div className="form-row">
                          <div className="form-group">
                              <label>مبلغ التأمين الكامل (Sum Insured) *</label>
                              <input type="number" step="0.001" value={formData.sum_insured} onChange={(e) => setFormData({...formData, sum_insured: e.target.value})} required />
                          </div>
                          <div className="form-group">
                              <label>مبلغ القسط الإجمالي (د.ل) *</label>
                              <input type="number" step="0.001" value={formData.premium_amount} onChange={(e) => setFormData({...formData, premium_amount: e.target.value})} required />
                          </div>
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

export default EditCargoInsurance;
