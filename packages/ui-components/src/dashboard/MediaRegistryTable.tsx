import React from 'react';
import { ArrowUpDown, Eye, AlertCircle, FileVideo, Music } from 'lucide-react';
import { formatResolution, formatSize } from '../formatters';

interface MediaRegistryTableProps {
  items: any[];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (col: string) => void;
  onSelectItem?: (item: any) => void;
}

export function MediaRegistryTable({
  items,
  sortColumn,
  sortDirection,
  onSort,
  onSelectItem,
}: MediaRegistryTableProps) {
  if (!items || items.length === 0) {
    return (
      <div className="p-12 text-center bg-[#14171F] border border-[#1e232e] rounded-xl my-4">
        <FileVideo className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">No Media Items Found</h4>
        <p className="text-xs text-slate-500 mt-1">Try adjusting your active filters or running a library scan.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-[#14171F] border border-[#1e232e] rounded-xl shadow-lg my-2">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#1e232e] bg-[#0F1117] text-slate-400 font-mono uppercase text-[10px] tracking-wider select-none sticky top-0 z-10">
            <th className="py-2.5 px-3 cursor-pointer hover:text-slate-200" onClick={() => onSort('filename')}>
              <div className="flex items-center gap-1">
                Filename <ArrowUpDown className="w-3 h-3 text-slate-600" />
              </div>
            </th>
            <th className="py-2.5 px-3 cursor-pointer hover:text-slate-200" onClick={() => onSort('category')}>
              <div className="flex items-center gap-1">
                Category <ArrowUpDown className="w-3 h-3 text-slate-600" />
              </div>
            </th>
            <th className="py-2.5 px-3 cursor-pointer hover:text-slate-200" onClick={() => onSort('videoResolution')}>
              <div className="flex items-center gap-1">
                Resolution <ArrowUpDown className="w-3 h-3 text-slate-600" />
              </div>
            </th>
            <th className="py-2.5 px-3 cursor-pointer hover:text-slate-200" onClick={() => onSort('videoCodec')}>
              <div className="flex items-center gap-1">
                Codec <ArrowUpDown className="w-3 h-3 text-slate-600" />
              </div>
            </th>
            <th className="py-2.5 px-3 cursor-pointer hover:text-slate-200" onClick={() => onSort('sizeGB')}>
              <div className="flex items-center gap-1">
                Size <ArrowUpDown className="w-3 h-3 text-slate-600" />
              </div>
            </th>
            <th className="py-2.5 px-3 cursor-pointer hover:text-slate-200" onClick={() => onSort('compatibilityLevel')}>
              <div className="flex items-center gap-1">
                Compatibility <ArrowUpDown className="w-3 h-3 text-slate-600" />
              </div>
            </th>
            <th className="py-2.5 px-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e232e]/50 font-mono text-[11px]">
          {items.map((wrapper: any) => {
            const item = wrapper.item || wrapper;
            const level = wrapper.level || item.compatibilityLevel || 'Good';
            
            const levelStyles: Record<string, string> = {
              'Bleeding Edge': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
              'Modern+': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              'Legacy+': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              'Transcode Required': 'bg-rose-500/10 text-rose-400 border-rose-500/20',
              'Incompatible': 'bg-red-900/20 text-red-400 border-red-800/30',
            };

            return (
              <tr key={item.id || item.filename} className="hover:bg-[#1A1D27]/80 transition-colors group">
                <td className="py-2 px-3 text-slate-200 font-semibold max-w-[280px] truncate" title={item.filename}>
                  {item.filename}
                </td>
                <td className="py-2 px-3 text-slate-400">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800/80 text-[10px] text-slate-300">
                    {item.category || 'Uncategorized'}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-300">
                  {formatResolution(item.videoResolution)}
                </td>
                <td className="py-2 px-3 text-slate-400 uppercase">
                  {item.videoCodec || item.container || '-'}
                </td>
                <td className="py-2 px-3 text-slate-300">
                  {formatSize(item.sizeGB || 0)}
                </td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${levelStyles[level] || levelStyles['Modern+']}`}>
                    {level}
                  </span>
                </td>
                <td className="py-2 px-3 text-right">
                  <button
                    type="button"
                    onClick={() => onSelectItem?.(item)}
                    className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Inspect file details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
