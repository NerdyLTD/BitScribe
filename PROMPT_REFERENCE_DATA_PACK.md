
# BitScribe Extended Diagnostic Data Pack

Here are the requested artifacts for deeper analysis.

## 1. SQLite Schema & Migrations (apps/steward/src-tauri/src/db.rs)
```rust
use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub fn init_db(data_dir: &PathBuf) -> Result<Connection> {
    let db_dir = data_dir.join("BitScribeDB");
    std::fs::create_dir_all(&db_dir).ok();
    let db_path = db_dir.join("steward.db");
    
    let conn = Connection::open(db_path)?;
    
    // Optimize SQLite connection performance
    let _ = conn.execute("PRAGMA journal_mode = WAL;", []);
    let _ = conn.execute("PRAGMA synchronous = NORMAL;", []);
    let _ = conn.execute("PRAGMA cache_size = -64000;", []); // 64MB cache size
    let _ = conn.execute("PRAGMA temp_store = MEMORY;", []);
    let _ = conn.execute("PRAGMA mmap_size = 268435456;", []); // 256MB memory-mapped I/O for lightning-fast reads
    let _ = conn.execute("PRAGMA threads = 4;", []); // Enable multi-threaded operations where supported
    
    // Check if the table exists with `id` as the primary key
    let has_id_pk: Result<String, _> = conn.query_row(
        "SELECT name FROM pragma_table_info('scanned_files') WHERE pk = 1 AND name = 'id'",
        [],
        |row| row.get(0),
    );
    if has_id_pk.is_err() {
        // Drop the old table to upgrade to the new schema
        conn.execute("DROP TABLE IF EXISTS scanned_files", []).ok();
    }
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS scanned_files (
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
            topLevelFolder TEXT,
            streamFriendlyLevel TEXT,
            streamFriendlyReason TEXT,
            streamFriendlySuggestion TEXT,
            streamFriendlyEvaluated INTEGER DEFAULT 0
        )",
        [],
    )?;

    // Add index on filePath to speed up lookups and path-based operations
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_scanned_files_filePath ON scanned_files(filePath);", []);
    
    // Schema upgrades - safe to run sequentially as they will be ignored if the column exists
    let new_columns = vec![
        "videoBitDepth TEXT DEFAULT ''",
        "audioSampleRate INTEGER DEFAULT 0",
        "chapterCount INTEGER DEFAULT 0",
        "rawAudioCodec TEXT DEFAULT ''",
        "physicalAudioChannels INTEGER DEFAULT 0",
        "matchedOnlineId TEXT DEFAULT ''",
        "fileUuid TEXT DEFAULT ''",
        "hasExternalSubtitles INTEGER DEFAULT 0",
        "embeddedSubtitleLanguages TEXT DEFAULT ''",
        "author TEXT DEFAULT ''",
        "narrator TEXT DEFAULT ''",
        "publisher TEXT DEFAULT ''",
        "bookSeries TEXT DEFAULT ''",
        "seriesIndex REAL DEFAULT 0",
        "isbn TEXT DEFAULT ''",
        "pageCount INTEGER DEFAULT 0",
        "videoFrameRate REAL DEFAULT 0"
    ];

    for col_def in new_columns {
        let _ = conn.execute(
            &format!("ALTER TABLE scanned_files ADD COLUMN {}", col_def),
            [],
        );
    }
    
    Ok(conn)
}

```

## 2. Core Scanning Orchestrator (packages/core-db/src/api.ts)
```typescript
export async function scanDirectories(paths: string[], rules: any, onStart: (total: number) => void, onLog: (msg: string) => void, onProgress: (prog: any) => void, isResume: boolean = false, isQuickRefresh: boolean = false, signal?: AbortSignal) {
    onLog("Initializing scan...");
    const scanStartTime = performance.now();
    console.info("[PROFILER] Scan started.");
    
    let isMac = false;
    let macFfprobePath = "";
    if (isTauri()) {
        try {
            const diag = await invoke("get_diagnostic") as any;
            isMac = diag.platform === 'macos';
        } catch (e) {}
        
        if (isMac) {
            onLog("Extracting bundled Mac ffprobe to bypass Gatekeeper...");
            try {
                macFfprobePath = await invoke("setup_mac_ffprobe") as string;
                onLog("Mac ffprobe extracted to: " + macFfprobePath);
            } catch (e: any) {
                const errMsg = e.message || String(e);
                throw new Error("Failed to extract Mac ffprobe: " + errMsg);
            }
            onLog("Validating extracted native ffprobe execution...");
            try {
                await invoke("run_mac_ffprobe", { binPath: macFfprobePath, args: ['-version'] });
            } catch (e: any) {
                const errMsg = e.message || String(e);
                throw new Error(`CRITICAL NATIVE COMPATIBILITY ERROR:\nThe video parsing engine (ffprobe) is blocked or incompatible with your operating system.\n\nTechnical Details: ${errMsg}`);
            }
        } else {
            onLog("Validating native ffprobe execution...");
            try {
                const output = await Command.sidecar('bin/ffprobe', ['-version']).execute();
                const _tProbeEnd = performance.now();
                const _probeDuration = _tProbeEnd - _tProbeStart;
                if (_probeDuration > slowThreshold) {
                    slowestProbes.push({ file: fastBasename(file), duration: _probeDuration });
                }
                if (output.code !== 0) {
                    throw new Error(`Execution returned code ${output.code}. Stderr: ${output.stderr}`);
                }
            } catch (e: any) {
                const errMsg = e.message || String(e);
                throw new Error(`CRITICAL NATIVE COMPATIBILITY ERROR:\nThe video parsing engine (ffprobe) is blocked or incompatible with your operating system.\n\nTechnical Details: ${errMsg}`);
            }
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
            
            // Ghost files: in DB under active path, but not found on disk
            const ghostFiles = dbFilesUnderActivePaths.filter(item => {
                return !allFilesSet.has((item as any)._normPath);
            });
            
            // Append orphaned files so they are pruned from the DB
            ghostFiles.push(...orphanedFiles);
            
            // New files: on disk, but not in existing DB
            const existingDbFilesSet = new Set(existingDbFiles.map(f => (f as any)._normPath));
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
                const evalResult = evaluatePlexCompatibility(cachedItem, rules, false, true);
                const prevLevel = cachedItem.streamFriendlyLevel;
                const prevReason = cachedItem.streamFriendlyReason;
                const prevSuggestion = cachedItem.streamFriendlySuggestion;
                const prevExternalSubs = cachedItem.hasExternalSubtitles || false;

                const hasChanged = prevLevel !== evalResult.level ||
                                   prevReason !== evalResult.reason ||
                                   prevSuggestion !== evalResult.suggestion ||
                                   prevExternalSubs !== hasExternalSubtitles;

                if (hasChanged) {
                    cachedItem.streamFriendlyLevel = evalResult.level as any;
                    cachedItem.streamFriendlyReason = evalResult.reason;
                    cachedItem.streamFriendlySuggestion = evalResult.suggestion;
                    cachedItem.streamFriendlyEvaluated = Date.now();
                    cachedItem.hasExternalSubtitles = hasExternalSubtitles;
                    
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
                        streamFriendlyEvaluated: rules.useDiscoveryPreset ? 0 : 1,
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
                    hydratedItem.streamFriendlyEvaluated = Date.now();
                    
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
                if (isTauri() && isMac) {
                    probePromise = invoke("run_mac_ffprobe", { binPath: macFfprobePath, args: ffprobeArgs }).then((stdout: any) => {
                        return { code: 0, stdout: String(stdout), stderr: "" };
                        return { code: 0, stdout, stderr: "" };
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

                const _tProbeStart = performance.now();
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
                hydratedItem.streamFriendlyEvaluated = Date.now();
                
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
                    streamFriendlyReason: isCorrupt ? '' : 'Could not probe file natively (ffprobe failed/killed).', streamFriendlySuggestion: '', streamFriendlyEvaluated: 0,
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
    console.info(`[PROFILER] Probing phase completed in ${(workersEndTime - probeStartTime).toFixed(2)}ms.`);
    if (slowestProbes.length > 0) {
        slowestProbes.sort((a, b) => b.duration - a.duration);
        console.info(`[PROFILER] Slowest probes:\n` + slowestProbes.slice(0, 10).map(x => `  - ${x.file} (${x.duration.toFixed(2)}ms)`).join('\n'));
    }

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


```

## 3. Core Evaluation Logic (Anomaly & Duplicate Handling)
### packages/core-eval/src/duplicateHelper.ts
```typescript
import { MediaItem, RuleCriteria, isMusicCategory } from '@bitscribe/core-types';
import { EXTRAS_REGEX, extractSeasonNumber } from './mediaParser';

export interface DuplicatePairRow {
  id: string;
  dupId: string;
  category: string;
  topLevelFolder: string;
  fileName: string;
  filePath: string;
  dupFileName: string;
  dupFilePath: string;
  dupSizeGB?: number;
  flagReason?: string;
}

const areParentFoldersSimilar = (pathA: string, pathB: string) => {
  const partsA = pathA.split(/[\\/]/).filter(Boolean);
  const partsB = pathB.split(/[\\/]/).filter(Boolean);
  if (partsA.length < 2 || partsB.length < 2) return true; // fallback
  
  const parentA = partsA[partsA.length - 2].toLowerCase();
  const parentB = partsB[partsB.length - 2].toLowerCase();
  
  if (parentA === parentB) return true;
  
  const cleanParent = (p: string) => {
    return p
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\([^)]+\)/g, '')
      .replace(/[-_.(](flac|mp3|remaster|remastered|deluxe|edition|expanded|bonus|vbr|320k|320kbps)[-_.)]*/gi, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .trim();
  };
  
  const cleanA = cleanParent(parentA);
  const cleanB = cleanParent(parentB);
  
  if (!cleanA || !cleanB) return true; // fallback
  
  return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
};

const isGenericVideoName = (filename: string): boolean => {
  const clean = filename.replace(/\.[a-zA-Z0-9]+$/, '').trim().toLowerCase();
  if (clean.length < 4) return true; // too short (e.g. "01", "a", "vid")
  
  // check pure numeric or numeric sequence (like "00001", "12345")
  if (/^\d+$/.test(clean)) return true;

  // check time patterns like "15 seconds", "30s", "5m"
  if (/^\d+\s*(seconds|second|secs|sec|s|minutes|minute|mins|min|m|hours|hour|hrs|hr|h)$/i.test(clean)) return true;

  const genericWords = new Set([
    'trailer', 'teaser', 'featurette', 'behind the scenes', 'clip', 'scene', 'sample', 
    'test', 'untitled', 'intro', 'outro', 'extra', 'extras', 'short', 'shorts', 
    'advertisement', 'ad', 'cm', 'promo', 'preview', 'main title', 'interview', 'deleted scene',
    'outtakes', 'bloopers', 'vts_01_1', 'vts_01', 'title01', 'title02', 'track01', 'track02',
    '15 seconds', '30 seconds', '60 seconds', '45 seconds'
  ]);

  if (genericWords.has(clean)) return true;
  if (genericWords.has(clean.replace(/[^a-z ]/g, '').trim())) return true;

  return false;
};

const isPlexThemeMusic = (item: MediaItem, allItems: MediaItem[]) => {
  if (item.filename.toLowerCase() !== "theme.mp3") return false;
  
  const lastSlashIdx = Math.max(item.filePath.lastIndexOf("/"), item.filePath.lastIndexOf("\\"));
  if (lastSlashIdx === -1) return false;
  const itemDir = item.filePath.substring(0, lastSlashIdx);

  return allItems.some(other => {
    if (other.id === item.id) return false;
    if (isMusicCategory(other.category) || other.category === "Corrupted" || other.category === "Static") return false;
    
    const otherLastSlashIdx = Math.max(other.filePath.lastIndexOf("/"), other.filePath.lastIndexOf("\\"));
    if (otherLastSlashIdx === -1) return false;
    const otherDir = other.filePath.substring(0, otherLastSlashIdx);
    
    return otherDir === itemDir;
  });
};

export function getDuplicatePairRows(items: MediaItem[], rules: RuleCriteria): DuplicatePairRow[] {
  const result: DuplicatePairRow[] = [];
  const isVideoActive = rules.useDuplicationVideoScan || rules.useDuplicationScan;
  const isMusicActive = rules.useDuplicationMusicScan || rules.useDuplicationScan;

  if (!isVideoActive && !isMusicActive) {
    return result;
  }

  const cleanVideoName = (filename: string, item?: MediaItem) => {
    let cleaned = filename
      .replace(/\.[a-zA-Z0-9]+$/, '') // strip extension
      .replace(/[-_.(](1080p|720p|4k|2160p|x264|x265|hevc|h264|h265|av1|bluray|web-?dl|webrip|dd5\.1|dts|aac|truehd|hdr|dovi|remux)[-_.)]*/gi, '') // strip codecs/res/ratings
      .replace(/[^a-zA-Z0-9 \(\)[\]]/g, ' ') // alphanumeric
      .replace(/\s+/g, ' ') // collapse multi-spaces
      .trim()
      .toLowerCase();
      
    if (item) {
      const parts = (item.filePath || "").split(/[\\\/]/).filter(Boolean);
      const getParentMediaNameLocal = () => {
        if (parts.length === 0) return "unknown";
        const extraIdx = parts.findIndex(p => EXTRAS_REGEX.test(p));
        let startIdx = extraIdx > 0 ? extraIdx - 1 : parts.length - 2;
        let parentIdx = startIdx;
        while (parentIdx > 0) {
          const pName = parts[parentIdx];
          const isSeason = extractSeasonNumber(pName) !== null;
          const isGenericRoot = /^(tv|tv shows|shows|series|docuseries|cartoons|anime|documentaries|movies|movie|film|films|video|videos|extras|music|audio|foreign)$/i.test(pName);
          if (isSeason || isGenericRoot || pName.length <= 2) {
            parentIdx--;
          } else {
            break;
          }
        }
        return (parts[parentIdx] || "unknown").toLowerCase();
      };

      const getSeasonFromPathLocal = () => {
        for (const part of parts) {
          const s = extractSeasonNumber(part);
          if (s !== null) return `season_${s}`;
        }
        return "noseason";
      };

      const isExtra = EXTRAS_REGEX.test(item.filePath || "") || 
                      (item.category || "").toLowerCase() === "extras" || 
                      (item.category || "").toLowerCase() === "shorts";
      
      const parentMediaName = getParentMediaNameLocal();
      const season = getSeasonFromPathLocal();

      if (isExtra) {
        return `extra_${parentMediaName}_${season}_${cleaned}`;
      }

      const isTvShow = (item.category || "").toLowerCase().includes("tv") || 
                       (item.category || "").toLowerCase().includes("show") || 
                       (item.category || "").toLowerCase().includes("series");
      
      const seMatch = cleaned.match(/([sS](\d{1,2})[eE](\d{1,2})|\b(\d{1,2})x(\d{1,2})\b|\b(\d{1,2})[ ]?of[ ]?(\d{1,2})\b)/i);
      
      if (isTvShow || seMatch) {
        return `tv_${parentMediaName}_${season}_${cleaned}`;
      }
      
      const genericNames = ['trailer', 'teaser', 'featurette', 'behind the scenes', 'main title', 'interview', 'extras', 'deleted scenes', 'scene', 'clip', 'short', 'outtakes', 'bloopers'];
      if (genericNames.includes(cleaned) || genericNames.some(g => cleaned.includes(g))) {
        return `extra_${parentMediaName}_${season}_${cleaned}`;
      }
    }

    return cleaned;
  };

  const cleanMusicTrack = (title: string) => {
    return title
      .replace(/\.[a-zA-Z0-9]+$/, '')
      .replace(/^\d+[-_.\s]+/, '')
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  const cleanArtist = (artist: string) => {
    return artist.replace(/[^a-zA-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  };

  const getVersionSuffix = (title: string, filename: string): string => {
    const combined = `${title} ${filename}`.toLowerCase();
    const markers: string[] = [];

    if (/\b(acoustic|unplugged)\b/.test(combined)) {
      markers.push("acoustic");
    }
    if (/\b(live)\b/.test(combined)) {
      markers.push("live");
    }
    if (/\b(remix|rmx|re-mix)\b/.test(combined)) {
      markers.push("remix");
    }
    if (/\b(demo)\b/.test(combined)) {
      markers.push("demo");
    }
    if (/\b(instrumental|inst|karaoke)\b/.test(combined)) {
      markers.push("instrumental");
    }
    if (/\b(radio|radio-edit)\b/.test(combined) || /\bradio\s+edit\b/.test(combined)) {
      markers.push("radio-edit");
    } else if (/\bedit\b/.test(combined) && !/\b(video\s*edit|audio\s*edit)\b/.test(combined)) {
      markers.push("edit");
    }
    if (/\b(cover)\b/.test(combined)) {
      markers.push("cover");
    }
    if (/\b(extended|club|dub|vocal|synth|piano|orchestral|bonus)\b/.test(combined)) {
      const match = combined.match(/\b(extended|club|dub|vocal|synth|piano|orchestral|bonus)\b/);
      if (match) {
        markers.push(match[1]);
      }
    }
    if (/\b(alt|alternate|alternative)\b/.test(combined)) {
      markers.push("alternate");
    }

    return markers.join("-");
  };

  const getMusicProperties = (item: MediaItem) => {
    const titleTag = item.tags?.title || '';
    const filename = item.filename;
    const title = cleanMusicTrack(titleTag || filename);
    let artist = cleanArtist(item.tags?.artist || '');
    
    if (!artist && item.filePath) {
      const parts = item.filePath.split(/[\\/]/).filter(Boolean);
      if (parts.length > 2) {
        const potentialArtist = parts[parts.length - 3];
        const lowerPotential = potentialArtist.toLowerCase();
        const genericMusicFolders = new Set(["music", "artists", "artist", "tv", "tv shows", "movies", "soundtracks", "compilations", "albums", "shared", "downloads", "temp", "unknown", "audio", "various"]);
        if (!genericMusicFolders.has(lowerPotential) && potentialArtist.length > 2) {
          artist = cleanArtist(potentialArtist);
        }
      }
    }
    if (!artist) {
      artist = 'unknown';
    }

    const versionSuffix = getVersionSuffix(titleTag, filename);
    return { title, artist, versionSuffix };
  };

  if (isVideoActive) {
    const videoItems = items.filter(it => !isMusicCategory(it.category) && it.category !== 'Corrupted' && it.category !== 'Static');
    const videoGroups = new Map<string, MediaItem[]>();
    
    videoItems.forEach(item => {
      const key = cleanVideoName(item.filename, item);
      if (!videoGroups.has(key)) {
        videoGroups.set(key, []);
      }
      videoGroups.get(key)!.push(item);
    });

    for (const [, group] of videoGroups.entries()) {
      if (group.length > 1) {
        const confirmedDups: MediaItem[] = [];
        for (let i = 0; i < group.length; i++) {
          const itemA = group[i];
          let isDupA = false;
          for (let j = 0; j < group.length; j++) {
            if (i === j) continue;
            const itemB = group[j];
            
            const durationDiff = Math.abs(itemA.durationMins - itemB.durationMins);
            const sizeDiffRatio = Math.max(itemA.sizeGB, itemB.sizeGB) > 0 
              ? Math.abs(itemA.sizeGB - itemB.sizeGB) / Math.max(itemA.sizeGB, itemB.sizeGB)
              : 0;

            let isMatch = false;

            // If we have valid duration for both (not 0):
            if (itemA.durationMins > 0 && itemB.durationMins > 0) {
              if (durationDiff <= 3) {
                // Same duration. But check if it's a generic file name (e.g., "15 Seconds")
                const isGeneric = isGenericVideoName(itemA.filename);
                if (isGeneric) {
                  // For highly generic names, they must also be in similar parent folders OR have very similar sizes (within 10%)
                  const foldersSimilar = areParentFoldersSimilar(itemA.filePath, itemB.filePath);
                  const sizesSimilar = sizeDiffRatio < 0.1;
                  if (foldersSimilar || sizesSimilar) {
                    isMatch = true;
                  }
                } else {
                  isMatch = true;
                }
              }
            } else {
              // One or both durations are 0 (unknown).
              // Since we don't have playtimes, we must be much stricter to avoid false positives!
              // They must have similar parent folders OR very similar size (within 5%)
              const foldersSimilar = areParentFoldersSimilar(itemA.filePath, itemB.filePath);
              const sizesSimilar = sizeDiffRatio < 0.05;
              if (foldersSimilar || sizesSimilar) {
                isMatch = true;
              }
            }

            if (isMatch) {
              isDupA = true;
              break;
            }
          }
          if (isDupA) {
            confirmedDups.push(itemA);
          }
        }

        if (confirmedDups.length > 1) {
          confirmedDups.sort((a, b) => b.sizeGB - a.sizeGB);
          const primary = confirmedDups[0];
          const duplicates = confirmedDups.slice(1);
          duplicates.forEach(dup => {
            const durationDiffSec = Math.abs(primary.durationMins - dup.durationMins) * 60;
            const sizeDiffPct = Math.max(primary.sizeGB, dup.sizeGB) > 0 
              ? Math.round((Math.abs(primary.sizeGB - dup.sizeGB) / Math.max(primary.sizeGB, dup.sizeGB)) * 100)
              : 0;
            const foldersSimilar = areParentFoldersSimilar(primary.filePath, dup.filePath);
            const sameFolder = (() => {
              const lastSlashA = Math.max(primary.filePath.lastIndexOf("/"), primary.filePath.lastIndexOf("\\"));
              const lastSlashB = Math.max(dup.filePath.lastIndexOf("/"), dup.filePath.lastIndexOf("\\"));
              if (lastSlashA === -1 || lastSlashB === -1) return false;
              return primary.filePath.substring(0, lastSlashA) === dup.filePath.substring(0, lastSlashB);
            })();

            let reason = "";
            if (primary.durationMins > 0 && dup.durationMins > 0) {
              reason = `Matched video name with very similar runtime (within ${Math.round(durationDiffSec)}s)`;
            } else {
              if (sameFolder) {
                reason = "Matched video name in the exact same folder (unknown duration)";
              } else if (foldersSimilar) {
                reason = "Matched video name in similar folders (unknown duration)";
              } else if (sizeDiffPct < 5) {
                reason = `Matched video name with very close file size (within ${sizeDiffPct}%)`;
              } else {
                reason = "Matched video name (unknown duration)";
              }
            }

            result.push({
              id: primary.id,
              dupId: dup.id,
              category: primary.category || "Videos",
              topLevelFolder: primary.topLevelFolder || "Videos",
              fileName: primary.filename,
              filePath: primary.filePath || "",
              dupFileName: dup.filename,
              dupFilePath: dup.filePath || "",
              dupSizeGB: dup.sizeGB,
              flagReason: reason
            });
          });
        }
      }
    }
  }

  if (isMusicActive) {
    const musicItems = items.filter(it => isMusicCategory(it.category) && !isPlexThemeMusic(it, items));
    const musicGroups = new Map<string, MediaItem[]>();

    musicItems.forEach(item => {
      const { title, artist, versionSuffix } = getMusicProperties(item);
      const parts = (item.filePath || "").split(/[\\/]/).filter(Boolean);
      const parentDir = parts.length > 1 ? parts[parts.length - 2].toLowerCase() : "unknown_dir";
      const baseKey = artist === 'unknown' ? `unknown_${parentDir}_${title}` : `${artist} - ${title}`;
      const key = versionSuffix ? `${baseKey}___${versionSuffix}` : baseKey;
      if (!musicGroups.has(key)) {
        musicGroups.set(key, []);
      }
      musicGroups.get(key)!.push(item);
    });

    for (const [, group] of musicGroups.entries()) {
      if (group.length > 1) {
        const confirmedDups: MediaItem[] = [];
        for (let i = 0; i < group.length; i++) {
          const itemA = group[i];
          let isDupA = false;
          for (let j = 0; j < group.length; j++) {
            if (i === j) continue;
            const itemB = group[j];
            if (!areParentFoldersSimilar(itemA.filePath, itemB.filePath)) {
              continue;
            }
            const durationDiffMins = Math.abs(itemA.durationMins - itemB.durationMins);
            const durationDiffMs = durationDiffMins * 60;
            if (durationDiffMs <= 30 || itemA.durationMins === 0 || itemB.durationMins === 0) {
              isDupA = true;
              break;
            }
          }
          if (isDupA) {
            confirmedDups.push(itemA);
          }
        }

        if (confirmedDups.length > 1) {
          confirmedDups.sort((a, b) => b.sizeGB - a.sizeGB);
          const primary = confirmedDups[0];
          const duplicates = confirmedDups.slice(1);
          duplicates.forEach(dup => {
            const durationDiffMins = Math.abs(primary.durationMins - dup.durationMins);
            const durationDiffSec = Math.round(durationDiffMins * 60);
            const sameFolder = (() => {
              const lastSlashA = Math.max(primary.filePath.lastIndexOf("/"), primary.filePath.lastIndexOf("\\"));
              const lastSlashB = Math.max(dup.filePath.lastIndexOf("/"), dup.filePath.lastIndexOf("\\"));
              if (lastSlashA === -1 || lastSlashB === -1) return false;
              return primary.filePath.substring(0, lastSlashA) === dup.filePath.substring(0, lastSlashB);
            })();

            const { title, artist } = getMusicProperties(primary);
            let reason = "";
            const titleArtistStr = artist && artist !== 'unknown' 
              ? `'${title}' by '${artist}'` 
              : `'${title}'`;

            if (sameFolder) {
              reason = `Matched song ${titleArtistStr} in the exact same album folder`;
            } else {
              reason = `Matched song ${titleArtistStr} in similar album folders`;
            }

            if (primary.durationMins > 0 && dup.durationMins > 0) {
              reason += ` (playtime difference: ${durationDiffSec}s)`;
            } else {
              reason += " (unknown duration)";
            }

            result.push({
              id: primary.id,
              dupId: dup.id,
              category: primary.category || "Music Albums",
              topLevelFolder: "Music",
              fileName: primary.filename,
              filePath: primary.filePath || "",
              dupFileName: dup.filename,
              dupFilePath: dup.filePath || "",
              dupSizeGB: dup.sizeGB,
              flagReason: reason
            });
          });
        }
      }
    }
  }

  return result;
}

export function computeDuplicatesMap(items: MediaItem[], rules: RuleCriteria): Map<string, boolean> {
  const duplicateMap = new Map<string, boolean>();
  const isVideoActive = rules.useDuplicationVideoScan || rules.useDuplicationScan;
  const isMusicActive = rules.useDuplicationMusicScan || rules.useDuplicationScan;

  if (!isVideoActive && !isMusicActive) {
    return duplicateMap;
  }

  const pairs = getDuplicatePairRows(items, rules);
  pairs.forEach(pair => {
    if (pair.id) duplicateMap.set(pair.id, true);
    if (pair.dupId) duplicateMap.set(pair.dupId, true);
  });

  return duplicateMap;
}

```

### packages/core-eval/src/plexEvaluator.ts
```typescript
import { formatCodecString, getPrimaryAudioCodec, getPrimaryVideoCodec, getContainerFormat } from "./mediaFormatter";
import { isMusicCategory } from '@bitscribe/core-types';
import { MediaItem, EvaluationResult, RuleCriteria, PlexFriendlyLevel } from '@bitscribe/core-types';
import { getDisplayArtist } from './musicHelper';
import { EXTRAS_REGEX, extractSeasonNumber } from './mediaParser';
import { computeDuplicatesMap, getDuplicatePairRows } from "./duplicateHelper";

export const DEFAULT_RULES: RuleCriteria = {
  useBleedingEdgePreset: false,
  bleedingEdgeVideoCodecs: ['av1', 'vvc', 'vp9'],
  bleedingEdgeSurroundAudioCodecs: ['truehd', 'dtshd', 'opus'],
  bleedingEdgeStereoAudioCodecs: ['flac', 'pcm', 'opus'],
  useModernPreset: false,
  useLegacyPreset: false,
  useDiscoveryPreset: true,
  useSubtitleScan: false,
  useDuplicationScan: false,
  useDuplicationVideoScan: false,
  useDuplicationMusicScan: false,
  useMetadataScan: false,
  useVideoMetadataScan: false,
  useMusicMetadataScan: false,
  useCleanNonLatinTags: true,

  modernVideoCodecs: ['hevc', 'h264'],
  modernSurroundAudioCodecs: ['ac3', 'eac3'],
  modernStereoAudioCodecs: ['aac', 'mp3', 'ac3', 'eac3'],
  modernMusicCodecs: ['flac', 'aac', 'mp3', 'alac', 'wav'],

  legacyVideoCodecs: ['h264'],
  legacySurroundAudioCodecs: ['ac3', 'aac'],
  legacyStereoAudioCodecs: ['aac', 'mp3', 'ac3'],
  legacyMusicCodecs: ['mp3', 'aac'],

  discoveryVideoCodecs: [
    'hevc', 'h265', 'h264', 'av1', 'vp9', 'mpeg2', 'mpeg4', 'vc1', 'wmv', 'flv', 'theora', 'divx', 'xvid', 'vp8', 'prores', 'h255', 'h263'
  ],
  discoverySurroundAudioCodecs: [
    'ac3', 'eac3', 'dts', 'truehd', 'flac', 'aac', 'opus', 'vorbis', 'wma', 'dtshd', 'alac', 'pcm_s16le', 'pcm_s24le', 'mp3'
  ],
  discoveryStereoAudioCodecs: [
    'aac', 'mp3', 'flac', 'pcm', 'alac', 'opus', 'vorbis', 'mp2', 'wma', 'wav', 'ogg', 'ape', 'realaudio', 'wmapro', 'wmav2', 'adpcm_ms', 'ac3', 'eac3', 'dts', 'truehd', 'dtshd'
  ],
  discoveryMusicCodecs: [
    'flac', 'aac', 'mp3', 'alac', 'wav', 'ogg', 'ape', 'wma', 'm4a', 'opus'
  ],
  discoveryContainers: [
    'mkv', 'mp4', 'm4v', 'avi', 'ts', 'mov', 'flv', 'webm', 'wmv', 'mpg', 'vob', 'm2ts', 'ogg', 'wav', 'mp3', 'flac'
  ],
  discoveryHdrFormats: [
    'SDR', 'HDR10', 'HDR10+', 'Dolby Vision', 'HLG', 'Advanced HDR'
  ]
};

export function isMissingSubtitles(item: MediaItem): boolean {
  if (isMusicCategory(item.category) || item.category === "Static" || item.category === "Corrupted") return false;
  return !item.subtitleTracks || item.subtitleTracks.length === 0;
}

export function hasBadSubtitles(item: MediaItem): boolean {
  if (isMusicCategory(item.category) || item.category === "Static" || item.category === "Corrupted") return false;
  return !!item.subtitleTracks?.some(s => s.codec?.toLowerCase() === "pgs" || s.codec?.toLowerCase() === "vobsub");
}

export function evaluatePlexCompatibility(item: MediaItem, customRules: RuleCriteria = DEFAULT_RULES, isDuplicate: boolean = false, forceEvaluate: boolean = false): EvaluationResult {
  const result = _evaluatePlexCompatibility(item, customRules, isDuplicate, forceEvaluate);
  
  // Set central source of truth for Anomaly metrics
  const reason = result.reason || "";
  const isBloated = reason.includes("Bloated");
  const isStarved = reason.includes("Starved");
  const isAnomaly = isBloated || isStarved || reason.includes("Anomaly") || result.level === "unfriendly" && result.suggestion?.includes("Transcode Required");

  return {
    ...result,
    isBloated,
    isStarved,
    isAnomaly
  };
}

function _evaluatePlexCompatibility(item: MediaItem, customRules: RuleCriteria = DEFAULT_RULES, isDuplicate: boolean = false, forceEvaluate: boolean = false): EvaluationResult {
  if (item.category === 'Corrupted') {
    return {
      level: 'unfriendly',
      reason: 'Corrupted file: Cannot evaluate compatibility.',
      suggestion: 'Replace corrupted file.'
    };
  }

  const isStandardStreamingScan = !(
    customRules.useMetadataScan ||
    customRules.useVideoMetadataScan ||
    customRules.useMusicMetadataScan ||
    customRules.useSubtitleScan ||
    customRules.useDuplicationScan ||
    customRules.useDuplicationVideoScan ||
    customRules.useDuplicationMusicScan ||
    customRules.useAnomalyScan
  );

  if (!forceEvaluate) {
    if (isStandardStreamingScan) {
      if (item.streamFriendlyEvaluated && item.streamFriendlyEvaluated > 0 && item.streamFriendlyLevel) {
        return {
          level: item.streamFriendlyLevel as PlexFriendlyLevel,
          reason: item.streamFriendlyReason || '',
          suggestion: item.streamFriendlySuggestion || ''
        };
      }
      return {
        level: 'pending',
        reason: 'This file has not been evaluated by the Streaming compatibility scanner yet.',
        suggestion: 'Please run a scan with Streaming preset or click Evaluate Streaming Compatibility.'
      };
    }
  }
  if (item.category === 'Static') {
    return {
      level: 'modern',
      reason: 'Static Asset: Static catalog entry.',
      suggestion: ''
    };
  }

  const vCodec = (item.videoCodec || '').toLowerCase();
  let container = (item.container || '').toLowerCase();
  const audios = item.audioTracks || [];
  const subs = item.subtitleTracks || [];

  // Normalize ffprobe container names to common extensions for rule matching
  if (container === 'matroska' || container === 'matroska,webm') container = 'mkv';
  if (container === 'quicktime' || container === 'mov') container = 'mp4';
  if (container.includes('mpegts')) container = 'ts';
  if (container.includes('avi')) container = 'avi';

  // --- SPECIAL AUDIT MODES ---
  const isMusicFile = isMusicCategory(item.category);
  const checkVideoMeta = !!customRules.useVideoMetadataScan || (!!customRules.useMetadataScan && !isMusicFile);
  const checkMusicMeta = !!customRules.useMusicMetadataScan || (!!customRules.useMetadataScan && isMusicFile);

  if ((checkVideoMeta && !isMusicFile) || (checkMusicMeta && isMusicFile) || (item.category === 'Corrupted' && (checkVideoMeta || checkMusicMeta))) {
    if (item.category === 'Corrupted') {
      return {
        level: 'unfriendly',
        reason: 'Corrupted file: Cannot probe metadata tags.',
        suggestion: 'Replace corrupted file.'
      };
    }

    const tags = item.tags || {};
    const titleVal = tags.title || tags.TITLE || '';
    const yearVal = item.year || parseInt(tags.date || tags.DATE || tags.year || tags.YEAR || '0') || 0;
    
    if (isMusicCategory(item.category)) {
      const artistVal = tags.artist || tags.ARTIST || '';
      const albumVal = tags.album || tags.ALBUM || '';
      
      const missingFields: string[] = [];
      if (!titleVal) missingFields.push('Title');
      if (!artistVal) missingFields.push('Artist');
      if (!albumVal) missingFields.push('Album');
      if (!yearVal) missingFields.push('Year');
      
      if (missingFields.length > 0) {
        return {
          level: 'unfriendly',
          reason: `Incomplete Tags: Missing ${missingFields.join(', ')}`,
          suggestion: 'Use Picard or TagScanner to write embedded ID3/Vorbis tags.'
        };
      } else {
        return {
          level: 'modern',
          reason: `Tags Complete: "${titleVal}" by ${artistVal} (${albumVal}, ${yearVal})`,
          suggestion: 'None required. Tags are robust and direct-index friendly.'
        };
      }
    } else {
      // Videos: movies/shows
      const missingFields: string[] = [];
      const titleCleaned = titleVal.trim();
      const hasTitle = !!titleCleaned && titleCleaned.toLowerCase() !== item.filename.toLowerCase();
      if (!hasTitle) missingFields.push('Title');
      if (!yearVal) missingFields.push('Year');

      const directorVal = tags.director || tags.DIRECTOR || '';
      const writerVal = tags.writer || tags.WRITER || '';
      const castVal = tags.cast || tags.CAST || tags.actors || tags.ACTORS || tags.actor || tags.ACTOR || '';
      const studioVal = tags.studio || tags.STUDIO || tags.publisher || tags.PUBLISHER || tags.network || tags.NETWORK || '';

      if (item.category === 'TV') {
        const showVal = tags.show || tags.SHOW || tags.series || tags.SERIES || tags.show_name || tags.SHOW_NAME || '';
        if (!showVal) missingFields.push('Show Title');
      } else {
        if (!directorVal) missingFields.push('Director');
      }

      if (!writerVal) missingFields.push('Writer');
      if (!castVal) missingFields.push('Cast/Actors');
      if (!studioVal) missingFields.push('Studio');
      
      if (missingFields.length > 0) {
        return {
          level: 'unfriendly',
          reason: `Incomplete Tags: Missing ${missingFields.join(', ')}`,
          suggestion: `Open MKVToolNix or FFmpeg to write missing tags (${missingFields.join(', ')}).`
        };
      } else {
        const detailStr = item.category === 'TV' 
          ? `Show "${tags.show || tags.SHOW}" - "${titleCleaned}" (${yearVal})` 
          : `"${titleCleaned}" (${yearVal}) Dir: ${directorVal}`;
        return {
          level: 'modern',
          reason: `Embedded Metadata OK: ${detailStr} is fully populated`,
          suggestion: 'Tags are perfectly embedded inside video container.'
        };
      }
    }
  }

  if (customRules.useSubtitleScan) {
    if (isMusicCategory(item.category)) {
      return {
        level: 'modern',
        reason: 'Music cataloged: Subtitle scan does not apply to audio files.',
        suggestion: ''
      };
    }
    if (item.category === 'Corrupted') {
      return {
        level: 'unfriendly',
        reason: 'Corrupted file: Cannot verify subtitle streams.',
        suggestion: 'Replace corrupted file.'
      };
    }
    const embeddedSubs = subs.filter(s => !s.isExternal);
    const externalSubs = subs.filter(s => s.isExternal);
    const embeddedCount = embeddedSubs.length;
    const externalCount = externalSubs.length;

    const hasImageSub = subs.some(s => {
      const c = (s.codec || '').toLowerCase();
      return c.includes('pgs') || c.includes('vob') || c.includes('dvd') || c.includes('ass') || c.includes('ssa');
    });

    if (embeddedCount === 0 && externalCount === 0) {
      return {
        level: 'legacy',
        reason: 'No Embedded or External Subtitles found.',
        suggestion: 'Add or embed SRT subtitle file.'
      };
    }

    if (hasImageSub) {
      const extMsg = externalCount > 0 
        ? `${externalCount} external/sidecar track(s) found` 
        : 'no external/sidecar subtitles found';
      return {
        level: 'unfriendly',
        reason: `Image-based Subtitles (PGS/VOB/ASS) may force video transcoding. (${extMsg})`,
        suggestion: 'Extract and convert subtitles to text-based SRT format, or sideload clean external SRTs.'
      };
    }

    const subFormats = subs.map(s => formatCodecString(s.codec)).join(', ');
    let reason = '';
    let suggestion = '';

    if (embeddedCount > 0 && externalCount > 0) {
      reason = `Subtitles Complete: ${embeddedCount} embedded and ${externalCount} external/sidecar tracks detected (${subFormats})`;
      suggestion = 'None required. Subtitles are available both embedded and as external sidecars.';
    } else if (embeddedCount > 0) {
      reason = `Subtitles Complete: ${embeddedCount} embedded tracks detected (${subFormats}) | No external/sidecar`;
      suggestion = 'None required. Subtitles are available inside container.';
    } else {
      reason = `Subtitles Complete: ${externalCount} external/sidecar tracks detected (${subFormats}) | No embedded`;
      suggestion = 'None required. External sidecar subtitles are available.';
    }

    return {
      level: 'modern',
      reason,
      suggestion
    };
  }

  const isVideoDuplicationActive = customRules.useDuplicationVideoScan || (customRules.useDuplicationScan && !isMusicCategory(item.category));
  const isMusicDuplicationActive = customRules.useDuplicationMusicScan || (customRules.useDuplicationScan && isMusicCategory(item.category));

  if ((isVideoDuplicationActive && !isMusicCategory(item.category)) || (isMusicDuplicationActive && isMusicCategory(item.category))) {
    if (item.category === 'Corrupted') {
      return {
        level: 'unfriendly',
        reason: 'Corrupted file: Duplication check skipped.',
        suggestion: 'Replace corrupted file.'
      };
    }
    if (isDuplicate) {
      if (isMusicCategory(item.category)) {
        const titleVal = item.tags?.title || item.filename;
        const artistVal = item.tags?.artist || 'Unknown Artist';
        return {
          level: 'unfriendly',
          reason: `Duplicated Track: "${titleVal}" by ${artistVal} has multiple copies.`,
          suggestion: 'Consolidate audio duplicates. Prefer high-fidelity FLAC or lossless wav over low bit-rate MP3.'
        };
      } else {
        return {
          level: 'unfriendly',
          reason: 'Duplicated Video: Multiple quality files detected for this title.',
          suggestion: 'Consolidate video files. Remove resolution duplicates or consolidate streams into a single high-quality file (prefer 4K/HDR or best HEVC/H.264 stream).'
        };
      }
    } else {
      if (isMusicCategory(item.category)) {
        return {
          level: 'modern',
          reason: 'Unique: No other copy of this track detected.',
          suggestion: 'None. Track is uniquely isolated in the music catalog.'
        };
      } else {
        return {
          level: 'modern',
          reason: 'Unique: No other duplicates detected for this title.',
          suggestion: 'None. Stream is isolated as a single copy in the library.'
        };
      }
    }
  }

  if (customRules.useAnomalyScan) {
    if (item.category === 'Corrupted') {
      return {
        level: 'unfriendly',
        reason: 'Corrupted file: Bitrate check failed.',
        suggestion: 'Replace corrupted file.'
      };
    }

    if (isMusicCategory(item.category)) {
      const br = (item.audioBitrate || 0) / 1000;
      const isLossless = (audios[0]?.codec ?? container).toLowerCase().includes('flac');
      
      if (isLossless) {
        if (br > 0 && br < 200) {
          return {
            level: 'unfriendly',
            reason: `Starved (Music): FLAC lossless bitrate too low (${br} kbps).`,
            suggestion: 'Re-encode from high-quality lossless source file.'
          };
        } else if (br > 2500) {
          return {
            level: 'unfriendly',
            reason: `Bloated (Music): FLAC audio bitrate is excessively high (${br} kbps).`,
            suggestion: 'Evaluate if sampling rate/depth (e.g. 192kHz/24bit) exceeds client capabilities.'
          };
        }
      } else {
        // Lossy codecs like MP3, AAC
        if (br > 0 && br < 96) {
          return {
            level: 'unfriendly',
            reason: `Starved (Music): Lossy audio bitrate is too low for quality streaming (${br} kbps).`,
            suggestion: 'Obtain high-quality AAC (~256 kbps) or MP3 (~320 kbps) copy.'
          };
        } else if (br > 350) {
          return {
            level: 'unfriendly',
            reason: `Bloated (Music): Lossy file exceeds standard compression limits (${br} kbps).`,
            suggestion: 'Convert to standard stereo MP3 (320 kbps) or high-fidelity lossless FLAC.'
          };
        }
      }
      return {
        level: 'modern',
        reason: `Optimal: Audio bitrate (${br} kbps) is in the optimal range.`,
        suggestion: 'None. Fits standard high-fidelity audio parameters.'
      };
    } else {
      const res = (item.videoResolution || '').toLowerCase();
      const br = item.videoBitrateMbps || 0;
      const displayRes = item.videoResolution || 'Unknown Res';

      if (br > 0) {
        let isStarved = false;
        let isBloated = false;
        let starvedThreshold = 0;
        let bloatedThreshold = 0;

        // Base thresholds assuming H.264 / AVC
        if (res.includes('4k') || res.includes('2160')) {
          starvedThreshold = 10.0;
          bloatedThreshold = 65.0;
        } else if (res.includes('1080')) {
          starvedThreshold = 1.5;
          bloatedThreshold = 25.0;
        } else if (res.includes('720')) {
          starvedThreshold = 1.0;
          bloatedThreshold = 10.0;
        } else if (res.includes('sd') || res.includes('480') || res.includes('576') || res.includes('360')) {
          starvedThreshold = 0.3;
          bloatedThreshold = 4.0;
        }

        // Adjust thresholds based on codec efficiency
        let codecMultiplier = 1.0;
        const codecLabel = vCodec.toUpperCase();
        if (['hevc', 'h265', 'av1'].includes(vCodec)) {
          codecMultiplier = 0.6; // High efficiency codecs require less bitrate
        } else if (['mpeg2video', 'mpeg2', 'mpeg4', 'xvid', 'divx', 'vp8'].includes(vCodec)) {
          codecMultiplier = 1.5; // Older/less efficient codecs require more bitrate
        }

        if (starvedThreshold > 0) {
          starvedThreshold = Number((starvedThreshold * codecMultiplier).toFixed(2));
          bloatedThreshold = Number((bloatedThreshold * codecMultiplier).toFixed(2));
          
          if (br < starvedThreshold) {
            isStarved = true;
          } else if (br > bloatedThreshold) {
            isBloated = true;
          }
        }

        if (isStarved) {
          return {
            level: 'unfriendly',
            reason: `Starved (Video): Bitrate (${br} Mbps) is too low for ${displayRes} resolution with ${codecLabel} codec (min ${starvedThreshold} Mbps).`,
            suggestion: 'Re-encode from a higher quality source or replace with a better release.'
          };
        } else if (isBloated) {
          return {
            level: 'unfriendly',
            reason: `Bloated (Video): Bitrate (${br} Mbps) is unnecessarily high for ${displayRes} resolution with ${codecLabel} codec (max ${bloatedThreshold} Mbps).`,
            suggestion: 'Transcode to HEVC/H.265 or AV1 to significantly reduce file size without losing perceived quality.'
          };
        }
      }

      if (item.bitrateAnomaly) {
        return {
          level: 'unfriendly',
          reason: `Anomaly Detected: ${item.bitrateAnomalyReason}`,
          suggestion: 'Re-encode or re-source to meet standard quality-to-bitrate ratio guidelines.'
        };
      }

      return {
        level: 'modern',
        reason: `Optimal: Bitrate (${br} Mbps) is perfectly proportioned for ${displayRes} resolution.`,
        suggestion: 'None. Excellent encoding density and size optimization.'
      };
    }
  }

  if (customRules.useDiscoveryPreset) {
    return {
      level: 'pending',
      reason: 'This file has not been evaluated by the Streaming compatibility scanner yet.',
      suggestion: 'Please run a scan with Streaming preset or click Evaluate Streaming Compatibility.'
    };
  }
  // Music files are processed separately (audio only)
  if (isMusicCategory(item.category)) {
    const modernMusic = customRules.modernMusicCodecs || DEFAULT_RULES.modernMusicCodecs;
    const legacyMusic = customRules.legacyMusicCodecs || DEFAULT_RULES.legacyMusicCodecs;
    const discoveryMusic = customRules.discoveryMusicCodecs || DEFAULT_RULES.discoveryMusicCodecs;

    const codecToCheck = (audios.length > 0 ? audios[0].codec : vCodec || container).toLowerCase();

    if (customRules.useLegacyPreset && legacyMusic.includes(codecToCheck)) {
      return {
        level: 'legacy',
        reason: `Legacy compatible music format (${codecToCheck})`,
        suggestion: 'None required. Fits basic streaming requirements.'
      };
    } else if (customRules.useModernPreset && modernMusic.includes(codecToCheck)) {
      return {
        level: 'modern',
        reason: `Modern music format (${codecToCheck})`,
        suggestion: 'Standard modern music format. Good to go.'
      };
    } else {
      return {
        level: 'unfriendly',
        reason: `Unsupported music codec (${codecToCheck})`,
        suggestion: 'Convert to standard AAC or MP3 format.'
      };
    }
  }

  // --- VIDEO COMPATIBILITY EVALUATION ---
  const activeBleedingEdge = customRules.useBleedingEdgePreset ?? false;
  const activeModern = customRules.useModernPreset ?? true;
  const activeLegacy = customRules.useLegacyPreset ?? true;

  const isProfile5 = item.hdrFormat?.toLowerCase().includes('profile 5') || false;

  const hasImageSub = subs.some(s => {
    const c = (s.codec || '').toLowerCase();
    return c.includes('pgs') || c.includes('vob') || c.includes('dvd') || c.includes('ass') || c.includes('ssa');
  });

  // 0. Evaluate for Bleeding Edge Standards
  if (activeBleedingEdge) {
    const beVCodecs = customRules.bleedingEdgeVideoCodecs || DEFAULT_RULES.bleedingEdgeVideoCodecs || ['av1', 'vvc', 'vp9'];
    const beSurrounds = customRules.bleedingEdgeSurroundAudioCodecs || DEFAULT_RULES.bleedingEdgeSurroundAudioCodecs || ['truehd', 'dtshd', 'opus'];
    const beStereos = customRules.bleedingEdgeStereoAudioCodecs || DEFAULT_RULES.bleedingEdgeStereoAudioCodecs || ['flac', 'pcm', 'opus'];

    const vCompat = beVCodecs.includes(vCodec);
    const cCompat = ['mkv', 'mp4', 'm4v'].includes(container);

    let aCompat = true;
    if (audios.length === 0) {
      aCompat = false;
    } else {
      for (const track of audios) {
        const codec = (track.codec || '').toLowerCase();
        const ch = track.channels;
        if (ch > 2) {
          if (!beSurrounds.includes(codec)) aCompat = false;
        } else {
          if (!beStereos.includes(codec)) aCompat = false;
        }
      }
    }

    if (vCompat && cCompat && aCompat && !hasImageSub && !isProfile5) {
      return {
        level: 'bleeding',
        reason: 'Direct Plays: 2015+ HW (Bleeding Edge)',
        suggestion: 'Perfect. Peak efficiency and audio fidelity.'
      };
    } else if (vCompat || cCompat || aCompat) {
       // if Bleeding Edge is the ONLY thing active, and it failed
       if (!activeModern && !activeLegacy) {
           return {
             level: 'unfriendly',
             reason: 'Fails Bleeding Edge standards.',
             suggestion: 'Upgrade internal streams to AV1/VVC or lossless audio formats.'
           };
       }
    }
  }

  // 1. Evaluate for Legacy Streaming Standards
  if (activeLegacy && !isProfile5) {
    const legacyVideoCodecsList = customRules.legacyVideoCodecs || DEFAULT_RULES.legacyVideoCodecs || ['h264'];
    const legacySurrounds = customRules.legacySurroundAudioCodecs || DEFAULT_RULES.legacySurroundAudioCodecs || ['ac3', 'aac'];
    const legacyStereos = customRules.legacyStereoAudioCodecs || DEFAULT_RULES.legacyStereoAudioCodecs || ['aac', 'mp3', 'ac3'];

    const vCompat = legacyVideoCodecsList.includes(vCodec) || (legacyVideoCodecsList.includes('h264') && vCodec === 'avc');
    const cCompat = ['mkv', 'mp4', 'm4v'].includes(container);

    let aCompat = true;
    if (audios.length === 0) {
      aCompat = false;
    } else {
      for (const track of audios) {
        const codec = (track.codec || '').toLowerCase();
        const ch = track.channels;
        if (ch > 2) {
          if (!legacySurrounds.includes(codec)) aCompat = false;
        } else {
          if (!legacyStereos.includes(codec)) aCompat = false;
        }
      }
    }

    if (vCompat && cCompat && aCompat && !hasImageSub) {
      return {
        level: 'legacy',
        reason: 'Direct Plays: Broad/Legacy HW',
        suggestion: 'Compatible stream, but candidate for improvement. Smooth legacy streaming, but could upgrade to HEVC for space savings.'
      };
    }
  }

  // 2. Evaluate for Modern Streaming Standards
  if (activeModern && !isProfile5) {
    const modernVCodecs = customRules.modernVideoCodecs || DEFAULT_RULES.modernVideoCodecs || ['hevc', 'h264'];
    const modernSurrounds = customRules.modernSurroundAudioCodecs || DEFAULT_RULES.modernSurroundAudioCodecs || ['ac3', 'eac3'];
    const modernStereos = customRules.modernStereoAudioCodecs || DEFAULT_RULES.modernStereoAudioCodecs || ['aac', 'mp3', 'ac3', 'eac3'];

    const vCompat = modernVCodecs.includes(vCodec);
    const cCompat = ['mkv', 'mp4', 'm4v'].includes(container);

    let aCompat = true;
    if (audios.length === 0) {
      aCompat = false;
    } else {
      for (const track of audios) {
        const codec = (track.codec || '').toLowerCase();
        const ch = track.channels;
        if (ch > 2) {
          if (!modernSurrounds.includes(codec)) aCompat = false;
        } else {
          if (!modernStereos.includes(codec)) aCompat = false;
        }
      }
    }

    if (vCompat && cCompat && aCompat && !hasImageSub) {
      if (['h264', 'avc'].includes(vCodec)) {
        return {
          level: 'legacy',
          reason: 'Direct Plays: Broad/Legacy HW',
          suggestion: 'Compatible stream, but candidate for improvement. Upgrade to HEVC for better compression.'
        };
      }
      return {
        level: 'modern',
        reason: 'Direct Plays: 2015+ HW',
        suggestion: 'Perfect. Ready to scan sync and stream natively.'
      };
    }
  }

  // 3. Fallback check: If it didn't match Legacy or Modern, but contains Bleeding Edge codecs
  const fallbackBeVCodecs = customRules.bleedingEdgeVideoCodecs || DEFAULT_RULES.bleedingEdgeVideoCodecs || ['av1', 'vvc', 'vp9'];
  const fallbackBeSurrounds = customRules.bleedingEdgeSurroundAudioCodecs || DEFAULT_RULES.bleedingEdgeSurroundAudioCodecs || ['truehd', 'dtshd', 'opus'];
  const fallbackBeStereos = customRules.bleedingEdgeStereoAudioCodecs || DEFAULT_RULES.bleedingEdgeStereoAudioCodecs || ['flac', 'pcm', 'opus'];

  const hasBleedingVideo = fallbackBeVCodecs.includes(vCodec);
  let hasBleedingAudio = false;
  for (const track of audios) {
    const codec = (track.codec || '').toLowerCase();
    const ch = track.channels;
    if (ch > 2) {
      if (fallbackBeSurrounds.includes(codec)) hasBleedingAudio = true;
    } else {
      if (fallbackBeStereos.includes(codec)) hasBleedingAudio = true;
    }
  }

  if ((hasBleedingVideo || hasBleedingAudio) && !isProfile5 && !hasImageSub) {
    return {
      level: 'bleeding',
      reason: 'Bleeding Edge: High transcode & buffering risk (lossless/uncommon streams)',
      suggestion: 'Keep standard H.264/HEVC and AAC/AC3 transcodes or secondary audio tracks on hand for broader compatibility.'
    };
  }

  // Compile remediation details / reasons
  const causes: string[] = [];
  const suggestions: string[] = [];

  const validVid = ['h264', 'avc'];
  if (activeModern) validVid.push('hevc', 'h255', 'h265');

  if (!validVid.includes(vCodec)) {
    causes.push(`Suboptimal video codec (${formatCodecString(vCodec) || 'UNKNOWN'})`);
    suggestions.push(`Transcode stream to HEVC/H.264 standard profiles.`);
  }

  const validConts = ['mkv', 'mp4', 'm4v'];

  if (!validConts.includes(container)) {
    causes.push(`Complex container format wrap (${formatCodecString(container)})`);
    suggestions.push(`Remux stream wrap to clean MP4 or MKV without transcoding.`);
  }

  if (hasImageSub) {
    causes.push('PGS/DVD Image subtitles force CPU transcode burning');
    suggestions.push('Sideload clean external text SRT subtitles.');
  }

  if (isProfile5) {
    causes.push('Dolby Vision Profile 5 lacks standard HDR10 fallback layer');
    suggestions.push('Transcode or source standard HDR10/HDR10+ capable media.');
  }

  let auditFailed = false;
  if (audios.length === 0) {
    auditFailed = true;
  } else {
    for (const track of audios) {
      const codec = (track.codec || '').toLowerCase();
      const ch = track.channels;
      if (ch > 2) {
        let allowed = ['ac3', 'eac3', 'dts', 'truehd', 'flac'];
        if (!allowed.includes(codec)) auditFailed = true;
      } else {
        let allowed = ['aac', 'mp3', 'flac', 'pcm', 'ac3', 'eac3'];
        if (!allowed.includes(codec)) auditFailed = true;
      }
    }
  }

  if (auditFailed) {
    causes.push('Incompatible sound track compression standard');
    suggestions.push('Embed secondary standard AAC/Dolby surround soundtrack.');
  }

  const finalReason = causes.length > 0 ? causes.join('; ') : 'Complex audio/video combination causing potential transcoding';
  const finalSuggestion = suggestions.length > 0 
    ? suggestions.slice(0, 2).join(' ') 
    : 'Remux wrap or transcode stream to standard format.';

  return {
    level: 'unfriendly',
    reason: finalReason,
    suggestion: finalSuggestion
  };
}

export { computeDuplicatesMap, getDuplicatePairRows };

```

## 4. Rust Filesystem & DB Query Handlers (apps/steward/src-tauri/src/lib.rs)
```rust
mod db;
mod models;

use models::ScannedFile;
use rusqlite::params;
use serde_json::json;
use std::sync::Mutex;
use tauri::{Manager, State};
use walkdir::WalkDir;

struct DbState {
    conn: Mutex<rusqlite::Connection>,
}

#[tauri::command]
async fn get_db_files(state: State<'_, DbState>) -> Result<Vec<ScannedFile>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT \
        id, filename, filePath, category, container, sizeGB, durationMins, year, \
        videoCodec, videoResolution, videoBitrateMbps, audioTracks, subtitleTracks, tags, audioBitrate, isCorrupted, errorMessage, hasEmbeddedPoster, bitrateAnomaly, bitrateAnomalyReason, topLevelFolder, \
        streamFriendlyLevel, streamFriendlyReason, streamFriendlySuggestion, streamFriendlyEvaluated, \
        videoBitDepth, audioSampleRate, chapterCount, rawAudioCodec, physicalAudioChannels, matchedOnlineId, fileUuid, hasExternalSubtitles, embeddedSubtitleLanguages, \
        author, narrator, publisher, bookSeries, seriesIndex, isbn, pageCount, videoFrameRate \
        FROM scanned_files").map_err(|e| e.to_string())?;
    
    let file_iter = stmt.query_map([], |row| {
        Ok(ScannedFile {
            id: row.get(0)?,
            filename: row.get(1)?,
            file_path: row.get(2)?,
            category: row.get(3)?,
            container: row.get(4)?,
            size_gb: row.get(5)?,
            duration_mins: row.get(6)?,
            year: row.get(7)?,
            video_codec: row.get(8)?,
            video_resolution: row.get(9)?,
            video_bitrate_mbps: row.get(10)?,
            audio_tracks: serde_json::from_str(&row.get::<_, String>(11)?).unwrap_or(json!([])),
            subtitle_tracks: serde_json::from_str(&row.get::<_, String>(12)?).unwrap_or(json!([])),
            tags: serde_json::from_str(&row.get::<_, String>(13)?).unwrap_or(json!({})),
            audio_bitrate: row.get(14)?,
            is_corrupted: row.get(15)?,
            error_message: row.get(16)?,
            has_embedded_poster: row.get(17)?,
            bitrate_anomaly: row.get(18)?,
            bitrate_anomaly_reason: row.get(19)?,
            top_level_folder: row.get(20)?,
            stream_friendly_level: row.get(21)?,
            stream_friendly_reason: row.get(22)?,
            stream_friendly_suggestion: row.get(23)?,
            stream_friendly_evaluated: row.get(24)?,
            video_bit_depth: row.get(25).unwrap_or_default(),
            audio_sample_rate: row.get(26).unwrap_or_default(),
            chapter_count: row.get(27).unwrap_or_default(),
            raw_audio_codec: row.get(28).unwrap_or_default(),
            physical_audio_channels: row.get(29).unwrap_or_default(),
            matched_online_id: row.get(30).unwrap_or_default(),
            file_uuid: row.get(31).unwrap_or_default(),
            has_external_subtitles: row.get(32).unwrap_or_default(),
            embedded_subtitle_languages: row.get(33).unwrap_or_default(),
            author: row.get(34).unwrap_or_default(),
            narrator: row.get(35).unwrap_or_default(),
            publisher: row.get(36).unwrap_or_default(),
            book_series: row.get(37).unwrap_or_default(),
            series_index: row.get(38).unwrap_or_default(),
            isbn: row.get(39).unwrap_or_default(),
            page_count: row.get(40).unwrap_or_default(),
            video_frame_rate: row.get(41).unwrap_or_default(),
        })
    }).map_err(|e| e.to_string())?;
    
    let mut files = Vec::new();
    for file in file_iter {
        files.push(file.map_err(|e| e.to_string())?);
    }
    
    Ok(files)
}

#[tauri::command]
fn clear_db(state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM scanned_files", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn delete_db_files(state: State<'_, DbState>, ids: Vec<String>) -> Result<(), String> {
    let mut conn = state.conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    for id in ids {
        tx.execute("DELETE FROM scanned_files WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn save_db_files(state: State<'_, DbState>, files: Vec<ScannedFile>) -> Result<(), String> {
    let mut conn = state.conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    {
        let mut stmt = tx.prepare(
            "INSERT INTO scanned_files (
                id, filename, filePath, category, container, sizeGB, durationMins, year,
                videoCodec, videoResolution, videoBitrateMbps, audioTracks, subtitleTracks, tags, audioBitrate, isCorrupted, errorMessage, hasEmbeddedPoster, bitrateAnomaly, bitrateAnomalyReason, topLevelFolder,
                streamFriendlyLevel, streamFriendlyReason, streamFriendlySuggestion, streamFriendlyEvaluated,
                videoBitDepth, audioSampleRate, chapterCount, rawAudioCodec, physicalAudioChannels, matchedOnlineId, fileUuid, hasExternalSubtitles, embeddedSubtitleLanguages,
                author, narrator, publisher, bookSeries, seriesIndex, isbn, pageCount, videoFrameRate
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34, ?35, ?36, ?37, ?38, ?39, ?40, ?41, ?42)
            ON CONFLICT(id) DO UPDATE SET
                filename=excluded.filename, filePath=excluded.filePath, category=excluded.category, container=excluded.container, sizeGB=excluded.sizeGB, durationMins=excluded.durationMins, year=excluded.year,
                videoCodec=excluded.videoCodec, videoResolution=excluded.videoResolution, videoBitrateMbps=excluded.videoBitrateMbps, audioTracks=excluded.audioTracks, subtitleTracks=excluded.subtitleTracks, tags=excluded.tags, audioBitrate=excluded.audioBitrate, isCorrupted=excluded.isCorrupted, errorMessage=excluded.errorMessage, hasEmbeddedPoster=excluded.hasEmbeddedPoster, bitrateAnomaly=excluded.bitrateAnomaly, bitrateAnomalyReason=excluded.bitrateAnomalyReason, topLevelFolder=excluded.topLevelFolder,
                streamFriendlyLevel=excluded.streamFriendlyLevel, streamFriendlyReason=excluded.streamFriendlyReason, streamFriendlySuggestion=excluded.streamFriendlySuggestion, streamFriendlyEvaluated=excluded.streamFriendlyEvaluated,
                videoBitDepth=excluded.videoBitDepth, audioSampleRate=excluded.audioSampleRate, chapterCount=excluded.chapterCount, rawAudioCodec=excluded.rawAudioCodec, physicalAudioChannels=excluded.physicalAudioChannels, matchedOnlineId=excluded.matchedOnlineId, fileUuid=excluded.fileUuid, hasExternalSubtitles=excluded.hasExternalSubtitles, embeddedSubtitleLanguages=excluded.embeddedSubtitleLanguages,
                author=excluded.author, narrator=excluded.narrator, publisher=excluded.publisher, bookSeries=excluded.bookSeries, seriesIndex=excluded.seriesIndex, isbn=excluded.isbn, pageCount=excluded.pageCount, videoFrameRate=excluded.videoFrameRate"
        ).map_err(|e| e.to_string())?;

        for item in files {
            stmt.execute(
                params![
                    item.id, item.filename, item.file_path, item.category, item.container, item.size_gb, item.duration_mins, item.year,
                    item.video_codec, item.video_resolution, item.video_bitrate_mbps, item.audio_tracks.to_string(), item.subtitle_tracks.to_string(), item.tags.to_string(), item.audio_bitrate, item.is_corrupted, item.error_message, item.has_embedded_poster, item.bitrate_anomaly, item.bitrate_anomaly_reason, item.top_level_folder,
                    item.stream_friendly_level, item.stream_friendly_reason, item.stream_friendly_suggestion, item.stream_friendly_evaluated,
                    item.video_bit_depth, item.audio_sample_rate, item.chapter_count, item.raw_audio_codec, item.physical_audio_channels, item.matched_online_id, item.file_uuid, item.has_external_subtitles, item.embedded_subtitle_languages,
                    item.author, item.narrator, item.publisher, item.book_series, item.series_index, item.isbn, item.page_count, item.video_frame_rate
                ]
            ).map_err(|e| e.to_string())?;
        }
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;

fn generate_file_hash(_path: &std::path::Path, metadata: &std::fs::Metadata) -> String {
    let mut hasher = DefaultHasher::new();
    metadata.len().hash(&mut hasher);
    
    if let Ok(modified) = metadata.modified() {
        if let Ok(duration) = modified.duration_since(std::time::UNIX_EPOCH) {
            duration.as_secs().hash(&mut hasher);
            duration.subsec_nanos().hash(&mut hasher);
        }
    }
    
    format!("{:016x}", hasher.finish())
}

#[derive(serde::Serialize)]
#[allow(non_snake_case)]
struct FileEntry {
    path: String,
    size: u64,
    fileHash: String,
    hasExternalSubtitles: bool,
}

#[tauri::command]
async fn walk_dir(path: String) -> Result<Vec<FileEntry>, String> {
    use std::collections::HashMap;
    use std::path::PathBuf;

    let path_obj = std::path::Path::new(&path);
    if !path_obj.exists() {
        return Err(format!("The folder directory '{}' does not exist.", path));
    }
    if !path_obj.is_dir() {
        return Err(format!("The specified path '{}' is not a valid directory.", path));
    }
    if let Err(e) = std::fs::read_dir(&path) {
        return Err(format!("Permission denied or directory inaccessible for '{}': {}", path, e));
    }

    let mut discovered_media: Vec<(PathBuf, String, u64, String)> = Vec::new();
    let mut subtitles_map: HashMap<PathBuf, Vec<String>> = HashMap::new();

    let mut iterator = WalkDir::new(&path).follow_links(true).into_iter();
    loop {
        let entry_res = match iterator.n // Truncated for brevity, includes walk_dir and db queries
```

## 5. Dashboard Filters & Search Requirements (apps/steward/src/components/Dashboard.tsx)
```tsx
import { LibraryView } from './LibraryView';
import { formatCodecString, getPrimaryAudioCodec, getPrimaryVideoCodec, getContainerFormat, getFormattedAudioTracks } from '@bitscribe/core-eval';
import { BitsyCharacter } from "@bitscribe/ui-components";
import { createPortal } from "react-dom";
import React, { useState, useEffect, useMemo, memo, useTransition, useDeferredValue } from "react";
import { MediaItem, RuleCriteria, sortCategories, getCategoryGroup, isMusicCategory } from '@bitscribe/core-types';
import { MOCK_MEDIA_LIBRARY } from '@bitscribe/core-db';
import { evaluatePlexCompatibility, computeDuplicatesMap, getDuplicatePairRows, isMissingSubtitles } from '@bitscribe/core-eval';
import { parseVideoMetadata } from '@bitscribe/core-eval';
import { getDisplayArtist, getDisplayAlbum, getDisplaySongTitle } from '@bitscribe/core-eval';
import { normalizeTitleForSort, getSectionHeaderForTitle, normalizeGroupTitle, getMusicGroupTitle } from '@bitscribe/core-eval';

import { getMissingMetadataTags } from "@bitscribe/core-eval";
import DiagnosticPanel from "./DiagnosticPanel";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import {
  Play,
  Folder,
  FileVideo,
  FileAudio,
  Subtitles,
  CheckCircle,
  Sunset,
  AlertCircle, AlertTriangle,
  Cpu,
  Download,
  RotateCcw,
  Sliders,
  Database,
  Search,
  Filter,
  Music,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Layers,
  ChevronDown
} from "lucide-react";



interface DashboardProps {
  isScanning: boolean;
  isExporting?: boolean;
  exportProgress?: number;
  currentExportFile?: string;
  scanProgress: number;
  currentScanFile: string;
  scanLogs: string[];
  scannedFiles: MediaItem[];
  corruptFiles: MediaItem[];
  notification: string | { type: string; message: string } | null;
  lastScanDuration?: number | null;
  customRules: RuleCriteria;
  onRulesChange: (rules: RuleCriteria) => void;
  onSelectScannedFiles: (items: MediaItem[]) => void;
  scanPaths: { path: string; enabled: boolean }[];
  setScanPaths: (paths: { path: string; enabled: boolean }[]) => void;
  excelColumns: Record<string, boolean>;
  showDiagnostic: boolean;
  showFileRegistry: boolean;
  showMetrics: boolean;
  isQuickRefresh?: boolean;
  isTourActive?: boolean;
  tourStepIndex?: number;
  activeDemo?: 'hover' | 'click' | 'type' | 'wait' | number | null;
}


const missingFmt = (val: any) => {
  if (val === "[MISSING]" || !val) {
    return <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 font-semibold border border-rose-900/50 text-[10px] tracking-wider uppercase shadow-sm whitespace-nowrap">[MISSING]</span>;
  }
  return val;
};

const formatResolution = (w?: number, h?: number, parsed?: any) => {
  if (w && h) {
    let resLabel = `${w}x${h}`;
    if (parsed?.resolution) {
      resLabel += ` (${parsed.resolution})`;
    }
    return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-xs">{resLabel}</span>;
  }
  if (parsed?.resolution) {
    return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-xs">{parsed.resolution}</span>;
  }
  return missingFmt("[MISSING]");
};

const formatSubtitleSummary = (parsed?: any) => {
  if (parsed?.subtitles && Array.isArray(parsed.subtitles) && parsed.subtitles.length > 0) {
    return <span className="text-slate-300 text-xs">{parsed.subtitles.length} track(s)</span>;
  }
  return missingFmt("[MISSING]");
};

const formatSubtitleTechnical = (parsed?: any) => {
  if (parsed?.subtitles && Array.isArray(parsed.subtitles) && parsed.subtitles.length > 0) {
    return (
      <div className="flex flex-col gap-1">
        {parsed.subtitles.map((sub: any, i: number) => (
          <span key={i} className="text-[10px] text-slate-400">
            {sub.language || 'Unknown'} ({sub.codec || 'Unknown'})
          </span>
        ))}
      </div>
    );
  }
  return missingFmt("[MISSING]");
};



const _globalMetadataCache = new Map<string, any>();
const _globalEvalCache = new Map<string, any>();
const _globalUiFolderCache = new Map<string, string>();

function getCachedMetadata(item: MediaItem) {
    if (!_globalMetadataCache.has(item.id)) {
        _globalMetadataCache.set(item.id, parseVideoMetadata(item));
    }
    return _globalMetadataCache.get(item.id);
}

function getCachedEvaluation(item: MediaItem, rules: any, isDup: boolean, scanPaths: any[]) {
    // Basic hash of rules that affect streaming compatibility
    const ruleHash = `${rules.useDiscoveryPreset}|${rules.useModernPreset}|${rules.useLegacyPreset}|${rules.useLosslessAudio}|${rules.useMaxBitrate}`;
    const cacheKey = `${item.id}|${ruleHash}|${isDup}`;
    
    if (!_globalEvalCache.has(cacheKey)) {
        const streamingRules = {
          ...rules,
          useSubtitleScan: false,
          useDuplicationScan: false,
          useDuplicationVideoScan: false,
          useDuplicationMusicScan: false,
          useAnomalyScan: false,
          useMetadataScan: false,
          useVideoMetadataScan: false,
          useMusicMetadataScan: false,
        };
        const evaluation = evaluatePlexCompatibility(item, streamingRules, isDup);
        const finalLevel = item.category === 'Corrupted' ? 'corrupted' : evaluation.level;
        
        let uiTopLevelFolder = item.topLevelFolder;
        // Simple scanPaths hash
        const spHash = scanPaths.map(p => p.path + p.enabled).join('');
        const folderCacheKey = `${item.filePath}|${spHash}|${item.topLevelFolder}`;
        
        if (!_globalUiFolderCache.has(folderCacheKey)) {
            _globalUiFolderCache.set(folderCacheKey, getTopLevelFolderUI(item.filePath, scanPaths, item.topLevelFolder));
        }
        uiTopLevelFolder = _globalUiFolderCache.get(folderCacheKey);

        const safeItem = { ...item, topLevelFolder: uiTopLevelFolder };
        
        _globalEvalCache.set(cacheKey, {
            item: safeItem,
            isDup,
            level: finalLevel,
            evaluation: {
                level: finalLevel,
                reason: evaluation.reason || "",
                suggestion: evaluation.suggestion || ""
            }
        });
    }
    return _globalEvalCache.get(cacheKey);
}


const _globalDupCache = new Map<string, Map<string, boolean>>();
function getCachedDuplicatesMap(files: MediaItem[], rules: any, isCustomActive: boolean, visibleBlocks: any, isTourActive: boolean) {
    const isDuplicatesCardVisible = isCustomActive 
      ? !!visibleBlocks['media-duplicates-card'] 
      : (rules.useDuplicationScan || rules.useDuplicationVideoScan || rules.useDuplicationMusicScan || isTourActive || document.body.classList.contains("tour-active"));
    const activeRules = isDuplicatesCardVisible 
      ? { ...rules, useDuplicationScan: true } 
      : rules;
    
    // Hash based on duplication rules only + file count
    const ruleHash = `${activeRules.useDuplicationScan}|${activeRules.useDuplicationVideoScan}|${activeRules.useDuplicationMusicScan}|${files.length}`;
    
    if (!_globalDupCache.has(ruleHash)) {
        // Limit cache size to prevent memory leaks
        if (_globalDupCache.size > 5) {
            const firstKey = _globalDupCache.keys().next().value;
            _globalDupCache.delete(firstKey);
        }
        _globalDupCache.set(ruleHash, computeDuplicatesMap(files, activeRules));
    }
    return _globalDupCache.get(ruleHash)!;
}

function getTopLevelFolderUI(filePath: string, scanPaths: { path: string; enabled: boolean }[], fallbackFolder: string): string {
    if (!filePath || !scanPaths || scanPaths.length === 0) return fallbackFolder || "Unknown";
    const normFile = filePath.replace(/\\/g, '/').toLowerCase();
    
    let matchingBase = "";
    let originalBase = "";
    for (const sp of scanPaths) {
        if (!sp.enabled) continue;
        const normBase = sp.path.replace(/\\/g, '/');
        if (normFile.startsWith(normBase.toLowerCase())) {
            if (normBase.length > matchingBase.length) {
                matchingBase = normBase.toLowerCase();
                originalBase = normBase;
            }
        }
    }
    
    if (originalBase) {
        let noSlash = originalBase.endsWith('/') ? originalBase.slice(0, -1) : originalBase;
        const lastSlash = Math.max(noSlash.lastIndexOf('/'), noSlash.lastIndexOf('\\'));
        let baseName = lastSlash !== -1 ? noSlash.substring(lastSlash + 1) : noSlash;
        return baseName || originalBase;
    }
    
    return fallbackFolder || "Unknown";
}

export default memo(function Dashboard({
  customRules,
  onRulesChange,
  onSelectScannedFiles,
  scanPaths,
  setScanPaths,
  excelColumns,
  showDiagnostic,
  showFileRegistry,
  showMetrics,
  isScanning,
  isExporting,
  exportProgress = 0,
  currentExportFile = "",
  isQuickRefresh,
  isTourActive,
  tourStepIndex,
  activeDemo,
  scanProgress,
  currentScanFile,
  scanLogs,
  scannedFiles,
  corruptFiles,
  notification,
  lastScanDuration,
}: DashboardProps) {

  const formatDurationStr = (ms: number | undefined | null) => {
    if (ms == null) return null;
    if (ms < 1000) return `${ms}ms`;
    const secs = Math.floor(ms / 1000);
    const mins = Math.floor(secs / 60);
    if (mins > 0) return `${mins}m ${secs % 60}s`;
    return `${secs}s`;
  };
  // Grid / filtering states
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [selectedCategories,
```
