import { useState, useEffect } from 'react';
import { saveSettings } from '@bitscribe/core-db';

export function useScanState() {
  const [isScanning, setIsScanning] = useState(false);
  const [isQuickRefreshMode, setIsQuickRefreshState] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentScanFile, setCurrentScanFile] = useState("");
  const [hasCompletedScan, setHasCompletedScan] = useState(false);
  const [isResumeState, setIsResumeState] = useState(() => localStorage.getItem("bitscribe_scan_in_progress") === "true");
  
  const [lastScanDuration, setLastScanDuration] = useState<number | null>(() => {
    const saved = localStorage.getItem("bitscribe_last_scan_duration");
    return saved ? Number(saved) : null;
  });

  useEffect(() => {
    if (lastScanDuration !== null) {
      localStorage.setItem("bitscribe_last_scan_duration", String(lastScanDuration));
      saveSettings({ bitscribe_last_scan_duration: lastScanDuration }).catch(console.error);
    }
  }, [lastScanDuration]);
  
  const [scanLogs, setScanLogs] = useState<string[]>(() => {
    const saved = localStorage.getItem("bitscribe_scan_logs");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return [];
  });

  return {
    isScanning, setIsScanning,
    isQuickRefreshMode, setIsQuickRefreshState,
    scanProgress, setScanProgress,
    currentScanFile, setCurrentScanFile,
    hasCompletedScan, setHasCompletedScan,
    isResumeState, setIsResumeState,
    lastScanDuration, setLastScanDuration,
    scanLogs, setScanLogs
  };
}
