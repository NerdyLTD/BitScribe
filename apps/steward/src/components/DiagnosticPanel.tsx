import React, { useEffect, useState } from "react";
import { getDiagnostic } from '@bitscribe/core-db';
import { Cpu, Server, HardDrive, AlertCircle, CheckCircle2, ServerCog, Activity, Database, FileJson } from "lucide-react";
import { downloadOrSaveFile } from "../utils/downloader";

interface DiagnosticInfo {
  status: string;
  uptime: number;
  memoryUsage: {
    rss: string;
    heapTotal: string;
    heapUsed: string;
  };
  os: {
    platform: string;
    release: string;
    type: string;
    cpus: number;
    freeMem: string;
    totalMem: string;
  };
  databaseStatus: string;
  ffprobeStatus: string;
  appVersion: string;
  nodeVersion: string;
}

export default function DiagnosticPanel() {
  const [info, setInfo] = useState<DiagnosticInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiagnostics = async () => {
      try {
        const data = await getDiagnostic();
        setInfo({
            status: "online",
            uptime: 0,
            memoryUsage: { rss: "N/A", heapTotal: "N/A", heapUsed: "N/A" },
            os: { platform: (data as any).platform, release: "N/A", type: (data as any).arch, cpus: (data as any).cpus || 1, freeMem: "N/A", totalMem: "N/A" },
            databaseStatus: "SQLite Bundle Online",
            ffprobeStatus: (data as any).ffprobePath,
            appVersion: (data as any).appVersion,
            nodeVersion: "Tauri Rust Native"
        } as any);
      } catch (err: any) {
        setError(err.message || "Could not reach local server.");
      } finally {
        setLoading(false);
      }
    };
    fetchDiagnostics();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-[#14171F] border border-blue-500/20 rounded-xl shadow-lg shadow-blue-500/5 animate-pulse h-32 flex items-center justify-center">
        <span className="text-blue-400 font-mono text-sm">Gathering System Diagnostics...</span>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl shadow-lg">
        <div className="flex items-center gap-2 text-rose-400 mb-2 font-bold">
          <AlertCircle className="w-5 h-5" />
          Diagnostic Failure
        </div>
        <div className="text-slate-300 text-sm">{error || "Unknown error"}</div>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (parts.length === 0) return "< 1m";
    return parts.join(" ");
  };

  const handleExportJSON = async () => {
    try {
      const diagnosticReport = {
        timestamp: new Date().toISOString(),
        appName: "BitScribe",
        appVersion: info.appVersion,
        platform: info.os.platform,
        arch: info.os.type,
        cpus: info.os.cpus,
        ffprobePath: info.ffprobeStatus,
        databaseStatus: info.databaseStatus,
        nodeVersion: info.nodeVersion,
        localStorageKeys: {
          scanPaths: localStorage.getItem("bitscribe_scan_paths"),
          customRules: localStorage.getItem("bitscribe_custom_rules"),
          completedScan: localStorage.getItem("bitscribe_has_completed_scan"),
        }
      };
      
      const jsonStr = JSON.stringify(diagnosticReport, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      await downloadOrSaveFile("bitscribe_diagnostics.json", blob);
    } catch (err: any) {
      alert(`Failed to export diagnostics: ${err.message}`);
    }
  };

  return (
    <div className="p-4 bg-[#14171F] border border-blue-500/20 rounded-xl shadow-lg shadow-blue-500/5 transition-all">
      <div className="flex justify-between items-center mb-4 border-b border-[#1e232e] pb-3">
        <h3 className="text-[15px] font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          System Diagnostics
        </h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-colors shadow-inner cursor-pointer"
            title="Export Diagnostic Report as JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-blue-400" />
            <span>Export JSON</span>
          </button>
          <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 font-mono text-xs font-semibold border border-blue-500/20 shadow-inner">
            v{info.appVersion} | Node {info.nodeVersion}
          </span>
          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 font-mono text-xs font-semibold border border-emerald-500/20 shadow-inner flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_5px_rgba(52,211,153,0.8)] animate-pulse"></span>
            Server Online ({formatUptime(info.uptime)})
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Core Dependencies */}
        <div className="bg-[#0F1117] rounded-lg border border-[#1e232e] p-3 shadow-inner">
          <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-1.5">
            <ServerCog className="w-3.5 h-3.5" />
            Core Dependencies
          </h4>
          <div className="space-y-3">
            <div>
              <div className="text-[10px] text-slate-500 mb-0.5">FFprobe Backend</div>
              <div className="flex items-center gap-1.5 text-xs">
                {info.ffprobeStatus.startsWith("Found") || info.ffprobeStatus.includes("bundled") ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span className={info.ffprobeStatus.startsWith("Found") || info.ffprobeStatus.includes("bundled") ? "text-slate-300 truncate" : "text-rose-400"}>
                  {info.ffprobeStatus.startsWith("Found") || info.ffprobeStatus.includes("bundled") ? info.ffprobeStatus.replace("Found at ", "") : "Not Reachable"}
                </span>
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 mb-0.5">SQLite Connection</div>
              <div className="flex items-center gap-1.5 text-xs">
                {info.databaseStatus.includes("Error") ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span className={info.databaseStatus.includes("Error") ? "text-rose-400" : "text-slate-300 truncate"}>
                  {info.databaseStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* System Memory */}
        <div className="bg-[#0F1117] rounded-lg border border-[#1e232e] p-3 shadow-inner">
          <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            Memory Utilization
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Process RSS</span>
              <span className="text-slate-200 font-mono">{info.memoryUsage.rss}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">V8 Heap Used</span>
              <span className="text-slate-200 font-mono">{info.memoryUsage.heapUsed} / {info.memoryUsage.heapTotal}</span>
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-slate-800/50 mt-1">
              <span className="text-slate-400">System Memory</span>
              <span className="text-slate-200 font-mono">{info.os.freeMem} free / {info.os.totalMem}</span>
            </div>
          </div>
        </div>

        {/* Environment */}
        <div className="bg-[#0F1117] rounded-lg border border-[#1e232e] p-3 shadow-inner">
          <h4 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-3 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5" />
            Host Environment
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">OS Platform</span>
              <span className="text-slate-200 font-mono capitalize">{info.os.platform} ({info.os.type})</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">OS Release</span>
              <span className="text-slate-200 font-mono truncate max-w-[120px]">{info.os.release}</span>
            </div>
            <div className="flex justify-between text-xs pt-2 border-t border-slate-800/50 mt-1">
              <span className="text-slate-400">Logical Cores</span>
              <span className="text-slate-200 font-mono">{info.os.cpus} CPU(s)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
