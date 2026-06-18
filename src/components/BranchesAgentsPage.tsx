import { useState, useEffect, useMemo } from 'react';
import WebsiteNavbar from './WebsiteNavbar';
import WebsiteTopBar from './WebsiteTopBar';
import Footer from './Footer';
import NewAgentRegistration from './NewAgentRegistration';
import { API_BASE_URL, resolveImageUrl } from "../config/api";

type BranchAgent = {
  id: number;
  type: 'وكيل' | 'فرع من شركة';
  code: string;
  agency_name: string;
  agent_name: string;
  city: string;
  address?: string;
  phone?: string;
  status: 'نشط' | 'غير نشط';
  activity?: string;
  personal_photo?: string;
  office_facade_photo?: string;
  office_phone?: string;
  office_location?: string;
};

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

export default function BranchesAgentsPage() {
  const [branchesAgents, setBranchesAgents] = useState<BranchAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'وكيل' | 'فرع من شركة'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
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
          heroTitle: 'الوكلاء والفروع',
          heroSubtitle: 'شبكة واسعة من الوكلاء والفروع',
          heroDesc: 'نوفر لك شبكة واسعة من الوكلاء والفروع المنتشرة في جميع أنحاء ليبيا لخدمتك في أي وقت ومكان',
          searchPlaceholder: 'ابحث عن وكيل أو فرع...',
          all: 'الكل',
          agents: 'الوكلاء',
          branches: 'الفروع',
          loading: 'جاري التحميل...',
          empty: 'لا توجد فروع أو وكلاء متاحين حالياً',
          active: 'نشط',
          agentType: 'وكيل',
          branchType: 'فرع من شركة',
          officePhone: 'هاتف المكتب',
          officeLocation: 'موقع المكتب',
        }
      : {
          heroTitle: 'Branches & Agents',
          heroSubtitle: 'A wide network of branches and agents',
          heroDesc: 'We provide a broad network of branches and agents across Libya to serve you anytime, anywhere.',
          searchPlaceholder: 'Search for an agent or branch...',
          all: 'All',
          agents: 'Agents',
          branches: 'Branches',
          loading: 'Loading...',
          empty: 'No branches or agents available currently',
          active: 'Active',
          agentType: 'Agent',
          branchType: 'Branch',
          officePhone: 'Office Phone',
          officeLocation: 'Office Location',
        };
  }, [language]);

  useEffect(() => {
    fetchBranchesAgents();
  }, []);

  const fetchBranchesAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}/branches-agents`, {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle both formats: {data: [...]} or [...]
        const branchesData = Array.isArray(data) ? data : (data.data || []);
        // Filter only active branches/agents and map to correct structure
        const activeData = branchesData
          .filter((item: any) => item.status === 'نشط' && item.show_on_landing !== false && item.show_on_landing !== 0)
          .map((item: any) => ({
            id: item.id,
            type: item.type,
            code: item.code,
            agency_name: item.agency_name,
            agent_name: item.agent_name,
            city: typeof item.city === 'string' ? item.city : (item.city?.name || ''),
            address: item.address,
            phone: item.phone,
            status: item.status,
            activity: item.activity,
            personal_photo: item.personal_photo,
            office_facade_photo: item.office_facade_photo,
            office_phone: item.office_phone,
            office_location: item.office_location,
          }));
        setBranchesAgents(activeData);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBranchesAgents = branchesAgents.filter(item => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = 
      item.agency_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.agent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.city && item.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.phone && item.phone.includes(searchQuery));
    return matchesType && matchesSearch;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const paginatedBranchesAgents = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredBranchesAgents.slice(startIndex, startIndex + pageSize);
  }, [filteredBranchesAgents, currentPage]);

  const totalPages = Math.ceil(filteredBranchesAgents.length / pageSize);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery]);

  return (
    <div className="website-layout new-design">
      <WebsiteTopBar />
      <WebsiteNavbar />
      
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
          <button 
            onClick={() => setShowRegistrationModal(true)}
            style={{
              marginTop: '25px',
              padding: '12px 35px',
              background: '#139625',
              color: '#fff',
              border: 'none',
              borderRadius: '30px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(19, 150, 37, 0.3)',
              transition: 'all 0.3s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              fontFamily: "'Cairo', sans-serif"
            }}
          >
            <i className="fas fa-handshake"></i>
            {language === 'ar' ? 'انضم إلينا كوكيل' : 'Join us as an agent'}
          </button>
        </div>
      </section>

      {showRegistrationModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', overflowY: 'auto'
        }}>
          <div style={{
            background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '900px',
            maxHeight: '90vh', overflowY: 'auto', position: 'relative'
          }}>
            <button 
              onClick={() => setShowRegistrationModal(false)}
              style={{
                position: 'absolute', top: '15px', right: '15px',
                background: 'none', border: 'none', fontSize: '24px',
                cursor: 'pointer', color: '#64748b', zIndex: 10
              }}
            >
              &times;
            </button>
            <NewAgentRegistration onClose={() => setShowRegistrationModal(false)} />
          </div>
        </div>
      )}

      <section className="branches-content">
        <div className="container">
          <div className="branches-filters">
            <div className="search-box">
              <i className="fas fa-search"></i>
              <input
                type="text"
                  placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                {t.all}
              </button>
              <button
                className={`filter-btn ${filterType === 'وكيل' ? 'active' : ''}`}
                onClick={() => setFilterType('وكيل')}
              >
                {t.agents}
              </button>
              <button
                className={`filter-btn ${filterType === 'فرع من شركة' ? 'active' : ''}`}
                onClick={() => setFilterType('فرع من شركة')}
              >
                {t.branches}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <i className="fas fa-spinner fa-spin"></i>
              <p>{t.loading}</p>
            </div>
          ) : paginatedBranchesAgents.length > 0 ? (
            <>
              <div className="branches-grid">
                {paginatedBranchesAgents.map((item) => (
                  <div
                    key={item.id}
                    className="branch-card"
                    style={{
                      direction: language === 'en' ? 'ltr' : 'rtl',
                      textAlign: language === 'en' ? 'left' : 'right',
                    }}
                  >
                    <div className="branch-card-image-wrapper">
                      <img 
                        src={resolveImageUrl(item.office_facade_photo || item.personal_photo) || '/img/khaled.png'} 
                        alt={item.agent_name} 
                        className="branch-card-image" 
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        onError={(e) => {
                          const currentSrc = e.currentTarget.src;
                          // If local dev environment, try fetching from production server before using default avatar
                          if (currentSrc.includes('localhost') || currentSrc.includes('127.0.0.1')) {
                            const storageIndex = currentSrc.indexOf('/storage/');
                            if (storageIndex !== -1) {
                              const path = currentSrc.substring(storageIndex);
                              e.currentTarget.src = `https://api.mli.ly${path}`;
                              return;
                            }
                          }
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/img/khaled.png';
                        }}
                      />
                      <div className={`branch-type-badge-overlay ${item.type === 'وكيل' ? 'agent' : 'branch'}`}>
                        <i className={item.type === 'وكيل' ? 'fas fa-user-tie' : 'fas fa-building'}></i>
                        <span>{item.type === 'وكيل' ? t.agentType : t.branchType}</span>
                      </div>
                    </div>
                    
                    <div
                      className="branch-card-body"
                      style={{
                        direction: language === 'en' ? 'ltr' : 'rtl',
                        textAlign: language === 'en' ? 'left' : 'right',
                      }}
                    >
                      <h3
                        className="branch-name"
                        style={{
                          direction: language === 'en' ? 'ltr' : 'rtl',
                          textAlign: language === 'en' ? 'left' : 'right',
                        }}
                      >
                        {item.agency_name}
                      </h3>
                      <p className="branch-agent-name">
                        <i className="fas fa-user"></i>
                        {item.agent_name}
                      </p>
                      {item.activity && (
                        <p className="branch-activity">
                          <i className="fas fa-briefcase"></i>
                          {item.activity}
                        </p>
                      )}
                      <div className="branch-details">
                        {item.city && (
                          <div
                            className="detail-item"
                            style={{
                              direction: language === 'en' ? 'ltr' : 'rtl',
                              textAlign: language === 'en' ? 'left' : 'right',
                            }}
                          >
                            <i className="fas fa-map-marker-alt"></i>
                            <span>{item.city}</span>
                          </div>
                        )}
                        {item.address && (
                          <div
                            className="detail-item"
                            style={{
                              direction: language === 'en' ? 'ltr' : 'rtl',
                              textAlign: language === 'en' ? 'left' : 'right',
                            }}
                          >
                            <i className="fas fa-location-dot"></i>
                            <span>{item.address}</span>
                          </div>
                        )}
                        {item.phone && (
                          <div
                            className="detail-item"
                            style={{
                              direction: language === 'en' ? 'ltr' : 'rtl',
                              textAlign: language === 'en' ? 'left' : 'right',
                            }}
                          >
                            <i className="fas fa-phone"></i>
                            <a href={`tel:${item.phone}`}>{item.phone}</a>
                          </div>
                        )}
                        {item.office_phone && (
                          <div
                            className="detail-item"
                            style={{
                              direction: language === 'en' ? 'ltr' : 'rtl',
                              textAlign: language === 'en' ? 'left' : 'right',
                            }}
                          >
                            <i className="fas fa-phone-alt"></i>
                            <span style={{ fontWeight: 600 }}>{t.officePhone}: </span>
                            <a href={`tel:${item.office_phone}`}>{item.office_phone}</a>
                          </div>
                        )}
                        {item.office_location && (
                          <div
                            className="detail-item"
                            style={{
                              direction: language === 'en' ? 'ltr' : 'rtl',
                              textAlign: language === 'en' ? 'left' : 'right',
                            }}
                          >
                            <i className="fas fa-map-pin" style={{ color: '#ef4444' }}></i>
                            <a href={item.office_location} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline', fontWeight: 600 }}>
                              {t.officeLocation}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="branch-card-footer">
                      <a 
                        href={item.phone ? getWhatsAppLink(item.phone) : '#'} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="branch-whatsapp-btn"
                      >
                        <i className="fab fa-whatsapp"></i>
                        <span>{language === 'ar' ? 'تواصل الآن' : 'Contact Now'}</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button 
                    className="pagination-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  >
                    <i className={`fas fa-chevron-${language === 'ar' ? 'left' : 'right'}`}></i>
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button 
                    className="pagination-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  >
                    <i className={`fas fa-chevron-${language === 'ar' ? 'right' : 'left'}`}></i>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <i className="fas fa-building"></i>
              <p>{t.empty}</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}

