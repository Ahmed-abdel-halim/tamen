import { useEffect, useState, useRef } from "react";
import { showToast } from "./Toast";
import { API_BASE_URL } from "../config/api";

type BranchAgent = {
  id: number;
  agency_name: string;
  agent_name: string;
  code: string;
};

type DatePreset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'custom';

const toInputDate = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetRange = (preset: DatePreset) => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  switch (preset) {
    case 'today':
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case 'last7':
      start.setDate(start.getDate() - 6);
      break;
    case 'thisMonth':
      start.setDate(1);
      break;
    case 'lastMonth':
      start.setMonth(start.getMonth() - 1, 1);
      end.setDate(0);
      break;
    default:
      break;
  }

  return { from: toInputDate(start), to: toInputDate(end) };
};

export default function BranchAgentAccountReport() {
  const [reportType, setReportType] = useState<'range' | 'full'>('range');
  const [selectedAgent, setSelectedAgent] = useState<BranchAgent | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const initialRange = getPresetRange('today');
  const [dateFrom, setDateFrom] = useState<string>(initialRange.from);
  const [dateTo, setDateTo] = useState<string>(initialRange.to);
  
  const [agents, setAgents] = useState<BranchAgent[]>([]);
  const [agentSearch, setAgentSearch] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentAgentId, setCurrentAgentId] = useState<number | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserPermissions();
  }, []);

  useEffect(() => {
    if (datePreset !== 'custom') {
      const range = getPresetRange(datePreset);
      setDateFrom(range.from);
      setDateTo(range.to);
    }
  }, [datePreset]);

  useEffect(() => {
    // جلب الوكلاء بعد تحميل معلومات المستخدم
    if (!isLoadingUser && (currentAgentId !== null || isAdmin)) {
      fetchAgents();
    }
  }, [currentAgentId, isAdmin, isLoadingUser]);



  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setShowAgentDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUserPermissions = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setIsAdmin(false);
        setCurrentAgentId(null);
        setIsLoadingUser(false);
        return;
      }
      
      const user = JSON.parse(userStr);
      setIsAdmin(user.is_admin || false);
      setCurrentAgentId(user.branch_agent_id || null);
      setIsLoadingUser(false);
    } catch (error) {
      console.error('Error loading user permissions:', error);
      setIsAdmin(false);
      setCurrentAgentId(null);
      setIsLoadingUser(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/branches-agents`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('فشل في جلب الوكلاء');
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (error: any) {
      showToast(`حدث خطأ: ${error.message}`, 'error');
    }
  };

  // تعيين الوكيل الحالي تلقائياً عند تغيير agents
  useEffect(() => {
    if (!isAdmin && currentAgentId && agents.length > 0) {
      const currentAgent = agents.find((agent: BranchAgent) => agent.id === currentAgentId);
      if (currentAgent) {
        // تعيين الوكيل فقط إذا لم يكن معيناً بالفعل أو إذا تغير currentAgentId
        setSelectedAgent(prev => {
          if (!prev || prev.id !== currentAgentId) {
            return currentAgent;
          }
          return prev;
        });
      }
    }
  }, [agents, currentAgentId, isAdmin]);

  const filteredAgents = agents.filter(agent =>
    agent.agency_name.toLowerCase().includes(agentSearch.toLowerCase()) ||
    agent.agent_name.toLowerCase().includes(agentSearch.toLowerCase()) ||
    agent.code.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const handlePrint = async () => {
    // للوكلاء (غير admin)، استخدام الوكيل الحالي تلقائياً
    const agentToUse = isAdmin ? selectedAgent : (selectedAgent || (currentAgentId ? agents.find(a => a.id === currentAgentId) : null));
    
    if (!agentToUse) {
      showToast('يرجى اختيار الوكيل', 'error');
      return;
    }

    if (reportType === 'range' && (!dateFrom || !dateTo)) {
      showToast('يرجى تحديد نطاق التاريخ', 'error');
      return;
    }

    if (reportType === 'range' && dateFrom > dateTo) {
      showToast('تاريخ البداية يجب أن يكون قبل أو يساوي تاريخ النهاية', 'error');
      return;
    }

    setLoading(true);
    try {
      let url = `${API_BASE_URL}/branches-agents/${agentToUse.id}/account-report`;
      const params = new URLSearchParams();
      
      if (reportType === 'range') {
        params.append('type', 'range');
        params.append('from_date', dateFrom);
        params.append('to_date', dateTo);
        params.append('preset', datePreset);
      } else {
        params.append('type', 'full');
      }
      
      url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { 'Accept': 'text/html' }
      });

      if (!res.ok) {
        throw new Error('فشل في جلب التقرير');
      }

      const htmlContent = await res.text();

      // إنشاء iframe مخفي للطباعة
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '-9999px';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      let printed = false;

      const printFrame = () => {
        if (!printed) {
          printed = true;
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (iframe.parentNode) {
              document.body.removeChild(iframe);
            }
          }, 750);
        }
      };

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();
        
        // انتظار تحميل الصور قبل الطباعة
        const images = iframeDoc.getElementsByTagName('img');
        let imagesLoaded = 0;
        const totalImages = images.length;
        
        if (totalImages === 0) {
          printFrame();
        } else {
          Array.from(images).forEach((img) => {
            if (img.complete) {
              imagesLoaded++;
              if (imagesLoaded === totalImages) {
                setTimeout(printFrame, 100);
              }
            } else {
              img.onload = () => {
                imagesLoaded++;
                if (imagesLoaded === totalImages) {
                  setTimeout(printFrame, 100);
                }
              };
              img.onerror = () => {
                imagesLoaded++;
                if (imagesLoaded === totalImages) {
                  setTimeout(printFrame, 100);
                }
              };
            }
          });
        }
      }
    } catch (error: any) {
      showToast(`حدث خطأ: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };


  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>كشف حساب الوكيل</span>
      </div>

      <div className="users-card">


        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 600 }}>نوع التقرير</h2>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="reportType"
                value="range"
                checked={reportType === 'range'}
                onChange={(e) => setReportType(e.target.value as 'range')}
                style={{ marginLeft: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>كشف حسب فترة زمنية</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="reportType"
                value="full"
                checked={reportType === 'full'}
                onChange={(e) => setReportType(e.target.value as 'full')}
                style={{ marginLeft: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>كشف حساب كامل</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          {/* الوكيل (select2) - يظهر فقط للـ admin */}
          {isAdmin ? (
            <div
              className="form-group"
              style={{ marginBottom: 0, position: 'relative' }}
              ref={agentDropdownRef}
            >
              <label>الوكيل</label>
              <div
                onClick={() => {
                  setShowAgentDropdown(!showAgentDropdown);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 42,
                }}
              >
                <span style={{ color: selectedAgent ? '#111827' : '#9ca3af' }}>
                  {selectedAgent ? `${selectedAgent.agency_name} - ${selectedAgent.agent_name}` : 'اختر وكيل...'}
                </span>
                <i
                  className={`fa-solid fa-chevron-${showAgentDropdown ? 'up' : 'down'}`}
                  style={{ color: '#9ca3af' }}
                ></i>
              </div>
              {showAgentDropdown && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 4,
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  zIndex: 1000,
                  maxHeight: 320,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>
                  <input
                    type="text"
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    placeholder="ابحث..."
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      fontSize: 14,
                    }}
                    autoFocus
                  />
                </div>
                <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                  <div
                    onClick={() => {
                      setSelectedAgent(null);
                      setAgentSearch('');
                      setShowAgentDropdown(false);
                    }}
                    style={{
                      padding: '9px 12px',
                      borderBottom: '1px solid #f3f4f6',
                      cursor: 'pointer',
                      fontWeight: 500,
                      background: !selectedAgent ? '#f3f4f6' : 'transparent',
                    }}
                  >
                    مسح التحديد
                  </div>
                  {filteredAgents.map((agent) => (
                    <div
                      key={agent.id}
                      onClick={() => {
                        setSelectedAgent(agent);
                        setAgentSearch('');
                        setShowAgentDropdown(false);
                      }}
                      style={{
                        padding: '9px 12px',
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        background: selectedAgent?.id === agent.id ? '#f3f4f6' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedAgent?.id !== agent.id) {
                          e.currentTarget.style.background = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedAgent?.id !== agent.id) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {agent.agency_name} - {agent.agent_name} ({agent.code})
                    </div>
                  ))}
                  {filteredAgents.length === 0 && (
                    <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af' }}>
                      لا توجد نتائج
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          ) : null}

          {/* اختيار الفترة الذكية */}
          {reportType === 'range' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>فترة سريعة</label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DatePreset)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: '#fff',
                  fontSize: 14,
                  minHeight: 42,
                }}
              >
                <option value="today">اليوم</option>
                <option value="yesterday">أمس</option>
                <option value="last7">آخر 7 أيام</option>
                <option value="thisMonth">هذا الشهر</option>
                <option value="lastMonth">الشهر السابق</option>
                <option value="custom">تحديد مخصص</option>
              </select>
            </div>
          )}

          {/* من تاريخ */}
          {reportType === 'range' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>من تاريخ</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  if (datePreset !== 'custom') setDatePreset('custom');
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: '#fff',
                  fontSize: 14,
                  minHeight: 42,
                }}
              />
            </div>
          )}

          {/* إلى تاريخ */}
          {reportType === 'range' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>إلى تاريخ</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  if (datePreset !== 'custom') setDatePreset('custom');
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  background: '#fff',
                  fontSize: 14,
                  minHeight: 42,
                }}
              />
            </div>
          )}
        </div>

        <div style={{ marginTop: '24px' }}>
          <button
            onClick={handlePrint}
            disabled={loading || !selectedAgent || (reportType === 'range' && (!dateFrom || !dateTo))}
            className="btn-submit"
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              opacity: loading || !selectedAgent || (reportType === 'range' && (!dateFrom || !dateTo)) ? 0.6 : 1,
              cursor: loading || !selectedAgent || (reportType === 'range' && (!dateFrom || !dateTo)) ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '8px' }}></i>
                جاري الطباعة...
              </>
            ) : (
              <>
                <i className="fa-solid fa-print" style={{ marginLeft: '8px' }}></i>
                طباعة
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
