const fs = require('fs');
let content = fs.readFileSync('apps/steward/src/hooks/useAppTour.ts', 'utf8');

// Remove the old injectDemoData from goToTourStep
content = content.replace(
  "    if (step > 0) {\n      const demoInserted = localStorage.getItem(\"bitscribe_demo_data_inserted\");\n      if (!demoInserted) {\n        injectDemoData();\n      }\n    }",
  ""
);

// Add useEffect after the state declarations
const effectCode = `
  useEffect(() => {
    if (showTour) {
      const demoInserted = localStorage.getItem("bitscribe_demo_data_inserted");
      if (!demoInserted && injectDemoData) {
        injectDemoData();
      }
    }
  }, [showTour, injectDemoData]);
`;

content = content.replace(
  "const [tourStepIndex, setTourStepIndex] = useState",
  effectCode + "\n  const [tourStepIndex, setTourStepIndex] = useState"
);

fs.writeFileSync('apps/steward/src/hooks/useAppTour.ts', content);
console.log("Updated useAppTour.ts effect");
