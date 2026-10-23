import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { type Branch, getActiveBranch, setActiveBranch } from '../utils/branchContext';
import { showToast } from './Toast';

interface BranchSwitcherProps {
  className?: string;
}

export const BranchSwitcher: React.FC<BranchSwitcherProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranch, setActiveBranchState] = useState<Branch | null>(getActiveBranch());
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [userBranch, setUserBranch] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load current user information
  useEffect(() => {
    const loadUser = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setIsAdmin(Boolean(user.is_admin));
          if (user.branch) {
            setUserBranch(user.branch);
            // If user is locked to a branch and no active branch is set or differs, auto-set it
            if (!user.is_admin) {
              setActiveBranch(user.branch);
              setActiveBranchState(user.branch);
            }
          }
        }
      } catch (e) {
        console.error('Error loading user in BranchSwitcher:', e);
      }
    };

    loadUser();

    const handleBranchChange = (e: CustomEvent) => {
      setActiveBranchState(e.detail || null);
    };

    window.addEventListener('branchChanged', handleBranchChange as EventListener);
    window.addEventListener('userLoggedIn', loadUser);

    return () => {
      window.removeEventListener('branchChanged', handleBranchChange as EventListener);
      window.removeEventListener('userLoggedIn', loadUser);
    };
  }, []);

  // Fetch branches for admin switcher
  useEffect(() => {
    if (!isAdmin) return;

    const fetchBranches = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/branches?for_select=1`, {
          headers: {
            'Accept': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          }
        });
        if (res.ok) {
          const data = await res.json();
          setBranches(data);
        }
      } catch (err) {
        console.error('Error fetching branches for switcher:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBranches();
  }, [isAdmin]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBranch = (branch: Branch | null) => {
    setActiveBranch(branch);
    setActiveBranchState(branch);
    setIsOpen(false);

    if (branch) {
      showToast(`تم التبديل إلى: ${branch.name}`, 'success');
    } else {
      showToast('تمت العودة إلى الإدارة العامة (كافة الفروع)', 'success');
    }

    // Trigger page refresh to reload data under new branch context
    window.dispatchEvent(new CustomEvent('refreshData'));
  };

  const filteredBranches = branches.filter((b) =>
    (b.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (b.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If user is a branch employee (non-admin locked to their branch)
  if (!isAdmin && userBranch) {
    return (
      <div className={`branch-badge-pill ${className}`} style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        borderRadius: '9999px',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.08))',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        color: '#059669',
        fontSize: '13px',
        fontWeight: 600,
        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.1)'
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#10b981',
          boxShadow: '0 0 8px #10b981'
        }} />
        <i className="fa-solid fa-building" style={{ fontSize: '13px' }} />
        <span>{userBranch.name || 'فرع المستخدم'}</span>
        {userBranch.city && (
          <span style={{
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '6px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#047857'
          }}>
            {userBranch.city}
          </span>
        )}
      </div>
    );
  }

  // If not admin and not assigned to a branch, hide or show standard
  if (!isAdmin) {
    return null;
  }

  // Super Admin view: Switcher dropdown
  return (
    <div ref={dropdownRef} className={`branch-switcher-container ${className}`} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="branch-switcher-btn"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '10px',
          border: activeBranch ? '1.5px solid #2563eb' : '1px solid var(--border-color, #e2e8f0)',
          background: activeBranch
            ? 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(79, 70, 229, 0.08))'
            : 'var(--surface-color, #ffffff)',
          color: activeBranch ? '#1d4ed8' : 'var(--text-main, #334155)',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          transition: 'all 0.2s ease',
          boxShadow: activeBranch ? '0 2px 8px rgba(37, 99, 235, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
        }}
        title="تبديل سياق العمل بين الفروع"
      >
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: activeBranch ? '#2563eb' : '#64748b',
          boxShadow: activeBranch ? '0 0 6px #2563eb' : 'none'
        }} />
        <i className="fa-solid fa-code-branch" style={{ fontSize: '13px' }} />
        <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeBranch ? activeBranch.name : 'الإدارة العامة (كافة الفروع)'}
        </span>
        <i className={`fa-solid fa-chevron-down ${isOpen ? 'fa-rotate-180' : ''}`} style={{ fontSize: '11px', transition: 'transform 0.2s ease' }} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="branch-switcher-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '310px',
            backgroundColor: 'var(--surface-color, #ffffff)',
            borderRadius: '12px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.15), 0 4px 6px rgba(0,0,0,0.05)',
            border: '1px solid var(--border-color, #e2e8f0)',
            zIndex: 9999,
            padding: '8px',
            animation: 'fadeInSlide 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header */}
          <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                نطاق العمل / الفرع
              </span>
              <button
                type="button"
                onClick={() => { setIsOpen(false); navigate('/branches'); }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '11px',
                  color: '#2563eb',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                إدارة الفروع ↗
              </button>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <i
                className="fa-solid fa-magnifying-glass"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  fontSize: '12px'
                }}
              />
              <input
                type="text"
                placeholder="بحث عن فرع بالاسم أو المدينة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 32px 7px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  fontSize: '12px',
                  outline: 'none',
                  backgroundColor: 'var(--bg-light, #f8fafc)'
                }}
                autoFocus
              />
            </div>
          </div>

          {/* All Branches Option (General Administration) */}
          <div style={{ padding: '6px 0', borderBottom: '1px solid var(--border-color, #f1f5f9)' }}>
            <button
              type="button"
              onClick={() => handleSelectBranch(null)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: !activeBranch ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                color: !activeBranch ? '#1d4ed8' : 'inherit',
                cursor: 'pointer',
                textAlign: 'right',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (activeBranch) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
              }}
              onMouseLeave={(e) => {
                if (activeBranch) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: !activeBranch ? '#2563eb' : '#e2e8f0',
                  color: !activeBranch ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px'
                }}>
                  <i className="fa-solid fa-network-wired" />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>الإدارة العامة</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>عرض وثائق وإحصائيات كافة الفروع</div>
                </div>
              </div>
              {!activeBranch && (
                <i className="fa-solid fa-circle-check" style={{ color: '#2563eb', fontSize: '15px' }} />
              )}
            </button>
          </div>

          {/* Branches List */}
          <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '6px 0' }}>
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginLeft: '6px' }} />
                جاري تحميل الفروع...
              </div>
            ) : filteredBranches.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                لا توجد فروع مطابقة للبحث
              </div>
            ) : (
              filteredBranches.map((branch) => {
                const isSelected = activeBranch?.id === branch.id;
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() => handleSelectBranch(branch)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                      color: isSelected ? '#1d4ed8' : 'inherit',
                      cursor: 'pointer',
                      textAlign: 'right',
                      transition: 'background-color 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: isSelected ? '#2563eb' : 'rgba(59, 130, 246, 0.1)',
                        color: isSelected ? '#ffffff' : '#2563eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '13px',
                        fontWeight: 700
                      }}>
                        <i className="fa-solid fa-building" />
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{branch.name}</span>
                          {branch.code && (
                            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: '#e2e8f0', color: '#475569' }}>
                              {branch.code}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          {branch.city && <span>📍 {branch.city}</span>}
                          {branch.is_main_branch ? <span style={{ color: '#059669', fontWeight: 600 }}>⭐ رئيسي</span> : null}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <i className="fa-solid fa-circle-check" style={{ color: '#2563eb', fontSize: '15px' }} />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchSwitcher;
