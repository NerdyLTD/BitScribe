const fs = require('fs');
const oldApp = fs.readFileSync('old_app_content.tsx', 'utf8');
let currentApp = fs.readFileSync('apps/steward/src/App.tsx', 'utf8');

const everythingStart = oldApp.indexOf('const abortControllerRef = React.useRef');
const everythingEnd = oldApp.indexOf('  };\n', oldApp.indexOf('wakeLock.release();')) + 5;
let logicToInsert = oldApp.substring(everythingStart, everythingEnd);

const insertPointStr = "const { clearLocalCacheOnly, flushServerDatabase, flushDemoDataOnly, handlePopulateDemo } = useDemoActions(";
const insertIdx = currentApp.indexOf(insertPointStr);
if (insertIdx === -1) {
    console.error("Insertion point not found!");
    process.exit(1);
}

// Find the end of useDemoActions block
const endOfDemoActions = currentApp.indexOf('  });', insertIdx) + 5;

currentApp = currentApp.substring(0, endOfDemoActions) + '\n\n' + logicToInsert + '\n\n' + currentApp.substring(endOfDemoActions);

fs.writeFileSync('apps/steward/src/App.tsx', currentApp);
console.log("Successfully inserted scan logic.");
