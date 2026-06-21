import { useEffect, useMemo, useState } from 'react';
import WebsiteNavbar from './WebsiteNavbar';
import WebsiteTopBar from './WebsiteTopBar';
import Footer from './Footer';
import { API_BASE_URL, resolveImageUrl } from '../config/api';

export default function CompanyInvestments() {
  const getInitialLanguage = (): 'ar' | 'en' => {
    if (typeof window === 'undefined') return 'ar';
    const stored = localStorage.getItem('siteLang');
    return stored === 'en' ? 'en' : 'ar';
  };

  const [language, setLanguage] = useState<'ar' | 'en'>(getInitialLanguage());
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<'ar' | 'en'>;
      if (custom.detail) setLanguage(custom.detail);
    };
    window.addEventListener('siteLanguageChanged', handler as EventListener);
    return () => window.removeEventListener('siteLanguageChanged', handler as EventListener);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.style.direction = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/website-settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings(data.settings || {});
        }
      } catch (error) {
        console.error('Error fetching investments settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const t = useMemo(() => {
    return language === 'ar'
      ? {
          heroTitle: 'استثمارات الشركة',
          breadcrumbHome: 'الرئيسية',
          breadcrumbCurrent: 'استثمارات الشركة',
          loadingText: 'جاري تحميل تفاصيل الاستثمارات...',
          errorText: 'فشل تحميل البيانات. يرجى المحاولة مرة أخرى.',
          defaultTitle: 'استثمارات الشركة والفرص التنموية',
          defaultContent: 'تسعى شركة المدار الليبي للتأمين دائماً إلى تنمية وتوسيع محفظتها الاستثمارية في شتى المجالات الاقتصادية الحيوية، للمساهمة الفاعلة في تنمية الاقتصاد الوطني وتأمين عوائد مجزية ومستدامة تدعم قوتها وموثوقيتها في سداد الالتزامات والتعويضات لعملائها الكرام.',
          ctaTitle: 'هل ترغب في الاستثمار معنا؟',
          ctaDesc: 'يسعدنا دائماً استلام استفساراتكم ومناقشة الشراكات التنموية الواعدة.',
          ctaBtn: 'اتصل بنا الآن',
        }
      : {
          heroTitle: 'Company Investments',
          breadcrumbHome: 'Home',
          breadcrumbCurrent: 'Company Investments',
          loadingText: 'Loading investments details...',
          errorText: 'Failed to load data. Please try again.',
          defaultTitle: 'Company Investments & Growth Opportunities',
          defaultContent: 'Al Madar Libyan Insurance always seeks to grow and expand its investment portfolio in various vital economic sectors, actively contributing to the national economy and securing sustainable returns to strengthen its reliability in meeting obligations and settling claims for our valued clients.',
          ctaTitle: 'Interested in investing with us?',
          ctaDesc: 'We always welcome your inquiries and look forward to discussing promising growth partnerships.',
          ctaBtn: 'Contact Us Now',
        };
  }, [language]);

  const activeTitle = language === 'ar' 
    ? (settings.investments_title_ar || t.defaultTitle) 
    : (settings.investments_title_en || t.defaultTitle);

  const activeContent = language === 'ar' 
    ? (settings.investments_content_ar || t.defaultContent) 
    : (settings.investments_content_en || t.defaultContent);

  const bannerImage = settings.investments_banner 
    ? resolveImageUrl(settings.investments_banner) 
    : '/new/قبل الفوتر 2.png';

  return (
    <div className="website-layout new-design">
      <WebsiteTopBar />
      <WebsiteNavbar />

      {/* Hero Section */}
      <section className="about-hero-new">
        <div className="about-hero-bg">
          <img src={bannerImage} alt={t.heroTitle} />
          <div className="about-hero-overlay"></div>
        </div>
        
        <div className="about-hero-content-new animate-fade-in">
          <h2 className="about-hero-title-green">{t.heroTitle}</h2>
          <h1 className="about-hero-title-white" style={{ maxWidth: '900px', margin: '0 auto' }}>{activeTitle}</h1>
        </div>
      </section>

      {/* Breadcrumb section */}
      <div className="container" style={{ margin: '20px auto 0 auto', padding: '0 20px' }}>
        <div className="breadcrumb-strip" style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          fontSize: '0.95rem',
          color: 'var(--muted)',
          fontFamily: 'Cairo, sans-serif'
        }}>
          <span style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/'}>{t.breadcrumbHome}</span>
          <span>/</span>
          <span style={{ color: 'var(--text)', fontWeight: 'bold' }}>{t.breadcrumbCurrent}</span>
        </div>
      </div>

      {/* Investments Content Section */}
      <section className="investments-content-section" style={{ padding: '40px 0 80px 0' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--accent-cyan)' }}>
              <i className="fa-solid fa-spinner fa-spin fa-3x" style={{ marginBottom: '15px' }}></i>
              <p style={{ fontWeight: 'bold', color: 'var(--text)' }}>{t.loadingText}</p>
            </div>
          ) : (
            <div className="investments-grid-wrapper">
              {/* Main Content Card */}
              <div className="investment-main-card" style={{
                background: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.02)'
              }}>
                <h2 style={{
                  color: 'var(--text)',
                  fontSize: '2rem',
                  fontWeight: '800',
                  marginBottom: '25px',
                  borderBottom: '3px solid #139625',
                  paddingBottom: '12px',
                  display: 'inline-block'
                }}>
                  {activeTitle}
                </h2>
                
                <div style={{
                  color: '#2d3748',
                  fontSize: '1.15rem',
                  lineHeight: '1.95',
                  whiteSpace: 'pre-line',
                  fontFamily: 'Cairo, sans-serif',
                  textAlign: 'justify'
                }}>
                  {activeContent}
                </div>
              </div>

              {/* Sidebar Info/CTA Widget */}
              <div className="investment-sidebar" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}>
                {/* Stats / Highlight Widget */}
                <div style={{
                  background: 'linear-gradient(135deg, #014cb1 0%, #1e429f 100%)',
                  color: '#ffffff',
                  borderRadius: '16px',
                  padding: '30px',
                  boxShadow: '0 10px 25px rgba(1, 76, 177, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      background: 'rgba(255, 255, 255, 0.15)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem'
                    }}>
                      <i className="fa-solid fa-chart-line-up" style={{ color: '#139625' }}></i>
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontWeight: '700', fontSize: '1.2rem' }}>
                        {language === 'ar' ? 'النمو المالي' : 'Financial Growth'}
                      </h4>
                      <p style={{ margin: 0, opacity: 0.8, fontSize: '0.85rem' }}>
                        {language === 'ar' ? 'استقرار واستدامة' : 'Stability & Sustainability'}
                      </p>
                    </div>
                  </div>
                  
                  <p style={{ fontSize: '0.95rem', lineHeight: '1.6', margin: '0 0 20px 0', opacity: 0.9 }}>
                    {language === 'ar' 
                      ? 'نستثمر بحكمة لحماية وتنمية أصول الشركة، مما يعزز الملاءة المالية والقدرة المستمرة على الوفاء بالتزاماتنا تجاه المؤمن لهم.'
                      : 'We invest wisely to protect and grow the company assets, enhancing financial solvency and the continuous capability to meet our commitments to policyholders.'
                    }
                  </p>

                  <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                    paddingTop: '15px',
                    display: 'flex',
                    justifyContent: 'space-around',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff' }}>100%</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                        {language === 'ar' ? 'التزام تام' : 'Commitment'}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffffff' }}>+10</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                        {language === 'ar' ? 'مشاريع حيوية' : 'Vital Projects'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Card */}
                <div style={{
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: '16px',
                  padding: '30px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
                  textAlign: 'center'
                }}>
                  <h4 style={{ color: 'var(--text)', margin: '0 0 10px 0', fontWeight: '700', fontSize: '1.2rem' }}>
                    {t.ctaTitle}
                  </h4>
                  <p style={{ color: 'var(--muted)', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                    {t.ctaDesc}
                  </p>
                  <button 
                    onClick={() => window.location.href = '/contact-us'}
                    style={{
                      width: '100%',
                      background: 'var(--accent)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px 20px',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 10px rgba(19, 150, 37, 0.2)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
                  >
                    {t.ctaBtn}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
