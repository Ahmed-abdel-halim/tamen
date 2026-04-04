import { useEffect, useMemo, useState } from 'react';
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
        };
  }, [language]);

  return (
    <div className="website-layout">
      <WebsiteTopBar />
      <WebsiteNavbar />
      
      <section className="about-hero">
        <div className="container">
          <div className="about-hero-content">
            <h1>{t.heroTitle}</h1>
            <p className="about-hero-subtitle">{t.heroSubtitle}</p>
            <p className="about-hero-description">
              {t.heroDesc}
            </p>
          </div>
        </div>
      </section>

      <section className="about-intro">
        <div className="container">
          <div className="about-intro-content">
            <h2>{t.introTitle}</h2>
            <p>{t.introDesc}</p>
          </div>
        </div>
      </section>

      <section className="about-vision-mission">
        <div className="container">
          <div className="vision-mission-grid">
            <div className="vision-mission-card">
              <div className="card-icon-wrapper">
                <i className="fas fa-eye"></i>
              </div>
              <h3>{t.vision}</h3>
              <p>{t.visionDesc}</p>
            </div>

            <div className="vision-mission-card">
              <div className="card-icon-wrapper">
                <i className="fas fa-bullseye"></i>
              </div>
              <h3>{t.mission}</h3>
              <p>{t.missionDesc}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="about-values">
        <div className="container">
          <h2 className="section-title">{t.valuesTitle}</h2>
          <div className="values-grid">
            {t.values.map((val, idx) => {
              const icons = ['fas fa-shield-alt', 'fas fa-award', 'fas fa-handshake', 'fas fa-lightbulb'];
              return (
                <div className="value-card" key={`value-${idx}`}>
                  <div className="value-icon">
                    <i className={icons[idx] || 'fas fa-check'}></i>
                  </div>
                  <h4>{val.title}</h4>
                  <p>{val.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="about-stats">
        <div className="container">
          <h2 className="section-title">{t.statsTitle}</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="stat-number">1000+</div>
              <div className="stat-label">{t.stats[0]}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-building"></i>
              </div>
              <div className="stat-number">50+</div>
              <div className="stat-label">{t.stats[1]}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <div className="stat-number">10+</div>
              <div className="stat-label">{t.stats[2]}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-clock"></i>
              </div>
              <div className="stat-number">24/7</div>
              <div className="stat-label">{t.stats[3]}</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

