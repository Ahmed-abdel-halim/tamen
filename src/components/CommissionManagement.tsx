import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

interface BranchAgent {
  id: number;
  agency_name: string;
  agent_name: string;
  code: string;
}

interface Commission {
  id: number;
  agent_id: number;
  agent_name: string;
  document_type: string;
  document_number: string;
  total_amount: number;
  commission_rate: number;
  commission_amount: number;
  status: 'pending' | 'paid';
  date: string;
}

const DOCUMENT_TYPES = [
  'تأمين سيارات إجباري',
  'تأمين سيارات دولي',
  'تأمين المسافرين',
  'تأمين الوافدين',
  'تأمين المسؤولية المهنية (الطبية)',
  'تأمين الهياكل البحرية',
  'تأمين الحوادث الشخصية',
  'تأمين حماية طلاب المدارس',
  'تأمين نقل النقدية',
  'تأمين شحن البضائع'
];

export default function CommissionManagement() {
  const [agents, setAgents] = useState<BranchAgent[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  // Filters & Form State
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  

  useEffect(() => {
    fetchAgents();
    fetchCommissions();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/branches-agents`);
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      showToast('حدث خطأ أثناء جلب الوكلاء', 'error');
    }
  };

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/commissions`);
      if (response.ok) {
        const data = await response.json();
        const mappedData = data.map((item: any) => ({
          id: item.id,
          agent_id: item.branch_agent_id,
          agent_name: item.agent ? item.agent.agency_name : 'غير معروف',
          document_type: item.document_type,
          document_number: item.document_number,
          total_amount: parseFloat(item.total_amount),
          commission_rate: parseFloat(item.commission_rate),
          commission_amount: parseFloat(item.commission_amount),
          status: item.status,
          date: item.created_at ? item.created_at.split('T')[0] : ''
        }));
        setCommissions(mappedData);
      }
    } catch (error) {
      showToast('حدث خطأ أثناء جلب العمولات', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayCommission = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من وضع علامة "مدفوع" لهذه العمولات؟')) return;
    
    // Logic to update status
    setCommissions(prev => prev.map(c => c.id === id ? { ...c, status: 'paid' } : c));
    showToast('تم تحديث حالة العمولة بنجاح', 'success');
  };

  const filteredCommissions = commissions.filter(c => {
    return (selectedAgent === '' || c.agent_id.toString() === selectedAgent) &&
           (selectedType === '' || c.document_type === selectedType) &&
           (statusFilter === 'all' || c.status === statusFilter);
  });

  const totalCommission = filteredCommissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const pendingCommission = filteredCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0);

  return (
    <section className="users-management">
      <div className="users-breadcrumb" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '15px 20px',
        background: 'var(--panel)',
        borderRadius: '12px',
        marginBottom: '20px',
        border: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)' }}>
          <i className="fa-solid fa-percent" style={{ marginLeft: '10px', color: '#139625' }}></i>
          نظام التسويات والعمولات
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>إجمالي العمولات المحتسبة</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>
            {totalCommission.toLocaleString()} د.ل
          </div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', borderRight: '4px solid #ef4444' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>عمولات مستحقة الدفع</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{pendingCommission.toLocaleString()} د.ل</div>
        </div>
        <div style={{ background: 'var(--panel)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border)', borderRight: '4px solid #139625' }}>
          <div style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '5px' }}>عمولات مسددة</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#139625' }}>{(totalCommission - pendingCommission).toLocaleString()} د.ل</div>
        </div>
      </div>

      <div className="users-card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          <div className="form-group">
            <label>فلترة حسب الوكيل</label>
            <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}>
              <option value="">كل الوكلاء</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.agency_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>فلترة حسب نوع الوثيقة</label>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}>
              <option value="">كل الأنواع</option>
              {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>حالة الدفع</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}>
              <option value="all">الكل</option>
              <option value="pending">مستحق</option>
              <option value="paid">مدفوع</option>
            </select>
          </div>
          <div className="form-group">
            <label>&nbsp;</label>
            <button className="primary" style={{ width: '100%', height: '45px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={fetchCommissions}>
              <i className="fa-solid fa-sync"></i>
              تحديث البيانات
            </button>
          </div>
        </div>
      </div>

      <div className="users-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table className="users-table">
          <thead>
            <tr>
              <th>الوكيل</th>
              <th>رقم الوثيقة</th>
              <th>نوع التأمين</th>
              <th>القيمة الإجمالية</th>
              <th>النسبة</th>
              <th>قيمة العمولة</th>
              <th>التاريخ</th>
              <th>الحالة</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>جاري التحميل...</td></tr>
            ) : filteredCommissions.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>لا توجد بيانات متاحة</td></tr>
            ) : filteredCommissions.map(comm => (
              <tr key={comm.id}>
                <td>{comm.agent_name}</td>
                <td style={{ fontWeight: 'bold', color: 'var(--text)' }}>{comm.document_number}</td>
                <td>{comm.document_type}</td>
                <td>{comm.total_amount.toLocaleString()} د.ل</td>
                <td>%{comm.commission_rate}</td>
                <td style={{ color: '#139625', fontWeight: 'bold' }}>{comm.commission_amount.toLocaleString()} د.ل</td>
                <td>{comm.date}</td>
                <td>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
                    background: comm.status === 'paid' ? '#dcfce7' : '#fef2f2',
                    color: comm.status === 'paid' ? '#166534' : '#991b1b',
                    fontWeight: '800'
                  }}>
                    {comm.status === 'paid' ? 'مدفوع' : 'مستحق'}
                  </span>
                </td>
                <td>
                  {comm.status === 'pending' && (
                    <button 
                      onClick={() => handlePayCommission(comm.id)}
                      style={{ background: '#139625', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      تسجيل كمدفوع
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
