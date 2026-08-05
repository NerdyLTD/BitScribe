import { stat } from '@bitscribe/desktop-api';
import { invoke } from "@bitscribe/desktop-api";
const isTauri = () => typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

let _mockDb: MediaItem[] = [];
try {
  const stored = localStorage.getItem('mock_db_fallback');
  if (stored) _mockDb = JSON.parse(stored);
} catch (e) {}

function saveMockDb(items: MediaItem[]) {
  _mockDb = items;
  try {
    localStorage.setItem('mock_db_fallback', JSON.stringify(_mockDb));
  } catch (e) {}
}

import { Command } from "@bitscribe/desktop-api";
import { MediaItem } from '@bitscribe/core-types';
import { evaluatePlexCompatibility, sanitizeTags } from '@bitscribe/core-eval';
import { MOCK_MEDIA_LIBRARY } from "./data/mockMediaData";

export async function getDbFiles(): Promise<MediaItem[]> {
    if (!isTauri()) return _mockDb;
    const CHUNK_SIZE = 5000;
    let allFiles: MediaItem[] = [];
    let offset = 0;
    while (true) {
        const chunk = (await invoke("get_db_files", { limit: CHUNK_SIZE, offset })) as MediaItem[];
        if (!chunk || chunk.length === 0) break;
        allFiles = allFiles.concat(chunk);
        offset += CHUNK_SIZE;
        if (chunk.length < CHUNK_SIZE) break;
    }
    return allFiles;
}

export async function clearDb(): Promise<void> {
    if (!isTauri()) {
        saveMockDb([]);
        return;
    }
    await invoke("clear_db");
}

export async function clearDemoData(): Promise<void> {
    const allItems = await getDbFiles();
    const demoIds = new Set(MOCK_MEDIA_LIBRARY.map(x => x.id));
    const nonDemoItems = allItems.filter(item => !demoIds.has(item.id));
    
    if (!isTauri()) {
        saveMockDb(nonDemoItems);
        return;
    }
    await invoke("clear_db");
    if (nonDemoItems.length > 0) {
        await invoke("save_db_files", { files: nonDemoItems });
    }
}

export async function saveDbFiles(files: MediaItem[]): Promise<void> {
    if (!isTauri()) {
        const idMap = new Map(_mockDb.map(x => [x.id, x]));
        for (const file of files) {
            idMap.set(file.id, file);
        }
        saveMockDb(Array.from(idMap.values()));
        return;
    }
    await invoke("save_db_files", { files });
}

export async function deleteDbFiles(ids: string[]): Promise<void> {
    if (!isTauri()) {
        const idSet = new Set(ids);
        saveMockDb(_mockDb.filter(x => !idSet.has(x.id)));
        return;
    }
    await invoke("delete_db_files", { ids });
}

function parseFrameRate(fpsStr?: string): number | undefined {
    if (!fpsStr || fpsStr === "N/A" || fpsStr === "0/0") return undefined;
    if (fpsStr.includes('/')) {
        const parts = fpsStr.split('/');
        const num = parseFloat(parts[0]);
        const den = parseFloat(parts[1]);
        if (num > 0 && den > 0) {
            const val = num / den;
            return parseFloat(val.toFixed(3));
        }
    } else {
        const val = parseFloat(fpsStr);
        if (val > 0) return parseFloat(val.toFixed(3));
    }
    return undefined;
}

export async function getDiagnostic() {
    if (!isTauri()) {
        return {
            platform: "web",
            arch: "unknown",
            appVersion: import.meta.env.APP_VERSION || "1.5.0",
            ffprobePath: "simulated"
        };
    }
    return await invoke("get_diagnostic");
}

function parseOnlineId(filename: string): string {
    const match = filename.match(/\[?(tmdb|tvdb|imdb|anidb)(?:id)?[\-=_]?([a-zA-Z0-9]+)\]?/i);
    if (match) {
        return `${match[1].toLowerCase()}-${match[2].toLowerCase()}`;
    }
    return "";
}

function inferCategory(baseDirName: string, fileName: string, extName: string, filePath?: string, tags?: Record<string, string>): string {
    const dirName = baseDirName;
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
      if (fileName.toLowerCase() === "theme.mp3") return "Ignore";
      if (lowerFilePath.includes('/soundtracks/') || lowerFilePath.includes('\\soundtracks\\')) return 'Soundtracks';
      if (lowerFilePath.includes('/compilations/') || lowerFilePath.includes('\\compilations\\')) return 'Music Compilations';
      return "Music Albums";
    }

    const isVideoFile = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'm4v', 'flv', 'webm', 'mpg', 'mpeg', 'ts', 'vob', '3gp', 'ogv'].includes(ext);
    if (!isVideoFile) {
      return "Other";
    }

    if (filePath) {
      const normPath = '/' + filePath.replace(/\\/g, '/').toLowerCase() + '/';
      
      // Match explicit Extras folders by regex on the path
      if (/\/(extras|bonus|behindthescenes|featurette|short|scene|deleted|commentary|interview|promo|trailer|blooper|gagreel|outtake)s?\//i.test(normPath)) {
          return "Extras";
      }
      
      // Check for Specials
      const specialsMatch = normPath.match(/\/(specials|holiday specials|tv specials)\//i);
      if (specialsMatch) {
          const prefix = normPath.substring(0, specialsMatch.index);
          // If a major video category exists BEFORE specials, it's considered Extras
          if (/\/(movies?|tv shows?|tv|series|docuseries|documentaries)\//i.test(prefix)) {
              return "Extras";
          }
          return "Specials";
      }

      // Check remaining categories with priority mapping:
      const parts = normPath.split('/').filter(p => p);
      // Remove the filename (the last item) so that file-level metadata substrings (like "pdtv" matching "tv") do not pollute category matching
      if (parts.length > 1) {
        parts.pop();
      }

      // 1. High-priority / Highly Specific categories anywhere in the path have overall priority.
      for (const f of parts) {
        if (f.includes('docuseries')) return "Docuseries";
        if (f.includes('anime')) return "Anime";
        if (f.includes('documentaries') || f === 'doc') return "Documentaries";
        if (f === 'plays') return "Plays";
        if (f.includes('fitness')) return "Fitness";
        if (f === 'shorts' || f.includes('short film') || f === 'shortfilms' || f === 'short-films' || f === 'shortfilm') return "Shorts";
        if (f === 'music' || f === 'music-library' || f === 'music_library' || f === 'music videos' || f.includes('music video') || f === 'musicvideos' || f === 'music-videos' || f === 'musicvideo') return "Music Videos";
      }

      // 2. Top-down scan (left-to-right) for general or potentially ambiguous categories (TV vs Movie).
      // This ensures that an authoritative top-level library folder like "Movies" or "TV Shows"
      // takes priority over deep nested folders (e.g. "Z:\Movies\D\Dr Horrible Miniseries" -> Movie).
      for (const f of parts) {
        const isTv = f.includes('tv shows') || 
                     f === 'tv' || 
                     /\btv\b/i.test(f) || 
                     f.includes('tvshows') || 
                     f === 'series' || 
                     /\bseries\b/i.test(f) || 
                     f.includes('season');
        if (isTv) return "TV";

        const isMovie = f.includes('movies') || f.includes('movie');
        if (isMovie) return "Movie";
      }
    }
    
    // Fallback classification for unstructured folders (e.g. C:\Stuff) using filename patterns and tags
    const tvRegex = /([sS]\d{1,2}[eE]\d{1,3}|\b\d{1,2}x\d{1,3}\b|\b(season|series)\s*\d+\b|\bep(isode)?\s*\d+\b|\b\d{1,2}\s*of\s*\d+\b)/i;
    
    const getTag = (keys: string[]): string | undefined => {
      if (!tags) return undefined;
      for (const k of keys) {
        const foundKey = Object.keys(tags).find(tk => tk.toLowerCase() === k.toLowerCase());
        if (foundKey && tags[foundKey]) {
          return String(tags[foundKey]).trim();
        }
      }
      return undefined;
    };

    const hasTvTags = tags && (
      getTag(['show', 'show_name', 'series', 'tvshow', 'show_title', 'series_title', 'season_number', 'episode_id', 'episode_sort']) !== undefined ||
      (getTag(['genre']) && /tv|television|anime/i.test(getTag(['genre']) || ''))
    );
    
    if (tvRegex.test(fileName) || hasTvTags) {
      if (fileName.toLowerCase().includes('anime') || (tags && /anime/i.test(getTag(['genre']) || ''))) {
        return "Anime";
      }
      return "TV";
    }

    return "Movie"; // default fallback for video files
}

// Fast basename helper to prevent regex and split allocations during loops
function fastBasename(p: string): string {
    const lastSlash = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
    return lastSlash !== -1 ? p.substring(lastSlash + 1) : p;
}

// Global cache for configured paths normalization
const _topLevelPathCache = new Map<string, { normBase: string, normBaseLower: string }>();

function getTopLevelFolder(filePath: string, configuredPaths?: string[]): string {
    if (!filePath) return "Unknown";
    const normFile = filePath.replace(/\\/g, '/');
    const normFileLower = normFile.toLowerCase();
    
    if (configuredPaths && configuredPaths.length > 0) {
        let matchingBase = "";
        for (const p of configuredPaths) {
            let cached = _topLevelPathCache.get(p);
            if (!cached) {
                const normBase = p.replace(/\\/g, '/');
                cached = { normBase, normBaseLower: normBase.toLowerCase() };
                _topLevelPathCache.set(p, cached);
            }
            if (normFileLower.startsWith(cached.normBaseLower)) {
                if (cached.normBase.length > matchingBase.length) {
                    matchingBase = cached.normBase;
                }
            }
        }
        
        if (matchingBase) {
            let noSlash = matchingBase.endsWith('/') ? matchingBase.slice(0, -1) : matchingBase;
            let baseName = fastBasename(noSlash);
            if (!baseName) {
                return matchingBase;
            }
            return baseName;
        }
    }

    const parts = normFile.split('/').filter(p => p);
    if (parts.length === 0) return "Unknown";
    
    let targetIdx = 0;
    
    // Check for Windows drive letters (e.g., Z:, C:)
    if (parts[0].endsWith(':') || /^[a-zA-Z]:$/.test(parts[0])) {
        if (parts.length > 1) {
            targetIdx = 1;
        } else {
            return parts[0] + "\\";
        }
    }
    
    // Ignore common mount points/app dirs
    if (targetIdx < parts.length && (parts[targetIdx] === 'app' || parts[targetIdx] === 'data' || parts[targetIdx] === 'media')) {
        if (targetIdx + 1 < parts.length) {
            targetIdx++;
        }
    }
    
    if (targetIdx < parts.length) {
        // If the resolved "top level folder" is actually the file itself (e.g., "Z:\SomeFile.mkv" -> ["Z:", "SomeFile.mkv"])
        // and targetIdx is pointing to the file, return "Root"
        if (targetIdx === parts.length - 1 && parts.length > 1) {
            return "Root";
        }
        return parts[targetIdx];
    }
    
    return "Unknown";
}

function safeParseInt(val: any, fallback: number = 0): number {
    if (val === undefined || val === null) return fallback;
    const parsed = parseInt(String(val));
    return isNaN(parsed) ? fallback : parsed;
}

function safeParseFloat(val: any, fallback: number = 0): number {
    if (val === undefined || val === null) return fallback;
    const parsed = parseFloat(String(val));
    return isNaN(parsed) ? fallback : parsed;
}

function getTrackLanguage(stream: any): string {
    if (!stream || !stream.tags) return "und";
    const keys = Object.keys(stream.tags);
    const langKey = keys.find(k => k.toLowerCase() === 'language');
    if (!langKey) return "und";
    const lang = String(stream.tags[langKey]).toLowerCase().trim();
    return lang ? lang.substring(0, 3) : "und";
}

export async function scanDirectories(paths: string[], rules: any, onStart: (total: number) => void, onLog: (msg: string) => void, onProgress: (prog: any) => void, isResume: boolean = false, isQuickRefresh: boolean = false, signal?: AbortSignal) {
    onLog("Initializing scan...");

    const shouldLogStd = rules?.enableStandardLogging !== false;
    const shouldLogDiagScan = rules?.diagnosticLoggingEnabled === true && rules?.diagLogScanEngine !== false;
    const shouldLogDiagMedia = rules?.diagnosticLoggingEnabled === true && rules?.diagLogMediaParsing !== false;
    const shouldLogDiagSystem = rules?.diagnosticLoggingEnabled === true && rules?.diagLogSystem !== false;
    
    const stdLog = (lvl: "INFO"|"WARN"|"ERROR", msg: string) => {
        if (shouldLogStd) logEvent(lvl, "ScanEngine", msg, false);
    };
    const diagLog = (sys: "Scan"|"Media"|"System", lvl: "INFO"|"WARN"|"ERROR", msg: string) => {
        if (sys === "Scan" && shouldLogDiagScan) logEvent(lvl, "ScanEngine", msg, true);
        if (sys === "Media" && shouldLogDiagMedia) logEvent(lvl, "MediaParsing", msg, true);
        if (sys === "System" && shouldLogDiagSystem) logEvent(lvl, "System", msg, true);
    };
    
    stdLog("INFO", "ScanEngine started on paths: " + paths.join(", "));
    diagLog("Scan", "INFO", "Initializing fast multi-threaded scan sequence...");

    const scanStartTime = performance.now();
    console.info("[PROFILER] Scan started.");
    
    let isMac = false;
    let ffprobePath = "";
    if (isTauri()) {
        try {
            const diag = await invoke("get_diagnostic") as any;
            isMac = diag.platform === 'macos';
        } catch (e) {}
        
        onLog("Extracting and verifying bundled ffprobe engine...");
        try {
            ffprobePath = await invoke("setup_ffprobe") as string;
            onLog("ffprobe extracted to: " + ffprobePath);
        } catch (e: any) {
            const errMsg = e.message || String(e);
            stdLog("ERROR", "Failed to extract ffprobe: " + errMsg);
            throw new Error("Failed to extract ffprobe: " + errMsg);
        }
        
        onLog("Validating native ffprobe execution...");
        try {
            if (isTauri()) {
                await invoke("run_ffprobe", { binPath: ffprobePath, args: ['-version'] });
            } else {
                await Command.sidecar('bin/ffprobe', ['-version']).execute();
            }
        } catch (e: any) {
            const errMsg = e.message || String(e);
            stdLog("ERROR", "FFprobe validation failed: " + errMsg);
            throw new Error(`CRITICAL NATIVE COMPATIBILITY ERROR:\nThe video parsing engine (ffprobe) is blocked or incompatible with your operating system.\n\nTechnical Details: ${errMsg}`);
        }
    }
    
    // ITEM 1: Centralized cross-platform path normalization.
    // Handles both Windows backslashes and Unix forward slashes gracefully to prevent file mismatches.
    const normalizePath = (pStr: string) => {
        if (!pStr) return "";
        return pStr.replace(/\\/g, '/').toLowerCase().trim();
    };

    let existingPaths = new Set<string>();
    let existingDbFilesCache: any[] = [];
    let existingFilesMap = new Map<string, any>();
    onLog("Loading existing database to determine cache-skip files...");
    try {
        const dbFiles = await getDbFiles();
        existingDbFilesCache = dbFiles;
        dbFiles.forEach(f => {
            const normPath = normalizePath(f.filePath || f.id);
            (f as any)._normPath = normPath;
            existingPaths.add(normPath);
            existingFilesMap.set(normPath, f);
        });
        onLog(`Found ${existingPaths.size} existing files in database.`);
    } catch (e) {
        onLog("Failed to load DB. Starting fresh.");
    }
    const allowedExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.m2ts', '.ts', '.vob', '.mxf', '.mp3', '.flac', '.m4a', '.wav', '.aac', '.ogg', '.wma', '.alac', '.m4b', '.ape', '.opus', '.mka'];
    const allowedExtensionsSet = new Set(allowedExtensions);
    
    let allFiles: {path: string, hash: string, hasExternalSubtitles?: boolean, normPath: string}[] = [];
    
    // Walk all directories concurrently to fully utilize CPU cores and overlapping filesystem IO
    onLog(`Walking ${paths.length} director${paths.length === 1 ? 'y' : 'ies'} in parallel...`);
    
    const walkStartTime = performance.now();
    const walkPromises = paths.map(async (p) => {
        if (signal?.aborted) return;
        onLog(`Walking directory: ${p}`);
        try {
            const files = isTauri()
                ? (await invoke("walk_dir", { path: p })) as {path: string, size: number, fileHash: string, hasExternalSubtitles: boolean}[]
                : MOCK_MEDIA_LIBRARY.filter(m => {
                    const normFile = m.filePath.replace(/\\/g, '/').toLowerCase();
                    const normPath = p.replace(/\\/g, '/').toLowerCase();
                    const pathWithSlash = normPath.endsWith('/') ? normPath : normPath + '/';
                    return normFile.startsWith(pathWithSlash) || normFile === normPath;
                  }).map(m => ({ 
                      path: m.filePath, 
                      size: Math.round((m.sizeGB || 0) * 1024 * 1024 * 1024), 
                      fileHash: "mock-" + m.id,
                      hasExternalSubtitles: false
                  }));
            
            let validCount = 0;
            const dirFiles: {path: string, hash: string, hasExternalSubtitles?: boolean, normPath: string}[] = [];
            for (const fileObj of files) {
                const file = fileObj.path;
                const lower = file.toLowerCase();
                const lastDotIdx = lower.lastIndexOf('.');
                const ext = lastDotIdx !== -1 ? lower.substring(lastDotIdx) : "";
                if (allowedExtensionsSet.has(ext)) {
                    const normPath = normalizePath(file);
                    dirFiles.push({
                        path: file, 
                        hash: fileObj.fileHash,
                        hasExternalSubtitles: fileObj.hasExternalSubtitles,
                        normPath: normPath
                    });
                    // Temporarily store the physical size in the map so we can use it later
                    existingFilesMap.set(normPath + "_physical_size", fileObj.size as any);
                    validCount++;
                }
            }
            onLog(`Found ${validCount} valid media files in ${p}`);
            return dirFiles;
        } catch (err: any) {
            let errorMsg = err.message || String(err);
            onLog(`ERROR walking directory "${p}": ${errorMsg}`);
            
            // Translate technical file errors to descriptive user-readable ones
            if (errorMsg.includes("does not exist") || errorMsg.includes("No such file")) {
                errorMsg = `The directory "${p}" does not exist. Please double-check the path configuration.`;
            } else if (errorMsg.includes("Permission denied") || errorMsg.includes("access") || errorMsg.includes("inaccessible")) {
                errorMsg = `Permission denied accessing directory "${p}". Please check read permissions.`;
            } else {
                errorMsg = `Failed to access folder "${p}": ${errorMsg}`;
            }
            throw new Error(errorMsg);
        }
    });

    try {
        const results = await Promise.all(walkPromises);
    const walkEndTime = performance.now();
    console.info(`[PROFILER] Directory walk completed in ${(walkEndTime - walkStartTime).toFixed(2)}ms for ${paths.length} paths.`);
    diagLog("System", "INFO", `Directory walk completed in ${(walkEndTime - walkStartTime).toFixed(2)}ms. Found ${allFiles.length} files.`);
        if (signal?.aborted) {
            onLog("Scan aborted by user during directory walk.");
            return;
        }
        for (const res of results) {
            if (res) {
                allFiles.push(...res);
            }
        }
    } catch (err: any) {
        throw err;
    }

    if (!isResume) {
        onLog("Pruning database and detecting file moves/deletions...");
        try {
            const existingDbFiles = existingDbFilesCache;
            
            const normPaths = paths.map(p => {
                const normActive = normalizePath(p);
                return {
                    exact: normActive,
                    withSlash: normActive.endsWith('/') ? normActive : normActive + '/'
                };
            });

            const allFilesSet = new Set(allFiles.map(f => f.normPath));
            
            const orphanedFiles: any[] = [];
            // Find which DB files are under the active scan paths
            const dbFilesUnderActivePaths = existingDbFiles.filter(item => {
                if (!item.filePath) return false;
                const normFile = (item as any)._normPath;
                const isUnderActive = normPaths.some(ap => normFile.startsWith(ap.withSlash) || normFile === ap.exact);
                if (!isUnderActive) {
                    orphanedFiles.push(item);
                }
                return isUnderActive;
            });
            
            // Sort allFiles alphabetically by path to ensure deterministic deduplication across scans
            allFiles.sort((a, b) => a.normPath.localeCompare(b.normPath));

            // Deduplicate allFiles by hash to prevent identical copies from overwriting each other in the DB and causing infinite scan loops
            const uniqueAllFiles: typeof allFiles = [];
            const seenHashesInScan = new Set<string>();
            for (const f of allFiles) {
                if (!seenHashesInScan.has(f.hash)) {
                    seenHashesInScan.add(f.hash);
                    uniqueAllFiles.push(f);
                } else {
                    onLog(`Ignoring duplicate file: ${f.path}`);
                }
            }
            allFiles = uniqueAllFiles;

            const diskFilesMap = new Map<string, string>();
            for (const f of allFiles) {
                diskFilesMap.set(f.normPath, f.hash);
            }

            // Ghost files: in DB under active path, but not found on disk or hash changed
            const ghostFiles = dbFilesUnderActivePaths.filter(item => {
                const normPath = (item as any)._normPath;
                const diskHash = diskFilesMap.get(normPath);
                if (!diskHash) return true; // not on disk
                if (item.id !== diskHash) return true; // hash mismatch (file changed or legacy ID)
                return false;
            });
            
            // Append orphaned files so they are pruned from the DB
            ghostFiles.push(...orphanedFiles);
            
            // New files: on disk, but not in existing DB
            const validExistingDbFiles = existingDbFiles.filter(item => {
                const normPath = (item as any)._normPath;
                const diskHash = diskFilesMap.get(normPath);
                return diskHash && item.id === diskHash;
            });
            const existingDbFilesSet = new Set(validExistingDbFiles.map(f => (f as any)._normPath));
            const newFilesOnDisk = allFiles.filter(fileObjItem => {
                return !existingDbFilesSet.has(fileObjItem.normPath);
            });

            if (ghostFiles.length > 0 || newFilesOnDisk.length > 0) {
                const changes: any[] = [];
                const today = new Date();
                const formatDateMMDDYY = (date: Date) => {
                    const mm = String(date.getMonth() + 1).padStart(2, "0");
                    const dd = String(date.getDate()).padStart(2, "0");
                    const yy = String(date.getFullYear()).slice(-2);
                    return `${mm}/${dd}/${yy}`;
                };
                const dateStr = formatDateMMDDYY(today);
                
                // Map new files on disk by filename for fast pairing
                const newFilesByBasename = new Map<string, string>();
                newFilesOnDisk.forEach(fObj => { const f = fObj.path;
                    const base = fastBasename(f);
                    if (base) {
                        newFilesByBasename.set(base.toLowerCase(), f);
                    }
                });
                
                ghostFiles.forEach(gf => {
                    const gfBasename = gf.filename || fastBasename(gf.filePath) || "";
                    const movedTo = newFilesByBasename.get(gfBasename.toLowerCase());
                    
                    if (movedTo) {
                        changes.push({
                            filename: gfBasename,
                            path: movedTo,
                            changeFound: `Moved from ${gf.filePath}`,
                            date: dateStr
                        });
                        onLog(`File move detected: ${gfBasename} -> ${movedTo}`);
                    } else {
                        changes.push({
                            filename: gfBasename,
                            path: gf.filePath,
                            changeFound: "Deleted / Removed",
                            date: dateStr
                        });
                        onLog(`File deletion detected: ${gf.filePath}`);
                    }
                });
                
                // Track purely added files that were not part of a move
                const ghostBasenames = new Set(ghostFiles.map(gf => (gf.filename || fastBasename(gf.filePath) || "").toLowerCase()));
                newFilesOnDisk.forEach(nfObj => { const nf = nfObj.path;
                    const nfBasename = fastBasename(nf) || "";
                    if (nfBasename && !ghostBasenames.has(nfBasename.toLowerCase())) {
                        changes.push({
                            filename: nfBasename,
                            path: nf,
                            changeFound: "Added / New file",
                            date: dateStr
                        });
                    }
                });
                
                // Persist changes in localStorage
                let storedChanges: any[] = [];
                try {
                    const saved = localStorage.getItem("bitscribe_media_changes");
                    if (saved) {
                        storedChanges = JSON.parse(saved);
                        if (!Array.isArray(storedChanges)) storedChanges = [];
                    }
                } catch (e) {}
                
                const updatedChanges = [...storedChanges];
                const existingChangesSet = new Set(updatedChanges.map(uc => `${uc.filename}|${uc.path}|${uc.changeFound}`));
                
                changes.forEach(c => {
                    const key = `${c.filename}|${c.path}|${c.changeFound}`;
                    if (!existingChangesSet.has(key)) {
                        existingChangesSet.add(key);
                        updatedChanges.push(c);
                    }
                });
                // Bound size to prevent localStorage QuotaExceededError when scanning massive collections
                if (updatedChanges.length > 5000) {
                    updatedChanges.splice(0, updatedChanges.length - 5000);
                }
                localStorage.setItem("bitscribe_media_changes", JSON.stringify(updatedChanges));
                
                if (ghostFiles.length > 0) {
                    onLog(`Pruning ${ghostFiles.length} ghost files from DB...`);
                    await deleteDbFiles(ghostFiles.map(f => f.id));
                    onLog(`Successfully pruned ${ghostFiles.length} ghost files from persistent storage.`);
                }
            }
            if (isQuickRefresh) {
                allFiles = newFilesOnDisk;
            }
        } catch (e: any) {
            onLog(`Warning: Failed to prune database: ${e.message}`);
        }
    }
    
    onStart(allFiles.length);
    if (allFiles.length === 0) return;
    
    // Use smart balanced concurrency: 20 concurrent workers is the sweet spot
    // that maintains parallel processing speed while avoiding connection locks or disk thrashing on slow storage.
    const logicalCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
    const CONCURRENCY = Math.min(20, Math.max(8, logicalCores));
    const BATCH_SIZE = 500;
    
    // Centralized write queue to guarantee database write safety and prevent transaction locks
    let dbWritePromise = Promise.resolve();
    const queueDbSave = (items: MediaItem[]) => {
        if (items.length === 0) return Promise.resolve();
        const promise = dbWritePromise.then(async () => {
            try {
                await saveDbFiles(items);
            } catch (err) {
                onLog(`Warning: Failed to save batch: ${(err as any).message}`);
            }
        });
        dbWritePromise = promise;
        return promise;
    };
    
    // ITEM 2: Concurrency & Database Write Safety.
    // Each worker has a local `batch` array to write records to SQLite in chunks of `BATCH_SIZE`.
    // Sharing `currentIndex` atomically allows threads to pick the next file without collisions,
    // while the local `batch` arrays avoid race conditions and reduce connection lock overhead.
    let currentIndex = 0;
    
    const worker = async () => {
        let batch: MediaItem[] = [];
        let changedCachedBatch: MediaItem[] = [];
        while (currentIndex < allFiles.length) {
            if (signal?.aborted) {
                break;
            }
            const i = currentIndex++;
            if (i >= allFiles.length) break;
            const fileObjItem = allFiles[i];
            if (!fileObjItem) continue;
            const file = fileObjItem.path;
            const fileHash = fileObjItem.hash;
            const hasExternalSubtitles = fileObjItem.hasExternalSubtitles || false;
            let skipProbe = false;
            const normPath = fileObjItem.normPath;
            const cachedItem = existingFilesMap.get(normPath);
            
            if (cachedItem && cachedItem.id === fileHash) {
                skipProbe = true;
            }

            if (skipProbe && cachedItem) {
                // Re-evaluate Plex compatibility based on latest rules without calling ffprobe
                let hasChanged = false;

                if (cachedItem.streamFriendlyEvaluated !== 1) {
                    const evalResult = evaluatePlexCompatibility(cachedItem, rules, false, true);
                    cachedItem.streamFriendlyLevel = evalResult.level as any;
                    cachedItem.streamFriendlyReason = evalResult.reason;
                    cachedItem.streamFriendlySuggestion = evalResult.suggestion;
                    cachedItem.streamFriendlyEvaluated = 1;
                    hasChanged = true;
                }

                if (cachedItem.hasExternalSubtitles !== hasExternalSubtitles) {
                    cachedItem.hasExternalSubtitles = hasExternalSubtitles;
                    hasChanged = true;
                }

                if (hasChanged) {
                    changedCachedBatch.push(cachedItem);
                    if (changedCachedBatch.length >= BATCH_SIZE) {
                        const toSave = changedCachedBatch.splice(0, BATCH_SIZE);
                        await queueDbSave(toSave);
                    }
                }
                
                onProgress({ current: i + 1, total: allFiles.length, item: hasChanged ? cachedItem : undefined });
                continue;
            }
            
            onLog(`Probing (${i+1}/${allFiles.length}): ${file.substring(Math.max(0, file.length - 40))}`);
                diagLog("Media", "INFO", `Probing: ${file}`);
            
            if (!isTauri()) {
                const normPath = fileObjItem.normPath;
                const mockItem = MOCK_MEDIA_LIBRARY.find(m => normalizePath(m.filePath) === normPath);
                if (mockItem) {
                    const isMusic = mockItem.category === 'Music' || mockItem.category === 'Music Albums' || mockItem.category === 'Soundtracks' || mockItem.category === 'Music Compilations';
                    const isAudiobook = mockItem.category === 'Audiobooks';
                    const isPodcast = mockItem.category === 'Podcasts';
                    const isAudioOnly = isMusic || isAudiobook || isPodcast;

                    let vBitDepth: string | undefined = undefined;
                    let aSampleRate = 48000;
                    let cCount = 0;

                    if (!isAudioOnly) {
                      const resolution = (mockItem.videoResolution || "").toUpperCase();
                      const filename = (mockItem.filename || "").toUpperCase();
                      const hasHDR = !!mockItem.hdrFormat && mockItem.hdrFormat !== 'SDR';
                      if (resolution.includes('4K') || resolution.includes('2160') || filename.includes('2160P') || filename.includes('4K') || hasHDR) {
                        vBitDepth = "10-bit";
                      } else {
                        if (filename.includes('10BIT') || mockItem.category === 'Anime' || mockItem.category === 'Anime Movies' || mockItem.category === 'Anime TV Shows') {
                          vBitDepth = "10-bit";
                        } else {
                          vBitDepth = "8-bit";
                        }
                      }
                      aSampleRate = 48000;
                      if (mockItem.category === 'Movie' || mockItem.category === 'Movies' || mockItem.category === 'Movies (4K)' || mockItem.category === 'Movies (1080p)') {
                        const hash = mockItem.filename.length;
                        cCount = hash % 2 === 0 ? (12 + (hash % 17)) : 0;
                      } else if (mockItem.category === 'TV' || mockItem.category === 'TV Shows' || mockItem.category === 'TV Shows (4K)' || mockItem.category === 'TV Shows (1080p)') {
                        const hash = mockItem.filename.length;
                        cCount = hash % 3 === 0 ? (4 + (hash % 5)) : 0;
                      }
                    } else {
                      const isFlac = (mockItem.container || "").toLowerCase() === 'flac';
                      const hash = mockItem.filename.length;
                      if (isFlac) {
                        aSampleRate = hash % 2 === 0 ? 96000 : 44100;
                      } else {
                        aSampleRate = 44100;
                      }
                    }

                    const mockFps = [23.976, 25, 29.97, 24, 30, 60][mockItem.filename.length % 6];
                    const hydratedItem: MediaItem = {
                        ...mockItem,
                        durationMins: mockItem.durationMins || 116,
                        year: mockItem.year || 2010,
                        videoBitrateMbps: mockItem.videoBitrateMbps || ((mockItem as any).videoBitrate ? (mockItem as any).videoBitrate / 1000 : 12.5),
                        topLevelFolder: mockItem.topLevelFolder || getTopLevelFolder(mockItem.filePath, paths),
                        videoBitDepth: mockItem.videoBitDepth || vBitDepth,
                        audioSampleRate: mockItem.audioSampleRate || aSampleRate,
                        chapterCount: mockItem.chapterCount !== undefined ? mockItem.chapterCount : cCount,
                        videoFrameRate: mockItem.videoFrameRate || (!isAudioOnly ? mockFps : undefined),
                        streamFriendlyLevel: "unknown",
                        streamFriendlyReason: "",
                        streamFriendlySuggestion: "",
                        streamFriendlyEvaluated: 1,
                        rawAudioCodec: "",
                        physicalAudioChannels: 0,
                        matchedOnlineId: "",
                        
                        hasExternalSubtitles: false,
                        embeddedSubtitleLanguages: "",
                        author: "",
                        narrator: "",
                        publisher: "",
                        bookSeries: "",
                        seriesIndex: 0,
                        isbn: "",
                        pageCount: 0
                    };
                    
                    const evalResult = evaluatePlexCompatibility(hydratedItem, rules, false, true);
                    hydratedItem.streamFriendlyLevel = evalResult.level as any;
                    hydratedItem.streamFriendlyReason = evalResult.reason;
                    hydratedItem.streamFriendlySuggestion = evalResult.suggestion;
                    hydratedItem.streamFriendlyEvaluated = 1;
                    
                    onProgress({ current: i + 1, total: allFiles.length, item: hydratedItem });
                    batch.push(hydratedItem);
                    continue;
                } else {
                    throw new Error("Simulated mock file metadata not found");
                }
            }
            
            try {
                // Securely execute ffprobe sidecar with a strict 15-second timeout safeguard to prevent hangs
                // Optimize ffprobe arguments by skipping chapters lookup on audio-only files
                // Streamline output with -show_entries to fetch only the exact format, stream and tag fields needed
                const isAudioFile = ['.mp3', '.flac', '.m4a', '.wav', '.aac', '.ogg', '.wma', '.alac', '.m4b', '.ape', '.opus', '.mka'].some(ext => file.toLowerCase().endsWith(ext));
                
                let showEntries = 'format=size,duration,bit_rate,tags:stream=codec_name,codec_type,width,height,channels,sample_rate,bits_per_raw_sample,pix_fmt,bit_rate,r_frame_rate,avg_frame_rate,tags';
                if (!isAudioFile) {
                    showEntries += ':chapter=start';
                }

                const ffprobeArgs = [
                    '-v', 'quiet',
                    '-print_format', 'json',
                    '-show_entries', showEntries
                ];
                if (!isAudioFile) {
                    ffprobeArgs.push('-show_chapters');
                }
                ffprobeArgs.push('-analyzeduration', '500000', '-probesize', '500000', file);

                let probePromise: Promise<{code: number, stdout: string, stderr: string}>;
                if (isTauri()) {
                    probePromise = invoke("run_ffprobe", { binPath: ffprobePath, args: ffprobeArgs }).then((stdout: any) => {
                        return { code: 0, stdout: String(stdout), stderr: "" };
                    }).catch(err => {
                        throw new Error(`ffprobe returned non-zero code: ${err}`);
                    });
                } else {
                    probePromise = Command.sidecar('bin/ffprobe', ffprobeArgs).execute() as Promise<{code: number, stdout: string, stderr: string}>;
                }

                let timeoutId: any;
                const timeoutPromise = new Promise<never>((_, reject) => {
                    timeoutId = setTimeout(() => reject(new Error("ffprobe probe execution timed out after 15 seconds")), 15000);
                });

                let abortListener: (() => void) | null = null;
                const abortPromise = new Promise<never>((_, reject) => {
                    if (signal?.aborted) {
                        reject(new Error("Scan aborted by user"));
                    } else if (signal) {
                        abortListener = () => reject(new Error("Scan aborted by user"));
                        signal.addEventListener('abort', abortListener);
                    }
                });

                const output = await Promise.race([probePromise, timeoutPromise, abortPromise]).catch(err => {
                    // Intentionally NOT calling child.kill() to prevent Tauri Windows panic 0xcfffffff.
                    // The JS promise chain will cleanly reject and ffprobe will exit natively.
                    throw err;
                }).finally(() => {
                    clearTimeout(timeoutId);
                    if (signal && abortListener) {
                        signal.removeEventListener('abort', abortListener);
                    }
                });
                
                if (output.code !== 0) {
                    throw new Error(`ffprobe returned non-zero code: ${output.stderr || "Unknown error"}`);
                }
                
                // Clean stdout of any unexpected leading/trailing non-JSON warnings
                let stdoutStr = (output.stdout || "").trim();
                const firstBrace = stdoutStr.indexOf('{');
                const lastBrace = stdoutStr.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    stdoutStr = stdoutStr.substring(firstBrace, lastBrace + 1);
                }

                const metadata = JSON.parse(stdoutStr);
                const format = metadata.format || {};
                const streams = metadata.streams || [];
                
                const videoStream = streams.find((s: any) => s.codec_type === 'video' && s.codec_name !== 'mjpeg' && s.codec_name !== 'png');
                const audioStreams = streams.filter((s: any) => s.codec_type === 'audio');
                const subtitleStreams = streams.filter((s: any) => s.codec_type === 'subtitle');
                
                const hasEmbeddedPoster = streams.some((s: any) => s.codec_type === 'video' && (s.codec_name === 'mjpeg' || s.codec_name === 'png'));
                
                const sizeBytes = format.size ? safeParseInt(format.size) : 0;
                const sizeGB = sizeBytes / (1024 * 1024 * 1024);
                const durationSec = format.duration ? safeParseFloat(format.duration) : 0;
                const durationMins = durationSec / 60;
                
                const tags = format.tags || {};
                let year = 0;
                
                // Prioritize matching a 4-digit year (19xx or 20xx) in the filename first, as it is the most reliable source for movie/tv release years
                const filenameYearMatch = file.split(/[\\/]/).pop()?.match(/(19|20)\d{2}/);
                if (filenameYearMatch) {
                    year = safeParseInt(filenameYearMatch[0]);
                } else if (tags.date) {
                    const y = safeParseInt(tags.date.substring(0, 4));
                    if (y > 0) year = y;
                } else {
                    const tagYear = tags.year || tags.YEAR || tags.original_year || tags.ORIGINAL_YEAR || tags.original_release_date;
                    if (tagYear) {
                        const y = safeParseInt(String(tagYear).substring(0, 4));
                        if (y > 0) year = y;
                    }
                }
                
                // Securely derive file extension mapping bypassing parent folders containing dots
                const pathFilename = file.split(/[\\/]/).pop() || "";
                const lastDot = pathFilename.lastIndexOf('.');
                const container = lastDot !== -1 ? pathFilename.substring(lastDot + 1).toLowerCase() : "unknown";

                const videoCodec = videoStream ? videoStream.codec_name || "unknown" : "";
                const fpsValue = videoStream ? (parseFrameRate(videoStream.avg_frame_rate) || parseFrameRate(videoStream.r_frame_rate)) : undefined;
                
                const vWidth = videoStream ? safeParseInt(videoStream.width) : 0;
                const vHeight = videoStream ? safeParseInt(videoStream.height) : 0;
                const videoResolution = vWidth > 0 && vHeight > 0 ? `${vWidth}x${vHeight}` : "";
                
                let videoBitrateMbps = 0;
                if (videoStream && videoStream.bit_rate && videoStream.bit_rate !== "N/A") {
                    videoBitrateMbps = safeParseInt(videoStream.bit_rate) / 1000000;
                } else if (format.bit_rate && format.bit_rate !== "N/A") {
                    videoBitrateMbps = safeParseInt(format.bit_rate) / 1000000;
                }
                
                let totalAudioBitrate = 0;
                const parsedAudioTracks = audioStreams.map((s: any) => {
                    const ab = s.bit_rate && s.bit_rate !== "N/A" ? safeParseInt(s.bit_rate) : 0;
                    totalAudioBitrate += ab;
                    return {
                        codec: s.codec_name || "unknown",
                        channels: s.channels ? safeParseInt(s.channels) : 0,
                        language: getTrackLanguage(s)
                    };
                });
                const parsedSubtitleTracks = subtitleStreams.map((s: any) => ({
                    codec: s.codec_name || "unknown",
                    language: getTrackLanguage(s)
                }));

                let videoBitDepth = "";
                if (videoStream) {
                    if (videoStream.bits_per_raw_sample && videoStream.bits_per_raw_sample !== "N/A" && !isNaN(parseInt(videoStream.bits_per_raw_sample))) {
                        videoBitDepth = `${videoStream.bits_per_raw_sample}-bit`;
                    } else if (videoStream.pix_fmt && videoStream.pix_fmt !== "N/A") {
                        if (videoStream.pix_fmt.includes("10")) {
                            videoBitDepth = "10-bit";
                        } else if (videoStream.pix_fmt.includes("12")) {
                            videoBitDepth = "12-bit";
                        } else {
                            videoBitDepth = "8-bit";
                        }
                    } else {
                        videoBitDepth = "8-bit";
                    }
                }

                const firstAudioStream = audioStreams[0];
                const parsedSampleRate = firstAudioStream && firstAudioStream.sample_rate ? safeParseInt(firstAudioStream.sample_rate) : 0;
                const audioSampleRate = parsedSampleRate > 0 ? parsedSampleRate : undefined;
                
                const chapterCount = Array.isArray(metadata.chapters) ? metadata.chapters.length : 0;
                
                 const pathParts = file.replace(/\\/g, '/').split('/');
                const filename = pathParts[pathParts.length - 1];
                const baseDirName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "";
                const category = inferCategory(baseDirName, filename, '.' + container, file, tags);
                if (category === 'Ignore') continue;
                const topLevelFolder = getTopLevelFolder(file, paths);
                
                const filenameOnlineId = parseOnlineId(filename);
                let matchedOnlineId = filenameOnlineId;
                if (!matchedOnlineId && tags) {
                    const tmdb = tags.tmdb || tags.TMDB || tags.metadata_id?.match(/tmdb:\/\/(\d+)/)?.[1];
                    const tvdb = tags.tvdb || tags.TVDB || tags.metadata_id?.match(/tvdb:\/\/(\d+)/)?.[1];
                    const imdb = tags.imdb || tags.IMDB || tags.metadata_id?.match(/imdb:\/\/(tt\d+)/)?.[1];
                    if (tmdb) matchedOnlineId = `tmdb-${tmdb}`;
                    else if (tvdb) matchedOnlineId = `tvdb-${tvdb}`;
                    else if (imdb) matchedOnlineId = `imdb-${imdb}`;
                }

                const hydratedItem: MediaItem = {
                    id: fileHash,
                    filename: filename,
                    filePath: file,
                    category: category as any,
                    container: container,
                    sizeGB: sizeGB,
                    durationMins: durationMins,
                    year: year,
                    videoCodec: videoCodec,
                    videoResolution: videoResolution,
                    videoBitrateMbps: videoBitrateMbps,
                    videoFrameRate: fpsValue,
                    audioTracks: parsedAudioTracks,
                    subtitleTracks: parsedSubtitleTracks,
                    tags: sanitizeTags(tags),
                    audioBitrate: totalAudioBitrate,
                    isCorrupted: false,
                    errorMessage: "",
                    hasEmbeddedPoster: hasEmbeddedPoster,
                    bitrateAnomaly: false,
                    bitrateAnomalyReason: "",
                    topLevelFolder: topLevelFolder,
                    streamFriendlyLevel: "unknown",
                    streamFriendlyReason: "",
                    streamFriendlySuggestion: "",
                    streamFriendlyEvaluated: 0,
                    videoBitDepth: videoBitDepth || undefined,
                    audioSampleRate: audioSampleRate || undefined,
                    chapterCount: chapterCount,
                    rawAudioCodec: firstAudioStream ? (firstAudioStream.codec_name || "") : "",
                    physicalAudioChannels: firstAudioStream && firstAudioStream.channels ? safeParseInt(firstAudioStream.channels) : 0,
                    matchedOnlineId: matchedOnlineId,
                    
                    hasExternalSubtitles: hasExternalSubtitles,
                    embeddedSubtitleLanguages: parsedSubtitleTracks.map((t: any) => t.language).filter(Boolean).join(","),
                    author: tags.author || tags.AUTHOR || tags.artist || "",
                    narrator: tags.narrator || tags.NARRATOR || "",
                    publisher: tags.publisher || tags.PUBLISHER || "",
                    bookSeries: tags.series || tags.SERIES || "",
                    seriesIndex: tags.series_part ? parseFloat(tags.series_part) : 0,
                    isbn: tags.isbn || tags.ISBN || "",
                    pageCount: 0
                };
                
                const evalResult = evaluatePlexCompatibility(hydratedItem, rules, false, true);
                hydratedItem.streamFriendlyLevel = evalResult.level as any;
                hydratedItem.streamFriendlyReason = evalResult.reason;
                hydratedItem.streamFriendlySuggestion = evalResult.suggestion;
                hydratedItem.streamFriendlyEvaluated = 1;
                
                onProgress({ current: i + 1, total: allFiles.length, item: hydratedItem });
                batch.push(hydratedItem);
                
            } catch (e: any) {
                const filename = file.split(/[\\\/]/).pop()!;
                const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : 'unknown';
                const topLevelFolder = getTopLevelFolder(file, paths);
                const baseCategory = inferCategory(topLevelFolder, filename, '.' + ext, file, {});
                
                const errMsg = e.message || String(e);
                const isRealError = errMsg.includes('Invalid data') || errMsg.includes('moov atom') || errMsg.includes('End of file');
                
                let cat = 'Corrupted';
                let isCorrupt = true;
                
                if (!isRealError && baseCategory !== 'Other' && baseCategory !== 'Ignore') {
                    cat = baseCategory;
                    isCorrupt = false;
                }
                
                const physicalSize = existingFilesMap.get(normPath + "_physical_size") || 0;
                const sizeGB = (physicalSize as number) / (1024 * 1024 * 1024);

                const fallbackItem: MediaItem = {
                    id: fileHash, filename, filePath: file, category: cat as any,
                    container: ext, sizeGB, durationMins: 0, year: 0, videoCodec: 'unknown', videoResolution: 'unknown',
                    videoBitrateMbps: 0, audioTracks: [], subtitleTracks: [], tags: {}, audioBitrate: 0,
                    isCorrupted: isCorrupt, errorMessage: errMsg, hasEmbeddedPoster: false, bitrateAnomaly: false,
                    bitrateAnomalyReason: '', topLevelFolder, streamFriendlyLevel: isCorrupt ? 'corrupted' : 'unfriendly',
                    streamFriendlyReason: isCorrupt ? 'File is corrupted or unreadable.' : 'Could not probe file natively (ffprobe failed/killed).', streamFriendlySuggestion: isCorrupt ? 'Remove or replace this file.' : '', streamFriendlyEvaluated: 1,
                    rawAudioCodec: "", physicalAudioChannels: 0, matchedOnlineId: "",  hasExternalSubtitles: false, embeddedSubtitleLanguages: "",
                    author: "", narrator: "", publisher: "", bookSeries: "", seriesIndex: 0, isbn: "", pageCount: 0
                };
                
                if (isCorrupt) {
                    onProgress({ current: i + 1, total: allFiles.length, error: true, item: fallbackItem });
                } else {
                    onProgress({ current: i + 1, total: allFiles.length, error: false, item: fallbackItem });
                }
                onLog("PROBE ERROR: " + errMsg);
                batch.push(fallbackItem);
            }
            
            if (batch.length >= BATCH_SIZE) {
                const toSave = batch.splice(0, BATCH_SIZE);
                await queueDbSave(toSave);
            }
        }
        if (batch.length > 0) {
            await queueDbSave(batch);
        }
        if (changedCachedBatch.length > 0) {
            await queueDbSave(changedCachedBatch);
        }
    };
    
    const workers = [];
    for (let w = 0; w < CONCURRENCY; w++) {
        workers.push(worker());
    }
    
    await Promise.all(workers);
    const workersEndTime = performance.now();

    await dbWritePromise;
}

export async function injectDemoData() {
    const items = MOCK_MEDIA_LIBRARY.map(mockItem => {
        const isMusic = mockItem.category === 'Music' || mockItem.category === 'Music Albums' || mockItem.category === 'Soundtracks' || mockItem.category === 'Music Compilations';
        const isAudiobook = mockItem.category === 'Audiobooks';
        const isPodcast = mockItem.category === 'Podcasts';
        const isAudioOnly = isMusic || isAudiobook || isPodcast;

        let vBitDepth: string | undefined = undefined;
        let aSampleRate = 48000;
        let cCount = 0;

        if (!isAudioOnly) {
          const resolution = (mockItem.videoResolution || "").toUpperCase();
          const filename = (mockItem.filename || "").toUpperCase();
          const hasHDR = !!mockItem.hdrFormat && mockItem.hdrFormat !== 'SDR';
          if (resolution.includes('4K') || resolution.includes('2160') || filename.includes('2160P') || filename.includes('4K') || hasHDR) {
            vBitDepth = "10-bit";
          } else {
            if (filename.includes('10BIT') || mockItem.category === 'Anime' || mockItem.category === 'Anime Movies' || mockItem.category === 'Anime TV Shows') {
              vBitDepth = "10-bit";
            } else {
              vBitDepth = "8-bit";
            }
          }
          aSampleRate = 48000;
          if (mockItem.category === 'Movie' || mockItem.category === 'Movies' || mockItem.category === 'Movies (4K)' || mockItem.category === 'Movies (1080p)') {
            const hash = mockItem.filename.length;
            cCount = hash % 2 === 0 ? (12 + (hash % 17)) : 0;
          } else if (mockItem.category === 'TV' || mockItem.category === 'TV Shows' || mockItem.category === 'TV Shows (4K)' || mockItem.category === 'TV Shows (1080p)') {
            const hash = mockItem.filename.length;
            cCount = hash % 3 === 0 ? (4 + (hash % 5)) : 0;
          }
        } else {
          const isFlac = (mockItem.container || "").toLowerCase() === 'flac';
          const hash = mockItem.filename.length;
          if (isFlac) {
            aSampleRate = hash % 2 === 0 ? 96000 : 44100;
          } else {
            aSampleRate = 44100;
          }
        }

        const mockFps = [23.976, 25, 29.97, 24, 30, 60][mockItem.filename.length % 6];
        const baseEnriched: any = {
          ...mockItem,
          durationMins: (mockItem as any).durationMins || 116,
          year: (mockItem as any).year || 2010,
          videoBitrateMbps: (mockItem as any).videoBitrateMbps || ((mockItem as any).videoBitrate ? (mockItem as any).videoBitrate / 1000 : 12.5),
          topLevelFolder: (mockItem as any).topLevelFolder || getTopLevelFolder((mockItem as any).filePath),
          videoBitDepth: mockItem.videoBitDepth || vBitDepth,
          audioSampleRate: mockItem.audioSampleRate || aSampleRate,
          chapterCount: mockItem.chapterCount !== undefined ? mockItem.chapterCount : cCount,
          videoFrameRate: mockItem.videoFrameRate || (!isAudioOnly ? mockFps : undefined)
        };
        return {
          ...baseEnriched,
          streamFriendlyLevel: mockItem.streamFriendlyLevel !== undefined ? mockItem.streamFriendlyLevel : "",
          streamFriendlyReason: mockItem.streamFriendlyReason !== undefined ? mockItem.streamFriendlyReason : "",
          streamFriendlySuggestion: mockItem.streamFriendlySuggestion !== undefined ? mockItem.streamFriendlySuggestion : "",
          streamFriendlyEvaluated: mockItem.streamFriendlyEvaluated !== undefined ? mockItem.streamFriendlyEvaluated : 0
        };
    });
    await saveDbFiles(items);
}

export async function saveSettings(settings: Record<string, any>): Promise<void> {
    if (!isTauri()) {
        try {
            let current = {};
            try {
                const val = localStorage.getItem("bitscribe_web_settings");
                if (val) current = JSON.parse(val);
            } catch (e) {}
            const merged = { ...current, ...settings };
            localStorage.setItem("bitscribe_web_settings", JSON.stringify(merged));
        } catch (e) {}
        return;
    }
    try {
        let current = {};
        try {
            const res = (await invoke("load_settings")) as string;
            if (res) current = JSON.parse(res);
        } catch (e) {}
        const merged = { ...current, ...settings };
        await invoke("save_settings", { settings: JSON.stringify(merged, null, 2) });
    } catch (e) {
        console.error("Failed to save settings via Tauri", e);
    }
}

export async function loadSettings(): Promise<Record<string, any>> {
    if (!isTauri()) {
        try {
            const val = localStorage.getItem("bitscribe_web_settings");
            if (val) return JSON.parse(val);
        } catch (e) {}
        return {};
    }
    try {
        const res = (await invoke("load_settings")) as string;
        return JSON.parse(res || "{}");
    } catch (e) {
        console.error("Failed to load settings via Tauri", e);
        return {};
    }
}



export async function logEvent(level: "INFO" | "WARN" | "ERROR", system: string, message: string, isDiagnostic: boolean = false) {
    if (isTauri()) {
        try {
            await invoke("log_event", { level, system, message, isDiagnostic });
        } catch (e) {
            console.warn("Failed to write to native log:", e);
        }
    } else {
        console.log(`[${level}] [${system}] ${message}`);
    }
}


export async function clearSettings(): Promise<void> {
    if (!isTauri()) {
        localStorage.removeItem("bitscribe_web_settings");
        return;
    }
    try {
        await invoke("clear_settings");
    } catch (e) {
        console.error("Failed to clear settings via Tauri", e);
    }
}
