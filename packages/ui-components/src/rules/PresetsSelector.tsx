import React from 'react';

interface PresetsSelectorProps {
  useDiscoveryPreset: boolean;
  onToggleDiscovery: (val: boolean) => void;
  onVideoOnlySelect?: () => void;
  onMusicOnlySelect?: () => void;
  onCorruptionScanSelect?: () => void;
  onHelpRequest?: (id: string) => void;
}

export function PresetsSelector({
  useDiscoveryPreset,
  onToggleDiscovery,
  onVideoOnlySelect,
  onMusicOnlySelect,
  onCorruptionScanSelect,
  onHelpRequest
}: PresetsSelectorProps) {
  return (
    <div
      className="p-4 bg-[#1E232E] border border-slate-700/30 rounded-xl space-y-4 flex flex-col justify-between"
      id="discovery-mode-settings-card"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between border-b border-slate-700/20 pb-3">
          <div className="flex items-start gap-2.5 select-none">
            <input
              type="checkbox"
              id="toggle-discovery-preset"
              checked={useDiscoveryPreset}
              onChange={(e) => onToggleDiscovery(e.target.checked)}
              className="mt-0.5 rounded border-slate-700 text-blue-500 focus:ring-blue-500 bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
            />
            <div className="flex flex-col">
              <div className="flex items-center">
                <label
                  htmlFor="toggle-discovery-preset"
                  className="text-xs font-bold text-blue-400 uppercase tracking-wider cursor-pointer"
                >
                  Discovery Mode
                </label>
                {onHelpRequest && (
                  <button
                    type="button"
                    className="w-4 h-4 ml-2 rounded-full border border-blue-500/50 text-blue-400 bg-blue-500/10 flex items-center justify-center cursor-pointer hover:bg-blue-500 hover:text-white transition-colors"
                    title="Click here to see a tutorial on using this scan type"
                    onClick={(e) => {
                      e.preventDefault();
                      onHelpRequest("help-discovery");
                    }}
                  >
                    <span className="text-[10px] font-bold leading-none">?</span>
                  </button>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-normal">
                Granular bypass filters - indexes all custom format permutations
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mt-0.5 ${
              useDiscoveryPreset
                ? "bg-blue-500/15 text-blue-400 animate-pulse"
                : "bg-slate-800 text-slate-500"
            }`}
          >
            {useDiscoveryPreset ? "Active" : "Disabled"}
          </span>
        </div>
        {useDiscoveryPreset && (
          <div className="flex flex-wrap gap-2 mt-2 mb-3">
            {onVideoOnlySelect && (
              <button
                type="button"
                onClick={onVideoOnlySelect}
                title="Configures discovery to look only at video properties"
                className="px-2 py-1 rounded bg-blue-600/10 border border-blue-500/30 text-blue-400 text-[11px] font-bold hover:bg-blue-500/20 transition-colors"
              >
                Video Only Preset
              </button>
            )}
            {onMusicOnlySelect && (
              <button
                type="button"
                onClick={onMusicOnlySelect}
                title="Configures discovery to look only at music properties"
                className="px-2 py-1 rounded bg-green-600/10 border border-green-500/30 text-green-400 text-[11px] font-bold hover:bg-green-500/20 transition-colors"
              >
                Music Only Preset
              </button>
            )}
            {onCorruptionScanSelect && (
              <button
                type="button"
                onClick={onCorruptionScanSelect}
                title="Retrieves all files, but focuses exports on identifying corrupted items."
                className="px-2 py-1 rounded bg-rose-600/10 border border-rose-500/30 text-rose-400 text-[11px] font-bold hover:bg-rose-500/20 transition-colors"
              >
                Corruption Scan
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
