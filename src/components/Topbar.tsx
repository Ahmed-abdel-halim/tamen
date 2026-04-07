import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')

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
        } catch {
          // إذا كان string قديم
          setUserName(userStr || 'المستخدم');
        }
      } else {
        setUserName('المستخدم');
      }
    };
    
    loadUser();
    
    // استمع لتحديث المستخدم من UsersList
    const handleUserUpdate = (e: CustomEvent) => {
      const updatedUser = e.detail;
      setUserName(updatedUser.name || updatedUser.username || 'المستخدم');
    };
    
    window.addEventListener('userUpdated', handleUserUpdate as EventListener);
    
    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate as EventListener);
    };
  }, [])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!userMenuRef.current) return
      if (userMenuRef.current.contains(event.target as Node)) return
      setIsUserMenuOpen(false)
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
            <button type="button" onClick={() => { navigate('/profile'); setIsUserMenuOpen(false); }}>
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
