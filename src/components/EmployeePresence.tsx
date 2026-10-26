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

  // Data states
  const [employees, setEmployees] = useState<EmployeePresenceItem[]>([]);
  const [stats, setStats] = useState<PresenceStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline'>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [departmentsList, setDepartmentsList] = useState<{ id: number; name: string }[]>([]);

  // Live auto-refresh
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // History Modal
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState<EmployeePresenceItem | null>(null);
  const [employeeHistory, setEmployeeHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);

  // Listen to branch change from Topbar
  useEffect(() => {
    const handleBranchChanged = (e: any) => {
      setActiveBranchState(e.detail || getActiveBranch());
    };
    window.addEventListener('branchChanged', handleBranchChanged);
    return () => window.removeEventListener('branchChanged', handleBranchChanged);
  }, []);

  // Fetch departments for filter
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
        if (Array.isArray(data)) {
          setDepartmentsList(data);
        } else if (Array.isArray(data.data)) {
          setDepartmentsList(data.data);
        }
      })
      .catch(err => console.error('Error fetching departments:', err));
  }, [activeBranch]);

  // Fetch attendance list and stats
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
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...getBranchHeaders()
          }
        }),
        fetch(`${API_BASE_URL}/employee-presence/stats?date=${selectedDate}`, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...getBranchHeaders()
          }
        })
      ]);

      if (listRes.ok) {
        const listData = await listRes.json();
        setEmployees(listData.data || []);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching employee presence data:', error);
      showToast('تعذر تحميل بيانات تواجد الموظفين', 'error');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [selectedDate, searchQuery, filterStatus, filterDepartment, activeBranch]);

  // Initial and dependencies load
  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  // Live interval polling (every 30 seconds if live is enabled)
  useEffect(() => {
    if (!isLiveActive) return;
    const interval = setInterval(() => {
      fetchData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [isLiveActive, fetchData]);

  // Fetch employee 30-day history
  const openEmployeeHistory = async (emp: EmployeePresenceItem) => {
    setSelectedEmployeeForHistory(emp);
    setHistoryLoading(true);
    setEmployeeHistory([]);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_BASE_URL}/employee-presence/${emp.id}/history`, {
        headers: {
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployeeHistory(data.history || []);
      } else {
        showToast('تعذر جلب السجل التاريخي للموظف', 'error');
      }
    } catch (err) {
      console.error('Error fetching user history:', err);
      showToast('خطأ في الاتصال بالخادم', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (employees.length === 0) {
      showToast('لا توجد بيانات موظفين للتصدير', 'error');
      return;
    }

    setExporting(true);
    try {
      const branchTitle = activeBranch ? activeBranch.name : 'الإدارة العامة (كافة الفروع)';
      const formattedDate = selectedDate;

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

      const excelData = employees.map((emp, index) => {
        return {
          idx: index + 1,
          name: emp.full_name_quad || emp.name,
          national_id: emp.national_id_number || '-',
          branch: emp.branch ? emp.branch.name : (activeBranch?.name || 'المركز الرئيسي'),
          department: emp.department ? emp.department.name : '-',
          job_title: emp.job_title || 'موظف',
          status_label: emp.is_online ? 'متصل الآن 🟢' : 'غير متصل ⚪',
          first_login: emp.attendance?.first_login_time || (emp.attendance?.first_login_at ? emp.attendance.first_login_at.substring(11, 16) : 'لم يسجل دخول'),
          last_activity: emp.is_online ? 'نشط الآن' : (emp.attendance?.last_activity_time || (emp.attendance?.last_activity_at ? emp.attendance.last_activity_at.substring(11, 16) : '-')),
          formatted_duration: emp.attendance?.formatted_duration || '0 دقيقة',
          hours_num: emp.attendance?.duration_hours || 0,
          sessions: emp.attendance?.sessions_count || (emp.attendance ? 1 : 0),
        };
      });

      await generatePremiumExcel({
        title: 'كشف حضور وتواجد الموظفين وحالة الاتصال',
        subtitle: `الفرع: ${branchTitle} | تاريخ الكشف: ${formattedDate} | إجمالي المتصلين: ${stats?.online_now_count || 0} من أصل ${stats?.total_employees || employees.length}`,
        columns: excelColumns,
        data: excelData,
        fileName: `سجل_حضور_واتصال_الموظفين_${formattedDate}_${branchTitle.replace(/\s+/g, '_')}.xlsx`,
      });

      showToast('تم تصدير ملف الإكسل بنجاح', 'success');
    } catch (err) {
      console.error('Error generating excel:', err);
      showToast('حدث خطأ أثناء تصدير ملف الإكسل', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Helper for quick date selection
  const setQuickDate = (type: 'today' | 'yesterday') => {
    if (type === 'today') {
      setSelectedDate(todayStr);
    } else if (type === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" dir="rtl">
      
      {/* 1. Header Section */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-blue-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-2xl pointer-events-none translate-x-1/3 translate-y-1/3"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl text-sky-400 text-xl inline-flex items-center justify-center border border-white/10">
                <i className="fa-solid fa-user-clock"></i>
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                تتبع اتصال وتواجد الموظفين
              </h1>
              {activeBranch ? (
                <span className="px-3 py-1 bg-sky-500/20 text-sky-200 border border-sky-400/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <i className="fa-solid fa-code-branch text-sky-300"></i>
                  {activeBranch.name} ({activeBranch.code})
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 rounded-full text-xs font-bold flex items-center gap-1.5">
                  <i className="fa-solid fa-building-columns text-emerald-300"></i>
                  الإدارة العامة (كافة الفروع)
                </span>
              )}
            </div>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              متابعة مباشرة لحظة بلحظة لحالة اتصال الموظفين (متصل الآن / غير متصل)، تسجيل وقت أول دخول يومي، واحتساب إجمالي ساعات العمل الفعلية مع عزل كامل لكل فرع وتصدير إكسل فوري.
            </p>
          </div>

          {/* Action Bar inside Header */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live Indicator Toggle */}
            <button
              onClick={() => setIsLiveActive(!isLiveActive)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                isLiveActive
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40 shadow-lg shadow-emerald-950/40'
                  : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/15'
              }`}
              title="تفعيل/تعطيل التحديث التلقائي اللحظي كل 30 ثانية"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isLiveActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`}></span>
              {isLiveActive ? 'المتابعة المباشرة: مفعّلة' : 'المتابعة المباشرة: متوقفة'}
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-white/15 disabled:opacity-50"
              title="تحديث فوري للبيانات"
            >
              <i className={`fa-solid fa-arrows-rotate ${loading ? 'fa-spin' : ''}`}></i>
              <span>تحديث</span>
            </button>

            {/* Excel Export Button */}
            <button
              onClick={handleExportExcel}
              disabled={exporting || employees.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition shadow-lg shadow-emerald-900/30 flex items-center gap-2 border border-emerald-400/30 disabled:opacity-50"
            >
              <i className="fa-solid fa-file-excel text-base"></i>
              <span>{exporting ? 'جارِ التصدير...' : 'تصدير إكسل (Excel)'}</span>
            </button>
          </div>
        </div>

        {/* Date Selector Strip in Header */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-300 font-semibold">عرض بيانات يوم:</span>
            <button
              onClick={() => setQuickDate('today')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                selectedDate === todayStr
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-900/40'
                  : 'bg-white/10 text-slate-300 hover:bg-white/15'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setQuickDate('yesterday')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                selectedDate !== todayStr && new Date(selectedDate).toDateString() === new Date(Date.now() - 86400000).toDateString()
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-900/40'
                  : 'bg-white/10 text-slate-300 hover:bg-white/15'
              }`}
            >
              أمس
            </button>
            <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg border border-white/15">
              <i className="fa-regular fa-calendar text-sky-300"></i>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white text-xs outline-none cursor-pointer [color-scheme:dark]"
              />
            </div>
          </div>

          <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
            <i className="fa-regular fa-clock"></i>
            <span>آخر تحديث: {lastUpdated.toLocaleTimeString('ar-LY')}</span>
          </div>
        </div>
      </div>

      {/* 2. Stat Cards (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Online Now */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                الموظفون المتصلون الآن
              </p>
              <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {stats?.online_now_count ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                <span>نشط حالياً على النظام</span>
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl shadow-inner">
              <i className="fa-solid fa-wifi"></i>
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats?.total_employees ? Math.round(((stats.online_now_count || 0) / stats.total_employees) * 100) : 0}%`
              }}
            ></div>
          </div>
        </div>

        {/* Stat 2: Offline */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                غير متصلين حالياً
              </p>
              <h3 className="text-3xl font-black text-slate-700 dark:text-slate-200">
                {stats?.offline_count ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                من إجمالي موظفي الفرع
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-500 dark:text-slate-300 text-2xl shadow-inner">
              <i className="fa-solid fa-user-slash"></i>
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-slate-400 h-full rounded-full transition-all duration-500"
              style={{
                width: `${stats?.total_employees ? Math.round(((stats.offline_count || 0) / stats.total_employees) * 100) : 0}%`
              }}
            ></div>
          </div>
        </div>

        {/* Stat 3: Total Online Time Recorded */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                إجمالي ساعات التواجد المسجلة
              </p>
              <h3 className="text-2xl lg:text-3xl font-black text-sky-600 dark:text-sky-400">
                {stats?.formatted_total_duration || '0 دقيقة'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                معدل {stats?.average_hours ?? 0} س لكل موظف حضر
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/40 flex items-center justify-center text-sky-600 dark:text-sky-400 text-2xl shadow-inner">
              <i className="fa-solid fa-business-time"></i>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-sky-600 dark:text-sky-300 font-bold">
            سجل اليوم يعاد حسابه يومياً تلقائياً
          </div>
        </div>

        {/* Stat 4: Total Employees in Branch */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                إجمالي موظفي النطاق
              </p>
              <h3 className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
                {stats?.total_employees ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                حضر منهم {stats?.attended_count ?? 0} موظف اليوم
              </p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-2xl shadow-inner">
              <i className="fa-solid fa-users-viewfinder"></i>
            </div>
          </div>
          <div className="mt-3 text-[10px] text-indigo-600 dark:text-indigo-300 font-bold">
            معزول حسب صلاحيات الفرع النشط
          </div>
        </div>
      </div>

      {/* 3. Search and Filter Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
            <i className="fa-solid fa-magnifying-glass"></i>
          </span>
          <input
            type="text"
            placeholder="بحث باسم الموظف أو الرقم الوطني أو المسمى..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition"
          />
        </div>

        {/* Filter Badges: Status & Department */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition ${
                filterStatus === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              الكل ({stats?.total_employees ?? employees.length})
            </button>
            <button
              onClick={() => setFilterStatus('online')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                filterStatus === 'online'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              متصل ({stats?.online_now_count ?? 0})
            </button>
            <button
              onClick={() => setFilterStatus('offline')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                filterStatus === 'offline'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              غير متصل ({stats?.offline_count ?? 0})
            </button>
          </div>

          {/* Department Filter */}
          {departmentsList.length > 0 && (
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="all">كافة الأقسام</option>
              {departmentsList.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.name}</option>
              ))}
            </select>
          )}

          {/* Clear Filters Button */}
          {(searchQuery || filterStatus !== 'all' || filterDepartment !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
                setFilterDepartment('all');
              }}
              className="px-3 py-2 bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 rounded-xl text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1"
            >
              <i className="fa-solid fa-xmark"></i>
              <span>إلغاء التصفية</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Main Employees Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">الموظف</th>
                <th className="py-3.5 px-3">الفرع والقسم</th>
                <th className="py-3.5 px-3 text-center">حالة الاتصال الآن</th>
                <th className="py-3.5 px-3">أول دخول (Check-in)</th>
                <th className="py-3.5 px-3">آخر نشاط</th>
                <th className="py-3.5 px-3 text-center">إجمالي وقت التواجد اليوم</th>
                <th className="py-3.5 px-3 text-center">الجلسات</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-sky-500"></i>
                    <p className="font-bold">جارِ تحميل بيانات تواجد الموظفين...</p>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3 text-2xl text-slate-400">
                      <i className="fa-solid fa-users-slash"></i>
                    </div>
                    <p className="font-extrabold text-sm text-slate-600 dark:text-slate-300">
                      لا يوجد موظفون يطابقون خيارات البحث أو التصفية
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      جرب تغيير التاريخ أو تفريغ كلمات البحث
                    </p>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const att = emp.attendance;
                  const isOnline = emp.is_online;
                  const onlineSeconds = att?.total_online_seconds || 0;
                  // Daily progress bar (out of standard 8 hours = 28800s)
                  const progressPct = Math.min(100, Math.round((onlineSeconds / 28800) * 100));

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* 1. Employee Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {/* Avatar with Status Beacon */}
                          <div className="relative">
                            {emp.profile_photo_url ? (
                              <img
                                src={emp.profile_photo_url}
                                alt={emp.name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 text-white font-black flex items-center justify-center text-sm shadow-sm">
                                {emp.name.charAt(0)}
                              </div>
                            )}
                            <span
                              className={`absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 ${
                                isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                              title={isOnline ? 'متصل الآن' : 'غير متصل'}
                            ></span>
                          </div>

                          <div>
                            <div className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
                              <span>{emp.full_name_quad || emp.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{emp.job_title}</span>
                              {emp.national_id_number && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-[10px]">{emp.national_id_number}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Branch & Department */}
                      <td className="py-3.5 px-3">
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded font-semibold text-[10.5px] border border-blue-200/50 dark:border-blue-800/40">
                            {emp.branch?.name || activeBranch?.name || 'المركز الرئيسي'}
                          </span>
                          {emp.department && (
                            <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                              {emp.department.name}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Live Status Badge */}
                      <td className="py-3.5 px-3 text-center">
                        {isOnline ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-extrabold text-[11px] border border-emerald-200 dark:border-emerald-800/50 shadow-sm shadow-emerald-900/10">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>متصل الآن</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-bold text-[11px] border border-slate-200 dark:border-slate-600">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            <span>غير متصل</span>
                          </div>
                        )}
                      </td>

                      {/* 4. First Login Time (Check-in) */}
                      <td className="py-3.5 px-3 font-mono text-[11.5px]">
                        {att?.first_login_time ? (
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200 font-bold">
                            <i className="fa-regular fa-clock text-sky-500"></i>
                            <span>{att.first_login_time}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-sans text-[11px]">
                            لم يسجل دخول
                          </span>
                        )}
                      </td>

                      {/* 5. Last Activity */}
                      <td className="py-3.5 px-3">
                        {isOnline ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px]">
                            نشط الآن
                          </span>
                        ) : att?.last_activity_time ? (
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                            {att.last_activity_time}
                          </div>
                        ) : emp.last_seen_diff ? (
                          <span className="text-slate-400 text-[11px]">
                            {emp.last_seen_diff}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* 6. Total Online Duration with Progress Bar */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col items-center">
                          <span className={`font-black text-xs ${
                            onlineSeconds > 0 ? 'text-sky-700 dark:text-sky-300' : 'text-slate-400'
                          }`}>
                            {att?.formatted_duration || '0 دقيقة'}
                          </span>
                          {/* 8-Hour Workday Gauge */}
                          <div className="w-24 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                progressPct >= 100
                                  ? 'bg-emerald-500'
                                  : progressPct >= 50
                                  ? 'bg-sky-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            ></div>
                          </div>
                          <span className="text-[9.5px] text-slate-400 mt-0.5">
                            {progressPct}% من 8 ساعات
                          </span>
                        </div>
                      </td>

                      {/* 7. Sessions Count */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-md font-bold text-slate-600 dark:text-slate-300 text-[11px]">
                          {att?.sessions_count || (att ? 1 : 0)}
                        </span>
                      </td>

                      {/* 8. History / Details Action */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => openEmployeeHistory(emp)}
                          className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 mx-auto border border-sky-200/60 dark:border-sky-800/40"
                          title="عرض سجل حضور وتواجد هذا الموظف للأيام السابقة"
                        >
                          <i className="fa-solid fa-chart-line"></i>
                          <span>السجل</span>
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

      {/* 5. Employee History Modal */}
      {selectedEmployeeForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-3xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-sky-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sky-400 text-lg border border-white/10">
                  <i className="fa-solid fa-user-clock"></i>
                </div>
                <div>
                  <h3 className="font-black text-base">
                    سجل حضور وتواجد: {selectedEmployeeForHistory.name}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {selectedEmployeeForHistory.job_title} • {selectedEmployeeForHistory.branch?.name || activeBranch?.name || 'الفرع الرئيسي'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployeeForHistory(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 border-b pb-2">
                <span className="font-bold">سجل الأيام السابقة (آخر 30 يوم):</span>
                <span>عدد السجلات: {employeeHistory.length}</span>
              </div>

              {historyLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <i className="fa-solid fa-circle-notch fa-spin text-2xl mb-2 text-sky-500"></i>
                  <p className="font-bold">جارِ تحميل السجل التاريخي للموظف...</p>
                </div>
              ) : employeeHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <i className="fa-regular fa-calendar-xmark text-3xl mb-2 text-slate-300"></i>
                  <p className="font-bold">لا يوجد سجل تواجد سابق مسجل لهذا الموظف</p>
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-extrabold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">التاريخ</th>
                        <th className="py-2.5 px-3">أول دخول</th>
                        <th className="py-2.5 px-3">آخر نشاط</th>
                        <th className="py-2.5 px-3 text-center">مدة التواجد</th>
                        <th className="py-2.5 px-3 text-center">الجلسات</th>
                        <th className="py-2.5 px-3 text-left">IP الدخول</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {employeeHistory.map((h) => (
                        <tr key={h.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-bold font-mono text-slate-800 dark:text-slate-200">
                            {h.date}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {h.first_login_time || (h.first_login_at ? h.first_login_at.substring(11, 16) : '-')}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                            {h.last_activity_time || (h.last_activity_at ? h.last_activity_at.substring(11, 16) : '-')}
                          </td>
                          <td className="py-2.5 px-3 text-center font-extrabold text-sky-600">
                            {h.formatted_duration}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            {h.sessions_count}
                          </td>
                          <td className="py-2.5 px-3 text-left font-mono text-[10px] text-slate-400">
                            {h.login_ip || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setSelectedEmployeeForHistory(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
