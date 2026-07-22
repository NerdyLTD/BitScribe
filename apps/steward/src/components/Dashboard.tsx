import { formatCodecString, getPrimaryAudioCodec, getPrimaryVideoCodec, getContainerFormat, getFormattedAudioTracks } from '@bitscribe/core-eval';
import { createPortal } from "react-dom";
import React, { useState, useEffect, useMemo, memo, useTransition } from "react";
import { MediaItem, RuleCriteria, sortCategories, getCategoryGroup, isMusicCategory } from '@bitscribe/core-types';
import { MOCK_MEDIA_LIBRARY } from '@bitscribe/core-db';
import { evaluatePlexCompatibility, computeDuplicatesMap, getDuplicatePairRows, isMissingSubtitles } from '@bitscribe/core-eval';
import { parseVideoMetadata } from '@bitscribe/core-eval';
import { getDisplayArtist, getDisplayAlbum, getDisplaySongTitle } from '@bitscribe/core-eval';
import { normalizeTitleForSort, getSectionHeaderForTitle, normalizeGroupTitle, getMusicGroupTitle } from '@bitscribe/core-eval';

import { getMissingMetadataTags } from "@bitscribe/core-eval";
import DiagnosticPanel from "./DiagnosticPanel";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import {
  Play,
  Folder,
  FileVideo,
  FileAudio,
  Subtitles,
  CheckCircle,
  Sunset,
  AlertCircle, AlertTriangle,
  Cpu,
  Download,
  RotateCcw,
  Sliders,
  Database,
  Search,
  Filter,
  Music,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Layers,
  ChevronDown
} from "lucide-react";



interface DashboardProps {
  isScanning: boolean;
  isExporting?: boolean;
  exportProgress?: number;
  currentExportFile?: string;
  scanProgress: number;
  currentScanFile: string;
  scanLogs: string[];
  scannedFiles: MediaItem[];
  corruptFiles: MediaItem[];
  notification: string | { type: string; message: string } | null;
  lastScanDuration?: number | null;
  customRules: RuleCriteria;
  onRulesChange: (rules: RuleCriteria) => void;
  onSelectScannedFiles: (items: MediaItem[]) => void;
  scanPaths: { path: string; enabled: boolean }[];
  setScanPaths: (paths: { path: string; enabled: boolean }[]) => void;
  excelColumns: Record<string, boolean>;
  showDiagnostic: boolean;
  showFileRegistry: boolean;
  showMetrics: boolean;
  isQuickRefresh?: boolean;
  isTourActive?: boolean;
  tourStepIndex?: number;
  activeDemo?: number | null;
}

export default memo(function Dashboard({
  customRules,
  onRulesChange,
  onSelectScannedFiles,
  scanPaths,
  setScanPaths,
  excelColumns,
  showDiagnostic,
  showFileRegistry,
  showMetrics,
  isScanning,
  isExporting,
  exportProgress = 0,
  currentExportFile = "",
  isQuickRefresh,
  isTourActive,
  tourStepIndex,
  activeDemo,
  scanProgress,
  currentScanFile,
  scanLogs,
  scannedFiles,
  corruptFiles,
  notification,
  lastScanDuration,
}: DashboardProps) {

  console.log("Dashboard rendering");
  const formatDurationStr = (ms: number | undefined | null) => {
    if (ms == null) return null;
    if (ms < 1000) return `${ms}ms`;
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    if (mins > 0) return `${mins}m ${secs % 60}s`;
    return `${secs}s`;
  };
  // Grid / filtering states
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [metricsFilterMode, setMetricsFilterMode] = useState<"Default" | "Granular">("Default");
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const colMenuRef = React.useRef<HTMLDivElement>(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isScanning) {
      setElapsedSeconds(0);
      return;
    }
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isScanning]);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [resizingColKey, setResizingColKey] = useState<string | null>(null);

  const handleColumnResize = (e: React.MouseEvent, key: string, defaultWidth: number) => {
    e.stopPropagation();
    e.preventDefault();
    
    setResizingColKey(key);
    
    const startX = e.pageX;
    const startWidth = columnWidths[key] || defaultWidth;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(80, startWidth + (moveEvent.pageX - startX));
      setColumnWidths(prev => ({
        ...prev,
        [key]: newWidth
      }));
    };
    
    const handleMouseUp = () => {
      setResizingColKey(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(event.target as Node)) {
        setColMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleForceColumnVisible = (e: Event) => {
      const customEvent = e as CustomEvent<{ columnKey: string; visible: boolean }>;
      if (customEvent.detail && customEvent.detail.columnKey) {
        setVisibleColumns(prev => ({ ...prev, [customEvent.detail.columnKey]: customEvent.detail.visible }));
      }
    };
    window.addEventListener("force-column-visible", handleForceColumnVisible);
    return () => {
      window.removeEventListener("force-column-visible", handleForceColumnVisible);
    };
  }, []);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    stream: true, title: true, seriesTitle: true, season: true, episode: true, epTitle: true, filename: false, videoCodec: true,
    audioCodec: true, container: false, path: false, artist: true, album: true,
    songTitle: true, format: true, bitrate: false,
    videoBitDepth: false, audioSampleRate: false, chapterCount: false
  });
  
  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [metricsSelected, setMetricsSelected] = useState<string[]>(["Everything"]);
  
  const [isCustomBlocksActive, setIsCustomBlocksActive] = useState(false);
  const [visibleBlocks, setVisibleBlocks] = useState<Record<string, boolean>>({});
  const [showBlocksDropdown, setShowBlocksDropdown] = useState(false);
  const blocksDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (blocksDropdownRef.current && !blocksDropdownRef.current.contains(e.target as Node)) {
        setShowBlocksDropdown(false);
      }
    };
    if (showBlocksDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showBlocksDropdown]);

  // Reset demo simulation residues when activeDemo is stopped/completed
  useEffect(() => {
    if (activeDemo === null) {
      setLocalSearchTerm("");
      setIsSearchVisible(false);
      setColMenuOpen(false);
      setShowBlocksDropdown(false);
      setMetricsFilterMode("Default");
      setMetricsSelected(["Everything"]);
      setSelectedCategories([]);
      setSortColumn(null);
      setSortDirection("asc");
    }
  }, [activeDemo]);

  const [customPresets, setCustomPresets] = useState<Record<string, Record<string, boolean>>>(() => {
    const saved = localStorage.getItem("bitscribe_custom_block_presets");
    return saved ? JSON.parse(saved) : {};
  });

  const [isSavingPreset, setIsSavingPreset] = useState(false);

  useEffect(() => {
    const handleRestore = () => {
      const saved = localStorage.getItem("bitscribe_custom_block_presets");
      if (saved) {
         setCustomPresets(JSON.parse(saved));
      }
    };
    window.addEventListener("restore_custom_presets", handleRestore);
    return () => window.removeEventListener("restore_custom_presets", handleRestore);
  }, []);

  
  const [selectedCompatibility, setSelectedCompatibility] = useState<
    "All" | "modern" | "legacy" | "unfriendly" | "corrupted" | "bleeding"
  >("All");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const [lastNotification, setLastNotification] = useState<any>(null);
  const [notificationDismissed, setNotificationDismissed] = useState(false);

  useEffect(() => {
    if (notification !== lastNotification) {
      setLastNotification(notification);
      setNotificationDismissed(false);
    }
  }, [notification, lastNotification]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchQuery(localSearchTerm);
    }, 50);
    return () => clearTimeout(handler);
  }, [localSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, selectedCompatibility, scannedFiles, corruptFiles, sortColumn, sortDirection]);

  const allCurrentFiles = useMemo(() => {
    return [...scannedFiles, ...corruptFiles];
  }, [scannedFiles, corruptFiles]);

  const parsedMetadataMap = useMemo(() => {
    const map = new Map<string, any>();
    allCurrentFiles.forEach((item) => {
      const isMus = getCategoryGroup(item.category) === 'Music' || isMusicCategory(item.category);
      if (!isMus) {
        map.set(item.id, parseVideoMetadata(item));
      }
    });
    return map;
  }, [allCurrentFiles]);

  const duplicatesMap = useMemo(() => {
    const isDuplicatesCardVisible = isCustomBlocksActive 
      ? !!visibleBlocks['media-duplicates-card'] 
      : (customRules.useDuplicationScan || customRules.useDuplicationVideoScan || customRules.useDuplicationMusicScan || isTourActive || document.body.classList.contains("tour-active"));
    const activeRules = isDuplicatesCardVisible 
      ? { ...customRules, useDuplicationScan: true } 
      : customRules;
    return computeDuplicatesMap(allCurrentFiles, activeRules);
  }, [allCurrentFiles, customRules, isCustomBlocksActive, visibleBlocks, isTourActive]);

  const evaluatedFiles = useMemo(() => {
    return allCurrentFiles.map((item) => {
      const isDup = duplicatesMap.get(item.id) ?? false;
      
      const streamingRules = {
        ...customRules,
        useSubtitleScan: false,
        useDuplicationScan: false,
        useDuplicationVideoScan: false,
        useDuplicationMusicScan: false,
        useAnomalyScan: false,
        useMetadataScan: false,
        useVideoMetadataScan: false,
        useMusicMetadataScan: false,
      };
      
      const evaluation = evaluatePlexCompatibility(item, streamingRules, isDup);
      const level = evaluation.level;
      const reason = evaluation.reason;
      const suggestion = evaluation.suggestion;

      const finalLevel = item.category === 'Corrupted' ? 'corrupted' : level;

      return {
        item,
        isDup,
        level: finalLevel,
        evaluation: {
          level: finalLevel,
          reason: reason || "",
          suggestion: suggestion || ""
        }
      };
    });
  }, [allCurrentFiles, customRules, duplicatesMap]);

  const filteredFilesData = useMemo(() => {
    const lowercaseQuery = searchQuery.toLowerCase().trim();
    const categoriesSetArr = new Set(selectedCategories);

    const filtered = evaluatedFiles.filter(({ item, level }) => {
      const matchesSearch = !lowercaseQuery ||
        item.filename.toLowerCase().includes(lowercaseQuery) ||
        item.filePath.toLowerCase().includes(lowercaseQuery) ||
        (item.videoCodec || "").toLowerCase().includes(lowercaseQuery);

      const matchesCategory = categoriesSetArr.has(item.category);
      const matchesCompatibility = selectedCompatibility === "All" || level === selectedCompatibility;

      return matchesSearch && matchesCategory && matchesCompatibility;
    });

    const group = selectedCategories.length > 0 ? getCategoryGroup(selectedCategories[0]) : 'Other';
    const activeSortCol = sortColumn || (group === 'Movies' ? 'title' : (group === 'TV' ? 'seriesTitle' : (group === 'Music' ? 'artist' : null)));

    if (activeSortCol) {
      const sortCache = new Map();
      filtered.forEach(row => {
        const { item, level } = row;
        const isMus = group === 'Music' || isMusicCategory(item.category);
        const parsed = !isMus ? parsedMetadataMap.get(item.id) : null;
        
        let val: string | number = '';
        switch(activeSortCol) {
          case 'artist':
            val = getDisplayArtist(item, customRules) || ''; break;
          case 'album':
            val = getDisplayAlbum(item, customRules) || ''; break;
          case 'songTitle':
            val = getDisplaySongTitle(item, customRules) || ''; break;
          case 'format':
            val = getPrimaryAudioCodec(item) || ''; break;
          case 'bitrate':
            val = item.audioBitrate || 0; break;
          case 'stream': {
            const compatPriority: Record<string, number> = { modern: 4, legacy: 3, bleeding: 2, unfriendly: 1 };
            val = compatPriority[level as keyof typeof compatPriority] || 0;
            break;
          }
          case 'seriesTitle':
          case 'title': {
            const rawTitle = parsed?.title || item.filename || '';
            val = normalizeTitleForSort(rawTitle);
            break;
          }
          case 'season':
            val = parsed?.season || ''; break;
          case 'episode':
            val = parsed?.episode || ''; break;
          case 'epTitle':
            val = parsed?.epTitle || ''; break;
          case 'filename':
            val = item.filename || ''; break;
          case 'videoCodec':
            val = getPrimaryVideoCodec(item) || ''; break;
          case 'audioCodec':
            val = getFormattedAudioTracks(item); break;
          case 'container':
            val = getContainerFormat(item) || ''; break;
          case 'path':
            val = item.filePath || ''; break;
        }

        let secondaryData: any = null;
        if (activeSortCol === 'seriesTitle') {
          secondaryData = {
            s: parseInt(parsed?.season) || 0,
            e: parseInt(parsed?.episode) || 0
          };
        } else if (activeSortCol === 'artist') {
          secondaryData = {
            album: getDisplayAlbum(item, customRules) || '',
            title: getDisplaySongTitle(item, customRules) || '',
            disc: parseInt((item.tags as any)?.disc || "1") || 1,
            track: parseInt((item.tags as any)?.track || (item.tags as any)?.tracknumber || "0") || 0
          };
        } else if (activeSortCol === 'album') {
          secondaryData = {
            artist: getDisplayArtist(item, customRules) || '',
            title: getDisplaySongTitle(item, customRules) || '',
            disc: parseInt((item.tags as any)?.disc || "1") || 1,
            track: parseInt((item.tags as any)?.track || (item.tags as any)?.tracknumber || "0") || 0
          };
        }

        sortCache.set(row, { val, secondaryData });
      });

      filtered.sort((a, b) => {
        const cachedA = sortCache.get(a);
        const cachedB = sortCache.get(b);
        const valA = cachedA?.val || '';
        const valB = cachedB?.val || '';
        
        if (typeof valA === 'string' && typeof valB === 'string') {
          const normA = normalizeGroupTitle(valA);
          const normB = normalizeGroupTitle(valB);
          const comparison = normA.localeCompare(normB, undefined, { numeric: true, sensitivity: 'base' });
          if (comparison !== 0) {
            return sortDirection === 'asc' ? comparison : -comparison;
          }
          if (activeSortCol === 'seriesTitle') {
            const sA = cachedA?.secondaryData?.s || 0;
            const sB = cachedB?.secondaryData?.s || 0;
            if (sA !== sB) return sA - sB;
            const eA = cachedA?.secondaryData?.e || 0;
            const eB = cachedB?.secondaryData?.e || 0;
            return eA - eB;
          }
          if (activeSortCol === 'artist') {
            const albumA = cachedA?.secondaryData?.album || '';
            const albumB = cachedB?.secondaryData?.album || '';
            const albumComp = normalizeGroupTitle(albumA).localeCompare(normalizeGroupTitle(albumB), undefined, { numeric: true, sensitivity: 'base' });
            if (albumComp !== 0) return albumComp;
            
            const discA = cachedA?.secondaryData?.disc || 1;
            const discB = cachedB?.secondaryData?.disc || 1;
            if (discA !== discB) return discA - discB;
            
            const trackA = cachedA?.secondaryData?.track || 0;
            const trackB = cachedB?.secondaryData?.track || 0;
            if (trackA !== trackB) return trackA - trackB;
            
            const titleA = cachedA?.secondaryData?.title || '';
            const titleB = cachedB?.secondaryData?.title || '';
            return normalizeGroupTitle(titleA).localeCompare(normalizeGroupTitle(titleB), undefined, { numeric: true, sensitivity: 'base' });
          }
          if (activeSortCol === 'album') {
            const artistA = cachedA?.secondaryData?.artist || '';
            const artistB = cachedB?.secondaryData?.artist || '';
            const artistComp = normalizeGroupTitle(artistA).localeCompare(normalizeGroupTitle(artistB), undefined, { numeric: true, sensitivity: 'base' });
            if (artistComp !== 0) return artistComp;
            
            const discA = cachedA?.secondaryData?.disc || 1;
            const discB = cachedB?.secondaryData?.disc || 1;
            if (discA !== discB) return discA - discB;
            
            const trackA = cachedA?.secondaryData?.track || 0;
            const trackB = cachedB?.secondaryData?.track || 0;
            if (trackA !== trackB) return trackA - trackB;
            
            const titleA = cachedA?.secondaryData?.title || '';
            const titleB = cachedB?.secondaryData?.title || '';
            return normalizeGroupTitle(titleA).localeCompare(normalizeGroupTitle(titleB), undefined, { numeric: true, sensitivity: 'base' });
          }
          return 0;
        } else {
          const numA = Number(valA) || 0;
          const numB = Number(valB) || 0;
          if (numA < numB) return sortDirection === 'asc' ? -1 : 1;
          if (numA > numB) return sortDirection === 'asc' ? 1 : -1;
          return 0;
        }
      });
    }

    return filtered;
  }, [evaluatedFiles, searchQuery, selectedCategories, selectedCompatibility, sortColumn, sortDirection, customRules]);

  const filteredFiles = useMemo(() => {
    return filteredFilesData.map(d => d.item);
  }, [filteredFilesData]);

  useEffect(() => {
    // Initial start without dummy data
  }, []);

    const metricsFilteredFiles = useMemo(() => {
    if (metricsSelected.includes("Everything")) return evaluatedFiles;

    const getStaticGroup = (cat) => {
      if (!cat) return "Movies";
      if (isMusicCategory(cat)) return "Music";
      if (cat === 'Music Videos' || cat === 'Plays' || cat === 'Specials') return cat;
      const lower = cat.toLowerCase();
      if (lower.includes("tv") || lower.includes("series") || lower.includes("show")) return "TV Shows";
      if (lower.includes("doc") || lower.includes("documentary")) return "Documentaries";
      if (lower.includes("short")) return "Shorts";
      return "Movies";
    };

    return evaluatedFiles.filter(({ item }) => {
      if (metricsFilterMode === "Granular") {
        return metricsSelected.includes(item.topLevelFolder || "Unknown");
      } else {
        const isMus = isMusicCategory(item.category);
        if (metricsSelected.includes("Video Only") && !isMus) return true;
        if (metricsSelected.includes("Music Only") && isMus) return true;
        if (metricsSelected.includes(getStaticGroup(item.category))) return true;
        return false;
      }
    });
  }, [evaluatedFiles, metricsFilterMode, metricsSelected]);

  const stats = useMemo(() => {
    if (metricsFilteredFiles.length === 0) {
      return { modern: 0, legacy: 0, bleeding: 0, unfriendly: 0, totalGB: 0, fileCount: 0, formattedSize: "0 GB" };
    }

    let modern = 0;
    let legacy = 0;
    let bleeding = 0;
    let unfriendly = 0;
    let totalGB = 0;

    metricsFilteredFiles.forEach(({ item, level }) => {
      const isStaticImage = 
        item.category === 'Static' ||
        ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'jfif'].includes((item.container || "").toLowerCase()) ||
        ['bmp', 'gif', 'png', 'mjpeg', 'jpg', 'jpeg'].includes((item.videoCodec || "").toLowerCase());

      if (isStaticImage) return;

      totalGB += item.sizeGB;
      if (item.category === 'Corrupted') return;
      if (isMusicCategory(item.category)) return; // Do not include music in video streaming fidelity stats
      if (level === "modern") modern++;
      else if (level === "legacy") legacy++;
      else if (level === "bleeding") bleeding++;
      else if (level === "unfriendly") unfriendly++;
    });

    const formatSize = (gb: number) => {
      if (gb >= 1000) return (gb / 1024).toFixed(2) + " TB";
      if (gb < 1 && gb > 0) return (gb * 1024).toFixed(2) + " MB";
      return gb.toFixed(2) + " GB";
    };

    return {
      modern,
      legacy,
      bleeding,
      unfriendly,
      totalGB: Math.round(totalGB * 100) / 100,
      formattedSize: formatSize(totalGB),
      fileCount: metricsFilteredFiles.length,
    };
  }, [metricsFilteredFiles]);

  const directPlayPercent = useMemo(() => {
    const total = stats.modern + stats.legacy + stats.bleeding + stats.unfriendly;
    return total > 0 ? Math.round(((stats.modern + stats.legacy) / total) * 100) : 0;
  }, [stats]);

  // Combined distribution and anomaly calculations in a single memoized hook
  const distributionsAndAnomalies = useMemo(() => {
    const videoCounts: Record<string, number> = {};
    const audioCounts: Record<string, number> = {};
    const musicCounts: Record<string, number> = {};
    const containerCounts: Record<string, number> = {};
    const hdrCounts: Record<string, number> = {};
    let totalAudioTracksCount = 0;
    let totalMusicTracksCount = 0;

    const missingSubtitleCounts: Record<string, number> = {};
    const subtitleCodecCounts: Record<string, number> = {};
    const metadataFieldMissingCounts: Record<string, number> = {};
    const duplicateParsedMap = new Map<string, number>();
    const duplicateCountsByCategory: Record<string, number> = { "Video": 0, "Music": 0 };
    const duplicateSizeGBByCategory: Record<string, number> = { "Video": 0, "Music": 0 };
    const anomalyCounts: Record<string, number> = { "Bloated": 0, "Starved": 0 };

    let totalVideoFiles = 0;
    let totalMusicFiles = 0;

    metricsFilteredFiles.forEach(({ item, isDup }) => {
      const isStaticImage = 
        item.category === 'Static' ||
        ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'jfif'].includes((item.container || "").toLowerCase()) ||
        ['bmp', 'gif', 'png', 'mjpeg', 'jpg', 'jpeg'].includes((item.videoCodec || "").toLowerCase());

      if (isStaticImage) return;
      if (item.category === 'Corrupted') return;

      const isAudioOnly = item.videoResolution === "-" || !item.videoResolution || isMusicCategory(item.category);

      if (isAudioOnly) {
        totalMusicFiles++;
        const cont = (item.container || "").toLowerCase() || "unknown";
        musicCounts[cont] = (musicCounts[cont] || 0) + 1;
        totalMusicTracksCount++;
      } else if (item.category !== 'Static') {
        totalVideoFiles++;
        const vc = (item.videoCodec || "").toLowerCase() || "unknown";
        videoCounts[vc] = (videoCounts[vc] || 0) + 1;

        const cont = (item.container || "").toLowerCase();
        if (cont) {
          containerCounts[cont] = (containerCounts[cont] || 0) + 1;
        }

        const hdr = item.hdrFormat || "SDR";
        hdrCounts[hdr] = (hdrCounts[hdr] || 0) + 1;

        (item.audioTracks || []).forEach((tr) => {
          const ac = (tr.codec || "").toLowerCase();
          if (ac) {
            audioCounts[ac] = (audioCounts[ac] || 0) + 1;
            totalAudioTracksCount++;
          }
        });
      }

      // Missing Subtitles
      if (isMissingSubtitles(item)) {
        let cat = item.category;
        if (cat === 'TV Shows') cat = 'TV';
        if (cat === 'Movies') cat = 'Movie';
        missingSubtitleCounts[cat] = (missingSubtitleCounts[cat] || 0) + 1;
      } else if (!isMusicCategory(item.category) && item.category !== 'Static' && item.category !== 'Corrupted') {
        item.subtitleTracks?.forEach(track => {
          const codec = (track.codec || "unknown").toLowerCase();
          const friendlyName = codec === "subrip" ? "srt" : codec;
          const prefix = track.isExternal ? "External" : "Embedded";
          const displayName = `${prefix} ${formatCodecString(friendlyName)}`;
          subtitleCodecCounts[displayName] = (subtitleCodecCounts[displayName] || 0) + 1;
        });
      }

      // Missing Metadata Tags
      if (item.category !== 'Static' && item.category !== 'Corrupted') {
        const missing = getMissingMetadataTags(item);
        const isMusCat = isMusicCategory(item.category);
        const catGroup = getCategoryGroup(item.category || "");
        
        missing.forEach(tag => {
          let key = `Missing ${tag} Tag`;
          if (tag === "Title") {
            key = isMusCat ? "Missing Music Title" : "Missing Video Title";
          } else if (tag === "Release Year") {
            if (isMusCat) key = "Missing Music Year";
            else if (catGroup === 'Movies') key = "Missing Video Year (Movies)";
            else if (catGroup === 'TV') key = "Missing Video Year (TV)";
            else key = "Missing Video Year (Other)";
          }
          metadataFieldMissingCounts[key] = (metadataFieldMissingCounts[key] || 0) + 1;
        });
      }

      // Duplications
      if (isDup) {
        if (isMusicCategory(item.category)) {
          duplicateCountsByCategory["Music"]++;
          duplicateSizeGBByCategory["Music"] += (item.sizeGB || 0);
        } else {
          duplicateCountsByCategory["Video"]++;
          duplicateSizeGBByCategory["Video"] += (item.sizeGB || 0);
        }
        let canonicalLabel = "";
        if (isMusicCategory(item.category)) {
          const cleanTrack = (item.tags?.title || item.filename)
            .replace(/\.[a-zA-Z0-9]+$/, "")
            .replace(/^\d+[-_.\s]+/, "")
            .trim();
          const artist = item.tags?.artist || "Unknown Artist";
          canonicalLabel = `${cleanTrack} (${artist})`;
        } else {
          canonicalLabel = item.filename
            .replace(/\.[a-zA-Z0-9]+$/, "")
            .replace(/[-_.(](1080p|720p|4k|2160p|x264|x265|hevc|h264|h265|av1|bluray|web-?dl|webrip|dd5\.1|dts|aac|truehd|hdr|dovi|remux)[-_.)]*/gi, "")
            .replace(/\s*[\(\[]\d{4}[\)\]]\s*/g, " ")
            .trim();
        }
        duplicateParsedMap.set(canonicalLabel, (duplicateParsedMap.get(canonicalLabel) || 0) + 1);
      }

      // Anomalies using unified evaluator
      const anomalyRules = {
        ...customRules,
        useAnomalyScan: true,
      };
      const evalRes = evaluatePlexCompatibility(item, anomalyRules, false, true);
      if (evalRes.isBloated) {
        anomalyCounts["Bloated"]++;
      } else if (evalRes.isStarved) {
        anomalyCounts["Starved"]++;
      }
    });

    const displayMissingSubtitles = Object.entries(missingSubtitleCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const displaySubtitleCodecs = Object.entries(subtitleCodecCounts)
      .map(([name, count]) => {
        const n = name.toLowerCase();
        const isFriendly = n.includes('srt') || n.includes('vtt') || n.includes('webvtt') || n.includes('mov_text') || n.includes('tx3g');
        return { 
          name, 
          count,
          fill: isFriendly ? '#10B981' : '#F43F5E',
          tooltipMsg: isFriendly ? 'Stream OK' : 'Transcode risk'
        };
      })
      .sort((a, b) => b.count - a.count);

    const duplicationCounts: Record<string, number> = {};
    for (const [name, qty] of duplicateParsedMap.entries()) {
      if (qty > 0) {
        duplicationCounts[name] = qty;
      }
    }
    const displayDuplicates = Object.entries(duplicationCounts)
      .map(([name, count]) => ({ 
        name: name.length > 60 ? name.slice(0, 58) + "..." : name, 
        fullName: name,
        count 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const displayDuplicateCategories = [
      { name: "Video", count: duplicateCountsByCategory["Video"], sizeGB: duplicateSizeGBByCategory["Video"], fill: "#3B82F6" },
      { name: "Music", count: duplicateCountsByCategory["Music"], sizeGB: duplicateSizeGBByCategory["Music"], fill: "#10B981" }
    ];

    const displayAnomalies = [
      { name: "High Bitrate (Bloated)", count: anomalyCounts["Bloated"] },
      { name: "Low Bitrate (Starved)", count: anomalyCounts["Starved"] }
    ].filter(i => i.count > 0);

    const displayHdr = Object.entries(hdrCounts)
      .map(([hdr, count]) => ({
        name: hdr,
        count,
        percent: stats.fileCount > 0 ? Math.round((count / stats.fileCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const sortedVideo = Object.entries(videoCounts)
      .map(([codec, count]) => ({
        name: formatCodecString(codec),
        count,
        percent: stats.fileCount > 0 ? Math.round((count / stats.fileCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const sortedAudio = Object.entries(audioCounts)
      .map(([codec, count]) => ({
        name: formatCodecString(codec),
        count,
        percent: totalAudioTracksCount > 0 ? Math.round((count / totalAudioTracksCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const sortedMusic = Object.entries(musicCounts)
      .map(([codec, count]) => ({
        name: formatCodecString(codec),
        count,
        percent: totalMusicTracksCount > 0 ? Math.round((count / totalMusicTracksCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const sortedContainer = Object.entries(containerCounts)
      .map(([container, count]) => ({
        name: `.${formatCodecString(container)}`,
        count,
        percent: stats.fileCount > 0 ? Math.round((count / stats.fileCount) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const displayMetadataMissing = Object.entries(metadataFieldMissingCounts)
      .map(([name, count]) => {
        const cleanName = name
          .replace(/^Missing\s+/i, "")
          .replace(/^Video\s+/i, "")
          .replace(/^Music\s+/i, "")
          .replace(/\s+Tag$/i, "")
          .replace(/Embedded Title/i, "Title");
        return { name: cleanName, count };
      })
      .sort((a, b) => b.count - a.count);

    const displayVideoMetadataMissing = Object.entries(metadataFieldMissingCounts)
      .filter(([name]) => {
        const lower = name.toLowerCase();
        return !lower.includes("music") && !lower.includes("artist") && !lower.includes("album") && !lower.includes("track") && !lower.includes("disc");
      })
      .map(([name, count]) => {
        const cleanName = name
          .replace(/^Missing\s+/i, "")
          .replace(/^Video\s+/i, "")
          .replace(/\s+Tag$/i, "")
          .replace(/Embedded Title/i, "Title");
        const pct = totalVideoFiles > 0 ? Math.round((count / totalVideoFiles) * 100) : 0;
        return { name: cleanName, count, pct };
      })
      .sort((a, b) => b.count - a.count);

    const displayMusicMetadataMissing = Object.entries(metadataFieldMissingCounts)
      .filter(([name]) => {
        const lower = name.toLowerCase();
        return lower.includes("music") || lower.includes("artist") || lower.includes("album") || lower.includes("track") || lower.includes("disc");
      })
      .map(([name, count]) => {
        const cleanName = name
          .replace(/^Missing\s+/i, "")
          .replace(/^Music\s+/i, "")
          .replace(/\s+Tag$/i, "")
          .replace(/Embedded Title/i, "Title");
        const pct = totalMusicFiles > 0 ? Math.round((count / totalMusicFiles) * 100) : 0;
        return { name: cleanName, count, pct };
      })
      .sort((a, b) => b.count - a.count);

    return {
      displayMissingSubtitles,
      displaySubtitleCodecs,
      displayDuplicates,
      displayDuplicateCategories,
      displayAnomalies,
      displayHdr,
      displayMetadataMissing,
      displayVideoMetadataMissing,
      displayMusicMetadataMissing,
      displayVideo: sortedVideo,
      displayAudio: sortedAudio,
      displayMusic: sortedMusic,
      displayContainer: sortedContainer,
    };
  }, [metricsFilteredFiles, stats.fileCount]);

  const {
    displayMissingSubtitles,
    displaySubtitleCodecs,
    displayDuplicates,
    displayDuplicateCategories,
    displayAnomalies,
    displayHdr,
    displayMetadataMissing,
    displayVideoMetadataMissing,
    displayMusicMetadataMissing,
    displayVideo,
    displayAudio,
    displayMusic,
    displayContainer,
  } = distributionsAndAnomalies;

  const splitMetadataMissing = useMemo(() => {
    const len = displayMetadataMissing.length;
    const third = Math.ceil(len / 3);
    return {
      left: displayMetadataMissing.slice(0, third),
      middle: displayMetadataMissing.slice(third, third * 2),
      right: displayMetadataMissing.slice(third * 2)
    };
  }, [displayMetadataMissing]);

  const libraryHealthIndex = useMemo(() => {
    if (!stats.fileCount) return 100;
    // Normalized maximum possible checks per file for metadata completeness
    const totalPossibleChecks = stats.fileCount * 4;
    const missingMetadataCount = displayMetadataMissing.reduce((sum, item) => sum + item.count, 0);
    const missingSubsCount = displayMissingSubtitles.reduce((sum, item) => sum + item.count, 0);
    const totalIssues = missingMetadataCount + missingSubsCount;
    const score = Math.max(1, Math.min(100, Math.round(((totalPossibleChecks - totalIssues) / totalPossibleChecks) * 100)));
    return score;
  }, [stats.fileCount, displayMetadataMissing, displayMissingSubtitles]);

  const dupSummary = useMemo(() => {
    let vDup = 0;
    let mDup = 0;
    let totalSizeGB = 0;
    
    const isDuplicatesCardVisible = isCustomBlocksActive 
      ? !!visibleBlocks['media-duplicates-card'] 
      : (customRules.useDuplicationScan || customRules.useDuplicationVideoScan || customRules.useDuplicationMusicScan || isTourActive || document.body.classList.contains("tour-active"));
    const activeRules = isDuplicatesCardVisible 
      ? { ...customRules, useDuplicationScan: true } 
      : customRules;

    // Compute duplicates globally to find pairs, then filter for pairs visible in the current view
    const allPairs = getDuplicatePairRows(allCurrentFiles, activeRules);
    const filteredItemIds = new Set(metricsFilteredFiles.map(i => i.item.id));
    const visiblePairs = allPairs.filter(pair => filteredItemIds.has(pair.dupId) || filteredItemIds.has(pair.id));
    
    visiblePairs.forEach(pair => {
      if (isMusicCategory(pair.category)) {
        mDup++;
      } else {
        vDup++;
      }
      totalSizeGB += pair.dupSizeGB || 0;
    });

    const total = vDup + mDup;
    return { vDup, mDup, total, totalSizeGB };
  }, [allCurrentFiles, metricsFilteredFiles, customRules, isCustomBlocksActive, visibleBlocks, isTourActive]);

  const anomalySummary = useMemo(() => {
    let vBloated = 0;
    let vStarved = 0;
    let mBloated = 0;
    let mStarved = 0;
    let bloatedSizeGB = 0;
    const vBloatedList: string[] = [];
    const vStarvedList: string[] = [];
    const mBloatedList: string[] = [];
    const mStarvedList: string[] = [];

    const anomalyRules = {
      ...customRules,
      useAnomalyScan: true,
    };

    metricsFilteredFiles.forEach(({ item }) => {
      if (item.category === 'Corrupted') return;
      const isMusic = isMusicCategory(item.category);
      const evalResult = evaluatePlexCompatibility(item, anomalyRules, false, true);
      
      if (evalResult.isBloated) {
        if (isMusic) {
          mBloated++;
          const name = item.filename || "Unknown Music";
          mBloatedList.push(`${name} (${item.audioBitrate ? (item.audioBitrate / 1000).toFixed(0) : "0"} kbps)`);
        } else {
          vBloated++;
          const name = item.filename || "Unknown Video";
          vBloatedList.push(`${name} (${item.videoBitrateMbps ? item.videoBitrateMbps.toFixed(1) : "0"} Mbps)`);
        }
        bloatedSizeGB += (item.sizeGB || 0);
      } else if (evalResult.isStarved) {
        if (isMusic) {
          mStarved++;
          const name = item.filename || "Unknown Music";
          mStarvedList.push(`${name} (${item.audioBitrate ? (item.audioBitrate / 1000).toFixed(0) : "0"} kbps)`);
        } else {
          vStarved++;
          const name = item.filename || "Unknown Video";
          vStarvedList.push(`${name} (${item.videoBitrateMbps ? item.videoBitrateMbps.toFixed(1) : "0"} Mbps)`);
        }
      }
    });

    return { 
      vBloated, 
      vStarved,
      mBloated,
      mStarved,
      vBloatedList,
      vStarvedList,
      mBloatedList,
      mStarvedList,
      bloatedSizeGB,
      bloated: vBloated + mBloated, 
      starved: vStarved + mStarved, 
      totalVideo: vBloated + vStarved,
      totalMusic: mBloated + mStarved,
      total: vBloated + vStarved + mBloated + mStarved 
    };
  }, [metricsFilteredFiles, customRules]);

  const categoriesSet = useMemo(() => {
    return sortCategories(Array.from(new Set(evaluatedFiles.map(({ item }) => item.category))));
  }, [evaluatedFiles]);

  const foldersSet = useMemo(() => {
    return sortCategories(Array.from(new Set(evaluatedFiles.map(({ item }) => item.topLevelFolder || "Unknown"))) as string[]);
  }, [evaluatedFiles]);

  const totalVideoFiles = useMemo(() => metricsFilteredFiles.filter(({ item }) => !isMusicCategory(item.category) && item.category !== 'Corrupted').length, [metricsFilteredFiles]);
  const totalAllFiles = useMemo(() => metricsFilteredFiles.filter(({ item }) => item.category !== 'Corrupted').length, [metricsFilteredFiles]);
  const totalMusicFiles = useMemo(() => metricsFilteredFiles.filter(({ item }) => isMusicCategory(item.category)).length, [metricsFilteredFiles]);

  const { missingVideoTitleCount, missingMusicArtistCount, missingMusicYearCount } = useMemo(() => {
    let videoTitle = 0;
    let musicArtist = 0;
    let musicYear = 0;

    metricsFilteredFiles.forEach(({ item }) => {
      if (item.category === 'Corrupted' || item.category === 'Static') return;

      const tags = typeof item.tags === 'string' ? (item.tags ? JSON.parse(item.tags) : {}) : (item.tags || {});
      const titleVal = tags.title || tags.TITLE || '';
      const yearVal = item.year || parseInt(tags.date || tags.DATE || tags.year || tags.YEAR || '0') || 0;
      const titleCleaned = titleVal.trim();
      const hasTitle = !!titleCleaned && titleCleaned.toLowerCase() !== item.filename.toLowerCase();

      if (!isMusicCategory(item.category)) {
        if (!hasTitle) {
          videoTitle++;
        }
      } else {
        const artistVal = tags.artist || tags.ARTIST || '';
        if (!artistVal) {
          musicArtist++;
        }
        if (!yearVal) {
          musicYear++;
        }
      }
    });

    return {
      missingVideoTitleCount: videoTitle,
      missingMusicArtistCount: musicArtist,
      missingMusicYearCount: musicYear,
    };
  }, [metricsFilteredFiles]);

  const totalIndexable = stats.modern + stats.legacy + stats.bleeding + stats.unfriendly;
  
  const discoveryPct = useMemo(() => {
    const indexCount = stats.modern + stats.legacy;
    return totalIndexable > 0 ? Math.round((indexCount / totalIndexable) * 100) : 0;
  }, [stats, totalIndexable]);

  const isMetadataScan = customRules.useMetadataScan || customRules.useVideoMetadataScan || customRules.useMusicMetadataScan || isTourActive || document.body.classList.contains("tour-active");
  const isSubtitleScan = customRules.useSubtitleScan || isTourActive || document.body.classList.contains("tour-active");
  const isDuplicateScan = customRules.useDuplicationScan || customRules.useDuplicationVideoScan || customRules.useDuplicationMusicScan || isTourActive || document.body.classList.contains("tour-active");
  const isAnomalyScan = customRules.useAnomalyScan || isTourActive || document.body.classList.contains("tour-active");
  const isDiscoveryMode = customRules.useDiscoveryPreset || isTourActive || document.body.classList.contains("tour-active");
  const isStreamMode = customRules.useModernPreset || customRules.useLegacyPreset || isTourActive || document.body.classList.contains("tour-active") || customRules.useBleedingEdgePreset;

  const defaultBlockVisibility: Record<string, boolean> = {
    'library-overview-card': true,
    'stream-audit-card': isStreamMode,
    'video-codecs-card': isDiscoveryMode || isStreamMode,
    'audio-codecs-card': isDiscoveryMode || isStreamMode,
    'containers-card': isDiscoveryMode || isStreamMode,
    'music-codecs-card': isDiscoveryMode,
    'metadata-completeness-card': isMetadataScan,
    'media-duplicates-card': isDuplicateScan,
    'subtitle-audit-card': isSubtitleScan,
    'quality-anomalies-card': isAnomalyScan,
    'missing-metadata-card': isMetadataScan,
  };

  const effectiveVisibility = isCustomBlocksActive ? visibleBlocks : defaultBlockVisibility;

  const saveCustomPreset = (key: string) => {
    const updated = { ...customPresets, [key]: effectiveVisibility };
    setCustomPresets(updated);
    localStorage.setItem("bitscribe_custom_block_presets", JSON.stringify(updated));
    setIsSavingPreset(false);
  };

  const clearCustomPreset = (key: string) => {
    const updated = { ...customPresets };
    delete updated[key];
    setCustomPresets(updated);
    localStorage.setItem("bitscribe_custom_block_presets", JSON.stringify(updated));
  };



    const handleMetricsToggle = (val: string) => {
    if (val === "Everything") {
      setMetricsSelected(["Everything"]);
      return;
    }
    
    let current = metricsSelected.filter(s => s !== "Everything");
    if (val === "Video Only") current = current.filter(s => s !== "Music Only" && s !== "Music");
    if (val === "Music Only") current = current.filter(s => s !== "Video Only" && s !== "Movies" && s !== "TV Shows" && s !== "Documentaries" && s !== "Shorts" && s !== "Plays" && s !== "Specials" && s !== "Music Videos");
    if (["Movies", "TV Shows", "Documentaries", "Plays", "Shorts", "Specials", "Music Videos"].includes(val)) current = current.filter(s => s !== "Music Only" && s !== "Video Only");
    if (val === "Music") current = current.filter(s => s !== "Music Only" && s !== "Video Only");

    if (current.includes(val)) {
      current = current.filter(s => s !== val);
    } else {
      current.push(val);
    }
    
    if (current.length === 0) current = ["Everything"];
    setMetricsSelected(current);
  };
  
  const defaultMetricsOptions = ["Movies", "TV Shows", "Documentaries", "Plays", "Shorts", "Specials", "Music Videos", "Music", "Video Only", "Music Only"];

const handleCategoryToggle = (cat: string) => {
    let current = [...selectedCategories];
    
    if (current.includes(cat)) {
      current = current.filter(c => c !== cat);
    } else {
      const selectedGroup = getCategoryGroup(cat);
      current = current.filter(c => getCategoryGroup(c) === selectedGroup);
      current.push(cat);
    }
    
    if (current.length === 0 && categoriesSet.length > 0) {
      current = [categoriesSet[0]];
    }
    startTransition(() => {
      setSelectedCategories(current);
    });
  };

  useEffect(() => {
    if (selectedCategories.length === 0 && categoriesSet.length > 0) {
      startTransition(() => {
        setSelectedCategories([categoriesSet[0]]);
      });
    }
  }, [categoriesSet, selectedCategories]);

  const totalPages = Math.ceil(filteredFilesData.length / itemsPerPage);
  const paginatedFiles = filteredFilesData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const hasData = scannedFiles.length > 0;

  const isErrorNotification = typeof notification === 'object' && notification !== null && (notification as any).type === 'error';
  const isWarningNotification = typeof notification === 'object' && notification !== null && (notification as any).type === 'warning';
  const isExportNotification = typeof notification === 'object' && notification !== null && (notification as any).type === 'export';
  const notificationString = typeof notification === 'string'
    ? notification
    : (notification && (notification as any).message) || "";

  const paginationControls = filteredFilesData.length > 0 ? (
    <div className="flex items-center justify-between border-y border-[#1e232e]/60 bg-[#0c0e14]/40 px-4 py-3 sm:px-6 select-none">
      <div className="flex flex-1 justify-between items-center sm:hidden gap-3 w-full">
        {totalPages > 1 ? (
          <>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-slate-800 bg-[#161a24] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Per Page</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#0c0e14] border border-slate-800 text-slate-300 text-xs rounded px-2 py-0.5 outline-none"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="relative inline-flex items-center rounded-md border border-slate-800 bg-[#161a24] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </>
        ) : (
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-slate-400 font-mono">
              Showing {filteredFilesData.length} results
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Per Page</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#0c0e14] border border-slate-800 text-slate-300 text-xs rounded px-2 py-0.5 outline-none"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>
        )}
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between gap-2 lg:gap-4 flex-nowrap overflow-x-auto overflow-y-hidden">
        <div className="flex items-center gap-2 lg:gap-4 shrink-0">
          <p className="text-xs text-slate-400 font-mono">
            <span className="font-semibold text-slate-200">{filteredFilesData.length === 0 ? 0 : ((currentPage - 1) * itemsPerPage) + 1}</span> - <span className="font-semibold text-slate-200">{Math.min(currentPage * itemsPerPage, filteredFilesData.length)}</span> of <span className="font-semibold text-slate-200">{filteredFilesData.length}</span>
          </p>
          <div className="flex items-center gap-1.5 border-l border-slate-800/80 pl-2 lg:pl-4 h-4">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Per Page</span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-[#141822] border border-slate-850 text-slate-300 text-xs rounded px-2 py-0.5 outline-none focus:border-blue-500/50"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>
        {totalPages > 1 && (
          <div className="shrink-0">
            <nav className="isolate inline-flex -space-x-px rounded-md" aria-label="Pagination">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2.5 py-1 text-slate-450 ring-1 ring-inset ring-slate-850 bg-[#141822]/45 hover:bg-slate-800/35 font-semibold text-xs disabled:opacity-30"
              >
                « First
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-2.5 py-1 text-slate-450 ring-1 ring-inset ring-slate-850 bg-[#141822]/45 hover:bg-slate-800/35 font-semibold text-xs disabled:opacity-30"
              >
                ‹ Prev
              </button>
              <span className="relative inline-flex items-center px-4 py-1 text-xs font-bold text-blue-400 font-mono ring-1 ring-inset ring-slate-850 bg-slate-900/60">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center px-2.5 py-1 text-slate-455 ring-1 ring-inset ring-slate-855 bg-[#141822]/45 hover:bg-slate-800/35 font-semibold text-xs disabled:opacity-30"
              >
                Next ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2.5 py-1 text-slate-455 ring-1 ring-inset ring-slate-855 bg-[#141822]/45 hover:bg-slate-800/35 font-semibold text-xs disabled:opacity-30"
              >
                Last »
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  ) : null;



  return (
    <div className="space-y-4 w-full">
      {notification && !notificationDismissed && notificationString && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 shadow-lg transition-all animate-in slide-in-from-top-3 duration-300 ${
          isErrorNotification
            ? "bg-rose-500/10 border-rose-500/30 text-rose-300 shadow-rose-950/10"
            : (isExportNotification || isWarningNotification) ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-300 shadow-yellow-950/10" : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-emerald-950/10"
        }`}>
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold tracking-wide">
            {isErrorNotification ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              (isExportNotification || isWarningNotification) ? (
              isWarningNotification ? <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" /> : <Download className="w-5 h-5 text-yellow-400 shrink-0" />
            ) : (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            )
            )}
            <span>{notificationString}</span>
          </div>
          <button
            onClick={() => setNotificationDismissed(true)}
            className="w-7 h-7 rounded-lg hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer text-xs font-bold"
            title="Dismiss notification"
          >
            ✕
          </button>
        </div>
      )}
      {isScanning || isExporting ? (
        <div className="space-y-4">
          {isScanning && (
          <div className="p-4 bg-[#14171F] border border-blue-500/20 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>
            <div className="relative flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2 tracking-wider">
                  <Search className="w-4 h-4 animate-spin text-blue-500" />
                  {scanProgress === 0 ? (isQuickRefresh ? "CHECKING FOR MODIFIED FILES (Quick scan)..." : "PROBING FILES (Large directories may take several minutes)...") : "ANALYZING METADATA..."}
                </h3>
                <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                  <div className="text-xs text-blue-400 font-mono bg-blue-950/40 border border-blue-500/20 px-2 py-0.5 rounded-lg">
                    Elapsed: {formatDurationStr(elapsedSeconds * 1000)}
                  </div>
                  <div className="text-blue-300 font-mono text-xl font-bold">{scanProgress}%</div>
                </div>
              </div>
              <div className="w-full bg-[#0F1117] h-3 rounded-full overflow-hidden border border-[#1e232e]">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                  style={{ width: `${scanProgress}%` }}
                ></div>
              </div>
              {currentScanFile && (
                <div className="text-[11px] text-slate-400 font-mono truncate mt-2">
                  Current: <span className="text-slate-300">{currentScanFile}</span>
                </div>
              )}
            </div>
          </div>
          )}
          {isExporting && (
          <div className="p-4 bg-[#14171F] border border-yellow-500/20 rounded-xl shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-yellow-500/5 animate-pulse"></div>
            <div className="relative flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2 tracking-wider">
                  <Download className="w-4 h-4 animate-pulse text-yellow-500" />
                  GENERATING REPORTS...
                </h3>
                <div className="text-yellow-300 font-mono text-xl font-bold">{exportProgress}%</div>
              </div>
              <div className="w-full bg-[#0F1117] h-3 rounded-full overflow-hidden border border-[#1e232e]">
                <div 
                  className="h-full bg-yellow-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                  style={{ width: `${exportProgress}%` }}
                ></div>
              </div>
              {currentExportFile && (
                <div className="text-[11px] text-slate-400 font-mono truncate mt-2">
                  Exporting: <span className="text-slate-300">{currentExportFile}</span>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      ) : (
        <>
          <div className={showDiagnostic ? "block mb-4" : "hidden"}>
            <DiagnosticPanel />
          </div>
          <div className={showMetrics ? "block" : "hidden"}>
          {/* Metrics Filter Block */}
          
          {/* Metrics Filter Block Wrapper */}
          <div id="metrics-dashboard-filter-wrapper" className={`${isTourActive ? 'relative' : '!sticky top-0'} bg-[#0F1117] pb-3 pt-4 px-4 -mx-4 mb-3 ${(isTourActive && tourStepIndex === 8) ? "z-[10001]" : "z-[45]"}`}>
            <div id="metrics-dashboard-filter" className={`py-2 px-3.5 bg-[#14171F] border border-[#1e232e] rounded-xl shadow-lg ${activeDemo === 9 ? 'ring-2 ring-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.8)] relative z-[60] transition-all duration-500' : ''}`}>

            <div className="flex flex-wrap items-center justify-between gap-y-2 mb-1.5 border-b border-[#1e232e]/50 pb-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 select-none">
                <Filter className="w-3.5 h-3.5 text-blue-500" />
                Metrics Dashboard
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                {/* Block Selection Dropdown */}
                <div className="relative" ref={blocksDropdownRef}>
                  <button
                    onClick={() => setShowBlocksDropdown(!showBlocksDropdown)}
                    className="px-2 py-1 text-[10px] rounded font-bold uppercase transition-colors bg-slate-800 text-slate-400 hover:bg-slate-700 flex items-center gap-1"
                    id="btn-metrics-select" title="Select which metrics blocks to display"
                  >
                    Select Metrics <ChevronDown className="w-3 h-3" />
                  </button>
                  {showBlocksDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-[#14171F] border border-[#1e232e] rounded-lg shadow-xl z-50 p-2 text-[10px] text-slate-300">
                      {Object.entries({
                        'library-overview-card': "Library Overview",
                        'stream-audit-card': "Streaming Readiness",
                        'video-codecs-card': "Video Codecs",
                        'audio-codecs-card': "Audio Codecs",
                        'containers-card': "Containers",
                        'music-codecs-card': "Music Codecs",
                        'metadata-completeness-card': "Metadata Completeness",
                        'media-duplicates-card': "Media Duplicates",
                        'subtitle-audit-card': "Subtitle Audit",
                        'quality-anomalies-card': "Quality Anomalies",
                        'missing-metadata-card': "Missing Meta Tags"
                      }).map(([key, label]) => {
                        const isChecked = !!effectiveVisibility[key];
                        return (
                          <label key={key} className="flex items-center gap-2 p-1.5 hover:bg-slate-700 rounded cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (!isCustomBlocksActive) {
                                  setIsCustomBlocksActive(true);
                                  setVisibleBlocks({ ...defaultBlockVisibility, [key]: checked });
                                } else {
                                  setVisibleBlocks(prev => ({ ...prev, [key]: checked }));
                                }
                              }}
                              className="rounded border-slate-600 bg-slate-800"
                            />
                            {label}
                          </label>
                        );
                      })}
                      {isCustomBlocksActive && (
                        <div className="pt-2 mt-2 border-t border-[#1e232e]/50">
                          <button 
                            onClick={() => { setIsCustomBlocksActive(false); setVisibleBlocks({}); }}
                            className="w-full text-center text-[10px] text-red-400 font-bold uppercase tracking-wider hover:text-red-300 py-1.5 rounded bg-red-400/10 hover:bg-red-400/20 transition-colors"
                          >
                            Reset Defaults
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Custom Presets */}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Custom Presets:</span>
                  <button
                    onClick={() => setIsSavingPreset(!isSavingPreset)}
                    className={`px-1.5 py-1 text-[10px] rounded font-bold transition-colors ${isSavingPreset ? "bg-amber-500 text-black" : "bg-slate-800 text-amber-400 hover:bg-slate-700"}`}
                    id="btn-metrics-preset-save" title="Click S, then C1, C2 or C3 to save the currently enabled metrics as a preset"
                  >
                    S
                  </button>
                  {['C1', 'C2', 'C3'].map(c => {
                    const isCurrentlyLoaded = isCustomBlocksActive && customPresets[c] && JSON.stringify(visibleBlocks) === JSON.stringify(customPresets[c]);
                    return (
                      <div key={c} className="relative group flex items-center">
                        <button
                          id={`btn-metrics-preset-${c}`}
                          onClick={() => {
                            if (isSavingPreset) {
                              saveCustomPreset(c);
                            } else if (customPresets[c]) {
                              if (isCurrentlyLoaded) {
                                setIsCustomBlocksActive(false);
                                setVisibleBlocks({});
                              } else {
                                setVisibleBlocks(customPresets[c]);
                                setIsCustomBlocksActive(true);
                              }
                            }
                          }}
                          className={`px-2 py-1 text-[10px] rounded font-bold transition-colors ${
                            isCurrentlyLoaded 
                              ? "bg-blue-600 text-white pr-[18px]" 
                              : customPresets[c] 
                                ? "bg-emerald-600 text-white pr-[18px]" 
                                : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                          }`}
                          title={
                            customPresets[c]
                              ? (isCurrentlyLoaded
                                  ? `Deactivate preset ${c} & restore defaults`
                                  : `Load preset ${c} (click a second time to restore defaults)`)
                              : `No preset saved in ${c}`
                          }
                        >
                          {c}
                        </button>
                        {customPresets[c] && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearCustomPreset(c);
                            }}
                            className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[11px] text-emerald-200 hover:text-white font-bold w-3.5 h-3.5 flex items-center justify-center transition-colors hover:bg-emerald-700/50 rounded"
                            title={`Clear preset ${c}`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="w-px h-3 bg-[#1e232e]"></div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mode:</span>
                <button
                  id="btn-metrics-filter-default"
                  title="Group and filter dashboard metrics by media genre and category"
                  onClick={() => { setMetricsFilterMode("Default"); setMetricsSelected(["Everything"]); }}
                  className={`px-2 py-1 text-[10px] rounded font-bold uppercase transition-colors ${metricsFilterMode === "Default" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
                >
                  Category
                </button>
                <button
                  id="btn-metrics-filter-granular"
                  title="Group and filter dashboard metrics by top-level file system folders"
                  onClick={() => { setMetricsFilterMode("Granular"); setMetricsSelected(["Everything"]); }}
                  className={`px-2 py-1 text-[10px] rounded font-bold uppercase transition-colors ${metricsFilterMode === "Granular" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}
                >
                  Folder
                </button>
                </div>
              </div>
            </div>
            
            <div id="metrics-categories-container" className="flex flex-wrap gap-1.5 text-xs">
              <button
                id="btn-metrics-filter-Everything"
                title="Show statistics and file evaluations for all scanned media files"
                onClick={() => handleMetricsToggle("Everything")}
                className={`px-2.5 py-1 text-[10px] rounded transition-all font-medium border ${
                  metricsSelected.includes("Everything")
                    ? "bg-slate-700 border-slate-500 text-white shadow-md"
                    : "bg-transparent border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                Everything
              </button>
              
              {(metricsFilterMode === "Default" ? defaultMetricsOptions : foldersSet).map((opt) => {
                const isFolderMode = metricsFilterMode === "Granular";
                const filterTooltips: Record<string, string> = {
                  "Movies": "Filter dashboard metrics to only show standard feature-length films",
                  "TV Shows": "Filter dashboard metrics to only show TV series episodes and seasonal content",
                  "Documentaries": "Filter dashboard metrics to only show informational or real-life documentary films",
                  "Plays": "Filter dashboard metrics to only show recorded theatrical performances and stage plays",
                  "Shorts": "Filter dashboard metrics to only show short-form videos and animations",
                  "Specials": "Filter dashboard metrics to only show stand-up comedy, awards, concert films, or special episodes",
                  "Music Videos": "Filter dashboard metrics to only show music videos and clip collections",
                  "Music": "Filter dashboard metrics to only show audio files like FLAC, MP3, AAC, and ALAC tracks",
                  "Video Only": "Filter dashboard metrics to only show video content across all video categories",
                  "Music Only": "Filter dashboard metrics to only show audio/music tracks across all audio categories"
                };
                const tooltipText = isFolderMode 
                  ? `Filter dashboard metrics to only show files located in folder: ${opt}`
                  : (filterTooltips[opt] || `Filter dashboard metrics by ${opt}`);

                return (
                  <button
                    key={opt}
                    id={`btn-metrics-filter-${opt.replace(/\s+/g, '-')}`}
                    title={tooltipText}
                    onClick={() => handleMetricsToggle(opt)}
                    className={`px-2.5 py-1 text-[10px] rounded transition-all font-medium border ${
                      metricsSelected.includes(opt)
                        ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/20"
                        : "bg-transparent border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>          </div>

{/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
            {/* Library Overview */}
            {effectiveVisibility['library-overview-card'] && (
            <div id="library-overview-card" className="pt-3 pb-2 px-3.5 rounded-xl bg-[#14171F] border border-[#1e232e] shadow-lg flex flex-col justify-start gap-1.5 min-h-[100px] relative overflow-hidden lg:col-span-2">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-2 select-none">
                  <Database className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />
                  Library Overview
                </h4>
                
                {/* Horizontal row layout with generous space and auto wrap */}
                <div className="flex flex-wrap items-center gap-x-8 sm:gap-x-12 gap-y-3 mt-1.5">
                  <div id="total-indexed-media-card">
                    <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Indexed</div>
                    <div className="text-xl font-black font-mono text-slate-100 mt-0.5 select-all">
                      {stats.fileCount}
                    </div>
                  </div>
                  <div id="library-size-card">
                    <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Storage</div>
                    <div className="text-xl font-black font-mono text-slate-100 mt-0.5 flex items-baseline gap-1 select-all" title={stats.formattedSize}>
                      {stats.formattedSize.split(" ")[0]} <span className="text-[9px] font-sans font-bold text-slate-500 uppercase ml-0.5">{stats.formattedSize.split(" ")[1]}</span>
                    </div>
                  </div>
                  {lastScanDuration != null && (
                    <div id="scan-duration-card">
                      <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Last Scan</div>
                      <div className="text-xl font-black font-mono text-slate-100 mt-0.5 select-all animate-in fade-in duration-300" title="Time taken for the last scan">
                        {formatDurationStr(lastScanDuration)}
                      </div>
                    </div>
                  )}

                  {(() => {
                    let attentionLabel = "Needs Attention";
                    let attentionCount = stats.unfriendly;
                    let isWarning = true;
                    
                    if (isMetadataScan) {
                      attentionLabel = "Missing Tags";
                      attentionCount = displayMetadataMissing.reduce((sum, item) => sum + item.count, 0);
                      isWarning = false;
                    } else if (isSubtitleScan) {
                      attentionLabel = "Missing Subs";
                      attentionCount = displayMissingSubtitles.reduce((sum, item) => sum + item.count, 0);
                      isWarning = false;
                    } else if (isDuplicateScan) {
                      attentionLabel = "Duplicates";
                      attentionCount = dupSummary.total;
                    } else if (isAnomalyScan) {
                      attentionLabel = "Anomalies";
                      attentionCount = anomalySummary.total;
                    }

                    return (
                      <div id="needs-attention-card">
                        <div className="text-[9px] text-slate-500 font-mono uppercase tracking-wider flex items-center gap-1.5">
                          {attentionLabel}
                          {attentionCount > 0 && isWarning && (
                            <span className="w-1 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse inline-block" />
                          )}
                        </div>
                        <div className={`text-xl font-black font-mono mt-0.5 ${attentionCount > 0 ? (isWarning ? "text-rose-400" : "text-amber-400") : "text-slate-400"}`}>
                          {attentionCount}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Low profile absolute metadata in empty bottom right */}
              <div className="absolute bottom-2.5 right-3 text-right flex flex-col gap-0.5 pointer-events-auto cursor-help select-none opacity-40 hover:opacity-100 transition-opacity">
                {lastScanDuration != null && (
                  <div className="text-[8px] text-slate-500 font-mono" title="Time taken for the last scan">
                    Scan: {formatDurationStr(lastScanDuration)}
                  </div>
                )}
                {(() => {
                  const ts = localStorage.getItem("plex_last_scan_timestamp");
                  if (ts) {
                    const d = new Date(Number(ts));
                    if (!isNaN(d.getTime())) {
                      return (
                        <div className="text-[8px] text-indigo-400 font-mono" title="When the SQLite database cache was last verified">
                          Verified: {d.toLocaleDateString()}
                        </div>
                      );
                    }
                  }
                  return null;
                })()}
              </div>
            </div>
            )}

            {/* Row 3: Streaming Readiness, Media Duplicates */}
            {effectiveVisibility['stream-audit-card'] && (
              <div id="stream-audit-card" className="p-3.5 rounded-xl bg-[#14171F] border border-[#1e232e] shadow-lg flex flex-col justify-between min-h-[100px] relative overflow-hidden lg:col-span-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-2 select-none font-medium">
                    <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
                    Streaming Readiness
                  </h4>
                  <div className="text-2xl font-black font-mono mt-0.5 text-cyan-400">
                    {directPlayPercent}%
                  </div>
                </div>
                <div className="pt-2 border-t border-[#1e232e]/30 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-1.5">
                  {[
                    { label: "Legacy+ Ready", count: stats.legacy, barColor: "bg-emerald-500", labelColor: "text-emerald-400" },
                    { label: "Modern+ Ready", count: stats.modern, barColor: "bg-cyan-500", labelColor: "text-cyan-400" },
                    { label: "Bleeding Edge", count: stats.bleeding, barColor: "bg-fuchsia-500", labelColor: "text-fuchsia-400" },
                    { label: "Requires Transcode", count: stats.unfriendly, barColor: "bg-rose-500", labelColor: "text-rose-400" }
                  ].map((bar, idx) => {
                    const maxVal = totalVideoFiles || 1;
                    return (
                      <div key={idx}>
                        <div className="flex justify-between items-center text-[10px] text-slate-500 mb-0.5">
                          <span>{bar.label}</span>
                          <span className={`font-mono ${bar.labelColor} font-bold`}>{bar.count || 0} files</span>
                        </div>
                        <div className="w-full bg-[#0F1117] h-1 rounded-full overflow-hidden">
                          <div
                            className={`${bar.barColor} h-full transition-all duration-500 rounded-full`}
                            style={{ width: `${((bar.count || 0) / maxVal) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Video Distribution */}
            {effectiveVisibility['video-codecs-card'] && (
            <div id="video-codecs-card" className={`p-3 bg-[#14171F] border border-[#1e232e] rounded-xl flex flex-col transition-all duration-300 lg:col-span-1 ${hasData ? "h-[175px]" : "h-[85px]"}`}>
               <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <FileVideo className="w-3.5 h-3.5 text-blue-500" />
                Video Codecs
              </h4>
              {hasData ? (
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={displayVideo} layout="vertical" margin={{ top: 0, right: 20, left: 5, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} interval={0} tick={{fill: '#94a3b8', fontSize: 9}} width={80} />
                      <Tooltip 
                        cursor={{fill: 'rgba(30, 35, 46, 0.5)'}} 
                        contentStyle={{backgroundColor: '#0F1117', border: '1px solid #1e232e', borderRadius: '8px', fontSize: '10px', color: '#e2e8f0'}}
                        itemStyle={{color: '#3B82F6'}}
                        formatter={(value: number) => [`${value} items`, 'Count']}
                      />
                      <Bar isAnimationActive={false} dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={5}>
                        <LabelList dataKey="count" position="right" fill="#94a3b8" fontSize={8} />
                        {displayVideo.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#3B82F6" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center text-slate-500 italic text-[11px] font-medium tracking-wide">
                  Pending scanner execution...
                </div>
              )}
            </div>
            )}

            {/* Audio Codecs */}
            {effectiveVisibility['audio-codecs-card'] && (
            <div id="audio-codecs-card" className={`p-3 bg-[#14171F] border border-[#1e232e] rounded-xl flex flex-col transition-all duration-300 lg:col-span-1 ${hasData ? "h-[175px]" : "h-[85px]"}`}>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <FileAudio className="w-3.5 h-3.5 text-fuchsia-500" />
                Audio Codecs
              </h4>
              {hasData ? (
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={displayAudio} layout="vertical" margin={{ top: 0, right: 20, left: 5, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} interval={0} tick={{fill: '#94a3b8', fontSize: 9}} width={80} />
                      <Tooltip 
                        cursor={{fill: 'rgba(30, 35, 46, 0.5)'}} 
                        contentStyle={{backgroundColor: '#0F1117', border: '1px solid #1e232e', borderRadius: '8px', fontSize: '10px', color: '#e2e8f0'}}
                        itemStyle={{color: '#D946EF'}}
                        formatter={(value: number) => [`${value} tracks`, 'Count']}
                      />
                      <Bar isAnimationActive={false} dataKey="count" fill="#D946EF" radius={[0, 4, 4, 0]} barSize={5}>
                        <LabelList dataKey="count" position="right" fill="#94a3b8" fontSize={8} />
                        {displayAudio.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#D946EF" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center text-slate-500 italic text-[11px] font-medium tracking-wide">
                  Pending codec analysis...
                </div>
              )}
            </div>
            )}

            {/* Containers */}
            {effectiveVisibility['containers-card'] && (
            <div id="containers-card" className={`p-3 bg-[#14171F] border border-[#1e232e] rounded-xl flex flex-col transition-all duration-300 lg:col-span-1 ${hasData ? "h-[175px]" : "h-[85px]"}`}>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 text-slate-400" />
                Containers
              </h4>
              {hasData ? (
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={displayContainer} layout="vertical" margin={{ top: 0, right: 20, left: 5, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} interval={0} tick={{fill: '#94a3b8', fontSize: 9}} width={80} />
                      <Tooltip 
                        cursor={{fill: 'rgba(30, 35, 46, 0.5)'}} 
                        contentStyle={{backgroundColor: '#0F1117', border: '1px solid #1e232e', borderRadius: '8px', fontSize: '10px', color: '#e2e8f0'}}
                        itemStyle={{color: '#94A3B8'}}
                        formatter={(value: number) => [`${value} files`, 'Count']}
                      />
                      <Bar isAnimationActive={false} dataKey="count" fill="#94A3B8" radius={[0, 4, 4, 0]} barSize={5}>
                        <LabelList dataKey="count" position="right" fill="#94a3b8" fontSize={8} />
                        {displayContainer.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#94A3B8" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center text-slate-500 italic text-[11px] font-medium tracking-wide">
                  Pending container index...
                </div>
              )}
            </div>
            )}

            {/* Music Codecs */}
            {effectiveVisibility['music-codecs-card'] && (
            <div id="music-codecs-card" className={`p-3 bg-[#14171F] border border-[#1e232e] rounded-xl flex flex-col transition-all duration-300 lg:col-span-1 ${hasData ? "h-[175px]" : "h-[85px]"}`}>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-[#D9A752]" />
                Music Codecs
              </h4>
              {hasData ? (
                <div className="flex-1 w-full min-h-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={displayMusic} layout="vertical" margin={{ top: 0, right: 20, left: 5, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} interval={0} tick={{fill: '#94a3b8', fontSize: 9}} width={80} />
                      <Tooltip 
                        cursor={{fill: 'rgba(30, 35, 46, 0.5)'}} 
                        contentStyle={{backgroundColor: '#0F1117', border: '1px solid #1e232e', borderRadius: '8px', fontSize: '10px', color: '#e2e8f0'}}
                        itemStyle={{color: '#D9A752'}}
                        formatter={(value: number) => [`${value} tracks`, 'Count']}
                      />
                      <Bar isAnimationActive={false} dataKey="count" fill="#D9A752" radius={[0, 4, 4, 0]} barSize={5}>
                        <LabelList dataKey="count" position="right" fill="#94a3b8" fontSize={8} />
                        {displayMusic.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#D9A752" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center text-slate-500 italic text-[11px] font-medium tracking-wide">
                  Pending audio cataloging...
                </div>
              )}
            </div>
            )}

            {/* Metadata Completeness */}
            {effectiveVisibility['metadata-completeness-card'] && (
            <div id="metadata-completeness-card" className="p-3 bg-[#14171F] border border-[#1e232e] shadow-lg rounded-xl flex flex-col transition-all duration-300 lg:col-span-1 min-h-[100px]">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Metadata Completeness
              </h4>
              {hasData ? (
                <div className="flex-1 flex flex-col justify-center items-center">
                  <div className="relative flex items-center justify-center">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        stroke="#1e232e"
                        strokeWidth="4"
                        fill="transparent"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        stroke={libraryHealthIndex > 85 ? "#10B981" : libraryHealthIndex > 60 ? "#F59E0B" : "#EF4444"}
                        strokeWidth="4"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 26}
                        strokeDashoffset={2 * Math.PI * 26 * (1 - libraryHealthIndex / 100)}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <span className="absolute text-sm font-bold font-mono text-slate-200">{libraryHealthIndex}%</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium text-center mt-2">
                    {libraryHealthIndex > 85 ? "Excellent coverage!" : libraryHealthIndex > 60 ? "Needs enrichment" : "Poor health"}
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex items-center text-slate-500 italic text-[11px] font-medium tracking-wide">
                  Pending analysis...
                </div>
              )}
            </div>
            )}

            {/* Missing Meta Tags */}
            {effectiveVisibility['missing-metadata-card'] && (
            <div id="missing-metadata-card" className="p-3 bg-[#14171F] border border-[#1e232e] shadow-lg rounded-xl flex flex-col transition-all duration-300 lg:col-span-3 min-h-[100px]">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  Missing Meta Tags
                </h4>
                {/* Clean, elegant legend of coloring */}
                <div className="flex items-center gap-3 text-[9px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#F43F5E]" /> High (&gt;20%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Moderate (5-20%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#14B8A6]" /> Low (&lt;5%)
                  </span>
                </div>
              </div>
              
              {hasData && (displayVideoMetadataMissing.length > 0 || displayMusicMetadataMissing.length > 0) ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0">
                  {/* Video Metadata Column */}
                  <div className="flex flex-col">
                    <div className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider font-bold border-b border-[#1e232e]/50 pb-1 flex items-center justify-between">
                      <span>Video Tags</span>
                      <span className="text-[9px] text-slate-500 font-normal normal-case">Percent of Video Files</span>
                    </div>
                    {displayVideoMetadataMissing.length > 0 ? (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {displayVideoMetadataMissing.map((entry, idx) => {
                          const maxCount = Math.max(...displayVideoMetadataMissing.map(e => e.count), 1);
                          const barWidthPercent = (entry.count / maxCount) * 100;
                          const color = entry.pct > 20 ? '#F43F5E' : entry.pct > 5 ? '#F59E0B' : '#14B8A6';
                          
                          return (
                            <div key={idx} className="flex items-center text-[11px] h-6 group relative">
                              <div className="w-[100px] text-slate-300 font-medium truncate" title={entry.name}>
                                {entry.name}
                              </div>
                              <div className="flex-1 mx-2 relative flex items-center">
                                <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-300" 
                                    style={{ width: `${barWidthPercent}%`, backgroundColor: color }} 
                                  />
                                </div>
                              </div>
                              <div className="w-12 text-right font-mono text-[10px] text-slate-400">
                                {entry.count} ({entry.pct}%)
                              </div>
                              {/* Custom micro-tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 bg-[#0F1117] border border-[#1e232e] text-[9px] px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap">
                                <span className="font-semibold" style={{ color }}>{entry.name}</span>: {entry.count} files missing ({entry.pct}%)
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-slate-500 italic text-[11px] py-4">All video metadata tags present.</div>
                    )}
                  </div>

                  {/* Music Metadata Column */}
                  <div className="flex flex-col">
                    <div className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider font-bold border-b border-[#1e232e]/50 pb-1 flex items-center justify-between">
                      <span>Music Tags</span>
                      <span className="text-[9px] text-slate-500 font-normal normal-case">Percent of Music Files</span>
                    </div>
                    {displayMusicMetadataMissing.length > 0 ? (
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {displayMusicMetadataMissing.map((entry, idx) => {
                          const maxCount = Math.max(...displayMusicMetadataMissing.map(e => e.count), 1);
                          const barWidthPercent = (entry.count / maxCount) * 100;
                          const color = entry.pct > 20 ? '#F43F5E' : entry.pct > 5 ? '#F59E0B' : '#14B8A6';
                          
                          return (
                            <div key={idx} className="flex items-center text-[11px] h-6 group relative">
                              <div className="w-[100px] text-slate-300 font-medium truncate" title={entry.name}>
                                {entry.name}
                              </div>
                              <div className="flex-1 mx-2 relative flex items-center">
                                <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-300" 
                                    style={{ width: `${barWidthPercent}%`, backgroundColor: color }} 
                                  />
                                </div>
                              </div>
                              <div className="w-12 text-right font-mono text-[10px] text-slate-400">
                                {entry.count} ({entry.pct}%)
                              </div>
                              {/* Custom micro-tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 bg-[#0F1117] border border-[#1e232e] text-[9px] px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap">
                                <span className="font-semibold" style={{ color }}>{entry.name}</span>: {entry.count} files missing ({entry.pct}%)
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-slate-500 italic text-[11px] py-4">All music metadata tags present.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center text-slate-500 italic text-[11px] font-medium tracking-wide">
                  {hasData ? "All expected metadata fields present." : "Pending validation..."}
                </div>
              )}
            </div>
            )}

            {/* Subtitle Audit */}
            {effectiveVisibility['subtitle-audit-card'] && (
            <div id="subtitle-audit-card" className="p-3.5 rounded-xl bg-[#14171F] border border-[#1e232e] shadow-lg flex flex-col justify-between min-h-[100px] relative overflow-hidden lg:col-span-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2 select-none font-medium">
                <Subtitles className="w-3.5 h-3.5 text-purple-400" />
                Subtitle Audit
              </h4>
              {hasData ? (
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-6 mt-1">
                  {/* Files Missing Subtitles Section */}
                  <div className="flex flex-col">
                    <div className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider font-bold border-b border-[#1e232e]/50 pb-1">
                      Files Missing Subtitles
                    </div>
                    {displayMissingSubtitles.length > 0 ? (
                      <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                        {displayMissingSubtitles.map((entry, idx) => {
                          const maxCount = Math.max(...displayMissingSubtitles.map(e => e.count), 1);
                          const barWidthPercent = (entry.count / maxCount) * 100;
                          return (
                            <div key={idx} className="flex items-center text-[11px] h-6 group relative">
                              <div className="w-[85px] text-slate-300 font-medium truncate" title={entry.name}>
                                {entry.name}
                              </div>
                              <div className="flex-1 mx-2 relative flex items-center">
                                <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="bg-purple-400 h-full rounded-full transition-all duration-300" 
                                    style={{ width: `${barWidthPercent}%` }} 
                                  />
                                </div>
                              </div>
                              <div className="w-8 text-right font-mono text-[10px] text-slate-400">
                                {entry.count}
                              </div>
                              {/* Custom micro-tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 bg-[#0F1117] border border-[#1e232e] text-[9px] px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap">
                                <span className="text-purple-400 font-semibold">{entry.name}</span>: {entry.count} missing subtitles
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-slate-500 italic text-[11px] py-4">No missing subtitles found.</div>
                    )}
                  </div>

                  {/* Subtitle Formats Found Section */}
                  <div className="flex flex-col">
                    <div className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider font-bold border-b border-[#1e232e]/50 pb-1 flex justify-between items-center">
                      <span>Subtitle Formats Found</span>
                      <div className="flex items-center gap-2 text-[8px] font-normal tracking-normal lowercase normal-case">
                        <span className="flex items-center gap-0.5 text-emerald-400"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> safe</span>
                        <span className="flex items-center gap-0.5 text-rose-400"><span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> transcode</span>
                      </div>
                    </div>
                    {displaySubtitleCodecs.length > 0 ? (
                      <div className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                        {displaySubtitleCodecs.map((entry, idx) => {
                          const maxCount = Math.max(...displaySubtitleCodecs.map(e => e.count), 1);
                          const barWidthPercent = (entry.count / maxCount) * 100;
                          return (
                            <div key={idx} className="flex items-center text-[11px] h-6 group relative">
                              <div className="w-[100px] text-slate-300 font-medium truncate" title={entry.name}>
                                {entry.name}
                              </div>
                              <div className="flex-1 mx-2 relative flex items-center">
                                <div className="w-full bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all duration-300" 
                                    style={{ width: `${barWidthPercent}%`, backgroundColor: entry.fill }} 
                                  />
                                </div>
                              </div>
                              <div className="w-8 text-right font-mono text-[10px] text-slate-400">
                                {entry.count}
                              </div>
                              {/* Custom micro-tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 bg-[#0F1117] border border-[#1e232e] text-[9px] px-1.5 py-0.5 rounded shadow-xl whitespace-nowrap" style={{ color: entry.fill }}>
                                <span className="font-semibold">{entry.name}</span>: {entry.count} tracks ({entry.tooltipMsg})
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-slate-500 italic text-[11px] py-4">No subtitles detected.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-500 italic text-[11px] font-medium tracking-wide">
                  Pending subtitle verification...
                </div>
              )}
            </div>
            )}

            {/* Quality Anomalies */}
            {effectiveVisibility['quality-anomalies-card'] && (
            <div id="quality-anomalies-card" className="p-3.5 rounded-xl bg-[#14171F] border border-[#1e232e] shadow-lg flex flex-col justify-between min-h-[100px] relative overflow-hidden lg:col-span-2">
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-2 select-none">
                  <AlertCircle className={`w-3.5 h-3.5 ${anomalySummary.total > 0 ? 'text-rose-500' : 'text-slate-500'}`} />
                  Quality Anomalies
                </h4>
                <div className={`text-2xl font-black font-mono mt-0.5 ${anomalySummary.total > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                  {anomalySummary.total}
                </div>
              </div>
              <div className="pt-2 border-t border-[#1e232e]/30 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5 mt-1.5">
                {/* Video column */}
                <div className="space-y-1.5 border-r border-[#1e232e]/30 pr-4">
                    <div className="flex justify-between items-center text-[9px] text-slate-500 mb-0.5">
                      <span>Video</span>
                      <span className="font-mono text-rose-400 font-bold">{anomalySummary.totalVideo} items</span>
                    </div>
                    <div className="w-full bg-[#0F1117] h-1 rounded-full overflow-hidden flex">
                      <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${(anomalySummary.vBloated / (anomalySummary.totalVideo || 1)) * 100}%` }} title="Bloated"></div>
                      <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${(anomalySummary.vStarved / (anomalySummary.totalVideo || 1)) * 100}%` }} title="Starved"></div>
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5 flex justify-between">
                      <span 
                        className="cursor-help hover:text-amber-400 transition-colors" 
                        title={anomalySummary.vBloatedList.length > 0 
                          ? `Bloated Video Files:\n• ${anomalySummary.vBloatedList.join('\n• ')}` 
                          : "No bloated video files detected"}
                      >
                        {anomalySummary.vBloated} bloated
                      </span>
                      <span 
                        className="cursor-help hover:text-rose-400 transition-colors" 
                        title={anomalySummary.vStarvedList.length > 0 
                          ? `Starved Video Files:\n• ${anomalySummary.vStarvedList.join('\n• ')}` 
                          : "No starved video files detected"}
                      >
                        {anomalySummary.vStarved} starved
                      </span>
                    </div>
                </div>

                {/* Music column */}
                <div className="space-y-1.5 border-r border-[#1e232e]/30 pr-4">
                    <div className="flex justify-between items-center text-[9px] text-slate-500 mb-0.5">
                      <span>Music</span>
                      <span className="font-mono text-rose-400 font-bold">{anomalySummary.totalMusic} items</span>
                    </div>
                    <div className="w-full bg-[#0F1117] h-1 rounded-full overflow-hidden flex">
                      <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${(anomalySummary.mBloated / (anomalySummary.totalMusic || 1)) * 100}%` }} title="Bloated"></div>
                      <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${(anomalySummary.mStarved / (anomalySummary.totalMusic || 1)) * 100}%` }} title="Starved"></div>
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono mt-0.5 flex justify-between">
                      <span 
                        className="cursor-help hover:text-amber-400 transition-colors" 
                        title={anomalySummary.mBloatedList.length > 0 
                          ? `Bloated Music Files:\n• ${anomalySummary.mBloatedList.join('\n• ')}` 
                          : "No bloated music files detected"}
                      >
                        {anomalySummary.mBloated} bloated
                      </span>
                      <span 
                        className="cursor-help hover:text-rose-400 transition-colors" 
                        title={anomalySummary.mStarvedList.length > 0 
                          ? `Starved Music Files:\n• ${anomalySummary.mStarvedList.join('\n• ')}` 
                          : "No starved music files detected"}
                      >
                        {anomalySummary.mStarved} starved
                      </span>
                    </div>
                </div>

                {/* Storage Impact column */}
                <div className="flex flex-col justify-start">
                    <div className="flex justify-between items-center text-[9px] text-slate-500 mb-0.5">
                      <span>Storage Impact</span>
                      <span className="font-mono text-rose-400 font-bold">From Bloated</span>
                    </div>
                    <div className="font-medium font-mono text-rose-400 text-sm leading-none mt-0.5 mb-1.5">
                      {anomalySummary.bloatedSizeGB >= 1000 ? (anomalySummary.bloatedSizeGB / 1024).toFixed(2) + ' TB' : anomalySummary.bloatedSizeGB.toFixed(1) + ' GB'} wasted
                    </div>
                    <div className="text-[9px] text-slate-400 leading-tight">
                      Re-encode these files to save space without losing visual fidelity.
                    </div>
                </div>
              </div>
            </div>
            )}

            {/* Media Duplicates */}
            {effectiveVisibility['media-duplicates-card'] && (
            <div id="media-duplicates-card" className="p-3.5 rounded-xl bg-[#14171F] border border-[#1e232e] shadow-lg flex flex-col justify-between min-h-[100px] relative overflow-hidden lg:col-span-4">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-2 select-none">
                <Layers className={`w-3.5 h-3.5 ${dupSummary.total > 0 ? 'text-orange-500' : 'text-slate-500'}`} />
                Media Duplicates
              </h4>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex flex-col justify-between mt-1">
                  <div>
                    <div className={`text-2xl font-black font-mono ${dupSummary.total > 0 ? 'text-orange-400' : 'text-slate-300'}`}>
                      {dupSummary.total}
                      <span className="text-xs text-slate-500 font-sans font-medium ml-2">Total Copies</span>
                    </div>
                    <div className={`text-sm font-bold font-mono ${dupSummary.totalSizeGB > 0 ? 'text-rose-400' : 'text-slate-500'} mb-2`}>
                      {dupSummary.totalSizeGB >= 1000 ? (dupSummary.totalSizeGB / 1024).toFixed(2) + ' TB' : dupSummary.totalSizeGB.toFixed(1) + ' GB'}
                      <span className="text-[9px] text-slate-500 font-sans font-medium ml-1.5 uppercase tracking-wider">Wasted Space</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 mb-0.5">
                      <span>Duplicate Ratio</span>
                      <span className="font-mono text-orange-400 font-bold">{Math.round((dupSummary.total / (stats.fileCount || 1)) * 100)}%</span>
                    </div>
                    <div className="w-full bg-[#0F1117] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-orange-500 h-full transition-all duration-500 rounded-full"
                        style={{ width: `${(dupSummary.total / (stats.fileCount || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="h-[140px] mt-1 border-l sm:border-t-0 border-t border-[#1e232e]/30 sm:pl-4 sm:pt-0 pt-3">
                  <div className="text-[10px] text-slate-400 mb-2 uppercase tracking-wider font-bold">Category Breakdown</div>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart 
                      data={displayDuplicateCategories} 
                      layout="vertical" 
                      margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} interval={0} tick={{fill: '#94a3b8', fontSize: 9}} width={40} />
                      <Tooltip 
                        cursor={{fill: 'rgba(30, 35, 46, 0.5)'}} 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-[#0F1117] border border-[#1e232e] rounded-lg p-2 text-[10px] text-slate-200 shadow-xl">
                                <div className="font-bold text-xs" style={{ color: data.fill }}>{data.name}</div>
                                <div className="mt-0.5 text-slate-400">{data.count} copies found</div>
                                <div className="mt-1 pt-1 border-t border-[#1e232e] font-medium font-mono text-rose-400">
                                  {data.sizeGB >= 1000 ? (data.sizeGB / 1024).toFixed(2) + ' TB' : data.sizeGB.toFixed(1) + ' GB'} wasted
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar isAnimationActive={false} dataKey="count" radius={[0, 4, 4, 0]} barSize={8}>
                        <LabelList dataKey="count" position="right" fill="#94a3b8" fontSize={9} />
                        {displayDuplicateCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-[140px] mt-1 border-l sm:border-t-0 border-t border-[#1e232e]/30 sm:pl-4 sm:pt-0 pt-3 overflow-y-auto pr-1 custom-scrollbar">
                  <div className="text-[10px] text-slate-400 mb-1.5 uppercase tracking-wider font-bold sticky top-0 bg-[#14171F] z-10 pb-1">Top Duplicates</div>
                  {displayDuplicates.length > 0 ? (
                    <div className="space-y-1.5">
                      {displayDuplicates.map((dup, idx) => (
                        <div key={idx} className="flex items-center justify-between group hover:bg-[#1e232e]/50 px-1.5 py-0.5 rounded transition-colors">
                          <span className="text-[10px] text-slate-300 truncate pr-2 font-medium" title={dup.fullName}>{dup.name}</span>
                          <span className="text-[10px] font-mono text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded flex-shrink-0 border border-orange-500/20">{dup.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-500 italic flex items-center h-full pb-4">No duplicates found</div>
                  )}
                </div>
              </div>
            </div>
            )}

</div>


        </div>

      {showFileRegistry && (
        <div
          className="p-1 max-w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-800/40 border border-[#1e232e] to-transparent"
          id="file-registry-section"
        >
          <div className="p-4 bg-[#14171F] rounded-lg h-full">
            <div id="file-registry-header" className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 border-b border-[#1e232e] pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-500" />
                  Library Scan Details
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-1">
                  Displays essential attributes of scanned media. Export to Excel or HTML for additional details.
                </p>
              </div>
            </div>


            {/* Filter Toolbar */}
            <div className="flex flex-wrap flex-col md:flex-row gap-3 mb-5 relative z-20" id="table-filter-bar">
              <div className={`relative w-[38px] h-[28px] shrink-0 transition-all duration-200 ${isSearchVisible ? "z-50" : "z-20"}`}>
                <button
                  id="btn-toggle-search"
                  onClick={() => {
                    const nextState = !isSearchVisible;
                    setIsSearchVisible(nextState);
                    if (nextState) {
                      setTimeout(() => document.getElementById('search-input')?.focus(), 50);
                    }
                  }}
                  className={`absolute left-0 top-0 h-full w-[38px] flex items-center justify-center bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 hover:border-blue-500/50 rounded transition-all cursor-pointer z-20 ${isSearchVisible ? "bg-[#1E232E] border-blue-500/50 rounded-r-none border-r-0" : ""}`}
                  title="Toggle Search"
                >
                  <Search className={`w-3.5 h-3.5 ${isSearchVisible ? "text-blue-500" : "text-slate-400"}`} />
                </button>
                <div className={`absolute top-0 left-[38px] h-full overflow-hidden transition-all duration-300 bg-[#1A1D27] z-50 ${isSearchVisible ? "w-[250px] opacity-100 visible shadow-xl" : "w-0 opacity-0 invisible"}`}>
                  <input
                    id="search-input"
                    type="text"
                    value={localSearchTerm}
                    onChange={(e) => setLocalSearchTerm(e.target.value)}
                    onBlur={(e) => {
                      if (document.getElementById("tour-remote-panel") || document.body.classList.contains("demo-running")) return;
                      if (!e.target.value) setIsSearchVisible(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        setIsSearchVisible(false);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    placeholder="Search by file name, container, or codec..."
                    className="w-full h-full bg-[#1A1D27] border border-slate-700/50 border-l-0 outline-none focus:border-blue-500/50 hover:border-blue-500/50 text-slate-200 px-3 text-[11px] rounded-r transition-all"
                  />
                </div>
              </div>
              
              <div ref={colMenuRef} className="relative h-[28px] z-30">
                <button 
                  id="btn-toggle-columns"
                  onClick={() => setColMenuOpen(!colMenuOpen)}
                  className="flex items-center gap-1.5 bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 hover:border-blue-500/50 px-3 py-1.5 rounded text-[11px] font-normal text-slate-300 transition-all cursor-pointer h-full"
                >
                  <Filter className="w-3 h-3 text-slate-400" /> Columns
                </button>
                {colMenuOpen && (
                  <div className="absolute left-0 top-full mt-1 w-48 bg-[#14171F] border border-slate-700 rounded-lg shadow-xl z-50 p-2 flex flex-col gap-1">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 px-1">Toggle Columns</div>
                    {Object.keys(visibleColumns).map(key => (
                      <label id={`col-toggle-${key}`} key={key} className="flex items-center gap-2 text-xs text-slate-300 hover:bg-slate-700 px-2 py-1 rounded cursor-pointer transition-all duration-300">
                        <input 
                          type="checkbox" 
                          checked={visibleColumns[key]} 
                          onChange={() => toggleColumn(key)} 
                          className="rounded bg-[#0F1117] border-slate-700 text-blue-500"
                        />
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => formatCodecString(str))}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs items-start">
                <div id="file-registry-category-bar" className="flex flex-wrap gap-1 items-center bg-[#1A1D27] border border-slate-700/50 p-0.5 rounded select-none min-h-[28px]">
                  {categoriesSet.map((cat) => (
                    <button
                      key={cat}
                      id={`btn-cat-${cat}`}
                      onClick={() => handleCategoryToggle(cat)}
                      className={`px-2 py-0.5 text-[11px] rounded transition-all font-normal border ${
                        selectedCategories.includes(cat)
                          ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/20"
                          : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      {cat === "All" ? "All Types" : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            
            
            {/* Enhanced Pagination */}
            {paginationControls}
            {/* Media List Grid */}
            <div className={`overflow-x-auto max-w-full rounded-xl border border-slate-800 bg-[#14171F] transition-opacity duration-200 ${isPending ? 'opacity-50 pointer-events-none' : 'opacity-100'}`} style={{ resize: 'vertical', minHeight: '300px' }} id="table-scroll-container">
              {(() => {
  const group = selectedCategories.length > 0 ? getCategoryGroup(selectedCategories[0]) : 'Other';
  let headers = [];
  if (group === 'Music') {
    headers = [
      {label: 'Artist', key: 'artist', width: '150px'},
      {label: 'Album', key: 'album', width: '180px'},
      {label: 'Song Title', key: 'songTitle', width: '220px'},
      {label: 'Format/Codec', key: 'format', center: true, width: '110px'},
      {label: 'Bitrate', key: 'bitrate', center: true, width: '100px'},
      {label: 'Sample Rate', key: 'audioSampleRate', center: true, width: '100px'},
      {label: 'File Path', key: 'path', width: '180px'}
    ];
  } else if (group === 'TV') {
    headers = [
      {label: 'Stream Friendly?', key: 'stream', width: '130px'},
      {label: 'Series Title', key: 'seriesTitle', width: '180px'},
      {label: 'Season', key: 'season', width: '80px', center: true},
      {label: 'Episode', key: 'episode', width: '80px', center: true},
      {label: 'Episode Title', key: 'epTitle', width: '200px'},
      {label: 'Filename', key: 'filename', width: '250px'},
      {label: 'Video Codec', key: 'videoCodec', center: true, width: '100px'},
      {label: 'Video Depth', key: 'videoBitDepth', center: true, width: '90px'},
      {label: 'Audio Codec', key: 'audioCodec', center: true, width: '120px'},
      {label: 'Container', key: 'container', center: true, width: '90px'},
      {label: 'Chapters', key: 'chapterCount', center: true, width: '80px'},
      {label: 'File Path', key: 'path', width: '180px'}
    ];
  } else if (group === 'Movies') {
    headers = [
      {label: 'Stream Friendly?', key: 'stream', width: '130px'},
      {label: 'Title', key: 'title', width: '200px'},
      {label: 'Filename', key: 'filename', width: '250px'},
      {label: 'Video Codec', key: 'videoCodec', center: true, width: '100px'},
      {label: 'Video Depth', key: 'videoBitDepth', center: true, width: '90px'},
      {label: 'Audio Codec', key: 'audioCodec', center: true, width: '120px'},
      {label: 'Container', key: 'container', center: true, width: '90px'},
      {label: 'Chapters', key: 'chapterCount', center: true, width: '80px'},
      {label: 'File Path', key: 'path', width: '180px'}
    ];
  } else {
    headers = [
      {label: 'Filename', key: 'filename', width: '400px'},
      {label: 'File Path', key: 'path', width: '600px'}
    ];
  }
  
  headers = headers.filter(h => visibleColumns[h.key]);

  const getCompatibilityColor = (lvl) => {
    if (lvl === 'pending') {
      return 'text-slate-400 bg-[#1A1D27] border-slate-700/50';
    }
    switch(lvl) {
      case 'legacy': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'modern': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
      case 'bleeding': return 'text-fuchsia-400 bg-fuchsia-400/10 border-fuchsia-400/20';
      case 'unfriendly': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
    }
  };
  const getCompatibilityLabel = (lvl) => {
    if (lvl === 'pending') {
      return 'Pending Scan';
    }
    switch(lvl) {
      case 'legacy': return 'Legacy+';
      case 'modern': return 'Modern+';
      case 'bleeding': return 'Bleeding Edge';
      case 'unfriendly': return 'Transcode Req.';
      default: return 'Unknown';
    }
  };
  const getCompatibilityTooltip = (lvl) => {
    if (lvl === 'pending') {
      return "Pending Scan: Run the Streaming compatibility scanner to evaluate streaming compatibility.";
    }
    switch(lvl) {
      case 'legacy': return "Direct Streams to most legacy and modern hardware without server transcoding";
      case 'modern': return "Direct Streams to most modern hardware without transcoding. May trigger server transcoding on older clients.";
      case 'bleeding': return "Requires transcoding on most modern and legacy hardware. Manual transcode recommended.";
      case 'unfriendly': return "This file should be transcoded to a format compatible with Legacy+ or Modern+ standards or it will need server transcoding";
      default: return "";
    }
  };

  return (
    <table className="text-left border-collapse text-xs whitespace-nowrap" style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
      <thead>
        <tr id="registry-table-header-row" className="border-b border-[#1e232e] bg-[#1E232E] text-slate-400 font-bold uppercase text-[10px] tracking-wide relative">
          {headers.filter(h => visibleColumns[h.key] !== false).map((h, i) => (
            <th 
              key={i} 
              id={`th-header-${h.key}`}
              onClick={() => handleSort(h.key)}
              className="p-3 font-semibold select-none align-middle text-left cursor-pointer hover:bg-[#252b36] hover:text-slate-200 transition-colors border-r border-[#1e232e]/50 last:border-r-0 relative group" 
              style={{ width: columnWidths[h.key] ? `${columnWidths[h.key]}px` : (h.width || '150px'), minWidth: '80px', maxWidth: '800px', overflow: 'hidden' }}
            >
              <div className="flex items-center justify-between gap-1 w-full pr-2">
                <span dangerouslySetInnerHTML={{ __html: h.label.replace(' ', '&nbsp;') }} className="truncate" />
                <span className="flex-shrink-0 text-slate-500 group-hover:text-slate-300 transition-colors">
                  {sortColumn === h.key ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-400" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </span>
              </div>
              <div 
                onMouseDown={(e) => handleColumnResize(e, h.key, parseInt(h.width || '150'))}
                className={`absolute top-0 right-0 w-[8px] h-full cursor-col-resize select-none z-10 hover:bg-blue-500/30 transition-colors ${
                  resizingColKey === h.key ? 'bg-blue-500/40 border-r border-blue-400' : ''
                }`}
                title="Drag to resize column"
              />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[#1e232e]/50 font-medium">
        {paginatedFiles.length === 0 ? (
          <tr>
            <td colSpan={headers.length} className="p-8 text-center text-slate-500 font-mono text-xs leading-relaxed whitespace-normal align-top">
              No matching files identified in library. Change filter selection or run scan.
            </td>
          </tr>
        ) : (() => {
          let lastSectionNorm: string | null = null;
          return paginatedFiles.map((dataRow) => {
            const { item, level } = dataRow || {};
            if (!item) return null;
            const isMus = group === 'Music' || isMusicCategory(item.category);
            const parsed = !isMus ? parsedMetadataMap.get(item.id) : null;
            const cStyle = "p-3 align-top text-left text-slate-300 whitespace-nowrap truncate max-w-[0px]";
            const cCenter = "p-3 align-top text-left text-slate-300 font-mono text-[10px] whitespace-nowrap truncate max-w-[0px]";
            
            const cellStream = () => visibleColumns.stream ? (
              <td className={cCenter} title={getCompatibilityTooltip(level)}>
                 <span className={`px-2 py-0.5 rounded border ${getCompatibilityColor(level)}`}>
                   {getCompatibilityLabel(level)}
                 </span>
              </td>
            ) : null;

            const showHeaders = ((group === 'Movies' || group === 'TV') && 
                                (sortColumn === null || sortColumn === 'title' || sortColumn === 'seriesTitle')) ||
                                (group === 'Music' && 
                                (sortColumn === null || sortColumn === 'artist' || sortColumn === 'album'));

            let sectionHeaderRow = null;
            if (showHeaders) {
              let section = '';
              if (group === 'Movies') {
                const rawTitle = parsed?.title || item.filename || '';
                section = getSectionHeaderForTitle(rawTitle);
              } else if (group === 'TV') {
                section = parsed?.title || 'Ungrouped';
              } else if (group === 'Music') {
                section = getMusicGroupTitle(item, customRules, item.category);
              }

              const normSection = normalizeGroupTitle(section);
              if (normSection !== lastSectionNorm) {
                lastSectionNorm = normSection;
                if (group === 'Movies') {
                  sectionHeaderRow = (
                    <tr key={`section-${section}-${item.id}`} className="border-y border-[#00B0F0]/30" style={{ backgroundColor: '#00B0F0', height: '18px' }}>
                      <td colSpan={headers.length} className="px-4 text-left font-bold text-white select-none align-middle" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '16px', lineHeight: '18px', paddingTop: '0px', paddingBottom: '0px', height: '18px' }}>
                        {section}
                      </td>
                    </tr>
                  );
                } else {
                  sectionHeaderRow = (
                    <tr key={`section-${section}-${item.id}`} className="border-y border-sky-500/15" style={{ backgroundColor: '#ADD8E6', height: '18px' }}>
                      <td colSpan={headers.length} className="px-4 text-left font-bold text-slate-950 select-none align-middle" style={{ fontFamily: 'Calibri, sans-serif', fontSize: '16px', lineHeight: '18px', paddingTop: '0px', paddingBottom: '0px', height: '18px' }}>
                        {section}
                      </td>
                    </tr>
                  );
                }
              }
            }

            const rowContent = (() => {
              if (group === 'Music') {
                const codec = getPrimaryAudioCodec(item);
                return (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    {visibleColumns.artist && <td className={cStyle} title={getDisplayArtist(item, customRules)}>{getDisplayArtist(item, customRules)}</td>}
                    {visibleColumns.album && <td className={cStyle} title={getDisplayAlbum(item, customRules)}>{getDisplayAlbum(item, customRules)}</td>}
                    {visibleColumns.songTitle && <td className={cStyle} title={getDisplaySongTitle(item, customRules)}>{getDisplaySongTitle(item, customRules)}</td>}
                    {visibleColumns.format && <td className={cCenter}>{codec}</td>}
                    {visibleColumns.bitrate && <td className={cCenter}>{item.audioBitrate ? Math.round(item.audioBitrate / 1000) + ' kbps' : '-'}</td>}
                    {visibleColumns.audioSampleRate && <td className={cCenter}>{item.audioSampleRate ? `${item.audioSampleRate / 1000} kHz` : '-'}</td>}
                    {visibleColumns.path && <td className={cStyle} title={item.filePath}>{item.filePath}</td>}
                  </tr>
                );
              } else if (group === 'TV' && parsed) {
                return (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    {cellStream()}
                    {visibleColumns.seriesTitle && <td className={cStyle} title={parsed?.title}>{parsed?.title || '-'}</td>}
                    {visibleColumns.season && <td className={cCenter}>{parsed?.season !== '-' ? parsed?.season : '-'}</td>}
                    {visibleColumns.episode && <td className={cCenter}>{parsed.episode !== '-' ? parsed.episode : '-'}</td>}
                    {visibleColumns.epTitle && <td className={cStyle} title={parsed.epTitle}>{parsed.epTitle || '-'}</td>}
                    {visibleColumns.filename && <td className={cStyle} title={item.filename}>{item.filename}</td>}
                    {visibleColumns.videoCodec && <td className={cCenter}>{getPrimaryVideoCodec(item)}</td>}
                    {visibleColumns.videoBitDepth && <td className={cCenter}>{item.videoBitDepth || '-'}</td>}
                    {visibleColumns.audioCodec && <td className={cCenter}>{getFormattedAudioTracks(item)}</td>}
                    {visibleColumns.container && <td className={cCenter}>{getContainerFormat(item)}</td>}
                    {visibleColumns.chapterCount && <td className={cCenter}>{item.chapterCount !== undefined && item.chapterCount > 0 ? item.chapterCount : '-'}</td>}
                    {visibleColumns.path && <td className={cStyle} title={item.filePath}>{item.filePath}</td>}
                  </tr>
                );
              } else if (group === 'Movies' && parsed) {
                return (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    {cellStream()}
                    {visibleColumns.title && <td className={cStyle} title={parsed.title}>{parsed.title || '-'}</td>}
                    {visibleColumns.filename && <td className={cStyle} title={item.filename}>{item.filename}</td>}
                    {visibleColumns.videoCodec && <td className={cCenter}>{getPrimaryVideoCodec(item)}</td>}
                    {visibleColumns.videoBitDepth && <td className={cCenter}>{item.videoBitDepth || '-'}</td>}
                    {visibleColumns.audioCodec && <td className={cCenter}>{getFormattedAudioTracks(item)}</td>}
                    {visibleColumns.container && <td className={cCenter}>{getContainerFormat(item)}</td>}
                    {visibleColumns.chapterCount && <td className={cCenter}>{item.chapterCount !== undefined && item.chapterCount > 0 ? item.chapterCount : '-'}</td>}
                    {visibleColumns.path && <td className={cStyle} title={item.filePath}>{item.filePath}</td>}
                  </tr>
                );
              } else {
                return (
                  <tr key={item.id} className="hover:bg-slate-800/20 transition-colors">
                    {visibleColumns.filename && <td className={cStyle} title={item.filename}>{item.filename}</td>}
                    {visibleColumns.path && <td className={cStyle} title={item.filePath}>{item.filePath}</td>}
                  </tr>
                );
              }
            })();

            return (
              <React.Fragment key={item.id}>
                {sectionHeaderRow}
                {rowContent}
              </React.Fragment>
            );
          });
        })()}
      </tbody>
    </table>
  );
})()}
            </div>

            {paginationControls}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
});
