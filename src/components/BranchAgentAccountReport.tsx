import { useEffect, useState, useRef } from "react";

type BranchAgent = {
  id: number;
  agency_name: string;
  agent_name: string;
  code: string;
};

const MONTHS = [
  { value: '1', label: 'يناير - 1' },
  { value: '2', label: 'فبراير - 2' },
  { value: '3', label: 'مارس - 3' },
  { value: '4', label: 'أبريل - 4' },
  { value: '5', label: 'مايو - 5' },
  { value: '6', label: 'يونيو - 6' },
  { value: '7', label: 'يوليو - 7' },
  { value: '8', label: 'أغسطس - 8' },
  { value: '9', label: 'سبتمبر - 9' },
  { value: '10', label: 'أكتوبر - 10' },
  { value: '11', label: 'نوفمبر - 11' },
  { value: '12', label: 'ديسمبر - 12' },
];

export default function BranchAgentAccountReport() {
  const [reportType, setReportType] = useState<'monthly' | 'full'>('monthly');
  const [selectedAgent, setSelectedAgent] = useState<BranchAgent | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  
  const [agents, setAgents] = useState<BranchAgent[]>([]);
  const [agentSearch, setAgentSearch] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);
  
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentAgentId, setCurrentAgentId] = useState<number | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // توليد السنوات (من 2020 إلى السنة الحالية + 1)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2019 + 2 }, (_, i) => (2020 + i).toString());

  useEffect(() => {
    loadUserPermissions();
  }, []);

  useEffect(() => {
    // جلب الوكلاء بعد تحميل معلومات المستخدم
    if (!isLoadingUser && (currentAgentId !== null || isAdmin)) {
      fetchAgents();
    }
  }, [currentAgentId, isAdmin, isLoadingUser]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
      const res = await fetch('/api/branches-agents', {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error('فشل في جلب الوكلاء');
      const data = await res.json();
      setAgents(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setToast({ message: `حدث خطأ: ${error.message}`, type: 'error' });
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
      setToast({ message: 'يرجى اختيار الوكيل', type: 'error' });
      return;
    }

    if (reportType === 'monthly' && (!selectedYear || !selectedMonth)) {
      setToast({ message: 'يرجى اختيار السنة والشهر', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      let url = `/api/branches-agents/${agentToUse.id}/account-report`;
      const params = new URLSearchParams();
      
      if (reportType === 'monthly') {
        params.append('type', 'monthly');
        params.append('year', selectedYear);
        params.append('month', selectedMonth);
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
      setToast({ message: `حدث خطأ: ${error.message}`, type: 'error' });
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
        {toast && (
          <div
            className={`toast ${toast.type}`}
            style={{
              position: 'fixed',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10000,
              padding: '12px 24px',
              borderRadius: '8px',
              background: toast.type === 'success' ? '#10b981' : '#ef4444',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            {toast.message}
          </div>
        )}

        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ marginBottom: '20px', fontSize: '20px', fontWeight: 600 }}>نوع التقرير</h2>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="reportType"
                value="monthly"
                checked={reportType === 'monthly'}
                onChange={(e) => setReportType(e.target.value as 'monthly')}
                style={{ marginLeft: '8px', width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>كشف حساب شهري</span>
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

          {/* السنة (فقط لكشف حساب شهري) */}
          {reportType === 'monthly' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>السنة</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
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
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* الشهر (فقط لكشف حساب شهري) */}
          {reportType === 'monthly' && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>الشهر</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
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
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div style={{ marginTop: '24px' }}>
          <button
            onClick={handlePrint}
            disabled={loading || !selectedAgent || (reportType === 'monthly' && (!selectedYear || !selectedMonth))}
            className="btn-submit"
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 600,
              opacity: loading || !selectedAgent || (reportType === 'monthly' && (!selectedYear || !selectedMonth)) ? 0.6 : 1,
              cursor: loading || !selectedAgent || (reportType === 'monthly' && (!selectedYear || !selectedMonth)) ? 'not-allowed' : 'pointer',
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
