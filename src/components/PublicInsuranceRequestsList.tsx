import { useEffect, useState } from "react";
import { showToast } from "./Toast";
import { API_BASE_URL, BACKEND_URL } from "../config/api";

type PublicInsuranceRequest = {
  id: number;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  insurance_type: string;
  request_type: string;
  previous_policy_number: string | null;
  attachments: string[] | null;
  payment_method: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export default function PublicInsuranceRequestsList() {
  const [requests, setRequests] = useState<PublicInsuranceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;
  
  const [selectedRequest, setSelectedRequest] = useState<PublicInsuranceRequest | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { Accept: "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);

      const res = await fetch(`${API_BASE_URL}/public-insurance-requests?${params.toString()}`, { headers });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Error fetching public requests:", error);
      showToast(`حدث خطأ أثناء جلب طلبات التأمين: ${error.message || ""}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: number, status: "approved" | "rejected") => {
    setStatusUpdating(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Accept: "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/public-insurance-requests/${id}/status`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("فشل تعديل حالة الطلب");
      
      showToast("تم تحديث حالة الطلب بنجاح", "success");
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      if (selectedRequest?.id === id) {
        setSelectedRequest(prev => prev ? { ...prev, status } : null);
      }
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء تعديل حالة الطلب", "error");
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const headers: HeadersInit = { Accept: "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/public-insurance-requests/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) throw new Error("فشل حذف الطلب");

      showToast("تم حذف الطلب بنجاح", "success");
      setRequests(prev => prev.filter(r => r.id !== id));
      setDeleteConfirm(null);
      if (selectedRequest?.id === id) {
        setSelectedRequest(null);
      }
    } catch (error: any) {
      showToast(error.message || "حدث خطأ أثناء حذف الطلب", "error");
    } finally {
      setDeleting(false);
    }
  };

  // Local filtering and pagination
  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.includes(searchQuery) ||
      (r.email && r.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.previous_policy_number && r.previous_policy_number.includes(searchQuery)) ||
      r.insurance_type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const totalRequests = filteredRequests.length;
  const totalPages = Math.ceil(totalRequests / perPage) || 1;
  const startIndex = (currentPage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, totalRequests);
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  const translateRequestType = (type: string) => {
    return type === "new" ? "طلب جديد" : "تجديد وثيقة";
  };

  const translatePaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      bank_transfer: "حوالة مصرفية",
      cash: "نقدي (كاش)",
      visa: "بطاقة فيزا / سداد",
      other: "أخرى",
    };
    return methods[method] || method;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span style={{ background: "#fef3c7", color: "#d97706", padding: "4px 8px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>قيد الانتظار</span>;
      case "approved":
        return <span style={{ background: "#d1fae5", color: "#059669", padding: "4px 8px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>تم القبول</span>;
      case "rejected":
        return <span style={{ background: "#fee2e2", color: "#dc2626", padding: "4px 8px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>تم الرفض</span>;
      default:
        return null;
    }
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>إدارة الموقع الإلكتروني / طلبات التأمين العامة</span>
      </div>

      <div className="users-card">
        <div className="users-header" style={{ gap: "15px", flexWrap: "wrap" }}>
          <div className="users-search-bar" style={{ flex: 1, minWidth: "250px" }}>
            <input
              type="text"
              placeholder="بحث باسم العميل، الهاتف، نوع التأمين..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="users-search-input"
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: "10px 15px",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--panel)",
                color: "var(--text)",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              <option value="">كل الحالات</option>
              <option value="pending">قيد الانتظار</option>
              <option value="approved">تم القبول</option>
              <option value="rejected">تم الرفض</option>
            </select>

            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("");
                setCurrentPage(1);
                fetchRequests();
              }}
              style={{
                padding: "10px 15px",
                borderRadius: "10px",
                background: "var(--accent-cyan)",
                color: "white",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <i className="fa-solid fa-rotate-left"></i>
              تحديث
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ textAlign: "center", padding: "30px" }}>جار التحميل...</p>
        ) : totalRequests === 0 ? (
          <div className="empty-state" style={{ textAlign: "center", padding: "40px" }}>
            <i className="fa-solid fa-file-invoice" style={{ fontSize: "3rem", color: "#ccc", marginBottom: "1rem" }}></i>
            <p style={{ color: "var(--text-muted)", fontSize: "1.1rem" }}>لا توجد طلبات تأمين عامة مطابقة لخيارات البحث</p>
          </div>
        ) : (
          <>
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>اسم العميل</th>
                    <th>الهاتف / واتساب</th>
                    <th>نوع التأمين</th>
                    <th>نوع الطلب</th>
                    <th>طريقة الدفع</th>
                    <th>الحالة</th>
                    <th>تاريخ الطلب</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.map((req) => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 600 }}>{req.name}</td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span dir="ltr">{req.phone}</span>
                          {req.whatsapp && (
                            <a
                              href={`https://wa.me/${req.whatsapp.replace(/\+/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: "flex", alignItems: "center", gap: "4px", color: "#10b981", fontSize: "12px", textDecoration: "none" }}
                            >
                              <i className="fab fa-whatsapp"></i>
                              تواصل واتساب
                            </a>
                          )}
                        </div>
                      </td>
                      <td>{req.insurance_type}</td>
                      <td>{translateRequestType(req.request_type)}</td>
                      <td>{translatePaymentMethod(req.payment_method)}</td>
                      <td>{getStatusBadge(req.status)}</td>
                      <td>{new Date(req.created_at).toLocaleDateString("ar-LY")}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view"
                            title="عرض التفاصيل والمرفقات"
                            onClick={() => setSelectedRequest(req)}
                          >
                            <i className="fa-solid fa-eye"></i>
                          </button>
                          {req.status === "pending" && (
                            <>
                              <button
                                className="action-btn edit"
                                title="قبول الطلب"
                                onClick={() => handleStatusUpdate(req.id, "approved")}
                                style={{ background: "#10b981", color: "white" }}
                              >
                                <i className="fa-solid fa-check"></i>
                              </button>
                              <button
                                className="action-btn delete"
                                title="رفض الطلب"
                                onClick={() => handleStatusUpdate(req.id, "rejected")}
                                style={{ background: "#ef4444", color: "white" }}
                              >
                                <i className="fa-solid fa-xmark"></i>
                              </button>
                            </>
                          )}
                          <button
                            className="action-btn delete"
                            title="حذف الطلب"
                            onClick={() => setDeleteConfirm(req.id)}
                            style={{ background: "#7f1d1d", color: "white" }}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination-wrapper" style={{ marginTop: "20px" }}>
                <div className="pagination-info">
                  عرض {startIndex + 1} إلى {endIndex} من {totalRequests} طلب
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn pagination-prev"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                  <span className="pagination-current">{currentPage} / {totalPages}</span>
                  <button
                    className="pagination-btn pagination-next"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <i className="fa-solid fa-chevron-left"></i>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Details View Modal */}
      {selectedRequest && (
        <div className="modal" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }} onClick={() => setSelectedRequest(null)}>
          <div className="modal-content" style={{ background: "var(--panel)", borderRadius: "12px", width: "90%", maxWidth: "700px", maxHeight: "90vh", overflowY: "auto", padding: "20px", color: "var(--text)" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "20px" }}>
              <h3>تفاصيل طلب التأمين المقدم من {selectedRequest.name}</h3>
              <button className="modal-close" onClick={() => setSelectedRequest(null)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "var(--text)" }}>&times;</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
              <div>
                <strong>الاسم كامل:</strong>
                <p>{selectedRequest.name}</p>
              </div>
              <div>
                <strong>رقم الهاتف:</strong>
                <p dir="ltr">{selectedRequest.phone}</p>
              </div>
              <div>
                <strong>رقم الواتساب:</strong>
                <p dir="ltr">{selectedRequest.whatsapp || "-"}</p>
              </div>
              <div>
                <strong>البريد الإلكتروني:</strong>
                <p>{selectedRequest.email || "-"}</p>
              </div>
              <div>
                <strong>نوع التأمين:</strong>
                <p>{selectedRequest.insurance_type}</p>
              </div>
              <div>
                <strong>نوع الطلب:</strong>
                <p>{translateRequestType(selectedRequest.request_type)}</p>
              </div>
              {selectedRequest.request_type === "renew" && (
                <div>
                  <strong>رقم الوثيقة السابقة:</strong>
                  <p>{selectedRequest.previous_policy_number || "-"}</p>
                </div>
              )}
              <div>
                <strong>طريقة الدفع المطلوبة:</strong>
                <p>{translatePaymentMethod(selectedRequest.payment_method)}</p>
              </div>
              <div>
                <strong>حالة الطلب:</strong>
                <p>{getStatusBadge(selectedRequest.status)}</p>
              </div>
              <div>
                <strong>تاريخ ووقت التقديم:</strong>
                <p>{new Date(selectedRequest.created_at).toLocaleString("ar-LY")}</p>
              </div>
            </div>

            {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
              <div style={{ marginTop: "20px", borderTop: "1px solid var(--border)", paddingTop: "15px" }}>
                <h4>المرفقات والمستندات المحملة ({selectedRequest.attachments.length})</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "10px", marginTop: "10px" }}>
                  {selectedRequest.attachments.map((url, idx) => {
                    const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
                    const fileUrl = `${BACKEND_URL}${url}`;
                    return (
                      <div key={idx} style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", display: "flex", flexDirection: "column", height: "140px" }}>
                        {isImg ? (
                          <img src={fileUrl} alt={`مرفق ${idx + 1}`} style={{ width: "100%", height: "100px", objectFit: "cover" }} />
                        ) : (
                          <div style={{ height: "100px", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6", color: "#374151" }}>
                            <i className="fa-solid fa-file-pdf fa-2x"></i>
                          </div>
                        )}
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ background: "#10b981", color: "white", textDecoration: "none", fontSize: "12px", textAlign: "center", padding: "6px 0", marginTop: "auto", display: "block" }}
                        >
                          تحميل / عرض
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: "25px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              {selectedRequest.status === "pending" && (
                <>
                  <button
                    onClick={() => handleStatusUpdate(selectedRequest.id, "approved")}
                    disabled={statusUpdating}
                    style={{ padding: "10px 20px", background: "#10b981", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    قبول الطلب
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(selectedRequest.id, "rejected")}
                    disabled={statusUpdating}
                    style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                  >
                    رفض الطلب
                  </button>
                </>
              )}
              <button
                onClick={() => setSelectedRequest(null)}
                style={{ padding: "10px 20px", background: "var(--border)", color: "var(--text)", border: "none", borderRadius: "8px", cursor: "pointer" }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}>
          <div className="modal-content" style={{ background: "var(--panel)", borderRadius: "12px", width: "90%", maxWidth: "400px", padding: "25px", textAlign: "center" }}>
            <div style={{ color: "#ef4444", fontSize: "3rem", marginBottom: "15px" }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <h3>تأكيد حذف الطلب</h3>
            <p style={{ color: "var(--text-muted)", margin: "10px 0 20px 0" }}>هل أنت متأكد من رغبتك في حذف هذا الطلب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                className="btn-cancel"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                style={{ padding: "10px 20px", borderRadius: "8px", cursor: "pointer" }}
              >
                إلغاء
              </button>
              <button
                className="btn-delete"
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                style={{ padding: "10px 20px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer" }}
              >
                {deleting ? "جاري الحذف..." : "تأكيد الحذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
