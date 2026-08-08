const fs = require('fs');
let content = fs.readFileSync('packages/core-export/src/reportExporter.ts', 'utf8');

content = content.replace(/if \(item\.filename\)\s*const container = getContainerFormat\(item\);/g, 'const container = getContainerFormat(item);');

fs.writeFileSync('packages/core-export/src/reportExporter.ts', content, 'utf8');
