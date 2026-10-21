// src/utils/printCompulsoryDocumentRequestLetter.ts
// طباعة الخطاب الرسمي المعتمد لتزويد وثائق التأمين الإجباري الموجه لهيئة الإشراف على التأمين
// معتمد بالكامل على قالب الورقة المعنونة الرسمية لشركة المدار الليبي للتأمين (معنونه_المدار_الليبي.docx)
import { ALMADAR_LETTERHEAD_BANNER } from './almadarBannerBase64';

export interface CompulsoryDocumentRequestData {
  id: number;
  request_number: string;
  reference_number?: string | null;
  request_date: string;
  documents_count: number;
  fee_per_document: number;
  total_amount: number;
  amount_in_words?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
  payment_receipt_image?: string | null;
  attachments?: string[] | null;
  attachments_list?: string[] | null;
  status: 'draft' | 'pending_approval' | 'pending_payment' | 'sent' | 'received' | 'canceled';
  signatory_name?: string | null;
  signatory_title?: string | null;
  subject?: string | null;
  addressed_to?: string | null;
  received_quantity?: number | null;
  received_date?: string | null;
  serial_from?: string | null;
  serial_to?: string | null;
  store_item_id?: number | null;
  store_item?: { id: number; name: string; unit: string } | null;
  warehouse_location?: string | null;
  notes?: string | null;
}

export function printCompulsoryDocumentRequestLetter(req: CompulsoryDocumentRequestData) {
  const printWindow = window.open('', '_blank', 'width=950,height=1100');
  if (!printWindow) {
    alert('يرجى السماح بالنوافذ المنبثقة (Popups) لمعاينة وطباعة الخطاب الرسمي.');
    return;
  }

  // تنسيق التاريخ (مثال: 3 / 9 / 2026م)
  let formattedDate = req.request_date;
  try {
    const d = new Date(req.request_date);
    if (!isNaN(d.getTime())) {
      formattedDate = `${d.getDate()} / ${d.getMonth() + 1} / ${d.getFullYear()}م`;
    }
  } catch (e) {}

  const refNumber = req.reference_number || req.request_number || 'أ / 9 - 2026';
  const addressedTo = req.addressed_to || 'السيد / مدير عام هيئة الإشراف على التأمين';
  const subject = req.subject || 'الموضوع / طلب تزويد وثائق التأمين الاجباري';
  const signatoryName = req.signatory_name || 'محمد حوشي';

  // ضبط المسمى الوظيفي للموقع
  let signatoryTitle = req.signatory_title || 'مدير الشؤون الإدارية';
  if (signatoryTitle === 'مدير الإدارية' || signatoryTitle === 'مدير الادارية' || !signatoryTitle) {
    signatoryTitle = 'مدير الشؤون الإدارية';
  }

  const totalAmountFormatted = Number(req.total_amount || 0).toLocaleString();
  const words = req.amount_in_words || 'ألف دينار ليبي';
  const docsCount = req.documents_count || 0;

  // رابط صورة الورقة المعنونة الرسمية الكاملة المأخوذة من معنونه_المدار_الليبي.docx
  const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';
  const letterheadUrl = origin ? `${origin}/img/almadar_official_letterhead.png` : '/img/almadar_official_letterhead.png';
  const bannerUrl = origin ? `${origin}/img/almadar_letterhead_banner_new.png` : '/img/almadar_letterhead_banner_new.png';

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>خطاب رسمي — طلب تزويد وثائق التأمين الإجباري (${refNumber})</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @page {
          size: A4 portrait;
          margin: 0;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #334155;
          font-family: 'Amiri', 'Traditional Arabic', 'Times New Roman', serif;
          direction: rtl;
          color: #0f172a;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── شريط التحكم بالشاشة ─── */
        .screen-toolbar {
          position: sticky;
          top: 0;
          background: #091e3a;
          color: #fff;
          padding: 10px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.35);
          z-index: 9999;
          font-family: 'Cairo', sans-serif;
        }
        .toolbar-title {
          font-size: 13.5px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .toolbar-badge {
          background: #fcd34d;
          color: #091e3a;
          padding: 3px 9px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 900;
        }
        .toolbar-options {
          display: flex;
          align-items: center;
          gap: 14px;
          background: rgba(255, 255, 255, 0.12);
          padding: 5px 14px;
          border-radius: 8px;
        }
        .mode-label {
          font-size: 12.5px;
          font-weight: 700;
          color: #f1f5f9;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          user-select: none;
        }
        .mode-label input {
          cursor: pointer;
          accent-color: #10b981;
        }
        .toolbar-actions {
          display: flex;
          gap: 10px;
        }
        .btn-action {
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: transform 0.15s, background 0.15s;
          font-family: 'Cairo', sans-serif;
        }
        .btn-print {
          background: #10b981;
          color: #ffffff;
        }
        .btn-print:hover { background: #059669; }
        .btn-close {
          background: #64748b;
          color: #ffffff;
        }
        .btn-close:hover { background: #475569; }

        /* ─── حاوية الورقة الرسمية القياسية A4 (210mm x 297mm) ─── */
        .paper-container {
          width: 210mm;
          height: 297mm;
          max-height: 297mm;
          margin: 15px auto;
          background-color: #ffffff;
          box-shadow: 0 10px 30px rgba(0,0,0,0.45);
          position: relative;
          overflow: hidden;
        }

        /* ─── 1. النمط الافتراضي المعتمد: الورقة المعنونة الكاملة من القالب ─── */
        .paper-container.full-letterhead-mode {
          background-image: url('${letterheadUrl}');
          background-size: 210mm 297mm;
          background-position: top center;
          background-repeat: no-repeat;
        }
        .full-letterhead-mode .banner-only-header,
        .full-letterhead-mode .banner-only-footer {
          display: none !important;
        }

        /* صندوق التاريخ والرقم الإشاري - جهة اليسار في الفراغ المخصص له تحت الترويسة */
        .full-letterhead-mode .letter-meta-strip {
          position: absolute;
          top: 48mm;
          left: 14mm;
          z-index: 10;
        }
        .full-letterhead-mode .header-meta-box {
          text-align: right;
          min-width: 175px;
          font-family: 'Amiri', serif;
          background: rgba(255, 255, 255, 0.82);
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #94a3b8;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        /* مساحة جسم الخطاب داخل الإطار المعنون بالكامل */
        .full-letterhead-mode .letter-body-area {
          position: absolute;
          top: 72mm;
          right: 20mm;
          left: 20mm;
          bottom: 38mm;
          z-index: 10;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* ─── 2. النمط البديل: الترويسة العلوية فقط (للطباعة على ورق معنون مسبقاً) ─── */
        .paper-container.banner-only-mode {
          background: #ffffff;
          padding: 0 18mm 12mm 18mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .banner-only-mode .banner-only-header {
          display: block;
          width: calc(100% + 36mm);
          margin-right: -18mm;
          margin-left: -18mm;
          margin-top: 0;
          border-bottom: 2px solid #0f172a;
          margin-bottom: 8px;
        }
        .banner-only-mode .banner-only-header-img {
          width: 100%;
          height: 108px;
          object-fit: fill;
          display: block;
        }
        .banner-only-mode .banner-only-footer {
          display: block;
          border-top: 1.5px solid #0f172a;
          padding-top: 8px;
          font-size: 10px;
          font-family: 'Cairo', sans-serif;
          color: #334155;
          text-align: center;
          line-height: 1.6;
        }
        .banner-only-mode .letter-meta-strip {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 8px;
        }
        .banner-only-mode .header-meta-box {
          text-align: right;
          min-width: 180px;
          font-family: 'Amiri', serif;
          background: #f8fafc;
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
        }
        .banner-only-mode .letter-body-area {
          position: static;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
        }

        /* ─── تنسيق عناصر نص الخطاب المشتركة ─── */
        .meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          font-size: 13.5px;
          line-height: 1.6;
        }
        .meta-lbl {
          font-weight: 900;
          color: #0f172a;
        }
        .meta-val {
          font-weight: 900;
          color: #091e3a;
          font-family: 'Cairo', sans-serif;
          font-size: 12.5px;
        }

        /* المخاطبة */
        .recipient-box {
          margin-top: 2px;
          margin-bottom: 8px;
        }
        .addressed-to {
          font-size: 18px;
          font-weight: 900;
          color: #091e3a;
          margin: 0;
          line-height: 1.4;
        }

        /* الموضوع */
        .subject-line {
          text-align: center;
          font-size: 18.5px;
          font-weight: 900;
          color: #0f172a;
          margin: 10px 0 14px 0;
          text-decoration: underline;
          text-underline-offset: 6px;
          text-decoration-thickness: 1.5px;
        }

        /* التحية */
        .salutation {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
        }

        /* نص الخطاب */
        .letter-content {
          font-size: 16.5px;
          line-height: 2.15;
          color: #0f172a;
          text-align: justify;
        }
        .letter-content p {
          margin: 0 0 10px 0;
          text-indent: 18px;
        }
        .highlight-bold {
          font-weight: 900;
          color: #091e3a;
        }

        /* الخاتمة والسلام */
        .closing-section {
          text-align: center;
          margin: 14px 0 10px 0;
          font-size: 15.5px;
          font-weight: 800;
          line-height: 1.8;
        }
        .closing-section .salam {
          font-size: 17px;
          font-weight: 900;
          margin-top: 4px;
          letter-spacing: 1px;
        }

        /* قسم التوقيع جهة اليسار */
        .signatures-area {
          display: flex;
          justify-content: flex-end; /* لجهة اليسار في RTL */
          padding-left: 20px;
          margin-top: 6px;
          margin-bottom: 4px;
        }
        .company-signature-box {
          text-align: center;
          min-width: 200px;
          display: inline-flex;
          flex-direction: column;
          align-items: center;
        }
        .company-signature-role {
          font-size: 17px;
          font-weight: 900;
          color: #091e3a;
          line-height: 1.25;
          margin: 0;
          padding: 0;
        }
        .signature-manual-space {
          height: 4px; /* مسافة متقاربة ومضمومة */
        }
        .company-signature-name {
          font-size: 16.5px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.25;
          margin: 0;
          padding: 0;
        }

        /* ─── إعدادات الطباعة الدقيقة وضمان صفحة واحدة A4 ─── */
        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          .screen-toolbar {
            display: none !important;
          }
          .paper-container {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            height: 100% !important;
            min-height: auto !important;
            max-height: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          .full-letterhead-mode {
            background-size: 210mm 297mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .full-letterhead-mode .header-meta-box {
            background: transparent !important;
            border: 1px solid #94a3b8 !important;
          }
        }
      </style>
    </head>
    <body>
      <!-- شريط أدوات الشاشة للتحكم والطباعة -->
      <div class="screen-toolbar">
        <div class="toolbar-title">
          <span>📄 خطاب رسمي موجه إلى هيئة الإشراف على التأمين</span>
          <span class="toolbar-badge">إشاري: ${refNumber}</span>
          <span style="font-size:12px; color:#cbd5e1;">(عدد ${docsCount} وثيقة — بقيمة ${totalAmountFormatted} د.ل)</span>
        </div>
        <div class="toolbar-options">
          <label class="mode-label" title="استخدام ورقة الشركة الرسمية المعنونة بالكامل (المأخوذة من معنونه_المدار_الليبي.docx) مع الإطار والترويسة والعلامة المائية والتذييل">
            <input type="radio" name="printMode" value="full" checked onchange="setPrintMode('full')">
            الورقة المعنونة الرسمية الكاملة (المعتمدة)
          </label>
          <label class="mode-label" title="استخدام الترويسة العلوية الجديدة والتذييل فقط (للطباعة على ورق مروس ومطبوع مسبقاً)">
            <input type="radio" name="printMode" value="banner" onchange="setPrintMode('banner')">
            الترويسة العلوية فقط
          </label>
        </div>
        <div class="toolbar-actions">
          <button class="btn-action btn-print" onclick="window.print()">
            🖨️ طباعة الخطاب الرسمي
          </button>
          <button class="btn-action btn-close" onclick="window.close()">
            ✕ إغلاق
          </button>
        </div>
      </div>

      <!-- حاوية ورقة الخطاب الرسمي A4 -->
      <div id="paperContainer" class="paper-container full-letterhead-mode">
        <!-- ترويسة نمط البانر فقط (تظهر عند اختيار نمط الترويسة العلوية فقط) -->
        <div class="banner-only-header">
          <img 
            src="${bannerUrl}" 
            alt="ترويسة المدار الليبي للتأمين الرسمية" 
            class="banner-only-header-img"
            onerror="this.src='${ALMADAR_LETTERHEAD_BANNER}'"
          />
        </div>

        <!-- شريط التاريخ والرقم الإشاري (جهة اليسار تحت الترويسة) -->
        <div class="letter-meta-strip">
          <div class="header-meta-box">
            <div class="meta-row">
              <span class="meta-lbl">التاريخ :</span>
              <span class="meta-val">${formattedDate}</span>
            </div>
            <div class="meta-row">
              <span class="meta-lbl">الرقم الإشاري :</span>
              <span class="meta-val">${refNumber}</span>
            </div>
          </div>
        </div>

        <!-- جسم ومحتوى الخطاب الرسمي -->
        <div class="letter-body-area">
          <div class="content-top-part">
            <!-- المخاطبة -->
            <div class="recipient-box">
              <h2 class="addressed-to">${addressedTo}</h2>
            </div>

            <!-- الموضوع -->
            <div class="subject-line">
              ${subject}
            </div>

            <!-- التحية -->
            <div class="salutation">
              تحية طيبة و بعد ،،،
            </div>

            <!-- نص الخطاب الرسمي المطابق تماماً للوثيقة المعتمدة -->
            <div class="letter-content">
              <p>
                تهديكم شركة المدار الليبي للتأمين المساهمة المتمثلة في مجلس إدارتها أطيب التحيات.
              </p>
              <p>
                نُفيدكم بأنه تمت إحالة مبلغ وقدره <span class="highlight-bold">( ${totalAmountFormatted} )</span> ${words} ، وذلك لغرض تزويدنا بوثائق التأمين الإجباري من المنظومة .
              </p>
              <p>
                عليه نأمل منكم التكرم باتخاذ ما يلزم والتوجيه بتزويدنا بوثائق التأمين الإجباري المطلوبة في أقرب وقت .
              </p>
            </div>

            <!-- الخاتمة والسلام -->
            <div class="closing-section">
              <div>وتفضلوا بقبول فائق الاحترام والتقدير</div>
              <div class="salam">والســــــلام عليكــــــم</div>
            </div>
          </div>

          <!-- قسم التوقيع الرسمي (جهة اليسار) -->
          <div class="content-bottom-part">
            <div class="signatures-area">
              <div class="company-signature-box">
                <div class="company-signature-role">${signatoryTitle}</div>
                <div class="signature-manual-space"></div>
                <div class="company-signature-name">${signatoryName}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- تذييل نمط البانر فقط -->
        <div class="banner-only-footer">
          <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">
            الإدارة العامة: ليبيا – طرابلس - حي دمشق &nbsp;|&nbsp; Public Administration: Libya. Tripoli. hy demashk.
          </div>
          <div style="direction: ltr; display: flex; justify-content: center; gap: 15px; font-weight: 600;">
            <span>Website: www.mli.ly</span> &bull;
            <span>Email: info@mli.ly</span> &bull;
            <span>Mobile: 00218920003366</span> &bull;
            <span>P.O. Box: (83410)</span>
          </div>
        </div>
      </div>

      <script>
        function setPrintMode(mode) {
          var container = document.getElementById('paperContainer');
          if (mode === 'banner') {
            container.className = 'paper-container banner-only-mode';
          } else {
            container.className = 'paper-container full-letterhead-mode';
          }
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
