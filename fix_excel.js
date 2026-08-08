const fs = require('fs');
let content = fs.readFileSync('packages/core-export/src/excelExporter.ts', 'utf8');

// 1. Rename "Title" to "Metadata Title" for Metadata Audit headers
content = content.replace(/"Cleaned Title",\s*"Title",/g, '"Cleaned Title",\n          "Metadata Title",');

// 2. Fix the data mapping
content = content.replace(/rowValues\["Title"\] = hasSongTitle \? missingFmt\(songTitle\) : "\[MISSING\]";/g, 'rowValues["Metadata Title"] = hasSongTitle ? missingFmt(songTitle) : "[MISSING]";');
content = content.replace(/rowValues\["Title"\] = hasTvTitle \? missingFmt\(tvTitle\) : missingFmt\(parsedMeta\.title\);/g, 'rowValues["Metadata Title"] = hasTvTitle ? missingFmt(tvTitle) : "[MISSING]";');
content = content.replace(/rowValues\["Title"\] = hasVideoTitle \? missingFmt\(videoTitle\) : missingFmt\(parsedMeta\.title\);/g, 'rowValues["Metadata Title"] = hasVideoTitle ? missingFmt(videoTitle) : "[MISSING]";');

// 3. Remove "File Name", "File", "Duplicate File"
content = content.replace(/"File Name",\s*/g, '');
content = content.replace(/rowValues\["File Name"\] = item\.filename;\s*/g, '');

content = content.replace(/"File",\s*/g, '');
content = content.replace(/rowValues\["File"\] = [^\n]*\n/g, '');

content = content.replace(/"Duplicate File",\s*/g, '');
content = content.replace(/rowValues\["Duplicate File"\] = [^\n]*\n/g, '');

fs.writeFileSync('packages/core-export/src/excelExporter.ts', content, 'utf8');
