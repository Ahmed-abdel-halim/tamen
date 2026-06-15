import { useState } from 'react';
import { useLocation } from 'react-router-dom';

type SidebarItem = {
  label: string;
  icon: string;
  to?: string;
  children?: SidebarItem[];
  badge?: number;
}

const badgeStyle: React.CSSProperties = {
  backgroundColor: '#10b981',
  color: '#ffffff',
  fontSize: '11px',
  fontWeight: '700',
  minWidth: '20px',
  height: '20px',
  borderRadius: '10px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 6px',
  marginRight: 'auto',
  marginLeft: '4px',
};

type SidebarSection = {
  title: string;
  items: SidebarItem[];
}

type SidebarProps = {
  sections: SidebarSection[];
  LinkTag?: any;
  onLinkClick?: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function Sidebar({ sections, LinkTag, onLinkClick, onClose, showCloseButton = false }: SidebarProps) {
  const location = useLocation();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  const toggleDropdown = (label: string) => {
    setOpenDropdowns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(label)) {
        newSet.delete(label);
      } else {
        newSet.add(label);
      }
      return newSet;
    });
  };

  const isActive = (item: SidebarItem): boolean => {
    const currentPath = location.pathname + location.search;
    if (item.to && (location.pathname === item.to || currentPath === item.to)) {
      return true;
    }
    if (item.children) {
      return item.children.some(child => {
        if (child.to && (location.pathname === child.to || currentPath === child.to)) {
          return true;
        }
        if (child.children) {
          return child.children.some(grandchild => grandchild.to && (location.pathname === grandchild.to || currentPath === grandchild.to));
        }
        return false;
      });
    }
    return false;
  };
  
  const resolveImageUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${window.location.origin}/${cleanPath}`;
  };

  return (
    <aside className="sidebar">
      <div className="brand" style={{ position: 'relative', paddingLeft: showCloseButton ? '40px' : '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
          <div className="logo-icon" style={{ height: '50px', width: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src={resolveImageUrl('/img/logo3.png')} alt="المدار الليبي للتأميـن" style={{ maxHeight: '100%', maxWidth: '100%', width: 'auto', height: 'auto' }} />
          </div>
          <div className="logo-text" style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
            <span className="logo-title" style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text)', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              المدار الليبـي للتأميـن
            </span>
            <span className="logo-subtitle" style={{ fontSize: '12px', fontWeight: '500', color: 'var(--muted)', lineHeight: '1.2', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Al Madar Libyan Insurance
            </span>
          </div>
        </div>
        {showCloseButton && onClose && (
          <button
            type="button"
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="إغلاق القائمة الجانبية"
            style={{
              position: 'absolute',
              left: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--panel)',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              padding: 0
            }}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" style={{ fontSize: '16px' }} />
          </button>
        )}
      </div>
      <nav className="sidebar-nav">
        {sections.map((section) => (
          <div className="sidebar-section" key={section.title}>
            <p className="section-title">{section.title}</p>
            <ul>
              {section.items.map((item) => (
                <li key={item.label}>
                  {item.children ? (
                    <div>
                      <button 
                        type="button"
                        onClick={() => toggleDropdown(item.label)}
                        className={
                          "sidebar-link" +
                          (isActive(item) ? " active" : "") +
                          (openDropdowns.has(item.label) ? " open" : "")
                        }
                        style={{ width: '100%', textAlign: 'right', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <i className={`sidebar-icon ${item.icon}`} aria-hidden="true" />
                          <span>{item.label}</span>
                        </div>
                        <i className={`fa-solid fa-chevron-${openDropdowns.has(item.label) ? 'up' : 'down'}`} style={{ fontSize: '12px', marginLeft: '8px' }}></i>
                      </button>
                      {openDropdowns.has(item.label) && (
                        <ul style={{ 
                          paddingRight: '1px', 
                          marginTop: '4px',
                          background: 'var(--input-bg)',
                          borderRadius: '8px',
                          padding: '4px 0',
                          marginLeft: '8px',
                          marginRight: '4px',
                          border: '1px solid var(--border)'
                        }}>
                          {item.children.map((child) => (
                            <li key={child.label} style={{ marginBottom: '0px' }}>
                              {child.children ? (
                                <div>
                                  <button 
                                    type="button"
                                    onClick={() => toggleDropdown(child.label)}
                                    style={{ 
                                      paddingRight: '16px',
                                      paddingTop: '6px',
                                      paddingBottom: '6px',
                                      borderRadius: '4px',
                                      margin: '0 4px',
                                      width: '100%',
                                      textAlign: 'right',
                                      fontSize: '13px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between'
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <i className={`sidebar-icon ${child.icon}`} aria-hidden="true" style={{ fontSize: '14px' }} />
                                      <span>{child.label}</span>
                                    </div>
                                    <i className={`fa-solid fa-chevron-${openDropdowns.has(child.label) ? 'up' : 'down'}`} style={{ fontSize: '10px', marginLeft: '8px' }}></i>
                                  </button>
                                  {openDropdowns.has(child.label) && (
                                    <ul style={{ 
                                      paddingRight: '1px', 
                                      marginTop: '4px',
                                      background: 'var(--bg)',
                                      borderRadius: '6px',
                                      padding: '4px 0',
                                      marginLeft: '12px',
                                      marginRight: '2px',
                                      border: '1px solid var(--border)'
                                    }}>
                                      {child.children.map((grandchild) => (
                                        <li key={grandchild.label} style={{ marginBottom: '0px' }}>
                                          {grandchild.to && LinkTag ? (
                                            <LinkTag to={grandchild.to}
                                              className={
                                                "sidebar-link" +
                                                ((location.pathname === grandchild.to || location.pathname + location.search === grandchild.to) ? " active" : "")
                                              }
                                              style={{ 
                                                paddingRight: '24px',
                                                paddingTop: '6px',
                                                paddingBottom: '6px',
                                                borderRadius: '4px',
                                                margin: '0 4px',
                                                fontSize: '12px'
                                              }}
                                              onClick={onLinkClick}
                                            >
                                              <i className={`sidebar-icon ${grandchild.icon}`} aria-hidden="true" style={{ fontSize: '13px' }} />
                                              <span>{grandchild.label}</span>
                                              {grandchild.badge !== undefined && grandchild.badge > 0 && (
                                                <span style={badgeStyle}>{grandchild.badge}</span>
                                              )}
                                            </LinkTag>
                                          ) : (
                                            <button 
                                              type="button" 
                                              style={{ 
                                                paddingRight: '24px',
                                                paddingTop: '6px',
                                                paddingBottom: '6px',
                                                borderRadius: '4px',
                                                margin: '0 4px',
                                                width: '100%',
                                                textAlign: 'right',
                                                fontSize: '12px'
                                              }}
                                            >
                                              <i className={`sidebar-icon ${grandchild.icon}`} aria-hidden="true" style={{ fontSize: '13px' }} />
                                              <span>{grandchild.label}</span>
                                              {grandchild.badge !== undefined && grandchild.badge > 0 && (
                                                <span style={badgeStyle}>{grandchild.badge}</span>
                                              )}
                                            </button>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ) : child.to && LinkTag ? (
                                <LinkTag to={child.to}
                                  className={
                                    "sidebar-link" +
                                    ((location.pathname === child.to || location.pathname + location.search === child.to) ? " active" : "")
                                  }
                                  style={{ 
                                    paddingRight: '16px',
                                    paddingTop: '6px',
                                    paddingBottom: '6px',
                                    borderRadius: '4px',
                                    margin: '0 4px',
                                    fontSize: '13px'
                                  }}
                                  onClick={onLinkClick}
                                >
                                  <i className={`sidebar-icon ${child.icon}`} aria-hidden="true" style={{ fontSize: '14px' }} />
                                  <span>{child.label}</span>
                                  {child.badge !== undefined && child.badge > 0 && (
                                    <span style={badgeStyle}>{child.badge}</span>
                                  )}
                                </LinkTag>
                              ) : (
                                <button 
                                  type="button" 
                                  style={{ 
                                    paddingRight: '16px',
                                    paddingTop: '6px',
                                    paddingBottom: '6px',
                                    borderRadius: '4px',
                                    margin: '0 4px',
                                    width: '100%',
                                    textAlign: 'right',
                                    fontSize: '13px'
                                  }}
                                >
                                  <i className={`sidebar-icon ${child.icon}`} aria-hidden="true" style={{ fontSize: '14px' }} />
                                  <span>{child.label}</span>
                                  {child.badge !== undefined && child.badge > 0 && (
                                    <span style={badgeStyle}>{child.badge}</span>
                                  )}
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <>
                      {item.to && LinkTag ? (
                        <LinkTag to={item.to}
                          className={
                            "sidebar-link" +
                            ((location.pathname === item.to || location.pathname + location.search === item.to) ? " active" : "")
                          }
                          onClick={() => {
                            setOpenDropdowns(new Set())
                            onLinkClick?.()
                          }}
                        >
                          <i className={`sidebar-icon ${item.icon}`} aria-hidden="true" />
                          <span>{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span style={badgeStyle}>{item.badge}</span>
                          )}
                        </LinkTag>
                      ) : (
                        <button type="button">
                          <i className={`sidebar-icon ${item.icon}`} aria-hidden="true" />
                          <span>{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span style={badgeStyle}>{item.badge}</span>
                          )}
                        </button>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
