import { clearDemoData, getDbFiles, injectDemoData, clearDb } from "@bitscribe/core-db";
import { MediaItem } from "@bitscribe/core-types";

interface UseDemoActionsProps {
  setScanLogs: (val: any) => void;
  setScannedFilesList: (val: MediaItem[]) => void;
  setScannedFiles: (val: MediaItem[]) => void;
  setCorruptFiles: (val: MediaItem[]) => void;
  setHasCompletedScan: (val: boolean) => void;
  setNotification: (val: any) => void;
}

export function useDemoActions({
  setScanLogs,
  setScannedFilesList,
  setScannedFiles,
  setCorruptFiles,
  setHasCompletedScan,
  setNotification,
}: UseDemoActionsProps) {
  const clearLocalCacheOnly = () => {
    const confirmed = true;
    if (!confirmed) return;

    localStorage.removeItem("bitscribe_scan_logs");
    setScanLogs([]);
    setScannedFiles([]);
    setScannedFilesList([]);
    setCorruptFiles([]);
    setHasCompletedScan(false);
    setNotification("Local display cache cleared successfully.");
  };

  const flushServerDatabase = async () => {
    const confirmed = true;
    if (!confirmed) return;

    localStorage.removeItem("bitscribe_scan_logs");
    try {
      await clearDb();
      setScanLogs(["Persistent SQL database completely flushed and wiped."]);
      setNotification("Server SQL database flushed successfully.");
    } catch (e) {
      console.error("Failed to clear database on server:", e);
      setScanLogs(["Failed to connect to server database."]);
      setNotification({ type: 'error', message: "Failed to connect to server database." });
    }
    setScannedFiles([]);
    setScannedFilesList([]);
    setCorruptFiles([]);
    setHasCompletedScan(false);
  };

  const flushDemoDataOnly = async () => {
    localStorage.removeItem("bitscribe_demo_data_inserted");
    try {
      await clearDemoData();
      const reloaded = await getDbFiles();
      setScannedFilesList(reloaded);
        
      const nonCorrupt = reloaded.filter(f => !(f.category === "Corrupted" || (f.category && f.category.toLowerCase().includes("corrupt"))));
      const corrupt = reloaded.filter(f => f.category === "Corrupted" || (f.category && f.category.toLowerCase().includes("corrupt")));
      setScannedFiles(nonCorrupt);
      setCorruptFiles(corrupt);
        
      if (reloaded.length === 0) {
        setHasCompletedScan(false);
      }
      setScanLogs(["Demo media files removed from local database."]);
      setNotification("Demo media files cleared successfully.");
    } catch (e) {
      console.error("Failed to clear demo data:", e);
      setNotification({ type: 'error', message: "Failed to clear demo data." });
    }
  };

  const handlePopulateDemo = async () => {
    localStorage.setItem("bitscribe_demo_data_inserted", "true");
    try {
      await injectDemoData();
      const reloaded = await getDbFiles();
      setScannedFilesList(reloaded);
        
      const nonCorrupt = reloaded.filter(f => !(f.category === "Corrupted" || (f.category && f.category.toLowerCase().includes("corrupt"))));
      const corrupt = reloaded.filter(f => f.category === "Corrupted" || (f.category && f.category.toLowerCase().includes("corrupt")));
      setScannedFiles(nonCorrupt);
      setCorruptFiles(corrupt);
        
      setHasCompletedScan(true);
      setScanLogs(["Demo data successfully injected into local database!"]);
      setNotification({ type: 'success', message: 'Demo library loaded! Navigate to Media Registry to view it.' });
    } catch (e) {
      console.error("Failed to inject demo data:", e);
      setNotification({ type: 'error', message: "Failed to load demo data." });
    }
  };

  return {
    clearLocalCacheOnly,
    flushServerDatabase,
    flushDemoDataOnly,
    handlePopulateDemo
  };
}
