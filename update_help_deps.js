const fs = require('fs');
let content = fs.readFileSync('apps/steward/src/components/HelpSection.tsx', 'utf8');

content = content.replace(
  "  }, [activeDemo, openPanels['tutorials-main']]);",
  "  }, [activeDemo, tourStepIndex, openPanels['tutorials-main']]);"
);

content = content.replace(
  "  }, [activeDemo, openPanels['faqs-main']]);",
  "  }, [activeDemo, tourStepIndex, openPanels['faqs-main']]);"
);

fs.writeFileSync('apps/steward/src/components/HelpSection.tsx', content);
console.log("Updated dependencies in HelpSection.tsx");
