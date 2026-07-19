import { MediaItem, RuleCriteria, isMusicCategory } from '../types';
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

  const getMusicProperties = (item: MediaItem) => {
    const title = cleanMusicTrack(item.tags?.title || item.filename);
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
    return { title, artist };
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
      const { title, artist } = getMusicProperties(item);
      const parts = (item.filePath || "").split(/[\\/]/).filter(Boolean);
      const parentDir = parts.length > 1 ? parts[parts.length - 2].toLowerCase() : "unknown_dir";
      const key = artist === 'unknown' ? `unknown_${parentDir}_${title}` : `${artist} - ${title}`;
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
