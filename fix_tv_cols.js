const fs = require('fs');
let content = fs.readFileSync('packages/core-export/src/reportExporter.ts', 'utf8');

// For getColsForCat
content = content.replace(/\["Series Title", "Season", "Episode", "Episode Title", /g, '["Series Title", "Episode Title", "Season", "Episode", ');
content = content.replace(/\["Stream Audit", "Series Title", "Season", "Episode", "Episode Title", /g, '["Stream Audit", "Series Title", "Episode Title", "Season", "Episode", ');
content = content.replace(/\["Alert Level", "Series Title", "Season", "Episode", "Episode Title", /g, '["Alert Level", "Series Title", "Episode Title", "Season", "Episode", ');

// Inside isMetadata TV Tab
content = content.replace(/"Series Title",\s*"Episode Title",\s*"Season",\s*"Episode Number",/g, '"Series Title",\n          "Episode Title",\n          "Season",\n          "Episode Number",');
// Wait, isMetadata TV Tab already had Episode Title right after Series Title:
// "Series Title",
// "Episode Title",
// "Season",
// "Episode Number",
// Let's verify.

fs.writeFileSync('packages/core-export/src/reportExporter.ts', content, 'utf8');
