import { useState } from 'react';
import { useLocation } from 'react-router-dom';

type SidebarItem = {
  label: string;
  icon: string;
  to?: string;
  children?: SidebarItem[];
}

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
    if (item.to && location.pathname === item.to) {
      return true;
    }
    if (item.children) {
      return item.children.some(child => {
        if (child.to && location.pathname === child.to) {
          return true;
        }
        if (child.children) {
          return child.children.some(grandchild => grandchild.to && location.pathname === grandchild.to);
        }
        return false;
      });
    }
    return false;
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div className="logo-icon" style={{ height: '50px', display: 'flex', alignItems: 'center' }}>
              <img src="/img/logo3.png" alt="المدار الليبي للتأميـن" style={{ height: '100%', width: 'auto' }} />
            </div>
            <div className="logo-text" style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span className="logo-title" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text)', lineHeight: '1.2' }}>
                المدار الليبـي للتأميـن
              </span>
              <span className="logo-subtitle" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--muted)', lineHeight: '1.2' }}>
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
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          )}
        </div>
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
                          marginRight: '8px',
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
                                      paddingRight: '32px',
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
                                      marginRight: '4px',
                                      border: '1px solid var(--border)'
                                    }}>
                                      {child.children.map((grandchild) => (
                                        <li key={grandchild.label} style={{ marginBottom: '0px' }}>
                                          {grandchild.to && LinkTag ? (
                                            <LinkTag to={grandchild.to}
                                              className={
                                                "sidebar-link" +
                                                (location.pathname === grandchild.to ? " active" : "")
                                              }
                                              style={{ 
                                                paddingRight: '40px',
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
                                            </LinkTag>
                                          ) : (
                                            <button 
                                              type="button" 
                                              style={{ 
                                                paddingRight: '40px',
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
                                    (location.pathname === child.to ? " active" : "")
                                  }
                                  style={{ 
                                    paddingRight: '32px',
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
                                </LinkTag>
                              ) : (
                                <button 
                                  type="button" 
                                  style={{ 
                                    paddingRight: '32px',
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
                            (location.pathname === item.to ? " active" : "")
                          }
                          onClick={() => {
                            setOpenDropdowns(new Set())
                            onLinkClick?.()
                          }}
                        >
                          <i className={`sidebar-icon ${item.icon}`} aria-hidden="true" />
                          <span>{item.label}</span>
                        </LinkTag>
                      ) : (
                        <button type="button">
                          <i className={`sidebar-icon ${item.icon}`} aria-hidden="true" />
                          <span>{item.label}</span>
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
