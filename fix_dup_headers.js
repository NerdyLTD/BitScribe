const fs = require('fs');
let content = fs.readFileSync('packages/core-export/src/excelExporter.ts', 'utf8');

// Fix Duplication Scan headers
content = content.replace(/headers = \["Path", "Path", "Flag Reason"\];/g, 'headers = ["Path", "Duplicate Path", "Flag Reason"];');

// Fix the actual exported rows
content = content.replace(/rowValues\["Path"\] = row\.dupFilePath;\s*/g, 'rowValues["Duplicate Path"] = row.dupFilePath;\n');

fs.writeFileSync('packages/core-export/src/excelExporter.ts', content, 'utf8');
