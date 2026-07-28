import { useState, useTransition } from 'react';
import { MediaItem, RuleCriteria } from '@bitscribe/core-types';
import { DEFAULT_RULES } from '@bitscribe/core-eval';

export function useAppState() {
  const [activeTab, setActiveTab] = useState<"scan" | "library" | "rules" | "help" | "logs">("scan");
  const [renderedTab, setRenderedTab] = useState<"scan" | "library" | "rules" | "help" | "logs">("scan");
  const [isPending, startTransition] = useTransition();
  const handleTabChange = (tab: "scan" | "library" | "rules" | "help" | "logs") => { setActiveTab(tab); startTransition(() => setRenderedTab(tab)); };
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fakeExportMenu, setFakeExportMenu] = useState<{show: boolean, highlight: string | null}>({show: false, highlight: null});
  const [helpHighlight, setHelpHighlight] = useState<string | null>(null);
  const [previousTab, setPreviousTab] = useState<"scan" | "library" | "rules" | "help">("scan");
  
  const [isFluidLayout, setIsFluidLayout] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem("bitscribe_layout_fluid");
      return val ? JSON.parse(val) : true;
    } catch (e) {
      return true;
    }
  });

  const [scanPaths, setScanPaths] = useState<Array<{ path: string; enabled: boolean }>>([]);
  
  const [excelColumns, setExcelColumns] = useState<Record<string, boolean>>({
    "File Name": true,
    "Library Path": true,
    "Library Section": true,
    "Container": true,
    "Size (GB)": true,
    "Duration (Mins)": true,
    "Year": true,
    "Video Codec": true,
    "Resolution": true,
    "Video Bitrate": true,
    "Audio Tracks": true,
    "Subtitle Tracks": true,
    "Tags": true,
    "Audio Bitrate": true,
    "Corruption Status": true,
    "Error Message": true,
    "Missing Poster?": false,
    "Bitrate Anomaly": false,
    "Anomaly Reason": false,
    "Stream Audit": false,
    "Audit Reason": false,
    "Audit Suggestion": false,
    "Bit Depth": false,
    "Audio Hz": false,
    "Chapters": false,
    "Matches Database": false
  });
  
  const [showCustomColumnsMenu, setShowCustomColumnsMenu] = useState(false);
  
  const [customRules, setCustomRules] = useState<RuleCriteria>(() => {
    const isFirstRun = !localStorage.getItem("bitscribe_first_run_discovery_v3");
    if (isFirstRun) {
      localStorage.setItem("bitscribe_first_run_discovery_v3", "true");
      const initialRules = {
        ...DEFAULT_RULES,
        useDiscoveryPreset: true,
        useModernPreset: false,
        useLegacyPreset: false,
        useSubtitleScan: false,
        useDuplicationScan: false,
        useAnomalyScan: false,
        useMetadataScan: false,
        useVideoMetadataScan: false,
        useMusicMetadataScan: false,
      };
      localStorage.setItem("plex_compat_rules", JSON.stringify(initialRules));
    }
    const saved = localStorage.getItem("plex_compat_rules");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let modified = false;
        if (parsed.legacyStereoAudioCodecs && !parsed.legacyStereoAudioCodecs.includes("ac3")) {
          parsed.legacyStereoAudioCodecs.push("ac3");
          modified = true;
        }
        if (parsed.modernStereoAudioCodecs && !parsed.modernStereoAudioCodecs.includes("ac3")) {
          parsed.modernStereoAudioCodecs.push("ac3");
          modified = true;
        }
        if (modified) {
           localStorage.setItem("plex_compat_rules", JSON.stringify(parsed));
        }
        const merged = { ...DEFAULT_RULES, ...parsed };
        if (!merged.discoveryHdrFormats || merged.discoveryHdrFormats.length === 0) {
          merged.discoveryHdrFormats = ["SDR", "HDR10", "HDR10+", "Dolby Vision", "HLG", "Advanced HDR"];
        }
        return merged;
      } catch (e) {
        return DEFAULT_RULES;
      }
    }
    return {
      ...DEFAULT_RULES,
      useDiscoveryPreset: true,
      useModernPreset: false,
      useLegacyPreset: false,
      useSubtitleScan: false,
      useDuplicationScan: false,
      useAnomalyScan: false,
      useMetadataScan: false,
      useVideoMetadataScan: false,
      useMusicMetadataScan: false,
    };
  });
  
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showFileRegistry, setShowFileRegistry] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{message: string, onConfirm: () => void} | null>(null);
  const [isAppResetting, setIsAppResetting] = useState(false);
  const [showDemoCleanupModal, setShowDemoCleanupModal] = useState(false);
  
  return {
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
  };
}
