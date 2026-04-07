import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
// قائمة بلدان الصنع (جميع دول العالم عدا إسرائيل)
const COUNTRIES = [
  { ar: 'مصري', en: 'Egyptian' },
  { ar: 'سوداني', en: 'Sudanese' },
  { ar: 'ليبي', en: 'Libyan' },
  { ar: 'تونسي', en: 'Tunisian' },
  { ar: 'جزائري', en: 'Algerian' },
  { ar: 'مغربي', en: 'Moroccan' },
  { ar: 'موريتاني', en: 'Mauritanian' },
  { ar: 'صحراوي', en: 'Sahrawi' },
  { ar: 'تشادي', en: 'Chadian' },
  { ar: 'نيجري', en: 'Nigerien' },
  { ar: 'مالي', en: 'Malian' },
  { ar: 'سنغالي', en: 'Senegalese' },
  { ar: 'غامبي', en: 'Gambian' },
  { ar: 'غيني', en: 'Guinean' },
  { ar: 'غيني-بيساوي', en: 'Bissau-Guinean' },
  { ar: 'سيراليوني', en: 'Sierra Leonean' },
  { ar: 'ليبيري', en: 'Liberian' },
  { ar: 'إيفواري (ساحل العاج)', en: 'Ivorian' },
  { ar: 'غاني', en: 'Ghanaian' },
  { ar: 'توغولي', en: 'Togolese' },
  { ar: 'بنيني', en: 'Beninese' },
  { ar: 'نيجيري', en: 'Nigerian' },
  { ar: 'كاميروني', en: 'Cameroonian' },
  { ar: 'كونغولي', en: 'Congolese' },
  { ar: 'كونغولي (جمهورية الكونغو الديمقراطية)', en: 'Congolese (DRC)' },
  { ar: 'أنغولي', en: 'Angolan' },
  { ar: 'زامبي', en: 'Zambian' },
  { ar: 'زيمبابوي', en: 'Zimbabwean' },
  { ar: 'بوتسواني', en: 'Botswanan' },
  { ar: 'ناميبي', en: 'Namibian' },
  { ar: 'ليسوتوي', en: 'Basotho' },
  { ar: 'إسواتيني', en: 'Swazi' },
  { ar: 'مدغشقري', en: 'Malagasy' },
  { ar: 'موريشي', en: 'Mauritian' },
  { ar: 'سيشيلي', en: 'Seychellois' },
  { ar: 'جزر قمري', en: 'Comorian' },
  { ar: 'جيبوتي', en: 'Djiboutian' },
  { ar: 'صومالي', en: 'Somali' },
  { ar: 'إثيوبي', en: 'Ethiopian' },
  { ar: 'إريتري', en: 'Eritrean' },
  { ar: 'جنوب سوداني', en: 'South Sudanese' },
  { ar: 'أوغندي', en: 'Ugandan' },
  { ar: 'كيني', en: 'Kenyan' },
  { ar: 'تنزاني', en: 'Tanzanian' },
  { ar: 'رواندي', en: 'Rwandan' },
  { ar: 'بوروندي', en: 'Burundian' },
  { ar: 'ملاوي', en: 'Malawian' },
  { ar: 'موزمبيقي', en: 'Mozambican' },
  { ar: 'سعودي', en: 'Saudi' },
  { ar: 'كويتي', en: 'Kuwaiti' },
  { ar: 'قطري', en: 'Qatari' },
  { ar: 'بحريني', en: 'Bahraini' },
  { ar: 'إماراتي', en: 'Emirati' },
  { ar: 'عماني', en: 'Omani' },
  { ar: 'يمني', en: 'Yemeni' },
  { ar: 'عراقي', en: 'Iraqi' },
  { ar: 'سوري', en: 'Syrian' },
  { ar: 'لبناني', en: 'Lebanese' },
  { ar: 'أردني', en: 'Jordanian' },
  { ar: 'فلسطيني', en: 'Palestinian' },
  { ar: 'تركي', en: 'Turkish' },
  { ar: 'إيراني', en: 'Iranian' },
  { ar: 'أفغاني', en: 'Afghan' },
  { ar: 'باكستاني', en: 'Pakistani' },
  { ar: 'هندي', en: 'Indian' },
  { ar: 'نيبالي', en: 'Nepali' },
  { ar: 'بنغلاديشي', en: 'Bangladeshi' },
  { ar: 'سريلانكي', en: 'Sri Lankan' },
  { ar: 'بوتاني', en: 'Bhutanese' },
  { ar: 'مالديفي', en: 'Maldivian' },
  { ar: 'صيني', en: 'Chinese' },
  { ar: 'ياباني', en: 'Japanese' },
  { ar: 'كوري جنوبي', en: 'South Korean' },
  { ar: 'كوري شمالي', en: 'North Korean' },
  { ar: 'منغولي', en: 'Mongolian' },
  { ar: 'كازاخستاني', en: 'Kazakh' },
  { ar: 'أوزبكي', en: 'Uzbek' },
  { ar: 'تركماني', en: 'Turkmen' },
  { ar: 'طاجيكي', en: 'Tajik' },
  { ar: 'قيرغيزي', en: 'Kyrgyz' },
  { ar: 'ميانماري', en: 'Burmese' },
  { ar: 'تايلاندي', en: 'Thai' },
  { ar: 'كامبودي', en: 'Cambodian' },
  { ar: 'فيتنامي', en: 'Vietnamese' },
  { ar: 'لاوسي', en: 'Laotian' },
  { ar: 'ماليزاي', en: 'Malaysian' },
  { ar: 'سنغافوري', en: 'Singaporean' },
  { ar: 'إندونيسي', en: 'Indonesian' },
  { ar: 'فلبيني', en: 'Filipino' },
  { ar: 'تيموري', en: 'Timorese' },
  { ar: 'جورجي', en: 'Georgian' },
  { ar: 'أرميني', en: 'Armenian' },
  { ar: 'أذربيجاني', en: 'Azerbaijani' },
  { ar: 'قبرصي', en: 'Cypriot' },
  { ar: 'بريطاني', en: 'British' },
  { ar: 'إنجليزي', en: 'English' },
  { ar: 'إسكتلندي', en: 'Scottish' },
  { ar: 'ويلزي', en: 'Welsh' },
  { ar: 'إيرلندي', en: 'Irish' },
  { ar: 'فرنسي', en: 'French' },
  { ar: 'ألماني', en: 'German' },
  { ar: 'إيطالي', en: 'Italian' },
  { ar: 'إسباني', en: 'Spanish' },
  { ar: 'برتغالي', en: 'Portuguese' },
  { ar: 'هولندي', en: 'Dutch' },
  { ar: 'بلجيكي', en: 'Belgian' },
  { ar: 'لوكسمبورغي', en: 'Luxembourger' },
  { ar: 'نمساوي', en: 'Austrian' },
  { ar: 'سويسري', en: 'Swiss' },
  { ar: 'دنماركي', en: 'Danish' },
  { ar: 'سويدي', en: 'Swedish' },
  { ar: 'نرويجي', en: 'Norwegian' },
  { ar: 'فنلندي', en: 'Finnish' },
  { ar: 'آيسلندي', en: 'Icelandic' },
  { ar: 'بولندي', en: 'Polish' },
  { ar: 'تشيكي', en: 'Czech' },
  { ar: 'سلوفاكي', en: 'Slovak' },
  { ar: 'هنغاري', en: 'Hungarian' },
  { ar: 'روماني', en: 'Romanian' },
  { ar: 'بلغاري', en: 'Bulgarian' },
  { ar: 'صربي', en: 'Serbian' },
  { ar: 'كرواتي', en: 'Croatian' },
  { ar: 'بوسني', en: 'Bosnian' },
  { ar: 'سلوفيني', en: 'Slovenian' },
  { ar: 'مقدوني', en: 'Macedonian' },
  { ar: 'ألباني', en: 'Albanian' },
  { ar: 'يوناني', en: 'Greek' },
  { ar: 'مالطي', en: 'Maltese' },
  { ar: 'ليتواني', en: 'Lithuanian' },
  { ar: 'لاتفي', en: 'Latvian' },
  { ar: 'إستوني', en: 'Estonian' },
  { ar: 'أوكراني', en: 'Ukrainian' },
  { ar: 'روسي', en: 'Russian' },
  { ar: 'بيلاروسي', en: 'Belarusian' },
  { ar: 'مولدوفي', en: 'Moldovan' },
  { ar: 'أمريكي', en: 'American' },
  { ar: 'كندي', en: 'Canadian' },
  { ar: 'مكسيكي', en: 'Mexican' },
  { ar: 'غواتيمالي', en: 'Guatemalan' },
  { ar: 'هندوراسي', en: 'Honduran' },
  { ar: 'سلفادوري', en: 'Salvadoran' },
  { ar: 'نيكاراغوي', en: 'Nicaraguan' },
  { ar: 'كوستاريكي', en: 'Costa Rican' },
  { ar: 'بانامي', en: 'Panamanian' },
  { ar: 'كوبي', en: 'Cuban' },
  { ar: 'دومينيكاني', en: 'Dominican' },
  { ar: 'هايتي', en: 'Haitian' },
  { ar: 'جامايكي', en: 'Jamaican' },
  { ar: 'باهامي', en: 'Bahamian' },
  { ar: 'بربادوسي', en: 'Barbadian' },
  { ar: 'ترينيدادي', en: 'Trinidadian' },
  { ar: 'أنتيغوي', en: 'Antiguan' },
  { ar: 'سانت لوسي', en: 'Saint Lucian' },
  { ar: 'غرينادي', en: 'Grenadian' },
  { ar: 'برازيلي', en: 'Brazilian' },
  { ar: 'أرجنتيني', en: 'Argentine' },
  { ar: 'أوروغواياني', en: 'Uruguayan' },
  { ar: 'باراغوايي', en: 'Paraguayan' },
  { ar: 'تشيلي', en: 'Chilean' },
  { ar: 'بوليفي', en: 'Bolivian' },
  { ar: 'بيروفي', en: 'Peruvian' },
  { ar: 'إكوادوري', en: 'Ecuadorian' },
  { ar: 'سورينامي', en: 'Surinamese' },
  { ar: 'غوياني', en: 'Guyanese' },
  { ar: 'أسترالي', en: 'Australian' },
  { ar: 'نيوزيلندي', en: 'New Zealander' },
  { ar: 'بابواني', en: 'Papuan' },
  { ar: 'فيجياني', en: 'Fijian' },
  { ar: 'سامواني', en: 'Samoan' },
  { ar: 'تونغاني', en: 'Tongan' },
  { ar: 'فانواتي', en: 'Vanuatuan' },
  { ar: 'كيريباتي', en: 'Kiribati' },
  { ar: 'ميكرونيزي', en: 'Micronesian' },
  { ar: 'مارشالي', en: 'Marshallese' },
  { ar: 'ناورووي', en: 'Nauruan' },
  { ar: 'بالاوي', en: 'Palauan' },
  { ar: 'توفالي', en: 'Tuvaluan' },
];

// دالة للبحث عن الاسم الإنجليزي المقابل للاسم العربي
const getCountryDisplay = (arabicName: string): string => {
  const country = COUNTRIES.find(c => c.ar === arabicName);
  return country ? `${country.ar} ${country.en}` : arabicName;
};

type Plate = {
  id: number;
  plate_number: string;
  city: {
    id: number;
    name_ar: string;
    name_en: string;
    order?: number;
  };
};

type Engine = {
  id: number;
  engine_type: 'main' | 'auxiliary';
  engine_model?: string;
  fuel_type?: string;
  engine_number?: string;
  manufacturing_country?: string;
  horsepower?: number;
  installation_date?: string;
  cylinders_count?: number;
  installation_type?: string;
};

type MarineStructureInsuranceDocument = {
  id: number;
  insurance_number: string;
  issue_date: string;
  start_date: string;
  end_date: string;
  duration: string;
  structure_type: string;
  license_type?: string;
  license_purpose?: string;
  vessel_name?: string;
  registration_code?: string;
  registration_date?: string;
  port?: string;
  registration_authority?: Plate;
  plate_number?: string;
  hull_number?: string;
  manufacturing_material?: string;
  length?: number;
  width?: number;
  depth?: number;
  manufacturing_year?: number;
  manufacturing_country?: string;
  color?: string;
  fuel_tank_capacity?: number;
  passenger_count?: number;
  load_capacity?: number;
  insured_name?: string;
  phone?: string;
  license_number?: string;
  premium: number;
  tax: number;
  stamp: number;
  issue_fees: number;
  supervision_fees: number;
  total: number;
  engines?: Engine[];
};

export default function ViewMarineStructureInsurance() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<MarineStructureInsuranceDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDocument();
    }
  }, [id]);


  const fetchDocument = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/marine-structure-insurance-documents/${id}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        if (res.status === 404) {
          showToast('الوثيقة غير موجودة', 'error');
          setTimeout(() => navigate('/marine-structure-insurance-documents'), 2000);
          return;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setDocument(data);
    } catch (error: any) {
      showToast(`حدث خطأ أثناء جلب البيانات: ${error.message || ''}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const iframe = window.document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.src = `/api/marine-structure-insurance-documents/${id}/print`;
    window.document.body.appendChild(iframe);
    
    iframe.onload = () => {
      setTimeout(() => {
        if (iframe.contentWindow) {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        }
        setTimeout(() => {
          if (window.document.body.contains(iframe)) {
            window.document.body.removeChild(iframe);
          }
        }, 300);
      }, 100);
    };
  };

  if (loading) {
    return (
      <section className="users-management">
        <div className="users-breadcrumb">
          <span>وثائق تأمين الهياكل البحرية / عرض وثيقة</span>
        </div>
        <div className="users-card">
          <p style={{ textAlign: 'center', padding: '20px' }}>جار التحميل...</p>
        </div>
      </section>
    );
  }

  if (!document) {
    return (
      <section className="users-management">
        <div className="users-breadcrumb">
          <span>وثائق تأمين الهياكل البحرية / عرض وثيقة</span>
        </div>
        <div className="users-card">
          <p style={{ textAlign: 'center', padding: '20px' }}>الوثيقة غير موجودة</p>
        </div>
      </section>
    );
  }

  const mainEngine = document.engines?.find(e => e.engine_type === 'main');
  const auxiliaryEngine = document.engines?.find(e => e.engine_type === 'auxiliary');

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>وثائق تأمين الهياكل البحرية / عرض وثيقة</span>
      </div>

      <div className="users-card">
        <div className="engineer-financial-details-container">
          <div className="engineer-financial-details-header">
            <h2 className="engineer-financial-details-title">عرض وثيقة تأمين هياكل بحرية</h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="back-button"
                onClick={() => navigate('/marine-structure-insurance-documents')}
              >
                <i className="fa-solid fa-arrow-right" style={{ marginLeft: '8px' }}></i>
                العودة للقائمة
              </button>
              <button
                className="back-button print-button"
                onClick={handlePrint}
              >
                <i className="fa-solid fa-print"></i>
                <span className="back-button-text">طباعة الوثيقة</span>
              </button>
              <button
                className="btn-submit"
                onClick={() => navigate(`/marine-structure-insurance-documents/${id}/edit`)}
              >
                <i className="fa-solid fa-pencil" style={{ marginLeft: '6px' }}></i>
                تعديل
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '24px' }}>
            {/* بيانات التأمين */}
            <div className="form-section">
              <h3 className="form-section-title">بيانات التأمين</h3>
              <div className="form-group">
                <label>رقم التأمين</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.insurance_number}
                </div>
              </div>
              <div className="form-group">
                <label>تاريخ الإصدار</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {new Date(document.issue_date).toLocaleString('ar-LY', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              <div className="form-group">
                <label>بداية التأمين</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {new Date(document.start_date).toLocaleDateString('ar-LY')}
                </div>
              </div>
              <div className="form-group">
                <label>نهاية التأمين</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {new Date(document.end_date).toLocaleDateString('ar-LY')}
                </div>
              </div>
              <div className="form-group">
                <label>مدة التأمين</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.duration}
                </div>
              </div>
              <div className="form-group">
                <label>نوع الهيكل البحري</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.structure_type}
                </div>
              </div>
              <div className="form-group">
                <label>نوع الترخيص</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {document.license_type || '-'}
                </div>
              </div>
              {document.license_purpose && (
                <div className="form-group">
                  <label>الغرض من الترخيص</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.license_purpose}
                  </div>
                </div>
              )}
            </div>

            {/* بيانات المركب/الهيكل البحري */}
            <div className="form-section">
              <h3 className="form-section-title">بيانات المركب/الهيكل البحري</h3>
              {document.vessel_name && (
                <div className="form-group">
                  <label>اسم المركب/الهيكل</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.vessel_name}
                  </div>
                </div>
              )}
              {document.registration_code && (
                <div className="form-group">
                  <label>رمز ورقم التسجيل</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.registration_code}
                  </div>
                </div>
              )}
              {document.registration_date && (
                <div className="form-group">
                  <label>تاريخ التسجيل</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {new Date(document.registration_date).toLocaleDateString('ar-LY')}
                  </div>
                </div>
              )}
              {document.port && (
                <div className="form-group">
                  <label>الميناء أو المرفأ</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.port}
                  </div>
                </div>
              )}
              {document.registration_authority && (
                <div className="form-group">
                  <label>الجهة المقيد بها</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.registration_authority.city.name_ar}{document.registration_authority.city.name_en ? ` ${document.registration_authority.city.name_en}` : ''}
                  </div>
                </div>
              )}
              {document.plate_number && (
                <div className="form-group">
                  <label>رقم اللوحة</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.registration_authority && document.registration_authority.city.order
                      ? `${document.registration_authority.city.order}-${document.plate_number}`
                      : document.plate_number}
                  </div>
                </div>
              )}
              {document.hull_number && (
                <div className="form-group">
                  <label>رقم الهيكل</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.hull_number}
                  </div>
                </div>
              )}
              {document.manufacturing_material && (
                <div className="form-group">
                  <label>نوع مواد التصنيع</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.manufacturing_material}
                  </div>
                </div>
              )}
              {document.length && (
                <div className="form-group">
                  <label>الطول</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.length} م
                  </div>
                </div>
              )}
              {document.width && (
                <div className="form-group">
                  <label>العرض</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.width} م
                  </div>
                </div>
              )}
              {document.depth && (
                <div className="form-group">
                  <label>العمق</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.depth} م
                  </div>
                </div>
              )}
              {document.manufacturing_year && (
                <div className="form-group">
                  <label>تاريخ الصنع</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.manufacturing_year}
                  </div>
                </div>
              )}
              {document.manufacturing_country && (
                <div className="form-group">
                  <label>مكان الصنع</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {getCountryDisplay(document.manufacturing_country)}
                  </div>
                </div>
              )}
              {document.color && (
                <div className="form-group">
                  <label>اللون</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.color}
                  </div>
                </div>
              )}
              {document.fuel_tank_capacity && (
                <div className="form-group">
                  <label>سعة خزان الوقود</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.fuel_tank_capacity} لتر
                  </div>
                </div>
              )}
              {document.passenger_count && (
                <div className="form-group">
                  <label>عدد الركاب</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.passenger_count}
                  </div>
                </div>
              )}
              {document.load_capacity && (
                <div className="form-group">
                  <label>الحمولة بالطن</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.load_capacity} طن
                  </div>
                </div>
              )}
            </div>

            {/* بيانات المؤمن له */}
            <div className="form-section">
              <h3 className="form-section-title">بيانات المؤمن له</h3>
              {document.insured_name && (
                <div className="form-group">
                  <label>اسم المؤمن له</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.insured_name}
                  </div>
                </div>
              )}
              {document.phone && (
                <div className="form-group">
                  <label>رقم الهاتف</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.phone}
                  </div>
                </div>
              )}
              {document.license_number && (
                <div className="form-group">
                  <label>رقم الرخصة</label>
                  <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                    {document.license_number}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* بيانات المحرك */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            {/* بيانات المحرك الرئيسي */}
            <div className="form-section">
              <h3 className="form-section-title">بيانات المحرك الرئيسي</h3>
              {mainEngine ? (
                <>
                  {mainEngine.engine_model && (
                    <div className="form-group">
                      <label>نوع المحرك</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {mainEngine.engine_model}
                      </div>
                    </div>
                  )}
                  {mainEngine.fuel_type && (
                    <div className="form-group">
                      <label>نوع الوقود</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {mainEngine.fuel_type}
                      </div>
                    </div>
                  )}
                  {mainEngine.engine_number && (
                    <div className="form-group">
                      <label>رقم المحرك</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {mainEngine.engine_number}
                      </div>
                    </div>
                  )}
                  {mainEngine.manufacturing_country && (
                    <div className="form-group">
                      <label>مكان الصنع</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {getCountryDisplay(mainEngine.manufacturing_country)}
                      </div>
                    </div>
                  )}
                  {mainEngine.horsepower && (
                    <div className="form-group">
                      <label>القوة بالحصان</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {mainEngine.horsepower} حصان
                      </div>
                    </div>
                  )}
                  {mainEngine.installation_date && (
                    <div className="form-group">
                      <label>تاريخ التركيب</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {new Date(mainEngine.installation_date).toLocaleDateString('ar-LY')}
                      </div>
                    </div>
                  )}
                  {mainEngine.cylinders_count && (
                    <div className="form-group">
                      <label>عدد الإسطوانات</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {mainEngine.cylinders_count}
                      </div>
                    </div>
                  )}
                  {mainEngine.installation_type && (
                    <div className="form-group">
                      <label>تركيب المحرك</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {mainEngine.installation_type}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>لا توجد بيانات للمحرك الرئيسي</p>
              )}
            </div>

            {/* بيانات المحرك المساعد */}
            <div className="form-section">
              <h3 className="form-section-title">بيانات المحرك المساعد</h3>
              {auxiliaryEngine ? (
                <>
                  {auxiliaryEngine.engine_model && (
                    <div className="form-group">
                      <label>نوع المحرك</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {auxiliaryEngine.engine_model}
                      </div>
                    </div>
                  )}
                  {auxiliaryEngine.fuel_type && (
                    <div className="form-group">
                      <label>نوع الوقود</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {auxiliaryEngine.fuel_type}
                      </div>
                    </div>
                  )}
                  {auxiliaryEngine.engine_number && (
                    <div className="form-group">
                      <label>رقم المحرك</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {auxiliaryEngine.engine_number}
                      </div>
                    </div>
                  )}
                  {auxiliaryEngine.manufacturing_country && (
                    <div className="form-group">
                      <label>مكان الصنع</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {getCountryDisplay(auxiliaryEngine.manufacturing_country)}
                      </div>
                    </div>
                  )}
                  {auxiliaryEngine.horsepower && (
                    <div className="form-group">
                      <label>القوة بالحصان</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {auxiliaryEngine.horsepower} حصان
                      </div>
                    </div>
                  )}
                  {auxiliaryEngine.installation_date && (
                    <div className="form-group">
                      <label>تاريخ التركيب</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {new Date(auxiliaryEngine.installation_date).toLocaleDateString('ar-LY')}
                      </div>
                    </div>
                  )}
                  {auxiliaryEngine.cylinders_count && (
                    <div className="form-group">
                      <label>عدد الإسطوانات</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {auxiliaryEngine.cylinders_count}
                      </div>
                    </div>
                  )}
                  {auxiliaryEngine.installation_type && (
                    <div className="form-group">
                      <label>تركيب المحرك</label>
                      <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                        {auxiliaryEngine.installation_type}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>لا توجد بيانات للمحرك المساعد</p>
              )}
            </div>
          </div>

          {/* القيمة المالية */}
          <div className="form-section" style={{ marginTop: '20px' }}>
            <h3 className="form-section-title">القيمة المالية</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div className="form-group">
                <label>القسط المقرر</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.premium === 'number' ? document.premium : parseFloat(String(document.premium)) || 0).toFixed(3)} د.ل
                </div>
              </div>
              <div className="form-group">
                <label>الضريبة</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.tax === 'number' ? document.tax : parseFloat(String(document.tax)) || 0).toFixed(3)} د.ل
                </div>
              </div>
              <div className="form-group">
                <label>الدمغة</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.stamp === 'number' ? document.stamp : parseFloat(String(document.stamp)) || 0).toFixed(3)} د.ل
                </div>
              </div>
              <div className="form-group">
                <label>مصاريف الإصدار</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.issue_fees === 'number' ? document.issue_fees : parseFloat(String(document.issue_fees)) || 0).toFixed(3)} د.ل
                </div>
              </div>
              <div className="form-group">
                <label>رسوم الإشراف</label>
                <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  {(typeof document.supervision_fees === 'number' ? document.supervision_fees : parseFloat(String(document.supervision_fees)) || 0).toFixed(3)} د.ل
                </div>
              </div>
              <div className="form-group">
                <label>الإجمالي</label>
                <div style={{ padding: '10px 12px', background: '#f0f9ff', borderRadius: 8, border: '2px solid #3b82f6', fontWeight: 'bold', color: '#1e40af' }}>
                  {(typeof document.total === 'number' ? document.total : parseFloat(String(document.total)) || 0).toFixed(3)} دينار
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

