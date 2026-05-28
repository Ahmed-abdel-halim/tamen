import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { showToast } from './Toast';

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('فشل جلب الإشعارات');
      const data = await res.json();
      setNotifications(data);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: string, actionUrl: string | null) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));

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
    const token = localStorage.getItem('token');
    if (!token) return;

    setActionLoading(true);
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));

    try {
      const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        showToast('تم تحديد جميع الإشعارات كمقروءة', 'success');
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
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
      return date.toLocaleString('ar-LY', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return '';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read_at;
    if (filter === 'read') return !!n.read_at;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return (
    <section className="users-management font-cairo">
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
        <span style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa-solid fa-bell" style={{ color: 'var(--accent-cyan)' }}></i>
          مركز الإشعارات والتنبيهات
          {unreadCount > 0 && (
            <span style={{ 
              fontSize: '12px', 
              background: '#ef4444', 
              color: '#fff', 
              padding: '2px 8px', 
              borderRadius: '20px',
              fontWeight: '800'
            }}>
              {unreadCount} غير مقروء
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: '10px' }}>
          {unreadCount > 0 && (
            <button 
              className="ghost" 
              onClick={handleMarkAllAsRead} 
              disabled={actionLoading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fa-solid fa-check-double"></i>
              تحديد الكل كمقروء
            </button>
          )}
          <button className="primary" onClick={fetchNotifications} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-rotate"></i>
            تحديث
          </button>
        </div>
      </div>

      <div className="users-card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border)', paddingBottom: '15px', marginBottom: '15px' }}>
          <button 
            type="button"
            className={filter === 'all' ? 'primary' : 'ghost'} 
            onClick={() => setFilter('all')}
            style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px' }}
          >
            الكل
          </button>
          <button 
            type="button"
            className={filter === 'unread' ? 'primary' : 'ghost'} 
            onClick={() => setFilter('unread')}
            style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            غير المقروءة
          </button>
          <button 
            type="button"
            className={filter === 'read' ? 'primary' : 'ghost'} 
            onClick={() => setFilter('read')}
            style={{ borderRadius: '8px', padding: '8px 16px', fontSize: '13px' }}
          >
            المقروءة
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
              <p>جاري تحميل الإشعارات...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)', background: 'var(--input-bg)', borderRadius: '12px' }}>
              <i className="fa-regular fa-bell-slash" style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}></i>
              <p style={{ fontWeight: '700', fontSize: '15px' }}>لا توجد إشعارات مطابقة حالياً</p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleMarkAsRead(n.id, n.action_url)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px',
                  background: n.read_at ? 'var(--panel)' : 'color-mix(in srgb, var(--accent-cyan) 3%, var(--panel))',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
                className="notification-item-card"
              >
                {!n.read_at && (
                  <span style={{
                    position: 'absolute',
                    right: '6px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#3b82f6',
                    boxShadow: '0 0 8px #3b82f6'
                  }}></span>
                )}
                
                <div className={`notification-icon-container ${n.type || 'info'}`} style={{ width: '42px', height: '42px' }}>
                  <i className={getNotificationIcon(n.type)} style={{ fontSize: '18px' }}></i>
                </div>

                <div style={{ flexGrow: 1, minWidth: 0 }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '14.5px', fontWeight: '800', color: 'var(--text)' }}>
                    {n.title}
                  </h4>
                  <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--muted)', lineHeight: '1.5' }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', opacity: 0.8 }}>
                    <i className="fa-regular fa-clock" style={{ marginLeft: '5px' }}></i>
                    {formatTime(n.created_at)}
                  </span>
                </div>

                {n.action_url && (
                  <div style={{ color: 'var(--accent-cyan)', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    عرض التفاصيل
                    <i className="fa-solid fa-chevron-left" style={{ fontSize: '11px' }}></i>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
