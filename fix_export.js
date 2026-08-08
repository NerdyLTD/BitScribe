const fs = require('fs');
let content = fs.readFileSync('packages/core-export/src/reportExporter.ts', 'utf8');

// 1. Remove "File Name", "File", "Duplicate File" from allPossibleHeaders in both places
content = content.replace(/\]\s*\?\s*\["File", "Path", "Duplicate File", "Duplicate Path", "Flag Reason"\]/g, '] ? ["Path", "Duplicate Path", "Flag Reason"]');
content = content.replace(/allPossibleHeaders = \["File", "Path", "Duplicate File", "Duplicate Path", "Flag Reason"\];/g, 'allPossibleHeaders = ["Path", "Duplicate Path", "Flag Reason"];');
content = content.replace(/finalColumns = \{ "File": true, "Path": true, "Duplicate File": true, "Duplicate Path": true, "Flag Reason": true \};/g, 'finalColumns = { "Path": true, "Duplicate Path": true, "Flag Reason": true };');

// Remove "File Name", from array literals
content = content.replace(/"File Name",\s*/g, '');

// Rename "Title" to "Metadata Title" in allPossibleHeaders for isMetadata
// There are array literals in isMetadata branches
// We'll replace `"Title"` with `"Metadata Title"` specifically around `"Cleaned Title",`
content = content.replace(/"Cleaned Title",\s*"Title",/g, '"Cleaned Title",\n      "Metadata Title",');
// Also in getColsForCat
content = content.replace(/"Cleaned Title",\s*"Title",/g, '"Cleaned Title",\n          "Metadata Title",');

// 2. Fix the CSV export data mapping for Title -> Metadata Title
content = content.replace(/data\["Title"\] = hasTvTitle \? missingFmt\(tvTitle\) : missingFmt\(parsedMeta\.title\);/g, 'data["Metadata Title"] = hasTvTitle ? missingFmt(tvTitle) : "[MISSING]";');
content = content.replace(/data\["Title"\] = hasVideoTitle \? missingFmt\(videoTitle\) : missingFmt\(parsedMeta\.title\);/g, 'data["Metadata Title"] = hasVideoTitle ? missingFmt(videoTitle) : "[MISSING]";');
content = content.replace(/data\["Title"\] = hasSongTitle \? missingFmt\(songTitle\) : "\[MISSING\]";/g, 'data["Metadata Title"] = hasSongTitle ? missingFmt(songTitle) : "[MISSING]";');

// 3. Fix the HTML export data mapping for Title -> Metadata Title
content = content.replace(/const tvNameVal = tvTitle && tvTitle\.toLowerCase\(\) !== \(item\.filename \|\| ""\)\.toLowerCase\(\) \? tvTitle : parsedMeta\.title;\s*rowData\["Cleaned Title"\] = missingFmt\(parsedMeta\.title\);\s*rowData\["Title"\] = missingFmt\(tvNameVal\);/g, 'const hasTvTitle = tvTitle && tvTitle.toLowerCase() !== (item.filename || "").toLowerCase();\n          rowData["Cleaned Title"] = missingFmt(parsedMeta.title);\n          rowData["Metadata Title"] = hasTvTitle ? missingFmt(tvTitle) : "[MISSING]";');
content = content.replace(/rowData\["Title"\] = hasVideoTitle \? missingFmt\(videoTitle\) : missingFmt\(parsedMeta\.title\);/g, 'rowData["Metadata Title"] = hasVideoTitle ? missingFmt(videoTitle) : "[MISSING]";');
content = content.replace(/rowData\["Title"\] = hasSongTitle \? missingFmt\(songTitle\) : "\[MISSING\]";/g, 'rowData["Metadata Title"] = hasSongTitle ? missingFmt(songTitle) : "[MISSING]";');

// Ensure we don't accidentally set data["File Name"] anymore since it's removed
content = content.replace(/data\["File Name"\] = item\.filename;\s*/g, '');
content = content.replace(/rowData\["File Name"\] = item\.filename;\s*/g, '');

// Also for Duplication scan CSV and HTML: remove `File` and `Duplicate File`
content = content.replace(/"File": row\.fileName,\s*/g, '');
content = content.replace(/"Duplicate File": row\.dupFileName,\s*/g, '');

// 4. Remove All Media entirely
content = content.replace(/if \(cat === "All Media"\) \{[\s\S]*?\}\s*const isVideo/g, 'const isVideo');
content = content.replace(/if \(isDiscovery\) orderedCats\.unshift\("All Media"\);\s*/g, '');
content = content.replace(/if \(orderedCats\.includes\("All Media"\)\) \{\s*activeCategory = "All Media";\s*\}/g, '');
content = content.replace(/activeCategory === "All Media" \|\| /g, '');

// 5. Check sortCol fallback for Duplication Scan
content = content.replace(/let sortCol = SCAN_TYPE === "Duplication Scan" \? "File" : "File Name";/g, 'let sortCol = SCAN_TYPE === "Duplication Scan" ? "Path" : "File Path";');

fs.writeFileSync('packages/core-export/src/reportExporter.ts', content, 'utf8');
