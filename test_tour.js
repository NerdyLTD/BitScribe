const fs = require('fs');
let app = fs.readFileSync('apps/steward/src/App.tsx', 'utf8');
const hookImport = "import { useAppTour } from './hooks/useAppTour';";
if (!app.includes(hookImport)) {
  app = app.replace('import { useScanState }', hookImport + '\nimport { useScanState }');
}
fs.writeFileSync('apps/steward/src/App.tsx', app);
