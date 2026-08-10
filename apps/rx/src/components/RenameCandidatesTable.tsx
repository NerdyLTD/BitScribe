import React from 'react';
import { RenameCandidate } from '@bitscribe/core-types';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Play,
  Eye,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';

interface RenameCandidatesTableProps {
  candidates: RenameCandidate[];
  onToggleSelect: (id: string) => void;
  onSelectAll: (select: boolean) => void;
  onExecute: () => void;
  onDryRun: () => void;
  isExecuting: boolean;
}

export const RenameCandidatesTable: React.FC<RenameCandidatesTableProps> = ({
  candidates,
  onToggleSelect,
  onSelectAll,
  onExecute,
  onDryRun,
  isExecuting,
}) => {
  const selectedCount = candidates.filter((c) => c.selected).length;
  const highConfidenceCount = candidates.filter((c) => c.confidence === 'high').length;
  const collisionCount = candidates.filter((c) => c.isCollision).length;

  const allSelected = candidates.length > 0 && selectedCount === candidates.length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#04060a]">
      {/* Top Action & Filter Bar */}
      <div className="p-4 border-b border-red-950/30 bg-[#090b10] flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectAll(!allSelected)}
            className="flex items-center gap-2 text-xs font-medium text-slate-300 hover:text-white transition bg-slate-950 border border-slate-800/80 px-3 py-1.5 rounded-lg cursor-pointer"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-red-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-600" />
            )}
            Select All ({candidates.length})
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 font-mono">
              {highConfidenceCount} High Conf
            </span>
            {collisionCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/40 font-mono">
                {collisionCount} Collisions
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDryRun}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg border border-red-900/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-red-400" />
            Dry-Run Simulation
          </button>
          <button
            onClick={onExecute}
            disabled={selectedCount === 0 || isExecuting}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg shadow-lg transition flex items-center gap-1.5 ${
              selectedCount === 0 || isExecuting
                ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                : 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:brightness-110 shadow-red-900/30 cursor-pointer'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isExecuting ? 'Processing...' : `Execute ${selectedCount} Renames`}
          </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-[#0c0f17] border-b-2 border-red-900/50 text-[11px] uppercase tracking-wider z-10">
            <tr>
              <th className="p-3 w-10 text-center bg-[#080a10]">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0 cursor-pointer"
                />
              </th>
              <th className="p-3 w-32 font-bold text-slate-400 bg-[#080a10]">Confidence</th>

              {/* VIBRANT CURRENT FILENAME HEADER */}
              <th className="p-3 w-5/12 font-extrabold text-indigo-300 tracking-wider bg-[#0a0d18]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                  Current Filename
                </div>
              </th>

              {/* COLUMN DIVIDER HEADER */}
              <th className="p-3 w-8 text-center border-x-2 border-red-900/60 bg-red-950/30 text-red-400 shadow-inner">
                <ArrowRight className="w-4 h-4 mx-auto text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
              </th>

              {/* VIBRANT PROPOSED TARGET FILENAME HEADER */}
              <th className="p-3 w-5/12 font-extrabold text-rose-300 tracking-wider bg-[#150a12]">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  Proposed Target Filename
                </div>
              </th>

              <th className="p-3 w-24 text-right font-bold text-slate-400 bg-[#080a10]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-xs">
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-slate-500">
                  No media files loaded into RX workspace.
                </td>
              </tr>
            ) : (
              candidates.map((candidate) => {
                const isChanged = candidate.originalFilename !== candidate.proposedFilename;

                return (
                  <tr
                    key={candidate.id}
                    className={`hover:bg-slate-900/50 transition ${
                      candidate.selected ? 'bg-red-950/15' : 'opacity-75'
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={candidate.selected}
                        onChange={() => onToggleSelect(candidate.id)}
                        className="rounded border-slate-700 bg-slate-950 text-red-600 focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[10px] font-semibold px-2 py-0.5 rounded w-fit ${
                            candidate.confidence === 'high'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                              : candidate.confidence === 'medium'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/40'
                              : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                          }`}
                        >
                          {candidate.confidence === 'high' && <CheckCircle2 className="w-3 h-3" />}
                          {candidate.confidence === 'medium' && <AlertTriangle className="w-3 h-3" />}
                          {candidate.confidence === 'low' && <XCircle className="w-3 h-3" />}
                          {candidate.confidence.toUpperCase()}
                        </span>
                        {candidate.confidenceReasons.length > 0 && (
                          <span
                            className="text-[10px] text-slate-500 truncate max-w-[120px]"
                            title={candidate.confidenceReasons.join('; ')}
                          >
                            {candidate.confidenceReasons[0]}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* CURRENT FILENAME CELL */}
                    <td className="p-3 font-mono text-slate-200 break-all pr-4 bg-slate-950/20">
                      {candidate.originalFilename}
                    </td>

                    {/* VERTICAL DIVIDER CELL */}
                    <td className="p-3 text-center border-x-2 border-red-900/50 bg-red-950/20 text-red-400/90 shadow-inner">
                      <ArrowRight className="w-3.5 h-3.5 inline text-red-500/90" />
                    </td>

                    {/* PROPOSED TARGET FILENAME CELL */}
                    <td className="p-3 font-mono text-emerald-300 font-semibold break-all pl-4 bg-rose-950/10">
                      {candidate.proposedFilename}
                      {!isChanged && (
                        <span className="ml-2 text-[10px] font-normal text-slate-500 italic">(Unchanged)</span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <span
                        className={`text-[10px] font-medium uppercase px-2 py-0.5 rounded ${
                          candidate.status === 'success'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40'
                            : candidate.status === 'failed'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/40'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {candidate.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
