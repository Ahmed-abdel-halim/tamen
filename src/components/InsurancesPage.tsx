import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import WebsiteNavbar from './WebsiteNavbar';
import WebsiteTopBar from './WebsiteTopBar';
import Footer from './Footer';
import { API_BASE_URL, resolveImageUrl } from '../config/api';

export default function InsurancesPage() {
  const getInitialLanguage = (): 'ar' | 'en' => {
    if (typeof window === 'undefined') return 'ar';
    const stored = localStorage.getItem('siteLang');
    return stored === 'en' ? 'en' : 'ar';
  };

  const [language, setLanguage] = useState<'ar' | 'en'>(getInitialLanguage());
  const [dbInsurances, setDbInsurances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<'ar' | 'en'>;
      if (custom.detail) setLanguage(custom.detail);
    };
    window.addEventListener('siteLanguageChanged', handler as EventListener);
    return () => window.removeEventListener('siteLanguageChanged', handler as EventListener);
  }, []);

  // Smooth scroll to hash on load or hash change
  useEffect(() => {
    const scrollToHash = () => {
      if (window.location.hash) {
        const id = window.location.hash.slice(1);
        const element = document.getElementById(id);
        if (element) {
          setTimeout(() => {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 150);
        }
      }
    };

    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, [loading]); // Scroll again when data is loaded

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.body.style.direction = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    const fetchInsuranceTypes = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/public/website-settings`);
        if (res.ok) {
          const data = await res.json();
          setDbInsurances(data.insurance_types || []);
        }
      } catch (error) {
        console.error('Error fetching insurance types:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInsuranceTypes();
  }, []);

  // Fallback static data if backend is empty or loading fails
  const fallbackInsurances = useMemo(() => {
    const ins = (ar: string, en: string) => (language === 'ar' ? ar : en);
    return [
      {
        id: 1,
        title: ins('تأمين السيارات', 'Car Insurance'),
        description: ins('إدارة السيارات بشركة المدار الليبي للتأمين تقوم بإصدار مجموعة من وثائق تأمين السيارات', 'The Car Insurance Department at Almadar Libya Insurance Company issues a range of car insurance documents'),
        icon: 'fas fa-car',
        color: '#667eea',
        image: '/new/تامين السيارات .jpg',
        details: ins(
          `نفيدكم بأن إدارة السيارات بشركة المدار الليبي للتأمين تقوم بإصدار مجموعة من وثائق تأمين السيارات وهي مبينة على النحو التالي:

وثائق التأمين الإجباري:
تصدر هذه التغطية وفقا للقانون رقم 28 لسنة 1971 بشأن المسؤولية المدنية التأمينية عن حوادث المركبات الآلية داخل ليبيا عن حالات الوفاة والإصابات البدنية.

البطاقة العربية الموحدة (البطاقة البرتقالية):
تغطى هذه الوثيقة الحوادث التي تقع خارج ليبيا وتسرى سريان البلد المزار وتحل المكاتب الإقليمية في البلد المزار محل شركة التأمين المصدر للوثيقة.

وثائق أضرار الطرف الثالث:
تغطى هذه الوثيقة الأضرار التي تلحق بممتلكات الغير (طرف ثالث) والناتجة عن اصطدام السيارة المؤمنة التي تصيب الغير.

وثيقة تأمين السيارات الأجنبية:
تصدر هذه التغطية وفقا للقانون رقم 28 لسنة 1971 بشأن المسؤولية المدنية التأمينية عن حوادث المركبات الآلية داخل ليبيا عن حالات الوفاة والإصابات البدنية.`,
          `We inform you that the Car Insurance Department at Almadar Libya Insurance Company issues a range of car insurance documents as follows:

Mandatory Insurance Documents:
This coverage is issued in accordance with Law No. 28 of 1971 regarding civil liability insurance for motor vehicle accidents within Libya for cases of death and physical injuries.

Unified Arab Card (Orange Card):
This document covers accidents that occur outside Libya and applies in the visited country, with regional offices in the visited country replacing the issuing insurance company.

Third-Party Damage Documents:
This document covers damages to third-party property resulting from collisions involving the insured vehicle.

Foreign Car Insurance Document:
This coverage is issued in accordance with Law No. 28 of 1971 regarding civil liability insurance for motor vehicle accidents within Libya for cases of death and physical injuries.`
        )
      },
      {
        id: 2,
        title: ins('تأمين المسافرين', 'Travel Insurance'),
        description: ins('إدارة التأمين الصحي تقوم بإصدار وثائق تأمين المسافرين من خلال إبرامها اتفاقيات مع شركات ذات سمعة طيبة', 'The Health Insurance Department issues travel insurance documents through agreements with reputable companies'),
        icon: 'fas fa-plane',
        color: '#f093fb',
        image: '/new/تامين المسافرن.png',
        details: ins(
          `أن إدارة التأمين الصحي تقوم بإصدار وثائق تأمين المسافرين من خلال إبرامها اتفاقيات مع شركات ذات سمعة طيبة في هذا المجال وبأسعار منافسة جداً مقارنة بما هو متوفر في السوق الليبي و بأسلوب متطور و حضاري مما جعلها من الشركات المنافسة في هذا المجال.

ذلك من خلال وثيقة تأمين المسافرين والتي تغطي الحالات الطارئة و بالميزات التالية:
• ضمانات متعددة وبأقل الأسعار
• سهولة الحصول على طلب المساعدة بالخارج
• تغطية طبية عاجلة وشاملة نتيجة المرض المفاجئ أو الحوادث العرضية
• إرسال الأدوية وبصورة عاجلة للمرضى
• تعويض عن ضرر فقدان الأمتعة

فلا تتردد في الحصول على هذه الوثيقة لتتحصل على كافة الضمانات والتسهيلات المذكورة أعلاه.`,
          `The Health Insurance Department issues travel insurance documents through agreements with reputable companies in this field at very competitive prices compared to what is available in the Libyan market, with a modern and civilized approach that has made it one of the competing companies in this field.

Through the travel insurance document which covers emergency cases with the following features:
• Multiple guarantees at the lowest prices
• Easy access to assistance requests abroad
• Urgent and comprehensive medical coverage for sudden illness or accidental injuries
• Urgent delivery of medicines to patients
• Compensation for lost luggage damage

Do not hesitate to obtain this document to get all the guarantees and facilities mentioned above.`
        )
      },
      {
        id: 3,
        title: ins('تأمين زوار ليبيا', 'Libya Visitors Insurance'),
        description: ins('وثيقة تأمين مصممة خصيصاً لزوار دولة ليبيا من المتطلبات الرسمية في الإدارة العامة للجوازات', 'Insurance document specially designed for visitors to Libya, an official requirement of the General Passports Administration'),
        icon: 'fas fa-passport',
        color: '#4facfe',
        image: '/new/تامين زوار ليبيا.png',
        details: ins(
          `أهم مزايا تأمين وثيقة زوار ليبيا:

هي واحدة من وثائق التأمين التي صممتها شركتنا خصيصاً لزوار دولة ليبيا، وهي من المتطلبات الرسمية في الإدارة العامة للجوازات لمنح تأشيرات الدخول للأجانب القاصدين ليبيا مثل:
• تأشيرات الالتحاق بالوالد المقيم
• تأشيرات مهمة رسمية
• تأشيرات سياحية
• تأشيرات زيارة

توفر وثيقة "زوار ليبيا" التغطية التأمينية لزوار دولة ليبيا الذين يحملون تأشيرة دخول صالحة، وتحميهم في الحالات الطبية الطارئة والنفقات التي تترتب عليهم خلال مدة التأشيرة المصرح بها.

تبدأ التغطية التأمينية فور وصول المؤمن له إلى أحد المنافذ البرية أو الجوية أو البحرية للدولة.`,
          `Key features of Libya Visitors Insurance:

It is one of the insurance documents designed by our company specifically for visitors to Libya, and it is an official requirement of the General Passports Administration to grant entry visas to foreigners heading to Libya such as:
• Resident parent reunion visas
• Official mission visas
• Tourist visas
• Visit visas

The "Libya Visitors" document provides insurance coverage for visitors to Libya who hold valid entry visas, and protects them in emergency medical cases and expenses incurred during the authorized visa period.

Insurance coverage begins immediately upon the insured's arrival at one of the country's land, air, or sea ports.`
        )
      },
      {
        id: 4,
        title: ins('تأمين المسؤولية الطبية', 'Medical Liability Insurance'),
        description: ins('تقوم الإدارة بإصدار وثائق تأمين المسئولية الطبية وفق قانون المسئولية الطبية رقم 17 لسنة 1986', 'The Department issues medical liability insurance documents in accordance with Medical Liability Law No. 17 of 1986'),
        icon: 'fas fa-heartbeat',
        color: '#fa709a',
        image: '/new/Local Health Insurance 1.png',
        details: ins(
          `تقوم الإدارة بإصدار وثائق تأمين المسئولية الطبية وفق قانون المسئولية الطبية رقم 17 لسنة 1986 والذي يمنح العناصر الطبية والطبية المساعدة الطمأنينة في مزاولة أعمالهم حيث توفير الغطاء التأميني لأي خطأ طبي يصدر عنهم.

ومع كل ما سبق تأمل هذه الإدارة أن تكون قد قدمت كل ما بوسعها للرقي بشركة المدار الليبي وكلها أمل في أن تقدم كل ما بوسعها لتقديم الأفضل.

وفي النهاية تمنياتنا للجميع بدوام الصحة والعافية والشفاء العاجل لكل مريض.`,
          `The Department issues medical liability insurance documents in accordance with Medical Liability Law No. 17 of 1986, which provides medical and medical assistant personnel with peace of mind in practicing their work by providing insurance coverage for any medical error they may commit.

With all of the above, this Department hopes that it has done everything in its power to elevate Almadar Libya Company and hopes to do everything in its power to provide the best.

Finally, we wish everyone continued health and wellness and a speedy recovery for every patient.`
        )
      },
      {
        id: 5,
        title: ins('تأمين القوارب', 'Boat Insurance'),
        description: ins('التأمين على القوارب والدراجات البحرية وقوارب الصيد', 'Insurance for boats, jet skis, and fishing boats'),
        icon: 'fas fa-ship',
        color: '#43e97b',
        image: '/new/تامين المراكب.png',
        details: ins(
          `التأمين على القوارب والدراجات البحرية وقوارب الصيد:

وثيقة تكميلي:
نقدم حلول تأمين موثوقة بتكلفة مدروسة لتغطية اليخوت والمراكب (الترفيهية والصيد) حسب التغطية المطلوبة لكي تبحر دون قلق.

وثيقة إجباري:
تصدر هذه التغطية وفقا للقانون رقم 28 لسنة 1971 بشأن المسؤولية المدنية التأمينية عن حوادث المركبات الآلية داخل ليبيا عن حالات الوفاة والإصابات البدنية (تغطية خاصة للمراكب البحرية مثل: القوارب الخاصة – الدراجات البحرية – قوارب الصيد).`,
          `Insurance for boats, jet skis, and fishing boats:

Supplementary Document:
We provide reliable insurance solutions at a calculated cost to cover yachts and vessels (recreational and fishing) according to the required coverage so you can sail without worry.

Mandatory Document:
This coverage is issued in accordance with Law No. 28 of 1971 regarding civil liability insurance for motor vehicle accidents within Libya for cases of death and physical injuries (special coverage for marine vessels such as: private boats – jet skis – fishing boats).`
        )
      },
      {
        id: 6,
        title: ins('الحوادث الشخصية', 'Personal Accidents'),
        description: ins('وثيقة تأمين ضد الحوادث الشخصية لحماية مستقبلك من الحوادث المفاجئة', 'Personal accident insurance document to protect your future from sudden accidents'),
        icon: 'fas fa-user-injured',
        color: '#fee140',
        image: '/new/الحوادث الشخصية.png',
        details: ins(
          `وثيقة تأمين ضد الحوادث الشخصية:

نحمي مستقبلك من الحوادث المفاجئة لكي تستمتع بالحياة دون قلق. وذلك من خلال تأمين الحوادث الشخصية.

قد تجبرك الحوادث غير المتوقعة على تغيير نمط حياتك أو تعطل أعمالك، سواء كانت حوادث بسيطة كالتعثر أثناء المشي، أو أكثر خطورة كالتعرض لحادث مركبة يجبرك على دخول المستشفى.

ليستمعنا بصنع لك وثائق التأمين ضد الحوادث الشخصية لنؤمن لك الحماية طوال الوقت، ونضمن لك الأمان وراحة البال أينما كنت ومهما حدث.

ما الذي ستحصل عليه من خلال تأمين الحوادث الشخصية لدينا:
• دفع مبلغ التأمين الإجمالي إذا تعرضت لحادث سبب لك الإعاقة الدائمة
• في حالة الحوادث الأقل خطورة التي تسبب إعاقة جزئية أو دائمة، ندفع نسبتك من مبلغ التأمين، وتحسب النسبة على أساس شدة الإصابة ومدى تأثيرها على الجسم
• نغطي جميع النفقات الطبية إذا احتجت إلى دخول المستشفى أو العلاج الطبي خارج البلاد`,
          `Personal Accident Insurance Document:

We protect your future from sudden accidents so you can enjoy life without worry. This is through personal accident insurance.

Unexpected accidents may force you to change your lifestyle or disrupt your business, whether they are simple accidents like tripping while walking, or more serious like being involved in a vehicle accident that forces you to enter the hospital.

Therefore, we have designed personal accident insurance documents for you to provide you with protection at all times, and ensure your safety and peace of mind wherever you are and whatever happens.

What you will get through our personal accident insurance:
• Payment of the total insurance amount if you are exposed to an accident that causes you permanent disability
• In the case of less serious accidents that cause partial or permanent disability, we pay your share of the insurance amount, and the percentage is calculated based on the severity of the injury and its impact on the body
• We cover all medical expenses if you need to enter the hospital or receive medical treatment abroad`
        )
      },
      {
        id: 7,
        title: ins('تأمين الحج والعمرة', 'Hajj and Umrah Insurance'),
        description: ins('وثيقة تأمين الحج والعمرة تشمل التغطية للحالات الصحية الطارئة وإصابات كوفيد-19', 'Hajj and Umrah insurance document includes coverage for emergency health cases and COVID-19 injuries'),
        icon: 'fas fa-kaaba',
        color: '#30cfd0',
        image: '/new/تامين الحج.png',
        details: ins(
          `وثيقة تأمين الحج والعمرة:

وتشمل التغطية التي تقدمها الحالات الصحية الطارئة، وإصابات كوفيد-19 الطارئة، والحوادث العامة والوفيات، وإلغاء أو تأخر رحلات الطيران المغادرة.`,
          `Hajj and Umrah Insurance Document:

The coverage it provides includes emergency health cases, emergency COVID-19 injuries, general accidents and deaths, and cancellation or delay of departing flights.`
        )
      },
      {
        id: 8,
        title: ins('تأمين وافدين للمقيمين', 'Expatriate Insurance for Residents'),
        description: ins('وثيقة مدمجة وتحتوي على تغطيات المسؤولية المهنية والحوادث الشخصية لحماية العمالة الوافدة', 'Integrated document containing professional liability and personal accident coverage to protect expatriate workers'),
        icon: 'fas fa-users',
        color: '#ff6b6b',
        image: '/new/تامين الوافدين.png',
        details: ins(
          `وثيقة تأمين وافدين للمقيمين:

وثيقة مدمجة وتحتوي على تغطيات المسؤولية المهنية والحوادث الشخصية لحماية العمالة الوافدة.

وثيقة المسؤولية المهنية:
تغطي هذه الوثيقة المسؤولية المهنية للمهنيين نتيجة الأخطاء التي قد تحدث أثناء مزاولة المهنة، والتي قد تتسبب في أضرار جسدية أو مادية للغير (الطرف الثالث)، وذلك حسب نوعية المهنة.

وثيقة الحوادث الشخصية:
تغطي هذه الوثيقة الوفاة والعجز الدائم أو العجز الجزئي الدائم أو المؤقت بسبب حادث عرضي مفاجئ خلال أربعة وعشرون ساعة داخل أو خارج ليبيا وهي إما أن تكون فردية أو جماعية.`,
          `Expatriate Insurance for Residents Document:

Integrated document containing professional liability and personal accident coverage to protect expatriate workers.

Professional Liability Document:
This document covers the professional liability of professionals resulting from errors that may occur during the practice of the profession, which may cause physical or material damage to others (third party), according to the type of profession.

Personal Accident Document:
This document covers death and permanent disability or partial permanent or temporary disability due to a sudden accidental accident within twenty-four hours inside or outside Libya, and it can be either individual or collective.`
        )
      }
    ];
  }, [language]);

  const t = useMemo(() => {
    return {
      heroTitle: language === 'ar' ? 'التأمينات' : 'Insurances',
      heroSubtitle: language === 'ar' ? 'مجموعة شاملة من خدمات التأمين' : 'A comprehensive suite of insurance services',
      heroDesc:
        language === 'ar'
          ? 'نقدم مجموعة واسعة من خدمات التأمين المصممة خصيصاً لتلبية احتياجاتك المختلفة، مع ضمان الحماية الشاملة والخدمة المتميزة'
          : 'We offer a wide range of tailored insurance services to meet your needs, ensuring full protection and excellent service.',
      introTitle: language === 'ar' ? 'أنواع التأمين' : 'Insurance Types',
      introDesc:
        language === 'ar'
          ? 'اختر من بين مجموعة متنوعة من أنواع التأمين التي تناسب احتياجاتك المختلفة'
          : 'Choose from a variety of insurance types that fit your needs.',
      ctaTitle:
        language === 'ar'
          ? 'هل تحتاج مساعدة في اختيار التأمين المناسب؟'
          : 'Need help choosing the right insurance?',
      ctaDesc:
        language === 'ar'
          ? 'فريقنا جاهز لمساعدتك في اختيار أفضل تأمين يناسب احتياجاتك'
          : 'Our team is ready to help you choose the best coverage.',
      ctaButton: language === 'ar' ? 'اتصل بنا الآن' : 'Contact us now',
      quote: language === 'ar' ? 'احصل على عرض سعر' : 'Get a quote',
    };
  }, [language]);

  // Combine dynamic and fallback insurance types
  const insuranceTypes = useMemo(() => {
    if (dbInsurances.length > 0) {
      return dbInsurances.map(item => ({
        id: item.id,
        title: language === 'ar' ? item.title_ar : item.title_en,
        description: language === 'ar' ? item.description_ar : item.description_en,
        icon: item.icon || 'fas fa-shield-alt',
        color: item.color || '#3b82f6',
        image: item.image_url ? resolveImageUrl(item.image_url) : '/new/تامين السيارات .jpg',
        details: language === 'ar' ? item.details_ar : item.details_en,
      }));
    }
    return fallbackInsurances;
  }, [dbInsurances, fallbackInsurances, language]);

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
          <h2 className="about-hero-title-green">{t.heroTitle}</h2>
          <h1 className="about-hero-title-white">{t.heroSubtitle}</h1>
          <p className="about-hero-desc-new">
            {t.heroDesc}
          </p>
        </div>
      </section>

      <section className="insurances-content">
        <div className="container">
          <div className="insurances-intro">
            <h2 className="section-title">{t.introTitle}</h2>
            <p>
              {t.introDesc}
            </p>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', padding: '40px' }}>جاري تحميل أنواع التأمين...</p>
          ) : (
            <div className="insurances-grid">
              {insuranceTypes.map((insurance) => (
                <div key={insurance.id} id={`insurance-${insurance.id}`} className="insurance-card">
                  {insurance.image && (
                    <div className="insurance-card-image">
                      <img src={insurance.image} alt={insurance.title} />
                    </div>
                  )}
                  <div className="insurance-card-inner">
                    <div className="insurance-card-body">
                      <h3 className="insurance-title">
                        <i className={insurance.icon} style={{ color: insurance.color, marginLeft: '8px', marginRight: '8px' }}></i>
                        {insurance.title}
                      </h3>
                      <p className="insurance-description">{insurance.description}</p>
                      {insurance.details && (
                        <div className="insurance-details-scrollbox" style={{ whiteSpace: 'pre-wrap' }}>
                          {insurance.details}
                        </div>
                      )}
                    </div>
                    <div className="insurance-footer">
                      <Link to={`/contact-us?subject=${encodeURIComponent(insurance.title)}`} className="insurance-link">
                        <span>+ {language === 'ar' ? 'اطلب خدمتك' : 'Request Service'}</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
