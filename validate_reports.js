const fs = require('fs');

const reportFile = fs.readFileSync('./packages/core-export/src/reportExporter.ts', 'utf8');
const excelFile = fs.readFileSync('./packages/core-export/src/excelExporter.ts', 'utf8');

console.log('--- Validating reportExporter.ts ---');

// Basic sanity checks
if (!reportFile.includes('"Metadata Title"')) {
    console.error('ERROR: "Metadata Title" missing from reportExporter.ts');
    process.exit(1);
}
if (!reportFile.includes('"Audio Bitrate"')) {
    console.error('ERROR: "Audio Bitrate" missing from reportExporter.ts');
    process.exit(1);
}

// Check for missing data assignments
const assignments = [
    'data["Metadata Title"]',
    'rowData["Metadata Title"]',
    'rowData["Audio Bitrate"]',
    'data["File Path"]',
    'rowData["File Path"]'
];

for (const assign of assignments) {
    if (!reportFile.includes(assign)) {
        console.error(`ERROR: Assignment ${assign} missing from reportExporter.ts`);
        process.exit(1);
    }
}

console.log('--- Validating excelExporter.ts ---');

if (!excelFile.includes('"Metadata Title"')) {
    console.error('ERROR: "Metadata Title" missing from excelExporter.ts');
    process.exit(1);
}
if (!excelFile.includes('"Audio Bitrate"')) {
    console.error('ERROR: "Audio Bitrate" missing from excelExporter.ts');
    process.exit(1);
}

console.log('SUCCESS: Core report validation passed.');
