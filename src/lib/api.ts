import { stat } from '@tauri-apps/plugin-fs';
import { invoke } from "@tauri-apps/api/core";
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

import { Command } from "@tauri-apps/plugin-shell";
import { MediaItem } from "../types";
import { evaluatePlexCompatibility } from "../utils/plexEvaluator";
import { MOCK_MEDIA_LIBRARY } from "../data/mockMediaData";

export async function getDbFiles(): Promise<MediaItem[]> {
    if (!isTauri()) return _mockDb;
    return await invoke("get_db_files");
}

export async function clearDb(): Promise<void> {
    if (!isTauri()) {
        saveMockDb([]);
        return;
    }
    await invoke("clear_db");
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

export async function getDiagnostic() {
    if (!isTauri()) {
        return {
            platform: "web",
            arch: "unknown",
            appVersion: import.meta.env.APP_VERSION || "1.4.3",
            ffprobePath: "simulated"
        };
    }
    return await invoke("get_diagnostic");
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

function getTopLevelFolder(filePath: string, configuredPaths?: string[]): string {
    if (!filePath) return "Unknown";
    const normFile = filePath.replace(/\\/g, '/');
    
    if (configuredPaths && configuredPaths.length > 0) {
        let matchingBase = "";
        for (const p of configuredPaths) {
            const normBase = p.replace(/\\/g, '/');
            if (normFile.toLowerCase().startsWith(normBase.toLowerCase())) {
                if (normBase.length > matchingBase.length) {
                    matchingBase = normBase;
                }
            }
        }
        
        if (matchingBase) {
            let relativePath = normFile.substring(matchingBase.length);
            if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);
            const parts = relativePath.split('/').filter(p => p);
            if (parts.length > 1) {
                return parts[0];
            } else {
                return "Root";
            }
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

export async function scanDirectories(paths: string[], rules: any, onStart: (total: number) => void, onLog: (msg: string) => void, onProgress: (prog: any) => void, isResume: boolean = false) {
    onLog("Initializing scan...");
    const normalizePath = (pStr: string) => {
        if (!pStr) return "";
        return pStr.replace(/\\/g, '/').toLowerCase().trim();
    };

    let existingPaths = new Set<string>();
    let existingFilesMap = new Map<string, any>();
    if (isResume) {
        onLog("Loading existing database to determine resume point...");
        try {
            const dbFiles = await getDbFiles();
            dbFiles.forEach(f => {
                const normPath = normalizePath(f.filePath || f.id);
                existingPaths.add(normPath);
                existingFilesMap.set(normPath, f);
            });
            onLog(`Found ${existingPaths.size} already scanned files to skip.`);
        } catch (e) {
            onLog("Failed to load DB for resume. Starting fresh.");
        }
    }
    const allowedExtensions = ['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.mpg', '.mpeg', '.m2ts', '.ts', '.vob', '.mxf', '.mp3', '.flac', '.m4a', '.wav', '.aac', '.ogg', '.wma', '.alac', '.m4b', '.ape', '.opus', '.mka'];
    
    let allFiles: string[] = [];
    for (const p of paths) {
        onLog(`Walking directory: ${p}`);
        const files = isTauri() ? await invoke<{path: string, size: number}[]>("walk_dir", { path: p }) : [];
        let validCount = 0;
        for (const fileObj of files) {
            const file = fileObj.path;
            const lower = file.toLowerCase();
            if (allowedExtensions.some(ext => lower.endsWith(ext))) {
                allFiles.push(file);
                const normPath = normalizePath(file);
                // Temporarily store the physical size in the map so we can use it later
                existingFilesMap.set(normPath + "_physical_size", fileObj.size);
                validCount++;
            }
        }
        onLog(`Found ${validCount} valid media files in ${p}`);
    }

    if (!isResume && isTauri()) {
        onLog("Pruning database and detecting file moves/deletions...");
        try {
            const existingDbFiles = await getDbFiles();

            const isUnderPath = (file: string, activePath: string) => {
                const normFile = normalizePath(file);
                const normActive = normalizePath(activePath);
                const apWithSlash = normActive.endsWith('/') ? normActive : normActive + '/';
                return normFile.startsWith(apWithSlash) || normFile === normActive;
            };

            const allFilesSet = new Set(allFiles.map(normalizePath));
            
            // Find which DB files are under the active scan paths
            const dbFilesUnderActivePaths = existingDbFiles.filter(item => {
                if (!item.filePath) return false;
                return paths.some(ap => isUnderPath(item.filePath, ap));
            });
            
            // Ghost files: in DB under active path, but not found on disk
            const ghostFiles = dbFilesUnderActivePaths.filter(item => {
                return !allFilesSet.has(normalizePath(item.filePath));
            });
            
            // New files: on disk, but not in existing DB
            const existingDbFilesSet = new Set(existingDbFiles.map(f => normalizePath(f.filePath)));
            const newFilesOnDisk = allFiles.filter(file => {
                return !existingDbFilesSet.has(normalizePath(file));
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
                newFilesOnDisk.forEach(f => {
                    const base = f.replace(/\\/g, '/').split('/').pop();
                    if (base) {
                        newFilesByBasename.set(base.toLowerCase(), f);
                    }
                });
                
                ghostFiles.forEach(gf => {
                    const gfBasename = gf.filename || gf.filePath.replace(/\\/g, '/').split('/').pop() || "";
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
                const ghostBasenames = new Set(ghostFiles.map(gf => (gf.filename || gf.filePath.replace(/\\/g, '/').split('/').pop() || "").toLowerCase()));
                newFilesOnDisk.forEach(nf => {
                    const nfBasename = nf.replace(/\\/g, '/').split('/').pop() || "";
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
                changes.forEach(c => {
                    const exists = updatedChanges.some(uc => 
                        uc.filename === c.filename && 
                        uc.path === c.path && 
                        uc.changeFound === c.changeFound
                    );
                    if (!exists) {
                        updatedChanges.push(c);
                    }
                });
                localStorage.setItem("bitscribe_media_changes", JSON.stringify(updatedChanges));
                
                if (ghostFiles.length > 0) {
                    onLog(`Pruning ${ghostFiles.length} ghost files from DB...`);
                    // Now, prune the ghost files from the SQLite database
                    const ghostFilePathsSet = new Set(ghostFiles.map(f => normalizePath(f.filePath)));
                    const cleanDbFiles = existingDbFiles.filter(item => !ghostFilePathsSet.has(normalizePath(item.filePath)));
                    
                    await clearDb();
                    await saveDbFiles(cleanDbFiles);
                    onLog(`Successfully pruned ${ghostFiles.length} ghost files from persistent storage.`);
                }
            }
        } catch (e: any) {
            onLog(`Warning: Failed to prune database: ${e.message}`);
        }
    }
    
    onStart(allFiles.length);
    if (allFiles.length === 0) return;
    
    // Use all but one core to prevent system freezing, fallback to 1 if needed
    const logicalCores = typeof navigator !== 'undefined' && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 4;
    const CONCURRENCY = Math.max(1, logicalCores - 1);
    const BATCH_SIZE = 50;
    
    let currentIndex = 0;
    
    const worker = async () => {
        let batch: MediaItem[] = [];
        while (currentIndex < allFiles.length) {
            const i = currentIndex++;
            const file = allFiles[i];
            let skipFile = false;
            const normPath = normalizePath(file);
            if (existingPaths.has(normPath)) {
                if (isResume) {
                    try {
                        const physicalSize = existingFilesMap.get(normPath + "_physical_size");
                        const currentSizeGB = (physicalSize || 0) / (1024 * 1024 * 1024);
                        const storedSizeGB = existingFilesMap.get(normPath)?.sizeGB || 0;
                        
                        // We check difference up to 1MB
                        if (Math.abs(currentSizeGB - storedSizeGB) > 0.001) {
                            skipFile = false;
                            onLog(`Change detected for ${file}: Size changed from ${storedSizeGB.toFixed(3)}GB to ${currentSizeGB.toFixed(3)}GB.`);
                        } else {
                            skipFile = true;
                        }
                    } catch (err) {
                        skipFile = true;
                    }
                } else {
                    skipFile = true;
                }
            }

            if (skipFile) {
                onProgress({ current: i + 1, total: allFiles.length, item: null });
                continue;
            }
            onLog(`Probing (${i+1}/${allFiles.length}): ${file.substring(Math.max(0, file.length - 40))}`);
            
            try {
                // we use our Tauri sidecar for ffprobe
                const output = await Command.sidecar('bin/ffprobe', [
                    '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', '-show_chapters', '-analyzeduration', '1000000', '-probesize', '1000000', file
                ]).execute();
                
                if (output.code !== 0) {
                    throw new Error("ffprobe returned non-zero code");
                }
                
                const metadata = JSON.parse(output.stdout);
                const format = metadata.format || {};
                const streams = metadata.streams || [];
                
                const videoStream = streams.find((s: any) => s.codec_type === 'video' && s.codec_name !== 'mjpeg' && s.codec_name !== 'png');
                const audioStreams = streams.filter((s: any) => s.codec_type === 'audio');
                const subtitleStreams = streams.filter((s: any) => s.codec_type === 'subtitle');
                
                const hasEmbeddedPoster = streams.some((s: any) => s.codec_type === 'video' && (s.codec_name === 'mjpeg' || s.codec_name === 'png'));
                
                const sizeBytes = format.size ? parseInt(format.size) : 0;
                const sizeGB = sizeBytes / (1024 * 1024 * 1024);
                const durationSec = format.duration ? parseFloat(format.duration) : 0;
                const durationMins = durationSec / 60;
                
                const tags = format.tags || {};
                let year = 0;
                
                // Prioritize matching a 4-digit year (19xx or 20xx) in the filename first, as it is the most reliable source for movie/tv release years
                const filenameYearMatch = file.split(/[\\/]/).pop()?.match(/(19|20)\d{2}/);
                if (filenameYearMatch) {
                    year = parseInt(filenameYearMatch[0]);
                } else if (tags.date) {
                    const y = parseInt(tags.date.substring(0, 4));
                    if (!isNaN(y)) year = y;
                } else if (tags.creation_time) {
                    const y = parseInt(tags.creation_time.substring(0, 4));
                    if (!isNaN(y)) year = y;
                }
                
                const container = file.split('.').pop()?.toLowerCase() || "unknown";
                const videoCodec = videoStream ? videoStream.codec_name : "";
                const videoResolution = videoStream ? `${videoStream.width}x${videoStream.height}` : "";
                
                let videoBitrateMbps = 0;
                if (videoStream && videoStream.bit_rate) {
                    videoBitrateMbps = parseInt(videoStream.bit_rate) / 1000000;
                } else if (format.bit_rate) {
                    videoBitrateMbps = parseInt(format.bit_rate) / 1000000;
                }
                
                let totalAudioBitrate = 0;
                const parsedAudioTracks = audioStreams.map((s: any) => {
                    const ab = s.bit_rate ? parseInt(s.bit_rate) : 0;
                    totalAudioBitrate += ab;
                    return {
                        codec: s.codec_name,
                        channels: s.channels,
                        language: (s.tags && s.tags.language) ? s.tags.language : "und"
                    };
                });
                const parsedSubtitleTracks = subtitleStreams.map((s: any) => ({
                    codec: s.codec_name,
                    language: (s.tags && s.tags.language) ? s.tags.language : "und"
                }));

                let videoBitDepth = "";
                if (videoStream) {
                    if (videoStream.bits_per_raw_sample) {
                        videoBitDepth = `${videoStream.bits_per_raw_sample}-bit`;
                    } else if (videoStream.pix_fmt) {
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
                const audioSampleRate = firstAudioStream && firstAudioStream.sample_rate ? parseInt(firstAudioStream.sample_rate) : undefined;
                
                const chapterCount = Array.isArray(metadata.chapters) ? metadata.chapters.length : 0;
                
                const pathParts = file.replace(/\\/g, '/').split('/');
                const filename = pathParts[pathParts.length - 1];
                const baseDirName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : "";
                const category = inferCategory(baseDirName, filename, '.' + container, file, tags);
                if (category === 'Ignore') continue;
                const topLevelFolder = getTopLevelFolder(file, paths);
                
                const hydratedItem: MediaItem = {
                    id: file,
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
                    audioTracks: parsedAudioTracks,
                    subtitleTracks: parsedSubtitleTracks,
                    tags: tags,
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
                    chapterCount: chapterCount
                };
                
                const evalResult = evaluatePlexCompatibility(hydratedItem, rules, false, true);
                hydratedItem.streamFriendlyLevel = evalResult.level as any;
                hydratedItem.streamFriendlyReason = evalResult.reason;
                hydratedItem.streamFriendlySuggestion = evalResult.suggestion;
                hydratedItem.streamFriendlyEvaluated = Date.now();
                
                onProgress({ current: i + 1, total: allFiles.length, item: hydratedItem });
                batch.push(hydratedItem);
                
            } catch (e: any) {
                const corrupted: MediaItem = {
                    id: file, filename: file.split('/').pop()!, filePath: file, category: 'Corrupted' as any,
                    container: 'unknown', sizeGB: 0, durationMins: 0, year: 0, videoCodec: '', videoResolution: '',
                    videoBitrateMbps: 0, audioTracks: [], subtitleTracks: [], tags: {}, audioBitrate: 0,
                    isCorrupted: true, errorMessage: e.message, hasEmbeddedPoster: false, bitrateAnomaly: false,
                    bitrateAnomalyReason: '', topLevelFolder: '', streamFriendlyLevel: 'corrupted',
                    streamFriendlyReason: '', streamFriendlySuggestion: '', streamFriendlyEvaluated: 0
                };
                onProgress({ current: i + 1, total: allFiles.length, error: true, item: corrupted });
                onLog("PROBE ERROR: " + (e.message || String(e)));
                batch.push(corrupted);
            }
            
            if (batch.length >= BATCH_SIZE) {
                const toSave = batch.splice(0, BATCH_SIZE);
                await saveDbFiles(toSave);
            }
        }
        if (batch.length > 0) {
            await saveDbFiles(batch);
        }
    };
    
    const workers = [];
    for (let w = 0; w < CONCURRENCY; w++) {
        workers.push(worker());
    }
    
    await Promise.all(workers);
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

        const baseEnriched: any = {
          ...mockItem,
          durationMins: (mockItem as any).durationMins || 116,
          year: (mockItem as any).year || 2010,
          videoBitrateMbps: (mockItem as any).videoBitrateMbps || ((mockItem as any).videoBitrate ? (mockItem as any).videoBitrate / 1000 : 12.5),
          topLevelFolder: (mockItem as any).topLevelFolder || getTopLevelFolder((mockItem as any).filePath),
          videoBitDepth: mockItem.videoBitDepth || vBitDepth,
          audioSampleRate: mockItem.audioSampleRate || aSampleRate,
          chapterCount: mockItem.chapterCount !== undefined ? mockItem.chapterCount : cCount
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
            localStorage.setItem("bitscribe_web_settings", JSON.stringify(settings));
        } catch (e) {}
        return;
    }
    try {
        await invoke("save_settings", { settings: JSON.stringify(settings, null, 2) });
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
        const res = await invoke<string>("load_settings");
        return JSON.parse(res || "{}");
    } catch (e) {
        console.error("Failed to load settings via Tauri", e);
        return {};
    }
}

