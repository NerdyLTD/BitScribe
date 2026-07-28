import React from "react";
import {
  GripHorizontal,
  X as CloseIcon,
  List,
  ChevronUp,
  ChevronDown,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { BitsyCharacter } from "@bitscribe/ui-components";

interface TourRemoteControlProps {
  showTour: boolean;
  tourPosition: { x: number; y: number };
  isTourDragging: boolean;
  handleTourMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  tourStepIndex: number;
  tourSteps: any[];
  activeDemo: 'hover' | 'click' | 'type' | 'wait' | number | null;
  setActiveDemo: (val: 'hover' | 'click' | 'type' | 'wait' | number | null) => void;
  isDemoPaused: boolean;
  setIsDemoPaused: (val: boolean) => void;
  demoClickedSteps: number[];
  setDemoClickedSteps: React.Dispatch<React.SetStateAction<number[]>>;
  demoReelTarget: string | null;
  demoMessage: { text: string; targetId?: string; position?: 'top' | 'bottom' | 'right' | 'left'; offset?: number } | null;
  goToTourStep: (stepIdx: number) => void;
  finishTour: () => void;
  cancelTour: () => void;
  remindLaterTour: () => void;
  tourMenuOpen: boolean;
  setTourMenuOpen: (val: boolean) => void;
}

export const TourRemoteControl: React.FC<TourRemoteControlProps> = ({
  showTour,
  tourPosition,
  isTourDragging,
  handleTourMouseDown,
  tourStepIndex,
  tourSteps,
  activeDemo,
  setActiveDemo,
  isDemoPaused,
  setIsDemoPaused,
  demoClickedSteps,
  setDemoClickedSteps,
  demoReelTarget,
  demoMessage,
  goToTourStep,
  finishTour,
  cancelTour,
  remindLaterTour,
  tourMenuOpen,
  setTourMenuOpen,
}) => {
  if (!showTour) return null;

  return (
    <div
      id="tour-remote-panel"
      onMouseDown={handleTourMouseDown}
      style={{ transform: `translate3d(${tourPosition.x}px, ${tourPosition.y}px, 0)` }}
      className={`fixed bottom-6 right-6 z-[100005] bg-[#1e2330]/95 border-2 border-indigo-500/40 p-4 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.3)] backdrop-blur-md w-56 flex flex-col gap-3 font-sans select-none animate-in fade-in slide-in-from-bottom-5 transition-transform ${
        isTourDragging
          ? 'cursor-grabbing scale-[1.01] border-indigo-500/60 shadow-[0_0_40px_rgba(99,102,241,0.45)] duration-75'
          : 'duration-700 ease-in-out'
      }`}
    >
      {tourStepIndex > 0 && !(tourSteps[tourStepIndex] as any)?.isIntro && (
        <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 pointer-events-none drop-shadow-2xl z-[100000]">
          <BitsyCharacter
            className="w-16 h-16 animate-float-subtle drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]"
            talking={activeDemo !== null}
            pointing={false}
            mood={activeDemo !== null ? "excited" : "happy"}
            targetSelector={
              activeDemo !== null
                ? (demoReelTarget || demoMessage?.targetId || null)
                : (showTour && tourStepIndex > 0 ? (tourSteps[tourStepIndex]?.target as string) : null)
            }
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
              Tour Roadmap ({tourSteps.length} Steps)
            </div>
            <ul className="flex flex-col gap-0.5">
              {tourSteps.map((step, idx) => {
                const isActive = idx === tourStepIndex;
                return (
                  <li key={idx}>
                    <button
                      onClick={() => {
                        goToTourStep(idx);
                        setTourMenuOpen(false);
                      }}
                      className={`w-full text-left py-1 px-2 rounded-md text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600/35 border border-indigo-500/40 text-indigo-200'
                          : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-transparent'
                      }`}
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
          <span>Step {tourStepIndex + 1} of {tourSteps.length}</span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(99,102,241,0.5)]"
            style={{ width: `${((tourStepIndex + 1) / tourSteps.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Contextual Interactive Demos */}
      {[3, 8, 22, 35, 36, 37].includes(tourStepIndex) && (
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
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
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
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            goToTourStep(tourStepIndex - 1);
          }}
          disabled={tourStepIndex === 0}
          className="flex-1 flex items-center justify-center gap-0.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-300 border border-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (tourStepIndex === tourSteps.length - 1) {
              finishTour();
            } else {
              goToTourStep(tourStepIndex + 1);
            }
          }}
          className="flex-1 flex items-center justify-center gap-0.5 py-1.5 px-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-indigo-500/20 hover:scale-[1.02] cursor-pointer"
        >
          {tourStepIndex === tourSteps.length - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-3.5 h-3.5" />
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
  );
};

export default TourRemoteControl;
