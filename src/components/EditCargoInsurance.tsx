
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { showToast } from './Toast';
import { API_BASE_URL } from "../config/api";
import '../styles/CreateInsurance.css';

const EditCargoInsurance: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!formData.insured_name?.trim()) errors.insured_name = 'اسم المؤمن له مطلوب';
        if (!formData.cargo_description?.trim()) errors.cargo_description = 'وصف البضاعة مطلوب';
        if (!formData.transport_type) errors.transport_type = 'نوع النقل مطلوب';
        if (!formData.voyage_from?.trim()) errors.voyage_from = 'مكان الشحن مطلوب';
        if (!formData.voyage_to?.trim()) errors.voyage_to = 'مكان التفريغ مطلوب';
        if (!formData.sum_insured) errors.sum_insured = 'مبلغ التأمين مطلوب';
        if (!formData.whatsapp_number?.trim()) errors.whatsapp_number = 'رقم الواتساب مطلوب';
        if (!formData.premium_amount) errors.premium_amount = 'مبلغ القسط مطلوب';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    useEffect(() => {
        const fetchDocument = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/cargo-insurance/${id}`);
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
            const response = await fetch(`${API_BASE_URL}/cargo-insurance/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                showToast('تم تحديث الوثيقة بنجاح', 'success');
                setTimeout(() => navigate('/cargo-insurance'), 1500);
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
                <h2>تعديل وثيقة تأمين شحن البضائع</h2>
                <button type="button" className="btn-close" onClick={() => navigate(-1)}>إلغاء</button>
            </div>

            <form onSubmit={handleSubmit} className="insurance-form">
                <div className="form-sections">
                    <div className="form-section">
                        <h3>بيانات المؤمن والشحنة</h3>
                        <div className="form-group">
                            <label>اسم المؤمن له بالكامل <span className="required">*</span></label>
                            <input type="text" value={formData.insured_name || ''} onChange={(e) => setFormData({...formData, insured_name: e.target.value})} className={formErrors.insured_name ? 'error' : ''} />
                            {formErrors.insured_name && <span className="error-message">{formErrors.insured_name}</span>}
                        </div>
                        <div className="form-group">
                            <label>وصف البضاعة (النوع والكمية) <span className="required">*</span></label>
                            <textarea value={formData.cargo_description || ''} onChange={(e) => setFormData({...formData, cargo_description: e.target.value})} className={formErrors.cargo_description ? 'error' : ''} style={{ border: formErrors.cargo_description ? '1px solid #ef4444' : '1px solid var(--border)', borderRadius: '8px', padding: '10px' }} rows={3}></textarea>
                            {formErrors.cargo_description && <span className="error-message">{formErrors.cargo_description}</span>}
                        </div>
                        <div className="form-group">
                            <label>نوع النقل (بري/بحري/جوي) <span className="required">*</span></label>
                            <select value={formData.transport_type || 'Sea'} onChange={(e) => setFormData({...formData, transport_type: e.target.value})} className={formErrors.transport_type ? 'error' : ''}>
                                <option value="Sea">بحري (Sea)</option>
                                <option value="Air">جوي (Air)</option>
                                <option value="Land">بري (Land)</option>
                            </select>
                            {formErrors.transport_type && <span className="error-message">{formErrors.transport_type}</span>}
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                              <label>من (مكان الشحن) <span className="required">*</span></label>
                              <input type="text" value={formData.voyage_from || ''} onChange={(e) => setFormData({...formData, voyage_from: e.target.value})} className={formErrors.voyage_from ? 'error' : ''} placeholder="مثال: طرابلس" />
                              {formErrors.voyage_from && <span className="error-message">{formErrors.voyage_from}</span>}
                          </div>
                          <div className="form-group">
                              <label>إلى (مكان التفريغ) <span className="required">*</span></label>
                              <input type="text" value={formData.voyage_to || ''} onChange={(e) => setFormData({...formData, voyage_to: e.target.value})} className={formErrors.voyage_to ? 'error' : ''} placeholder="مثال: بنغازي" />
                              {formErrors.voyage_to && <span className="error-message">{formErrors.voyage_to}</span>}
                          </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>التغطية والرسوم</h3>
                        <div className="form-group">
                            <label>رقم الواتساب الخاص بالمؤمن له <span className="required">*</span></label>
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
                              <label>مبلغ التأمين الكامل (Sum Insured) <span className="required">*</span></label>
                              <input type="number" step="0.001" value={formData.sum_insured || ''} onChange={(e) => setFormData({...formData, sum_insured: e.target.value})} className={formErrors.sum_insured ? 'error' : ''} />
                              {formErrors.sum_insured && <span className="error-message">{formErrors.sum_insured}</span>}
                          </div>
                          <div className="form-group">
                              <label>مبلغ القسط الإجمالي (د.ل) <span className="required">*</span></label>
                              <input type="number" step="0.001" value={formData.premium_amount || ''} onChange={(e) => setFormData({...formData, premium_amount: e.target.value})} className={formErrors.premium_amount ? 'error' : ''} />
                              {formErrors.premium_amount && <span className="error-message">{formErrors.premium_amount}</span>}
                          </div>
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

export default EditCargoInsurance;
