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
  const signatoryTitle = req.signatory_title || 'مدير الشؤون الإدارية';
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
          margin: 10mm 15mm 12mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
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

        /* حاوية الورقة الرسمية A4 */
        .paper-container {
          width: 210mm;
          min-height: 297mm;
          margin: 20px auto;
          background: #ffffff;
          padding: 16mm 20mm 16mm 20mm;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35);
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* الإطار المزخرف الكلاسيكي المشابه للأصل */
        .ornate-border-top {
          width: 100%;
          border-top: 3px double #0f172a;
          border-bottom: 1px solid #0f172a;
          padding: 4px 0;
          margin-bottom: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
          letter-spacing: 5px;
          font-size: 14px;
          color: #0f172a;
        }

        /* الترويسة الرئيسية للشركة */
        .official-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 10px;
          border-bottom: 2px solid #0f172a;
          margin-bottom: 22px;
        }

        .header-company-info {
          flex: 1;
        }
        .company-name-ar {
          font-size: 26px;
          font-weight: 900;
          color: #091e3a;
          margin: 0;
          line-height: 1.2;
          font-family: 'Amiri', serif;
        }
        .company-name-en {
          font-size: 13px;
          font-weight: 800;
          color: #0284c7;
          margin-top: 2px;
          letter-spacing: 0.8px;
          font-family: 'Cairo', sans-serif;
        }
        .company-meta-line {
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          margin-top: 4px;
          line-height: 1.4;
          font-family: 'Cairo', sans-serif;
        }

        .header-logo-box {
          width: 100px;
          height: 100px;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 15px;
        }
        .header-logo-box img {
          max-width: 95px;
          max-height: 95px;
          object-fit: contain;
        }

        /* التاريخ والرقم الإشاري */
        .header-meta-box {
          text-align: right;
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.8;
          min-width: 190px;
          font-family: 'Amiri', serif;
        }
        .meta-row {
          display: flex;
          gap: 6px;
        }
        .meta-lbl {
          font-weight: 900;
          color: #0f172a;
        }
        .meta-val {
          font-weight: 900;
          color: #091e3a;
        }

        /* المخاطبة والموضوع */
        .recipient-box {
          margin-top: 15px;
          margin-bottom: 20px;
        }
        .addressed-to {
          font-size: 18px;
          font-weight: 900;
          color: #091e3a;
          margin: 0 0 16px 0;
          text-decoration: none;
        }
        .subject-line {
          text-align: center;
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          margin: 18px 0;
          text-decoration: underline;
          text-underline-offset: 6px;
          text-decoration-thickness: 1.5px;
        }
        .salutation {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 22px;
        }

        /* نص الخطاب الرسمي مطابق للأصل */
        .letter-content {
          font-size: 17px;
          line-height: 2.3;
          color: #0f172a;
          text-align: justify;
          margin-bottom: 35px;
        }
        .letter-content p {
          margin: 0 0 16px 0;
          text-indent: 20px;
        }
        .highlight-bold {
          font-weight: 900;
          color: #091e3a;
        }

        /* الخاتمة والسلام */
        .closing-section {
          text-align: center;
          margin: 30px 0 45px 0;
          font-size: 16px;
          font-weight: 800;
          line-height: 1.9;
        }
        .closing-section .salam {
          font-size: 17px;
          font-weight: 900;
          margin-top: 6px;
          letter-spacing: 1px;
        }

        /* قسم التواقيع والأختام (مطابق للورقة) */
        .signatures-area {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 20px;
          margin-bottom: 25px;
          padding: 0 10px;
        }

        /* ختم هيئة الإشراف (استلام الوارد) */
        .authority-stamp-box {
          width: 250px;
          border: 2px solid #2563eb;
          border-radius: 8px;
          padding: 10px 14px;
          color: #1d4ed8;
          font-family: 'Amiri', serif;
          background: rgba(37, 99, 235, 0.02);
          position: relative;
        }
        .authority-stamp-title {
          font-size: 14px;
          font-weight: 900;
          text-align: center;
          border-bottom: 1.5px solid #2563eb;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }
        .authority-stamp-sub {
          font-size: 13px;
          font-weight: 800;
          text-align: center;
          margin-bottom: 6px;
          color: #1e40af;
        }
        .authority-stamp-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        /* توقيع وختم شركة المدار (مدير الشؤون الإدارية) */
        .company-signature-box {
          text-align: center;
          width: 260px;
          position: relative;
        }
        .company-signature-role {
          font-size: 17px;
          font-weight: 900;
          color: #091e3a;
          margin-bottom: 12px;
        }
        .stamp-and-sig-wrapper {
          position: relative;
          height: 110px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .company-seal-svg {
          width: 105px;
          height: 105px;
          opacity: 0.88;
        }
        .handwritten-sig {
          position: absolute;
          width: 160px;
          height: 60px;
          top: 25px;
          left: 50px;
          transform: rotate(-8deg);
          pointer-events: none;
        }
        .company-signature-name {
          font-size: 16px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 6px;
        }

        /* التذييل الرسمي السفلي */
        .official-footer {
          border-top: 1.5px solid #0f172a;
          padding-top: 8px;
          font-size: 10.5px;
          font-family: 'Cairo', sans-serif;
          color: #334155;
          text-align: center;
          line-height: 1.6;
        }
        .footer-line-1 {
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 2px;
        }
        .footer-line-2 {
          font-weight: 600;
          direction: ltr;
          display: flex;
          justify-content: center;
          gap: 15px;
          flex-wrap: wrap;
        }

        /* إخفاء عناصر التحكم عند الطباعة */
        @media print {
          body {
            background: #ffffff !important;
          }
          .screen-toolbar {
            display: none !important;
          }
          .paper-container {
            margin: 0 !important;
            padding: 10mm 15mm !important;
            box-shadow: none !important;
            min-height: 280mm !important;
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

      <!-- الصفحة الرسمية A4 -->
      <div class="paper-container">
        <div>
          <!-- الترويسة المزخرفة -->
          <div class="official-header">
            <!-- اليمين: التاريخ والرقم الإشاري -->
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

            <!-- الشعار الرسمي في المنتصف -->
            <div class="header-logo-box">
              <img src="/img/logo.png" onerror="this.src='/img/official_logo.PNG'; this.onerror=null;" alt="المدار الليبي للتأمين" />
            </div>

            <!-- اليسار: اسم الشركة ورأس المال والسجل التجاري -->
            <div class="header-company-info" style="text-align: left; direction: ltr;">
              <div class="company-name-ar" style="direction: rtl; text-align: left;">شركة المدار الليبي للتأمين</div>
              <div class="company-name-en">ALMADAR LIBYAN INSURANCE</div>
              <div class="company-meta-line" style="direction: rtl; text-align: left;">
                رأس مال الشركة (10) مليون د.ل / سجل تجاري رقم (8748)<br>
                <span style="direction: ltr; font-size: 10px;">EQUITY CAPITAL (10) MILLION L.Y.D — COMMERCIAL REG (8748)</span>
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

        <!-- الجزء السفلي: التواقيع والأختام والتذييل الرسمي -->
        <div>
          <div class="signatures-area">
            <!-- اليمين: ختم استلام الوارد لهيئة الإشراف على التأمين -->
            <div class="authority-stamp-box">
              <div class="authority-stamp-title">هيئة الإشراف على التأمين</div>
              <div class="authority-stamp-sub">إسـتـلام الـوارد</div>
              <div class="authority-stamp-row">
                <span>التاريخ:</span>
                <span style="letter-spacing: 2px;">..... / ..... / 2026م</span>
              </div>
              <div class="authority-stamp-row">
                <span>اسم الموظف:</span>
                <span>......................................</span>
              </div>
              <div class="authority-stamp-row">
                <span>التوقيع:</span>
                <span>......................................</span>
              </div>
            </div>

            <!-- اليسار: توقيع وختم مدير الشؤون الإدارية لشركة المدار -->
            <div class="company-signature-box">
              <div class="company-signature-role">${signatoryTitle}</div>
              <div class="stamp-and-sig-wrapper">
                <!-- رسم الختم الرسمي للشركة المعتمد للشؤون الإدارية -->
                <svg class="company-seal-svg" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="92" fill="none" stroke="#091e3a" stroke-width="3.5" stroke-dasharray="6,3" />
                  <circle cx="100" cy="100" r="84" fill="none" stroke="#091e3a" stroke-width="2" />
                  <circle cx="100" cy="100" r="54" fill="none" stroke="#091e3a" stroke-width="1.5" />
                  
                  <!-- نصوص الختم الدائرية -->
                  <path id="curveTop" d="M 30,100 A 70,70 0 0,1 170,100" fill="none" />
                  <text font-size="11.5" font-weight="900" fill="#091e3a" font-family="'Cairo', sans-serif">
                    <textPath href="#curveTop" startOffset="50%" text-anchor="middle">
                      شركة المدار الليبي للتأمين
                    </textPath>
                  </text>

                  <path id="curveBottom" d="M 170,100 A 70,70 0 0,1 30,100" fill="none" />
                  <text font-size="9.5" font-weight="800" fill="#091e3a" font-family="'Cairo', sans-serif">
                    <textPath href="#curveBottom" startOffset="50%" text-anchor="middle">
                      ALMADAR LIBYAN INSURANCE
                    </textPath>
                  </text>

                  <!-- المركز: الشؤون الإدارية -->
                  <text x="100" y="93" font-size="11" font-weight="900" fill="#091e3a" text-anchor="middle" font-family="'Amiri', serif">الشؤون الإدارية</text>
                  <text x="100" y="108" font-size="8.5" font-weight="800" fill="#091e3a" text-anchor="middle" font-family="'Cairo', sans-serif">Administration</text>
                  <circle cx="100" cy="120" r="4" fill="#091e3a" />
                </svg>

                <!-- توقيع يدوي انسيابي -->
                <svg class="handwritten-sig" viewBox="0 0 160 60">
                  <path d="M 15 35 Q 35 10 55 40 T 95 20 Q 120 45 145 25" fill="none" stroke="#091e3a" stroke-width="2.2" stroke-linecap="round" />
                  <path d="M 40 45 Q 80 52 130 42" fill="none" stroke="#091e3a" stroke-width="1.8" stroke-linecap="round" />
                </svg>
              </div>
              <div class="company-signature-name">${signatoryName}</div>
            </div>
          </div>

          <!-- التذييل الرسمي المعتمد -->
          <div class="official-footer">
            <div class="footer-line-1">
              الإدارة العامة: ليبيا — طرابلس &nbsp;|&nbsp; Public Administration: Libya. Tripoli
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
