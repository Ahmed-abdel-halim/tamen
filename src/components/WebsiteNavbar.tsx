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
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const applyLanguageToDocument = (lang: 'ar' | 'en') => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.style.direction = lang === 'ar' ? 'rtl' : 'ltr';
  };

  useEffect(() => {
    applyLanguageToDocument(language);
  }, [language]);

  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
    localStorage.setItem('siteLang', newLang);
    applyLanguageToDocument(newLang);
    window.dispatchEvent(new CustomEvent('siteLanguageChanged', { detail: newLang }));
  };

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
          logoTitle: 'المدار الليبي للتأمين',
          logoSubtitle: 'Al Madar Libyan Insurance',
          login: 'تسجيل الدخول',
          langToggle: 'English'
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
          login: 'Login',
          langToggle: 'العربية'
        };
  }, [language]);

  const isActive = (path: string) => location.pathname === path;

  const resolveImageUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${window.location.origin}/${cleanPath}`;
  };

  return (
    <>
      <nav className={`website-navbar ${isScrolled ? 'scrolled' : ''}`}>
        <div className="navbar-container">
          <Link to="/" className="navbar-logo">
            <div className="logo-icon">
              <img src={resolveImageUrl('/img/logo3.png')} alt="المدار الليبي للتأمين" />
            </div>
            <div className="logo-text" style={{ textAlign: language === 'ar' ? 'right' : 'left' }}>
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

          <div className="navbar-actions">
            <button 
              className="navbar-lang-toggle"
              onClick={toggleLanguage}
              aria-label="Toggle language"
            >
              <i className="fas fa-globe"></i>
              <span>{t.langToggle}</span>
            </button>
            <Link to="/login" className="navbar-login-btn">
              {t.login}
            </Link>
          </div>
        </div>
      </nav>
      <WhatsAppFloating />
    </>
  );
}


