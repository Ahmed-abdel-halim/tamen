// @ts-nocheck
/**
 * محرك طباعة النماذج والمراسلات الرسمية لملفات المطالبات والبطاقات العربية الموحدة
 * متوافق مع هوية شركة المدار الليبي للتأمين وتعميم الاتحاد الليبي للتأمين رقم 2026/160
 */

interface ClaimData {
  id?: number;
  claim_number?: string;
  claim_date?: string;
  accident_date?: string;
  accident_location?: string;
  damage_type?: string;
  claimant_name?: string;
  insured_name?: string;
  document?: any;
  document_manual_data?: any;
  additional_documents?: any[];
  transfers?: any[];
  [key: string]: any;
}

interface LetterParams {
  refNumber?: string;
  letterDate?: string;
  externalRef?: string;
  externalDate?: string;
  rejectionReasons?: string[];
  rejectionDetails?: string;
  settlementDetails?: any;
  paymentDetails?: any;
}

const escapeHtml = (str: any): string => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const getClaimCardNumber = (claim: ClaimData): string => {
  return (
    claim.document?.insurance_number ||
    claim.document_manual_data?.insurance_number ||
    (claim.additional_documents && claim.additional_documents[0]?.insurance_number) ||
    'LBY/------'
  );
};

const getClaimPlateNumber = (claim: ClaimData): string => {
  return (
    claim.document?.plate_number ||
    claim.document_manual_data?.plate_number ||
    (claim.additional_documents && claim.additional_documents[0]?.plate_number) ||
    claim.damaged_vehicle_plate ||
    '---'
  );
};

const getClaimVehicleType = (claim: ClaimData): string => {
  return (
    claim.document?.car_type ||
    claim.document_manual_data?.car_type ||
    claim.damaged_vehicle_type ||
    '---'
  );
};

const getClaimInsuredName = (claim: ClaimData): string => {
  return (
    claim.document?.insured_name ||
    claim.document_manual_data?.insured_name ||
    (claim.additional_documents && claim.additional_documents[0]?.insured_name) ||
    claim.claimant_name ||
    '---'
  );
};

// توليد صفحة الخطاب الرسمي الكاملة A4
function generateOfficialLetterHtml({
  title,
  subTitle,
  refNumber,
  letterDate,
  subject,
  claim,
  bodyHtml,
  qrText
}: {
  title: string;
  subTitle?: string;
  refNumber: string;
  letterDate: string;
  subject: string;
  claim: ClaimData;
  bodyHtml: string;
  qrText?: string;
}): string {
  const cardNumber = getClaimCardNumber(claim);
  const accidentDate = claim.accident_date || 'غير محدد';
  const qrData = encodeURIComponent(qrText || `MLI-CLAIM-${claim.claim_number || claim.id}-${refNumber}`);
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${qrData}`;

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(title)} - ${escapeHtml(claim.claim_number || '')}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm 10mm 8mm 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
          background: #f1f5f9;
          margin: 0;
          padding: 20px 0;
          color: #0f172a;
          line-height: 1.5;
        }
        
        /* شريط التحكم العلوي خارج الطباعة */
        .print-toolbar {
          width: 210mm;
          margin: 0 auto 16px auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #0f172a;
          color: #fff;
          padding: 10px 20px;
          border-radius: 10px;
          box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        }
        .toolbar-title {
          font-size: 14px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .btn-action {
          padding: 8px 18px;
          border-radius: 8px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .btn-print {
          background: #0284c7;
          color: #fff;
        }
        .btn-print:hover { background: #0369a1; }
        .btn-close {
          background: rgba(255,255,255,0.15);
          color: #fff;
          margin-right: 8px;
        }
        .btn-close:hover { background: rgba(255,255,255,0.25); }

        /* الورقة الرسمية A4 */
        .official-sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #fff;
          padding: 10mm 14mm 8mm 14mm;
          position: relative;
          box-shadow: 0 5px 25px rgba(0,0,0,0.08);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
        }

        /* الإطار الرسمي الدقيق */
        .sheet-border {
          position: absolute;
          top: 4.5mm;
          bottom: 4.5mm;
          left: 4.5mm;
          right: 4.5mm;
          border: 1.5px solid #0284c7;
          border-radius: 5px;
          pointer-events: none;
        }
        .sheet-border-inner {
          position: absolute;
          top: 6mm;
          bottom: 6mm;
          left: 6mm;
          right: 6mm;
          border: 0.5px solid #cbd5e1;
          border-radius: 3px;
          pointer-events: none;
        }

        /* العلامة المائية */
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 360px;
          opacity: 0.04;
          pointer-events: none;
          z-index: 0;
        }

        .sheet-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          flex: 1;
          justify-content: space-between;
        }

        .sheet-top-content {
          display: flex;
          flex-direction: column;
        }

        /* الترويسة الفخمة */
        .header-grid {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 10px;
          border-bottom: 2px solid #0284c7;
          margin-bottom: 12px;
        }
        .header-logo-box {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .header-logo-box img.logo {
          height: 70px;
          width: auto;
          object-fit: contain;
        }
        .company-info-titles h1 {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.2px;
        }
        .company-info-titles .en-name {
          font-size: 10px;
          font-weight: 700;
          color: #0284c7;
          letter-spacing: 0.5px;
          margin-top: 2px;
        }
        .company-info-titles .sub-dept {
          font-size: 11px;
          font-weight: 800;
          color: #475569;
          margin-top: 3px;
        }
        
        .header-meta-box {
          text-align: left;
          font-size: 11px;
          color: #334155;
          line-height: 1.6;
          min-width: 170px;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }
        .meta-label {
          font-weight: 700;
          color: #64748b;
        }
        .meta-val {
          font-weight: 800;
          color: #0f172a;
          direction: ltr;
        }

        /* شريط التوثيق السريع والموضوع */
        .subject-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-right: 4.5px solid #0284c7;
          border-radius: 7px;
          padding: 9px 14px;
          margin-bottom: 11px;
        }
        .recipient-line {
          font-size: 14px;
          font-weight: 900;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .greeting-line {
          font-size: 12px;
          color: #475569;
          margin-bottom: 6px;
          font-weight: 600;
        }
        .subject-line {
          font-size: 13.5px;
          font-weight: 900;
          color: #0369a1;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* جدول بيانات الحادث والبطاقة الموحدة */
        .info-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          background: #f0f9ff;
          border: 1.5px solid #bae6fd;
          border-radius: 7px;
          padding: 8px 12px;
          margin-bottom: 12px;
        }
        .info-cell {
          font-size: 11px;
        }
        .info-cell .lbl {
          color: #0284c7;
          font-weight: 700;
          display: block;
          font-size: 10px;
          margin-bottom: 1px;
        }
        .info-cell .val {
          color: #0f172a;
          font-weight: 800;
          font-size: 12px;
        }

        /* جسم الخطاب */
        .letter-body {
          font-size: 13.5px;
          line-height: 1.9;
          color: #1e293b;
          text-align: justify;
          margin-bottom: 12px;
        }
        .letter-body p {
          margin: 0 0 8px 0;
          text-indent: 12px;
        }
        .letter-body p:last-child {
          margin-bottom: 0;
        }
        .letter-body .highlight-text {
          font-weight: 800;
          color: #0f172a;
        }

        /* مربعات التنبيه أو الأسباب */
        .rejection-box {
          background: #fef2f2;
          border: 1.5px solid #fecaca;
          border-right: 4.5px solid #dc2626;
          border-radius: 7px;
          padding: 10px 14px;
          margin: 10px 0 12px 0;
        }
        .rejection-title {
          font-size: 12.5px;
          font-weight: 900;
          color: #991b1b;
          margin-bottom: 6px;
        }
        .rejection-list {
          margin: 0;
          padding-right: 20px;
          font-size: 12px;
          color: #7f1d1d;
          line-height: 1.8;
        }
        .rejection-list li {
          margin-bottom: 4px;
        }

        /* جدول التفاصيل المالية أو التسوية - تصميم موفر للحبر رسمي */
        .table-data {
          width: 100%;
          border-collapse: collapse;
          margin: 10px 0 12px 0;
          font-size: 11.5px;
        }
        .table-data th {
          background: #f8fafc;
          color: #0f172a;
          font-weight: 800;
          padding: 6px 8px;
          border: 1.5px solid #475569;
          text-align: center;
          font-size: 11.5px;
        }
        .table-data td {
          padding: 6px 8px;
          border: 1px solid #94a3b8;
          color: #0f172a;
          font-weight: 700;
          text-align: center;
        }
        .table-data tr:nth-child(even) td {
          background: #ffffff;
        }
        .table-data td.accent-cell {
          font-weight: 900;
          color: #0f172a;
        }

        /* قسم التواقيع والاعتمادات الرسمية */
        .signatures-section {
          margin-top: auto;
          padding-top: 10px;
          border-top: 1.5px dashed #cbd5e1;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          text-align: center;
        }
        .sig-box {
          flex: 1;
          padding: 0 8px;
        }
        .sig-role {
          font-size: 11.5px;
          font-weight: 800;
          color: #334155;
          margin-bottom: 30px;
        }
        .sig-name {
          font-size: 12.5px;
          font-weight: 900;
          color: #0f172a;
        }
        .sig-stamp-placeholder {
          font-size: 9px;
          font-weight: 700;
          color: #94a3b8;
          border: 1px dashed #cbd5e1;
          border-radius: 50%;
          width: 65px;
          height: 65px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: -22px auto 4px auto;
          background: rgba(248, 250, 252, 0.6);
        }

        /* التذييل الرسمي ومعلومات الاتصال */
        .footer-strip {
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1.5px solid #0284c7;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9.5px;
          color: #64748b;
        }
        .footer-contacts {
          display: flex;
          gap: 12px;
          font-weight: 600;
        }
        .footer-qr {
          width: 36px;
          height: 36px;
          border: 1px solid #cbd5e1;
          border-radius: 4px;
        }

        @media print {
          html, body {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
            height: 100% !important;
            width: 100% !important;
            overflow: hidden !important;
          }
          .print-toolbar {
            display: none !important;
          }
          .official-sheet {
            width: 100% !important;
            height: 275mm !important;
            max-height: 275mm !important;
            min-height: 275mm !important;
            margin: 0 !important;
            padding: 6mm 10mm 5mm 10mm !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            break-inside: avoid !important;
            overflow: hidden !important;
          }
          .sheet-border {
            position: absolute !important;
            top: 2mm !important;
            bottom: 2mm !important;
            left: 2mm !important;
            right: 2mm !important;
          }
          .sheet-border-inner {
            position: absolute !important;
            top: 3.5mm !important;
            bottom: 3.5mm !important;
            left: 3.5mm !important;
            right: 3.5mm !important;
          }
          .sheet-content {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 !important;
            justify-content: space-between !important;
          }
          .table-data th {
            background: #f1f5f9 !important;
            color: #000000 !important;
            border: 1.5px solid #000000 !important;
            font-weight: 800 !important;
          }
          .table-data td {
            border: 1px solid #475569 !important;
            color: #000000 !important;
          }
        }
      </style>
    </head>
    <body onload="setTimeout(() => { /* جاهز للطباعة */ }, 400);">
      
      <!-- شريط الطباعة العلوي للشاشة -->
      <div class="print-toolbar">
        <div class="toolbar-title">
          <span>📜 ${escapeHtml(title)}</span>
          <span style="font-size: 12px; opacity: 0.8;">| مطالبة رقم: ${escapeHtml(claim.claim_number || claim.id)}</span>
        </div>
        <div>
          <button class="btn-action btn-close" onclick="window.close()">✕ إغلاق</button>
          <button class="btn-action btn-print" onclick="window.print()">🖨️ طباعة الخطاب الرسمي (A4)</button>
        </div>
      </div>

      <!-- الورقة الرسمية A4 -->
      <div class="official-sheet">
        <div class="sheet-border"></div>
        <div class="sheet-border-inner"></div>
        <img src="/img/logo.png" onerror="this.src='/img/official_logo.PNG'" class="watermark" alt="" />

        <div class="sheet-content">
          <div class="sheet-top-content">
            <!-- الترويسة -->
            <div class="header-grid">
              <div class="header-logo-box">
                <img src="/img/logo.png" onerror="this.src='/img/official_logo.PNG'" class="logo" alt="شركة المدار الليبي للتأمين" />
                <div class="company-info-titles">
                  <h1>شركة المدار الليبي للتأمين المساهمة</h1>
                  <div class="en-name">AL MADAR LIBYAN INSURANCE COMPANY</div>
                  <div class="sub-dept">إدارة تأمينات السيارات — قسم التعويضات والمطالبات</div>
                </div>
              </div>

              <div class="header-meta-box">
                <div class="meta-row">
                  <span class="meta-label">الرقم الإشاري:</span>
                  <span class="meta-val">${escapeHtml(refNumber)}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">التاريخ:</span>
                  <span class="meta-val">${escapeHtml(letterDate)}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-label">مرجع المطالبة:</span>
                  <span class="meta-val">${escapeHtml(claim.claim_number || claim.id)}</span>
                </div>
              </div>
            </div>

            <!-- صندوق الموضوع والجهة المخاطبة -->
            <div class="subject-box">
              <div class="recipient-line">السادة / مدير المكتب الموحد — الاتحاد الليبي للتأمين المحترمون</div>
              <div class="greeting-line">تحية طيبة وبعد،،،</div>
              <div class="subject-line">
                <span>الموضوع:</span>
                <span>${escapeHtml(subject)}</span>
              </div>
            </div>

            <!-- صلب الخطاب الرسمي المخصص -->
            <div class="letter-body">
              ${bodyHtml}
            </div>
          </div>

          <!-- قسم التواقيع والاعتمادات -->
          <div class="signatures-section">
            <div class="sig-box">
              <div class="sig-role">مدير إدارة المطالبات</div>
              <div class="sig-stamp-placeholder">توقيع واعتماد</div>
              <div class="sig-name">اشرف محمد عبد الرحيم</div>
            </div>
            <div class="sig-box">
              <div class="sig-role">مدير إدارة تأمينات السيارات</div>
              <div class="sig-stamp-placeholder">توقيع واعتماد</div>
              <div class="sig-name">محمد علي ادريس</div>
            </div>
            <div class="sig-box">
              <div class="sig-role">اعتماد المدير العام</div>
              <div class="sig-stamp-placeholder">ختم الإدارة العامة</div>
              <div class="sig-name">سكينه رمضان محمد</div>
            </div>
          </div>
        </div>

        <!-- تذييل الصفحة الرسمي -->
        <div class="footer-strip">
          <div>
            <strong>شركة المدار الليبي للتأمين</strong> — العنوان: ليبيا، طرابلس، صلاح الدين
          </div>
          <div class="footer-contacts">
            <span>هاتف: 0920003366</span>
            <span>info@mli.ly</span>
            <span>www.mli.ly</span>
          </div>
          <img src="${qrApiUrl}" class="footer-qr" alt="QR Code" />
        </div>

      </div>
    </body>
    </html>
  `;
}

// دالة فتح نافذة الطباعة المنبثقة
function openPrintWindow(htmlContent: string) {
  const printWindow = window.open('', '_blank', 'width=950,height=900,menubar=no,toolbar=no,location=no');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

/**
 * 1️⃣ الملف الأول: خطاب رد بشأن صحة بيانات وثيقة التأمين (تأكيد التغطية)
 */
export function printVerificationLetter(claim: ClaimData, params: LetterParams = {}) {
  const currentDate = params.letterDate || new Date().toISOString().split('T')[0];
  const refNumber = params.refNumber || `MLI/VOU/${claim.claim_number || claim.id}/${new Date().getFullYear()}`;
  const extRef = params.externalRef || '2025/663 م.م';
  const extDate = params.externalDate || '2025/05/01';

  const bodyHtml = `
    <p>
      بالإشارة إلى مراسلتكم ذات الرقم الإشاري <strong>(${escapeHtml(extRef)})</strong> والمؤرخة في <strong>(${escapeHtml(extDate)})</strong> 
      بشأن البلاغ المستلم من المكتب الموحد بدولة الحادث بخصوص الحادث الواقع على البطاقة العربية الموحدة المبينة بياناتها أعلاه، 
      وتحت رقم ملف تعويض طرفكم <strong>(${escapeHtml(claim.claim_number || '2025/2')})</strong>.
    </p>

    <p>
      نفيدكم علماً بأنه بمراجعة دقيقة لسجلات ومنظومة إصدار وثائق التأمين لدى شركتنا ومطابقة السجلات الفنية، 
      <strong>نؤكد لكم صحة بيانات وسريان البطاقة التأمينية المذكورة، وأن التغطية التأمينية صحيحة وقائمة وسارية المفعول وقت وقوع الحادث</strong>.
    </p>

    <table class="table-data">
      <thead>
        <tr>
          <th>رقم البطاقة الموحدة</th>
          <th>اسم المؤمن له</th>
          <th>رقم اللوحة</th>
          <th>نوع المركبة</th>
          <th>فترة السريان</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="accent-cell">${escapeHtml(getClaimCardNumber(claim))}</td>
          <td>${escapeHtml(getClaimInsuredName(claim))}</td>
          <td>${escapeHtml(getClaimPlateNumber(claim))}</td>
          <td>${escapeHtml(getClaimVehicleType(claim))}</td>
          <td>سارية ومفعلة</td>
        </tr>
      </tbody>
    </table>

    <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-right: 4px solid #16a34a; border-radius: 7px; padding: 8px 12px; margin: 10px 0;">
      <div style="font-weight: 800; font-size: 12px; color: #166534; margin-bottom: 2px;">✓ إفادة السريان والمسؤولية التأمينية:</div>
      <div style="font-size: 11.5px; color: #14532d; line-height: 1.7;">
        تُقر شركة المدار الليبي للتأمين بأن البطاقة الموحدة الصادرة من طرفها تغطي المسؤولية المدنية المترتبة عن حوادث المرور وفق الشروط والأحكام المنصوص عليها في اتفاقية بطاقة التأمين الموحدة عن سير السيارات عبر البلاد العربية، والشركة ملتزمة بكافة الالتزامات والضمانات النظامية المترتبة عليها قانوناً.
      </div>
    </div>

    <p>
      عليه، نأمل منكم التكرم بمخاطبة المكتب الموحد للسيارات بدولة الحادث بتأكيد صحة التغطية التأمينية وسريان البطاقة أصولاً، 
      وموافاتنا بأي تطورات أو مستندات ترد إليكم بالخصوص ليتسنى لنا فتح ملف التعويض ومتابعته بانتظام.
    </p>

    <p style="font-weight: 800; color: #0f172a; margin-top: 10px; font-size: 13.5px; text-align: center;">
      شاكرين لكم حسن تعاونكم الدائم،،، والسلام عليكم ورحمة الله وبركاته.
    </p>
  `;

  const html = generateOfficialLetterHtml({
    title: 'رد بشأن صحة بيانات وثيقة التأمين',
    refNumber,
    letterDate: currentDate,
    subject: `رد بشأن صحة بيانات وسريان البطاقة العربية الموحدة رقم (${getClaimCardNumber(claim)})`,
    claim,
    bodyHtml
  });

  openPrintWindow(html);
}

/**
 * 2️⃣ الملف الثاني: محضر وإفادة طلب تسوية وسداد المطالبة (التسوية الودية)
 */
export function printSettlementLetter(claim: ClaimData, params: LetterParams = {}) {
  const currentDate = params.letterDate || new Date().toISOString().split('T')[0];
  const refNumber = params.refNumber || `MLI/SET/${claim.claim_number || claim.id}/${new Date().getFullYear()}`;
  
  // البحث عن بيانات التسوية الودية
  const settlementTransfer = (claim.transfers || []).slice().reverse().find(t => t.transfer_type === 'تسويه وديه');
  const details = params.settlementDetails || settlementTransfer?.details || {};

  const tndAmount = details.tnd_amount || '2,284.620';
  const lydAmount = details.lyd_amount || details.total_value || '—';
  const presenter = details.settlement_presenter || claim.claimant_name || 'شركة الأمانة تكافل / المكتب الموحد التونسي';
  const reportText = details.manager_report || 'أضرار مادية بزلاقات الأمان وفق تقرير الاختبار الفني، وتم قبول مقترح التسوية الودية لحفظ حقوق الشركة والحد من المصاريف.';

  const bodyHtml = `
    <p>
      بالإشارة إلى كتابكم الإشاري <strong>(2025/748 م.م)</strong> وإخطار المكتب الموحد بدولة الحادث بشأن طلب التسوية الودية 
      للأضرار المادية الناجمة عن الحادث المذكور أعلاه لملف تعويض رقم <strong>(${escapeHtml(claim.claim_number || '2025/2')})</strong> 
      للبطاقة العربية الموحدة رقم <strong>(${escapeHtml(cardNumber)})</strong> للمركبة (${escapeHtml(getClaimVehicleType(claim))} - ${escapeHtml(getClaimPlateNumber(claim))}).
    </p>

    <p>
      نفيدكم بأنه بعد دراسة تقرير الخبير الفني المعاين وحصر قطع الغيار وأجور اليد العاملة، 
      <strong>تمت الموافقة من قبل لجنة التعويضات على إبرام التسوية الودية</strong> وفق التفاصيل والبنود الموضحة بالجدول أدناه:
    </p>

    <table class="table-data">
      <thead>
        <tr>
          <th>جهة تقديم التسوية</th>
          <th>مجموع الأضرار الصافية</th>
          <th>القيمة المعتمدة (د.ل)</th>
          <th>تاريخ التسوية</th>
          <th>حالة التسوية</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(presenter)}</td>
          <td class="accent-cell">${escapeHtml(tndAmount)} د.ت</td>
          <td class="accent-cell">${escapeHtml(lydAmount)} د.ل</td>
          <td>${escapeHtml(details.settlement_date || currentDate)}</td>
          <td style="color: #166534; font-weight: 800;">تسوية ودية معتمدة</td>
        </tr>
      </tbody>
    </table>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-right: 4px solid #0284c7; border-radius: 7px; padding: 8px 12px; margin: 8px 0;">
      <div style="font-weight: 800; font-size: 12px; color: #0369a1; margin-bottom: 2px;">تقرير وملاحظات لجنة التسوية:</div>
      <div style="font-size: 11.5px; color: #334155; line-height: 1.7;">${escapeHtml(reportText)}</div>
    </div>

    <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-right: 4px solid #16a34a; border-radius: 7px; padding: 7px 12px; margin: 8px 0; font-size: 11.5px; color: #166534; font-weight: 700;">
      ✓ تعتبر هذه التسوية نهائية ومبرئة لذمة الشركة والمؤمن له عن كافة الأضرار المادية الناشئة عن هذا الحادث بعد استلام مخالصة الإبراء والتنازل الرسمية.
    </div>

    <p>
      نرجو منكم استكمال الإجراءات الإدارية اللازمة وإفادة الطرف الآخر باعتماد التسوية ليتسنى لنا إحالة أذونات الصرف المالي،،،
    </p>

    <p style="font-weight: 800; color: #0f172a; margin-top: 10px; font-size: 13.5px; text-align: center;">
      وتفضلوا بقبول وافر الاحترام والتقدير،،،
    </p>
  `;

  const html = generateOfficialLetterHtml({
    title: 'طلب تسوية وسداد المطالبة',
    refNumber,
    letterDate: currentDate,
    subject: `إفادة اعتماد تسوية ودية لمطالبة رقم (${claim.claim_number || '2025/2'})`,
    claim,
    bodyHtml
  });

  openPrintWindow(html);
}

/**
 * 3️⃣ الملف الثالث: أمر وإفادة بتسديد وصرف تعويض مطالبة رقم (X)
 */
export function printPaymentOrderLetter(claim: ClaimData, params: LetterParams = {}) {
  const currentDate = params.letterDate || new Date().toISOString().split('T')[0];
  const refNumber = params.refNumber || `MLI/PAY/${claim.claim_number || claim.id}/${new Date().getFullYear()}`;

  const paymentTransfer = (claim.transfers || []).slice().reverse().find(t => t.transfer_type === 'للتسديد - الشؤون المالية');
  const details = params.paymentDetails || paymentTransfer?.details || {};

  const recipient = details.recipient_name || claim.recipient_name || 'الاتحاد الليبي لشركات التأمين';
  const payMethod = details.payment_method || claim.payment_method || 'خصم من وديعة الشركة لدى الاتحاد';
  const docNum = details.document_number || claim.document_number || '0000';
  const bookNum = details.book_number || claim.book_number || '0000';
  const compValue = details.compensation_value || claim.compensation_value || '—';
  const addExpenses = details.additional_expenses || claim.additional_expenses || '0.000';
  const totalPaid = details.financial_value || claim.total_paid || compValue;
  const tndFinal = details.final_tnd_value || details.tnd_settlement_amount || '—';

  const bodyHtml = `
    <p>
      بالإشارة إلى تعميم الاتحاد الليبي للتأمين رقم <strong>(2026/160)</strong> المؤرخ في 2026/09/22 بشأن تسديد تعويضات البطاقة العربية الموحدة، 
      وبناءً على محضر التسوية الودية المعتمد للمطالبة رقم <strong>(${escapeHtml(claim.claim_number || '2025/2')})</strong>.
    </p>

    <p>
      نفيدكم بموافقتنا الصريحة والنهائية على <strong>صرف وتسديد قيمة التعويض المستحق عن الحادث</strong>، 
      والموافقة على خصم كامل المبلغ المستحق من الوديعة النظامية لشركتنا المودعة طرف الاتحاد الليبي للتأمين وفق البيانات التالية:
    </p>

    <table class="table-data">
      <thead>
        <tr>
          <th>اسم الجهة المستلمة</th>
          <th>طريقة السداد المعتمدة</th>
          <th>رقم الكتاب / الإفادة</th>
          <th>قيمة التسوية (د.ت)</th>
          <th>قيمة التعويض (د.ل)</th>
          <th>المصاريف الإضافية</th>
          <th>إجمالي المبلغ المسدد (د.ل)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="font-weight: 800;">${escapeHtml(recipient)}</td>
          <td>${escapeHtml(payMethod)}</td>
          <td>${escapeHtml(bookNum)} / ${escapeHtml(docNum)}</td>
          <td class="accent-cell">${escapeHtml(tndFinal)} د.ت</td>
          <td class="accent-cell">${escapeHtml(compValue)} د.ل</td>
          <td>${escapeHtml(addExpenses)} د.ل</td>
          <td style="background: #f8fafc; color: #0f172a; font-weight: 900; font-size: 12px; border: 1.5px solid #475569;">${escapeHtml(totalPaid)} د.ل</td>
        </tr>
      </tbody>
    </table>

    <div style="background: #f0fdf4; border: 1.5px solid #bbf7d0; border-right: 4px solid #16a34a; border-radius: 7px; padding: 8px 12px; margin: 8px 0;">
      <div style="font-weight: 800; font-size: 12px; color: #166534; margin-bottom: 2px;">✓ إذن وصلاحية الخصم من الوديعة:</div>
      <div style="font-size: 11.5px; color: #14532d; line-height: 1.7;">
        يُعد هذا الخطاب إذناً رسمياً وصريحاً لا رجعة فيه بالموافقة على إجراء قيد الخصم من وديعة شركة المدار الليبي للتأمين المودعة طرفكم، ونأمل منكم التكرم بموافاتنا بإشعار الخصم المصرفي المعتمد لإقفال قيود ملف التعويض دفترياً.
      </div>
    </div>

    <p>
      شاكرين لكم حسن التعاون وتسهيل إجراءات التسديد وفق الضوابط المعمول بها.
    </p>

    <p style="font-weight: 800; color: #0f172a; margin-top: 10px; font-size: 13.5px; text-align: center;">
      وتفضلوا بقبول وافر الاحترام والتقدير،،،
    </p>
  `;

  const html = generateOfficialLetterHtml({
    title: 'أمر وإفادة بتسديد وصرف تعويض مطالبة',
    refNumber,
    letterDate: currentDate,
    subject: `أمر وإفادة صرف وتسديد تعويض مطالبة رقم (${claim.claim_number || '2025/2'}) بالخصم من الوديعة`,
    claim,
    bodyHtml
  });

  openPrintWindow(html);
}

/**
 * 4️⃣ الملف الرابع: كتاب اعتراض رسمي على المطالبة (أسباب الرفض الفنية والقانونية)
 */
export function printObjectionLetter(claim: ClaimData, params: LetterParams = {}) {
  const currentDate = params.letterDate || new Date().toISOString().split('T')[0];
  const refNumber = params.refNumber || `MLI/OBJ/${claim.claim_number || claim.id}/${new Date().getFullYear()}`;
  
  // أسباب الرفض الافتراضية إذا لم يتم تمريرها
  const reasons = (params.rejectionReasons && params.rejectionReasons.length > 0)
    ? params.rejectionReasons
    : [
        'خلو الملف وقصور المستندات الإثباتية القانونية (عدم إرفاق تقرير المرور النهائي الصادر عن الجهات المختصة).',
        'عدم ثبوت مسؤولية الوسيلة المؤمن عليها عن وقوع الأضرار بموجب تقرير قضائي أو مخطط حادث مروري معتمد.',
        'المبالغة غير المبررة في تكاليف قطع الغيار وأجور الإصلاح دون تقديم الفواتير الضريبية الأصلية المؤيدة للصرف.'
      ];

  const additionalNotes = params.rejectionDetails ? `<p style="margin-top: 6px;"><strong>تفاصيل وملاحظات إضافية:</strong> ${escapeHtml(params.rejectionDetails)}</p>` : '';

  const bodyHtml = `
    <p>
      بالإشارة إلى مراسلاتكم السابقة وإشعاركم بشأن الحادث المذكور أعلاه لملف تعويض طرفكم رقم 
      <strong>(${escapeHtml(claim.claim_number || '2025/2')})</strong>، 
      وتطبيقاً لأحكام <strong>تعميم الاتحاد الليبي للتأمين رقم (2026/160)</strong> المؤرخ في 2026/09/22 بشأن تنظيم سداد واعتراضات تعويضات البطاقة العربية الموحدة:
    </p>

    <p>
      نحيطكم علماً بأننا قمنا بإجراء دراسة فنية وقانونية لجميع المراسلات ومراجعة شاملة ودقيقة لكافة السجلات والملفات الخاصة بالبطاقة التأمينية المذكورة وتقرير الحادث المرفق، 
      وعليه فإننا <strong style="color: #dc2626;">نُبدي اعتراضنا الرسمي وعدم قبولنا للمطالبة وطلب التسوية الودية المقدم</strong>، وذلك للأسباب الجوهرية الآتية:
    </p>

    <div class="rejection-box">
      <div class="rejection-title">⚠️ الأسباب الفنية والقانونية الجوهرية المبررة للاعتراض والرفض:</div>
      <ul class="rejection-list">
        ${reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
      </ul>
      ${additionalNotes}
    </div>

    <p>
      <strong>وعليه،</strong> نرجو منكم التكرم بمخاطبة الطرف الآخر (المكتب الموحد بدولة الحادث) وإفادتهم 
      <strong>برفضنا القاطع للمطالبة والتسوية بالشكل الحالي، وتجميد كافة إجراءات الملف</strong> 
      لحين تقديم المستندات القانونية والأصلية المؤيدة لصحة المطالبة وثبوت المسؤولية المدنية بشكل لا يدع مجالاً للشك.
    </p>

    <div style="background: #fff1f2; border: 1.5px solid #fecdd3; border-right: 4px solid #e11d48; border-radius: 7px; padding: 7px 12px; margin: 8px 0; font-weight: 700; color: #be123c; font-size: 11.5px; line-height: 1.7;">
      تأكيداً على رغبة الشركة بعدم تسوية هذه المطالبة ودياً وإحالتها إلى القضاء التونسي المختص للفصل فيها قضائياً طبقاً لأحكام اتفاقية المكاتب العربية الموحدة.
    </div>

    <p style="font-weight: 800; color: #0f172a; margin-top: 10px; font-size: 13.5px; text-align: center;">
      وتفضلوا بقبول فائق الاحترام والتقدير،،،
    </p>
  `;

  const html = generateOfficialLetterHtml({
    title: 'اعتراض رسمي على مطالبة تأمينية',
    refNumber,
    letterDate: currentDate,
    subject: `اعتراض رسمي على مطالبة رقم (${claim.claim_number || '2025/2'}) ورفض مقترح التسوية الودية`,
    claim,
    bodyHtml
  });

  openPrintWindow(html);
}
