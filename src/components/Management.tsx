import { useEffect, useMemo, useState } from 'react';
import WebsiteNavbar from './WebsiteNavbar';
import WebsiteTopBar from './WebsiteTopBar';
import Footer from './Footer';
import { API_BASE_URL, BACKEND_URL } from '../config/api';

const getWhatsAppLink = (phone: string) => {
  if (!phone) return '#';
  const arabicNums = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let clean = phone;
  for (let i = 0; i < 10; i++) {
    const regex = new RegExp(arabicNums[i], 'g');
    clean = clean.replace(regex, i.toString());
  }
  clean = clean.replace(/[^\d]/g, '');
  
  if (clean.startsWith('0')) {
    clean = '218' + clean.slice(1);
  } else if (!clean.startsWith('218') && clean.length === 9) {
    clean = '218' + clean;
  }
  return `https://wa.me/${clean}`;
};

export default function Management() {
  const getInitialLanguage = (): 'ar' | 'en' => {
    if (typeof window === 'undefined') return 'ar';
    const stored = localStorage.getItem('siteLang');
    return stored === 'en' ? 'en' : 'ar';
  };

  const [language, setLanguage] = useState<'ar' | 'en'>(getInitialLanguage());
  const [employees, setEmployees] = useState<{ id: number; name: string; job_title: string; profile_photo_url: string | null; gender: string; personal_phone?: string | null }[]>([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/public/employees`);
        if (response.ok) {
          const data = await response.json();
          setEmployees(data);
        }
      } catch (error) {
        console.error('Error fetching public employees:', error);
      }
    };
    fetchEmployees();
  }, []);

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

        {employees.length > 0 && (
          <section className="team-section-new" style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '60px', marginTop: '40px' }}>
            <div className="container">
              <div className="team-intro-new">
                <h2>{language === 'ar' ? 'فريق العمل' : 'Our Team'}</h2>
                <p>
                  {language === 'ar' 
                    ? 'نخبة من الكفاءات الشابة والمتميزة التي تسهر على تقديم أفضل الخدمات التأمينية لعملائنا.' 
                    : 'A select group of young and distinguished professionals dedicated to providing the best insurance services to our clients.'}
                </p>
              </div>

              <div className="team-grid-new">
                <div className="team-bottom-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '30px', marginTop: '20px' }}>
                  {employees.map((emp) => (
                    <div className="team-card-new" key={emp.id} style={{ margin: '0 auto', width: '100%', maxWidth: '340px' }}>
                      <div className="team-photo-wrapper">
                        {emp.profile_photo_url ? (
                          <img 
                            src={`${BACKEND_URL}${emp.profile_photo_url}`} 
                            alt={emp.name} 
                            className="team-photo-new" 
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = emp.gender === 'أنثى' ? '/img/fatima.png' : '/img/khaled.png';
                            }}
                          />
                        ) : (
                          <div className="team-placeholder-new" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#cbd5e1', height: '100%' }}>
                            <i className="fas fa-user fa-4x"></i>
                          </div>
                        )}
                      </div>
                      <div className="team-info-new" style={{ paddingBottom: emp.personal_phone ? '15px' : '0' }}>
                        <h3>{emp.name}</h3>
                        <p className="team-position-new">{emp.job_title || (language === 'ar' ? 'موظف' : 'Employee')}</p>
                        {emp.personal_phone && (
                          <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', width: '100%' }}>
                            <span style={{ fontSize: '0.9rem', color: '#64748b', direction: 'ltr', display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <i className="fas fa-phone" style={{ color: '#139625' }}></i>
                              {emp.personal_phone}
                            </span>
                            <a 
                              href={getWhatsAppLink(emp.personal_phone)} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#25D366',
                                color: '#fff',
                                padding: '8px 18px',
                                borderRadius: '20px',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                textDecoration: 'none',
                                boxShadow: '0 4px 10px rgba(37, 211, 102, 0.2)',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 15px rgba(37, 211, 102, 0.3)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 4px 10px rgba(37, 211, 102, 0.2)';
                              }}
                            >
                              <i className="fab fa-whatsapp" style={{ fontSize: '1.1rem' }}></i>
                              <span>{language === 'ar' ? 'تواصل واتساب' : 'WhatsApp'}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <Footer />
    </div>
  );
}

