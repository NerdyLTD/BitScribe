const fs = require('fs');
const content = fs.readFileSync('apps/steward/src/hooks/useAppTour.ts', 'utf8');
const updated = content.replace(
  "injectDemoData\n}: any) {",
  "injectDemoData,\n  clearDemoData\n}: any) {"
).replace(
  "    const demoInserted = localStorage.getItem(\"bitscribe_demo_data_inserted\");\n    if (!demoInserted) {\n      await injectDemoData();\n      localStorage.setItem(\"bitscribe_demo_data_inserted\", \"true\");\n    }",
  "    const demoInserted = localStorage.getItem(\"bitscribe_demo_data_inserted\");\n    if (demoInserted && clearDemoData) {\n      await clearDemoData();\n    }"
).replace(
  "    const demoInserted = localStorage.getItem(\"bitscribe_demo_data_inserted\");\n    if (!demoInserted) {\n      await injectDemoData();\n      localStorage.setItem(\"bitscribe_demo_data_inserted\", \"true\");\n    }",
  "    const demoInserted = localStorage.getItem(\"bitscribe_demo_data_inserted\");\n    if (demoInserted && clearDemoData) {\n      await clearDemoData();\n    }"
);
fs.writeFileSync('apps/steward/src/hooks/useAppTour.ts', updated);
console.log("Updated hooks/useAppTour.ts");
