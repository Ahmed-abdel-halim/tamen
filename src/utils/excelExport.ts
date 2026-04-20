interface ExcelExportOptions {
  title: string;
  fileName?: string;
  columnCount: number;
  tableHeaders: string; // e.g. <tr height="40"><th width="200">Name</th></tr>
  tableBody: string; // e.g. <tr><td>Test</td></tr>
  summaryRight?: string;
  summaryLeft?: string;
}

export function exportToExcel(options: ExcelExportOptions) {
  const { title, fileName, columnCount, tableHeaders, tableBody, summaryRight, summaryLeft } = options;
  const printDate = new Date().toLocaleDateString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric' });
  
  const logoColspan = 2;
  const titleColspan = Math.max(1, columnCount - logoColspan);
  
  const summaryRightColspan = Math.floor(columnCount / 2);
  const summaryLeftColspan = Math.ceil(columnCount / 2);

  let tableHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>${title}</x:Name>
              <x:WorksheetOptions>
                <x:DisplayRightToLeft/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; width: 100%; font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; font-size: 14px; }
        th { background-color: #2563eb; color: #ffffff; font-weight: bold; padding: 15px; border: 1px solid #1e40af; text-align: center; font-size: 15px; }
        td { padding: 12px; border: 1px solid #d1d5db; text-align: right; vertical-align: middle; }
        .bold { font-weight: bold; }
        .green { color: #166534; font-weight: bold; background-color: #dcfce7; }
        .red { color: #991b1b; font-weight: bold; background-color: #fee2e2; }
        .blue { color: #1e40af; font-weight: bold; }
        .row-even { background-color: #f9fafb; }
      </style>
    </head>
    <body dir="rtl">
      <table style="border: none; margin-bottom: 20px;">
        <tr height="100">
          <td colspan="${titleColspan}" style="border: none; text-align: right; vertical-align: middle; font-size: 26px; font-weight: bold; color: #111827;">
            ${title}<br/>
            <span style="font-size: 15px; color: #4b5563; font-weight: normal;">تاريخ الإصدار: ${printDate}</span>
          </td>
          <td colspan="${logoColspan}" style="border: none; text-align: left; vertical-align: middle;">
            <img src="${window.location.origin}/img/logo.png" width="90" height="90" alt="المدار الليبي للتأمين" />
          </td>
        </tr>
        ${(summaryRight || summaryLeft) ? `
        <tr height="45">
          <td colspan="${summaryRightColspan}" style="background-color: #1e40af; color: white; border: 1px solid #1e40af; font-weight: bold; text-align: right; vertical-align: middle; font-size: 16px; padding-right: 15px;">
            ${summaryRight || ''}
          </td>
          <td colspan="${summaryLeftColspan}" style="background-color: #f3f4f6; border: 1px solid #d1d5db; font-weight: bold; text-align: left; color: #166534; font-size: 18px; vertical-align: middle; padding-left: 15px;">
            ${summaryLeft || ''}
          </td>
        </tr>
        ` : ''}
        <tr height="20">
          <td colspan="${columnCount}" style="border: none;"></td>
        </tr>
      </table>

      <table>
        <thead>
          ${tableHeaders}
        </thead>
        <tbody>
          ${tableBody}
        </tbody>
      </table>
    </body>
    </html>
  `;
  
  const blob = new Blob(['\uFEFF' + tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${fileName || title}_${Date.now()}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
