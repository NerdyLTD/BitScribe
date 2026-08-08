const fs = require('fs');

let excelContent = fs.readFileSync('packages/core-export/src/excelExporter.ts', 'utf8');

excelContent = excelContent.replace(/\s*"File Name": item\.filename,/g, '');
excelContent = excelContent.replace(/\s*Filename: item\.filename,/g, '');
excelContent = excelContent.replace(/ \|\| h === "File Name"/g, '');
excelContent = excelContent.replace(/ \|\| h === "File"/g, '');

fs.writeFileSync('packages/core-export/src/excelExporter.ts', excelContent, 'utf8');
