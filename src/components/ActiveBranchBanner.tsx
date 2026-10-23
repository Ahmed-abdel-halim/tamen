import React, { useState, useEffect } from 'react';
import { type Branch, getActiveBranch, setActiveBranch } from '../utils/branchContext';
import { showToast } from './Toast';

export const ActiveBranchBanner: React.FC = () => {
  const [activeBranch, setActiveBranchState] = useState<Branch | null>(getActiveBranch());
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadState = () => {
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          setIsAdmin(Boolean(user.is_admin));
        }
      } catch (e) {
        setIsAdmin(false);
      }
      setActiveBranchState(getActiveBranch());
    };

    loadState();

    const handleBranchChange = (e: CustomEvent) => {
      setActiveBranchState(e.detail || null);
    };

    window.addEventListener('branchChanged', handleBranchChange as EventListener);
    window.addEventListener('userLoggedIn', loadState);

    return () => {
      window.removeEventListener('branchChanged', handleBranchChange as EventListener);
      window.removeEventListener('userLoggedIn', loadState);
    };
  }, []);

  // Show banner only if Admin has selected a specific branch
  if (!isAdmin || !activeBranch) {
    return null;
  }

  const handleResetToHQ = () => {
    setActiveBranch(null);
    setActiveBranchState(null);
    showToast('تمت العودة إلى الإدارة العامة (كافة الفروع)', 'success');
    window.dispatchEvent(new CustomEvent('refreshData'));
  };

  return (
    <div
      className="active-branch-banner"
      style={{
        background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)',
        color: '#ffffff',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
        zIndex: 50,
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span
          style={{
            padding: '2px 8px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.5px'
          }}
        >
          وضع الفرع
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="fa-solid fa-building" />
          <span>أنت تعمل وتتصفح النظام حالياً كفرع:</span>
          <strong style={{ textDecoration: 'underline', textUnderlineOffset: '3px' }}>
            {activeBranch.name}
          </strong>
          {activeBranch.city && <span>({activeBranch.city})</span>}
          <span style={{ opacity: 0.85, fontSize: '12px' }}>
            — يتم عرض البيانات وعزلها لهذا الفرع تلقائياً
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={handleResetToHQ}
          style={{
            background: '#ffffff',
            color: '#1d4ed8',
            border: 'none',
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f1f5f9';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <i className="fa-solid fa-arrow-rotate-left" style={{ fontSize: '11px' }} />
          <span>العودة للإدارة العامة</span>
        </button>
      </div>
    </div>
  );
};

export default ActiveBranchBanner;
