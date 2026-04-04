import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import WebsiteNavbar from './WebsiteNavbar';
import WebsiteTopBar from './WebsiteTopBar';
import Footer from './Footer';

export default function HomePage() {
  const getInitialLanguage = () => {
    if (typeof window === 'undefined') return 'ar';
    return (localStorage.getItem('siteLang') as 'ar' | 'en') || 'ar';
  };

  const [language, setLanguage] = useState<'ar' | 'en'>(getInitialLanguage());
  const [currentSlide, setCurrentSlide] = useState(0);

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
      heroCtaPrimary: 'اكتشف خدماتنا',
      heroCtaSecondary: 'اتصل بنا',
      whyTitle: 'لماذا المدار الليبـي للتأمين؟',
      servicesTitle: 'خدماتنا التأمينية',
      servicesSubtitle: 'نوفر لك مجموعة شاملة من حلول التأمين المصممة خصيصاً لاحتياجاتك',
      features: [
        { title: 'خبرة طويلة', desc: 'سنوات من الخبرة في مجال التأمين مع فريق محترف' },
        { title: 'ثقة العملاء', desc: 'آلاف العملاء الراضين عن خدماتنا وجودة تعاملنا' },
        { title: 'خدمة سريعة', desc: 'معالجة سريعة للمطالبات وخدمة عملاء على مدار الساعة' },
        { title: 'حماية شاملة', desc: 'تغطية تأمينية واسعة لجميع احتياجاتك' },
      ],
      services: [
        { title: 'تأمين السيارات', desc: 'تأمين شامل وإجباري للسيارات يغطي جميع احتياجاتك من الحماية' },
        { title: 'تأمين المسافرين', desc: 'حماية شاملة للمسافرين أثناء السفر مع تغطية طبية ومالية كاملة' },
        { title: 'تأمين زوار ليبيا', desc: 'تأمين خاص لزوار ليبيا يغطي احتياجاتهم خلال فترة الإقامة' },
        { title: 'تأمين المسؤولية الطبية', desc: 'تأمين المسؤولية المهنية للعاملين في القطاع الطبي' },
        { title: 'تأمين القوارب', desc: 'تأمين شامل للقوارب والمركبات البحرية ضد جميع المخاطر' },
        { title: 'الحوادث الشخصية', desc: 'حماية من الحوادث الشخصية والإصابات مع تعويضات مالية' },
        { title: 'تأمين الحج والعمرة', desc: 'تأمين خاص للحجاج والمعتمرين يغطي جميع احتياجاتهم خلال الرحلة' },
        { title: 'تأمين وافدين للمقيمين', desc: 'تأمين خاص للوافدين المقيمين في ليبيا يغطي احتياجاتهم الصحية والمالية' },
      ],
      discoverMore: 'اكتشف المزيد',
    },
    en: {
      heroCtaPrimary: 'Discover Our Services',
      heroCtaSecondary: 'Contact Us',
      whyTitle: 'Why Almadar Libya Insurance?',
      servicesTitle: 'Our Insurance Services',
      servicesSubtitle: 'We provide a full suite of insurance solutions tailored to your needs',
      features: [
        { title: 'Extensive Experience', desc: 'Years of expertise in insurance with a professional team' },
        { title: 'Customer Trust', desc: 'Thousands of satisfied clients rely on our quality service' },
        { title: 'Fast Service', desc: 'Quick claims processing and 24/7 customer support' },
        { title: 'Comprehensive Protection', desc: 'Wide coverage options for all your needs' },
      ],
      services: [
        { title: 'Car Insurance', desc: 'Comprehensive and mandatory car insurance for full protection' },
        { title: 'Travel Insurance', desc: 'Full protection for travelers with complete medical and financial coverage' },
        { title: 'Libya Visitors Insurance', desc: 'Specialized insurance for visitors to Libya covering their needs during stay' },
        { title: 'Medical Liability Insurance', desc: 'Professional liability insurance for medical sector workers' },
        { title: 'Boat Insurance', desc: 'Comprehensive coverage for boats and marine vessels against all risks' },
        { title: 'Personal Accidents', desc: 'Protection against personal accidents and injuries with financial compensation' },
        { title: 'Hajj and Umrah Insurance', desc: 'Special insurance for pilgrims and Umrah performers covering all their needs during the journey' },
        { title: 'Resident Insurance for Expats', desc: 'Specialized insurance for expatriates residing in Libya covering their health and financial needs' },
      ],
      discoverMore: 'Learn More',
    },
  };

  const slides = useMemo(() => {
    const isAr = language === 'ar';
    return [
      {
        title: isAr ? 'تأمين السيارات الإجباري' : 'Mandatory Car Insurance',
        subtitle: isAr ? 'حماية إلزامية لسيارتك' : 'Required protection for your vehicle',
        description: isAr
          ? 'تأمين إجباري شامل يغطي جميع احتياجاتك من الحماية القانونية والمالية'
          : 'Comprehensive mandatory insurance covering legal and financial needs',
        image: '/img/1.jpg',
        isImage: true,
        icon: 'fas fa-shield-alt'
      },
      {
        title: isAr ? 'تأمين المسافرين' : 'Travel Insurance',
        subtitle: isAr ? 'سافر بكل أمان وراحة' : 'Travel with peace of mind',
        description: isAr
          ? 'تأمين شامل للمسافرين والوافدين يغطي جميع احتياجاتك من الحماية الطبية والمالية'
          : 'Comprehensive coverage for travelers and visitors, including medical and financial protection',
        image: '/img/2.jpg',
        isImage: true,
        icon: 'fas fa-plane'
      },
      {
        title: isAr ? 'تأمين الهياكل البحرية' : 'Marine Hull Insurance',
        subtitle: isAr ? 'حماية شاملة للمركبات البحرية' : 'Full protection for marine vessels',
        description: isAr
          ? 'تأمين شامل للهياكل البحرية والسفن يغطي جميع المخاطر البحرية'
          : 'Comprehensive coverage for marine hulls and vessels against maritime risks',
        image: '/img/3.jpg',
        isImage: true,
        icon: 'fas fa-ship'
      },
      {
        title: isAr ? 'تأمين المسؤولية المهنية (الطبية)' : 'Medical Professional Liability',
        subtitle: isAr ? 'حماية شاملة للعاملين في القطاع الطبي' : 'Comprehensive protection for medical professionals',
        description: isAr
          ? 'تأمين المسؤولية المهنية للعاملين في القطاع الطبي يغطي جميع المخاطر المهنية'
          : 'Liability insurance for medical professionals covering occupational risks',
        image: '/img/4.jpg',
        isImage: true,
        icon: 'fas fa-heartbeat'
      },
      {
        title: isAr ? 'وثائق تأمين الحوادث الشخصية' : 'Personal Accident Insurance',
        subtitle: isAr ? 'حماية من الحوادث والإصابات' : 'Protection against accidents and injuries',
        description: isAr
          ? 'تأمين شامل للحوادث الشخصية يغطي جميع الإصابات والحوادث مع تعويضات مالية'
          : 'Comprehensive personal accident coverage with financial compensation',
        image: '/img/5.jpg',
        isImage: true,
        icon: 'fas fa-user-injured'
      }
    ];
  }, [language]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="website-layout">
      <WebsiteTopBar />
      <WebsiteNavbar />
      
      {/** ترجمة النصوص */}
      {/** يتم استخدام المتغير t لعرض النص حسب اللغة الحالية */}
      {/** t = translations[language] */}
      {/** اللغة الافتراضية العربية */}
      {/** التوجيه بين RTL/LTR يتم في effect أعلاه */}
      {/** الأزرار والروابط تأخذ النص المترجم مباشرة */}
      
      {/* Hero Slider */}
      <section className="hero-slider">
        <div className="slider-container">
          {slides.map((slide, index) => {
            const slideStyle = slide.isImage 
              ? { 
                  backgroundImage: `url(${slide.image})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundColor: '#000'
                }
              : { background: slide.image };
            
            return (
            <div
              key={`slide-${index}`}
              className={`slide ${index === currentSlide ? 'active' : ''}`}
              style={slideStyle}
            >
              <div className="slide-content">
                <h1 className="slide-title">{slide.title}</h1>
                <h2 className="slide-subtitle">{slide.subtitle}</h2>
                <p className="slide-description">{slide.description}</p>
                <div className="slide-actions">
                  <Link to="/insurances" className="btn-primary">
                    {translations[language].heroCtaPrimary}
                  </Link>
                  <Link to="/contact-us" className="btn-secondary">
                    {translations[language].heroCtaSecondary}
                  </Link>
                </div>
              </div>
            </div>
            );
          })}
          
          <button className="slider-nav prev" onClick={prevSlide}>
            <i className="fas fa-chevron-right"></i>
          </button>
          <button className="slider-nav next" onClick={nextSlide}>
            <i className="fas fa-chevron-left"></i>
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">{translations[language].whyTitle}</h2>
          <div className="features-grid">
            {translations[language].features.map((feature, idx) => {
              const icons = ['fas fa-award', 'fas fa-handshake', 'fas fa-clock', 'fas fa-shield-alt'];
              return (
                <div className="feature-card" key={`feature-${idx}`}>
                  <div className="feature-icon">
                    <i className={icons[idx] || 'fas fa-check'}></i>
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="services-preview">
        <div className="container">
          <div className="services-header">
            <h2 className="section-title">{translations[language].servicesTitle}</h2>
            <p className="section-subtitle">{translations[language].servicesSubtitle}</p>
          </div>
          <div className="services-grid">
            <div 
              className="service-card" 
              data-service="car"
              style={{
                backgroundImage: `url(/img/11.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="service-card-overlay"></div>
              <div className="service-card-inner">
                <div
                  className="service-content"
                  style={{
                    direction: language === 'en' ? 'ltr' : 'rtl',
                    textAlign: language === 'en' ? 'left' : 'right',
                  }}
                >
                  <h3>{translations[language].services[0].title}</h3>
                  <p>{translations[language].services[0].desc}</p>
                  <Link to="/insurances" className="service-link">
                    <span>{translations[language].discoverMore}</span>
                    <i className="fas fa-arrow-left"></i>
                  </Link>
                </div>
                <div className="service-card-decoration"></div>
              </div>
            </div>
            <div 
              className="service-card" 
              data-service="travel"
              style={{
                backgroundImage: `url(/img/22.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="service-card-overlay"></div>
              <div className="service-card-inner">
                <div
                  className="service-content"
                  style={{
                    direction: language === 'en' ? 'ltr' : 'rtl',
                    textAlign: language === 'en' ? 'left' : 'right',
                  }}
                >
                  <h3>{translations[language].services[1].title}</h3>
                  <p>{translations[language].services[1].desc}</p>
                  <Link to="/insurances" className="service-link">
                    <span>{translations[language].discoverMore}</span>
                    <i className="fas fa-arrow-left"></i>
                  </Link>
                </div>
                <div className="service-card-decoration"></div>
              </div>
            </div>
            <div 
              className="service-card" 
              data-service="visitors"
              style={{
                backgroundImage: `url(/img/2.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="service-card-overlay"></div>
              <div className="service-card-inner">
                <div
                  className="service-content"
                  style={{
                    direction: language === 'en' ? 'ltr' : 'rtl',
                    textAlign: language === 'en' ? 'left' : 'right',
                  }}
                >
                  <h3>{translations[language].services[2].title}</h3>
                  <p>{translations[language].services[2].desc}</p>
                  <Link to="/insurances" className="service-link">
                    <span>{translations[language].discoverMore}</span>
                    <i className="fas fa-arrow-left"></i>
                  </Link>
                </div>
                <div className="service-card-decoration"></div>
              </div>
            </div>
            <div 
              className="service-card" 
              data-service="medical"
              style={{
                backgroundImage: `url(/img/4.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="service-card-overlay"></div>
              <div className="service-card-inner">
                <div
                  className="service-content"
                  style={{
                    direction: language === 'en' ? 'ltr' : 'rtl',
                    textAlign: language === 'en' ? 'left' : 'right',
                  }}
                >
                  <h3>{translations[language].services[3].title}</h3>
                  <p>{translations[language].services[3].desc}</p>
                  <Link to="/insurances" className="service-link">
                    <span>{translations[language].discoverMore}</span>
                    <i className="fas fa-arrow-left"></i>
                  </Link>
                </div>
                <div className="service-card-decoration"></div>
              </div>
            </div>
            <div 
              className="service-card" 
              data-service="boat"
              style={{
                backgroundImage: `url(/img/3.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="service-card-overlay"></div>
              <div className="service-card-inner">
                <div
                  className="service-content"
                  style={{
                    direction: language === 'en' ? 'ltr' : 'rtl',
                    textAlign: language === 'en' ? 'left' : 'right',
                  }}
                >
                  <h3>{translations[language].services[4].title}</h3>
                  <p>{translations[language].services[4].desc}</p>
                  <Link to="/insurances" className="service-link">
                    <span>{translations[language].discoverMore}</span>
                    <i className="fas fa-arrow-left"></i>
                  </Link>
                </div>
                <div className="service-card-decoration"></div>
              </div>
            </div>
            <div 
              className="service-card" 
              data-service="accident"
              style={{
                backgroundImage: `url(/img/5.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="service-card-overlay"></div>
              <div className="service-card-inner">
                <div
                  className="service-content"
                  style={{
                    direction: language === 'en' ? 'ltr' : 'rtl',
                    textAlign: language === 'en' ? 'left' : 'right',
                  }}
                >
                  <h3>{translations[language].services[5].title}</h3>
                  <p>{translations[language].services[5].desc}</p>
                  <Link to="/insurances" className="service-link">
                    <span>{translations[language].discoverMore}</span>
                    <i className="fas fa-arrow-left"></i>
                  </Link>
                </div>
                <div className="service-card-decoration"></div>
              </div>
            </div>
            <div 
              className="service-card" 
              data-service="hajj"
              style={{
                backgroundImage: `url(/img/1.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="service-card-overlay"></div>
              <div className="service-card-inner">
                <div
                  className="service-content"
                  style={{
                    direction: language === 'en' ? 'ltr' : 'rtl',
                    textAlign: language === 'en' ? 'left' : 'right',
                  }}
                >
                  <h3>{translations[language].services[6].title}</h3>
                  <p>{translations[language].services[6].desc}</p>
                  <Link to="/insurances" className="service-link">
                    <span>{translations[language].discoverMore}</span>
                    <i className="fas fa-arrow-left"></i>
                  </Link>
                </div>
                <div className="service-card-decoration"></div>
              </div>
            </div>
            <div 
              className="service-card" 
              data-service="residents"
              style={{
                backgroundImage: `url(/img/22.jpg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
              }}
            >
              <div className="service-card-overlay"></div>
              <div className="service-card-inner">
                <div
                  className="service-content"
                  style={{
                    direction: language === 'en' ? 'ltr' : 'rtl',
                    textAlign: language === 'en' ? 'left' : 'right',
                  }}
                >
                  <h3>{translations[language].services[7].title}</h3>
                  <p>{translations[language].services[7].desc}</p>
                  <Link to="/insurances" className="service-link">
                    <span>{translations[language].discoverMore}</span>
                    <i className="fas fa-arrow-left"></i>
                  </Link>
                </div>
                <div className="service-card-decoration"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

