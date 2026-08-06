import ExcelJS from 'exceljs';
// @ts-ignore
import { saveAs } from 'file-saver';

interface ColumnDefinition {
  header: string;
  key: string;
  width: number;
}

interface ExcelOptions {
  title: string;
  subtitle: string;
  columns: ColumnDefinition[];
  data: any[];
  fileName: string;
  qrData?: string;
}

export const generatePremiumExcel = async ({
  title,
  subtitle,
  columns,
  data,
  fileName,
  qrData
}: ExcelOptions) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sheet1');

    // RTL Direction
    worksheet.views = [{ rightToLeft: true }];

    // Add Company Logo
    try {
      const response = await fetch('/img/logo.png');
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const logoImage = workbook.addImage({
        buffer: arrayBuffer,
        extension: 'png',
      });

      // Position logo at the top right
      worksheet.addImage(logoImage, {
        tl: { col: 0, row: 0 },
        ext: { width: 80, height: 80 }
      });
    } catch (err) {
      console.warn('Could not load logo for excel:', err);
    }

    // Add QR Code
    try {
      const qrContent = qrData || `${title}\nالتاريخ: ${new Date().toLocaleString('ar-LY')}`;
      const qrResponse = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrContent)}`);
      const qrBlob = await qrResponse.blob();
      const qrArrayBuffer = await qrBlob.arrayBuffer();
      const qrImage = workbook.addImage({
        buffer: qrArrayBuffer,
        extension: 'png',
      });

      // Position QR code at the top left (Column index depends on column count)
      const qrColIndex = columns.length - 1;
      worksheet.addImage(qrImage, {
        tl: { col: qrColIndex, row: 0 },
        ext: { width: 80, height: 80 }
      });
    } catch (err) {
      console.warn('Could not load QR code for excel:', err);
    }

    // Add Main Title (Centered across full width)
    const getColumnLetter = (colIndex: number) => {
      let letter = '';
      while (colIndex >= 0) {
        letter = String.fromCharCode((colIndex % 26) + 65) + letter;
        colIndex = Math.floor(colIndex / 26) - 1;
      }
      return letter;
    };

    const lastColIndex = columns.length - 1;
    const lastColumnLetter = getColumnLetter(lastColIndex);
    
    // Merge cells for title and subtitle to ensure perfect centering
    worksheet.mergeCells(`A2:${lastColumnLetter}2`);
    const titleCell = worksheet.getCell('A2');
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 20, bold: true, color: { argb: '1a365d' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    worksheet.mergeCells(`A3:${lastColumnLetter}3`);
    const infoCell = worksheet.getCell('A3');
    infoCell.value = subtitle;
    infoCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: '475569' } };
    infoCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Start table from row 5
    const tableStartRow = 5;

    // Define columns
    worksheet.columns = columns.map(col => ({
      key: col.key,
      width: col.width
    }));

    // Ensure the first row is empty (ExcelJS might auto-populate it)
    worksheet.getRow(1).values = [];

    // Set Header Row
    const headerRow = worksheet.getRow(tableStartRow);
    headerRow.values = columns.map(col => col.header);
    headerRow.height = 30;

    // Format Header
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1e293b' }
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add Data
    data.forEach((item, index) => {
      const row = worksheet.getRow(tableStartRow + 1 + index);
      const rowValues = columns.map(col => item[col.key]);
      row.values = rowValues;
      row.height = 25;
    });

    // Format Data Rows
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > tableStartRow) {
        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
        // Zebra stripes
        if (rowNumber % 2 !== 0) {
          row.eachCell((cell) => {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'f8fafc' }
            };
          });
        }
      }
    });

    // Generate Buffer and Save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);

    return true;
  } catch (error) {
    console.error('Excel Export Error:', error);
    throw error;
  }
};

export interface MonthDocsGroup {
  month_label: string;
  document_count: number;
  total_sales: number;
  agent_share: number;
  company_share: number;
  docs: any[];
}

export interface GroupedDocsExcelOptions {
  title: string;
  subtitle: string;
  monthGroups: MonthDocsGroup[];
  fileName: string;
}

export const generateGroupedDocsExcel = async ({
  title,
  subtitle,
  monthGroups,
  fileName,
}: GroupedDocsExcelOptions) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('وثائق كشف الحساب');

    // RTL Direction
    worksheet.views = [{ rightToLeft: true }];

    const columns = [
      { header: '#', key: 'index', width: 8 },
      { header: 'نوع الوثيقة', key: 'type_label', width: 24 },
      { header: 'رقم الوثيقة', key: 'document_number', width: 20 },
      { header: 'اسم المؤمن له', key: 'insured_name', width: 30 },
      { header: 'تاريخ الإصدار', key: 'issue_date', width: 16 },
      { header: 'القيمة الإجمالية (د.ل)', key: 'total', width: 22 },
      { header: 'عمولة الوكيل (د.ل)', key: 'agent_share', width: 20 },
      { header: 'حصة الشركة (د.ل)', key: 'company_share', width: 20 },
      { header: 'حالة الوثيقة', key: 'status', width: 15 },
    ];

    // Add Logo
    try {
      const response = await fetch('/img/logo.png');
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const logoImage = workbook.addImage({
        buffer: arrayBuffer,
        extension: 'png',
      });
      worksheet.addImage(logoImage, {
        tl: { col: 0, row: 0 },
        ext: { width: 80, height: 80 }
      });
    } catch (err) {
      console.warn('Could not load logo for excel:', err);
    }

    const lastColumnLetter = 'I';

    // Title
    worksheet.mergeCells(`A2:${lastColumnLetter}2`);
    const titleCell = worksheet.getCell('A2');
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: '1a365d' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Subtitle
    worksheet.mergeCells(`A3:${lastColumnLetter}3`);
    const infoCell = worksheet.getCell('A3');
    infoCell.value = subtitle;
    infoCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: '475569' } };
    infoCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Set column widths
    columns.forEach((col, idx) => {
      worksheet.getColumn(idx + 1).width = col.width;
    });

    let currentRowIndex = 5;

    for (const group of monthGroups) {
      // 1. Month Title Banner Row
      worksheet.mergeCells(`A${currentRowIndex}:${lastColumnLetter}${currentRowIndex}`);
      const monthCell = worksheet.getCell(`A${currentRowIndex}`);
      monthCell.value = `📌 ${group.month_label} - [عدد الوثائق: ${group.document_count} | المبيعات: ${group.total_sales.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل | عمولة الوكيل: ${group.agent_share.toLocaleString('en-US', { minimumFractionDigits: 2 })} د.ل]`;
      monthCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFF' } };
      monthCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '1e293b' }
      };
      monthCell.alignment = { vertical: 'middle', horizontal: 'right' };
      worksheet.getRow(currentRowIndex).height = 30;
      currentRowIndex++;

      // 2. Table Headers Row
      const headerRow = worksheet.getRow(currentRowIndex);
      headerRow.values = columns.map(c => c.header);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '0284c7' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      currentRowIndex++;

      // 3. Document Rows
      if (group.docs && group.docs.length > 0) {
        group.docs.forEach((doc, dIdx) => {
          const docRow = worksheet.getRow(currentRowIndex);
          const totalVal = doc.total || 0;
          const agentVal = doc.agent_share || 0;
          const companyVal = totalVal - agentVal;
          const issueDateStr = doc.issue_date ? doc.issue_date.substring(0, 10) : '-';

          docRow.values = [
            dIdx + 1,
            doc.type_label || '-',
            doc.document_number || '-',
            doc.insured_name || '-',
            issueDateStr,
            totalVal.toLocaleString('en-US', { minimumFractionDigits: 2 }),
            agentVal.toLocaleString('en-US', { minimumFractionDigits: 2 }),
            companyVal.toLocaleString('en-US', { minimumFractionDigits: 2 }),
            doc.status || 'نشطة',
          ];
          docRow.height = 24;

          docRow.eachCell((cell) => {
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
            if (dIdx % 2 !== 0) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'f8fafc' }
              };
            }
          });
          currentRowIndex++;
        });
      } else {
        worksheet.mergeCells(`A${currentRowIndex}:${lastColumnLetter}${currentRowIndex}`);
        const emptyCell = worksheet.getCell(`A${currentRowIndex}`);
        emptyCell.value = 'لا توجد وثائق صادرة في هذا الشهر';
        emptyCell.font = { italic: true, color: { argb: '64748b' } };
        emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(currentRowIndex).height = 24;
        currentRowIndex++;
      }

      // 4. Empty Separator Row
      currentRowIndex++;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);

    return true;
  } catch (error) {
    console.error('Grouped Docs Excel Export Error:', error);
    throw error;
  }
};
