import { useEffect, useState } from "react";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

type OfficeUser = {
  id: number;
  username: string;
  name: string;
  lifo_username: string;
  lifo_permissions: number[];
  lifo_user_id: string | null;
  is_active: boolean;
};

export default function OfficeUsers() {
  const [users, setUsers] = useState<OfficeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    password: "",
    password_confirmation: "",
    permissions: [] as number[],
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<null | OfficeUser>(null);
  const [deleting, setDeleting] = useState(false);

  const [editingUser, setEditingUser] = useState<null | OfficeUser>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    password: "",
    password_confirmation: "",
    permissions: [] as number[],
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/office-users`, {
        headers: {
          "Accept": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Error fetching office users:", error);
      showToast(`حدث خطأ أثناء جلب مستخدمي المكتب: ${error.message || ""}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (u: OfficeUser) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/office-users/${u.id}/toggle-status`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        let errorMessage = "حدث خطأ أثناء تبديل حالة الحساب";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      const data = await res.json();
      showToast(data.message || "تم تغيير حالة الحساب بنجاح", "success");
      
      // Update local state directly
      setUsers(prev => prev.map(item => {
        if (item.id === u.id) {
          return {
            ...item,
            is_active: data.is_active !== undefined ? data.is_active : !item.is_active,
          };
        }
        return item;
      }));
    } catch (error: any) {
      showToast(error.message || "فشل تغيير حالة حساب المستخدم", "error");
    }
  };

  const handleDeleteClick = (u: OfficeUser) => {
    setDeleteConfirmation(u);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmation) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/office-users/${deleteConfirmation.id}`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        let errorMessage = "حدث خطأ أثناء حذف مستخدم المكتب";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      showToast("تم حذف مستخدم المكتب بنجاح", "success");
      setUsers(prev => prev.filter(u => u.id !== deleteConfirmation.id));
      setDeleteConfirmation(null);
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء الحذف", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handlePermissionChange = (permissionId: number) => {
    setFormData(prev => {
      const updatedPermissions = prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId];
      return { ...prev, permissions: updatedPermissions };
    });
  };

  const handleEditClick = (u: OfficeUser) => {
    setEditingUser(u);
    setEditFormData({
      name: u.name,
      password: "",
      password_confirmation: "",
      permissions: u.lifo_permissions || [],
    });
  };

  const handleEditPermissionChange = (permissionId: number) => {
    setEditFormData(prev => {
      const updatedPermissions = prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId];
      return { ...prev, permissions: updatedPermissions };
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editFormData.name.trim()) {
      showToast("يرجى تعبئة الحقول المطلوبة", "error");
      return;
    }
    if (editFormData.password) {
      if (editFormData.password.length < 6) {
        showToast("كلمة المرور الجديدة يجب أن لا تقل عن 6 خانات", "error");
        return;
      }
      if (editFormData.password !== editFormData.password_confirmation) {
        showToast("كلمتا المرور غير متطابقتين", "error");
        return;
      }
    }
    if (editFormData.permissions.length === 0) {
      showToast("يرجى اختيار صلاحية واحدة على الأقل للمستخدم", "error");
      return;
    }

    setUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/office-users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(editFormData),
      });

      if (!res.ok) {
        let errorMessage = "حدث خطأ أثناء تعديل بيانات المستخدم";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      showToast("تم تحديث بيانات المستخدم وصلاحياته بنجاح", "success");
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء محاولة التعديل", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.name.trim() || !formData.password || !formData.password_confirmation) {
      showToast("يرجى تعبئة كافة الحقول المطلوبة", "error");
      return;
    }
    if (formData.password.length < 6) {
      showToast("كلمة المرور يجب أن لا تقل عن 6 خانات", "error");
      return;
    }
    if (formData.password !== formData.password_confirmation) {
      showToast("كلمتا المرور غير متطابقتين", "error");
      return;
    }
    if (formData.permissions.length === 0) {
      showToast("يرجى اختيار صلاحية واحدة على الأقل للمستخدم", "error");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/office-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        let errorMessage = "حدث خطأ أثناء حفظ مستخدم المكتب الجديد";
        try {
          const errorData = await res.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {}
        throw new Error(errorMessage);
      }

      showToast("تمت إضافة مستخدم المكتب الجديد ومزامنته مع الاتحاد بنجاح", "success");
      setShowForm(false);
      setFormData({
        username: "",
        name: "",
        password: "",
        password_confirmation: "",
        permissions: [],
      });
      fetchUsers();
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء محاولة الحفظ", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getPermissionLabel = (id: number) => {
    switch (id) {
      case 1:
        return "صلاحية عرض البطاقات";
      case 2:
        return "صلاحية اصدار وثيقة";
      case 3:
        return "صلاحية ادارة التقارير";
      default:
        return `صلاحية ${id}`;
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="users-management font-cairo">
      {/* Breadcrumb section */}
      <div className="users-breadcrumb" style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", padding: "30px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", borderRadius: "16px", marginBottom: "30px", color: "#fff"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <h2 style={{ margin: 0, fontSize: "24px", display: "flex", alignItems: "center", gap: "15px" }}>
            <i className="fa-solid fa-users-gear" style={{ color: "#38bdf8" }}></i>
            مستخدمي المكتب (الوكالة)
          </h2>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>إدارة حسابات موظفي مكتبك وصلاحياتهم المسجلة في بوابة الاتحاد (LIFO)</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => setShowForm(true)} 
          style={{ 
            borderRadius: "10px", padding: "12px 25px", fontSize: "15px", fontWeight: "bold", 
            background: "var(--accent-cyan)", border: "none", boxShadow: "0 4px 12px var(--accent-shadow)" 
          }}
        >
          <i className="fa-solid fa-user-plus"></i> إضافة مستخدم مكتب جديد
        </button>
      </div>

      {/* Main card */}
      <div className="users-card">
        <div className="users-card-header" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "15px", marginBottom: "20px" }}>
          <div className="header-right">
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#2563eb" }}>
              قائمة المستخدمين الحاليين تحت حساب مكتبكم
            </h3>
          </div>
        </div>

        {/* Filter / Search Row */}
        <div className="filters-row" style={{ 
          padding: "15px 20px", 
          background: "transparent", 
          border: "1px solid var(--border)", 
          borderRadius: "12px",
          margin: "0 0 20px 0",
          display: "flex", 
          gap: "15px", 
          alignItems: "center" 
        }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <div className="search-wrapper" style={{ width: "100%", position: "relative" }}>
              <i className="fa-solid fa-magnifying-glass search-icon" style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}></i>
              <input 
                type="text" 
                placeholder="بحث باسم المستخدم أو الاسم الكامل..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingRight: "35px", width: "100%", height: "42px", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg)" }}
              />
            </div>
          </div>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="btn-cancel" 
              style={{ padding: "10px 15px", height: "42px", borderRadius: "10px", background: "#f3f4f6", color: "#4b5563", border: "none", fontWeight: "bold" }}
            >
              <i className="fa-solid fa-rotate-left"></i> إعادة تعيين
            </button>
          )}
        </div>

        {/* Data Table */}
        {loading ? (
          <p className="empty-state-text" style={{ textAlign: "center", padding: "40px", fontSize: "16px", color: "var(--muted)" }}>جار التحميل...</p>
        ) : (
          <>
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>الاسم الكامل</th>
                    <th>اسم المستخدم</th>
                    <th>مُعرّف الاتحاد (LIFO ID)</th>
                    <th>الصلاحيات الممنوحة</th>
                    <th>الحالة</th>
                    <th>تغيير الحالة</th>
                    <th>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-state" style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                        <i className="fa-solid fa-user-slash" style={{ fontSize: "2rem", display: "block", marginBottom: "10px", opacity: 0.5 }}></i>
                        لا يوجد مستخدمون مسجلون حالياً أو لا تطابق نتائج البحث
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u, index) => (
                      <tr key={u.id}>
                        <td>{index + 1}</td>
                        <td style={{ fontWeight: "600" }}>{u.name}</td>
                        <td style={{ direction: "ltr", textAlign: "right" }}>{u.username}</td>
                        <td>{u.lifo_user_id || <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>غير متوفر</span>}</td>
                        <td>
                          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                            {u.lifo_permissions && u.lifo_permissions.length > 0 ? (
                              u.lifo_permissions.map((pId) => (
                                <span 
                                  key={pId} 
                                  className="badge" 
                                  style={{ 
                                    background: pId === 2 ? "#dcfce7" : pId === 1 ? "#dbeafe" : "#fef9c3", 
                                    color: pId === 2 ? "#15803d" : pId === 1 ? "#1d4ed8" : "#a16207", 
                                    fontSize: "0.75rem", padding: "4px 8px", borderRadius: "6px", fontWeight: "600"
                                  }}
                                >
                                  {getPermissionLabel(pId)}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>بلا صلاحيات</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {u.is_active ? (
                            <span className="status-badge active" style={{ padding: "4px 8px", borderRadius: "6px" }}>نشط</span>
                          ) : (
                            <span className="status-badge inactive" style={{ background: "#fee2e2", color: "#991b1b", padding: "4px 8px", borderRadius: "6px" }}>معطل</span>
                          )}
                        </td>
                        <td>
                          <label className="switch" title={u.is_active ? "تعطيل الحساب" : "تفعيل الحساب"} style={{ margin: "0 auto" }}>
                            <input
                              type="checkbox"
                              checked={u.is_active}
                              onChange={() => handleToggleStatus(u)}
                            />
                            <span className="slider round"></span>
                          </label>
                        </td>
                        <td>
                          <div className="action-buttons" style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                            <button
                              className="action-btn edit"
                              onClick={() => handleEditClick(u)}
                              aria-label="تعديل"
                              title="تعديل الحساب والصلاحيات"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() => handleDeleteClick(u)}
                              aria-label="حذف"
                              title="حذف الحساب نهائياً"
                            >
                              <i className="fa-solid fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="users-mobile-cards">
              {filteredUsers.length === 0 ? (
                <div className="empty-state" style={{ textAlign: "center", padding: "20px" }}>لا يوجد مستخدمون</div>
              ) : (
                filteredUsers.map((u, index) => (
                  <div key={u.id} className="user-mobile-card">
                    <div className="user-mobile-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h4 className="user-mobile-title">{u.name}</h4>
                      <span className="user-mobile-number">#{index + 1}</span>
                    </div>
                    <div className="user-mobile-body">
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">اسم المستخدم:</span>
                        <span className="user-mobile-value" style={{ direction: "ltr" }}>{u.username}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">مُعرّف الاتحاد:</span>
                        <span className="user-mobile-value">{u.lifo_user_id || "غير متوفر"}</span>
                      </div>
                      <div className="user-mobile-row">
                        <span className="user-mobile-label">الصلاحيات:</span>
                        <span className="user-mobile-value">
                          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                            {u.lifo_permissions && u.lifo_permissions.length > 0 ? (
                              u.lifo_permissions.map((pId) => (
                                <span 
                                  key={pId} 
                                  style={{ 
                                    background: pId === 2 ? "#dcfce7" : pId === 1 ? "#dbeafe" : "#fef9c3", 
                                    color: pId === 2 ? "#15803d" : pId === 1 ? "#1d4ed8" : "#a16207", 
                                    fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px" 
                                  }}
                                >
                                  {getPermissionLabel(pId)}
                                </span>
                              ))
                            ) : (
                              <span style={{ color: "var(--muted)" }}>بلا صلاحيات</span>
                            )}
                          </div>
                        </span>
                      </div>
                      <div className="user-mobile-row" style={{ alignItems: "center" }}>
                        <span className="user-mobile-label">تنشيط / تعطيل:</span>
                        <label className="switch" style={{ margin: 0 }}>
                          <input
                            type="checkbox"
                            checked={u.is_active}
                            onChange={() => handleToggleStatus(u)}
                          />
                          <span className="slider round"></span>
                        </label>
                      </div>
                      <div className="user-mobile-actions" style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "10px" }}>
                        <button
                          className="action-btn edit"
                          onClick={() => handleEditClick(u)}
                          title="تعديل"
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDeleteClick(u)}
                          title="حذف"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="modal" onClick={(e) => {
          if (e.target === e.currentTarget) setShowForm(false);
        }}>
          <div className="modal-content user-form-modal" style={{ maxWidth: "650px" }}>
            <div className="modal-header">
              <h3>إضافة مستخدم مكتب جديد تحت وكالتكم</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowForm(false)}
                aria-label="إغلاق"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label htmlFor="name">الاسم الكامل للموظف <span className="required">*</span></label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="أدخل الاسم الكامل باللغة العربية"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="username">اسم مستخدم الحساب (Username) <span className="required">*</span></label>
                <input
                  type="text"
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="مثال: user_office"
                  style={{ direction: "ltr", textAlign: "right" }}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">كلمة المرور للاتحاد ومحلياً <span className="required">*</span></label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="لا تقل عن 6 خانات"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password_confirmation">تأكيد كلمة المرور <span className="required">*</span></label>
                <input
                  type="password"
                  id="password_confirmation"
                  value={formData.password_confirmation}
                  onChange={(e) => setFormData({...formData, password_confirmation: e.target.value})}
                  placeholder="أعد إدخال كلمة المرور للتأكيد"
                  required
                />
              </div>

              {/* Permissions checkboxes */}
              <div className="form-group" style={{ background: "#f8fafc", padding: "15px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <label style={{ fontWeight: "700", display: "block", marginBottom: "10px", color: "#0f172a" }}>
                  <i className="fa-solid fa-shield-halved" style={{ color: "#3b82f6", marginLeft: "5px" }}></i>
                  الصلاحيات الممنوحة للمستخدم في بوابة الاتحاد (LIFO):
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "500" }}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(1)}
                      onChange={() => handlePermissionChange(1)}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <span>صلاحية عرض البطاقات (الاطلاع على وثائق التأمين الدولي)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "500" }}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(2)}
                      onChange={() => handlePermissionChange(2)}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <span style={{ color: "#166534", fontWeight: "bold" }}>صلاحية إصدار وثيقة (إصدار وثائق التأمين الدولي للسيارات)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "500" }}>
                    <input
                      type="checkbox"
                      checked={formData.permissions.includes(3)}
                      onChange={() => handlePermissionChange(3)}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                    <span>صلاحية إدارة التقارير (الوصول لكشوفات والتقارير واللوحات البيانية)</span>
                  </label>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: "20px" }}>
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setShowForm(false)}
                  disabled={submitting}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="btn-submit" 
                  disabled={submitting}
                >
                  {submitting ? "جاري الحفظ والمزامنة مع الاتحاد..." : "إضافة وحفظ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="modal" onClick={(e) => {
          if (e.target === e.currentTarget && !deleting) setDeleteConfirmation(null);
        }}>
          <div className="modal-content delete-confirm-modal">
            <div className="delete-confirm-icon" style={{ background: "#fee2e2", color: "#ef4444" }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>تأكيد حذف حساب الموظف</h3>
            <p className="delete-confirm-message">
              هل أنت متأكد من حذف حساب الموظف <strong>{deleteConfirmation.name}</strong>؟
              <br />
              <span className="delete-warning" style={{ fontSize: "0.85rem", color: "#ef4444", fontWeight: "600" }}>
                سيتم تعطيل حسابه وحذفه نهائياً من نظامنا ومن نظام الاتحاد (LIFO).
              </span>
            </p>
            <div className="delete-confirm-actions">
              <button 
                className="btn-cancel" 
                onClick={() => setDeleteConfirmation(null)}
                disabled={deleting}
              >
                إلغاء
              </button>
              <button 
                className="btn-delete-confirm" 
                onClick={confirmDelete}
                disabled={deleting}
                style={{ background: "#ef4444" }}
              >
                {deleting ? "جاري الحذف..." : "تأكيد الحذف نهائياً"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="modal" onClick={(e) => {
          if (e.target === e.currentTarget && !updating) setEditingUser(null);
        }}>
          <div className="modal-content user-form-modal" style={{ maxWidth: "650px" }}>
            <div className="modal-header">
              <h3>تعديل بيانات وصلاحيات الموظف: {editingUser.username}</h3>
              <button 
                className="modal-close" 
                onClick={() => setEditingUser(null)}
                aria-label="إغلاق"
                disabled={updating}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="user-form">
              <div className="form-group">
                <label htmlFor="edit_name">الاسم الكامل للموظف <span className="required">*</span></label>
                <input
                  type="text"
                  id="edit_name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  placeholder="أدخل الاسم الكامل باللغة العربية"
                  required
                  disabled={updating}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit_username">اسم مستخدم الحساب (لا يمكن تعديله)</label>
                <input
                  type="text"
                  id="edit_username"
                  value={editingUser.username}
                  style={{ direction: "ltr", textAlign: "right", background: "#f1f5f9", cursor: "not-allowed" }}
                  disabled
                />
                <span style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: "4px", display: "block" }}>
                  لا يمكن تعديل اسم المستخدم بعد الإنشاء لمزامنته مع الاتحاد.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="edit_password">كلمة المرور الجديدة (اختياري)</label>
                <input
                  type="password"
                  id="edit_password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                  placeholder="اتركها فارغة إذا لم تكن تريد تغيير كلمة المرور"
                  disabled={updating}
                />
              </div>

              {editFormData.password && (
                <div className="form-group">
                  <label htmlFor="edit_password_confirmation">تأكيد كلمة المرور الجديدة <span className="required">*</span></label>
                  <input
                    type="password"
                    id="edit_password_confirmation"
                    value={editFormData.password_confirmation}
                    onChange={(e) => setEditFormData({...editFormData, password_confirmation: e.target.value})}
                    placeholder="أعد إدخال كلمة المرور للتأكيد"
                    required
                    disabled={updating}
                  />
                </div>
              )}

              {/* Permissions checkboxes */}
              <div className="form-group" style={{ background: "#f8fafc", padding: "15px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <label style={{ fontWeight: "700", display: "block", marginBottom: "10px", color: "#0f172a" }}>
                  <i className="fa-solid fa-shield-halved" style={{ color: "#3b82f6", marginLeft: "5px" }}></i>
                  الصلاحيات الممنوحة للمستخدم في بوابة الاتحاد (LIFO):
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "500" }}>
                    <input
                      type="checkbox"
                      checked={editFormData.permissions.includes(1)}
                      onChange={() => handleEditPermissionChange(1)}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      disabled={updating}
                    />
                    <span>صلاحية عرض البطاقات (الاطلاع على وثائق التأمين الدولي)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "500" }}>
                    <input
                      type="checkbox"
                      checked={editFormData.permissions.includes(2)}
                      onChange={() => handleEditPermissionChange(2)}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      disabled={updating}
                    />
                    <span style={{ color: "#166534", fontWeight: "bold" }}>صلاحية إصدار وثيقة (إصدار وثائق التأمين الدولي للسيارات)</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: "500" }}>
                    <input
                      type="checkbox"
                      checked={editFormData.permissions.includes(3)}
                      onChange={() => handleEditPermissionChange(3)}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      disabled={updating}
                    />
                    <span>صلاحية إدارة التقارير (الوصول لكشوفات والتقارير واللوحات البيانية)</span>
                  </label>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: "20px" }}>
                <button 
                  type="button" 
                  className="btn-cancel" 
                  onClick={() => setEditingUser(null)}
                  disabled={updating}
                >
                  إلغاء
                </button>
                <button 
                  type="submit" 
                  className="btn-submit" 
                  disabled={updating}
                >
                  {updating ? "جاري الحفظ والتحديث..." : "حفظ التعديلات"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
