import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

export default function CreateCashInTransitInsurance() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    insured_name: '',
    transit_from: '',
    transit_to: '',
    limit_per_transit: '10000.000',
    annual_turnover: '100000.000',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    premium_amount: '350.000',
    whatsapp_number: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.insured_name.trim()) errors.insured_name = 'اسم المؤمن له مطلوب';
    if (!formData.transit_from.trim()) errors.transit_from = 'خط النقل (من) مطلوب';
    if (!formData.transit_to.trim()) errors.transit_to = 'خط النقل (إلى) مطلوب';
    if (!formData.limit_per_transit) errors.limit_per_transit = 'حد النقلة الواحدة مطلوب';
    if (!formData.annual_turnover) errors.annual_turnover = 'التداول السنوي مطلوب';
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

      const res = await fetch(`${API_BASE_URL}/cash-in-transit-insurance`, {
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
      setTimeout(() => navigate('/cash-in-transit-insurance'), 1500);
    } catch (error: any) {
      showToast(`حدث خطأ: ${error.message || error}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>تأمين نقل النقدية / إصدار وثيقة جديدة</span>
      </div>

      <div className="users-card">
        <div className="form-page-header">
          <h2 className="form-page-title">إصدار وثيقة تأمين نقل النقدية</h2>
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-sections-container">
            <div className="form-section">
              <h3 className="form-section-title">بيانات المؤمن له</h3>
              <div className="form-group">
                <label>الاسم بالكامل (أو اسم الشركة) <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.insured_name}
                  onChange={(e) => setFormData({ ...formData, insured_name: e.target.value })}
                  className={formErrors.insured_name ? 'error' : ''}
                />
                {formErrors.insured_name && <span className="error-message">{formErrors.insured_name}</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>خط النقل من <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.transit_from}
                    onChange={(e) => setFormData({ ...formData, transit_from: e.target.value })}
                    className={formErrors.transit_from ? 'error' : ''}
                  />
                  {formErrors.transit_from && <span className="error-message">{formErrors.transit_from}</span>}
                </div>
                <div className="form-group">
                  <label>خط النقل إلى <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.transit_to}
                    onChange={(e) => setFormData({ ...formData, transit_to: e.target.value })}
                    className={formErrors.transit_to ? 'error' : ''}
                  />
                  {formErrors.transit_to && <span className="error-message">{formErrors.transit_to}</span>}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">بيانات التأمين والحدود</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>حد النقلة الواحدة (د.ل) <span className="required">*</span></label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.limit_per_transit}
                    onChange={(e) => setFormData({ ...formData, limit_per_transit: e.target.value })}
                    className={formErrors.limit_per_transit ? 'error' : ''}
                  />
                  {formErrors.limit_per_transit && <span className="error-message">{formErrors.limit_per_transit}</span>}
                </div>
                <div className="form-group">
                  <label>إجمالي التداول السنوي المتوقع (د.ل) <span className="required">*</span></label>
                  <input
                    type="number"
                    step="0.001"
                    value={formData.annual_turnover}
                    onChange={(e) => setFormData({ ...formData, annual_turnover: e.target.value })}
                    className={formErrors.annual_turnover ? 'error' : ''}
                  />
                  {formErrors.annual_turnover && <span className="error-message">{formErrors.annual_turnover}</span>}
                </div>
              </div>
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
                <label>رقم الواتساب الخاص بالمؤمن له <span className="required">*</span></label>
                <p style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px', fontWeight: '500' }}>
                  يجب إضافة رقم الواتساب الخاص بالمؤمن له (إلزامي لإتمام الوثيقة)
                </p>
                <input
                  type="text"
                  placeholder="مثال: 0910000000"
                  value={formData.whatsapp_number}
                  onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  className={formErrors.whatsapp_number ? 'error' : ''}
                />
                {formErrors.whatsapp_number && <span className="error-message">{formErrors.whatsapp_number}</span>}
              </div>
              <div className="form-group">
                <label>مبلغ القسط الصافي (د.ل) <span className="required">*</span></label>
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
            <button type="button" className="btn-cancel" onClick={() => navigate('/cash-in-transit-insurance')}>
              إلغاء
            </button>
          </div>
        </form>
      </div>

    </section>
  );
}
