const fs = require('fs');
const file = 'apps/steward/src/components/LogsPanel.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace("'Bitscribe_error.log'", "'BitScribe Error Log.txt'");
fs.writeFileSync(file, content);
