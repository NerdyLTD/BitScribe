import React from 'react';
import { Search, Filter, Folder, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DashboardToolbarProps {
  localSearchTerm: string;
  setLocalSearchTerm: (val: string) => void;
  isSearchVisible: boolean;
  setIsSearchVisible: (val: boolean) => void;
  selectedCategories: string[];
  setSelectedCategories: (cats: string[]) => void;
  selectedCompatibility: string[];
  setSelectedCompatibility: (comp: string[]) => void;
  topLevelFolders: string[];
  selectedTopLevelFolder: string;
  setSelectedTopLevelFolder: (folder: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalFilteredCount: number;
  activeCategoryGroup: string;
  onClearFilters: () => void;
}

export function DashboardToolbar({
  localSearchTerm,
  setLocalSearchTerm,
  isSearchVisible,
  setIsSearchVisible,
  selectedCategories,
  setSelectedCategories,
  selectedCompatibility,
  setSelectedCompatibility,
  topLevelFolders,
  selectedTopLevelFolder,
  setSelectedTopLevelFolder,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  totalFilteredCount,
  activeCategoryGroup,
  onClearFilters,
}: DashboardToolbarProps) {
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      setSelectedCategories(selectedCategories.filter(c => c !== cat));
    } else {
      setSelectedCategories([...selectedCategories, cat]);
    }
  };

  const toggleCompatibility = (comp: string) => {
    if (selectedCompatibility.includes(comp)) {
      setSelectedCompatibility(selectedCompatibility.filter(c => c !== comp));
    } else {
      setSelectedCompatibility([...selectedCompatibility, comp]);
    }
  };

  return (
    <div className="bg-[#14171F] border border-[#1e232e] rounded-xl p-3 mb-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
            placeholder="Search filenames, codecs, resolution..."
            className="w-full bg-[#0F1117] border border-[#1e232e] rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
          />
          {localSearchTerm && (
            <button
              type="button"
              onClick={() => setLocalSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Folder filter */}
        {topLevelFolders.length > 0 && (
          <div className="flex items-center gap-1.5 bg-[#0F1117] border border-[#1e232e] rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <Folder className="w-3.5 h-3.5 text-amber-500" />
            <select
              value={selectedTopLevelFolder}
              onChange={(e) => setSelectedTopLevelFolder(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Folders ({topLevelFolders.length})</option>
              {topLevelFolders.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span>{totalFilteredCount} items</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="p-1 rounded bg-[#0F1117] border border-[#1e232e] hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-[#0F1117] text-slate-300"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-slate-300 font-bold">{currentPage} / {totalPages}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="p-1 rounded bg-[#0F1117] border border-[#1e232e] hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-[#0F1117] text-slate-300"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-[#0F1117] border border-[#1e232e] rounded px-1.5 py-1 text-xs text-slate-300 focus:outline-none"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={250}>250 / page</option>
          </select>
        </div>
      </div>

      {/* Filter Badges */}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#1e232e]/50">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tier:</span>
        {['Bleeding Edge', 'Modern+', 'Legacy+', 'Transcode Required', 'Incompatible'].map((comp) => {
          const isSelected = selectedCompatibility.includes(comp);
          return (
            <button
              key={comp}
              type="button"
              onClick={() => toggleCompatibility(comp)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-[#0F1117] text-slate-400 hover:text-slate-200 border border-[#1e232e]'
              }`}
            >
              {comp}
            </button>
          );
        })}

        {(selectedCategories.length > 0 || selectedCompatibility.length > 0 || selectedTopLevelFolder !== 'ALL' || localSearchTerm) && (
          <button
            type="button"
            onClick={onClearFilters}
            className="ml-auto text-[10px] text-rose-400 font-bold uppercase hover:text-rose-300 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
