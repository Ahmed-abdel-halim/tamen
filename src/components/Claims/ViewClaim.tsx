import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { showToast } from '../Toast';
import { API_BASE_URL, BACKEND_URL } from '../../config/api';

export default function ViewClaim() {
  const { id } = useParams();
  const [claim, setClaim] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transfering, setTransfering] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const navigate = useNavigate();

  // Transfer Form State
  const [transferType, setTransferType] = useState('تسويه وديه');
  const [otherTransferType, setOtherTransferType] = useState('');
  const [transferDetails, setTransferDetails] = useState<any>({});

  const fetchClaim = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/claims/${id}`, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch claim');
      const data = await response.json();
      setClaim(data);
    } catch (error) {
      showToast('حدث خطأ أثناء جلب تفاصيل المطالبة', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaim();
  }, [id]);

  const handleDetailChange = (key: string, value: any) => {
    setTransferDetails({ ...transferDetails, [key]: value });
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransfering(true);

    try {
      const formData = new FormData();
      formData.append('transfer_type', transferType);
      if (transferType === 'اخر') {
        formData.append('other_transfer_type', otherTransferType);
      }

      Object.keys(transferDetails).forEach(key => {
        const val = transferDetails[key];
        if (val instanceof File) {
          formData.append(`detail_${key}`, val);
        } else if (val) {
          formData.append(`detail_${key}`, val);
        }
      });

      const response = await fetch(`${API_BASE_URL}/claims/${id}/transfers`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        },
        body: formData
      });
      if (!response.ok) throw new Error('Failed to transfer claim');

      showToast('تم تحويل المطالبة بنجاح', 'success');
      setShowTransferForm(false);
      setTransferDetails({});
      fetchClaim();
    } catch (error: any) {
      showToast('حدث خطأ أثناء تحويل المطالبة', 'error');
    } finally {
      setTransfering(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/claims/${id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete claim');
      
      showToast('تم حذف المطالبة بنجاح', 'success');
      navigate('/claims');
    } catch (error) {
      showToast('حدث خطأ أثناء حذف المطالبة', 'error');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=1200,height=900');
    if (!printWindow) return;

    const statusMap: any = {
      'pending': 'قيد الانتظار',
      'للتسديد - الشؤون المالية': 'للتسديد'
    };

    const displayStatus = statusMap[claim.status] || claim.status;

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>مطالبة رقم #${claim.claim_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap');
          @media print { 
            @page { margin: 10mm; size: A4; } 
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body { 
            font-family: 'Cairo', sans-serif; 
            margin: 0; 
            padding: 30px; 
            color: #1e293b;
            background: #fff;
            line-height: 1.6;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px double #1e293b;
          }
          .header-right {
            display: flex;
            align-items: center;
            gap: 20px;
          }
          .header-info h1 { margin: 0; font-size: 22px; color: #1e293b; font-weight: 900; }
          .header-info p { margin: 2px 0; color: #475569; font-size: 14px; font-weight: 600; }
          .logo { height: 90px; width: auto; }
          
          .doc-title-container {
            text-align: center;
            margin: 30px 0;
          }
          .doc-title { 
            display: inline-block;
            padding: 10px 40px;
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            font-size: 20px;
            font-weight: 800;
            color: #1e293b;
          }

          .section {
            margin-bottom: 25px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            overflow: hidden;
          }
          .section-header {
            background: #f8fafc;
            padding: 10px 15px;
            border-bottom: 1px solid #e2e8f0;
            font-weight: 800;
            font-size: 16px;
            color: #1e293b;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .data-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            padding: 15px;
            gap: 15px;
          }
          .data-item {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px dashed #e2e8f0;
            padding-bottom: 5px;
          }
          .label { font-weight: 700; color: #64748b; font-size: 14px; }
          .value { font-weight: 600; color: #1e293b; font-size: 14px; }

          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { padding: 10px; border: 1px solid #e2e8f0; text-align: center; font-size: 13px; }
          th { background: #f8fafc; font-weight: 800; }

          .footer-sigs {
            margin-top: 50px;
            display: flex;
            justify-content: space-between;
            padding: 0 40px;
          }
          .sig-box { width: 200px; text-align: center; }
          .sig-line { border-top: 1.5px solid #1e293b; margin-bottom: 8px; }
          .sig-text { font-weight: 800; font-size: 15px; }

          .print-meta {
            margin-top: 40px;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #f1f5f9;
            padding-top: 10px;
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="header">
          <div class="header-right">
            <img src="/img/logo3.png" class="logo" alt="Logo">
            <div class="header-info">
              <h1>المدار الليبي للتأمين</h1>
              <p>إدارة المطالبات والحوادث</p>
            </div>
          </div>
          <div style="text-align: left; font-size: 13px; font-weight: 600;">
            تاريخ الطباعة: ${new Date().toLocaleDateString('ar-LY')}<br/>
            رقم المطالبة: ${claim.claim_number}
          </div>
        </div>

        <div class="doc-title-container">
          <div class="doc-title">مـلخـص تـفاصـيـل المـطالـبـة</div>
        </div>

        <div class="section">
          <div class="section-header">بيانات المطالبة</div>
          <div class="data-grid">
            <div class="data-item"><span class="label">رقم المطالبة:</span> <span class="value">${claim.claim_number}</span></div>
            <div class="data-item"><span class="label">تاريخ المطالبة:</span> <span class="value">${claim.claim_date}</span></div>
            <div class="data-item"><span class="label">تاريخ الحادث:</span> <span class="value">${claim.accident_date}</span></div>
            <div class="data-item"><span class="label">وقت الحادث:</span> <span class="value">${claim.accident_time || '---'}</span></div>
            <div class="data-item"><span class="label">مكان الحادث:</span> <span class="value">${claim.accident_location || '---'}</span></div>
            <div class="data-item"><span class="label">الرقم الإشاري:</span> <span class="value">${claim.reference_number || '---'}</span></div>
            <div class="data-item"><span class="label">الرقم الإداري:</span> <span class="value">${claim.admin_number || '---'}</span></div>
            <div class="data-item"><span class="label">نوع الأضرار:</span> <span class="value">${claim.damage_type === 'اخر' ? claim.other_damage_type : claim.damage_type}</span></div>
            <div class="data-item"><span class="label">يوجد وفيات:</span> <span class="value">${claim.has_fatalities ? 'نعم' : 'لا'}</span></div>
            <div class="data-item"><span class="label">حالة المطالبة:</span> <span class="value">${displayStatus}</span></div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">بيانات مقدم المطالبة</div>
          <div class="data-grid">
            <div class="data-item"><span class="label">الاسم بالكامل:</span> <span class="value">${claim.claimant_name}</span></div>
            <div class="data-item"><span class="label">صلة القرابة:</span> <span class="value">${claim.kinship}</span></div>
            <div class="data-item"><span class="label">الجنسية:</span> <span class="value">${claim.nationality}</span></div>
            <div class="data-item"><span class="label">إثبات الشخصية:</span> <span class="value">${claim.personal_id}</span></div>
            <div class="data-item"><span class="label">رقم الهاتف:</span> <span class="value">${claim.phone_number}</span></div>
            ${claim.claimant_check_number ? `<div class='data-item'><span class='label'>رقم الشيك/الإيصال:</span> <span class='value'>${claim.claimant_check_number}</span></div>` : ''}
          </div>
        </div>

        ${(claim.driver_name || claim.driver_license_number) ? `
        <div class='section'>
          <div class='section-header'>بيانات السائق</div>
          <div class='data-grid'>
            ${claim.driver_name ? `<div class='data-item'><span class='label'>اسم السائق:</span> <span class='value'>${claim.driver_name}</span></div>` : ''}
            ${claim.driver_nationality ? `<div class='data-item'><span class='label'>الجنسية:</span> <span class='value'>${claim.driver_nationality}</span></div>` : ''}
            ${claim.driver_id_number ? `<div class='data-item'><span class='label'>رقم الهوية:</span> <span class='value'>${claim.driver_id_number}</span></div>` : ''}
            ${claim.driver_license_number ? `<div class='data-item'><span class='label'>رقم الرخصة:</span> <span class='value'>${claim.driver_license_number}</span></div>` : ''}
            ${claim.driver_license_issue_date ? `<div class='data-item'><span class='label'>تاريخ إصدار الرخصة:</span> <span class='value'>${claim.driver_license_issue_date}</span></div>` : ''}
            ${claim.driver_license_expiry_date ? `<div class='data-item'><span class='label'>تاريخ انتهاء الرخصة:</span> <span class='value'>${claim.driver_license_expiry_date}</span></div>` : ''}
          </div>
        </div>` : ''}

        ${claim.damaged_body_type ? `
        <div class='section'>
          <div class='section-header'>بيانات الجسم المتضرر (${claim.damaged_body_type})</div>
          <div class='data-grid'>
            ${claim.damaged_vehicle_model ? `<div class='data-item'><span class='label'>موديل السيارة:</span> <span class='value'>${claim.damaged_vehicle_model}</span></div>` : ''}
            ${claim.damaged_vehicle_plate ? `<div class='data-item'><span class='label'>رقم اللوحة:</span> <span class='value'>${claim.damaged_vehicle_plate}</span></div>` : ''}
            ${claim.damaged_vehicle_repair_shop ? `<div class='data-item'><span class='label'>ورشة التصليح:</span> <span class='value'>${claim.damaged_vehicle_repair_shop}</span></div>` : ''}
            ${claim.damaged_vehicle_amount ? `<div class='data-item'><span class='label'>مبلغ الأضرار:</span> <span class='value'>${Number(claim.damaged_vehicle_amount).toLocaleString('ar-LY')} د.ل</span></div>` : ''}
            ${claim.damaged_person_name ? `<div class='data-item'><span class='label'>اسم المتضرر:</span> <span class='value'>${claim.damaged_person_name}</span></div>` : ''}
            ${claim.damaged_person_amount ? `<div class='data-item'><span class='label'>مبلغ الأضرار:</span> <span class='value'>${Number(claim.damaged_person_amount).toLocaleString('ar-LY')} د.ل</span></div>` : ''}
            ${claim.damaged_building_description ? `<div class='data-item'><span class='label'>وصف المبنى:</span> <span class='value'>${claim.damaged_building_description}</span></div>` : ''}
            ${claim.damaged_building_amount ? `<div class='data-item'><span class='label'>مبلغ الأضرار:</span> <span class='value'>${Number(claim.damaged_building_amount).toLocaleString('ar-LY')} د.ل</span></div>` : ''}
          </div>
        </div>` : ''}

        ${claim.assessor_name ? `
        <div class='section'>
          <div class='section-header'>تقرير مقدر الأضرار</div>
          <div class='data-grid'>
            <div class='data-item'><span class='label'>اسم المقدر:</span> <span class='value'>${claim.assessor_name}</span></div>
            ${claim.assessor_phone ? `<div class='data-item'><span class='label'>رقم الهاتف:</span> <span class='value'>${claim.assessor_phone}</span></div>` : ''}
            ${claim.assessor_date ? `<div class='data-item'><span class='label'>تاريخ التقييم:</span> <span class='value'>${claim.assessor_date}</span></div>` : ''}
            ${claim.assessor_amount_dinar ? `<div class='data-item'><span class='label'>القيمة (دينار):</span> <span class='value'>${Number(claim.assessor_amount_dinar).toLocaleString('ar-LY')} د.ل</span></div>` : ''}
            ${claim.assessor_amount_dollar ? `<div class='data-item'><span class='label'>القيمة (دولار):</span> <span class='value'>$${Number(claim.assessor_amount_dollar).toLocaleString()}</span></div>` : ''}
          </div>
        </div>` : ''}

        <div class="section">
          <div class="section-header">بيانات الوثيقة المربوطة</div>
          <div class="data-grid">
            <div class="data-item"><span class="label">رقم الوثيقة:</span> <span class="value">${claim.document?.insurance_number || '---'}</span></div>
            <div class="data-item"><span class="label">اسم المؤمن له:</span> <span class="value">${claim.document?.insured_name || '---'}</span></div>
            <div class="data-item"><span class="label">تغطية الوثيقة:</span> <span class="value">${claim.document_coverage || '---'}</span></div>
          </div>
        </div>

        ${claim.transfers && claim.transfers.length > 0 ? `
          <div class="section">
            <div class="section-header">سجل التحويلات</div>
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>نوع التحويل</th>
                  <th>التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                ${claim.transfers.map((t: any) => {
                  const detailsText = Object.entries(t.details || {}).map(([k, v]) => {
                    if (typeof v === 'string' && (v.includes('claim_transfers/') || v.match(/\.(jpg|jpeg|png|pdf)$/i))) {
                      return `${k.replace(/_/g, ' ')}: [مرفق]`;
                    }
                    const label = k === 'case_number' ? 'رقم القضية' : 
                                  k === 'transfer_date' ? 'تاريخ الإحالة' :
                                  k === 'prosecution_name' ? 'النيابة' :
                                  k === 'committee_manager' ? 'مدير اللجنة' :
                                  k === 'deputy_manager' ? 'نائب المدير' :
                                  k === 'total_value' ? 'إجمالي القيمة' :
                                  k === 'manager_report' ? 'تقرير المدير' :
                                  k === 'report_number' ? 'رقم البلاغ' :
                                  k === 'report_date' ? 'تاريخ البلاغ' :
                                  k === 'police_station' ? 'مركز الشرطة' :
                                  k === 'book_number' ? 'رقم الكتاب' :
                                  k === 'financial_value' ? 'القيمة المالية' :
                                  k === 'recipient_name' ? 'اسم المستلم' :
                                  k === 'session_date' ? 'تاريخ الجلسة' :
                                  k === 'court_name' ? 'المحكمة' :
                                  k === 'appeal_case_number' ? 'رقم الاستئناف' :
                                  k === 'appeal_date' ? 'تاريخ الاستئناف' :
                                  k === 'appeal_court' ? 'محكمة الاستئناف' :
                                  k === 'notes' ? 'ملاحظات' :
                                  k === 'report_image' ? 'صورة البلاغ' :
                                  k === 'financial_value_image' ? 'إثبات القيمة' :
                                  k === 'transfer_image' ? 'صورة الإحالة' :
                                  k === 'court_file_image' ? 'ملف القضية' :
                                  k === 'previous_judgment_image' ? 'الحكم السابق' :
                                  k === 'image' ? 'الصورة المرفقة' :
                                  k.replace(/_/g, ' ');
                    return `${label}: ${v}`;
                  }).join(' | ');
                  
                  return `
                    <tr>
                      <td>${new Date(t.created_at).toLocaleDateString('ar-LY')}</td>
                      <td>${t.transfer_type === 'اخر' ? t.other_transfer_type : t.transfer_type}</td>
                      <td>${detailsText}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="footer-sigs">
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-text">الموظف المختص</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-text">رئيس القسم</div>
          </div>
          <div class="sig-box">
            <div class="sig-line"></div>
            <div class="sig-text">ختم الشركة</div>
          </div>
        </div>

        <div class="print-meta">
          تم استخراج هذا المستند آلياً من نظام المدار الليبي للتأمين - ${new Date().toLocaleString('ar-LY')}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'pending': return { bg: '#fef3c7', color: '#d97706', text: 'قيد الانتظار' };
      case 'تسويه وديه': return { bg: '#dcfce7', color: '#166534', text: 'تسويه وديه' };
      case 'تحويل الى مركز الشرطة': return { bg: '#e0f2fe', color: '#075985', text: 'بمركز الشرطة' };
      case 'تحويل الى النيابة': return { bg: '#f3e8ff', color: '#6b21a8', text: 'بالنيابة العامة' };
      case 'تحويل الى المحكمة': return { bg: '#fee2e2', color: '#991b1b', text: 'بالمحكمة المختصة' };
      case 'استئناف في حكم المحكمة': return { bg: '#ffedd5', color: '#9a3412', text: 'قيد الاستئناف' };
      case 'للتسديد - الشؤون المالية': return { bg: '#ecfdf5', color: '#059669', text: 'جاهزة للتسديد' };
      default: return { bg: '#eff6ff', color: '#2563eb', text: status };
    }
  };

  const renderTransferFields = () => {
    switch (transferType) {
      case 'تسويه وديه':
        return (
          <>
            <div className="field-group"><label>مدير لجنة</label><input type="text" onChange={e => handleDetailChange('committee_manager', e.target.value)} /></div>
            <div className="field-group"><label>نائب مدير</label><input type="text" onChange={e => handleDetailChange('deputy_manager', e.target.value)} /></div>
            <div className="field-group"><label>الإجمالي القيمة المالية</label><input type="number" onChange={e => handleDetailChange('total_value', e.target.value)} /></div>
            <div className="field-group full"><label>تقرير مدير اللجنة</label><input type="text" onChange={e => handleDetailChange('manager_report', e.target.value)} /></div>
            <div className="field-group full"><label>إضافة صورة</label><input type="file" onChange={e => handleDetailChange('image', e.target.files?.[0])} /></div>
          </>
        );
      case 'تحويل الى مركز الشرطة':
        return (
          <>
            <div className="field-group"><label>رقم البلاغ</label><input type="text" onChange={e => handleDetailChange('report_number', e.target.value)} /></div>
            <div className="field-group"><label>تاريخ البلاغ</label><input type="date" onChange={e => handleDetailChange('report_date', e.target.value)} /></div>
            <div className="field-group"><label>اسم مركز الشرطة</label><input type="text" onChange={e => handleDetailChange('police_station', e.target.value)} /></div>
            <div className="field-group full"><label>تقرير وصورة البلاغ</label><input type="file" onChange={e => handleDetailChange('report_image', e.target.files?.[0])} /></div>
          </>
        );
      case 'للتسديد - الشؤون المالية':
        return (
          <>
            <div className="field-group"><label>رقم الكتاب</label><input type="text" onChange={e => handleDetailChange('book_number', e.target.value)} /></div>
            <div className="field-group"><label>القيمة المالية</label><input type="number" onChange={e => handleDetailChange('financial_value', e.target.value)} /></div>
            <div className="field-group"><label>اسم المستلم</label><input type="text" onChange={e => handleDetailChange('recipient_name', e.target.value)} /></div>
            <div className="field-group full"><label>إثبات القيمة (صورة)</label><input type="file" onChange={e => handleDetailChange('financial_value_image', e.target.files?.[0])} /></div>
          </>
        );
      case 'تحويل الى النيابة':
        return (
          <>
            <div className="field-group"><label>رقم القضية / المحضر</label><input type="text" onChange={e => handleDetailChange('case_number', e.target.value)} /></div>
            <div className="field-group"><label>تاريخ الإحالة</label><input type="date" onChange={e => handleDetailChange('transfer_date', e.target.value)} /></div>
            <div className="field-group"><label>اسم النيابة</label><input type="text" onChange={e => handleDetailChange('prosecution_name', e.target.value)} /></div>
            <div className="field-group full"><label>مرفق قرار الإحالة (صورة)</label><input type="file" onChange={e => handleDetailChange('transfer_image', e.target.files?.[0])} /></div>
          </>
        );
      case 'تحويل الى المحكمة':
        return (
          <>
            <div className="field-group"><label>رقم القضية</label><input type="text" onChange={e => handleDetailChange('case_number', e.target.value)} /></div>
            <div className="field-group"><label>تاريخ الجلسة</label><input type="date" onChange={e => handleDetailChange('session_date', e.target.value)} /></div>
            <div className="field-group"><label>اسم المحكمة</label><input type="text" onChange={e => handleDetailChange('court_name', e.target.value)} /></div>
            <div className="field-group full"><label>مرفق ملف القضية (صورة)</label><input type="file" onChange={e => handleDetailChange('court_file_image', e.target.files?.[0])} /></div>
          </>
        );
      case 'استئناف في حكم المحكمة':
        return (
          <>
            <div className="field-group"><label>رقم قضية الاستئناف</label><input type="text" onChange={e => handleDetailChange('appeal_case_number', e.target.value)} /></div>
            <div className="field-group"><label>تاريخ الاستئناف</label><input type="date" onChange={e => handleDetailChange('appeal_date', e.target.value)} /></div>
            <div className="field-group"><label>محكمة الاستئناف</label><input type="text" onChange={e => handleDetailChange('appeal_court', e.target.value)} /></div>
            <div className="field-group full"><label>صورة من حكم المحكمة السابق</label><input type="file" onChange={e => handleDetailChange('previous_judgment_image', e.target.files?.[0])} /></div>
          </>
        );
      case 'اخر':
        return (
          <>
            <div className="field-group full"><label>نوع التحويل</label><input type="text" required onChange={e => setOtherTransferType(e.target.value)} placeholder="أدخل نوع التحويل" /></div>
            <div className="field-group full"><label>تفاصيل إضافية</label><textarea rows={3} onChange={e => handleDetailChange('notes', e.target.value)}></textarea></div>
          </>
        );
      default:
        return <div className="p-3 text-muted">سيتم طلب البيانات الأساسية للتحويل المختار</div>;
    }
  };

  if (loading) return <div className="loading-state"><div className="spinner"></div><p>جاري جلب تفاصيل المطالبة...</p></div>;
  if (!claim) return <div className="error-state">لم يتم العثور على المطالبة</div>;

  const statusInfo = getStatusStyle(claim.status);

  return (
    <div className="view-claim-container">
      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="transfer-overlay">
          <div className="transfer-modal" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3 style={{ color: '#ef4444' }}><i className="fa-solid fa-triangle-exclamation"></i> تأكيد الحذف</h3>
              <button className="close-btn" onClick={() => setShowDeleteConfirm(false)}>&times;</button>
            </div>
            <div className="form-body" style={{ textAlign: 'center', padding: '30px' }}>
              <i className="fa-solid fa-trash-can" style={{ fontSize: '3rem', color: '#ef4444', marginBottom: '20px', display: 'block' }}></i>
              <p style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text)', marginBottom: '10px' }}>هل أنت متأكد من حذف المطالبة؟</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>لا يمكن التراجع عن هذا الإجراء بعد التنفيذ.</p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', gap: '15px', paddingBottom: '30px' }}>
              <button className="btn-cancel" onClick={() => setShowDeleteConfirm(false)}>إلغاء</button>
              <button className="btn-confirm" style={{ background: '#ef4444' }} onClick={handleDelete}>تأكيد الحذف نهائياً</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Breadcrumb & Header */}
      <header className="claim-page-header">
        <div className="breadcrumb-nav">
          <Link to="/claims">المطالبات</Link>
          <i className="fa-solid fa-chevron-left"></i>
          <span>تفاصيل المطالبة #{claim.claim_number}</span>
        </div>
        
        <div className="header-actions-row">
          <div className="title-section">
            <h1>مطالبة رقم <span className="id-highlight">#{claim.claim_number}</span></h1>
            <span className="status-pill" style={{ background: statusInfo.bg, color: statusInfo.color }}>
              <span className="dot" style={{ background: statusInfo.color }}></span>
              {statusInfo.text}
            </span>
          </div>
          
          <div className="button-group">
            <button className="btn-transfer" onClick={() => setShowTransferForm(!showTransferForm)}>
              <i className="fa-solid fa-share-nodes"></i>
              تحويل المطالبة
            </button>
            <Link to="/claims" className="btn-back">
              <i className="fa-solid fa-arrow-right"></i>
              رجوع
            </Link>
          </div>
        </div>
      </header>

      {/* Transfer Overlay Form */}
      {showTransferForm && (
        <div className="transfer-overlay" onClick={(e) => e.target === e.currentTarget && setShowTransferForm(false)}>
          <div className="transfer-modal">
            <div className="modal-header">
              <h3><i className="fa-solid fa-share-nodes"></i> تحويل الملف إلى جهة جديدة</h3>
              <button className="close-btn" onClick={() => setShowTransferForm(false)}>&times;</button>
            </div>
            <form onSubmit={handleTransferSubmit}>
              <div className="form-body">
                <div className="field-group full">
                  <label>اختر الوجهة</label>
                  <select value={transferType} onChange={e => setTransferType(e.target.value)}>
                    <option value="تسويه وديه">تسويه وديه</option>
                    <option value="تحويل الى مركز الشرطة">تحويل الى مركز الشرطة</option>
                    <option value="تحويل الى النيابة">تحويل الى النيابة</option>
                    <option value="تحويل الى المحكمة">تحويل الى المحكمة</option>
                    <option value="استئناف في حكم المحكمة">استئناف في حكم المحكمة</option>
                    <option value="للتسديد - الشؤون المالية">للتسديد - الشؤون المالية</option>
                    <option value="اخر">إضافة نوع آخر</option>
                  </select>
                </div>
                <div className="dynamic-fields-grid">
                  {renderTransferFields()}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setShowTransferForm(false)}>إلغاء</button>
                <button type="submit" className="btn-confirm" disabled={transfering}>
                  {transfering ? 'جاري التحويل...' : 'تأكيد التحويل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content Dashboard */}
      <div className="claim-dashboard-grid">
        
        {/* Left Column: Data Sections */}
        <div className="dashboard-main-col">
          
          {/* Section 1: Claim Info */}
          <section className="dashboard-card">
            <div className="card-header">
              <i className="fa-solid fa-circle-info text-primary"></i>
              <h3>بيانات المطالبة الأساسية</h3>
            </div>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">تاريخ المطالبة</span>
                <span className="value">{claim.claim_date}</span>
              </div>
              <div className="detail-item">
                <span className="label">تاريخ الحادث</span>
                <span className="value">{claim.accident_date}</span>
              </div>
              <div className="detail-item">
                <span className="label">الرقم الإشاري</span>
                <span className="value">{claim.reference_number || '---'}</span>
              </div>
              <div className="detail-item">
                <span className="label">الرقم الإداري</span>
                <span className="value">{claim.admin_number || '---'}</span>
              </div>
              <div className="detail-item">
                <span className="label">نوع الأضرار</span>
                <span className="value badge-value">{claim.damage_type === 'اخر' ? claim.other_damage_type : claim.damage_type}</span>
              </div>
              {claim.accident_location && (
                <div className="detail-item">
                  <span className="label">مكان الحادث</span>
                  <span className="value">{claim.accident_location}</span>
                </div>
              )}
              {claim.accident_time && (
                <div className="detail-item">
                  <span className="label">وقت الحادث</span>
                  <span className="value">{claim.accident_time}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="label">يوجد وفيات</span>
                <span className="value" style={{color: claim.has_fatalities ? '#ef4444' : '#22c55e', fontWeight: 700}}>
                  {claim.has_fatalities ? 'نعم ⚠️' : 'لا'}
                </span>
              </div>
            </div>
          </section>

          <section className="dashboard-card">
            <div className="card-header">
              <i className="fa-solid fa-user-tie text-success"></i>
              <h3>بيانات مقدم المطالبة</h3>
            </div>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">الاسم بالكامل</span>
                <span className="value fw-bold">{claim.claimant_name}</span>
              </div>
              <div className="detail-item">
                <span className="label">صلة القرابة</span>
                <span className="value">{claim.kinship}</span>
              </div>
              <div className="detail-item">
                <span className="label">الجنسية</span>
                <span className="value">{claim.nationality}</span>
              </div>
              <div className="detail-item">
                <span className="label">إثبات الشخصية</span>
                <span className="value">{claim.personal_id}</span>
              </div>
              <div className="detail-item">
                <span className="label">رقم الهاتف</span>
                <span className="value">{claim.phone_number}</span>
              </div>
              {claim.claimant_check_number && (
                <div className="detail-item">
                  <span className="label">رقم الشيك / الإيصال</span>
                  <span className="value">{claim.claimant_check_number}</span>
                </div>
              )}
            </div>
          </section>

          {/* Section: Driver Info */}
          {(claim.driver_name || claim.driver_id_number || claim.driver_license_number) && (
            <section className="dashboard-card">
              <div className="card-header">
                <i className="fa-solid fa-id-card text-warning"></i>
                <h3>بيانات السائق</h3>
              </div>
              <div className="details-grid three-cols">
                {claim.driver_name && <div className="detail-item"><span className="label">اسم السائق</span><span className="value">{claim.driver_name}</span></div>}
                {claim.driver_nationality && <div className="detail-item"><span className="label">الجنسية</span><span className="value">{claim.driver_nationality}</span></div>}
                {claim.driver_id_number && <div className="detail-item"><span className="label">رقم الهوية</span><span className="value">{claim.driver_id_number}</span></div>}
                {claim.driver_license_number && <div className="detail-item"><span className="label">رقم الرخصة</span><span className="value">{claim.driver_license_number}</span></div>}
                {claim.driver_license_issue_date && <div className="detail-item"><span className="label">تاريخ الإصدار</span><span className="value">{claim.driver_license_issue_date}</span></div>}
                {claim.driver_license_expiry_date && <div className="detail-item"><span className="label">تاريخ الانتهاء</span><span className="value">{claim.driver_license_expiry_date}</span></div>}
              </div>
              <div className="d-flex gap-3 mt-2">
                {claim.driver_photo && (
                  <a href={`${BACKEND_URL}/storage/${claim.driver_photo}`} target="_blank" rel="noreferrer" className="attachment-btn">
                    <i className="fa-solid fa-user"></i> صورة السائق
                  </a>
                )}
                {claim.driver_license_photo && (
                  <a href={`${BACKEND_URL}/storage/${claim.driver_license_photo}`} target="_blank" rel="noreferrer" className="attachment-btn">
                    <i className="fa-solid fa-id-card"></i> صورة الرخصة
                  </a>
                )}
              </div>
            </section>
          )}

          {/* Section: Damaged Body */}
          {claim.damaged_body_type && (
            <section className="dashboard-card">
              <div className="card-header">
                <i className="fa-solid fa-car-burst text-danger"></i>
                <h3>بيانات الجسم المتضرر - <span style={{color:'var(--accent-cyan)'}}>{claim.damaged_body_type}</span></h3>
              </div>
              {claim.damaged_body_type === 'سيارة' && (
                <div className="details-grid three-cols">
                  {claim.damaged_vehicle_model && <div className="detail-item"><span className="label">موديل السيارة</span><span className="value">{claim.damaged_vehicle_model}</span></div>}
                  {claim.damaged_vehicle_plate && <div className="detail-item"><span className="label">رقم اللوحة</span><span className="value">{claim.damaged_vehicle_plate}</span></div>}
                  {claim.damaged_vehicle_repair_shop && <div className="detail-item"><span className="label">ورشة التصليح</span><span className="value">{claim.damaged_vehicle_repair_shop}</span></div>}
                  {claim.damaged_vehicle_amount && <div className="detail-item"><span className="label">مبلغ الأضرار</span><span className="value fw-bold" style={{color:'#ef4444'}}>{Number(claim.damaged_vehicle_amount).toLocaleString('ar-LY')} د.ل</span></div>}
                </div>
              )}
              {claim.damaged_body_type === 'شخص' && (
                <div className="details-grid">
                  {claim.damaged_person_name && <div className="detail-item"><span className="label">اسم المتضرر</span><span className="value">{claim.damaged_person_name}</span></div>}
                  {claim.damaged_person_amount && <div className="detail-item"><span className="label">مبلغ الأضرار</span><span className="value fw-bold" style={{color:'#ef4444'}}>{Number(claim.damaged_person_amount).toLocaleString('ar-LY')} د.ل</span></div>}
                </div>
              )}
              {claim.damaged_body_type === 'مبنى' && (
                <div className="details-grid">
                  {claim.damaged_building_description && <div className="detail-item" style={{gridColumn:'span 2'}}><span className="label">وصف المبنى</span><span className="value">{claim.damaged_building_description}</span></div>}
                  {claim.damaged_building_amount && <div className="detail-item"><span className="label">مبلغ الأضرار</span><span className="value fw-bold" style={{color:'#ef4444'}}>{Number(claim.damaged_building_amount).toLocaleString('ar-LY')} د.ل</span></div>}
                </div>
              )}
              {/* Damage photos */}
              {(() => {
                const photos = claim.damaged_body_type === 'سيارة' ? claim.damaged_vehicle_photos
                  : claim.damaged_body_type === 'شخص' ? claim.damaged_person_photos
                  : claim.damaged_building_photos;
                const photoArr = Array.isArray(photos) ? photos : [];
                return photoArr.length > 0 ? (
                  <div className="photos-strip mt-2">
                    {photoArr.map((p: string, i: number) => (
                      <a key={i} href={`${BACKEND_URL}/storage/${p}`} target="_blank" rel="noreferrer">
                        <img src={`${BACKEND_URL}/storage/${p}`} alt={`ضرر ${i+1}`} className="damage-thumb" />
                      </a>
                    ))}
                  </div>
                ) : null;
              })()}
            </section>
          )}

          {/* Section: Victim Insurance */}
          {claim.victim_insurance_company && (
            <section className="dashboard-card">
              <div className="card-header">
                <i className="fa-solid fa-shield-halved" style={{color:'#7c3aed'}}></i>
                <h3>بيانات وثيقة تأمين المتضرر</h3>
              </div>
              <div className="details-grid three-cols">
                {claim.victim_insurance_company && <div className="detail-item"><span className="label">شركة التأمين</span><span className="value">{claim.victim_insurance_company}</span></div>}
                {claim.victim_insurance_number && <div className="detail-item"><span className="label">رقم الوثيقة</span><span className="value">{claim.victim_insurance_number}</span></div>}
                {claim.victim_insurance_type && <div className="detail-item"><span className="label">نوع الوثيقة</span><span className="value">{claim.victim_insurance_type}</span></div>}
                {claim.victim_insurance_issue_date && <div className="detail-item"><span className="label">تاريخ الإصدار</span><span className="value">{claim.victim_insurance_issue_date}</span></div>}
                {claim.victim_insurance_expiry_date && <div className="detail-item"><span className="label">تاريخ الانتهاء</span><span className="value">{claim.victim_insurance_expiry_date}</span></div>}
              </div>
              {claim.victim_insurance_photo && (
                <a href={`${BACKEND_URL}/storage/${claim.victim_insurance_photo}`} target="_blank" rel="noreferrer" className="attachment-btn mt-2">
                  <i className="fa-solid fa-file-image"></i> صورة الوثيقة
                </a>
              )}
            </section>
          )}

          {/* Section: Assessor */}
          {claim.assessor_name && (
            <section className="dashboard-card">
              <div className="card-header">
                <i className="fa-solid fa-calculator" style={{color:'#059669'}}></i>
                <h3>تقرير مقدر الأضرار</h3>
              </div>
              <div className="details-grid three-cols">
                {claim.assessor_name && <div className="detail-item"><span className="label">اسم المقدر</span><span className="value">{claim.assessor_name}</span></div>}
                {claim.assessor_phone && <div className="detail-item"><span className="label">رقم الهاتف</span><span className="value">{claim.assessor_phone}</span></div>}
                {claim.assessor_date && <div className="detail-item"><span className="label">تاريخ التقييم</span><span className="value">{claim.assessor_date}</span></div>}
                {claim.assessor_amount_dinar && <div className="detail-item"><span className="label">القيمة (دينار)</span><span className="value fw-bold" style={{color:'#059669'}}>{Number(claim.assessor_amount_dinar).toLocaleString('ar-LY')} د.ل</span></div>}
                {claim.assessor_amount_dollar && <div className="detail-item"><span className="label">القيمة (دولار)</span><span className="value fw-bold" style={{color:'#059669'}}>${Number(claim.assessor_amount_dollar).toLocaleString()}</span></div>}
              </div>
              {claim.assessor_report_photo && (
                <a href={`${BACKEND_URL}/storage/${claim.assessor_report_photo}`} target="_blank" rel="noreferrer" className="attachment-btn mt-2">
                  <i className="fa-solid fa-file-pdf"></i> تقرير المقدر
                </a>
              )}
            </section>
          )}

          {/* Section 3: Document Info */}
          <section className="dashboard-card highlight-card">
            <div className="card-header">
              <i className="fa-solid fa-file-contract text-info"></i>
              <h3>بيانات وثيقة التأمين المربوطة</h3>
            </div>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">رقم الوثيقة</span>
                <span className="value text-primary fw-bold">{claim.document?.insurance_number || 'غير متوفر'}</span>
              </div>
              <div className="detail-item">
                <span className="label">تغطية الوثيقة</span>
                <span className="value">{claim.document_coverage || '---'}</span>
              </div>
              <div className="detail-item">
                <span className="label">اسم المؤمن له</span>
                <span className="value">{claim.document?.insured_name || '---'}</span>
              </div>
              <div className="detail-item">
                <span className="label">تاريخ الإصدار</span>
                <span className="value">{claim.document?.issue_date ? new Date(claim.document.issue_date).toLocaleDateString('ar-EG') : '---'}</span>
              </div>
            </div>
          </section>

          {/* Section 4: Transfer History (Timeline) */}
          <section className="dashboard-card timeline-card">
            <div className="card-header">
              <i className="fa-solid fa-clock-rotate-left text-purple"></i>
              <h3>سجل تتبع التحويلات (Timeline)</h3>
            </div>
            <div className="timeline-wrapper">
              {claim.transfers && claim.transfers.length > 0 ? (
                claim.transfers.map((t: any, idx: number) => (
                  <div key={t.id} className="timeline-item">
                    <div className="timeline-marker">
                      <div className="marker-dot"></div>
                      {idx !== claim.transfers.length - 1 && <div className="marker-line"></div>}
                    </div>
                    <div className="timeline-content">
                      <div className="item-head">
                        <h4>{t.transfer_type === 'اخر' ? t.other_transfer_type : t.transfer_type}</h4>
                        <span className="time">{new Date(t.created_at).toLocaleString('ar-EG')}</span>
                      </div>
                        <div className="item-details-box">
                          <div className="details-inline">
                            {t.details && Object.entries(t.details).map(([k, v]: [string, any]) => {
                              const isFile = typeof v === 'string' && (v.includes('claim_transfers/') || v.match(/\.(jpg|jpeg|png|pdf)$/i));
                              const label = k === 'case_number' ? 'رقم القضية' : 
                                            k === 'transfer_date' ? 'تاريخ الإحالة' :
                                            k === 'prosecution_name' ? 'النيابة' :
                                            k === 'committee_manager' ? 'مدير اللجنة' :
                                            k === 'deputy_manager' ? 'نائب المدير' :
                                            k === 'total_value' ? 'إجمالي القيمة' :
                                            k === 'manager_report' ? 'تقرير المدير' :
                                            k === 'report_number' ? 'رقم البلاغ' :
                                            k === 'report_date' ? 'تاريخ البلاغ' :
                                            k === 'police_station' ? 'مركز الشرطة' :
                                            k === 'book_number' ? 'رقم الكتاب' :
                                            k === 'financial_value' ? 'القيمة المالية' :
                                            k === 'recipient_name' ? 'اسم المستلم' :
                                            k === 'session_date' ? 'تاريخ الجلسة' :
                                            k === 'court_name' ? 'المحكمة' :
                                            k === 'appeal_case_number' ? 'رقم الاستئناف' :
                                            k === 'appeal_date' ? 'تاريخ الاستئناف' :
                                            k === 'appeal_court' ? 'محكمة الاستئناف' :
                                            k === 'notes' ? 'ملاحظات' :
                                            k === 'report_image' ? 'صورة البلاغ' :
                                            k === 'financial_value_image' ? 'إثبات القيمة' :
                                            k === 'transfer_image' ? 'صورة الإحالة' :
                                            k === 'court_file_image' ? 'ملف القضية' :
                                            k === 'previous_judgment_image' ? 'الحكم السابق' :
                                            k === 'image' ? 'الصورة المرفقة' :
                                            k.replace(/_/g, ' ');
                                            
                              return (
                                <div key={k} className="tiny-detail">
                                  <span className="k">{label}:</span>
                                  {isFile ? (
                                    <a href={`${BACKEND_URL}/storage/${v}`} target="_blank" rel="noreferrer" className="attachment-link-inline">
                                      <i className="fa-solid fa-paperclip"></i> عرض المرفق
                                    </a>
                                  ) : (
                                    <span className="v">{v || '-'}</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-timeline">لا توجد سجلات تحويل لهذه المطالبة حالياً</div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Sidebar Actions/Reports */}
        <div className="dashboard-side-col">
          
          {/* Reports Card */}
          <section className="dashboard-card side-card">
            <div className="card-header">
              <i className="fa-solid fa-file-pdf text-danger"></i>
              <h3>التقارير المرفقة</h3>
            </div>
            <div className="reports-list">
              {claim.reports && claim.reports.length > 0 ? (
                claim.reports.map((r: any) => (
                  <div key={r.id} className="report-item">
                    <div className="report-icon">
                      <i className="fa-solid fa-file-lines"></i>
                    </div>
                    <div className="report-info">
                      <span className="report-name">{r.report_type === 'اخر' ? r.other_report_type : r.report_type}</span>
                      <span className="report-date">{r.report_date || 'تاريخ غير محدد'}</span>
                    </div>
                    {r.report_image && (
                      <a href={`${BACKEND_URL}/storage/${r.report_image}`} target="_blank" rel="noreferrer" className="view-link">
                        <i className="fa-solid fa-eye"></i>
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-side">لا توجد تقارير مرفوعة</div>
              )}
            </div>
          </section>

          {/* Quick Actions Card */}
          <section className="dashboard-card side-card actions-card">
            <div className="card-header">
              <i className="fa-solid fa-bolt text-warning"></i>
              <h3>إجراءات سريعة</h3>
            </div>
            <div className="actions-list">
              <button className="action-link" onClick={handlePrint}><i className="fa-solid fa-print"></i> طباعة ملخص المطالبة</button>
              <button className="action-link danger" onClick={() => setShowDeleteConfirm(true)}><i className="fa-solid fa-trash"></i> حذف المطالبة نهائياً</button>
            </div>
          </section>

        </div>
      </div>

      <style>{`
        .view-claim-container {
          padding: 24px;
          background: transparent;
          min-height: 100vh;
          color: var(--text);
        }
        
        /* Header Styling */
        .claim-page-header {
          margin-bottom: 16px;
          background: var(--panel);
          padding: 10px 18px;
          border-radius: 14px;
          border: 1px solid var(--border);
          box-shadow: 0 4px 12px -2px rgba(0,0,0,0.05);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .breadcrumb-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-muted);
          font-size: 0.82rem;
          margin-bottom: 8px;
        }
        .breadcrumb-nav a { color: var(--sidebar); text-decoration: none; font-weight: 500; }
        .breadcrumb-nav i { font-size: 0.7rem; opacity: 0.5; }
        
        .header-actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0 0 0;
        }
        .title-section { display: flex; align-items: center; gap: 14px; }
        .title-section h1 { margin: 0; font-size: 1.3rem; font-weight: 800; color: var(--text); }
        .id-highlight { color: var(--sidebar); }
        [data-theme='dark'] .id-highlight { color: var(--accent-cyan); }
        
        .status-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 50px;
          font-size: 0.82rem;
          font-weight: 800;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          border: 1px solid rgba(0,0,0,0.05);
        }
        .status-pill .dot { width: 8px; height: 8px; border-radius: 50%; }
        
        .button-group { display: flex; gap: 12px; }
        .btn-transfer {
          background: #10b981;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-transfer:hover { background: #059669; transform: translateY(-1px); }
        .btn-back {
          background: var(--panel);
          color: var(--text);
          border: 1.5px solid var(--border);
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .btn-back:hover { background: var(--bg-hover); border-color: var(--sidebar); }

        /* Dashboard Grid Layout */
        .claim-dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 16px;
        }
        
        .dashboard-card {
          background: var(--panel);
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 12px;
          border: 1px solid var(--border);
          box-shadow: 0 4px 12px -2px rgba(0,0,0,0.04);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .dashboard-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px -4px rgba(0,0,0,0.08);
        }
        .dashboard-card .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border) !important;
        }
        .dashboard-card .card-header i { font-size: 1rem; }
        .dashboard-card .card-header h3 { margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text); }
        
        .highlight-card { border-right: 4px solid var(--sidebar); }
        
        .details-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px 14px;
        }
        .details-grid.three-cols { grid-template-columns: repeat(3, 1fr); }
        .details-grid.two-cols { grid-template-columns: repeat(2, 1fr); }
        
        .detail-item { 
          display: flex; 
          flex-direction: column; 
          gap: 4px; 
          padding-bottom: 10px;
          border-bottom: 1px solid var(--border) !important;
          border-top: none !important;
          border-left: none !important;
          border-right: none !important;
        }
        
        [data-theme='dark'] .detail-item {
          border-bottom: 1px solid rgba(6, 182, 212, 0.25) !important;
        }

        .detail-item .label { font-size: 0.72rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; }
        .detail-item .value { font-size: 0.88rem; font-weight: 600; color: var(--text); }
        .badge-value { background: rgba(37, 99, 235, 0.1); color: #3b82f6; padding: 1px 8px; border-radius: 5px; width: fit-content; font-size: 0.82rem; }

        /* Timeline Styling */
        .timeline-wrapper { padding-right: 8px; margin-top: 8px; }
        .timeline-item { display: flex; gap: 14px; margin-bottom: 16px; }
        .timeline-marker { position: relative; display: flex; flex-direction: column; align-items: center; }
        .marker-dot { 
          width: 10px; 
          height: 10px; 
          border-radius: 50%; 
          background: var(--sidebar); 
          border: 2px solid var(--panel); 
          box-shadow: 0 0 0 3px rgba(1, 76, 177, 0.1); 
          z-index: 2; 
        }
        [data-theme='dark'] .marker-dot {
          background: var(--accent-cyan) !important;
          box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.1) !important;
        }
        .marker-line { position: absolute; top: 14px; bottom: -25px; width: 2px; background: var(--border); z-index: 1; }
        
        .timeline-content { flex: 1; }
        .item-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .item-head h4 { margin: 0; font-size: 0.95rem; font-weight: 700; color: var(--text); }
        .item-head .time { font-size: 0.8rem; color: var(--text-muted); font-weight: 500; }
        
        .item-details-box { background: rgba(0,0,0,0.015); padding: 8px 12px; border-radius: 10px; border: 1px solid var(--border); }
        [data-theme='dark'] .item-details-box { background: rgba(255,255,255,0.015); }
        
        .details-inline { display: flex; flex-wrap: wrap; gap: 15px; margin-bottom: 8px; }
        .tiny-detail { font-size: 0.85rem; }
        .tiny-detail .k { color: var(--text-muted); margin-left: 5px; }
        .tiny-detail .v { color: var(--text); font-weight: 600; }
        .attachment-link-inline { 
          font-size: 0.8rem; 
          color: var(--sidebar); 
          font-weight: 700; 
          display: inline-flex; 
          align-items: center; 
          gap: 6px; 
          text-decoration: none;
          background: rgba(1, 76, 177, 0.05);
          padding: 2px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .attachment-link-inline:hover {
          background: rgba(1, 76, 177, 0.1);
          color: #000;
        }
        [data-theme='dark'] .attachment-link-inline {
          color: var(--accent-cyan);
          background: rgba(6, 182, 212, 0.1);
        }
        [data-theme='dark'] .attachment-link-inline:hover {
          background: rgba(6, 182, 212, 0.2);
          color: #fff;
        }

        /* Side Column Styling */
        .report-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: rgba(0,0,0,0.02);
          border-radius: 12px;
          margin-bottom: 12px;
          border: 1px solid var(--border);
          transition: all 0.2s;
        }
        [data-theme='dark'] .report-item { background: rgba(255,255,255,0.02); }
        .report-item:hover { border-color: var(--sidebar); transform: translateX(-4px); }
        .report-icon { width: 40px; height: 40px; background: var(--panel); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #ef4444; border: 1px solid var(--border); }
        .report-info { flex: 1; display: flex; flex-direction: column; }
        .report-name { font-size: 0.9rem; font-weight: 700; color: var(--text); }
        .report-date { font-size: 0.75rem; color: var(--text-muted); }
        .view-link { color: var(--text-muted); font-size: 1rem; transition: color 0.2s; }
        .view-link:hover { color: var(--sidebar); }
        
        .actions-list { display: flex; flex-direction: column; gap: 8px; }
        .action-link {
          background: var(--panel);
          border: 1.5px solid var(--border);
          padding: 12px;
          border-radius: 10px;
          text-align: right;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: all 0.2s;
        }
        .action-link i { color: var(--text-muted); }
        .action-link:hover { background: var(--bg-hover); border-color: var(--sidebar); color: var(--sidebar); }
        [data-theme='dark'] .action-link:hover { border-color: var(--accent-cyan); color: var(--accent-cyan); }
        .action-link.danger:hover { color: #ef4444; border-color: #ef4444; background: rgba(239, 68, 68, 0.05); }

        /* Transfer Overlay Form Styling */
        .transfer-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .transfer-modal {
          background: var(--panel);
          width: 100%;
          max-width: 650px;
          border-radius: 20px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3);
          overflow: hidden;
          border: 1px solid var(--border);
        }
        
        .modal-header { padding: 20px 24px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
        .modal-header h3 { margin: 0; font-size: 1.2rem; font-weight: 800; color: var(--text); display: flex; align-items: center; gap: 12px; }
        .close-btn { background: none; border: none; font-size: 1.5rem; color: var(--text-muted); cursor: pointer; }
        
        .form-body { 
          padding: 24px; 
          max-height: 70vh; 
          overflow-y: auto;
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none;  /* IE and Edge */
        }
        .form-body::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }
        .field-group { margin-bottom: 20px; }
        .field-group label { display: block; font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-bottom: 8px; }
        .field-group input, .field-group select, .field-group textarea {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px solid var(--border);
          background: var(--panel);
          color: var(--text);
          font-size: 0.95rem;
          outline: none;
        }
        .field-group input:focus { border-color: var(--sidebar); }
        [data-theme='dark'] .field-group input:focus { border-color: var(--accent-cyan) !important; }
        .dynamic-fields-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .field-group.full { grid-column: span 2; }
        
        .modal-footer { padding: 20px 24px; background: rgba(0,0,0,0.02); border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 12px; }
        .btn-cancel { background: var(--panel); border: 1.5px solid var(--border); color: var(--text); padding: 10px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; }
        .btn-confirm { background: #10b981; color: #fff; border: none; padding: 10px 30px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        [data-theme='dark'] .btn-confirm { background: var(--accent-cyan) !important; box-shadow: 0 4px 12px var(--accent-shadow) !important; }

        /* Mobile Responsiveness */
        @media (max-width: 1024px) {
          .claim-dashboard-grid { grid-template-columns: 1fr; }
          .header-actions-row { flex-direction: column; align-items: flex-start; gap: 15px; }
          .button-group { width: 100%; }
          .btn-transfer, .btn-back { flex: 1; justify-content: center; }
        }
        @media (max-width: 768px) {
          .details-grid, .details-grid.three-cols { grid-template-columns: 1fr; }
          .dynamic-fields-grid { grid-template-columns: 1fr; }
          .field-group.full { grid-column: span 1; }
        }

        /* Attachment Button */
        .attachment-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--sidebar) 10%, var(--panel));
          border: 1.5px solid color-mix(in srgb, var(--sidebar) 30%, var(--border));
          color: var(--sidebar);
          font-size: 0.85rem;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s;
          cursor: pointer;
        }
        [data-theme='dark'] .attachment-btn {
          background: color-mix(in srgb, var(--accent-cyan) 10%, var(--panel));
          border-color: color-mix(in srgb, var(--accent-cyan) 30%, var(--border));
          color: var(--accent-cyan);
        }
        .attachment-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        /* Damage Photos Strip */
        .photos-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          padding: 12px;
          background: rgba(0,0,0,0.02);
          border-radius: 12px;
          border: 1px dashed var(--border);
        }
        .damage-thumb {
          width: 80px;
          height: 80px;
          object-fit: cover;
          border-radius: 10px;
          border: 2px solid var(--border);
          transition: all 0.2s;
          cursor: pointer;
        }
        .damage-thumb:hover {
          transform: scale(1.08);
          border-color: var(--sidebar);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
      `}</style>
    </div>
  );
}
