import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

type EmployeeRequest = {
  id: number;
  user_id: number;
  type: 'termination' | 'leave_hourly' | 'leave_daily' | 'salary_advance' | 'allowance' | 'complaint' | 'maintenance' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  with_salary: boolean;
  created_at: string;
  user?: {
    name: string;
    username: string;
  };
  admin_notes?: string;
};

export default function AllEmployeeRequests() {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{id: number, status: 'approved' | 'rejected'} | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/employee-requests`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error("فشل جلب الطلبات");
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const openStatusModal = (requestId: number, newStatus: 'approved' | 'rejected') => {
    setSelectedRequest({ id: requestId, status: newStatus });
    setAdminNotes('');
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedRequest) return;
    setSubmittingStatus(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/employee-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: selectedRequest.status, admin_notes: adminNotes }),
      });
      
      if (!res.ok) throw new Error("فشل تحديث حالة الطلب");
      
      showToast(selectedRequest.status === 'approved' ? "تمت الموافقة على الطلب" : "تم رفض الطلب", 'success');
      setShowStatusModal(false);
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmittingStatus(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchSearch = searchTerm === '' || 
      r.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reason?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const getTypeName = (type: string) => {
    switch (type) {
      case 'leave_daily': return 'إجازة يومية';
      case 'leave_hourly': return 'إجازة ساعية';
      case 'termination': return 'طلب استقالة/إنهاء';
      case 'salary_advance': return 'سلفة مرتب';
      case 'allowance': return 'طلب بدلات';
      case 'complaint': return 'شكوى';
      case 'maintenance': return 'صيانة (مرافق)';
      default: return 'طلب آخر';
    }
  };

  return (
    <section className="users-management font-cairo">
      <div className="users-breadcrumb">
        <span>الشؤون الإدارية / إدارة الموظفين / جميع الطلبات</span>
      </div>

      <div className="users-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>سجل طلبات الموظفين</h2>
            <button onClick={fetchRequests} className="action-btn" title="تحديث"><i className="fa-solid fa-rotate"></i></button>
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
             <input 
              type="text" 
              placeholder="البحث باسم الموظف أو السبب..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="users-search-input"
              style={{ flex: 1, padding: '10px' }}
             />
             <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="users-search-input"
              style={{ width: '180px', padding: '10px' }}
             >
                <option value="all">كل الطلبات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="approved">تمت الموافقة</option>
                <option value="rejected">مرفوضة</option>
             </select>
          </div>
        </div>
      </div>

      <div className="users-card">
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>نوع الطلب</th>
                <th>السبب/التفاصيل</th>
                <th>ملاحظات الإدارة</th>
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>جاري التحميل...</td></tr>
              ) : filteredRequests.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>لا توجد طلبات حالياً</td></tr>
              ) : filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ fontWeight: 700 }}>{req.user?.name || 'موظف محذوف'}</td>
                  <td><span className="type-badge user">{getTypeName(req.type)}</span></td>
                  <td style={{ fontSize: '0.85rem', maxWidth: '250px' }}>
                    {req.reason}
                  </td>
                  <td>
                    {req.admin_notes ? (
                      <div className="admin-note-box">
                        {req.admin_notes}
                      </div>
                    ) : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(req.created_at).toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>
                    <span className={`status-pill ${req.status}`}>
                      {req.status === 'approved' ? 'تمت الموافقة' : req.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                    </span>
                  </td>
                  <td>
                    {req.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                           <button onClick={() => openStatusModal(req.id, 'approved')} className="action-btn" style={{ color: '#10b981' }} title="موافقة"><i className="fa-solid fa-check"></i></button>
                           <button onClick={() => openStatusModal(req.id, 'rejected')} className="action-btn" style={{ color: '#ef4444' }} title="رفض"><i className="fa-solid fa-xmark"></i></button>
                        </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '450px' }}>
            <div className="modal-top">
              <h3>معالجة طلب موظف</h3>
              <button onClick={() => setShowStatusModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="modal-form" style={{ padding: '20px' }}>
              <div className="input-group">
                <label style={{ marginBottom: '10px', display: 'block', fontWeight: 800 }}>ملاحظات الإدارة</label>
                <textarea 
                  placeholder="اكتب ردك أو ملاحظاتك هنا..." 
                  value={adminNotes} 
                  onChange={(e) => setAdminNotes(e.target.value)}
                  style={{ minHeight: '120px', width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                ></textarea>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button 
                  onClick={handleUpdateStatus} 
                  className="btn-submit-full" 
                  disabled={submittingStatus}
                  style={{ flex: 1 }}
                >
                  {submittingStatus ? 'جاري الحفظ...' : 'تأكيد وحفظ'}
                </button>
                <button 
                  onClick={() => setShowStatusModal(false)} 
                  className="btn-outline-sm"
                  style={{ flex: 1, height: 'auto' }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
