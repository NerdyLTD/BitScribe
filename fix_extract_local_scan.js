const fs = require('fs');

let appContent = fs.readFileSync('apps/steward/src/App.tsx', 'utf8');

const startStr = "const abortControllerRef = React.useRef<AbortController | null>(null);";
const endTokenStr = "wakeLock.release();\n        } catch (e) {}\n      }\n    }\n  };";

const startIdx = appContent.indexOf(startStr);
const endIdx = appContent.indexOf(endTokenStr) + endTokenStr.length;

if (startIdx === -1 || appContent.indexOf(endTokenStr) === -1) {
  console.error("Could not find boundaries.");
  process.exit(1);
}

const extractedLogic = appContent.substring(startIdx, endIdx);

const hookCode = `import React, { useRef } from 'react';
import { scanDirectories, getDbFiles, saveDbFiles } from '@bitscribe/core-db';
import { evaluatePlexCompatibility } from '@bitscribe/core-eval';
import { MediaItem } from '@bitscribe/core-types';

export function useLocalScanEngine({
  setLastScanDuration,
  setIsScanning,
  setHasCompletedScan,
  setIsResumeState,
  setNotification,
  setScanLogs,
  setScanProgress,
  setCurrentScanFile,
  customRules,
  setCustomRules,
  setScannedFilesList,
  setScannedFiles,
  setCorruptFiles,
  handleTabChange,
  scannedFilesList,
  setIsQuickRefreshState,
  scanPaths
}: any) {
  ${extractedLogic.replace(/React\.useRef/g, 'useRef')}

  return {
    handleStartScan,
    handlePauseScan,
    handleStopScan,
    handleEvaluateDb
  };
}
`;

fs.writeFileSync('apps/steward/src/hooks/useLocalScanEngine.ts', hookCode);

// Remove extracted logic from App.tsx
const newAppContent = appContent.substring(0, startIdx) + 
  "  const { handleStartScan, handlePauseScan, handleStopScan, handleEvaluateDb } = useLocalScanEngine({\n" +
  "    setLastScanDuration,\n" +
  "    setIsScanning,\n" +
  "    setHasCompletedScan,\n" +
  "    setIsResumeState,\n" +
  "    setNotification,\n" +
  "    setScanLogs,\n" +
  "    setScanProgress,\n" +
  "    setCurrentScanFile,\n" +
  "    customRules,\n" +
  "    setCustomRules,\n" +
  "    setScannedFilesList,\n" +
  "    setScannedFiles,\n" +
  "    setCorruptFiles,\n" +
  "    handleTabChange,\n" +
  "    scannedFilesList,\n" +
  "    setIsQuickRefreshState,\n" +
  "    scanPaths\n" +
  "  });\n" +
  appContent.substring(endIdx);

// Need to import useLocalScanEngine in App.tsx
const importIndex = newAppContent.indexOf("import { useScanState }");
const newAppContentWithImport = newAppContent.substring(0, importIndex) + "import { useLocalScanEngine } from './hooks/useLocalScanEngine';\n" + newAppContent.substring(importIndex);

fs.writeFileSync('apps/steward/src/App.tsx', newAppContentWithImport);
console.log("Successfully extracted useLocalScanEngine!");
