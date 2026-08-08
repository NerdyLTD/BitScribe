import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Filter, ChevronDown, CheckCircle, AlertTriangle, HelpCircle, HardDrive, FileVideo, Music } from 'lucide-react';

interface DashboardMetricsPanelProps {
  stats: any;
  directPlayPercent: number;
  distributionsAndAnomalies: any;
  effectiveVisibility: Record<string, boolean>;
  showBlocksDropdown: boolean;
  setShowBlocksDropdown: (val: boolean) => void;
  blocksDropdownRef: React.RefObject<HTMLDivElement | null>;
  isCustomBlocksActive: boolean;
  setIsCustomBlocksActive: (val: boolean) => void;
  setVisibleBlocks: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  defaultBlockVisibility: Record<string, boolean>;
  isTourActive?: boolean;
  tourStepIndex?: number;
  activeDemo?: number;
  onFilterByCodec?: (codec: string) => void;
  onFilterByContainer?: (container: string) => void;
  onFilterByAnomaly?: (anomalyKey: string) => void;
}

export function DashboardMetricsPanel({
  stats,
  directPlayPercent,
  distributionsAndAnomalies,
  effectiveVisibility,
  showBlocksDropdown,
  setShowBlocksDropdown,
  blocksDropdownRef,
  isCustomBlocksActive,
  setIsCustomBlocksActive,
  setVisibleBlocks,
  defaultBlockVisibility,
  isTourActive,
  tourStepIndex,
  activeDemo,
  onFilterByCodec,
  onFilterByContainer,
  onFilterByAnomaly,
}: DashboardMetricsPanelProps) {
  const {
    videoChartData = [],
    audioChartData = [],
    containerChartData = [],
    musicChartData = [],
    displayAnomalies = [],
    missingSubtitles = [],
    subtitleCodecData = [],
    duplicateCounts = { Video: 0, Music: 0 },
    duplicateSizes = { Video: 0, Music: 0 },
  } = distributionsAndAnomalies || {};

  return (
    <div id="metrics-dashboard-filter-wrapper" className={`${isTourActive ? 'relative' : '!sticky top-0'} bg-[#0F1117] pb-3 pt-4 px-4 -mx-4 mb-3 ${(isTourActive && tourStepIndex === 8) ? "z-[10001]" : "z-[45]"}`}>
      <div id="metrics-dashboard-filter" className={`py-2 px-3.5 bg-[#14171F] border border-[#1e232e] rounded-xl shadow-lg ${activeDemo === 9 ? 'ring-2 ring-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.8)] relative z-[60] transition-all duration-500' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-y-2 mb-1.5 border-b border-[#1e232e]/50 pb-2">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 select-none">
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            Metrics Dashboard
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative" ref={blocksDropdownRef}>
              <button
                type="button"
                onClick={() => setShowBlocksDropdown(!showBlocksDropdown)}
                className="px-2 py-1 text-[10px] rounded font-bold uppercase transition-colors bg-slate-800 text-slate-400 hover:bg-slate-700 flex items-center gap-1"
                id="btn-metrics-select"
                title="Select which metrics blocks to display"
              >
                Select Metrics <ChevronDown className="w-3 h-3" />
              </button>
              {showBlocksDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-[#14171F] border border-[#1e232e] rounded-lg shadow-xl z-50 p-2 text-[10px] text-slate-300">
                  {Object.entries({
                    'library-overview-card': "Library Overview",
                    'stream-audit-card': "Streaming Readiness",
                    'video-codecs-card': "Video Codecs",
                    'audio-codecs-card': "Audio Codecs",
                    'containers-card': "Containers",
                    'music-codecs-card': "Music Codecs",
                    'quality-anomalies-card': "Quality Anomalies",
                    'media-duplicates-card': "Media Duplicates",
                  }).map(([key, label]) => {
                    const isChecked = !!effectiveVisibility[key];
                    return (
                      <label key={key} className="flex items-center gap-2 p-1.5 hover:bg-slate-700 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (!isCustomBlocksActive) {
                              setIsCustomBlocksActive(true);
                              setVisibleBlocks({ ...defaultBlockVisibility, [key]: checked });
                            } else {
                              setVisibleBlocks(prev => ({ ...prev, [key]: checked }));
                            }
                          }}
                          className="rounded border-slate-600 bg-slate-800"
                        />
                        {label}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3">
          {effectiveVisibility['library-overview-card'] && (
            <div className="p-3 bg-[#1A1D27] border border-[#1e232e] rounded-lg flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Indexed Files</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-mono font-bold text-slate-100">{stats.fileCount || 0}</span>
                <span className="text-xs font-mono text-slate-400">{stats.formattedSize || "0 GB"}</span>
              </div>
            </div>
          )}

          {effectiveVisibility['stream-audit-card'] && (
            <div className="p-3 bg-[#1A1D27] border border-[#1e232e] rounded-lg flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Direct Play Rate</span>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-mono font-bold text-emerald-400">{directPlayPercent}%</span>
                <span className="text-xs font-mono text-slate-400">{stats.modern + stats.bleeding} / {stats.fileCount || 0}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
