import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

type InsuranceTermsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  insuranceTypeKey: string;
  insuranceTypeName: string;
  onSaved?: (newTerms: string) => void;
};

export const DEFAULT_INSURANCE_TERMS: Record<string, string> = {
  motor: `1. يسري هذا التغطية التأمينية وفقاً للشروط والأحكام الخاصة بوثيقة التأمين الإجباري/التكميلي الصادرة من الشركة.
2. يتعين على المؤمن له الإبلاغ عن أي حادث خلال 72 ساعة من وقوعه.
3. لا تغطي هذه الوثيقة الأضرار الناتجة عن القيادة بدون رخصة قيادة سارية المفعول أو قيادة المركبة تحت تأثير مسكر أو مخدّر.
4. يلزم تقديم تقرير الشرطة/المرور المعتمد وأصل الوثيقة عند المطالبة بالتعويض.
5. تلتزم الشركة بالتعويض في حدود المسؤولية المحددة بالوثيقة ولائحة هيئة الإشراف على التأمين.`,

  international: `1. تسري البطاقة البرتقالية للسيارات الدولية ضمن نطاق الدول العربية الأعضاء المحددة بالوثيقة.
2. التغطية تشمل المسؤولية المدنية تجاه الغير وفق القوانين واللوائح المعمول بها في الدولة المزارة.
3. يجب إبراز البطاقة للجهات المختصة عند المنافذ الحدودية والدخول للدول المزارة.
4. أي تعديل أو كشط في بيانات الوثيقة يجعلها ملغاة وباطِلة.`,

  travel: `بيانات هامة : هذا التأمين يستثني العديد من المخاطر والأمراض المتعلقة بالصحة وكذلك لا يغطي أي مرض سابق لصدور هذه البوليسة .
((من أجل ضمان أن يكون هذا التأمين يرضي الاحتياجات الخاصة بك)). يجب أن تكون في تاريخ سريان هذا التأمين قادر على الالتزام بما يلي :
ألا تكون بانتظار إجراء عملية جراحية أو فحص بعد العملية أو أي فحوصات أو اختبارات أو نتائج اختبارات طبية , أو أي علاج في المستشفى أو تشخيص (عدا فحوص منتظمة في مستشفى كمريض مقيم لحالة مستقرة حيث لم يتغير فيها الدواء والجرعة في أخر 12 شهر).
لم يتلقى أي علاج لأي من الإجراءات التالية: السكتة الدماغية * أي شكل من أشكال السرطان * أو سرطان الدم أو ورم * أو عملية زرع * أو أي مشكلة في القلب أو الشرايين * أو الفشل الكلوي.`,

  resident: `1. الوثيقة مخصصة لتقديم التغطية الطبية والإقامة للوافدين والمقيمين وفق الضوابط واللوائح المعتمدة.
2. تشمل التغطية العلاج الطارئ والإقامة بالمستشفيات المعتمدة داخل دولة ليبيا.
3. تشترط الوثيقة صحة البيانات الشخصية وجواز السفر ورقم الإقامة المسجل بالمنظومة.
4. يلزم الحصول على الموافقة المسبقة للإجراءات الطبية والعمليات غير الطارئة.`,

  marine: `1. تغطي الوثيقة الأضرار والخسائر المادية التي تلحق بالهياكل والمحركات البحرية وفق شروط مجمع المكتتبين بلندن (Institute Time Clauses - Hulls).
2. يشترط أن تكون القطعة البحرية في حالة صلاحية للإبحار ومجتازة للمعاينة الفنية.
3. يستثنى من التغطية التآكل الطبيعي، الإهمال الجسيم، والأضرار الناتجة عن الحروب والاضطرابات ما لم يتم التأمين عليها بملحق خاص.
4. الإبلاغ الفوري عن أي حادث للشركة والمشرف البحري المعتمد.`,

  liability: `1. تغطي هذه الوثيقة المسؤولية القانونية الناتجة عن الخطأ أو الإهمال المهني غير المقصود أثناء ممارسة المهن المحددة.
2. الحد الأقصى للمسؤولية والتعويض هو المبلغ الموضح في جدول الوثيقة عن الحادث الواحد وإجمالي فترة التأمين.
3. تشترط الوثيقة استمرار المؤمن له في التراخيص المعتمدة ومراعاة الأصول والأخلاقيات المهنية.
4. لا تغطي الوثيقة الأفعال المتعمدة، الجرائم الجنائية، والتعويضات العقابية.`,

  accident: `1. تقدم الوثيقة تعويضات مالية في حالات الوفاة أو العجز الكلي/الجزئي الدائم الناتج عن حادث مفاجئ ومباشر.
2. يشترط تقديم التقارير الطبية الرسمية وتقرير الجهات الأمنية فور وقوع الحادث.
3. تستثنى الحوادث الناتجة عن المشاركة في سباقات السرعة، الأنشطة الخطرة، وقيادة مركبة بدون رخصة سارية.
4. تسدد التعويضات للمستفيدين المحددين بالوثيقة أو الورثة الشرعيين.`,

  school: `1. تغطي الوثيقة الحوادث الإشرافية والإصابات البدنية لطلاب المدارس أثناء التواجد بالمدرسة أو الفعاليات المدرسية الرسمية.
2. تشمل التغطية المصاريف الطبية الطارئة والتعويض عن العجز أو الوفاة الناتجة عن الحادث.
3. يلتزم إدارة المدرسة بالإبلاغ عن الحادث خلال 48 ساعة مرفقاً بتقارير الإدارة والتقرير الطبي.
4. تستثنى المشاجرات والأعمال المتعمدة بين الطلاب خارج الإشراف المدرسي.`,

  cash: `1. تغطي الوثيقة مخاطر السطو والسرقة بالإكراه وفقدان النقدية أثناء النقل بين المقرات والبنك وفق المسارات المحددة.
2. يشترط الالتزام بالحراسة والوسائل الأمنية المعتمدة لنقل الأموال وسيارات النقل المصفحة أو المخصصة.
3. يلزم السجل المالي الدقيق والاحتفاظ بأذونات الصرف والإيداع المعتمدة.
4. الإبلاغ الفوري للشرطة والشركة عند وقوع أي حادث سطو.`,

  cargo: `1. تغطي الوثيقة البضائع المنقولة براً أو بحراً أو جواً ضد أخطار النقل وفق شروط مجمع المكتتبين للبضائع (Institute Cargo Clauses A/B/C).
2. يشترط التغليف المناسب والشحن بواسطة وسيلة نقل صالحة ومستوفية للشروط.
3. يلزم التفتيش والمعاينة عند الاستلام في ميناء/نقطة الوصول وإثبات أي عجز أو تلف فوراً.
4. تستثنى العيوب الذاتية للبضاعة، سوء التغليف، والتأخير.`
};

export default function InsuranceTermsModal({
  isOpen,
  onClose,
  insuranceTypeKey,
  insuranceTypeName,
  onSaved
}: InsuranceTermsModalProps) {
  const [conditionsText, setConditionsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && insuranceTypeKey) {
      loadConditions();
    }
  }, [isOpen, insuranceTypeKey]);

  const loadConditions = async () => {
    setLoading(true);
    const localSaved = localStorage.getItem(`insurance_conditions_${insuranceTypeKey}`);
    if (localSaved) {
      setConditionsText(localSaved);
    } else {
      setConditionsText(DEFAULT_INSURANCE_TERMS[insuranceTypeKey] || '');
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/insurance-conditions/${insuranceTypeKey}`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.conditions) {
          setConditionsText(data.conditions);
          localStorage.setItem(`insurance_conditions_${insuranceTypeKey}`, data.conditions);
        }
      }
    } catch (e) {
      console.error("Failed to load conditions from server", e);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefault = () => {
    const defaultTerms = DEFAULT_INSURANCE_TERMS[insuranceTypeKey] || '';
    setConditionsText(defaultTerms);
    showToast("تم تحميل الشروط الافتراضية بنجاح", "success");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem(`insurance_conditions_${insuranceTypeKey}`, conditionsText);

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/insurance-conditions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          insurance_type: insuranceTypeKey,
          conditions: conditionsText
        })
      });

      if (!res.ok) {
        console.warn("Server update warning, cached in localStorage");
      }

      showToast(`تم حفظ شروط (${insuranceTypeName}) بنجاح وطباعتها بالوثيقة`, "success");
      if (onSaved) onSaved(conditionsText);
      onClose();
    } catch (error: any) {
      showToast("تم حفظ الشروط محلياً وسيتم تطبيقها على طابع الوثيقة", "success");
      if (onSaved) onSaved(conditionsText);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="modal-inner custom-scrollbar" style={{
        background: 'var(--panel, #ffffff)',
        color: 'var(--text, #0f172a)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border, #e2e8f0)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 25px',
          borderBottom: '1px solid var(--border, #e2e8f0)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
          color: '#ffffff',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-file-contract" style={{ fontSize: '1.4rem', color: '#60a5fa' }}></i>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                تعديل شروط وإقرارات الوثيقة
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', opacity: 0.9 }}>
                نوع التأمين: <strong style={{ color: '#fde047' }}>{insuranceTypeName}</strong> (سيتم اعتماد الشروط في طابع الوثيقة عند الطباعة)
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer', opacity: 0.8 }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '25px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
              <p>جاري تحميل الشروط الحالية...</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text)' }}>
                  <i className="fa-solid fa-pen-to-square" style={{ color: '#2563eb', marginLeft: '6px' }}></i>
                  نص الشروط والإقرارات المعتمدة للطباعة:
                </label>
                <button
                  type="button"
                  onClick={handleResetDefault}
                  style={{
                    background: 'transparent',
                    border: '1px solid #cbd5e1',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    color: '#64748b',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                  title="استرجاع النص الافتراضي للشروط"
                >
                  <i className="fa-solid fa-rotate-left" style={{ marginLeft: '4px' }}></i>
                  الشروط الافتراضية
                </button>
              </div>

              <textarea
                value={conditionsText}
                onChange={(e) => setConditionsText(e.target.value)}
                placeholder="أدخل شروط وإقرارات الوثيقة هنا..."
                rows={10}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border, #cbd5e1)',
                  background: 'var(--input-bg, #f8fafc)',
                  color: 'var(--text, #0f172a)',
                  fontSize: '0.9rem',
                  lineHeight: '1.6',
                  fontFamily: 'Cairo, inherit',
                  resize: 'vertical'
                }}
              />

              <div style={{
                marginTop: '15px',
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                fontSize: '0.82rem',
                color: '#1e40af',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <i className="fa-solid fa-circle-info" style={{ fontSize: '1rem', flexShrink: 0 }}></i>
                <span>
                  <strong>تنبيه:</strong> النص المكتوب أعلاه سيظهر تلقائياً أسفل النموذج الرسمي لطابع الوثيقة عند الطباعة لجميع الوكلاء والموظفين.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '15px 25px',
          borderTop: '1px solid var(--border, #e2e8f0)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: 'var(--bg, #f8fafc)',
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#ffffff',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <i className="fa-solid fa-floppy-disk"></i>
            {saving ? 'جاري الحفظ...' : 'حفظ اعتماد الشروط'}
          </button>
        </div>
      </div>
    </div>
  );
}
