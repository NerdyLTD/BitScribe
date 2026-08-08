const fs = require('fs');

// Fix reportExporter.ts
let reportContent = fs.readFileSync('packages/core-export/src/reportExporter.ts', 'utf8');
reportContent = reportContent.replace(/if \(item\.audioBitrate\) rowData\["Audio Bitrate"\] = `\$\{Math\.round\(item\.audioBitrate \/ 1000\)\} kbps`;/g, 
'if (item.audioBitrate !== undefined && item.audioBitrate !== null) rowData["Audio Bitrate"] = `${Math.round(item.audioBitrate / 1000)} kbps`;');
reportContent = reportContent.replace(/if \(item\.audioBitrate\) rowData\["Bitrate"\] = `\$\{Math\.round\(item\.audioBitrate \/ 1000\)\} kbps`;/g, 
'if (item.audioBitrate !== undefined && item.audioBitrate !== null) rowData["Bitrate"] = `${Math.round(item.audioBitrate / 1000)} kbps`;');

// Fix the CSV mapping for Bitrate (if applicable)
reportContent = reportContent.replace(/\? `\$\{Math\.round\(\(item\.audioBitrate \|\| 0\) \/ 1000\)\} kbps`/g, 
'? (item.audioBitrate !== undefined && item.audioBitrate !== null ? `${Math.round(item.audioBitrate / 1000)} kbps` : "")');

fs.writeFileSync('packages/core-export/src/reportExporter.ts', reportContent, 'utf8');

// Fix excelExporter.ts
let excelContent = fs.readFileSync('packages/core-export/src/excelExporter.ts', 'utf8');
excelContent = excelContent.replace(/"Audio Bitrate": item\.audioBitrate \? Math\.round\(item\.audioBitrate \/ 1000\) \+ " kbps" : "",/g, 
'"Audio Bitrate": (item.audioBitrate !== undefined && item.audioBitrate !== null) ? Math.round(item.audioBitrate / 1000) + " kbps" : "",');
fs.writeFileSync('packages/core-export/src/excelExporter.ts', excelContent, 'utf8');
