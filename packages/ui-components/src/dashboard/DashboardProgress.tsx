import React from 'react';
import { Download } from 'lucide-react';
import { BitsyCharacter } from '../BitsyCharacter';

interface DashboardProgressProps {
  isScanning: boolean;
  scanProgress: number;
  currentScanFile: string;
  isQuickRefresh?: boolean;
  elapsedSeconds: number;
  
  isExporting?: boolean;
  exportProgress?: number;
  currentExportFile?: string;
  formatDurationStr: (ms: number) => string;
}

export function DashboardProgress({
  isScanning,
  scanProgress,
  currentScanFile,
  isQuickRefresh,
  elapsedSeconds,
  isExporting,
  exportProgress,
  currentExportFile,
  formatDurationStr
}: DashboardProgressProps) {
  if (!isScanning && !isExporting) return null;

  return (
    <div className="space-y-4">
      {isScanning && (
        <div className="p-4 bg-[#14171F] border border-blue-500/20 rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-blue-500/5 animate-pulse"></div>
          <div className="relative flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-blue-400 flex items-center gap-2 tracking-wider">
                <BitsyCharacter className="w-6 h-6 text-blue-500 shrink-0" dancing={scanProgress < 100} pose={scanProgress === 100 ? "tada" : "default"} talking={scanProgress < 100} mood={scanProgress === 100 ? "excited" : "happy"} />
                {scanProgress === 0 ? (isQuickRefresh ? "CHECKING FOR MODIFIED FILES (Quick scan)..." : "PROBING FILES (Large directories may take several minutes)...") : "ANALYZING METADATA..."}
              </h3>
              <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                <div className="text-xs text-blue-400 font-mono bg-blue-950/40 border border-blue-500/20 px-2 py-0.5 rounded-lg">
                  Elapsed: {formatDurationStr(elapsedSeconds * 1000)}
                </div>
                <div className="text-blue-300 font-mono text-xl font-bold">{scanProgress}%</div>
              </div>
            </div>
            <div className="w-full bg-[#0F1117] h-3 rounded-full overflow-hidden border border-[#1e232e]">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                style={{ width: `${scanProgress}%` }}
              ></div>
            </div>
            {currentScanFile && (
              <div className="text-[11px] text-slate-400 font-mono truncate mt-2">
                Current: <span className="text-slate-300">{currentScanFile}</span>
              </div>
            )}
          </div>
        </div>
      )}
      {isExporting && (
        <div className="p-4 bg-[#14171F] border border-yellow-500/20 rounded-xl shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-yellow-500/5 animate-pulse"></div>
          <div className="relative flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-yellow-400 flex items-center gap-2 tracking-wider">
                <Download className="w-4 h-4 animate-pulse text-yellow-500" />
                GENERATING REPORTS...
              </h3>
              <div className="text-yellow-300 font-mono text-xl font-bold">{exportProgress}%</div>
            </div>
            <div className="w-full bg-[#0F1117] h-3 rounded-full overflow-hidden border border-[#1e232e]">
              <div 
                className="h-full bg-yellow-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                style={{ width: `${exportProgress}%` }}
              ></div>
            </div>
            {currentExportFile && (
              <div className="text-[11px] text-slate-400 font-mono truncate mt-2">
                Exporting: <span className="text-slate-300">{currentExportFile}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
