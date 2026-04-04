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
      description: language === 'ar' ? 'خبرة تزيد عن 20 عاماً في مجال التأمين' : 'Over 20 years of experience in insurance',
      icon: 'fas fa-user-tie'
    },
    {
      name: 'أ. فاطمة علي',
      position: t.positions.deputy,
      description: language === 'ar' ? 'متخصصة في إدارة المخاطر والتأمين' : 'Specialized in risk management and insurance',
      icon: 'fas fa-user-shield'
    },
    {
      name: 'أ. خالد محمود',
      position: t.positions.operations,
      description: language === 'ar' ? 'خبرة واسعة في إدارة العمليات التأمينية' : 'Extensive experience in insurance operations management',
      icon: 'fas fa-cogs'
    },
    {
      name: 'أ. سارة حسن',
      position: t.positions.sales,
      description: language === 'ar' ? 'خبرة في تطوير الأعمال والمبيعات' : 'Experienced in business development and sales',
      icon: 'fas fa-chart-line'
    }
  ];

  return (
    <div className="website-layout">
      <WebsiteTopBar />
      <WebsiteNavbar />
      
      <section className="management-hero">
        <div className="container">
          <div className="management-hero-content">
            <h1>{t.heroTitle}</h1>
            <p className="management-hero-subtitle">{t.heroSubtitle}</p>
            <p className="management-hero-description">
              {t.heroDesc}
            </p>
          </div>
        </div>
      </section>

      <section className="management-content">
        <div className="container">
          <div className="management-intro">
            <h2>{t.teamTitle}</h2>
            <p>{t.teamIntro}</p>
          </div>

          <div className="management-grid">
            {managementTeam.map((member, index) => (
              <div key={index} className="management-card">
                <div className="management-card-inner">
                  <div className="management-icon-wrapper">
                    <div className="management-icon">
                      <i className={member.icon}></i>
                    </div>
                    <div className="management-icon-bg"></div>
                  </div>
                  <div className="management-info">
                    <h3>{member.name}</h3>
                    <p className="management-position">{member.position}</p>
                    <p className="management-description">{member.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="management-structure">
            <h2 className="section-title">{t.structureTitle}</h2>
            <div className="structure-diagram">
              <div className="structure-level">
                <div className="structure-box main">
                  <div className="structure-icon">
                    <i className="fas fa-crown"></i>
                  </div>
                  <h4>{t.positions.generalManager}</h4>
                  <p>أ. محمد أحمد</p>
                </div>
              </div>
              <div className="structure-connector"></div>
              <div className="structure-level">
                <div className="structure-box">
                  <div className="structure-icon">
                    <i className="fas fa-user-shield"></i>
                  </div>
                  <h4>{t.positions.deputy}</h4>
                  <p>أ. فاطمة علي</p>
                </div>
                <div className="structure-box">
                  <div className="structure-icon">
                    <i className="fas fa-cogs"></i>
                  </div>
                  <h4>{t.positions.operations}</h4>
                  <p>أ. خالد محمود</p>
                </div>
                <div className="structure-box">
                  <div className="structure-icon">
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <h4>{t.positions.sales}</h4>
                  <p>أ. سارة حسن</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

