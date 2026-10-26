import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';
import { generatePremiumExcel } from '../utils/excelGenerator';
import { getActiveBranch, getBranchHeaders, type Branch } from '../utils/branchContext';

interface EmployeePresenceItem {
  id: number;
  name: string;
  full_name_quad?: string;
  job_title: string;
  national_id_number?: string;
  email?: string;
  profile_photo_url?: string;
  branch_id?: number | null;
  branch?: {
    id: number;
    name: string;
    code: string;
    city?: string;
  } | null;
  department?: {
    id: number;
    name: string;
  } | null;
  is_online: boolean;
  last_seen_at?: string | null;
  last_seen_diff?: string;
  attendance?: {
    id: number;
    date: string;
    first_login_at?: string | null;
    first_login_time?: string | null;
    last_activity_at?: string | null;
    last_activity_time?: string | null;
    total_online_seconds: number;
    formatted_duration: string;
    duration_hours: number;
    sessions_count: number;
    login_ip?: string | null;
    device_info?: string | null;
  } | null;
}

interface PresenceStats {
  target_date: string;
  total_employees: number;
  online_now_count: number;
  offline_count: number;
  attended_count: number;
  total_online_seconds: number;
  total_hours: number;
  formatted_total_duration: string;
  average_hours: number;
}

interface HistoryItem {
  id: number;
  date: string;
  first_login_at?: string | null;
  first_login_time?: string | null;
  last_activity_at?: string | null;
  last_activity_time?: string | null;
  total_online_seconds: number;
  formatted_duration: string;
  duration_hours: number;
  sessions_count: number;
  login_ip?: string | null;
  device_info?: string | null;
}

export default function EmployeePresence() {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [activeBranch, setActiveBranchState] = useState<Branch | null>(getActiveBranch());

  const [employees, setEmployees] = useState<EmployeePresenceItem[]>([]);
  const [stats, setStats] = useState<PresenceStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [departmentsList, setDepartmentsList] = useState<{ id: number; name: string }[]>([]);

  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState<EmployeePresenceItem | null>(null);
  const [employeeHistory, setEmployeeHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  useEffect(() => {
    const handleBranchChanged = (e: any) => {
      setActiveBranchState(e.detail || getActiveBranch());
    };
    window.addEventListener('branchChanged', handleBranchChanged);
    return () => window.removeEventListener('branchChanged', handleBranchChanged);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/departments`, {
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...getBranchHeaders()
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDepartmentsList(data);
        else if (Array.isArray(data.data)) setDepartmentsList(data.data);
      })
      .catch(err => console.error('Error fetching departments:', err));
  }, [activeBranch]);

  const fetchData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const params = new URLSearchParams({
        date: selectedDate,
        per_page: '200',
        ...(searchQuery ? { search: searchQuery } : {}),
        ...(filterStatus !== 'all' ? { status: filterStatus } : {}),
        ...(filterDepartment !== 'all' ? { department_id: filterDepartment } : {}),
      });

      const [listRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/employee-presence?${params.toString()}`, {
          headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}), ...getBranchHeaders() }
        }),
        fetch(`${API_BASE_URL}/employee-presence/stats?date=${selectedDate}`, {
          headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}), ...getBranchHeaders() }
        })
      ]);

      if (listRes.ok) { const d = await listRes.json(); setEmployees(d.data || []); }
      if (statsRes.ok) { const d = await statsRes.json(); setStats(d); }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching employee presence data:', error);
      showToast('تعذر تحميل بيانات تواجد الموظفين', 'error');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [selectedDate, searchQuery, filterStatus, filterDepartment, activeBranch]);

  useEffect(() => { fetchData(true); }, [fetchData]);

  useEffect(() => {
    if (!isLiveActive) return;
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, [isLiveActive, fetchData]);

  const openEmployeeHistory = async (emp: EmployeePresenceItem) => {
    setSelectedEmployeeForHistory(emp);
    setHistoryLoading(true);
    setEmployeeHistory([]);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE_URL}/employee-presence/${emp.id}/history`, {
        headers: { 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (res.ok) { const data = await res.json(); setEmployeeHistory(data.history || []); }
      else showToast('تعذر جلب السجل التاريخي للموظف', 'error');
    } catch (err) {
      console.error('Error fetching user history:', err);
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (employees.length === 0) { showToast('لا توجد بيانات موظفين للتصدير', 'error'); return; }
    setExporting(true);
    try {
      const branchTitle = activeBranch ? activeBranch.name : 'الإدارة العامة (كافة الفروع)';
      const excelColumns = [
        { header: 'م', key: 'idx', width: 6 },
        { header: 'اسم الموظف', key: 'name', width: 26 },
        { header: 'الرقم الوطني', key: 'national_id', width: 16 },
        { header: 'الفرع', key: 'branch', width: 20 },
        { header: 'القسم', key: 'department', width: 18 },
        { header: 'المسمى الوظيفي', key: 'job_title', width: 20 },
        { header: 'الحالة الحالية', key: 'status_label', width: 15 },
        { header: 'أول دخول اليوم', key: 'first_login', width: 16 },
        { header: 'آخر نشاط', key: 'last_activity', width: 16 },
        { header: 'إجمالي مدة الاتصال', key: 'formatted_duration', width: 18 },
        { header: 'ساعات العمل', key: 'hours_num', width: 14 },
        { header: 'عدد الجلسات', key: 'sessions', width: 12 },
      ];
      const excelData = employees.map((emp, index) => ({
        idx: index + 1,
        name: emp.full_name_quad || emp.name,
        national_id: emp.national_id_number || '-',
        branch: emp.branch ? emp.branch.name : (activeBranch?.name || 'المركز الرئيسي'),
        department: emp.department ? emp.department.name : '-',
        job_title: emp.job_title || 'موظف',
        status_label: emp.is_online ? 'متصل الآن 🟢' : 'غير متصل ⚪',
        first_login: emp.attendance?.first_login_time || (emp.attendance?.first_login_at ? emp.attendance.first_login_at.substring(11, 16) : 'لم يسجل دخول'),
        last_activity: emp.is_online ? 'نشط الآن' : (emp.attendance?.last_activity_time || '-'),
        formatted_duration: emp.attendance?.formatted_duration || '0 دقيقة',
        hours_num: emp.attendance?.duration_hours || 0,
        sessions: emp.attendance?.sessions_count || (emp.attendance ? 1 : 0),
      }));
      await generatePremiumExcel({
        title: 'كشف حضور وتواجد الموظفين وحالة الاتصال',
        subtitle: `الفرع: ${branchTitle} | تاريخ الكشف: ${selectedDate} | إجمالي المتصلين: ${stats?.online_now_count || 0} من أصل ${stats?.total_employees || employees.length}`,
        columns: excelColumns,
        data: excelData,
        fileName: `سجل_حضور_واتصال_الموظفين_${selectedDate}_${branchTitle.replace(/\s+/g, '_')}.xlsx`,
      });
      showToast('تم تصدير ملف الإكسل بنجاح', 'success');
    } catch (err) {
      console.error('Error generating excel:', err);
      showToast('حدث خطأ أثناء تصدير ملف الإكسل', 'error');
    } finally {
      setExporting(false);
    }
  };

  const setQuickDate = (type: 'today' | 'yesterday') => {
    if (type === 'today') {
      setSelectedDate(todayStr);
    } else {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  };

  const EP_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Tajawal:wght@400;500;700;900&display=swap');
    .ep-page * { box-sizing: border-box; }

    .ep-header {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #0c1f3d 100%);
      border-radius: 20px; padding: 28px 32px; color: #fff;
      position: relative; overflow: hidden; margin-bottom: 20px;
      box-shadow: 0 20px 60px rgba(14,32,65,0.5);
      border: 1px solid rgba(255,255,255,0.07);
    }
    .ep-header::before {
      content: ''; position: absolute; top: -80px; right: -80px;
      width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(56,189,248,0.18) 0%, transparent 70%); pointer-events: none;
    }
    .ep-header::after {
      content: ''; position: absolute; bottom: -60px; left: -40px;
      width: 260px; height: 260px;
      background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%); pointer-events: none;
    }
    .ep-header-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; flex-wrap: wrap; position: relative; z-index: 1; }
    .ep-title-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
    .ep-icon-box { width: 52px; height: 52px; border-radius: 14px; background: rgba(56,189,248,0.18); border: 1px solid rgba(56,189,248,0.3); display: flex; align-items: center; justify-content: center; font-size: 22px; color: #38bdf8; flex-shrink: 0; }
    .ep-main-title { font-size: 26px; font-weight: 900; color: #fff; margin: 0; line-height: 1.2; }
    .ep-branch-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px; border-radius: 50px; font-size: 11px; font-weight: 700; backdrop-filter: blur(10px); }
    .ep-branch-badge.branch { background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); color: #bae6fd; }
    .ep-branch-badge.all { background: rgba(52,211,153,0.15); border: 1px solid rgba(52,211,153,0.3); color: #a7f3d0; }
    .ep-subtitle { font-size: 13px; color: rgba(203,213,225,0.8); margin: 10px 0 0 0; line-height: 1.6; max-width: 580px; }
    .ep-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex-shrink: 0; }
    .ep-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 18px; border-radius: 12px; font-size: 12px; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s ease; font-family: inherit; white-space: nowrap; }
    .ep-btn:hover { transform: translateY(-1px); }
    .ep-btn:active { transform: translateY(0); }
    .ep-btn-ghost { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); color: #fff; }
    .ep-btn-ghost:hover { background: rgba(255,255,255,0.18); }
    .ep-btn-live-on { background: rgba(52,211,153,0.15); border: 1px solid rgba(52,211,153,0.3); color: #a7f3d0; }
    .ep-btn-live-off { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); color: rgba(203,213,225,0.7); }
    .ep-btn-excel { background: linear-gradient(135deg,#059669,#10b981); color: #fff; border: 1px solid rgba(52,211,153,0.3); box-shadow: 0 4px 12px rgba(5,150,105,0.4); }
    .ep-btn-excel:hover { background: linear-gradient(135deg,#047857,#059669); box-shadow: 0 6px 18px rgba(5,150,105,0.5); }
    .ep-btn-excel:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .ep-live-dot { width: 8px; height: 8px; border-radius: 50%; }
    .ep-live-dot.on { background: #4ade80; animation: ep-pulse 1.5s infinite; }
    .ep-live-dot.off { background: rgba(203,213,225,0.5); }
    @keyframes ep-pulse { 0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:0.7} }

    .ep-date-strip { margin-top: 22px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; position: relative; z-index: 1; }
    .ep-date-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .ep-date-label { font-size: 12px; font-weight: 700; color: rgba(148,163,184,0.9); }
    .ep-date-btn { padding: 7px 16px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; font-family: inherit; }
    .ep-date-btn.active { background: #0ea5e9; color: #fff; border-color: rgba(14,165,233,0.4); box-shadow: 0 3px 10px rgba(14,165,233,0.35); }
    .ep-date-btn.inactive { background: rgba(255,255,255,0.08); color: rgba(203,213,225,0.7); border-color: rgba(255,255,255,0.1); }
    .ep-date-btn.inactive:hover { background: rgba(255,255,255,0.14); }
    .ep-date-input-wrap { display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 7px 14px; }
    .ep-date-input { background: transparent; border: none; outline: none; color: #fff; font-size: 12px; cursor: pointer; color-scheme: dark; font-family: inherit; }
    .ep-last-update { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(148,163,184,0.7); }

    .ep-kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 20px; }
    @media(max-width:1024px){.ep-kpi-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:540px){.ep-kpi-grid{grid-template-columns:1fr}}
    .ep-kpi-card { border-radius: 18px; padding: 22px 20px 18px; position: relative; overflow: hidden; border: 1px solid transparent; transition: transform 0.2s,box-shadow 0.2s; }
    .ep-kpi-card:hover { transform: translateY(-3px); }
    .ep-kpi-card.green { background: linear-gradient(135deg,#064e3b,#065f46); border-color: rgba(52,211,153,0.25); box-shadow: 0 8px 32px rgba(5,150,105,0.3); }
    .ep-kpi-card.slate { background: linear-gradient(135deg,#1e293b,#334155); border-color: rgba(148,163,184,0.2); box-shadow: 0 8px 32px rgba(15,23,42,0.4); }
    .ep-kpi-card.blue { background: linear-gradient(135deg,#0c1a42,#1e3a8a); border-color: rgba(56,189,248,0.25); box-shadow: 0 8px 32px rgba(14,165,233,0.25); }
    .ep-kpi-card.purple { background: linear-gradient(135deg,#1e1b4b,#312e81); border-color: rgba(139,92,246,0.25); box-shadow: 0 8px 32px rgba(99,102,241,0.25); }
    .ep-kpi-glow { position: absolute; top: -20px; left: -20px; width: 120px; height: 120px; border-radius: 50%; pointer-events: none; }
    .ep-kpi-card.green .ep-kpi-glow{background:radial-gradient(circle,rgba(52,211,153,0.2) 0%,transparent 70%)}
    .ep-kpi-card.blue .ep-kpi-glow{background:radial-gradient(circle,rgba(56,189,248,0.2) 0%,transparent 70%)}
    .ep-kpi-card.purple .ep-kpi-glow{background:radial-gradient(circle,rgba(139,92,246,0.2) 0%,transparent 70%)}
    .ep-kpi-card.slate .ep-kpi-glow{background:radial-gradient(circle,rgba(148,163,184,0.15) 0%,transparent 70%)}
    .ep-kpi-header{display:flex;align-items:flex-start;justify-content:space-between;position:relative;z-index:1}
    .ep-kpi-icon{width:48px;height:48px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
    .ep-kpi-card.green .ep-kpi-icon{background:rgba(52,211,153,0.2);color:#4ade80}
    .ep-kpi-card.blue .ep-kpi-icon{background:rgba(56,189,248,0.2);color:#38bdf8}
    .ep-kpi-card.purple .ep-kpi-icon{background:rgba(139,92,246,0.2);color:#a78bfa}
    .ep-kpi-card.slate .ep-kpi-icon{background:rgba(148,163,184,0.15);color:#94a3b8}
    .ep-kpi-label{font-size:11px;font-weight:700;margin-bottom:4px;opacity:0.7}
    .ep-kpi-card.green .ep-kpi-label{color:#a7f3d0}
    .ep-kpi-card.blue .ep-kpi-label{color:#bae6fd}
    .ep-kpi-card.purple .ep-kpi-label{color:#ddd6fe}
    .ep-kpi-card.slate .ep-kpi-label{color:#cbd5e1}
    .ep-kpi-value{font-size:34px;font-weight:900;line-height:1;margin:2px 0;color:#fff}
    .ep-kpi-sub{font-size:11px;font-weight:600;margin-top:3px}
    .ep-kpi-card.green .ep-kpi-sub{color:rgba(167,243,208,0.7)}
    .ep-kpi-card.blue .ep-kpi-sub{color:rgba(186,230,253,0.7)}
    .ep-kpi-card.purple .ep-kpi-sub{color:rgba(221,214,254,0.7)}
    .ep-kpi-card.slate .ep-kpi-sub{color:rgba(203,213,225,0.7)}
    .ep-kpi-bar-wrap{margin-top:14px;background:rgba(0,0,0,0.2);border-radius:50px;height:5px;overflow:hidden}
    .ep-kpi-bar{height:100%;border-radius:50px;transition:width 0.8s ease}
    .ep-kpi-card.green .ep-kpi-bar{background:linear-gradient(90deg,#4ade80,#22c55e)}
    .ep-kpi-card.blue .ep-kpi-bar{background:linear-gradient(90deg,#38bdf8,#0ea5e9)}
    .ep-kpi-card.purple .ep-kpi-bar{background:linear-gradient(90deg,#a78bfa,#8b5cf6)}
    .ep-kpi-card.slate .ep-kpi-bar{background:linear-gradient(90deg,#94a3b8,#64748b)}

    .ep-filter-bar { border-radius: 16px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .dark .ep-filter-bar { background: #1e293b; border-color: rgba(255,255,255,0.07); box-shadow: 0 4px 20px rgba(0,0,0,0.3); }
    .ep-search-wrap { position: relative; flex: 1; min-width: 220px; max-width: 340px; }
    .ep-search-icon { position: absolute; right: 13px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; font-size: 13px; }
    .ep-search-input { width: 100%; padding: 10px 38px 10px 14px; border-radius: 11px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 12px; color: #1e293b; outline: none; transition: border-color 0.2s,box-shadow 0.2s; font-family: inherit; }
    .ep-search-input::placeholder{color:#94a3b8}
    .ep-search-input:focus{border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,0.1)}
    .dark .ep-search-input{background:#0f172a;border-color:rgba(255,255,255,0.1);color:#e2e8f0}
    .dark .ep-search-input:focus{border-color:#38bdf8;box-shadow:0 0 0 3px rgba(56,189,248,0.1)}
    .ep-filter-group { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .ep-tabs { display: flex; background: #f1f5f9; border-radius: 11px; padding: 4px; gap: 2px; border: 1px solid #e2e8f0; }
    .dark .ep-tabs { background: #0f172a; border-color: rgba(255,255,255,0.07); }
    .ep-tab { padding: 7px 14px; border-radius: 8px; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: none; background: transparent; font-family: inherit; display: flex; align-items: center; gap: 6px; }
    .ep-tab.active-all { background: #fff; color: #1e293b; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .dark .ep-tab.active-all { background: #1e293b; color: #f1f5f9; }
    .ep-tab.active-online { background: #059669; color: #fff; box-shadow: 0 2px 8px rgba(5,150,105,0.3); }
    .ep-tab.active-offline { background: #475569; color: #fff; }
    .ep-tab.inactive { color: #64748b; }
    .ep-tab.inactive:hover { background: rgba(0,0,0,0.05); }
    .dark .ep-tab.inactive { color: #94a3b8; }
    .dark .ep-tab.inactive:hover { background: rgba(255,255,255,0.05); }
    .ep-sdot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .ep-sdot.online { background: #4ade80; }
    .ep-sdot.offline { background: #94a3b8; }
    .ep-select { padding: 9px 14px; border-radius: 11px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 12px; font-weight: 700; color: #1e293b; outline: none; cursor: pointer; font-family: inherit; transition: border-color 0.2s; }
    .ep-select:focus { border-color: #0ea5e9; }
    .dark .ep-select { background: #0f172a; border-color: rgba(255,255,255,0.1); color: #e2e8f0; }
    .ep-clear-btn { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 11px; background: #fff0f0; border: 1px solid #fecaca; color: #ef4444; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; }
    .ep-clear-btn:hover { background: #fee2e2; }
    .dark .ep-clear-btn { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.25); color: #f87171; }

    .ep-table-card { border-radius: 18px; overflow: hidden; border: 1px solid #e2e8f0; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.07); }
    .dark .ep-table-card { background: #1e293b; border-color: rgba(255,255,255,0.07); box-shadow: 0 8px 32px rgba(0,0,0,0.35); }
    .ep-table-header-bar { display: flex; align-items: center; justify-content: space-between; padding: 16px 22px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
    .dark .ep-table-header-bar { background: #0f172a; border-color: rgba(255,255,255,0.07); }
    .ep-table-header-bar h3 { font-size: 14px; font-weight: 800; color: #1e293b; margin: 0; }
    .dark .ep-table-header-bar h3 { color: #f1f5f9; }
    .ep-table-count { font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 50px; background: #e0f2fe; color: #0284c7; }
    .dark .ep-table-count { background: rgba(14,165,233,0.15); color: #38bdf8; }
    table.ep-table { width: 100%; border-collapse: collapse; text-align: right; font-size: 12px; }
    table.ep-table thead tr { background: #f1f5f9; border-bottom: 1px solid #e2e8f0; }
    .dark table.ep-table thead tr { background: rgba(15,23,42,0.9); border-color: rgba(255,255,255,0.06); }
    table.ep-table th { padding: 12px 16px; font-size: 11px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap; }
    .dark table.ep-table th { color: #94a3b8; }
    table.ep-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
    .dark table.ep-table tbody tr { border-color: rgba(255,255,255,0.04); }
    table.ep-table tbody tr:last-child { border-bottom: none; }
    table.ep-table tbody tr:hover { background: #f8fafc; }
    .dark table.ep-table tbody tr:hover { background: rgba(255,255,255,0.03); }
    table.ep-table tbody tr.ep-row-online { background: rgba(5,150,105,0.03); }
    .dark table.ep-table tbody tr.ep-row-online { background: rgba(5,150,105,0.06); }
    table.ep-table td { padding: 13px 16px; vertical-align: middle; }
    .ep-avatar-wrap { position: relative; flex-shrink: 0; }
    .ep-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #e2e8f0; }
    .dark .ep-avatar { border-color: rgba(255,255,255,0.1); }
    .ep-avatar-initials { width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg,#0369a1,#0ea5e9); color: #fff; font-weight: 900; font-size: 16px; display: flex; align-items: center; justify-content: center; }
    .ep-avatar-beacon { position: absolute; bottom: 0; left: 0; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff; }
    .dark .ep-avatar-beacon { border-color: #1e293b; }
    .ep-avatar-beacon.online { background: #22c55e; }
    .ep-avatar-beacon.offline { background: #94a3b8; }
    .ep-emp-name { font-size: 13px; font-weight: 800; color: #1e293b; }
    .dark .ep-emp-name { color: #f1f5f9; }
    .ep-emp-meta { font-size: 11px; color: #64748b; margin-top: 1px; }
    .dark .ep-emp-meta { color: #94a3b8; }
    .ep-status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 50px; font-size: 11px; font-weight: 800; white-space: nowrap; border: 1px solid transparent; }
    .ep-status-badge.online { background: rgba(5,150,105,0.12); color: #059669; border-color: rgba(5,150,105,0.2); }
    .dark .ep-status-badge.online { background: rgba(52,211,153,0.12); color: #4ade80; border-color: rgba(52,211,153,0.2); }
    .ep-status-badge.offline { background: #f1f5f9; color: #64748b; border-color: #e2e8f0; }
    .dark .ep-status-badge.offline { background: rgba(148,163,184,0.08); color: #94a3b8; border-color: rgba(148,163,184,0.15); }
    .ep-status-badge .ep-bdot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .ep-status-badge.online .ep-bdot { background: #22c55e; animation: ep-pulse 1.5s infinite; }
    .ep-status-badge.offline .ep-bdot { background: #94a3b8; }
    .ep-branch-tag { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 10.5px; font-weight: 700; background: #eff6ff; color: #1d4ed8; border: 1px solid rgba(29,78,216,0.12); margin-bottom: 3px; }
    .dark .ep-branch-tag { background: rgba(29,78,216,0.15); color: #93c5fd; border-color: rgba(29,78,216,0.2); }
    .ep-duration-val { font-weight: 800; font-size: 12.5px; color: #0ea5e9; }
    .dark .ep-duration-val { color: #38bdf8; }
    .ep-progress-bar-wrap { width: 90px; height: 5px; background: #e2e8f0; border-radius: 50px; overflow: hidden; margin-top: 5px; }
    .dark .ep-progress-bar-wrap { background: rgba(255,255,255,0.08); }
    .ep-progress-bar { height: 100%; border-radius: 50px; transition: width 0.8s ease; }
    .ep-progress-bar.full { background: linear-gradient(90deg,#22c55e,#16a34a); }
    .ep-progress-bar.half { background: linear-gradient(90deg,#0ea5e9,#0284c7); }
    .ep-progress-bar.low { background: linear-gradient(90deg,#f59e0b,#d97706); }
    .ep-progress-pct { font-size: 10px; color: #94a3b8; margin-top: 3px; }
    .ep-sessions-badge { display: inline-block; padding: 3px 10px; border-radius: 7px; font-size: 12px; font-weight: 800; background: #f1f5f9; color: #475569; }
    .dark .ep-sessions-badge { background: rgba(255,255,255,0.07); color: #94a3b8; }
    .ep-history-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; transition: all 0.2s; border: 1px solid #bae6fd; font-family: inherit; background: #f0f9ff; color: #0284c7; }
    .ep-history-btn:hover { background: #e0f2fe; border-color: #7dd3fc; transform: translateY(-1px); }
    .dark .ep-history-btn { background: rgba(14,165,233,0.08); color: #38bdf8; border-color: rgba(56,189,248,0.2); }
    .dark .ep-history-btn:hover { background: rgba(14,165,233,0.15); }
    .ep-state-cell { padding: 60px 20px; text-align: center; }
    .ep-state-icon-wrap { width: 70px; height: 70px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; font-size: 26px; color: #94a3b8; }
    .dark .ep-state-icon-wrap { background: rgba(255,255,255,0.06); }
    .ep-state-title { font-size: 15px; font-weight: 800; color: #475569; margin-bottom: 5px; }
    .dark .ep-state-title { color: #94a3b8; }
    .ep-state-sub { font-size: 12px; color: #94a3b8; }

    .ep-modal-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.65); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: ep-fadein 0.2s ease; }
    @keyframes ep-fadein { from{opacity:0} to{opacity:1} }
    .ep-modal { width: 100%; max-width: 820px; max-height: 88vh; border-radius: 20px; overflow: hidden; display: flex; flex-direction: column; animation: ep-slidein 0.25s ease; border: 1px solid rgba(255,255,255,0.08); background: #fff; }
    .dark .ep-modal { background: #1e293b; }
    @keyframes ep-slidein { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
    .ep-modal-head { padding: 22px 26px; background: linear-gradient(135deg,#0f172a,#1e3a5f); display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
    .ep-modal-head-icon { width: 42px; height: 42px; border-radius: 12px; background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.25); display: flex; align-items: center; justify-content: center; color: #38bdf8; font-size: 18px; }
    .ep-modal-head h3 { font-size: 16px; font-weight: 900; color: #fff; margin: 0; }
    .ep-modal-head p { font-size: 11.5px; color: rgba(148,163,184,0.85); margin: 2px 0 0; }
    .ep-modal-close { width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.08); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: background 0.2s; font-family: inherit; }
    .ep-modal-close:hover { background: rgba(255,255,255,0.18); }
    .ep-modal-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
    .ep-modal-table-wrap { border-radius: 14px; overflow: hidden; border: 1px solid #e2e8f0; }
    .dark .ep-modal-table-wrap { border-color: rgba(255,255,255,0.07); }
    table.ep-modal-table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: right; }
    table.ep-modal-table thead tr { background: #f1f5f9; border-bottom: 1px solid #e2e8f0; }
    .dark table.ep-modal-table thead tr { background: #0f172a; border-color: rgba(255,255,255,0.07); }
    table.ep-modal-table th { padding: 11px 14px; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
    .dark table.ep-modal-table th { color: #94a3b8; }
    table.ep-modal-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
    .dark table.ep-modal-table tbody tr { border-color: rgba(255,255,255,0.04); }
    table.ep-modal-table tbody tr:last-child { border-bottom: none; }
    table.ep-modal-table tbody tr:hover { background: #f8fafc; }
    .dark table.ep-modal-table tbody tr:hover { background: rgba(255,255,255,0.03); }
    table.ep-modal-table td { padding: 12px 14px; color: #1e293b; }
    .dark table.ep-modal-table td { color: #e2e8f0; }
    .ep-modal-foot { padding: 14px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; background: #f8fafc; flex-shrink: 0; }
    .dark .ep-modal-foot { background: #0f172a; border-color: rgba(255,255,255,0.07); }
    .ep-close-btn { padding: 9px 22px; border-radius: 11px; background: #e2e8f0; color: #475569; border: none; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s; font-family: inherit; }
    .ep-close-btn:hover { background: #cbd5e1; }
    .dark .ep-close-btn { background: rgba(255,255,255,0.08); color: #94a3b8; }
    .dark .ep-close-btn:hover { background: rgba(255,255,255,0.14); }
    @keyframes ep-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    .ep-spin { animation: ep-spin 0.8s linear infinite; display: inline-block; }
  `;

  return (
    <div
      className="ep-page"
      dir="rtl"
      style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: "'Cairo', 'Tajawal', sans-serif", minHeight: '100vh' }}
    >
      <style>{EP_STYLES}</style>

      {/* ══ HEADER ══ */}
      <div className="ep-header">
        <div className="ep-header-top">
          <div>
            <div className="ep-title-row">
              <div className="ep-icon-box"><i className="fa-solid fa-user-clock" /></div>
              <div>
                <h1 className="ep-main-title">تتبع اتصال وتواجد الموظفين</h1>
                <div style={{ marginTop: 8 }}>
                  {activeBranch ? (
                    <span className="ep-branch-badge branch">
                      <i className="fa-solid fa-code-branch" /> {activeBranch.name} ({activeBranch.code})
                    </span>
                  ) : (
                    <span className="ep-branch-badge all">
                      <i className="fa-solid fa-building-columns" /> الإدارة العامة — كافة الفروع
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="ep-subtitle">
              مراقبة مباشرة لحالة اتصال الموظفين، وقت أول دخول يومي، وإجمالي ساعات العمل الفعلية — مع عزل كامل لكل فرع وتصدير Excel فوري.
            </p>
          </div>
          <div className="ep-actions">
            <button onClick={() => setIsLiveActive(!isLiveActive)} className={`ep-btn ${isLiveActive ? 'ep-btn-live-on' : 'ep-btn-live-off'}`}>
              <span className={`ep-live-dot ${isLiveActive ? 'on' : 'off'}`} />
              {isLiveActive ? 'مباشر: مفعّل' : 'مباشر: موقف'}
            </button>
            <button onClick={() => fetchData(true)} disabled={loading} className="ep-btn ep-btn-ghost">
              <i className={`fa-solid fa-arrows-rotate ${loading ? 'ep-spin' : ''}`} /> تحديث
            </button>
            <button onClick={handleExportExcel} disabled={exporting || employees.length === 0} className="ep-btn ep-btn-excel">
              <i className="fa-solid fa-file-excel" /> {exporting ? 'جارِ التصدير...' : 'تصدير Excel'}
            </button>
          </div>
        </div>
        <div className="ep-date-strip">
          <div className="ep-date-group">
            <span className="ep-date-label">عرض بيانات يوم:</span>
            <button className={`ep-date-btn ${selectedDate === todayStr ? 'active' : 'inactive'}`} onClick={() => setQuickDate('today')}>اليوم</button>
            <button
              className={`ep-date-btn ${selectedDate !== todayStr && new Date(selectedDate).toDateString() === new Date(Date.now() - 86400000).toDateString() ? 'active' : 'inactive'}`}
              onClick={() => setQuickDate('yesterday')}
            >أمس</button>
            <div className="ep-date-input-wrap">
              <i className="fa-regular fa-calendar" style={{ color: '#38bdf8', fontSize: 12 }} />
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="ep-date-input" />
            </div>
          </div>
          <div className="ep-last-update">
            <i className="fa-regular fa-clock" /> <span>آخر تحديث: {lastUpdated.toLocaleTimeString('ar-LY')}</span>
          </div>
        </div>
      </div>

      {/* ══ KPI CARDS ══ */}
      <div className="ep-kpi-grid">
        <div className="ep-kpi-card green">
          <div className="ep-kpi-glow" />
          <div className="ep-kpi-header">
            <div>
              <p className="ep-kpi-label">متصلون الآن</p>
              <div className="ep-kpi-value">{stats?.online_now_count ?? 0}</div>
              <p className="ep-kpi-sub">نشطون على النظام الآن</p>
            </div>
            <div className="ep-kpi-icon"><i className="fa-solid fa-wifi" /></div>
          </div>
          <div className="ep-kpi-bar-wrap">
            <div className="ep-kpi-bar" style={{ width: `${stats?.total_employees ? Math.round(((stats.online_now_count || 0) / stats.total_employees) * 100) : 0}%` }} />
          </div>
        </div>

        <div className="ep-kpi-card slate">
          <div className="ep-kpi-glow" />
          <div className="ep-kpi-header">
            <div>
              <p className="ep-kpi-label">غير متصلين</p>
              <div className="ep-kpi-value">{stats?.offline_count ?? 0}</div>
              <p className="ep-kpi-sub">من إجمالي موظفي الفرع</p>
            </div>
            <div className="ep-kpi-icon"><i className="fa-solid fa-user-slash" /></div>
          </div>
          <div className="ep-kpi-bar-wrap">
            <div className="ep-kpi-bar" style={{ width: `${stats?.total_employees ? Math.round(((stats.offline_count || 0) / stats.total_employees) * 100) : 0}%` }} />
          </div>
        </div>

        <div className="ep-kpi-card blue">
          <div className="ep-kpi-glow" />
          <div className="ep-kpi-header">
            <div>
              <p className="ep-kpi-label">إجمالي ساعات التواجد</p>
              <div className="ep-kpi-value" style={{ fontSize: 22 }}>{stats?.formatted_total_duration || '0 دقيقة'}</div>
              <p className="ep-kpi-sub">معدل {stats?.average_hours ?? 0} س / موظف حضر</p>
            </div>
            <div className="ep-kpi-icon"><i className="fa-solid fa-business-time" /></div>
          </div>
          <div className="ep-kpi-bar-wrap">
            <div className="ep-kpi-bar" style={{ width: `${Math.min(100, (stats?.average_hours || 0) / 8 * 100)}%` }} />
          </div>
        </div>

        <div className="ep-kpi-card purple">
          <div className="ep-kpi-glow" />
          <div className="ep-kpi-header">
            <div>
              <p className="ep-kpi-label">إجمالي موظفي النطاق</p>
              <div className="ep-kpi-value">{stats?.total_employees ?? 0}</div>
              <p className="ep-kpi-sub">حضر منهم {stats?.attended_count ?? 0} موظف اليوم</p>
            </div>
            <div className="ep-kpi-icon"><i className="fa-solid fa-users-viewfinder" /></div>
          </div>
          <div className="ep-kpi-bar-wrap">
            <div className="ep-kpi-bar" style={{ width: `${stats?.total_employees ? Math.round(((stats.attended_count || 0) / stats.total_employees) * 100) : 0}%` }} />
          </div>
        </div>
      </div>

      {/* ══ FILTER BAR ══ */}
      <div className="ep-filter-bar">
        <div className="ep-search-wrap">
          <span className="ep-search-icon"><i className="fa-solid fa-magnifying-glass" /></span>
          <input type="text" className="ep-search-input" placeholder="بحث باسم الموظف أو الرقم الوطني أو المسمى..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="ep-filter-group">
          <div className="ep-tabs">
            <button className={`ep-tab ${filterStatus === 'all' ? 'active-all' : 'inactive'}`} onClick={() => setFilterStatus('all')}>
              الكل ({stats?.total_employees ?? employees.length})
            </button>
            <button className={`ep-tab ${filterStatus === 'online' ? 'active-online' : 'inactive'}`} onClick={() => setFilterStatus('online')}>
              <span className="ep-sdot online" /> متصل ({stats?.online_now_count ?? 0})
            </button>
            <button className={`ep-tab ${filterStatus === 'offline' ? 'active-offline' : 'inactive'}`} onClick={() => setFilterStatus('offline')}>
              <span className="ep-sdot offline" /> غير متصل ({stats?.offline_count ?? 0})
            </button>
          </div>
          {departmentsList.length > 0 && (
            <select className="ep-select" value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
              <option value="all">كافة الأقسام</option>
              {departmentsList.map(dep => <option key={dep.id} value={dep.id}>{dep.name}</option>)}
            </select>
          )}
          {(searchQuery || filterStatus !== 'all' || filterDepartment !== 'all') && (
            <button className="ep-clear-btn" onClick={() => { setSearchQuery(''); setFilterStatus('all'); setFilterDepartment('all'); }}>
              <i className="fa-solid fa-xmark" /> مسح الفلاتر
            </button>
          )}
        </div>
      </div>

      {/* ══ TABLE ══ */}
      <div className="ep-table-card">
        <div className="ep-table-header-bar">
          <h3><i className="fa-solid fa-table-list" style={{ marginLeft: 8, color: '#0ea5e9' }} />سجل الحضور والتواجد</h3>
          <span className="ep-table-count">{employees.length} موظف</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="ep-table">
            <thead>
              <tr>
                <th>الموظف</th>
                <th>الفرع / القسم</th>
                <th style={{ textAlign: 'center' }}>حالة الاتصال</th>
                <th>أول دخول</th>
                <th>آخر نشاط</th>
                <th style={{ textAlign: 'center' }}>مدة التواجد اليوم</th>
                <th style={{ textAlign: 'center' }}>الجلسات</th>
                <th style={{ textAlign: 'center' }}>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}>
                  <div className="ep-state-cell">
                    <div className="ep-state-icon-wrap"><i className="fa-solid fa-circle-notch ep-spin" style={{ color: '#0ea5e9', fontSize: 28 }} /></div>
                    <p className="ep-state-title">جارِ تحميل البيانات...</p>
                    <p className="ep-state-sub">يرجى الانتظار</p>
                  </div>
                </td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="ep-state-cell">
                    <div className="ep-state-icon-wrap"><i className="fa-solid fa-users-slash" /></div>
                    <p className="ep-state-title">لا يوجد موظفون يطابقون البحث</p>
                    <p className="ep-state-sub">جرب تغيير التاريخ أو إلغاء التصفية</p>
                  </div>
                </td></tr>
              ) : (
                employees.map((emp) => {
                  const att = emp.attendance;
                  const isOnline = emp.is_online;
                  const onlineSeconds = att?.total_online_seconds || 0;
                  const progressPct = Math.min(100, Math.round((onlineSeconds / 28800) * 100));
                  const progressClass = progressPct >= 100 ? 'full' : progressPct >= 50 ? 'half' : 'low';
                  return (
                    <tr key={emp.id} className={isOnline ? 'ep-row-online' : ''}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div className="ep-avatar-wrap">
                            {emp.profile_photo_url
                              ? <img src={emp.profile_photo_url} alt={emp.name} className="ep-avatar" />
                              : <div className="ep-avatar-initials">{emp.name.charAt(0)}</div>
                            }
                            <span className={`ep-avatar-beacon ${isOnline ? 'online' : 'offline'}`} />
                          </div>
                          <div>
                            <div className="ep-emp-name">{emp.full_name_quad || emp.name}</div>
                            <div className="ep-emp-meta">
                              {emp.job_title}
                              {emp.national_id_number && <><span style={{ margin: '0 5px', opacity: 0.4 }}>•</span><span style={{ fontFamily: 'monospace', fontSize: 10.5 }}>{emp.national_id_number}</span></>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="ep-branch-tag">{emp.branch?.name || activeBranch?.name || 'المركز الرئيسي'}</span>
                        {emp.department && <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 1 }}>{emp.department.name}</div>}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`ep-status-badge ${isOnline ? 'online' : 'offline'}`}>
                          <span className="ep-bdot" />
                          {isOnline ? 'متصل الآن' : 'غير متصل'}
                        </span>
                      </td>
                      <td>
                        {att?.first_login_time
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <i className="fa-regular fa-clock" style={{ color: '#0ea5e9', fontSize: 12 }} />
                              <span style={{ fontFamily: 'monospace', fontSize: 12.5, fontWeight: 700 }}>{att.first_login_time}</span>
                            </div>
                          : <span style={{ fontSize: 11.5, color: '#94a3b8' }}>لم يسجل دخول</span>
                        }
                      </td>
                      <td>
                        {isOnline
                          ? <span style={{ color: '#059669', fontWeight: 800, fontSize: 12 }}>نشط الآن</span>
                          : att?.last_activity_time
                            ? <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{att.last_activity_time}</span>
                            : emp.last_seen_diff
                              ? <span style={{ fontSize: 11, color: '#94a3b8' }}>{emp.last_seen_diff}</span>
                              : <span style={{ color: '#94a3b8' }}>—</span>
                        }
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {onlineSeconds > 0
                          ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <span className="ep-duration-val">{att?.formatted_duration}</span>
                              <div className="ep-progress-bar-wrap">
                                <div className={`ep-progress-bar ${progressClass}`} style={{ width: `${progressPct}%` }} />
                              </div>
                              <span className="ep-progress-pct">{progressPct}% من 8 س</span>
                            </div>
                          : <span style={{ fontSize: 12, color: '#94a3b8' }}>0 دقيقة</span>
                        }
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="ep-sessions-badge">{att?.sessions_count || (att ? 1 : 0)}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button className="ep-history-btn" onClick={() => openEmployeeHistory(emp)}>
                          <i className="fa-solid fa-chart-line" /> السجل
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ HISTORY MODAL ══ */}
      {selectedEmployeeForHistory && (
        <div className="ep-modal-overlay" onClick={() => setSelectedEmployeeForHistory(null)}>
          <div className="ep-modal" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="ep-modal-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="ep-modal-head-icon"><i className="fa-solid fa-user-clock" /></div>
                <div>
                  <h3>سجل حضور: {selectedEmployeeForHistory.full_name_quad || selectedEmployeeForHistory.name}</h3>
                  <p>
                    {selectedEmployeeForHistory.job_title}
                    {(selectedEmployeeForHistory.branch?.name || activeBranch?.name) && (
                      <> &bull; {selectedEmployeeForHistory.branch?.name || activeBranch?.name}</>
                    )}
                  </p>
                </div>
              </div>
              <button className="ep-modal-close" onClick={() => setSelectedEmployeeForHistory(null)}><i className="fa-solid fa-xmark" /></button>
            </div>

            <div className="ep-modal-body">
              {historyLoading ? (
                <div className="ep-state-cell">
                  <div className="ep-state-icon-wrap"><i className="fa-solid fa-circle-notch ep-spin" style={{ color: '#0ea5e9', fontSize: 28 }} /></div>
                  <p className="ep-state-title">جارِ تحميل السجل التاريخي...</p>
                </div>
              ) : employeeHistory.length === 0 ? (
                <div className="ep-state-cell">
                  <div className="ep-state-icon-wrap"><i className="fa-regular fa-calendar-xmark" /></div>
                  <p className="ep-state-title">لا يوجد سجل تواجد مسجل</p>
                  <p className="ep-state-sub">لا توجد بيانات حضور سابقة لهذا الموظف</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, padding: '0 2px' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#475569' }}>سجل آخر 30 يوم</span>
                    <span className="ep-table-count">{employeeHistory.length} سجل</span>
                  </div>
                  <div className="ep-modal-table-wrap">
                    <table className="ep-modal-table">
                      <thead><tr>
                        <th>التاريخ</th><th>أول دخول</th><th>آخر نشاط</th>
                        <th style={{ textAlign: 'center' }}>مدة التواجد</th>
                        <th style={{ textAlign: 'center' }}>الجلسات</th>
                        <th>IP الدخول</th>
                      </tr></thead>
                      <tbody>
                        {employeeHistory.map((h) => {
                          const hrs = h.duration_hours || 0;
                          return (
                            <tr key={h.id}>
                              <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{h.date}</td>
                              <td style={{ fontFamily: 'monospace' }}>{h.first_login_time || (h.first_login_at ? h.first_login_at.substring(11, 16) : '—')}</td>
                              <td style={{ fontFamily: 'monospace' }}>{h.last_activity_time || (h.last_activity_at ? h.last_activity_at.substring(11, 16) : '—')}</td>
                              <td style={{ textAlign: 'center' }}>
                                <span style={{ fontWeight: 800, fontSize: 12.5, color: hrs >= 6 ? '#059669' : hrs >= 3 ? '#0284c7' : '#f59e0b' }}>{h.formatted_duration}</span>
                              </td>
                              <td style={{ textAlign: 'center' }}><span className="ep-sessions-badge">{h.sessions_count}</span></td>
                              <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>{h.login_ip || '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="ep-modal-foot">
              <button className="ep-close-btn" onClick={() => setSelectedEmployeeForHistory(null)}>
                <i className="fa-solid fa-xmark" style={{ marginLeft: 6 }} /> إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}