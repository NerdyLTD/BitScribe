import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import { createRequire } from "module";
import sqlite3 from "sqlite3";

function inferCategory(baseDirName: string, fileName: string, extName: string, filePath?: string): string {
  const parsedPath = require('path').parse(baseDirName);
  const dirName = parsedPath.name || baseDirName;
  let cat = dirName;
  const lowerCat = baseDirName.toLowerCase();
  const lowerFilePath = (filePath || '').toLowerCase();
  
  let isAudioFile = false;
  const ext = extName.replace('.', '').toLowerCase();
  if (['mp3', 'flac', 'm4a', 'wav', 'aac', 'ogg', 'wma', 'alac', 'm4b', 'ape', 'opus', 'mka'].includes(ext)) {
    isAudioFile = true;
  }
  let isStatic = false;
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'jfif'].includes(ext)) {
    isStatic = true;
  }

  if (isStatic) return "Static";
  if (isAudioFile) {
    // Check for Soundtracks and Compilations in file path
    const folderParts = lowerFilePath.replace(/\\/g, '/').split('/').filter(p => p);
    // Find where 'music' or 'audio' might be
    const mIdx = folderParts.findIndex(p => p === 'music' || p === 'audio');
    if (mIdx !== -1 && mIdx < folderParts.length - 1) {
      const sub = folderParts[mIdx + 1];
      if (sub === 'soundtracks') return 'Soundtracks';
      if (sub === 'compilations') return 'Music Compilations';
    }
    // Also check just containing "soundtracks" or "compilations"
    if (lowerFilePath.includes('/soundtracks/') || lowerFilePath.includes('\\soundtracks\\')) return 'Soundtracks';
    if (lowerFilePath.includes('/compilations/') || lowerFilePath.includes('\\compilations\\')) return 'Music Compilations';
    
    return "Music Albums";
  }

  // Check if this is a top-level Specials / Extras folder being scanned as its own root library
  const isTopLevelSpecialsRoot = lowerCat === 'specials' || lowerCat === 'holiday specials' || lowerCat === 'tv specials';

  // check folder names
  if (filePath) {
    const normPath = filePath.replace(/\\/g, '/').toLowerCase();
    const parts = normPath.split('/').filter(p => p);
    const folderParts = parts.slice(0, -1); // exclude filename

    for (const f of folderParts) {
      if (f.includes('docuseries') || f.includes('documentary series') || f.includes('documentary show')) {
        return "Docuseries";
      }
      if (f.includes('tv shows') || f.includes('tv show') || f.includes('tvshows') || f === 'tv' || f.includes('series') || f.includes('shows')) {
        return "TV Shows";
      }
      if (f.includes('documentaries') || f.includes('documentary') || f.includes('docs') || f === 'doc') {
        return "Documentaries";
      }
      if (f.includes('movies') || f.includes('movie') || f.includes('films') || f === 'film' || f.includes('cinema') || f.includes('cinemas') || f === 'uhd' || f.includes('foreign')) {
        return "Movies";
      }
      if (f.includes('short film') || f.includes('shortfilm') || f.includes('shorts') || f.includes('short')) {
        return "Shorts";
      }
      if (f.includes('anime')) {
        return "Anime";
      }
      if (f.includes('concert') || f.includes('live performance') || f.includes('live show') || f.includes('live performances') || f.includes('live shows')) {
        return "Concerts";
      }
      if (f.includes('education')) {
        return "Education";
      }
    }
  }

  // Also check original base scan path lowerCat for backward compatibility
  if (lowerCat.includes('docuseries') || lowerCat.includes('documentary series') || lowerCat.includes('documentary show')) {
    return "Docuseries";
  }

  // Check for extras/featurettes in the file path
  const extrasRegex = /(^|[\\/])(extras|specials|bonus|behind[ _\-]?the[ _\-]?scenes|featurettes|shorts|deleted[ _\-]?scenes|interviews|promos|trailers)(?=$|[\\/]|\s)/i;
  if (extrasRegex.test(lowerFilePath)) {
    if (!isTopLevelSpecialsRoot) {
      return "Extras";
    }
  } else if (lowerCat.includes('tv') || lowerCat.includes('show') || lowerCat.includes('series')) {
    return "TV Shows";
  } else if (lowerCat.includes('doc')) {
    return "Documentaries";
  } else if (lowerCat.includes('movie') || lowerCat.includes('film') || lowerCat.includes('cinema')) {
    return "Movies";
  } else if (lowerCat.includes('short')) {
    return "Shorts";
  } else if (lowerCat.includes('anime')) {
    return "Anime";
  } else if (lowerCat.includes('concert') || lowerCat.includes('live performance') || lowerCat.includes('live show')) {
    return "Concerts";
  } else if (lowerCat.includes('education')) {
    return "Education";
  }

  // fallback to parsing filename
  const rawName = fileName.replace(/\.[a-z0-9]+$/i, '');
  const seMatch = rawName.match(/([sS](\d{1,2})[eE](\d{1,2})|\b(\d{1,2})x(\d{1,2})\b|\b(\d{1,2})[ ]?of[ ]?(\d{1,2})\b)/i);
  if (seMatch) {
    return "TV Shows";
  }
  
  const yearMatch = rawName.match(/\(?\[?(19\d{2}|20\d{2})\]?\)?/);
  if (yearMatch) {
    return "Movies";
  }

  if (isTopLevelSpecialsRoot) {
    return "Movies";
  }

  return "Other"; // default to Other instead of full path
}

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const app = express();
const PORT = 3000;

app.use(express.json({ limit: "500mb" }));

// Ensure Downloads directory exists
const downloadsDir = path.join(os.homedir(), "Downloads", "BitScribe Reports");
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// --- API Routes ---
app.post("/api/export", async (req, res) => {
  try {
    const { filename, base64 } = req.body;
    if (!filename || !base64) {
      return res.status(400).json({ error: "Missing filename or base64 content" });
    }
    
    // Ensure Downloads directory exists right before saving (in case it was deleted)
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }

    const outputPath = path.join(downloadsDir, filename);
    const [, data] = base64.split(",");
    const buffer = Buffer.from(data || base64, "base64");
    
    await fs.promises.writeFile(outputPath, buffer);
    res.json({ success: true, path: outputPath });
  } catch (err: any) {
    console.error("[API] Error saving export:", err);
    res.status(500).json({ error: err.message });
  }
});

// Initialize SQLite database with resilient runtime failover
const dbDir = path.join(process.cwd(), "BitScribeDB");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, "steward.db");

let db: any = null;

try {
  db = new sqlite3.Database(dbPath);
  console.log(`[DB] Connected to native SQLite database at ${dbPath}`);
} catch (err) {
  console.error("[DB] Failed to bind sqlite3 file.", err);
  process.exit(1);
}
if (db) {
  db.serialize(() => {
    db.run("PRAGMA synchronous = OFF;");
    db.run("PRAGMA journal_mode = WAL;");
    db.run(`
      CREATE TABLE IF NOT EXISTS scanned_files (
        id TEXT PRIMARY KEY,
        filename TEXT,
        filePath TEXT,
        category TEXT,
        container TEXT,
        sizeGB REAL,
        durationMins REAL,
        year INTEGER,
        videoCodec TEXT,
        videoResolution TEXT,
        videoBitrateMbps REAL,
        audioTracks TEXT,
        subtitleTracks TEXT,
        tags TEXT,
        audioBitrate REAL,
        isCorrupted INTEGER DEFAULT 0,
        errorMessage TEXT,
        hasEmbeddedPoster INTEGER DEFAULT 0,
        bitrateAnomaly INTEGER DEFAULT 0,
        bitrateAnomalyReason TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error("[DB] Failed to create SQLite table:", err);
      } else {
        console.log("[DB] SQLite database table scanned_files is active and synchronized.");
        db.run("ALTER TABLE scanned_files ADD COLUMN topLevelFolder TEXT", (err: any) => {
          // ignore column exists error
        });
      }
    });
  });
}

function getTopLevelFolder(filePath: string): string {
  const parts = filePath.split(/[\\\/]/).filter(Boolean);
  if (parts.length === 0) return "Unknown";
  let targetIdx = 0;
  if (/^[a-zA-Z]:$/.test(parts[0])) targetIdx = 1;
  else if (parts[0] === 'app' || parts[0] === 'data') targetIdx = 1; // common docker roots
  
  if (targetIdx < parts.length) {
    let t = parts[targetIdx];
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  return "Unknown";
}

// Helper to save a file to the SQLite database
function saveScannedFile(item: any, isCorrupted: number, errorMessage: string = ""): Promise<void> {
  return new Promise((resolve, reject) => {
    // Note: To maximize performance, we use db.run directly instead of opening/closing a prepared 
    // statement on every loop iteration, which causes enormous sqlite3 overhead in node.
    db.run(
      `INSERT OR REPLACE INTO scanned_files (
        id, filename, filePath, category, container, sizeGB, durationMins, year,
        videoCodec, videoResolution, videoBitrateMbps, audioTracks, subtitleTracks, tags, audioBitrate, isCorrupted, errorMessage, hasEmbeddedPoster, bitrateAnomaly, bitrateAnomalyReason, topLevelFolder
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id || item.filePath || "",
        item.filename || path.basename(item.filePath || item.id || ""),
        item.filePath || item.id || "",
        item.category || "Unknown",
        item.container || "unknown",
        Number(item.sizeGB || 0),
        Number(item.durationMins || 0),
        Number(item.year || 0),
        item.videoCodec || "",
        item.videoResolution || "",
        Number(item.videoBitrateMbps || item.videoBitrate || 0),
        JSON.stringify(item.audioTracks || []),
        JSON.stringify(item.subtitleTracks || []),
        JSON.stringify(item.tags || {}),
        Number(item.audioBitrate || 0),
        isCorrupted,
        errorMessage,
        Number(item.hasEmbeddedPoster ? 1 : 0),
        Number(item.bitrateAnomaly ? 1 : 0),
        item.bitrateAnomalyReason || "",
        item.topLevelFolder || ""
      ],
      (err) => {
        if (err) {
          console.error(`[DB] Error saving file to DB: ${item.filePath}`, err);
          return resolve(); // Resolve anyway so scan continues
        }
        resolve();
      }
    );
  });
}

// Robust JSON parsing fallback to ensure DB records hydrate cleanly without exceptions
function safeParseJson(value: any, fallback: any = []) {
  if (!value) return fallback;
  if (typeof value === "object") return value; 
  try {
    return JSON.parse(value);
  } catch (err) {
    console.warn(`[DB] JSON parse warning on value: ${String(value).substring(0, 80)}`, err);
    return fallback;
  }
}

// Helper to retrieve all database records for fast incremental caching
function getAllDatabaseRecords(): Promise<any[]> {
  return new Promise((resolve) => {
    if (!db) {
      resolve([]);
      return;
    }
    db.all("SELECT * FROM scanned_files", [], (err, rows) => {
      if (err || !rows) {
        resolve([]);
      } else {
        resolve(rows);
      }
    });
  });
}

// REST Api routes to fetch saved files and clear database
app.get("/api/db-files", (req, res) => {
  db.all("SELECT * FROM scanned_files", [], (err, rows) => {
    if (err) {
      console.error("[DB] Error retrieving scan records:", err);
      return res.status(500).json({ error: "Failed to load database records" });
    }
    const cleanRows = (rows || []).map((row: any) => ({
      id: row.id,
      filename: row.filename,
      filePath: row.filePath,
      category: row.category,
      container: row.container,
      sizeGB: row.sizeGB,
      durationMins: row.durationMins || 0,
      year: row.year || 0,
      videoCodec: row.videoCodec,
      videoResolution: row.videoResolution,
      videoBitrateMbps: row.videoBitrateMbps || 0,
      audioTracks: safeParseJson(row.audioTracks, []),
      subtitleTracks: safeParseJson(row.subtitleTracks, []),
      tags: safeParseJson(row.tags, {}),
      audioBitrate: row.audioBitrate || 0,
      isCorrupted: !!row.isCorrupted,
      errorMessage: row.errorMessage || ""
    }));
    res.json(cleanRows);
  });
});

app.post("/api/db-clear", (req, res) => {
  db.run("DELETE FROM scanned_files", [], (err) => {
    if (err) {
      console.error("[DB] Error wiping database table:", err);
      return res.status(500).json({ error: "Failed to clear database" });
    }
    console.log("[DB] Database scanned_files table successfully cleared.");
    res.json({ status: "success", cleared: true });
  });
});


// Mock media library for cloud fallback
const MOCK_MEDIA_LIBRARY = [
  {
    id: "mock1",
    filename: "Inception.2010.1080p.BluRay.x264.mkv",
    filePath: "C:\\Media\\Movies\\Inception.2010.1080p.BluRay.x264.mkv",
    sizeGB: 12.5,
    category: "Movie",
    container: "mkv",
    videoCodec: "h264",
    videoResolution: "1080p (1920x1080)",
    videoBitrate: 15400,
    videoProfile: "high",
    audioTracks: [
      { codec: "dts", channels: 6, language: "eng" },
      { codec: "ac3", channels: 6, language: "fre" }
    ],
    subtitleTracks: [
      { codec: "srt", language: "eng", forced: false },
      { codec: "pgs", language: "eng", forced: false }
    ]
  },
  {
    id: "mock2",
    filename: "The.Matrix.1999.4K.HDR.HEVC.mkv",
    filePath: "C:\\Media\\Movies\\The.Matrix.1999.4K.HDR.HEVC.mkv",
    sizeGB: 45.2,
    category: "Movie",
    container: "mkv",
    videoCodec: "hevc",
    videoResolution: "4K (3840x2160)",
    videoBitrate: 55000,
    videoProfile: "main 10",
    audioTracks: [
      { codec: "truehd", channels: 8, language: "eng" },
      { codec: "ac3", channels: 6, language: "eng" }
    ],
    subtitleTracks: [
      { codec: "pgs", language: "eng", forced: false }
    ]
  }
];

// Utility to recursively find files
function getAllFiles(dirPath: string, allowedExtensions: string[], arrayOfFiles: string[] = []) {
  try {
    const files = fs.readdirSync(dirPath);
    files.forEach(function(file) {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = getAllFiles(fullPath, allowedExtensions, arrayOfFiles);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          arrayOfFiles.push(fullPath);
        }
      }
    });
  } catch (err) {
    console.warn(`Could not read dir ${dirPath}:`, err);
  }
  return arrayOfFiles;
}

app.post("/api/scan", async (req, res) => {
  const { paths } = req.body;
  console.log(`[API] Received POST /api/scan with paths:`, paths);

  if (!paths || !Array.isArray(paths)) {
    console.log(`[API] Error: No paths provided`);
    return res.status(400).json({ error: "No paths provided" });
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Send 2KB padding to flush reverse proxies (like nginx typically uses 4k-8k buffers, but 2k helps prime it)
  res.write(JSON.stringify({ type: 'log', message: 'Initializing connection... ' + ' '.repeat(2048) }) + '\n');

  let ffprobePath = "ffprobe";
  try {
    console.log(`[API] Attempting to load ffprobe-static...`);
    res.write(JSON.stringify({ type: 'log', message: `Attempting to load ffprobe-static...` }) + '\n');
    const ffprobeStatic = await import("ffprobe-static");
    ffprobePath = ffprobeStatic.default?.path || ffprobeStatic.path || "ffprobe";
    console.log(`[API] ffprobe-static path resolved to: ${ffprobePath}`);
    res.write(JSON.stringify({ type: 'log', message: `ffprobe-static path resolved to: ${ffprobePath}` }) + '\n');
  } catch(e: any) {
    console.warn(`[API] ffprobe-static module could not be loaded: ${e.message}. Relying on system path.`);
  }

  // Check if FFprobe is available (either system or auto-downloaded)
  let hasFfprobe = false;
  try {
    console.log(`[API] Checking if FFprobe is accessible...`);
    res.write(JSON.stringify({ type: 'log', message: `Checking if FFprobe is accessible...` }) + '\n');
    const { stdout } = await execFileAsync(ffprobePath, ["-version"], { timeout: 10000 });
    hasFfprobe = true;
    console.log(`[API] FFprobe is available. Output length: ${stdout.length}`);
    res.write(JSON.stringify({ type: 'log', message: `FFprobe is available. Output length: ${stdout.length}` }) + '\n');
  } catch (e: any) {
    console.warn(`[API] FFprobe check failed: ${e.message}. Falling back to mock data for preview.`);
  }


  if (!hasFfprobe) {
    console.log(`[API] Using mock data fallback...`);
    res.write(JSON.stringify({ type: 'log', message: `Using mock data fallback...` }) + '\n');
    res.write(JSON.stringify({ type: 'start', total: MOCK_MEDIA_LIBRARY.length }) + '\n');
    await new Promise(resolve => setTimeout(resolve, 1000));
    for (let i = 0; i < MOCK_MEDIA_LIBRARY.length; i++) {
        const mockItem = MOCK_MEDIA_LIBRARY[i];
        // Ensure duration and year exist in mock structure
        const enrichedMock = {
          ...mockItem,
          durationMins: (mockItem as any).durationMins || 116,
          year: (mockItem as any).year || 2010,
          videoBitrateMbps: (mockItem as any).videoBitrateMbps || ((mockItem as any).videoBitrate ? (mockItem as any).videoBitrate / 1000 : 12.5)
        };
        await saveScannedFile(enrichedMock, 0);
        res.write(JSON.stringify({ type: 'progress', current: i + 1, total: MOCK_MEDIA_LIBRARY.length, item: enrichedMock }) + '\n');
    }
    res.write(JSON.stringify({ type: 'done' }) + '\n');
    res.end();
    return;
  }

  // Pre-gather all files across all selected paths to estimate total for progress
  let allFilesToScan: { file: string, baseDirName: string }[] = [];
  console.log(`[API] Gathering files to scan...`);
    res.write(JSON.stringify({ type: 'log', message: `Gathering files to scan...` }) + ' '.repeat(2048) + '\n');
  
  for (const scanPath of paths) {
    console.log(`[API] Scanning path: ${scanPath.path}`);
    res.write(JSON.stringify({ type: 'log', message: `Scanning path: ${scanPath.path}` }) + ' '.repeat(2048) + '\n');
    await new Promise(r => setTimeout(r, 20)); // Yield to event loop to flush chunks
    const rawPath = scanPath.path.replace(/\\/g, '/');
    const parts = rawPath.split('/').filter(p => p.length > 0 && !p.includes(':'));
    let baseDirName = parts.length > 0 ? parts[parts.length - 1] : path.basename(scanPath.path);
    // capitalize just in case
    baseDirName = baseDirName.charAt(0).toUpperCase() + baseDirName.slice(1);
    
    const isMusicDir = baseDirName.toLowerCase().includes('music');
    
    const extensions = [
      '.mkv', '.mp4', '.avi', '.ts', '.m4v', '.webm', '.wmv', '.mov', '.mpg', '.flv',
      '.3gp', '.m2ts', '.vob', '.divx', '.asf', '.mts', '.m2t',
      '.mp3', '.flac', '.m4a', '.wav', '.aac', '.ogg', '.wma', '.alac', '.m4b', '.ape', '.opus', '.mka',
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.jfif'
    ];

    const files = getAllFiles(scanPath.path, extensions);
    console.log(`[API] Found ${files.length} files in ${scanPath.path}`);
    res.write(JSON.stringify({ type: 'log', message: `Found ${files.length} files in ${scanPath.path}` }) + ' '.repeat(2048) + '\n');
    await new Promise(r => setTimeout(r, 20)); // Yield to event loop
    for (const file of files) {
      allFilesToScan.push({ file, baseDirName });
    }
  }

  console.log(`[API] Total files found: ${allFilesToScan.length}`);
  res.write(JSON.stringify({ type: 'log', message: `Total files found: ${allFilesToScan.length}` }) + ' '.repeat(2048) + '\n');

  if (allFilesToScan.length === 0) {
    res.write(JSON.stringify({ type: 'error', message: 'Path not found, please check your Paths to Scan settings' }) + '\n');
    res.end();
    return;
  }

  let isAborted = false;
  req.on("close", () => {
    isAborted = true;
    console.log(`[API] Client disconnected. Cancelling scan operations.`);
  });

  res.write(JSON.stringify({ type: 'start', total: allFilesToScan.length }) + '\n');

  // Load existing records to fast-track matching files
  const existingRecords = await getAllDatabaseRecords();
  const existingMap = new Map<string, any>();
  existingRecords.forEach(rec => {
    if (rec && rec.filePath) {
      existingMap.set(rec.filePath.replace(/\\/g, '/'), rec);
    }
  });

  let processedCount = 0;
  // Limit concurrency using all logical threads except one to leave breathing room for the OS.
  const logicalCores = os.cpus().length;
  const concurrency = Math.max(1, logicalCores - 1);
  console.log(`[API] Starting queue with concurrency: ${concurrency} (Logical Cores: ${logicalCores})`);
  
  let pointer = 0;

  // If we have FFprobe, scan locally
  const worker = async (workerId: number) => {
    console.log(`[Worker ${workerId}] Started.`);
    while (pointer < allFilesToScan.length) {
      if (isAborted) {
        console.log(`[Worker ${workerId}] Gracefully exiting worker due to scan abort.`);
        break;
      }
      const pId = pointer++;
      const scanItem = allFilesToScan[pId];
      if (!scanItem) continue;
      
      const file = scanItem.file;
      const baseDirName = scanItem.baseDirName;

      // Incremental scan cache check
      const standardFile = file.replace(/\\/g, '/');
      const cached = existingMap.get(standardFile);
      if (cached) {
        let fileSizeGB = 0;
        try {
          const stats = fs.statSync(file);
          fileSizeGB = stats.size / (1024 * 1024 * 1024);
        } catch (e) {}

        // If file size on disk is virtually matching the cached record, reuse it directly!
        if (Math.abs(fileSizeGB - Number(cached.sizeGB)) < 0.005) {
          console.log(`[Worker ${workerId}] Cache hit for: ${path.basename(file)}. Skipping ffprobe.`);
          processedCount++;
          
          const currentCat = inferCategory(baseDirName, path.basename(file), path.extname(file), file);

          const hydratedItem = {
            id: cached.id,
            filename: cached.filename,
            filePath: cached.filePath,
            category: currentCat,
            container: cached.container,
            sizeGB: Number(cached.sizeGB || 0),
            durationMins: Number(cached.durationMins || 0),
            year: Number(cached.year || 0),
            videoCodec: cached.videoCodec,
            videoResolution: cached.videoResolution,
            videoBitrateMbps: Number(cached.videoBitrateMbps || 0),
            audioTracks: safeParseJson(cached.audioTracks, []),
            subtitleTracks: safeParseJson(cached.subtitleTracks, []),
            tags: safeParseJson(cached.tags, {}),
            audioBitrate: Number(cached.audioBitrate || 0),
            isCorrupted: !!cached.isCorrupted,
            errorMessage: cached.errorMessage || "",
            isCached: true
          };

          if (hydratedItem.isCorrupted) {
            res.write(JSON.stringify({
              type: 'progress',
              current: pId + 1,
              total: allFilesToScan.length,
              error: hydratedItem.errorMessage || "Skipped corrupted asset",
              file: hydratedItem.filename,
              filePath: hydratedItem.filePath,
              size: hydratedItem.sizeGB
            }) + '\n');
          } else {
            res.write(JSON.stringify({
              type: 'progress',
              current: pId + 1,
              total: allFilesToScan.length,
              item: hydratedItem
            }) + '\n');
          }
          continue;
        }
      }

      try {
        console.log(`[Worker ${workerId}] Probing (${pId+1}/${allFilesToScan.length}): ${path.basename(file)}`);
        // Use optimized ffprobe flags (-analyzeduration and -probesize) to speed up scanning
        // Using execFileAsync prevents shell injection and maxBuffer prevents JSON truncation
        const { stdout } = await execFileAsync(ffprobePath, [
          "-v", "quiet",
          "-print_format", "json",
          "-show_format",
          "-show_streams",
          "-analyzeduration", "1000000",
          "-probesize", "2000000",
          file
        ], { maxBuffer: 1024 * 1024 * 10, timeout: 60000, killSignal: 'SIGKILL' });
        
        console.log(`[Worker ${workerId}] Probe successful for: ${path.basename(file)}. Parsing data...`);
        const data = JSON.parse(stdout);
        
        // Extract basic data
        const format = data.format || {};
        const streams = data.streams || [];
        
        // Exclude mjpeg streams which are often just album art/cover files
        const videoStream = streams.find((s: any) => s.codec_type === 'video' && s.codec_name !== 'mjpeg' && s.codec_name !== 'png');
        const audioStreams = streams.filter((s: any) => s.codec_type === 'audio');
        const subStreams = streams.filter((s: any) => s.codec_type === 'subtitle');
        
        let width = videoStream?.width || 0;
        let height = videoStream?.height || 0;
        let resString = "sd";
        if (height === 0 && !videoStream) {
          resString = "-"; // Audio only
        } else if (width >= 3200 || height >= 1600) {
          resString = "4k";
        } else if (width >= 1600 || height >= 900) {
          resString = "1080p";
        } else if (width >= 960 || height >= 600) {
          resString = "720p";
        }

        const fileName = path.basename(file);
        const ext = path.extname(file).toLowerCase().replace('.', '');
        
        const posterStream = streams.find((s: any) => 
          (s.codec_name === 'mjpeg' || s.codec_name === 'png') && 
          s.disposition && s.disposition.attached_pic === 1
        );
        const hasEmbeddedPoster = !!posterStream;
        
        const dirName = path.dirname(file);
        const nameWithoutExt = fileName.replace(new RegExp(`\\\\.${ext}$`, 'i'), '');
        const hasExternalPoster = 
          fs.existsSync(path.join(dirName, 'poster.jpg')) ||
          fs.existsSync(path.join(dirName, 'poster.png')) ||
          fs.existsSync(path.join(dirName, 'folder.jpg')) ||
          fs.existsSync(path.join(dirName, 'folder.png')) ||
          fs.existsSync(path.join(dirName, 'cover.jpg')) ||
          fs.existsSync(path.join(dirName, 'cover.png')) ||
          fs.existsSync(path.join(dirName, `${nameWithoutExt}.jpg`)) ||
          fs.existsSync(path.join(dirName, `${nameWithoutExt}.png`)) ||
          fs.existsSync(path.join(dirName, `${nameWithoutExt}-poster.jpg`));

        let bitrateAnomaly = false;
        let bitrateAnomalyReason = "";
        
        const vbr = videoStream?.bit_rate ? parseInt(videoStream.bit_rate) : 0;
        const mbps = vbr / 1000000;
        
        if (vbr > 0 && videoStream) {
          if (resString === "4k" && mbps < 5) {
             bitrateAnomaly = true;
             bitrateAnomalyReason = `Extremely low bitrate (${mbps.toFixed(1)} Mbps) for 4K resolution.`;
          } else if (resString === "1080p" && mbps < 1.5) {
             bitrateAnomaly = true;
             bitrateAnomalyReason = `Extremely low bitrate (${mbps.toFixed(1)} Mbps) for 1080p resolution.`;
          } else if (resString === "4k" && mbps > 150) {
             bitrateAnomaly = true;
             bitrateAnomalyReason = `Suspiciously high bitrate (${mbps.toFixed(1)} Mbps) for 4K encoded media.`;
          } else if (resString === "1080p" && mbps > 50) {
             bitrateAnomaly = true;
             bitrateAnomalyReason = `Suspiciously high bitrate (${mbps.toFixed(1)} Mbps) for 1080p.`;
          } else if (resString === "720p" && mbps > 20) {
             bitrateAnomaly = true;
             bitrateAnomalyReason = `Suspiciously high bitrate (${mbps.toFixed(1)} Mbps) for 720p.`;
          } else if (resString === "sd" && mbps > 10) {
             bitrateAnomaly = true;
             bitrateAnomalyReason = `Suspiciously high bitrate (${mbps.toFixed(1)} Mbps) for SD.`;
          }
        }
        
        
        let cat = inferCategory(baseDirName, fileName, ext, file);

        if (cat === "Music Albums" || cat === "Soundtracks" || cat === "Music Compilations") {
          const lowerPath = file.toLowerCase();
          if (lowerPath.includes('tv') || lowerPath.includes('show') || lowerPath.includes('movie')) {
             bitrateAnomaly = true;
             bitrateAnomalyReason = (bitrateAnomalyReason ? bitrateAnomalyReason + " " : "") + "Audio file found in Video library directory. Recommended to move to Music library.";
          }
        }

        let formatName = format.format_name || "unknown";
        let containerName = ext || formatName.split(",")[0];
        if (formatName.includes("matroska") && !ext) {
          containerName = "mkv";
        } else if ((formatName.includes("mp4") || formatName.includes("m4a")) && !ext) {
          containerName = "mp4";
        }
        
        const parsedItem = {
          id: file,
          filename: fileName,
          filePath: file,
          sizeGB: format.size ? Math.round((parseInt(format.size) / (1024 ** 3)) * 10000) / 10000 : 0,
          category: cat,
          container: containerName,
          videoCodec: videoStream?.codec_name || "unknown",
          videoResolution: resString !== "-" ? `${width}x${height} [${resString}]` : "-",
          videoBitrate: videoStream?.bit_rate ? Math.round(parseInt(videoStream.bit_rate) / 1000) : 0,
          videoBitrateMbps: videoStream?.bit_rate ? Math.round((parseInt(videoStream.bit_rate) / 1000000) * 10) / 10 : 0,
          videoProfile: videoStream?.profile || "unknown",
          audioTracks: audioStreams.map((a: any, index: number) => ({
            index,
            codec: a.codec_name || "unknown",
            channels: a.channels || 2,
            language: a.tags?.language || "unk",
            title: a.tags?.title || ""
          })),
          subtitleTracks: subStreams.map((s: any, index: number) => ({
            index,
            codec: s.codec_name || "unknown",
            language: s.tags?.language || "unk",
            title: s.tags?.title || "",
            forced: s.disposition?.forced === 1
          })),
          tags: format.tags || {},
          audioBitrate: format.bit_rate ? Math.round(parseInt(format.bit_rate) / 1000) : 0,
          durationMins: format.duration ? Math.round(parseFloat(format.duration) / 60) : 0,
          year: format.tags?.date ? (parseInt(format.tags.date) || 0) : (format.tags?.year ? (parseInt(format.tags.year) || 0) : 0),
          hasEmbeddedPoster,
          hasExternalPoster,
          bitrateAnomaly,
          bitrateAnomalyReason,
          topLevelFolder: getTopLevelFolder(file)
        };

        // Save real files data synchronously to our database
        await saveScannedFile(parsedItem, 0);

        processedCount++;
        res.write(JSON.stringify({ type: 'progress', current: processedCount, total: allFilesToScan.length, item: parsedItem }) + '\n');
      } catch (err: any) {
        processedCount++;
        // Suppress huge stack traces for file read errors but log the core message
        const failedFile = path.basename(file);
        let errorMsg = err.message || "Read error";
        if (errorMsg.includes("Command failed") || errorMsg.includes("spawn ffprobe")) {
           const stderrMatch = err.stderr ? err.stderr.trim() : null;
           if (stderrMatch) {
              const firstLine = stderrMatch.split('\n')[0];
              errorMsg = `File couldn't be read due to: ${firstLine}`;
           } else {
              errorMsg = "File couldn't be read (possible unsupported format or corruption)";
           }
        }
        // Remove file path from error if present (using basename to be safe, but also sweeping the full path if visible)
        errorMsg = errorMsg.replace(file, '').replace(failedFile, '').trim();
        console.warn(`[WARN] Skipping unreadable/corrupt file: ${failedFile} - ${errorMsg.substring(0, 100)}`);
        
        const corruptItem = {
          id: file,
          filename: failedFile,
          filePath: file,
          sizeGB: 0,
          category: 'Corrupted',
          container: 'unknown',
          videoCodec: '',
          videoResolution: '',
          videoBitrateMbps: 0,
          audioTracks: [],
          subtitleTracks: [],
          durationMins: 0,
          year: 0,
          tags: { title: "Error", artist: errorMsg }
        };
        await saveScannedFile(corruptItem, 1, errorMsg);

        res.write(JSON.stringify({ type: 'progress', current: processedCount, total: allFilesToScan.length, error: 'Failed', file: failedFile, filePath: file, errorMessage: errorMsg }) + '\n');
      }
    }
  };

  const workers = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
  await Promise.all(workers);
  
  console.log(`[API] All workers finished.`);

  // If using DB fallback, flush any pending in-memory records to disk now
  if (db && typeof db.flush === "function") {
    try {
      db.flush();
      console.log(`[DB] Fallback database successfully flushed to disk.`);
    } catch (dbErr) {
      console.error(`[DB] Error flushing database on scan completion:`, dbErr);
    }
  }

  res.write(JSON.stringify({ type: 'done' }) + '\n');
  res.end();
  console.log(`[API] Sent done signal.`);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ["**/BitScribeDB/**", "**/BitScribeDB"]
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
