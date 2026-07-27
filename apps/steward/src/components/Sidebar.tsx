import React from "react";
import { MediaItem, RuleCriteria } from "@bitscribe/core-types";
import { computeDuplicatesMap, evaluatePlexCompatibility, filterItemsForReport } from "@bitscribe/core-eval";
import { exportMediaLibraryToExcel } from "../utils/excelExporter";
import {
  exportMediaLibraryToCSV,
  exportMediaLibraryToHTML,
  exportMediaLibraryToJSON,
} from "../utils/reportExporter";
import { FolderOpen, Sliders } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { injectDemoData, getDbFiles } from "@bitscribe/core-db";

export interface SidebarProps {
  isFluidLayout: boolean;
  scanPaths: Array<{ path: string; enabled: boolean }>;
  setScanPaths: React.Dispatch<React.SetStateAction<Array<{ path: string; enabled: boolean }>>>;
  handleBrowseFolder: () => void;
  setConfirmAction: (val: { message: string; onConfirm: () => void } | null) => void;
  isScanning: boolean;
  isResumeState: boolean;
  handleStartScan: (quick?: boolean) => void;
  handlePauseScan: () => void;
  handleStopScan: () => void;
  handleEvaluateDb: () => void;
  activeTab: "scan" | "library" | "rules" | "help" | "logs";
  handleTabChange: (tab: "scan" | "library" | "rules" | "help" | "logs") => void;
  setHelpHighlight: (id: string) => void;
  scannedFilesList: MediaItem[];
  corruptFiles: MediaItem[];
  exportFormats: { xlsx: boolean; html: boolean; csv: boolean; json: boolean };
  setExportFormats: React.Dispatch<React.SetStateAction<{ xlsx: boolean; html: boolean; csv: boolean; json: boolean }>>;
  exportProfile: string;
  setExportProfile: (val: string) => void;
  fakeExportMenu: { show: boolean; highlight: string };
  customColumnsMenuRef: React.RefObject<HTMLDivElement | null>;
  showCustomColumnsMenu: boolean;
  setShowCustomColumnsMenu: (val: boolean) => void;
  excelColumns: Record<string, boolean>;
  setExcelColumns: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  customRules: RuleCriteria;
  setScanLogs: React.Dispatch<React.SetStateAction<string[]>>;
  setCurrentExportFile: (val: string) => void;
  setExportProgress: (val: number) => void;
  setIsExporting: (val: boolean) => void;
  setExportCompleteMsg: (val: string) => void;
  setNotification: (val: any) => void;
  exportDirectory: string;
  isExporting: boolean;
  showDiagnostic: boolean;
  setShowDiagnostic: React.Dispatch<React.SetStateAction<boolean>>;
  previousTab: "scan" | "library" | "rules" | "help" | "logs";
  setTourStepIndex: (val: number) => void;
  setShowTour: (val: boolean) => void;
  setScannedFiles: (val: MediaItem[]) => void;
  setScannedFilesList: (val: MediaItem[]) => void;
  setCorruptFiles: (val: MediaItem[]) => void;
  setHasCompletedScan: (val: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isFluidLayout,
  scanPaths,
  setScanPaths,
  handleBrowseFolder,
  setConfirmAction,
  isScanning,
  isResumeState,
  handleStartScan,
  handlePauseScan,
  handleStopScan,
  handleEvaluateDb,
  activeTab,
  handleTabChange,
  setHelpHighlight,
  scannedFilesList,
  corruptFiles,
  exportFormats,
  setExportFormats,
  exportProfile,
  setExportProfile,
  fakeExportMenu,
  customColumnsMenuRef,
  showCustomColumnsMenu,
  setShowCustomColumnsMenu,
  excelColumns,
  setExcelColumns,
  customRules,
  setScanLogs,
  setCurrentExportFile,
  setExportProgress,
  setIsExporting,
  setExportCompleteMsg,
  setNotification,
  exportDirectory,
  isExporting,
  showDiagnostic,
  setShowDiagnostic,
  previousTab,
  setTourStepIndex,
  setShowTour,
  setScannedFiles,
  setScannedFilesList,
  setCorruptFiles,
  setHasCompletedScan,
}) => {
  return (
    <aside
      className={
        isFluidLayout
          ? "w-full lg:w-64 bg-[#0F1117] border-b lg:border-b-0 lg:border-r border-[#1e232e] flex flex-col shrink-0 select-none overflow-hidden min-h-0"
          : "w-64 bg-[#0F1117] border-r border-[#1e232e] flex flex-col shrink-0 select-none overflow-hidden min-h-0"
      }
    >
      {/* Source path section */}
      <div className="flex flex-col gap-4 p-4 pb-8 flex-1 overflow-y-auto min-h-0 scrollbar-none">
        <section id="paths-section">
          <div className="mb-4">
            <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#8B5CF6] select-none">
              Media Scanner
            </div>
            <div className="h-[1px] bg-gradient-to-r from-[#8B5CF6]/40 via-[#8B5CF6]/10 to-transparent mt-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block">
                What to Scan
              </label>
              <button
                onClick={() => {
                  handleTabChange("help");
                  setHelpHighlight("help-discovery");
                }}
                className="w-4 h-4 rounded-full border border-slate-700 text-slate-400 flex items-center justify-center cursor-pointer hover:bg-slate-700 hover:text-white transition-colors flex-shrink-0"
                title="View Scan Reference Guide"
              >
                <span className="text-[9px] font-bold leading-none">?</span>
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-none">
              {scanPaths.slice(0, isPathsExpanded ? scanPaths.length : 1).map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#1E232E] border border-slate-700/30 rounded px-2 py-1 text-[11px] font-mono text-slate-300"
                >
                  {editingPathIdx === idx ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editPathInput}
                        onChange={(e) => setEditPathInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editPathInput.trim()) {
                            const next = [...scanPaths];
                            next[idx].path = editPathInput.trim();
                            setScanPaths(next);
                            setEditingPathIdx(null);
                            setIsPathsExpanded(false);
                          } else if (e.key === "Escape") {
                            setEditingPathIdx(null);
                            setIsPathsExpanded(false);
                          }
                        }}
                        className="flex-1 bg-[#0F1117] border border-blue-500/50 text-slate-200 px-2 py-1 rounded focus:outline-none w-0 text-[10px]"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (editPathInput.trim()) {
                            const next = [...scanPaths];
                            next[idx].path = editPathInput.trim();
                            setScanPaths(next);
                            setEditingPathIdx(null);
                            setIsPathsExpanded(false);
                          }
                        }}
                        className="text-blue-400 hover:text-blue-300 px-1 cursor-pointer font-bold"
                        title="Save"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingPathIdx(null)}
                        className="text-slate-500 hover:text-slate-300 px-1 cursor-pointer font-bold"
                        title="Cancel"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <label className="flex items-center gap-1.5 cursor-pointer truncate flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={item.enabled}
                          onChange={() => {
                            const next = [...scanPaths];
                            next[idx].enabled = !next[idx].enabled;
                            setScanPaths(next);
                          }}
                          className="rounded border-slate-700 text-blue-500 focus:ring-blue-500 bg-slate-800 h-3 w-3 cursor-pointer"
                        />
                        <span
                          className={`truncate ${item.enabled ? "" : "text-slate-500 line-through"}`}
                          title={item.path}
                        >
                          {item.path}
                        </span>
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingPathIdx(idx);
                            setEditPathInput(item.path);
                          }}
                          className="text-slate-500 hover:text-blue-400 px-1 transition-colors cursor-pointer"
                          title="Edit path"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            const next = scanPaths.filter((_, i) => i !== idx);
                            setScanPaths(next);
                          }}
                          className="text-slate-500 hover:text-rose-400 font-bold px-1 transition-colors cursor-pointer"
                          title="Remove path"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {scanPaths.length === 0 && <div className="py-1"></div>}
            </div>
            <div className="mt-1 flex justify-center pb-2">
              {!isPathsExpanded && scanPaths.length > 1 && (
                <div
                  className="text-[10px] text-slate-500 font-bold italic py-1 text-center cursor-pointer hover:text-blue-400 select-none group"
                  onClick={() => setIsPathsExpanded(true)}
                >
                  + {scanPaths.length - 1} more <span className="text-slate-600 font-normal ml-1">(click to expand)</span>
                </div>
              )}
              {isPathsExpanded && scanPaths.length > 1 && (
                <div
                  className="text-[10px] text-slate-500 font-bold italic py-1 text-center cursor-pointer hover:text-slate-300 select-none group flex items-center justify-center gap-1 mt-1"
                  onClick={() => setIsPathsExpanded(false)}
                  title="Collapse list"
                >
                  <svg className="w-3 h-3 text-slate-600 group-hover:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                  </svg>
                  Collapse list
                </div>
              )}
            </div>
            {isAddingPathApp ? (
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button onClick={handleBrowseFolder} className="bg-blue-600 hover:bg-blue-500 text-white px-2 rounded flex items-center justify-center transition-colors shadow shadow-blue-900/20 text-[10px] font-semibold" title="Browse for folder">
                    <FolderOpen className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="text"
                    value={newPathInputApp}
                    onChange={(e) => setNewPathInputApp(e.target.value)}
                    placeholder="Enter full directory path..."
                    autoFocus
                    className="flex-1 bg-[#1E232E] border border-blue-500/50 text-slate-200 px-2.5 py-1 text-[11px] rounded focus:outline-none w-0"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newPathInputApp.trim()) {
                        setScanPaths([
                          ...scanPaths,
                          { path: newPathInputApp.trim(), enabled: true },
                        ]);
                        setNewPathInputApp("");
                        setIsAddingPathApp(false);
                        setIsPathsExpanded(false);
                      }
                      if (e.key === "Escape") {
                        setIsAddingPathApp(false);
                        setIsPathsExpanded(false);
                        setNewPathInputApp("");
                      }
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setIsAddingPathApp(false);
                      setIsPathsExpanded(false);
                      setNewPathInputApp("");
                    }}
                    className="flex-1 py-1 px-1.5 bg-transparent border border-slate-700 hover:border-slate-500 text-slate-400 rounded text-[11px] font-bold transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newPathInputApp.trim()) {
                        setScanPaths([
                          ...scanPaths,
                          { path: newPathInputApp.trim(), enabled: true },
                        ]);
                        setNewPathInputApp("");
                        setIsAddingPathApp(false);
                        setIsPathsExpanded(false);
                      }
                    }}
                    className="flex-1 py-1 px-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold shadow transition-all cursor-pointer text-center"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-1.5 mt-3">
                <button
                  onClick={() => { setIsAddingPathApp(true); setIsPathsExpanded(true); }}
                  className="flex-1 py-1 px-2 bg-[#1A1D27] hover:bg-[#1E232E] border border-slate-700/50 hover:border-blue-500/50 text-blue-400 rounded text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <span>+ Add Folder</span>
                </button>
                <button
                  onClick={() => {
                    setConfirmAction({ message: "Are you sure you want to clear all scan paths? This action cannot be undone.", onConfirm: () => setScanPaths([]) });
                  }}
                  disabled={scanPaths.length === 0}
                  className="flex-1 py-1 px-2 bg-[#1A1D27] hover:bg-red-500/10 border border-slate-700/50 hover:border-red-500/30 text-red-400 disabled:text-slate-600 disabled:border-slate-800 disabled:bg-[#151821] rounded text-[11px] font-bold transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1"
                >
                  <span>Clear All</span>
                </button>
              </div>
            )}
          </div>
        </section>

        <div id="scan-controls-section" className="flex flex-col gap-2 mt-4 pt-4 border-t border-slate-700/50">
          {/* Start, Pause, Stop row */}
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                handleStartScan();
                if (activeTab === "logs") {
                  handleTabChange("scan");
                }
              }}
              disabled={isScanning || scanPaths.filter((p) => p.enabled).length === 0}
              className="flex-1 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/30 text-white rounded text-[11px] font-bold shadow transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              title="Start or resume scanning"
            >
              <svg className={`w-3 h-3 ${isScanning ? "animate-pulse" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>{isResumeState ? "Resume" : "Start"}</span>
            </button>

            <button
              onClick={() => {
                handlePauseScan();
                if (activeTab === "logs") {
                  handleTabChange("scan");
                }
              }}
              disabled={!isScanning}
              className="flex-1 py-1 bg-orange-600 hover:bg-orange-500 disabled:bg-[#1E232E] disabled:text-slate-500 text-white rounded text-[11px] font-bold shadow transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              title="Pause current scan"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
              <span>Pause</span>
            </button>

            <button
              onClick={() => {
                handleStopScan();
                if (activeTab === "logs") {
                  handleTabChange("scan");
                }
              }}
              disabled={!isScanning && !isResumeState}
              className="flex-1 py-1 bg-rose-600 hover:bg-rose-500 disabled:bg-[#1E232E] disabled:text-slate-500 text-white rounded text-[11px] font-bold shadow transition-all flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              title="Stop scan and reset"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="4" width="16" height="16" rx="1"></rect>
              </svg>
              <span>Stop</span>
            </button>
          </div>

          {/* Secondary Actions row */}
          <div className="flex gap-1 mt-1">
            <button
              onClick={() => {
                handleStartScan(true);
                if (activeTab === "logs") {
                  handleTabChange("scan");
                }
              }}
              disabled={isScanning || scanPaths.filter((p) => p.enabled).length === 0}
              className="flex-[1.2] flex justify-center items-center gap-1 py-1 px-1 bg-indigo-900/30 hover:bg-indigo-800/40 disabled:bg-indigo-900/10 text-indigo-300 disabled:text-indigo-800 rounded text-[10px] font-medium border border-indigo-700/50 hover:border-indigo-500 transition-all cursor-pointer shadow-md disabled:cursor-not-allowed whitespace-nowrap"
              title="Quickly checks for new or modified files without re-scanning unchanged items"
            >
              <svg className={`w-2.5 h-2.5 shrink-0 ${isScanning ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              <span>Quick Refresh</span>
            </button>
            <button
              onClick={() => {
                handleEvaluateDb();
                if (activeTab === "logs") {
                  handleTabChange("scan");
                }
              }}
              disabled={isScanning || scannedFilesList.length === 0}
              className="flex-[1.2] flex justify-center items-center gap-1 py-1 px-1 bg-amber-900/30 hover:bg-amber-800/40 disabled:bg-amber-900/10 text-amber-300 disabled:text-amber-800 rounded text-[10px] font-medium border border-amber-700/50 hover:border-amber-500 transition-all cursor-pointer shadow-md disabled:cursor-not-allowed whitespace-nowrap"
              title="Evaluate Streaming Compatibility on the existing database without disk scan"
            >
              <span>Stream</span>
              <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
        </div>

        {/* Action Trigger Buttons section */}
        <section id="export-section" className="space-y-3 bg-[#1A1D27]/30 border border-slate-805/30 p-3 rounded-lg">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
            Export Formats
          </label>
          <div className="flex justify-between items-center text-[11px] text-slate-400 mb-2 select-none">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200" title="Export as an advanced spreadsheet report (Requires Excel.js)">
              <input
                type="checkbox"
                checked={exportFormats.xlsx}
                onChange={() =>
                  setExportFormats({
                    ...exportFormats,
                    xlsx: !exportFormats.xlsx,
                  })
                }
                className="rounded bg-[#0F1117] border-slate-700 text-blue-500 focus:ring-0 h-3 w-3 cursor-pointer shrink-0"
              />
              <span>XLSX</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200" title="View reports directly in the browser via an interactive HTML file">
              <input
                type="checkbox"
                checked={exportFormats.html}
                onChange={() =>
                  setExportFormats({
                    ...exportFormats,
                    html: !exportFormats.html,
                  })
                }
                className="rounded bg-[#0F1117] border-slate-700 text-blue-500 focus:ring-0 h-3 w-3 cursor-pointer shrink-0"
              />
              <span>HTML</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200" title="Export data as a raw comma-separated values file">
              <input
                type="checkbox"
                checked={exportFormats.csv}
                onChange={() =>
                  setExportFormats({
                    ...exportFormats,
                    csv: !exportFormats.csv,
                  })
                }
                className="rounded bg-[#0F1117] border-slate-700 text-blue-500 focus:ring-0 h-3 w-3 cursor-pointer shrink-0"
              />
              <span>CSV</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-200" title="Export raw JSON data">
              <input
                type="checkbox"
                checked={exportFormats.json}
                onChange={() =>
                  setExportFormats({
                    ...exportFormats,
                    json: !exportFormats.json,
                  })
                }
                className="rounded bg-[#0F1117] border-slate-700 text-blue-500 focus:ring-0 h-3 w-3 cursor-pointer shrink-0"
              />
              <span>JSON</span>
            </label>
          </div>

          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
            Report Type
          </label>
          <div id="export-profile-dropdown-container" className="flex flex-col gap-2.5 text-[11px] text-slate-400 mb-3 select-none relative">
            <select
              value={exportProfile}
              onChange={(e) => setExportProfile(e.target.value)}
              className="w-full bg-[#1A1D24] border border-[#2A303C] rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 text-slate-300 relative z-10"
            >
              <option value="Media Discovery">Media Discovery (Full)</option>
              <option value="Modern Direct Play">Stream Audit</option>
              <option value="Metadata Audit">Metadata Audit</option>
              <option value="Duplication Scan">Duplication Audit</option>
              <option value="Quality Audit">Quality Audit</option>
              <option value="Subtitle Audit">Subtitle Audit</option>
              <option value="Corrupted">Failed/Corrupted Only</option>
              <option value="Export All">Export All Report Types</option>
              <option value="Custom Fields">Custom Fields (Custom Columns)</option>
            </select>
            {fakeExportMenu.show && (
              <div className="absolute top-full left-0 mt-1 w-full bg-[#0C101B] border border-[#2A303C] rounded shadow-2xl z-[100000] overflow-hidden text-[10px] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col py-1">
                  {[
                    { val: "Media Discovery", label: "Media Discovery (Full)" },
                    { val: "Modern Direct Play", label: "Stream Audit" },
                    { val: "Metadata Audit", label: "Metadata Audit" },
                    { val: "Duplication Scan", label: "Duplication Audit" },
                    { val: "Quality Audit", label: "Quality Audit" },
                    { val: "Subtitle Audit", label: "Subtitle Audit" },
                    { val: "Corrupted", label: "Failed/Corrupted Only" },
                    { val: "Export All", label: "Export All Report Types" },
                    { val: "Custom Fields", label: "Custom Fields (Custom Columns)" },
                  ].map((opt) => (
                    <div key={opt.val} className={`px-2 py-1.5 ${fakeExportMenu.highlight === opt.val ? "bg-blue-600/20 text-blue-400 font-bold" : "text-slate-300"}`}>
                      {opt.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {exportProfile === "Custom Fields" && (
              <div ref={customColumnsMenuRef} className="relative mt-2">
                <button
                  type="button"
                  id="btn-custom-fields-popover"
                  onClick={() => setShowCustomColumnsMenu(!showCustomColumnsMenu)}
                  className="w-full flex items-center justify-between gap-1 bg-[#1A1D24] hover:bg-slate-700 border border-[#2A303C] hover:border-blue-500/50 px-2 py-1.5 rounded text-[10px] font-bold text-slate-300 transition-all cursor-pointer h-[26px]"
                >
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3 h-3 text-blue-400" />
                    <span>Customize Columns</span>
                  </span>
                  <span className="text-[9px] text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded-full">
                    {Object.values(excelColumns).filter(Boolean).length} Active
                  </span>
                </button>

                {showCustomColumnsMenu && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#0C101B] border border-slate-700 rounded-xl shadow-2xl p-3 z-[100000] space-y-2.5 max-h-[260px] overflow-y-auto scrollbar-thin">
                    <div className="flex justify-between items-center pb-1.5 border-b border-slate-800">
                      <div>
                        <h4 className="text-[10px] font-extrabold text-slate-200 uppercase tracking-wider">Report Columns</h4>
                        <p className="text-[9px] text-slate-500">Enable/disable fields for custom export</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCustomColumnsMenu(false)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-extrabold uppercase tracking-wider bg-transparent border-0 p-0 cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                    <div className="flex flex-col gap-1 pr-0.5">
                      {Object.keys(excelColumns).map((colName) => {
                        const isChecked = excelColumns[colName];
                        return (
                          <label
                            key={colName}
                            className={`flex items-center gap-2 p-1.5 rounded border text-[10px] font-semibold cursor-pointer select-none transition ${
                              isChecked
                                ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                                : "bg-slate-900/40 border-slate-800/60 text-slate-500 hover:text-slate-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setExcelColumns((prev) => ({ ...prev, [colName]: !isChecked }));
                              }}
                              className="rounded border-slate-700 text-blue-500 bg-slate-800 h-3 w-3 cursor-pointer shrink-0"
                            />
                            <span className="truncate">{colName === "Stream Audit" ? "Stream Friendly?" : colName}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                if (scannedFilesList.length === 0 && corruptFiles.length === 0) {
                  alert("No scanned media files to export. Please trigger scan media process first.");
                  return;
                }
                if (!exportFormats.xlsx && !exportFormats.csv && !exportFormats.html && !exportFormats.json) {
                  alert("Please select at least one format checkbox to export.");
                  return;
                }

                const runExportForProfile = async (targetProfile: string, targetDir?: string, totalReports: number = 1, currentReportIndex: { val: number } = { val: 0 }) => {
                  const profileRules = JSON.parse(JSON.stringify(customRules));

                  profileRules.useDiscoveryPreset = false;
                  profileRules.useModernPreset = false;
                  profileRules.useLegacyPreset = false;
                  profileRules.useMetadataScan = false;
                  profileRules.useVideoMetadataScan = false;
                  profileRules.useMusicMetadataScan = false;
                  profileRules.useDuplicationScan = false;
                  profileRules.useDuplicationVideoScan = false;
                  profileRules.useDuplicationMusicScan = false;
                  profileRules.useAnomalyScan = false;
                  profileRules.useSubtitleScan = false;

                  if (targetProfile === "Media Discovery") {
                    profileRules.useDiscoveryPreset = true;
                  } else if (targetProfile === "Modern Direct Play") {
                    profileRules.useModernPreset = true;
                  } else if (targetProfile === "Metadata Audit") {
                    profileRules.useMetadataScan = true;
                  } else if (targetProfile === "Duplication Scan") {
                    profileRules.useDuplicationScan = true;
                  } else if (targetProfile === "Quality Audit") {
                    profileRules.useAnomalyScan = true;
                  } else if (targetProfile === "Subtitle Audit") {
                    profileRules.useSubtitleScan = true;
                  }

                  let filteredItems = [...scannedFilesList, ...corruptFiles];

                  const duplicatesMap = computeDuplicatesMap(filteredItems, profileRules);
                  filteredItems = filteredItems.map((item) => {
                    const isDup = duplicatesMap.get(item.id) ?? false;
                    const evalResult = evaluatePlexCompatibility(item, profileRules, isDup, true);
                    return {
                      ...item,
                      streamFriendlyLevel: evalResult.level,
                      streamFriendlyReason: evalResult.reason,
                      streamFriendlySuggestion: evalResult.suggestion,
                      streamFriendlyEvaluated: 1,
                    };
                  });

                  if (targetProfile === "Corrupted") {
                    filteredItems = corruptFiles;
                  } else {
                    filteredItems = filterItemsForReport(filteredItems, profileRules);
                  }

                  if (filteredItems.length === 0) return { success: 0, fail: 0 };

                  let jsonCsvItems = filteredItems.filter((item) => item.category !== "Unrecognized" && item.topLevelFolder !== "Unrecognized");

                  let s = 0,
                    f = 0;

                  const updateUI = (filename: string) => {
                    setCurrentExportFile(filename);
                    setExportProgress(Math.round((currentReportIndex.val / Math.max(totalReports, 1)) * 100));
                  };

                  const handleExport = async (format: string, exporter: Function) => {
                    updateUI(`${targetProfile} (${format})`);
                    try {
                      const fname = await exporter();
                      s++;
                      setScanLogs((prev) => [`[SUCCESS] Exported ${fname}`, ...prev]);
                    } catch (e: any) {
                      f++;
                      console.error("Export Error in " + targetProfile + " " + format, e);
                      setScanLogs((prev) => [`[ERROR] Failed to export ${targetProfile} (${format}): ${e.message}`, ...prev]);
                    }
                    currentReportIndex.val++;
                    updateUI(`${targetProfile} (${format}) done`);
                  };

                  const allItems = [...scannedFilesList, ...corruptFiles];
                  if (exportFormats.xlsx) await handleExport("XLSX", () => exportMediaLibraryToExcel(filteredItems, profileRules, excelColumns, targetDir, allItems));
                  if (exportFormats.csv) await handleExport("CSV", () => exportMediaLibraryToCSV(jsonCsvItems, profileRules, excelColumns, targetDir, allItems));
                  if (exportFormats.html) await handleExport("HTML", () => exportMediaLibraryToHTML(filteredItems, profileRules, excelColumns, targetDir, allItems));
                  if (exportFormats.json) await handleExport("JSON", () => exportMediaLibraryToJSON(jsonCsvItems, profileRules, targetDir, allItems));

                  return { success: s, fail: f };
                };

                const doExport = async () => {
                  if (scannedFilesList.length === 0 && corruptFiles.length === 0) {
                    setNotification({ type: "error", message: "No data available to export." });
                    setTimeout(() => setNotification(null), 8000);
                    return;
                  }

                  let targetDir = exportDirectory;
                  if (!targetDir && typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
                    const selected = await open({ directory: true, multiple: false });
                    if (selected && typeof selected === "string") {
                      targetDir = selected;
                    } else {
                      return; // User cancelled
                    }
                  }

                  setIsExporting(true);
                  setExportProgress(0);
                  setCurrentExportFile("Starting exports...");
                  setExportCompleteMsg("");

                  const activeFormatCount = Object.values(exportFormats).filter(Boolean).length;

                  setTimeout(async () => {
                    try {
                      let totalS = 0,
                        totalF = 0;
                      let totalReports = 0;
                      const idx = { val: 0 };

                      const profilesToRun =
                        exportProfile === "Export All"
                          ? ["Media Discovery", "Modern Direct Play", "Metadata Audit", "Duplication Scan", "Quality Audit", "Subtitle Audit", "Corrupted"]
                          : [exportProfile];

                      totalReports = profilesToRun.length * activeFormatCount;

                      for (const p of profilesToRun) {
                        const res = await runExportForProfile(p, targetDir, totalReports, idx);
                        totalS += res.success;
                        totalF += res.fail;
                      }

                      setExportProgress(100);
                      setCurrentExportFile("Done!");

                      const displayDir = targetDir || "your selected folder";
                      const msg = `${totalS} ${totalS === 1 ? "file" : "files"} succeeded, ${totalF} ${totalF === 1 ? "file" : "files"} failed. Reports generated to ${displayDir}.`;

                      setNotification({ type: "export", message: msg });
                      handleTabChange("scan");
                      setScanLogs((prev) => [`Export summary: ${totalS} succeeded, ${totalF} failed. Location: ${displayDir}`, ...prev]);
                      setExportCompleteMsg("Export complete!");
                      setTimeout(() => setExportCompleteMsg(""), 5000);
                    } catch (e: any) {
                      console.error("Export error:", e);
                      setNotification({ type: "error", message: "Error during export: " + (e.message || String(e)) });
                      setExportCompleteMsg("Error during export.");
                      setTimeout(() => setExportCompleteMsg(""), 5000);
                    } finally {
                      setIsExporting(false);
                    }
                  }, 50);
                };
                doExport();
              }}
              className="w-full py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center justify-center gap-1.5 text-[11px] font-bold shadow transition-all cursor-pointer"
            >
              <span>{isExporting ? "Exporting..." : "Export Report"}</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </button>
          </div>
          <div className="text-[9px] text-slate-500 mt-2 text-center border-t border-slate-700/50 pt-2 pb-1 mx-1 italic leading-relaxed">
            Reports were sent to Downloads\BitScribe Reports\
          </div>
        </section>

        {/* Troubleshooting section */}
        <section id="troubleshooting-section" className="space-y-1.5 bg-[#0F1117] border-t border-slate-700/50 pt-3 mt-1 pb-6 shrink-0">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1">
            Troubleshooting
          </label>
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  setShowDiagnostic((prev) => !prev);
                  if (activeTab === "logs") {
                    handleTabChange("scan");
                  }
                }}
                title="Toggles the diagnostic panel that alerts on general database setup issues or API status."
                className={`flex-1 py-1 px-2 rounded text-left text-[11px] font-semibold flex items-center justify-between border transition duration-150 cursor-pointer ${
                  showDiagnostic ? "bg-blue-600/20 border-blue-500/50 text-blue-300 font-bold" : "bg-transparent border-slate-700/50 text-slate-400 hover:border-slate-500 font-medium"
                }`}
              >
                <span>Diagnostic</span>
                <span className={`w-1.5 h-1.5 rounded-full ${showDiagnostic ? "bg-blue-400 shadow-sm shadow-blue-400/50" : "bg-slate-600"}`}></span>
              </button>
              <button
                onClick={() => {
                  if (activeTab === "logs") {
                    handleTabChange(previousTab);
                  } else {
                    handleTabChange("logs");
                  }
                }}
                title="View detailed Application and Console Logs"
                className={`flex-1 py-1 px-2 rounded text-left text-[11px] font-semibold flex items-center justify-between border transition duration-150 cursor-pointer ${
                  activeTab === "logs" ? "bg-emerald-600/20 border-emerald-500/50 text-emerald-300 font-bold" : "bg-transparent border-slate-700/50 text-slate-400 hover:border-slate-500 font-medium"
                }`}
              >
                <span>Logs</span>
                <span className={`w-1.5 h-1.5 rounded-full ${activeTab === "logs" ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-slate-600"}`}></span>
              </button>
            </div>
            <div className="flex gap-1.5 mt-1">
              <button
                onClick={() => {
                  let startStep = 0;
                  if (activeTab === "library") startStep = 21;
                  else if (activeTab === "rules") startStep = 26;
                  else if (activeTab === "help") startStep = 35;

                  if (scannedFilesList.length < 5) {
                    localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: "active", startStep }));
                    localStorage.setItem("bitscribe_demo_data_inserted", "true");
                    injectDemoData().then(async () => {
                      try {
                        const newFiles = await getDbFiles();
                        const cleanFiles = newFiles.filter((f: any) => f.category !== "Corrupted" && (!f.category || !f.category.toLowerCase().includes("corrupt")));
                        const corrupt = newFiles.filter((f: any) => f.category === "Corrupted" || (f.category && f.category.toLowerCase().includes("corrupt")));
                        setScannedFiles(cleanFiles);
                        setScannedFilesList(cleanFiles);
                        setCorruptFiles(corrupt);
                        setScanLogs([`Populated demo database with ${newFiles.length} items.`]);
                      } catch (e) {
                        console.error("Failed to load demo data", e);
                      }
                    });
                    return;
                  }
                  localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: "active", startStep }));
                  setTourStepIndex(startStep);
                  setShowTour(true);
                }}
                className="flex-1 flex justify-center items-center gap-1 py-1 px-1 bg-indigo-950/30 hover:bg-indigo-900/40 text-indigo-300 rounded text-[10px] font-medium border border-indigo-900/50 hover:border-indigo-700 transition-all cursor-pointer shadow-md whitespace-nowrap"
                title="Restart the interactive product tour guide."
              >
                <span>Show Tour</span>
              </button>
              <button
                onClick={() => {
                  setConfirmAction({
                    message: "Are you sure you want to clear your local cache? This will clear your dashboard view history but safely preserve the database.",
                    onConfirm: () => {
                      localStorage.removeItem("bitscribe_scan_logs");
                      localStorage.removeItem("plex_last_scan_timestamp");
                      localStorage.removeItem("bitscribe_scan_in_progress");
                      setScanLogs([]);
                      setScannedFiles([]);
                      setScannedFilesList([]);
                      setCorruptFiles([]);
                      setHasCompletedScan(false);
                      setNotification("Local display cache cleared successfully.");
                    },
                  });
                }}
                className="flex-1 flex justify-center items-center gap-1 py-1 px-1 bg-[#1E232E] hover:bg-slate-800 text-slate-300 rounded text-[10px] font-medium border border-slate-700/50 hover:border-slate-500 transition-all cursor-pointer shadow-md whitespace-nowrap"
                title="Clear local browser cache. Safe to do, does not delete your library."
              >
                <span>Clear Cache</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
};

export default Sidebar;
