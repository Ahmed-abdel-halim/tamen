import { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { showToast } from "./Toast";

import { API_BASE_URL } from "../config/api";

export default function CreateCargoInsurance() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    insured_name: '',
    cargo_description: '',
    transport_type: 'Sea',
    voyage_from: '',
    voyage_to: '',
    sum_insured: '50000.000',
    premium_amount: '450.000',
    whatsapp_number: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.insured_name.trim()) errors.insured_name = 'اسم المؤمن له مطلوب';
    if (!formData.cargo_description.trim()) errors.cargo_description = 'وصف البضاعة مطلوب';
    if (!formData.transport_type) errors.transport_type = 'نوع النقل مطلوب';
    if (!formData.voyage_from.trim()) errors.voyage_from = 'مكان الشحن مطلوب';
    if (!formData.voyage_to.trim()) errors.voyage_to = 'مكان التفريغ مطلوب';
    if (!formData.sum_insured) errors.sum_insured = 'مبلغ التأمين مطلوب';
    if (!formData.whatsapp_number.trim()) errors.whatsapp_number = 'رقم الواتساب مطلوب';
    if (!formData.premium_amount) errors.premium_amount = 'مبلغ القسط مطلوب';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };


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

      const res = await fetch(`${API_BASE_URL}/cargo-insurance`, {
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
      setTimeout(() => navigate('/cargo-insurance'), 1500);
    } catch (error: any) {
      showToast(`حدث خطأ: ${error.message || error}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>تأمين شحن البضائع / إصدار وثيقة جديدة</span>
      </div>

      <div className="users-card">
        <div className="form-page-header">
          <h2 className="form-page-title">إصدار وثيقة تأمين شحن البضائع</h2>
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          <div className="form-sections-container">
            <div className="form-section">
              <h3 className="form-section-title">بيانات المؤمن له والشحنة</h3>
              <div className="form-group">
                <label>اسم المؤمن له <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.insured_name}
                  onChange={(e) => setFormData({ ...formData, insured_name: e.target.value })}
                  className={formErrors.insured_name ? 'error' : ''}
                />
                {formErrors.insured_name && <span className="error-message">{formErrors.insured_name}</span>}
              </div>
              <div className="form-group">
                <label>وصف البضاعة <span className="required">*</span></label>
                <textarea
                  value={formData.cargo_description}
                  onChange={(e) => setFormData({ ...formData, cargo_description: e.target.value })}
                  className={formErrors.cargo_description ? 'error' : ''}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: formErrors.cargo_description ? '1px solid #ef4444' : '1px solid var(--border)' }}
                  rows={3}
                />
                {formErrors.cargo_description && <span className="error-message">{formErrors.cargo_description}</span>}
              </div>
              <div className="form-group">
                <label>نوع النقل <span className="required">*</span></label>
                <select
                  value={formData.transport_type}
                  onChange={(e) => setFormData({ ...formData, transport_type: e.target.value })}
                  className={formErrors.transport_type ? 'error' : ''}
                >
                  <option value="Sea">بحري (Sea)</option>
                  <option value="Air">جوي (Air)</option>
                  <option value="Land">بري (Land)</option>
                </select>
                {formErrors.transport_type && <span className="error-message">{formErrors.transport_type}</span>}
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">بيانات الرحلة والتغطية</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>من (مكان الشحن) <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.voyage_from}
                    onChange={(e) => setFormData({ ...formData, voyage_from: e.target.value })}
                    className={formErrors.voyage_from ? 'error' : ''}
                  />
                  {formErrors.voyage_from && <span className="error-message">{formErrors.voyage_from}</span>}
                </div>
                <div className="form-group">
                  <label>إلى (مكان التفريغ) <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.voyage_to}
                    onChange={(e) => setFormData({ ...formData, voyage_to: e.target.value })}
                    className={formErrors.voyage_to ? 'error' : ''}
                  />
                  {formErrors.voyage_to && <span className="error-message">{formErrors.voyage_to}</span>}
                </div>
              </div>
              <div className="form-group">
                <label>مبلغ التأمين (Sum Insured) <span className="required">*</span></label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.sum_insured}
                  onChange={(e) => setFormData({ ...formData, sum_insured: e.target.value })}
                  className={formErrors.sum_insured ? 'error' : ''}
                />
                {formErrors.sum_insured && <span className="error-message">{formErrors.sum_insured}</span>}
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
            <button type="button" className="btn-cancel" onClick={() => navigate('/cargo-insurance')}>
              إلغاء
            </button>
          </div>
        </form>
      </div>

    </section>
  );
}
