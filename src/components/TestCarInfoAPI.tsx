import { useState } from "react";

type TabType = "getCarInfo" | "getAllCars" | "getAllCountries";

export default function TestCarInfoAPI() {
  const [activeTab, setActiveTab] = useState<TabType>("getCarInfo");
  const [carId, setCarId] = useState("");
  const [userName, setUserName] = useState("adminmli");
  const [password, setPassword] = useState("12345678");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestGetCarInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // إنشاء FormData
      const formData = new FormData();
      formData.append("user_name", userName);
      formData.append("pass_word", password);

      // استدعاء API عبر proxy لتجنب مشاكل CORS
      const url = `/external-api/cars/getinfo/${carId}`;
      
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });

      // التحقق من نوع الاستجابة
      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`خطأ في الاستجابة: ${text.substring(0, 200)}`);
        }
      }
      
      if (res.ok) {
        setResponse(data);
      } else {
        const errorMsg = data?.message || data?.messages || `خطأ: ${res.status} ${res.statusText}`;
        if (res.status === 401) {
          setError(`خطأ في المصادقة (401): ${errorMsg}. يرجى التحقق من اسم المستخدم وكلمة المرور.`);
        } else {
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      if (err.message.includes('CORS') || err.message.includes('Failed to fetch')) {
        setError('خطأ CORS: لا يمكن الاتصال بالـ API. يرجى التأكد من أن الـ proxy يعمل بشكل صحيح أو الاتصال بالـ API مباشرة من الـ backend.');
      } else {
        setError(err.message || "حدث خطأ أثناء الاتصال بالـ API");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestGetAllCars = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // إنشاء FormData
      const formData = new FormData();
      formData.append("user_name", userName);
      formData.append("pass_word", password);

      // استدعاء API عبر proxy لتجنب مشاكل CORS
      const url = `/external-api/cars/all`;
      
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });

      // التحقق من نوع الاستجابة
      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`خطأ في الاستجابة: ${text.substring(0, 200)}`);
        }
      }
      
      if (res.ok) {
        setResponse(data);
      } else {
        const errorMsg = data?.message || data?.messages || `خطأ: ${res.status} ${res.statusText}`;
        if (res.status === 401) {
          setError(`خطأ في المصادقة (401): ${errorMsg}. يرجى التحقق من اسم المستخدم وكلمة المرور.`);
        } else {
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      if (err.message.includes('CORS') || err.message.includes('Failed to fetch')) {
        setError('خطأ CORS: لا يمكن الاتصال بالـ API. يرجى التأكد من أن الـ proxy يعمل بشكل صحيح أو الاتصال بالـ API مباشرة من الـ backend.');
      } else {
        setError(err.message || "حدث خطأ أثناء الاتصال بالـ API");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestGetAllCountries = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // إنشاء FormData
      const formData = new FormData();
      formData.append("user_name", userName);
      formData.append("pass_word", password);

      // استدعاء API عبر proxy لتجنب مشاكل CORS
      const url = `/external-api/countries/all`;
      
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });

      // التحقق من نوع الاستجابة
      const contentType = res.headers.get("content-type");
      let data;
      
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`خطأ في الاستجابة: ${text.substring(0, 200)}`);
        }
      }
      
      if (res.ok) {
        setResponse(data);
      } else {
        const errorMsg = data?.message || data?.messages || `خطأ: ${res.status} ${res.statusText}`;
        if (res.status === 401) {
          setError(`خطأ في المصادقة (401): ${errorMsg}. يرجى التحقق من اسم المستخدم وكلمة المرور.`);
        } else {
          setError(errorMsg);
        }
      }
    } catch (err: any) {
      if (err.message.includes('CORS') || err.message.includes('Failed to fetch')) {
        setError('خطأ CORS: لا يمكن الاتصال بالـ API. يرجى التأكد من أن الـ proxy يعمل بشكل صحيح أو الاتصال بالـ API مباشرة من الـ backend.');
      } else {
        setError(err.message || "حدث خطأ أثناء الاتصال بالـ API");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>اختبار API - معلومات السيارات</span>
      </div>

      <div className="users-card">
        <div className="form-page-container">
          <div className="form-page-header">
            <h2 className="form-page-title">اختبار APIs - معلومات السيارات</h2>
          </div>

          {/* التبويبات */}
          <div style={{
            display: 'flex',
            gap: '10px',
            marginBottom: '30px',
            borderBottom: '2px solid #e5e7eb'
          }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab("getCarInfo");
                setResponse(null);
                setError(null);
              }}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderBottom: activeTab === "getCarInfo" ? '3px solid #3b82f6' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === "getCarInfo" ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === "getCarInfo" ? '600' : '400',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.2s'
              }}
            >
              معلومات سيارة محددة
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("getAllCars");
                setResponse(null);
                setError(null);
              }}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderBottom: activeTab === "getAllCars" ? '3px solid #3b82f6' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === "getAllCars" ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === "getAllCars" ? '600' : '400',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.2s'
              }}
            >
              جميع السيارات
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("getAllCountries");
                setResponse(null);
                setError(null);
              }}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderBottom: activeTab === "getAllCountries" ? '3px solid #3b82f6' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: activeTab === "getAllCountries" ? '#3b82f6' : '#6b7280',
                fontWeight: activeTab === "getAllCountries" ? '600' : '400',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.2s'
              }}
            >
              جميع الدول
            </button>
          </div>

          {/* نموذج معلومات سيارة محددة */}
          {activeTab === "getCarInfo" && (
            <form onSubmit={handleTestGetCarInfo} className="user-form" style={{ maxWidth: '600px' }}>
              <div className="form-group">
                <label htmlFor="carId">معرف السيارة (Car ID) <span className="required">*</span></label>
                <input
                  type="text"
                  id="carId"
                  value={carId}
                  onChange={(e) => setCarId(e.target.value)}
                  placeholder="أدخل معرف السيارة"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="userName">اسم المستخدم (user_name)</label>
                <input
                  type="text"
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="adminmli"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">كلمة المرور (pass_word)</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="12345678"
                />
              </div>

              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={loading || !carId}
                  className="btn-submit"
                >
                  {loading ? 'جاري الاختبار...' : 'اختبار API'}
                </button>
              </div>
            </form>
          )}

          {/* نموذج جميع السيارات */}
          {activeTab === "getAllCars" && (
            <form onSubmit={handleTestGetAllCars} className="user-form" style={{ maxWidth: '600px' }}>
              <div className="form-group">
                <label htmlFor="userName2">اسم المستخدم (user_name)</label>
                <input
                  type="text"
                  id="userName2"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="adminmli"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password2">كلمة المرور (pass_word)</label>
                <input
                  type="password"
                  id="password2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="12345678"
                />
              </div>

              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-submit"
                >
                  {loading ? 'جاري الاختبار...' : 'اختبار API - الحصول على جميع السيارات'}
                </button>
              </div>
            </form>
          )}

          {/* نموذج جميع الدول */}
          {activeTab === "getAllCountries" && (
            <form onSubmit={handleTestGetAllCountries} className="user-form" style={{ maxWidth: '600px' }}>
              <div className="form-group">
                <label htmlFor="userName3">اسم المستخدم (user_name)</label>
                <input
                  type="text"
                  id="userName3"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="adminmli"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password3">كلمة المرور (pass_word)</label>
                <input
                  type="password"
                  id="password3"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="12345678"
                />
              </div>

              <div className="form-actions" style={{ marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-submit"
                >
                  {loading ? 'جاري الاختبار...' : 'اختبار API - الحصول على جميع الدول'}
                </button>
              </div>
            </form>
          )}

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
              
              {response.code === 1 && (response.statues === true || response.status === true) && (
                <div style={{
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: '#dcfce7',
                  borderRadius: '6px',
                  color: '#166534',
                  marginBottom: '15px'
                }}>
                  <strong>✓ نجح:</strong> {response.messages || response.message || (
                    activeTab === "getCarInfo" ? 'تم عرض معلومات السيارة بنجاح' : 
                    activeTab === "getAllCars" ? 'تم عرض جميع السيارات بنجاح' : 
                    'تم عرض جميع الدول بنجاح'
                  )}
                </div>
              )}
              
              {response.code === 0 && (
                <div style={{
                  marginTop: '15px',
                  padding: '10px',
                  backgroundColor: '#fee2e2',
                  borderRadius: '6px',
                  color: '#991b1b',
                  marginBottom: '15px'
                }}>
                  <strong>✗ فشل:</strong> {response.messages || response.message || (
                    activeTab === "getCarInfo" ? 'فشل في الحصول على معلومات السيارة' : 
                    activeTab === "getAllCars" ? 'فشل في الحصول على السيارات' : 
                    'فشل في الحصول على الدول'
                  )}
                </div>
              )}

              {/* عرض جدول السيارات إذا كانت النتيجة ناجحة وتحتوي على مصفوفة */}
              {response.code === 1 && (response.statues === true || response.status === true) && response.data && Array.isArray(response.data) && response.data.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <div style={{
                    marginBottom: '15px',
                    padding: '10px',
                    backgroundColor: '#dbeafe',
                    borderRadius: '6px',
                    color: '#1e40af',
                    fontWeight: '600'
                  }}>
                    <strong>عدد {activeTab === "getAllCountries" ? "الدول" : "السيارات"}:</strong> {response.data.length} {activeTab === "getAllCountries" ? "دولة" : "سيارة"}
                  </div>
                  
                  <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    overflow: 'auto',
                    maxHeight: '600px'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '14px'
                    }}>
                      <thead>
                        <tr style={{
                          backgroundColor: '#f9fafb',
                          borderBottom: '2px solid #e5e7eb',
                          position: 'sticky',
                          top: 0,
                          zIndex: 10
                        }}>
                          <th style={{
                            padding: '12px',
                            textAlign: 'right',
                            fontWeight: '600',
                            color: '#374151',
                            borderRight: '1px solid #e5e7eb'
                          }}>#</th>
                          <th style={{
                            padding: '12px',
                            textAlign: 'right',
                            fontWeight: '600',
                            color: '#374151',
                            borderRight: '1px solid #e5e7eb'
                          }}>الاسم</th>
                          <th style={{
                            padding: '12px',
                            textAlign: 'right',
                            fontWeight: '600',
                            color: '#374151',
                            borderRight: '1px solid #e5e7eb'
                          }}>الرمز</th>
                          <th style={{
                            padding: '12px',
                            textAlign: 'center',
                            fontWeight: '600',
                            color: '#374151',
                            borderRight: '1px solid #e5e7eb'
                          }}>الحالة</th>
                          <th style={{
                            padding: '12px',
                            textAlign: 'right',
                            fontWeight: '600',
                            color: '#374151'
                          }}>تاريخ الإنشاء</th>
                        </tr>
                      </thead>
                      <tbody>
                        {response.data.map((car: any, index: number) => (
                          <tr key={car.id || index} style={{
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: index % 2 === 0 ? '#fff' : '#f9fafb'
                          }}>
                            <td style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              color: '#6b7280',
                              borderRight: '1px solid #e5e7eb'
                            }}>{car.id}</td>
                            <td style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              color: '#111827',
                              fontWeight: '500',
                              borderRight: '1px solid #e5e7eb'
                            }}>{car.name}</td>
                            <td style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              color: '#6b7280',
                              fontFamily: 'monospace',
                              borderRight: '1px solid #e5e7eb'
                            }}>{car.symbol}</td>
                            <td style={{
                              padding: '10px 12px',
                              textAlign: 'center',
                              borderRight: '1px solid #e5e7eb'
                            }}>
                              <span style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: '500',
                                backgroundColor: car.active === 1 ? '#dcfce7' : '#fee2e2',
                                color: car.active === 1 ? '#166534' : '#991b1b'
                              }}>
                                {car.active === 1 ? 'نشط' : 'غير نشط'}
                              </span>
                            </td>
                            <td style={{
                              padding: '10px 12px',
                              textAlign: 'right',
                              color: '#6b7280',
                              fontSize: '13px'
                            }}>{car.created_at || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* عرض JSON للبيانات الأخرى أو إذا لم تكن مصفوفة */}
              {(!response.data || !Array.isArray(response.data) || response.data.length === 0) && (
                <div style={{
                  backgroundColor: '#fff',
                  padding: '15px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  overflow: 'auto',
                  marginTop: '15px'
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
              )}
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
            <h4 style={{ marginTop: 0 }}>معلومات API:</h4>
            {activeTab === "getCarInfo" ? (
              <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                <li><strong>URL:</strong> /external-api/cars/getinfo/{'{id}'} (عبر proxy)</li>
                <li><strong>URL الأصلي:</strong> https://testenvapi.lifo.ly/api/cars/getinfo/{'{id}'}</li>
                <li><strong>Method:</strong> POST</li>
                <li><strong>Body:</strong> FormData (user_name, pass_word)</li>
                <li><strong>Response:</strong> JSON</li>
              </ul>
            ) : activeTab === "getAllCars" ? (
              <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                <li><strong>URL:</strong> /external-api/cars/all (عبر proxy)</li>
                <li><strong>URL الأصلي:</strong> https://testenvapi.lifo.ly/api/cars/all</li>
                <li><strong>Method:</strong> POST</li>
                <li><strong>Body:</strong> FormData (user_name, pass_word)</li>
                <li><strong>Response:</strong> JSON</li>
              </ul>
            ) : (
              <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                <li><strong>URL:</strong> /external-api/countries/all (عبر proxy)</li>
                <li><strong>URL الأصلي:</strong> https://testenvapi.lifo.ly/api/countries/all</li>
                <li><strong>Method:</strong> POST</li>
                <li><strong>Body:</strong> FormData (user_name, pass_word)</li>
                <li><strong>Response:</strong> JSON</li>
              </ul>
            )}
            <div style={{
              marginTop: '15px',
              padding: '12px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fde047',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#92400e'
            }}>
              <strong>ملاحظة:</strong> يتم استخدام proxy لتجنب مشاكل CORS. إذا استمرت المشكلة، تأكد من:
              <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                <li>أن بيانات الاعتماد صحيحة (user_name: adminmli, pass_word: 12345678)</li>
                <li>أن الـ dev server يعمل (npm run dev)</li>
                <li>إذا استمرت المشكلة، قد تحتاج إلى إعادة تشغيل الـ dev server</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
