import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/CreateInsurance.css';
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

const EditCashInTransitInsurance: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const errors: Record<string, string> = {};
        if (!formData.insured_name?.trim()) errors.insured_name = 'الاسم مطلوب';
        if (!formData.transit_from?.trim()) errors.transit_from = 'خط النقل (من) مطلوب';
        if (!formData.transit_to?.trim()) errors.transit_to = 'خط النقل (إلى) مطلوب';
        if (!formData.limit_per_transit) errors.limit_per_transit = 'حد النقلة الواحدة مطلوب';
        if (!formData.annual_turnover) errors.annual_turnover = 'التداول السنوي مطلوب';
        if (!formData.start_date) errors.start_date = 'تاريخ البدء مطلوب';
        if (!formData.whatsapp_number?.trim()) errors.whatsapp_number = 'رقم الواتساب مطلوب';
        if (!formData.premium_amount) errors.premium_amount = 'مبلغ القسط مطلوب';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };


    useEffect(() => {
        const fetchDocument = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/cash-in-transit-insurance/${id}`);
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
            const response = await fetch(`${API_BASE_URL}/cash-in-transit-insurance/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                showToast('تم تحديث الوثيقة بنجاح', 'success');
                setTimeout(() => navigate('/cash-in-transit-insurance'), 1500);
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
                <h2>تعديل وثيقة تأمين نقل النقدية</h2>
                <button type="button" className="btn-close" onClick={() => navigate(-1)}>إلغاء</button>
            </div>

            <form onSubmit={handleSubmit} className="insurance-form">
                <div className="form-sections">
                    <div className="form-section">
                        <h3>بيانات المؤمن والرحلة</h3>
                        <div className="form-group">
                            <label>اسم المؤمن له بالكامل <span className="required">*</span></label>
                            <input type="text" value={formData.insured_name || ''} onChange={(e) => setFormData({...formData, insured_name: e.target.value})} className={formErrors.insured_name ? 'error' : ''} />
                            {formErrors.insured_name && <span className="error-message">{formErrors.insured_name}</span>}
                        </div>
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
                              <label>مسار النقل من <span className="required">*</span></label>
                              <input type="text" value={formData.transit_from || ''} onChange={(e) => setFormData({...formData, transit_from: e.target.value})} className={formErrors.transit_from ? 'error' : ''} />
                              {formErrors.transit_from && <span className="error-message">{formErrors.transit_from}</span>}
                          </div>
                          <div className="form-group">
                              <label>إلى <span className="required">*</span></label>
                              <input type="text" value={formData.transit_to || ''} onChange={(e) => setFormData({...formData, transit_to: e.target.value})} className={formErrors.transit_to ? 'error' : ''} />
                              {formErrors.transit_to && <span className="error-message">{formErrors.transit_to}</span>}
                          </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>الحدود والرسوم</h3>
                        <div className="form-row">
                          <div className="form-group">
                              <label>حد النقلة الواحدة (د.ل) <span className="required">*</span></label>
                              <input type="number" step="0.001" value={formData.limit_per_transit || ''} onChange={(e) => setFormData({...formData, limit_per_transit: e.target.value})} className={formErrors.limit_per_transit ? 'error' : ''} />
                              {formErrors.limit_per_transit && <span className="error-message">{formErrors.limit_per_transit}</span>}
                          </div>
                          <div className="form-group">
                              <label>التداول السنوي المتوقع (د.ل) <span className="required">*</span></label>
                              <input type="number" step="0.001" value={formData.annual_turnover || ''} onChange={(e) => setFormData({...formData, annual_turnover: e.target.value})} className={formErrors.annual_turnover ? 'error' : ''} />
                              {formErrors.annual_turnover && <span className="error-message">{formErrors.annual_turnover}</span>}
                          </div>
                        </div>
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

export default EditCashInTransitInsurance;
