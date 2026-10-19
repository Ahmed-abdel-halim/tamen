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
          overflow: hidden;
        }

        /* ─── الترويسة الرسمية — HTML مبني بالكامل يطابق الأصل تماماً ─── */
        .official-header {
          width: calc(100% + 36mm);
          margin-right: -18mm;
          margin-left: -18mm;
          margin-top: -12mm;
          border-bottom: 2.5px solid #111;
          margin-bottom: 10px;
          background: #fff;
          overflow: hidden;
        }
        .letterhead-box {
          position: relative;
          width: 100%;
          border: 2px solid #111;
          border-bottom: none;
          background: #fff;
          padding: 4px 0 6px 0;
          overflow: hidden;
        }
        /* الخط المزخرف العلوي */
        .zigzag-top, .zigzag-bottom {
          width: 100%;
          height: 10px;
          display: block;
          overflow: hidden;
          line-height: 0;
        }
        .zigzag-top svg, .zigzag-bottom svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        /* قسم المحتوى الداخلي */
        .letterhead-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 2px 8px 4px 8px;
          position: relative;
        }
        /* النص العربي الكبير على اليسار */
        .lh-side-ar {
          font-family: 'Amiri', 'Traditional Arabic', serif;
          font-size: 36px;
          font-weight: 900;
          color: #111;
          line-height: 1;
          white-space: nowrap;
          flex-shrink: 0;
          width: 90px;
          text-align: center;
          letter-spacing: -1px;
        }
        /* المركز */
        .lh-center {
          flex: 1;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1px;
          padding: 0 4px;
        }
        .lh-globe {
          width: 34px;
          height: 34px;
          margin: 0 auto 1px auto;
          display: block;
        }
        .lh-title-ar {
          font-family: 'Amiri', 'Traditional Arabic', serif;
          font-size: 22px;
          font-weight: 900;
          color: #111;
          letter-spacing: 2px;
          line-height: 1.1;
          white-space: nowrap;
        }
        .lh-title-en {
          font-family: Arial, 'Helvetica Neue', sans-serif;
          font-size: 12px;
          font-weight: 900;
          color: #111;
          letter-spacing: 3px;
          line-height: 1.2;
        }
        .lh-sub-ar {
          font-family: 'Cairo', Arial, sans-serif;
          font-size: 8px;
          color: #333;
          line-height: 1.4;
          direction: rtl;
        }
        .lh-sub-en {
          font-family: Arial, sans-serif;
          font-size: 7px;
          color: #333;
          letter-spacing: 0.5px;
          line-height: 1.4;
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
          <!-- الترويسة الرسمية مبنية بالكامل بدون صورة خارجية -->
          <div class="official-header">
            <div class="letterhead-box">
              <!-- زخرفة علوية -->
              <div class="zigzag-top">
                <svg viewBox="0 0 1200 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="0,10 7,0 14,10 21,0 28,10 35,0 42,10 49,0 56,10 63,0 70,10 77,0 84,10 91,0 98,10 105,0 112,10 119,0 126,10 133,0 140,10 147,0 154,10 161,0 168,10 175,0 182,10 189,0 196,10 203,0 210,10 217,0 224,10 231,0 238,10 245,0 252,10 259,0 266,10 273,0 280,10 287,0 294,10 301,0 308,10 315,0 322,10 329,0 336,10 343,0 350,10 357,0 364,10 371,0 378,10 385,0 392,10 399,0 406,10 413,0 420,10 427,0 434,10 441,0 448,10 455,0 462,10 469,0 476,10 483,0 490,10 497,0 504,10 511,0 518,10 525,0 532,10 539,0 546,10 553,0 560,10 567,0 574,10 581,0 588,10 595,0 602,10 609,0 616,10 623,0 630,10 637,0 644,10 651,0 658,10 665,0 672,10 679,0 686,10 693,0 700,10 707,0 714,10 721,0 728,10 735,0 742,10 749,0 756,10 763,0 770,10 777,0 784,10 791,0 798,10 805,0 812,10 819,0 826,10 833,0 840,10 847,0 854,10 861,0 868,10 875,0 882,10 889,0 896,10 903,0 910,10 917,0 924,10 931,0 938,10 945,0 952,10 959,0 966,10 973,0 980,10 987,0 994,10 1001,0 1008,10 1015,0 1022,10 1029,0 1036,10 1043,0 1050,10 1057,0 1064,10 1071,0 1078,10 1085,0 1092,10 1099,0 1106,10 1113,0 1120,10 1127,0 1134,10 1141,0 1148,10 1155,0 1162,10 1169,0 1176,10 1183,0 1190,10 1200,0" stroke="#111" stroke-width="1.5" fill="none"/>
                </svg>
              </div>

              <!-- المحتوى الداخلي -->
              <div class="letterhead-inner">
                <!-- جانب أيسر: كلمة للتأمين كزخرفة -->
                <div class="lh-side-ar" style="color:#111;font-size:38px;">للتأمين</div>
                
                <!-- المركز الرئيسي -->
                <div class="lh-center">
                  <!-- كرة الأرض (SVG مدمج) -->
                  <svg class="lh-globe" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="30" cy="30" r="26" stroke="#111" stroke-width="2.5" fill="none"/>
                    <ellipse cx="30" cy="30" rx="13" ry="26" stroke="#111" stroke-width="2" fill="none"/>
                    <ellipse cx="30" cy="30" rx="26" ry="10" stroke="#111" stroke-width="1.5" fill="none"/>
                    <line x1="4" y1="30" x2="56" y2="30" stroke="#111" stroke-width="1.5"/>
                    <line x1="30" y1="4" x2="30" y2="56" stroke="#111" stroke-width="1.5"/>
                    <circle cx="30" cy="30" r="4" stroke="#111" stroke-width="1.5" fill="#111"/>
                  </svg>
                  <div class="lh-title-ar">المَدَارُ اللِيبِيُّ للتّأمين</div>
                  <div class="lh-title-en">ALMADAR LIBYAN INSURANCE</div>
                  <div class="lh-sub-ar">(8748) رأس مال الشركة (10) مليون د.ل / سجل تجاري رقم</div>
                  <div class="lh-sub-en">EQUITY CAPITAL (10) MILLION L.Y.D – COMMERCIAL REG</div>
                </div>
                
                <!-- جانب أيمن: كلمة المدار كزخرفة -->
                <div class="lh-side-ar" style="color:#111;font-size:38px;">المدار</div>
              </div>

              <!-- زخرفة سفلية -->
              <div class="zigzag-bottom">
                <svg viewBox="0 0 1200 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="0,0 7,10 14,0 21,10 28,0 35,10 42,0 49,10 56,0 63,10 70,0 77,10 84,0 91,10 98,0 105,10 112,0 119,10 126,0 133,10 140,0 147,10 154,0 161,10 168,0 175,10 182,0 189,10 196,0 203,10 210,0 217,10 224,0 231,10 238,0 245,10 252,0 259,10 266,0 273,10 280,0 287,10 294,0 301,10 308,0 315,10 322,0 329,10 336,0 343,10 350,0 357,10 364,0 371,10 378,0 385,10 392,0 399,10 406,0 413,10 420,0 427,10 434,0 441,10 448,0 455,10 462,0 469,10 476,0 483,10 490,0 497,10 504,0 511,10 518,0 525,10 532,0 539,10 546,0 553,10 560,0 567,10 574,0 581,10 588,0 595,10 602,0 609,10 616,0 623,10 630,0 637,10 644,0 651,10 658,0 665,10 672,0 679,10 686,0 693,10 700,0 707,10 714,0 721,10 728,0 735,10 742,0 749,10 756,0 763,10 770,0 777,10 784,0 791,10 798,0 805,10 812,0 819,10 826,0 833,10 840,0 847,10 854,0 861,10 868,0 875,10 882,0 889,10 896,0 903,10 910,0 917,10 924,0 931,10 938,0 945,10 952,0 959,10 966,0 973,10 980,0 987,10 994,0 1001,10 1008,0 1015,10 1022,0 1029,10 1036,0 1043,10 1050,0 1057,10 1064,0 1071,10 1078,0 1085,10 1092,0 1099,10 1106,0 1113,10 1120,0 1127,10 1134,0 1141,10 1148,0 1155,10 1162,0 1169,10 1176,0 1183,10 1190,0 1200,10" stroke="#111" stroke-width="1.5" fill="none"/>
                </svg>
              </div>
            </div>
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
