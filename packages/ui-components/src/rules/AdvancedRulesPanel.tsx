import React from 'react';
import { RuleCriteria } from '@bitscribe/core-types';

interface AdvancedRulesPanelProps {
  rules: RuleCriteria;
  onRulesChange: (rules: RuleCriteria) => void;
  onHelpRequest?: (id: string) => void;
}

export function AdvancedRulesPanel({
  rules,
  onRulesChange,
  onHelpRequest
}: AdvancedRulesPanelProps) {
  const toggleModernPreset = (checked: boolean) => {
    onRulesChange({ ...rules, useModernPreset: checked });
  };

  const toggleLegacyPreset = (checked: boolean) => {
    onRulesChange({ ...rules, useLegacyPreset: checked });
  };

  const toggleBleedingEdgePreset = (checked: boolean) => {
    onRulesChange({ ...rules, useBleedingEdgePreset: checked });
  };

  const toggleCodecInList = (list: string[] | undefined, codec: string) => {
    const current = list || [];
    return current.includes(codec)
      ? current.filter((c) => c !== codec)
      : [...current, codec];
  };

  const isActive = rules.useModernPreset || rules.useLegacyPreset || rules.useBleedingEdgePreset;

  return (
    <div className="p-4 bg-[#1E232E] border border-slate-700/30 rounded-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-700/20 pb-3">
        <div className="flex items-center gap-2 select-none">
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
            Streaming Tier Standards (Modern / Legacy / Bleeding Edge)
          </span>
          {onHelpRequest && (
            <button
              type="button"
              className="w-4 h-4 rounded-full border border-emerald-500/50 text-emerald-400 bg-emerald-500/10 flex items-center justify-center cursor-pointer hover:bg-emerald-500 hover:text-white transition-colors"
              onClick={() => onHelpRequest("help-tiers")}
            >
              <span className="text-[10px] font-bold leading-none">?</span>
            </button>
          )}
        </div>
        <span
          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
            isActive
              ? "bg-emerald-500/15 text-emerald-400 animate-pulse"
              : "bg-slate-800 text-slate-500"
          }`}
        >
          {isActive ? "Active" : "Disabled"}
        </span>
      </div>

      <div className={`grid grid-cols-1 gap-4 transition ${isActive ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
        {/* Modern */}
        <div className="bg-[#14171F] p-4 border border-[#1e232e] rounded-xl flex flex-col gap-3 relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none">Enable</label>
            <input
              type="checkbox"
              checked={rules.useModernPreset ?? false}
              onChange={(e) => toggleModernPreset(e.target.checked)}
              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-800 h-3 w-3 cursor-pointer"
            />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-emerald-400 uppercase">Modern Standards</h4>
            <p className="text-[10px] text-slate-400 leading-tight mt-1">Direct play for Apple TV 4K, Nvidia Shield, and recent smart TVs.</p>
          </div>
          <div className={`grid grid-cols-1 gap-3 ${rules.useModernPreset ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
            <div className="flex items-center gap-2">
              <div className="w-16 text-[9px] font-bold text-slate-500 uppercase">Video:</div>
              <div className="flex flex-wrap gap-1">
                {["hevc", "h264"].map(codec => {
                  const active = (rules.modernVideoCodecs || []).includes(codec);
                  return (
                    <button
                      key={codec}
                      type="button"
                      onClick={() => onRulesChange({ ...rules, modernVideoCodecs: toggleCodecInList(rules.modernVideoCodecs, codec) })}
                      className={`py-0.5 px-2 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${active ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow border border-emerald-500" : "bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 text-slate-400"}`}
                    >
                      {codec.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 text-[9px] font-bold text-slate-500 uppercase">Surround:</div>
              <div className="flex flex-wrap gap-1">
                {["ac3", "eac3", "dts"].map(codec => {
                  const active = (rules.modernSurroundAudioCodecs || []).includes(codec);
                  return (
                    <button
                      key={codec}
                      type="button"
                      onClick={() => onRulesChange({ ...rules, modernSurroundAudioCodecs: toggleCodecInList(rules.modernSurroundAudioCodecs, codec) })}
                      className={`py-0.5 px-2 rounded text-[10px] font-bold font-mono transition-all cursor-pointer ${active ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow border border-emerald-500" : "bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 text-slate-400"}`}
                    >
                      {codec.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Legacy */}
        <div className="bg-[#14171F] p-4 border border-[#1e232e] rounded-xl flex flex-col gap-3 relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none">Enable</label>
            <input
              type="checkbox"
              checked={rules.useLegacyPreset ?? false}
              onChange={(e) => toggleLegacyPreset(e.target.checked)}
              className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-800 h-3 w-3 cursor-pointer"
            />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-amber-400 uppercase">Legacy Compatibility</h4>
            <p className="text-[10px] text-slate-400 leading-tight mt-1">Maximum compatibility across legacy web browsers, old tablets, and older smart TVs.</p>
          </div>
        </div>

        {/* Bleeding Edge */}
        <div className="bg-[#14171F] p-4 border border-[#1e232e] rounded-xl flex flex-col gap-3 relative">
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer select-none">Enable</label>
            <input
              type="checkbox"
              checked={rules.useBleedingEdgePreset ?? false}
              onChange={(e) => toggleBleedingEdgePreset(e.target.checked)}
              className="rounded border-slate-700 text-purple-500 focus:ring-purple-500 bg-slate-800 h-3 w-3 cursor-pointer"
            />
          </div>
          <div>
            <h4 className="text-[11px] font-bold text-purple-400 uppercase">Bleeding Edge (AV1 / Lossless)</h4>
            <p className="text-[10px] text-slate-400 leading-tight mt-1">For ultra modern clients supporting AV1 video and uncompressed audio.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
