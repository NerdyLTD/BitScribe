const fs = require('fs');
let content = fs.readFileSync('apps/steward/src/App.tsx', 'utf8');

content = content.replace(
  "injectDemoData: handlePopulateDemo",
  "injectDemoData: handlePopulateDemo,\n    clearDemoData: flushDemoDataOnly"
);

content = content.replace(
  "setHasCompletedScan={setHasCompletedScan}\n        />",
  "setHasCompletedScan={setHasCompletedScan}\n          onPopulateDemo={handlePopulateDemo}\n        />"
);

fs.writeFileSync('apps/steward/src/App.tsx', content);
console.log("Updated App.tsx");
