const fs = require('fs');
let content = fs.readFileSync('packages/ui-components/src/Sidebar.tsx', 'utf8');

content = content.replace(
  "onPopulateDemo?: () => void;",
  "onPopulateDemo?: () => Promise<void>;"
);

fs.writeFileSync('packages/ui-components/src/Sidebar.tsx', content);
console.log("Updated SidebarProps");
