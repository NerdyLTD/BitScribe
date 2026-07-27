const fs = require('fs');
let file = fs.readFileSync('packages/core-types/index.ts', 'utf8');
file = file.replace('  useCleanNonLatinTags?: boolean;\\n  bleedingEdgeVideoCodecs?: string[];', '  useCleanNonLatinTags?: boolean;\\n  diagnosticLoggingEnabled?: boolean;\\n  bleedingEdgeVideoCodecs?: string[];');
fs.writeFileSync('packages/core-types/index.ts', file);
