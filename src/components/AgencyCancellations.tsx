import { useEffect, useState, useRef } from 'react';
import { API_BASE_URL, BACKEND_URL } from '../config/api';
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
    id?: number;
    agency_name: string;
    agent_name: string;
    agency_number: string;
    city?: string;
    phone?: string;
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
  city?: string;
  status?: string;
};

interface CustodyItem {
  type: string;
  desc: string;
  value: string;
  status: string;
}

export default function AgencyCancellations() {
  const [cancellations, setCancellations] = useState<AgencyCancellation[]>([]);
  const [agents, setAgents] = useState<BranchAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCancellation, setSelectedCancellation] = useState<AgencyCancellation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [cancellationToPrint, setCancellationToPrint] = useState<AgencyCancellation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState<{ id: number, status: string }>({ id: 0, status: '' });
  const [statusNotes, setStatusNotes] = useState('');

  // Agent live obligations check state
  const [checkingAgent, setCheckingAgent] = useState(false);
  const [agentObligations, setAgentObligations] = useState<{
    fixedCustodies: any[];
    financialDebts: number;
    hasPendingItems: boolean;
  } | null>(null);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAgent = !!currentUser.branch_agent_id;
  
  // Form state
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [reason, setReason] = useState('');
  const [cancellationDate, setCancellationDate] = useState(new Date().toISOString().split('T')[0]);
  const [custodyDetails, setCustodyDetails] = useState('');
  const [managerSignature, setManagerSignature] = useState<File | null>(null);
  const [financeSignature, setFinanceSignature] = useState<File | null>(null);

  // Structured Custodies & Settlement items
  const [custodiesList, setCustodiesList] = useState<CustodyItem[]>([
    { type: 'ثابتة', desc: '', value: '', status: 'مسلمة بالكامل' },
    { type: 'مالية', desc: '', value: '', status: 'مسدد بالكامل' },
    { type: 'وثائق ومستندات', desc: '', value: '', status: 'مسلمة بالكامل' },
    { type: 'أخرى', desc: '', value: '', status: 'مسلمة' }
  ]);
  const [totalRemainingLiabilities, setTotalRemainingLiabilities] = useState('');
  const [settlementResult, setSettlementResult] = useState<'cleared' | 'pending_settlement'>('cleared');

  const printRef = useRef<HTMLDivElement>(null);

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

  // Check agent active obligations (custodies, debts) when selected
  const checkAgentObligations = async (agentId: string) => {
    if (!agentId) {
      setAgentObligations(null);
      return;
    }
    setCheckingAgent(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      const [custodyRes, statsRes] = await Promise.allSettled([
        fetch(`${API_BASE_URL}/inventory/custody?recipient_id=${agentId}&recipient_type=agent`, { headers }),
        fetch(`${API_BASE_URL}/branches-agents/${agentId}/financial-stats`, { headers })
      ]);

      let fixedCustodies: any[] = [];
      let financialDebts = 0;

      if (custodyRes.status === 'fulfilled' && custodyRes.value.ok) {
        const cData = await custodyRes.value.json();
        if (Array.isArray(cData)) {
          fixedCustodies = cData.filter((c: any) => c.status === 'active');
        }
      }

      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const sData = await statsRes.value.json();
        if (sData && (sData.outstanding_debt || sData.remaining_balance || sData.total_debt)) {
          financialDebts = Number(sData.outstanding_debt || sData.remaining_balance || sData.total_debt || 0);
        }
      }

      const hasPending = fixedCustodies.length > 0 || financialDebts > 0;
      setAgentObligations({
        fixedCustodies,
        financialDebts,
        hasPendingItems: hasPending
      });

      // Automatically update default settlement fields based on findings
      setCustodiesList([
        { 
          type: 'ثابتة', 
          desc: fixedCustodies.length > 0 ? fixedCustodies.map(c => `${c.item?.name || c.description || 'صنف'} (${c.quantity})`).join(', ') : 'لا توجد أصول ثابتة معلقة',
          value: fixedCustodies.length > 0 ? `${fixedCustodies.reduce((acc, c) => acc + (c.quantity || 1), 0)} قطعة` : '0',
          status: fixedCustodies.length > 0 ? 'متبقي تسليم العهدة' : 'مسلمة بالكامل'
        },
        { 
          type: 'مالية', 
          desc: financialDebts > 0 ? `رصيد مالي / ديون مستحقة غير مسددة` : 'تم تسوية الحساب المالي بالكامل',
          value: financialDebts > 0 ? `${financialDebts.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل` : '0 د.ل',
          status: financialDebts > 0 ? 'متبقي رصيد غير مسدد' : 'مسدد بالكامل'
        },
        { 
          type: 'وثائق ومستندات', 
          desc: 'دفاتر وثائق التأمين ونماذج الإصدار',
          value: '—',
          status: 'مسلمة بالكامل'
        },
        { 
          type: 'أخرى', 
          desc: 'أختام ومطبوعات وبطاقات الشركة',
          value: '—',
          status: 'مسلمة'
        }
      ]);

      if (hasPending) {
        setSettlementResult('pending_settlement');
        setTotalRemainingLiabilities(financialDebts > 0 ? `${financialDebts}` : '');
      } else {
        setSettlementResult('cleared');
        setTotalRemainingLiabilities('0');
      }

    } catch (e) {
      console.error("Error checking agent obligations", e);
    } finally {
      setCheckingAgent(false);
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
    const defaultAgentId = isAgent ? currentUser.branch_agent_id.toString() : '';
    setSelectedAgentId(defaultAgentId);
    setReason('');
    setCancellationDate(new Date().toISOString().split('T')[0]);
    setCustodyDetails('');
    setManagerSignature(null);
    setFinanceSignature(null);
    setAgentObligations(null);
    setSettlementResult('cleared');
    setTotalRemainingLiabilities('0');
    if (defaultAgentId) {
      checkAgentObligations(defaultAgentId);
    }
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
    
    // Parse custody details if structured JSON
    try {
      if (item.custody_handover_details && item.custody_handover_details.startsWith('{')) {
        const parsed = JSON.parse(item.custody_handover_details);
        if (parsed.items && Array.isArray(parsed.items)) {
          setCustodiesList(parsed.items);
        }
        if (parsed.settlementResult) {
          setSettlementResult(parsed.settlementResult);
        }
        if (parsed.totalRemainingLiabilities) {
          setTotalRemainingLiabilities(parsed.totalRemainingLiabilities);
        }
      }
    } catch (e) {
      // plain text fallback
    }

    setShowModal(true);
  };

  const handlePrintDocument = (item: AgencyCancellation) => {
    setCancellationToPrint(item);
    setShowPrintModal(true);
  };

  const executeBrowserPrint = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgentId || !reason || !cancellationDate) {
      showToast("يرجى ملء الحقول المطلوبة", 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Build structured custody details
      const structuredData = {
        summary: custodyDetails,
        items: custodiesList,
        settlementResult: settlementResult,
        totalRemainingLiabilities: totalRemainingLiabilities,
        generatedAt: new Date().toISOString()
      };

      const formData = new FormData();
      formData.append('branch_agent_id', selectedAgentId);
      formData.append('reason', reason);
      formData.append('cancellation_date', cancellationDate);
      formData.append('custody_handover_details', JSON.stringify(structuredData));
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
      approved: 'تمت الموافقة والإلغاء',
      rejected: 'مرفوض'
    };
    return statuses[status] || status;
  };

  const parseCustodyData = (detailsStr?: string) => {
    if (!detailsStr) return null;
    try {
      if (detailsStr.startsWith('{')) {
        return JSON.parse(detailsStr);
      }
    } catch (e) {}
    return { summary: detailsStr, items: [], settlementResult: 'cleared', totalRemainingLiabilities: '0' };
  };

  return (
    <section className="users-management font-cairo">
      <div className="users-breadcrumb">
        <span>إدارة الفروع والوكلاء / إلغاء الوكالات وإخلاء الطرف</span>
      </div>

      <div className="users-card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
              <i className="fa-solid fa-file-contract" style={{ color: '#ef4444', marginLeft: '8px' }}></i>
              طلبات إلغاء الوكالات وإخلاء الطرف
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              إدارة طلبات إنهاء التعاقد، مراجعة العهد والالتزامات، وإصدار نماذج براءة الذمة الرسمية
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={fetchCancellations} className="action-btn" title="تحديث البيانات"><i className="fa-solid fa-rotate"></i></button>
            <button onClick={openAddModal} className="btn-submit" style={{ height: '42px', padding: '0 20px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              <i className="fa-solid fa-plus"></i> طلب إلغاء وكالة وتسوية عهد
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
                <th>حالة الطلب</th>
                <th>براءة الذمة / التسوية</th>
                <th>تاريخ الطلب</th>
                <th>الإجراءات والطباعة</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>جاري التحميل...</td></tr>
              ) : cancellations.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>لا توجد طلبات إلغاء حالياً</td></tr>
              ) : cancellations.map((item) => {
                const parsedCustody = parseCustodyData(item.custody_handover_details);
                const isCleared = parsedCustody?.settlementResult === 'cleared' || !parsedCustody?.totalRemainingLiabilities || parsedCustody?.totalRemainingLiabilities === '0';
                
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 700 }}>
                      <div style={{ color: 'var(--text)' }}>{item.branch_agent?.agency_name || '—'}</div>
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
                    <td>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '5px', 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.8rem', 
                        fontWeight: 700,
                        background: isCleared ? '#dcfce7' : '#fef3c7',
                        color: isCleared ? '#15803d' : '#92400e',
                        border: `1px solid ${isCleared ? '#86efac' : '#fcd34d'}`
                      }}>
                        <i className={`fa-solid ${isCleared ? 'fa-check' : 'fa-clock'}`}></i>
                        {isCleared ? 'إخلاء طرف معتمد' : 'متبقي تسوية عهد'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {new Date(item.created_at).toLocaleDateString('ar-LY')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {/* Print clearance form button */}
                        <button 
                          className="action-btn" 
                          style={{ color: '#0284c7', background: '#e0f2fe' }} 
                          title="طباعة نموذج إلغاء وكالة وإخلاء طرف"
                          onClick={() => handlePrintDocument(item)}
                        >
                          <i className="fa-solid fa-print"></i>
                        </button>
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
                        {(!isAgent || item.status === 'pending') && (
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== MODAL: ADD / EDIT CANCELLATION REQUEST ===== */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-inner custom-scrollbar" style={{ maxWidth: '800px', borderRadius: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-top" style={{ padding: '20px 25px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 10 }}>
              <h3 style={{ margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-file-signature" style={{ color: '#ef4444' }}></i>
                {isEditMode ? 'تعديل طلب إلغاء وكالة وتسوية عهد' : 'إضافة طلب إلغاء وكالة وتسوية عهد وإخلاء طرف'}
              </h3>
              <button onClick={() => setShowModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form" style={{ padding: '25px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {!isAgent && (
                  <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>
                      اختر الوكالة / الفرع المراد إلغاؤه <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <SearchableSelect 
                      options={agents
                        .filter(a => a.status === 'نشط' || a.id.toString() === selectedAgentId)
                        .map(a => ({
                          value: a.id.toString(),
                          label: `${a.agency_name} - ${a.agent_name} (رقم: ${a.agency_number || '—'})`
                        }))}
                      value={selectedAgentId}
                      onChange={(val) => {
                        setSelectedAgentId(val);
                        checkAgentObligations(val);
                      }}
                      placeholder="-- ابحث عن الوكالة أو اختر من القائمة --"
                    />
                  </div>
                )}

                {/* Live Obligations / Debts Reminder Alert */}
                {checkingAgent && (
                  <div style={{ gridColumn: 'span 2', padding: '12px', background: '#f8fafc', borderRadius: '10px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '6px' }}></i> جاري فحص سجل العهد والالتزامات المالية للوكيل...
                  </div>
                )}

                {agentObligations && (
                  <div style={{ 
                    gridColumn: 'span 2', 
                    padding: '16px 20px', 
                    borderRadius: '12px', 
                    background: agentObligations.hasPendingItems ? '#fffbeb' : '#f0fdf4',
                    border: `1px solid ${agentObligations.hasPendingItems ? '#fcd34d' : '#86efac'}`,
                    marginBottom: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                      <i className={`fa-solid ${agentObligations.hasPendingItems ? 'fa-triangle-exclamation' : 'fa-circle-check'}`} style={{ 
                        fontSize: '22px', 
                        color: agentObligations.hasPendingItems ? '#d97706' : '#16a34a',
                        marginTop: '2px'
                      }}></i>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 800, color: agentObligations.hasPendingItems ? '#92400e' : '#15803d' }}>
                          {agentObligations.hasPendingItems 
                            ? '⚠️ تنبيه: توجد عهد أو التزامات مالية مسجلة للوكيل في المنظومة' 
                            : '✅ تم التحقق: لا توجد عهد أو ديون مالية معلقة مسجلة للوكيل'}
                        </h4>
                        <div style={{ fontSize: '0.85rem', lineHeight: '1.6', color: agentObligations.hasPendingItems ? '#78350f' : '#166534' }}>
                          {agentObligations.fixedCustodies.length > 0 && (
                            <div>• <strong>العهد الثابتة المسجلة:</strong> {agentObligations.fixedCustodies.length} أصناف عهدة مع الوكيل ({agentObligations.fixedCustodies.map(c => c.item?.name || c.description).join('، ')})</div>
                          )}
                          {agentObligations.financialDebts > 0 && (
                            <div>• <strong>الالتزامات / الديون المالية:</strong> {agentObligations.financialDebts.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل متبقية على الوكيل</div>
                          )}
                          {agentObligations.hasPendingItems && (
                            <div style={{ marginTop: '6px', fontWeight: 600, color: '#b45309' }}>
                              💡 يمكنك المتابعة بتسجيل طلب الإلغاء وتحديد حالة التسوية وبراءة الذمة أدناه.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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

                <div className="form-group">
                  <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>سبب الإلغاء <span style={{ color: '#ef4444' }}>*</span></label>
                  <input 
                    type="text" 
                    placeholder="مثال: انتهاء مدة العقد / رغبة الوكيل / قرار إداري..." 
                    value={reason} 
                    onChange={(e) => setReason(e.target.value)}
                    required 
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)' }}
                  />
                </div>

                {/* Settlement & Custodies Table (بيان العهد والالتزامات) */}
                <div style={{ gridColumn: 'span 2', marginTop: '10px', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', background: 'var(--bg)' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="fa-solid fa-list-check" style={{ color: '#3b82f6' }}></i>
                    بيان العهد والالتزامات (تسوية إخلاء الطرف)
                  </h4>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '8px', textAlign: 'center', width: '30px' }}>م</th>
                          <th style={{ padding: '8px', textAlign: 'right', width: '120px' }}>نوع العهدة</th>
                          <th style={{ padding: '8px', textAlign: 'right' }}>البيان والتفاصيل</th>
                          <th style={{ padding: '8px', textAlign: 'right', width: '120px' }}>القيمة / الرصيد</th>
                          <th style={{ padding: '8px', textAlign: 'right', width: '140px' }}>الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {custodiesList.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{idx + 1}</td>
                            <td style={{ padding: '8px', fontWeight: 700, color: 'var(--text)' }}>{item.type}</td>
                            <td style={{ padding: '8px' }}>
                              <input 
                                type="text"
                                value={item.desc}
                                onChange={(e) => {
                                  const updated = [...custodiesList];
                                  updated[idx].desc = e.target.value;
                                  setCustodiesList(updated);
                                }}
                                placeholder="اكتب البيان..."
                                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--panel)', fontSize: '0.85rem' }}
                              />
                            </td>
                            <td style={{ padding: '8px' }}>
                              <input 
                                type="text"
                                value={item.value}
                                onChange={(e) => {
                                  const updated = [...custodiesList];
                                  updated[idx].value = e.target.value;
                                  setCustodiesList(updated);
                                }}
                                placeholder="القيمة..."
                                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--panel)', fontSize: '0.85rem' }}
                              />
                            </td>
                            <td style={{ padding: '8px' }}>
                              <select
                                value={item.status}
                                onChange={(e) => {
                                  const updated = [...custodiesList];
                                  updated[idx].status = e.target.value;
                                  setCustodiesList(updated);
                                }}
                                style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--panel)', fontSize: '0.8rem' }}
                              >
                                <option value="مسلمة بالكامل">مسلمة / مسددة بالكامل</option>
                                <option value="متبقي التزام">متبقي التزام / عهدة</option>
                                <option value="لا توجد">لا توجد عهد</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>إجمالي العهد أو الالتزامات المتبقية (د.ل):</label>
                      <input 
                        type="text" 
                        value={totalRemainingLiabilities}
                        onChange={(e) => setTotalRemainingLiabilities(e.target.value)}
                        placeholder="0 د.ل أو اكتب المبلغ المتبقي..."
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--panel)' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', display: 'block' }}>نتيجة التسوية وإخلاء الطرف:</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input 
                            type="radio" 
                            name="settlementResult" 
                            value="cleared"
                            checked={settlementResult === 'cleared'}
                            onChange={() => setSettlementResult('cleared')}
                          />
                          <span>☑ لا توجد عهد أو التزامات متبقية – <strong>يُعتمد إخلاء الطرف</strong></span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input 
                            type="radio" 
                            name="settlementResult" 
                            value="pending_settlement"
                            checked={settlementResult === 'pending_settlement'}
                            onChange={() => setSettlementResult('pending_settlement')}
                          />
                          <span>☒ توجد عهد أو التزامات متبقية – <strong>لا تُمنح براءة الذمة إلا بعد التسوية</strong></span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>ملاحظات وتفاصيل إضافية عن التسوية</label>
                  <textarea 
                    placeholder="أي ملاحظات إضافية حول التسليم والأختام والمستندات..." 
                    value={custodyDetails} 
                    onChange={(e) => setCustodyDetails(e.target.value)}
                    style={{ minHeight: '70px', width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)' }}
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

              <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
                <button type="submit" className="btn-submit" disabled={submitting} style={{ flex: 2, height: '48px', borderRadius: '12px', fontWeight: 800 }}>
                  {submitting ? 'جاري الحفظ...' : (isEditMode ? 'تحديث بيانات الإلغاء والتسوية' : 'حفظ وإصدار نموذج الإلغاء')}
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline-sm" style={{ flex: 1, height: '48px', borderRadius: '12px' }}>
                  إلغاء
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL: VIEW DETAILS ===== */}
      {showDetailsModal && selectedCancellation && (
        <div className="modal-overlay">
          <div className="modal-inner custom-scrollbar" style={{ maxWidth: '750px', borderRadius: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-top" style={{ padding: '20px 25px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--panel)', zIndex: 10 }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>تفاصيل طلب إلغاء الوكالة وإخلاء الطرف</h3>
              <button onClick={() => setShowDetailsModal(false)} className="close-btn"><i className="fa-solid fa-times"></i></button>
            </div>
            <div style={{ padding: '30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
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

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '5px' }}>سبب الإلغاء</label>
                <div style={{ padding: '15px', background: 'var(--bg)', borderRadius: '12px', lineHeight: '1.6', fontSize: '0.95rem' }}>
                  {selectedCancellation.reason}
                </div>
              </div>

              {/* Settlement table breakdown if available */}
              {(() => {
                const parsed = parseCustodyData(selectedCancellation.custody_handover_details);
                return (
                  <div style={{ marginBottom: '25px', padding: '15px', background: 'var(--bg)', borderRadius: '12px' }}>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '10px', fontWeight: 700 }}>بيان العهد والتسوية</label>
                    {parsed?.items && parsed.items.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '12px' }}>
                        <thead>
                          <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '6px', textAlign: 'right' }}>نوع العهدة</th>
                            <th style={{ padding: '6px', textAlign: 'right' }}>البيان</th>
                            <th style={{ padding: '6px', textAlign: 'right' }}>القيمة</th>
                            <th style={{ padding: '6px', textAlign: 'right' }}>الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsed.items.map((it: CustodyItem, i: number) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '6px', fontWeight: 700 }}>{it.type}</td>
                              <td style={{ padding: '6px' }}>{it.desc || '—'}</td>
                              <td style={{ padding: '6px' }}>{it.value || '—'}</td>
                              <td style={{ padding: '6px' }}>{it.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>{parsed?.summary || selectedCancellation.custody_handover_details || 'لا توجد تفاصيل إضافية'}</p>
                    )}

                    <div style={{ marginTop: '10px', padding: '10px', background: 'var(--panel)', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span><strong>نتيجة التسوية:</strong> {parsed?.settlementResult === 'cleared' ? '☑ يُعتمد إخلاء الطرف' : '☒ لا تمنح براءة الذمة إلا بعد التسوية'}</span>
                      {parsed?.totalRemainingLiabilities && (
                        <span><strong>الالتزامات المتبقية:</strong> {parsed.totalRemainingLiabilities} د.ل</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '30px' }}>
                <button 
                  onClick={() => {
                    setShowDetailsModal(false);
                    handlePrintDocument(selectedCancellation);
                  }} 
                  className="btn-submit" 
                  style={{ padding: '0 30px', height: '48px', borderRadius: '12px', background: '#0284c7' }}
                >
                  <i className="fa-solid fa-print" style={{ marginLeft: '8px' }}></i> طباعة نموذج إخلاء الطرف
                </button>
                <button onClick={() => setShowDetailsModal(false)} className="btn-outline-sm" style={{ padding: '0 30px', height: '48px', borderRadius: '12px' }}>
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL: OFFICIAL PRINTABLE CLEARANCE CERTIFICATE ===== */}
      {showPrintModal && cancellationToPrint && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.7)', zIndex: 1000 }}>
          <div className="modal-inner custom-scrollbar" style={{ maxWidth: '850px', width: '95%', borderRadius: '20px', maxHeight: '95vh', overflowY: 'auto', background: '#fff', color: '#000' }}>
            
            {/* Top action bar - Hidden during print */}
            <div className="no-print" style={{ padding: '15px 25px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
              <h4 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>
                <i className="fa-solid fa-print" style={{ marginLeft: '8px', color: '#0284c7' }}></i>
                معاينة وطباعة نموذج إلغاء الوكالة وإخلاء الطرف
              </h4>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={executeBrowserPrint} 
                  style={{ 
                    padding: '8px 20px', 
                    background: '#0284c7', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontWeight: 700, 
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <i className="fa-solid fa-print"></i> طباعة الآن
                </button>
                <button 
                  onClick={() => setShowPrintModal(false)} 
                  style={{ 
                    padding: '8px 16px', 
                    background: '#f1f5f9', 
                    color: '#475569', 
                    border: '1px solid #cbd5e1', 
                    borderRadius: '8px', 
                    fontWeight: 600, 
                    cursor: 'pointer' 
                  }}
                >
                  إغلاق
                </button>
              </div>
            </div>

            {/* Official Printable Document Content */}
            <div ref={printRef} className="printable-clearance-document" style={{ padding: '40px', fontFamily: "'Cairo', 'Segoe UI', Tahoma, sans-serif", direction: 'rtl', color: '#000', lineHeight: '1.6' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px double #1e3a8a', paddingBottom: '16px', marginBottom: '25px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#1e3a8a' }}>شركة المدار الليبي للتأمين</h2>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Al Madar Libyan Insurance Company</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>إدارة الفروع والوكلاء والشؤون القانونية</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <img 
                    src="/img/logo3.png" 
                    alt="شعار الشركة" 
                    style={{ height: '70px', width: 'auto' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
                <div style={{ textAlign: 'left', fontSize: '12px', color: '#334155' }}>
                  <div><strong>الرقم المرجعي:</strong> CAN-{cancellationToPrint.id.toString().padStart(4, '0')}</div>
                  <div><strong>تاريخ الإصدار:</strong> {new Date().toLocaleDateString('ar-LY')}</div>
                  <div><strong>حالة الاعتماد:</strong> {getStatusName(cancellationToPrint.status)}</div>
                </div>
              </div>

              {/* Title Box */}
              <div style={{ textAlign: 'center', margin: '20px 0', padding: '10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#1e293b', letterSpacing: '0.5px' }}>
                  نموذج إلغاء وكالة وتسوية عهد وإخلاء طرف
                </h1>
              </div>

              {/* Agency Info Block */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px', fontSize: '13px' }}>
                <div>
                  <strong>رقم الوكالة:</strong> {cancellationToPrint.branch_agent?.agency_number || '—'}
                </div>
                <div>
                  <strong>التاريخ:</strong> {new Date(cancellationToPrint.cancellation_date).toLocaleDateString('ar-LY')}م
                </div>
                <div>
                  <strong>اسم الوكيل:</strong> {cancellationToPrint.branch_agent?.agent_name || '—'}
                </div>
                <div>
                  <strong>اسم الوكالة / الفرع:</strong> {cancellationToPrint.branch_agent?.agency_name || '—'}
                </div>
                {cancellationToPrint.branch_agent?.city && (
                  <div>
                    <strong>المدينة / المنطقة:</strong> {cancellationToPrint.branch_agent?.city}
                  </div>
                )}
                <div>
                  <strong>سبب الإلغاء:</strong> {cancellationToPrint.reason}
                </div>
              </div>

              {/* Acknowledgment Paragraph */}
              <div style={{ padding: '14px', border: '1px dashed #94a3b8', borderRadius: '8px', background: '#ffffff', marginBottom: '22px', fontSize: '13px', textAlign: 'justify', lineHeight: '1.8' }}>
                <strong>إقرار وتعهد الوكيل:</strong><br />
                أقر أنا المذكور أعلاه بطلب إلغاء وكالة التأمين، وأتعهد بتسليم جميع العهد والمستندات والأختام والمبالغ والأصول التابعة للشركة، وتسوية أي التزامات قائمة حتى تاريخ الإلغاء.
              </div>

              {/* Custody and Liabilities Table */}
              <div style={{ marginBottom: '22px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                  بيان العهد والالتزامات:
                </h3>
                {(() => {
                  const parsed = parseCustodyData(cancellationToPrint.custody_handover_details);
                  const items: CustodyItem[] = parsed?.items && parsed.items.length > 0 ? parsed.items : [
                    { type: 'ثابتة', desc: 'أصول وأجهزة مكتبية', value: '—', status: 'مسلمة بالكامل' },
                    { type: 'مالية', desc: 'مستحقات ورصيد مالي', value: '0.00 د.ل', status: 'مسدد بالكامل' },
                    { type: 'وثائق ومستندات', desc: 'دفاتر وثائق التأمين', value: '—', status: 'مسلمة بالكامل' },
                    { type: 'أخرى', desc: 'أختام ومطبوعات', value: '—', status: 'مسلمة' },
                  ];
                  const remaining = parsed?.totalRemainingLiabilities || '0';
                  const isCleared = parsed?.settlementResult === 'cleared' || remaining === '0';

                  return (
                    <>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #334155', textAlign: 'right' }}>
                        <thead>
                          <tr style={{ background: '#e2e8f0', borderBottom: '1px solid #334155' }}>
                            <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '35px', textAlign: 'center' }}>م</th>
                            <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '130px' }}>نوع العهدة</th>
                            <th style={{ padding: '8px 10px', borderRight: '1px solid #334155' }}>البيان</th>
                            <th style={{ padding: '8px 10px', borderRight: '1px solid #334155', width: '130px' }}>القيمة / الرصيد</th>
                            <th style={{ padding: '8px 10px', width: '120px' }}>الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #cbd5e1' }}>
                              <td style={{ padding: '8px 10px', borderRight: '1px solid #334155', textAlign: 'center', fontWeight: 700 }}>{i + 1}</td>
                              <td style={{ padding: '8px 10px', borderRight: '1px solid #334155', fontWeight: 700 }}>{it.type}</td>
                              <td style={{ padding: '8px 10px', borderRight: '1px solid #334155' }}>{it.desc || '—'}</td>
                              <td style={{ padding: '8px 10px', borderRight: '1px solid #334155' }}>{it.value || '—'}</td>
                              <td style={{ padding: '8px 10px', fontWeight: 600 }}>{it.status}</td>
                            </tr>
                          ))}
                          <tr style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #334155' }}>
                            <td colSpan={3} style={{ padding: '10px', borderRight: '1px solid #334155', textAlign: 'left' }}>
                              إجمالي العهد أو الالتزامات المتبقية:
                            </td>
                            <td colSpan={2} style={{ padding: '10px', color: remaining !== '0' && remaining !== '' ? '#b91c1c' : '#15803d' }}>
                              {remaining && remaining !== '0' ? `${remaining} د.ل` : '0.00 د.ل (لا توجد التزامات)'}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Settlement Result Box */}
                      <div style={{ marginTop: '16px', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', fontSize: '13px' }}>
                        <div style={{ fontWeight: 800, marginBottom: '8px', color: '#1e293b' }}>نتيجة التسوية:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 900 }}>{isCleared ? '☑' : '☐'}</span>
                            <span style={{ fontWeight: isCleared ? 800 : 400 }}>لا توجد عهد أو التزامات متبقية – يُعتمد إخلاء الطرف.</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 900 }}>{!isCleared ? '☑' : '☐'}</span>
                            <span style={{ fontWeight: !isCleared ? 800 : 400, color: !isCleared ? '#b91c1c' : 'inherit' }}>توجد عهد أو التزامات متبقية – لا تُمنح براءة الذمة إلا بعد استكمال التسوية.</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Four Approvals and Signatures Grid */}
              <div style={{ marginTop: '30px' }}>
                <h3 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px' }}>
                  الاعتمادات والتوقيعات:
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center', fontSize: '11.5px' }}>
                  
                  {/* Agent */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 8px', background: '#fafafa', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#1e3a8a', marginBottom: '4px' }}>الوكيل</strong>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>مقدم الطلب</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600 }}>{cancellationToPrint.branch_agent?.agent_name || '.....................'}</div>
                      <div style={{ marginTop: '15px', borderTop: '1px dotted #94a3b8', paddingTop: '4px', color: '#64748b' }}>التوقيع</div>
                    </div>
                  </div>

                  {/* Finance Department */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 8px', background: '#fafafa', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#1e3a8a', marginBottom: '4px' }}>الإدارة المالية</strong>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>تمت مراجعة العهد والحسابات</span>
                    </div>
                    {cancellationToPrint.finance_signature ? (
                      <div>
                        <img 
                          src={`${BACKEND_URL}/storage/${cancellationToPrint.finance_signature}`} 
                          alt="توقيع المالية" 
                          style={{ maxHeight: '45px', maxWidth: '100%', objectFit: 'contain' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div style={{ borderTop: '1px dotted #94a3b8', paddingTop: '4px', color: '#64748b' }}>التوقيع والختم</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '11px' }}>.............................</div>
                        <div style={{ marginTop: '15px', borderTop: '1px dotted #94a3b8', paddingTop: '4px', color: '#64748b' }}>التوقيع والختم</div>
                      </div>
                    )}
                  </div>

                  {/* Agents & Branches Department */}
                  <div style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 8px', background: '#fafafa', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#1e3a8a', marginBottom: '4px' }}>مدير إدارة الوكلاء والفروع</strong>
                      <span style={{ fontSize: '10px', color: '#64748b' }}>تمت مراجعة الإجراءات والتسليم</span>
                    </div>
                    {cancellationToPrint.manager_signature ? (
                      <div>
                        <img 
                          src={`${BACKEND_URL}/storage/${cancellationToPrint.manager_signature}`} 
                          alt="توقيع مدير الوكلاء" 
                          style={{ maxHeight: '45px', maxWidth: '100%', objectFit: 'contain' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                        <div style={{ borderTop: '1px dotted #94a3b8', paddingTop: '4px', color: '#64748b' }}>التوقيع</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '11px' }}>.............................</div>
                        <div style={{ marginTop: '15px', borderTop: '1px dotted #94a3b8', paddingTop: '4px', color: '#64748b' }}>التوقيع</div>
                      </div>
                    )}
                  </div>

                  {/* General Manager Approval */}
                  <div style={{ border: '2px solid #1e3a8a', borderRadius: '8px', padding: '12px 8px', background: '#eff6ff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px' }}>
                    <div>
                      <strong style={{ display: 'block', fontSize: '12px', color: '#1e3a8a', marginBottom: '4px' }}>اعتماد المدير العام</strong>
                      <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#1e293b' }}>سكينة رمضان محمد</span>
                    </div>
                    <div>
                      <div style={{ height: '35px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e3a8a', fontSize: '10px', fontWeight: 700 }}>
                        [ ختم الشركة المعتمد ]
                      </div>
                      <div style={{ borderTop: '1px dotted #1e3a8a', paddingTop: '4px', color: '#1e3a8a', fontWeight: 700 }}>التوقيع والختم</div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Legal Footer Note */}
              <div style={{ marginTop: '30px', padding: '10px 14px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '11.5px', color: '#475569', textAlign: 'center' }}>
                <strong>ملاحظة قانونية:</strong> لا يُعتد بإلغاء الوكالة كإخلاء نهائي للذمة إلا بعد اعتماد التسوية المالية وتسليم جميع العهد والمستندات.
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ===== MODAL: UPDATE STATUS ===== */}
      {showStatusModal && (
        <div className="modal-overlay">
          <div className="modal-inner" style={{ maxWidth: '500px', borderRadius: '20px' }}>
            <div className="modal-top" style={{ padding: '20px 25px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, fontWeight: 800 }}>تحديث حالة طلب الإلغاء</h3>
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
                    <i className="fa-solid fa-check-circle" style={{ marginLeft: '8px' }}></i> موافقة وإلغاء
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
                    <i className="fa-solid fa-times-circle" style={{ marginLeft: '8px' }}></i> رفض الطلب
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
