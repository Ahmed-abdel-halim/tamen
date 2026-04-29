import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

type AgencyCancellation = {
  id: number;
  branch_agent_id: number;
  reason: string;
  cancellation_date: string;
  custody_handover_details: string;
  manager_signature: string | null;
  finance_signature: string | null;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  created_at: string;
  branch_agent?: {
    agency_name: string;
    agent_name: string;
    agency_number: string;
  };
};

type SearchableSelectProps = {
  options: { value: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
};

function SearchableSelect({ options, value, onChange, placeholder }: SearchableSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="searchable-select-container" style={{ position: 'relative' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '12px',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          background: 'var(--input-bg)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.95rem'
        }}
      >
        <span style={{ color: selectedOption ? 'var(--text)' : 'var(--muted)' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '0.8rem', color: 'var(--muted)' }}></i>
      </div>

      {isOpen && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} 
            onClick={() => { setIsOpen(false); setSearch(""); }}
          ></div>
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            marginTop: '5px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            maxHeight: '250px',
            overflowY: 'auto'
          }} className="custom-scrollbar">
            <div style={{ padding: '10px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 10 }}>
              <input
                type="text"
                placeholder="ابحث باسم الوكالة أو الرقم..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg)', outline: 'none', fontSize: '0.9rem' }}
                autoFocus
              />
            </div>
            <div style={{ padding: '5px' }}>
              {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(""); }}
                  style={{
                    padding: '10px 15px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    margin: '2px 0',
                    fontSize: '0.9rem',
                    background: value === opt.value ? 'var(--hover-bg)' : 'transparent',
                    color: value === opt.value ? 'var(--sidebar)' : 'var(--text)',
                    fontWeight: value === opt.value ? '700' : '400'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--hover-bg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = value === opt.value ? 'var(--hover-bg)' : 'transparent';
                  }}
                >
                  {opt.label}
                </div>
              )) : (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.9rem' }}>لا توجد نتائج بحث</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type BranchAgent = {

  id: number;
  agency_name: string;
  agent_name: string;
  agency_number: string;
};

export default function AgencyCancellations() {
  const [cancellations, setCancellations] = useState<AgencyCancellation[]>([]);
  const [agents, setAgents] = useState<BranchAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCancellation, setSelectedCancellation] = useState<AgencyCancellation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState<{ id: number, status: string }>({ id: 0, status: '' });
  const [statusNotes, setStatusNotes] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAgent = !!currentUser.branch_agent_id;
  
  // Form state




  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [reason, setReason] = useState('');
  const [cancellationDate, setCancellationDate] = useState(new Date().toISOString().split('T')[0]);
  const [custodyDetails, setCustodyDetails] = useState('');
  const [managerSignature, setManagerSignature] = useState<File | null>(null);
  const [financeSignature, setFinanceSignature] = useState<File | null>(null);

  const fetchCancellations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agency-cancellations`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error("فشل جلب طلبات الإلغاء");
      const data = await res.json();
      setCancellations(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/branches-agents`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error("فشل جلب قائمة الوكلاء");
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const deleteCancellation = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا الطلب؟")) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agency-cancellations/${id}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error("فشل حذف الطلب");
      showToast("تم حذف الطلب بنجاح", 'success');
      fetchCancellations();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusToUpdate.status) {
      showToast("يرجى اختيار الحالة", 'error');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/agency-cancellations/${statusToUpdate.id}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          _method: 'PUT',
          status: statusToUpdate.status,
          notes: statusNotes
        }),
      });

      if (!res.ok) throw new Error("فشل تحديث الحالة");
      showToast("تم تحديث الحالة بنجاح", 'success');
      setShowStatusModal(false);
      setStatusNotes('');
      fetchCancellations();
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  useEffect(() => {

    fetchCancellations();
    fetchAgents();
  }, []);

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setSelectedAgentId(isAgent ? currentUser.branch_agent_id.toString() : '');
    setReason('');
    setCancellationDate(new Date().toISOString().split('T')[0]);
    setCustodyDetails('');
    setManagerSignature(null);
    setFinanceSignature(null);
    setShowModal(true);
  };


  const openEditModal = (item: AgencyCancellation) => {
    setIsEditMode(true);
    setEditingId(item.id);
    setSelectedAgentId(item.branch_agent_id.toString());
    setReason(item.reason);
    setCancellationDate(item.cancellation_date);
    setCustodyDetails(item.custody_handover_details || '');
    setManagerSignature(null);
    setFinanceSignature(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId || !reason || !cancellationDate) {
      showToast("يرجى ملء الحقول المطلوبة", 'error');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('branch_agent_id', selectedAgentId);
      formData.append('reason', reason);
      formData.append('cancellation_date', cancellationDate);
      formData.append('custody_handover_details', custodyDetails);
      if (managerSignature) formData.append('manager_signature', managerSignature);
      if (financeSignature) formData.append('finance_signature', financeSignature);
      if (isEditMode) {
        formData.append('_method', 'PUT');
      }

      const token = localStorage.getItem('token');
      const url = isEditMode 
        ? `${API_BASE_URL}/agency-cancellations/${editingId}`
        : `${API_BASE_URL}/agency-cancellations`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "فشل معالجة الطلب");
      }

      showToast(isEditMode ? "تم تحديث الطلب بنجاح" : "تم إرسال طلب الإلغاء بنجاح", 'success');
      setShowModal(false);
      fetchCancellations();

      setSelectedAgentId('');
      setReason('');
      setCustodyDetails('');
      setManagerSignature(null);
      setFinanceSignature(null);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusName = (status: string) => {
    const statuses: any = {
      pending: 'قيد الانتظار',
      approved: 'تمت الموافقة',
      rejected: 'مرفوض'
    };
    return statuses[status] || status;
  };

  return (
    <section className="users-management font-cairo">
      <div className="users-breadcrumb">
        <span>إدارة الفروع والوكلاء / إلغاء الوكالات</span>
      </div>

      <div className="users-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>طلبات إلغاء الوكالات</h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '4px' }}>إدارة ومتابعة طلبات إنهاء التعاقد مع الوكلاء والفروع</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={fetchCancellations} className="action-btn" title="تحديث البيانات"><i className="fa-solid fa-rotate"></i></button>
            <button onClick={openAddModal} className="btn-submit" style={{ height: '42px', padding: '0 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-plus"></i> طلب إلغاء جديد
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
                <th>رقم الوكالة</th>
                <th>سبب الإلغاء</th>
                <th>تاريخ الإلغاء</th>
                <th>الحالة</th>
                <th>ملاحظات الإدارة</th>
                <th>تاريخ الطلب</th>

                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>جاري التحميل...</td></tr>
              ) : cancellations.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px' }}>لا توجد طلبات إلغاء حالياً</td></tr>
              ) : cancellations.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 700 }}>
                    <div style={{ color: 'var(--text)' }}>{item.branch_agent?.agency_name}</div>
                    <small style={{ color: 'var(--muted)', fontWeight: 400 }}>{item.branch_agent?.agent_name}</small>
                  </td>
                  <td style={{ fontWeight: 600 }}>{item.branch_agent?.agency_number || '—'}</td>
                  <td style={{ maxWidth: '200px' }}>
                    <div className="text-truncate" title={item.reason} style={{ fontSize: '0.85rem' }}>{item.reason}</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{new Date(item.cancellation_date).toLocaleDateString('ar-LY')}</td>
                  <td>
                    <span className={`status-pill ${item.status}`}>
                      {getStatusName(item.status)}
                    </span>
                  </td>
                  <td style={{ maxWidth: '150px' }}>
                    <div className="text-truncate" title={item.notes || ''} style={{ fontSize: '0.85rem', color: '#b45309' }}>
                      {item.notes || '—'}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>

                    {new Date(item.created_at).toLocaleDateString('ar-LY')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="action-btn" 
                        style={{ color: 'var(--sidebar)' }} 
                        title="عرض التفاصيل"
                        onClick={() => {
                          setSelectedCancellation(item);
                          setShowDetailsModal(true);
                        }}
                      >
                        <i className="fa-solid fa-eye"></i>
                      </button>
                      {( !isAgent || item.status === 'pending') && (
                        <button 
                          className="action-btn" 
                          style={{ color: '#139625' }} 
                          title="تعديل"
                          onClick={() => openEditModal(item)}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                      )}
                      {!isAgent && (
                        <button 
                          className="action-btn" 
                          style={{ color: '#f59e0b' }} 
                          title="تحديث الحالة"
                          onClick={() => {
                            setStatusToUpdate({ id: item.id, status: item.status });
                            setStatusNotes(item.notes || '');
                            setShowStatusModal(true);
                          }}
                        >
                          <i className="fa-solid fa-file-signature"></i>
                        </button>
                      )}
                      {(!isAgent || item.status === 'pending') && (
                        <button 
                          className="action-btn" 
                          style={{ color: '#ef4444' }} 
                          title="حذف"
                          onClick={() => deleteCancellation(item.id)}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-inner custom-scrollbar" style={{ maxWidth: '650px', borderRadius: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-top" style={{ padding: '20px 25px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 10 }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>{isEditMode ? 'تعديل طلب إلغاء' : 'إضافة طلب إلغاء وكالة'}</h3>
              <button onClick={() => setShowModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form" style={{ padding: '25px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {!isAgent && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>اختر الوكالة <span style={{ color: '#ef4444' }}>*</span></label>
                    <SearchableSelect 
                      options={agents.map(a => ({
                        value: a.id.toString(),
                        label: `${a.agency_name} - ${a.agent_name} (${a.agency_number})`
                      }))}
                      value={selectedAgentId}
                      onChange={(val) => setSelectedAgentId(val)}
                      placeholder="-- ابحث عن الوكالة أو اختر من القائمة --"
                    />
                  </div>
                )}



                <div className="form-group">
                  <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>تاريخ الإلغاء <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="date" 
                    value={cancellationDate} 
                    onChange={(e) => setCancellationDate(e.target.value)}
                    required 
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)' }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>سبب الإلغاء <span style={{ color: '#ef4444' }}>*</span></label>
                  <textarea 
                    placeholder="اكتب سبب إلغاء الوكالة بالتفصيل..." 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)}
                    required
                    style={{ minHeight: '100px', width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)' }}
                  ></textarea>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>تفاصيل تسليم العهدة</label>
                  <textarea 
                    placeholder="اذكر العهد التي تم استلامها (أجهزة، مستندات، أختام...)" 
                    value={custodyDetails} 
                    onChange={(e) => setCustodyDetails(e.target.value)}
                    style={{ minHeight: '100px', width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)' }}
                  ></textarea>
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>توقيع مدير الوكلاء (صورة)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setManagerSignature(e.target.files?.[0] || null)}
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="form-group">
                  <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>توقيع المالية (صورة)</label>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setFinanceSignature(e.target.files?.[0] || null)}
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '35px' }}>
                <button type="submit" className="btn-submit" disabled={submitting} style={{ flex: 2, height: '48px', borderRadius: '12px', fontWeight: 800 }}>
                  {submitting ? 'جاري الحفظ...' : (isEditMode ? 'تحديث البيانات' : 'حفظ وإرسال الطلب')}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline-sm" style={{ flex: 1, height: '48px', borderRadius: '12px' }}>
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {showDetailsModal && selectedCancellation && (
        <div className="modal-overlay">
          <div className="modal-inner custom-scrollbar" style={{ maxWidth: '750px', borderRadius: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-top" style={{ padding: '20px 25px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 10 }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>تفاصيل طلب الإلغاء</h3>
              <button onClick={() => setShowDetailsModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <div style={{ padding: '30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '30px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '5px' }}>الوكالة / الفرع</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedCancellation.branch_agent?.agency_name}</div>
                  <div style={{ color: 'var(--muted)' }}>{selectedCancellation.branch_agent?.agent_name}</div>
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '5px' }}>رقم الوكالة</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{selectedCancellation.branch_agent?.agency_number || '—'}</div>
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '5px' }}>تاريخ الإلغاء</label>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{new Date(selectedCancellation.cancellation_date).toLocaleDateString('ar-LY')}</div>
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '5px' }}>الحالة</label>
                  <span className={`status-pill ${selectedCancellation.status}`}>
                    {getStatusName(selectedCancellation.status)}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '5px' }}>سبب الإلغاء</label>
                <div style={{ padding: '15px', background: 'var(--bg)', borderRadius: '12px', lineHeight: '1.6', fontSize: '0.95rem' }}>
                  {selectedCancellation.reason}
                </div>
              </div>

              {selectedCancellation.custody_handover_details && (
                <div style={{ marginBottom: '30px' }}>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '5px' }}>تفاصيل العهدة</label>
                  <div style={{ padding: '15px', background: 'var(--bg)', borderRadius: '12px', lineHeight: '1.6', fontSize: '0.95rem' }}>
                    {selectedCancellation.custody_handover_details}
                  </div>
                </div>
              )}

              {selectedCancellation.notes && (
                <div style={{ marginBottom: '30px' }}>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '5px' }}>ملاحظات الإدارة</label>
                  <div style={{ padding: '15px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '12px', lineHeight: '1.6', fontSize: '0.95rem', color: '#b45309' }}>
                    {selectedCancellation.notes}
                  </div>
                </div>
              )}


              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '10px' }}>توقيع مدير الوكلاء</label>
                  {selectedCancellation.manager_signature ? (
                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '10px', background: '#fff', textAlign: 'center' }}>
                      <img 
                        src={`${import.meta.env.DEV ? '' : 'https://api.mli.ly'}/storage/${selectedCancellation.manager_signature}`} 
                        alt="توقيع مدير الوكلاء" 
                        style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }}
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/150?text=Signature+Error';
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg)', borderRadius: '12px', color: 'var(--muted)', fontSize: '0.85rem' }}>لا يوجد توقيع</div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '10px' }}>توقيع المالية</label>
                  {selectedCancellation.finance_signature ? (
                    <div style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '10px', background: '#fff', textAlign: 'center' }}>
                      <img 
                        src={`${import.meta.env.DEV ? '' : 'https://api.mli.ly'}/storage/${selectedCancellation.finance_signature}`} 
                        alt="توقيع المالية" 
                        style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }}
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/150?text=Signature+Error';
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', background: 'var(--bg)', borderRadius: '12px', color: 'var(--muted)', fontSize: '0.85rem' }}>لا يوجد توقيع</div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => setShowDetailsModal(false)} className="btn-submit" style={{ padding: '0 40px', height: '48px', borderRadius: '12px' }}>إغلاق</button>
              </div>
            </div>
          </div>
        </div>
      )}


      {showStatusModal && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '500px', borderRadius: '20px' }}>
            <div className="modal-top" style={{ padding: '20px 25px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>تحديث حالة الطلب</h3>
              <button onClick={() => setShowStatusModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <form onSubmit={handleStatusUpdate} className="modal-form" style={{ padding: '25px' }}>
              <div className="form-group">
                <label style={{ fontWeight: 700, marginBottom: '10px', display: 'block' }}>الحالة الجديدة</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => setStatusToUpdate({ ...statusToUpdate, status: 'approved' })}
                    style={{ 
                      padding: '12px', 
                      borderRadius: '10px', 
                      border: '2px solid',
                      borderColor: statusToUpdate.status === 'approved' ? '#139625' : 'var(--border)',
                      background: statusToUpdate.status === 'approved' ? 'rgba(19, 150, 37, 0.1)' : 'var(--input-bg)',
                      color: statusToUpdate.status === 'approved' ? '#139625' : 'var(--text)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fa-solid fa-check-circle" style={{ marginLeft: '8px' }}></i> موافقة
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setStatusToUpdate({ ...statusToUpdate, status: 'rejected' })}
                    style={{ 
                      padding: '12px', 
                      borderRadius: '10px', 
                      border: '2px solid',
                      borderColor: statusToUpdate.status === 'rejected' ? '#ef4444' : 'var(--border)',
                      background: statusToUpdate.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'var(--input-bg)',
                      color: statusToUpdate.status === 'rejected' ? '#ef4444' : 'var(--text)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fa-solid fa-times-circle" style={{ marginLeft: '8px' }}></i> رفض
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '20px' }}>
                <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>ملاحظات الإدارة</label>
                <textarea 
                  placeholder="اكتب ملاحظاتك هنا (سبب الرفض أو تعليمات إضافية)..." 
                  value={statusNotes} 
                  onChange={(e) => setStatusNotes(e.target.value)}
                  style={{ minHeight: '120px', width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                <button type="submit" className="btn-submit" style={{ flex: 2, height: '48px', borderRadius: '12px', fontWeight: 800 }}>
                  حفظ التغييرات
                </button>
                <button type="button" onClick={() => setShowStatusModal(false)} className="btn-outline-sm" style={{ flex: 1, height: '48px', borderRadius: '12px' }}>
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </section>
  );
}
