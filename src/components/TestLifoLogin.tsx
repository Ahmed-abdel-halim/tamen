import { useState } from "react";

type LoginType = "union" | "company" | "office";

export default function TestLifoLogin() {
  const [loginType, setLoginType] = useState<LoginType>("union");
  const [username, setUsername] = useState("adminmli");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const getLoginUrl = () => {
    switch (loginType) {
      case "union":
        return "/lifo-prod/login";
      case "company":
        return "/lifo-prod/company/login";
      case "office":
        return "/lifo-prod/office/login";
      default:
        return "/lifo-prod/login";
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const loginUrl = getLoginUrl();
      
      // إنشاء FormData
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);
      // قد تكون الحقول مختلفة حسب نوع تسجيل الدخول
      formData.append("user_name", username);
      formData.append("pass_word", password);
      formData.append("email", username);

      const res = await fetch(loginUrl, {
        method: "POST",
        body: formData,
        credentials: "include", // لإرسال الكوكيز
        headers: {
          "Accept": "application/json, text/html, */*",
        },
      });

      const contentType = res.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        // محاولة تحليل JSON حتى لو كان Content-Type غير JSON
        try {
          data = JSON.parse(text);
        } catch {
          // إذا لم يكن JSON، نعرض النص
          data = {
            status: res.status,
            statusText: res.statusText,
            html: text.substring(0, 500),
            redirected: res.redirected,
            url: res.url,
          };
        }
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        data: data,
        headers: Object.fromEntries(res.headers.entries()),
        redirected: res.redirected,
        finalUrl: res.url,
      });

      if (res.ok || res.redirected) {
        // إذا تم إعادة التوجيه، قد يعني نجاح تسجيل الدخول
        if (res.redirected || res.url !== loginUrl) {
          setError(null);
        } else if (res.status === 200 && data) {
          setError(null);
        } else {
          setError(`خطأ: ${res.status} ${res.statusText}`);
        }
      } else {
        const errorMsg =
          data?.message ||
          data?.error ||
          data?.messages ||
          `خطأ: ${res.status} ${res.statusText}`;
        setError(errorMsg);
      }
    } catch (err: any) {
      if (err.message.includes("CORS") || err.message.includes("Failed to fetch")) {
        setError(
          "خطأ CORS: لا يمكن الاتصال بالموقع مباشرة من المتصفح. قد تحتاج إلى استخدام proxy أو الاتصال من الـ backend."
        );
      } else {
        setError(err.message || "حدث خطأ أثناء محاولة تسجيل الدخول");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>اختبار تسجيل الدخول - الاتحاد الليبي للتأمين</span>
      </div>

      <div className="users-card">
        <div className="form-page-container">
          <div className="form-page-header">
            <h2 className="form-page-title">
              اختبار تسجيل الدخول - prod.lifo.ly
            </h2>
          </div>

          {/* نوع تسجيل الدخول */}
          <div style={{
            marginBottom: '30px',
            padding: '15px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
              نوع تسجيل الدخول:
            </label>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="loginType"
                  value="union"
                  checked={loginType === "union"}
                  onChange={(e) => setLoginType(e.target.value as LoginType)}
                  style={{ marginLeft: '8px' }}
                />
                اتحاد الليبي للتآمين
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="loginType"
                  value="company"
                  checked={loginType === "company"}
                  onChange={(e) => setLoginType(e.target.value as LoginType)}
                  style={{ marginLeft: '8px' }}
                />
                شركة تآمين
              </label>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="loginType"
                  value="office"
                  checked={loginType === "office"}
                  onChange={(e) => setLoginType(e.target.value as LoginType)}
                  style={{ marginLeft: '8px' }}
                />
                مكتب تآمين
              </label>
            </div>
            <div style={{ marginTop: '10px', fontSize: '14px', color: '#6b7280' }}>
              <strong>URL:</strong> {getLoginUrl()} (عبر proxy)
              <br />
              <strong>URL الأصلي:</strong> {getLoginUrl().replace('/lifo-prod', 'https://prod.lifo.ly')}
            </div>
          </div>

          <form onSubmit={handleLogin} className="user-form" style={{ maxWidth: '600px' }}>
            <div className="form-group">
              <label htmlFor="username">اسم المستخدم <span className="required">*</span></label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="adminmli"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">كلمة المرور <span className="required">*</span></label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="123456"
                required
              />
            </div>

            <div className="form-actions" style={{ marginTop: '24px' }}>
              <button
                type="submit"
                disabled={loading}
                className="btn-submit"
              >
                {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </button>
            </div>
          </form>

          {error && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b'
            }}>
              <strong>خطأ:</strong> {error}
            </div>
          )}

          {response && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#166534' }}>
                النتيجة:
              </h3>
              
              <div style={{ marginBottom: '15px' }}>
                <strong>Status:</strong> {response.status} {response.statusText}
              </div>
              
              {response.redirected && (
                <div style={{
                  marginBottom: '15px',
                  padding: '10px',
                  backgroundColor: '#dcfce7',
                  borderRadius: '6px',
                  color: '#166534'
                }}>
                  <strong>✓ تم إعادة التوجيه:</strong> {response.finalUrl}
                  <br />
                  <small>قد يعني هذا نجاح تسجيل الدخول</small>
                </div>
              )}

              <div style={{
                backgroundColor: '#fff',
                padding: '15px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                overflow: 'auto',
                maxHeight: '500px'
              }}>
                <pre style={{
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'monospace',
                  fontSize: '14px'
                }}>
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div style={{
            marginTop: '30px',
            padding: '15px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <h4 style={{ marginTop: 0 }}>معلومات:</h4>
            <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
              <li><strong>الموقع:</strong> https://prod.lifo.ly/</li>
              <li><strong>اسم المستخدم:</strong> adminmli</li>
              <li><strong>كلمة المرور:</strong> 123456</li>
              <li><strong>ملاحظة:</strong> قد تواجه مشاكل CORS عند الاتصال المباشر من المتصفح</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
