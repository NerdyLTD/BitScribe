const fs = require('fs');
let file = fs.readFileSync('apps/steward/src/main.tsx', 'utf8');
file = file.replace(/\\n\\ncreateRoot/g, '\\n\\ncreateRoot');
fs.writeFileSync('apps/steward/src/main.tsx', file);
