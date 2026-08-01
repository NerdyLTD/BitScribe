import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import React from 'react';
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any, info: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error("ErrorBoundary caught an error", error, info);
    this.setState({ info });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: '20px', background: 'black', height: '100vh', boxSizing: 'border-box' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error && this.state.error.toString()}</pre>
          <pre>{this.state.info && this.state.info.componentStack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

import App from './App';
import './index.css';


// Diagnostic Logging Initialization
(async function initDiagnosticLogging() {
  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      const isLoggingEnabled = localStorage.getItem("bitscribe_diagnostic_logging") === "true";
      if (!isLoggingEnabled) return;
      
      if ((window as any).__BITSCRIBE_LOG_INITIALIZED__) return;
      (window as any).__BITSCRIBE_LOG_INITIALIZED__ = true;
      
      const { downloadDir, join } = await import('@bitscribe/desktop-api');
      const { writeTextFile, mkdir, exists } = await import('@bitscribe/desktop-api');
      
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
        
      const logFile = await join(exportDir, `${safeTs}_debuglog.txt`);
      const timestamp = now.toISOString();
      const APP_VERSION = "1.5.0"; // Hardcoded for this script context
      
      const logContent = `[${timestamp}] App launched successfully. 
Version: ${APP_VERSION}

--- BITScribe Architecture & Reference Dump ---
Packages: core-db, core-eval, core-export, core-types, desktop-api, ui-components
Main Entrypoints:
  - Scan: packages/core-db/src/api.ts (scanDirectories)
  - Desktop FS/DB: apps/steward/src-tauri/src/lib.rs (walk_dir, execute_sqlite)
  - Exports: packages/core-export/src/reportExporter.ts & excelExporter.ts
Database Schema (SQLite 'scanned_files'):
  id TEXT PRIMARY KEY, filename TEXT, filePath TEXT, category TEXT, container TEXT, sizeGB REAL, durationMins REAL, year INTEGER, videoCodec TEXT, videoResolution TEXT, videoBitrateMbps REAL, audioTracks TEXT, subtitleTracks TEXT, tags TEXT, audioBitrate REAL, isCorrupted INTEGER, errorMessage TEXT, hasEmbeddedPoster INTEGER, bitrateAnomaly INTEGER, bitrateAnomalyReason TEXT, topLevelFolder TEXT, streamFriendlyLevel TEXT, streamFriendlyReason TEXT, streamFriendlySuggestion TEXT, streamFriendlyEvaluated INTEGER, videoBitDepth TEXT, audioSampleRate INTEGER, chapterCount INTEGER, rawAudioCodec TEXT, physicalAudioChannels INTEGER, matchedOnlineId TEXT, fileUuid TEXT, hasExternalSubtitles INTEGER, embeddedSubtitleLanguages TEXT, author TEXT, narrator TEXT, publisher TEXT, bookSeries TEXT, seriesIndex REAL, isbn TEXT, pageCount INTEGER, videoFrameRate REAL
Indexes:
  - PRIMARY KEY (id)
  - idx_scanned_files_filePath ON scanned_files(filePath)
-----------------------------------------------
`;

      
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
          const currentContent = await import('@bitscribe/desktop-api').then(m => m.readTextFile(logFile).catch(() => ""));
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
        logBuffer.push(`[${ts}] [${level}] ${msg}\n`);
        
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
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </StrictMode>,
);
