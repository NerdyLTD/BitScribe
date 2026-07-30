const fs = require('fs');
const file = 'packages/ui-components/src/Sidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'Reports were sent to Downloads\\BitScribe Reports\\',
  '{exportDirectory ? `Reports are saved to ${exportDirectory}` : "You will be prompted for an export folder."}'
);

fs.writeFileSync(file, content);
