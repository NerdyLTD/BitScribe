const fs = require('fs');
let content = fs.readFileSync('packages/ui-components/src/Sidebar.tsx', 'utf8');

content = content.replace(
  "              <button\n                onClick={() => {\n                  let startStep = 0;",
  "              <button\n                onClick={async () => {\n                  let startStep = 0;"
);

fs.writeFileSync('packages/ui-components/src/Sidebar.tsx', content);
console.log("Updated Sidebar.tsx async");
