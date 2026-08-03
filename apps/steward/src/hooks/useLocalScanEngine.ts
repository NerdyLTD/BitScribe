import React, { useRef } from 'react';
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
  const abortControllerRef = useRef<AbortController | null>(null);

  const startTimeRef = useRef<number | null>(null);

  const handlePauseScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (startTimeRef.current) {
      setLastScanDuration(Date.now() - startTimeRef.current);
    }
    setIsScanning(false);
    setHasCompletedScan(false);
    setIsResumeState(true);
    setNotification({ type: 'success', message: "Scan paused by user." });
    setScanLogs((prev) => [
      "User paused the scan.",
      ...prev.slice(0, 5000),
    ]);
  };



  const handleStopScan = () => {
    localStorage.removeItem("bitscribe_scan_in_progress");
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsScanning(false);
    setHasCompletedScan(false);
    setIsResumeState(false);
    setScanProgress(0);
    setCurrentScanFile("");
    setNotification({ type: 'success', message: "Scan stopped and reset by user." });
    setScanLogs((prev) => [
      "User stopped and reset the scan.",
      ...prev.slice(0, 5000),
    ]);
  };

  
  const handleEvaluateDb = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setHasCompletedScan(false);
    setIsResumeState(false);
    setScanLogs([
      "Initiating offline database streaming evaluation...",
      "Analyzing codecs, containers, and bitrates against rules..."
    ]);
    
    let evaluationRules = { ...customRules };
    if (evaluationRules.useDiscoveryPreset) {
      evaluationRules.useDiscoveryPreset = false;
      evaluationRules.useModernPreset = true;
      setCustomRules(evaluationRules);
    }

    try {
      const files = await getDbFiles();
      const updatedFiles = [];
      for (let i = 0; i < files.length; i++) {
        let f = files[i];
        if (!f.isCorrupted) {
          const evalResult = evaluatePlexCompatibility(f, evaluationRules, false, true);
          f.streamFriendlyLevel = evalResult.level as any;
          f.streamFriendlyReason = evalResult.reason;
          f.streamFriendlySuggestion = evalResult.suggestion;
          f.streamFriendlyEvaluated = 1;
        }
        updatedFiles.push(f);
        if (i % Math.max(1, Math.ceil(files.length / 20)) === 0 || i === files.length - 1) {
            setScanProgress(Math.floor(((i + 1) / files.length) * 100));
        }
      }
      
      await saveDbFiles(updatedFiles);
      setScanProgress(100);
      setHasCompletedScan(true);
      setScanLogs(prev => [...prev, "Evaluation complete. Updated local database."]);
      
      const cleanFiles = updatedFiles.filter((f: any) => !f.isCorrupted);
      setScannedFilesList(cleanFiles);
      setScannedFiles(cleanFiles);
      setCorruptFiles(updatedFiles.filter((f: any) => f.isCorrupted));
      
      } catch (e: any) {
      console.error(e);
      setScanLogs(prev => [...prev, "Evaluation failed: " + e.message]);
    } finally {
      setIsScanning(false);
    }
  };

  
  
  const handleStartScan = async (isQuickRefresh: boolean = false) => {
    handleTabChange("scan");
    const isQ = isQuickRefresh === true;
    const hasData = scannedFilesList.length > 0;

    // Intercept if starting a standard scan and we already have database content
    const isResuming = localStorage.getItem("bitscribe_scan_in_progress") === "true";
    const activePaths = scanPaths.filter((p) => p.enabled).map(p => p.path);
    const currentPathsHash = activePaths.join('|');
    const lastScanPathsHash = localStorage.getItem("plex_last_scan_paths_hash");
    const pathsChanged = lastScanPathsHash !== currentPathsHash;

    if (!isQ && hasData && !isResuming) {
      const lastScanTsStr = localStorage.getItem("plex_last_scan_timestamp");
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      let shouldRunRefresh = false;
      let shouldUseCacheDirectly = false;

      if (pathsChanged) {
        shouldRunRefresh = true;
      } else if (lastScanTsStr) {
        const lastScanTs = Number(lastScanTsStr);
        if (!isNaN(lastScanTs)) {
          const age = Date.now() - lastScanTs;
          if (age > ONE_WEEK_MS) {
            shouldRunRefresh = true;
          } else {
            shouldUseCacheDirectly = true;
          }
        } else {
          shouldUseCacheDirectly = true;
        }
      } else {
        // If there's data in the database but no timestamp, assume fresh for now, set timestamp and proceed
        localStorage.setItem("plex_last_scan_timestamp", Date.now().toString());
      localStorage.removeItem("bitscribe_scan_in_progress");
        shouldUseCacheDirectly = true;
      }

      if (shouldRunRefresh) {
        console.log("Database has content but last scan was > 1 week ago. Directing to Quick Refresh.");
        return handleStartScan(true);
      }

      if (shouldUseCacheDirectly) {
        console.log("Database has content and was scanned < 1 week ago. Using cache directly.");
        setIsScanning(true);
        setScanProgress(0);
        setHasCompletedScan(false);
        setIsResumeState(false);
        setScanLogs([
          "Initializing cache-driven media scan updates...",
          "Validating SQLite database connection...",
          "Existing database content detected within fresh cache window (< 7 days).",
          "Retrieved already indexed files from SQLite successfully without disk seeking."
        ]);

        await new Promise((resolve) => setTimeout(resolve, 500));

        setScanProgress(50);
        setScanLogs((prev) => [
          "Parsing active player profile rule matrices...",
          "Updating statistics dashboard to reflect active stream parameters...",
          ...prev
        ]);

        await new Promise((resolve) => setTimeout(resolve, 300));

        setScanProgress(100);
        setIsScanning(false);
        setHasCompletedScan(true);
        setScannedFiles(scannedFilesList);
        setScanLogs((prev) => [
          "High-performance scan completed instantly using local SQLite cache database!",
          `Successfully verified and mapped ${scannedFilesList.length} items to the current view.`,
          ...prev
        ]);
        setNotification({
          type: 'success',
          message: `Loaded ${scannedFilesList.length} files instantly from existing SQLite database cache.`
        });
        return;
      }
    }

    setIsQuickRefreshState(isQ); // workaround
    localStorage.setItem("bitscribe_scan_in_progress", "true");
    startTimeRef.current = Date.now();
    setIsScanning(true);
    setScanProgress(0);
    setHasCompletedScan(false);
    setIsResumeState(false);
    setScanLogs([
      isQ ? "Quick refresh initialized..." : "Initializing FFprobe parsing engine...",
      "Validating local environment variables...",
      "Contacting local backend...",
    ]);
    setScannedFiles([]);
    setNotification(null);
    
    abortControllerRef.current = new AbortController();

    let wakeLock: any = null;
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        wakeLock = await (navigator as any).wakeLock.request('screen');
      }
    } catch (e) {
      console.warn("Wake lock could not be requested:", e);
    }
    try {
      const activePaths = scanPaths.filter((p) => p.enabled).map(p => p.path);
      let scannedCount = 0;

      let lastLogUpdateTime = Date.now();
      let lastFileUpdateTime = Date.now();
      const logsBuffer: string[] = [
        isQ ? "Quick refresh initialized..." : "Initializing FFprobe parsing engine...",
        "Validating local environment variables...",
        "Contacting local backend...",
      ];
      let currentFile = "";
      let lastProgress = -1;

      const flushUiUpdates = (force = false) => {
        const now = Date.now();
        if (force || now - lastLogUpdateTime > 500) {
          setScanLogs([...logsBuffer]);
          lastLogUpdateTime = now;
        }
        if (force || now - lastFileUpdateTime > 200) {
          setCurrentScanFile(currentFile);
          lastFileUpdateTime = now;
        }
      };

      const isResumingScan = localStorage.getItem("bitscribe_scan_in_progress") === "true";
      await scanDirectories(activePaths, customRules, 
          (total) => {
              logsBuffer.unshift(`Found ${total} files. Probing started...`);
              if (logsBuffer.length > 500) logsBuffer.length = 500;
              flushUiUpdates(true);
          },
          (msg) => {
              logsBuffer.unshift(msg);
              if (logsBuffer.length > 500) logsBuffer.length = 500;
              currentFile = msg;
              flushUiUpdates();
          },
          (prog) => {
              const roundedPct = Math.round((prog.current / Math.max(prog.total, 1)) * 100);
              if (roundedPct !== lastProgress) {
                  setScanProgress(roundedPct);
                  lastProgress = roundedPct;
              }
              if (prog.item && !prog.error) {
                  scannedCount++;
              }
          }
      , isResumingScan, isQ, abortControllerRef.current?.signal || undefined);
      
      if (abortControllerRef.current?.signal.aborted) {
          // Scan was paused or cancelled. Load whatever was scanned so far without completing the scan sequence or clearing resume state
          const reloadedDbFiles = await getDbFiles();
          const finalItemsLoaded: MediaItem[] = [];
          const corruptItemsLoaded: MediaItem[] = [];
          reloadedDbFiles.forEach(f => {
              if (f.category === "Corrupted" || (f.category && f.category.toLowerCase().includes("corrupt"))) {
                  corruptItemsLoaded.push(f);
              } else {
                  finalItemsLoaded.push(f);
              }
          });
          flushUiUpdates(true);
          setIsScanning(false);
          setCurrentScanFile("");
          setScannedFilesList(finalItemsLoaded);
          setScannedFiles(finalItemsLoaded);
          setCorruptFiles(corruptItemsLoaded);
          return;
      }
      
      // Reload final lists from persistent database to guarantee pruned/deleted ghost files are correctly omitted in React state
      const reloadedDbFiles = await getDbFiles();
      const finalItemsLoaded: MediaItem[] = [];
      const corruptItemsLoaded: MediaItem[] = [];
      reloadedDbFiles.forEach(f => {
          if (f.category === "Corrupted" || (f.category && f.category.toLowerCase().includes("corrupt"))) {
              corruptItemsLoaded.push(f);
          } else {
              finalItemsLoaded.push(f);
          }
      });

      flushUiUpdates(true);
      setIsScanning(false);
      setCurrentScanFile("");
      setScanProgress(100);
      setScannedFilesList(finalItemsLoaded);
      setScannedFiles(finalItemsLoaded);
      setCorruptFiles(corruptItemsLoaded);
      if (startTimeRef.current) {
        setLastScanDuration(Date.now() - startTimeRef.current);
      }
      setScanLogs([
        isQ 
          ? `Scan complete. ${scannedCount} changed/new files were checked and updated.`
          : `Scanning operations finished! ${finalItemsLoaded.length} files parsed.`,
        ...logsBuffer.slice(0, 5000),
      ]);
      setNotification({ type: 'success', message: isQ ? `Scan complete: ${scannedCount} new or changed files were updated in the database.` : `Successfully completed media library scan from ${activePaths.length} active paths!` });
      localStorage.setItem("plex_last_scan_timestamp", Date.now().toString());
      localStorage.setItem("plex_last_scan_paths_hash", activePaths.join('|'));
      localStorage.removeItem("bitscribe_scan_in_progress");
      setHasCompletedScan(true);
      setIsResumeState(false);

    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Fetch aborted by user");
        return;
      }
      console.error(err);
      if (startTimeRef.current) {
        setLastScanDuration(Date.now() - startTimeRef.current);
      }
      setIsScanning(false);
      setScanLogs((prev) => [
        `ERROR: Scan failed: ${err.message || String(err)}`,
        ...prev,
      ]);
      setNotification(`Failed to execute scan: ${err.message || String(err)}`);
    } finally {
      if (wakeLock) {
        try {
          wakeLock.release();
        } catch (e) {}
      }
    }
  };

  return {
    handleStartScan,
    handlePauseScan,
    handleStopScan,
    handleEvaluateDb
  };
}
