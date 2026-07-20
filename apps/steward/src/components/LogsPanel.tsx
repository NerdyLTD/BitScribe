import React from "react";
import { Terminal, Download } from "lucide-react";
import { downloadOrSaveFile } from "../utils/downloader";

export default function LogsPanel({ logs }: { logs: string[] }) {
  const exportLogs = async () => {
    const content = logs.join('\n') || "No logs available for this session.";
    const blob = new Blob([content], { type: 'text/plain' });
    try {
      await downloadOrSaveFile('Bitscribe_App_Logs.log', blob);
    } catch (e: any) {
      console.error("Failed to export logs", e);
      alert("Failed to export logs: " + e.message);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col w-full">
      <div className="flex justify-between items-end mb-6 border-b border-[#1e232e] pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-500" />
            Application Event Logs
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time scanner output and system lifecycle events
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              const errorLogs = logs.filter(log => (log || "").toString().toUpperCase().includes('ERROR') || (log || "").toString().toUpperCase().includes('FAIL'));
              const content = errorLogs.length > 0 ? errorLogs.join('\n') : "No runtime application errors logged during this session.";
              const blob = new Blob([content], { type: 'text/plain' });
              try {
                await downloadOrSaveFile('Bitscribe_error.log', blob);
              } catch (e: any) {
                console.error("Failed to export error logs", e);
                alert("Failed to export logs: " + e.message);
              }
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Error Log
          </button>
          <button
            onClick={exportLogs}
            className="bg-[#2a2a35] hover:bg-[#353545] text-slate-300 text-xs font-semibold px-4 py-2 rounded transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export All Logs
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[#0F1117] rounded-xl border border-[#1e232e] p-4 overflow-y-auto font-mono text-xs text-slate-300 space-y-2 custom-scrollbar shadow-inner drop-shadow-lg leading-relaxed">
        {logs.length === 0 ? (
          <div className="text-slate-500 italic text-center mt-10">No active logs for this session.</div>
        ) : (
          logs.slice(0, 100).map((log, i) => {
            const isError = (log || "").toString().toUpperCase().includes('ERROR') || (log || "").toString().toUpperCase().includes('FAIL');
            const isWarning = (log || "").toString().toUpperCase().includes('WARN') || (log || "").toString().toUpperCase().includes('SKIP');
            const isSuccess = (log || "").toString().toUpperCase().includes('SUCCESS') || (log || "").toString().toUpperCase().includes('COMPLETE');
            
            let textColor = "text-slate-300";
            let bdColor = "border-slate-800";
            if (isError) {
              textColor = "text-rose-400";
              bdColor = "border-rose-500";
            } else if (isWarning) {
              textColor = "text-amber-300";
              bdColor = "border-amber-500";
            } else if (isSuccess) {
              textColor = "text-emerald-400";
              bdColor = "border-emerald-500";
            }

            return (
              <div key={i} className={`border-l-2 ${bdColor} pl-3 py-1 bg-[#141720]/50 rounded-r`}>
                {log}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
