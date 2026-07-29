const fs = require('fs');
let content = fs.readFileSync('apps/steward/src/components/HelpSection.tsx', 'utf8');

content = content.replace(
  "if (activeDemo === 33 && openPanels['tutorials-main'] === true) {",
  "if ((activeDemo === 33 || tourStepIndex === 35) && openPanels['tutorials-main'] === true) {"
);

content = content.replace(
  "if (activeDemo === 33 && openPanels['faqs-main'] === true) {",
  "if ((activeDemo === 33 || tourStepIndex === 35) && openPanels['faqs-main'] === true) {"
);

// We also need to automatically open these panels when tourStepIndex === 35
const autoOpenHook = `
  useEffect(() => {
    if (tourStepIndex === 35) {
      setTimeout(() => {
        setOpenPanels(prev => ({ ...prev, 'tutorials-main': true, 'faqs-main': true }));
      }, 300);
    }
  }, [tourStepIndex]);
`;

content = content.replace(
  "useEffect(() => {\n    if (activeDemo === null) {\n      setOpenPanels({});\n    }\n  }, [activeDemo]);",
  "useEffect(() => {\n    if (activeDemo === null && tourStepIndex !== 35) {\n      setOpenPanels({});\n    }\n  }, [activeDemo, tourStepIndex]);\n" + autoOpenHook
);

fs.writeFileSync('apps/steward/src/components/HelpSection.tsx', content);
console.log("Updated HelpSection.tsx");
