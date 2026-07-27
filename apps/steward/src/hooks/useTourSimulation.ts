import confetti from "canvas-confetti";
import { useEffect } from 'react';
import { scrollToElement } from '../utils/domHelpers';

export function useTourSimulation({
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
}: any) {
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
}
