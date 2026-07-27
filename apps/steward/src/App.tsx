import confetti from "canvas-confetti";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { scanDirectories, getDbFiles, clearDb, saveDbFiles, getDiagnostic, injectDemoData, clearDemoData, saveSettings, loadSettings } from '@bitscribe/core-db';
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
import Header from "./components/Header";
import NavigationTabs from "./components/NavigationTabs";
import Sidebar from "./components/Sidebar";
import ConfirmModal from "./components/modals/ConfirmModal";
import AppResetModal from "./components/modals/AppResetModal";
import DemoCleanupModal from "./components/modals/DemoCleanupModal";
import TourRemoteControl from "./components/modals/TourRemoteControl";
import { ProductTour, TOUR_STEPS } from "./components/ProductTour";
import { EVENTS, STATUS, ACTIONS, EventData } from 'react-joyride';

import { Play, Pause, Sparkles, ChevronLeft, ChevronRight, X as CloseIcon, List, ChevronUp, ChevronDown, GripHorizontal, Sliders, Check, Film, Trash2, Database, Clapperboard, FolderOpen, AlertCircle, AlertTriangle, Download, CheckCircle, Maximize, Minimize } from "lucide-react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { BitsyCharacter } from '@bitscribe/ui-components';
import { useTourSimulation } from './hooks/useTourSimulation';
import { useBackupRestore } from './hooks/useBackupRestore';
import { useDemoActions } from './hooks/useDemoActions';
import { useDemoActions } from './hooks/useDemoActions';
import { BitsyReel } from '@bitscribe/ui-components';
import { readTextFile, writeFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { downloadOrSaveFile } from "./utils/downloader";

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

  



  

  const [activeTab, setActiveTab] = useState<
    "scan" | "library" | "rules" | "help" | "logs"
  >("scan");
  const [renderedTab, setRenderedTab] = useState<
    "scan" | "library" | "rules" | "help" | "logs"
  >("scan");
  const [isPending, startTransition] = useTransition();
  const handleTabChange = (tab: "scan" | "library" | "rules" | "help" | "logs") => { setActiveTab(tab); startTransition(() => setRenderedTab(tab)); };

  
  const [showTour, setShowTour] = useState(() => {
    const tourStatus = localStorage.getItem("bitscribe_tour_status");
    if (!tourStatus) return false;
    try {
      const parsed = JSON.parse(tourStatus);
      if (parsed.status === 'active') return true;
      if (parsed.status === 'remind' && parsed.remindAt) {
        return new Date().getTime() > parsed.remindAt;
      }
    } catch(e) {}
    return false;
  });
  
  const [tourStepIndex, setTourStepIndex] = useState(() => {
    try {
      const tourStatus = localStorage.getItem("bitscribe_tour_status");
      if (tourStatus) {
        const parsed = JSON.parse(tourStatus);
        if (parsed.status === 'active' && parsed.startStep !== undefined) {
          return parsed.startStep;
        }
      }
    } catch(e) {}
    return 0;
  });
  const [demoMessage, setDemoMessage] = useState<{text: string, targetId?: string, position?: 'top' | 'bottom' | 'right' | 'left', offset?: number} | null>(null);
  const [demoReelTarget, setDemoReelTarget] = useState<string | null>(null);
  const demoMsgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initDebugLog = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          if ((window as any).__BITSCRIBE_LOG_INITIALIZED__) return;
          (window as any).__BITSCRIBE_LOG_INITIALIZED__ = true;
          
          const { downloadDir, join } = await import('@tauri-apps/api/path');
          const { writeTextFile, mkdir, exists } = await import('@tauri-apps/plugin-fs');
          
          const dlDir = await downloadDir();
          const bitScribeDir = await join(dlDir, "BitScribe");
          
          const dirExists = await exists(bitScribeDir);
          if (!dirExists) {
            await mkdir(bitScribeDir, { recursive: true });
          }
          
          const now = new Date();
          const safeTs = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + '_' +
            String(now.getHours()).padStart(2, '0') + '-' +
            String(now.getMinutes()).padStart(2, '0') + '-' +
            String(now.getSeconds()).padStart(2, '0');
          const logFile = await join(bitScribeDir, `${safeTs}_debuglog.txt`);
          const timestamp = now.toISOString();
          const logContent = `[\n\n${timestamp}] App launched successfully.\nVersion: ${APP_VERSION}\n`;
          
          await writeTextFile(logFile, logContent, { append: true });
          
          let logBuffer: string[] = [];
          let flushTimeout: any = null;
          let isWriting = false;

          const flushLogs = async () => {
            if (logBuffer.length === 0 || isWriting) return;
            isWriting = true;
            const chunk = logBuffer.join("");
            logBuffer = [];
            try {
              await writeTextFile(logFile, chunk, { append: true });
            } catch (e) {
              // ignore
            } finally {
              isWriting = false;
              if (logBuffer.length > 0) {
                if (flushTimeout) clearTimeout(flushTimeout);
                flushTimeout = setTimeout(flushLogs, 250);
              }
            }
          };

          const appendLog = (level: string, ...args: any[]) => {
            try {
              const msg = args.map(a => {
                if (a instanceof Error) return a.stack || a.message;
                if (typeof a === 'object') {
                   try { return JSON.stringify(a); } catch(e) { return String(a); }
                }
                return String(a);
              }).join(' ');
              const ts = new Date().toISOString();
              logBuffer.push(`[${ts}] [${level}] ${msg}\n`);
              
              if (logBuffer.length >= 100) {
                flushLogs();
              } else if (!flushTimeout) {
                flushTimeout = setTimeout(flushLogs, 500);
              }
            } catch (e) {
               // ignore
            }
          };

          const originalConsoleLog = console.log;
          console.log = (...args) => {
             originalConsoleLog(...args);
             appendLog('LOG', ...args);
          };

          const originalConsoleWarn = console.warn;
          console.warn = (...args) => {
             originalConsoleWarn(...args);
             appendLog('WARN', ...args);
          };

          const originalConsoleError = console.error;
          console.error = (...args) => {
             originalConsoleError(...args);
             appendLog('ERROR', ...args);
          };
          
          window.addEventListener('error', (event) => {
              appendLog('UNHANDLED_ERROR', event.message, event.filename, event.lineno, event.colno, event.error?.stack);
          });
          
          window.addEventListener('unhandledrejection', (event) => {
              appendLog('UNHANDLED_REJECTION', event.reason);
          });
        }
      } catch (err) {
        console.error("Failed to write debug log", err);
        alert("Failed to write debug log: " + String(err));
      }
    };
    initDebugLog();
  }, []);


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

  useEffect(() => {
    if (!demoMessage || !demoMessage.targetId) {
      return;
    }
    
    const updateCoords = () => {
      if (!demoMsgRef.current) return;
      
      const el = document.getElementById(demoMessage.targetId!.replace('#', '')) || document.querySelector(demoMessage.targetId!) as HTMLElement;
      if (el) {
        const rect = el.getBoundingClientRect();
        const msgWidth = demoMsgRef.current.offsetWidth || 200;
        const msgHeight = demoMsgRef.current.offsetHeight || 52;
        
        let x = rect.left + rect.width / 2;
        let y = demoMessage.position === 'top' ? rect.top - msgHeight - (demoMessage.offset || 0) - 8 : rect.bottom + 12 + (demoMessage.offset || 0);
        let transform = 'translateX(-50%)';

        if (demoMessage.position === 'right') {
          x = rect.right + 16 + (demoMessage.offset || 0);
          y = rect.top + rect.height / 2 - msgHeight / 2;
          transform = 'none';
        } else if (demoMessage.position === 'left') {
          x = rect.left - msgWidth - 16 - (demoMessage.offset || 0);
          y = rect.top + rect.height / 2 - msgHeight / 2;
          transform = 'none';
        } else {
          // Prevent tooltip from going off the top of the screen
          if (y < 10 && demoMessage.position === 'top') {
            y = rect.bottom + 12 + (demoMessage.offset || 0); // Flip to bottom
          }
          const minX = msgWidth / 2 + 10;
          const maxX = window.innerWidth - msgWidth / 2 - 10;
          x = Math.max(minX, Math.min(x, maxX));
        }
        
        demoMsgRef.current.style.left = `${x}px`;
        demoMsgRef.current.style.top = `${y}px`;
        demoMsgRef.current.style.bottom = 'auto';
        demoMsgRef.current.style.transform = transform;
        demoMsgRef.current.style.opacity = '1';
      } else {
        demoMsgRef.current.style.opacity = '0';
      }
    };
    
    updateCoords();
    
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    
    let frame: number;
    const loop = () => {
      updateCoords();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    
    return () => {
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
      cancelAnimationFrame(frame);
    };
  }, [demoMessage]);

  const [activeDemo, setActiveDemo] = useState<number | null>(null);
  const [isDemoPaused, setIsDemoPaused] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      const enable = !isFullscreen;
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        await getCurrentWindow().setFullscreen(enable);
        setIsFullscreen(enable);
      } else {
        if (enable) {
          const docEl = document.documentElement as any;
          if (docEl.requestFullscreen) {
            await docEl.requestFullscreen();
          } else if (docEl.mozRequestFullScreen) {
            await docEl.mozRequestFullScreen();
          } else if (docEl.webkitRequestFullscreen) {
            await docEl.webkitRequestFullscreen();
          } else if (docEl.msRequestFullscreen) {
            await docEl.msRequestFullscreen();
          }
        } else {
          const doc = document as any;
          if (doc.exitFullscreen) {
            await doc.exitFullscreen();
          } else if (doc.mozCancelFullScreen) {
            await doc.mozCancelFullScreen();
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
          } else if (doc.msExitFullscreen) {
            await doc.msExitFullscreen();
          }
        }
      }
    } catch (e) {
      console.error("Failed to toggle fullscreen:", e);
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        getCurrentWindow().isFullscreen().then(setIsFullscreen).catch(console.error);
      }
    }
  };

  useEffect(() => {
    if (showTour && activeDemo === null) {
      try {
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
          getCurrentWindow().maximize().catch(() => {});
        }
      } catch (e) {}
    }
  }, [showTour, activeDemo]);
  const isDemoPausedRef = useRef(false);
  
  const [demoClickedSteps, setDemoClickedSteps] = useState<number[]>([]);
  const [fakeExportMenu, setFakeExportMenu] = useState<{show: boolean, highlight: string | null}>({show: false, highlight: null});

  
  useEffect(() => {
    isDemoPausedRef.current = isDemoPaused;
  }, [isDemoPaused]);

  const [tourMenuOpen, setTourMenuOpen] = useState(false);
  const [tourPosition, setTourPosition] = useState({ x: 0, y: 0 });
  const [isTourDragging, setIsTourDragging] = useState(false);
  const [tourDragStart, setTourDragStart] = useState({ x: 0, y: 0 });

  const handleTourMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') || 
      target.closest('select') || 
      target.closest('a') || 
      target.closest('.no-drag') || 
      target.closest('ul') || 
      target.closest('li')
    ) {
      return;
    }
    setIsTourDragging(true);
    setTourDragStart({ x: e.clientX - tourPosition.x, y: e.clientY - tourPosition.y });
  };

  useEffect(() => {
    const handleTourMouseMove = (e: MouseEvent) => {
      if (!isTourDragging) return;
      setTourPosition({
        x: e.clientX - tourDragStart.x,
        y: e.clientY - tourDragStart.y
      });
    };

    const handleTourMouseUp = () => {
      setIsTourDragging(false);
    };

    if (isTourDragging) {
      document.addEventListener('mousemove', handleTourMouseMove);
      document.addEventListener('mouseup', handleTourMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleTourMouseMove);
      document.removeEventListener('mouseup', handleTourMouseUp);
    };
  }, [isTourDragging, tourDragStart]);

  // Reset active demo when step index changes or tour toggles
  useEffect(() => {
    setActiveDemo(null);
    setIsDemoPaused(false);
  }, [tourStepIndex, showTour]);

  // Listen for clicks on the "Show me" buttons in the tour tooltips

  const handleJoyrideCallback = (data: EventData) => {
    const { status, type, index, action } = data;
    
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    if (finishedStatuses.includes(status)) {
      if (status === STATUS.FINISHED) {
        finishTour();
      } else {
        cancelTour();
      }
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn("Tour target not found:", data.step.target);
      let correctTab: "scan" | "library" | "rules" | "help" | "logs" = "scan";
      if (index >= 20 && index <= 21) correctTab = "library";
      else if (index >= 22 && index <= 31) correctTab = "rules";
      else if (index >= 32) correctTab = "help";

      if (activeTab !== correctTab) {
        handleTabChange(correctTab);
      }
    } else if (type === EVENTS.STEP_AFTER) {
      return; // We control navigation entirely through the remote control (goToTourStep)
    }
  };

  // Toggle active-demo body class to handle opacity-fade on tooltips
  useEffect(() => {
    if (activeDemo !== null) {
      document.body.classList.add("demo-active");
    } else {
      document.body.classList.remove("demo-active");
    }
    return () => {
      document.body.classList.remove("demo-active");
    };
  }, [activeDemo]);

  // Toggle tour-active body class to force render components needed for Joyride targets
  useEffect(() => {
    if (showTour) {
      document.body.classList.add("tour-active");
    } else {
      document.body.classList.remove("tour-active");
    }
    return () => {
      document.body.classList.remove("tour-active");
    };
  }, [showTour]);

  // Programmatic toggling of scan rules/options based on active options tour step
  useEffect(() => {
    if (!showTour) return;

    // Show metrics and diagnostic dynamically during the tour
    setShowMetrics(tourStepIndex >= 7 && tourStepIndex <= 19);
    setShowDiagnostic(tourStepIndex === 5);

    if (tourStepIndex === 4) {
      setExportProfile("Custom Fields");
      setShowCustomColumnsMenu(true);
    } else {
      setShowCustomColumnsMenu(false);
    }

    if (tourStepIndex === 26) {
      setCustomRules(prev => ({
        ...prev,
        useDiscoveryPreset: true,
        useModernPreset: false,
        useLegacyPreset: false,
        useSubtitleScan: false,
        useDuplicationScan: false,
        useAnomalyScan: false,
        useMetadataScan: false,
      }));
    } else if (tourStepIndex === 27) {
      setCustomRules(prev => ({
        ...prev,
        useDiscoveryPreset: false,
        useModernPreset: true,
        useLegacyPreset: true,
      }));
    } else if (tourStepIndex === 28) {
      setCustomRules(prev => ({
        ...prev,
        useSubtitleScan: true,
      }));
    } else if (tourStepIndex === 29) {
      setCustomRules(prev => ({
        ...prev,
        useDuplicationScan: true,
        useDuplicationVideoScan: true,
        useDuplicationMusicScan: true,
      }));
    } else if (tourStepIndex === 30) {
      setCustomRules(prev => ({
        ...prev,
        useAnomalyScan: true,
      }));
    } else if (tourStepIndex === 31) {
      setCustomRules(prev => ({
        ...prev,
        useMetadataScan: true,
        useVideoMetadataScan: true,
        useMusicMetadataScan: true,
      }));
    } else if (tourStepIndex >= 34) {
      handleTabChange("help");
      // Revert to standard Discovery mode
      setCustomRules(prev => ({
        ...prev,
        useDiscoveryPreset: true,
        useModernPreset: false,
        useLegacyPreset: false,
        useSubtitleScan: false,
        useDuplicationScan: false,
        useAnomalyScan: false,
        useMetadataScan: false,
      }));
    } else if (tourStepIndex < 26 && tourStepIndex > 4) {
      // Ensure default/neutral state for early tour steps so Streaming Readiness card is named correctly
      setCustomRules(prev => ({
        ...prev,
        useDiscoveryPreset: false,
        useModernPreset: true,
        useLegacyPreset: true,
        useSubtitleScan: false,
        useDuplicationScan: false,
        useAnomalyScan: false,
        useMetadataScan: false,
      }));
    }
  }, [tourStepIndex, showTour]);

  // Scroll Jump to Step dropdown container to current step
  useEffect(() => {
    if (tourMenuOpen) {
      setTimeout(() => {
        const container = document.getElementById("tour-steps-dropdown-container");
        const activeItem = document.getElementById(`tour-step-item-${tourStepIndex}`);
        if (container && activeItem) {
          activeItem.scrollIntoView({ block: "nearest", behavior: "auto" });
        }
      }, 50);
    }
  }, [tourMenuOpen, tourStepIndex]);

  // Special effects for concluding tour steps
  useEffect(() => {
    if (!showTour) return;
    
    if (tourStepIndex === 36) {
      // Fireworks for Open Source Acknowledgments
      const duration = 5 * 1000;
      const end = Date.now() + duration;
      const festivalColors = ['#ff3366', '#33ff99', '#3399ff', '#ffcc00', '#ff00ff', '#00ffff', '#ff6600', '#9933ff'];
      (function frame() {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: festivalColors,
          zIndex: 100005
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: festivalColors,
          zIndex: 100005
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    } else if (tourStepIndex === 37) {
      // Hearts for Support Development
      const duration = 3 * 1000;
      const end = Date.now() + duration;
      const scalar = 2;
      const heart = confetti.shapeFromPath({
        path: 'M167 72c19,-38 37,-56 75,-56 42,0 76,33 76,75 0,76 -76,151 -151,227 -76,-76 -151,-151 -151,-227 0,-42 33,-75 75,-75 38,0 57,18 76,56z',
        matrix: [0.03333333333333333, 0, 0, 0.03333333333333333, -5.566666666666666, -5.533333333333333]
      } as any);
      (function frame() {
        let originX = 0.5;
        let originY = 0.8;
        const reel = document.getElementById("bitsy-reel");
        if (reel) {
          const rect = reel.getBoundingClientRect();
          originX = (rect.left + rect.width / 2) / window.innerWidth;
          originY = (rect.top + rect.height / 2) / window.innerHeight;
        }
        confetti({
          particleCount: 1,
          angle: 90,
          spread: 60,
          origin: { x: originX, y: originY },
          colors: ['#ef4444', '#ec4899', '#f43f5e'],
          shapes: [heart],
          scalar,
          startVelocity: 15,
          gravity: -0.5,
          ticks: 300,
          zIndex: 100005
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());
    }
  }, [tourStepIndex, showTour]);


  const finishTour = () => {
    setActiveDemo(null);
    setDemoMessage(null);
    setShowCustomColumnsMenu(false);
    setShowMetrics(true);
    setShowDiagnostic(false);
    localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: 'completed' }));
    
    setIsReelEndingAnimation(true);
    confetti({
      particleCount: 200,
      spread: 160,
      origin: { y: 0.6 },
      colors: ['#818cf8', '#c084fc', '#34d399', '#ef4444', '#f59e0b'],
      zIndex: 999999
    });

    setTimeout(() => {
      setIsReelEndingAnimation(false);
      setShowTour(false);
      setTourStepIndex(0);
      if (scannedFilesList.length > 0) {
        setShowDemoCleanupModal(true);
      } else {
        setCustomRules(resetToDiscoveryPreset);
      }
    }, 2000);
  };

  const cancelTour = async () => {
    setShowTour(false);
    setActiveDemo(null);
    setDemoMessage(null);
    setTourStepIndex(0);
    setShowCustomColumnsMenu(false);
    setShowMetrics(true);
    setShowDiagnostic(false);
    localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: 'skipped' }));
    setCustomRules(resetToDiscoveryPreset);
    const demoInserted = localStorage.getItem("bitscribe_demo_data_inserted");
    if (demoInserted) {
      await flushDemoDataOnly();
    }
  };

  const remindLaterTour = async () => {
    setShowTour(false);
    setActiveDemo(null);
    setDemoMessage(null);
    setTourStepIndex(0);
    setShowCustomColumnsMenu(false);
    setShowMetrics(true);
    setShowDiagnostic(false);
    const oneWeek = new Date().getTime() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: 'remind', remindAt: oneWeek }));
    setCustomRules(resetToDiscoveryPreset);
    const demoInserted = localStorage.getItem("bitscribe_demo_data_inserted");
    if (demoInserted) {
      await flushDemoDataOnly();
    }
  };

  const goToTourStep = (step: number) => {
    if (step < 0 || step >= TOUR_STEPS.length) return;
    
    // Stop any active running demo/simulation when navigating to a new tour step
    setActiveDemo(null);
    setDemoMessage(null);
    
    if (step === 8) {
      setTourPosition({ x: 264 - window.innerWidth, y: 0 });
    }

    let targetTab: "scan" | "library" | "rules" | "help" | "logs" = "scan";
    if (step >= 20 && step <= 22) targetTab = "library";
    else if (step >= 23 && step <= 33) targetTab = "rules";
    else if (step >= 34) targetTab = "help";

    const targetSelector = (TOUR_STEPS[step]?.target as string);
    
    if (targetTab !== activeTab) {
      document.body.classList.add("tour-transitioning");
      handleTabChange(targetTab);
      
      // Poll for the target element to exist before advancing the tour,
      // because startTransition might delay the render of the new tab.
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        const elExists = targetSelector === 'body' || !!document.querySelector(targetSelector);
        if (elExists || attempts > 20) { // Max 2 seconds (20 * 100ms)
          clearInterval(checkInterval);
          setTourStepIndex(step);
          if (targetSelector && targetSelector !== 'body') {
            scrollToElement(targetSelector);
          }
          setTimeout(() => document.body.classList.remove("tour-transitioning"), 50);
        }
      }, 100);
    } else {
      setTourStepIndex(step);
      if (targetSelector && targetSelector !== 'body') {
        setTimeout(() => scrollToElement(targetSelector), 50);
      }
    }
  };

  const [helpHighlight, setHelpHighlight] = useState<string | null>(null);
  const [previousTab, setPreviousTab] = useState<"scan" | "library" | "rules" | "help">("scan");

  useEffect(() => {
    if (activeTab !== "logs") {
      setPreviousTab(activeTab as any);
    }
  }, [activeTab]);
  const [scannedFilesList, setScannedFilesList] = useState<MediaItem[]>([]);

  const [exportCompleteMsg, setExportCompleteMsg] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentExportFile, setCurrentExportFile] = useState("");
  
  const [exportDirectory, setExportDirectory] = useState<string>(() => localStorage.getItem("bitscribe_export_directory") || "");
  const [isBackupRestoreActive, setIsBackupRestoreActive] = useState(false);

  const [exportFormats, setExportFormats] = useState({
    xlsx: true,
    csv: false,
    html: false,
    json: false,
  });


  const [isScanning, setIsScanning] = useState(false);
  const [isQuickRefreshMode, setIsQuickRefreshState] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentScanFile, setCurrentScanFile] = useState("");
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
  const [scannedFiles, setScannedFiles] = useState<MediaItem[]>([]);
  const [corruptFiles, setCorruptFiles] = useState<MediaItem[]>([]);
  const [notification, setNotification] = useState<string | { type: string; message: string } | null>(null);
  
  const [isFluidLayout, setIsFluidLayout] = useState<boolean>(() => {
    try {
      const val = localStorage.getItem("bitscribe_layout_fluid");
      return val ? JSON.parse(val) : true; // Default to true (fluid layout, no scrollbar)
    } catch (e) {
      return true;
    }
  });

  const handleFluidLayoutChange = (val: boolean) => {
    setIsFluidLayout(val);
    try {
      localStorage.setItem("bitscribe_layout_fluid", JSON.stringify(val));
    } catch (e) {
      // Ignore
    }
  };

  const [lastScanDuration, setLastScanDuration] = useState<number | null>(() => {
    try {
      const val = localStorage.getItem("bitscribe_last_scan_duration");
      return val ? Number(val) : null;
    } catch (e) {
      return null;
    }
  });
  const [hasCompletedScan, setHasCompletedScan] = useState(false);
  const [isResumeState, setIsResumeState] = useState(() => localStorage.getItem("bitscribe_scan_in_progress") === "true");

  const [exportProfile, setExportProfile] = useState<string>("Media Discovery");
  
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const startTimeRef = React.useRef<number | null>(null);

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
          f.streamFriendlyEvaluated = Date.now();
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
    if (!isQ && hasData && !isResuming) {
      const lastScanTsStr = localStorage.getItem("plex_last_scan_timestamp");
      const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      let shouldRunRefresh = false;
      let shouldUseCacheDirectly = false;

      if (lastScanTsStr) {
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
          setScanLogs([...logsBuffer].slice(0, 5000));
          lastLogUpdateTime = now;
        }
        if (force || now - lastFileUpdateTime > 32) {
          setCurrentScanFile(currentFile);
          lastFileUpdateTime = now;
        }
      };

      const isResumingScan = localStorage.getItem("bitscribe_scan_in_progress") === "true";
      await scanDirectories(activePaths, customRules, 
          (total) => {
              logsBuffer.unshift(`Found ${total} files. Probing started...`);
              flushUiUpdates(true);
          },
          (msg) => {
              logsBuffer.unshift(msg);
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

  
  const [scanPaths, setScanPaths] = useState<
    { path: string; enabled: boolean }[]
  >(() => {
    const saved = localStorage.getItem("plex_scan_paths");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [excelColumns, setExcelColumns] = useState<Record<string, boolean>>(
    () => {
      const defaultColumns = {
        "Stream Audit": true,
        "File Name": true,
        "Container": true,
        "Video Codec": true,
        "Resolution": true,
        "HDR Format": true,
        "Audio Tracks": true,
        "Audio Codecs": true,
        "Subtitles": true,
        "Artist": false,
        "Album Title": false,
        "Song Title": false,
        "File Format/Codec": false,
        "Bitrate": true,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        "Recommendation": false,
        "File Path": true,
      };
      
      const isFirstRun = !localStorage.getItem("bitscribe_first_run_discovery_v3");
      if (isFirstRun) {
        localStorage.setItem("plex_excel_columns", JSON.stringify(defaultColumns));
      }
      const saved = localStorage.getItem("plex_excel_columns");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          
          // Migrate old keys to new keys if they exist
          if ("Full Drive Location" in parsed) parsed["File Path"] = parsed["Full Drive Location"];
          if ("Filename" in parsed) parsed["File Name"] = parsed["Filename"];
          if ("Video Resolution" in parsed) parsed["Resolution"] = parsed["Video Resolution"];
          if ("Plex Rating" in parsed || "Stream Compatibility" in parsed) parsed["Stream Audit"] = parsed["Plex Rating"] || parsed["Stream Compatibility"];
          if ("Analysis" in parsed) parsed["Analysis Notes"] = parsed["Analysis"];
          if ("Recommended Action" in parsed) parsed["Remediation Action"] = parsed["Recommended Action"];
          
          // Merge avoiding old garbage keys
          const merged: Record<string, boolean> = {};
          for (const key of Object.keys(defaultColumns)) {
            merged[key] = parsed.hasOwnProperty(key) ? parsed[key] : defaultColumns[key as keyof typeof defaultColumns];
          }
          
          return merged;
        } catch (e) {}
      }
      return defaultColumns;
    },
  );

  const [showCustomColumnsMenu, setShowCustomColumnsMenu] = useState(false);
  const customColumnsMenuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customColumnsMenuRef.current && !customColumnsMenuRef.current.contains(e.target as Node)) {
        setShowCustomColumnsMenu(false);
      }
    };
    if (showCustomColumnsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCustomColumnsMenu]);

  // Initialize rules from localStorage if available, or default
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
        
        // Ensure AC3 is enabled by default for existing users
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
        const hasActiveMode = merged.useMetadataScan || merged.useVideoMetadataScan || merged.useMusicMetadataScan ||
                             merged.useSubtitleScan || merged.useDuplicationScan || merged.useAnomalyScan ||
                             merged.useDiscoveryPreset || merged.useModernPreset || merged.useLegacyPreset;
        if (!hasActiveMode) {
          merged.useDiscoveryPreset = true;
        }
        return merged;
      } catch (e) {
        return DEFAULT_RULES;
      }
    }
    return DEFAULT_RULES;
  });

  // Track settings in localStorage and the portable file
  useEffect(() => {
    localStorage.setItem("plex_compat_rules", JSON.stringify(customRules));
    localStorage.setItem("plex_scan_paths", JSON.stringify(scanPaths));
    localStorage.setItem("plex_excel_columns", JSON.stringify(excelColumns));
    localStorage.setItem("bitscribe_export_directory", exportDirectory);
    if (lastScanDuration !== null) {
      localStorage.setItem("bitscribe_last_scan_duration", String(lastScanDuration));
    }

    const settings = {
      bitscribe_export_directory: exportDirectory,
      plex_scan_paths: scanPaths,
      plex_excel_columns: excelColumns,
      plex_compat_rules: customRules,
      bitscribe_last_scan_duration: lastScanDuration,
      bitscribe_tour_status: (() => {
        try {
          const val = localStorage.getItem("bitscribe_tour_status");
          return val ? JSON.parse(val) : undefined;
        } catch (e) {
          return undefined;
        }
      })()
    };
    saveSettings(settings);
  }, [customRules, scanPaths, excelColumns, exportDirectory, lastScanDuration]);

  useEffect(() => {
    if (!isScanning) { localStorage.setItem("bitscribe_scan_logs", JSON.stringify(scanLogs)); }
  }, [scanLogs, isScanning]);

  // Load settings from the portable JSON file on startup
  useEffect(() => {
    const initSettings = async () => {
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
          if (settings.bitscribe_tour_status !== undefined) {
            localStorage.setItem("bitscribe_tour_status", JSON.stringify(settings.bitscribe_tour_status));
          }
        }
      } catch (err) {
        console.error("Failed to load portable settings:", err);
      }
    };
    initSettings();
  }, []);

  // Auto Backup once per week
  useEffect(() => {
    const runAutoBackup = async () => {
      try {
        if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
            return; // only run auto-backup in Tauri environment
        }

        const lastBackupStr = localStorage.getItem("last_backup_timestamp");
        let shouldBackup = false;
        if (!lastBackupStr) {
          shouldBackup = true;
        } else {
          const lastDate = new Date(lastBackupStr).getTime();
          const now = Date.now();
          if (now - lastDate > 7 * 24 * 60 * 60 * 1000) { // 7 days
            shouldBackup = true;
          }
        }

        if (shouldBackup) {
          const exportDir = localStorage.getItem("bitscribe_export_directory");
          if (!exportDir) return; // Need an export directory set to auto-backup

          const type = 'full';
          let backup: any = { type, timestamp: new Date().toISOString() };
          
          backup.settings = {
              plex_scan_paths: localStorage.getItem("plex_scan_paths"),
              plex_compat_rules: localStorage.getItem("plex_compat_rules"),
              bitscribe_export_directory: localStorage.getItem("bitscribe_export_directory"),
              plex_excel_columns: localStorage.getItem("plex_excel_columns"),
              bitscribe_custom_block_presets: localStorage.getItem("bitscribe_custom_block_presets")
          };
          const files = await invoke("get_db_files");
          backup.data = files;

          const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
          const backupsDir = await join(exportDir, "Backups");

          const dirExists = await exists(backupsDir);
          if (!dirExists) {
              await mkdir(backupsDir, { recursive: true });
          }
          const fileName = `bitscribe_backup_${type}_${Date.now()}.json`;
          await downloadOrSaveFile(fileName, blob, backupsDir);
          localStorage.setItem("last_backup_timestamp", new Date().toISOString());
        }
      } catch (e) {
         console.error("Auto backup failed", e);
      }
    };
    setTimeout(() => {
        runAutoBackup();
    }, 5000);
  }, []);

    // Load saved scan results from the portable SQLite database on launch
  useEffect(() => {
    let active = true;
    const loadSavedScanResults = async () => {
      try {
        const files = await getDbFiles();
        if (active) {
          if (files && files.length >= 5) {
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
          } else {
            const tourStatusStr = localStorage.getItem("bitscribe_tour_status");
            let shouldPopulate = !tourStatusStr;
            if (tourStatusStr) {
                try {
                    const parsed = JSON.parse(tourStatusStr);
                    if (parsed.status === 'remind' && parsed.remindAt && new Date().getTime() > parsed.remindAt) {
                        shouldPopulate = true;
                    }
                    if (parsed.status === 'active') {
                        shouldPopulate = true;
                    }
                } catch(e) {}
            }
            if (shouldPopulate) {
                setShowTour(true);
                localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: "active", startStep: 0 }));
                localStorage.setItem("bitscribe_demo_data_inserted", "true");
                injectDemoData().then(async () => {
                        try {
                            const newFiles = await getDbFiles();
                            const cleanFiles = newFiles.filter((f: any) => f.category !== "Corrupted" && (!f.category || !f.category.toLowerCase().includes("corrupt")));
                            const corrupt = newFiles.filter((f: any) => f.category === "Corrupted" || (f.category && f.category.toLowerCase().includes("corrupt")));
                            setScannedFiles(cleanFiles);
                            setScannedFilesList(cleanFiles);
                            setCorruptFiles(corrupt);
                            setScanLogs([`Populated demo database with ${newFiles.length} items.`]);
                        } catch (e) {
                            console.error("Failed to load demo data", e);
                        }
                      });
            } else if (files && files.length > 0) {
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
          }
        }
      } catch (err) {
        console.error("Failed to restore scan results from local database:", err);
      }
    };
    loadSavedScanResults();
    return () => {
      active = false;
    };
  }, []);

  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [showFileRegistry, setShowFileRegistry] = useState(true);
  const [showMetrics, setShowMetrics] = useState(true);
  const [confirmAction, setConfirmAction] = useState<{message: string, onConfirm: () => void} | null>(null);
const [isAppResetting, setIsAppResetting] = useState(false);
  const [showDemoCleanupModal, setShowDemoCleanupModal] = useState(false);

  const { clearLocalCacheOnly, flushServerDatabase, flushDemoDataOnly, handlePopulateDemo } = useDemoActions({
    setScanLogs,
    setScannedFilesList,
    setScannedFiles,
    setCorruptFiles,
    setHasCompletedScan,
    setNotification,
  });


  const { clearLocalCacheOnly, flushServerDatabase, flushDemoDataOnly, handlePopulateDemo } = useDemoActions({
    setScanLogs,
    setScannedFilesList,
    setScannedFiles,
    setCorruptFiles,
    setHasCompletedScan,
    setNotification,
  });


  const { handleBackup, handleRestore } = useBackupRestore({
    exportDirectory,
    setNotification,
    setScanPaths,
    setExcelColumns,
    setCustomRules,
    setExportDirectory,
    setScannedFilesList,
  });

  const [isReelEndingAnimation, setIsReelEndingAnimation] = useState(false);

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
    if (val === "Stream Audit") {
      updatedRules.useModernPreset = true;
      updatedRules.useLegacyPreset = true;
      updatedRules.useBleedingEdgePreset = true;
      updatedExcel = {
        ...updatedExcel,
        "Stream Audit": true,
        "File Name": true,
        Container: true,
        "Video Codec": true,
        Resolution: false,
        "HDR Format": false,
        "Audio Tracks": true,
        "Audio Codecs": true,
        Subtitles: true,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: false,
        "Album Title": false,
        "Song Title": false,
        "File Format/Codec": false,
        Bitrate: false,
      };
    } else if (val === "Modern Direct Play") {
      updatedRules.useModernPreset = true;
      updatedExcel = {
        ...updatedExcel,
        "Stream Audit": true,
        "File Name": true,
        Container: true,
        "Video Codec": true,
        Resolution: false,
        "HDR Format": false,
        "Audio Tracks": true,
        "Audio Codecs": true,
        Subtitles: true,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: false,
        "Album Title": false,
        "Song Title": false,
        "File Format/Codec": false,
        Bitrate: false,
      };
    } else if (val === "Legacy Direct Play") {
      updatedRules.useLegacyPreset = true;
      updatedExcel = {
        ...updatedExcel,
        "Stream Audit": true,
        "File Name": true,
        Container: true,
        "Video Codec": true,
        Resolution: false,
        "HDR Format": false,
        "Audio Tracks": true,
        "Audio Codecs": true,
        Subtitles: true,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: false,
        "Album Title": false,
        "Song Title": false,
        "File Format/Codec": false,
        Bitrate: false,
      };
    } else if (val === "Media Discovery") {
      updatedRules.useDiscoveryPreset = true;
      if (!updatedRules.discoveryHdrFormats || updatedRules.discoveryHdrFormats.length === 0) {
        updatedRules.discoveryHdrFormats = ["SDR", "HDR10", "HDR10+", "Dolby Vision", "HLG", "Advanced HDR"];
      }
      updatedExcel = {
        ...updatedExcel,
        "Stream Audit": true,
        "File Name": true,
        Container: true,
        "Video Codec": true,
        Resolution: true,
        "HDR Format": true,
        "Audio Tracks": true,
        "Audio Codecs": true,
        Subtitles: true,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: false,
        "Album Title": false,
        "Song Title": false,
        "File Format/Codec": false,
        Bitrate: true,
      };
    } else if (val === "Subtitle Audit") {
      updatedRules.useSubtitleScan = true;
      updatedExcel = {
        ...updatedExcel,
        "Stream Audit": false,
        "File Name": true,
        Container: true,
        "Video Codec": false,
        Resolution: false,
        "HDR Format": false,
        "Audio Tracks": false,
        "Audio Codecs": false,
        Subtitles: true,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: false,
        "Album Title": false,
        "Song Title": false,
        "File Format/Codec": false,
        Bitrate: false,
      };
    } else if (val === "Duplication Scan") {
      updatedRules.useDuplicationScan = true;
      updatedRules.useDuplicationVideoScan = true;
      updatedRules.useDuplicationMusicScan = true;
      updatedExcel = {
        ...updatedExcel,
        "Stream Audit": false,
        "File Name": true,
        Container: true,
        "Video Codec": true,
        Resolution: true,
        "HDR Format": true,
        "Audio Tracks": true,
        "Audio Codecs": true,
        Subtitles: false,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: false,
        "Album Title": false,
        "Song Title": false,
        "File Format/Codec": false,
        Bitrate: true,
      };
    } else if (val === "Quality Audit") {
      updatedRules.useAnomalyScan = true;
      updatedExcel = {
        ...updatedExcel,
        "Stream Audit": false,
        "File Name": true,
        Container: true,
        "Video Codec": true,
        Resolution: true,
        "HDR Format": true,
        "Audio Tracks": true,
        "Audio Codecs": true,
        Subtitles: false,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": false,
        "Bitrate Anomaly": true,
        "File Path": true,
        Artist: false,
        "Album Title": false,
        "Song Title": false,
        "File Format/Codec": false,
        Bitrate: true,
      };
    } else if (val === "Metadata Audit") {
      updatedRules.useVideoMetadataScan = true;
      updatedRules.useMusicMetadataScan = true;
      updatedExcel = {
        ...updatedExcel,
        "Stream Audit": false,
        "File Name": true,
        Container: true,
        "Video Codec": false,
        Resolution: false,
        "HDR Format": false,
        "Audio Tracks": false,
        "Audio Codecs": false,
        Subtitles: false,
        "Analysis Notes": true,
        "Remediation Action": true,
        "Corruption Type": false,
        Recommendation: false,
        "Embedded Poster": true,
        "Bitrate Anomaly": false,
        "File Path": true,
        Artist: true,
        "Album Title": true,
        "Song Title": true,
        "File Format/Codec": true,
        Bitrate: false,
      };
    }
    setCustomRules(updatedRules);
    setExcelColumns(updatedExcel);
  };

  const MODE_DESCRIPTIONS: Record<string, string> = {
    "Stream Audit": "Audits video, audio streams, and subtitles for direct play compatibility on both modern and legacy devices.",
    "Modern Direct Play": "Checks for modern high-efficiency codecs (like HEVC & AC3 Stereo) that direct play on modern hardware.",
    "Legacy Direct Play": "Checks for standard backward-compatible formats (like H.264, AAC & AC3 Stereo) that direct play on legacy clients with zero server-side transcoding.",
    "Media Discovery": "Discovers and catalogs all media files, conforming to standard configurations.",
    "Quality Audit": "Scans for media stream corruption, quality anomalies, and bitrate issues.",
    "Subtitle Audit": "Detects missing subtitles, unsupported image-based subtitles, and text formatting.",
    "Duplication Scan": "Analyzes video and music libraries to identify duplicate media items.",
    "Metadata Audit": "Audits embedded tags (titles, artists, years, cover art) for clean cataloging.",
    "Select a mode": "Choose a preset mode to scan and audit your media collection."
  };

  const activeModeName = useMemo(() => {
    if (customRules.useMetadataScan || customRules.useVideoMetadataScan || customRules.useMusicMetadataScan) return "Metadata Audit";
    if (customRules.useSubtitleScan) return "Subtitle Audit";
    if (customRules.useDuplicationScan) return "Duplication Scan";
    if (customRules.useAnomalyScan) return "Quality Audit";
    if (customRules.useDiscoveryPreset) return "Media Discovery";
    if (customRules.useModernPreset && customRules.useLegacyPreset) return "Stream Audit";
    if (customRules.useModernPreset) return "Modern Direct Play";
    if (customRules.useLegacyPreset) return "Legacy Direct Play";
    return "Select a mode";
  }, [customRules]);

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

  // Compute live statistics for the left sidebar "Library Health"
  const total = scannedFilesList.length + corruptFiles.length;

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
      <div className={isFluidLayout ? "flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0" : "flex-1 flex overflow-hidden min-h-0"}>
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
            className={`flex-1 overflow-y-auto px-4 pb-12 pt-0 scroll-pt-[200px] ${isPending ? "opacity-60 pointer-events-none transition-opacity duration-200" : "opacity-100 transition-opacity duration-200"}`}
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

            <div className={(renderedTab === "scan" || renderedTab === "library") ? "block" : "hidden"}>
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
}