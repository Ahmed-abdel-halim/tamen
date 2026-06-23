import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE_URL } from '../config/api'
import { showToast } from './Toast'

const playSynthesizedNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // First tone (pleasant chime)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.6);
    
    // Second tone delayed for harmony (F#5)
    setTimeout(() => {
      try {
        if (ctx.state === 'closed') return;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(739.99, ctx.currentTime); // F#5
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
        
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.8);
      } catch (e) {
        // Catch issues silently
      }
    }, 120);
  } catch (e) {
    console.error('Audio synthesis failed:', e);
  }
};

const playNotificationSound = () => {
  try {
    const base = window.location.origin + (import.meta.env.BASE_URL || '/');
    const audioUrl = new URL('sounds/notification.mp3', base).toString();
    console.log('🔊 Attempting to play notification sound from:', audioUrl);
    
    const audio = new Audio(audioUrl);
    audio.play()
      .then(() => {
        console.log('✅ Notification sound played successfully.');
      })
      .catch((err) => {
        console.warn('⚠️ MP3 playback blocked/failed, falling back to Web Audio API synthesis:', err);
        playSynthesizedNotificationSound();
      });
  } catch (error) {
    console.error('❌ Audio playback setup error, falling back to synthesis:', error);
    playSynthesizedNotificationSound();
  }
};

type TopbarProps = {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  showSidebarToggle?: boolean;
}

export function Topbar({ onToggleSidebar, isSidebarOpen, showSidebarToggle = false }: TopbarProps) {
  const navigate = useNavigate()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [userName, setUserName] = useState('المستخدم')
  const [branchAgentId, setBranchAgentId] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')

  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

  const unreadCountRef = useRef(0)
  useEffect(() => {
    unreadCountRef.current = unreadCount
  }, [unreadCount])

  const fetchNotifications = async (showToasts = false) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const countRes = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!countRes.ok) return;
      const countData = await countRes.json();
      const newCount = countData.unread_count;

      if (newCount !== unreadCountRef.current || notifications.length === 0) {
        const listRes = await fetch(`${API_BASE_URL}/notifications`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          setNotifications(listData);
          
          if (showToasts && newCount > unreadCountRef.current && listData.length > 0) {
            const latest = listData[0];
            if (latest && !latest.read_at) {
              const toastType = (latest.type === 'error' || latest.type === 'warning' || latest.type === 'rejected') ? 'error' : 'success';
              showToast(`${latest.title}: ${latest.message}`, toastType);
              playNotificationSound();
            }
          }
        }
      }
      
      setUnreadCount(newCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications(false);

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string, actionUrl: string | null) => {
    setIsNotificationOpen(false);
    setNotifications(prev => prev.map((n: any) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));

    const token = localStorage.getItem('token');
    if (!token) {
      if (actionUrl) navigate(actionUrl);
      return;
    }

    try {
      await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }

    if (actionUrl) {
      navigate(actionUrl);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications(prev => prev.map((n: any) => ({ ...n, read_at: new Date().toISOString() })));
    setUnreadCount(0);

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      showToast('تم تحديد جميع الإشعارات كمقروءة', 'success');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const toggleNotifications = () => {
    setIsNotificationOpen(prev => !prev);
    if (!isNotificationOpen) {
      fetchNotifications(false);
    }
  };

  const getNotificationIcon = (type?: string) => {
    switch (type) {
      case 'success': return 'fa-solid fa-circle-check';
      case 'warning': return 'fa-solid fa-circle-exclamation';
      case 'error': return 'fa-solid fa-circle-xmark';
      default: return 'fa-solid fa-circle-info';
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'الآن';
      if (diffMins < 60) return `منذ ${diffMins} د`;
      if (diffHours < 24) return `منذ ${diffHours} س`;
      if (diffDays === 1) return 'أمس';
      return date.toLocaleDateString('ar-LY', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }

  useEffect(() => {
    const loadUser = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          setUserName(user.name || user.username || 'المستخدم');
          setBranchAgentId(user.branch_agent_id || null);
        } catch {
          // إذا كان string قديم
          setUserName(userStr || 'المستخدم');
          setBranchAgentId(null);
        }
      } else {
        setUserName('المستخدم');
        setBranchAgentId(null);
      }
    };
    
    loadUser();
    
    // استمع لتحديث المستخدم من UsersList
    const handleUserUpdate = (e: CustomEvent) => {
      const updatedUser = e.detail;
      setUserName(updatedUser.name || updatedUser.username || 'المستخدم');
      setBranchAgentId(updatedUser.branch_agent_id || null);
    };
    
    window.addEventListener('userUpdated', handleUserUpdate as EventListener);
    window.addEventListener('userLoggedIn', loadUser);
    window.addEventListener('storage', loadUser);
    
    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate as EventListener);
      window.removeEventListener('userLoggedIn', loadUser);
      window.removeEventListener('storage', loadUser);
    };
  }, [])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  const toggleUserMenu = () => {
    setIsUserMenuOpen((current) => !current)
  }

  const toggleFullscreen = () => {
    const doc: any = document
    const docEl: any = document.documentElement

    if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
      if (docEl.requestFullscreen) docEl.requestFullscreen()
      else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen()
      else if (docEl.mozRequestFullScreen) docEl.mozRequestFullScreen()
      else if (docEl.msRequestFullscreen) docEl.msRequestFullscreen()
      setIsFullscreen(true)
    } else {
      if (doc.exitFullscreen) doc.exitFullscreen()
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen()
      else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen()
      else if (doc.msExitFullscreen) doc.msExitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    // إرسال event لتحديث البيانات في الصفحة
    window.dispatchEvent(new CustomEvent('refreshData'))
    // إعادة تحميل الصفحة بعد ثانية
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        {showSidebarToggle && (
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={isSidebarOpen ? 'إغلاق القائمة الجانبية' : 'فتح القائمة الجانبية'}
            aria-expanded={isSidebarOpen}
            onClick={onToggleSidebar}
          >
            <i
              className={isSidebarOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars'}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      <div className="topbar-right">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="icon-button subtle"
          type="button"
          aria-label="زيارة الموقع"
          title="زيارة الموقع"
        >
          <i
            className="fa-solid fa-globe"
            aria-hidden="true"
          />
        </a>

        <button
          className="icon-button subtle theme-toggle"
          type="button"
          aria-label={theme === 'light' ? 'تفعيل النمط الليلي' : 'تفعيل النمط النهاري'}
          title={theme === 'light' ? 'النمط الليلي' : 'النمط النهاري'}
          onClick={toggleTheme}
        >
          <i className={`fa-solid ${theme === 'light' ? 'fa-moon' : 'fa-sun'}`} aria-hidden="true" />
        </button>

        <button
          className="icon-button subtle sync-toggle"
          type="button"
          aria-label="تحديث البيانات"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <i
            className={`fa-solid fa-rotate ${isRefreshing ? 'fa-spin' : ''}`}
            aria-hidden="true"
          />
        </button>
        <button
          className="icon-button subtle fullscreen-toggle"
          type="button"
          aria-label="تفعيل نمط الشاشة الكاملة"
          onClick={toggleFullscreen}
        >
          <i
            className={isFullscreen ? 'fa-regular fa-window-restore' : 'fa-regular fa-window-maximize'}
            aria-hidden="true"
          />
        </button>

        {/* جرس الإشعارات المتكامل */}
        <div className="notification-container" ref={notificationRef}>
          <button
            className="icon-button subtle notification-trigger"
            type="button"
            aria-label="الإشعارات"
            onClick={toggleNotifications}
            title="الإشعارات"
          >
            <i className="fa-regular fa-bell" aria-hidden="true" />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          <div className={`notification-dropdown${isNotificationOpen ? ' is-open' : ''}`}>
            <div className="notification-header">
              <h3>الإشعارات</h3>
              {unreadCount > 0 && (
                <button type="button" className="notification-mark-all" onClick={handleMarkAllAsRead}>
                  تحديد الكل كمقروء
                </button>
              )}
            </div>
            <div className="notification-list custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="notification-empty">
                  <i className="fa-regular fa-bell-slash" />
                  <p>لا توجد إشعارات حالياً</p>
                </div>
              ) : (
                notifications.map((n: any) => (
                  <div
                    key={n.id}
                    className={`notification-item${!n.read_at ? ' unread' : ''}`}
                    onClick={() => { handleMarkAsRead(n.id, n.action_url); }}
                  >
                    <div className={`notification-icon-container ${n.type || 'info'}`}>
                      <i className={getNotificationIcon(n.type)} aria-hidden="true" />
                    </div>
                    <div className="notification-content">
                      <div className="notification-title-text">{n.title}</div>
                      <div className="notification-message-text">{n.message}</div>
                      <div className="notification-time-text">{formatTime(n.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="notification-footer">
              <button 
                type="button" 
                className="notification-view-all-btn font-cairo"
                onClick={() => { navigate('/notifications'); setIsNotificationOpen(false); }}
              >
                <i className="fa-solid fa-list"></i>
                عرض جميع الإشعارات
              </button>
            </div>
          </div>
        </div>

        <div className="topbar-user" ref={userMenuRef}>
          <button
            type="button"
            className="user-trigger"
            onClick={toggleUserMenu}
            aria-haspopup="menu"
            aria-expanded={isUserMenuOpen}
          >
            <span className="user-chip">
              <i className="fa-regular fa-circle-user" aria-hidden="true" />
              <span className="user-meta">
                <span className="user-name">{userName}</span>
              </span>
            </span>
            <i className="fa-solid fa-chevron-down" aria-hidden="true" />
          </button>
          <div className={`user-menu${isUserMenuOpen ? ' is-open' : ''}`} role="menu">
            <button type="button" onClick={() => {
              if (branchAgentId) {
                navigate(`/branches-agents/${branchAgentId}?tab=agency`);
              } else {
                navigate('/profile');
              }
              setIsUserMenuOpen(false);
            }}>
              <i className="fa-regular fa-user" aria-hidden="true" />
              الملف الشخصي
            </button>
            <button 
              type="button"
              onClick={() => {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                navigate('/login');
              }}
            >
              <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
