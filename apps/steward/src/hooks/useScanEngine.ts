import { useState, useRef, useTransition, MutableRefObject } from 'react';
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { MediaItem } from '@bitscribe/core-types';

export interface ScanStats {
  totalFiles: number;
  corruptedFiles: number;
  elapsedTime: number;
  warningFiles: number;
}

export interface ProgressPayload {
  progress: number;
  currentFile: string;
  filesProcessed?: number;
  totalFiles?: number;
}

export function useScanEngine({
  customRules,
  scannedFilesList,
  setScannedFilesList,
  setCorruptFiles,
  setMetrics,
  setAnomalyFiles,
  setIsProcessingScan,
  addLogMessage
}: any) {
  const [scanStats, setScanStats] = useState<ScanStats | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "paused" | "completed" | "error">("idle");
  const [dbFilesCount, setDbFilesCount] = useState<number | null>(null);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);

  const scanStateRef = useRef<{
    startTime: number;
    filesProcessedAtStart: number;
    lastUpdateTime: number;
    speeds: number[];
  }>({
    startTime: 0,
    filesProcessedAtStart: 0,
    lastUpdateTime: 0,
    speeds: []
  });

  const unlistenProgressRef = useRef<UnlistenFn | null>(null);
  const unlistenMetricsRef = useRef<UnlistenFn | null>(null);

  const setupScanListeners = async () => {
    unlistenProgressRef.current = await listen<ProgressPayload>("scan-progress", (event) => {
      setScanProgress(event.payload.progress);
      if (event.payload.currentFile) {
        setCurrentFile(event.payload.currentFile);
      }
      
      const processed = event.payload.filesProcessed || 0;
      const total = event.payload.totalFiles || 0;
      const now = Date.now();
      
      const state = scanStateRef.current;
      if (state.lastUpdateTime > 0 && processed > 0) {
        const timeDiff = (now - state.lastUpdateTime) / 1000; 
        if (timeDiff > 1) { 
          const filesDiff = processed - state.filesProcessedAtStart;
          const speed = filesDiff / timeDiff; 
          
          if (speed > 0) {
            state.speeds.push(speed);
            if (state.speeds.length > 5) state.speeds.shift(); 
            
            const avgSpeed = state.speeds.reduce((a, b) => a + b, 0) / state.speeds.length;
            const remaining = total - processed;
            setEstimatedTimeRemaining(Math.round(remaining / avgSpeed));
          }
          
          state.lastUpdateTime = now;
          state.filesProcessedAtStart = processed;
        }
      } else if (state.lastUpdateTime === 0) {
        state.lastUpdateTime = now;
        state.filesProcessedAtStart = processed;
      }
    });
    
    unlistenMetricsRef.current = await listen("scan-metrics", (event: any) => {
      setMetrics(event.payload);
    });
  };

  const cleanupListeners = () => {
    if (unlistenProgressRef.current) {
      unlistenProgressRef.current();
      unlistenProgressRef.current = null;
    }
    if (unlistenMetricsRef.current) {
      unlistenMetricsRef.current();
      unlistenMetricsRef.current = null;
    }
  };

  const updateScanStats = (elapsedTime: number, totalFiles: number, corruptedFiles: number, warningFiles: number) => {
    setScanStats({
      totalFiles,
      corruptedFiles,
      elapsedTime,
      warningFiles
    });
  };

  const startScan = async (directories: string[]) => {
    if (directories.length === 0) return;
    setIsProcessingScan(true);
    setScanStatus("scanning");
    setScanProgress(0);
    setCurrentFile("Initializing fast scanner...");
    setScanStats(null);
    setEstimatedTimeRemaining(null);
    setCorruptFiles([]);
    setAnomalyFiles([]);
    setMetrics({ videoCodecs: {}, audioCodecs: {}, containers: {} });
    addLogMessage(`Initializing multi-threaded scan engine with ${directories.length} root directories...`, 'info');
    
    scanStateRef.current = {
      startTime: Date.now(),
      filesProcessedAtStart: 0,
      lastUpdateTime: 0,
      speeds: []
    };
    
    await setupScanListeners();

    try {
      const result: {
        success: boolean;
        files: MediaItem[];
        corrupt: MediaItem[];
        anomalies: MediaItem[];
        time: number;
        error?: string;
      } = await invoke("scan_directories", { 
        directories,
        rules: customRules
      });
      
      cleanupListeners();

      if (result.success) {
        setScannedFilesList(result.files);
        setCorruptFiles(result.corrupt || []);
        setAnomalyFiles(result.anomalies || []);
        
        let warningCount = 0;
        if (customRules.useLegacyPreset) {
          warningCount = result.files.filter((f: MediaItem) => (f as any).recommendation?.includes("Transcode") || (f as any).recommendation?.includes("Convert")).length;
        } else if (customRules.useAnomalyScan) {
          warningCount = (result.anomalies || []).length;
        } else if (customRules.useDiscoveryPreset) {
          warningCount = result.files.filter((f: MediaItem) => 
            !(f as any).ffprobeData?.video || !(f as any).ffprobeData?.audio
          ).length;
        }
        
        updateScanStats(result.time, result.files.length + (result.corrupt?.length || 0), result.corrupt?.length || 0, warningCount);
        setScanStatus("completed");
        addLogMessage(`Scan completed successfully in ${result.time.toFixed(2)}s. Found ${result.files.length} healthy files, ${result.corrupt?.length || 0} corrupted files, and ${result.anomalies?.length || 0} anomalies.`, 'success');
      } else {
        setScanStatus("error");
        addLogMessage(`Scan engine encountered a critical failure: ${result.error}`, 'error');
        console.error(result.error);
      }
    } catch (e: any) {
      cleanupListeners();
      setScanStatus("error");
      addLogMessage(`Unhandled exception during scan execution: ${e}`, 'error');
      console.error(e);
    } finally {
      setIsProcessingScan(false);
    }
  };

  const pauseScan = async () => {
    try {
      await invoke("pause_scan");
      setScanStatus("paused");
      addLogMessage('Scan engine paused by user.', 'warning');
    } catch (e) {
      console.error("Failed to pause", e);
    }
  };

  const resumeScan = async () => {
    try {
      await invoke("resume_scan");
      setScanStatus("scanning");
      addLogMessage('Scan engine resumed.', 'info');
    } catch (e) {
      console.error("Failed to resume", e);
    }
  };

  const stopScan = async () => {
    try {
      await invoke("stop_scan");
      cleanupListeners();
      setScanStatus("completed");
      addLogMessage('Scan aborted by user.', 'warning');
    } catch (e) {
      console.error("Failed to stop", e);
    }
  };

  return {
    scanStats,
    scanProgress,
    currentFile,
    scanStatus,
    dbFilesCount,
    estimatedTimeRemaining,
    startScan,
    pauseScan,
    resumeScan,
    stopScan,
    setDbFilesCount,
    setScanStatus,
    setCurrentFile,
    setScanProgress,
    setScanStats,
    setEstimatedTimeRemaining
  };
}
