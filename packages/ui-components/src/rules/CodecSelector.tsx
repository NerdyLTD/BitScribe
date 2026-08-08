import React from 'react';

interface CodecSelectorProps {
  title: string;
  codecs: string[];
  selectedCodecs: string[];
  onToggleCodec: (codec: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  activeColor?: 'blue' | 'emerald' | 'purple';
}

export function CodecSelector({
  title,
  codecs,
  selectedCodecs,
  onToggleCodec,
  onSelectAll,
  onClearAll,
  activeColor = 'blue'
}: CodecSelectorProps) {
  const colorMap = {
    blue: {
      active: 'bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold',
      hover: 'hover:text-blue-400',
    },
    emerald: {
      active: 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400 font-bold',
      hover: 'hover:text-emerald-400',
    },
    purple: {
      active: 'bg-purple-600/10 border-purple-500/30 text-purple-400 font-bold',
      hover: 'hover:text-purple-400',
    }
  };

  const style = colorMap[activeColor];

  return (
    <div className="bg-[#14171F] p-4 rounded-lg border border-slate-800 flex flex-col justify-between">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-slate-800 pb-2 mb-3">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide leading-tight">
            {title}
          </span>
          <div className="flex gap-1.5 text-[9px] text-slate-500 shrink-0">
            <button
              type="button"
              onClick={onSelectAll}
              className={`${style.hover} font-semibold cursor-pointer`}
            >
              All
            </button>
            <span>|</span>
            <button
              type="button"
              onClick={onClearAll}
              className="hover:text-rose-400 font-semibold cursor-pointer"
            >
              None
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
          {codecs.map((codec) => {
            const isChecked = selectedCodecs.includes(codec);
            return (
              <button
                key={codec}
                type="button"
                onClick={() => onToggleCodec(codec)}
                className={`px-2 py-1 rounded text-[10px] text-left font-mono truncate transition-all cursor-pointer border ${
                  isChecked
                    ? style.active
                    : "bg-transparent border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
              >
                {isChecked ? "● " : "○ "}
                {codec.toUpperCase()}
              </button>
            );
          })}
        </div>
      </div>
      <div className="text-[9px] text-slate-600 mt-2 font-mono">
        Selected: {selectedCodecs.length}
      </div>
    </div>
  );
}
