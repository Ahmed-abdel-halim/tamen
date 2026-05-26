import { useEffect, useMemo, useState } from 'react';
import WebsiteNavbar from './WebsiteNavbar';
import WebsiteTopBar from './WebsiteTopBar';
import Footer from './Footer';

export default function Management() {
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
          heroTitle: 'الإدارة',
          heroSubtitle: 'فريق إداري محترف',
          heroDesc: 'نخبة من الخبراء والمتخصصين في مجال التأمين يعملون بجد لضمان تقديم أفضل الخدمات لعملائنا',
          teamTitle: 'فريق الإدارة',
          teamIntro:
            'يضم فريق إدارة المدار الليبي للتأمين نخبة من الخبراء والمتخصصين في مجال التأمين، الذين يعملون بجد لضمان تقديم أفضل الخدمات لعملائنا.',
          structureTitle: 'الهيكل التنظيمي',
          positions: {
            generalManager: 'المدير العام',
            deputy: 'نائب المدير العام',
            operations: 'مدير العمليات',
            sales: 'مديرة المبيعات',
          },
        }
      : {
          heroTitle: 'Management',
          heroSubtitle: 'Professional Leadership Team',
          heroDesc:
            'A group of experts and specialists in insurance working hard to deliver the best services to our clients.',
          teamTitle: 'Management Team',
          teamIntro:
            'Our management team brings extensive insurance expertise, dedicated to ensuring top-quality services for our clients.',
          structureTitle: 'Organizational Structure',
          positions: {
            generalManager: 'General Manager',
            deputy: 'Deputy General Manager',
            operations: 'Operations Manager',
            sales: 'Sales Manager',
          },
        };
  }, [language]);

  const managementTeam = [
    {
      name: 'أ. محمد أحمد',
      position: t.positions.generalManager,
      description: language === 'ar' ? 'خبرة تزيد عن 25 عاماً في مجال التأمين' : 'Over 25 years of experience in insurance',
      image: '/img/mohamed.png'
    },
    {
      name: 'أ. فاطمة علي',
      position: t.positions.deputy,
      description: language === 'ar' ? 'متخصصة في إدارة المخاطر والتأمين' : 'Specialized in risk management and insurance',
      image: '/img/fatima.png'
    },
    {
      name: 'أ. سارة حسن',
      position: t.positions.sales,
      description: language === 'ar' ? 'خبيرة في تطوير الأعمال والمبيعات' : 'Experienced in business development and sales',
      image: '/img/sara.png'
    },
    {
      name: 'أ. خالد محمود',
      position: t.positions.operations,
      description: language === 'ar' ? 'خبرة واسعة في إدارة العمليات التأمينية' : 'Extensive experience in insurance operations management',
      image: '/img/khaled.png'
    }
  ];

  return (
    <div className="website-layout new-design">
      <WebsiteTopBar />
      <WebsiteNavbar />
      
      {/* Redesigned Premium Hero Section (Matches AboutUs Hero Layout) */}
      <section className="about-hero-new">
        <div className="about-hero-bg">
          <img src="/new/قبل الفوتر 2.png" alt="Skyscraper Cityscape" />
          <div className="about-hero-overlay"></div>
        </div>
        
        <div className="about-hero-content-new">
          <h2 className="about-hero-title-green">{t.heroTitle}</h2>
          <h1 className="about-hero-title-white">{t.heroSubtitle}</h1>
          <p className="about-hero-desc-new">
            {t.heroDesc}
          </p>
        </div>
      </section>

      {/* Redesigned Content & Team Grid Section */}
      <div className="about-sections-wrapper">
        <section className="team-section-new">
          <div className="container">
            <div className="team-intro-new">
              <h2>{t.teamTitle}</h2>
              <p>{t.teamIntro}</p>
            </div>

            <div className="team-grid-new">
              {/* Top Row: General Manager Centered */}
              <div className="team-top-row">
                {managementTeam.slice(0, 1).map((member, idx) => (
                  <div className="team-card-new gm-card" key={`gm-${idx}`}>
                    <div className="team-photo-wrapper">
                      {member.image ? (
                        <img src={member.image} alt={member.name} className="team-photo-new" />
                      ) : (
                        <div className="team-placeholder-new"></div>
                      )}
                    </div>
                    <div className="team-info-new">
                      <h3>{member.name}</h3>
                      <p className="team-position-new">{member.position}</p>
                      <p className="team-desc-new">{member.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Row: 3 Team Members */}
              <div className="team-bottom-row">
                {managementTeam.slice(1).map((member, idx) => (
                  <div className="team-card-new" key={`member-${idx}`}>
                    <div className="team-photo-wrapper">
                      {member.image ? (
                        <img src={member.image} alt={member.name} className="team-photo-new" />
                      ) : (
                        <div className="team-placeholder-new"></div>
                      )}
                    </div>
                    <div className="team-info-new">
                      <h3>{member.name}</h3>
                      <p className="team-position-new">{member.position}</p>
                      <p className="team-desc-new">{member.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

