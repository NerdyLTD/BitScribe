import React from 'react';

export const missingFmt = (val: any) => {
  if (val === "[MISSING]" || !val) {
    return <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 font-semibold border border-rose-900/50 text-[10px] tracking-wider uppercase shadow-sm whitespace-nowrap">[MISSING]</span>;
  }
  return val;
};

export const formatResolution = (w?: number, h?: number, parsed?: any) => {
  if (w && h) {
    let resLabel = `${w}x${h}`;
    if (parsed?.resolution) {
      resLabel += ` (${parsed.resolution})`;
    }
    return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-xs">{resLabel}</span>;
  }
  if (parsed?.resolution) {
    return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-xs">{parsed.resolution}</span>;
  }
  return missingFmt("[MISSING]");
};

export const formatSubtitleSummary = (parsed?: any) => {
  if (parsed?.subtitles && Array.isArray(parsed.subtitles) && parsed.subtitles.length > 0) {
    return <span className="text-slate-300 text-xs">{parsed.subtitles.length} track(s)</span>;
  }
  return missingFmt("[MISSING]");
};

export const formatSubtitleTechnical = (parsed?: any) => {
  if (parsed?.subtitles && Array.isArray(parsed.subtitles) && parsed.subtitles.length > 0) {
    return (
      <div className="flex flex-col gap-1">
        {parsed.subtitles.map((sub: any, idx: number) => {
          let label = sub.codec || 'sub';
          if (sub.language) label += ` (${sub.language})`;
          if (sub.forced) label += ' [Forced]';
          if (sub.sdh) label += ' [SDH]';
          if (sub.cc) label += ' [CC]';
          return (
            <span key={idx} className="px-1.5 py-0.5 rounded bg-indigo-900/40 text-indigo-300 border border-indigo-700/50 text-[10px] truncate max-w-[120px]">
              {label}
            </span>
          );
        })}
      </div>
    );
  }
  return missingFmt("[MISSING]");
};
