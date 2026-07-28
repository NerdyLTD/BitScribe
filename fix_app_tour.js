const fs = require('fs');
let code = fs.readFileSync('apps/steward/src/hooks/useAppTour.ts', 'utf8');

const useAppTourStart = code.indexOf('export function useAppTour({');
const useEffectStart = code.indexOf('  useEffect(() => {\n    if (!demoMessage || !demoMessage.targetId) {');
const useEffectEnd = code.indexOf('  }, [demoMessage]);') + 20;

if (useEffectStart !== -1 && useEffectStart < useAppTourStart) {
  const useEffectBlock = code.substring(useEffectStart, useEffectEnd);
  
  let newCode = code.substring(0, useEffectStart) + code.substring(useEffectEnd);
  
  const insertIndex = newCode.indexOf('const isDemoPausedRef = useRef(false);') + 'const isDemoPausedRef = useRef(false);'.length;
  
  newCode = newCode.substring(0, insertIndex) + '\n\n' + useEffectBlock + newCode.substring(insertIndex);
  
  fs.writeFileSync('apps/steward/src/hooks/useAppTour.ts', newCode);
  console.log("Fixed useAppTour.ts");
} else {
  console.log("Could not find useEffectBlock");
}
