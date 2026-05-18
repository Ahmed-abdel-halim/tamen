import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import WebsiteNavbar from './WebsiteNavbar';
import WebsiteTopBar from './WebsiteTopBar';
import Footer from './Footer';

export default function AboutUs() {
  const getInitialLanguage = (): 'ar' | 'en' => {
    if (typeof window === 'undefined') return 'ar';
    const stored = localStorage.getItem('siteLang');
    return stored === 'en' ? 'en' : 'ar';
  };

  const [language, setLanguage] = useState<'ar' | 'en'>(getInitialLanguage());

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

  const t = useMemo(() => {
    return language === 'ar'
      ? {
          heroTitle: 'من نحن',
          heroSubtitle: 'المدار الليبي للتأمين',
          heroDesc: 'شركة تأمين رائدة في ليبيا، نقدم حلولاً تأمينية شاملة ومبتكرة لحماية مستقبلك وممتلكاتك',
          introTitle: 'نحن نؤمن بحماية ما يهمك',
          introDesc:
            'منذ تأسيسنا، كنا ملتزمين بتقديم أفضل خدمات التأمين لعملائنا في جميع أنحاء ليبيا. نحن نؤمن بأن كل عميل يستحق الحماية الكاملة والخدمة المتميزة، ولهذا نعمل بلا كلل لتوفير حلول تأمينية تلبي احتياجاتك وتتجاوز توقعاتك.',
          vision: 'رؤيتنا',
          visionDesc:
            'نسعى لأن نكون الشركة الرائدة في مجال التأمين في ليبيا، من خلال تقديم خدمات تأمينية متميزة تلبي احتياجات عملائنا وتوفر لهم الحماية والأمان الذي يستحقونه.',
          mission: 'مهمتنا',
          missionDesc:
            'تقديم حلول تأمينية شاملة ومبتكرة لعملائنا، مع الحفاظ على أعلى معايير الجودة والشفافية في التعامل، وبناء علاقات طويلة الأمد مبنية على الثقة والاحترام المتبادل.',
          valuesTitle: 'قيمنا الأساسية',
          values: [
            { title: 'الشفافية', desc: 'نؤمن بالشفافية الكاملة في جميع معاملاتنا وعلاقاتنا مع عملائنا' },
            { title: 'الجودة', desc: 'نلتزم بأعلى معايير الجودة في جميع خدماتنا وتفاعلاتنا' },
            { title: 'الموثوقية', desc: 'نحن شريك موثوق يمكنك الاعتماد عليه في جميع الأوقات' },
            { title: 'الابتكار', desc: 'نسعى دائماً لتطوير خدماتنا وتقديم حلول مبتكرة ومتطورة' },
          ],
          statsTitle: 'إحصائياتنا',
          stats: ['عميل راضٍ', 'وكيل وفروع', 'أنواع تأمين', 'خدمة عملاء'],
          discoverMore: 'اكتشف خدماتنا',
        }
      : {
          heroTitle: 'About Us',
          heroSubtitle: 'Almadar Libya Insurance',
          heroDesc:
            'A leading insurance company in Libya, providing comprehensive and innovative solutions to protect your future and assets.',
          introTitle: 'We believe in protecting what matters to you',
          introDesc:
            'Since our founding, we have been committed to offering the best insurance services across Libya. Every client deserves full protection and outstanding service, so we work tirelessly to deliver solutions that meet your needs and exceed expectations.',
          vision: 'Our Vision',
          visionDesc:
            'To be the leading insurance company in Libya by delivering exceptional insurance services that meet our clients’ needs and provide the protection they deserve.',
          mission: 'Our Mission',
          missionDesc:
            'To provide comprehensive and innovative insurance solutions while maintaining the highest standards of quality and transparency, building long-term relationships based on trust and mutual respect.',
          valuesTitle: 'Our Core Values',
          values: [
            { title: 'Transparency', desc: 'We believe in complete transparency in all dealings with our clients.' },
            { title: 'Quality', desc: 'We adhere to the highest standards of quality in all our services and interactions.' },
            { title: 'Reliability', desc: 'A trusted partner you can rely on at all times.' },
            { title: 'Innovation', desc: 'We continuously develop our services and deliver advanced, innovative solutions.' },
          ],
          statsTitle: 'Our Stats',
          stats: ['Satisfied Clients', 'Agents & Branches', 'Insurance Types', 'Customer Support'],
          discoverMore: 'Discover Our Services',
        };
  }, [language]);

  const getValueIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('شفاف') || lower.includes('transpa')) return 'far fa-eye';
    if (lower.includes('جودة') || lower.includes('quality')) return 'far fa-star';
    if (lower.includes('موثوق') || lower.includes('reliab')) return 'far fa-handshake';
    return 'far fa-lightbulb';
  };

  return (
    <div className="website-layout new-design">
      <WebsiteTopBar />
      <WebsiteNavbar />
      
      {/* Redesigned Premium Hero Section */}
      <section className="about-hero-new">
        <div className="about-hero-bg">
          <img src="/new/قبل الفوتر 2.png" alt="Skyscraper Cityscape" />
          <div className="about-hero-overlay"></div>
        </div>
        
        <div className="about-hero-content-new">
          <h2 className="about-hero-title-green">{t.heroTitle}</h2>
          <h1 className="about-hero-title-white">{t.heroSubtitle}</h1>
          <p className="about-hero-desc-new">
            {language === 'ar' ? (
              <>
                شركة تأمين رائدة في ليبيا، نقدم حلولاً تأمينية
                <br />
                شاملة ومبتكرة لحماية مستقبلك وممتلكاتك
              </>
            ) : (
              t.heroDesc
            )}
          </p>
        </div>
      </section>

      {/* Floating Statistics Strip Section */}
      <div className="about-stats-container">
        <div className="about-stats-floating">
          {/* Stat 1: Clients */}
          <div className="about-stat-item-new">
            <div className="about-stat-icon-box">
              <i className="far fa-user"></i>
            </div>
            <div className="about-stat-content-new">
              <span className="about-stat-number-new">+1000</span>
              <span className="about-stat-label-new">{t.stats[0]}</span>
            </div>
          </div>

          {/* Stat 2: Branches */}
          <div className="about-stat-item-new">
            <div className="about-stat-icon-box">
              <i className="far fa-building"></i>
            </div>
            <div className="about-stat-content-new">
              <span className="about-stat-number-new">+50</span>
              <span className="about-stat-label-new">{t.stats[1]}</span>
            </div>
          </div>

          {/* Stat 3: Insurance Types */}
          <div className="about-stat-item-new">
            <div className="about-stat-icon-box">
              <i className="far fa-check-circle"></i>
            </div>
            <div className="about-stat-content-new">
              <span className="about-stat-number-new">+8</span>
              <span className="about-stat-label-new">{t.stats[2]}</span>
            </div>
          </div>

          {/* Stat 4: Support */}
          <div className="about-stat-item-new">
            <div className="about-stat-icon-box">
              <i className="far fa-clock"></i>
            </div>
            <div className="about-stat-content-new">
              <span className="about-stat-number-new">24/7</span>
              <span className="about-stat-label-new">{t.stats[3]}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="about-sections-wrapper">
        {/* Redesigned Vision & Mission Info Blocks Section */}
        <section className="info-blocks-section" style={{ padding: '40px 0 60px 0' }}>
          <div className="container">
            {/* Vision Row: Text Left, Image Right (Reverse in RTL) */}
            <div className="info-block-row reverse">
              <div className="info-block-text">
                <h2 className="about-block-title">{t.vision}</h2>
                <p style={{ color: '#014c93', fontSize: '20px', lineHeight: '1.8', marginBottom: '30px' }}>
                  {t.visionDesc}
                </p>
                <Link to="/insurances" className="info-block-btn">
                  {t.discoverMore}
                  {language === 'ar' ? <i className="fas fa-arrow-left"></i> : <i className="fas fa-arrow-right"></i>}
                </Link>
              </div>
              <div className="info-block-img">
                <div className="img-wrapper" style={{ backgroundImage: 'url(/new/first.png)' }}></div>
              </div>
            </div>

            {/* Mission Row: Image Left, Text Right (Standard in RTL) */}
            <div className="info-block-row">
              <div className="info-block-text">
                <h2 className="about-block-title">{t.mission}</h2>
                <p style={{ color: '#014c93', fontSize: '20px', lineHeight: '1.8', marginBottom: '30px' }}>
                  {t.missionDesc}
                </p>
                <Link to="/insurances" className="info-block-btn">
                  {t.discoverMore}
                  {language === 'ar' ? <i className="fas fa-arrow-left"></i> : <i className="fas fa-arrow-right"></i>}
                </Link>
              </div>
              <div className="info-block-img">
                <div className="img-wrapper" style={{ backgroundImage: 'url(/new/secnd.png)' }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* Redesigned Core Values Card Grid Section */}
        <section className="about-values-section">
          <div className="container">
            <div className="about-values-card-container">
              <h2 className="section-title-new text-white text-center" style={{ marginBottom: '50px' }}>
                {t.valuesTitle}
              </h2>
              
              <div className="about-values-grid">
                {t.values.map((val, idx) => (
                  <div className="about-value-card" key={`val-new-${idx}`}>
                    <div className="about-value-icon-box">
                      <i className={getValueIcon(val.title)}></i>
                    </div>
                    <h4>{val.title}</h4>
                    <p>{val.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Redesigned Wide Bottom Belief Section */}
        <section className="about-bottom-banner">
          <div className="container">
            <h2 className="about-bottom-title">{language === 'ar' ? 'نحن نؤمن بحماية ما يهمك' : 'We Believe in Protecting What Matters to You'}</h2>
            <p className="about-bottom-desc">
              {language === 'ar' ? (
                <>
                  منذ تأسيسنا، كنا ملتزمين بتقديم أفضل خدمات التأمين لعملائنا في جميع أنحاء
                  <br />
                  ليبيا. نحن نؤمن بأن كل عميل يستحق الحماية الكاملة والخدمة المتميزة، ولهذا
                  <br />
                  نعمل بلا كلل لتوفير حلول تأمينية تلبي احتياجاتك وتتجاوز توقعاتك.
                </>
              ) : (
                t.introDesc
              )}
            </p>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

