const fs = require('fs');
let content = fs.readFileSync('apps/steward/src/App.tsx', 'utf8');
content = content.replace('    : ["SDR", "HDR10", "HDRexport default function App() {', '    : ["SDR", "HDR10", "HDR10+", "Dolby Vision", "HLG", "Advanced HDR"]\n});\nexport default function App() {');
fs.writeFileSync('apps/steward/src/App.tsx', content);
