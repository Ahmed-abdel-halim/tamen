import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import WebsiteNavbar from './WebsiteNavbar';
import Footer from './Footer';
import { API_BASE_URL, BACKEND_URL } from '../config/api';

export default function HomePage() {
  const getInitialLanguage = () => {
    if (typeof window === 'undefined') return 'ar';
    return (localStorage.getItem('siteLang') as 'ar' | 'en') || 'ar';
  };

  const [language, setLanguage] = useState<'ar' | 'en'>(getInitialLanguage());
  const [entities, setEntities] = useState<{ id: number; name: string; logo_url: string }[]>([]);

  const bannerImages = [
    '/new/Gemini_Generated_Image_evgx1ievgx1ievgx (1).png',
    '/new/قبل الفوتر 2.png'
  ];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % bannerImages.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/external-entities`);
        if (response.ok) {
          const data = await response.json();
          // filter out entities with no logo
          const filtered = data.filter((item: any) => item.logo_url && item.logo_url.trim() !== '');
          setEntities(filtered);
        }
      } catch (error) {
        console.error('Error fetching external entities:', error);
      }
    };
    fetchEntities();
  }, []);

  useEffect(() => {
    const handleLanguageChange = (e: Event) => {
      const custom = e as CustomEvent<'ar' | 'en'>;
      if (custom.detail) {
        setLanguage(custom.detail);
      }
    };
    window.addEventListener('siteLanguageChanged', handleLanguageChange as EventListener);
    return () => window.removeEventListener('siteLanguageChanged', handleLanguageChange as EventListener);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const translations = {
    ar: {
      heroTitle: 'المدار الليبي للتأمين',
      heroSubtitle: 'شركة تأمين رائدة في ليبيا، نقدم حلولاً تأمينية شاملة ومبتكرة لحماية مستقبلك وممتلكاتك',
      heroCtaPrimary: 'انضم إلينا كوكيل',
      whyTitle: 'لماذا المدار الليبـي للتأمين؟',
      whySubtitle: 'نحن خيارك الأفضل',
      servicesTitle: 'خدماتنا',
      servicesSubtitle: 'حلول تأمينية متكاملة',
      features: [
        { title: 'خبرة طويلة', desc: 'سنوات من الخبرة في مجال التأمين مع فريق محترف', icon: 'far fa-star' },
        { title: 'ثقة العملاء', desc: 'آلاف العملاء الراضين عن خدماتنا وجودة تعاملنا', icon: 'far fa-handshake' },
        { title: 'خدمة سريعة', desc: 'معالجة سريعة للمطالبات وخدمة عملاء على مدار الساعة', icon: 'far fa-clock' },
        { title: 'حماية شاملة', desc: 'تغطية تأمينية واسعة لجميع احتياجاتك', icon: 'far fa-circle-check' },
      ],
      services: [
        { id: 1, title: 'تأمين السيارات', desc: 'تأمين شامل وإجباري للسيارات يغطي جميع احتياجاتك من الحماية', icon: 'fas fa-car', image: '/new/تامين السيارات .jpg' },
        { id: 5, title: 'تأمين القوارب', desc: 'تأمين شامل للقوارب والمركبات البحرية ضد جميع المخاطر', icon: 'fas fa-ship', image: '/new/تامين المراكب.png' },
        { id: 6, title: 'الحوادث الشخصية', desc: 'حماية من الحوادث الشخصية والإصابات مع تعويضات مالية', icon: 'fas fa-running', image: '/new/الحوادث الشخصية.png' },
        { id: 4, title: 'تأمين طبي', desc: 'تأمين رعاية صحية شامل لك ولعائلتك في أفضل المصحات', icon: 'fas fa-hospital', image: '/new/Local Health Insurance 1.png' },
        { id: 2, title: 'تأمين المسافرين', desc: 'حماية شاملة للمسافرين أثناء السفر مع تغطية طبية ومالية كاملة', icon: 'fas fa-plane', image: '/new/تامين المسافرن.png' },
        { id: 3, title: 'تأمين زوار ليبيا', desc: 'تأمين خاص لزوار ليبيا يغطي احتياجاتهم خلال فترة الإقامة', icon: 'fas fa-map-marked-alt', image: '/new/تامين زوار ليبيا.png' },
        { id: 8, title: 'تأمين وافدين للمقيمين', desc: 'تأمين خاص للوافدين المقيمين في ليبيا يغطي احتياجاتهم الصحية والمالية', icon: 'fas fa-user-tie', image: '/new/تامين الوافدين.png' },
        { id: 7, title: 'تأمين الحج والعمرة', desc: 'تأمين خاص للحجاج والمعتمرين يغطي جميع احتياجاتهم خلال الرحلة', icon: 'fas fa-kaaba', image: '/new/تامين الحج.png' },
      ],
      discoverMore: 'اكتشف خدماتنا',
      aboutTitle: 'من نحن',
      aboutSubtitle: 'نقدم حلولاً تأمينية شاملة ومبتكرة',
    },
    en: {
      heroTitle: 'Al Madar Libyan Insurance',
      heroSubtitle: 'A leading insurance company in Libya, providing comprehensive and innovative solutions to protect your future and assets.',
      heroCtaPrimary: 'Join us as Agent',
      whyTitle: 'Why Al Madar Libyan Insurance?',
      whySubtitle: 'We are your best choice',
      servicesTitle: 'Our Services',
      servicesSubtitle: 'Integrated Insurance Solutions',
      features: [
        { title: 'Extensive Experience', desc: 'Years of expertise in insurance with a professional team', icon: 'far fa-star' },
        { title: 'Customer Trust', desc: 'Thousands of satisfied clients rely on our quality service', icon: 'far fa-handshake' },
        { title: 'Fast Service', desc: 'Quick claims processing and 24/7 customer support', icon: 'far fa-clock' },
        { title: 'Comprehensive Protection', desc: 'Wide coverage options for all your needs', icon: 'far fa-circle-check' },
      ],
      services: [
        { id: 1, title: 'Car Insurance', desc: 'Comprehensive and mandatory car insurance for full protection', icon: 'fas fa-car', image: '/new/تامين السيارات .jpg' },
        { id: 5, title: 'Boat Insurance', desc: 'Comprehensive coverage for boats and marine vessels against all risks', icon: 'fas fa-ship', image: '/new/تامين المراكب.png' },
        { id: 6, title: 'Personal Accidents', desc: 'Protection against personal accidents and injuries with financial compensation', icon: 'fas fa-running', image: '/new/الحوادث الشخصية.png' },
        { id: 4, title: 'Medical Insurance', desc: 'Comprehensive health care insurance for you and your family in the best clinics', icon: 'fas fa-hospital', image: '/new/Local Health Insurance 1.png' },
        { id: 2, title: 'Travel Insurance', desc: 'Full protection for travelers with complete medical and financial coverage', icon: 'fas fa-plane', image: '/new/تامين المسافرن.png' },
        { id: 3, title: 'Libya Visitors Insurance', desc: 'Specialized insurance for visitors to Libya covering their needs during stay', icon: 'fas fa-map-marked-alt', image: '/new/تامين زوار ليبيا.png' },
        { id: 8, title: 'Resident Insurance for Expats', desc: 'Specialized insurance for expatriates residing in Libya covering their health and financial needs', icon: 'fas fa-user-tie', image: '/new/تامين الوافدين.png' },
        { id: 7, title: 'Hajj and Umrah Insurance', desc: 'Special insurance for pilgrims and Umrah performers covering all their needs during the journey', icon: 'fas fa-kaaba', image: '/new/تامين الحج.png' },
      ],
      discoverMore: 'Discover Services',
      aboutTitle: 'About Us',
      aboutSubtitle: 'Providing comprehensive and innovative insurance solutions',
    },
  };

  const getServiceIcon = (idx: number) => {
    const iconProps = {
      width: "30",
      height: "30",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const
    };

    switch (idx) {
      case 0: // Car Insurance (Car inside a protective Shield)
        return (
          <svg {...iconProps}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M7 14h10M6 11h12M8 11V9c0-1 1-1.5 2-1.5h4c1 0 2 .5 2 1v2" strokeWidth="1.5" />
            <circle cx="8.5" cy="14" r="0.8" />
            <circle cx="15.5" cy="14" r="0.8" />
          </svg>
        );
      case 1: // Boat Insurance (Ship on waves inside a protective Shield)
        return (
          <svg {...iconProps}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M6 14l3-3h6l3 3M8 11V8.5h4V11" strokeWidth="1.5" />
            <path d="M5 16.5s2-.8 4-.8 4 .8 6 .8 4-.8 4-.8" strokeWidth="1.5" />
          </svg>
        );
      case 2: // Personal Accidents (Universal First Aid Kit Case)
        return (
          <svg {...iconProps}>
            <rect x="2" y="6" width="20" height="14" rx="3" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M12 10v6M9 13h6" strokeWidth="2.5" />
          </svg>
        );
      case 3: // Medical Insurance (Heart with Heartbeat Pulse line)
        return (
          <svg {...iconProps}>
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            <path d="M5.5 12h2.5l1.5-3 2 6 1.5-3h3" strokeWidth="2.2" />
          </svg>
        );
      case 4: // Travel Insurance (Plane flying over protective Shield)
        return (
          <svg {...iconProps}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" opacity="0.4" />
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.9-.2-1.6.3-1.6 1.2l.4 1.8 6.2 2.8-2.8 2.8-3.6-1.1c-.7-.2-1.2.3-1.1.9l.7 2.1 2.5 2.5 2.1.7c.6.1 1.1-.4.9-1.1l-1.1-3.6 2.8-2.8 2.8 6.2 1.8.4c.9 0 1.4-.7 1.2-1.6Z" />
          </svg>
        );
      case 5: // Libya Visitors (Travel Suitcase with Pin Map)
        return (
          <svg {...iconProps}>
            <rect x="4" y="9" width="16" height="11" rx="2" />
            <path d="M8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" />
            <path d="M12 11.5c-1 0-1.8.8-1.8 1.8s1.8 2.7 1.8 2.7 1.8-1.7 1.8-2.7-.8-1.8-1.8-1.8z" fill="currentColor" opacity="0.35" />
            <circle cx="12" cy="13.3" r="0.6" fill="currentColor" />
          </svg>
        );
      case 6: // Expat Residents (Resident User inside protective Shield)
        return (
          <svg {...iconProps}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <circle cx="12" cy="9" r="3" />
            <path d="M6 17a6 6 0 0 1 12 0" />
          </svg>
        );
      case 7: // Hajj & Umrah (Spectacular 3D Kaaba with Kiswah belt and Kaaba door)
        return (
          <svg {...iconProps}>
            <path d="M12 2L3 6.5v10L12 21l9-4.5v-10L12 2z" />
            <path d="M12 21V11M3 6.5L12 11l9-4.5" />
            <rect x="14.5" y="11.5" width="3.5" height="5.5" rx="0.5" strokeWidth="1.5" />
            <path d="M3 9.8l9 4.5 9-4.5" strokeWidth="1" strokeDasharray="3,3" />
          </svg>
        );
      default:
        return null;
    }
  };

  const t = translations[language];

  return (
    <div className="website-layout new-design">
      <WebsiteNavbar />
      
      {/* Hero Banner Section */}
      <section className="hero-banner-new">
        <div className="hero-bg-container">
          {bannerImages.map((src, idx) => (
            <img 
              key={src}
              src={src} 
              alt="City Background" 
              className="hero-bg-img" 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                opacity: currentImageIndex === idx ? 1 : 0,
                transition: 'opacity 1.5s ease-in-out',
                zIndex: currentImageIndex === idx ? 1 : 0
              }}
            />
          ))}
          <div className="hero-overlay" style={{ zIndex: 2 }}></div>
        </div>
        
        <div className="hero-content-container">
          <div className="hero-text-content">
            <h1 className="hero-main-title">{t.heroTitle}</h1>
            <p className="hero-main-subtitle">
              {language === 'ar' ? (
                <>
                  شركة تأمين رائدة في ليبيا، نقدم حلولاً تأمينية
                  <br className="hero-br" />
                  شاملة ومبتكرة لحماية مستقبلك وممتلكاتك
                </>
              ) : (
                t.heroSubtitle
              )}
            </p>
            <Link to="/contact-us" className="hero-join-btn">
              {language === 'ar' ? <i className="fas fa-handshake" style={{marginLeft: '8px'}}></i> : <i className="fas fa-handshake" style={{marginRight: '8px'}}></i>}
              {t.heroCtaPrimary}
            </Link>
          </div>
        </div>
      </section>

      {/* Why Us Section */}
      <section className="why-us-section">
        <div className="container">
          <div className="why-us-card">
            <div className="section-header-centered">
              <h2 className="section-title-new" style={{ color: '#ffffff' }}>
                لماذا المدار <span style={{ color: '#33b349' }}>الليبي للتأمين؟</span>
              </h2>
              <p className="section-subtitle-new" style={{ color: '#ffffff' }}>نحن خيارك الأفضل</p>
            </div>
            <div className="features-grid-new">
              {t.features.map((feature, idx) => (
                <div className="feature-card-new" key={`feature-${idx}`}>
                  <div className="feature-icon-new">
                    <i className={feature.icon}></i>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Corporate Clients Section (Based on image showing logos) */}
      <section className="clients-section">
         <div className="container text-center">
            <h2 className="clients-title">عملاؤنا</h2>
            <p className="clients-subtitle">شركاء يثقون بنا</p>
            {entities.length > 0 ? (
               <div className="clients-slider-container">
                  <div className="clients-slider-track">
                     {[...entities, ...entities, ...entities, ...entities, ...entities, ...entities].map((entity, idx) => (
                        <div className="client-logo-item" key={`client-${entity.id}-${idx}`}>
                           <img 
                              src={`${BACKEND_URL}${entity.logo_url}`} 
                              alt={entity.name} 
                              className="client-logo-img" 
                           />
                        </div>
                     ))}
                  </div>
               </div>
            ) : (
               <div className="clients-logos">
                  {/* Premium colorized brand logos mimicking top-tier enterprise clients */}
                  <div className="client-logo-item">
                     <i className="fas fa-building fa-2x" style={{color: '#0f172a'}}></i>
                     <span style={{color: '#0f172a', fontWeight: 'bold', fontSize: '18px', letterSpacing: '-0.5px'}}>logoipsum</span>
                  </div>
                  <div className="client-logo-item">
                     <i className="fas fa-mountain fa-2x" style={{color: '#139625'}}></i>
                     <span style={{color: '#1e3a8a', fontWeight: 'bold', fontSize: '18px', letterSpacing: '-0.5px'}}>logoipsum</span>
                  </div>
                  <div className="client-logo-item">
                     <i className="fas fa-globe fa-2x" style={{color: '#0d9488'}}></i>
                     <span style={{color: '#0d9488', fontWeight: 'bold', fontSize: '18px', letterSpacing: '-0.5px'}}>LogoIpsum</span>
                  </div>
                  <div className="client-logo-item">
                     <i className="fas fa-chart-line fa-2x" style={{color: '#8b5cf6'}}></i>
                     <span style={{color: '#0f172a', fontWeight: 'bold', fontSize: '18px', letterSpacing: '-0.5px'}}>logoipsum</span>
                  </div>
                  <div className="client-logo-item">
                     <i className="fas fa-shield-alt fa-2x" style={{color: '#3b82f6'}}></i>
                     <span style={{color: '#1e3a8a', fontWeight: 'bold', fontSize: '18px', letterSpacing: '-0.5px'}}>logoipsum</span>
                  </div>
               </div>
            )}
         </div>
      </section>

      {/* Info Blocks Section */}
      <section className="info-blocks-section">
         <div className="container">
            <div className="section-header-centered" style={{ marginBottom: '60px' }}>
               <h2 className="about-title">{t.aboutTitle}</h2>
               <p className="about-subtitle">{t.aboutSubtitle}</p>
            </div>
            <div className="info-block-row reverse">
               <div className="info-block-text">
                  <p>نعمل على تقديم خدمات تأمينية تمنح الأفراد والشركات في ليبيا حماية موثوقة، وحلولاً تساعدهم على مواجهة المستقبل بثقة واستقرار.</p>
                  <Link to="/insurances" className="info-block-btn">
                     {t.discoverMore}
                     {language === 'ar' ? <i className="fas fa-arrow-left"></i> : <i className="fas fa-arrow-right"></i>}
                  </Link>
               </div>
               <div className="info-block-img">
                  <div className="img-wrapper" style={{backgroundImage: 'url(/new/first.png)'}}></div>
               </div>
            </div>

            <div className="info-block-row">
               <div className="info-block-text">
                  <p>نؤمن بأن الثقة تُبنى من خلال الوضوح والالتزام. لذلك نحرص على توفير تجربة تأمينية متكاملة تجمع بين الجودة، السرعة، والاهتمام الحقيقي بعملائنا.</p>
                  <Link to="/insurances" className="info-block-btn">
                     {t.discoverMore}
                     {language === 'ar' ? <i className="fas fa-arrow-left"></i> : <i className="fas fa-arrow-right"></i>}
                  </Link>
               </div>
               <div className="info-block-img">
                  <div className="img-wrapper" style={{backgroundImage: 'url(/new/secnd.png)'}}></div>
               </div>
            </div>
         </div>
      </section>

      {/* Services Grid Section */}
      <section className="services-section-new">
        <div className="container">
          <div className="section-header-centered">
            <h2 className="section-title-new green-text">{t.servicesTitle}</h2>
            <p className="section-subtitle-new blue-text">{t.servicesSubtitle}</p>
          </div>
          <div className="services-grid-new">
            {t.services.map((service, idx) => (
              <Link 
                to={`/insurances#insurance-${service.id}`}
                className="service-card-new" 
                key={`service-${idx}`}
                style={{ backgroundImage: `url("${encodeURI(service.image)}")`, textDecoration: 'none' }}
              >
                <div className="service-card-overlay"></div>
                <div className="service-card-content">
                  <div className="service-icon-new">
                    {getServiceIcon(idx)}
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Help Banner Section */}
      <section className="help-banner-section">
         <div className="container">
            <div className="help-banner-card">
               <div className="help-banner-text" style={{backgroundImage: 'url("/new/قبل الفوتر 2.png")'}}>
                  <h2>{language === 'ar' ? 'نحن هنا لمساعدتك' : 'We are here to help you'}</h2>
                  <p>{language === 'ar' ? 'تواصل معنا الآن للحصول على طلب خدمة أو طلب استشارة' : 'Contact us now to request a service or a consultation'}</p>
                  <div className="contact-info-list">
                     <div className="contact-info-item">
                        <i className="fas fa-phone-alt"></i>
                        <span dir="ltr">+218 920003366</span>
                     </div>
                     <div className="contact-info-item">
                        <i className="fas fa-envelope"></i>
                        <span>info@mli.ly</span>
                     </div>
                  </div>
               </div>
               <div className="help-banner-img" style={{backgroundImage: 'url("/new/قبل الفوتر 1.png")'}}></div>
            </div>
         </div>
      </section>

      <Footer />
    </div>
  );
}
