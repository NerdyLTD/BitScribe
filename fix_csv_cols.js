const fs = require('fs');
let content = fs.readFileSync('packages/core-export/src/reportExporter.ts', 'utf8');

// For CSV allPossibleHeaders (isMetadata = false)
content = content.replace(/"Series Title",\s*"Season",\s*"Episode",\s*"Episode Title",/g, '"Series Title",\n    "Episode Title",\n    "Season",\n    "Episode",');

// For CSV allPossibleHeaders (isMetadata = true)
content = content.replace(/"Series Title",\s*"Season",\s*"Episode Number",\s*"Episode Title",/g, '"Series Title",\n      "Episode Title",\n      "Season",\n      "Episode Number",');

fs.writeFileSync('packages/core-export/src/reportExporter.ts', content, 'utf8');
