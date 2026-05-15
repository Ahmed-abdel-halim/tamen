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
    approved_signature_url?: string;
    certified_stamp_url?: string;
    approved_signature_path?: string;
    certified_stamp_path?: string;
  };
  admin_notes?: string;
  details?: any;
};

function resolvePublicUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/img/')) return `${window.location.origin}${path}`;
  if (path.startsWith('img/')) return `${window.location.origin}/${path}`;
  if (path.startsWith('/storage/')) return `${API_BASE_URL.replace('/api', '')}${path}`;
  if (path.startsWith('storage/')) return `${API_BASE_URL.replace('/api', '')}/${path}`;
  return `${API_BASE_URL.replace('/api', '')}/storage/${path}`;
}

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

  const printResignationLetter = (req: EmployeeRequest) => {
    const w = window.open('', '_blank');
    if (!w) return;
    
    const sigUrl = req.user?.approved_signature_url || req.user?.approved_signature_path;
    const stampUrl = req.user?.certified_stamp_url || req.user?.certified_stamp_path;
    
    const signatureImg = sigUrl ? `<img src="${resolvePublicUrl(sigUrl)}" />` : '<p>لا يوجد توقيع</p>';
    const stampImg = stampUrl ? `<img src="${resolvePublicUrl(stampUrl)}" />` : '<p>لا يوجد ختم</p>';
    const lastDay = req.details?.last_working_day ? new Date(req.details.last_working_day).toLocaleDateString('ar-LY') : 'غير محدد';
    const requestDate = new Date(req.created_at).toLocaleDateString('ar-LY');

    w.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>نموذج استقالة - ${req.user?.name || 'موظف'}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { 
              font-family: 'Cairo', sans-serif; 
              margin: 0; 
              padding: 0;
              color: #1e293b; 
              background: #fff;
              font-size: 15px;
            }
            .page-container {
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              box-sizing: border-box;
            }
            .header { 
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0f172a; 
              padding-bottom: 15px; 
              margin-bottom: 30px; 
            }
            .header .company-logo img {
              height: 70px;
              object-fit: contain;
            }
            .header .header-text {
              text-align: left;
            }
            .header .header-text h1 { 
              font-size: 22px; 
              margin: 0 0 5px 0; 
              color: #0f172a; 
            }
            .header .header-text p {
              margin: 0;
              font-size: 13px;
              color: #475569;
            }
            .content { 
              line-height: 1.8; 
              margin-bottom: 20px; 
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 20px;
              font-size: 15px;
              font-weight: 600;
            }
            .content p { margin: 10px 0; font-size: 16px; text-align: justify; }
            .reason-box {
              padding: 15px; 
              background: #f8fafc; 
              border-radius: 8px; 
              border: 1px solid #cbd5e1;
              font-size: 15px;
              line-height: 1.6;
            }
            .footer { 
              display: flex; 
              justify-content: space-between; 
              margin-top: 40px; 
              align-items: flex-end; 
              page-break-inside: avoid;
            }
            .signature-box { 
              text-align: center; 
              width: 30%;
            }
            .signature-box h4 { 
              margin-bottom: 10px; 
              font-size: 15px; 
              color: #0f172a; 
              border-bottom: 1px solid #cbd5e1; 
              padding-bottom: 5px; 
            }
            .signature-box img { 
              max-width: 130px; 
              max-height: 80px; 
              object-fit: contain; 
            }
            .print-btn { 
              position: fixed; 
              top: 20px; 
              left: 20px; 
              padding: 10px 20px; 
              background: #3b82f6; 
              color: white; 
              border: none; 
              border-radius: 8px; 
              cursor: pointer; 
              font-family: inherit; 
              font-weight: bold;
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
              z-index: 1000;
            }
            @media print { 
              .print-btn { display: none; } 
              body { background: none; }
              .page-container { margin: 0; padding: 0; max-width: 100%; box-shadow: none; height: auto; }
            }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">🖨️ طباعة النموذج</button>
          <div class="page-container">
            <div class="header">
              <div class="company-logo">
                <img src="${window.location.origin}/img/logo.png" alt="شعار الشركة" onerror="this.src='${window.location.origin}/img/official_logo.PNG'" />
              </div>
              <div class="header-text">
                <h1>نموذج استقالة من العمل</h1>
                <p>إدارة الموارد البشرية والشؤون الإدارية</p>
              </div>
            </div>
            
            <div class="meta-info">
              <div><strong>التاريخ:</strong> ${requestDate}</div>
              <div><strong>مقدم الطلب:</strong> ${req.user?.name || 'موظف'}</div>
            </div>

            <div class="content">
              <p><strong>السيد / المدير العام المحترم،</strong></p>
              <p><strong>السادة / إدارة الموارد البشرية،</strong></p>
              <p>تحية طيبة وبعد،،،</p>
              
              <p>أتقدم لسيادتكم بطلب استقالتي من العمل في الشركة، وذلك انطلاقاً من رغبتي الشخصية وبناءً على الأسباب التالية:</p>
              
              <div class="reason-box">
                ${req.reason || 'أسباب شخصية وخاصة'}
              </div>
              
              <p>وأرجو التفضل بقبول استقالتي مع العلم بأن آخر يوم عمل مقترح لي هو <strong>(${lastDay})</strong>، متعهداً بإنهاء وتسليم ما بعهدتي من مهام وأعمال خلال فترة الإشعار المتفق عليها.</p>
              
              <p>ولا يسعني في هذا المقام إلا أن أتقدم بخالص الشكر والتقدير لشركتكم الموقرة ولجميع الزملاء على الدعم المستمر والخبرة القيمة التي اكتسبتها خلال فترة عملي معكم، متمنياً للشركة دوام التقدم والازدهار.</p>
              
              <p style="margin-top: 30px;"><strong>وتفضلوا بقبول فائق الاحترام والتقدير،،،</strong></p>
            </div>

            <div class="footer">
              <div class="signature-box">
                <h4>الختم الإلكتروني</h4>
                ${stampImg}
              </div>
              <div class="signature-box">
                <h4>التوقيع الإلكتروني</h4>
                ${signatureImg}
              </div>
              <div class="signature-box">
                <h4>توقيع مقدم الطلب</h4>
                <p style="font-weight: bold; font-size: 18px; margin-top: 20px;">${req.user?.name || 'موظف'}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    w.document.close();
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
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {req.type === 'termination' && (
                        <button onClick={() => printResignationLetter(req)} className="action-btn" style={{ color: '#3b82f6' }} title="طباعة الاستقالة">
                          <i className="fa-solid fa-print"></i>
                        </button>
                      )}
                      {req.status === 'pending' && (
                          <>
                             <button onClick={() => openStatusModal(req.id, 'approved')} className="action-btn" style={{ color: '#10b981' }} title="موافقة"><i className="fa-solid fa-check"></i></button>
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
