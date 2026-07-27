const fs = require('fs');
let file = fs.readFileSync('apps/steward/src/App.tsx', 'utf8');

// We will just completely remove the initDebugLog useEffect from App.tsx
// It's located around line 109 to 216.
const lines = file.split('\\n');
let startIdx = lines.findIndex(l => l.includes('const initDebugLog = async () => {'));
let endIdx = -1;
if (startIdx !== -1) {
    // Find the enclosing useEffect
    while(startIdx > 0 && !lines[startIdx].includes('useEffect(() => {')) {
        startIdx--;
    }
    // Find the end of this useEffect
    let openBraces = 0;
    for(let i = startIdx; i < lines.length; i++) {
        openBraces += (lines[i].match(/\\{/g) || []).length;
        openBraces -= (lines[i].match(/\\}/g) || []).length;
        if (openBraces === 0) {
            endIdx = i;
            break;
        }
    }
    
    if (endIdx !== -1) {
        lines.splice(startIdx, endIdx - startIdx + 1);
        fs.writeFileSync('apps/steward/src/App.tsx', lines.join('\\n'));
        console.log('Removed initDebugLog useEffect from App.tsx');
    }
}
