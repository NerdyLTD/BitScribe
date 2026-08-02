import { useAppState } from './hooks/useAppState';
import { useAppTour } from './hooks/useAppTour';
import { useLocalScanEngine } from './hooks/useLocalScanEngine';
import { useScanState } from './hooks/useScanState';
import confetti from "canvas-confetti";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { scanDirectories, getDbFiles, clearDb, saveDbFiles, getDiagnostic, injectDemoData, clearDemoData, saveSettings, loadSettings, logEvent } from '@bitscribe/core-db';
import { MediaItem, RuleCriteria, APP_VERSION, APP_NAME, APP_VERSION_DATE } from '@bitscribe/core-types';
import { filterItemsForReport } from '@bitscribe/core-eval';
import {
  DEFAULT_RULES,
  evaluatePlexCompatibility, computeDuplicatesMap,
} from '@bitscribe/core-eval';
import { scrollToElement } from "./utils/domHelpers";
import Dashboard from "./components/Dashboard";
import RuleEditor from "./components/RuleEditor";
import HelpSection from "./components/HelpSection";
import LogsPanel from "./components/LogsPanel";
import { Header } from "@bitscribe/ui-components";
import { NavigationTabs } from "@bitscribe/ui-components";
import { Sidebar } from "@bitscribe/ui-components";
import ConfirmModal from "./components/modals/ConfirmModal";
import AppResetModal from "./components/modals/AppResetModal";
import DemoCleanupModal from "./components/modals/DemoCleanupModal";
import TourRemoteControl from "./components/modals/TourRemoteControl";
import { ProductTour, TOUR_STEPS } from "./components/ProductTour";
import { EVENTS, STATUS, ACTIONS, EventData } from 'react-joyride';

import { Play, Pause, Sparkles, ChevronLeft, ChevronRight, X as CloseIcon, List, ChevronUp, ChevronDown, GripHorizontal, Sliders, Check, Film, Trash2, Database, Clapperboard, FolderOpen, AlertCircle, AlertTriangle, Download, CheckCircle, Maximize, Minimize } from "lucide-react";
import { open, save } from "@bitscribe/desktop-api";
import { getCurrentWindow } from "@bitscribe/desktop-api";
import { BitsyCharacter } from '@bitscribe/ui-components';
import { useTourSimulation } from './hooks/useTourSimulation';
import { useBackupRestore } from './hooks/useBackupRestore';
import { useDemoActions } from './hooks/useDemoActions';
import { BitsyReel } from '@bitscribe/ui-components';
import { readTextFile, writeFile, mkdir, exists } from "@bitscribe/desktop-api";
import { join } from "@bitscribe/desktop-api";
import { invoke } from "@bitscribe/desktop-api";
import { downloadOrSaveFile } from "@bitscribe/core-export";

// Helper function to reset all active presets and sub-scans, returning rules safely to standard Discovery Mode
const resetToDiscoveryPreset = (prev: RuleCriteria): RuleCriteria => ({
  ...prev,
  useDiscoveryPreset: true,
  useModernPreset: false,
  useLegacyPreset: false,
  useSubtitleScan: false,
  useDuplicationScan: false,
  useDuplicationVideoScan: false,
  useDuplicationMusicScan: false,
  useAnomalyScan: false,
  useMetadataScan: false,
  useVideoMetadataScan: false,
  useMusicMetadataScan: false,
  discoveryHdrFormats: (prev.discoveryHdrFormats && prev.discoveryHdrFormats.length > 0)
    ? prev.discoveryHdrFormats
    : ["SDR", "HDR10", "HDR10+", "Dolby Vision", "HLG", "Advanced HDR"],
});


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

  const [scannedFilesList, setScannedFilesList] = useState<MediaItem[]>([]);
  const [exportCompleteMsg, setExportCompleteMsg] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentExportFile, setCurrentExportFile] = useState("");
  const [exportDirectory, setExportDirectory] = useState<string>(() => localStorage.getItem("bitscribe_export_directory") || "");

  useEffect(() => {
    async function initDirs() {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          const { invoke, join, mkdir, exists } = await import('@bitscribe/desktop-api');
          const dataDir = await invoke("get_data_dir") as string;
          const reportsPath = await join(dataDir, "Reports");
          if (!(await exists(reportsPath))) {
            await mkdir(reportsPath);
          }
        } catch (e) {
          console.error("Failed to init dirs", e);
        }
      }
    }
    initDirs();
  }, []);
  const [isBackupRestoreActive, setIsBackupRestoreActive] = useState(false);
  const [exportFormats, setExportFormats] = useState({ xlsx: true, csv: false, html: false, json: false });
  const [scannedFiles, setScannedFiles] = useState<MediaItem[]>([]);
  const [corruptFiles, setCorruptFiles] = useState<MediaItem[]>([]);
  const [notification, setNotification] = useState<string | { type: string; message: string } | null>(null);
  const [exportProfile, setExportProfile] = useState<string>("Media Discovery");
  const [demoClickedSteps, setDemoClickedSteps] = useState<number[]>([]);
  


  useEffect(() => {
    localStorage.setItem("bitscribe_export_directory", exportDirectory);
    localStorage.setItem("plex_scan_paths", JSON.stringify(scanPaths));
    localStorage.setItem("plex_excel_columns", JSON.stringify(excelColumns));
    localStorage.setItem("plex_compat_rules", JSON.stringify(customRules));
    
    saveSettings({
      bitscribe_export_directory: exportDirectory,
      plex_scan_paths: scanPaths,
      plex_excel_columns: excelColumns,
      plex_compat_rules: customRules,
    }).catch(e => console.error("Failed to sync settings to Tauri", e));
  }, [exportDirectory, scanPaths, excelColumns, customRules]);

  useEffect(() => {
    let active = true;
    const initApp = async () => {
      try {
        const settings = await loadSettings();
        if (settings && Object.keys(settings).length > 0) {
          if (settings.bitscribe_export_directory !== undefined) {
            localStorage.setItem("bitscribe_export_directory", settings.bitscribe_export_directory);
            setExportDirectory(settings.bitscribe_export_directory);
          }
          if (settings.plex_scan_paths !== undefined) {
            localStorage.setItem("plex_scan_paths", JSON.stringify(settings.plex_scan_paths));
            setScanPaths(settings.plex_scan_paths);
          }
          if (settings.plex_excel_columns !== undefined) {
            localStorage.setItem("plex_excel_columns", JSON.stringify(settings.plex_excel_columns));
            setExcelColumns(settings.plex_excel_columns);
          }
          if (settings.plex_compat_rules !== undefined) {
            localStorage.setItem("plex_compat_rules", JSON.stringify(settings.plex_compat_rules));
            setCustomRules(settings.plex_compat_rules);
          }
          if (settings.bitscribe_last_scan_duration !== undefined && settings.bitscribe_last_scan_duration !== null) {
            localStorage.setItem("bitscribe_last_scan_duration", String(settings.bitscribe_last_scan_duration));
            setLastScanDuration(settings.bitscribe_last_scan_duration);
          }
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      }

      try {
        const files = await getDbFiles();
        if (active && files && files.length > 0) {
          const cleanFiles = files.filter((f: any) => f.category !== "Corrupted" && (!f.category || !f.category.toLowerCase().includes("corrupt")));
          const corrupt = files.filter((f: any) => f.category === "Corrupted" || (f.category && f.category.toLowerCase().includes("corrupt")));
          setScannedFiles(cleanFiles);
          setScannedFilesList(cleanFiles);
          setCorruptFiles(corrupt);
          setScanLogs([`Restored ${files.length} library items from portable SQLite database.`]);
          
          if (localStorage.getItem("bitscribe_scan_in_progress") === "true") {
            setNotification({ type: 'warning', message: "Scan was unexpectedly interrupted. Click Resume to finish." });
            setScanLogs(prev => ["Scan was unexpectedly interrupted. Click Resume to finish.", ...prev]);
          }
        }
      } catch (e) {
        console.error("Failed to restore db files:", e);
      }
    };
    initApp();
    return () => { active = false; };
  }, []);

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

  const { handleStartScan, handlePauseScan, handleStopScan, handleEvaluateDb } = useLocalScanEngine({
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
  });

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
    scannedFilesList, 
    setShowDemoCleanupModal,
    setShowCustomColumnsMenu,
    injectDemoData: handlePopulateDemo,
    clearDemoData: flushDemoDataOnly
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

  const total = scannedFilesList.length + corruptFiles.length;

  const MODE_DESCRIPTIONS = {
    "Stream Audit": "Audits compatibility for legacy + modern players.",
    "Media Discovery": "Basic discovery cataloging.",
    "Quality Audit": "Checks video bitrates, anomalies.",
    "Dupe Scan": "Identifies duplicate media files.",
    "Metadata Scan": "Deep FFprobe metadata extraction."
  };

  return (
    <>
      
      

      


      

      <BitsyReel 
        targetSelector={activeDemo !== null ? (demoReelTarget || demoMessage?.targetId || null) : (showTour && tourStepIndex > 0 ? (TOUR_STEPS[tourStepIndex]?.target as string) : null)}
        isVisible={(showTour && tourStepIndex > 0) || (activeDemo !== null && (!!demoMessage?.targetId || !!demoReelTarget)) || isReelEndingAnimation}
        isEndingAnimation={isReelEndingAnimation}
      />
      <ProductTour 
        run={showTour && activeDemo === null} 
        stepIndex={tourStepIndex}
        onFinish={finishTour} 
        onCancel={cancelTour} 
        onRemindLater={remindLaterTour} 
        onJoyrideCallback={handleJoyrideCallback} 
        isDemoRunning={activeDemo !== null}
      />

      {demoMessage && (
        <div 
          ref={demoMsgRef}
          key={demoMessage.text} 
          style={
            !demoMessage.targetId
              ? { bottom: '10rem', left: '50%', transform: 'translateX(-50%)' }
              : { opacity: 0 } // initial state before first frame calculation
          }
          className={`fixed z-[999999] pointer-events-none px-4 py-2 border border-indigo-400 rounded-xl font-sans text-white text-sm font-normal flex items-center justify-center text-center gap-3 animate-flash-msg max-w-[420px] shadow-2xl bg-indigo-900/95`}
        >
          <BitsyCharacter className="w-20 h-20 text-indigo-300 shrink-0" pointing={true} talking={true} mood="excited" />
          <div className="flex-1 text-left leading-tight">{demoMessage.text}</div>
        </div>
      )}

      {activeDemo !== null && (
        <div className="fixed inset-0 bg-[#0c101b]/80 z-[50] pointer-events-none transition-opacity duration-500 animate-in fade-in" />
      )}

      <TourRemoteControl
        showTour={showTour}
        tourPosition={tourPosition}
        isTourDragging={isTourDragging}
        handleTourMouseDown={handleTourMouseDown}
        tourStepIndex={tourStepIndex}
        tourSteps={TOUR_STEPS}
        activeDemo={activeDemo}
        setActiveDemo={setActiveDemo}
        isDemoPaused={isDemoPaused}
        setIsDemoPaused={setIsDemoPaused}
        demoClickedSteps={demoClickedSteps}
        setDemoClickedSteps={setDemoClickedSteps}
        demoReelTarget={demoReelTarget}
        demoMessage={demoMessage}
        goToTourStep={goToTourStep}
        finishTour={finishTour}
        cancelTour={cancelTour}
        remindLaterTour={remindLaterTour}
        tourMenuOpen={tourMenuOpen}
        setTourMenuOpen={setTourMenuOpen}
      />

      {confirmAction && (
        <ConfirmModal
          confirmAction={confirmAction}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {showDemoCleanupModal && (
        <DemoCleanupModal
          hasDemoData={localStorage.getItem("bitscribe_demo_data_inserted") === "true"}
          onWipe={async () => {
            try {
              await flushDemoDataOnly();
              setNotification({ type: 'success', message: 'Demo data cleared successfully. Real files are preserved.' });
            } catch (err) {
              console.error("Failed to clear database:", err);
              setNotification({ type: 'error', message: 'Could not automatically wipe demo database.' });
            } finally {
              localStorage.removeItem("bitscribe_demo_data_inserted");
              setShowDemoCleanupModal(false);
              handleTabChange("scan");
              setCustomRules(resetToDiscoveryPreset);
            }
          }}
          onKeep={() => {
            localStorage.removeItem("bitscribe_demo_data_inserted");
            setShowDemoCleanupModal(false);
            handleTabChange("scan");
            setCustomRules(resetToDiscoveryPreset);
            setNotification({ type: 'success', message: 'Kept demo files. You can clear them anytime via the Troubleshooting panel.' });
          }}
          onExit={() => {
            setShowDemoCleanupModal(false);
            handleTabChange("scan");
            setCustomRules(resetToDiscoveryPreset);
          }}
        />
      )}
      <div className={isFluidLayout 
        ? "h-screen w-full min-w-[768px] overflow-hidden bg-[#0F1117] text-slate-200 flex flex-col font-sans selection:bg-blue-500/30"
        : "h-screen min-w-[1024px] overflow-x-auto overflow-y-hidden bg-[#0F1117] text-slate-200 flex flex-col font-sans selection:bg-blue-500/30"
      }>

      {/* Top Center-Aligned Header Lockup */}
      <Header
        activeModeName={activeModeName}
        handleHeaderModeChange={handleHeaderModeChange}
        MODE_DESCRIPTIONS={MODE_DESCRIPTIONS}
        handleTabChange={handleTabChange}
        total={total}
        toggleFullscreen={toggleFullscreen}
        isFullscreen={isFullscreen}
      />

      {/* Main Split Layout */}
      <div className={isFluidLayout ? "flex-1 flex overflow-hidden min-h-0" : "flex-1 flex overflow-hidden min-h-0"}>
        {/* Left Side Navigation & Health Panel */}
        <Sidebar
          isFluidLayout={isFluidLayout}
          scanPaths={scanPaths}
          setScanPaths={setScanPaths}
          handleBrowseFolder={handleBrowseFolder}
          setConfirmAction={setConfirmAction}
          isScanning={isScanning}
          isResumeState={isResumeState}
          handleStartScan={handleStartScan}
          handlePauseScan={handlePauseScan}
          handleStopScan={handleStopScan}
          handleEvaluateDb={handleEvaluateDb}
          activeTab={activeTab}
          handleTabChange={handleTabChange}
          setHelpHighlight={setHelpHighlight}
          scannedFilesList={scannedFilesList}
          corruptFiles={corruptFiles}
          exportFormats={exportFormats}
          setExportFormats={setExportFormats}
          exportProfile={exportProfile}
          setExportProfile={setExportProfile}
          fakeExportMenu={fakeExportMenu}
          customColumnsMenuRef={customColumnsMenuRef}
          showCustomColumnsMenu={showCustomColumnsMenu}
          setShowCustomColumnsMenu={setShowCustomColumnsMenu}
          excelColumns={excelColumns}
          setExcelColumns={setExcelColumns}
          customRules={customRules}
          setScanLogs={setScanLogs}
          setCurrentExportFile={setCurrentExportFile}
          setExportProgress={setExportProgress}
          setIsExporting={setIsExporting}
          setExportCompleteMsg={setExportCompleteMsg}
          setNotification={setNotification}
          exportDirectory={exportDirectory}
          isExporting={isExporting}
          showDiagnostic={showDiagnostic}
          setShowDiagnostic={setShowDiagnostic}
          previousTab={previousTab}
          setTourStepIndex={setTourStepIndex}
          setShowTour={setShowTour}
          setScannedFiles={setScannedFiles}
          setScannedFilesList={setScannedFilesList}
          setCorruptFiles={setCorruptFiles}
          setHasCompletedScan={setHasCompletedScan}
          onPopulateDemo={handlePopulateDemo}
        />

        {/* Right Main Content Panel */}
        <main className="flex-1 flex flex-col bg-[#0F1117] overflow-hidden min-h-0">
          {/* Tab Selection Navigation Header */}
          <NavigationTabs
            activeTab={activeTab}
            handleTabChange={handleTabChange}
            total={total}
          />
          
          

          {/* Sub-page display contents (Scrollable area) */}
          <div
            className={`flex-1 flex flex-col ${activeTab === "library" ? "overflow-hidden px-4 pb-4 pt-4" : "overflow-y-auto px-4 pb-12 pt-0"} scroll-pt-[200px] ${isPending ? "opacity-60 pointer-events-none transition-opacity duration-200" : "opacity-100 transition-opacity duration-200"}`}
            id="applet-subpage-scroll-container"
          >
            {/* Global Notification Banner */}
            {notification && (
              <div className={`mt-4 mb-4 p-4 rounded-xl border flex items-center justify-between gap-3 shadow-lg transition-all animate-in slide-in-from-top-3 duration-300 ${
                (typeof notification === 'object' && notification !== null && notification.type === 'error')
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-rose-950/10"
                  : (typeof notification === 'object' && notification !== null && (notification.type === 'export' || notification.type === 'warning'))
                    ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300 shadow-yellow-950/10"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-emerald-950/10"
              }`}>
                <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold tracking-wide">
                  {(typeof notification === 'object' && notification !== null && notification.type === 'error') ? (
                    <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                  ) : (typeof notification === 'object' && notification !== null && (notification.type === 'export' || notification.type === 'warning')) ? (
                    notification.type === 'warning' ? <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" /> : <Download className="w-5 h-5 text-yellow-400 shrink-0" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                  )}
                  <span>
                    {typeof notification === 'string' ? notification : notification.message}
                  </span>
                </div>
                <button
                  onClick={() => setNotification(null)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-bold"
                  title="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            )}

            <div className={(renderedTab === "scan" || renderedTab === "library") ? "flex-1 flex flex-col min-h-0" : "hidden"}>
              <Dashboard
                customRules={customRules}
                onRulesChange={setCustomRules}
                onSelectScannedFiles={setScannedFilesList}
                scanPaths={scanPaths}
                setScanPaths={setScanPaths}
                excelColumns={excelColumns}
                showDiagnostic={renderedTab === 'scan' ? showDiagnostic : false}
                showFileRegistry={renderedTab === 'library'}
                showMetrics={renderedTab === 'scan' ? showMetrics : false}
                isScanning={isScanning}
                isExporting={isExporting}
                exportProgress={exportProgress}
                currentExportFile={currentExportFile}
                isQuickRefresh={isQuickRefreshMode}
                isTourActive={showTour}
                tourStepIndex={tourStepIndex}
                activeDemo={activeDemo}

                scanProgress={scanProgress}
                currentScanFile={currentScanFile}
                scanLogs={scanLogs}
                scannedFiles={scannedFiles}
                corruptFiles={corruptFiles}
                notification={null}
                lastScanDuration={lastScanDuration}

              />
            </div>

            <div className={renderedTab === "rules" ? "block" : "hidden"}>
              <RuleEditor
                onAppReset={() => {
                  setConfirmAction({
                    message: "Warning: Are you sure you want to COMPLETELY WIPE your app state, paths, settings, and database? This cannot be undone.",
                    onConfirm: () => {
                      setIsAppResetting(true);
                    }
                  });
                }}
                onWipeDB={() => {
                  setConfirmAction({
                    message: "DANGER: Are you sure you want to wipe the server database? All indexed media will be removed.",
                    onConfirm: () => {
                      flushServerDatabase();
                      if (activeTab === "logs") {
                        handleTabChange("scan");
                      }
                    }
                  });
                }}
                isFluidLayout={isFluidLayout}
                onFluidLayoutChange={handleFluidLayoutChange}
                exportDirectory={exportDirectory}
                setExportDirectory={setExportDirectory}
                onBackup={handleBackup}
                onRestore={handleRestore}
                rules={customRules}
                onRulesChange={setCustomRules}
                excelColumns={excelColumns}
                onExcelColumnsChange={setExcelColumns}
                onCorruptionScanSelect={() => {
                  // 
                }}
                onVideoOnlySelect={() => {
                  // 
                }}
                onMusicOnlySelect={() => {
                  // 
                }}
                onStreamingCompatibilitySelect={() => {
                  // 
                }}
                onDiscoveryModeSelect={() => {
                  // 
                }}
                onMetadataScanSelect={() => {
                  // 
                }}
                onHelpRequest={(id) => {
                  handleTabChange("help");
                  setHelpHighlight(id);
                }}
                onPopulateDemo={handlePopulateDemo}
                onClearDemoData={flushDemoDataOnly}
              />
            </div>

            <div className={renderedTab === "help" ? "block" : "hidden"}>
              <HelpSection highlightId={helpHighlight} isTourActive={showTour}
                tourStepIndex={tourStepIndex} activeDemo={activeDemo} />
            </div>

            <div className={renderedTab === "logs" ? "block" : "hidden"}>
              <LogsPanel logs={scanLogs} />
            </div>
            <div className="h-12 w-full shrink-0 pointer-events-none" />
          </div>

            {isAppResetting && (
              <AppResetModal onComplete={() => {
                localStorage.clear();
                clearDb().then(() => {
                  window.location.reload();
                }).catch(() => {
                  window.location.reload();
                });
              }} />
            )}
          </main>
      </div>
    </div>
    </>
  );

  useEffect(() => {
    logEvent("INFO", "AppLifecycle", "BitScribe application launched", false);
  }, []);

  }