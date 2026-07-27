const fs = require('fs');
let app = fs.readFileSync('apps/steward/src/App.tsx', 'utf8');
app = app.replace(/\\nexport default App;/g, '\nexport default App;');
fs.writeFileSync('apps/steward/src/App.tsx', app);

let main = fs.readFileSync('apps/steward/src/main.tsx', 'utf8');
main = main.replace(/\\nimport App from '\.\/App';/g, "\nimport App from './App';");
fs.writeFileSync('apps/steward/src/main.tsx', main);

let ct = fs.readFileSync('packages/core-types/index.ts', 'utf8');
ct = ct.replace(/useCleanNonLatinTags\?: boolean;\\ndiagnosticLoggingEnabled\?: boolean;/g, 'useCleanNonLatinTags?: boolean;\n  diagnosticLoggingEnabled?: boolean;');
fs.writeFileSync('packages/core-types/index.ts', ct);
