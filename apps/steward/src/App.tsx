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
          
          const logFile = await join(bitScribeDir, "debuglog.txt");
          const timestamp = new Date().toISOString();
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

      {showTour && (
        <div 
          id="tour-remote-panel"
          onMouseDown={handleTourMouseDown}
          style={{ transform: `translate3d(${tourPosition.x}px, ${tourPosition.y}px, 0)` }}
          className={`fixed bottom-6 right-6 z-[100005] bg-[#1e2330]/95 border-2 border-indigo-500/40 p-4 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.3)] backdrop-blur-md w-56 flex flex-col gap-3 font-sans select-none animate-in fade-in slide-in-from-bottom-5 transition-transform ${isTourDragging ? 'cursor-grabbing scale-[1.01] border-indigo-500/60 shadow-[0_0_40px_rgba(99,102,241,0.45)] duration-75' : 'duration-700 ease-in-out'}`}
        >
          {tourStepIndex > 0 && !(TOUR_STEPS[tourStepIndex] as any)?.isIntro && (
            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 pointer-events-none drop-shadow-2xl z-[100000]">
              <BitsyCharacter 
                className="w-16 h-16 animate-float-subtle drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]" 
                talking={activeDemo !== null} 
                pointing={false} 
                mood={activeDemo !== null ? "excited" : "happy"} 
                targetSelector={activeDemo !== null ? (demoReelTarget || demoMessage?.targetId || null) : (showTour && tourStepIndex > 0 ? (TOUR_STEPS[tourStepIndex]?.target as string) : null)}
              />
            </div>
          )}
          <style>{`
            @keyframes scan-animation {
              0% { left: -30%; }
              100% { left: 110%; }
            }
            @keyframes float-animation {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(-4px); }
            }
            .animate-scan {
              position: absolute;
              animation: scan-animation 2s linear infinite;
            }
            .animate-float-subtle {
              animation: float-animation 3s ease-in-out infinite;
            }
          `}</style>

          {/* Header */}
          <div className="flex items-center justify-between cursor-grab active:cursor-grabbing pb-1 border-b border-slate-800/40">
            <div className="flex items-center gap-1.5">
              <GripHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-indigo-500"></span>
              </span>
              <span className="text-[11px] font-extrabold text-slate-200 tracking-wider uppercase">BitScribe Remote</span>
            </div>
            <button 
              onClick={cancelTour}
              className="text-slate-400 hover:text-rose-400 transition-colors p-0.5 rounded hover:bg-slate-800/50 cursor-pointer bg-transparent border-0 no-drag"
              title="Close Tour"
            >
              <CloseIcon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Jump to step popover menu */}
          <div className="relative no-drag">
            <button
              onClick={() => setTourMenuOpen(!tourMenuOpen)}
              className="w-full flex items-center justify-between py-1.5 px-2.5 bg-slate-900/60 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-[11px] font-bold transition hover:bg-slate-900 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <List className="w-3.5 h-3.5 text-indigo-400" />
                <span className="truncate">Jump to Step...</span>
              </div>
              {tourMenuOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {tourMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 z-[100006] bg-[#0c101b]/98 border border-indigo-500/30 rounded-xl shadow-2xl p-1.5 max-h-60 overflow-y-auto font-sans scrollbar-thin scrollbar-thumb-indigo-500/20">
                <div className="text-[9px] font-extrabold text-indigo-400 tracking-wider uppercase p-1.5 border-b border-slate-800/60 mb-1">
                  Tour Roadmap ({TOUR_STEPS.length} Steps)
                </div>
                <ul className="flex flex-col gap-0.5">
                  {TOUR_STEPS.map((step, idx) => {
                    const isActive = idx === tourStepIndex;
                    return (
                      <li key={idx}>
                        <button
                          onClick={() => {
                            goToTourStep(idx);
                            setTourMenuOpen(false);
                          }}
                          className={`w-full text-left py-1 px-2 rounded-md text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${isActive ? 'bg-indigo-600/35 border border-indigo-500/40 text-indigo-200' : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-transparent'}`}
                        >
                          <span className="truncate pr-2">
                            {idx + 1}. {step.title || 'Introduction'}
                          </span>
                          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.8)] shrink-0"></span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {/* Progress Section */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>Progress</span>
              <span>Step {tourStepIndex + 1} of {TOUR_STEPS.length}</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                style={{ width: `${((tourStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Contextual Interactive Demos */}
          {([3, 8, 22, 35, 36, 37].includes(tourStepIndex)) && (
            <div className="bg-indigo-950/20 border border-indigo-500/20 p-2 rounded-xl flex flex-col gap-1.5 no-drag transition-all duration-500">
              <div className="flex items-center gap-1 text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" id="mini-clapper-icon" style={{ overflow: 'visible' }}>
                  <style>{`
                    @keyframes miniClap {
                      0%, 100% { transform: rotate(-15deg); }
                      5% { transform: rotate(-25deg); }
                      10% { transform: rotate(-5deg); }
                      15% { transform: rotate(-25deg); }
                      20% { transform: rotate(-5deg); }
                      25% { transform: rotate(-15deg); }
                    }
                    .mini-clapper-top {
                      transform-origin: 3px 9px;
                      animation: miniClap 3s ease-in-out infinite;
                    }
                    @keyframes strikingFlash {
                      0%, 49.9% { background-color: #f59e0b; color: #451a03; box-shadow: 0 0 20px rgba(245,158,11,0.8); }
                      50%, 100% { background-color: #334155; color: #cbd5e1; box-shadow: none; }
                    }
                    .animate-striking-flash {
                      animation: strikingFlash 1s infinite;
                    }
                  `}</style>
                  {/* Top Bar (Animated) */}
                  <g className="mini-clapper-top">
                    <rect x="3" y="5" width="18" height="4" rx="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1" />
                    <path d="M6 9l3-4M11 9l3-4M16 9l3-4" stroke="#1E232E" strokeWidth="1" />
                  </g>
                  {/* Bottom board */}
                  <rect x="3" y="9" width="18" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M3 12h18" stroke="currentColor" strokeWidth="1" />
                  <path d="M7 15h10M7 17h6" stroke="currentColor" strokeWidth="1" className="opacity-60" />
                </svg> Feature Demo
              </div>
              
              {activeDemo !== null ? (
                <div className="flex flex-col gap-2 mt-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className={`absolute inline-flex h-full w-full rounded-full ${isDemoPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'} opacity-75`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isDemoPaused ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                      </span>
                      {isDemoPaused ? "Demo Paused" : "Demo in Progress..."}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 animate-pulse">{isDemoPaused ? "Paused" : "Running"}</span>
                  </div>
                  <div className="w-full bg-slate-800/60 h-1 rounded-full overflow-hidden relative">
                    <div className={`absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-indigo-500 w-1/3 rounded-full ${isDemoPaused ? '' : 'animate-scan'}`}></div>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      onClick={() => setIsDemoPaused(!isDemoPaused)}
                      className="flex-1 flex justify-center items-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition shadow shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:scale-[1.02]"
                    >
                      {isDemoPaused ? <><Play className="w-3 h-3 fill-current" /> Resume</> : <><Pause className="w-3 h-3 fill-current" /> Pause</>}
                    </button>
                    <button
                      onClick={() => { setActiveDemo(null); setIsDemoPaused(false); }}
                      className="flex-1 flex justify-center items-center gap-1.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition shadow shadow-rose-600/30 hover:shadow-rose-500/40 hover:scale-[1.02]"
                    >
                      <CloseIcon className="w-3 h-3" /> Stop
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-slate-400 leading-snug">
                    See an animated demonstration
                  </p>
                  <button
                    onClick={() => {
                      if (!demoClickedSteps.includes(tourStepIndex)) {
                        setDemoClickedSteps(prev => [...prev, tourStepIndex]);
                      }
                      if (tourStepIndex === 8) setActiveDemo(9);
                      else if (tourStepIndex === 22) setActiveDemo(21);
                      else if (tourStepIndex === 3) setActiveDemo(3);
                      else if (tourStepIndex === 35) setActiveDemo(33);
                      else if (tourStepIndex === 36) setActiveDemo(34);
                      else if (tourStepIndex === 37) setActiveDemo(35);
                    }}
                    className={`mt-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 text-white rounded-lg text-xs font-bold transition cursor-pointer ${
                      !demoClickedSteps.includes(tourStepIndex) 
                        ? "animate-striking-flash hover:brightness-110" 
                        : "bg-indigo-600 hover:bg-indigo-500 shadow shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:scale-[1.02]"
                    }`}
                  >
                    <Play className="w-3 h-3 fill-current" /> Show Demo
                  </button>
                </>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-between gap-2 border-t border-slate-800/60 pt-2.5 mt-0.5 no-drag">
            <button 
              onClick={() => goToTourStep(tourStepIndex - 1)}
              disabled={tourStepIndex === 0}
              className="flex-1 flex items-center justify-center gap-0.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button 
              onClick={() => {
                if (tourStepIndex === TOUR_STEPS.length - 1) {
                  finishTour();
                } else {
                  goToTourStep(tourStepIndex + 1);
                }
              }}
              className="flex-1 flex items-center justify-center gap-0.5 py-1.5 px-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-500/20 hover:scale-[1.02] cursor-pointer"
            >
              {tourStepIndex === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Quit / Pause Links */}
          <div className="flex items-center justify-between mt-1 pt-2 border-t border-slate-800/30 text-[10px] text-slate-500 font-semibold no-drag">
            <button 
              onClick={remindLaterTour}
              className="hover:text-indigo-400 transition-colors cursor-pointer bg-transparent border-0 p-0 text-left"
            >
              Pause for 1 week
            </button>
            <button 
              onClick={cancelTour}
              className="hover:text-rose-400 transition-colors cursor-pointer bg-transparent border-0 p-0 text-right"
            >
              Skip permanently
            </button>
          </div>
        </div>
      )}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#14171F] border border-[#1e232e] p-6 rounded-xl shadow-2xl max-w-sm w-full">
            <h3 className="text-lg font-bold text-slate-200 mb-2">Confirmation Required</h3>
            <p className="text-sm text-slate-400 mb-6">{confirmAction.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  confirmAction.onConfirm();
                  setConfirmAction(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-bold transition-colors shadow-lg shadow-red-900/20"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {showDemoCleanupModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md px-4 animate-fade-in">
          <div className="bg-[#141724] border-2 border-indigo-500/20 p-6 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-md w-full text-center relative overflow-hidden">
            {/* Ambient accent top glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent rounded-full opacity-60" />
            
            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400" title="Bitsy says hi!">
              <BitsyCharacter className="w-8 h-8 text-indigo-400 animate-bounce" mood="excited" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-100 mb-2 uppercase tracking-wide">Tour Complete!</h3>
            {localStorage.getItem("bitscribe_demo_data_inserted") === "true" ? (
              <>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  The BitScribe tour is now finished! We populated the database with realistic mock media files so you could explore the charts and interactive tables.
                  <br /><br />
                  Would you like to <strong>keep the demo data</strong> to play around further, or <strong>wipe the demo data</strong> to start fresh with your own files?
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button 
                    onClick={async () => {
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
                    className="flex-1 py-2.5 bg-red-600/90 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-900/10 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Wipe Demo Data
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.removeItem("bitscribe_demo_data_inserted");
                      setShowDemoCleanupModal(false);
                      handleTabChange("scan");
                      setCustomRules(resetToDiscoveryPreset);
                      setNotification({ type: 'success', message: 'Kept demo files. You can clear them anytime via the Troubleshooting panel.' });
                    }}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    Keep Demo Data
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  The BitScribe tour is now finished! You can now start using the app with your own media library.
                </p>
                <div className="flex justify-center">
                  <button 
                    onClick={() => {
                      setShowDemoCleanupModal(false);
                      handleTabChange("scan");
                      setCustomRules(resetToDiscoveryPreset);
                    }}
                    className="w-full sm:w-auto px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-900/20 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Exit Tour
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div className={isFluidLayout 
        ? "h-screen w-full min-w-[768px] overflow-hidden bg-[#0F1117] text-slate-200 flex flex-col font-sans selection:bg-blue-500/30"
        : "h-screen min-w-[1024px] overflow-x-auto overflow-y-hidden bg-[#0F1117] text-slate-200 flex flex-col font-sans selection:bg-blue-500/30"
      }>

      {/* Top Center-Aligned Header Lockup */}
      
      

<header id="app-header" className="sticky top-0 z-[100] bg-[#10141D]/95 backdrop-blur-sm border-b border-[#1e2333]/80 py-2.5 px-6 shrink-0 overflow-hidden select-none">
        {/* Glow behind the header */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-24 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Centered Lockup */}
        <div className="w-full flex items-center justify-between relative z-10">
          {/* Left subtle telemetry marker */}
          <div id="scan-mode-header-display" className="hidden lg:flex flex-col gap-1 text-left">
            <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[9px] uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Mode:</span>
              <select
                value={activeModeName === "Select a mode" ? "" : activeModeName}
                onChange={handleHeaderModeChange}
                title={MODE_DESCRIPTIONS[activeModeName] || "Select an active audit preset for your media library."}
                className="bg-[#0f111a] border border-slate-700/60 text-[10px] font-bold font-mono text-cyan-400 rounded px-1.5 py-0.5 outline-none cursor-pointer hover:border-cyan-500/50 transition-colors focus:border-cyan-500"
              >
                <option value="" disabled className="text-slate-500 bg-[#0f111a]" title="Choose a preset mode to scan and audit your media collection.">Select a mode</option>
                <option value="Stream Audit" className="text-slate-300 bg-[#0f111a]" title="Audits video, audio streams, and subtitles for direct play compatibility on both modern and legacy devices.">Stream Audit</option>
                <option value="Media Discovery" className="text-slate-300 bg-[#0f111a]" title="Discovers and catalogs all media files, conforming to standard configurations.">Media Discovery</option>
                <option value="Quality Audit" className="text-slate-300 bg-[#0f111a]" title="Scans for media stream corruption, quality anomalies, and bitrate issues.">Quality Audit</option>
                <option value="Subtitle Audit" className="text-slate-300 bg-[#0f111a]" title="Detects missing subtitles, unsupported image-based subtitles, and text formatting.">Subtitle Audit</option>
                <option value="Duplication Scan" className="text-slate-300 bg-[#0f111a]" title="Analyzes video and music libraries to identify duplicate media items.">Duplication Scan</option>
                <option value="Metadata Audit" className="text-slate-300 bg-[#0f111a]" title="Audits embedded tags (titles, artists, years, cover art) for clean cataloging.">Metadata Audit</option>
                {(activeModeName === "Modern Direct Play" || activeModeName === "Legacy Direct Play") && (
                  <option value={activeModeName} disabled className="text-amber-400/80 bg-[#0f111a]">
                    Stream Audit (Custom)
                  </option>
                )}
              </select>
            </div>
            <p className="text-[10px] text-slate-400 font-sans tracking-wide">
              Visit <button title="Open Options tab" onClick={() => handleTabChange("rules")} className="text-purple-400 hover:text-purple-300 underline font-medium cursor-pointer">Options</button> to Customize Scans.
            </p>
          </div>

          <div className="flex items-center gap-4.5 mx-auto lg:translate-x-[2%]">
            {/* Unified Branding Block */}
            <div className="flex flex-col items-center select-none">
              {/* Logo + BitScribe Title Row */}
              <div className="flex items-center gap-1">
                {/* Genuine beautiful Feather Quill Logo direct butted */}
                <svg className="w-14 h-14 flex-shrink-0 relative group -mt-1" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="headerQuillGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#A78BFA" />
                      <stop offset="50%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                    <filter id="waveGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="1.0" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>
                  
                  {/* Soft glowing trail line written by the pen */}
                  <path d="M 5,59 Q 15,61.8 25,54 T 41,45 T 55,41" stroke="url(#headerQuillGrad)" strokeWidth="1.2" strokeDasharray="1.5 2.5" fill="none" opacity="0.3" />

                  {/* Curving wavy tail of celluloid film strip coming off from the pen tip to the reel */}
                  {/* Elegant squiggly ink line connecting the pen tip to the reel */}
                  <path d="M 5,59 Q 10,61 14,57.5 T 21,54.5" stroke="url(#headerQuillGrad)" strokeWidth="1.2" fill="none" opacity="0.85" />

                  {/* Curving wavy tail of celluloid film strip trailing out the back of the reel in the opposite direction */}
                  {/* Segment 1: Reel to Twist (Face-on with sprockets) */}
                  <path d="M 28,55.0 C 35,59.5 45,43.5 60,44.0 L 60,56.0 C 45,50.0 35,63.0 28,58.5 Z" fill="none" stroke="#A78BFA" strokeWidth="0.8" opacity="0.95" />
                  {/* Celluloid Frame Division Lines (vertical frame borders) */}
                  <line x1="36" y1="55.1" x2="36" y2="59.2" stroke="#8B5CF6" strokeWidth="0.6" opacity="0.8" />
                  <line x1="44" y1="51.0" x2="44" y2="56.7" stroke="#8B5CF6" strokeWidth="0.6" opacity="0.8" />
                  <line x1="52" y1="46.1" x2="52" y2="54.5" stroke="#8B5CF6" strokeWidth="0.6" opacity="0.8" />

                  {/* Dual sprocket holes trailing along the top and bottom borders */}
                  <path d="M 28,55.7 C 35,60.2 45,44.2 60,44.7" stroke="#C084FC" strokeWidth="0.7" strokeDasharray="0.8 1.0" fill="none" opacity="0.85" />
                  <path d="M 28,57.7 C 35,62.2 45,49.2 60,55.2" stroke="#C084FC" strokeWidth="0.7" strokeDasharray="0.8 1.0" fill="none" opacity="0.85" />

                  {/* Amethyst & Silver Film Reel (Video - Movie) - Scaled and Detailed */}
                  <circle cx="25" cy="54" r="6.5" fill="none" opacity="0.3" />
                  <circle cx="25" cy="54" r="6.5" stroke="#8B5CF6" strokeWidth={1.3} fill="white" />
                  <circle cx="25" cy="54" r="5.5" stroke="#A78BFA" strokeWidth={0.5} fill="none" opacity="0.45" />
                  
                  {/* Dark coiled film inner circle */}
                  <circle cx="25" cy="54" r="4.6" fill="white" />
                  <circle cx="25" cy="54" r="4.6" stroke="#4C1D95" strokeWidth={0.8} strokeDasharray="0.8 0.6" fill="none" opacity="0.85" />
                  
                  {/* Detailed Cutout Window Holes forming beautiful metallic spokes */}
                  <circle cx="25.0" cy="50.7" r="1.2" fill="black" stroke="#8B5CF6" strokeWidth={0.4} />
                  <circle cx="28.14" cy="52.98" r="1.2" fill="black" stroke="#8B5CF6" strokeWidth={0.4} />
                  <circle cx="26.94" cy="56.67" r="1.2" fill="black" stroke="#8B5CF6" strokeWidth={0.4} />
                  <circle cx="23.06" cy="56.67" r="1.2" fill="black" stroke="#8B5CF6" strokeWidth={0.4} />
                  <circle cx="21.86" cy="52.98" r="1.2" fill="black" stroke="#8B5CF6" strokeWidth={0.4} />

                  
                  {/* Metallic central hub spindle plate with center hole */}
                  <circle cx="25" cy="54" r="1.8" fill="none" stroke="#C084FC" strokeWidth={0.5} />
                  <circle cx="25" cy="54" r="0.7" fill="black" />

                  {/* Blue Retro TV Icon (TV Show) */}
                  <rect x="33.5" y="42" width="9" height="7" rx="1.5" stroke="#3B82F6" strokeWidth="1.1" fill="none" />
                  <path d="M 36.5,42 L 35,39" stroke="#3B82F6" strokeWidth="0.8" strokeLinecap="round" />
                  <path d="M 39.5,42 L 41,39" stroke="#3B82F6" strokeWidth="0.8" strokeLinecap="round" />
                  <rect x="34.5" y="43.5" width="5.2" height="4" rx="0.6" stroke="#60A5FA" strokeWidth="0.4" fill="none" opacity="0.35" />
                  <circle cx="41" cy="44" r="0.4" fill="none" stroke="#3B82F6" strokeWidth={0.3} />
                  <circle cx="41" cy="45.5" r="0.4" fill="none" stroke="#3B82F6" strokeWidth={0.3} />

                  {/* Cyan Double Musical Note Icon (Music/Audio) */}
                  <circle cx="48.5" cy="39.5" r="1.3" fill="none" stroke="#06B6D4" strokeWidth={0.9} />
                  <circle cx="52.5" cy="38.0" r="1.3" fill="none" stroke="#06B6D4" strokeWidth={0.9} />
                  <path d="M 49.8,39.5 L 49.8,31.5" stroke="#06B6D4" strokeWidth="0.9" strokeLinecap="round" />
                  <path d="M 53.8,38.0 L 53.8,30.0" stroke="#06B6D4" strokeWidth="0.9" strokeLinecap="round" />
                  <path d="M 49.8,32.3 L 53.8,30.8" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M 49.8,34.5 L 53.8,33.0" stroke="#06B6D4" strokeWidth="1.0" strokeLinecap="round" opacity="0.7" />

                  {/* Bare stem (Long stem calamus so hands can hold it) */}
                  <path d="M 8,56 L 22,42" stroke="url(#headerQuillGrad)" strokeWidth="2.8" strokeLinecap="round" />
                  <path d="M 9,55 L 21,43" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />

                  {/* Metal Nib tip */}
                  <path d="M 8,56 L 5,59" stroke="#E2E8F0" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1="5" y1="59" x2="7" y2="57" stroke="#10141D" strokeWidth="0.8" />

                  {/* Elegant Plume/Feather shape starting higher up */}
                  <path d="M 20,44 C 10,34 16,16 42,12 C 46,11 48,15 44,22 C 37,33 29,41 20,44 Z" fill="url(#headerQuillGrad)" />
                  
                  {/* Spine Highlight */}
                  <path d="M 20,44 Q 30,29 42,12" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
                  
                  {/* Sheen along upper curve */}
                  <path d="M 21,42 C 12,32 18,18 41,13" stroke="#F3E8FF" strokeWidth="0.6" fill="none" opacity="0.35" />

                  {/* Barb cuts on BOTH sides */}
                  {/* Left Side Barb cuts */}
                  <path d="M 27,33 Q 19,28 17,32" stroke="#10141D" strokeWidth="0.8" opacity="0.35" />
                  <path d="M 31,28 Q 23,22 21,26" stroke="#10141D" strokeWidth="0.8" opacity="0.35" />
                  <path d="M 35,23 Q 27,17 25,21" stroke="#10141D" strokeWidth="0.8" opacity="0.35" />
                  <path d="M 38,18 Q 30,12 28,16" stroke="#10141D" strokeWidth="0.8" opacity="0.35" />
                  {/* Right Side Symmetrical Barb cuts */}
                  <path d="M 27,33 Q 33,36 35,33" stroke="#10141D" strokeWidth="0.8" opacity="0.35" />
                  <path d="M 31,28 Q 37,31 39,28" stroke="#10141D" strokeWidth="0.8" opacity="0.35" />
                  <path d="M 35,23 Q 41,26 43,23" stroke="#10141D" strokeWidth="0.8" opacity="0.35" />
                  <path d="M 38,18 Q 44,21 46,18" stroke="#10141D" strokeWidth="0.8" opacity="0.35" />
                </svg>

                {/* Big bold elegant header */}
                <h1 className="text-3xl sm:text-[34px] font-[950] tracking-[0.25em] font-sans bg-gradient-to-r from-indigo-300 via-white to-purple-300 bg-clip-text text-transparent leading-none translate-x-[0.125em]">
                  BitScribe
                </h1>
              </div>

              {/* Steward text lockup */}
              <div className="w-full mt-1">
                <p className="text-[10px] sm:text-[11px] font-bold text-[#8B5CF6] tracking-[0.25em] uppercase leading-none text-center pl-1">
                  Digital Media Library Steward
                </p>
              </div>
            </div>
          </div>

          {/* Right subtle statistics feed & Window Controls */}
          <div className="flex sm:flex-col items-center sm:items-end justify-center gap-2 sm:gap-1.5 relative z-20">
            <div id="library-inventory-header-display" className="hidden sm:flex flex-col items-end text-right justify-center mt-0.5">
              <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase leading-none">Library Inventory</span>
              <span className="text-sm font-black font-mono text-blue-400 mt-1 leading-none">{total} items indexed</span>
            </div>

            {/* Window Mode Toggle Button */}
            <button
              onClick={toggleFullscreen}
              id="fullscreen-toggle-btn"
              title={isFullscreen ? "Exit Fullscreen (Esc)" : "Enter Fullscreen"}
              className="py-1.5 sm:py-0.5 px-3 sm:px-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg sm:rounded border border-slate-700/60 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 sm:gap-1 text-xs sm:text-[9px] font-mono font-semibold shadow-inner h-8 sm:h-5"
            >
              {isFullscreen ? (
                <>
                  <Minimize className="w-3.5 h-3.5 sm:w-2.5 sm:h-2.5 text-purple-400" />
                  <span className="hidden lg:inline uppercase tracking-wider leading-none mt-0.5">Exit Full</span>
                </>
              ) : (
                <>
                  <Maximize className="w-3.5 h-3.5 sm:w-2.5 sm:h-2.5 text-cyan-400" />
                  <span className="hidden lg:inline uppercase tracking-wider leading-none mt-0.5">Full Screen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className={isFluidLayout ? "flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0" : "flex-1 flex overflow-hidden min-h-0"}>
        {/* Left Side Navigation & Health Panel */}
        <aside className={isFluidLayout 
          ? "w-full lg:w-64 bg-[#14171F] border-b lg:border-b-0 lg:border-r border-[#1e232e] flex flex-col shrink-0 select-none overflow-hidden min-h-0" 
          : "w-64 bg-[#14171F] border-r border-[#1e232e] flex flex-col shrink-0 select-none overflow-hidden min-h-0"
        }>
{/* Source path section */}
          <div className="flex flex-col gap-4 p-4 flex-1 overflow-y-auto min-h-0 scrollbar-none">
          <section id="paths-section">
            <div className="mb-4">
              <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#8B5CF6] select-none">
                Media Scanner
              </div>
              <div className="h-[1px] bg-gradient-to-r from-[#8B5CF6]/40 via-[#8B5CF6]/10 to-transparent mt-1.5" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                  What to Scan
                </label>
                <button 
                  onClick={() => { handleTabChange("help"); setHelpHighlight("help-discovery"); }}
                  className="w-4 h-4 rounded-full border border-slate-700 text-slate-400 flex items-center justify-center cursor-pointer hover:bg-slate-700 hover:text-white transition-colors flex-shrink-0"
                  title="View Scan Reference Guide"
                >
                  <span className="text-[9px] font-bold leading-none">?</span>
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-none">
                {scanPaths.slice(0, isPathsExpanded ? scanPaths.length : 1).map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-[#1E232E] border border-slate-700/30 rounded px-2 py-1 text-[11px] font-mono text-slate-300"
                  >
                    {editingPathIdx === idx ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editPathInput}
                          onChange={(e) => setEditPathInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && editPathInput.trim()) {
                              const next = [...scanPaths];
                              next[idx].path = editPathInput.trim();
                              setScanPaths(next);
                              setEditingPathIdx(null);
                              setIsPathsExpanded(false);
                              setIsPathsExpanded(false);
                            } else if (e.key === "Escape") {
                              setEditingPathIdx(null);
                              setIsPathsExpanded(false);
                              setIsPathsExpanded(false);
                            }
                          }}
                          className="flex-1 bg-[#0F1117] border border-blue-500/50 text-slate-200 px-2 py-1 rounded focus:outline-none w-0 text-[10px]"
                          autoFocus
                        />
                        <button
                          onClick={() => {
                            if (editPathInput.trim()) {
                              const next = [...scanPaths];
                              next[idx].path = editPathInput.trim();
                              setScanPaths(next);
                              setEditingPathIdx(null);
                              setIsPathsExpanded(false);
                              setIsPathsExpanded(false);
                            }
                          }}
                          className="text-blue-400 hover:text-blue-300 px-1 cursor-pointer font-bold"
                          title="Save"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingPathIdx(null)}
                          className="text-slate-500 hover:text-slate-300 px-1 cursor-pointer font-bold"
                          title="Cancel"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-1.5 w-full">
                        <label className="flex items-center gap-1.5 cursor-pointer truncate flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={item.enabled}
                            onChange={() => {
                              const next = [...scanPaths];
                              next[idx].enabled = !next[idx].enabled;
                              setScanPaths(next);
                            }}
                            className="rounded border-slate-700 text-blue-500 focus:ring-blue-500 bg-slate-800 h-3 w-3 cursor-pointer"
                          />
                          <span
                            className={`truncate ${item.enabled ? "" : "text-slate-500 line-through"}`}
                            title={item.path}
                          >
                            {item.path}
                          </span>
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingPathIdx(idx);
                              setEditPathInput(item.path);
                            }}
                            className="text-slate-500 hover:text-blue-400 px-1 transition-colors cursor-pointer"
                            title="Edit path"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              const next = scanPaths.filter((_, i) => i !== idx);
                              setScanPaths(next);
                            }}
                            className="text-slate-500 hover:text-rose-400 font-bold px-1 transition-colors cursor-pointer"
                            title="Remove path"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {scanPaths.length === 0 && (
                  <div className="py-1"></div>
                )}
              </div>
              <div className="mt-1 flex justify-center pb-2">
                {!isPathsExpanded && scanPaths.length > 1 && (
                  <div 
                    className="text-[10px] text-slate-500 font-bold italic py-1 text-center cursor-pointer hover:text-blue-400 select-none group"
                    onClick={() => setIsPathsExpanded(true)}
                  >
                    + {scanPaths.length - 1} more <span className="text-slate-600 font-normal ml-1">(click to expand)</span>
                  </div>
                )}
                {isPathsExpanded && scanPaths.length > 1 && (
                  <div 
                    className="text-[10px] text-slate-500 font-bold italic py-1 text-center cursor-pointer hover:text-slate-300 select-none group flex items-center justify-center gap-1 mt-1"
                    onClick={() => setIsPathsExpanded(false)}
                    title="Collapse list"
                  >
                    <svg className="w-3 h-3 text-slate-600 group-hover:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                    Collapse list
                  </div>
                )}
              </div>
              {isAddingPathApp ? (
                <div className="mt-3 flex flex-col gap-2">
                  
                  <div className="flex gap-2">
                    <button onClick={handleBrowseFolder} className="bg-blue-600 hover:bg-blue-500 text-white px-2 rounded flex items-center justify-center transition-colors shadow shadow-blue-900/20 text-[10px] font-semibold" title="Browse for folder"><FolderOpen className="w-3.5 h-3.5" /></button>
                    <input
                      type="text"
                      value={newPathInputApp}
                      onChange={(e) => setNewPathInputApp(e.target.value)}
                      placeholder="Enter full directory path..."
                      autoFocus
                      className="flex-1 bg-[#1E232E] border border-blue-500/50 text-slate-200 px-2.5 py-1 text-[11px] rounded focus:outline-none w-0"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newPathInputApp.trim()) {
                          setScanPaths([
                            ...scanPaths,
                            { path: newPathInputApp.trim(), enabled: true },
                          ]);
                          setNewPathInputApp("");
                          setIsAddingPathApp(false);
                          setIsPathsExpanded(false);
                          setIsPathsExpanded(false);
                        }
                        if (e.key === "Escape") {
                          setIsAddingPathApp(false);
                          setIsPathsExpanded(false);
                          setIsPathsExpanded(false);
                          setNewPathInputApp("");
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setIsAddingPathApp(false);
                          setIsPathsExpanded(false);
                          setIsPathsExpanded(false);
                        setNewPathInputApp("");
                      }}
                      className="flex-1 py-1 px-1.5 bg-transparent border border-slate-700 hover:border-slate-500 text-slate-400 rounded text-[11px] font-bold transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (newPathInputApp.trim()) {
                          setScanPaths([
                            ...scanPaths,
                            { path: newPathInputApp.trim(), enabled: true },
                          ]);
                          setNewPathInputApp("");
                          setIsAddingPathApp(false);
                          setIsPathsExpanded(false);
                          setIsPathsExpanded(false);
                        }
                      }}
                      className="flex-1 py-1 px-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold shadow transition-all cursor-pointer text-center"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-1.5 mt-3">
                  <button
                    onClick={() => { setIsAddingPathApp(true); setIsPathsExpanded(true); }}
                    className="flex-1 py-1 px-2 bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 hover:border-blue-500/50 text-blue-400 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>+ Add Folder</span>
                  </button>
                  <button
                    onClick={() => {
                      setConfirmAction({ message: "Are you sure you want to clear all scan paths? This action cannot be undone.", onConfirm: () => setScanPaths([]) }); if (false) {
                        setScanPaths([]);
                      }
                    }}
                    disabled={scanPaths.length === 0}
                    className="flex-1 py-1 px-2 bg-[#1A1D27] hover:bg-red-500/10 border border-slate-700/50 hover:border-red-500/30 text-red-400 disabled:text-slate-600 disabled:border-slate-800 disabled:bg-[#151821] rounded text-[11px] font-bold transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    <span>Clear All</span>
                  </button>
                </div>
              )}

            </div>
          </section>

          <div id="scan-controls-section" className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-700/50">
                {/* Start, Pause, Stop row */}
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      handleStartScan();
                      if (activeTab === "logs") {
                        handleTabChange("scan");
                      }
                    }}
                    disabled={
                      isScanning || scanPaths.filter((p) => p.enabled).length === 0
                    }
                    className="flex-1 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/30 text-white rounded text-[11px] font-bold shadow transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                    title="Start or resume scanning"
                  >
                    <svg className={`w-3 h-3 ${isScanning ? "animate-pulse" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    <span>{isResumeState ? "Resume" : "Start"}</span>
                  </button>

                  <button
                    onClick={() => {
                      handlePauseScan();
                      if (activeTab === "logs") {
                        handleTabChange("scan");
                      }
                    }}
                    disabled={!isScanning}
                    className="flex-1 py-1 bg-orange-600 hover:bg-orange-500 disabled:bg-[#1E232E] disabled:text-slate-500 text-white rounded text-[11px] font-bold shadow transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                    title="Pause current scan"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    <span>Pause</span>
                  </button>

                  <button
                    onClick={() => {
                      handleStopScan();
                      if (activeTab === "logs") {
                        handleTabChange("scan");
                      }
                    }}
                    disabled={!isScanning && !isResumeState}
                    className="flex-1 py-1 bg-rose-600 hover:bg-rose-500 disabled:bg-[#1E232E] disabled:text-slate-500 text-white rounded text-[11px] font-bold shadow transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                    title="Stop scan and reset"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="4" y="4" width="16" height="16" rx="1"></rect>
                    </svg>
                    <span>Stop</span>
                  </button>
                </div>

                {/* Secondary Actions row */}
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={() => {
                      handleStartScan(true);
                      if (activeTab === "logs") {
                        handleTabChange("scan");
                      }
                    }}
                    disabled={isScanning || scanPaths.filter((p) => p.enabled).length === 0}
                    className="flex-[1.2] flex justify-center items-center gap-1 py-1 px-1 bg-indigo-900/30 hover:bg-indigo-800/40 disabled:bg-indigo-900/10 text-indigo-300 disabled:text-indigo-800 rounded text-[10px] font-medium border border-indigo-700/50 hover:border-indigo-500 transition-all cursor-pointer shadow-md disabled:cursor-not-allowed whitespace-nowrap"
                    title="Quickly checks for new or modified files without re-scanning unchanged items"
                  >
                    <svg className={`w-2.5 h-2.5 shrink-0 ${isScanning ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                    <span>Quick Refresh</span>
                  </button>
                  <button
                    onClick={() => {
                      handleEvaluateDb();
                      if (activeTab === "logs") {
                        handleTabChange("scan");
                      }
                    }}
                    disabled={isScanning || scannedFilesList.length === 0}
                    className="flex-[1.2] flex justify-center items-center gap-1 py-1 px-1 bg-amber-900/30 hover:bg-amber-800/40 disabled:bg-amber-900/10 text-amber-300 disabled:text-amber-800 rounded text-[10px] font-medium border border-amber-700/50 hover:border-amber-500 transition-all cursor-pointer shadow-md disabled:cursor-not-allowed whitespace-nowrap"
                    title="Evaluate Streaming Compatibility on the existing database without disk scan"
                  >
                    <span>Stream</span>
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </button>

                </div>
              </div>

          

          {/* Action Trigger Buttons section */}
          <section id="export-section" className="space-y-3 bg-[#1A1D27]/30 border border-slate-805/30 p-3 rounded-lg">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
              Export Formats
            </label>
            <div className="flex justify-between items-center text-[11px] text-slate-400 mb-2 select-none">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200" title="Export as an advanced spreadsheet report (Requires Excel.js)">
                <input
                  type="checkbox"
                  checked={exportFormats.xlsx}
                  onChange={() =>
                    setExportFormats({
                      ...exportFormats,
                      xlsx: !exportFormats.xlsx,
                    })
                  }
                  className="rounded bg-[#0F1117] border-slate-700 text-blue-500 focus:ring-0 h-3 w-3 cursor-pointer shrink-0"
                />
                <span>XLSX</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200" title="View reports directly in the browser via an interactive HTML file">
                <input
                  type="checkbox"
                  checked={exportFormats.html}
                  onChange={() =>
                    setExportFormats({
                      ...exportFormats,
                      html: !exportFormats.html,
                    })
                  }
                  className="rounded bg-[#0F1117] border-slate-700 text-blue-500 focus:ring-0 h-3 w-3 cursor-pointer shrink-0"
                />
                <span>HTML</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200" title="Export data as a raw comma-separated values file">
                <input
                  type="checkbox"
                  checked={exportFormats.csv}
                  onChange={() =>
                    setExportFormats({
                      ...exportFormats,
                      csv: !exportFormats.csv,
                    })
                  }
                  className="rounded bg-[#0F1117] border-slate-700 text-blue-500 focus:ring-0 h-3 w-3 cursor-pointer shrink-0"
                />
                <span>CSV</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200" title="Export raw JSON data">
                <input
                  type="checkbox"
                  checked={exportFormats.json}
                  onChange={() =>
                    setExportFormats({
                      ...exportFormats,
                      json: !exportFormats.json,
                    })
                  }
                  className="rounded bg-[#0F1117] border-slate-700 text-blue-500 focus:ring-0 h-3 w-3 cursor-pointer shrink-0"
                />
                <span>JSON</span>
              </label>
            </div>
            
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
              Report Type
            </label>
            <div id="export-profile-dropdown-container" className="flex flex-col gap-2.5 text-[11px] text-slate-400 mb-3 select-none relative">
              <select 
                value={exportProfile}
                onChange={(e) => setExportProfile(e.target.value)}
                className="w-full bg-[#1A1D24] border border-[#2A303C] rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 text-slate-300 relative z-10"
              >
                <option value="Media Discovery">Media Discovery (Full)</option>
                <option value="Modern Direct Play">Stream Audit</option>
                <option value="Metadata Audit">Metadata Audit</option>
                <option value="Duplication Scan">Duplication Audit</option>
                <option value="Quality Audit">Quality Audit</option>
                <option value="Subtitle Audit">Subtitle Audit</option>
                <option value="Corrupted">Failed/Corrupted Only</option>
                <option value="Export All">Export All Report Types</option>
                <option value="Custom Fields">Custom Fields (Custom Columns)</option>
              </select>
              {fakeExportMenu.show && (
                <div className="absolute top-full left-0 mt-1 w-full bg-[#0C101B] border border-[#2A303C] rounded shadow-2xl z-[100000] overflow-hidden text-[10px] animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col py-1">
                    {[
                      { val: "Media Discovery", label: "Media Discovery (Full)" },
                      { val: "Modern Direct Play", label: "Stream Audit" },
                      { val: "Metadata Audit", label: "Metadata Audit" },
                      { val: "Duplication Scan", label: "Duplication Audit" },
                      { val: "Quality Audit", label: "Quality Audit" },
                      { val: "Subtitle Audit", label: "Subtitle Audit" },
                      { val: "Corrupted", label: "Failed/Corrupted Only" },
                      { val: "Export All", label: "Export All Report Types" },
                      { val: "Custom Fields", label: "Custom Fields (Custom Columns)" }
                    ].map(opt => (
                      <div key={opt.val} className={`px-2 py-1.5 ${fakeExportMenu.highlight === opt.val ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-slate-300'}`}>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {exportProfile === "Custom Fields" && (
                <div ref={customColumnsMenuRef} className="relative mt-2">
                  <button
                    type="button"
                    id="btn-custom-fields-popover"
                    onClick={() => setShowCustomColumnsMenu(!showCustomColumnsMenu)}
                    className="w-full flex items-center justify-between gap-1 bg-[#1A1D24] hover:bg-slate-700 border border-[#2A303C] hover:border-blue-500/50 px-2 py-1.5 rounded text-[10px] font-bold text-slate-300 transition-all cursor-pointer h-[26px]"
                  >
                    <span className="flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-blue-400" />
                      <span>Customize Columns</span>
                    </span>
                    <span className="text-[9px] text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                      {Object.values(excelColumns).filter(Boolean).length} Active
                    </span>
                  </button>
                  
                  {showCustomColumnsMenu && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0C101B] border border-slate-700 rounded-xl shadow-2xl p-3 z-[100000] space-y-2.5 max-h-[260px] overflow-y-auto scrollbar-thin">
                      <div className="flex justify-between items-center pb-1.5 border-b border-slate-800">
                        <div>
                          <h4 className="text-[10px] font-extrabold text-slate-200 uppercase tracking-wider">Report Columns</h4>
                          <p className="text-[9px] text-slate-500">Enable/disable fields for custom export</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCustomColumnsMenu(false)}
                          className="text-[10px] text-blue-400 hover:text-blue-300 font-extrabold uppercase tracking-wider bg-transparent border-0 p-0 cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                      <div className="flex flex-col gap-1 pr-0.5">
                        {Object.keys(excelColumns).map((colName) => {
                          const isChecked = excelColumns[colName];
                          return (
                            <label
                              key={colName}
                              className={`flex items-center gap-2 p-1.5 rounded border text-[10px] font-semibold cursor-pointer select-none transition ${
                                isChecked
                                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                  : "bg-slate-900/40 border-slate-800/60 text-slate-500 hover:text-slate-400"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setExcelColumns(prev => ({ ...prev, [colName]: !isChecked }));
                                }}
                                className="rounded border-slate-700 text-blue-500 bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
                              />
                              <span className="truncate">{colName === "Stream Audit" ? "Stream Friendly?" : colName}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (scannedFilesList.length === 0 && corruptFiles.length === 0) {
                    alert(
                      "No scanned media files to export. Please trigger scan media process first.",
                    );
                    return;
                  }
                  if (
                    !exportFormats.xlsx &&
                    !exportFormats.csv &&
                    !exportFormats.html &&
                    !exportFormats.json
                  ) {
                    alert(
                      "Please select at least one format checkbox to export.",
                    );
                    return;
                  }

                  
                  // Generate custom rules based on profile selection, overriding current if needed
                  const runExportForProfile = async (targetProfile: string, targetDir?: string, totalReports: number = 1, currentReportIndex: {val: number} = {val:0}) => {
                    const profileRules = JSON.parse(JSON.stringify(customRules));
                    
                    profileRules.useDiscoveryPreset = false;
                    profileRules.useModernPreset = false;
                    profileRules.useLegacyPreset = false;
                    profileRules.useMetadataScan = false;
                    profileRules.useVideoMetadataScan = false;
                    profileRules.useMusicMetadataScan = false;
                    profileRules.useDuplicationScan = false;
                    profileRules.useDuplicationVideoScan = false;
                    profileRules.useDuplicationMusicScan = false;
                    profileRules.useAnomalyScan = false;
                    profileRules.useSubtitleScan = false;

                    if (targetProfile === "Media Discovery") {
                      profileRules.useDiscoveryPreset = true;
                    } else if (targetProfile === "Modern Direct Play") {
                      profileRules.useModernPreset = true;
                    } else if (targetProfile === "Metadata Audit") {
                      profileRules.useMetadataScan = true;
                    } else if (targetProfile === "Duplication Scan") {
                      profileRules.useDuplicationScan = true;
                    } else if (targetProfile === "Quality Audit") {
                      profileRules.useAnomalyScan = true;
                    } else if (targetProfile === "Subtitle Audit") {
                       profileRules.useSubtitleScan = true;
                    }

                    let filteredItems = [...scannedFilesList, ...corruptFiles];
                    
                    const duplicatesMap = computeDuplicatesMap(filteredItems, profileRules);
                    filteredItems = filteredItems.map(item => {
                         const isDup = duplicatesMap.get(item.id) ?? false;
                         const evalResult = evaluatePlexCompatibility(item, profileRules, isDup, true);
                         return {
                             ...item,
                             streamFriendlyLevel: evalResult.level,
                             streamFriendlyReason: evalResult.reason,
                             streamFriendlySuggestion: evalResult.suggestion,
                             streamFriendlyEvaluated: 1
                         };
                    });
                    
                    if (targetProfile === "Corrupted") {
                      filteredItems = corruptFiles;
                    } else {
                      filteredItems = filterItemsForReport(filteredItems, profileRules);
                    }

                    if (filteredItems.length === 0) return { success: 0, fail: 0 };

                    let jsonCsvItems = filteredItems.filter(item => item.category !== 'Unrecognized' && item.topLevelFolder !== 'Unrecognized');

                    let s = 0, f = 0;
                    
                    const updateUI = (filename: string) => {
                      setCurrentExportFile(filename);
                      setExportProgress(Math.round(((currentReportIndex.val) / Math.max(totalReports, 1)) * 100));
                    };

                    const handleExport = async (format: string, exporter: Function) => {
                      updateUI(`${targetProfile} (${format})`);
                      try {
                        const fname = await exporter();
                        s++;
                        setScanLogs(prev => [`[SUCCESS] Exported ${fname}`, ...prev]);
                      } catch (e: any) {
                        f++;
                        console.error("Export Error in " + targetProfile + " " + format, e);
                        setScanLogs(prev => [`[ERROR] Failed to export ${targetProfile} (${format}): ${e.message}`, ...prev]);
                      }
                      currentReportIndex.val++;
                      updateUI(`${targetProfile} (${format}) done`);
                    };

                    const allItems = [...scannedFilesList, ...corruptFiles];
                    if (exportFormats.xlsx) await handleExport('XLSX', () => exportMediaLibraryToExcel(filteredItems, profileRules, excelColumns, targetDir, allItems));
                    if (exportFormats.csv) await handleExport('CSV', () => exportMediaLibraryToCSV(jsonCsvItems, profileRules, excelColumns, targetDir, allItems));
                    if (exportFormats.html) await handleExport('HTML', () => exportMediaLibraryToHTML(filteredItems, profileRules, excelColumns, targetDir, allItems));
                    if (exportFormats.json) await handleExport('JSON', () => exportMediaLibraryToJSON(jsonCsvItems, profileRules, targetDir, allItems));
                    
                    return { success: s, fail: f };
                  };

                  const doExport = async () => {
                    if (scannedFilesList.length === 0 && corruptFiles.length === 0) {
                       setNotification({ type: 'error', message: "No data available to export." });
                       setTimeout(() => setNotification(null), 8000);
                       return;
                    }
                    
                    let targetDir = exportDirectory;
                    if (!targetDir && typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
                        const selected = await open({ directory: true, multiple: false });
                        if (selected && typeof selected === "string") {
                            targetDir = selected;
                        } else {
                            return; // User cancelled
                        }
                    }

                    setIsExporting(true);
                    setExportProgress(0);
                    setCurrentExportFile("Starting exports...");
                    setExportCompleteMsg("");
                    
                    const activeFormatCount = Object.values(exportFormats).filter(Boolean).length;
                    
                    setTimeout(async () => {
                      try {
                        let totalS = 0, totalF = 0;
                        let totalReports = 0;
                        const idx = { val: 0 };
                        
                        const profilesToRun = exportProfile === "Export All" ? [
                            "Media Discovery", "Modern Direct Play", "Metadata Audit", 
                            "Duplication Scan", "Quality Audit", "Subtitle Audit", "Corrupted"
                        ] : [exportProfile];
                        
                        totalReports = profilesToRun.length * activeFormatCount;
  
                        for (const p of profilesToRun) {
                          const res = await runExportForProfile(p, targetDir, totalReports, idx);
                          totalS += res.success;
                          totalF += res.fail;
                        }
                        
                        setExportProgress(100);
                        setCurrentExportFile("Done!");
                        
                        const displayDir = targetDir || "your selected folder";
                        const msg = `${totalS} ${totalS === 1 ? 'file' : 'files'} succeeded, ${totalF} ${totalF === 1 ? 'file' : 'files'} failed. Reports generated to ${displayDir}.`;
                        
                        setNotification({ type: 'export', message: msg });
                        handleTabChange("scan");
                        setScanLogs(prev => [`Export summary: ${totalS} succeeded, ${totalF} failed. Location: ${displayDir}`, ...prev]);
                        setExportCompleteMsg("Export complete!");
                        setTimeout(() => setExportCompleteMsg(""), 5000);
                      } catch(e: any) {
                        console.error("Export error:", e);
                        setNotification({ type: 'error', message: "Error during export: " + (e.message || String(e)) });
                        setExportCompleteMsg("Error during export.");
                        setTimeout(() => setExportCompleteMsg(""), 5000);
                      } finally {
                        setIsExporting(false);
                      }
                    }, 50);
                  };
                  doExport();
                }}
                className="w-full py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center justify-center gap-1.5 text-[11px] font-bold shadow transition-all cursor-pointer"
              >
                <span>{isExporting ? "Exporting..." : "Export Report"}</span>
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  ></path>
                </svg>
              </button>
            </div>
            <div className="text-[9px] text-slate-500 mt-2 text-center border-t border-slate-700/50 pt-2 pb-1 mx-1 italic leading-relaxed">
              Reports were sent to Downloads\\BitScribe Reports\\
            </div>
          </section>
          </div>
          {/* Troubleshooting section */}
          <section id="troubleshooting-section" className="space-y-1.5 bg-[#14171F] border-t border-slate-700/50 p-4 z-20 shrink-0">
            <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
              Troubleshooting
            </label>
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setShowDiagnostic((prev) => !prev);
                    if (activeTab === "logs") {
                      handleTabChange("scan");
                    }
                  }}
                  title="Toggles the diagnostic panel that alerts on general database setup issues or API status."
                  className={`flex-1 py-1 px-2 rounded text-left text-[11px] font-semibold flex items-center justify-between border transition duration-150 cursor-pointer ${
                    showDiagnostic
                      ? "bg-blue-600/20 border-blue-500/50 text-blue-300 font-bold"
                      : "bg-transparent border-slate-700/50 text-slate-400 hover:border-slate-500 font-medium"
                  }`}
                >
                  <span>Diagnostic</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${showDiagnostic ? "bg-blue-400 shadow-sm shadow-blue-400/50" : "bg-slate-600"}`}
                  ></span>
                </button>
                <button
                  onClick={() => {
                    if (activeTab === "logs") {
                      handleTabChange(previousTab);
                    } else {
                      handleTabChange("logs");
                    }
                  }}
                  title="View detailed Application and Console Logs"
                  className={`flex-1 py-1 px-2 rounded text-left text-[11px] font-semibold flex items-center justify-between border transition duration-150 cursor-pointer ${
                    activeTab === 'logs'
                      ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-300 font-bold"
                      : "bg-transparent border-slate-700/50 text-slate-400 hover:border-slate-500 font-medium"
                  }`}
                >
                  <span>Logs</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${activeTab === 'logs' ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-slate-600"}`}
                  ></span>
                </button>
              </div>
              <div className="flex gap-1.5 mt-1">
                <button
                  onClick={() => {
                    let startStep = 0;
                    if (activeTab === "library") startStep = 21;
                    else if (activeTab === "rules") startStep = 26;
                    else if (activeTab === "help") startStep = 35;

                    if (scannedFilesList.length < 5) {
                      localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: "active", startStep }));
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
                      return;
                    }
                    localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: "active", startStep }));
                    setTourStepIndex(startStep);
                    setShowTour(true);
                  }}
                  className="flex-1 flex justify-center items-center gap-1 py-1 px-1 bg-indigo-950/30 hover:bg-indigo-900/40 text-indigo-300 rounded text-[10px] font-medium border border-indigo-900/50 hover:border-indigo-700 transition-all cursor-pointer shadow-md whitespace-nowrap"
                  title="Restart the interactive product tour guide."
                >
                  <span>Show Tour</span>
                </button>
                                <button
                  onClick={() => {
                    setConfirmAction({
                      message: "Are you sure you want to clear your local cache? This will clear your dashboard view history but safely preserve the database.",
                      onConfirm: () => {
                        localStorage.removeItem("bitscribe_scan_logs");
                        localStorage.removeItem("plex_last_scan_timestamp");
                        localStorage.removeItem("bitscribe_scan_in_progress");
                        setScanLogs([]);
                        setScannedFiles([]);
                        setScannedFilesList([]);
                        setCorruptFiles([]);
                        setHasCompletedScan(false);
                        setNotification("Local display cache cleared successfully.");
                      }
                    });
                  }}
                  className="flex-1 flex justify-center items-center gap-1 py-1 px-1 bg-[#1E232E] hover:bg-slate-800 text-slate-300 rounded text-[10px] font-medium border border-slate-700/50 hover:border-slate-500 transition-all cursor-pointer shadow-md whitespace-nowrap"
                  title="Clear local browser cache. Safe to do, does not delete your library."
                >
                  <span>Clear Cache</span>
                </button>
              </div>

            </div>
          </section>
        </aside>

        {/* Right Main Content Panel */}
        <main className="flex-1 flex flex-col bg-[#0F1117] overflow-hidden min-h-0">
          {/* Tab Selection Navigation Header */}
          <div className="flex items-center px-6 pt-5 gap-8 border-b border-[#1e232e] shrink-0 bg-[#0F1117]">
            <button
              title="Review Dashboard for Media Library statistics  and  audit overviews"
              onClick={() => handleTabChange("scan")}
              className={`pb-3.5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "scan"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              Analyze ({total})
            </button>
            <button
              title="Open Library Browser"
              onClick={() => handleTabChange("library")}
              className={`pb-3.5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "library"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              Library
            </button>

            <button
              title="Configure scanning rules, compatibility profiles, and database tools"
              onClick={() => handleTabChange("rules")}
              className={`pb-3.5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "rules"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              Options
            </button>
            <button
              title="Read Documentation & FAQs" onClick={() => handleTabChange("help")}
              className={`pb-3.5 border-b-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "help"
                  ? "border-blue-500 text-white"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              Help
            </button>
          </div>
          
          

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