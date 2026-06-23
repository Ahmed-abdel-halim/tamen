import { useEffect, useState, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import WebsiteNavbar from './WebsiteNavbar';
import WebsiteTopBar from './WebsiteTopBar';
import Footer from './Footer';
import { API_BASE_URL, BACKEND_URL } from '../config/api';

type Employee = {
  id: number;
  name: string;
  job_title: string;
  profile_photo_url: string | null;
  gender: string;
  personal_phone?: string | null;
};

export default function DepartmentView() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isWorkTeam = location.pathname.includes('/work-team');

  const getInitialLanguage = (): 'ar' | 'en' => {
    if (typeof window === 'undefined') return 'ar';
    const stored = localStorage.getItem('siteLang');
    return stored === 'en' ? 'en' : 'ar';
  };

  const [language, setLanguage] = useState<'ar' | 'en'>(getInitialLanguage());
  const [title, setTitle] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
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
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isWorkTeam) {
          setTitle(language === 'ar' ? 'فريق العمل' : 'Our Work Team');
          const response = await fetch(`${API_BASE_URL}/public/employees`);
          if (response.ok) {
            const data = await response.json();
            setEmployees(data);
          }
        } else if (id) {
          const response = await fetch(`${API_BASE_URL}/public/departments`);
          if (response.ok) {
            const data = await response.json();
            const depId = parseInt(id, 10);
            const dept = data.find((d: any) => d.id === depId);
            if (dept) {
              setTitle(dept.name);
              setEmployees(dept.users || []);
            } else {
              setTitle(language === 'ar' ? 'القسم غير موجود' : 'Department Not Found');
              setEmployees([]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, isWorkTeam, language]);

  const introText = useMemo(() => {
    if (isWorkTeam) {
      return language === 'ar' 
        ? 'نخبة من الكفاءات الشابة والمتميزة التي تسهر على تقديم أفضل الخدمات التأمينية لعملائنا.' 
        : 'A select group of young and distinguished professionals dedicated to providing the best insurance services to our clients.';
    }
    return language === 'ar'
      ? 'نخبة من الخبراء والمتخصصين الذين يسعون جاهدين لتحقيق رؤية وأهداف المؤسسة.'
      : 'A select group of experts and specialists working hard to achieve the vision and goals of our institution.';
  }, [isWorkTeam, language]);

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
          <h2 className="about-hero-title-green">
            {language === 'ar' ? 'أقسام الشركة' : 'Company Departments'}
          </h2>
          <h1 className="about-hero-title-white">{title}</h1>
        </div>
      </section>

      {/* Content & Team Grid Section */}
      <div className="about-sections-wrapper" style={{ minHeight: '400px' }}>
        <section className="team-section-new">
          <div className="container">
            <div className="team-intro-new">
              <h2>{title}</h2>
              <p>{introText}</p>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin fa-3x" style={{ color: '#014cb1', marginBottom: '15px' }}></i>
                <p>{language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading data...'}</p>
              </div>
            ) : employees.length > 0 ? (
              <div className="team-grid-new" style={{ marginTop: '40px' }}>
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
                      <div className="team-info-new" style={{ paddingBottom: '0' }}>
                        <h3>{emp.name}</h3>
                        <p className="team-position-new">{emp.job_title || (language === 'ar' ? 'موظف' : 'Employee')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', marginTop: '30px' }}>
                <i className="fas fa-users fa-3x" style={{ marginBottom: '15px' }}></i>
                <p>{language === 'ar' ? 'لا يوجد موظفون مضافون حالياً في هذا القسم.' : 'No employees currently assigned to this department.'}</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
