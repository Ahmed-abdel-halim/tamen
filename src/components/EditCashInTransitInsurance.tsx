import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import '../styles/CreateInsurance.css';
import { showToast } from "./Toast";

const EditCashInTransitInsurance: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [formData, setFormData] = useState<any>(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const fetchDocument = async () => {
            try {
                const response = await fetch(`/api/cash-in-transit-insurance/${id}`);
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
            const response = await fetch(`/api/cash-in-transit-insurance/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                showToast('تم تحديث الوثيقة بنجاح', 'success');
                setTimeout(() => navigate('/cash-in-transit-insurance'), 1500);
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
                <h2>تعديل وثيقة تأمين نقل النقدية</h2>
                <button type="button" className="btn-close" onClick={() => navigate(-1)}>إلغاء</button>
            </div>

            <form onSubmit={handleSubmit} className="insurance-form">
                <div className="form-sections">
                    <div className="form-section">
                        <h3>بيانات المؤمن والرحلة</h3>
                        <div className="form-group">
                            <label>اسم المؤمن له بالكامل *</label>
                            <input type="text" value={formData.insured_name} onChange={(e) => setFormData({...formData, insured_name: e.target.value})} required />
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                              <label>مسار النقل من *</label>
                              <input type="text" value={formData.transit_from} onChange={(e) => setFormData({...formData, transit_from: e.target.value})} required />
                          </div>
                          <div className="form-group">
                              <label>إلى *</label>
                              <input type="text" value={formData.transit_to} onChange={(e) => setFormData({...formData, transit_to: e.target.value})} required />
                          </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>الحدود والرسوم</h3>
                        <div className="form-row">
                          <div className="form-group">
                              <label>حد النقلة الواحدة (د.ل) *</label>
                              <input type="number" step="0.001" value={formData.limit_per_transit} onChange={(e) => setFormData({...formData, limit_per_transit: e.target.value})} required />
                          </div>
                          <div className="form-group">
                              <label>التداول السنوي المتوقع (د.ل)</label>
                              <input type="number" step="0.001" value={formData.annual_turnover || ''} onChange={(e) => setFormData({...formData, annual_turnover: e.target.value})} />
                          </div>
                        </div>
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

export default EditCashInTransitInsurance;
