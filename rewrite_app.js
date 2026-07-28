const fs = require('fs');

let appContent = fs.readFileSync('apps/steward/src/App.tsx', 'utf8');

const startIdx = appContent.indexOf('export default function App() {');
const mainReturnIdx = appContent.lastIndexOf('  return (');

let newTop = `
export default function App() {
  const {
    isScanning, setIsScanning,
    isQuickRefreshMode, setIsQuickRefreshState,
    scanProgress, setScanProgress,
    currentScanFile, setCurrentScanFile,
    hasCompletedScan, setHasCompletedScan,
    isResumeState, setIsResumeState,
    lastScanDuration, setLastScanDuration,
    scanLogs, setScanLogs
  } = useScanState();

  const {
    activeTab, setActiveTab,
    renderedTab, setRenderedTab,
    isPending, startTransition,
    handleTabChange,
    isFullscreen, setIsFullscreen,
    fakeExportMenu, setFakeExportMenu,
    helpHighlight, setHelpHighlight,
    previousTab, setPreviousTab,
    isFluidLayout, setIsFluidLayout,
    scanPaths, setScanPaths,
    excelColumns, setExcelColumns,
    showCustomColumnsMenu, setShowCustomColumnsMenu,
    customRules, setCustomRules,
    showDiagnostic, setShowDiagnostic,
    showFileRegistry, setShowFileRegistry,
    showMetrics, setShowMetrics,
    confirmAction, setConfirmAction,
    isAppResetting, setIsAppResetting,
    showDemoCleanupModal, setShowDemoCleanupModal
  } = useAppState();

  const {
    showTour, setShowTour,
    tourStepIndex, setTourStepIndex,
    demoMessage, setDemoMessage,
    demoReelTarget, setDemoReelTarget,
    demoMsgRef,
    activeDemo, setActiveDemo,
    isDemoPaused, setIsDemoPaused,
    isDemoPausedRef,
    tourMenuOpen, setTourMenuOpen,
    tourPosition, setTourPosition,
    isTourDragging, setIsTourDragging,
    tourDragStart, setTourDragStart,
    isReelEndingAnimation, setIsReelEndingAnimation,
    handleTourMouseDown,
    finishTour,
    cancelTour,
    remindLaterTour,
    goToTourStep,
    handleJoyrideCallback
  } = useAppTour({
    activeTab,
    handleTabChange,
    setShowMetrics,
    setShowDiagnostic,
    setCustomRules,
    resetToDiscoveryPreset,
    scannedFilesList: [], 
    setShowDemoCleanupModal,
    setShowCustomColumnsMenu,
    injectDemoData: async () => {} 
  });

  const [scannedFilesList, setScannedFilesList] = useState<MediaItem[]>([]);
  const [exportCompleteMsg, setExportCompleteMsg] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentExportFile, setCurrentExportFile] = useState("");
  const [exportDirectory, setExportDirectory] = useState<string>(() => localStorage.getItem("bitscribe_export_directory") || "");
  const [isBackupRestoreActive, setIsBackupRestoreActive] = useState(false);
  const [exportFormats, setExportFormats] = useState({ xlsx: true, csv: false, html: false, json: false });
  const [scannedFiles, setScannedFiles] = useState<MediaItem[]>([]);
  const [corruptFiles, setCorruptFiles] = useState<MediaItem[]>([]);
  const [notification, setNotification] = useState<string | { type: string; message: string } | null>(null);
  const [exportProfile, setExportProfile] = useState<string>("Media Discovery");
  const [demoClickedSteps, setDemoClickedSteps] = useState<number[]>([]);
  
  const customColumnsMenuRef = useRef<HTMLDivElement>(null);

  const handleBrowseFolder = async () => {
    try {
      if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
        alert("File browsing is only available in the desktop app.");
        return;
      }
      const selected = await open({
        directory: true,
        multiple: true,
      });
      if (Array.isArray(selected) && selected.length > 0) {
        setScanPaths(prev => [
            ...prev,
            ...selected.map(p => ({ path: p, enabled: true }))
        ]);              
      } else if (selected && typeof selected === "string") {
        setScanPaths(prev => [...prev, { path: selected, enabled: true }]);
      }
    } catch (err) {
      console.error("Failed to open dialog:", err);
    }
  };

  const { handleBackup, handleRestore } = useBackupRestore({
    exportDirectory,
    setNotification,
    setScanPaths,
    setExcelColumns,
    setCustomRules,
    setExportDirectory,
    setScannedFilesList,
  });

  const { clearLocalCacheOnly, flushServerDatabase, flushDemoDataOnly, handlePopulateDemo } = useDemoActions({
    setScanLogs,
    setScannedFilesList,
    setScannedFiles,
    setCorruptFiles,
    setHasCompletedScan,
    setNotification,
  });

  useTourSimulation({
    showTour,
    activeDemo,
    setActiveDemo,
    setDemoMessage,
    setDemoReelTarget,
    setIsDemoPaused,
    setExportProfile,
    setFakeExportMenu,
    setShowCustomColumnsMenu,
    setCustomRules,
    isDemoPausedRef
  });

  useEffect(() => {
    if (!showTour) return;
    setShowMetrics(tourStepIndex >= 7 && tourStepIndex <= 19);
    setShowDiagnostic(tourStepIndex === 5);
    if (tourStepIndex === 4) {
      setExportProfile("Custom Fields");
      setShowCustomColumnsMenu(true);
    } else {
      setShowCustomColumnsMenu(false);
    }
    if (tourStepIndex === 26) {
      setCustomRules(prev => ({ ...prev, useDiscoveryPreset: true, useModernPreset: false, useLegacyPreset: false, useSubtitleScan: false, useDuplicationScan: false, useAnomalyScan: false, useMetadataScan: false }));
    } else if (tourStepIndex === 27) {
      setCustomRules(prev => ({ ...prev, useDiscoveryPreset: false, useModernPreset: true, useLegacyPreset: true }));
    } else if (tourStepIndex === 28) {
      setCustomRules(prev => ({ ...prev, useSubtitleScan: true }));
    } else if (tourStepIndex === 29) {
      setCustomRules(prev => ({ ...prev, useDuplicationScan: true, useDuplicationVideoScan: true, useDuplicationMusicScan: true }));
    } else if (tourStepIndex === 30) {
      setCustomRules(prev => ({ ...prev, useAnomalyScan: true }));
    } else if (tourStepIndex === 31) {
      setCustomRules(prev => ({ ...prev, useMetadataScan: true }));
    }
  }, [tourStepIndex, showTour]);

  useEffect(() => {
    const savedRules = localStorage.getItem("plex_compat_rules");
    if (savedRules) {
      try {
        const parsed = JSON.parse(savedRules);
        let activeCount = 0;
        if (parsed.useDiscoveryPreset) activeCount++;
        if (parsed.useModernPreset || parsed.useLegacyPreset) activeCount++;
        if (parsed.useSubtitleScan) activeCount++;
        if (parsed.useDuplicationScan) activeCount++;
        if (parsed.useAnomalyScan) activeCount++;
        if (parsed.useMetadataScan) activeCount++;
        if (activeCount > 1 && !parsed.useBleedingEdgePreset) {
          setCustomRules(prev => ({ ...prev, useBleedingEdgePreset: true }));
        } else if (activeCount <= 1 && parsed.useBleedingEdgePreset) {
          setCustomRules(prev => ({ ...prev, useBleedingEdgePreset: false }));
        }
      } catch(e) {}
    }
  }, [customRules]);

  useEffect(() => {
    if (!customRules.useMetadataScan) {
      setCustomRules(prev => ({ ...prev, useVideoMetadataScan: false, useMusicMetadataScan: false }));
    }
  }, [customRules.useMetadataScan]);

  const handleHeaderModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) return;
    const updatedRules = { ...customRules };
    let updatedExcel = { ...excelColumns };
    updatedRules.useModernPreset = false;
    updatedRules.useLegacyPreset = false;
    updatedRules.useBleedingEdgePreset = false;
    updatedRules.useDiscoveryPreset = false;
    updatedRules.useSubtitleScan = false;
    updatedRules.useDuplicationScan = false;
    updatedRules.useDuplicationVideoScan = false;
    updatedRules.useDuplicationMusicScan = false;
    updatedRules.useAnomalyScan = false;
    updatedRules.useMetadataScan = false;
    updatedRules.useVideoMetadataScan = false;
    updatedRules.useMusicMetadataScan = false;
    Object.keys(updatedExcel).forEach(k => {
      if (k !== "File Name" && k !== "Library Path" && k !== "Library Section" && k !== "Size (GB)") {
        updatedExcel[k] = false;
      }
    });

    if (val === "Stream Audit") {
      updatedRules.useModernPreset = true;
      updatedRules.useLegacyPreset = true;
      updatedRules.useSubtitleScan = true;
      updatedExcel["Container"] = true;
      updatedExcel["Video Codec"] = true;
      updatedExcel["Audio Tracks"] = true;
      updatedExcel["Stream Audit"] = true;
    } else if (val === "Media Discovery") {
      updatedRules.useDiscoveryPreset = true;
      updatedExcel["Duration (Mins)"] = true;
      updatedExcel["Year"] = true;
      updatedExcel["Resolution"] = true;
    } else if (val === "Quality Audit") {
      updatedRules.useAnomalyScan = true;
      updatedExcel["Video Bitrate"] = true;
      updatedExcel["Bitrate Anomaly"] = true;
      updatedExcel["Anomaly Reason"] = true;
      updatedExcel["Corruption Status"] = true;
    } else if (val === "Dupe Scan") {
      updatedRules.useDuplicationScan = true;
      updatedRules.useDuplicationVideoScan = true;
      updatedRules.useDuplicationMusicScan = true;
      updatedExcel["Resolution"] = true;
      updatedExcel["Duration (Mins)"] = true;
      updatedExcel["Video Codec"] = true;
    } else if (val === "Metadata Scan") {
      updatedRules.useMetadataScan = true;
      updatedRules.useVideoMetadataScan = true;
      updatedRules.useMusicMetadataScan = true;
      updatedExcel["Resolution"] = true;
      updatedExcel["Video Codec"] = true;
      updatedExcel["Audio Tracks"] = true;
      updatedExcel["Audio Bitrate"] = true;
      updatedExcel["Subtitle Tracks"] = true;
      updatedExcel["Bit Depth"] = true;
      updatedExcel["Audio Hz"] = true;
      updatedExcel["Chapters"] = true;
    }

    setCustomRules(updatedRules);
    setExcelColumns(updatedExcel);
  };

  const handleFluidLayoutChange = (val: boolean) => {
    setIsFluidLayout(val);
    localStorage.setItem("bitscribe_layout_fluid", JSON.stringify(val));
  };
  
  const toggleFullscreen = () => { setIsFullscreen(!isFullscreen); };
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customColumnsMenuRef.current && !customColumnsMenuRef.current.contains(e.target as Node)) {
        setShowCustomColumnsMenu(false);
      }
    };
    if (showCustomColumnsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCustomColumnsMenu]);

  const activeModeName = 
    customRules.useMetadataScan ? "Metadata Scan" : 
    customRules.useDuplicationScan ? "Dupe Scan" : 
    customRules.useAnomalyScan ? "Quality Audit" : 
    customRules.useModernPreset ? "Stream Audit" : "Media Discovery";

  const total = scannedFilesList.length;

  const MODE_DESCRIPTIONS = {
    "Stream Audit": "Audits compatibility for legacy + modern players.",
    "Media Discovery": "Basic discovery cataloging.",
    "Quality Audit": "Checks video bitrates, anomalies.",
    "Dupe Scan": "Identifies duplicate media files.",
    "Metadata Scan": "Deep FFprobe metadata extraction."
  };

`;

appContent = appContent.substring(0, startIdx) + newTop + appContent.substring(mainReturnIdx);
appContent = "import { useAppState } from './hooks/useAppState';\nimport { useAppTour } from './hooks/useAppTour';\n" + appContent;
fs.writeFileSync('apps/steward/src/App.tsx', appContent);
