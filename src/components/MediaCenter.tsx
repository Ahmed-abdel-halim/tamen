import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import WebsiteNavbar from './WebsiteNavbar';
import WebsiteTopBar from './WebsiteTopBar';
import Footer from './Footer';
import { API_BASE_URL, resolveImageUrl } from '../config/api';

export default function MediaCenter() {
  const { type: urlType, id } = useParams<{ type: string; id?: string }>();
  const navigate = useNavigate();

  const type = useMemo(() => {
    if (urlType === 'photos') return 'photo';
    if (urlType === 'videos') return 'video';
    if (urlType === 'audios') return 'audio';
    return urlType;
  }, [urlType]);

  const getInitialLanguage = (): 'ar' | 'en' => {
    if (typeof window === 'undefined') return 'ar';
    const stored = localStorage.getItem('siteLang');
    return stored === 'en' ? 'en' : 'ar';
  };

  const [language, setLanguage] = useState<'ar' | 'en'>(getInitialLanguage());
  const [posts, setPosts] = useState<any[]>([]);
  const [singlePost, setSinglePost] = useState<any | null>(null);
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

  // Fetch data depending on url params
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (id) {
          // Fetch single post details (will also trigger view counter increment on the backend)
          const res = await fetch(`${API_BASE_URL}/public/media-posts?id=${id}`);
          if (res.ok) {
            const data = await res.json();
            setSinglePost(data);
          } else {
            setSinglePost(null);
          }
        } else {
          // Fetch grouped category posts
          const res = await fetch(`${API_BASE_URL}/public/media-posts?type=${type}`);
          if (res.ok) {
            const data = await res.json();
            setPosts(data || []);
          } else {
            setPosts([]);
          }
          setSinglePost(null);
        }
      } catch (error) {
        console.error('Error fetching media posts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type, id]);

  const t = useMemo(() => {
    const arTitles: Record<string, string> = {
      news: 'أخبارنا',
      photo: 'معرض الصور',
      video: 'مكتبة الفيديو',
      audio: 'الصوتيات',
      info: 'معلومات تأمينية',
    };
    const enTitles: Record<string, string> = {
      news: 'Our News',
      photo: 'Photo Gallery',
      video: 'Video Library',
      audio: 'Audio Broadcasts',
      info: 'Insurance Information',
    };

    return language === 'ar'
      ? {
          mediaOffice: 'المكتب الإعلامي',
          categoryTitle: arTitles[type || 'news'] || 'المكتب الإعلامي',
          breadcrumbHome: 'الرئيسية',
          loadingText: 'جاري تحميل المواد الإعلامية...',
          noData: 'لا يوجد محتوى متوفر حالياً في هذا القسم.',
          readMore: 'إقرأ المزيد',
          backToList: 'العودة للقائمة',
          views: 'مشاهدة',
          location: 'الموقع:',
          published: 'نُشر في:',
          share: 'مشاركة:',
        }
      : {
          mediaOffice: 'Media Office',
          categoryTitle: enTitles[type || 'news'] || 'Media Office',
          breadcrumbHome: 'Home',
          loadingText: 'Loading media content...',
          noData: 'No content available in this section at the moment.',
          readMore: 'Read More',
          backToList: 'Back to List',
          views: 'views',
          location: 'Location:',
          published: 'Published on:',
          share: 'Share:',
        };
  }, [language, type]);

  // Checks if video link is YouTube embedded or direct
  const renderVideoPlayer = (url: string) => {
    if (!url) return null;

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let embedUrl = url;
      if (url.includes('watch?v=')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
      return (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <iframe
            src={embedUrl}
            title="Video Player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '12px' }}
          ></iframe>
        </div>
      );
    }

    // Direct uploaded video file player
    return (
      <video
        controls
        src={resolveImageUrl(url)}
        style={{ width: '100%', maxHeight: '500px', borderRadius: '12px', background: '#000', outline: 'none' }}
      />
    );
  };

  return (
    <div className="website-layout new-design">
      <WebsiteTopBar />
      <WebsiteNavbar />

      {/* Hero Section */}
      <section className="about-hero-new">
        <div className="about-hero-bg">
          <img src="/new/قبل الفوتر 2.png" alt={t.categoryTitle} />
          <div className="about-hero-overlay"></div>
        </div>
        
        <div className="about-hero-content-new animate-fade-in">
          <h2 className="about-hero-title-green">{t.mediaOffice}</h2>
          <h1 className="about-hero-title-white" style={{ maxWidth: '900px', margin: '0 auto' }}>{t.categoryTitle}</h1>
        </div>
      </section>

      {/* Breadcrumbs */}
      <div className="container" style={{ margin: '20px auto 0 auto', padding: '0 20px' }}>
        <div className="breadcrumb-strip" style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          fontSize: '0.95rem',
          color: 'var(--muted)',
          fontFamily: 'Cairo, sans-serif'
        }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>{t.breadcrumbHome}</span>
          <span>/</span>
          <span style={{ cursor: urlType ? 'pointer' : 'default' }} onClick={() => urlType && navigate(`/media/${urlType}`)}>{t.mediaOffice}</span>
          {urlType && (
            <>
              <span>/</span>
              <span style={{ color: id ? 'var(--muted)' : 'var(--text)', fontWeight: id ? 'normal' : 'bold', cursor: id ? 'pointer' : 'default' }} onClick={() => id && navigate(`/media/${urlType}`)}>
                {t.categoryTitle}
              </span>
            </>
          )}
          {id && singlePost && (
            <>
              <span>/</span>
              <span style={{ color: 'var(--text)', fontWeight: 'bold', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {language === 'ar' ? singlePost.title_ar : (singlePost.title_en || singlePost.title_ar)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <section style={{ padding: '40px 0 80px 0' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: 'var(--accent-cyan)' }}>
              <i className="fa-solid fa-spinner fa-spin fa-3x" style={{ marginBottom: '15px' }}></i>
              <p style={{ fontWeight: 'bold', color: 'var(--text)' }}>{t.loadingText}</p>
            </div>
          ) : id && singlePost ? (
            /* --- 1. DETAILED VIEW --- */
            <div className="media-detailed-card" style={{
              background: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.02)',
              maxWidth: '900px',
              margin: '0 auto'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', color: 'var(--muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                {singlePost.published_date && (
                  <span>
                    <i className="far fa-calendar-alt" style={{ marginLeft: '5px', marginRight: '5px' }}></i>
                    {t.published} {new Date(singlePost.published_date).toLocaleDateString(language === 'ar' ? 'ar-LY' : 'en-US')}
                  </span>
                )}
                {singlePost.location_ar && (
                  <span>
                    <i className="fas fa-map-marker-alt" style={{ marginLeft: '5px', marginRight: '5px' }}></i>
                    {t.location} {language === 'ar' ? singlePost.location_ar : (singlePost.location_en || singlePost.location_ar)}
                  </span>
                )}
                <span>
                  <i className="far fa-eye" style={{ marginLeft: '5px', marginRight: '5px' }}></i>
                  {singlePost.views} {t.views}
                </span>
              </div>

              <h2 style={{ color: 'var(--text)', fontSize: '2rem', fontWeight: '800', marginBottom: '25px', lineHeight: '1.4' }}>
                {language === 'ar' ? singlePost.title_ar : (singlePost.title_en || singlePost.title_ar)}
              </h2>

              {singlePost.type === 'video' && singlePost.media_url && (
                <div style={{ marginBottom: '30px' }}>
                  {renderVideoPlayer(singlePost.media_url)}
                </div>
              )}

              {singlePost.type === 'audio' && singlePost.media_url && (
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                  <i className="fa-solid fa-volume-high fa-2x" style={{ color: 'var(--accent-cyan)' }}></i>
                  <audio src={resolveImageUrl(singlePost.media_url)} controls style={{ width: '100%' }} />
                </div>
              )}

              {singlePost.type !== 'video' && singlePost.type !== 'audio' && singlePost.media_url && (
                <div style={{ width: '100%', maxHeight: '500px', overflow: 'hidden', borderRadius: '12px', marginBottom: '30px', border: '1px solid var(--border)' }}>
                  <img
                    src={resolveImageUrl(singlePost.media_url)}
                    alt={singlePost.title_ar}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{
                color: '#2d3748',
                fontSize: '1.15rem',
                lineHeight: '1.95',
                whiteSpace: 'pre-line',
                fontFamily: 'Cairo, sans-serif',
                textAlign: 'justify',
                marginBottom: '35px'
              }}>
                {language === 'ar' ? singlePost.content_ar : (singlePost.content_en || singlePost.content_ar)}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link to={`/media/${urlType}`} className="info-block-btn" style={{ margin: 0, padding: '8px 20px', fontSize: '0.95rem' }}>
                  <i className={language === 'ar' ? 'fas fa-arrow-right' : 'fas fa-arrow-left'} style={{ marginLeft: '8px', marginRight: '8px' }}></i>
                  {t.backToList}
                </Link>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>{t.share}</span>
                  <a href={`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noreferrer" style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#3b5998', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                    <i className="fab fa-facebook-f"></i>
                  </a>
                  <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noreferrer" style={{ width: '35px', height: '35px', borderRadius: '50%', background: '#1da1f2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                    <i className="fab fa-twitter"></i>
                  </a>
                </div>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)', fontSize: '1.2rem' }}>
              <i className="fa-regular fa-folder-open fa-3x" style={{ marginBottom: '20px', opacity: 0.5 }}></i>
              <p>{t.noData}</p>
            </div>
          ) : (
            /* --- 2. LISTING VIEWS --- */
            <div>
              {/* --- Category 1: News (أخبارنا) & Info (معلومات تأمينية) & Photo (معرض الصور) --- */}
              {(type === 'news' || type === 'photo' || type === 'info') && (
                <div className="media-grid-three">
                  {posts.map((post) => {
                    const postTitle = language === 'ar' ? post.title_ar : (post.title_en || post.title_ar);
                    const postContent = language === 'ar' ? post.content_ar : (post.content_en || post.content_ar);
                    const snippet = postContent ? (postContent.substring(0, 140) + (postContent.length > 140 ? '...' : '')) : '';
                    const defaultImg = type === 'photo' ? '/new/secnd.png' : '/new/first.png';

                    return (
                      <div key={post.id} className="news-card-wrapper" style={{
                        background: '#ffffff',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.02)',
                        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                        cursor: 'pointer'
                      }}
                      onClick={() => navigate(`/media/${urlType}/${post.id}`)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.06)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.02)';
                      }}
                      >
                        {type !== 'info' && (
                          <div style={{ height: '220px', overflow: 'hidden', borderBottom: '1px solid var(--border)', position: 'relative' }}>
                            <img
                              src={post.media_url ? resolveImageUrl(post.media_url) : defaultImg}
                              alt={postTitle}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {post.location_ar && (
                              <div style={{
                                position: 'absolute',
                                bottom: '15px',
                                right: '15px',
                                background: 'var(--accent-cyan)',
                                color: '#fff',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                              }}>
                                <i className="fas fa-map-marker-alt" style={{ marginLeft: '5px', marginRight: '5px' }}></i>
                                {language === 'ar' ? post.location_ar : (post.location_en || post.location_ar)}
                              </div>
                            )}
                          </div>
                        )}

                        <div style={{ padding: '25px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.8rem', marginBottom: '12px' }}>
                            {post.published_date && (
                              <span>
                                <i className="far fa-calendar-alt" style={{ marginLeft: '5px', marginRight: '5px' }}></i>
                                {new Date(post.published_date).toLocaleDateString(language === 'ar' ? 'ar-LY' : 'en-US')}
                              </span>
                            )}
                            <span>
                              <i className="far fa-eye" style={{ marginLeft: '5px', marginRight: '5px' }}></i>
                              {post.views} {t.views}
                            </span>
                          </div>

                          <h3 style={{
                            color: 'var(--text)',
                            fontSize: '1.25rem',
                            fontWeight: '800',
                            margin: '0 0 12px 0',
                            lineHeight: '1.4',
                            height: '54px',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {postTitle}
                          </h3>

                          <p style={{
                            color: 'var(--muted)',
                            fontSize: '0.95rem',
                            lineHeight: '1.6',
                            margin: '0 0 20px 0',
                            flexGrow: 1,
                            height: '68px',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {snippet}
                          </p>

                          <Link
                            to={`/media/${urlType}/${post.id}`}
                            className="info-block-btn"
                            style={{ margin: 0, display: 'inline-flex', padding: '8px 16px', fontSize: '0.9rem', alignSelf: 'start' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {t.readMore}
                            <i className={language === 'ar' ? 'fas fa-arrow-left' : 'fas fa-arrow-right'} style={{ marginLeft: '8px', marginRight: '8px' }}></i>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* --- Category 2: Videos (مكتبة الفيديو) --- */}
              {type === 'video' && (
                <div className="media-grid-two">
                  {posts.map((post) => {
                    const postTitle = language === 'ar' ? post.title_ar : (post.title_en || post.title_ar);
                    return (
                      <div key={post.id} style={{
                        background: '#ffffff',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '20px',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ marginBottom: '15px' }}>
                          {renderVideoPlayer(post.media_url)}
                        </div>
                        <h3 style={{ color: 'var(--text)', fontSize: '1.2rem', fontWeight: '800', margin: '0 0 10px 0', lineHeight: '1.4' }}>
                          {postTitle}
                        </h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', fontSize: '0.85rem' }}>
                          {post.published_date && (
                            <span>
                              <i className="far fa-calendar-alt" style={{ marginLeft: '5px', marginRight: '5px' }}></i>
                              {new Date(post.published_date).toLocaleDateString(language === 'ar' ? 'ar-LY' : 'en-US')}
                            </span>
                          )}
                          <span>
                            <i className="far fa-eye" style={{ marginLeft: '5px', marginRight: '5px' }}></i>
                            {post.views} {t.views}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* --- Category 3: Audios (الصوتيات) --- */}
              {type === 'audio' && (
                <div className="media-grid-three">
                  {posts.map((post) => {
                    const postTitle = language === 'ar' ? post.title_ar : (post.title_en || post.title_ar);
                    return (
                      <div key={post.id} style={{
                        background: '#ffffff',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '25px',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.02)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          <div style={{
                            width: '45px',
                            height: '45px',
                            borderRadius: '12px',
                            background: 'rgba(30, 66, 159, 0.1)',
                            color: 'var(--accent-cyan)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.25rem'
                          }}>
                            <i className="fa-solid fa-microphone-lines"></i>
                          </div>
                          <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                            <h3 style={{ color: 'var(--text)', fontSize: '1.05rem', fontWeight: '800', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {postTitle}
                            </h3>
                            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                              {post.published_date ? new Date(post.published_date).toLocaleDateString(language === 'ar' ? 'ar-LY' : 'en-US') : ''}
                            </span>
                          </div>
                        </div>

                        {post.media_url && (
                          <audio
                            src={resolveImageUrl(post.media_url)}
                            controls
                            style={{ width: '100%', outline: 'none' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
