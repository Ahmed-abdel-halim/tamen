import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

export default function Footer() {
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

  const t = useMemo(() => {
    return language === 'ar'
      ? {
          newsletterTitle: 'النشرة الإخبارية',
          newsletterDesc: 'اشترك في نشرتنا الإخبارية للحصول على آخر الأخبار والعروض الخاصة',
          emailPlaceholder: 'أدخل بريدك الإلكتروني',
          subscribe: 'اشترك',
          companyDesc:
            'المدار الليبي للتأمين هي شركة تأمين رائدة في ليبيا، تقدم مجموعة شاملة من خدمات التأمين والحماية لعملائها. نحن ملتزمون بتوفير حلول تأمينية موثوقة ومبتكرة تلبي احتياجات الأفراد والشركات، مع التركيز على الجودة والشفافية والخدمة المتميزة.',
          address: 'طرابلس، لـيبيـا',
          quickLinks: 'روابط سريعة',
          about: 'من نحن',
          management: 'الإدارة',
          branches: 'الوكلاء والفروع',
          insurances: 'التأمينات',
          servicesTitle: 'خدماتنا التأمينية',
          serviceItems: [
            'تأمين السيارات',
            'تأمين السفر والمسافرين',
            'تأمين الوافدين',
            'تأمين الهياكل البحرية',
            'تأمين المسؤولية المهنية',
            'تأمين الحوادث الشخصية',
          ],
          contactTitle: 'اتصل بنا',
          followUs: 'تابعنا',
          rights: 'جميع الحقوق محفوظة',
          companyName: 'المدار الليبي للتأمين',
          loginCta: 'دخول الوكلاء أو الفروع',
          creditPrefix: 'برمجة وتطوير',
          creditBrand: 'كودينيتي تيك Codinity Tech',
        }
      : {
          newsletterTitle: 'Newsletter',
          newsletterDesc: 'Subscribe to get the latest news and special offers.',
          emailPlaceholder: 'Enter your email',
          subscribe: 'Subscribe',
          companyDesc:
            'Almadar Libya Insurance is a leading insurance company offering comprehensive coverage for individuals and businesses with a focus on quality, transparency, and excellent service.',
          address: 'Tripoli, Libya',
          quickLinks: 'Quick Links',
          about: 'About Us',
          management: 'Management',
          branches: 'Branches & Agents',
          insurances: 'Insurances',
          servicesTitle: 'Our Insurance Services',
          serviceItems: [
            'Car Insurance',
            'Travel Insurance',
            'Resident Insurance',
            'Marine Hull Insurance',
            'Professional Liability Insurance',
            'Personal Accident Insurance',
          ],
          contactTitle: 'Contact Us',
          followUs: 'Follow Us',
          rights: 'All rights reserved',
          companyName: 'Almadar Libya Insurance',
          loginCta: 'Agents / Branches Login',
          creditPrefix: 'Developed by',
          creditBrand: 'Codinity Tech',
        };
  }, [language]);

  return (
    <footer className="website-footer">
      <div className="container">
        {/* Newsletter Section */}
        <div className="footer-newsletter">
          <div className="newsletter-content">
            <h3>{t.newsletterTitle}</h3>
            <p>{t.newsletterDesc}</p>
            <form 
              className="newsletter-form"
              onSubmit={(e) => {
                e.preventDefault();
                // Handle newsletter subscription
                alert(language === 'ar' ? 'شكراً لك! تم الاشتراك في النشرة الإخبارية بنجاح.' : 'Thank you! You have subscribed successfully.');
              }}
            >
              <input 
                type="email" 
                placeholder={t.emailPlaceholder} 
                className="newsletter-input"
                required
              />
              <button type="submit" className="newsletter-button">
                <span>{t.subscribe}</span>
                <i className="fas fa-arrow-left"></i>
              </button>
            </form>
          </div>
        </div>

        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-logo">
              <img src="/img/logo2.png" alt="المدار الليبي للتأمين" />
            </div>
            <p>{t.companyDesc}</p>
            <div className="footer-address">
              <i className="fas fa-map-marker-alt"></i>
              <span>{t.address}</span>
            </div>
          </div>
          <div className="footer-section">
            <h4>{t.quickLinks}</h4>
            <ul>
              <li><Link to="/about-us">{t.about}</Link></li>
              <li><Link to="/management">{t.management}</Link></li>
              <li><Link to="/branches-agents">{t.branches}</Link></li>
              <li><Link to="/insurances">{t.insurances}</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>{t.servicesTitle}</h4>
            <ul>
              {t.serviceItems.map((item, idx) => (
                <li key={`service-${idx}`}><Link to="/insurances">{item}</Link></li>
              ))}
            </ul>
          </div>
          <div className="footer-section">
            <h4>{t.contactTitle}</h4>
            <ul>
              <li><i className="fas fa-phone"></i> 920003366 218+</li>
              <li><i className="fas fa-envelope"></i> info@mli.ly</li>
              <li><i className="fas fa-map-marker-alt"></i> ليبيا</li>
            </ul>
            <div className="footer-social">
              <h4 style={{ marginTop: '2rem', marginBottom: '1rem' }}>{t.followUs}</h4>
              <div className="social-icons">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon">
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="social-icon">
                  <i className="fab fa-x-twitter"></i>
                </a>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon">
                  <i className="fab fa-youtube"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p> {t.rights} &copy; {t.companyName} {new Date().getFullYear()}.</p>
          <p className="footer-credit">
            {t.creditPrefix}
            {' '}
            <a href="https://www.facebook.com/profile.php?id=100072479525246" target="_blank" rel="noopener noreferrer">
              {t.creditBrand}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

