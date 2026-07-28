const fs = require('fs');
let content = fs.readFileSync('packages/ui-components/src/Sidebar.tsx', 'utf8');

content = content.replace(
  "                    if (onPopulateDemo) {\n                      onPopulateDemo();\n                    }",
  "                    if (onPopulateDemo) {\n                      await onPopulateDemo();\n                    }"
);

fs.writeFileSync('packages/ui-components/src/Sidebar.tsx', content);
console.log("Updated Sidebar.tsx await");
