const fs = require('fs');
let code = fs.readFileSync('src/utils/reportExporter.ts', 'utf8');

// 1. Update exportMediaLibraryToCSV signature
code = code.replace(
  `export async function exportMediaLibraryToCSV(
  items: MediaItem[],
  rules: RuleCriteria,
  columns: Record<string, boolean>,
  targetDir?: string
) {`,
  `export async function exportMediaLibraryToCSV(
  items: MediaItem[],
  rules: RuleCriteria,
  columns: Record<string, boolean>,
  targetDir?: string,
  allItems?: MediaItem[]
) {
  const itemsForDups = allItems && allItems.length > 0 ? allItems : items;
  const isDuplication = getScanType(rules, items) === "Duplication Scan";
  const duplicatesMap = isDuplication ? new Map() : computeDuplicatesMap(itemsForDups, rules);
`
);

// 2. Add isDuplication logic to headers in exportMediaLibraryToCSV
code = code.replace(
  `  let allPossibleHeaders = [
    "Alert Level",`,
  `  let allPossibleHeaders = [
    "Alert Level",`
);
// I can just replace the definition of allPossibleHeaders in exportMediaLibraryToCSV
code = code.replace(
  `  let allPossibleHeaders = [
    "Alert Level",
    "Stream Audit",
    "File Name",
    "Container",
    "Video Codec",
    "Resolution",
    "Audio Tracks",
    "Audio Codecs",
    "Subtitles",
    ...(rules.useSubtitleScan ? ["Subtitle Type"] : []),
    "Series Title",
    "Season",
    "Episode",
    "Episode Title",
    "Title",
    "Release Year",
    "Artist",
    "Album Title",
    "Song Title",
    "File Format/Codec",
    "Bitrate",
    "Corruption Type",
    "Recommendation",
    "Analysis Notes",
    "Remediation Action",
    "File Path",
  ];

  if (isMetadata) {
    allPossibleHeaders = [
      "Cleaned Title",
      "Title",
      "File Name",
      "Series Title",
      "Season",
      "Episode Number",
      "Episode Title",
      "Artist",
      "Album Title",
      "Year",
      "Track",
      "Director",
      "Writer",
      "Cast",
      "Studio",
      "Video Bit Depth",
      "Audio Sample Rate",
      "Chapters",
      "Poster",
      "Cover Art",
      "File Path"
    ];
  }`,
  `  let allPossibleHeaders = isDuplication 
    ? ["File", "Path", "Duplicate File", "Duplicate Path", "Flag Reason"]
    : [
    "Alert Level",
    "Stream Audit",
    "File Name",
    "Container",
    "Video Codec",
    "Resolution",
    "Audio Tracks",
    "Audio Codecs",
    "Subtitles",
    ...(rules.useSubtitleScan ? ["Subtitle Type"] : []),
    "Series Title",
    "Season",
    "Episode",
    "Episode Title",
    "Title",
    "Release Year",
    "Artist",
    "Album Title",
    "Song Title",
    "File Format/Codec",
    "Bitrate",
    "Corruption Type",
    "Recommendation",
    "Analysis Notes",
    "Remediation Action",
    "File Path",
  ];

  if (isMetadata) {
    allPossibleHeaders = [
      "Cleaned Title",
      "Title",
      "File Name",
      "Series Title",
      "Season",
      "Episode Number",
      "Episode Title",
      "Artist",
      "Album Title",
      "Year",
      "Track",
      "Director",
      "Writer",
      "Cast",
      "Studio",
      "Video Bit Depth",
      "Audio Sample Rate",
      "Chapters",
      "Poster",
      "Cover Art",
      "File Path"
    ];
  }`
);

// 3. Update rows generation in exportMediaLibraryToCSV
code = code.replace(
  `  const headers = allPossibleHeaders.filter((col) => columns[col] !== false);

  const rows = items`,
  `  const headers = isDuplication ? allPossibleHeaders : allPossibleHeaders.filter((col) => columns[col] !== false);

  if (isDuplication) {
    const dupRows = getDuplicatePairRows(itemsForDups, rules);
    const filteredItemIds = new Set(items.map(i => i.id));
    const visiblePairs = dupRows.filter(pair => filteredItemIds.has(pair.dupId) || filteredItemIds.has(pair.id));
    
    const rows = visiblePairs.map(row => {
      let data: Record<string, any> = {
        "File": row.fileName,
        "Path": row.filePath,
        "Duplicate File": row.dupFileName,
        "Duplicate Path": row.dupFilePath,
        "Flag Reason": row.flagReason || "",
      };
      return headers
        .map((h) => {
          let val = String(data[h] ?? "");
          if (val.includes(",") || val.includes('"') || val.includes("\\n")) {
            return \`"\${val.replace(/"/g, '""')}"\`;
          }
          return val;
        })
        .join(",");
    });
    const csvContent = [headers.join(","), ...rows].join("\\n");
    const filename = \`\${getReportFileName(rules, items)}.csv\`;
    return await triggerClientDownload(filename, csvContent, "text/csv;charset=utf-8;", targetDir);
  }

  const rows = items`
);

// Update evaluatePlexCompatibility call in exportMediaLibraryToCSV
code = code.replace(
  `      } else {
        const evalResult = evaluatePlexCompatibility(item, rules);
        const parsedMeta = parseVideoMetadata(item);`,
  `      } else {
        const isDup = duplicatesMap.get(item.id) ?? false;
        const evalResult = evaluatePlexCompatibility(item, rules, isDup);
        const parsedMeta = parseVideoMetadata(item);`
);

// 4. Update exportMediaLibraryToJSON
code = code.replace(
  `export async function exportMediaLibraryToJSON(
  items: MediaItem[],
  rules: RuleCriteria,
  targetDir?: string
) {`,
  `export async function exportMediaLibraryToJSON(
  items: MediaItem[],
  rules: RuleCriteria,
  targetDir?: string,
  allItems?: MediaItem[]
) {
  const itemsForDups = allItems && allItems.length > 0 ? allItems : items;`
);

code = code.replace(
  `  if (isDuplication) {
    const dupRows = getDuplicatePairRows(items, rules);
    const dupIds = new Set<string>();
    dupRows.forEach(r => {
      if (r.id) dupIds.add(r.id);
      if (r.dupId) dupIds.add(r.dupId);
    });
    targetItems = items.filter(i => dupIds.has(i.id));
  }

  const reports = targetItems.map((item) => {
    return {
      ...item,
      parsedMetadata: parseVideoMetadata(item),
      evaluation: evaluatePlexCompatibility(item, rules),
    };
  });`,
  `  if (isDuplication) {
    const dupRows = getDuplicatePairRows(itemsForDups, rules);
    const dupIds = new Set<string>();
    dupRows.forEach(r => {
      if (r.id) dupIds.add(r.id);
      if (r.dupId) dupIds.add(r.dupId);
    });
    targetItems = items.filter(i => dupIds.has(i.id));
  }
  
  const duplicatesMap = computeDuplicatesMap(itemsForDups, rules);

  const reports = targetItems.map((item) => {
    const isDup = duplicatesMap.get(item.id) ?? false;
    return {
      ...item,
      parsedMetadata: parseVideoMetadata(item),
      evaluation: evaluatePlexCompatibility(item, rules, isDup),
    };
  });`
);

// 5. Update exportMediaLibraryToHTML
code = code.replace(
  `export async function exportMediaLibraryToHTML(
  items: MediaItem[],
  rules: RuleCriteria,
  columns: Record<string, boolean>,
  targetDir?: string
) {`,
  `export async function exportMediaLibraryToHTML(
  items: MediaItem[],
  rules: RuleCriteria,
  columns: Record<string, boolean>,
  targetDir?: string,
  allItems?: MediaItem[]
) {
  const itemsForDups = allItems && allItems.length > 0 ? allItems : items;`
);

code = code.replace(
  `  const duplicatesMap = computeDuplicatesMap(items, rules);`,
  `  const duplicatesMap = computeDuplicatesMap(itemsForDups, rules);`
);

code = code.replace(
  `  if (isDuplication) {
    const dupRows = getDuplicatePairRows(targetItems, rules);`,
  `  if (isDuplication) {
    const dupRows = getDuplicatePairRows(itemsForDups, rules);
    const filteredItemIds = new Set(targetItems.map(i => i.id));
    const visibleDupRows = dupRows.filter(pair => filteredItemIds.has(pair.dupId) || filteredItemIds.has(pair.id));
    
    optimizedItems = visibleDupRows.map(row => ({`
);
code = code.replace(
  `    optimizedItems = dupRows.map(row => ({`,
  ``
);


fs.writeFileSync('src/utils/reportExporter.ts', code);
console.log('Fixed reportExporter.ts');
