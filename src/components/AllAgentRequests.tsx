import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

type AgentRequest = {
  id: number;
  branch_agent_id: number;
  type: 'stock' | 'support' | 'financial' | 'commission' | 'maintenance' | 'marketing' | 'training' | 'legal' | 'limit_increase' | 'other';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  priority: 'normal' | 'urgent';
  subject: string;
  message: string;
  created_at: string;
  admin_notes?: string;
  branch_agent?: {
    agency_name: string;
    agent_name: string;
  };
};

export default function AllAgentRequests() {
  const [requests, setRequests] = useState<AgentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'rejected'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<{id: number, status: string} | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-requests`, {
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

  const openStatusModal = (requestId: number, newStatus: string) => {
    setSelectedRequest({ id: requestId, status: newStatus });
    setAdminNotes('');
    setShowStatusModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedRequest) return;
    setSubmittingStatus(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agent-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: selectedRequest.status, admin_notes: adminNotes }),
      });
      
      if (!res.ok) throw new Error("فشل تحديث حالة الطلب");
      
      showToast("تم تحديث حالة الطلب بنجاح", 'success');
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
    const matchType = typeFilter === 'all' || r.type === typeFilter;
    const matchSearch = searchTerm === '' || 
      r.branch_agent?.agency_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.branch_agent?.agent_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.subject?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchStatus && matchType && matchSearch;
  });

  const getTypeName = (type: string) => {
    const types: any = {
      stock: 'طلب مخزون/مستندات',
      support: 'دعم فني',
      financial: 'تسوية مالية',
      commission: 'طلب عمولة',
      maintenance: 'طلب صيانة',
      marketing: 'دعاية وإعلان',
      training: 'تدريب',
      legal: 'استشارة قانونية',
      limit_increase: 'زيادة سقف الإصدار',
      other: 'أخرى'
    };
    return types[type] || type;
  };

  const getStatusName = (status: string, type?: string) => {
    if (type === 'stock') {
      if (status === 'pending') return 'تحت الطلب';
      if (status === 'completed') return 'نفذت';
    }
    const statuses: any = {
      pending: 'قيد الانتظار',
      processing: 'جاري المعالجة',
      completed: 'تم التنفيذ',
      rejected: 'مرفوض'
    };
    return statuses[status] || status;
  };

  return (
    <section className="users-management font-cairo">
      <div className="users-breadcrumb">
        <span>الشؤون الإدارية / إدارة الوكلاء / جميع طلبات الوكلاء</span>
      </div>

      <div className="users-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>سجل طلبات الوكلاء والفروع</h2>
            <button onClick={fetchRequests} className="action-btn" title="تحديث البيانات"><i className="fa-solid fa-rotate"></i></button>
          </div>
          
          <div className="filters-panel" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '15px', alignItems: 'end' }}>
            <div className="input-group">
              <label style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '5px', display: 'block' }}>البحث السريع</label>
              <input 
                type="text" 
                placeholder="اسم الوكالة، الوكيل، أو الموضوع..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="users-search-input"
                style={{ width: '100%', padding: '10px' }}
              />
            </div>
            
            <div className="input-group">
              <label style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '5px', display: 'block' }}>الحالة</label>
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="users-search-input"
                style={{ width: '100%', padding: '10px' }}
              >
                <option value="all">كل الحالات</option>
                <option value="pending">قيد الانتظار</option>
                <option value="processing">جاري المعالجة</option>
                <option value="completed">تم التنفيذ</option>
                <option value="rejected">مرفوضة</option>
              </select>
            </div>

            <div className="input-group">
              <label style={{ fontSize: '0.8rem', fontWeight: 800, marginBottom: '5px', display: 'block' }}>نوع الطلب</label>
              <select 
                value={typeFilter} 
                onChange={(e) => setTypeFilter(e.target.value)}
                className="users-search-input"
                style={{ width: '100%', padding: '10px' }}
              >
                <option value="all">كل الأنواع</option>
                <option value="stock">طلب عهدة/مستندات</option>
                <option value="support">دعم فني</option>
                <option value="financial">تسوية مالية</option>
                <option value="commission">طلب عمولة</option>
                <option value="maintenance">صيانة</option>
                <option value="marketing">دعاية وإعلان</option>
                <option value="training">تدريب</option>
                <option value="legal">استشارة قانونية</option>
                <option value="limit_increase">زيادة السقف</option>
                <option value="other">أخرى</option>
              </select>
            </div>

            <button 
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setTypeFilter('all'); }} 
              className="btn-outline-sm" 
              style={{ height: '42px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <i className="fa-solid fa-filter-circle-xmark"></i> تفريغ
            </button>
          </div>
        </div>
      </div>

      <div className="users-card">
        <div className="table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>الوكالة / الفرع</th>
                <th>النوع</th>
                <th>الموضوع</th>
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
                  <td style={{ fontWeight: 700 }}>
                    <div>{req.branch_agent?.agency_name}</div>
                    <small style={{ color: 'var(--muted)', fontWeight: 400 }}>{req.branch_agent?.agent_name}</small>
                  </td>
                  <td><span className={`type-badge ${req.priority === 'urgent' ? 'admin' : 'user'}`}>{getTypeName(req.type)}</span></td>
                  <td style={{ fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 700 }}>{req.subject}</div>
                    <div style={{ opacity: 0.8, marginTop: '4px' }}>{req.message}</div>
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
                      {getStatusName(req.status, req.type)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {req.status === 'pending' && (
                        <button onClick={() => openStatusModal(req.id, 'processing')} className="action-btn" style={{ color: '#3b82f6' }} title="جاري المعالجة"><i className="fa-solid fa-clock"></i></button>
                      )}
                      {(req.status === 'pending' || req.status === 'processing') && (
                        <>
                          <button onClick={() => openStatusModal(req.id, 'completed')} className="action-btn" style={{ color: '#10b981' }} title="تم التنفيذ"><i className="fa-solid fa-check"></i></button>
                          <button onClick={() => openStatusModal(req.id, 'rejected')} className="action-btn" style={{ color: '#ef4444' }} title="رفض"><i className="fa-solid fa-xmark"></i></button>
                        </>
                      )}
                    </div>
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
              <h3>معالجة الطلب</h3>
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
