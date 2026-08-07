const ExcelJS = require('exceljs');

async function test() {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('My Sheet');
    sheet.addRow([1, 2, 3]);
    await workbook.xlsx.writeFile('test.xlsx');
    console.log('Write OK');

    const workbook2 = new ExcelJS.Workbook();
    await workbook2.xlsx.readFile('test.xlsx');
    console.log('Read OK', workbook2.getWorksheet('My Sheet').getRow(1).values);
  } catch (e) {
    console.error('Error', e);
  }
}
test();
