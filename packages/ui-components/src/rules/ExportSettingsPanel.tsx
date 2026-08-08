import React from 'react';

interface ExportSettingsPanelProps {
  exportDirectory?: string;
  onExportDirectoryChange?: (dir: string) => void;
  onBrowseExportDirectory?: () => void;
  onBackup?: (type: 'full' | 'data' | 'settings') => void;
  onRestore?: () => void;
}

export function ExportSettingsPanel({
  exportDirectory,
  onExportDirectoryChange,
  onBrowseExportDirectory,
  onBackup,
  onRestore
}: ExportSettingsPanelProps) {
  return (
    <div className="bg-[#1E232E] border border-slate-700/30 rounded-xl p-4 space-y-4">
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
        Export & Data Management
      </h3>
      
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 block">Export Directory</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={exportDirectory || ''}
            onChange={(e) => onExportDirectoryChange?.(e.target.value)}
            placeholder="Default system downloads folder"
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
          {onBrowseExportDirectory && (
            <button
              type="button"
              onClick={onBrowseExportDirectory}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded text-xs font-semibold transition-colors"
            >
              Browse
            </button>
          )}
        </div>
      </div>

      {(onBackup || onRestore) && (
        <div className="pt-2 border-t border-slate-700/30 flex flex-wrap gap-2">
          {onBackup && (
            <button
              type="button"
              onClick={() => onBackup('full')}
              className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded text-xs font-semibold transition-colors"
            >
              Backup Settings
            </button>
          )}
          {onRestore && (
            <button
              type="button"
              onClick={onRestore}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 rounded text-xs font-semibold transition-colors"
            >
              Restore Backup
            </button>
          )}
        </div>
      )}
    </div>
  );
}
