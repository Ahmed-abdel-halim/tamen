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

  const isDamagedBodyType = (type: string) => {
    if (!claim || !claim.damaged_body_type) return false;
    return claim.damaged_body_type.split(/[،,]\s*/).includes(type);
  };

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
    setTransferDetails((prev: any) => {
      const updated = { ...prev, [key]: value };
      if (key === 'compensation_value' || key === 'additional_expenses') {
        const comp = Number(key === 'compensation_value' ? value : updated.compensation_value) || 0;
        const add = Number(key === 'additional_expenses' ? value : updated.additional_expenses) || 0;
        updated.financial_value = comp + add;
      }
      return updated;
    });
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

  const handleCancelPayment = async () => {
    const reason = window.prompt('يرجى كتابة سبب إلغاء التسديد وإرجاع الملف غير مسدد:', 'إلغاء التسديد والصرف المالي');
    if (reason === null) return;

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch(`${API_BASE_URL}/claims/${id}/cancel-payment?user_id=${user.id || ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        showToast('تم إلغاء التسديد وإعادة الملف بنجاح', 'success');
        fetchClaim();
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.message || 'حدث خطأ أثناء إلغاء التسديد', 'error');
      }
    } catch (error) {
      showToast('خطأ في الاتصال بالخادم', 'error');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=1100,height=950');
    if (!printWindow) return;

    // --- Document type label ---
    const docTypeLabelMap: Record<string, string> = {
      'InsuranceDocument': 'سيارات محلي',
      'InternationalInsuranceDocument': 'سيارات دولي',
      'TravelInsuranceDocument': 'مسافرين',
      'ResidentInsuranceDocument': 'وافدين مقيمين',
      'MarineStructureInsuranceDocument': 'هياكل بحرية',
      'ProfessionalLiabilityInsuranceDocument': 'مسؤولية مهنية',
      'PersonalAccidentInsuranceDocument': 'حوادث شخصية',
      'SchoolStudentInsuranceDocument': 'طلاب مدارس',
      'CashInTransitInsuranceDocument': 'نقل نقدية',
      'CargoInsuranceDocument': 'شحن بضائع'
    };
    const docTypeLabel = docTypeLabelMap[claim.document_type] || claim.document_manual_data?.insurance_type || claim.document_type || '---';

    // --- Policy fields ---
    const policyNum     = claim.document?.insurance_number || claim.document_manual_data?.insurance_number || (claim.additional_documents?.[0]?.insurance_number) || '---';
    const insuranceType = docTypeLabel;
    const coverage      = claim.document_coverage || claim.document_manual_data?.document_coverage || (claim.additional_documents?.[0]?.document_coverage) || '---';
    const insuredName   = claim.document?.insured_name || claim.document_manual_data?.insured_name || (claim.additional_documents?.[0]?.insured_name) || '---';
    const issueDate     = claim.document?.issue_date || claim.document_manual_data?.issue_date || '---';
    const endDate       = claim.document?.end_date || claim.document_manual_data?.end_date || '---';
    const plateNum      = claim.document?.plate?.plate_number || claim.document?.plate_number || claim.document_manual_data?.plate_number || '---';

    // --- Financial ---
    const tndAmount = claim.assessor_other_amount || '---';
    const lydAmount = claim.assessor_amount_dinar ? (Number(claim.assessor_amount_dinar).toLocaleString('en-US', { minimumFractionDigits: 3 }) + ' د.ل') : '---';

    // --- Settlements ---
    const settlements = (claim.transfers || []).filter((t: any) => t.transfer_type === 'تسويه وديه');

    const settlementsHtml = settlements.length > 0
      ? `<table class="settlements-table">
          <thead>
            <tr>
              <th>#</th>
              <th>تاريخ التسوية</th>
              <th>مقدم التسوية</th>
              <th>رقم التسوية</th>
              <th>مبلغ الأضرار (د.ت)</th>
              <th>قيمة التقييم (د.ل)</th>
              <th>مدير اللجنة</th>
            </tr>
          </thead>
          <tbody>
            ${settlements.map((t: any, i: number) => `<tr>
              <td>${i + 1}</td>
              <td>${t.details?.settlement_date || new Date(t.created_at).toLocaleDateString('en-GB')}</td>
              <td>${t.details?.settlement_presenter || t.details?.committee_manager || '---'}</td>
              <td>${t.details?.settlement_number || '---'}</td>
              <td class="money">${t.details?.tnd_amount || t.details?.total_value || '---'}</td>
              <td class="money lyd">${t.details?.lyd_amount || '---'}</td>
              <td>${t.details?.committee_manager || '---'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      : '<p class="no-settlements">لا توجد تسويات مسجلة</p>';

    // --- QR ---
    const qrData = `مطالبة رقم: ${claim.claim_number}\nمقدم المطالبة: ${claim.claimant_name}\nرقم الوثيقة: ${policyNum}\nالتاريخ: ${new Date().toLocaleString('en-GB')}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;

    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>نموذج المطالبة التأمينية - ${claim.claim_number}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@500;600;700;800;900&display=swap');
          @media print {
            @page { margin: 5mm; size: A4; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; }
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Cairo', sans-serif;
            margin: 0 auto;
            max-width: 195mm;
            padding: 8px 10px;
            color: #000;
            background: #fff;
            font-size: 10.5px;
          }

          /* ===== HEADER ===== */
          .print-header {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: start;
            margin-bottom: 14px;
            gap: 10px;
          }
          .hdr-logo { display: flex; align-items: flex-start; }
          .hdr-logo img { height: 68px; }
          .hdr-center { text-align: center; }
          .hdr-title {
            font-size: 17px; font-weight: 900; color: #1e293b;
            border: 2px solid #1e293b; padding: 5px 22px;
            border-radius: 8px; display: inline-block; margin-bottom: 4px;
          }
          .hdr-subtitle { font-size: 11px; font-weight: 700; color: #475569; }
          .hdr-qr { display: flex; justify-content: flex-end; align-items: flex-start; }
          .hdr-qr img { width: 82px; height: 82px; border: 1.5px solid #000; padding: 2px; }

          /* Company strip */
          .company-strip {
            display: grid; grid-template-columns: 1fr 1fr;
            border: 1.5px solid #000; margin-bottom: 10px;
          }
          .cs-box { padding: 6px 12px; border-left: 1px solid #000; }
          .cs-box:last-child { border-left: none; }
          .cs-row { display: flex; justify-content: space-between; font-size: 10px; font-weight: 800; margin-bottom: 2px; }
          .cs-row .val { font-weight: 900; color: #0f172a; }
          .cs-legal { font-size: 9px; font-weight: 700; text-align: center; color: #475569; display: flex; align-items: center; justify-content: center; line-height: 1.5; }

          /* ===== SECTIONS ===== */
          .section { margin-bottom: 9px; }
          .section-title {
            background: #1e293b; color: #f8fafc;
            font-weight: 900; font-size: 11px;
            text-align: center; padding: 4px 8px;
            margin-bottom: 0; letter-spacing: 0.3px;
          }
          .section-body { border: 1.5px solid #1e293b; border-top: none; padding: 5px 8px; }

          /* Grid layouts */
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 10px; }
          .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 4px 10px; }

          .field-row { display: flex; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 3px; padding-top: 3px; }
          .field-row:last-child { border-bottom: none; }
          .fl { font-weight: 800; font-size: 10px; width: 95px; flex-shrink: 0; color: #334155; }
          .fv {
            flex-grow: 1; font-weight: 700; font-size: 10.5px;
            border: 1px solid #94a3b8; border-radius: 3px;
            padding: 1px 6px; min-height: 17px;
            background: #f8fafc; text-align: center;
            display: flex; align-items: center; justify-content: center;
          }
          .fv.highlight { background: #ecfdf5; color: #065f46; font-weight: 900; }
          .fv.accent { background: #eff6ff; color: #1e40af; }
          .span-2 { grid-column: span 2; }
          .span-3 { grid-column: span 3; }
          .span-4 { grid-column: span 4; }

          /* ===== SETTLEMENTS TABLE ===== */
          .settlements-table {
            width: 100%; border-collapse: collapse; font-size: 9.5px;
            margin-top: 2px;
          }
          .settlements-table th {
            background: #0f172a; color: #fff; font-weight: 800;
            padding: 4px 4px; text-align: center; border: 1px solid #334155;
          }
          .settlements-table td {
            padding: 3px 4px; text-align: center;
            border: 1px solid #cbd5e1; font-weight: 700;
          }
          .settlements-table tr:nth-child(even) td { background: #f8fafc; }
          .settlements-table td.money { font-weight: 900; color: #0369a1; direction: ltr; }
          .settlements-table td.lyd { color: #065f46; }
          .no-settlements { text-align: center; color: #94a3b8; font-size: 10px; padding: 6px; margin: 0; }

          /* ===== SIGNATURES ===== */
          .sig-area {
            display: flex; justify-content: space-between;
            padding: 0 30px; margin-top: 20px;
          }
          .sig-box { width: 160px; text-align: center; }
          .sig-outline { border: 1px solid #000; height: 55px; margin-bottom: 6px; }
          .sig-label { font-size: 11px; font-weight: 900; }

          /* ===== FOOTER ===== */
          .footer-note {
            text-align: right; font-size: 9px; font-weight: 700;
            margin-top: 14px; color: #475569; line-height: 1.5;
            border-top: 1px solid #e2e8f0; padding-top: 5px;
          }
        </style>
      </head>
      <body onload="setTimeout(() => { window.print(); }, 500);">

        <!-- Header -->
        <div class="print-header">
          <div class="hdr-logo">
            <img src="/img/logo.png" onerror="this.style.display='none'" />
          </div>
          <div class="hdr-center">
            <div class="hdr-title">نموذج المطالبة التأمينية</div>
            <div class="hdr-subtitle">شركة المدار الليبي للتأمين المساهمة</div>
            <div class="hdr-subtitle" style="color:#0369a1; font-size:10px;">إدارة المطالبات والحوادث</div>
          </div>
          <div class="hdr-qr">
            <img src="${qrApiUrl}" />
          </div>
        </div>

        <!-- Company Info Strip -->
        <div class="company-strip">
          <div class="cs-box">
            <div class="cs-row"><span>الشركة المصدرة للوثيقة</span> <span class="val">المدار الليبي للتأمين</span></div>
            <div class="cs-row"><span>العنـــوان</span> <span class="val">طرابلس — ليبيا</span></div>
            <div class="cs-row"><span>تاريخ التأسيس</span> <span class="val">29/01/2024</span></div>
            <div class="cs-row"><span>رأس المال المكتتب</span> <span class="val">10,000,000.00 د.ل</span></div>
          </div>
          <div class="cs-box">
            <div class="cs-legal">
              هذا النموذج يمثل وثيقة رسمية معتمدة<br/>
              لبيانات المطالبة التأمينية المسجلة<br/>
              في نظام المدار الليبي للتأمين<br/>
              وفقاً للإجراءات والأنظمة المعتمدة.
            </div>
          </div>
        </div>

        <!-- Section 1: بيانات مقدم المطالبة -->
        <div class="section">
          <div class="section-title">📋 بيانات مقدم المطالبة / المشترك</div>
          <div class="section-body">
            <div class="grid-3">
              <div class="field-row"><div class="fl">اسم مقدم المطالبة</div><div class="fv accent">${claim.claimant_name || '---'}</div></div>
              <div class="field-row"><div class="fl">الجنسيـــة</div><div class="fv">${claim.nationality || '---'}</div></div>
              <div class="field-row"><div class="fl">رقم الإثبات</div><div class="fv">${claim.personal_id || '---'}</div></div>
              <div class="field-row"><div class="fl">صلة القرابة</div><div class="fv">${claim.kinship || '---'}</div></div>
              <div class="field-row"><div class="fl">رقم الهاتف</div><div class="fv">${claim.phone_number || '---'}</div></div>
              ${claim.claimant_check_number ? `<div class="field-row"><div class="fl">رقم الشيك/الإيصال</div><div class="fv">${claim.claimant_check_number}</div></div>` : '<div></div>'}
            </div>
          </div>
        </div>

        <!-- Section 2: بيانات المطالبة / الحادث -->
        <div class="section">
          <div class="section-title">🚨 بيانات المطالبة / الحادث</div>
          <div class="section-body">
            <div class="grid-4">
              <div class="field-row"><div class="fl">رقم المطالبة</div><div class="fv highlight">${claim.claim_number || '---'}</div></div>
              <div class="field-row"><div class="fl">تاريخ المطالبة</div><div class="fv">${claim.claim_date || '---'}</div></div>
              <div class="field-row"><div class="fl">تاريخ الحادث</div><div class="fv">${claim.accident_date || '---'}</div></div>
              <div class="field-row"><div class="fl">وقت الحادث</div><div class="fv">${claim.accident_time || '---'}</div></div>
              <div class="field-row"><div class="fl">نوع الأضرار</div><div class="fv">${claim.damage_type ? claim.damage_type.split(/[،,]\s*/).map((t: any) => t === 'اخر' ? (claim.other_damage_type || 'أخرى') : t).join('، ') : '---'}</div></div>
              <div class="field-row"><div class="fl">حالة المطالبة</div><div class="fv">${claim.status || '---'}</div></div>
              <div class="field-row span-2"><div class="fl">مكان الحادث</div><div class="fv">${claim.accident_location || '---'}</div></div>
            </div>
          </div>
        </div>

        <!-- Section 3: بيانات الوثيقة المربوطة -->
        <div class="section">
          <div class="section-title">📄 بيانات الوثيقة المربوطة</div>
          <div class="section-body">
            <div class="grid-4">
              <div class="field-row"><div class="fl">رقم الوثيقة</div><div class="fv accent">${policyNum}</div></div>
              <div class="field-row"><div class="fl">نوع التأمين</div><div class="fv">${insuranceType}</div></div>
              <div class="field-row"><div class="fl">نوع التغطية</div><div class="fv">${coverage}</div></div>
              <div class="field-row"><div class="fl">رقم اللوحة</div><div class="fv">${plateNum}</div></div>
              <div class="field-row span-2"><div class="fl">اسم المؤمن له</div><div class="fv accent">${insuredName}</div></div>
              <div class="field-row"><div class="fl">تاريخ الإصدار</div><div class="fv">${issueDate !== '---' ? new Date(String(issueDate).replace(' ', 'T')).toLocaleDateString('en-GB') : '---'}</div></div>
              <div class="field-row"><div class="fl">تاريخ الانتهاء</div><div class="fv">${endDate !== '---' ? new Date(String(endDate).replace(' ', 'T')).toLocaleDateString('en-GB') : '---'}</div></div>
            </div>
          </div>
        </div>

        ${claim.additional_documents && claim.additional_documents.length > 0 ? `
        <!-- Section 3b: وثائق إضافية -->
        <div class="section">
          <div class="section-title">📎 وثائق التأمين الإضافية المرفقة</div>
          <div class="section-body">
            ${claim.additional_documents.map((doc: any, index: number) => `
              <div style="margin-bottom:${index < claim.additional_documents.length - 1 ? '6px' : '0'}; border-bottom:${index < claim.additional_documents.length - 1 ? '1px dashed #cbd5e1' : 'none'}; padding-bottom:${index < claim.additional_documents.length - 1 ? '6px' : '0'}">
                <div style="font-weight:800; font-size:10px; color:#0369a1; margin-bottom:3px;">وثيقة إضافية #${index + 1}</div>
                <div class="grid-4">
                  <div class="field-row"><div class="fl">رقم الوثيقة</div><div class="fv">${doc.insurance_number || '---'}</div></div>
                  <div class="field-row"><div class="fl">اسم المؤمن له</div><div class="fv">${doc.insured_name || '---'}</div></div>
                  <div class="field-row"><div class="fl">رقم اللوحة</div><div class="fv">${doc.plate_number || '---'}</div></div>
                  <div class="field-row"><div class="fl">نوع السيارة</div><div class="fv">${doc.vehicle_type || '---'}</div></div>
                  <div class="field-row"><div class="fl">تاريخ الإصدار</div><div class="fv">${doc.issue_date || '---'}</div></div>
                  <div class="field-row"><div class="fl">تاريخ الانتهاء</div><div class="fv">${doc.end_date || '---'}</div></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}

        ${claim.damaged_body_type === 'سيارة' ? `
        <!-- Section 4: بيانات المركبة المتضررة -->
        <div class="section">
          <div class="section-title">🚗 بيانات المركبة المتضررة</div>
          <div class="section-body">
            <div class="grid-4">
              <div class="field-row"><div class="fl">نوع المركبة</div><div class="fv">${claim.damaged_vehicle_type || '---'}</div></div>
              <div class="field-row"><div class="fl">الموديل</div><div class="fv">${claim.damaged_vehicle_model || '---'}</div></div>
              <div class="field-row"><div class="fl">اللون</div><div class="fv">${claim.damaged_vehicle_color || '---'}</div></div>
              <div class="field-row"><div class="fl">رقم اللوحة</div><div class="fv">${claim.damaged_vehicle_plate || '---'}</div></div>
              ${claim.damaged_vehicle_repair_shop ? `<div class="field-row span-2"><div class="fl">ورشة التصليح</div><div class="fv">${claim.damaged_vehicle_repair_shop}</div></div>` : ''}
              ${claim.damaged_vehicle_details ? `<div class="field-row span-2"><div class="fl">بيانات الأضرار</div><div class="fv">${claim.damaged_vehicle_details}</div></div>` : ''}
            </div>
          </div>
        </div>
        ` : ''}

        ${claim.driver_name ? `
        <!-- Section 5: بيانات السائق المسبب -->
        <div class="section">
          <div class="section-title">👤 بيانات السائق المسبب</div>
          <div class="section-body">
            <div class="grid-3">
              <div class="field-row"><div class="fl">اسم السائق</div><div class="fv">${claim.driver_name}</div></div>
              <div class="field-row"><div class="fl">رقم الرخصة</div><div class="fv">${claim.driver_license_number || '---'}</div></div>
              <div class="field-row"><div class="fl">الجنسية</div><div class="fv">${claim.driver_nationality || '---'}</div></div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Section 6: بيانات التقييم المالي -->
        <div class="section">
          <div class="section-title">💰 بيانات التقييم المالي</div>
          <div class="section-body">
            <div class="grid-2">
              <div class="field-row">
                <div class="fl">مبلغ الأضرار (بالتونسي)</div>
                <div class="fv" style="color:#0369a1; font-weight:900;">${tndAmount}</div>
              </div>
              <div class="field-row">
                <div class="fl">قيمة التقييم (بالليبي)</div>
                <div class="fv highlight">${lydAmount}</div>
              </div>
              ${claim.assessor_date ? `<div class="field-row"><div class="fl">تاريخ التقييم</div><div class="fv">${claim.assessor_date}</div></div>` : ''}
              ${claim.assessor_percentage ? `<div class="field-row"><div class="fl">نسبة المقدر</div><div class="fv">${claim.assessor_percentage}</div></div>` : ''}
            </div>
          </div>
        </div>

        <!-- Section 7: بيانات التسويات -->
        <div class="section">
          <div class="section-title">🤝 بيانات التسويات الودية</div>
          <div class="section-body" style="padding:6px;">
            ${settlementsHtml}
          </div>
        </div>

        <!-- Signatures -->
        <div class="sig-area">
          <div class="sig-box">
            <div class="sig-outline"></div>
            <div class="sig-label">ختم وإعتماد الشركة</div>
          </div>
          <div class="sig-box" style="text-align:center;">
            <div style="font-size:9px; font-weight:700; color:#64748b; margin-bottom:8px;">رقم المطالبة: ${claim.claim_number}</div>
            <div style="font-size:9px; font-weight:700; color:#64748b;">التاريخ: ${new Date().toLocaleDateString('en-GB')}</div>
          </div>
          <div class="sig-box">
            <div class="sig-outline"></div>
            <div class="sig-label">توقيع المستلم / مقدم المطالبة</div>
          </div>
        </div>

        <div class="footer-note">
          أي كشط أو تعديل يلغي هذا النموذج &nbsp;|&nbsp;
          طبع بواسطة نظام المدار الليبي للتأمين — ${new Date().toLocaleString('en-GB')}
        </div>

      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { bg: '#fef3c7', color: '#d97706', text: 'قيد الانتظار' };
      case 'تسويه وديه': return { bg: '#dcfce7', color: '#166534', text: 'تسويه وديه' };
      case 'تحويل الى مركز الشرطة': return { bg: '#e0f2fe', color: '#075985', text: 'بمركز الشرطة' };
      case 'تحويل الى النيابة': return { bg: '#f3e8ff', color: '#6b21a8', text: 'بالنيابة العامة' };
      case 'تحويل الى المحكمة': return { bg: '#fee2e2', color: '#991b1b', text: 'بالمحكمة المختصة' };
      case 'استئناف في حكم المحكمة': return { bg: '#ffedd5', color: '#9a3412', text: 'قيد الاستئناف' };
      case 'التعويضات': return { bg: '#fdf2f8', color: '#db2777', text: 'معلق بالتعويضات' };
      case 'مدفوع': return { bg: '#dcfce7', color: '#166534', text: 'تم الدفع والقبول المالي' };
      case 'للتسديد - الشؤون المالية': return { bg: '#ecfdf5', color: '#059669', text: 'جاهزة للتسديد' };
      default: return { bg: '#eff6ff', color: '#2563eb', text: status };
    }
  };

  const renderTransferFields = () => {
    switch (transferType) {
      case 'تسويه وديه':
        return (
          <>
            <div className="field-group"><label>رقم التسوية</label><input type="text" placeholder="رقم التسوية..." onChange={e => handleDetailChange('settlement_number', e.target.value)} /></div>
            <div className="field-group"><label>تاريخ التسوية</label><input type="date" defaultValue={new Date().toISOString().split('T')[0]} onChange={e => handleDetailChange('settlement_date', e.target.value)} /></div>
            <div className="field-group"><label>مقدم التسوية</label><input type="text" placeholder="اسم مقدم التسوية..." onChange={e => handleDetailChange('settlement_presenter', e.target.value)} /></div>
            <div className="field-group"><label>مدير اللجنة</label><input type="text" placeholder="اسم مدير اللجنة..." onChange={e => handleDetailChange('committee_manager', e.target.value)} /></div>
            <div className="field-group"><label>نائب المدير</label><input type="text" onChange={e => handleDetailChange('deputy_manager', e.target.value)} /></div>
            <div className="field-group"><label style={{ color: '#0369a1' }}>مبلغ الأضرار (د.ت)</label><input type="text" placeholder="المبلغ بالدينار التونسي..." onChange={e => handleDetailChange('tnd_amount', e.target.value)} /></div>
            <div className="field-group"><label style={{ color: '#059669' }}>قيمة التقييم (د.ل)</label><input type="text" placeholder="القيمة بالدينار الليبي..." onChange={e => handleDetailChange('lyd_amount', e.target.value)} /></div>
            <div className="field-group"><label>الإجمالي القيمة المالية</label><input type="number" placeholder="0.000" onChange={e => handleDetailChange('total_value', e.target.value)} /></div>
            <div className="field-group full"><label>تقرير مدير اللجنة</label><input type="text" placeholder="ملاحظات وتقرير التسوية..." onChange={e => handleDetailChange('manager_report', e.target.value)} /></div>
            <div className="field-group full"><label>إضافة صورة / مستند التسوية</label><input type="file" onChange={e => handleDetailChange('image', e.target.files?.[0])} /></div>
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
            <div className="field-group">
              <label>طريقة السداد</label>
              <select onChange={e => handleDetailChange('payment_method', e.target.value)}>
                <option value="">اختر طريقة السداد...</option>
                <option value="خصم من وديعة">خصم من وديعة</option>
                <option value="شيك (صك)">شيك (صك)</option>
                <option value="كاش">كاش</option>
                <option value="حوالة مصرفية">حوالة مصرفية</option>
              </select>
            </div>
            <div className="field-group"><label>رقم المستند المالي (صك-حوالة)</label><input type="text" onChange={e => handleDetailChange('document_number', e.target.value)} /></div>
            <div className="field-group"><label>اسم مستلم التعويض</label><input type="text" onChange={e => handleDetailChange('recipient_name', e.target.value)} /></div>
            <div className="field-group"><label>قيمة التعويض</label><input type="number" step="any" onChange={e => handleDetailChange('compensation_value', Number(e.target.value))} /></div>
            <div className="field-group"><label>مصاريف إضافية (إدارية - ضرائب - إلخ)</label><input type="number" step="any" onChange={e => handleDetailChange('additional_expenses', Number(e.target.value))} /></div>
            <div className="field-group"><label>إجمالي القيمة المسددة</label><input type="number" step="any" value={transferDetails.financial_value || ''} readOnly /></div>
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
      case 'التعويضات':
        return (
          <div className="field-group full" style={{ color: '#166534', fontWeight: 'bold', padding: '10px', background: '#dcfce7', borderRadius: '8px', textAlign: 'center', gridColumn: 'span 2' }}>
            سيتم تحويل هذا الملف إلى قسم التعويضات للتسوية المالية وإدخال التكاليف.
          </div>
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
            {(() => {
              const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
              const canCancelPayment = currentUser.is_admin || 
                (currentUser.authorized_documents && (
                  currentUser.authorized_documents.includes('إلغاء تسديد التعويضات') || 
                  currentUser.authorized_documents.includes('التعويضات') || 
                  currentUser.authorized_documents.includes('تسديد التعويضات') || 
                  currentUser.authorized_documents.includes('المحاسب المالي') || 
                  currentUser.authorized_documents.includes('الشؤون الفنية')
                ));

              if ((claim.status === 'مدفوع' || claim.status === 'للتسديد - الشؤون المالية' || claim.compensation_value) && canCancelPayment) {
                return (
                  <button className="btn-cancel-payment" onClick={handleCancelPayment} style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '9px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }} title="إلغاء التسديد وإرجاع الملف غير مسدد">
                    <i className="fa-solid fa-rotate-left"></i>
                    إلغاء التسديد
                  </button>
                );
              }
              return null;
            })()}
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
                    <option value="التعويضات">التعويضات</option>
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

          {claim.compensation_value && (
            <section className="dashboard-card" style={{ border: '2px solid #139625' }}>
              <div className="card-header" style={{ borderBottom: '1px solid #139625', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-money-bill-wave text-success"></i>
                  <h3 style={{ color: '#139625', margin: 0 }}>البيانات المالية للتعويض</h3>
                </div>
                {(() => {
                  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                  const canCancelPayment = currentUser.is_admin || 
                    (currentUser.authorized_documents && (
                      currentUser.authorized_documents.includes('إلغاء تسديد التعويضات') || 
                      currentUser.authorized_documents.includes('التعويضات') || 
                      currentUser.authorized_documents.includes('تسديد التعويضات') || 
                      currentUser.authorized_documents.includes('المحاسب المالي') || 
                      currentUser.authorized_documents.includes('الشؤون الفنية')
                    ));

                  if (canCancelPayment) {
                    return (
                      <button onClick={handleCancelPayment} style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }} title="إلغاء التسديد والصرف المالي وحذف قيد المصروف">
                        <i className="fa-solid fa-rotate-left"></i>
                        إلغاء التسديد والصرف
                      </button>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="label">اسم مستلم التعويض</span>
                  <span className="value fw-bold">{claim.recipient_name}</span>
                </div>
                <div className="detail-item">
                  <span className="label">طريقة السداد</span>
                  <span className="value">{claim.payment_method}</span>
                </div>
                <div className="detail-item">
                  <span className="label">رقم المستند المالي</span>
                  <span className="value">{claim.document_number || '---'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">قيمة التعويض</span>
                  <span className="value fw-bold" style={{ color: '#014cb1' }}>{Number(claim.compensation_value).toLocaleString()} {claim.currency === 'TND' ? 'د.ت (دينار تونسي)' : (claim.currency === 'USD' ? '$' : 'د.ل (دينار ليبي)')}</span>
                </div>
                <div className="detail-item">
                  <span className="label">مصاريف إضافية</span>
                  <span className="value">{Number(claim.additional_expenses).toLocaleString()} {claim.currency === 'TND' ? 'د.ت' : 'د.ل'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">إجمالي القيمة المسددة</span>
                  <span className="value fw-bold" style={{ color: '#139625', fontSize: '1.1rem' }}>{Number(claim.total_paid).toLocaleString()} {claim.currency === 'TND' ? 'د.ت (دينار تونسي)' : (claim.currency === 'USD' ? '$' : 'د.ل (دينار ليبي)')}</span>
                </div>
                {claim.finance_status && (
                  <div className="detail-item">
                    <span className="label">حالة الصرف بالمالية</span>
                    <span className="value fw-bold" style={{ 
                      color: claim.finance_status === 'approved' ? '#139625' : (claim.finance_status === 'rejected' ? '#ef4444' : '#d97706') 
                    }}>
                      {claim.finance_status === 'approved' ? 'تم الصرف والقبول المالي ✅' : (claim.finance_status === 'rejected' ? 'مرفوض ماليًا ❌' : 'قيد التدقيق المالي ⏳')}
                    </span>
                  </div>
                )}
                {claim.finance_notes && (
                  <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                    <span className="label">ملاحظات المالية / سبب الرفض</span>
                    <span className="value" style={{ color: '#ef4444' }}>{claim.finance_notes}</span>
                  </div>
                )}
              </div>
            </section>
          )}

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
                <span className="label">نوع الحادث</span>
                <span className="value">{claim.accident_type || '---'}</span>
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
                <span className="value badge-value">{claim.damage_type ? claim.damage_type.split(/[،,]\s*/).map((t: any) => t === 'اخر' ? (claim.other_damage_type || 'أخرى') : t).join('، ') : '—'}</span>
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
                <span className="value" style={{ color: claim.has_fatalities ? '#ef4444' : '#22c55e', fontWeight: 700 }}>
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
                <h3>بيانات الجسم المتضرر - <span style={{ color: 'var(--accent-cyan)' }}>{claim.damaged_body_type}</span></h3>
              </div>
              {isDamagedBodyType('سيارة') && (
                <div style={{ marginBottom: isDamagedBodyType('شخص') || isDamagedBodyType('مبنى') ? '20px' : '0' }}>
                  <h5 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '10px' }}><i className="fa-solid fa-car me-2"></i>أضرار المركبة</h5>
                  <div className="details-grid three-cols">
                    {claim.damaged_vehicle_model && <div className="detail-item"><span className="label">موديل السيارة</span><span className="value">{claim.damaged_vehicle_model}</span></div>}
                    {claim.damaged_vehicle_plate && <div className="detail-item"><span className="label">رقم اللوحة</span><span className="value">{claim.damaged_vehicle_plate}</span></div>}
                    {claim.damaged_vehicle_repair_shop && <div className="detail-item"><span className="label">ورشة التصليح</span><span className="value">{claim.damaged_vehicle_repair_shop}</span></div>}
                    {claim.damaged_vehicle_amount && <div className="detail-item"><span className="label">مبلغ الأضرار</span><span className="value fw-bold" style={{ color: '#ef4444' }}>{Number(claim.damaged_vehicle_amount).toLocaleString('en-US')} د.ل</span></div>}
                  </div>
                </div>
              )}
              {isDamagedBodyType('شخص') && (
                <div style={{ marginBottom: isDamagedBodyType('مبنى') ? '20px' : '0', borderTop: isDamagedBodyType('سيارة') ? '1px dashed var(--border)' : 'none', paddingTop: isDamagedBodyType('سيارة') ? '15px' : '0' }}>
                  <h5 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '10px' }}><i className="fa-solid fa-person me-2"></i>أضرار الشخص/الإصابة الجسدية</h5>
                  <div className="details-grid">
                    {claim.damaged_person_name && <div className="detail-item"><span className="label">اسم المتضرر</span><span className="value">{claim.damaged_person_name}</span></div>}
                    {claim.damaged_person_amount && <div className="detail-item"><span className="label">مبلغ الأضرار</span><span className="value fw-bold" style={{ color: '#ef4444' }}>{Number(claim.damaged_person_amount).toLocaleString('en-US')} د.ل</span></div>}
                  </div>
                </div>
              )}
              {isDamagedBodyType('مبنى') && (
                <div style={{ borderTop: isDamagedBodyType('سيارة') || isDamagedBodyType('شخص') ? '1px dashed var(--border)' : 'none', paddingTop: isDamagedBodyType('سيارة') || isDamagedBodyType('شخص') ? '15px' : '0' }}>
                  <h5 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '10px' }}><i className="fa-solid fa-building me-2"></i>أضرار المبنى/الممتلكات</h5>
                  <div className="details-grid">
                    {claim.damaged_building_description && <div className="detail-item" style={{ gridColumn: 'span 2' }}><span className="label">وصف المبنى</span><span className="value">{claim.damaged_building_description}</span></div>}
                    {claim.damaged_building_amount && <div className="detail-item"><span className="label">مبلغ الأضرار</span><span className="value fw-bold" style={{ color: '#ef4444' }}>{Number(claim.damaged_building_amount).toLocaleString('en-US')} د.ل</span></div>}
                  </div>
                </div>
              )}
              {/* Damage photos */}
              {(() => {
                const vehiclePhotos = isDamagedBodyType('سيارة') && Array.isArray(claim.damaged_vehicle_photos) ? claim.damaged_vehicle_photos : [];
                const personPhotos = isDamagedBodyType('شخص') && Array.isArray(claim.damaged_person_photos) ? claim.damaged_person_photos : [];
                const buildingPhotos = isDamagedBodyType('مبنى') && Array.isArray(claim.damaged_building_photos) ? claim.damaged_building_photos : [];
                const photoArr = [...vehiclePhotos, ...personPhotos, ...buildingPhotos];
                return photoArr.length > 0 ? (
                  <div className="photos-strip mt-3" style={{ borderTop: '1px dashed var(--border)', paddingTop: '15px' }}>
                    {photoArr.map((p: string, i: number) => (
                      <a key={i} href={`${BACKEND_URL}/storage/${p}`} target="_blank" rel="noreferrer">
                        <img src={`${BACKEND_URL}/storage/${p}`} alt={`ضرر ${i + 1}`} className="damage-thumb" />
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
                <i className="fa-solid fa-shield-halved" style={{ color: '#7c3aed' }}></i>
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
                <i className="fa-solid fa-calculator" style={{ color: '#059669' }}></i>
                <h3>تقرير مقدر الأضرار</h3>
              </div>
              <div className="details-grid three-cols">
                {claim.assessor_name && <div className="detail-item"><span className="label">اسم المقدر</span><span className="value">{claim.assessor_name}</span></div>}
                {claim.assessor_phone && <div className="detail-item"><span className="label">رقم الهاتف</span><span className="value">{claim.assessor_phone}</span></div>}
                {claim.assessor_date && <div className="detail-item"><span className="label">تاريخ التقييم</span><span className="value">{claim.assessor_date}</span></div>}
                {claim.assessor_amount_dinar && <div className="detail-item"><span className="label">القيمة (بالدينار الليبي)</span><span className="value fw-bold" style={{ color: '#059669' }}>{Number(claim.assessor_amount_dinar).toLocaleString('en-US')} د.ل</span></div>}
                {claim.assessor_other_amount && <div className="detail-item"><span className="label">القيمة بالعملة الأصلية</span><span className="value fw-bold" style={{ color: '#059669' }}>{claim.assessor_other_amount}</span></div>}
                {!claim.assessor_other_amount && claim.assessor_amount_dollar && <div className="detail-item"><span className="label">القيمة (دولار)</span><span className="value fw-bold" style={{ color: '#059669' }}>${Number(claim.assessor_amount_dollar).toLocaleString()}</span></div>}
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
                <span className="value text-primary fw-bold">{claim.document?.insurance_number || claim.document_manual_data?.insurance_number || 'غير متوفر'}</span>
              </div>
              <div className="detail-item">
                <span className="label">تغطية الوثيقة</span>
                <span className="value">{claim.document_coverage || claim.document_manual_data?.document_coverage || '---'}</span>
              </div>
              <div className="detail-item">
                <span className="label">اسم المؤمن له</span>
                <span className="value">{claim.document?.insured_name || claim.document_manual_data?.insured_name || '---'}</span>
              </div>
              <div className="detail-item">
                <span className="label">تاريخ الإصدار</span>
                <span className="value">
                  {claim.document?.issue_date 
                    ? new Date(claim.document.issue_date).toLocaleDateString('en-GB') 
                    : (claim.document_manual_data?.issue_date 
                        ? new Date(claim.document_manual_data.issue_date).toLocaleDateString('en-GB') 
                        : '---')}
                </span>
              </div>
            </div>
          </section>

          {/* Section 3.1: Additional Documents Info */}
          {claim.additional_documents && claim.additional_documents.length > 0 && (
            <section className="dashboard-card highlight-card" style={{ borderRightColor: '#ef4444' }}>
              <div className="card-header">
                <i className="fa-solid fa-file-invoice text-danger"></i>
                <h3>وثائق التأمين الإضافية المرفقة</h3>
              </div>
              {claim.additional_documents.map((doc: any, index: number) => (
                <div key={index} className="additional-doc-item" style={{ marginBottom: index === claim.additional_documents.length - 1 ? 0 : '16px', borderBottom: index === claim.additional_documents.length - 1 ? 'none' : '1px dashed var(--border)', paddingBottom: index === claim.additional_documents.length - 1 ? 0 : '16px' }}>
                  <h5 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '8px' }}>وثيقة إضافية #{index + 1}</h5>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="label">رقم الوثيقة</span>
                      <span className="value text-primary fw-bold">{doc.insurance_number || 'غير متوفر'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">اسم المؤمن له</span>
                      <span className="value">{doc.insured_name || '---'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">نوع السيارة</span>
                      <span className="value">{doc.vehicle_type || '---'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">رقم اللوحة المعدنية</span>
                      <span className="value">{doc.plate_number || '---'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">تاريخ الإصدار</span>
                      <span className="value">{doc.issue_date ? new Date(doc.issue_date).toLocaleDateString('en-GB') : '---'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="label">تاريخ الانتهاء</span>
                      <span className="value">{doc.end_date ? new Date(doc.end_date).toLocaleDateString('en-GB') : '---'}</span>
                    </div>
                    {doc.notes && (
                      <div className="detail-item" style={{ gridColumn: 'span 3' }}>
                        <span className="label">ملاحظات</span>
                        <span className="value">{doc.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}

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
                        <span className="time">{new Date(t.created_at).toLocaleString('en-GB')}</span>
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

