import { useState, useEffect, useMemo } from 'react';
import WebsiteNavbar from './WebsiteNavbar';
import WebsiteTopBar from './WebsiteTopBar';
import Footer from './Footer';

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
};

export default function BranchesAgentsPage() {
  const [branchesAgents, setBranchesAgents] = useState<BranchAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'وكيل' | 'فرع من شركة'>('all');
  const [searchQuery, setSearchQuery] = useState('');
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
      
      const response = await fetch('http://localhost:8000/api/branches-agents', {
        headers
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle both formats: {data: [...]} or [...]
        const branchesData = Array.isArray(data) ? data : (data.data || []);
        // Filter only active branches/agents and map to correct structure
        const activeData = branchesData
          .filter((item: any) => item.status === 'نشط')
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
            activity: item.activity
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
    <div className="website-layout">
      <WebsiteTopBar />
      <WebsiteNavbar />
      
      <section className="branches-hero">
        <div className="container">
          <div className="branches-hero-content">
            <h1>{t.heroTitle}</h1>
            <p className="branches-hero-subtitle">{t.heroSubtitle}</p>
            <p className="branches-hero-description">
              {t.heroDesc}
            </p>
          </div>
        </div>
      </section>

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
                    <div className="branch-card-header">
                      <div className={`branch-type-badge ${item.type === 'وكيل' ? 'agent' : 'branch'}`}>
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
                      </div>
                    </div>
                    <div className="branch-card-footer">
                      <span className="status-badge active">
                        <i className="fas fa-check-circle"></i>
                        {item.status}
                      </span>
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

