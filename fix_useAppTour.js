const fs = require('fs');
let content = fs.readFileSync('apps/steward/src/hooks/useAppTour.ts', 'utf8');

content = content.replace(
  "    const tourStatus = localStorage.getItem(\"bitscribe_tour_status\");\n    if (!tourStatus) return false;",
  "    const tourStatus = localStorage.getItem(\"bitscribe_tour_status\");\n    if (!tourStatus) {\n      localStorage.setItem(\"bitscribe_tour_status\", JSON.stringify({ status: \"active\", startStep: 0 }));\n      return true;\n    }"
);

fs.writeFileSync('apps/steward/src/hooks/useAppTour.ts', content);
console.log("Updated useAppTour.ts");
