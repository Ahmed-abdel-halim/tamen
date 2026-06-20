import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import WebsiteNavbar from './WebsiteNavbar';
import Footer from './Footer';
import { API_BASE_URL, resolveImageUrl } from '../config/api';
import { showToast } from './Toast';

export default function HomePage() {
  const getInitialLanguage = () => {
    if (typeof window === 'undefined') return 'ar';
    return (localStorage.getItem('siteLang') as 'ar' | 'en') || 'ar';
  };

  const [language, setLanguage] = useState<'ar' | 'en'>(getInitialLanguage());
  const [entities, setEntities] = useState<{ id: number; name: string; logo_url: string }[]>([]);
  
  // Dynamic Website Data State
  const [sliders, setSliders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({
    phone: '+218 920003366',
    email: 'info@mli.ly',
    address: 'طرابلس، ليبيا',
  });
  
  // Public Insurance Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [requestForm, setRequestForm] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    insurance_type: '',
    request_type: 'new',
    previous_policy_number: '',
    payment_method: 'bank_transfer',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (sliders.length > 0) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % sliders.length);
      }, 7000);
      return () => clearInterval(interval);
    } else {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % 2);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [sliders]);

  useEffect(() => {
    // Fetch external client entities
    const fetchEntities = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/external-entities`);
        if (response.ok) {
          const data = await response.json();
          const filtered = data.filter((item: any) => item.logo_url && item.logo_url.trim() !== '');
          setEntities(filtered);
        }
      } catch (error) {
        console.error('Error fetching external entities:', error);
      }
    };
    
    // Fetch dynamic site settings, sliders and services
    const fetchDynamicWebsiteData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/website-settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
          if (data.sliders) setSliders(data.sliders || []);
          if (data.services) setServices(data.services || []);
        }
      } catch (error) {
        console.error('Error fetching dynamic website data:', error);
      }
    };

    fetchEntities();
    fetchDynamicWebsiteData();
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

  const validateRequestForm = () => {
    const errors: Record<string, string> = {};
    if (!requestForm.name.trim()) {
      errors.name = language === 'ar' ? 'الاسم مطلوب' : 'Name is required';
    }
    if (!requestForm.phone.trim()) {
      errors.phone = language === 'ar' ? 'رقم الهاتف مطلوب' : 'Phone is required';
    }
    if (!requestForm.insurance_type) {
      errors.insurance_type = language === 'ar' ? 'يرجى اختيار نوع التأمين' : 'Please select insurance type';
    }
    if (requestForm.request_type === 'renew' && !requestForm.previous_policy_number.trim()) {
      errors.previous_policy_number = language === 'ar' ? 'رقم الوثيقة السابقة مطلوب للتجديد' : 'Previous policy number is required for renewal';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRequestForm()) return;
    
    setSubmittingRequest(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', requestForm.name);
      formDataToSend.append('phone', requestForm.phone);
      formDataToSend.append('whatsapp', requestForm.whatsapp);
      formDataToSend.append('email', requestForm.email);
      formDataToSend.append('insurance_type', requestForm.insurance_type);
      formDataToSend.append('request_type', requestForm.request_type);
      formDataToSend.append('previous_policy_number', requestForm.previous_policy_number);
      formDataToSend.append('payment_method', requestForm.payment_method);
      
      uploadedFiles.forEach(file => {
        formDataToSend.append('attachments[]', file);
      });

      const res = await fetch(`${API_BASE_URL}/public/insurance-requests`, {
        method: 'POST',
        body: formDataToSend,
      });

      if (!res.ok) {
        throw new Error('فشل إرسال الطلب، يرجى المحاولة لاحقاً');
      }

      setRequestSubmitted(true);
      showToast(language === 'ar' ? 'تم إرسال طلب التأمين بنجاح' : 'Insurance request submitted successfully', 'success');
      setRequestForm({
        name: '',
        phone: '',
        whatsapp: '',
        email: '',
        insurance_type: '',
        request_type: 'new',
        previous_policy_number: '',
        payment_method: 'bank_transfer',
      });
      setUploadedFiles([]);
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ أثناء إرسال الطلب', 'error');
    } finally {
      setSubmittingRequest(false);
    }
  };

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
      discoverMore: 'Discover Services',
      aboutTitle: 'About Us',
      aboutSubtitle: 'Providing comprehensive and innovative insurance solutions',
    },
  };

  const defaultServices = [
    { id: 1, title: 'تأمين السيارات', desc: 'تأمين شامل وإجباري للسيارات يغطي جميع احتياجاتك من الحماية', icon: 'fas fa-car', image: '/new/تامين السيارات .jpg' },
    { id: 5, title: 'تأمين القوارب', desc: 'تأمين شامل للقوارب والمركبات البحرية ضد جميع المخاطر', icon: 'fas fa-ship', image: '/new/تامين المراكب.png' },
    { id: 6, title: 'الحوادث الشخصية', desc: 'حماية من الحوادث الشخصية والإصابات مع تعويضات مالية', icon: 'fas fa-running', image: '/new/الحوادث الشخصية.png' },
    { id: 4, title: 'تأمين طبي', desc: 'تأمين رعاية صحية شامل لك ولعائلتك في أفضل المصحات', icon: 'fas fa-hospital', image: '/new/Local Health Insurance 1.png' },
    { id: 2, title: 'تأمين المسافرين', desc: 'حماية شاملة للمسافرين أثناء السفر مع تغطية طبية ومالية كاملة', icon: 'fas fa-plane', image: '/new/تامين المسافرن.png' },
    { id: 3, title: 'تأمين زوار ليبيا', desc: 'تأمين خاص لزوار ليبيا يغطي احتياجاتهم خلال فترة الإقامة', icon: 'fas fa-map-marked-alt', image: '/new/تامين زوار ليبيا.png' },
    { id: 8, title: 'تأمين وافدين للمقيمين', desc: 'تأمين خاص للوافدين المقيمين في ليبيا يغطي احتياجاتهم الصحية والمالية', icon: 'fas fa-user-tie', image: '/new/تامين الوافدين.png' },
    { id: 7, title: 'تأمين الحج والعمرة', desc: 'تأمين خاص للحجاج والمعتمرين يغطي جميع احتياجاتهم خلال الرحلة', icon: 'fas fa-kaaba', image: '/new/تامين الحج.png' },
  ];

  const defaultServicesEn = [
    { id: 1, title: 'Car Insurance', desc: 'Comprehensive and mandatory car insurance for full protection', icon: 'fas fa-car', image: '/new/تامين السيارات .jpg' },
    { id: 5, title: 'Boat Insurance', desc: 'Comprehensive coverage for boats and marine vessels against all risks', icon: 'fas fa-ship', image: '/new/تامين المراكب.png' },
    { id: 6, title: 'Personal Accidents', desc: 'Protection against personal accidents and injuries with financial compensation', icon: 'fas fa-running', image: '/new/الحوادث الشخصية.png' },
    { id: 4, title: 'Medical Insurance', desc: 'Comprehensive health care insurance for you and your family in the best clinics', icon: 'fas fa-hospital', image: '/new/Local Health Insurance 1.png' },
    { id: 2, title: 'Travel Insurance', desc: 'Full protection for travelers with complete medical and financial coverage', icon: 'fas fa-plane', image: '/new/تامين المسافرن.png' },
    { id: 3, title: 'Libya Visitors Insurance', desc: 'Specialized insurance for visitors to Libya covering their needs during stay', icon: 'fas fa-map-marked-alt', image: '/new/تامين زوار ليبيا.png' },
    { id: 8, title: 'Resident Insurance for Expats', desc: 'Specialized insurance for expatriates residing in Libya covering their health and financial needs', icon: 'fas fa-user-tie', image: '/new/تامين الوافدين.png' },
    { id: 7, title: 'Hajj and Umrah Insurance', desc: 'Special insurance for pilgrims and Umrah performers covering all their needs during the journey', icon: 'fas fa-kaaba', image: '/new/تامين الحج.png' },
  ];

  // Map dynamic backend services to layout
  const activeServices = useMemo(() => {
    if (services.length > 0) {
      return services.map(item => ({
        id: item.id,
        title: language === 'ar' ? item.title_ar : item.title_en,
        desc: language === 'ar' ? item.desc_ar : item.desc_en,
        icon: item.icon || 'fas fa-shield-alt',
        image: item.image_url ? resolveImageUrl(item.image_url) : '/new/تامين السيارات .jpg'
      }));
    }
    return language === 'ar' ? defaultServices : defaultServicesEn;
  }, [services, language]);

  const getServiceIcon = (idx: number, iconClass?: string) => {
    if (iconClass) {
      return <i className={iconClass} style={{ fontSize: '24px', color: '#16a34a' }}></i>;
    }
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
      case 0:
        return (
          <svg {...iconProps}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M7 14h10M6 11h12M8 11V9c0-1 1-1.5 2-1.5h4c1 0 2 .5 2 1v2" strokeWidth="1.5" />
            <circle cx="8.5" cy="14" r="0.8" />
            <circle cx="15.5" cy="14" r="0.8" />
          </svg>
        );
      case 1:
        return (
          <svg {...iconProps}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M6 14l3-3h6l3 3M8 11V8.5h4V11" strokeWidth="1.5" />
            <path d="M5 16.5s2-.8 4-.8 4 .8 6 .8 4-.8 4-.8" strokeWidth="1.5" />
          </svg>
        );
      case 2:
        return (
          <svg {...iconProps}>
            <rect x="2" y="6" width="20" height="14" rx="3" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M12 10v6M9 13h6" strokeWidth="2.5" />
          </svg>
        );
      case 3:
        return (
          <svg {...iconProps}>
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            <path d="M5.5 12h2.5l1.5-3 2 6 1.5-3h3" strokeWidth="2.2" />
          </svg>
        );
      case 4:
        return (
          <svg {...iconProps}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" opacity="0.4" />
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.9-.2-1.6.3-1.6 1.2l.4 1.8 6.2 2.8-2.8 2.8-3.6-1.1c-.7-.2-1.2.3-1.1.9l.7 2.1 2.5 2.5 2.1.7c.6.1 1.1-.4.9-1.1l-1.1-3.6 2.8-2.8 2.8 6.2 1.8.4c.9 0 1.4-.7 1.2-1.6Z" />
          </svg>
        );
      case 5:
        return (
          <svg {...iconProps}>
            <rect x="4" y="9" width="16" height="11" rx="2" />
            <path d="M8 9V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" />
            <path d="M12 11.5c-1 0-1.8.8-1.8 1.8s1.8 2.7 1.8 2.7 1.8-1.7 1.8-2.7-.8-1.8-1.8-1.8z" fill="currentColor" opacity="0.35" />
            <circle cx="12" cy="13.3" r="0.6" fill="currentColor" />
          </svg>
        );
      case 6:
        return (
          <svg {...iconProps}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <circle cx="12" cy="9" r="3" />
            <path d="M6 17a6 6 0 0 1 12 0" />
          </svg>
        );
      case 7:
        return (
          <svg {...iconProps}>
            <path d="M12 2L3 6.5v10L12 21l9-4.5v-10L12 2z" />
            <path d="M12 21V11M3 6.5L12 11l9-4.5" />
            <rect x="14.5" y="11.5" width="3.5" height="5.5" rx="0.5" strokeWidth="1.5" />
            <path d="M3 9.8l9 4.5 9-4.5" strokeWidth="1" strokeDasharray="3,3" />
          </svg>
        );
      default:
        return <i className="fas fa-shield-alt"></i>;
    }
  };

  const t = translations[language];

  return (
    <div className="website-layout new-design">
      <WebsiteNavbar />
      
      {/* Hero Banner Section */}
      <section className="hero-banner-new">
        <div className="hero-bg-container">
          {sliders.length > 0 ? (
            sliders.map((slider, idx) => (
              <div 
                key={slider.id}
                className="hero-bg-slide"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: currentImageIndex === idx ? 1 : 0,
                  transition: 'opacity 1.5s ease-in-out',
                  zIndex: currentImageIndex === idx ? 1 : 0
                }}
              >
                {slider.media_type === 'image' ? (
                  <img 
                    src={resolveImageUrl(slider.media_url)} 
                    alt={slider.title_ar || "Banner"} 
                    className="hero-bg-img" 
                    style={{ width: '100%', height: '100%', objectFit: 'fill' }}
                  />
                ) : (
                  <video 
                    src={resolveImageUrl(slider.media_url)} 
                    autoPlay 
                    muted 
                    loop 
                    className="hero-bg-img"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
            ))
          ) : (
            // Fallback static banners
            ['/new/قبل الفوتر1.png', '/new/قبل الفوتر 3.png'].map((src, idx) => (
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
            ))
          )}
          <div className="hero-overlay" style={{ zIndex: 2 }}></div>
        </div>
        
        <div className="hero-content-container" style={{ zIndex: 3 }}>
          <div className="hero-text-content">
            <h1 className="hero-main-title">
              {sliders.length > 0 && sliders[currentImageIndex]
                ? (language === 'ar' ? sliders[currentImageIndex].title_ar : sliders[currentImageIndex].title_en) || t.heroTitle
                : t.heroTitle}
            </h1>
            <p className="hero-main-subtitle">
              {sliders.length > 0 && sliders[currentImageIndex]
                ? (language === 'ar' ? sliders[currentImageIndex].subtitle_ar : sliders[currentImageIndex].subtitle_en) || t.heroSubtitle
                : (language === 'ar' ? (
                    <>
                      شركة تأمين رائدة في ليبيا، نقدم حلولاً تأمينية
                      <br className="hero-br" />
                      شاملة ومبتكرة لحماية مستقبلك وممتلكاتك
                    </>
                  ) : (
                    t.heroSubtitle
                  ))
              }
            </p>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-start', flexWrap: 'wrap', marginTop: '20px' }}>
              <Link to="/contact-us" className="hero-join-btn" style={{ textDecoration: 'none' }}>
                {language === 'ar' ? <i className="fas fa-handshake" style={{marginLeft: '8px'}}></i> : <i className="fas fa-handshake" style={{marginRight: '8px'}}></i>}
                {t.heroCtaPrimary}
              </Link>
              <button 
                onClick={() => {
                  setShowRequestModal(true);
                  setRequestSubmitted(false);
                }} 
                className="hero-join-btn" 
                style={{ background: '#33b349', borderColor: '#33b349', color: '#fff', cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center' }}
              >
                <i className="fas fa-file-signature" style={{ marginLeft: language === 'ar' ? '8px' : '0', marginRight: language === 'en' ? '8px' : '0' }}></i>
                <span>{language === 'ar' ? 'طلب أو تجديد وثيقة تأمين' : 'Request / Renew Policy'}</span>
              </button>
            </div>
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
            <h2 className="clients-title">{language === 'ar' ? 'عملاؤنا' : 'Our Clients'}</h2>
            <p className="clients-subtitle">{language === 'ar' ? 'شركاء يثقون بنا' : 'Partners Who Trust Us'}</p>
            {entities.length > 0 ? (
               <div className="clients-slider-container">
                  <div className="clients-slider-track">
                     {[...entities, ...entities, ...entities, ...entities, ...entities, ...entities].map((entity, idx) => (
                        <div className="client-logo-item" key={`client-${entity.id}-${idx}`}>
                           <img 
                              src={resolveImageUrl(entity.logo_url)} 
                              alt={entity.name} 
                              className="client-logo-img" 
                           />
                        </div>
                     ))}
                  </div>
               </div>
            ) : (
               <div className="clients-logos">
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
                  <p>{language === 'ar' ? 'نعمل على تقديم خدمات تأمينية تمنح الأفراد والشركات في ليبيا حماية موثوقة، وحلولاً تساعدهم على مواجهة المستقبل بثقة واستقرار.' : 'We work to provide insurance services that grant individuals and companies in Libya reliable protection and solutions that help them face the future with confidence and stability.'}</p>
                  <Link to="/insurances" className="info-block-btn" style={{ textDecoration: 'none' }}>
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
                  <p>{language === 'ar' ? 'نؤمن بأن الثقة تُبنى من خلال الوضوح والالتزام. لذلك نحرص على توفير تجربة تأمينية متكاملة تجمع بين الجودة، السرعة، والاهتمام الحقيقي بعملائنا.' : 'We believe that trust is built through clarity and commitment. Therefore, we are keen to provide an integrated insurance experience that combines quality, speed, and real care for our customers.'}</p>
                  <Link to="/insurances" className="info-block-btn" style={{ textDecoration: 'none' }}>
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
            <p className="section-subtitle-new blue-text">{language === 'ar' ? 'حلول تأمينية متكاملة' : 'Integrated Insurance Solutions'}</p>
          </div>
          <div className="services-grid-new">
            {activeServices.map((service, idx) => (
              <Link 
                to={`/insurances#insurance-${service.id}`}
                className="service-card-new" 
                key={`service-${idx}`}
                style={{ backgroundImage: `url("${encodeURI(service.image)}")`, textDecoration: 'none' }}
              >
                <div className="service-card-overlay"></div>
                <div className="service-card-content">
                  <div className="service-icon-new">
                    {getServiceIcon(idx, service.icon)}
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
                        <span dir="ltr">{settings.phone}</span>
                     </div>
                     <div className="contact-info-item">
                        <i className="fas fa-envelope"></i>
                        <span>{settings.email}</span>
                     </div>
                  </div>
               </div>
               <div className="help-banner-img" style={{backgroundImage: 'url("/new/قبل الفوتر 1.png")'}}></div>
            </div>
         </div>
      </section>

      {/* Public Request Insurance Modal */}
      {showRequestModal && (
        <div className="modal" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999 }} onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" style={{ background: "var(--panel)", borderRadius: "12px", width: "90%", maxWidth: "600px", maxHeight: "90vh", overflowY: "auto", padding: "25px", color: "var(--text)", textAlign: "right", direction: language === 'ar' ? 'rtl' : 'ltr' }} onClick={(e) => e.stopPropagation()}>
            
            {requestSubmitted ? (
              // Success Screen
              <div style={{ textAlign: "center", padding: "30px 10px" }}>
                <div style={{ color: "#10b981", fontSize: "4.5rem", marginBottom: "20px" }}>
                  <i className="fa-regular fa-circle-check"></i>
                </div>
                <h2>{language === 'ar' ? 'شكراً لك، تم إرسال طلبك بنجاح!' : 'Thank you, Request Sent Successfully!'}</h2>
                <p style={{ color: "var(--text-muted)", marginTop: "15px", marginBottom: "30px", fontSize: "1.1rem" }}>
                  {language === 'ar' 
                    ? 'لقد استلمنا طلب التأمين الخاص بك. سيقوم أحد موظفي خدمة العملاء بمراجعته والتواصل معك في أقرب وقت ممكن.' 
                    : 'We have received your insurance request. A customer service representative will review it and contact you as soon as possible.'}
                </p>
                <button 
                  onClick={() => setShowRequestModal(false)}
                  style={{ padding: "12px 30px", background: "var(--accent-cyan)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "1rem" }}
                >
                  {language === 'ar' ? 'إغلاق النافذة' : 'Close'}
                </button>
              </div>
            ) : (
              // Form Screen
              <>
                <div className="modal-header" style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "20px" }}>
                  <h3 style={{ margin: 0 }}>
                    {language === 'ar' ? 'طلب وثيقة تأمين جديدة أو تجديد' : 'Request / Renew Insurance Policy'}
                  </h3>
                  <button 
                    onClick={() => setShowRequestModal(false)} 
                    style={{ border: "none", background: "none", fontSize: "24px", cursor: "pointer", color: "var(--text)" }}
                  >
                    &times;
                  </button>
                </div>

                <form onSubmit={handleRequestSubmit} className="user-form" style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                  <div className="form-group">
                    <label>{language === 'ar' ? 'الاسم بالكامل' : 'Full Name'} <span className="required">*</span></label>
                    <input
                      type="text"
                      value={requestForm.name}
                      onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                      placeholder={language === 'ar' ? 'أدخل اسمك ثلاثي' : 'Enter your full name'}
                      className={formErrors.name ? 'error' : ''}
                      required
                    />
                    {formErrors.name && <span className="error-message" style={{ color: "#ef4444", fontSize: "12px" }}>{formErrors.name}</span>}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                    <div className="form-group">
                      <label>{language === 'ar' ? 'رقم الهاتف' : 'Phone Number'} <span className="required">*</span></label>
                      <input
                        type="tel"
                        value={requestForm.phone}
                        onChange={(e) => setRequestForm({ ...requestForm, phone: e.target.value })}
                        placeholder="09XXXXXXXX"
                        className={formErrors.phone ? 'error' : ''}
                        required
                      />
                      {formErrors.phone && <span className="error-message" style={{ color: "#ef4444", fontSize: "12px" }}>{formErrors.phone}</span>}
                    </div>

                    <div className="form-group">
                      <label>{language === 'ar' ? 'رقم الواتساب' : 'WhatsApp Number'}</label>
                      <input
                        type="tel"
                        value={requestForm.whatsapp}
                        onChange={(e) => setRequestForm({ ...requestForm, whatsapp: e.target.value })}
                        placeholder="09XXXXXXXX"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                    <input
                      type="email"
                      value={requestForm.email}
                      onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                      placeholder="example@mail.com"
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                    <div className="form-group">
                      <label>{language === 'ar' ? 'نوع التأمين المطلوب' : 'Insurance Type'} <span className="required">*</span></label>
                      <select
                        value={requestForm.insurance_type}
                        onChange={(e) => setRequestForm({ ...requestForm, insurance_type: e.target.value })}
                        className={formErrors.insurance_type ? 'error' : ''}
                        required
                      >
                        <option value="">{language === 'ar' ? '-- اختر نوع التأمين --' : '-- Select Type --'}</option>
                        {defaultServices.map(item => (
                          <option key={item.id} value={item.title}>
                            {language === 'ar' ? item.title : defaultServicesEn.find(e => e.id === item.id)?.title || item.title}
                          </option>
                        ))}
                      </select>
                      {formErrors.insurance_type && <span className="error-message" style={{ color: "#ef4444", fontSize: "12px" }}>{formErrors.insurance_type}</span>}
                    </div>

                    <div className="form-group">
                      <label>{language === 'ar' ? 'نوع الطلب' : 'Request Type'} <span className="required">*</span></label>
                      <select
                        value={requestForm.request_type}
                        onChange={(e) => setRequestForm({ ...requestForm, request_type: e.target.value })}
                        required
                      >
                        <option value="new">{language === 'ar' ? 'طلب وثيقة جديدة' : 'New Policy Request'}</option>
                        <option value="renew">{language === 'ar' ? 'تجديد وثيقة سابقة' : 'Policy Renewal'}</option>
                      </select>
                    </div>
                  </div>

                  {requestForm.request_type === 'renew' && (
                    <div className="form-group">
                      <label>{language === 'ar' ? 'رقم الوثيقة السابقة المراد تجديدها' : 'Previous Policy Number'} <span className="required">*</span></label>
                      <input
                        type="text"
                        value={requestForm.previous_policy_number}
                        onChange={(e) => setRequestForm({ ...requestForm, previous_policy_number: e.target.value })}
                        placeholder={language === 'ar' ? 'أدخل رقم وثيقتك القديمة' : 'Enter old policy number'}
                        className={formErrors.previous_policy_number ? 'error' : ''}
                        required
                      />
                      {formErrors.previous_policy_number && <span className="error-message" style={{ color: "#ef4444", fontSize: "12px" }}>{formErrors.previous_policy_number}</span>}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                    <div className="form-group">
                      <label>{language === 'ar' ? 'طريقة الدفع والتخليص' : 'Payment Method'} <span className="required">*</span></label>
                      <select
                        value={requestForm.payment_method}
                        onChange={(e) => setRequestForm({ ...requestForm, payment_method: e.target.value })}
                        required
                      >
                        <option value="bank_transfer">{language === 'ar' ? 'حوالة مصرفية' : 'Bank Transfer'}</option>
                        <option value="cash">{language === 'ar' ? 'نقدي (كاش)' : 'Cash'}</option>
                        <option value="visa">{language === 'ar' ? 'بطاقة فيزا / سداد' : 'Visa / Sadad'}</option>
                        <option value="other">{language === 'ar' ? 'أخرى' : 'Other'}</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>{language === 'ar' ? 'مرفقات ومستندات (رخصة، هوية، إلخ)' : 'Attachments (ID, License, etc.)'}</label>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => {
                          if (e.target.files) {
                            setUploadedFiles(Array.from(e.target.files));
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="form-actions" style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                    <button 
                      type="button" 
                      className="btn-cancel" 
                      onClick={() => setShowRequestModal(false)}
                      style={{ padding: "10px 20px", borderRadius: "8px", cursor: "pointer" }}
                    >
                      {language === 'ar' ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button 
                      type="submit" 
                      className="btn-submit" 
                      disabled={submittingRequest}
                      style={{ padding: "10px 25px", background: "var(--accent-cyan)", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}
                    >
                      {submittingRequest 
                        ? (language === 'ar' ? 'جاري الإرسال...' : 'Sending...') 
                        : (language === 'ar' ? 'إرسال الطلب' : 'Submit Request')}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
