const fs = require('fs');
let content = fs.readFileSync('apps/steward/src/hooks/useAppTour.ts', 'utf8');
content = content.replace(
  "        matrix: [0.03333333333333333, 0, 0, 0.03333333333333333, -5.566666666666666, -5.533333333333333]\n      });\n\n      (function frame()",
  "        matrix: [0.03333333333333333, 0, 0, 0.03333333333333333, -5.566666666666666, -5.533333333333333]\n      } as any);\n\n      (function frame()"
);
// fix the previous sed command mistake if it ran
content = content.replace("      } as any);\n      });", "      } as any);");
fs.writeFileSync('apps/steward/src/hooks/useAppTour.ts', content);
