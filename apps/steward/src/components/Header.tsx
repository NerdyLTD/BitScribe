import React from "react";
import { Maximize, Minimize } from "lucide-react";

interface HeaderProps {
  activeModeName: string;
  handleHeaderModeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  MODE_DESCRIPTIONS: Record<string, string>;
  handleTabChange: (tab: "scan" | "library" | "rules" | "help" | "logs") => void;
  total: number;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeModeName,
  handleHeaderModeChange,
  MODE_DESCRIPTIONS,
  handleTabChange,
  total,
  toggleFullscreen,
  isFullscreen,
}) => {
  return (
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
                <path d="M 5,59 Q 10,61 14,57.5 T 21,54.5" stroke="url(#headerQuillGrad)" strokeWidth="1.2" fill="none" opacity="0.85" />

                {/* Curving wavy tail of celluloid film strip trailing out the back of the reel in the opposite direction */}
                <path d="M 28,55.0 C 35,59.5 45,43.5 60,44.0 L 60,56.0 C 45,50.0 35,63.0 28,58.5 Z" fill="none" stroke="#A78BFA" strokeWidth="0.8" opacity="0.95" />
                {/* Celluloid Frame Division Lines */}
                <line x1="36" y1="55.1" x2="36" y2="59.2" stroke="#8B5CF6" strokeWidth="0.6" opacity="0.8" />
                <line x1="44" y1="51.0" x2="44" y2="56.7" stroke="#8B5CF6" strokeWidth="0.6" opacity="0.8" />
                <line x1="52" y1="46.1" x2="52" y2="54.5" stroke="#8B5CF6" strokeWidth="0.6" opacity="0.8" />

                {/* Dual sprocket holes trailing along top and bottom */}
                <path d="M 28,55.7 C 35,60.2 45,44.2 60,44.7" stroke="#C084FC" strokeWidth="0.7" strokeDasharray="0.8 1.0" fill="none" opacity="0.85" />
                <path d="M 28,57.7 C 35,62.2 45,49.2 60,55.2" stroke="#C084FC" strokeWidth="0.7" strokeDasharray="0.8 1.0" fill="none" opacity="0.85" />

                {/* Amethyst & Silver Film Reel */}
                <circle cx="25" cy="54" r="6.5" fill="none" opacity="0.3" />
                <circle cx="25" cy="54" r="6.5" stroke="#8B5CF6" strokeWidth={1.3} fill="white" />
                <circle cx="25" cy="54" r="5.5" stroke="#A78BFA" strokeWidth={0.5} fill="none" opacity="0.45" />
                
                {/* Dark coiled film inner circle */}
                <circle cx="25" cy="54" r="4.6" fill="white" />
                <circle cx="25" cy="54" r="4.6" stroke="#4C1D95" strokeWidth={0.8} strokeDasharray="0.8 0.6" fill="none" opacity="0.85" />
                
                {/* Cutout Window Holes */}
                <circle cx="25.0" cy="50.7" r="1.2" fill="black" stroke="#8B5CF6" strokeWidth={0.4} />
                <circle cx="28.14" cy="52.98" r="1.2" fill="black" stroke="#8B5CF6" strokeWidth={0.4} />
                <circle cx="26.94" cy="56.67" r="1.2" fill="black" stroke="#8B5CF6" strokeWidth={0.4} />
                <circle cx="23.06" cy="56.67" r="1.2" fill="black" stroke="#8B5CF6" strokeWidth={0.4} />
                <circle cx="21.86" cy="52.98" r="1.2" fill="black" stroke="#8B5CF6" strokeWidth={0.4} />

                {/* Metallic central hub spindle plate */}
                <circle cx="25" cy="54" r="1.8" fill="none" stroke="#C084FC" strokeWidth={0.5} />
                <circle cx="25" cy="54" r="0.7" fill="black" />

                {/* Blue Retro TV Icon */}
                <rect x="33.5" y="42" width="9" height="7" rx="1.5" stroke="#3B82F6" strokeWidth="1.1" fill="none" />
                <path d="M 36.5,42 L 35,39" stroke="#3B82F6" strokeWidth="0.8" strokeLinecap="round" />
                <path d="M 39.5,42 L 41,39" stroke="#3B82F6" strokeWidth="0.8" strokeLinecap="round" />
                <rect x="34.5" y="43.5" width="5.2" height="4" rx="0.6" stroke="#60A5FA" strokeWidth="0.4" fill="none" opacity="0.35" />
                <circle cx="41" cy="44" r="0.4" fill="none" stroke="#3B82F6" strokeWidth={0.3} />
                <circle cx="41" cy="45.5" r="0.4" fill="none" stroke="#3B82F6" strokeWidth={0.3} />

                {/* Cyan Double Musical Note Icon */}
                <circle cx="48.5" cy="39.5" r="1.3" fill="none" stroke="#06B6D4" strokeWidth={0.9} />
                <circle cx="52.5" cy="38.0" r="1.3" fill="none" stroke="#06B6D4" strokeWidth={0.9} />
                <path d="M 49.8,39.5 L 49.8,31.5" stroke="#06B6D4" strokeWidth="0.9" strokeLinecap="round" />
                <path d="M 53.8,38.0 L 53.8,30.0" stroke="#06B6D4" strokeWidth="0.9" strokeLinecap="round" />
                <path d="M 49.8,32.3 L 53.8,30.8" stroke="#06B6D4" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M 49.8,34.5 L 53.8,33.0" stroke="#06B6D4" strokeWidth="1.0" strokeLinecap="round" opacity="0.7" />

                {/* Bare stem */}
                <path d="M 8,56 L 22,42" stroke="url(#headerQuillGrad)" strokeWidth="2.8" strokeLinecap="round" />
                <path d="M 9,55 L 21,43" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />

                {/* Metal Nib tip */}
                <path d="M 8,56 L 5,59" stroke="#E2E8F0" strokeWidth="2.2" strokeLinecap="round" />
                <line x1="5" y1="59" x2="7" y2="57" stroke="#10141D" strokeWidth="0.8" />

                {/* Elegant Plume/Feather shape */}
                <path d="M 20,44 C 10,34 16,16 42,12 C 46,11 48,15 44,22 C 37,33 29,41 20,44 Z" fill="url(#headerQuillGrad)" />
                
                {/* Spine Highlight */}
                <path d="M 20,44 Q 30,29 42,12" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
                
                {/* Sheen along upper curve */}
                <path d="M 21,42 C 12,32 18,18 41,13" stroke="#F3E8FF" strokeWidth="0.6" fill="none" opacity="0.35" />

                {/* Barb cuts */}
                <path d="M 27,33 Q 19,28 17,32" stroke="#10141D" strokeWidth="0.8" opacity="0.35" />
                <path d="M 31,28 Q 23,22 21,26" stroke="#10141D" strokeWidth="0.8" opacity="0.35" />
                <path d="M 35,23 Q 27,17 25,21" stroke="#10141D" strokeWidth="0.8" opacity="0.35" />
                <path d="M 38,18 Q 30,12 28,16" stroke="#10141D" strokeWidth="0.8" opacity="0.35" />
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
  );
};

export default Header;
