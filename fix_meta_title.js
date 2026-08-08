const fs = require('fs');

let reportContent = fs.readFileSync('packages/core-export/src/reportExporter.ts', 'utf8');

reportContent = reportContent.replace(/const hasSongTitle = [^\n]*\n\s*data\["Metadata Title"\] = hasSongTitle \? missingFmt\(songTitle\) : "\[MISSING\]";/g, 
'data["Metadata Title"] = songTitle ? missingFmt(songTitle) : "[MISSING]";');

reportContent = reportContent.replace(/const hasTvTitle = [^\n]*\n\s*data\["Metadata Title"\] = hasTvTitle \? missingFmt\(tvTitle\) : "\[MISSING\]";/g, 
'data["Metadata Title"] = tvTitle ? missingFmt(tvTitle) : "[MISSING]";');

reportContent = reportContent.replace(/const hasVideoTitle = [^\n]*\n\s*data\["Metadata Title"\] = hasVideoTitle \? missingFmt\(videoTitle\) : "\[MISSING\]";/g, 
'data["Metadata Title"] = videoTitle ? missingFmt(videoTitle) : "[MISSING]";');

reportContent = reportContent.replace(/const hasSongTitle = [^\n]*\n\s*rowData\["Cleaned Title"\] = missingFmt\(parsedMeta\.title\);\s*rowData\["Metadata Title"\] = hasSongTitle \? missingFmt\(songTitle\) : "\[MISSING\]";/g, 
'rowData["Cleaned Title"] = missingFmt(parsedMeta.title);\n          rowData["Metadata Title"] = songTitle ? missingFmt(songTitle) : "[MISSING]";');

reportContent = reportContent.replace(/const hasTvTitle = [^\n]*\n\s*rowData\["Cleaned Title"\] = missingFmt\(parsedMeta\.title\);\s*rowData\["Metadata Title"\] = hasTvTitle \? missingFmt\(tvTitle\) : "\[MISSING\]";/g, 
'rowData["Cleaned Title"] = missingFmt(parsedMeta.title);\n          rowData["Metadata Title"] = tvTitle ? missingFmt(tvTitle) : "[MISSING]";');

reportContent = reportContent.replace(/const hasVideoTitle = [^\n]*\n\s*rowData\["Cleaned Title"\] = missingFmt\(parsedMeta\.title\);\s*rowData\["Metadata Title"\] = hasVideoTitle \? missingFmt\(videoTitle\) : "\[MISSING\]";/g, 
'rowData["Cleaned Title"] = missingFmt(parsedMeta.title);\n          rowData["Metadata Title"] = videoTitle ? missingFmt(videoTitle) : "[MISSING]";');

fs.writeFileSync('packages/core-export/src/reportExporter.ts', reportContent, 'utf8');

let excelContent = fs.readFileSync('packages/core-export/src/excelExporter.ts', 'utf8');

excelContent = excelContent.replace(/const hasSongTitle = [^\n]*\n\s*rowValues\["Cleaned Title"\] = missingFmt\(parsedMeta\.title\);\s*rowValues\["Metadata Title"\] = hasSongTitle \? missingFmt\(songTitle\) : "\[MISSING\]";/g, 
'rowValues["Cleaned Title"] = missingFmt(parsedMeta.title);\n          rowValues["Metadata Title"] = songTitle ? missingFmt(songTitle) : "[MISSING]";');

excelContent = excelContent.replace(/const hasTvTitle = [^\n]*\n\s*rowValues\["Cleaned Title"\] = missingFmt\(parsedMeta\.title\);\s*rowValues\["Metadata Title"\] = hasTvTitle \? missingFmt\(tvTitle\) : "\[MISSING\]";/g, 
'rowValues["Cleaned Title"] = missingFmt(parsedMeta.title);\n          rowValues["Metadata Title"] = tvTitle ? missingFmt(tvTitle) : "[MISSING]";');

excelContent = excelContent.replace(/const hasVideoTitle = [^\n]*\n\s*rowValues\["Cleaned Title"\] = missingFmt\(parsedMeta\.title\);\s*rowValues\["Metadata Title"\] = hasVideoTitle \? missingFmt\(videoTitle\) : "\[MISSING\]";/g, 
'rowValues["Cleaned Title"] = missingFmt(parsedMeta.title);\n          rowValues["Metadata Title"] = videoTitle ? missingFmt(videoTitle) : "[MISSING]";');

fs.writeFileSync('packages/core-export/src/excelExporter.ts', excelContent, 'utf8');
