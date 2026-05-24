import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config/api";
import { showToast } from "./Toast";

type LoyaltySetting = {
  id: number;
  policy_type: string;
  display_name: string;
  points_reward: number;
};

export default function LoyaltySettings() {
  const [settings, setSettings] = useState<LoyaltySetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };
      const res = await fetch(`${API_BASE_URL}/agent-wallet/settings/loyalty`, { headers });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        showToast("فشل تحميل إعدادات النقاط", "error");
      }
    } catch (e) {
      showToast("حدث خطأ أثناء تحميل البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handlePointsChange = (policyType: string, value: string) => {
    const parsed = parseInt(value);
    const num = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setSettings((prev) =>
      prev.map((s) => (s.policy_type === policyType ? { ...s, points_reward: num } : s))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-wallet/settings/loyalty`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ settings })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "تم حفظ التعديلات بنجاح", "success");
        fetchSettings();
      } else {
        showToast(data.message || "فشل حفظ التعديلات", "error");
      }
    } catch (e) {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', borderBottom: '2px solid var(--border)', paddingBottom: '10px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, color: 'var(--primary-color)' }}>
          <i className="fa-solid fa-award"></i> إعدادات نقاط الولاء والتحفيز للوكلاء
        </h2>
      </div>

      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '16px', padding: '25px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)' }}>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
          هنا يمكنك تحديد عدد نقاط الولاء التي يحصل عليها الوكيل تلقائياً في محفظته مقابل كل وثيقة تأمين يقوم بإصدارها عبر حسابه.
        </p>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>جاري تحميل الإعدادات...</div>
        ) : (
          <form onSubmit={handleSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
              {settings.map((setting) => (
                <div
                  key={setting.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 18px',
                    background: 'var(--table-header-bg)',
                    borderRadius: '10px',
                    border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{setting.display_name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="number"
                      min="0"
                      value={setting.points_reward}
                      onChange={(e) => handlePointsChange(setting.policy_type, e.target.value)}
                      style={{
                        width: '90px',
                        textAlign: 'center',
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text-color)',
                        fontWeight: 'bold',
                      }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--muted)' }}>نقطة</span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  borderRadius: '10px',
                  background: 'var(--primary-color)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(var(--primary-color-rgb), 0.2)',
                }}
              >
                {saving ? (
                  "جاري الحفظ..."
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk"></i> حفظ إعدادات النقاط
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
