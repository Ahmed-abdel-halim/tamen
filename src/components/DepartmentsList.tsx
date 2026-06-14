import { useEffect, useState } from "react";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

type Employee = {
  id: number;
  name: string;
  job_title: string;
  department_id: number | null;
};

type Department = {
  id: number;
  name: string;
  description: string | null;
  users: Employee[];
};

export default function DepartmentsList() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState<null | { mode: 'add' | 'edit'; department?: Department }>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<null | Department>(null);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    selectedEmployeeIds: [] as number[],
  });

  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState("");

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/departments`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      showToast("حدث خطأ أثناء جلب الأقسام الإدارية", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/employees/all`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      name: "",
      description: "",
      selectedEmployeeIds: [],
    });
    setSearchEmployeeQuery("");
    setShowModal({ mode: 'add' });
  };

  const handleOpenEditModal = (dept: Department) => {
    const currentEmpIds = dept.users.map(u => u.id);
    setFormData({
      name: dept.name,
      description: dept.description || "",
      selectedEmployeeIds: currentEmpIds,
    });
    setSearchEmployeeQuery("");
    setShowModal({ mode: 'edit', department: dept });
  };

  const handleToggleEmployee = (empId: number) => {
    setFormData(prev => {
      const isSelected = prev.selectedEmployeeIds.includes(empId);
      const updatedIds = isSelected
        ? prev.selectedEmployeeIds.filter(id => id !== empId)
        : [...prev.selectedEmployeeIds, empId];
      return { ...prev, selectedEmployeeIds: updatedIds };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast("يرجى إدخال اسم القسم", "error");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: formData.name,
        description: formData.description,
        user_ids: formData.selectedEmployeeIds,
      };

      const url = showModal?.mode === 'edit'
        ? `${API_BASE_URL}/departments/${showModal.department?.id}`
        : `${API_BASE_URL}/departments`;

      const method = showModal?.mode === 'edit' ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        showToast(
          showModal?.mode === 'edit' ? "تم تعديل القسم بنجاح" : "تم إنشاء القسم بنجاح",
          "success"
        );
        setShowModal(null);
        fetchDepartments();
        fetchEmployees();
      } else {
        const err = await response.json();
        showToast(err.message || "فشلت العملية", "error");
      }
    } catch (error) {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmation) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/departments/${deleteConfirmation.id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (response.ok) {
        showToast("تم حذف القسم بنجاح", "success");
        setDeleteConfirmation(null);
        fetchDepartments();
        fetchEmployees();
      } else {
        showToast("فشل حذف القسم", "error");
      }
    } catch (error) {
      showToast("حدث خطأ في الشبكة", "error");
    } finally {
      setDeleting(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
    (emp.job_title && emp.job_title.toLowerCase().includes(searchEmployeeQuery.toLowerCase()))
  );

  return (
    <div className="premium-hr-container" style={{ padding: "30px", direction: "rtl" }}>
      {/* Top Header */}
      <div className="flex justify-between items-center mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b", fontFamily: "Cairo" }}>
            إدارة أقسام الشركة
          </h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px" }}>
            أنشئ الأقسام الإدارية ووزع الموظفين عليها ليظهروا في صفحات الموقع الخاصة بالأقسام.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="btn-add-employee"
          style={{
            background: "#139625",
            color: "#fff",
            padding: "10px 20px",
            borderRadius: "8px",
            border: "none",
            fontWeight: "600",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(19, 150, 37, 0.15)"
          }}
        >
          <i className="fas fa-plus"></i>
          <span>إضافة قسم جديد</span>
        </button>
      </div>

      {/* Departments Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", color: "#64748b" }}>
          <i className="fas fa-spinner fa-spin fa-3x" style={{ color: "#014cb1" }}></i>
          <p style={{ marginTop: "15px" }}>جاري تحميل الأقسام...</p>
        </div>
      ) : departments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
          <i className="fas fa-sitemap fa-3x" style={{ color: "#cbd5e1", marginBottom: "15px" }}></i>
          <p style={{ color: "#64748b" }}>لا توجد أقسام مضافة حالياً. ابدأ بإضافة أول قسم للشركة.</p>
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "16px 20px", fontWeight: "700", color: "#475569" }}>اسم القسم</th>
                <th style={{ padding: "16px 20px", fontWeight: "700", color: "#475569" }}>الوصف</th>
                <th style={{ padding: "16px 20px", fontWeight: "700", color: "#475569" }}>الموظفين المنتسبين</th>
                <th style={{ padding: "16px 20px", fontWeight: "700", color: "#475569", width: "160px" }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((dept) => (
                <tr key={dept.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseOver={e => e.currentTarget.style.background = "#fafafa"} onMouseOut={e => e.currentTarget.style.background = "none"}>
                  <td style={{ padding: "16px 20px", fontWeight: "600", color: "#0f172a" }}>{dept.name}</td>
                  <td style={{ padding: "16px 20px", color: "#475569", fontSize: "14px" }}>{dept.description || "—"}</td>
                  <td style={{ padding: "16px 20px" }}>
                    {dept.users.length === 0 ? (
                      <span style={{ color: "#94a3b8", fontSize: "13px" }}>لا يوجد موظفون</span>
                    ) : (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {dept.users.map((u) => (
                          <span key={u.id} style={{ background: "#eff6ff", color: "#1e40af", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "500", border: "1px solid #dbeafe" }}>
                            {u.name} ({u.job_title || "موظف"})
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => handleOpenEditModal(dept)}
                        style={{ background: "none", border: "none", color: "#014cb1", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}
                      >
                        تعديل
                      </button>
                      <button
                        onClick={() => setDeleteConfirmation(dept)}
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1100,
          padding: "20px"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "600px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            maxHeight: "90vh"
          }}>
            {/* Modal Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a" }}>
                {showModal.mode === 'edit' ? "تعديل القسم الإداري" : "إنشاء قسم إداري جديد"}
              </h3>
              <button onClick={() => setShowModal(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "20px" }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="form-group">
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569", fontSize: "14px" }}>
                  اسم القسم <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", outline: "none", fontFamily: "Cairo" }}
                  placeholder="مثال: مجلس الإدارة، لجنة المراقبة..."
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#475569", fontSize: "14px" }}>الوصف (اختياري)</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", outline: "none", minHeight: "80px", resize: "vertical", fontFamily: "Cairo" }}
                  placeholder="أدخل وصفاً بسيطاً لمهام القسم..."
                />
              </div>

              <div className="form-group" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontWeight: "600", color: "#475569", fontSize: "14px" }}>اختر الموظفين للقسم</label>
                
                {/* Search Employees */}
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    value={searchEmployeeQuery}
                    onChange={e => setSearchEmployeeQuery(e.target.value)}
                    placeholder="ابحث عن موظف بالاسم أو المسمى الوظيفي..."
                    style={{ width: "100%", padding: "8px 12px 8px 36px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "13px", outline: "none", fontFamily: "Cairo" }}
                  />
                  <i className="fas fa-search" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}></i>
                </div>

                {/* Employees Checklist */}
                <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", maxHeight: "200px", overflowY: "auto", padding: "10px" }}>
                  {filteredEmployees.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8", fontSize: "13px" }}>
                      لا يوجد موظفون مطابقون للبحث.
                    </div>
                  ) : (
                    filteredEmployees.map(emp => {
                      const isChecked = formData.selectedEmployeeIds.includes(emp.id);
                      return (
                        <div
                          key={emp.id}
                          onClick={() => handleToggleEmployee(emp.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "8px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            background: isChecked ? "#f0f9ff" : "transparent",
                            transition: "background 0.2s"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by div onClick
                            style={{ width: "16px", height: "16px", cursor: "pointer" }}
                          />
                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontWeight: "600", fontSize: "13px", color: "#1e293b", display: "block" }}>{emp.name}</span>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>{emp.job_title || "موظف"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(null)}
                  style={{ background: "#e2e8f0", color: "#475569", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer", fontFamily: "Cairo" }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ background: "#139625", color: "#fff", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "Cairo" }}
                >
                  {submitting && <i className="fas fa-spinner fa-spin"></i>}
                  <span>حفظ التعديلات</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1100,
          padding: "20px"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "400px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            padding: "24px",
            textAlign: "center"
          }}>
            <i className="fas fa-exclamation-triangle fa-3x" style={{ color: "#ef4444", marginBottom: "16px" }}></i>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#0f172a", marginBottom: "8px" }}>تأكيد حذف القسم</h3>
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px" }}>
              هل أنت متأكد من حذف القسم <strong>"{deleteConfirmation.name}"</strong>؟ الموظفون بداخل هذا القسم سيعودون تلقائياً إلى فريق العمل العام.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                disabled={deleting}
                onClick={() => setDeleteConfirmation(null)}
                style={{ background: "#e2e8f0", color: "#475569", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer", fontFamily: "Cairo" }}
              >
                إلغاء
              </button>
              <button
                disabled={deleting}
                onClick={handleDelete}
                style={{ background: "#ef4444", color: "#fff", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "Cairo" }}
              >
                {deleting && <i className="fas fa-spinner fa-spin"></i>}
                <span>حذف القسم</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
