const fs = require('fs');
let content = fs.readFileSync('packages/core-export/src/excelExporter.ts', 'utf8');

content = content.replace(/ws\.addRow\(\[\s*sanitize\(row\.fileName\),\s*sanitize\(row\.filePath\),\s*sanitize\(row\.dupFileName\),\s*sanitize\(row\.dupFilePath\),\s*sanitize\(row\.flagReason\)\s*\]\);/g, 
`ws.addRow([
          sanitize(row.filePath),
          sanitize(row.dupFilePath),
          sanitize(row.flagReason)
        ]);`);

fs.writeFileSync('packages/core-export/src/excelExporter.ts', content, 'utf8');
