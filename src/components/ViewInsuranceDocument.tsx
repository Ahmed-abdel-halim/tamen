import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { showToast } from "./Toast";

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

type VehicleType = {
  id: number;
  brand: string;
  category: string;
};

type InsuranceDocument = {
  id: number;
  insurance_type: string;
  insurance_number: string;
  issue_date: string;
  start_date: string;
  end_date?: string;
  duration?: string;
  plate?: Plate;
  port?: string;
  plate_number_manual?: string;
  chassis_number?: string;
  vehicle_type_id?: number;
  vehicleType?: VehicleType;
  vehicle_type?: VehicleType;
  color?: string;
  year?: number;
  fuel_type?: string;
  license_purpose?: string;
  engine_power?: string;
  authorized_passengers?: number;
  load_capacity?: number;
  insured_name?: string;
  phone?: string;
  driving_license_number?: string;
  premium: number;
  tax: number;
  stamp: number;
  issue_fees: number;
  supervision_fees: number;
  total: number;
  third_party_purpose?: string;
  foreign_car_country?: string;
  foreign_car_purpose?: string;
  print_type?: string;
};

type OwnershipTransfer = {
  id: number;
  previous_plate_id?: number;
  previous_plate?: Plate;
  previous_plate_number_manual?: string;
  previous_insured_name?: string;
  previous_phone?: string;
  previous_driving_license_number?: string;
  new_plate_id?: number;
  new_plate?: Plate;
  new_plate_number_manual?: string;
  new_insured_name: string;
  new_phone?: string;
  new_driving_license_number?: string;
  transferred_at: string;
  created_at: string;
};

export default function ViewInsuranceDocument() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<InsuranceDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownershipTransfers, setOwnershipTransfers] = useState<OwnershipTransfer[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadUserPermissions();
    if (id) {
      fetchDocument();
      fetchOwnershipTransferHistory();
    }
  }, [id]);

  const loadUserPermissions = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setIsAdmin(user.is_admin || false);
      }
    } catch (error) {
      setIsAdmin(false);
    }
  };



  const fetchDocument = async () => {
    try {
      const res = await fetch(`/api/insurance-documents/${id}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        if (res.status === 404) {
          showToast('الوثيقة غير موجودة', 'error');
          setTimeout(() => navigate('/insurance-documents'), 2000);
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

  const fetchOwnershipTransferHistory = async () => {
    try {
      const res = await fetch(`/api/insurance-documents/${id}/ownership-transfer-history`, {
        headers: { 'Accept': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        setOwnershipTransfers(Array.isArray(data) ? data : []);
      }
    } catch (error: any) {
      console.error('Error fetching ownership transfer history:', error);
    }
  };

  const handlePrint = () => {
    const iframe = window.document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '-9999px';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.src = `/api/insurance-documents/${id}/print`;
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ar-LY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPortNumber = (portName: string | undefined): string | null => {
    if (!portName) return null;
    
    const ports: { [key: string]: string } = {
      'ميناء مصراته': '3',
      'ميناء طرابلس': '5',
      'ميناء الخمس': '6',
      'ميناء بنغازي': '8',
    };
    
    // البحث عن رقم الميناء
    for (const [port, number] of Object.entries(ports)) {
      if (portName.includes(port) || port.includes(portName)) {
        return number;
      }
    }
    
    // إذا لم يتم العثور على رقم، حاول استخراج رقم من النص
    const match = portName.match(/\d+/);
    return match ? match[0] : null;
  };

  const formatPlateNumber = () => {
    if (!document) return '-';
    
    const isCustomsInsurance = (document.insurance_type === 'تأمين سيارة جمرك');
    const plateNumber = document.plate_number_manual ?? (document.plate ? document.plate.plate_number : null);
    const cityOrder = document.plate && document.plate.city && document.plate.city.order ? document.plate.city.order : null;
    
    // في حالة تأمين جمرك
    if (isCustomsInsurance && document.port) {
      // استخراج رقم الميناء من اسم الميناء
      const portNumber = getPortNumber(document.port);
      
      // إذا كان هناك رقم لوحة ورقم ميناء، نعرضهما معاً
      if (plateNumber && portNumber) {
        return `${portNumber}-${plateNumber}`;
      } else if (plateNumber) {
        // إذا كان هناك رقم لوحة فقط، نعرضه مع اسم الميناء
        return `${document.port.trim()} - ${plateNumber}`;
      } else if (portNumber) {
        // إذا كان هناك رقم ميناء فقط
        return portNumber;
      } else {
        // إذا كان هناك اسم الميناء فقط
        return document.port.trim();
      }
    }
    
    // في الحالات الأخرى
    if (plateNumber && cityOrder) {
      return `${cityOrder}-${plateNumber}`;
    } else if (plateNumber) {
      return plateNumber;
    } else if (document.port) {
      return 'جمرك';
    }
    
    return '-';
  };

  const formatCityName = () => {
    if (!document) return '-';
    
    const isCustomsInsurance = (document.insurance_type === 'تأمين سيارة جمرك');
    const portValue = document.port ? document.port.trim() : '';
    const hasPort = portValue !== '';
    const hasPlateCity = (document.plate && document.plate.city);
    
    if (isCustomsInsurance) {
      return hasPort ? portValue : '-';
    } else if (hasPlateCity && document.plate) {
      const city = document.plate.city;
      return city.name_ar + (city.name_en ? ' ' + city.name_en : '');
    } else if (hasPort) {
      return portValue;
    }
    
    return '-';
  };

  return (
    <section className="users-management">
      <div className="users-breadcrumb">
        <span>الإعدادات / وثائق تأمين السيارات / عرض الوثيقة</span>
      </div>
      
      <div className="users-card">
        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>جار التحميل...</p>
        ) : !document ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p>الوثيقة غير موجودة</p>
            <button onClick={() => navigate('/insurance-documents')} className="btn btn-primary" style={{ marginTop: '10px' }}>
              العودة إلى القائمة
            </button>
          </div>
        ) : (
          <div className="engineer-financial-details-container">
          <div className="engineer-financial-details-header">
            <h2 className="engineer-financial-details-title">
              تفاصيل: {document.insurance_number}
            </h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="back-button" 
                onClick={() => navigate('/insurance-documents')}
              >
                <i className="fa-solid fa-arrow-right"></i>
                <span className="back-button-text">العودة للقائمة</span>
              </button>
              <button 
                className="back-button print-button" 
                onClick={handlePrint}
              >
                <i className="fa-solid fa-print"></i>
                <span className="back-button-text">طباعة الوثيقة</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => navigate(`/insurance-documents/${id}/edit`)}
                  className="btn-submit"
                >
                  <i className="fa-solid fa-pencil" style={{ marginLeft: '6px' }}></i>
                  تعديل
                </button>
              )}
              <button
                onClick={() => navigate(`/insurance-documents/${id}/transfer-ownership`)}
                className="btn-submit"
                style={{ background: '#10b981', borderColor: '#10b981' }}
              >
                <i className="fa-solid fa-exchange-alt" style={{ marginLeft: '6px' }}></i>
                نقل ملكية
              </button>
            </div>
          </div>

          <div className="engineer-info-card-wrapper">
            <div className="engineer-info-card">
              <div className="engineer-info-content">
                <div className="engineer-info-label">نوع التأمين</div>
                <div className="engineer-info-value">
                  {document.insurance_type}
                </div>
                {document.insured_name && (
                  <div className="engineer-info-detail">
                    <i className="fa-solid fa-user"></i>
                    {document.insured_name}
                  </div>
                )}
                {document.phone && (
                  <div className="engineer-info-detail">
                    <i className="fa-solid fa-phone"></i>
                    {document.phone}
                  </div>
                )}
                <div className="engineer-info-detail">
                  <i className="fa-solid fa-hashtag"></i>
                  رقم الوثيقة: {document.insurance_number}
                </div>
                <div className="engineer-info-detail">
                  <i className="fa-solid fa-calendar"></i>
                  تاريخ الإصدار: {formatDateTime(document.issue_date)}
                </div>
              </div>
            </div>
          </div>

          <div className="engineer-stats-grid">
            <div className="engineer-stat-card">
              <i className="fa-solid fa-calendar-check engineer-stat-icon"></i>
              <div className="engineer-stat-label">تاريخ البداية</div>
              <div className="engineer-stat-value">
                {formatDate(document.start_date)}
              </div>
            </div>

            <div className="engineer-stat-card">
              <i className="fa-solid fa-calendar-times engineer-stat-icon"></i>
              <div className="engineer-stat-label">تاريخ النهاية</div>
              <div className="engineer-stat-value">
                {formatDate(document.end_date)}
              </div>
            </div>

            <div className="engineer-stat-card">
              <i className="fa-solid fa-clock engineer-stat-icon"></i>
              <div className="engineer-stat-label">مدة التأمين</div>
              <div className="engineer-stat-value">
                {document.duration || '-'}
              </div>
            </div>

            <div className="engineer-stat-card">
              <i className="fa-solid fa-money-bill-wave engineer-stat-icon"></i>
              <div className="engineer-stat-label">الإجمالي</div>
              <div className="engineer-stat-value">
                {Number(document.total).toFixed(3)} د.ل
              </div>
            </div>
          </div>

          {/* معلومات الوثيقة ومعلومات المؤمن له */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            {/* معلومات الوثيقة */}
            <div>
              <h3 className="engineer-maps-section-title">معلومات الوثيقة</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '200px' }}>رقم الوثيقة</td>
                      <td>{document.insurance_number}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>نوع التأمين</td>
                      <td>{document.insurance_type}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>تاريخ الإصدار</td>
                      <td>{formatDateTime(document.issue_date)}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>تاريخ البداية</td>
                      <td>{formatDate(document.start_date)}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>تاريخ النهاية</td>
                      <td>{formatDate(document.end_date)}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>مدة التأمين</td>
                      <td>{document.duration || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* معلومات المؤمن له */}
            <div>
              <h3 className="engineer-maps-section-title">معلومات المؤمن له</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '200px' }}>اسم المؤمن له</td>
                      <td>{document.insured_name || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>رقم الهاتف</td>
                      <td>{document.phone || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>رقم رخصة القيادة</td>
                      <td>{document.driving_license_number || '-'}</td>
                    </tr>
                    {document.third_party_purpose && (
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>غرض الطرف الثالث</td>
                        <td>{document.third_party_purpose}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* معلومات المركبة والبيانات المالية */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
            {/* معلومات المركبة */}
            <div>
              <h3 className="engineer-maps-section-title">معلومات المركبة</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '200px' }}>رقم اللوحة المعدنية</td>
                      <td>{formatPlateNumber()}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>الميناء / الجهة المقيّد بها</td>
                      <td>{formatCityName()}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>رقم الهيكل</td>
                      <td>{document.chassis_number || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>نوع المركبة</td>
                      <td>
                        {(document.vehicleType || document.vehicle_type) && (document.vehicleType?.brand || document.vehicle_type?.brand)
                          ? `${document.vehicleType?.brand || document.vehicle_type?.brand}${(document.vehicleType?.category || document.vehicle_type?.category) ? ' / ' + (document.vehicleType?.category || document.vehicle_type?.category) : ''}`
                          : '-'
                        }
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>اللون</td>
                      <td>{document.color || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>سنة الصنع</td>
                      <td>{document.year || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>نوع الوقود</td>
                      <td>{document.fuel_type || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>الغرض من الترخيص</td>
                      <td>{document.license_purpose || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>قوة المحرك بالحصان</td>
                      <td>{document.engine_power || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>الركاب المصرح بهم</td>
                      <td>{document.authorized_passengers || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>الحمولة بالطن</td>
                      <td>
                        {document.load_capacity 
                          ? (() => {
                              const capacity = typeof document.load_capacity === 'string' 
                                ? parseFloat(document.load_capacity) 
                                : document.load_capacity;
                              if (isNaN(capacity)) return '-';
                              return Number.isInteger(capacity) 
                                ? capacity.toString() 
                                : capacity.toFixed(2);
                            })()
                          : '-'
                        }
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* البيانات المالية */}
            <div>
              <h3 className="engineer-maps-section-title">البيانات المالية</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 'bold', width: '200px' }}>قيمة القسط المقرر</td>
                      <td>{Number(document.premium).toFixed(3)} د.ل</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>الضريبة</td>
                      <td>{Number(document.tax).toFixed(3)} د.ل</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>الدمغة</td>
                      <td>{Number(document.stamp).toFixed(3)} د.ل</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>مصاريف الإصدار</td>
                      <td>{Number(document.issue_fees).toFixed(3)} د.ل</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 'bold' }}>رسوم الإشراف</td>
                      <td>{Number(document.supervision_fees).toFixed(3)} د.ل</td>
                    </tr>
                    <tr style={{ backgroundColor: '#f0f9ff' }}>
                      <td style={{ fontWeight: 'bold' }}>الإجمالي</td>
                      <td style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#1e40af' }}>{Number(document.total).toFixed(3)} د.ل</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* معلومات السيارات الأجنبية */}
          {(document.foreign_car_country || document.foreign_car_purpose) && (
            <div style={{ marginTop: '20px' }}>
              <h3 className="engineer-maps-section-title">معلومات السيارة الأجنبية</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <tbody>
                    {document.foreign_car_country && (
                      <tr>
                        <td style={{ fontWeight: 'bold', width: '200px' }}>بلد السيارة</td>
                        <td>{document.foreign_car_country}</td>
                      </tr>
                    )}
                    {document.foreign_car_purpose && (
                      <tr>
                        <td style={{ fontWeight: 'bold' }}>غرض السيارة</td>
                        <td>{document.foreign_car_purpose}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* تاريخ نقل الملكية */}
          {ownershipTransfers.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <h3 className="engineer-maps-section-title">تاريخ نقل الملكية</h3>
              <div className="users-table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>التاريخ والوقت</th>
                      <th>اسم المؤمن (السابق)</th>
                      <th>اسم المؤمن (الجديد)</th>
                      <th>الجهة المقيد بها (السابقة)</th>
                      <th>الجهة المقيد بها (الجديدة)</th>
                      <th>رقم اللوحة (السابق)</th>
                      <th>رقم اللوحة (الجديد)</th>
                      <th>رقم الهاتف (السابق)</th>
                      <th>رقم الهاتف (الجديد)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownershipTransfers.map((transfer: OwnershipTransfer) => (
                      <tr key={transfer.id}>
                        <td>
                          {new Date(transfer.transferred_at).toLocaleString('ar-LY', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td>{transfer.previous_insured_name || '-'}</td>
                        <td style={{ fontWeight: 'bold', color: '#10b981' }}>{transfer.new_insured_name}</td>
                        <td>
                          {transfer.previous_plate
                            ? `${transfer.previous_plate.city.name_ar} - ${transfer.previous_plate.plate_number}`
                            : transfer.previous_plate_number_manual || '-'}
                        </td>
                        <td style={{ fontWeight: 'bold', color: '#10b981' }}>
                          {transfer.new_plate
                            ? `${transfer.new_plate.city.name_ar} - ${transfer.new_plate.plate_number}`
                            : transfer.new_plate_number_manual || '-'}
                        </td>
                        <td>{transfer.previous_plate_number_manual || '-'}</td>
                        <td style={{ fontWeight: 'bold', color: '#10b981' }}>{transfer.new_plate_number_manual || '-'}</td>
                        <td>{transfer.previous_phone || '-'}</td>
                        <td style={{ fontWeight: 'bold', color: '#10b981' }}>{transfer.new_phone || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
        )}
      </div>


    </section>
  );
}

