const fs = require('fs');
let content = fs.readFileSync('apps/steward/src/components/ProductTour.tsx', 'utf8');

content = content.replace(
  "<li><strong>Fix Music Grouping</strong>: Strips 'OST' tags, groups soundtracks by folder, and overrides foreign characters.</li>",
  "<li><strong>Fix Music Grouping</strong>: Strips 'OST' tags, groups soundtracks by folder, and overrides foreign characters.</li>\n          <li><strong>Diagnostic Logging</strong>: Enable verbose debugging and error output directly into the scan log.</li>"
);

fs.writeFileSync('apps/steward/src/components/ProductTour.tsx', content);
console.log("Updated slide 33.");
