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
    <div className="website-layout">
      <WebsiteTopBar />
      <WebsiteNavbar />
      
      <section className="contact-hero">
        <div className="container">
          <div className="contact-hero-content">
            <h1>{t.heroTitle}</h1>
            <p className="contact-hero-subtitle">{t.heroSubtitle}</p>
            <p className="contact-hero-description">
              {t.heroDesc}
            </p>
          </div>
        </div>
      </section>

      <section className="contact-content">
        <div className="container">
          <div className="contact-grid">
            <div className="contact-info">
                <h2>{t.contactInfo}</h2>
              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fas fa-phone"></i>
                </div>
                <div className="contact-details">
                    <h3>{t.phone}</h3>
                  <p>+218 XX XXX XXXX</p>
                  <p>+218 XX XXX XXXX</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fas fa-envelope"></i>
                </div>
                <div className="contact-details">
                    <h3>{t.email}</h3>
                  <p>info@almadar.ly</p>
                  <p>support@almadar.ly</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fas fa-map-marker-alt"></i>
                </div>
                <div className="contact-details">
                    <h3>{t.address}</h3>
                    <p>{t.addressValue}</p>
                </div>
              </div>
              <div className="contact-item">
                <div className="contact-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="contact-details">
                    <h3>{t.hours}</h3>
                    <p>{t.hoursValue1}</p>
                    <p>{t.hoursValue2}</p>
                </div>
              </div>
            </div>

            <div className="contact-form-container">
                <h2>{t.sendUs}</h2>
              {submitted ? (
                <div className="success-message">
                  <i className="fas fa-check-circle"></i>
                    <p>{t.success}</p>
                </div>
              ) : (
                <form className="contact-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                      <label htmlFor="name">{t.fullName}</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                      <label htmlFor="email">{t.emailLabel}</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                      <label htmlFor="phone">{t.phoneLabel}</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
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
                  <div className="form-group">
                      <label htmlFor="message">{t.messageLabel}</label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className="btn-primary">
                    <i className="fas fa-paper-plane"></i>
                      {t.submit}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

