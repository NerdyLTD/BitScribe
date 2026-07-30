const fs = require('fs');
const file = 'CHANGELOG.md';
let content = fs.readFileSync(file, 'utf8');

const entry = `### Fixed
- **Scan Path Reference Error**: Fixed a critical \`ReferenceError\` (\`fileObjItem is not defined\`) that occurred during the initial directory walk phase of the scan, which caused scans to fail prematurely for folders containing media files.

`;

content = content.replace('## [Unreleased]\n', '## [Unreleased]\n\n' + entry);
fs.writeFileSync(file, content);
console.log('Changelog updated');
