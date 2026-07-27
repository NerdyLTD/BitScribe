const fs = require('fs');
let file = fs.readFileSync('apps/steward/src/main.tsx', 'utf8');

const loggingCode = `
// Diagnostic Logging Initialization
(async function initDiagnosticLogging() {
  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      const isLoggingEnabled = localStorage.getItem("bitscribe_diagnostic_logging") === "true";
      if (!isLoggingEnabled) return;
      
      if ((window as any).__BITSCRIBE_LOG_INITIALIZED__) return;
      (window as any).__BITSCRIBE_LOG_INITIALIZED__ = true;
      
      const { downloadDir, join } = await import('@tauri-apps/api/path');
      const { writeTextFile, mkdir, exists } = await import('@tauri-apps/plugin-fs');
      
      let exportDir = localStorage.getItem("bitscribe_export_directory") || "";
      if (!exportDir) {
        const dlDir = await downloadDir();
        exportDir = await join(dlDir, "BitScribe");
      }
      
      const dirExists = await exists(exportDir);
      if (!dirExists) {
        await mkdir(exportDir, { recursive: true });
      }
      
      const now = new Date();
      const safeTs = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') + '-' +
        String(now.getMinutes()).padStart(2, '0') + '-' +
        String(now.getSeconds()).padStart(2, '0');
        
      const logFile = await join(exportDir, \`\${safeTs}_debuglog.txt\`);
      const timestamp = now.toISOString();
      const APP_VERSION = "1.4.8"; // Hardcoded for this script context
      const logContent = \`[\${timestamp}] App launched successfully. \\nVersion: \${APP_VERSION}\\n\`;
      
      await writeTextFile(logFile, logContent);
      console.info("Diagnostic log started at: " + logFile);
      
      // Override console to write to file
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      const originalConsoleInfo = console.info;
      
      let logBuffer: string[] = [];
      let isWriting = false;
      
      const flushLogs = async () => {
        if (isWriting || logBuffer.length === 0) return;
        isWriting = true;
        const chunk = logBuffer.join("");
        logBuffer = [];
        try {
          const currentContent = await import('@tauri-apps/plugin-fs').then(m => m.readTextFile(logFile).catch(() => ""));
          await writeTextFile(logFile, currentContent + chunk);
        } catch(e) {
          // Fallback silence
        }
        isWriting = false;
        if (logBuffer.length > 0) {
          setTimeout(flushLogs, 1000);
        }
      };
      
      const appendLog = (level: string, ...args: any[]) => {
        const msg = args.map(a => {
          if (a instanceof Error) return a.stack || a.message;
          if (typeof a === 'object') {
             try { return JSON.stringify(a); } catch(e) { return String(a); }
          }
          return String(a);
        }).join(" ");
        const ts = new Date().toISOString();
        logBuffer.push(\`[\${ts}] [\${level}] \${msg}\\n\`);
        
        if (!isWriting) {
          setTimeout(flushLogs, 500);
        }
      };
      
      console.log = (...args: any[]) => {
        appendLog('LOG', ...args);
        originalConsoleLog.apply(console, args);
      };
      console.error = (...args: any[]) => {
        appendLog('ERROR', ...args);
        originalConsoleError.apply(console, args);
      };
      console.warn = (...args: any[]) => {
        appendLog('WARN', ...args);
        originalConsoleWarn.apply(console, args);
      };
      console.info = (...args: any[]) => {
        appendLog('INFO', ...args);
        originalConsoleInfo.apply(console, args);
      };
    }
  } catch (err) {
    console.error("Failed to initialize diagnostic logging", err);
  }
})();
`;

file = file.replace("createRoot(document.getElementById('root')!).render(", loggingCode + "\\n\\ncreateRoot(document.getElementById('root')!).render(");
fs.writeFileSync('apps/steward/src/main.tsx', file);
