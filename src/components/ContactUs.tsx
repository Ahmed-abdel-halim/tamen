import { useEffect, useMemo, useState } from 'react';
import WebsiteNavbar from './WebsiteNavbar';
import WebsiteTopBar from './WebsiteTopBar';
import Footer from './Footer';

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
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
          heroTitle: 'اتصل بنا',
          heroSubtitle: 'نحن هنا لمساعدتك',
          heroDesc:
            'تواصل معنا في أي وقت، فريقنا جاهز للإجابة على استفساراتك ومساعدتك في اختيار أفضل تأمين يناسب احتياجاتك',
          contactInfo: 'معلومات الاتصال',
          phone: 'الهاتف',
          email: 'البريد الإلكتروني',
          address: 'العنوان',
          hours: 'ساعات العمل',
          addressValue: 'ليبيا',
          hoursValue1: 'الأحد - الخميس: 8:00 ص - 4:00 م',
          hoursValue2: 'الجمعة - السبت: مغلق',
          sendUs: 'أرسل لنا رسالة',
          success: 'تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.',
          fullName: 'الاسم الكامل *',
          emailLabel: 'البريد الإلكتروني *',
          phoneLabel: 'رقم الهاتف',
          subjectLabel: 'الموضوع *',
          subjectPlaceholder: 'اختر الموضوع',
          subjectOptions: [
            { value: 'insurance', label: 'استفسار عن التأمين' },
            { value: 'claim', label: 'مطالبة تأمينية' },
            { value: 'general', label: 'استفسار عام' },
            { value: 'complaint', label: 'شكوى' },
            { value: 'other', label: 'أخرى' },
          ],
          messageLabel: 'الرسالة *',
          submit: 'إرسال الرسالة',
        }
      : {
          heroTitle: 'Contact Us',
          heroSubtitle: 'We are here to help',
          heroDesc:
            'Reach out anytime—our team is ready to answer your questions and help you choose the best insurance for your needs.',
          contactInfo: 'Contact Information',
          phone: 'Phone',
          email: 'Email',
          address: 'Address',
          hours: 'Working Hours',
          addressValue: 'Libya',
          hoursValue1: 'Sun - Thu: 8:00 AM - 4:00 PM',
          hoursValue2: 'Fri - Sat: Closed',
          sendUs: 'Send us a message',
          success: 'Your message was sent successfully! We will contact you soon.',
          fullName: 'Full name *',
          emailLabel: 'Email *',
          phoneLabel: 'Phone number',
          subjectLabel: 'Subject *',
          subjectPlaceholder: 'Select subject',
          subjectOptions: [
            { value: 'insurance', label: 'Insurance inquiry' },
            { value: 'claim', label: 'Insurance claim' },
            { value: 'general', label: 'General inquiry' },
            { value: 'complaint', label: 'Complaint' },
            { value: 'other', label: 'Other' },
          ],
          messageLabel: 'Message *',
          submit: 'Send message',
        };
  }, [language]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // هنا يمكن إضافة منطق إرسال النموذج
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    }, 3000);
  };

  return (
    <div className="website-layout new-design">
      <WebsiteTopBar />
      <WebsiteNavbar />
      
      {/* Redesigned Premium Hero Section (Matches AboutUs & Management Hero Layout) */}
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

      {/* Redesigned Content & Contact Split-Card Section */}
      <div className="about-sections-wrapper">
        <section className="contact-section-new">
          <div className="container">
            <div className="contact-split-card">
              {/* White Column: Message Form */}
              <div className="contact-form-column">
                <h2>{t.sendUs}</h2>
                {submitted ? (
                  <div className="success-message">
                    <i className="fas fa-check-circle"></i>
                    <p>{t.success}</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="form-group-new">
                      <label htmlFor="name">{t.fullName}</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder={language === 'ar' ? 'أدخل الاسم كامل' : 'Enter full name'}
                        required
                      />
                    </div>
                    
                    <div className="form-group-new">
                      <label htmlFor="email">{t.emailLabel}</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder={language === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                        required
                      />
                    </div>

                    <div className="form-group-new">
                      <label htmlFor="phone">{t.phoneLabel}</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder={language === 'ar' ? 'أدخل رقم هاتفك' : 'Enter your phone number'}
                      />
                    </div>

                    <div className="form-group-new">
                      <label htmlFor="subject">{t.subjectLabel}</label>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                      >
                        <option value="">{t.subjectPlaceholder}</option>
                        {t.subjectOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group-new">
                      <label htmlFor="message">{t.messageLabel}</label>
                      <textarea
                        id="message"
                        name="message"
                        rows={4}
                        value={formData.message}
                        onChange={handleChange}
                        placeholder={language === 'ar' ? 'اكتب رسالتك هنا' : 'Type your message here'}
                        required
                      ></textarea>
                    </div>

                    <button type="submit" className="contact-btn-submit">
                      <i className="fas fa-paper-plane"></i>
                      {t.submit}
                    </button>
                  </form>
                )}
              </div>

              {/* Blue Column: Contact Info */}
              <div className="contact-info-column">
                <div className="info-column-bg">
                  <img src="/new/قبل الفوتر 2.png" alt="Cityscape" />
                  <div className="info-column-overlay"></div>
                </div>

                <div className="info-column-content">
                  <h2>{language === 'ar' ? 'نحن هنا لمساعدتك' : 'We are here to help'}</h2>
                  <p className="info-column-subtitle">
                    {language === 'ar' 
                      ? 'تواصل معنا الآن للحصول على طلب خدمة أو طلب استشارة' 
                      : 'Contact us now to get service or consultation requests'}
                  </p>

                  <div className="info-items-list">
                    {/* Item 1: Phone */}
                    <div className="info-item-new">
                      <div className="info-item-icon">
                        <i className="fas fa-phone-alt"></i>
                      </div>
                      <div className="info-item-text">
                        <span>{language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</span>
                        <a href="tel:+218920003366" dir="ltr">+218 920003366</a>
                      </div>
                    </div>

                    {/* Item 2: Email */}
                    <div className="info-item-new">
                      <div className="info-item-icon">
                        <i className="fas fa-envelope"></i>
                      </div>
                      <div className="info-item-text">
                        <span>{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</span>
                        <a href="mailto:info@mli.ly">info@mli.ly</a>
                        <a href="mailto:support@almadar.ly">support@almadar.ly</a>
                      </div>
                    </div>

                    {/* Item 3: Address */}
                    <div className="info-item-new">
                      <div className="info-item-icon">
                        <i className="fas fa-map-marker-alt"></i>
                      </div>
                      <div className="info-item-text">
                        <span>{language === 'ar' ? 'العنوان' : 'Address'}</span>
                        <p>{language === 'ar' ? 'طرابلس، ليبيا' : 'Tripoli, Libya'}</p>
                      </div>
                    </div>

                    {/* Item 4: Hours */}
                    <div className="info-item-new">
                      <div className="info-item-icon">
                        <i className="fas fa-clock"></i>
                      </div>
                      <div className="info-item-text">
                        <span>{language === 'ar' ? 'المواعيد' : 'Working Hours'}</span>
                        <p>{t.hoursValue1}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}

