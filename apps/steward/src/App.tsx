import confetti from "canvas-confetti";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { scanDirectories, getDbFiles, clearDb, saveDbFiles, getDiagnostic, injectDemoData, saveSettings, loadSettings } from '@bitscribe/core-db';
import { MediaItem, RuleCriteria, APP_VERSION, APP_NAME, APP_VERSION_DATE } from '@bitscribe/core-types';
import { filterItemsForReport } from '@bitscribe/core-eval';
import {
  DEFAULT_RULES,
  evaluatePlexCompatibility, computeDuplicatesMap,
} from '@bitscribe/core-eval';
import { exportMediaLibraryToExcel } from "./utils/excelExporter";
import {
  exportMediaLibraryToCSV,
  exportMediaLibraryToHTML,
  exportMediaLibraryToJSON,
} from "./utils/reportExporter";
import Dashboard from "./components/Dashboard";
import RuleEditor from "./components/RuleEditor";
import HelpSection from "./components/HelpSection";
import LogsPanel from "./components/LogsPanel";
import Header from "./components/Header";
import NavigationTabs from "./components/NavigationTabs";
import Sidebar from "./components/Sidebar";
import ConfirmModal from "./components/modals/ConfirmModal";
import DemoCleanupModal from "./components/modals/DemoCleanupModal";
import TourRemoteControl from "./components/modals/TourRemoteControl";
import { ProductTour, TOUR_STEPS } from "./components/ProductTour";
import { EVENTS, STATUS, ACTIONS, EventData } from 'react-joyride';

import { Play, Pause, Sparkles, ChevronLeft, ChevronRight, X as CloseIcon, List, ChevronUp, ChevronDown, GripHorizontal, Sliders, Check, Film, Trash2, Database, Clapperboard, FolderOpen, AlertCircle, AlertTriangle, Download, CheckCircle, Maximize, Minimize } from "lucide-react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { BitsyCharacter } from '@bitscribe/ui-components';
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
          
          const appendLog = async (level: string, ...args: any[]) => {
            try {
              const msg = args.map(a => {
                if (a instanceof Error) return a.stack || a.message;
                if (typeof a === 'object') {
                   try { return JSON.stringify(a); } catch(e) { return String(a); }
                }
                return String(a);
              }).join(' ');
              const ts = new Date().toISOString();
              await writeTextFile(logFile, `[${ts}] [${level}] ${msg}\n`, { append: true });
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
        setIsAddingPathApp(false);
      } else if (selected && typeof selected === "string") {
        setNewPathInputApp(selected);
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

  // Safe container scrolling helper (eliminates jarring parent window scroll jumps)
  const scrollToElement = (selector: string) => {
    if (!selector || selector === 'body') return;
    setTimeout(() => {
      const el = document.querySelector(selector) as HTMLElement;
      const container = document.getElementById('applet-subpage-scroll-container');
      if (el) {
        if (container && container.contains(el)) {
          const containerRect = container.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          
          // Always scroll to center to avoid elements getting cut off at edges
          const isFluid = !container.classList.contains('overflow-y-auto');
          
          if (isFluid) {
            const viewportHeight = window.innerHeight;
            const isFullyVisibleInViewport = (
              elRect.top >= 250 && 
              elRect.bottom <= viewportHeight - 80
            );
            
            if (!isFullyVisibleInViewport) {
              const scrollY = window.scrollY || document.documentElement.scrollTop;
              let targetScrollY = scrollY + elRect.top - (viewportHeight / 2) + (elRect.height / 2);
              if (elRect.height > viewportHeight - 100) {
                targetScrollY = scrollY + elRect.top - 200;
              }
              window.scrollTo({
                top: Math.max(0, targetScrollY),
                behavior: 'auto'
              });
            }
          } else {
            const filterWrapper = document.getElementById('metrics-dashboard-filter-wrapper');
            const stickyOffset = filterWrapper ? filterWrapper.getBoundingClientRect().height : 0;
            const visibleTopBoundary = containerRect.top + stickyOffset + 16;

            const isFullyVisibleInContainer = (
              elRect.top >= visibleTopBoundary &&
              elRect.bottom <= containerRect.bottom - 80
            );
            
            if (!isFullyVisibleInContainer) {
              const elementTopRelativeToContent = elRect.top - containerRect.top + container.scrollTop;
              let targetScrollTop = elementTopRelativeToContent - (containerRect.height / 2) + (elRect.height / 2);
              
              if (elRect.height > containerRect.height - 100) {
                targetScrollTop = elementTopRelativeToContent - 40;
              }
              
              // Prevent elements from sliding behind sticky filters/headers like #metrics-dashboard-filter-wrapper
              if (filterWrapper) {
                const maxScrollTopToKeepVisible = elementTopRelativeToContent - (stickyOffset + 16);
                if (targetScrollTop > maxScrollTopToKeepVisible) {
                  targetScrollTop = maxScrollTopToKeepVisible;
                }
              }
              
              container.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'auto'
              });
            }
          }
          setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
        } else {
          // Check if el is inside another scrollable parent, like aside
          const scrollParent = el.closest('aside') || el.closest('.overflow-y-auto');
          if (scrollParent && scrollParent !== document.body && scrollParent !== document.documentElement) {
            const parentRect = scrollParent.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            
            const isFullyVisible = (
              elRect.top >= parentRect.top + 20 &&
              elRect.bottom <= parentRect.bottom - 20
            );
            
            if (!isFullyVisible) {
              const elementTopRelativeToContent = elRect.top - parentRect.top + scrollParent.scrollTop;
              const targetScrollTop = elementTopRelativeToContent - (parentRect.height / 3);
              scrollParent.scrollTo({
                top: Math.max(0, targetScrollTop),
                behavior: 'auto'
              });
              setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
            }
          }
        }
      }
    }, 50);
  };

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

  // Automated Interactive Simulation for Product Tour Steps (Triggered on-demand by "Show me" buttons)
  useEffect(() => {
    let demoIntervals: any[] = [];
    let demoTimeouts: any[] = [];
    const clearDemoIntervals = () => {
      demoIntervals.forEach(clearInterval);
      demoIntervals = [];
    };
    const clearDemoTimeouts = () => {
      demoTimeouts.forEach(clearTimeout);
      demoTimeouts = [];
    };
    
    if (!showTour || activeDemo === null) return;

    document.body.classList.add("demo-running");

    const abortController = new AbortController();

    const showDemoMsg = (text: string | null, targetId?: string, position: 'top' | 'bottom' | 'right' | 'left' = 'top', offset = 0) => {
      if (text === null) {
        setDemoMessage(null);
        return;
      }
      
      if (targetId) {
        scrollToElement(targetId.startsWith('#') ? targetId : `#${targetId}`);
      }
      
      setDemoMessage({ text, targetId: targetId ? (targetId.startsWith('#') ? targetId : `#${targetId}`) : undefined, position, offset });
    };

    const runSimulation = async (
      mainSectionId: string | null,
      steps: {
        msg?: string;
        msgTarget?: string;
        msgPos?: 'top' | 'bottom' | 'right' | 'left';
        action?: () => void;
        delayAfter: number;
      }[]
    ) => {
      const signal = abortController.signal;
      const highlightClasses = ["relative", "z-[60]", "ring-2", "ring-indigo-500", "shadow-[0_0_30px_rgba(99,102,241,0.4)]", "rounded-xl"];
      
      if (mainSectionId) {
        const el = document.getElementById(mainSectionId);
        if (el) el.classList.add(...highlightClasses);
      }

      for (const step of steps) {
        if (signal.aborted) break;
        
        while (isDemoPausedRef.current) {
          if (signal.aborted) break;
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        if (signal.aborted) break;

        if (step.msg) {
          showDemoMsg(step.msg, step.msgTarget || mainSectionId || undefined, step.msgPos || 'top');
        } else {
          showDemoMsg(null);
        }
        if (step.action) step.action();

        let elapsed = 0;
        const tick = 100;
        while (elapsed < step.delayAfter) {
          if (signal.aborted) break;
          if (!isDemoPausedRef.current) {
            elapsed += tick;
          }
          await new Promise(resolve => setTimeout(resolve, tick));
        }
      }

      if (!signal.aborted) {
        if (mainSectionId) {
          const el = document.getElementById(mainSectionId);
          if (el) el.classList.remove(...highlightClasses);
        }
        showDemoMsg(null);
        setActiveDemo(null);
        setIsDemoPaused(false);
      }
    };

    const triggerResize = () => {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
    };

    // Simulation for Step 4: Export Reports
    if (activeDemo === 3) {
      scrollToElement("#export-section");

      runSimulation("export-section", [
        {
          msg: "Clicking export gives you access to multiple detailed report formats",
          msgTarget: "export-section",
          msgPos: "bottom",
          delayAfter: 3500
        },
        {
          msg: "Generate Discovery Reports detailing your entire media library",
          msgTarget: "export-profile-dropdown-container",
          msgPos: "right",
          action: () => setFakeExportMenu({ show: true, highlight: "Media Discovery" }),
          delayAfter: 3000
        },
        {
          msg: "Generate Discovery Reports detailing your entire media library",
          msgTarget: "export-profile-dropdown-container",
          msgPos: "right",
          action: () => { setExportProfile("Media Discovery"); setFakeExportMenu({ show: false, highlight: null }); },
          delayAfter: 3500
        },
        {
          msg: "Review dedicated Stream Audits...",
          msgTarget: "export-profile-dropdown-container",
          msgPos: "right",
          action: () => setFakeExportMenu({ show: true, highlight: "Modern Direct Play" }),
          delayAfter: 3000
        },
        {
          msg: "Review dedicated Stream Audits...",
          msgTarget: "export-profile-dropdown-container",
          msgPos: "right",
          action: () => { setExportProfile("Modern Direct Play"); setFakeExportMenu({ show: false, highlight: null }); },
          delayAfter: 3500
        },
        {
          msg: "...and create reports for metadata, duplicate files and more!",
          msgTarget: "export-profile-dropdown-container",
          msgPos: "right",
          action: () => setFakeExportMenu({ show: true, highlight: "Metadata Audit" }),
          delayAfter: 3000
        },
        {
          msg: "...and create reports for metadata, duplicate files and more!",
          msgTarget: "export-profile-dropdown-container",
          msgPos: "right",
          action: () => { setExportProfile("Metadata Audit"); setFakeExportMenu({ show: false, highlight: null }); },
          delayAfter: 3500
        },
        {
          msg: "Or use Export All to generate several different reports in one go!",
          msgTarget: "export-profile-dropdown-container",
          msgPos: "right",
          action: () => setFakeExportMenu({ show: true, highlight: "Export All" }),
          delayAfter: 3000
        },
        {
          msg: "Or use Export All to generate several different reports in one go!",
          msgTarget: "export-profile-dropdown-container",
          msgPos: "right",
          action: () => { setExportProfile("Export All"); setFakeExportMenu({ show: false, highlight: null }); },
          delayAfter: 6000
        }
      ]);
    }

    // Simulation for Step 5: Metrics Dashboard Filter (Standard vs Granular Modes with multi-step clicks)
    if (activeDemo === 9) {
      const pulseSparkleAllCards = () => {
        const cardIds = [
          "library-overview-card", "stream-audit-card", "media-duplicates-card", 
          "quality-anomalies-card", "video-codecs-card", "audio-codecs-card", 
          "music-codecs-card", "containers-card", "subtitle-audit-card", 
          "missing-metadata-card", "metadata-completeness-card"
        ];
        
        // Remove existing card highlight classes
        document.querySelectorAll(".demo-card-highlight").forEach(el => {
          el.classList.remove("demo-card-highlight", "ring-4", "ring-emerald-500", "shadow-[0_0_40px_rgba(16,185,129,0.8)]", "relative", "z-[60]", "scale-[1.02]", "transition-all", "duration-300", "ring-2", "shadow-[0_0_20px_rgba(16,185,129,0.5)]", "opacity-20", "opacity-30", "opacity-0", "pointer-events-none", "!hidden", "hidden");
        });
        
        cardIds.forEach(id => {
          const card = document.getElementById(id);
          if (card) {
            card.classList.remove("opacity-20", "opacity-30", "opacity-0", "pointer-events-none", "!hidden", "hidden");
            card.classList.add("opacity-100", "animate-everything-sparkle-pulse", "animate-everything-sheen");
            demoTimeouts.push(setTimeout(() => {
              card.classList.remove("animate-everything-sparkle-pulse", "animate-everything-sheen");
              // Keep them highlighted above the dark demo overlay until the demo ends
              card.classList.add("relative", "z-[60]", "demo-card-highlight");
            }, 2300));
          }
        });
      };

      const highlightSpecificCards = (ids?: string[], isPopping: boolean = false) => {
        const allCardIds = [
          "library-overview-card", "stream-audit-card", "media-duplicates-card", 
          "quality-anomalies-card", "video-codecs-card", "audio-codecs-card", 
          "music-codecs-card", "containers-card", "subtitle-audit-card", 
          "missing-metadata-card", "metadata-completeness-card"
        ];
        
        allCardIds.forEach(id => {
          const card = document.getElementById(id);
          if (!card) return;
          
          card.classList.remove("demo-card-highlight", "ring-4", "ring-emerald-500", "shadow-[0_0_40px_rgba(16,185,129,0.8)]", "relative", "z-[60]", "scale-[1.02]", "transition-all", "duration-300", "ring-2", "shadow-[0_0_20px_rgba(16,185,129,0.5)]", "opacity-20", "opacity-100", "opacity-30", "opacity-0", "pointer-events-none", "!hidden", "hidden");
          
          if (ids && ids.length > 0 && !ids.includes(id)) {
            card.classList.add("!hidden");
          } else {
            card.classList.add("opacity-100");
            if (ids && ids.includes(id)) {
              if (isPopping) {
                card.classList.add("demo-card-highlight", "ring-4", "ring-emerald-500", "shadow-[0_0_40px_rgba(16,185,129,0.8)]", "relative", "z-[60]", "scale-[1.02]", "transition-all", "duration-300");
              } else {
                card.classList.add("demo-card-highlight", "ring-2", "ring-emerald-500", "shadow-[0_0_20px_rgba(16,185,129,0.5)]", "relative", "z-[60]", "transition-all", "duration-300");
              }
            }
          }
        });
      };

      runSimulation(null, [
        {
          msg: "Using Filters to visualize your library",
          msgTarget: "metrics-dashboard-filter",
          msgPos: "top",
          delayAfter: 3000
        },
        {
          msg: "Customize which data blocks are displayed",
          msgTarget: "btn-metrics-select",
          msgPos: "top",
          action: () => {
            const selectBtn = document.getElementById("btn-metrics-select");
            if (selectBtn) {
              selectBtn.classList.add("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105");
              selectBtn.click();
              triggerResize();
              demoTimeouts.push(setTimeout(() => selectBtn.classList.remove("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105"), 800));
            }
          },
          delayAfter: 4000
        },
        {
          msg: "Save your favorite block configurations to quick-access presets",
          msgTarget: "btn-metrics-preset-save",
          msgPos: "top",
          action: () => {
            // close select metrics dropdown
            const selectBtn = document.getElementById("btn-metrics-select");
            if (selectBtn) selectBtn.click();
            
            const saveBtn = document.getElementById("btn-metrics-preset-save");
            if (saveBtn) {
              saveBtn.classList.add("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105");
              saveBtn.click();
              demoTimeouts.push(setTimeout(() => saveBtn.classList.remove("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105"), 800));
            }
            demoTimeouts.push(setTimeout(() => {
              const c1Btn = document.getElementById("btn-metrics-preset-C1");
              if (c1Btn) {
                c1Btn.classList.add("ring-2", "ring-emerald-500", "shadow-[0_0_40px_rgba(16,185,129,0.8)]", "relative", "z-[60]", "scale-105");
                c1Btn.click();
                demoTimeouts.push(setTimeout(() => c1Btn.classList.remove("ring-2", "ring-emerald-500", "shadow-[0_0_40px_rgba(16,185,129,0.8)]", "relative", "z-[60]", "scale-105"), 800));
              }
            }, 1000));
          },
          delayAfter: 5000
        },
        {
          msg: "Filter by library folder",
          msgTarget: "btn-metrics-filter-granular",
          msgPos: "top",
          action: () => {
            const granBtn = document.getElementById("btn-metrics-filter-granular");
            if (granBtn) {
              granBtn.classList.add("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105");
              granBtn.click();
              triggerResize();
              demoTimeouts.push(setTimeout(() => granBtn.classList.remove("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105"), 800));
            }
            // Pulse the newly generated folder buttons
            const folderIntervalId = setInterval(() => {
              const buttons = Array.from(document.querySelectorAll('[id^="btn-metrics-filter-"]')).filter(b => b.id !== "btn-metrics-filter-default" && b.id !== "btn-metrics-filter-granular" && b.id !== "btn-metrics-filter-Everything");
              const reversedButtons = [...buttons].reverse();
              reversedButtons.forEach((btn, idx) => {
                demoTimeouts.push(setTimeout(() => {
                  btn.classList.add("ring-2", "ring-emerald-500", "shadow-[0_0_20px_rgba(16,185,129,0.8)]", "relative", "z-[60]", "transition-all", "duration-300", "scale-[1.05]");
                  demoTimeouts.push(setTimeout(() => {
                    btn.classList.remove("ring-2", "ring-emerald-500", "shadow-[0_0_20px_rgba(16,185,129,0.8)]", "relative", "z-[60]", "scale-[1.05]");
                  }, 400));
                }, idx * 80));
              });
            }, 2500);
            demoIntervals.push(folderIntervalId as unknown as number);
          },
          delayAfter: 5500
        },
        {
          msg: "Filter by category",
          msgTarget: "btn-metrics-filter-default",
          msgPos: "top",
          action: () => {
            // First, clear any previous folder interval/timeouts completely
            demoIntervals.forEach(clearInterval);
            demoIntervals.length = 0;
            demoTimeouts.forEach(clearTimeout);
            demoTimeouts.length = 0;

            // Strip styling from any other filter buttons to prevent visual overlap
            document.querySelectorAll('[id^="btn-metrics-filter-"]').forEach(btn => {
              btn.classList.remove(
                "ring-2", "ring-emerald-500", "shadow-[0_0_20px_rgba(16,185,129,0.8)]", 
                "relative", "z-[60]", "transition-all", "duration-300", "scale-[1.05]"
              );
            });

            const defaultBtn = document.getElementById("btn-metrics-filter-default");
            if (defaultBtn) {
              defaultBtn.classList.add("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105");
              defaultBtn.click();
              triggerResize();
              demoTimeouts.push(setTimeout(() => defaultBtn.classList.remove("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105"), 800));
            }
            // Rapid right-to-left finger roll cascade down the options (like piano keys)
            const categoryIntervalId = setInterval(() => {
              const buttons = Array.from(document.querySelectorAll('[id^="btn-metrics-filter-"]')).filter(b => b.id !== "btn-metrics-filter-default" && b.id !== "btn-metrics-filter-granular");
              const reversedButtons = [...buttons].reverse();
              reversedButtons.forEach((btn, idx) => {
                demoTimeouts.push(setTimeout(() => {
                  btn.classList.add("ring-2", "ring-emerald-500", "shadow-[0_0_20px_rgba(16,185,129,0.8)]", "relative", "z-[60]", "transition-all", "duration-300", "scale-[1.05]");
                  demoTimeouts.push(setTimeout(() => {
                    btn.classList.remove("ring-2", "ring-emerald-500", "shadow-[0_0_20px_rgba(16,185,129,0.8)]", "relative", "z-[60]", "scale-[1.05]");
                  }, 400));
                }, idx * 80));
              });
            }, 2500);
            demoIntervals.push(categoryIntervalId as unknown as number);
          },
          delayAfter: 5000
        },
        {
          msg: "Filter for only movie files",
          msgTarget: "btn-metrics-filter-Movies",
          msgPos: "top",
          action: () => {
            // Clear any lingering folder/category pulse intervals and timeouts from previous steps
            demoIntervals.forEach(clearInterval);
            demoIntervals.length = 0;
            demoTimeouts.forEach(clearTimeout);
            demoTimeouts.length = 0;

            // Strip styling from other filter buttons to guarantee zero layout recalculation delays
            document.querySelectorAll('[id^="btn-metrics-filter-"]').forEach(btn => {
              btn.classList.remove(
                "ring-2", "ring-emerald-500", "shadow-[0_0_20px_rgba(16,185,129,0.8)]", 
                "relative", "z-[60]", "transition-all", "duration-300", "scale-[1.05]",
                "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "scale-105"
              );
            });
            
            const movieBtn = document.getElementById("btn-metrics-filter-Movies") || 
              Array.from(document.querySelectorAll('[id^="btn-metrics-filter-"]')).find(el => el.textContent?.trim().includes("Movies") || el.textContent?.trim().includes("Movie"));
            if (movieBtn) {
              (movieBtn as HTMLElement).click();
              highlightSpecificCards(["library-overview-card", "video-codecs-card", "audio-codecs-card", "containers-card"], true);
              triggerResize();
            }
          },
          delayAfter: 6000
        },
        {
          msg: "Filter for only music files",
          msgTarget: "btn-metrics-filter-Music",
          msgPos: "top",
          action: () => {
            // Clear any timeouts and intervals to protect smooth motion
            demoIntervals.forEach(clearInterval);
            demoIntervals.length = 0;
            demoTimeouts.forEach(clearTimeout);
            demoTimeouts.length = 0;

            // Strip style classes
            document.querySelectorAll('[id^="btn-metrics-filter-"]').forEach(btn => {
              btn.classList.remove(
                "ring-2", "ring-emerald-500", "shadow-[0_0_20px_rgba(16,185,129,0.8)]", 
                "relative", "z-[60]", "transition-all", "duration-300", "scale-[1.05]",
                "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "scale-105"
              );
            });

            // Deselect Movies since TV Shows are skipped
            const movieBtn = document.getElementById("btn-metrics-filter-Movies") || 
              Array.from(document.querySelectorAll('[id^="btn-metrics-filter-"]')).find(el => el.textContent?.trim().includes("Movies") || el.textContent?.trim().includes("Movie"));
            const isMovieSelected = movieBtn && (movieBtn.classList.contains("bg-blue-600") || !movieBtn.className.includes("bg-transparent"));
            if (isMovieSelected) {
              (movieBtn as HTMLElement).click();
            }
            
            const musicTimeoutId = setTimeout(() => {
              const musicBtn = document.getElementById("btn-metrics-filter-Music") || 
                Array.from(document.querySelectorAll('[id^="btn-metrics-filter-"]')).find(el => el.textContent?.trim().includes("Music"));
              if (musicBtn) {
                (musicBtn as HTMLElement).click();
                highlightSpecificCards(["library-overview-card", "music-codecs-card", "missing-metadata-card", "metadata-completeness-card"], true);
                triggerResize();
              }
            }, 100);
            demoTimeouts.push(musicTimeoutId);
          },
          delayAfter: 6000
        },
        {
          msg: "Show data for all media",
          msgTarget: "btn-metrics-filter-Everything",
          msgPos: "top",
          action: () => {
            // Clear timeouts and intervals
            demoIntervals.forEach(clearInterval);
            demoIntervals.length = 0;
            demoTimeouts.forEach(clearTimeout);
            demoTimeouts.length = 0;

            // Strip style classes
            document.querySelectorAll('[id^="btn-metrics-filter-"]').forEach(btn => {
              btn.classList.remove(
                "ring-2", "ring-emerald-500", "shadow-[0_0_20px_rgba(16,185,129,0.8)]", 
                "relative", "z-[60]", "transition-all", "duration-300", "scale-[1.05]",
                "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "scale-105"
              );
            });

            const everythingBtn = document.getElementById("btn-metrics-filter-Everything");
            if (everythingBtn) (everythingBtn as HTMLElement).click();
            
            highlightSpecificCards([], false); // Clear highlights
            pulseSparkleAllCards(); // Sparkle and pulse all blocks
            triggerResize();
          },
          delayAfter: 5500
        }
      ]).then(() => {
        const filterBar = document.getElementById("metrics-dashboard-filter");
        if (!abortController.signal.aborted && filterBar) {
          filterBar.classList.remove("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "p-1", "rounded-xl");
        }
      });
    }

    // Simulation for Step 19: See only what you need in File Registry
    if (activeDemo === 21) {
      scrollToElement("#file-registry-section");

      // Reset starting state (ensure search and columns start closed, start on Movie category)
      const searchInputEl = document.getElementById("search-input");
      const isSearchCurrentlyOpen = !!(searchInputEl && searchInputEl.parentElement && searchInputEl.parentElement.classList.contains("visible"));
      if (isSearchCurrentlyOpen) {
        const searchToggle = document.getElementById("btn-toggle-search");
        if (searchToggle) searchToggle.click();
      }

      const isColMenuOpen = !!document.querySelector("#file-registry-section input[type='checkbox']");
      if (isColMenuOpen) {
        const colBtn = document.getElementById("btn-toggle-columns");
        if (colBtn) colBtn.click();
      }

      const shimmerRegistrySection = () => {
        const headerRow = document.getElementById("registry-table-header-row");
        if (headerRow) {
          headerRow.classList.add("animate-everything-sheen");
          setTimeout(() => {
            headerRow.classList.remove("animate-everything-sheen");
          }, 2300);
        }
      };

      const flashHeaderRow = () => {
        const headerRow = document.getElementById("registry-table-header-row");
        if (headerRow) {
          headerRow.classList.add("animate-header-row-flash");
          setTimeout(() => {
            headerRow.classList.remove("animate-header-row-flash");
          }, 1000);
        }
      };

      const clickButtonByText = (text: string) => {
        const btns = Array.from(document.querySelectorAll('[id^="btn-cat-"]'));
        const targetBtn = btns.find(btn => btn.textContent?.trim().toLowerCase().includes(text.toLowerCase())) as HTMLElement;
        if (targetBtn) {
          targetBtn.classList.add("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105");
          targetBtn.click();
          shimmerRegistrySection();
          flashHeaderRow();
          setTimeout(() => {
            targetBtn.classList.remove("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105");
          }, 800);
        }
      };

      const clickHeaderByText = (text: string) => {
        const headers = Array.from(document.querySelectorAll('[id^="th-header-"]'));
        const targetHeader = headers.find(h => h.textContent?.trim().toLowerCase().includes(text.toLowerCase())) as HTMLElement;
        if (targetHeader) {
          targetHeader.classList.add("ring-2", "ring-blue-500", "shadow-[0_0_40px_rgba(59,130,246,0.8)]", "relative", "z-[60]", "bg-blue-950/25");
          targetHeader.click();
          setTimeout(() => {
            targetHeader.classList.remove("ring-2", "ring-blue-500", "shadow-[0_0_40px_rgba(59,130,246,0.8)]", "relative", "z-[60]", "bg-blue-950/25");
          }, 800);
        }
      };

      const highlightColumn = (columnKey: string, highlightState: boolean) => {
        // Clear th highlights
        document.querySelectorAll("th.bg-indigo-900\\/40").forEach(th => {
          th.classList.remove("bg-indigo-900/40", "ring-2", "ring-indigo-500", "shadow-[0_0_20px_rgba(99,102,241,0.5)]", "relative", "z-[60]");
        });
        
        // Clear td cell highlights
        document.querySelectorAll("td.bg-indigo-900\\/20").forEach(td => {
          td.classList.remove("bg-indigo-900/20", "ring-1", "ring-indigo-500/30");
        });

        if (highlightState && columnKey) {
          // Send custom event to Dashboard to ensure column is visible!
          window.dispatchEvent(new CustomEvent("force-column-visible", { detail: { columnKey, visible: true } }));

          setTimeout(() => {
            const th = document.getElementById(`th-header-${columnKey}`);
            if (th) {
              th.classList.add("bg-indigo-900/40", "ring-2", "ring-indigo-500", "shadow-[0_0_20px_rgba(99,102,241,0.5)]", "relative", "z-[60]");
              const table = th.closest('table');
              if (table) {
                const trs = Array.from(table.querySelectorAll('tbody tr'));
                const idx = Array.from(th.parentNode!.children).indexOf(th);
                trs.forEach(tr => {
                  const cell = tr.children[idx] as HTMLElement;
                  if (cell) {
                    cell.classList.add("bg-indigo-900/20", "ring-1", "ring-indigo-500/30");
                  }
                });
              }
            }
          }, 150);
        }
      };

      const triggerSearch = (text: string, columnKey: string) => {
        const searchInput = document.getElementById("search-input") as HTMLInputElement;
        if (!searchInput) return;

        searchInput.classList.add("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "bg-indigo-950/20");
        searchInput.focus();

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;

        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(searchInput, "");
        } else {
          searchInput.value = "";
        }
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        searchInput.dispatchEvent(new Event("change", { bubbles: true }));

        const len = text.length;
        if (len === 0) return;

        const totalDuration = len > 3 ? 1000 : 750;
        const charDelay = totalDuration / len;
        let currentIdx = 0;

        const typeNextChar = () => {
          if (abortController.signal.aborted) return;
          currentIdx++;
          const partialText = text.substring(0, currentIdx);

          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(searchInput, partialText);
          } else {
            searchInput.value = partialText;
          }
          
          searchInput.dispatchEvent(new Event("input", { bubbles: true }));
          searchInput.dispatchEvent(new Event("change", { bubbles: true }));

          if (currentIdx < len) {
            setTimeout(typeNextChar, charDelay);
          }
        };

        setTimeout(typeNextChar, 100);

        highlightColumn(columnKey, true);
        setTimeout(() => {
          if (!abortController.signal.aborted) {
            highlightColumn(columnKey, false);
          }
        }, 3200);
      };

      runSimulation("file-registry-section", [
        {
          msg: "See only what you need",
          msgTarget: "table-filter-bar",
          delayAfter: 4800
        },
        // --- 1. FILTERING CATEGORIES ---
        {
          msg: "Filtering by Movies category",
          msgTarget: "btn-cat-Movie",
          action: () => clickButtonByText("Movie"),
          delayAfter: 5500
        },
        {
          msg: "Filtering by TV Shows category",
          msgTarget: "btn-cat-TV",
          action: () => clickButtonByText("TV"),
          delayAfter: 5500
        },
        {
          msg: "Filtering by Music category",
          msgTarget: "btn-cat-Music",
          action: () => clickButtonByText("Music"),
          delayAfter: 5500
        },
        {
          msg: "Now let's take a look at sorting and search.",
          msgTarget: "btn-cat-Movie",
          action: () => clickButtonByText("Movie"),
          delayAfter: 4500
        },
        // --- 2. COLUMN SORTING ---
        {
          msg: "You can click any column header to sort ascending or descending",
          msgTarget: "th-header-filename",
          delayAfter: 5000
        },
        {
          msg: "Sort ascending by Streaming Friendliness",
          msgTarget: "th-header-stream",
          action: () => {
            clickHeaderByText("Friendly");
            highlightColumn("stream", true);
            setTimeout(() => highlightColumn("stream", false), 2200);
          },
          delayAfter: 6000
        },
        {
          msg: "Sort descending by Streaming Friendliness",
          msgTarget: "th-header-stream",
          action: () => {
            clickHeaderByText("Friendly");
            highlightColumn("stream", true);
            setTimeout(() => highlightColumn("stream", false), 2200);
          },
          delayAfter: 6000
        },
        // --- 3. CUSTOMIZE COLUMNS ---
        {
          msg: "Customize columns to show or hide fields as needed",
          msgTarget: "btn-toggle-columns",
          action: () => {
            const colBtn = document.getElementById("btn-toggle-columns");
            if (colBtn) {
              colBtn.classList.add("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105");
              colBtn.click();
            }
          },
          delayAfter: 5000
        },
        {
          msg: "Select precisely what details to show...",
          msgTarget: "btn-toggle-columns",
          msgPos: "bottom",
          action: () => {
            setDemoReelTarget("#col-toggle-stream");
            document.querySelectorAll("[id^='col-toggle-']").forEach(el => {
              el.classList.remove("bg-blue-600/30", "ring-1", "ring-blue-500/50");
            });
            const el = document.getElementById("col-toggle-stream");
            if (el) el.classList.add("bg-blue-600/30", "ring-1", "ring-blue-500/50");
          },
          delayAfter: 1200
        },
        {
          msg: "Customize columns to show or hide fields as needed",
          msgTarget: "btn-toggle-columns",
          msgPos: "bottom",
          action: () => {
            setDemoReelTarget("#col-toggle-title");
            document.querySelectorAll("[id^='col-toggle-']").forEach(el => {
              el.classList.remove("bg-blue-600/30", "ring-1", "ring-blue-500/50");
            });
            const el = document.getElementById("col-toggle-title");
            if (el) el.classList.add("bg-blue-600/30", "ring-1", "ring-blue-500/50");
          },
          delayAfter: 1000
        },
        {
          msg: "Customize columns to show or hide fields as needed",
          msgTarget: "btn-toggle-columns",
          msgPos: "bottom",
          action: () => {
            setDemoReelTarget("#col-toggle-seriesTitle");
            document.querySelectorAll("[id^='col-toggle-']").forEach(el => {
              el.classList.remove("bg-blue-600/30", "ring-1", "ring-blue-500/50");
            });
            const el = document.getElementById("col-toggle-seriesTitle");
            if (el) el.classList.add("bg-blue-600/30", "ring-1", "ring-blue-500/50");
          },
          delayAfter: 1000
        },
        {
          msg: "Customize columns to show or hide fields as needed",
          msgTarget: "btn-toggle-columns",
          msgPos: "bottom",
          action: () => {
            setDemoReelTarget("#col-toggle-season");
            document.querySelectorAll("[id^='col-toggle-']").forEach(el => {
              el.classList.remove("bg-blue-600/30", "ring-1", "ring-blue-500/50");
            });
            const el = document.getElementById("col-toggle-season");
            if (el) el.classList.add("bg-blue-600/30", "ring-1", "ring-blue-500/50");
          },
          delayAfter: 1000
        },
        {
          msg: "Customize columns to show or hide fields as needed",
          msgTarget: "btn-toggle-columns",
          msgPos: "bottom",
          action: () => {
            setDemoReelTarget("#col-toggle-episode");
            document.querySelectorAll("[id^='col-toggle-']").forEach(el => {
              el.classList.remove("bg-blue-600/30", "ring-1", "ring-blue-500/50");
            });
            const el = document.getElementById("col-toggle-episode");
            if (el) el.classList.add("bg-blue-600/30", "ring-1", "ring-blue-500/50");
          },
          delayAfter: 1000
        },
        {
          msg: "Let's temporarily hide the 'Video Codec' column",
          msgTarget: "btn-toggle-columns",
          msgPos: "bottom",
          action: () => {
            setDemoReelTarget("#col-toggle-videoCodec");
            document.querySelectorAll("[id^='col-toggle-']").forEach(el => {
              el.classList.remove("bg-blue-600/30", "ring-1", "ring-blue-500/50");
            });
            const el = document.getElementById("col-toggle-videoCodec");
            if (el) el.classList.add("bg-blue-600/30", "ring-1", "ring-blue-500/50");

            const checkboxes = Array.from(document.querySelectorAll("#file-registry-section input[type='checkbox']")) as HTMLInputElement[];
            const videoCodecCb = checkboxes.find(cb => cb.nextSibling?.textContent?.trim().toLowerCase() === "video codec");
            
            if (videoCodecCb && videoCodecCb.checked) {
              const th = document.getElementById("th-header-videoCodec");
              if (th) {
                const table = th.closest('table');
                if (table) {
                  const trs = Array.from(table.querySelectorAll('tr'));
                  const idx = Array.from(th.parentNode!.children).indexOf(th);
                  
                  trs.forEach(tr => {
                    const cell = tr.children[idx] as HTMLElement;
                    if (cell) {
                      cell.style.transition = 'all 0.4s ease';
                      cell.style.backgroundColor = 'rgba(239, 68, 68, 0.4)';
                      cell.style.color = 'transparent';
                    }
                  });

                  setTimeout(() => {
                    trs.forEach(tr => {
                      const cell = tr.children[idx] as HTMLElement;
                      if (cell) {
                        cell.style.transition = 'all 0.5s ease';
                        cell.style.paddingLeft = '0';
                        cell.style.paddingRight = '0';
                        cell.style.width = '0px';
                        cell.style.minWidth = '0px';
                        cell.style.maxWidth = '0px';
                        cell.style.opacity = '0';
                        cell.style.border = 'none';
                        const div = cell.querySelector('div');
                        if (div) {
                            div.style.transition = 'all 0.5s ease';
                            div.style.width = '0px';
                            div.style.opacity = '0';
                        }
                      }
                    });
                    
                    setTimeout(() => {
                      videoCodecCb.click();
                    }, 500);
                  }, 500);
                }
              } else {
                videoCodecCb.click();
              }
            }
          },
          delayAfter: 5500
        },
        {
          msg: "We can bring it back just as easily!",
          msgTarget: "btn-toggle-columns",
          msgPos: "bottom",
          action: () => {
            setDemoReelTarget(null);
            document.querySelectorAll("[id^='col-toggle-']").forEach(el => {
              el.classList.remove("bg-blue-600/30", "ring-1", "ring-blue-500/50");
            });

            const checkboxes = Array.from(document.querySelectorAll("#file-registry-section input[type='checkbox']")) as HTMLInputElement[];
            const videoCodecCb = checkboxes.find(cb => cb.nextSibling?.textContent?.trim().toLowerCase() === "video codec");
            
            if (videoCodecCb && !videoCodecCb.checked) {
              videoCodecCb.click();
              
              setTimeout(() => {
                const th = document.getElementById("th-header-videoCodec");
                if (th) {
                  const table = th.closest('table');
                  if (table) {
                    const trs = Array.from(table.querySelectorAll('tr'));
                    const idx = Array.from(th.parentNode!.children).indexOf(th);
                    
                    trs.forEach(tr => {
                      const cell = tr.children[idx] as HTMLElement;
                      if (cell) {
                        const origWidth = cell.style.width || '100px';
                        
                        cell.style.transition = 'none';
                        cell.style.width = '0px';
                        cell.style.minWidth = '0px';
                        cell.style.paddingLeft = '0';
                        cell.style.paddingRight = '0';
                        cell.style.opacity = '0';
                        cell.style.backgroundColor = 'rgba(16, 185, 129, 0.4)';
                        
                        void cell.offsetWidth; // force reflow
                        
                        cell.style.transition = 'all 0.6s ease';
                        cell.style.width = origWidth;
                        cell.style.minWidth = '80px';
                        cell.style.paddingLeft = '0.75rem';
                        cell.style.paddingRight = '0.75rem';
                        cell.style.opacity = '1';
                        
                        setTimeout(() => {
                          cell.style.backgroundColor = 'transparent';
                        }, 800);
                      }
                    });
                  }
                }
              }, 100);
            }
          },
          delayAfter: 5500
        },
        {
          action: () => {
            const colBtn = document.getElementById("btn-toggle-columns");
            if (colBtn) {
              const isMenuOpen = !!document.querySelector("#file-registry-section input[type='checkbox']");
              if (isMenuOpen) {
                colBtn.click();
              }
              colBtn.classList.remove("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105");
            }
          },
          delayAfter: 3500
        },
        // --- 4. REAL-TIME SEARCH ---
        {
          msg: "Use Search to filter your view dynamically",
          msgTarget: "btn-toggle-search",
          action: () => {
            setTimeout(() => {
              if (abortController.signal.aborted) return;
              const searchToggle = document.getElementById("btn-toggle-search");
              if (searchToggle) {
                searchToggle.classList.add("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105");
                searchToggle.click();
              }
            }, 500);
          },
          delayAfter: 4000
        },
        {
          msg: "Searching by Title ('Spider')",
          msgTarget: "search-input",
          action: () => {
            const targetKey = "title";
            triggerSearch("Spider", targetKey);
          },
          delayAfter: 6500
        },
        {
          msg: "Searching by File Name ('Matrix')",
          msgTarget: "search-input",
          action: () => {
            triggerSearch("Matrix", "filename");
          },
          delayAfter: 6500
        },
        {
          msg: "Searching by Container ('MP4')",
          msgTarget: "search-input",
          action: () => {
            triggerSearch("MP4", "container");
          },
          delayAfter: 6500
        },
        {
          action: () => {
            highlightColumn("", false);
            const searchInput = document.getElementById("search-input") as HTMLInputElement;
            if (searchInput) {
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(searchInput, "");
              } else {
                searchInput.value = "";
              }
              searchInput.dispatchEvent(new Event("input", { bubbles: true }));
              searchInput.dispatchEvent(new Event("change", { bubbles: true }));
              searchInput.blur();
              searchInput.classList.remove("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "bg-indigo-950/20");
            }
            const searchToggle = document.getElementById("btn-toggle-search");
            if (searchToggle) {
              searchToggle.click();
              searchToggle.classList.remove("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105");
            }
          },
          delayAfter: 4000
        },
        {
          msg: "Whatever you're looking for, you can sort, filter and find it in the Library Scan Details!",
          msgTarget: "table-filter-bar",
          msgPos: "bottom",
          delayAfter: 5000
        }
      ]).then(() => {
        if (!abortController.signal.aborted) {
          highlightColumn("", false);
        }
      });
    }


    // Simulation for Step 34: Help & Tutorials
    if (activeDemo === 33) {
      scrollToElement("#help-header-bar");
      runSimulation("help-header-bar", [
        {
          msg: "Welcome to the Help Center!",
          delayAfter: 2000
        },
        {
          msg: "Here you can find detailed tutorials on how to use every auditing engine.",
          action: () => {
            const el = document.getElementById("help-tutorials-container");
            if (el) el.classList.add("relative", "z-[60]", "ring-2", "ring-indigo-500", "shadow-[0_0_30px_rgba(99,102,241,0.4)]", "rounded-xl");
            const tuts = document.getElementById("tutorials-main-header");
            if (tuts) {
              tuts.click();
            }
          },
          delayAfter: 5500
        },
        {
          msg: "As well as Frequently Asked Questions for troubleshooting issues.",
          action: () => {
            const old = document.getElementById("help-tutorials-container");
            if (old) old.classList.remove("relative", "z-[60]", "ring-2", "ring-indigo-500", "shadow-[0_0_30px_rgba(99,102,241,0.4)]", "rounded-xl");
            
            const el = document.getElementById("help-faqs-container");
            if (el) el.classList.add("relative", "z-[60]", "ring-2", "ring-indigo-500", "shadow-[0_0_30px_rgba(99,102,241,0.4)]", "rounded-xl");
            
            const faqs = document.getElementById("faqs-main-header");
            if (faqs) {
              faqs.click();
            }
          },
          delayAfter: 6000
        }
      ]);
    }

    // Simulation for Step 35: OSS Section (Fireworks)
    if (activeDemo === 34) {
      scrollToElement("#oss-section");
      runSimulation("oss-section", [
        {
          msg: "We stand on the shoulders of giants! Let's celebrate the open source community!",
          action: () => {
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
          },
          delayAfter: 5500
        }
      ]);
    }

    if (activeDemo === 35) {
      scrollToElement("#support-qr-code");
      runSimulation("support-qr-code", [
        {
          msg: "If you found BitScribe helpful, we'd love your support!",
          msgTarget: "support-qr-code",
          msgPos: "left",
          action: () => {
            setDemoReelTarget("#support-section");
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
          },
          delayAfter: 3500
        },
        {
          msg: "Thank you for joining the tour!",
          msgTarget: "support-qr-code",
          msgPos: "left",
          action: () => {
            confetti({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.6 },
              colors: ['#818cf8', '#c084fc', '#34d399', '#ef4444', '#f59e0b'],
              zIndex: 100005
            });
          },
          delayAfter: 6000
        }
      ]);
    }

    return () => {
      abortController.abort();
      clearDemoIntervals();
      clearDemoTimeouts();
      document.body.classList.remove("demo-running");
      
      // Cleanup search panel simulation residues
      const searchInput = document.getElementById("search-input") as HTMLInputElement;
      if (searchInput) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(searchInput, "");
        } else {
          searchInput.value = "";
        }
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
        searchInput.dispatchEvent(new Event("change", { bubbles: true }));
        searchInput.classList.remove("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "bg-indigo-950/20");
      }
      const searchInputEl = document.getElementById("search-input");
      const isSearchCurrentlyOpen = !!(searchInputEl && searchInputEl.parentElement && searchInputEl.parentElement.classList.contains("visible"));
      if (isSearchCurrentlyOpen) {
        const searchToggle = document.getElementById("btn-toggle-search");
        if (searchToggle) {
          searchToggle.click();
          searchToggle.classList.remove("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "scale-105");
        }
      }
      
      const filterBar = document.getElementById("metrics-dashboard-filter");
      if (filterBar) filterBar.classList.remove("ring-2", "ring-indigo-500", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "relative", "z-[60]", "p-1", "rounded-xl");
      document.querySelectorAll(".demo-card-highlight").forEach(el => {
        el.classList.remove("demo-card-highlight", "ring-4", "ring-emerald-500", "shadow-[0_0_40px_rgba(16,185,129,0.8)]", "relative", "z-[60]", "scale-[1.02]", "transition-all", "duration-300", "ring-2", "shadow-[0_0_20px_rgba(16,185,129,0.5)]");
      });
      // Ensure we clear the !hidden state from all cards if demo is interrupted
      const allCardIds = [
        "library-overview-card", "stream-audit-card", "media-duplicates-card", 
        "quality-anomalies-card", "video-codecs-card", "audio-codecs-card", 
        "music-codecs-card", "containers-card", "subtitle-audit-card", 
        "missing-metadata-card", "metadata-completeness-card"
      ];
      allCardIds.forEach(id => {
        const card = document.getElementById(id);
        if (card) {
          card.classList.remove("!hidden", "hidden", "opacity-0", "opacity-100", "pointer-events-none", "opacity-20", "opacity-30");
        }
      });
      document.querySelectorAll(".demo-section-highlight").forEach(el => {
        el.classList.remove("relative", "z-[60]", "ring-2", "ring-indigo-500", "shadow-[0_0_30px_rgba(99,102,241,0.4)]", "rounded-xl");
      });
      document.querySelectorAll("[id^='col-toggle-']").forEach(el => {
        el.classList.remove("bg-blue-600/30", "ring-1", "ring-blue-500/50");
      });
      // Fire a mousedown event to close any open dropdowns (like the metrics block selector)
      document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      document.querySelectorAll('[id^="btn-metrics-filter-"]').forEach(btn => {
        btn.classList.remove("ring-2", "ring-emerald-500", "ring-indigo-500", "ring-blue-500", "shadow-[0_0_20px_rgba(16,185,129,0.8)]", "shadow-[0_0_20px_rgba(59,130,246,0.8)]", "shadow-[0_0_40px_rgba(99,102,241,0.8)]", "scale-[1.05]", "scale-105", "relative", "z-[60]");
      });
      setDemoReelTarget(null);
      setFakeExportMenu({ show: false, highlight: null });
      setShowCustomColumnsMenu(false);
      setIsDemoPaused(false);
    };
  }, [activeDemo, showTour]);

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

  const cancelTour = () => {
    setShowTour(false);
    setActiveDemo(null);
    setDemoMessage(null);
    setTourStepIndex(0);
    setShowCustomColumnsMenu(false);
    setShowMetrics(true);
    setShowDiagnostic(false);
    localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: 'skipped' }));
    setCustomRules(resetToDiscoveryPreset);
  };

  const remindLaterTour = () => {
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

  const [isAddingPathApp, setIsAddingPathApp] = useState(false);
  const [isPathsExpanded, setIsPathsExpanded] = useState(false);
  const [newPathInputApp, setNewPathInputApp] = useState("");
  const [editingPathIdx, setEditingPathIdx] = useState<number | null>(null);
  const [editPathInput, setEditPathInput] = useState("");

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

  
  const handleBackup = async (type: 'full' | 'data' | 'settings') => {
      try {
          let backup: any = { type, timestamp: new Date().toISOString() };
          
          if (type === 'full' || type === 'settings') {
              backup.settings = {
                  plex_scan_paths: localStorage.getItem("plex_scan_paths"),
                  plex_excel_columns: localStorage.getItem("plex_excel_columns"),
                  plex_compat_rules: localStorage.getItem("plex_compat_rules"),
                  bitscribe_export_directory: localStorage.getItem("bitscribe_export_directory"),
                  bitscribe_custom_block_presets: localStorage.getItem("bitscribe_custom_block_presets"),
              };
          }
          
          if (type === 'full' || type === 'data') {
              const files = await invoke("get_db_files");
              backup.data = files;
          }

          const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
          await downloadOrSaveFile(`bitscribe_backup_${type}_${Date.now()}.json`, blob, exportDirectory || undefined);
          localStorage.setItem("last_backup_timestamp", new Date().toISOString());
          setNotification({ type: 'success', message: 'Backup saved successfully!' });
          setTimeout(() => setNotification(null), 5000);
      } catch (e: any) {
          setNotification({ type: 'error', message: 'Backup failed: ' + e.toString() });
          setTimeout(() => setNotification(null), 5000);
      }
  };

  const handleRestore = async () => {
      try {
          const selected = await open({ filters: [{ name: 'JSON', extensions: ['json'] }], multiple: false });
          if (!selected || typeof selected !== "string") return;
          
          const content = await readTextFile(selected);
          const backup = JSON.parse(content);
          
          if (!backup.type) {
              throw new Error("Invalid backup file format");
          }
          
          if (backup.settings) {
              if (backup.settings.plex_scan_paths) {
                  localStorage.setItem("plex_scan_paths", backup.settings.plex_scan_paths);
                  setScanPaths(JSON.parse(backup.settings.plex_scan_paths));
              }
              if (backup.settings.plex_excel_columns) {
                  localStorage.setItem("plex_excel_columns", backup.settings.plex_excel_columns);
                  setExcelColumns(JSON.parse(backup.settings.plex_excel_columns));
              }
              if (backup.settings.plex_compat_rules) {
                  localStorage.setItem("plex_compat_rules", backup.settings.plex_compat_rules);
                  setCustomRules(JSON.parse(backup.settings.plex_compat_rules));
              }
              if (backup.settings.bitscribe_export_directory) {
                  localStorage.setItem("bitscribe_export_directory", backup.settings.bitscribe_export_directory);
                  setExportDirectory(backup.settings.bitscribe_export_directory);
              }
              if (backup.settings.bitscribe_custom_block_presets) {
                  localStorage.setItem("bitscribe_custom_block_presets", backup.settings.bitscribe_custom_block_presets);
                  window.dispatchEvent(new Event("restore_custom_presets"));
              }
          }
          
          if (backup.data) {
              await invoke("clear_db");
              await invoke("save_db_files", { files: backup.data });
              const reloaded = await invoke("get_db_files");
              setScannedFilesList(reloaded as MediaItem[]);

          }
          
          setNotification({ type: 'success', message: 'Restore completed successfully!' });
          setTimeout(() => setNotification(null), 8000);
      } catch (e: any) {
          setNotification({ type: 'error', message: 'Restore failed: ' + e.toString() });
          setTimeout(() => setNotification(null), 8000);
      }
  };

  const handleStartScan = async (isQuickRefresh: boolean = false) => {
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
      const finalItems: MediaItem[] = [];
      const corruptItems: MediaItem[] = [];
      if (localStorage.getItem("bitscribe_scan_in_progress") === "true") {
          try {
              const existingFiles = await getDbFiles();
              existingFiles.forEach(f => {
                  if (f.category === "Corrupted" || (f.category && f.category.toLowerCase().includes("corrupt"))) {
                      corruptItems.push(f);
                  } else {
                      finalItems.push(f);
                  }
              });
          } catch (e) {
              console.warn("Failed to load existing files for resume", e);
          }
      }
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
              if (prog.item) {
                  if (prog.error) {
                      const idx = corruptItems.findIndex(i => i.id === prog.item.id);
                      if (idx >= 0) corruptItems[idx] = prog.item;
                      else corruptItems.push(prog.item);
                  } else {
                      const idx = finalItems.findIndex(i => i.id === prog.item.id);
                      if (idx >= 0) finalItems[idx] = prog.item;
                      else finalItems.push(prog.item);
                      scannedCount++;
                  }
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
      await clearDb(); const res = { ok: true };
      if (res.ok) {
        setScanLogs(["Persistent SQL database completely flushed and wiped."]);
        setNotification("Server SQL database flushed successfully.");
      } else {
        setScanLogs(["Failed to wipe database on server."]);
        setNotification({ type: 'error', message: "Failed to wipe database on server." });
      }
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
  const [showDemoCleanupModal, setShowDemoCleanupModal] = useState(false);
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
              await flushServerDatabase();
              setNotification({ type: 'success', message: 'Demo data cleared successfully. Database is now empty and ready.' });
            } catch (err) {
              console.error("Failed to clear database:", err);
              setNotification({ type: 'error', message: 'Could not automatically wipe database.' });
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
          isPathsExpanded={isPathsExpanded}
          setIsPathsExpanded={setIsPathsExpanded}
          editingPathIdx={editingPathIdx}
          setEditingPathIdx={setEditingPathIdx}
          editPathInput={editPathInput}
          setEditPathInput={setEditPathInput}
          isAddingPathApp={isAddingPathApp}
          setIsAddingPathApp={setIsAddingPathApp}
          newPathInputApp={newPathInputApp}
          setNewPathInputApp={setNewPathInputApp}
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
                      localStorage.clear();
                      clearDb().then(() => {
                    setScannedFiles([]);
                    setScannedFilesList([]);
                    setCorruptFiles([]);
                    setScanLogs(["App state and database completely wiped."]);
                  }).catch(() => {
                    setScannedFiles([]);
                    setScannedFilesList([]);
                  });
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

          </main>
      </div>
    </div>
    </>
  );
}