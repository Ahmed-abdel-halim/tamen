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
  });

  const [submitting, setSubmitting] = useState(false);


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

      const res = await fetch(`${API_BASE_URL}/cargo-insurance`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('فشل في حفظ الوثيقة');
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
                  required
                  value={formData.insured_name}
                  onChange={(e) => setFormData({ ...formData, insured_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>وصف البضاعة <span className="required">*</span></label>
                <textarea
                  required
                  value={formData.cargo_description}
                  onChange={(e) => setFormData({ ...formData, cargo_description: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>نوع النقل</label>
                <select
                  value={formData.transport_type}
                  onChange={(e) => setFormData({ ...formData, transport_type: e.target.value })}
                >
                  <option value="Sea">بحري (Sea)</option>
                  <option value="Air">جوي (Air)</option>
                  <option value="Land">بري (Land)</option>
                </select>
              </div>
            </div>

            <div className="form-section">
              <h3 className="form-section-title">بيانات الرحلة والتغطية</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>من (مكان الشحن)</label>
                  <input
                    type="text"
                    value={formData.voyage_from}
                    onChange={(e) => setFormData({ ...formData, voyage_from: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>إلى (مكان التفريغ)</label>
                  <input
                    type="text"
                    value={formData.voyage_to}
                    onChange={(e) => setFormData({ ...formData, voyage_to: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>مبلغ التأمين (Sum Insured) <span className="required">*</span></label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={formData.sum_insured}
                  onChange={(e) => setFormData({ ...formData, sum_insured: e.target.value })}
                />
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
            <button type="button" className="btn-cancel" onClick={() => navigate('/cargo-insurance')}>
              إلغاء
            </button>
          </div>
        </form>
      </div>

    </section>
  );
}
