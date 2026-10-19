// src/utils/printCompulsoryDocumentRequestLetter.ts
// طباعة الخطاب الرسمي المعتمد لتزويد وثائق التأمين الإجباري الموجه لهيئة الإشراف على التأمين

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

  // Format Date (e.g. 27 / 9 / 2026م)
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

  // Normalize signatory title to 'مدير الشؤون الإدارية'
  let signatoryTitle = req.signatory_title || 'مدير الشؤون الإدارية';
  if (signatoryTitle === 'مدير الإدارية' || signatoryTitle === 'مدير الادارية' || !signatoryTitle) {
    signatoryTitle = 'مدير الشؤون الإدارية';
  }

  const totalAmountFormatted = Number(req.total_amount || 0).toLocaleString();
  const words = req.amount_in_words || 'ألف دينار ليبي';
  const docsCount = req.documents_count || 0;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>خطاب رسمي — طلب تزويد وثائق التأمين الإجباري (${refNumber})</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700;900&family=Cairo:wght@600;700;800;900&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 14mm 10mm 14mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0;
          padding: 0;
          font-family: 'Amiri', 'Traditional Arabic', 'Times New Roman', serif;
          color: #0f172a;
          background: #525659;
          direction: rtl;
        }

        /* شريط التحكم بالشاشة */
        .screen-toolbar {
          position: sticky;
          top: 0;
          background: #091e3a;
          color: #fff;
          padding: 12px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          z-index: 9999;
          font-family: 'Cairo', sans-serif;
        }
        .toolbar-title {
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .toolbar-badge {
          background: #fcd34d;
          color: #091e3a;
          padding: 3px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 900;
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
          background: #475569;
          color: #ffffff;
        }
        .btn-close:hover { background: #334155; }

        /* حاوية الورقة الرسمية A4 - صفحة واحدة بالكامل */
        .paper-container {
          width: 210mm;
          height: 296mm;
          max-height: 296mm;
          margin: 15px auto;
          background: #ffffff;
          padding: 12mm 18mm 12mm 18mm;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: visible; /* لا نقص الترويسة الممتدة للحواف */
        }
        /* نضمن أن ظل الورقة يظهر صحيحاً */
        .paper-container::before {
          content: '';
          position: absolute;
          inset: 0;
          background: #ffffff;
          z-index: -1;
        }

        /* ─── الترويسة الرسمية — مبنية بالكامل بـ HTML/CSS بدون صورة ─── */
        .official-header {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          padding-bottom: 0;
          border-bottom: 2.5px solid #0f172a;
          margin-bottom: 8px;
          width: calc(100% + 36mm);
          margin-right: -18mm;
          margin-left: -18mm;
          margin-top: -12mm;
          background: #fff;
          overflow: hidden;
        }
        /* الحد الزخرفي العلوي */
        .header-border-top {
          height: 9px;
          background: repeating-linear-gradient(
            90deg,
            #1a1a2e 0px, #1a1a2e 6px,
            #c8a94a 6px, #c8a94a 12px,
            #1a1a2e 12px, #1a1a2e 18px,
            #8b1a1a 18px, #8b1a1a 24px
          );
          opacity: 0.85;
        }
        /* منطقة المحتوى الرئيسي */
        .header-main-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 18mm;
          gap: 8px;
          background:
            radial-gradient(ellipse at 50% 50%, rgba(200,169,74,0.06) 0%, transparent 70%),
            #fff;
          direction: rtl;
        }
        /* نص شركة المدار - جهة اليمين */
        .header-company-name-ar {
          font-family: 'Amiri', 'Traditional Arabic', serif;
          font-size: 28px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.1;
          white-space: nowrap;
          letter-spacing: 1px;
        }
        /* اللوجو والنص الإنجليزي في الوسط */
        .header-center-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          flex-shrink: 0;
        }
        .header-logo-img {
          width: 64px;
          height: 64px;
          object-fit: contain;
        }
        .header-company-name-en {
          font-family: 'Cairo', sans-serif;
          font-size: 11.5px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: 2.5px;
          white-space: nowrap;
          text-transform: uppercase;
        }
        .header-reg-info {
          font-family: 'Cairo', sans-serif;
          font-size: 7px;
          color: #334155;
          letter-spacing: 0.5px;
          white-space: nowrap;
          text-align: center;
        }
        /* نص الشركة - جهة اليسار */
        .header-company-name-ar-left {
          font-family: 'Amiri', 'Traditional Arabic', serif;
          font-size: 13px;
          font-weight: 700;
          color: #1a1a2e;
          line-height: 1.5;
          text-align: left;
          direction: ltr;
          white-space: nowrap;
        }
        /* الحد الزخرفي السفلي */
        .header-border-bottom {
          height: 6px;
          background: linear-gradient(90deg,
            #8b1a1a 0%, #c8a94a 25%, #1a1a2e 50%, #c8a94a 75%, #8b1a1a 100%
          );
          opacity: 0.7;
        }

        /* شريط التاريخ والرقم الإشاري جهة اليسار أسفل الترويسة مباشرة */
        .letter-meta-strip {
          display: flex;
          justify-content: flex-end; /* محاذاة لجهة اليسار في نمط RTL */
          margin-bottom: 10px;
        }
        .header-meta-box {
          text-align: right;
          min-width: 185px;
          font-family: 'Amiri', serif;
          background: #f8fafc;
          padding: 5px 12px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
        }
        .meta-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          line-height: 1.65;
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

        /* ─── العلامة المائية في خلفية الخطاب (المدار الليبي للتأمين) ─── */
        .watermark-container {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 440px;
          max-width: 85%;
          opacity: 0.055;
          pointer-events: none;
          z-index: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          user-select: none;
        }
        .watermark-container img {
          width: 100%;
          height: auto;
          object-fit: contain;
          filter: grayscale(15%);
        }

        /* المخاطبة والموضوع */
        .recipient-box {
          margin-top: 6px;
          margin-bottom: 10px;
        }
        .addressed-to {
          font-size: 17.5px;
          font-weight: 900;
          color: #091e3a;
          margin: 0;
        }
        .subject-line {
          text-align: center;
          font-size: 17.5px;
          font-weight: 900;
          color: #0f172a;
          margin: 10px 0 12px 0;
          text-decoration: underline;
          text-underline-offset: 5px;
          text-decoration-thickness: 1.5px;
        }
        .salutation {
          font-size: 15.5px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 12px;
        }

        /* نص الخطاب الرسمي مطابق للأصل */
        .letter-content {
          font-size: 16.5px;
          line-height: 2.15;
          color: #0f172a;
          text-align: justify;
          margin-bottom: 18px;
        }
        .letter-content p {
          margin: 0 0 10px 0;
          text-indent: 16px;
        }
        .highlight-bold {
          font-weight: 900;
          color: #091e3a;
        }

        /* الخاتمة والسلام */
        .closing-section {
          text-align: center;
          margin: 12px 0 16px 0;
          font-size: 15.5px;
          font-weight: 800;
          line-height: 1.8;
        }
        .closing-section .salam {
          font-size: 16.5px;
          font-weight: 900;
          margin-top: 4px;
          letter-spacing: 1px;
        }

        /* ─── قسم التوقيع (مضموم على بعضه تماماً على جهة اليسار) ─── */
        .signatures-area {
          display: flex;
          justify-content: flex-end; /* محاذاة لجهة اليسار في نمط RTL */
          align-items: flex-start;
          padding-left: 25px;
          padding-right: 0;
          margin-top: 6px;
          margin-bottom: 10px;
          width: 100%;
        }
        .company-signature-box {
          text-align: center;
          min-width: 220px;
          margin-right: auto; /* يضمن دفع صندوق التوقيع لجهة اليسار */
          margin-left: 0;
        }
        .company-signature-role {
          font-size: 17px;
          font-weight: 900;
          color: #091e3a;
          margin-bottom: 1px;
          line-height: 1.2;
        }
        .signature-manual-space {
          height: 4px; /* مضمومين ومدمجين على بعض تماماً بدون فراغ كبير */
        }
        .company-signature-name {
          font-size: 16.5px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1.2;
        }

        /* التذييل الرسمي السفلي */
        .official-footer {
          border-top: 1.5px solid #0f172a;
          padding-top: 8px;
          font-size: 10px;
          font-family: 'Cairo', sans-serif;
          color: #334155;
          text-align: center;
          line-height: 1.6;
        }
        .footer-line-1 {
          font-weight: 700;
          color: #0f172a;
          margin-bottom: 3px;
        }
        .footer-line-2 {
          font-weight: 600;
          direction: ltr;
          display: flex;
          justify-content: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        /* إخفاء عناصر التحكم عند الطباعة وضمان صفحة واحدة فقط */
        @media print {
          html, body {
            background: #ffffff !important;
            height: 100% !important;
            overflow: hidden !important;
          }
          .screen-toolbar {
            display: none !important;
          }
          .paper-container {
            margin: 0 !important;
            padding: 8mm 12mm 8mm 12mm !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            height: 100% !important;
            min-height: auto !important;
            max-height: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          /* ضبط الترويسة عند الطباعة لتعويض padding الطباعة (12mm) */
          .official-header {
            width: calc(100% + 24mm) !important;
            margin-right: -12mm !important;
            margin-left: -12mm !important;
            margin-top: -8mm !important;
            border-bottom: 2px solid #0f172a !important;
          }
          .watermark-container {
            opacity: 0.055 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .watermark-container img {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .header-meta-box {
            background: transparent !important;
            border: 1px solid #94a3b8 !important;
          }
        }
      </style>
    </head>
    <body>
      <!-- شريط الطباعة العلوي للشاشة -->
      <div class="screen-toolbar">
        <div class="toolbar-title">
          <span>📄 خطاب رسمي موجه إلى هيئة الإشراف على التأمين</span>
          <span class="toolbar-badge">إشاري: ${refNumber}</span>
          <span style="font-size:12px; color:#cbd5e1;">(عدد ${docsCount} وثيقة — بقيمة ${totalAmountFormatted} د.ل)</span>
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

      <!-- الصفحة الرسمية A4 - صفحة واحدة -->
      <div class="paper-container">
        <!-- العلامة المائية الرسمية في الخلفية (المدار الليبي للتأمين) -->
        <div class="watermark-container">
          <img src="/img/logo.png" onerror="this.src='/img/official_logo.PNG'; this.onerror=null;" alt="المدار الليبي للتأمين" />
        </div>

        <div style="position: relative; z-index: 1;">
          <!-- الترويسة الرسمية — مبنية بالكامل HTML/CSS بدون صورة -->
          <div class="official-header">
            <div class="header-border-top"></div>
            <div class="header-main-content">
              <!-- اسم الشركة بالعربي — جهة اليمين -->
              <div class="header-company-name-ar">المدار الليبي للتأمين</div>
              <!-- اللوجو + الاسم الإنجليزي + السجل — في الوسط -->
              <div class="header-center-block">
                <img
                  src="${window.location.origin}/img/logo.png"
                  onerror="this.src='/img/official_logo.PNG'; this.onerror=null;"
                  alt="شعار المدار الليبي للتأمين"
                  class="header-logo-img"
                />
                <div class="header-company-name-en">ALMADAR LIBYAN INSURANCE</div>
                <div class="header-reg-info">SHARES: 83748 — EQUITY CAPITAL (10) MILLION L.Y.D — COMMERCIAL REG.</div>
              </div>
              <!-- نص يسار — عنوان مختصر -->
              <div class="header-company-name-ar-left">
                شركة مساهمة<br/>متفرقة<br/>طرابلس — ليبيا
              </div>
            </div>
            <div class="header-border-bottom"></div>
          </div>

          <!-- شريط التاريخ والرقم الإشاري جهة اليسار أسفل الخط الفاصل مباشرة -->
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

          <!-- نص الخطاب الرسمي المطابق تماماً للوثيقة الورقية المرفقة -->
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

        <!-- الجزء السفلي: التوقيع الرسمي والتذييل (التوقيع على جهة اليسار) -->
        <div style="position: relative; z-index: 1;">
          <div class="signatures-area">
            <!-- توقيع مدير الشؤون الإدارية (على جهة اليسار مع مساحة للتوقيع والختم الحي) -->
            <div class="company-signature-box">
              <div class="company-signature-role">${signatoryTitle}</div>
              <div class="signature-manual-space"></div>
              <div class="company-signature-name">${signatoryName}</div>
            </div>
          </div>

          <!-- التذييل الرسمي المعتمد -->
          <div class="official-footer">
            <div class="footer-line-1">
              الإدارة العامة: ليبيا &mdash; طرابلس &nbsp;|&nbsp; Public Administration: Libya. Tripoli
            </div>
            <div class="footer-line-2">
              <span>Website: www.mli.ly</span> &bull;
              <span>Email: info@mli.ly</span> &bull;
              <span>Mobile: 00218920003366</span> &bull;
              <span>P.O. Box: (83410)</span>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
