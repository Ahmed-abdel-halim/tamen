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
