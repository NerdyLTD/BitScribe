import React from 'react';
import { Layers, Sparkles, FolderOpen, Settings, HelpCircle } from 'lucide-react';

interface HeaderProps {
  activeMode: string;
  onModeChange: (mode: string) => void;
  itemCount: number;
  selectedCount: number;
  onLoadDatabase?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeMode,
  onModeChange,
  itemCount,
  selectedCount,
  onLoadDatabase,
}) => {
  return (
    <header className="border-b border-red-950/40 bg-[#0b0d13]/90 backdrop-blur px-6 py-2 relative z-30 select-none">
      <div className="w-full flex items-center justify-between">
        {/* Left Side: Mode & Tab Navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950/90 p-1 rounded-lg border border-red-900/30 text-xs">
            <button
              onClick={() => onModeChange('renamer')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeMode === 'renamer'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-red-200" />
              File Renamer
            </button>

            <button
              onClick={() => onModeChange('organizer')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeMode === 'organizer'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-red-200" />
              Folder Organizer
            </button>

            <button
              onClick={() => onModeChange('options')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeMode === 'options'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-red-200" />
              Options
            </button>

            <button
              onClick={() => onModeChange('help')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 ${
                activeMode === 'help'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-900/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5 text-red-200" />
              Help
            </button>
          </div>
        </div>

        {/* CENTERED BRANDING & LOGO LOCKUP */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center">
            <h1 className="text-2xl sm:text-[28px] font-[950] tracking-[0.22em] font-sans bg-gradient-to-r from-indigo-200 via-white to-purple-200 bg-clip-text text-transparent leading-none">
              BitScribe
            </h1>
            <span className="text-2xl sm:text-[28px] font-[950] tracking-[0.15em] font-sans text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)] ml-2 leading-none">
              RX
            </span>
          </div>
          <p className="text-[11px] font-extrabold text-red-400/95 tracking-[0.22em] uppercase leading-none mt-1.5 text-center">
            Digital Media Doctor
          </p>
        </div>

        {/* Right Side: Scope Stats & Load Button */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2.5 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-red-950/40">
            <span>
              Loaded: <strong className="text-slate-200">{itemCount}</strong>
            </span>
            <span className="text-slate-700">|</span>
            <span>
              Selected: <strong className="text-red-400">{selectedCount}</strong>
            </span>
          </div>

          {onLoadDatabase && (
            <button
              onClick={onLoadDatabase}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-medium rounded-lg border border-red-900/30 transition flex items-center gap-1.5"
            >
              <FolderOpen className="w-3.5 h-3.5 text-red-400" />
              Load Steward DB
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
