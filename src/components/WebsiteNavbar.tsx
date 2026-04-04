import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import WhatsAppFloating from './WhatsAppFloating';

export default function WebsiteNavbar() {
  const getInitialLanguage = (): 'ar' | 'en' => {
    if (typeof window === 'undefined') return 'ar';
    const stored = localStorage.getItem('siteLang');
    return stored === 'en' ? 'en' : 'ar';
  };

  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<'ar' | 'en'>(getInitialLanguage());
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<'ar' | 'en'>;
      if (custom.detail) setLanguage(custom.detail);
    };
    window.addEventListener('siteLanguageChanged', handler as EventListener);
    return () => window.removeEventListener('siteLanguageChanged', handler as EventListener);
  }, []);

  const t = useMemo(() => {
    return language === 'ar'
      ? {
          home: 'الرئيسية',
          about: 'من نحن',
          management: 'الإدارة',
          branches: 'الوكلاء والفروع',
          insurances: 'التأمينات',
          contact: 'اتصل بنا',
          logoTitle: 'المدار الليبـي للتأمين',
          logoSubtitle: 'Al Madar Libyan Insurance',
        }
      : {
          home: 'Home',
          about: 'About Us',
          management: 'Management',
          branches: 'Branches & Agents',
          insurances: 'Insurances',
          contact: 'Contact Us',
          logoTitle: 'Al Madar Libyan Insurance',
          logoSubtitle: 'Insurance Services',
        };
  }, [language]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className={`website-navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          <Link to="/" className="navbar-logo">
            <div className="logo-icon">
              <img src="/img/logo3.png" alt="المدار الليبي للتأمين" />
            </div>
            <div className="logo-text">
              <span className="logo-title">{t.logoTitle}</span>
              <span className="logo-subtitle">{t.logoSubtitle}</span>
            </div>
          </Link>

          <button 
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
          </button>

          <ul className={`navbar-menu ${isMobileMenuOpen ? 'active' : ''}`}>
            <li>
              <Link 
                to="/" 
                className={isActive('/') ? 'active' : ''}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.home}
              </Link>
            </li>
            <li>
              <Link 
                to="/about-us" 
                className={isActive('/about-us') ? 'active' : ''}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.about}
              </Link>
            </li>
            <li>
              <Link 
                to="/management" 
                className={isActive('/management') ? 'active' : ''}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.management}
              </Link>
            </li>
            <li>
              <Link 
                to="/website/branches-agents" 
                className={isActive('/website/branches-agents') ? 'active' : ''}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.branches}
              </Link>
            </li>
            <li>
              <Link 
                to="/insurances" 
                className={isActive('/insurances') ? 'active' : ''}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.insurances}
              </Link>
            </li>
            <li>
              <Link 
                to="/contact-us" 
                className={isActive('/contact-us') ? 'active' : ''}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t.contact}
              </Link>
            </li>
          </ul>
        </div>
      </nav>
      <WhatsAppFloating />
    </>
  );
}


