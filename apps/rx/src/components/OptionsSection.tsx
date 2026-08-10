import React, { useState } from 'react';
import {
  Settings,
  Terminal,
  Download,
  Shield,
  FileText,
  Sliders,
  CheckCircle,
  Database,
  Trash2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { downloadOrSaveFile } from '@bitscribe/core-export';
import { RenamePatternConfig } from '@bitscribe/core-types';

interface OptionsSectionProps {
  config: RenamePatternConfig;
  onUpdateConfig: (updated: Partial<RenamePatternConfig>) => void;
  logs: string[];
  onClearLogs?: () => void;
  onLoadStewardDB?: () => void;
}

export const OptionsSection: React.FC<OptionsSectionProps> = ({
  config,
  onUpdateConfig,
  logs,
  onClearLogs,
  onLoadStewardDB,
}) => {
  const [logLevel, setLogLevel] = useState<'ALL' | 'ERROR' | 'WARN' | 'INFO'>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (logLevel === 'ALL') return true;
    const upper = (log || '').toUpperCase();
    if (logLevel === 'ERROR') return upper.includes('ERROR') || upper.includes('FAIL');
    if (logLevel === 'WARN') return upper.includes('WARN') || upper.includes('SKIP');
    if (logLevel === 'INFO') return !upper.includes('ERROR') && !upper.includes('WARN');
    return true;
  });

  const exportAllLogs = async () => {
    const content = logs.join('\n') || 'No logs available for this session.';
    const blob = new Blob([content], { type: 'text/plain' });
    try {
      await downloadOrSaveFile('BitScribe_RX_System_Logs.log', blob);
    } catch (e: any) {
      console.error('Failed to export logs', e);
      alert('Failed to export logs: ' + e.message);
    }
  };

  const exportErrorLogs = async () => {
    const errorLogs = logs.filter(
      (log) => (log || '').toUpperCase().includes('ERROR') || (log || '').toUpperCase().includes('FAIL')
    );
    const content =
      errorLogs.length > 0
        ? errorLogs.join('\n')
        : 'No runtime application errors logged during this session.';
    const blob = new Blob([content], { type: 'text/plain' });
    try {
      await downloadOrSaveFile('BitScribe_RX_Error_Log.txt', blob);
    } catch (e: any) {
      console.error('Failed to export error logs', e);
      alert('Failed to export logs: ' + e.message);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#04060a] space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-red-950/40 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-red-500" />
            Remediation Preferences & System Diagnostics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure renamer safety thresholds, logging levels, and export diagnostic logs
          </p>
        </div>

        {onLoadStewardDB && (
          <button
            onClick={onLoadStewardDB}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg border border-red-900/40 transition flex items-center gap-2"
          >
            <Database className="w-4 h-4 text-red-400" />
            Import Steward Database
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Column */}
        <div className="space-y-6">
          <div className="p-5 bg-[#0c0f17] border border-red-950/40 rounded-2xl space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-slate-200 font-bold text-xs border-b border-red-950/40 pb-2.5">
              <Shield className="w-4 h-4 text-red-400" />
              Safety & File Remediation Controls
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-200 block">Sanitize OS Illegal Characters</span>
                  <span className="text-[10px] text-slate-500 block">Replaces : * ? " &lt; &gt; | with clean hyphens</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.sanitizeChars}
                  onChange={(e) => onUpdateConfig({ sanitizeChars: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-0"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 cursor-pointer">
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-200 block">Auto-Track Sidecar Files</span>
                  <span className="text-[10px] text-slate-500 block">Renames associated .srt, .nfo, .sub subtitle files</span>
                </div>
                <input
                  type="checkbox"
                  checked={config.autoTrackSidecars}
                  onChange={(e) => onUpdateConfig({ autoTrackSidecars: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-900 text-red-600 focus:ring-0"
                />
              </label>
            </div>
          </div>

          <div className="p-5 bg-[#0c0f17] border border-red-950/40 rounded-2xl space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-slate-200 font-bold text-xs border-b border-red-950/40 pb-2.5">
              <Info className="w-4 h-4 text-red-400" />
              Engine Metadata
            </div>

            <div className="space-y-2 text-xs text-slate-400 font-mono">
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span>Application Name:</span>
                <span className="text-slate-200 font-semibold">BitScribe RX</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span>Core Module:</span>
                <span className="text-red-400 font-semibold">Digital Media Doctor</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/40">
                <span>Architecture:</span>
                <span className="text-slate-200">Monorepo / Client Engine</span>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic Logs Panel Column */}
        <div className="lg:col-span-2 space-y-4 flex flex-col h-[600px]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-red-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Application Event Logs ({filteredLogs.length})
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {/* Level Filter */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                {(['ALL', 'INFO', 'WARN', 'ERROR'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLogLevel(lvl)}
                    className={`px-2 py-0.5 rounded font-mono transition ${
                      logLevel === lvl
                        ? 'bg-red-950 text-red-300 font-bold border border-red-800/50'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {onClearLogs && (
                <button
                  onClick={onClearLogs}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 transition"
                  title="Clear Log Buffer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={exportErrorLogs}
                className="px-3 py-1.5 bg-red-950/80 hover:bg-red-900 text-red-200 text-xs font-semibold rounded-lg border border-red-800/60 transition flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Export Error Log
              </button>

              <button
                onClick={exportAllLogs}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg border border-red-900/40 transition flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-red-400" />
                Export All Logs
              </button>
            </div>
          </div>

          {/* Terminal Console Box */}
          <div className="flex-1 bg-[#07090e] rounded-xl border border-red-950/50 p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-1.5 custom-scrollbar shadow-inner">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-600 italic text-center mt-20">
                No active event logs in filter buffer.
              </div>
            ) : (
              filteredLogs.map((log, i) => {
                const upper = (log || '').toUpperCase();
                const isError = upper.includes('ERROR') || upper.includes('FAIL');
                const isWarn = upper.includes('WARN') || upper.includes('SKIP');
                const isSuccess = upper.includes('SUCCESS') || upper.includes('COMPLETE') || upper.includes('READY');

                let textColor = 'text-slate-300';
                let borderColor = 'border-slate-800';
                if (isError) {
                  textColor = 'text-rose-400';
                  borderColor = 'border-rose-500';
                } else if (isWarn) {
                  textColor = 'text-amber-300';
                  borderColor = 'border-amber-500';
                } else if (isSuccess) {
                  textColor = 'text-emerald-400';
                  borderColor = 'border-emerald-500';
                }

                return (
                  <div
                    key={i}
                    className={`border-l-2 ${borderColor} pl-3 py-1 bg-[#0d1017]/60 rounded-r text-[11px] leading-relaxed break-all ${textColor}`}
                  >
                    {log}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
