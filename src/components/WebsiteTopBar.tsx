import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function WebsiteTopBar() {
  const getInitialLanguage = (): 'ar' | 'en' => {
    if (typeof window === 'undefined') return 'ar';
    const stored = localStorage.getItem('siteLang');
    return stored === 'en' ? 'en' : 'ar';
  };

  const [language, setLanguage] = useState<'ar' | 'en'>(getInitialLanguage());

  const isWebsiteRoute = () => {
    const path = window.location.pathname;
    return (
      path === '/' ||
      path === '/home' ||
      path === '/about-us' ||
      path === '/management' ||
      path === '/branches-agents' ||
      path === '/insurances' ||
      path.startsWith('/website')
    );
  };

  const applyLanguageToDocument = (lang: 'ar' | 'en') => {
    if (!isWebsiteRoute()) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    // ضمان اتجاه الصفحة حتى مع وجود أنماط سابقة
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

  return (
    <div className="website-top-bar">
      <div className="top-bar-container">
        <div className="top-bar-content">
          <div className="top-bar-left">
            <div className="top-bar-info">
              <a href="tel:+218XXXXXXXXX" className="top-bar-info-item">
                <i className="fas fa-phone-alt"></i>
                <span>920003366 218+</span>
              </a>
              <a href="mailto:info@almadar.ly" className="top-bar-info-item">
                <i className="fas fa-envelope"></i>
                <span>info@mli.ly</span>
              </a>
            </div>
          </div>
          <div className="top-bar-right">
            <Link to="/login" className="top-bar-link">
              <i className="fas fa-sign-in-alt"></i>
              <span>{language === 'ar' ? 'دخول الوكلاء أو الفروع' : 'Agents / Branches Login'}</span>
              <i className="fas fa-arrow-left"></i>
            </Link>
            <div className="top-bar-divider"></div>
            <button 
              className="language-toggle"
              onClick={toggleLanguage}
              aria-label="Toggle language"
            >
              <i className="fas fa-globe"></i>
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

