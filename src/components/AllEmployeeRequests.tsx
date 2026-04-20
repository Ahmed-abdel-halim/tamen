import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

type EmployeeRequest = {
  id: number;
  user_id: number;
  type: 'termination' | 'leave_hourly' | 'leave_daily' | 'other';
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  with_salary: boolean;
  created_at: string;
  user?: {
    name: string;
    username: string;
  };
};

export default function AllEmployeeRequests() {
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

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

  const handleUpdateStatus = async (requestId: number, newStatus: 'approved' | 'rejected') => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/employee-requests/${requestId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) throw new Error("فشل تحديث حالة الطلب");
      
      showToast(newStatus === 'approved' ? "تمت الموافقة على الطلب" : "تم رفض الطلب", 'success');
      fetchRequests();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const filteredRequests = requests.filter(r => filter === 'all' || r.status === filter);

  const getTypeName = (type: string) => {
    switch (type) {
      case 'leave_daily': return 'إجازة يومية';
      case 'leave_hourly': return 'إجازة ساعية';
      case 'termination': return 'طلب استقالة/إنهاء';
      default: return 'طلب آخر';
    }
  };

  return (
    <section className="users-management font-cairo">
      <div className="users-breadcrumb">
        <span>الشؤون الإدارية / إدارة الموظفين / جميع الطلبات</span>
      </div>

      <div className="users-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>سجل طلبات الموظفين</h2>
          <div className="filter-group" style={{ display: 'flex', gap: '10px' }}>
             <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value as any)}
              className="users-search-input"
              style={{ width: '150px', padding: '8px' }}
             >
                <option value="all">كل الطلبات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="approved">تمت الموافقة</option>
                <option value="rejected">مرفوضة</option>
             </select>
             <button onClick={fetchRequests} className="action-btn" title="تحديث"><i className="fa-solid fa-rotate"></i></button>
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
                <th>التاريخ</th>
                <th>الحالة</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>جاري التحميل...</td></tr>
              ) : filteredRequests.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px' }}>لا توجد طلبات حالياً</td></tr>
              ) : filteredRequests.map((req) => (
                <tr key={req.id}>
                  <td style={{ fontWeight: 700 }}>{req.user?.name || 'موظف محذوف'}</td>
                  <td><span className="type-badge user">{getTypeName(req.type)}</span></td>
                  <td style={{ fontSize: '0.85rem', maxWidth: '250px' }}>{req.reason}</td>
                  <td style={{ fontSize: '0.8rem' }}>{new Date(req.created_at).toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td>
                    <span className={`status-pill ${req.status}`}>
                      {req.status === 'approved' ? 'تمت الموافقة' : req.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                    </span>
                  </td>
                  <td>
                    {req.status === 'pending' && (
                       <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleUpdateStatus(req.id, 'approved')} className="action-btn" style={{ color: '#10b981' }} title="موافقة"><i className="fa-solid fa-check"></i></button>
                          <button onClick={() => handleUpdateStatus(req.id, 'rejected')} className="action-btn" style={{ color: '#ef4444' }} title="رفض"><i className="fa-solid fa-xmark"></i></button>
                       </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
